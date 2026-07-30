<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { DocumentChecked, Refresh, School, Search, Warning } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveSafetyReview,
  checkSafety,
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

const teacherTabs = [
  { key: 'publish', label: '发布前检测', desc: 'AI 生成内容先确认，再继续调用', icon: DocumentChecked },
  { key: 'review', label: '学生内容审核', desc: '查看班级待审记录与处理结果', icon: School },
]

const sourceModuleOptions = [
  { label: '教师备课', value: 'TEACHER_PREP' },
  { label: '教育 RAG', value: 'EDUCATION_RAG' },
  { label: '项目案例', value: 'PROJECT_CASE' },
  { label: '学情分析', value: 'LEARNING_ANALYSIS' },
  { label: '多模态教学', value: 'MULTIMODAL_TEACHING' },
]

const sceneOptions = [
  { label: '课程发布', value: 'TEACHER_COURSE' },
  { label: '资源审阅', value: 'RESOURCE_SCAN' },
  { label: 'AI 输出', value: 'AI_OUTPUT' },
]

const gradeOptions = [
  { label: '小学', value: 'PRIMARY' },
  { label: '初中', value: 'JUNIOR' },
  { label: '高中', value: 'SENIOR' },
]

const riskLevelOptions = [
  { label: '低', value: 'LOW' },
  { label: '中', value: 'MEDIUM' },
  { label: '高', value: 'HIGH' },
]

const riskTypeOptions = [
  { label: '幻觉', value: 'HALLUCINATION' },
  { label: '隐私泄露', value: 'PRIVACY' },
  { label: '诱导作弊', value: 'CHEATING' },
  { label: '不适龄', value: 'AGE_INAPPROPRIATE' },
  { label: '提示词攻击', value: 'PROMPT_ATTACK' },
]

const decisionOptions = [
  { label: '通过', value: 'PASS' },
  { label: '告警', value: 'WARN' },
  { label: '拦截', value: 'BLOCK' },
  { label: '脱敏', value: 'DESENSITIZE' },
  { label: '改写', value: 'REWRITE' },
]

const publishForm = reactive({
  sourceModule: 'TEACHER_PREP',
  scene: 'TEACHER_COURSE',
  gradeLevel: 'JUNIOR',
  inputText: '',
  outputText: '',
  recordLog: true,
})

const publishResult = reactive(createPublishResult())
const publishLoading = ref(false)
const publishContinueGranted = ref(false)
const publishContinueAt = ref('')
const publishHistory = ref([])
const activeTeacherView = ref('publish')

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

const reviewQuery = reactive({
  pageNum: 1,
  pageSize: 8,
  manualReviewRequired: 'true',
  reviewStatus: 'PENDING',
  keyword: '',
})

function createPublishResult(overrides = {}) {
  return {
    allowed: true,
    riskLevel: 'LOW',
    riskTypes: [],
    decision: 'PASS',
    reason: '',
    suggestion: '',
    processedText: '',
    evidenceLevel: 'NOT_CHECKED',
    evidenceScore: null,
    recordId: null,
    manualReviewRequired: false,
    teacherConfirmationRequired: false,
    debugInfo: {},
    ...overrides,
  }
}

function unwrapResult(response, fallback = '请求失败') {
  if (Number(response?.code) !== 200) {
    throw new Error(response?.message || fallback)
  }
  return response.data
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

function formatTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString('zh-CN', { hour12: false })
}

function resolveGradeLevel(gradeText) {
  const text = String(gradeText || '').toLowerCase()
  if (!text) {
    return publishForm.gradeLevel || 'JUNIOR'
  }
  if (/(小学|primary|elementary|1-6|[1-6]年级)/i.test(text)) return 'PRIMARY'
  if (/(初中|junior|middle|7-9|[7-9]年级)/i.test(text)) return 'JUNIOR'
  if (/(高中|senior|high|10-12|1[0-2]年级)/i.test(text)) return 'SENIOR'
  return publishForm.gradeLevel || 'JUNIOR'
}

function normalizeBoolean(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function normalizeRecord(item = {}) {
  const manualReviewRequired = normalizeBoolean(item.manualReviewRequired ?? item.manual_review_required)
  const reviewStatus = normalizeReviewStatus(
    item.reviewStatus ?? item.review_status ?? item.auditStatus ?? item.audit_status,
    manualReviewRequired,
  )

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
    riskTypes: Array.isArray(item.riskTypes) ? item.riskTypes : [],
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
    debugInfo: item.debugInfo || {},
    createTime: item.createTime ?? item.create_time ?? '',
  }
}

const selectedClass = computed(() =>
  teacherClasses.value.find((item) => String(item.value) === String(selectedClassId.value || '')) || null,
)

const publishSummaryCards = computed(() => [
  { label: '当前判定', value: labelFrom(decisionOptions, publishResult.decision) },
  { label: '风险等级', value: labelFrom(riskLevelOptions, publishResult.riskLevel) },
  {
    label: '风险类型',
    value: joinLabels(riskTypeOptions, publishResult.riskTypes),
  },
  {
    label: '继续确认',
    value: publishContinueGranted.value ? `已确认 · ${publishContinueAt.value}` : '未确认',
  },
])

const publishHistoryRows = computed(() =>
  publishHistory.value.map((item) => ({
    ...item,
    decisionLabel: labelFrom(decisionOptions, item.decision),
    riskLevelLabel: labelFrom(riskLevelOptions, item.riskLevel),
    riskTypeLabel: joinLabels(riskTypeOptions, item.riskTypes),
  })),
)

const reviewSummaryCards = computed(() => {
  const pending = reviewRecords.value.filter((item) => item.reviewStatus === 'PENDING').length
  const approved = reviewRecords.value.filter((item) => item.reviewStatus === 'APPROVED').length
  const rejected = reviewRecords.value.filter((item) => item.reviewStatus === 'REJECTED').length

  return [
    { label: '当前班级记录', value: reviewTotal.value },
    { label: '待处理', value: pending },
    { label: '已通过', value: approved },
    { label: '已驳回', value: rejected },
  ]
})

const reviewRows = computed(() =>
  reviewRecords.value.map((item) => ({
    ...item,
    sourceModuleLabel: labelFrom(sourceModuleOptions, item.sourceModule),
    sceneLabel: labelFrom(sceneOptions, item.scene),
    gradeLabel: labelFrom(gradeOptions, item.gradeLevel),
    decisionLabel: labelFrom(decisionOptions, item.decision),
    riskLevelLabel: labelFrom(riskLevelOptions, item.riskLevel),
    riskTypeLabel: joinLabels(riskTypeOptions, item.riskTypes),
    reviewStatusLabel: reviewStatusLabel(item.reviewStatus, item.manualReviewRequired),
  })),
)

watch(
  () => [selectedClassId.value, publishForm.gradeLevel, publishForm.scene, publishForm.sourceModule],
  () => {
    publishContinueGranted.value = false
  },
)

watch(
  () => selectedClass.value,
  (item) => {
    if (!item) {
      return
    }
    publishForm.gradeLevel = resolveGradeLevel(item.grade)
    if (activeTeacherView.value === 'review') {
      loadReviewRecords()
    }
  },
)

watch(
  () => activeTeacherView.value,
  (view) => {
    if (view === 'review') {
      loadReviewRecords()
    }
  },
)

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
      publishForm.gradeLevel = resolveGradeLevel(teacherClasses.value[0].grade)
    }
  } catch (error) {
    ElMessage.error(error?.message || '获取班级列表失败')
  } finally {
    classLoading.value = false
  }
}

function buildPublishPayload() {
  return {
    sourceModule: publishForm.sourceModule,
    scene: publishForm.scene,
    userRole: 'TEACHER',
    gradeLevel: publishForm.gradeLevel,
    classId: selectedClassId.value ? Number(selectedClassId.value) : undefined,
    inputText: publishForm.inputText,
    outputText: publishForm.outputText,
    recordLog: publishForm.recordLog,
    metadata: {
      teacherSide: 'true',
      className: selectedClass.value?.label || '',
    },
  }
}

function clearPublishDraft() {
  publishForm.sourceModule = 'TEACHER_PREP'
  publishForm.scene = 'TEACHER_COURSE'
  publishForm.gradeLevel = selectedClass.value ? resolveGradeLevel(selectedClass.value.grade) : 'JUNIOR'
  publishForm.inputText = ''
  publishForm.outputText = ''
  publishForm.recordLog = true
  Object.assign(publishResult, createPublishResult())
  publishContinueGranted.value = false
  publishContinueAt.value = ''
}

function recordPublishHistory(response) {
  publishHistory.value.unshift({
    time: formatTime(),
    decision: response.decision,
    riskLevel: response.riskLevel,
    riskTypes: Array.isArray(response.riskTypes) ? response.riskTypes : [],
    reason: response.reason,
    suggestion: response.suggestion,
    continueRequired: Boolean(response.teacherConfirmationRequired),
    continueGranted: publishContinueGranted.value,
  })
  publishHistory.value = publishHistory.value.slice(0, 6)
}

async function askToContinue(response) {
  const reason = response.reason || '检测到风险提示'
  const suggestion = response.suggestion || '可根据提示调整内容后再继续。'
  const message = [
    '检测已完成，当前内容需要你确认是否继续调用 AI。',
    `原因：${reason}`,
    `建议：${suggestion}`,
    '如果继续，后续可以回到原来的业务流程继续生成或发布。',
  ].join('\n')

  await ElMessageBox.confirm(message, '是否继续调用 AI', {
    type: 'warning',
    confirmButtonText: '继续',
    cancelButtonText: '先修改',
  })

  publishContinueGranted.value = true
  publishContinueAt.value = formatTime()
  ElMessage.success('已确认继续，可返回业务模块继续调用 AI')
}

async function runPublishCheck() {
  if (!publishForm.inputText.trim() && !publishForm.outputText.trim()) {
    ElMessage.warning('请先输入待检测内容')
    return
  }

  publishLoading.value = true
  publishContinueGranted.value = false

  try {
    const response = await checkSafety(buildPublishPayload())
    const payload = unwrapResult(response, '安全检测失败')

    Object.assign(publishResult, createPublishResult(), {
      allowed: Boolean(payload.allowed ?? true),
      riskLevel: payload.riskLevel ?? 'LOW',
      riskTypes: Array.isArray(payload.riskTypes) ? payload.riskTypes : [],
      decision: payload.decision ?? 'PASS',
      reason: payload.reason ?? '',
      suggestion: payload.suggestion ?? '',
      processedText: payload.processedText ?? '',
      evidenceLevel: payload.evidenceLevel ?? 'NOT_CHECKED',
      evidenceScore: payload.evidenceScore ?? null,
      recordId: payload.recordId ?? null,
      manualReviewRequired: Boolean(payload.manualReviewRequired ?? false),
      teacherConfirmationRequired: Boolean(payload.teacherConfirmationRequired ?? false),
      debugInfo: payload.debugInfo ?? {},
    })

    recordPublishHistory(payload)

    if (publishResult.decision === 'BLOCK') {
      ElMessage.warning('当前内容已被拦截，请先修改后再继续。')
      return
    }

    if (publishResult.teacherConfirmationRequired || publishResult.decision !== 'PASS') {
      await askToContinue(publishResult)
      return
    }

    ElMessage.success('检测完成，内容可直接继续流转。')
  } catch (error) {
    if (error === 'cancel' || error?.action === 'cancel') {
      return
    }
    ElMessage.error(error?.message || '安全检测失败')
  } finally {
    publishLoading.value = false
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
  } catch (error) {
    ElMessage.error(error?.message || '获取学生审核记录失败')
  } finally {
    reviewLoading.value = false
  }
}

function resetReviewFilters() {
  reviewQuery.pageNum = 1
  reviewQuery.pageSize = 8
  reviewQuery.manualReviewRequired = 'true'
  reviewQuery.reviewStatus = 'PENDING'
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
    return
  }

  if (decision === 'APPROVED' && !canTeacherApproveReview(record)) {
    ElMessage.warning('硬拦截内容需要管理员处理。')
    return
  }

  const title = decision === 'APPROVED' ? '审核通过' : '审核驳回'
  const message =
    decision === 'APPROVED' ? '确认放行这条学生内容吗？' : '确认驳回这条学生内容吗？'

  try {
    const { value } = await ElMessageBox.prompt(message, title, {
      confirmButtonText: title,
      cancelButtonText: '取消',
      inputPlaceholder: '填写备注，方便后续追踪',
      inputType: 'textarea',
    })
    reviewActionLoading.value = true
    const payload = { reviewRemark: String(value || '').trim() }
    const response =
      decision === 'APPROVED'
        ? await approveSafetyReview(record.id, payload)
        : await rejectSafetyReview(record.id, payload)
    const result = unwrapResult(response, `${title}失败`)
    selectedReviewRecord.value = normalizeRecord(result || record)
    ElMessage.success(`${title}成功`)
    await loadReviewRecords()
  } catch (error) {
    if (error === 'cancel' || error?.action === 'cancel') {
      return
    }
    ElMessage.error(error?.message || `${title}失败`)
  } finally {
    reviewActionLoading.value = false
  }
}

function applyTab(tab) {
  activeTeacherView.value = tab
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
  publishContinueGranted.value = false
  if (activeTeacherView.value === 'review') {
    loadReviewRecords()
  }
})

onMounted(async () => {
  await loadTeacherClasses()
  if (activeTeacherView.value === 'review') {
    loadReviewRecords()
  }
})
</script>

<template>
  <main class="teacher-safety-page">
    <header class="page-head">
      <div>
        <span class="eyebrow">教师内容安全</span>
        <h1>发布前确认与学生内容审核</h1>
        <p>老师先看安全结果，再决定是否继续调用 AI；学生内容则集中进入班级审核队列。</p>
      </div>
      <div class="head-tags">
        <el-tag v-if="selectedClass" effect="plain">当前班级：{{ selectedClass.label }}</el-tag>
        <el-tag effect="plain">教师端</el-tag>
      </div>
    </header>

    <nav class="teacher-tabs" aria-label="教师安全导航">
      <button
        v-for="item in teacherTabs"
        :key="item.key"
        type="button"
        :class="{ active: activeTeacherView === item.key }"
        @click="applyTab(item.key)"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>
          <strong>{{ item.label }}</strong>
          <small>{{ item.desc }}</small>
        </span>
      </button>
    </nav>

    <section v-if="activeTeacherView === 'publish'" class="publish-layout">
      <article class="panel publish-panel">
        <div class="panel-head">
          <div>
            <span class="panel-eyebrow">发布前检测</span>
            <h2>老师内容安全确认</h2>
          </div>
          <div class="panel-tools">
            <el-select v-model="selectedClassId" filterable clearable :loading="classLoading" placeholder="班级">
              <el-option v-for="item in teacherClasses" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-switch v-model="publishForm.recordLog" inline-prompt active-text="记录" inactive-text="演示" />
          </div>
        </div>

        <div class="field-grid">
          <el-form-item label="来源模块">
            <el-select v-model="publishForm.sourceModule" class="full-width">
              <el-option v-for="item in sourceModuleOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="检测场景">
            <el-select v-model="publishForm.scene" class="full-width">
              <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="适配学段">
            <el-select v-model="publishForm.gradeLevel" class="full-width">
              <el-option v-for="item in gradeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
        </div>

        <div class="input-stack">
          <el-form-item label="教师输入 / 待生成提示">
            <el-input
              v-model="publishForm.inputText"
              type="textarea"
              :rows="5"
              maxlength="3000"
              show-word-limit
              placeholder="填写老师准备发给 AI 的问题、教案片段、作业说明或提示词"
            />
          </el-form-item>
          <el-form-item label="AI 输出 / 待发布内容">
            <el-input
              v-model="publishForm.outputText"
              type="textarea"
              :rows="6"
              maxlength="4000"
              show-word-limit
              placeholder="填写 AI 生成后准备发布的内容"
            />
          </el-form-item>
        </div>

        <div class="action-row">
          <el-button type="primary" :loading="publishLoading" @click="runPublishCheck">检测并继续</el-button>
          <el-button @click="clearPublishDraft">清空</el-button>
        </div>
      </article>

      <aside class="panel result-panel">
        <div class="summary-grid">
          <article v-for="item in publishSummaryCards" :key="item.label" class="summary-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value || '-' }}</strong>
          </article>
        </div>

        <section class="detail-block">
          <span>判定原因</span>
          <p>{{ publishResult.reason || '检测后会显示原因' }}</p>
        </section>
        <section class="detail-block">
          <span>修改建议</span>
          <p>{{ publishResult.suggestion || '检测后会显示建议' }}</p>
        </section>
        <section class="detail-block">
          <span>处理后文本</span>
          <p>{{ publishResult.processedText || '-' }}</p>
        </section>

        <el-alert
          v-if="publishContinueGranted"
          type="success"
          :closable="false"
          show-icon
          title="已确认继续，后续可以回到业务模块继续调用 AI"
        />

        <div class="result-actions">
          <el-tag v-if="publishResult.teacherConfirmationRequired" type="warning" effect="plain">需要老师确认</el-tag>
          <el-tag v-if="publishResult.recordId" type="info" effect="plain">记录 #{{ publishResult.recordId }}</el-tag>
        </div>

        <div class="history-block">
          <div class="block-head">
            <div>
              <span class="panel-eyebrow">最近检查</span>
              <h3>本页会话记录</h3>
            </div>
            <el-icon><Warning /></el-icon>
          </div>

          <el-table :data="publishHistoryRows" height="240">
            <el-table-column label="时间" width="160">
              <template #default="{ row }">{{ row.time }}</template>
            </el-table-column>
            <el-table-column prop="decisionLabel" label="判定" width="90" />
            <el-table-column prop="riskLevelLabel" label="风险" width="70" />
            <el-table-column prop="riskTypeLabel" label="类型" min-width="160" show-overflow-tooltip />
            <el-table-column label="继续" width="90">
              <template #default="{ row }">{{ row.continueGranted ? '已确认' : '未确认' }}</template>
            </el-table-column>
          </el-table>
        </div>
      </aside>
    </section>

    <section v-else class="review-layout">
      <article class="panel review-panel">
        <div class="panel-head">
          <div>
            <span class="panel-eyebrow">学生内容审核</span>
            <h2>班级审核队列</h2>
          </div>
          <div class="panel-tools">
            <el-select v-model="selectedClassId" filterable clearable :loading="classLoading" placeholder="班级">
              <el-option v-for="item in teacherClasses" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-button :icon="Refresh" :loading="reviewLoading" @click="loadReviewRecords">刷新</el-button>
          </div>
        </div>

        <div class="summary-grid review-summary">
          <article v-for="item in reviewSummaryCards" :key="item.label" class="summary-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <div class="filter-row">
          <el-select v-model="reviewQuery.manualReviewRequired" clearable placeholder="人工审核">
            <el-option label="需要人工审核" value="true" />
            <el-option label="无需人工审核" value="false" />
          </el-select>
          <el-select v-model="reviewQuery.reviewStatus" clearable placeholder="审核状态">
            <el-option v-for="item in reviewStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-input v-model="reviewQuery.keyword" clearable placeholder="搜索输入、输出、原因或建议">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button type="primary" @click="loadReviewRecords">查询</el-button>
          <el-button @click="resetReviewFilters">重置</el-button>
        </div>

        <el-empty v-if="!selectedClassId" description="请先选择一个班级" />
        <el-table v-else v-loading="reviewLoading" :data="reviewRows" height="420">
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ formatTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column prop="sourceModuleLabel" label="来源模块" width="120" />
          <el-table-column prop="sceneLabel" label="场景" width="110" />
          <el-table-column prop="gradeLabel" label="学段" width="90" />
          <el-table-column label="判定" width="90">
            <template #default="{ row }">
              <el-tag :type="row.decision === 'BLOCK' ? 'danger' : row.decision === 'PASS' ? 'success' : 'warning'">
                {{ row.decisionLabel }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="riskTypeLabel" label="风险类型" min-width="150" show-overflow-tooltip />
          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-tag :type="reviewStatusTagType(row.reviewStatus, row.manualReviewRequired)">
                {{ row.reviewStatusLabel }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="88">
            <template #default="{ row }">
              <el-button link type="primary" @click="openReviewDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="selectedClassId" class="table-foot">
          <div>共 {{ reviewTotal }} 条</div>
          <el-pagination
            layout="prev, pager, next, sizes"
            :total="reviewTotal"
            :current-page="reviewQuery.pageNum"
            :page-size="reviewQuery.pageSize"
            :page-sizes="[8, 12, 20]"
            background
            @current-change="reviewPageChange"
            @size-change="reviewSizeChange"
          />
        </div>
      </article>

      <el-drawer v-model="reviewDetailVisible" size="560px" title="审核详情">
        <div v-loading="reviewDetailLoading" class="review-detail-shell" v-if="selectedReviewRecord">
          <div class="detail-tags">
            <el-tag :type="selectedReviewRecord.decision === 'BLOCK' ? 'danger' : selectedReviewRecord.decision === 'PASS' ? 'success' : 'warning'">
              {{ labelFrom(decisionOptions, selectedReviewRecord.decision) }}
            </el-tag>
            <el-tag :type="reviewStatusTagType(selectedReviewRecord.reviewStatus, selectedReviewRecord.manualReviewRequired)">
              {{ reviewStatusLabel(selectedReviewRecord.reviewStatus, selectedReviewRecord.manualReviewRequired) }}
            </el-tag>
          </div>

          <section class="detail-block">
            <span>输入文本</span>
            <p>{{ selectedReviewRecord.inputText || '-' }}</p>
          </section>
          <section class="detail-block">
            <span>AI 输出 / 待发布内容</span>
            <p>{{ selectedReviewRecord.outputText || '-' }}</p>
          </section>
          <section class="detail-block">
            <span>判定原因</span>
            <p>{{ selectedReviewRecord.reason || '-' }}</p>
          </section>
          <section class="detail-block">
            <span>修改建议</span>
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
                当前记录仍在等待处理。教师可对非硬拦截内容进行放行或驳回，硬拦截内容建议交由管理员处理。
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
    </section>
  </main>
</template>

<style scoped>
.teacher-safety-page {
  min-height: 100%;
  padding: 24px;
  background: linear-gradient(180deg, #f7faff 0%, #edf3f8 100%);
  color: #0f172a;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.eyebrow,
.panel-eyebrow {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.page-head h1,
.panel-head h2,
.panel-head h3 {
  margin: 8px 0 0;
  color: #0f172a;
}

.page-head h1 {
  font-size: 28px;
}

.page-head p {
  margin: 8px 0 0;
  color: #475569;
}

.head-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.teacher-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.teacher-tabs button {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 78px;
  padding: 14px 16px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 12px 28px rgb(15 23 42 / 6%);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
}

.teacher-tabs button.active {
  border-color: rgba(47, 128, 237, 0.5);
  background: linear-gradient(135deg, #eef7ff, #f7f3ff);
  box-shadow: 0 16px 34px rgb(37 99 235 / 12%);
}

.teacher-tabs .el-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
}

.teacher-tabs strong,
.teacher-tabs small {
  display: block;
}

.teacher-tabs strong {
  font-size: 15px;
}

.teacher-tabs small {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
}

.publish-layout,
.review-layout {
  display: grid;
  gap: 16px;
}

.publish-layout {
  grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
}

.panel {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 42px rgb(15 23 42 / 7%);
}

.publish-panel,
.review-panel {
  padding: 20px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-head.compact {
  margin-bottom: 14px;
}

.panel-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.panel-tools .el-select {
  width: 240px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.full-width {
  width: 100%;
}

.input-stack {
  display: grid;
  gap: 14px;
}

.action-row,
.result-actions,
.review-actions,
.detail-tags,
.table-foot,
.filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.action-row {
  margin-top: 16px;
}

.result-panel {
  padding: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.summary-item {
  display: grid;
  gap: 6px;
  min-height: 84px;
  padding: 14px 16px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.summary-item span,
.detail-block span {
  color: #64748b;
  font-size: 12px;
}

.summary-item strong {
  color: #0f172a;
  font-size: 17px;
  font-weight: 700;
}

.detail-block {
  padding: 12px;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  background: #ffffff;
}

.detail-block + .detail-block {
  margin-top: 10px;
}

.detail-block p {
  margin-top: 8px;
  color: #0f172a;
  line-height: 1.7;
  white-space: pre-wrap;
}

.history-block {
  margin-top: 12px;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.block-head h3 {
  margin: 8px 0 0;
  font-size: 16px;
}

.review-summary {
  margin-bottom: 14px;
}

.filter-row {
  padding: 14px;
  margin-bottom: 14px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fbff;
}

.filter-row .el-select {
  width: 160px;
}

.filter-row .el-input {
  min-width: 220px;
  flex: 1;
}

.table-foot {
  justify-content: space-between;
  margin-top: 10px;
  color: #64748b;
}

.review-detail-shell {
  display: grid;
  gap: 14px;
}

.review-action-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fbff;
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
:deep(.el-textarea__inner) {
  border-radius: 8px;
}

:deep(.el-button) {
  border-radius: 8px;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #0ea5e9, #7c3aed);
  border: 0;
}

:deep(.el-table) {
  --el-table-border-color: #e5ebf3;
  --el-table-header-bg-color: #f8fbff;
  --el-table-row-hover-bg-color: #f1f7ff;
  --el-table-header-text-color: #334155;
  --el-table-text-color: #0f172a;
}

@media (max-width: 1180px) {
  .publish-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .page-head,
  .panel-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .teacher-tabs,
  .field-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .panel-tools,
  .action-row,
  .review-actions,
  .detail-tags,
  .filter-row,
  .table-foot {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .panel-tools .el-select,
  .filter-row .el-select,
  .filter-row .el-input {
    width: 100%;
  }
}
</style>
