<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ChatDotRound, CircleCheck, Clock, Refresh, Search, School, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveSafetyReview,
  getSafetyReviewDetail,
  getSafetyReviewRecords,
  rejectSafetyReview,
} from '@/api/safety'
import { getTeacherClassList } from '@/api/teacherClass'
import {
  normalizeReviewStatus,
  reviewStatusLabel,
  reviewStatusOptions,
  reviewStatusTagType,
} from '@/utils/safetyReview'
import { emitSafetyReviewSync, subscribeSafetyReviewSync } from '@/utils/safetyReviewSync'

const sourceModuleOptions = [
  { label: '智能学伴', value: 'AI_COMPANION' },
  { label: '教育 RAG', value: 'EDUCATION_RAG' },
  { label: '项目案例', value: 'PROJECT_CASE' },
  { label: '学情分析', value: 'LEARNING_ANALYSIS' },
  { label: '多模态教学', value: 'MULTIMODAL_TEACHING' },
  { label: '教师备课', value: 'TEACHER_PREP' },
]

const sceneOptions = [
  { label: '学生提问', value: 'STUDENT_AI' },
  { label: 'AI 输出', value: 'AI_OUTPUT' },
  { label: '资源审查', value: 'RESOURCE_SCAN' },
  { label: '课程发布', value: 'TEACHER_COURSE' },
]

const gradeOptions = [
  { label: '小学', value: 'PRIMARY' },
  { label: '初中', value: 'JUNIOR' },
  { label: '高中', value: 'SENIOR' },
]

const riskLevelOptions = [
  { label: '低风险', value: 'LOW' },
  { label: '中风险', value: 'MEDIUM' },
  { label: '高风险', value: 'HIGH' },
]

const riskTypeOptions = [
  { label: '依据不足', value: 'HALLUCINATION' },
  { label: '隐私泄露', value: 'PRIVACY' },
  { label: '诱导作弊', value: 'CHEATING' },
  { label: '不适龄内容', value: 'AGE_INAPPROPRIATE' },
  { label: '提示词攻击', value: 'PROMPT_ATTACK' },
]

const decisionOptions = [
  { label: '通过', value: 'PASS' },
  { label: '提醒', value: 'WARN' },
  { label: '拦截', value: 'BLOCK' },
  { label: '脱敏', value: 'DESENSITIZE' },
  { label: '改写', value: 'REWRITE' },
]

const classLoading = ref(false)
const teacherClasses = ref([])
const selectedClassId = ref('')

const reviewLoading = ref(false)
const reviewActionLoading = ref(false)
const reviewDetailLoading = ref(false)
const reviewDetailVisible = ref(false)
const selectedReviewRecord = ref(null)
const reviewRecords = ref([])
const reviewTotal = ref(0)
const reviewStats = reactive({
  pending: 0,
  approved: 0,
  rejected: 0,
})

let stopSafetyReviewSync = () => {}

const reviewQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  manualReviewRequired: 'true',
  reviewStatus: 'PENDING',
  riskLevel: '',
  riskType: '',
  keyword: '',
})

function unwrapResult(response, fallback = '请求失败') {
  if (Number(response?.code) !== 200) {
    throw new Error(response?.message || fallback)
  }
  return response.data
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function labelFrom(options, value) {
  return options.find((item) => item.value === value)?.label || value || '-'
}

function joinLabels(options, values) {
  if (!Array.isArray(values) || !values.length) {
    return '-'
  }
  return values.map((item) => labelFrom(options, item)).join(' / ')
}

function formatTime(value) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

function normalizeRecord(item = {}) {
  const manualReviewRequired = normalizeBoolean(item.manualReviewRequired ?? item.manual_review_required)
  const reviewStatus = normalizeReviewStatus(
    item.reviewStatus ?? item.review_status ?? item.auditStatus ?? item.audit_status,
    manualReviewRequired,
  )
  const riskTypes = Array.isArray(item.riskTypes)
    ? item.riskTypes
    : String(item.riskTypes || item.risk_types || '')
        .split(',')
        .map((type) => type.trim())
        .filter(Boolean)

  return {
    id: item.id ?? item.recordId ?? item.record_id ?? '',
    sourceModule: item.sourceModule ?? item.source_module ?? '',
    scene: item.scene ?? '',
    userRole: item.userRole ?? item.user_role ?? '',
    gradeLevel: item.gradeLevel ?? item.grade_level ?? '',
    classId: item.classId ?? item.class_id ?? '',
    inputText: item.inputText ?? item.input_text ?? '',
    outputText: item.outputText ?? item.output_text ?? '',
    allowed: normalizeBoolean(item.allowed),
    riskLevel: item.riskLevel ?? item.risk_level ?? 'LOW',
    riskTypes,
    decision: item.decision ?? 'PASS',
    reason: item.reason ?? '',
    suggestion: item.suggestion ?? '',
    processedText: item.processedText ?? item.processed_text ?? '',
    evidenceLevel: item.evidenceLevel ?? item.evidence_level ?? 'NOT_CHECKED',
    evidenceScore: item.evidenceScore ?? item.evidence_score ?? null,
    manualReviewRequired,
    reviewStatus,
    reviewRemark: item.reviewRemark ?? item.reviewComment ?? item.review_remark ?? item.review_comment ?? '',
    reviewerName: item.reviewerName ?? item.reviewByName ?? item.reviewer_name ?? item.review_by_name ?? '',
    reviewTime: item.reviewTime ?? item.review_time ?? '',
    metadata: item.metadata || {},
    createTime: item.createTime ?? item.create_time ?? '',
  }
}

const selectedClass = computed(() =>
  teacherClasses.value.find((item) => String(item.value) === String(selectedClassId.value || '')) || null,
)

const reviewRows = computed(() =>
  reviewRecords.value.map((item) => ({
    ...item,
    sourceModuleLabel: labelFrom(sourceModuleOptions, item.sourceModule),
    sceneLabel: labelFrom(sceneOptions, item.scene),
    gradeLabel: labelFrom(gradeOptions, item.gradeLevel),
    riskLevelLabel: labelFrom(riskLevelOptions, item.riskLevel),
    riskTypeLabel: joinLabels(riskTypeOptions, item.riskTypes),
    decisionLabel: labelFrom(decisionOptions, item.decision),
    reviewStatusLabel: reviewStatusLabel(item.reviewStatus, item.manualReviewRequired),
  })),
)

const summaryCards = computed(() => {
  return [
    {
      label: '待处理',
      value: reviewStats.pending,
      icon: Clock,
      tone: 'warning',
    },
    {
      label: '已通过',
      value: reviewStats.approved,
      icon: CircleCheck,
      tone: 'success',
    },
    {
      label: '已驳回',
      value: reviewStats.rejected,
      icon: WarningFilled,
      tone: 'danger',
    },
    {
      label: '当前筛选',
      value: reviewTotal.value,
      icon: ChatDotRound,
      tone: 'info',
    },
  ]
})

async function loadReviewStats() {
  if (!selectedClassId.value) {
    reviewStats.pending = 0
    reviewStats.approved = 0
    reviewStats.rejected = 0
    return
  }

  try {
    const classId = Number(selectedClassId.value)
    const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
      getSafetyReviewRecords({
        pageNum: 1,
        pageSize: 1,
        classId,
        userRole: 'STUDENT',
        reviewStatus: 'PENDING',
      }),
      getSafetyReviewRecords({
        pageNum: 1,
        pageSize: 1,
        classId,
        userRole: 'STUDENT',
        reviewStatus: 'APPROVED',
      }),
      getSafetyReviewRecords({
        pageNum: 1,
        pageSize: 1,
        classId,
        userRole: 'STUDENT',
        reviewStatus: 'REJECTED',
      }),
    ])

    reviewStats.pending = Number(unwrapResult(pendingRes, '获取待审统计失败')?.total || 0)
    reviewStats.approved = Number(unwrapResult(approvedRes, '获取已通过统计失败')?.total || 0)
    reviewStats.rejected = Number(unwrapResult(rejectedRes, '获取已驳回统计失败')?.total || 0)
  } catch (error) {
    ElMessage.error(error?.message || '获取审核统计失败')
  }
}

async function loadTeacherClasses() {
  classLoading.value = true
  try {
    const response = await getTeacherClassList({ pageNum: 1, pageSize: 100 })
    const payload = unwrapResult(response, '获取班级列表失败')
    const records = Array.isArray(payload?.records)
      ? payload.records
      : Array.isArray(payload?.list)
        ? payload.list
        : []

    teacherClasses.value = records.map((item) => ({
      label: item.className || item.name || `班级 ${item.id || item.classId}`,
      value: String(item.id || item.classId || ''),
      grade: item.grade || '',
      raw: item,
    }))

    if (!selectedClassId.value && teacherClasses.value.length) {
      selectedClassId.value = teacherClasses.value[0].value
    }
  } catch (error) {
    ElMessage.error(error?.message || '获取班级列表失败')
  } finally {
    classLoading.value = false
  }
}

async function loadReviewRecords() {
  if (!selectedClassId.value) {
    reviewRecords.value = []
    reviewTotal.value = 0
    return
  }

  reviewLoading.value = true
  try {
    const response = await getSafetyReviewRecords({
      pageNum: reviewQuery.pageNum,
      pageSize: reviewQuery.pageSize,
      classId: Number(selectedClassId.value),
      userRole: 'STUDENT',
      manualReviewRequired:
        reviewQuery.manualReviewRequired === 'true'
          ? true
          : reviewQuery.manualReviewRequired === 'false'
            ? false
            : undefined,
      reviewStatus: reviewQuery.reviewStatus || undefined,
      riskLevel: reviewQuery.riskLevel || undefined,
      riskType: reviewQuery.riskType || undefined,
      keyword: reviewQuery.keyword || undefined,
    })
    const payload = unwrapResult(response, '获取学生审核记录失败')
    const records = Array.isArray(payload?.records)
      ? payload.records
      : Array.isArray(payload?.list)
        ? payload.list
        : []

    reviewRecords.value = records.map(normalizeRecord)
    reviewTotal.value = Number(payload?.total || records.length)
    reviewQuery.pageNum = Number(payload?.pageNum || reviewQuery.pageNum)
    reviewQuery.pageSize = Number(payload?.pageSize || reviewQuery.pageSize)
    await loadReviewStats()
  } catch (error) {
    ElMessage.error(error?.message || '获取学生审核记录失败')
  } finally {
    reviewLoading.value = false
  }
}

function resetReviewFilters() {
  reviewQuery.pageNum = 1
  reviewQuery.pageSize = 10
  reviewQuery.manualReviewRequired = 'true'
  reviewQuery.reviewStatus = 'PENDING'
  reviewQuery.riskLevel = ''
  reviewQuery.riskType = ''
  reviewQuery.keyword = ''
  loadReviewRecords()
}

async function openReviewDetail(row) {
  if (!row?.id) {
    return
  }
  reviewDetailVisible.value = true
  reviewDetailLoading.value = true
  selectedReviewRecord.value = normalizeRecord(row)

  try {
    const response = await getSafetyReviewDetail(row.id)
    const payload = unwrapResult(response, '获取审核详情失败')
    selectedReviewRecord.value = normalizeRecord(payload || row)
  } catch (error) {
    ElMessage.error(error?.message || '获取审核详情失败')
  } finally {
    reviewDetailLoading.value = false
  }
}

function canTeacherApproveReview(record) {
  return record?.reviewStatus === 'PENDING' && record?.decision !== 'BLOCK'
}

async function submitReviewDecision(record, decision) {
  if (!record?.id || record.reviewStatus !== 'PENDING') {
    ElMessage.warning('这条记录已经不在待审核状态')
    return
  }

  if (decision === 'APPROVED' && !canTeacherApproveReview(record)) {
    ElMessage.warning('硬拦截内容不能由老师直接放行，请交给管理员处理')
    return
  }

  const approved = decision === 'APPROVED'
  const title = approved ? '审核通过' : '审核驳回'
  const message = approved ? '确认放行这条学生内容吗？' : '确认驳回这条学生内容吗？'

  try {
    const { value } = await ElMessageBox.prompt(message, title, {
      confirmButtonText: title,
      cancelButtonText: '取消',
      inputPlaceholder: '填写处理说明，方便后续追踪',
      inputType: 'textarea',
      inputValidator: (value) => {
        if (!approved && !String(value || '').trim()) {
          return '驳回时请写明原因'
        }
        return true
      },
    })

    reviewActionLoading.value = true
    const payload = { reviewRemark: String(value || '').trim() }
    const response = approved
      ? await approveSafetyReview(record.id, payload)
      : await rejectSafetyReview(record.id, payload)
    const result = unwrapResult(response, `${title}失败`)
    selectedReviewRecord.value = normalizeRecord(result || record)
    ElMessage.success(`${title}成功`)
    emitSafetyReviewSync({
      recordId: record.id,
      classId: record.classId,
      reviewStatus: decision,
      source: 'teacher-review-page',
    })
    await loadReviewRecords()
    await loadReviewStats()
  } catch (error) {
    if (error === 'cancel' || error?.action === 'cancel') {
      return
    }
    ElMessage.error(error?.message || `${title}失败`)
  } finally {
    reviewActionLoading.value = false
  }
}

function queryReviewRecords() {
  reviewQuery.pageNum = 1
  loadReviewRecords()
}

function reviewPageChange(pageNum) {
  reviewQuery.pageNum = pageNum
  loadReviewRecords()
}

function reviewSizeChange(pageSize) {
  reviewQuery.pageSize = pageSize
  reviewQuery.pageNum = 1
  loadReviewRecords()
}

watch(selectedClassId, () => {
  reviewQuery.pageNum = 1
  loadReviewRecords()
  loadReviewStats()
})

async function refreshTeacherReviewState(payload = {}) {
  if (!selectedClassId.value) {
    return
  }

  const changedClassId = payload?.classId
  if (changedClassId && String(changedClassId) !== String(selectedClassId.value)) {
    return
  }

  await Promise.all([loadReviewRecords(), loadReviewStats()])
}

const handleWindowFocus = () => {
  refreshTeacherReviewState()
}

const handleVisibilityChange = () => {
  if (!document.hidden) {
    refreshTeacherReviewState()
  }
}

onMounted(async () => {
  stopSafetyReviewSync = subscribeSafetyReviewSync((payload) => {
    refreshTeacherReviewState(payload)
  })

  window.addEventListener('focus', handleWindowFocus)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  await loadTeacherClasses()
})

onBeforeUnmount(() => {
  stopSafetyReviewSync()
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <main class="teacher-review-page">
    <header class="page-head">
      <div class="title-block">
        <span class="eyebrow">教师端安全评测</span>
        <h1>学生内容审核</h1>
        <p>这里只处理本班学生进入人工复审队列的内容；老师自己的 AI 发布前检测会在业务页面中弹窗确认。</p>
      </div>
      <div class="class-picker">
        <el-icon><School /></el-icon>
        <el-select v-model="selectedClassId" filterable clearable :loading="classLoading" placeholder="选择班级">
          <el-option v-for="item in teacherClasses" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
      </div>
    </header>

    <section class="summary-grid" aria-label="审核概览">
      <article v-for="item in summaryCards" :key="item.label" class="summary-card" :class="item.tone">
        <el-icon><component :is="item.icon" /></el-icon>
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </article>
    </section>

    <section class="review-shell">
      <div class="toolbar">
        <div class="filters">
          <el-select v-model="reviewQuery.manualReviewRequired" clearable placeholder="人工审核">
            <el-option label="需要人工审核" value="true" />
            <el-option label="无需人工审核" value="false" />
          </el-select>
          <el-select v-model="reviewQuery.reviewStatus" clearable placeholder="审核状态">
            <el-option v-for="item in reviewStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="reviewQuery.riskLevel" clearable placeholder="风险等级">
            <el-option v-for="item in riskLevelOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="reviewQuery.riskType" clearable placeholder="风险类型">
            <el-option v-for="item in riskTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-input v-model="reviewQuery.keyword" clearable placeholder="搜索学生输入、AI 输出、原因或建议">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
        </div>
        <div class="toolbar-actions">
          <el-button type="primary" @click="queryReviewRecords">查询</el-button>
          <el-button @click="resetReviewFilters">重置</el-button>
          <el-button :icon="Refresh" :loading="reviewLoading" @click="loadReviewRecords">刷新</el-button>
        </div>
      </div>

      <el-empty v-if="!selectedClassId" description="请选择一个班级后查看学生审核记录" />
      <el-table v-else v-loading="reviewLoading" :data="reviewRows" height="520">
        <el-table-column label="提交时间" width="170">
          <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
        </el-table-column>
        <el-table-column prop="sourceModuleLabel" label="来源" width="110" />
        <el-table-column prop="sceneLabel" label="场景" width="110" />
        <el-table-column prop="gradeLabel" label="学段" width="80" />
        <el-table-column label="处理动作" width="104">
          <template #default="{ row }">
            <el-tag :type="row.decision === 'BLOCK' ? 'danger' : row.decision === 'PASS' ? 'success' : 'warning'">
              {{ row.decisionLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="风险等级" width="104">
          <template #default="{ row }">
            <el-tag :type="row.riskLevel === 'HIGH' ? 'danger' : row.riskLevel === 'MEDIUM' ? 'warning' : 'success'" effect="plain">
              {{ row.riskLevelLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="riskTypeLabel" label="风险类型" min-width="150" show-overflow-tooltip />
        <el-table-column label="审核状态" width="118">
          <template #default="{ row }">
            <el-tag :type="reviewStatusTagType(row.reviewStatus, row.manualReviewRequired)">
              {{ row.reviewStatusLabel }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" fixed="right" width="96">
          <template #default="{ row }">
            <el-button link type="primary" @click="openReviewDetail(row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="selectedClassId" class="table-foot">
        <span>共 {{ reviewTotal }} 条记录</span>
        <el-pagination
          layout="prev, pager, next, sizes"
          :total="reviewTotal"
          :current-page="reviewQuery.pageNum"
          :page-size="reviewQuery.pageSize"
          :page-sizes="[10, 20, 30]"
          background
          @current-change="reviewPageChange"
          @size-change="reviewSizeChange"
        />
      </div>
    </section>

    <el-drawer v-model="reviewDetailVisible" size="560px" title="学生内容详情">
      <div v-if="selectedReviewRecord" v-loading="reviewDetailLoading" class="detail-shell">
        <div class="detail-tags">
          <el-tag :type="selectedReviewRecord.decision === 'BLOCK' ? 'danger' : selectedReviewRecord.decision === 'PASS' ? 'success' : 'warning'">
            {{ labelFrom(decisionOptions, selectedReviewRecord.decision) }}
          </el-tag>
          <el-tag :type="reviewStatusTagType(selectedReviewRecord.reviewStatus, selectedReviewRecord.manualReviewRequired)">
            {{ reviewStatusLabel(selectedReviewRecord.reviewStatus, selectedReviewRecord.manualReviewRequired) }}
          </el-tag>
          <el-tag effect="plain">{{ labelFrom(sourceModuleOptions, selectedReviewRecord.sourceModule) }}</el-tag>
        </div>

        <section class="detail-block">
          <span>学生输入</span>
          <p>{{ selectedReviewRecord.inputText || '-' }}</p>
        </section>
        <section class="detail-block">
          <span>AI 输出</span>
          <p>{{ selectedReviewRecord.outputText || '-' }}</p>
        </section>
        <section class="detail-block">
          <span>风险原因</span>
          <p>{{ selectedReviewRecord.reason || '-' }}</p>
        </section>
        <section class="detail-block">
          <span>处置建议</span>
          <p>{{ selectedReviewRecord.suggestion || '-' }}</p>
        </section>
        <section class="detail-block">
          <span>处理后文本</span>
          <p>{{ selectedReviewRecord.processedText || '-' }}</p>
        </section>

        <div class="review-action-panel">
          <div>
            <strong>人工复审</strong>
            <p v-if="selectedReviewRecord.reviewStatus === 'PENDING'">
              待审核记录可以驳回；非硬拦截内容可以由老师通过。硬拦截内容需要管理员处理。
            </p>
            <p v-else>
              已由 {{ selectedReviewRecord.reviewerName || '审核人' }} 处理，备注：{{ selectedReviewRecord.reviewRemark || '-' }}
            </p>
          </div>
          <div v-if="selectedReviewRecord.reviewStatus === 'PENDING'" class="review-actions">
            <el-button
              type="success"
              :disabled="!canTeacherApproveReview(selectedReviewRecord)"
              :loading="reviewActionLoading"
              @click="submitReviewDecision(selectedReviewRecord, 'APPROVED')"
            >
              通过
            </el-button>
            <el-button
              type="danger"
              :loading="reviewActionLoading"
              @click="submitReviewDecision(selectedReviewRecord, 'REJECTED')"
            >
              驳回
            </el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </main>
</template>

<style scoped>
.teacher-review-page {
  min-height: 100%;
  padding: 24px;
  background: #f5f7fb;
  color: #0f172a;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.title-block {
  min-width: 0;
}

.eyebrow {
  color: #5b6b83;
  font-size: 12px;
  font-weight: 700;
}

.page-head h1 {
  margin: 8px 0 0;
  font-size: 28px;
  color: #0f172a;
}

.page-head p {
  margin: 8px 0 0;
  max-width: 780px;
  color: #526174;
  line-height: 1.7;
}

.class-picker {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
  padding: 10px 12px;
  border: 1px solid #d9e1ec;
  border-radius: 8px;
  background: #ffffff;
}

.class-picker .el-icon {
  color: #2563eb;
}

.class-picker .el-select {
  flex: 1;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 4px 12px;
  min-height: 92px;
  padding: 16px;
  border: 1px solid #dde5ef;
  border-radius: 8px;
  background: #ffffff;
}

.summary-card .el-icon {
  grid-row: 1 / span 2;
  align-self: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  font-size: 20px;
}

.summary-card span {
  align-self: end;
  color: #65758b;
  font-size: 13px;
}

.summary-card strong {
  align-self: start;
  color: #111827;
  font-size: 24px;
}

.summary-card.warning .el-icon {
  background: #fff7ed;
  color: #d97706;
}

.summary-card.success .el-icon {
  background: #ecfdf5;
  color: #059669;
}

.summary-card.danger .el-icon {
  background: #fef2f2;
  color: #dc2626;
}

.summary-card.info .el-icon {
  background: #eff6ff;
  color: #2563eb;
}

.review-shell {
  padding: 18px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
}

.toolbar {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
}

.filters {
  display: grid;
  grid-template-columns: 150px 150px 140px 160px minmax(220px, 1fr);
  gap: 10px;
}

.toolbar-actions,
.detail-tags,
.table-foot,
.review-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.toolbar-actions {
  justify-content: flex-end;
}

.table-foot {
  justify-content: space-between;
  margin-top: 12px;
  color: #64748b;
}

.detail-shell {
  display: grid;
  gap: 14px;
}

.detail-block {
  padding: 12px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
}

.detail-block span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.detail-block p {
  margin: 8px 0 0;
  color: #111827;
  line-height: 1.7;
  white-space: pre-wrap;
}

.review-action-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fafc;
}

.review-action-panel strong {
  color: #0f172a;
}

.review-action-panel p {
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.7;
}

:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-textarea__inner),
:deep(.el-button) {
  border-radius: 8px;
}

:deep(.el-table) {
  --el-table-border-color: #e5ebf3;
  --el-table-header-bg-color: #f8fafc;
  --el-table-row-hover-bg-color: #f1f7ff;
  --el-table-header-text-color: #334155;
  --el-table-text-color: #0f172a;
}

@media (max-width: 1120px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .teacher-review-page {
    padding: 16px;
  }

  .page-head {
    align-items: stretch;
    flex-direction: column;
  }

  .class-picker {
    min-width: 0;
  }

  .summary-grid,
  .filters {
    grid-template-columns: 1fr;
  }

  .toolbar-actions,
  .table-foot,
  .review-actions {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
