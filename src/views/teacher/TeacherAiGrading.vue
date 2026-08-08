<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, CircleCheck, CopyDocument, Delete, MagicStick, Plus, RefreshLeft } from '@element-plus/icons-vue'
import { generateGrading } from '@/api/teacherAi'
import { getTeacherPracticeSubmission, saveTeacherPracticeAiDraft } from '@/api/learningPractice'
import { useUserStore } from '@/stores/user'
import GradingWorkspace from '@/components/teacher-ai/grading/GradingWorkspace.vue'
import GradingReport from '@/components/teacher-ai/grading/GradingReport.vue'
import RubricEditor from '@/components/teacher-ai/grading/RubricEditor.vue'
import ManualReviewWorkspace from '@/components/teacher-ai/manual-review/ManualReviewWorkspace.vue'
import {
  buildLearningInsight,
  hasLearningInsight,
  saveLearningInsight,
} from '@/utils/teacherAiLearningInsight'

const emit = defineEmits(['use-learning-insight'])

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const gradingFormRef = ref()
const gradingStartRef = ref()
const gradingLoading = ref(false)
const gradingSlowNotice = ref(false)
const gradingResult = ref(null)
const gradingResultMaxScore = ref(10)
const gradingResultInputSignature = ref('')
const linkedSubmission = ref(null)
const linkedSubmissionLoading = ref(false)
const linkedQuestionIndex = ref(0)
const linkedAppliedQuestionIds = ref([])
const applyingLinkedSuggestion = ref(false)
const teacherScore = ref(null)
const reviewComment = ref('')
const reviewStatus = ref('pending')
let gradingSlowNoticeTimer = null
let manualDraftSaveSuppressed = false
let rubricSequence = 3
const MANUAL_GRADING_DRAFT_KEY = 'edu-f:teacher-ai:manual-grading-draft'

function createGradingDefaults() {
  return {
    question: '',
    questionType: '简答题',
    referenceAnswer: '',
    rubric: [
      { id: 1, criterion: '知识准确性', description: '核心概念和结论准确', maxScore: 4 },
      { id: 2, criterion: '要点完整性', description: '覆盖题目要求的主要得分点', maxScore: 3 },
      { id: 3, criterion: '逻辑与表达', description: '思路清晰，表达规范且有依据', maxScore: 3 },
    ],
    studentAnswer: '',
    maxScore: 10,
  }
}

const gradingForm = reactive(createGradingDefaults())

function isPracticeSubmissionMode() {
  const submissionId = Number(route.query.submissionId)
  return Number.isInteger(submissionId) && submissionId > 0
}

function createGradingInputSignature() {
  return JSON.stringify({
    question: gradingForm.question,
    questionType: gradingForm.questionType,
    referenceAnswer: gradingForm.referenceAnswer,
    studentAnswer: gradingForm.studentAnswer,
    maxScore: Number(gradingForm.maxScore),
    rubric: gradingForm.rubric.map((item) => ({
      criterion: item.criterion,
      description: item.description,
      maxScore: Number(item.maxScore),
    })),
  })
}

function clearManualGradingDraft() {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(MANUAL_GRADING_DRAFT_KEY)
  } catch {
    // Session storage availability should not block grading.
  }
}

function saveManualGradingDraft() {
  if (isPracticeSubmissionMode() || typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(
      MANUAL_GRADING_DRAFT_KEY,
      JSON.stringify({
        mode: 'manual',
        gradingForm: {
          question: gradingForm.question,
          questionType: gradingForm.questionType,
          referenceAnswer: gradingForm.referenceAnswer,
          studentAnswer: gradingForm.studentAnswer,
          maxScore: gradingForm.maxScore,
          rubric: gradingForm.rubric,
        },
        totalPoints: gradingForm.maxScore,
        gradingResult: gradingResult.value,
        resultInputSignature: gradingResultInputSignature.value,
        teacherScore: teacherScore.value,
        reviewComment: reviewComment.value,
        reviewStatus: reviewStatus.value,
        learningInsight: learningInsight.value,
      }),
    )
  } catch {
    // Session storage availability should not block grading.
  }
}

function restoreManualGradingDraft() {
  if (isPracticeSubmissionMode() || typeof window === 'undefined') return
  try {
    const rawDraft = window.sessionStorage.getItem(MANUAL_GRADING_DRAFT_KEY)
    if (!rawDraft) return
    const draft = JSON.parse(rawDraft)
    if (draft?.mode !== 'manual' || !draft.gradingForm) return

    const storedRubric = Array.isArray(draft.gradingForm.rubric) && draft.gradingForm.rubric.length
      ? draft.gradingForm.rubric.map((item, index) => ({
        id: item.id ?? index + 1,
        criterion: String(item.criterion || ''),
        description: String(item.description || ''),
        maxScore: Number(item.maxScore || 0),
      }))
      : createGradingDefaults().rubric
    Object.assign(gradingForm, {
      question: String(draft.gradingForm.question || ''),
      questionType: String(draft.gradingForm.questionType || '简答题'),
      referenceAnswer: String(draft.gradingForm.referenceAnswer || ''),
      studentAnswer: String(draft.gradingForm.studentAnswer || ''),
      maxScore: Number(draft.totalPoints ?? draft.gradingForm.maxScore ?? 10),
      rubric: storedRubric,
    })

    const resultMatchesCurrentInput = Boolean(
      draft.gradingResult
      && draft.resultInputSignature
      && draft.resultInputSignature === createGradingInputSignature(),
    )
    gradingResult.value = resultMatchesCurrentInput ? draft.gradingResult : null
    gradingResultMaxScore.value = Number(gradingForm.maxScore) || 10
    gradingResultInputSignature.value = resultMatchesCurrentInput ? draft.resultInputSignature : ''
    teacherScore.value = resultMatchesCurrentInput && Number.isFinite(Number(draft.teacherScore))
      ? Number(draft.teacherScore)
      : null
    reviewComment.value = resultMatchesCurrentInput ? String(draft.reviewComment || '') : ''
    reviewStatus.value = resultMatchesCurrentInput ? String(draft.reviewStatus || 'pending') : 'pending'
  } catch {
    clearManualGradingDraft()
  }
}
const linkedOpenAnswers = computed(() =>
  (linkedSubmission.value?.answers || []).filter((answer) => answer.questionType === 'SHORT'),
)
const activeLinkedAnswer = computed(() => linkedOpenAnswers.value[linkedQuestionIndex.value] || null)
const activeLinkedSuggestionApplied = computed(() =>
  activeLinkedAnswer.value
    ? linkedAppliedQuestionIds.value.includes(Number(activeLinkedAnswer.value.questionId))
    : false,
)

function validateRubric(_rule, value, callback) {
  if (!Array.isArray(value) || value.length === 0) {
    callback(new Error('请至少添加一个评分维度'))
    return
  }

  const invalidItem = value.find(
    (item) =>
      !item.criterion?.trim() ||
      !item.description?.trim() ||
      !Number.isFinite(Number(item.maxScore)) ||
      Number(item.maxScore) <= 0,
  )
  if (invalidItem) {
    callback(new Error('请完整填写每个评分维度、说明和分值'))
    return
  }

  const rubricTotal = value.reduce((sum, item) => sum + Number(item.maxScore || 0), 0)
  if (Number.isFinite(Number(gradingForm.maxScore)) && Math.abs(rubricTotal - Number(gradingForm.maxScore)) > 0.001) {
    callback(new Error(`评分维度合计 ${rubricTotal} 分，必须等于总分`))
    return
  }
  callback()
}

const gradingRules = {
  question: [
    { required: true, message: '请输入题目', trigger: 'blur' },
    { max: 3000, message: '题目不能超过3000个字符', trigger: 'blur' },
  ],
  questionType: [{ required: true, message: '请选择题型', trigger: 'change' }],
  referenceAnswer: [
    { required: true, message: '请输入参考答案', trigger: 'blur' },
    { max: 5000, message: '参考答案不能超过5000个字符', trigger: 'blur' },
  ],
  rubric: [{ validator: validateRubric, trigger: 'change' }],
  studentAnswer: [
    { required: true, message: '请输入学生答案', trigger: 'blur' },
    { max: 5000, message: '学生答案不能超过5000个字符', trigger: 'blur' },
  ],
  maxScore: [
    { required: true, message: '请输入总分', trigger: 'change' },
    { type: 'number', min: 0.1, max: 1000, message: '总分应大于0且不超过1000', trigger: 'change' },
  ],
}

const confidencePercent = computed(() => {
  const confidence = Number(gradingResult.value?.confidence || 0)
  return Math.max(0, Math.min(100, Math.round(confidence * 100)))
})

const scorePercent = computed(() => {
  const total = Number(gradingResult.value?.totalScore || 0)
  return Math.max(0, Math.min(100, Math.round((total / Number(gradingResultMaxScore.value || 1)) * 100)))
})

function normalizeList(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined && item !== '') : []
}

function formatScore(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '--'
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1).replace(/\.0$/, '')
}

function normalizeDisplayText(value) {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  return /^(null|undefined)$/i.test(text) ? '' : text
}
const gradingDisplayResult = computed(() => gradingResult.value)
const gradingDimensionScores = computed(() => normalizeList(gradingDisplayResult.value?.dimensionScores))
const gradingStrengths = computed(() => normalizeList(gradingDisplayResult.value?.strengths))
const gradingDeductions = computed(() => normalizeList(gradingDisplayResult.value?.deductions))
const gradingSuggestions = computed(() => normalizeList(gradingDisplayResult.value?.suggestions))
const learningInsight = computed(() => buildLearningInsight(gradingDisplayResult.value, {
  teacherScore: teacherScore.value,
  reviewComment: reviewComment.value,
  reviewStatus: reviewStatus.value,
}))
const learningInsightReady = computed(() => hasLearningInsight(learningInsight.value))
const reviewState = computed(() => ({
  score: teacherScore.value,
  opinion: reviewComment.value,
  status: reviewStatus.value,
}))
const manualGradingDraft = computed(() => {
  if (isPracticeSubmissionMode()) return null
  return {
    gradingForm,
    gradingResult: gradingResult.value,
    resultInputSignature: gradingResultInputSignature.value,
    teacherScore: teacherScore.value,
    reviewComment: reviewComment.value,
    reviewStatus: reviewStatus.value,
    learningInsight: learningInsight.value,
  }
})
const coveredDimensionCount = computed(() =>
  gradingDimensionScores.value.filter((item) => Number(item?.score || 0) > 0).length,
)
const knowledgeCoveragePercent = computed(() => {
  const total = gradingDimensionScores.value.length
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((coveredDimensionCount.value / total) * 100)))
})
const gradingWeakDimensionLabels = computed(() => learningInsight.value.weakPoints.slice(0, 2))

const gradingResultReady = computed(() => Boolean(gradingResult.value))
const gradingStatusText = computed(() =>
  gradingLoading.value ? '正在结合评分标准生成建议' : gradingResultReady.value ? '批改已完成' : '等待批改',
)
const gradingReferenceAnswer = computed(() => gradingDisplayResult.value?.referenceAnswer || gradingForm.referenceAnswer)
const gradingCaseQuestion = computed(
  () => gradingDisplayResult.value?.question || gradingForm.question,
)
const gradingCaseStudentAnswer = computed(
  () => gradingDisplayResult.value?.studentAnswer || gradingForm.studentAnswer,
)
const gradingCapabilityCards = [
  {
    title: '客观题判分',
    description: '自动统计正确率与得分分布',
  },
  {
    title: '代码题分析',
    description: '检测运行结果与代码规范',
  },
  {
    title: '简答题评价',
    description: '基于 Rubric 分析知识点掌握情况',
  },
]
const gradingEntryHints = ['上传学生作答内容', '输入待批改答案']
const gradingLoadingStages = [
  {
    title: '理解题目要求',
    description: '对齐题干、题型与参考答案要点',
  },
  {
    title: '核对评分标准',
    description: '依据 Rubric 拆解分项得分与失分点',
  },
  {
    title: '生成反馈报告',
    description: '整理修改建议与参考改写答案',
  },
]
const gradingWorkflowSteps = [
  '学生答案提交',
  'AI语义理解',
  'Rubric匹配评分',
  '错误知识定位',
  '个性化反馈生成',
]
const gradingInsightIssues = computed(() => [
  {
    title: '高频错误知识点',
    content:
      gradingDeductions.value[0] ||
      gradingWeakDimensionLabels.value[0] ||
      '待 AI 完成批改后识别本次作答中的高频错误知识点。',
  },
  {
    title: '学生薄弱环节',
    content: gradingWeakDimensionLabels.value.length
      ? gradingWeakDimensionLabels.value.join('、')
      : gradingSuggestions.value[0] || '待 AI 完成批改后总结学生当前的薄弱环节。',
  },
])
const gradingTeachingInsights = computed(() => [
  {
    title: '下一次备课补充案例',
    content: gradingSuggestions.value[0]
      || (gradingWeakDimensionLabels.value.length
        ? `建议围绕 ${gradingWeakDimensionLabels.value.join('、')} 补充更贴近课堂情境的案例讲解。`
        : '建议结合本次失分点补充更有对比性的讲评案例。'),
  },
  {
    title: '增加专项练习',
    content: gradingSuggestions.value[1]
      || (gradingWeakDimensionLabels.value.length
        ? `可针对 ${gradingWeakDimensionLabels.value.join('、')} 设计分层专项练习并安排即时反馈。`
        : '建议围绕薄弱知识点增加巩固练习与阶段性复盘。'),
  },
])

function getLearningInsightContext() {
  return {
    ownerId: userStore.userId || null,
    ownerUsername: userStore.username || null,
    sourceQuestion: gradingForm.question.trim(),
    sourceTopic: gradingForm.question.trim(),
    courseId: linkedSubmission.value?.courseId || route.query.courseId || null,
    classId: linkedSubmission.value?.classId || route.query.classId || null,
    submissionId: linkedSubmission.value?.submissionId || route.query.submissionId || null,
  }
}

watch(learningInsight, (insight) => {
  if (gradingResult.value && learningInsightReady.value) {
    saveLearningInsight(insight, getLearningInsightContext())
  }
})

watch(manualGradingDraft, (draft) => {
  if (draft && !manualDraftSaveSuppressed) saveManualGradingDraft()
}, { deep: true })

function handleReviewChange(change = {}) {
  const score = Number(change.score)
  teacherScore.value = Number.isFinite(score) ? score : null
  reviewComment.value = String(change.opinion || '')
  reviewStatus.value = String(change.status || 'pending')
}

function roundScore(value) {
  return Math.round(Number(value || 0) * 10) / 10
}

function createLinkedRubric(maxScore) {
  const total = Math.max(1, Number(maxScore || 1))
  const accuracy = roundScore(total * 0.5)
  const completeness = roundScore(total * 0.3)
  const expression = roundScore(total - accuracy - completeness)
  return [
    { id: 1, criterion: '知识准确性', description: '核心概念、事实和结论准确', maxScore: accuracy },
    { id: 2, criterion: '要点完整性', description: '覆盖题目要求和参考答案中的主要得分点', maxScore: completeness },
    { id: 3, criterion: '逻辑与表达', description: '推理过程清晰，表达规范且有依据', maxScore: expression },
  ]
}

function resolveLinkedReferenceAnswer(answer) {
  const referenceAnswer = normalizeDisplayText(answer?.referenceAnswer)
  const genericValues = new Set(['开放题', '简答题', '论述题', 'short'])
  if (referenceAnswer && !genericValues.has(referenceAnswer.toLowerCase())) return referenceAnswer
  return normalizeDisplayText(answer?.explanation) || '请结合题目要求和课程学习目标进行评价。'
}

async function scrollToGradingWorkspace() {
  await nextTick()
  gradingStartRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function fillLinkedQuestion(answer) {
  if (!answer) return
  rubricSequence = 3
  Object.assign(gradingForm, {
    question: answer.questionContent || '',
    questionType: '简答题',
    referenceAnswer: resolveLinkedReferenceAnswer(answer),
    rubric: createLinkedRubric(answer.score),
    studentAnswer: answer.studentAnswer || '',
    maxScore: Number(answer.score || 1),
  })
  gradingResult.value = null
  gradingResultInputSignature.value = ''
  gradingResultMaxScore.value = Number(answer.score || 1)
  teacherScore.value = null
  reviewComment.value = ''
  reviewStatus.value = 'pending'
  gradingFormRef.value?.clearValidate()
}

function selectLinkedQuestion(index) {
  if (index < 0 || index >= linkedOpenAnswers.value.length) return
  linkedQuestionIndex.value = index
  fillLinkedQuestion(linkedOpenAnswers.value[index])
}

async function loadLinkedSubmission() {
  const submissionId = Number(route.query.submissionId)
  if (!Number.isInteger(submissionId) || submissionId <= 0) return
  linkedSubmissionLoading.value = true
  try {
    linkedSubmission.value = await getTeacherPracticeSubmission(submissionId)
    linkedAppliedQuestionIds.value = linkedOpenAnswers.value
      .filter((answer) => answer.reviewSource?.startsWith('AI'))
      .map((answer) => Number(answer.questionId))
    if (!linkedOpenAnswers.value.length) {
      ElMessage.warning('这份练习没有需要 AI 辅助批改的开放题')
      return
    }
    const requestedQuestionId = Number(route.query.questionId)
    const requestedIndex = linkedOpenAnswers.value.findIndex(
      (answer) => Number(answer.questionId) === requestedQuestionId,
    )
    selectLinkedQuestion(requestedIndex >= 0 ? requestedIndex : 0)
    await scrollToGradingWorkspace()
  } catch (error) {
    linkedSubmission.value = null
    ElMessage.error(error?.message || '学生练习加载失败')
  } finally {
    linkedSubmissionLoading.value = false
  }
}

function buildLinkedFeedback(result) {
  const parts = []
  if (result?.strengths?.length) parts.push(`优点：${result.strengths.join('；')}`)
  if (result?.deductions?.length) parts.push(`需要改进：${result.deductions.join('；')}`)
  if (result?.suggestions?.length) parts.push(`建议：${result.suggestions.join('；')}`)
  return parts.join('\n').slice(0, 500) || '请教师结合 AI 分项评分进一步复核本题答案。'
}

function buildLinkedReasoning(result) {
  return (result?.dimensionScores || [])
    .map((item) => `${item.criterion} ${formatScore(item.score)}/${formatScore(item.maxScore)}：${item.reason || '待教师复核'}`)
    .join('\n')
    .slice(0, 2000)
}

async function applyLinkedSuggestion() {
  if (!linkedSubmission.value || !activeLinkedAnswer.value || !gradingResult.value) return
  const maxScore = Number(activeLinkedAnswer.value.score || 0)
  const suggestedScore = Math.max(0, Math.min(maxScore, Math.round(Number(gradingResult.value.totalScore || 0))))
  applyingLinkedSuggestion.value = true
  try {
    linkedSubmission.value = await saveTeacherPracticeAiDraft(linkedSubmission.value.submissionId, {
      questionId: activeLinkedAnswer.value.questionId,
      score: suggestedScore,
      feedback: buildLinkedFeedback(gradingResult.value),
      reasoning: buildLinkedReasoning(gradingResult.value),
      confidence: Number(gradingResult.value.confidence || 0),
    })
    const questionId = Number(activeLinkedAnswer.value.questionId)
    if (!linkedAppliedQuestionIds.value.includes(questionId)) {
      linkedAppliedQuestionIds.value = [...linkedAppliedQuestionIds.value, questionId]
    }
    const nextIndex = linkedOpenAnswers.value.findIndex(
      (answer, index) => index > linkedQuestionIndex.value
        && !linkedAppliedQuestionIds.value.includes(Number(answer.questionId)),
    )
    if (nextIndex >= 0) {
      ElMessage.success('本题 AI 建议已保存，继续批改下一道开放题')
      selectLinkedQuestion(nextIndex)
    } else {
      ElMessage.success('AI 建议已保存，请返回练习页面进行教师复核')
    }
  } catch (error) {
    ElMessage.error(error?.message || 'AI 建议保存失败')
  } finally {
    applyingLinkedSuggestion.value = false
  }
}

async function returnToPracticeReview() {
  await router.push({
    name: 'teacher-practice-review',
    query: {
      submissionId: String(linkedSubmission.value?.submissionId || route.query.submissionId || ''),
      status: String(route.query.returnStatus || 'SUBMITTED'),
      returnStatus: String(route.query.returnStatus || 'SUBMITTED'),
    },
  })
}

async function useLearningInsightForPreparation() {
  if (!gradingResult.value || !learningInsightReady.value) {
    ElMessage.warning('完成一次有效批改后，才能带入学习反馈。')
    return
  }

  const context = getLearningInsightContext()
  saveLearningInsight(learningInsight.value, context)
  emit('use-learning-insight', learningInsight.value)

  const query = {}
  const topic = context.sourceTopic || context.sourceQuestion
  if (topic) query.topic = topic
  if (context.courseId) query.courseId = String(context.courseId)
  if (context.classId) query.classId = String(context.classId)
  if (context.submissionId) query.submissionId = String(context.submissionId)

  try {
    await router.push({
      name: 'teacher-ai-preparation',
      query,
    })
  } catch {
    ElMessage.error('无法打开智能备课，请稍后重试。')
  }
}

function startGradingWaitNotice() {
  stopGradingWaitNotice()
  gradingSlowNoticeTimer = window.setTimeout(() => {
    if (gradingLoading.value) gradingSlowNotice.value = true
  }, 9000)
}

function stopGradingWaitNotice() {
  if (gradingSlowNoticeTimer !== null) window.clearTimeout(gradingSlowNoticeTimer)
  gradingSlowNoticeTimer = null
  gradingSlowNotice.value = false
}

async function submitGrading() {
  if (gradingLoading.value) return
  const valid = await gradingFormRef.value?.validate().catch(() => false)
  if (!valid) return

  gradingResult.value = null
  gradingResultInputSignature.value = ''
  gradingResultMaxScore.value = Number(gradingForm.maxScore) || 10
  teacherScore.value = null
  reviewComment.value = ''
  reviewStatus.value = 'pending'
  gradingLoading.value = true
  startGradingWaitNotice()
  try {
    const maxScore = Number(gradingForm.maxScore)
    gradingResult.value = await generateGrading({
      question: gradingForm.question.trim(),
      questionType: gradingForm.questionType,
      referenceAnswer: gradingForm.referenceAnswer.trim(),
      rubric: gradingForm.rubric.map((item) => ({
        criterion: item.criterion.trim(),
        description: item.description.trim(),
        maxScore: Number(item.maxScore),
      })),
      studentAnswer: gradingForm.studentAnswer.trim(),
      maxScore,
    })
    gradingResultInputSignature.value = createGradingInputSignature()
    gradingResultMaxScore.value = maxScore
    ElMessage.success('批改已完成')
  } catch (error) {
    gradingResult.value = null
    ElMessage.error(error?.message || 'AI 服务暂时不可用，请稍后重试。')
  } finally {
    gradingLoading.value = false
    stopGradingWaitNotice()
  }
}

function addRubricItem() {
  rubricSequence += 1
  gradingForm.rubric.push({
    id: rubricSequence,
    criterion: '',
    description: '',
    maxScore: 1,
  })
  validateRubricField()
}

function removeRubricItem(index) {
  if (gradingForm.rubric.length === 1) {
    ElMessage.warning('至少保留一个评分维度')
    return
  }
  gradingForm.rubric.splice(index, 1)
  validateRubricField()
}

function validateRubricField() {
  gradingFormRef.value?.validateField('rubric').catch(() => {})
}

function clearGradingForm() {
  const shouldClearManualDraft = !isPracticeSubmissionMode()
  if (shouldClearManualDraft) manualDraftSaveSuppressed = true
  rubricSequence = 3
  Object.assign(gradingForm, createGradingDefaults())
  gradingResult.value = null
  gradingResultInputSignature.value = ''
  gradingResultMaxScore.value = 10
  teacherScore.value = null
  reviewComment.value = ''
  reviewStatus.value = 'pending'
  if (shouldClearManualDraft) {
    clearManualGradingDraft()
    nextTick(() => {
      manualDraftSaveSuppressed = false
    })
  }
  gradingFormRef.value?.clearValidate()
}
async function copyResult(result, successMessage) {
  if (!result) return
  const text = JSON.stringify(result, null, 2)
  let textarea = null
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      if (!document.execCommand('copy')) {
        throw new Error('浏览器拒绝复制操作')
      }
    }
    ElMessage.success(successMessage)
  } catch {
    ElMessage.error('复制失败，请检查浏览器剪贴板权限')
  } finally {
    textarea?.remove()
  }
}

onMounted(() => {
  restoreManualGradingDraft()
  loadLinkedSubmission()
})
onUnmounted(stopGradingWaitNotice)
</script>

<template>
  <main class="ai-assistant-page">
    <section class="explore-hero grading-hero" aria-labelledby="grading-workbench-title">
      <div class="explore-hero__content">
        <span class="explore-kicker">ANSWER DISCOVERY LAB</span>
        <h1 id="grading-workbench-title">从一次作答，发现真正的问题</h1>
        <p>AI负责寻找线索，教师完成最终判断，并把发现带回下一节课。</p>
        <a class="handmade-action" href="#grading-lab">
          <el-icon><MagicStick /></el-icon>
          开始分析
        </a>
      </div>
      <div class="review-scene" aria-hidden="true">
        <span class="review-orbit review-orbit--one"></span>
        <span class="review-orbit review-orbit--two"></span>
        <div class="answer-note">
          <span>ANSWER</span>
          <i></i><i></i><i></i>
        </div>
        <div class="score-stamp"><strong>?</strong><span>SCORE</span></div>
        <span class="review-label">CHECK</span>
        <span class="review-star review-star--one">✦</span>
        <span class="review-star review-star--two">✦</span>
        <span class="review-dot review-dot--pink"></span>
        <span class="review-dot review-dot--mint"></span>
        <span class="review-dot review-dot--yellow"></span>
      </div>
    </section>

    <section ref="gradingStartRef" id="grading-lab" class="active-workbench" aria-label="智能批改流程">
      <section
        v-if="linkedSubmission || linkedSubmissionLoading"
        v-loading="linkedSubmissionLoading"
        class="linked-practice-context"
        aria-label="学习练习批改上下文"
      >
        <div class="linked-practice-context__meta">
          <span class="linked-practice-context__source">来自学习练习</span>
          <h2>{{ linkedSubmission?.practiceTitle || '正在读取学生练习' }}</h2>
          <p v-if="linkedSubmission">
            {{ linkedSubmission.courseName }} · {{ linkedSubmission.studentName || '学生' }} ·
            当前开放题 {{ linkedQuestionIndex + 1 }} / {{ linkedOpenAnswers.length }}
          </p>
        </div>
        <el-button v-if="linkedSubmission" class="linked-practice-context__back" @click="returnToPracticeReview">
          <el-icon><Back /></el-icon>
          返回练习复核
        </el-button>
        <nav v-if="linkedOpenAnswers.length" class="linked-question-switcher" aria-label="开放题切换">
          <button
            v-for="(answer, index) in linkedOpenAnswers"
            :key="answer.questionId"
            type="button"
            :class="{
              'is-active': index === linkedQuestionIndex,
              'is-applied': linkedAppliedQuestionIds.includes(Number(answer.questionId)),
            }"
            @click="selectLinkedQuestion(index)"
          >
            <el-icon v-if="linkedAppliedQuestionIds.includes(Number(answer.questionId))"><CircleCheck /></el-icon>
            第 {{ index + 1 }} 题
          </button>
        </nav>
      </section>
        <GradingWorkspace
          :grading-form="gradingForm"
          :grading-result="gradingResult"
          :grading-loading="gradingLoading"
          @submit="submitGrading"
          @clear="clearGradingForm"
        >
          <template #input="{ actions: gradingActions }">
          <section class="workspace-card input-panel grading-input-panel answer-exploration-sheet">
            <div class="panel-heading panel-heading--stack">
              <div class="panel-heading__main">
                <div>
                  <span class="explore-step-badge">答案探索</span>
                  <h2>看看学生是怎么想的</h2>
                  <p class="panel-intro">把学生的表达放在这里，AI会帮你寻找值得复核的线索。</p>
                </div>
              </div>
            </div>

            <el-form
              ref="gradingFormRef"
              :model="gradingForm"
              :rules="gradingRules"
              label-position="top"
              class="assistant-form grading-form"
            >
              <section class="form-block form-span-full grading-question-primary-block">
                <div class="form-block__grid">
                  <el-form-item label="题目" prop="question" class="form-span-full">
                    <el-input
                      v-model="gradingForm.question"
                      type="textarea"
                      :rows="3"
                      maxlength="3000"
                      show-word-limit
                      placeholder="输入需要批改的题目"
                    />
                  </el-form-item>
                </div>
              </section>

              <section class="form-block form-span-full grading-answer-block">
                <div class="form-block__grid">
                  <el-form-item label="学生作答" prop="studentAnswer" class="form-span-full">
                    <el-input
                      v-model="gradingForm.studentAnswer"
                      type="textarea"
                      :rows="7"
                      maxlength="5000"
                      show-word-limit
                      placeholder="粘贴或输入学生的作答内容"
                    />
                  </el-form-item>
                </div>
              </section>

              <div class="form-actions form-span-full grading-primary-actions">
                <el-button :disabled="gradingLoading" @click="gradingActions.clear">
                  <el-icon><RefreshLeft /></el-icon>
                  清空
                </el-button>
                <el-button type="primary" :loading="gradingLoading" :disabled="gradingLoading" @click="gradingActions.submit">
                  <el-icon><MagicStick /></el-icon>
                  发现回答中的线索
                </el-button>
              </div>

              <details class="grading-settings-disclosure form-span-full">
                <summary>
                  <span>补充判断线索</span>
                  <small>题型、参考答案、总分和评分标准</small>
                </summary>
              <section class="form-block form-span-full grading-question-block">
                <div class="form-block__header">
                  <div>
                    <h3>题目与参考要点</h3>
                    <p>这些信息会帮助系统更准确地理解学生回答。</p>
                  </div>
                </div>
                <div class="form-block__grid">
                  <el-form-item label="题型" prop="questionType">
                    <el-select v-model="gradingForm.questionType" filterable allow-create class="full-width">
                      <el-option label="简答题" value="简答题" />
                      <el-option label="论述题" value="论述题" />
                      <el-option label="计算题" value="计算题" />
                      <el-option label="案例分析题" value="案例分析题" />
                      <el-option label="编程题" value="编程题" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="总分" prop="maxScore">
                    <el-input-number
                      v-model="gradingForm.maxScore"
                      :min="0.1"
                      :max="1000"
                      :precision="1"
                      :step="0.1"
                      controls-position="right"
                      class="full-width"
                      @change="validateRubricField"
                    />
                  </el-form-item>

                  <el-form-item label="参考答案" prop="referenceAnswer" class="form-span-full">
                    <el-input
                      v-model="gradingForm.referenceAnswer"
                      type="textarea"
                      :rows="4"
                      maxlength="5000"
                      show-word-limit
                      placeholder="输入参考答案或参考要点"
                    />
                  </el-form-item>
                </div>
              </section>

              <details class="grading-rubric-disclosure">
                <summary>
                  <span>调整评价方式</span>
                  <small>按需要设置评分维度与分值</small>
                </summary>
              <section class="form-block form-span-full grading-rubric-block">
                <div class="form-block__header">
                  <div>
                    <h3>评分标准</h3>
                    <p>明确每个维度关注的内容，让判断过程更透明。</p>
                  </div>
                </div>
                <div class="form-block__grid">
                  <el-form-item label="评分标准" prop="rubric" class="form-span-full rubric-form-item">
                    <RubricEditor
                      :rubric="gradingForm.rubric"
                      :max-score="gradingForm.maxScore"
                      @add="addRubricItem"
                      @remove="removeRubricItem"
                      @validate="validateRubricField"
                    >
                    <template #default="{ actions: rubricActions }">
                    <div class="rubric-editor">
                      <div class="rubric-labels" aria-hidden="true">
                        <span>评分维度</span>
                        <span>评分说明</span>
                        <span>分值</span>
                        <span></span>
                      </div>
                      <div v-for="(item, index) in gradingForm.rubric" :key="item.id" class="rubric-row">
                        <el-input
                          v-model="item.criterion"
                          :aria-label="`评分维度 ${index + 1}`"
                          maxlength="100"
                          placeholder="评分维度"
                          @input="rubricActions.validate"
                        />
                        <el-input
                          v-model="item.description"
                          :aria-label="`评分说明 ${index + 1}`"
                          maxlength="500"
                          placeholder="评分说明"
                          @input="rubricActions.validate"
                        />
                        <el-input-number
                          v-model="item.maxScore"
                          :aria-label="`评分分值 ${index + 1}`"
                          :min="0.1"
                          :max="1000"
                          :precision="1"
                          :step="0.1"
                          controls-position="right"
                          @change="rubricActions.validate"
                        />
                        <el-tooltip content="删除评分维度" placement="top">
                          <el-button
                            circle
                            type="danger"
                            plain
                            :aria-label="`删除评分维度 ${index + 1}`"
                            @click="rubricActions.remove(index)"
                          >
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </el-tooltip>
                      </div>
                      <el-button class="add-rubric-button" :icon="Plus" plain @click="rubricActions.add">
                        添加评分维度
                      </el-button>
                    </div>
                    </template>
                    </RubricEditor>
                  </el-form-item>
                </div>
              </section>
              </details>
              </details>
            </el-form>
          </section>
          </template>

          <template #result>
          <section
            v-if="gradingLoading || gradingResultReady"
            class="manual-review-focus analysis-result"
            :class="{ 'is-loading': gradingLoading }"
            aria-label="答案分析结果"
          >
            <div class="manual-review-focus__heading">
              <strong>{{ gradingLoading ? 'AI 正在分析学生答案…' : '学生学习表现' }}</strong>
              <span>{{ gradingStatusText }}</span>
            </div>
            <div v-if="!gradingLoading" class="manual-review-focus__metrics">
              <span>评分建议 <b>{{ gradingDisplayResult?.totalScore ?? '--' }} / {{ gradingResultMaxScore }}</b></span>
              <span>判断可信度 <b>{{ confidencePercent || Math.round(Number(gradingDisplayResult?.confidence || 0) * 100) }}%</b></span>
            </div>
            <div v-if="!gradingLoading" class="manual-review-focus__answer">
              <span>学生答案</span>
              <p>{{ gradingCaseStudentAnswer || '选择学生或输入答案后开始批改。' }}</p>
              <small>
                判断摘要：{{ gradingResultReady ? (gradingDeductions[0] || gradingStrengths[0] || '结合参考答案与评分标准进行综合判断。') : '完成分析后显示判断依据。' }}
              </small>
            </div>
          </section>
          <section v-if="gradingResultReady" class="answer-discovery-cards" aria-labelledby="answer-discovery-title">
            <div class="answer-discovery-cards__head">
              <div>
                <span class="explore-step-badge">答案发现</span>
                <h2 id="answer-discovery-title">看看学生是怎么想的</h2>
              </div>
              <p>从答案中的表达、遗漏和线索出发，帮助教师快速进入审核。</p>
            </div>
            <div class="answer-discovery-cards__grid">
              <article class="answer-discovery-card answer-discovery-card--mastered">
                <span>学生已经掌握</span>
                <p>{{ gradingStrengths[0] || '本次回答暂未提取到明确的掌握表现。' }}</p>
              </article>
              <article class="answer-discovery-card answer-discovery-card--attention">
                <span>需要继续关注</span>
                <p>{{ gradingDeductions[0] || gradingWeakDimensionLabels[0] || '本次回答暂未提取到明确的薄弱点。' }}</p>
              </article>
              <article class="answer-discovery-card answer-discovery-card--clue">
                <span>回答中的关键线索</span>
                <p>{{ gradingSuggestions[0] || `当前判断可信度为 ${confidencePercent}%。` }}</p>
              </article>
            </div>
          </section>
          <section
            v-if="gradingResultReady"
            class="lab-step calibration-step"
            aria-labelledby="calibration-step-title"
          >
            <header class="lab-step__header">
              <span class="explore-step-badge">教师校准</span>
              <h2 id="calibration-step-title">最后由老师决定</h2>
              <p>AI提供参考，最终评分由教师确认。</p>
            </header>
          <ManualReviewWorkspace
            :grading-result="gradingResult"
            :grading-result-ready="gradingResultReady"
            :grading-loading="gradingLoading"
            :grading-display-result="gradingDisplayResult"
            :grading-result-max-score="gradingResultMaxScore"
            :confidence-percent="confidencePercent"
            :grading-dimension-scores="gradingDimensionScores"
            :grading-strengths="gradingStrengths"
            :grading-deductions="gradingDeductions"
            :grading-suggestions="gradingSuggestions"
            :review-state="reviewState"
            @copy="copyResult(gradingResult, '批改结果已复制')"
            @review-change="handleReviewChange"
          >
          <template #default="{ actions: reviewActions }">
          <details v-if="gradingResultReady" class="ai-analysis-disclosure">
            <summary>
              <span>
                <small>分析依据</small>
                <strong>深入查看评分依据</strong>
              </span>
              <span class="ai-analysis-disclosure__summary-score">
                <b>AI建议 {{ gradingDisplayResult?.totalScore ?? '--' }} / {{ gradingResultMaxScore }}</b>
                <small>可信度 {{ confidencePercent || Math.round(Number(gradingDisplayResult?.confidence || 0) * 100) }}%</small>
              </span>
            </summary>
          <section class="workspace-card result-panel" aria-live="polite">
            <div class="panel-heading result-heading">
              <div class="panel-heading__main">
                <div>
                  <h2>判断依据</h2>
                  <p>查看答案表现、得分原因和需要补充的内容。</p>
                </div>
              </div>
              <div class="generation-status grading-status" :class="{ 'is-loading': gradingLoading, 'is-ready': gradingResultReady }">
                <span class="status-dot"></span>
                {{ gradingStatusText }}
              </div>
              <el-button
                :icon="CopyDocument"
                :disabled="!gradingResultReady || gradingLoading"
                @click="reviewActions.copy"
              >
                复制结果
              </el-button>
            </div>

            <div v-if="gradingLoading && !gradingResultReady" class="result-state result-state--loading">
              <div class="loading-badge">正在深度分析</div>
              <div class="state-orb state-orb--loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <h3>AI 正在分析学生答案…</h3>
              <p>正在结合评分标准生成建议，请稍候。</p>
              <p v-if="gradingSlowNotice">模型正在深入分析，本次生成可能需要十几秒。</p>
              <div class="loading-progress-bar" aria-hidden="true">
                <span></span>
              </div>
              <div class="loading-step-list loading-step-list--cards">
                <article
                  v-for="(item, index) in gradingLoadingStages"
                  :key="item.title"
                  class="loading-step-card"
                  :class="{ 'is-active': index === 1 }"
                >
                  <i>{{ String(index + 1).padStart(2, '0') }}</i>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.description }}</p>
                  </div>
                </article>
              </div>
            </div>

            <GradingReport
              v-if="!gradingLoading || gradingResultReady"
              :grading-display-result="gradingDisplayResult"
              :grading-dimension-scores="gradingDimensionScores"
              :grading-strengths="gradingStrengths"
              :grading-deductions="gradingDeductions"
              :grading-suggestions="gradingSuggestions"
              :confidence-percent="confidencePercent"
            >
            <div class="structured-result grading-result">
              <section class="result-hero-card grading-center-hero">
                <div class="result-hero-card__header grading-center-hero__header">
                  <div class="result-hero-card__copy">
                    <span class="result-hero-card__label">作业智能评测</span>
                    <h2>{{ gradingDisplayResult.title }}</h2>
                    <p>围绕学生答案、Rubric 评分与反馈建议，输出面向教师评价与教学优化的结构化结果。</p>
                  </div>
                  <div class="result-hero-card__status">
                    <span>输出状态</span>
                    <strong>{{ gradingStatusText }}</strong>
                    <small>评分依据已生成</small>
                  </div>
                </div>
                <div class="grading-workflow-band">
                  <div class="grading-workflow-band__header">
                    <div>
                      <span class="grading-workflow-band__eyebrow">批改流程</span>
                      <h3>作业评测流程</h3>
                    </div>
                    <p>从学生答案理解到知识定位与反馈生成，帮助教师更快完成课堂评价闭环。</p>
                  </div>
                  <div class="grading-workflow-list" aria-label="AI作业智能评测流程">
                    <article
                      v-for="(step, index) in gradingWorkflowSteps"
                      :key="step"
                      class="grading-workflow-step"
                    >
                      <span>{{ String(index + 1).padStart(2, '0') }}</span>
                      <strong>{{ step }}</strong>
                    </article>
                  </div>
                </div>
              </section>

              <section class="result-surface grading-case-card">
                <div class="surface-head">
                  <div>
                    <h3>作答内容</h3>
                    <p>对照题目与学生回答，复核当前判断是否符合教学要求。</p>
                  </div>
                </div>
                <div class="grading-case-grid">
                  <article class="grading-case-panel">
                    <span>题目</span>
                    <p>{{ gradingCaseQuestion }}</p>
                  </article>
                  <article class="grading-case-panel">
                    <span>学生答案</span>
                    <p>{{ gradingCaseStudentAnswer }}</p>
                  </article>
                </div>
              </section>

              <section class="result-surface grading-capability-surface">
                <div class="surface-head">
                  <div>
                    <h3>题型评测能力</h3>
                    <p>针对不同题型提供更清晰的自动评测能力说明。</p>
                  </div>
                </div>
                <div class="grading-capability-grid">
                  <article
                    v-for="item in gradingCapabilityCards"
                    :key="item.title"
                    class="grading-capability-card"
                  >
                    <span>{{ item.title }}</span>
                    <strong>{{ item.description }}</strong>
                  </article>
                </div>
              </section>

              <section class="score-board">
                <article class="metric-card metric-card--primary">
                  <span>总评分</span>
                  <strong>{{ formatScore(gradingDisplayResult.totalScore) }}</strong>
                  <small>/ {{ formatScore(gradingResultMaxScore) }}</small>
                </article>
                <article class="metric-card">
                  <div class="metric-card__head">
                    <span>得分率</span>
                    <strong>{{ scorePercent }}%</strong>
                  </div>
                  <el-progress :percentage="scorePercent" :stroke-width="10" :show-text="false" color="#2563eb" />
                  <small>基于总评分与题目满分换算</small>
                </article>
                <article class="metric-card">
                  <div class="metric-card__head">
                    <span>知识覆盖度</span>
                    <strong>{{ knowledgeCoveragePercent }}%</strong>
                  </div>
                  <el-progress
                    :percentage="knowledgeCoveragePercent"
                    :stroke-width="10"
                    :show-text="false"
                    color="#0f766e"
                  />
                  <small>
                    {{
                      gradingDimensionScores.length
                        ? `已覆盖 ${coveredDimensionCount} / ${gradingDimensionScores.length} 个评分维度`
                        : '等待评分维度分析结果'
                    }}
                  </small>
                </article>
                <article class="metric-card">
                  <div class="metric-card__head">
                    <span>评分可信度</span>
                    <strong>{{ confidencePercent }}%</strong>
                  </div>
                  <el-progress :percentage="confidencePercent" :stroke-width="10" :show-text="false" color="#1d4ed8" />
                  <small>结合答案匹配与 Rubric 评估生成</small>
                </article>
              </section>

              <section class="result-surface grading-dimension-surface">
                <div class="surface-head">
                  <div>
                    <h3>分项评分卡</h3>
                    <p>将每个评分维度拆成独立评分卡，便于教学评价与复核。</p>
                  </div>
                </div>
                <div v-if="gradingDimensionScores.length" class="dimension-card-grid">
                  <article
                    v-for="(item, index) in gradingDimensionScores"
                    :key="`${item.criterion}-${index}`"
                    class="dimension-card"
                  >
                    <div class="dimension-card__head">
                      <strong>{{ item.criterion }}</strong>
                      <span>{{ formatScore(item.score) }} / {{ formatScore(item.maxScore) }}</span>
                    </div>
                    <p>{{ item.reason }}</p>
                  </article>
                </div>
                <p v-else class="card-empty-text">暂无分项评分结果。</p>
              </section>

              <div class="feedback-grid">
                <section class="feedback-card feedback-card--positive">
                  <div class="surface-head surface-head--compact">
                    <div>
                      <h3>答案优点</h3>
                      <p>帮助教师快速识别学生表现较好的部分。</p>
                    </div>
                  </div>
                  <ul v-if="gradingStrengths.length" class="bullet-list">
                    <li v-for="(item, index) in gradingStrengths" :key="`strength-${index}`">{{ item }}</li>
                  </ul>
                  <p v-else class="card-empty-text">暂无答案优点分析。</p>
                </section>

                <section class="feedback-card feedback-card--warning">
                  <div class="surface-head surface-head--compact">
                    <div>
                      <h3>扣分原因</h3>
                      <p>集中展示失分点，方便教师快速定位问题。</p>
                    </div>
                  </div>
                  <ul v-if="gradingDeductions.length" class="bullet-list">
                    <li v-for="(item, index) in gradingDeductions" :key="`deduction-${index}`">{{ item }}</li>
                  </ul>
                  <p v-else class="card-empty-text">暂无扣分原因。</p>
                </section>

                <section class="feedback-card feedback-card--info">
                  <div class="surface-head surface-head--compact">
                    <div>
                      <h3>修改建议</h3>
                      <p>将反馈转成可执行建议，便于学生二次修订。</p>
                    </div>
                  </div>
                  <ul v-if="gradingSuggestions.length" class="bullet-list">
                    <li v-for="(item, index) in gradingSuggestions" :key="`suggestion-${index}`">{{ item }}</li>
                  </ul>
                  <p v-else class="card-empty-text">暂无修改建议。</p>
                </section>
              </div>

              <div class="answer-surface-grid">
                <section class="result-surface answer-card">
                  <div class="surface-head">
                    <div>
                      <h3>参考答案</h3>
                      <p>展示本次批改使用的参考答案或参考要点。</p>
                    </div>
                  </div>
                  <div class="answer-block answer-block--large">
                    <p>{{ gradingReferenceAnswer || '暂无参考答案内容。' }}</p>
                  </div>
                </section>

                <section class="result-surface answer-card">
                  <div class="surface-head">
                    <div>
                      <h3>参考改写答案</h3>
                      <p>给出更完整的参考表达，便于教师反馈与讲评。</p>
                    </div>
                  </div>
                  <div class="answer-block answer-block--large">
                    <p>{{ gradingDisplayResult.revisedAnswer || '暂无参考改写答案。' }}</p>
                  </div>
                </section>
              </div>
            </div>
            </GradingReport>

          </section>
          </details>
          </template>
          </ManualReviewWorkspace>

          <section class="grading-learning-insight" aria-labelledby="grading-learning-insight-title">
            <div class="grading-learning-insight__head">
              <div>
                <span class="explore-step-badge">🧠 本次学习洞察</span>
                <h3 id="grading-learning-insight-title">这次作答告诉了我们什么？</h3>
                <p>把这次作答中的表现，带回下一次课堂设计。</p>
              </div>
              <el-button
                class="insight-next-lesson"
                type="primary"
                :disabled="gradingLoading"
                @click="useLearningInsightForPreparation"
              >
                把这些发现带到下一节课
              </el-button>
            </div>

            <div v-if="learningInsightReady" class="grading-learning-insight__grid">
              <article class="learning-insight-note learning-insight-note--mastered">
                <span>学生掌握</span>
                <ul v-if="learningInsight.masteredPoints.length">
                  <li v-for="(item, index) in learningInsight.masteredPoints" :key="`mastered-${index}`">{{ item }}</li>
                </ul>
                <p v-else>本次批改暂未提取到明确的掌握点。</p>
              </article>
              <article class="learning-insight-note learning-insight-note--weak">
                <span>需要关注</span>
                <ul v-if="learningInsight.weakPoints.length">
                  <li v-for="(item, index) in learningInsight.weakPoints" :key="`weak-${index}`">{{ item }}</li>
                </ul>
                <p v-else>本次作答暂未标出明显薄弱知识点。</p>
              </article>
              <article class="learning-insight-note learning-insight-note--error">
                <span>常见问题</span>
                <ul v-if="learningInsight.errorPatterns.length">
                  <li v-for="(item, index) in learningInsight.errorPatterns" :key="`error-${index}`">{{ item }}</li>
                </ul>
                <p v-else>本次反馈暂未发现集中的错误模式。</p>
              </article>
              <article class="learning-insight-note learning-insight-note--advice">
                <span>教学建议</span>
                <ul v-if="learningInsight.teachingSuggestions.length">
                  <li v-for="(item, index) in learningInsight.teachingSuggestions" :key="`advice-${index}`">{{ item }}</li>
                </ul>
                <p v-else>完成更多批改后，这里会沉淀下一步课堂调整建议。</p>
              </article>
            </div>
            <div v-else class="grading-learning-insight__empty">
              完成一次有效批改后，AI会从学生作答中提取可用于教学调整的学习反馈。
            </div>
          </section>
          <div v-if="linkedSubmission" class="linked-suggestion-actions">
            <el-button
              type="primary"
              :loading="applyingLinkedSuggestion"
              :disabled="!gradingResultReady || gradingLoading"
              @click="applyLinkedSuggestion"
            >
              <el-icon><CircleCheck /></el-icon>
              {{ activeLinkedSuggestionApplied ? '更新AI建议并继续' : '保存AI建议并批改下一题' }}
            </el-button>
            <el-button @click="returnToPracticeReview">
              <el-icon><Back /></el-icon>
              返回练习复核
            </el-button>
          </div>
          </section>
          </template>
        </GradingWorkspace>
    </section>
  </main>
</template>

<style scoped src="./TeacherAiAssistant.css"></style>

<style scoped>
.ai-assistant-page {
  min-height: 100%;
  background: #f7f9fb;
}

.active-workbench {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 52px;
}

.active-workbench__header {
  margin-bottom: 20px;
}

.active-workbench__header h1 {
  margin: 0;
  color: #25384d;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0;
}

:deep(.grading-task-center),
:deep(.teacher-ai-grading-workspace),
:deep(.teacher-ai-manual-review-workspace) {
  gap: 24px;
}

:deep(.review-queue),
:deep(.review-evidence-panel),
:deep(.answer-annotation-panel),
:deep(.review-history) {
  display: none !important;
}

.workspace-card,
:deep(.manual-review-panel),
.manual-review-focus,
.ai-analysis-disclosure,
.grading-settings-disclosure {
  box-shadow: none !important;
}

.workspace-card {
  padding: 22px !important;
  border: 1px solid #e1e7ee !important;
  border-radius: 10px !important;
  background: #fff !important;
}

.panel-heading {
  margin-bottom: 18px;
}

.panel-heading h2,
.form-block__header h3 {
  color: #31445a;
}

.grading-form {
  display: grid;
  gap: 18px;
}

.form-block {
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.form-block__header {
  display: none;
}

:deep(.submission-list__body) {
  max-height: 168px;
}

.grading-settings-disclosure,
.ai-analysis-disclosure {
  overflow: hidden;
  border: 1px solid #e1e7ee;
  border-radius: 8px;
  background: #fff;
}

.grading-settings-disclosure > summary,
.ai-analysis-disclosure > summary {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 11px 14px;
  color: #40546b;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  list-style: none;
}

.grading-settings-disclosure > summary::-webkit-details-marker,
.ai-analysis-disclosure > summary::-webkit-details-marker {
  display: none;
}

.grading-settings-disclosure > summary small,
.ai-analysis-disclosure > summary small {
  margin-left: auto;
  color: #8390a0;
  font-size: 11px;
  font-weight: 400;
}

.grading-settings-disclosure[open] > summary,
.ai-analysis-disclosure[open] > summary {
  border-bottom: 1px solid #e8edf2;
}

.grading-settings-disclosure > .form-block,
.grading-settings-disclosure > .grading-rubric-disclosure {
  margin: 0;
  padding: 18px !important;
}

.grading-settings-disclosure > .grading-rubric-disclosure {
  border-top: 1px solid #edf1f5;
}

.manual-review-focus {
  display: grid;
  gap: 14px;
  padding: 20px 22px;
  border: 1px solid #dbe4ed;
  border-radius: 10px;
  background: #fff;
}

:deep(.manual-review-panel) {
  order: 1;
  padding: 20px !important;
  border-color: #cfdce8 !important;
  border-radius: 10px !important;
  background: #ffffff !important;
}

.ai-analysis-disclosure {
  order: 2;
}

:deep(.manual-review-panel__header) {
  padding-bottom: 4px;
}

:deep(.score-compare-panel) {
  padding: 16px !important;
  border-color: #e0e6ed !important;
}

:deep(.score-compare-grid) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

:deep(.score-compare-card--difference),
:deep(.score-compare-reason) {
  display: none;
}

:deep(.manual-review-editor) {
  gap: 14px;
}

:deep(.manual-review-editor__score),
:deep(.manual-review-field) {
  padding: 14px !important;
  border-color: #e1e7ee !important;
  background: #f9fbfd !important;
}

:deep(.manual-review-panel__actions) {
  padding-top: 4px;
}

.manual-review-focus__heading,
.manual-review-focus__metrics {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.manual-review-focus__heading strong {
  color: #31445a;
  font-size: 16px;
}

.manual-review-focus__heading span,
.manual-review-focus__metrics span,
.manual-review-focus__answer small {
  color: #748397;
  font-size: 12px;
}

.manual-review-focus__metrics {
  justify-content: flex-start;
}

.manual-review-focus__metrics span {
  padding-right: 18px;
}

.manual-review-focus__metrics b {
  margin-left: 4px;
  color: #3478c7;
  font-size: 16px;
}

.manual-review-focus__answer {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid #e5eaf0;
  border-radius: 8px;
  background: #f9fbfd;
}

.manual-review-focus__answer p {
  margin: 0;
  color: #40546b;
  font-size: 14px;
  line-height: 1.75;
}

.grading-engine-summary,
.grading-case-card,
.grading-capability-surface,
.score-board,
.insight-surface,
.answer-surface-grid {
  display: none !important;
}

@media (max-width: 720px) {
  .active-workbench {
    width: min(100% - 24px, 1120px);
    padding: 20px 0 36px;
  }

  :deep(.manual-review-editor),
  :deep(.score-compare-grid) {
    grid-template-columns: 1fr;
  }

  .workspace-card,
  .manual-review-focus,
  :deep(.manual-review-panel) {
    padding: 16px !important;
  }

  .manual-review-focus__heading,
  .manual-review-focus__metrics {
    align-items: flex-start;
    flex-direction: column;
  }
}

/* AI exploration lab theme */
.ai-assistant-page {
  min-height: 100%;
  background-color: #fbfbff;
  background-image:
    linear-gradient(rgba(129, 120, 207, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(129, 120, 207, 0.055) 1px, transparent 1px);
  background-size: 32px 32px;
  color: #3d3564;
}

.explore-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.8fr);
  gap: 48px;
  align-items: center;
  width: min(1600px, calc(100% - 48px));
  min-height: 330px;
  margin: 0 auto;
  padding: 54px clamp(28px, 5vw, 76px);
  overflow: hidden;
  border-bottom: 1px dashed rgba(61, 53, 100, 0.24);
  background: rgba(251, 251, 255, 0.84);
}

.explore-hero__content {
  position: relative;
  z-index: 2;
}

.explore-kicker,
.explore-step-badge {
  color: #8178cf;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.explore-hero h1 {
  margin: 12px 0 10px;
  color: #3d3564;
  font-size: clamp(34px, 4vw, 58px);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.08;
}

.explore-hero p {
  max-width: 650px;
  margin: 0 0 28px;
  color: #645b84;
  font-size: clamp(16px, 1.45vw, 20px);
  line-height: 1.65;
}

.exploration-route {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: -8px 0 24px;
  color: #645b84;
  font-size: 12px;
  font-weight: 700;
}

.exploration-route span {
  padding: 6px 9px;
  border: 1px solid rgba(61, 53, 100, 0.18);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.72);
}

.exploration-route i {
  color: #ee91bb;
  font-style: normal;
}

.handmade-action {
  display: inline-flex;
  gap: 9px;
  align-items: center;
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid #3d3564;
  border-radius: 7px;
  background: #8178cf;
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.22);
  color: #fff;
  font-size: 14px;
  font-weight: 750;
  text-decoration: none;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.handmade-action:hover {
  box-shadow: 2px 3px 0 rgba(61, 53, 100, 0.22);
  transform: translate(2px, 2px);
}

.review-scene {
  position: relative;
  min-height: 230px;
}

.review-orbit {
  position: absolute;
  border: 1px dashed rgba(61, 53, 100, 0.34);
  border-radius: 50%;
}

.review-orbit--one {
  inset: 12px 7% 8px 5%;
  transform: rotate(12deg);
}

.review-orbit--two {
  inset: 45px 22% 36px 19%;
  transform: rotate(-18deg);
}

.answer-note {
  position: absolute;
  top: 48%;
  left: 43%;
  display: grid;
  gap: 9px;
  width: 164px;
  padding: 20px;
  border: 1px solid rgba(61, 53, 100, 0.4);
  border-radius: 7px;
  background: #fff;
  box-shadow: 6px 7px 0 rgba(61, 53, 100, 0.14);
  transform: translate(-50%, -50%) rotate(-3deg);
}

.answer-note span,
.review-label,
.score-stamp span {
  color: #3d3564;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.answer-note i {
  display: block;
  height: 5px;
  border-radius: 3px;
  background: rgba(129, 120, 207, 0.25);
}

.answer-note i:nth-child(3) { width: 78%; background: rgba(238, 145, 187, 0.35); }
.answer-note i:nth-child(4) { width: 58%; background: rgba(157, 228, 235, 0.7); }

.score-stamp {
  position: absolute;
  right: 12%;
  bottom: 28px;
  display: grid;
  width: 76px;
  height: 76px;
  place-content: center;
  border: 1px solid #3d3564;
  border-radius: 50%;
  background: #fff1a8;
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.14);
  text-align: center;
  transform: rotate(6deg);
}

.score-stamp strong {
  color: #8178cf;
  font-size: 30px;
  line-height: 1;
}

.review-label {
  position: absolute;
  top: 22px;
  right: 14%;
  padding: 7px 10px;
  border: 1px solid #3d3564;
  border-radius: 5px;
  background: #9de4eb;
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.14);
  transform: rotate(4deg);
}

.review-star,
.review-dot {
  position: absolute;
}

.review-star { color: #ee91bb; font-size: 25px; }
.review-star--one { top: 12px; left: 15%; }
.review-star--two { right: 4%; bottom: 16px; color: #8178cf; }

.review-dot {
  width: 13px;
  height: 13px;
  border: 1px solid rgba(61, 53, 100, 0.35);
  border-radius: 50%;
}

.review-dot--pink { top: 45%; left: 4%; background: #ee91bb; }
.review-dot--mint { top: 9%; left: 48%; background: #9de4eb; }
.review-dot--yellow { right: 5%; top: 46%; background: #fff1a8; }

.active-workbench {
  width: min(1600px, calc(100% - 48px));
  padding: 44px clamp(0px, 2vw, 24px) 72px;
}

:deep(.grading-task-center) {
  gap: 0;
}

:deep(.grading-task-center__overview) {
  display: none;
}

:deep(.grading-task-picker select),
:deep(.submission-list) {
  border-color: rgba(61, 53, 100, 0.22);
  border-radius: 7px;
}

:deep(.submission-list) {
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.09);
}

.workspace-card,
.manual-review-focus,
.calibration-step {
  border: 1px solid rgba(61, 53, 100, 0.25) !important;
  border-radius: 9px !important;
  background: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.14) !important;
}

.workspace-card {
  width: min(1050px, 100%);
  margin: 0 auto;
  padding: clamp(22px, 3vw, 36px) !important;
}

.grading-input-panel {
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.grading-input-panel .panel-heading {
  padding: 0 2px;
}

.panel-intro {
  max-width: 650px;
  margin: 7px 0 0;
  color: #70688b;
  font-size: 13px;
  line-height: 1.7;
}

.handmade-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  margin-top: 22px;
  padding: 10px 15px;
  border: 1px solid var(--ai-purple-dark);
  border-radius: 5px;
  background: var(--ai-purple);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
  color: #fff;
  font-weight: 850;
  text-decoration: none;
  white-space: nowrap;
  word-break: keep-all;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.handmade-action:hover,
.handmade-action:focus-visible {
  background: #7067bd;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 30%);
  transform: translate(-2px, -2px);
}

.handmade-action:focus-visible {
  outline: 3px solid rgb(82 187 196 / 48%);
  outline-offset: 3px;
}

.active-workbench {
  width: min(1480px, 100%);
  margin: 0 auto;
  padding: 38px 0 12px;
}

.answer-exploration-sheet {
  position: relative;
  width: min(1040px, 88%);
  margin: 0 auto;
  padding: 26px 28px 24px !important;
  border: 2px solid var(--ai-ink) !important;
  border-radius: 8px !important;
  background: rgba(255, 255, 255, 0.94) !important;
  box-shadow: var(--ai-shadow-strong) !important;
  transform: rotate(-0.25deg);
}

.answer-exploration-sheet::before {
  position: absolute;
  top: -12px;
  left: 12%;
  width: 86px;
  height: 23px;
  background: rgba(255, 241, 168, 0.72);
  content: '';
  transform: rotate(-3deg);
}

.answer-exploration-sheet .panel-heading h2 {
  margin-top: 6px;
  color: var(--ai-ink) !important;
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 27px !important;
}

.answer-exploration-sheet .panel-intro {
  max-width: 610px;
  color: #70688b;
}

.grading-answer-block {
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
}

.grading-answer-block :deep(.el-form-item__label) {
  color: var(--ai-ink);
  font-size: 16px;
  font-weight: 850;
}

.grading-form :deep(.el-textarea__inner),
.grading-form :deep(.el-input__wrapper),
.grading-form :deep(.el-select__wrapper) {
  border: 1px solid var(--ai-border);
  border-radius: 5px;
  background: #fff;
  box-shadow: none;
}

.grading-form :deep(.el-textarea__inner:focus),
.grading-form :deep(.el-input__wrapper.is-focus),
.grading-form :deep(.el-select__wrapper.is-focused) {
  border-color: var(--ai-purple);
  box-shadow: 0 0 0 3px rgb(129 120 207 / 15%);
}

.grading-settings-disclosure,
.grading-rubric-disclosure {
  border: 1px dashed var(--ai-border) !important;
  border-radius: 5px !important;
  background: rgba(232, 228, 255, 0.34) !important;
  box-shadow: none !important;
}

.grading-settings-disclosure summary,
.grading-rubric-disclosure summary,
.form-actions :deep(.el-button),
:deep(.manual-review-panel__actions .el-button),
.insight-next-lesson {
  white-space: nowrap;
  word-break: keep-all;
}

.form-actions :deep(.el-button) {
  min-height: 42px;
  border-radius: 5px;
}

.form-actions :deep(.el-button--primary) {
  border-color: var(--ai-purple-dark);
  background: var(--ai-purple);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
}

.form-actions :deep(.el-button--primary:hover),
.form-actions :deep(.el-button--primary:focus-visible) {
  background: #7067bd;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 30%);
  transform: translate(-2px, -2px);
}

.manual-review-focus {
  width: min(920px, 82%);
  margin: 28px 0 0 auto;
  border: 1px solid var(--ai-border) !important;
  border-radius: 7px !important;
  background: rgba(157, 228, 235, 0.22) !important;
  box-shadow: var(--ai-shadow) !important;
}

.manual-review-focus.is-loading {
  position: relative;
  min-height: 66px;
  overflow: hidden;
  padding: 18px 20px !important;
}

.manual-review-focus.is-loading::after {
  position: absolute;
  right: 0;
  bottom: 8px;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--ai-purple), var(--ai-mint), transparent);
  content: '';
  animation: answer-scan 2.8s ease-in-out infinite;
}

.manual-review-focus.is-loading .manual-review-focus__heading span { display: none; }

.answer-discovery-cards {
  display: grid;
  gap: 16px;
  margin-top: 34px;
}

.answer-discovery-cards__head {
  display: flex;
  gap: 24px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 4px 12px;
  border-bottom: 1px dashed var(--ai-border);
}

.answer-discovery-cards__head h2 {
  margin: 6px 0 0;
  color: var(--ai-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 25px;
}

.answer-discovery-cards__head p {
  max-width: 430px;
  margin: 0;
  color: #70688b;
  font-size: 12px;
  line-height: 1.7;
  text-align: right;
}

.answer-discovery-cards__grid {
  display: grid;
  grid-template-columns: 5fr 4fr 5fr;
  gap: 16px;
  align-items: start;
}

.answer-discovery-card {
  min-height: 128px;
  padding: 17px 18px;
  border: 1px solid var(--ai-border);
  border-radius: 7px;
  background: #fff;
  box-shadow: var(--ai-shadow);
}

.answer-discovery-card:nth-child(2) { transform: translateY(12px) rotate(0.45deg); }
.answer-discovery-card:nth-child(3) { transform: translateY(-4px) rotate(-0.35deg); }
.answer-discovery-card--mastered { border-top: 5px solid var(--ai-mint-dark); background: rgba(157, 228, 235, 0.28); }
.answer-discovery-card--attention { border-top: 5px solid var(--ai-pink); background: rgba(238, 145, 187, 0.14); }
.answer-discovery-card--clue { border-top: 5px solid var(--ai-yellow); background: rgba(255, 241, 168, 0.34); }

.answer-discovery-card span {
  color: var(--ai-ink);
  font-size: 12px;
  font-weight: 850;
}

.answer-discovery-card p {
  margin: 11px 0 0;
  color: #554d73;
  font-size: 13px;
  line-height: 1.7;
}

.calibration-step {
  width: min(1180px, 100%);
  margin: 42px auto 0;
  padding: 25px !important;
  border: 2px solid var(--ai-ink) !important;
  border-radius: 9px !important;
  background: rgba(255, 255, 255, 0.94) !important;
  box-shadow: var(--ai-shadow-strong) !important;
}

.calibration-step .lab-step__header {
  padding-bottom: 15px;
  border-bottom: 1px dashed var(--ai-border);
}

.calibration-step .lab-step__header h2 {
  margin: 7px 0 4px;
  color: var(--ai-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 27px;
}

.calibration-step .lab-step__header p {
  margin: 0;
  color: #70688b;
  font-size: 13px;
  line-height: 1.65;
}

:deep(.manual-review-panel) {
  border: 2px solid var(--ai-ink) !important;
  border-radius: 8px !important;
  background: #fff !important;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 24%) !important;
}

:deep(.manual-review-panel__actions .el-button--primary) {
  border-color: var(--ai-purple-dark) !important;
  background: var(--ai-purple) !important;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
}

:deep(.manual-review-panel__actions .el-button--primary:hover),
:deep(.manual-review-panel__actions .el-button--primary:focus-visible) {
  background: #7067bd !important;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 30%);
  transform: translate(-2px, -2px);
}

:deep(.manual-review-panel) {
  display: grid !important;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  column-gap: 20px;
}

:deep(.manual-review-panel__header) {
  grid-column: 1 / -1;
}

:deep(.review-evidence-panel) {
  display: grid !important;
  grid-column: 1;
  grid-row: 2;
  border-color: var(--ai-border) !important;
  border-radius: 6px !important;
  background: rgba(157, 228, 235, 0.16) !important;
}

:deep(.review-evidence-panel__grid) {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

:deep(.review-evidence-card--rubric) { grid-column: 1 / -1; }

:deep(.score-compare-panel) {
  grid-column: 1;
  grid-row: 3;
  border-color: var(--ai-border) !important;
  border-radius: 6px !important;
  background: rgba(255, 255, 255, 0.72) !important;
}

:deep(.manual-review-editor) {
  grid-column: 2;
  grid-row: 2 / span 2;
  align-self: start;
}

:deep(.manual-review-panel__actions) {
  grid-column: 2;
  grid-row: 4;
  align-self: end;
}

.grading-learning-insight {
  width: min(1120px, 92%);
  margin: 34px auto 0;
  border: 1px solid var(--ai-border);
  border-radius: 8px;
  background: rgba(255, 241, 168, 0.28);
  box-shadow: var(--ai-shadow);
}

.grading-learning-insight__head h3 {
  color: var(--ai-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 23px;
}

.insight-next-lesson {
  border-color: var(--ai-purple-dark) !important;
  border-radius: 5px !important;
  background: var(--ai-purple) !important;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
  white-space: nowrap;
}

.insight-next-lesson:hover,
.insight-next-lesson:focus-visible {
  background: #7067bd !important;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 30%);
  transform: translate(-2px, -2px);
}

@keyframes answer-scan {
  0%, 100% { transform: translateX(-30%); opacity: 0.25; }
  50% { transform: translateX(30%); opacity: 1; }
}

@media (max-width: 900px) {
  .explore-hero { grid-template-columns: 1fr; }

  .explore-hero__content {
    position: relative;
    z-index: 2;
    max-width: 72%;
  }

  .review-scene {
    position: absolute;
    right: 8px;
    bottom: -28px;
    width: 320px;
    min-height: 220px;
    opacity: 0.76;
  }

  .answer-exploration-sheet,
  .manual-review-focus,
  .grading-learning-insight {
    width: 100%;
  }

  .answer-discovery-cards__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  :deep(.manual-review-panel) {
    grid-template-columns: 1fr;
  }

  :deep(.review-evidence-panel),
  :deep(.score-compare-panel),
  :deep(.manual-review-editor),
  :deep(.manual-review-panel__actions) {
    grid-column: 1;
    grid-row: auto;
  }
}

@media (max-width: 600px) {
  .ai-assistant-page { padding: 16px 14px 45px; }

  .explore-hero {
    min-height: 0;
    padding: 29px 23px 145px;
  }

  .explore-hero h1 { font-size: 40px; }

  .review-scene {
    right: -72px;
    bottom: -52px;
    width: 280px;
    min-height: 190px;
    opacity: 0.72;
    transform: scale(0.72);
    transform-origin: bottom right;
  }

  .explore-hero__content { max-width: 100%; }
  .explore-hero p { max-width: 285px; }

  .answer-exploration-sheet {
    padding: 21px 18px !important;
    transform: none;
  }

  .answer-discovery-cards__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .answer-discovery-cards__head p { text-align: left; }

  .answer-discovery-cards__grid { grid-template-columns: 1fr; }

  .answer-discovery-card:nth-child(2),
  .answer-discovery-card:nth-child(3) {
    transform: none;
  }

  .calibration-step { padding: 18px !important; }

  .grading-learning-insight__head { align-items: flex-start; flex-direction: column; }
  .insight-next-lesson { width: 100%; }
}

@media (max-width: 380px) {
  .explore-hero h1 { font-size: 34px; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

.panel-heading h2,
.lab-step__header h2,
:deep(.manual-review-panel h3),
:deep(.score-compare-panel h4) {
  color: #3d3564 !important;
}

.panel-heading h2 {
  margin-top: 5px;
  font-size: 24px !important;
}

.grading-form :deep(.el-form-item__label) {
  color: #4f4773;
  font-weight: 750;
}

.grading-answer-block {
  padding: clamp(18px, 2.4vw, 28px) !important;
  border: 1px solid rgba(61, 53, 100, 0.26) !important;
  border-left: 5px solid #9de4eb !important;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94) !important;
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.12) !important;
}

.grading-answer-block :deep(.el-form-item) {
  margin-bottom: 0;
}

.grading-answer-block :deep(.el-textarea__inner) {
  min-height: 178px !important;
  padding: 18px;
  font-size: 15px;
  line-height: 1.75;
}

.grading-form :deep(.el-textarea__inner),
.grading-form :deep(.el-input__wrapper),
.grading-form :deep(.el-select__wrapper) {
  border: 1px solid rgba(61, 53, 100, 0.22);
  border-radius: 7px;
  background: #fff;
  box-shadow: none;
}

.grading-form :deep(.el-textarea__inner:focus),
.grading-form :deep(.el-input__wrapper.is-focus),
.grading-form :deep(.el-select__wrapper.is-focused) {
  border-color: #8178cf;
  box-shadow: 0 0 0 3px rgba(129, 120, 207, 0.13);
}

.grading-settings-disclosure,
.ai-analysis-disclosure {
  border-color: rgba(61, 53, 100, 0.22);
  background: rgba(255, 255, 255, 0.72);
}

.form-actions :deep(.el-button--primary),
:deep(.manual-review-panel__actions .el-button--primary) {
  border-color: #3d3564;
  background: #8178cf;
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.2);
}

.form-actions :deep(.el-button),
:deep(.manual-review-panel__actions .el-button) {
  min-height: 42px;
  border-radius: 7px;
  white-space: nowrap;
}

.analysis-result {
  width: min(1050px, 100%);
  margin: 0 auto;
  padding: clamp(22px, 3vw, 34px);
  border-top: 5px solid #9de4eb !important;
}

.grading-result-prompt {
  display: grid;
  gap: 7px;
  width: min(1050px, 100%);
  min-height: 128px;
  margin: 0 auto;
  padding: 24px 28px;
  place-content: center start;
  border: 1px dashed rgba(61, 53, 100, 0.28);
  border-radius: 8px;
  background: rgba(157, 228, 235, 0.1);
}

.grading-result-prompt span {
  color: #8178cf;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.grading-result-prompt strong {
  color: #3d3564;
  font-size: 16px;
  line-height: 1.5;
}

.grading-result-prompt p {
  margin: 0;
  color: #70688b;
  font-size: 13px;
  line-height: 1.65;
}

.manual-review-focus__heading strong {
  color: #3d3564;
  font-size: 20px;
}

.manual-review-focus__metrics b {
  color: #8178cf;
  font-size: 22px;
}

.manual-review-focus__answer {
  border-color: rgba(61, 53, 100, 0.2);
  background: rgba(157, 228, 235, 0.12);
}

.manual-review-focus__answer > span {
  color: #8178cf;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.calibration-step {
  width: min(1050px, 100%);
  margin: 0 auto;
  padding: clamp(22px, 3vw, 36px);
  border-top: 5px solid #ee91bb !important;
  box-shadow: 6px 7px 0 rgba(61, 53, 100, 0.16) !important;
}

.lab-step__header {
  margin-bottom: 22px;
}

.lab-step__header h2 {
  margin: 5px 0 5px;
  font-size: 24px;
}

.lab-step__header p {
  margin: 0;
  color: #70668f;
  font-size: 13px;
}

:deep(.manual-review-panel) {
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

:deep(.learning-error-analysis) {
  order: 3;
  padding: 20px !important;
  border: 1px dashed rgba(61, 53, 100, 0.24) !important;
  border-radius: 8px !important;
  background: rgba(255, 241, 168, 0.16) !important;
  box-shadow: none !important;
}

:deep(.learning-error-analysis__header > strong) {
  display: none;
}

:deep(.learning-error-analysis__header h3) {
  color: #3d3564 !important;
  font-size: 17px !important;
}

:deep(.learning-error-analysis__header span),
:deep(.learning-error-card > span) {
  color: #8178cf !important;
}

:deep(.learning-error-card) {
  padding: 12px 14px !important;
  border: 0 !important;
  border-left: 3px solid rgba(129, 120, 207, 0.45) !important;
  border-radius: 0 !important;
  background: rgba(255, 255, 255, 0.6) !important;
}

:deep(.manual-review-panel__header > div) {
  display: none;
}

:deep(.manual-review-status) {
  border: 1px solid rgba(61, 53, 100, 0.2);
  border-radius: 5px;
  background: #fff1a8;
  color: #3d3564;
}

:deep(.score-compare-panel) {
  border-color: rgba(61, 53, 100, 0.22) !important;
  background: rgba(255, 255, 255, 0.65) !important;
}

:deep(.score-compare-card) {
  border-color: rgba(61, 53, 100, 0.18) !important;
  background: #fff !important;
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.08);
}

:deep(.score-compare-card--ai) { border-top: 4px solid #8178cf !important; }
:deep(.score-compare-card--teacher) { border-top: 4px solid #ee91bb !important; }
:deep(.score-compare-card--ai strong) { color: #8178cf !important; }
:deep(.score-compare-card--teacher strong) { color: #c85e91 !important; }

:deep(.manual-review-editor__score),
:deep(.manual-review-field) {
  border-color: rgba(61, 53, 100, 0.18) !important;
  background: rgba(255, 241, 168, 0.14) !important;
}

.ai-analysis-disclosure {
  margin-top: 18px;
}

.grading-center-hero {
  display: none !important;
}

@media (max-width: 900px) {
  .explore-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .review-scene {
    min-height: 190px;
  }
}

@media (max-width: 600px) {
  .explore-hero,
  .active-workbench {
    width: min(100% - 24px, 1600px);
  }

  .explore-hero {
    padding: 34px 18px;
  }

  .exploration-route {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
  }

  .exploration-route i {
    display: none;
  }

  .exploration-route span {
    min-width: 0;
    text-align: center;
  }

  .workspace-card,
  .manual-review-focus,
  .calibration-step {
    padding: 18px !important;
  }

  .grading-result-prompt {
    min-height: 112px;
    padding: 20px 18px;
  }

  .form-actions,
  :deep(.manual-review-panel__actions) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-actions :deep(.el-button),
  :deep(.manual-review-panel__actions .el-button) {
    width: 100%;
    margin-left: 0;
  }

  .panel-heading,
  .manual-review-focus__heading,
  .manual-review-focus__metrics {
    align-items: flex-start;
    flex-direction: column;
  }
}

@media (max-width: 380px) {
  .exploration-route,
  .form-actions,
  :deep(.manual-review-panel__actions) {
    grid-template-columns: 1fr;
  }
}

.grading-learning-insight {
  display: grid;
  gap: 18px;
  margin-top: 22px;
  padding: 22px;
  border: 1px solid rgba(61, 53, 100, 0.24);
  border-radius: 9px;
  background: rgba(255, 241, 168, 0.2);
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.1);
}

.grading-learning-insight__head {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  justify-content: space-between;
}

.grading-learning-insight__head h3 {
  margin: 7px 0 4px;
  color: #3d3564;
  font-size: 20px;
}

.grading-learning-insight__head p {
  margin: 0;
  color: #70688b;
  font-size: 12px;
  line-height: 1.65;
}

.insight-next-lesson {
  flex: 0 0 auto;
  min-height: 40px;
  border-color: #3d3564 !important;
  border-radius: 7px !important;
  background: #8178cf !important;
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.18);
  white-space: nowrap;
}

.insight-next-lesson:hover,
.insight-next-lesson:focus-visible {
  background: #7067bd !important;
  transform: translate(-1px, -1px);
}

.grading-learning-insight__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  padding-top: 16px;
  border-top: 1px dashed rgba(61, 53, 100, 0.2);
}

.learning-insight-note {
  min-width: 0;
  padding: 15px;
  border: 1px solid rgba(61, 53, 100, 0.2);
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.82);
}

.learning-insight-note--mastered { border-top: 4px solid #9de4eb; }
.learning-insight-note--weak { border-top: 4px solid #ee91bb; }
.learning-insight-note--error { border-top: 4px solid #8178cf; }
.learning-insight-note--advice { border-top: 4px solid #fff1a8; }

.learning-insight-note > span {
  color: #645b84;
  font-size: 12px;
  font-weight: 800;
}

.learning-insight-note ul {
  display: grid;
  gap: 7px;
  margin: 10px 0 0;
  padding-left: 17px;
}

.learning-insight-note li,
.learning-insight-note p {
  color: #554d73;
  font-size: 12px;
  line-height: 1.6;
}

.learning-insight-note p {
  margin: 10px 0 0;
}

.grading-learning-insight__empty {
  padding: 15px 16px;
  border-top: 1px dashed rgba(61, 53, 100, 0.2);
  color: #70688b;
  font-size: 13px;
  line-height: 1.7;
}

:deep(.learning-error-analysis) {
  display: none !important;
}

@media (max-width: 980px) {
  .grading-learning-insight__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .grading-learning-insight {
    padding: 18px;
  }

  .grading-learning-insight__head {
    flex-direction: column;
  }

  .insight-next-lesson {
    width: 100%;
  }

  .grading-learning-insight__grid {
    grid-template-columns: 1fr;
  }
}

/* Edu-F answer discovery composition */
.ai-assistant-page {
  --ai-ink: #3d3564;
  --ai-purple: #8178cf;
  --ai-purple-dark: #4e4473;
  --ai-pink: #ee91bb;
  --ai-mint: #9de4eb;
  --ai-mint-dark: #52bbc4;
  --ai-yellow: #fff1a8;
  --ai-border: rgb(61 53 100 / 28%);
  --ai-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
  --ai-shadow-strong: 7px 8px 0 rgb(61 53 100 / 55%);
  min-height: 100%;
  padding: clamp(18px, 4vw, 54px) clamp(18px, 5vw, 80px) 72px;
  color: var(--ai-ink);
}

.explore-hero {
  width: min(1600px, 100%);
  min-height: 294px;
  margin: 0 auto;
  padding: clamp(28px, 4vw, 50px) clamp(26px, 5vw, 76px);
  border: 2px solid var(--ai-ink);
  border-radius: 9px;
  background: linear-gradient(118deg, #dff7f5 0%, #eeeaff 48%, #ffe6f1 100%);
  box-shadow: var(--ai-shadow-strong);
}

.explore-hero__content { max-width: 640px; }

.explore-hero h1 {
  max-width: 640px;
  margin: 13px 0 0;
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: clamp(40px, 5vw, 60px);
  line-height: 1.05;
}

.explore-hero p {
  max-width: 520px;
  margin: 15px 0 0;
  color: #615783;
  font-size: 15px;
  line-height: 1.7;
}

/* Answer input hierarchy refinement */
:deep(.teacher-ai-grading-workspace) {
  gap: 56px;
}

.answer-exploration-sheet {
  width: min(1120px, 94%);
  margin: 0 auto;
  padding: 36px 40px 34px !important;
  border: 1px solid var(--ai-border) !important;
  border-left: 6px solid var(--ai-mint-dark) !important;
  border-radius: 8px !important;
  background: rgba(255, 255, 255, 0.96) !important;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 18%) !important;
  transform: none;
}

.answer-exploration-sheet::before {
  display: none;
}

.answer-exploration-sheet .panel-heading {
  margin-bottom: 30px;
}

.answer-exploration-sheet .panel-heading h2 {
  margin: 10px 0 0;
  color: var(--ai-ink) !important;
  font-size: 32px !important;
  line-height: 1.2;
}

.answer-exploration-sheet .panel-intro {
  max-width: 720px;
  margin-top: 12px;
  color: #655d80;
  font-size: 17px;
  line-height: 1.7;
}

.grading-form {
  gap: 28px;
}

.grading-question-primary-block,
.grading-answer-block {
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.grading-question-primary-block :deep(.el-form-item),
.grading-answer-block :deep(.el-form-item) {
  margin-bottom: 0;
}

.grading-question-primary-block :deep(.el-form-item__label),
.grading-answer-block :deep(.el-form-item__label) {
  height: auto;
  padding-bottom: 11px;
  color: var(--ai-ink);
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
}

.grading-question-primary-block :deep(.el-textarea__inner),
.grading-answer-block :deep(.el-textarea__inner) {
  padding: 17px 18px;
  border: 1px solid rgb(61 53 100 / 30%);
  border-radius: 6px;
  color: var(--ai-ink);
  font-size: 16px;
  line-height: 1.75;
}

.grading-question-primary-block :deep(.el-textarea__inner) {
  min-height: 120px !important;
}

.grading-answer-block :deep(.el-textarea__inner) {
  min-height: 260px !important;
}

.grading-question-primary-block :deep(.el-textarea__inner::placeholder),
.grading-answer-block :deep(.el-textarea__inner::placeholder) {
  color: #9188a9;
  font-size: 15px;
}

.grading-question-primary-block :deep(.el-textarea__inner:focus),
.grading-answer-block :deep(.el-textarea__inner:focus) {
  border-color: var(--ai-purple);
  box-shadow: 0 0 0 3px rgb(129 120 207 / 15%);
}

.grading-primary-actions {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
  margin-top: -4px;
  padding-top: 0;
}

.grading-primary-actions :deep(.el-button) {
  display: inline-flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  margin-left: 0;
  padding-inline: 22px;
  border: 1px solid var(--ai-purple-dark);
  border-radius: 5px;
  font-size: 16px;
  font-weight: 800;
  white-space: nowrap;
  word-break: keep-all;
}

.grading-primary-actions :deep(.el-button:not(.el-button--primary)) {
  background: #fff;
  box-shadow: 2px 3px 0 rgb(61 53 100 / 16%);
  color: var(--ai-purple-dark);
}

.grading-primary-actions :deep(.el-button--primary) {
  min-width: 220px;
  padding-inline: 26px;
  background: var(--ai-purple);
  box-shadow: 4px 5px 0 rgb(61 53 100 / 32%);
  color: #fff;
  font-size: 17px;
}

.grading-primary-actions :deep(.el-button--primary:hover),
.grading-primary-actions :deep(.el-button--primary:focus-visible) {
  background: #7067bd;
  box-shadow: 6px 7px 0 rgb(61 53 100 / 32%);
  transform: translate(-2px, -2px);
}

.grading-primary-actions :deep(.el-button.is-disabled) {
  box-shadow: none;
  transform: none;
}

.grading-settings-disclosure {
  margin-top: 2px;
  border: 1px solid rgb(61 53 100 / 24%) !important;
  border-radius: 6px !important;
  background: rgba(232, 228, 255, 0.3) !important;
  box-shadow: none !important;
}

.grading-settings-disclosure > summary {
  min-height: 50px;
  padding: 0 18px;
  color: var(--ai-ink);
  font-size: 16px;
  font-weight: 750;
  white-space: nowrap;
  word-break: keep-all;
}

.grading-settings-disclosure > summary small {
  color: #746c8c;
  font-size: 13px;
  white-space: nowrap;
}

.grading-settings-disclosure[open] > summary {
  border-bottom: 1px solid rgb(61 53 100 / 16%);
}

.grading-settings-disclosure > .grading-question-block,
.grading-settings-disclosure > .grading-rubric-disclosure {
  padding: 24px !important;
}

.grading-question-block,
.grading-rubric-block {
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.manual-review-focus,
.answer-discovery-cards,
.calibration-step,
.grading-learning-insight {
  scroll-margin-top: 24px;
}

.manual-review-focus { margin-top: 52px; }
.answer-discovery-cards { margin-top: 52px; }
.calibration-step { margin-top: 58px; }
.grading-learning-insight { margin-top: 52px; }

.linked-practice-context {
  display: grid;
  width: min(1120px, 94%);
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px 28px;
  align-items: center;
  margin: 0 auto 32px;
  padding: 22px 26px;
  border: 1px solid rgb(61 53 100 / 24%);
  border-left: 5px solid var(--ai-mint-dark);
  border-radius: 8px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
}

.linked-practice-context__source {
  display: inline-flex;
  margin-bottom: 6px;
  color: var(--ai-purple-dark);
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
}

.linked-practice-context h2 {
  margin: 0;
  color: var(--ai-ink);
  font-size: 22px;
  line-height: 1.35;
}

.linked-practice-context p {
  margin: 7px 0 0;
  color: #6d6681;
  font-size: 14px;
}

.linked-practice-context__back,
.linked-suggestion-actions :deep(.el-button) {
  white-space: nowrap;
  word-break: keep-all;
}

.linked-question-switcher {
  display: flex;
  grid-column: 1 / -1;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 2px;
}

.linked-question-switcher button {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid rgb(61 53 100 / 24%);
  border-radius: 5px;
  background: #fff;
  color: #625a7d;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease, transform 160ms ease;
}

.linked-question-switcher button:hover,
.linked-question-switcher button:focus-visible {
  border-color: var(--ai-purple);
  color: var(--ai-purple-dark);
  outline: none;
  transform: translateY(-1px);
}

.linked-question-switcher button.is-active {
  border-color: var(--ai-purple-dark);
  background: #eeeaff;
  color: var(--ai-purple-dark);
}

.linked-question-switcher button.is-applied:not(.is-active) {
  border-color: #6ebbb2;
  background: #ecfaf7;
  color: #397e76;
}

.linked-suggestion-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 28px;
}

.linked-suggestion-actions :deep(.el-button) {
  min-height: 46px;
  margin-left: 0;
  padding-inline: 20px;
  border-radius: 5px;
  font-weight: 750;
}

.linked-suggestion-actions :deep(.el-button--primary) {
  border-color: var(--ai-purple-dark);
  background: var(--ai-purple);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 25%);
}

@media (max-width: 600px) {
  .linked-practice-context {
    width: 100%;
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .linked-practice-context__back {
    width: 100%;
  }

  .linked-question-switcher {
    grid-column: 1;
  }

  .linked-suggestion-actions {
    display: grid;
    grid-template-columns: 1fr;
  }

  .linked-suggestion-actions :deep(.el-button) {
    width: 100%;
  }

  .answer-exploration-sheet {
    width: 100%;
    padding: 28px 20px 26px !important;
  }

  .answer-exploration-sheet .panel-heading h2 { font-size: 28px !important; }
  .answer-exploration-sheet .panel-intro { font-size: 16px; }

  .grading-form { gap: 24px; }
  .grading-answer-block :deep(.el-textarea__inner) { min-height: 240px !important; }

  .grading-primary-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-top: 0;
  }

  .grading-primary-actions :deep(.el-button),
  .grading-primary-actions :deep(.el-button--primary) {
    width: 100%;
    min-width: 0;
  }

  .grading-settings-disclosure > summary {
    align-items: flex-start;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
  }

  .grading-settings-disclosure > summary small {
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
}
</style>
