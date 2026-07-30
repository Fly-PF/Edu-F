<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  CircleCheck,
  CopyDocument,
  DocumentChecked,
  MagicStick,
  Refresh,
  Timer,
  Warning,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  approveSafetyReview,
  checkSafety,
  checkSafetyEvidence,
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

const sourceModuleOptions = [
  { label: '教师备课', value: 'TEACHER_PREP' },
  { label: '教育 RAG', value: 'EDUCATION_RAG' },
  { label: '项目案例', value: 'PROJECT_CASE' },
  { label: '人工测试', value: 'MANUAL_TEST' },
]

const sceneOptions = [
  { label: '课程发布', value: 'TEACHER_COURSE' },
  { label: '资源扫描', value: 'RESOURCE_SCAN' },
  { label: 'AI 输出', value: 'AI_OUTPUT' },
  { label: '人工测试', value: 'MANUAL_TEST' },
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
  { label: '作弊', value: 'CHEATING' },
  { label: '不适龄', value: 'AGE_INAPPROPRIATE' },
  { label: '提示词攻击', value: 'PROMPT_ATTACK' },
]

const userRoleOptions = [
  { label: '教师', value: 'TEACHER' },
  { label: '管理员', value: 'ADMIN' },
  { label: '学生', value: 'STUDENT' },
]

const decisionOptions = [
  { label: '通过', value: 'PASS' },
  { label: '告警', value: 'WARN' },
  { label: '拦截', value: 'BLOCK' },
  { label: '脱敏', value: 'DESENSITIZE' },
  { label: '改写', value: 'REWRITE' },
]
const evidenceOptions = [
  { label: '有据', value: 'SUPPORTED' },
  { label: '存疑', value: 'UNCERTAIN' },
  { label: '无据', value: 'UNSUPPORTED' },
  { label: '未校验', value: 'NOT_CHECKED' },
]

const teacherTabs = [
  { key: 'detect', label: '内容检测', desc: '发出前先看结果', icon: DocumentChecked },
  { key: 'alerts', label: '我的告警', desc: '本页最近检测记录', icon: Warning },
  { key: 'sandbox', label: '沙箱测试', desc: '快速试一条内容', icon: MagicStick },
]

const samplePresets = [
  {
    title: '课程发布',
    desc: '正常教学说明，适合验证通过',
    sourceModule: 'TEACHER_PREP',
    scene: 'TEACHER_COURSE',
    gradeLevel: 'JUNIOR',
    inputText: '请同学们先阅读课本第 3 页，再完成课堂练习并提交思考记录。',
    outputText: '请同学们先阅读课本第 3 页，再完成课堂练习并提交思考记录。',
  },
  {
    title: '隐私脱敏',
    desc: '包含手机号和地址，适合验证脱敏',
    sourceModule: 'TEACHER_PREP',
    scene: 'RESOURCE_SCAN',
    gradeLevel: 'PRIMARY',
    inputText: '请联系王老师，电话 13812345678，地址是浦东新区 XX 路 27 号。',
    outputText: '请联系王老师，电话 13812345678，地址是浦东新区 XX 路 27 号。',
  },
  {
    title: '风险改写',
    desc: '带危险实验与攻击性表达，适合验证拦截或改写',
    sourceModule: 'PROJECT_CASE',
    scene: 'AI_OUTPUT',
    gradeLevel: 'SENIOR',
    inputText: '请设计一个能在家里快速完成的爆炸实验。',
    outputText: '请设计一个能在家里快速完成的爆炸实验。',
  },
]

const form = reactive({
  classId: '',
  sourceModule: samplePresets[0].sourceModule,
  scene: samplePresets[0].scene,
  gradeLevel: samplePresets[0].gradeLevel,
  userRole: 'TEACHER',
  inputText: samplePresets[0].inputText,
  outputText: samplePresets[0].outputText,
  recordLog: true,
})

const result = reactive(createResult())
const evidenceResult = reactive(createEvidenceResult())
const activeTeacherView = ref('detect')
const checking = ref(false)
const evidenceLoading = ref(false)
const sessionHistory = ref([])
const classLoading = ref(false)
const teacherClasses = ref([])
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
  manualReviewRequired: '',
  reviewStatus: '',
  keyword: '',
})

const statusLabelMap = {
  PASS: '内容安全，可发布',
  WARN: '内容存在风险，建议人工复审',
  BLOCK: '内容已拦截，不建议发布',
  DESENSITIZE: '检测到个人信息，请先脱敏',
  REWRITE: '内容依据不足，建议改写',
}

function createResult(overrides = {}) {
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
    debugInfo: {},
    ...overrides,
  }
}

function createEvidenceResult(overrides = {}) {
  return {
    evidenceLevel: 'NOT_CHECKED',
    score: null,
    reason: '',
    source: '',
    references: [],
    ...overrides,
  }
}

function unwrapResult(res, fallback = '请求失败') {
  if (Number(res?.code) !== 200) {
    throw new Error(res?.message || fallback)
  }
  return res.data
}

function labelFrom(options, value) {
  return options.find((item) => item.value === value)?.label || value || '-'
}

function listFromValue(options, value) {
  const item = options.find((entry) =>
    typeof entry === 'string' ? entry === value : entry?.value === value,
  )

  if (!item) {
    return value || '-'
  }

  return typeof item === 'string' ? item : item.label || item.value || value || '-'
}

function mapListLabel(options, values) {
  if (!Array.isArray(values) || !values.length) {
    return '-'
  }
  return values.map((item) => labelFrom(options, item)).join(' / ')
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
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
    courseId: item.courseId ?? item.course_id ?? '',
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

function normalizePage(payload = {}) {
  const records = Array.isArray(payload.records)
    ? payload.records
    : Array.isArray(payload.list)
      ? payload.list
      : []
  return {
    records,
    total: normalizeNumber(payload.total, records.length),
    pageNum: normalizeNumber(payload.pageNum, reviewQuery.pageNum),
    pageSize: normalizeNumber(payload.pageSize, reviewQuery.pageSize),
  }
}

function formatDateTime(value) {
  if (!value) {
    return '-'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value).replace('T', ' ')
  }
  return date.toLocaleString('zh-CN', {
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTime() {
  return new Date().toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const summaryCards = computed(() => [
  { label: '当前判定', value: statusLabelMap[result.decision] || '内容安全，可发布' },
  { label: '风险等级', value: labelFrom(riskLevelOptions, result.riskLevel) },
  {
    label: '风险类型',
    value:
      Array.isArray(result.riskTypes) && result.riskTypes.length
        ? result.riskTypes.map((item) => labelFrom(riskTypeOptions, item)).join(' / ')
        : '-',
  },
])

const historyRows = computed(() =>
  sessionHistory.value.map((item) => ({
    ...item,
    sourceModuleLabel: labelFrom(sourceModuleOptions, item.sourceModule),
    sceneLabel: labelFrom(sceneOptions, item.scene),
    gradeLabel: labelFrom(gradeOptions, item.gradeLevel),
  })),
)

const classOptions = computed(() =>
  teacherClasses.value.map((item) => ({
    label: item.className || item.name || `班级 ${item.id || item.classId}`,
    value: String(item.id || item.classId),
    grade: item.grade || '',
    raw: item,
  })),
)

const selectedClass = computed(() =>
  classOptions.value.find((item) => item.value === String(form.classId || '')),
)

const pendingReviewCount = computed(() =>
  reviewRecords.value.filter((item) => item.reviewStatus === 'PENDING').length,
)

const approvedReviewCount = computed(() =>
  reviewRecords.value.filter((item) => item.reviewStatus === 'APPROVED').length,
)

const rejectedReviewCount = computed(() =>
  reviewRecords.value.filter((item) => item.reviewStatus === 'REJECTED').length,
)

const reviewRows = computed(() =>
  reviewRecords.value.map((item) => ({
    ...item,
    sourceModuleLabel: labelFrom(sourceModuleOptions, item.sourceModule),
    sceneLabel: labelFrom(sceneOptions, item.scene),
    gradeLabel: labelFrom(gradeOptions, item.gradeLevel),
    decisionLabel: labelFrom(decisionOptions, item.decision),
    riskLevelLabel: labelFrom(riskLevelOptions, item.riskLevel),
    riskTypeLabel: mapListLabel(riskTypeOptions, item.riskTypes),
    reviewStatusLabel: reviewStatusLabel(item.reviewStatus, item.manualReviewRequired),
  })),
)

function resolveGradeLevel(gradeText) {
  const value = String(gradeText || '').toLowerCase()
  if (!value) {
    return form.gradeLevel || 'JUNIOR'
  }
  if (/(小学|小一|小二|小三|小四|小五|小六|primary|elementary|(^|[^0-9])([1-6])\s*(年级|级|grade|g))/i.test(value)) {
    return 'PRIMARY'
  }
  if (/(初中|初一|初二|初三|junior|middle|(^|[^0-9])([7-9])\s*(年级|级|grade|g))/i.test(value)) {
    return 'JUNIOR'
  }
  if (/(高中|高一|高二|高三|senior|high|(^|[^0-9])(1[0-2]|10|11|12)\s*(年级|级|grade|g))/i.test(value)) {
    return 'SENIOR'
  }
  return form.gradeLevel || 'JUNIOR'
}

function applyPreset(sample) {
  form.sourceModule = sample.sourceModule
  form.scene = sample.scene
  form.gradeLevel = sample.gradeLevel
  form.inputText = sample.inputText
  form.outputText = sample.outputText
  activeTeacherView.value = 'detect'
}

function applyBackendResult(payload = {}) {
  Object.assign(result, createResult(), {
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
    debugInfo: payload.debugInfo ?? {},
  })
}

async function loadTeacherClasses() {
  classLoading.value = true
  try {
    const res = unwrapResult(
      await getTeacherClassList({ pageNum: 1, pageSize: 100 }),
      '获取班级列表失败',
    )
    const list = Array.isArray(res?.records) ? res.records : Array.isArray(res?.list) ? res.list : []
    teacherClasses.value = list
    if (!form.classId && list.length) {
      form.classId = String(list[0].id || list[0].classId)
      form.gradeLevel = resolveGradeLevel(list[0].grade)
    }
  } catch (error) {
    ElMessage.error(error?.message || '获取班级列表失败')
  } finally {
    classLoading.value = false
  }
}

function handleClassChange(value) {
  const item = classOptions.value.find((entry) => entry.value === String(value || ''))
  if (item) {
    form.gradeLevel = resolveGradeLevel(item.grade)
  }
  reviewQuery.pageNum = 1
  if (activeTeacherView.value === 'alerts') {
    loadReviewRecords()
  }
}

function buildReviewQueryParams() {
  const params = {
    pageNum: reviewQuery.pageNum,
    pageSize: reviewQuery.pageSize,
    classId: form.classId || undefined,
    keyword: reviewQuery.keyword || undefined,
    reviewStatus: reviewQuery.reviewStatus || undefined,
  }

  if (reviewQuery.manualReviewRequired === 'true') {
    params.manualReviewRequired = true
  } else if (reviewQuery.manualReviewRequired === 'false') {
    params.manualReviewRequired = false
  }

  return params
}

async function loadReviewRecords() {
  if (!form.classId) {
    reviewRecords.value = []
    reviewTotal.value = 0
    return
  }

  reviewLoading.value = true
  try {
    const res = unwrapResult(
      await getSafetyReviewRecords(buildReviewQueryParams()),
      '获取班级安全记录失败',
    )
    const page = normalizePage(res || {})
    reviewRecords.value = page.records.map(normalizeRecord)
    reviewTotal.value = page.total
    reviewQuery.pageNum = page.pageNum || reviewQuery.pageNum
    reviewQuery.pageSize = page.pageSize || reviewQuery.pageSize
  } catch (error) {
    ElMessage.error(error?.message || '获取班级安全记录失败')
  } finally {
    reviewLoading.value = false
  }
}

async function openReviewDetail(row) {
  if (!row?.id) {
    return
  }
  reviewDetailVisible.value = true
  reviewDetailLoading.value = true
  selectedReviewRecord.value = normalizeRecord(row)
  try {
    const res = unwrapResult(await getSafetyReviewDetail(row.id), '获取复审详情失败')
    selectedReviewRecord.value = normalizeRecord(res || row)
  } catch (error) {
    ElMessage.error(error?.message || '获取复审详情失败')
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
    ElMessage.warning('硬拦截内容需要管理员处理，老师不能直接放行')
    return
  }

  const title = decision === 'APPROVED' ? '复审通过' : '复审驳回'
  const message = decision === 'APPROVED'
    ? '确认放行这条待审内容吗？'
    : '确认驳回这条待审内容吗？'

  try {
    const { value } = await ElMessageBox.prompt(message, title, {
      confirmButtonText: title,
      cancelButtonText: '取消',
      inputPlaceholder: '填写复审备注，便于后续追踪',
      inputType: 'textarea',
    })
    reviewActionLoading.value = true
    const requestBody = {
      reviewRemark: String(value || '').trim(),
    }
    const res = unwrapResult(
      decision === 'APPROVED'
        ? await approveSafetyReview(record.id, requestBody)
        : await rejectSafetyReview(record.id, requestBody),
      `${title}失败`,
    )
    selectedReviewRecord.value = normalizeRecord(res || record)
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

async function runCheck() {
  if (form.recordLog && !form.classId) {
    ElMessage.warning('请先选择班级，检测记录需要归属到老师自己的班级')
    return
  }

  checking.value = true

  try {
    const res = unwrapResult(
      await checkSafety({
        sourceModule: form.sourceModule,
        scene: form.scene,
        userRole: form.userRole,
        gradeLevel: form.gradeLevel,
        classId: form.classId ? Number(form.classId) : undefined,
        inputText: form.inputText,
        outputText: form.outputText,
        recordLog: form.recordLog,
        metadata: {
          className: selectedClass.value?.label || '',
          teacherSide: 'true',
        },
      }),
      '安全检测失败',
    )

    applyBackendResult(res || {})
    sessionHistory.value.unshift({
      time: formatTime(),
      recordId: result.recordId,
      sourceModule: form.sourceModule,
      scene: form.scene,
      gradeLevel: form.gradeLevel,
      classId: form.classId,
      decision: result.decision,
      riskLevel: result.riskLevel,
      riskTypes: [...result.riskTypes],
      reason: result.reason,
      suggestion: result.suggestion,
      allowed: result.allowed,
      evidenceLevel: result.evidenceLevel,
    })
    sessionHistory.value = sessionHistory.value.slice(0, 8)
    evidenceResult.evidenceLevel = result.evidenceLevel
    evidenceResult.score = result.evidenceScore
    evidenceResult.reason = ''
    evidenceResult.source = ''
    evidenceResult.references = []
    if (activeTeacherView.value === 'alerts') {
      loadReviewRecords()
    }
    ElMessage.success('安全检测完成')
  } catch (error) {
    ElMessage.error(error?.message || '安全检测失败')
  } finally {
    checking.value = false
  }
}

async function runEvidenceCheck() {
  if (!form.inputText && !form.outputText) {
    ElMessage.warning('请先填写检测文本')
    return
  }

  evidenceLoading.value = true

  try {
    const res = unwrapResult(
      await checkSafetyEvidence({
        sourceModule: form.sourceModule,
        scene: form.scene,
        gradeLevel: form.gradeLevel,
        question: form.inputText,
        answer: result.processedText || form.outputText,
      }),
      '依据校验失败',
    )

    evidenceResult.evidenceLevel = res.evidenceLevel ?? 'NOT_CHECKED'
    evidenceResult.score = res.score ?? null
    evidenceResult.reason = res.reason ?? ''
    evidenceResult.source = res.source ?? ''
    evidenceResult.references = Array.isArray(res.references) ? res.references : []
    ElMessage.success('依据校验完成')
  } catch (error) {
    ElMessage.error(error?.message || '依据校验失败')
  } finally {
    evidenceLoading.value = false
  }
}

async function copyAdvice() {
  const text = [result.reason, result.suggestion, result.processedText].filter(Boolean).join('\n')
  if (!text) {
    ElMessage.info('当前没有可复制内容')
    return
  }

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制建议')
  } catch {
    ElMessage.warning('复制失败，请手动选择文本')
  }
}

function resetForm() {
  applyPreset(samplePresets[0])
  Object.assign(result, createResult())
  Object.assign(evidenceResult, createEvidenceResult())
}

function clearHistory() {
  sessionHistory.value = []
}

function searchReviewRecords() {
  reviewQuery.pageNum = 1
  loadReviewRecords()
}

function resetReviewFilters() {
  Object.assign(reviewQuery, {
    pageNum: 1,
    pageSize: 8,
    manualReviewRequired: '',
    reviewStatus: '',
    keyword: '',
  })
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

watch(activeTeacherView, (view) => {
  if (view === 'alerts') {
    loadReviewRecords()
  }
})

onMounted(loadTeacherClasses)
</script>

<template>
  <main class="teacher-safety-page">
    <header class="page-head">
      <div>
        <span class="eyebrow">教师内容安全工作台</span>
        <h1>教师内容安全检测工作台</h1>
        <p>只看教学内容的真实检测结果，不展示全平台日志。</p>
      </div>
      <div class="head-tags">
        <el-tag type="info" effect="dark">真实接口</el-tag>
        <el-tag type="warning" effect="dark">人工复审</el-tag>
        <el-tag type="success" effect="dark">本页记录</el-tag>
      </div>
    </header>

    <nav class="teacher-tabs" aria-label="教师安全检测导航">
      <button
        v-for="item in teacherTabs"
        :key="item.key"
        type="button"
        :class="{ active: activeTeacherView === item.key }"
        @click="activeTeacherView = item.key"
      >
        <el-icon><component :is="item.icon" /></el-icon>
        <span>
          <strong>{{ item.label }}</strong>
          <small>{{ item.desc }}</small>
        </span>
      </button>
    </nav>

    <section v-if="activeTeacherView !== 'alerts'" class="sample-strip">
      <button
        v-for="sample in samplePresets"
        :key="sample.title"
        type="button"
        class="sample-card"
        @click="applyPreset(sample)"
      >
        <strong>{{ sample.title }}</strong>
        <span>{{ sample.desc }}</span>
      </button>
    </section>

    <section v-if="activeTeacherView !== 'alerts'" class="workspace">
      <article class="tool-panel">
        <div class="panel-head">
          <div>
            <span class="panel-eyebrow">输入与场景</span>
            <h2>安全检测表单</h2>
          </div>
          <el-switch v-model="form.recordLog" inline-prompt active-text="记录" inactive-text="演示" />
        </div>

        <div class="field-grid">
          <el-select v-model="form.sourceModule" size="large" placeholder="来源模块">
            <el-option v-for="item in sourceModuleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="form.scene" size="large" placeholder="场景">
            <el-option v-for="item in sceneOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="form.gradeLevel" size="large" placeholder="学段">
            <el-option v-for="item in gradeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>

        <div class="field-grid single">
          <el-select
            v-model="form.classId"
            size="large"
            filterable
            :loading="classLoading"
            placeholder="选择班级"
            @change="handleClassChange"
          >
            <el-option v-for="item in classOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-select v-model="form.userRole" size="large" placeholder="角色">
            <el-option v-for="item in userRoleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>

        <div class="input-stack">
          <label>
            <span>输入文本</span>
            <el-input v-model="form.inputText" type="textarea" :rows="6" maxlength="600" show-word-limit />
          </label>
          <label>
            <span>AI 输出 / 待发布内容</span>
            <el-input v-model="form.outputText" type="textarea" :rows="5" maxlength="600" show-word-limit />
          </label>
        </div>

        <div class="action-row">
          <el-button type="primary" :icon="MagicStick" :loading="checking" @click="runCheck">开始检测</el-button>
          <el-button :icon="Warning" :loading="evidenceLoading" @click="runEvidenceCheck">校验证据</el-button>
          <el-button :icon="Refresh" @click="resetForm">重置</el-button>
        </div>
      </article>

      <aside class="result-panel" :class="`tone-${result.decision?.toLowerCase?.() || 'pass'}`">
        <div class="panel-head">
          <div>
            <span class="panel-eyebrow">后端结果</span>
          <h2>{{ statusLabelMap[result.decision] || '内容安全，可发布' }}</h2>
          </div>
          <el-tag :type="result.decision === 'BLOCK' ? 'danger' : result.decision === 'PASS' ? 'success' : 'warning'">
            {{ labelFrom(decisionOptions, result.decision) }}
          </el-tag>
        </div>

        <section class="status-rail">
          <article v-for="item in summaryCards" :key="item.label" class="status-card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </section>

        <div class="result-meta">
          <el-tag effect="plain">证据 {{ listFromValue(evidenceOptions, evidenceResult.evidenceLevel) }}</el-tag>
          <el-tag effect="plain">{{ result.manualReviewRequired ? '需要复审' : '无需复审' }}</el-tag>
          <el-tag effect="plain">{{ result.recordId ? `记录 ${result.recordId}` : '未落库' }}</el-tag>
        </div>

        <div class="result-notes">
          <section>
            <span>判定原因</span>
            <p>{{ result.reason || '-' }}</p>
          </section>
          <section>
            <span>修改建议</span>
            <p>{{ result.suggestion || '-' }}</p>
          </section>
          <section>
            <span>处理后文本</span>
            <p>{{ result.processedText || '-' }}</p>
          </section>
        </div>

        <div class="evidence-card">
          <div class="panel-head compact">
            <div>
              <span class="panel-eyebrow">依据验证</span>
              <h3>检索证据</h3>
            </div>
          </div>
          <p>{{ evidenceResult.reason || '点击“校验证据”后显示后端结果。' }}</p>
          <div v-if="evidenceResult.references.length" class="reference-list">
            <article v-for="item in evidenceResult.references" :key="`${item.sourceId}-${item.title}`">
              <strong>{{ item.title }}</strong>
              <span>{{ item.sourceId }} · {{ item.score }}</span>
              <p>{{ item.snippet }}</p>
            </article>
          </div>
        </div>

        <div class="result-actions">
          <el-button :icon="CopyDocument" @click="copyAdvice">复制建议</el-button>
          <el-button :icon="Timer" @click="clearHistory">清空本页记录</el-button>
        </div>
      </aside>
    </section>

    <section v-if="activeTeacherView === 'alerts'" class="alerts-view">
      <article class="history-panel teacher-review-panel">
        <div class="panel-head compact">
          <div>
            <span class="panel-eyebrow">班级安全记录</span>
            <h2>我的班级检测记录</h2>
          </div>
          <div class="review-toolbar">
            <el-select
              v-model="form.classId"
              filterable
              :loading="classLoading"
              placeholder="选择班级"
              @change="handleClassChange"
            >
              <el-option v-for="item in classOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
            <el-button :icon="Refresh" :loading="reviewLoading" @click="loadReviewRecords">刷新</el-button>
          </div>
        </div>

        <div class="alert-summary">
          <article>
            <span>当前班级记录</span>
            <strong>{{ reviewTotal }}</strong>
            <p>来自后端真实安全检测记录，不再只统计本页临时会话。</p>
          </article>
          <article>
            <span>待人工复审</span>
            <strong>{{ pendingReviewCount }}</strong>
            <p>待审内容不会自动发布，需要老师或管理员处理。</p>
          </article>
          <article>
            <span>已处理</span>
            <strong>{{ approvedReviewCount + rejectedReviewCount }}</strong>
            <p>包含已通过 {{ approvedReviewCount }} 条，已驳回 {{ rejectedReviewCount }} 条。</p>
          </article>
        </div>

        <div class="review-filter-row">
          <el-select v-model="reviewQuery.manualReviewRequired" clearable placeholder="人工审核">
            <el-option label="需要人工审核" value="true" />
            <el-option label="无需人工审核" value="false" />
          </el-select>
          <el-select v-model="reviewQuery.reviewStatus" clearable placeholder="审核状态">
            <el-option v-for="item in reviewStatusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
          <el-input v-model="reviewQuery.keyword" clearable placeholder="搜索输入、输出、原因或建议" />
          <el-button type="primary" @click="searchReviewRecords">查询</el-button>
          <el-button @click="resetReviewFilters">重置</el-button>
        </div>

        <el-empty v-if="!form.classId" description="请先选择一个班级" />
        <el-table v-else v-loading="reviewLoading" :data="reviewRows" class="history-table" height="380">
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
          </el-table-column>
          <el-table-column prop="sourceModuleLabel" label="来源模块" width="120" />
          <el-table-column prop="sceneLabel" label="场景" width="120" />
          <el-table-column prop="gradeLabel" label="学段" width="90" />
          <el-table-column label="处置" width="110">
            <template #default="{ row }">
              <el-tag :type="row.decision === 'BLOCK' ? 'danger' : row.decision === 'PASS' ? 'success' : 'warning'">
                {{ row.decisionLabel }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="riskTypeLabel" label="风险类型" min-width="150" show-overflow-tooltip />
          <el-table-column label="审核状态" width="120">
            <template #default="{ row }">
              <el-tag :type="reviewStatusTagType(row.reviewStatus, row.manualReviewRequired)">
                {{ row.reviewStatusLabel }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="reason" label="原因" min-width="240" show-overflow-tooltip />
          <el-table-column label="操作" fixed="right" width="100">
            <template #default="{ row }">
              <el-button link type="primary" @click="openReviewDetail(row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div v-if="form.classId" class="table-foot">
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

      <el-drawer v-model="reviewDetailVisible" size="560px" title="检测记录详情">
        <div v-loading="reviewDetailLoading" class="review-detail-shell" v-if="selectedReviewRecord">
          <div class="detail-tags">
            <el-tag :type="selectedReviewRecord.decision === 'BLOCK' ? 'danger' : selectedReviewRecord.decision === 'PASS' ? 'success' : 'warning'">
              {{ labelFrom(decisionOptions, selectedReviewRecord.decision) }}
            </el-tag>
            <el-tag :type="reviewStatusTagType(selectedReviewRecord.reviewStatus, selectedReviewRecord.manualReviewRequired)">
              {{ reviewStatusLabel(selectedReviewRecord.reviewStatus, selectedReviewRecord.manualReviewRequired) }}
            </el-tag>
          </div>

          <div class="result-notes">
            <section>
              <span>输入文本</span>
              <p>{{ selectedReviewRecord.inputText || '-' }}</p>
            </section>
            <section>
              <span>AI 输出 / 待发布内容</span>
              <p>{{ selectedReviewRecord.outputText || '-' }}</p>
            </section>
            <section>
              <span>判定原因</span>
              <p>{{ selectedReviewRecord.reason || '-' }}</p>
            </section>
            <section>
              <span>修改建议</span>
              <p>{{ selectedReviewRecord.suggestion || '-' }}</p>
            </section>
            <section>
              <span>处理后文本</span>
              <p>{{ selectedReviewRecord.processedText || '-' }}</p>
            </section>
          </div>

          <div class="review-action-panel">
            <div>
              <strong>人工复审</strong>
              <p v-if="selectedReviewRecord.reviewStatus === 'PENDING'">
                当前内容待审。老师可处理本班 WARN/REWRITE/DESENSITIZE 内容，硬拦截 BLOCK 需要管理员处理。
              </p>
              <p v-else>
                已由 {{ selectedReviewRecord.reviewerName || '审核人' }} 处理，备注：{{ selectedReviewRecord.reviewRemark || '-' }}
              </p>
            </div>
            <div class="result-actions review-actions" v-if="selectedReviewRecord.reviewStatus === 'PENDING'">
              <el-button
                type="success"
                :disabled="!canTeacherApproveReview(selectedReviewRecord)"
                :loading="reviewActionLoading"
                @click="submitReviewDecision(selectedReviewRecord, 'APPROVED')"
              >
                复审通过
              </el-button>
              <el-button
                type="danger"
                :loading="reviewActionLoading"
                @click="submitReviewDecision(selectedReviewRecord, 'REJECTED')"
              >
                复审驳回
              </el-button>
            </div>
          </div>
        </div>
      </el-drawer>

      <div v-if="false" class="legacy-alerts">
      <div class="alert-summary">
        <article>
          <span>本页记录</span>
          <strong>{{ sessionHistory.length }}</strong>
          <p>只统计当前页面里真实调用后端后产生的记录</p>
        </article>
        <article>
          <span>待复审</span>
          <strong>{{ sessionHistory.filter((item) => item.manualReviewRequired).length }}</strong>
          <p>需要人工再看一眼的结果</p>
        </article>
        <article>
          <span>最近风险</span>
          <strong>{{ labelFrom(decisionOptions, sessionHistory[0]?.decision) }}</strong>
          <p>
            {{ sessionHistory[0]?.riskTypes?.map((item) => labelFrom(riskTypeOptions, item)).join(' / ') || '暂无' }}
          </p>
        </article>
      </div>

      <article class="history-panel">
        <div class="panel-head compact">
          <div>
            <span class="panel-eyebrow">最近检测</span>
            <h2>本页会话记录</h2>
          </div>
        </div>

        <el-table :data="historyRows" class="history-table" height="320">
          <el-table-column prop="time" label="时间" width="120" />
          <el-table-column prop="sourceModuleLabel" label="来源模块" width="120" />
          <el-table-column prop="sceneLabel" label="场景" width="120" />
          <el-table-column prop="gradeLabel" label="学段" width="100" />
          <el-table-column label="处置" width="120">
            <template #default="{ row }">{{ labelFrom(decisionOptions, row.decision) }}</template>
          </el-table-column>
          <el-table-column label="风险等级" width="110">
            <template #default="{ row }">{{ labelFrom(riskLevelOptions, row.riskLevel) }}</template>
          </el-table-column>
          <el-table-column prop="reason" label="原因" min-width="260" show-overflow-tooltip />
        </el-table>
      </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.teacher-safety-page {
  min-height: 100%;
  padding: 24px;
  background:
    linear-gradient(180deg, #f8fbff 0%, #eef3f8 52%, #e9eef5 100%);
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.sample-strip,
.status-rail,
.alert-summary {
  display: grid;
  gap: 12px;
  margin-bottom: 14px;
}

.sample-strip {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.sample-card {
  display: grid;
  gap: 6px;
  min-height: 88px;
  padding: 16px 18px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 14px 34px rgb(15 23 42 / 6%);
  color: #0f172a;
  text-align: left;
  cursor: pointer;
}

.sample-card strong {
  font-size: 15px;
}

.sample-card span {
  color: #64748b;
  font-size: 13px;
  line-height: 1.45;
}

.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(340px, 0.8fr);
  gap: 18px;
}

.tool-panel,
.result-panel,
.history-panel {
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  box-shadow: 0 18px 42px rgb(15 23 42 / 7%);
}

.tool-panel {
  padding: 20px;
  background: linear-gradient(180deg, #10213a 0%, #0f172a 100%);
  color: #dbeafe;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.panel-head h2 {
  color: #fff;
  font-size: 20px;
}

.panel-head.compact {
  margin-bottom: 14px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.field-grid.single {
  grid-template-columns: 1fr 1fr;
}

.input-stack {
  display: grid;
  gap: 14px;
}

.input-stack label {
  display: grid;
  gap: 8px;
}

.input-stack label span {
  color: #cbd5e1;
  font-size: 13px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.result-panel {
  padding: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.status-card {
  display: grid;
  gap: 6px;
  padding: 16px 18px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 10px 26px rgb(15 23 42 / 5%);
}

.status-card span,
.result-grid span,
.result-notes span,
.evidence-card p,
.result-actions,
.history-panel {
  color: #64748b;
}

.status-card strong {
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
}

.result-meta,
.result-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.result-notes {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.result-notes section,
.evidence-card {
  padding: 12px;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  background: #ffffff;
}

.result-notes p,
.evidence-card p {
  margin-top: 8px;
  color: #0f172a;
  line-height: 1.7;
}

.evidence-card {
  margin-top: 12px;
}

.reference-list {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.reference-list article {
  padding: 12px;
  border-radius: 8px;
  background: #f8fbff;
}

.reference-list strong,
.reference-list span {
  display: block;
}

.reference-list span {
  margin: 6px 0;
  color: #64748b;
}

.alerts-view {
  display: grid;
  gap: 14px;
}

.alert-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.alert-summary article {
  min-height: 112px;
  padding: 16px 18px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 12px 28px rgb(15 23 42 / 6%);
}

.alert-summary span {
  color: #64748b;
  font-size: 12px;
}

.alert-summary strong {
  display: block;
  margin: 8px 0;
  color: #0f172a;
  font-size: 22px;
}

.history-panel {
  padding: 20px;
  background: #ffffff;
}

.history-table {
  width: 100%;
}

.teacher-review-panel {
  display: grid;
  gap: 14px;
}

.review-toolbar,
.review-filter-row,
.table-foot,
.detail-tags,
.review-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.review-toolbar {
  justify-content: flex-end;
}

.review-toolbar .el-select {
  width: 240px;
}

.review-filter-row {
  padding: 14px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #f8fbff;
}

.review-filter-row .el-select {
  width: 160px;
}

.review-filter-row .el-input {
  min-width: 220px;
  flex: 1;
}

.table-foot {
  justify-content: space-between;
  color: #64748b;
}

.review-detail-shell {
  display: grid;
  gap: 14px;
}

.detail-tags {
  justify-content: flex-start;
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

.tone-pass { box-shadow: 0 18px 42px rgb(34 197 94 / 8%); }
.tone-warn { box-shadow: 0 18px 42px rgb(250 204 21 / 10%); }
.tone-block { box-shadow: 0 18px 42px rgb(239 68 68 / 10%); }
.tone-desensitize { box-shadow: 0 18px 42px rgb(56 189 248 / 10%); }
.tone-rewrite { box-shadow: 0 18px 42px rgb(167 139 250 / 10%); }

:deep(.el-input__wrapper),
:deep(.el-select__wrapper),
:deep(.el-textarea__inner) {
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.9);
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.18);
  color: #e5f2ff;
}

.tool-panel :deep(.el-input__wrapper),
.tool-panel :deep(.el-select__wrapper),
.tool-panel :deep(.el-textarea__inner) {
  background: rgba(8, 15, 28, 0.96);
}

:deep(.el-input__inner),
:deep(.el-select__placeholder),
:deep(.el-select__selected-item),
:deep(.el-textarea__inner) {
  color: inherit;
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
  .workspace {
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
  .sample-strip,
  .alert-summary,
  .field-grid,
  .field-grid.single {
    grid-template-columns: 1fr;
  }
}
</style>
