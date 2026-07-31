<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  CopyDocument,
  Delete,
  Document,
  EditPen,
  MagicStick,
  Plus,
  RefreshLeft,
} from '@element-plus/icons-vue'
import { listTeacherCourses } from '@/api/course'
import { generateGrading, generateLessonPlan } from '@/api/teacherAi'

const activeTab = ref('lesson')
const courseLoading = ref(false)
const courseOptions = ref([])
const lessonFormRef = ref()
const gradingFormRef = ref()
const lessonLoading = ref(false)
const gradingLoading = ref(false)
const lessonResult = ref(null)
const gradingResult = ref(null)
const gradingResultMaxScore = ref(10)
let rubricSequence = 3

function createLessonDefaults() {
  return {
    courseId: null,
    topic: '',
    grade: '大学',
    durationMinutes: 45,
    objectives: '',
    difficulty: '进阶',
    requirements: '',
  }
}

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

const lessonForm = reactive(createLessonDefaults())
const gradingForm = reactive(createGradingDefaults())

const lessonRules = {
  topic: [
    { required: true, message: '请输入课题名称', trigger: 'blur' },
    { max: 200, message: '课题名称不能超过200个字符', trigger: 'blur' },
  ],
  grade: [{ required: true, message: '请选择或输入学段', trigger: 'change' }],
  durationMinutes: [
    { required: true, message: '请输入课时分钟数', trigger: 'change' },
    { type: 'number', min: 20, max: 240, message: '课时应为20到240分钟', trigger: 'change' },
  ],
  objectives: [
    { required: true, message: '请输入教学目标', trigger: 'blur' },
    { max: 2000, message: '教学目标不能超过2000个字符', trigger: 'blur' },
  ],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  requirements: [{ max: 2000, message: '补充要求不能超过2000个字符', trigger: 'blur' }],
}

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

const lessonDemoResult = {
  title: '《人工智能基础》教案示例',
  objectives: [
    '理解机器学习基本概念',
    '掌握监督学习和无监督学习区别',
    '了解常见算法应用场景',
  ],
  keyPoints: [
    '监督学习核心流程',
    '输入输出映射关系',
    '典型应用案例',
  ],
  difficultPoints: [
    '监督学习与无监督学习的边界辨析',
    '标签数据集与样本特征关系',
  ],
  preparations: ['案例素材：垃圾邮件分类', '演示素材：房价预测', '课堂练习单'],
  notes: ['课堂节奏保持简洁', '鼓励学生对比不同算法场景'],
  teachingSteps: [
    {
      stage: '阶段1 情境导入',
      durationMinutes: 8,
      teacherActivity: '引入人工智能在生活中的应用案例。',
      studentActivity: '观察案例并思考机器学习的作用。',
      purpose: '建立学习兴趣与知识背景。',
    },
    {
      stage: '阶段2 概念讲解',
      durationMinutes: 10,
      teacherActivity: '讲解监督学习与无监督学习的区别。',
      studentActivity: '记录关键概念并进行提问。',
      purpose: '形成基础概念理解。',
    },
    {
      stage: '阶段3 案例分析',
      durationMinutes: 10,
      teacherActivity: '分析垃圾邮件分类与房价预测案例。',
      studentActivity: '分组讨论算法适用场景。',
      purpose: '建立知识迁移意识。',
    },
    {
      stage: '阶段4 课堂练习',
      durationMinutes: 9,
      teacherActivity: '布置分层练习并巡视指导。',
      studentActivity: '完成基础题、提升题与应用题。',
      purpose: '巩固概念并检查掌握情况。',
    },
    {
      stage: '阶段5 总结评价',
      durationMinutes: 8,
      teacherActivity: '总结课堂要点并进行评价反馈。',
      studentActivity: '回顾学习收获并完成自评。',
      purpose: '形成课堂闭环与学习反思。',
    },
  ],
  activities: [
    '增加案例讨论、小组分析、随堂练习等内容。',
  ],
  exercises: [
    {
      question: '基础题：什么是监督学习？',
      type: '基础题',
      difficulty: '基础',
      referenceAnswer: '使用带标签数据进行训练，目标是学习输入到输出的映射关系。',
    },
    {
      question: '提升题：无监督学习适合解决什么问题？',
      type: '提升题',
      difficulty: '进阶',
      referenceAnswer: '适合发现数据中的结构与模式，如聚类、降维等任务。',
    },
    {
      question: '应用题：结合一个真实场景说明你会如何选择算法。',
      type: '应用题',
      difficulty: '应用',
      referenceAnswer: '根据是否有标签、任务目标和数据规模，选择监督学习或无监督学习方法。',
    },
  ],
  rubric: [
    { criterion: '知识理解', maxScore: 4, description: '40%：理解基本概念并准确区分监督学习与无监督学习。' },
    { criterion: '方法应用', maxScore: 3.5, description: '35%：能结合案例说明算法应用场景。' },
    { criterion: '表达能力', maxScore: 2.5, description: '25%：语言清晰，结构完整，表达准确。' },
  ],
}

const gradingDemoResult = {
  title: '简答题批改示例',
  question: '解释监督学习和无监督学习的区别，并说明应用场景。',
  studentAnswer:
    '监督学习需要带标签的数据，适合做分类和回归，比如垃圾邮件分类和房价预测；无监督学习不需要标签，适合聚类和降维，比如用户分群。',
  totalScore: 8.5,
  confidence: 0.92,
  dimensionScores: [
    { criterion: '知识准确性', score: 3.5, maxScore: 4, reason: '正确区分了两类学习方式。' },
    { criterion: '要点完整性', score: 3, maxScore: 3, reason: '覆盖了关键概念。' },
    { criterion: '逻辑表达', score: 2, maxScore: 3, reason: '表达较清晰，但案例说明略少。' },
  ],
  strengths: ['能够正确理解监督学习和无监督学习基本区别。'],
  deductions: ['缺少标签数据集和输入输出映射关系说明。'],
  suggestions: ['补充典型应用案例，例如垃圾邮件分类、房价预测。'],
  referenceAnswer:
    '监督学习使用带标签数据进行训练，强调输入和输出之间的映射；无监督学习则不依赖标签，主要用于发现数据结构、模式或聚类关系。',
  revisedAnswer:
    '监督学习依赖带标签数据，常用于分类、回归等任务；无监督学习不需要标签，常用于聚类、降维和模式发现。常见场景包括垃圾邮件分类、房价预测和用户分群。',
}

const lessonDisplayResult = computed(() => lessonResult.value || lessonDemoResult)
const gradingDisplayResult = computed(() => gradingResult.value || gradingDemoResult)

const lessonModuleCards = computed(() => [
  {
    key: 'objectives',
    title: '教学目标',
    description: '围绕知识、能力与素养形成可执行目标',
    items: normalizeList(lessonDisplayResult.value?.objectives),
  },
  {
    key: 'keyPoints',
    title: '教学重点',
    description: '突出本节课必须掌握的核心内容',
    items: normalizeList(lessonDisplayResult.value?.keyPoints),
  },
  {
    key: 'difficultPoints',
    title: '教学难点',
    description: '提前标出学生容易卡住的环节',
    items: normalizeList(lessonDisplayResult.value?.difficultPoints),
  },
  {
    key: 'preparations',
    title: '教学准备',
    description: '课前资源、素材与设备准备提示',
    items: normalizeList(lessonDisplayResult.value?.preparations),
  },
  {
    key: 'notes',
    title: '教学提醒',
    description: '帮助教师快速把握课堂节奏',
    items: normalizeList(lessonDisplayResult.value?.notes),
  },
])

const lessonTeachingSteps = computed(() => normalizeList(lessonDisplayResult.value?.teachingSteps))
const lessonActivities = computed(() => normalizeList(lessonDisplayResult.value?.activities))
const lessonExercises = computed(() => normalizeList(lessonDisplayResult.value?.exercises))
const lessonRubric = computed(() => normalizeList(lessonDisplayResult.value?.rubric))
const lessonCoreCards = computed(() =>
  lessonModuleCards.value.filter((card) => ['objectives', 'keyPoints', 'difficultPoints'].includes(card.key)),
)
const lessonSupplementCards = computed(() =>
  lessonModuleCards.value.filter((card) => !['objectives', 'keyPoints', 'difficultPoints'].includes(card.key)),
)
const gradingDimensionScores = computed(() => normalizeList(gradingDisplayResult.value?.dimensionScores))
const gradingStrengths = computed(() => normalizeList(gradingDisplayResult.value?.strengths))
const gradingDeductions = computed(() => normalizeList(gradingDisplayResult.value?.deductions))
const gradingSuggestions = computed(() => normalizeList(gradingDisplayResult.value?.suggestions))
const coveredDimensionCount = computed(() =>
  gradingDimensionScores.value.filter((item) => Number(item?.score || 0) > 0).length,
)
const knowledgeCoveragePercent = computed(() => {
  const total = gradingDimensionScores.value.length
  if (!total) return 0
  return Math.max(0, Math.min(100, Math.round((coveredDimensionCount.value / total) * 100)))
})
const gradingWeakDimensionLabels = computed(() =>
  gradingDimensionScores.value
    .map((item) => {
      const maxScore = Number(item?.maxScore || 0)
      const score = Number(item?.score || 0)
      return {
        criterion: item?.criterion,
        ratio: maxScore > 0 ? score / maxScore : 0,
      }
    })
    .filter((item) => item.criterion)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 2)
    .map((item) => item.criterion),
)
const lessonResultReady = computed(() => Boolean(lessonResult.value))
const gradingResultReady = computed(() => Boolean(gradingResult.value))
const lessonStatusText = computed(() =>
  lessonLoading.value ? 'AI正在生成教案' : lessonResultReady.value ? '教案已完成' : '示例教案',
)
const gradingStatusText = computed(() =>
  gradingLoading.value ? 'AI正在分析答案' : gradingResultReady.value ? '批改报告已完成' : '示例批改案例',
)
const gradingReferenceAnswer = computed(() => gradingDisplayResult.value?.referenceAnswer || gradingForm.referenceAnswer)
const gradingCaseQuestion = computed(
  () => gradingDisplayResult.value?.question || gradingForm.question || gradingDemoResult.question,
)
const gradingCaseStudentAnswer = computed(
  () => gradingDisplayResult.value?.studentAnswer || gradingForm.studentAnswer || gradingDemoResult.studentAnswer,
)
const heroFeatureCards = [
  {
    label: '智能备课',
    value: '课前设计提效',
    note: '快速生成教学目标、流程与课堂活动建议',
  },
  {
    label: '智能批改',
    value: '课后评价闭环',
    note: '围绕 Rubric 输出评分结果、反馈与改进建议',
  },
  {
    label: '学情分析',
    value: '教学优化依据',
    note: '沉淀高频问题与薄弱知识点，辅助持续优化教学',
  },
]

const heroWorkflowSteps = [
  '教学目标解析',
  '教案智能生成',
  'Rubric评分构建',
  '批改反馈分析',
  '教学优化建议',
]

const teachingOverviewStats = [
  { label: 'AI备课效率', value: '12', note: '本周生成教案' },
  { label: '批改任务', value: '36', note: '完成作业份数' },
  { label: '评分可信度', value: '87%', note: 'AI复核结果' },
  { label: '薄弱知识点', value: '机器学习基础', note: '待强化章节 3 个' },
]
const lessonCapabilitySteps = [
  {
    title: '理解课程目标',
    description: '自动提炼教学目标、学段与课堂要求，快速建立生成上下文。',
  },
  {
    title: '生成教学结构',
    description: '围绕流程、活动、练习与 Rubric 组织完整教案骨架。',
  },
  {
    title: '补全教学建议',
    description: '输出课堂提醒、资源准备与可复用的教学优化提示。',
  },
]
const gradingCapabilitySteps = [
  {
    title: '理解答题语义',
    description: '识别题干、参考答案与学生作答中的核心信息。',
  },
  {
    title: '匹配评分标准',
    description: '按照 Rubric 分解维度得分，生成可复核的评分依据。',
  },
  {
    title: '输出反馈建议',
    description: '聚合失分点、薄弱环节与教学改进建议。',
  },
]
const lessonProcessSteps = [
  {
    title: '分析教学目标',
    description: '识别课程要求、学段特征与课堂重点。',
  },
  {
    title: '构建课程结构',
    description: '生成教学流程、节奏与关键活动安排。',
  },
  {
    title: '生成课堂活动',
    description: '输出可执行的互动设计与教学组织建议。',
  },
  {
    title: '匹配练习与 Rubric',
    description: '补全练习题与评价标准，形成完整闭环。',
  },
]
const lessonPreviewItems = ['教学目标', '教学流程', '课堂活动设计', '分层练习题', 'Rubric评价标准']
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
const teachingLoopSteps = [
  {
    title: '备课生成',
    description: '生成教学目标、流程、活动与评价内容。',
  },
  {
    title: '课堂实施',
    description: '支持教师按教案组织课堂节奏与互动环节。',
  },
  {
    title: '智能批改',
    description: '围绕 Rubric 完成评分、反馈与改写建议。',
  },
  {
    title: '学情分析',
    description: '沉淀薄弱知识点与课堂表现洞察。',
  },
  {
    title: '教学优化',
    description: '反哺下一轮备课与专项练习设计。',
  },
]
const lessonLoadingStages = [
  {
    title: '解析教学背景',
    description: '识别课题、学段、目标与难度偏好',
  },
  {
    title: '编排课堂结构',
    description: '生成教学流程、活动设计与环节时长',
  },
  {
    title: '补全评价内容',
    description: '输出练习题与 Rubric 评分建议',
  },
]
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
const lessonEmptyHints = ['将输出模块化教案', '包含流程、活动、练习与 Rubric']
const gradingEmptyHints = ['将输出评分反馈报告', '包含扣分原因、建议与改写答案']
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

async function loadCourses() {
  courseLoading.value = true
  try {
    const courses = (await listTeacherCourses()) || []
    courseOptions.value = courses.map((course) => ({
      value: course.id,
      label: course.title || course.courseName || `课程 ${course.id}`,
    }))
  } catch (error) {
    courseOptions.value = []
    ElMessage.warning(error?.message || '关联课程加载失败，仍可继续填写并生成教案')
  } finally {
    courseLoading.value = false
  }
}

async function submitLessonPlan() {
  const valid = await lessonFormRef.value?.validate().catch(() => false)
  if (!valid) return

  lessonLoading.value = true
  try {
    lessonResult.value = await generateLessonPlan({
      courseId: lessonForm.courseId || undefined,
      topic: lessonForm.topic.trim(),
      grade: lessonForm.grade.trim(),
      durationMinutes: lessonForm.durationMinutes,
      objectives: lessonForm.objectives.trim(),
      difficulty: lessonForm.difficulty,
      requirements: lessonForm.requirements.trim() || undefined,
    })
    ElMessage.success('教案已生成')
  } catch (error) {
    ElMessage.error(error?.message || '教案生成失败，请稍后重试')
  } finally {
    lessonLoading.value = false
  }
}

async function submitGrading() {
  const valid = await gradingFormRef.value?.validate().catch(() => false)
  if (!valid) return

  gradingLoading.value = true
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
    gradingResultMaxScore.value = maxScore
    ElMessage.success('批改已完成')
  } catch (error) {
    ElMessage.error(error?.message || '智能批改失败，请稍后重试')
  } finally {
    gradingLoading.value = false
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

function clearLessonForm() {
  Object.assign(lessonForm, createLessonDefaults())
  lessonResult.value = null
  lessonFormRef.value?.clearValidate()
}

function clearGradingForm() {
  rubricSequence = 3
  Object.assign(gradingForm, createGradingDefaults())
  gradingResult.value = null
  gradingResultMaxScore.value = 10
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

onMounted(loadCourses)
</script>
<template>
  <main class="ai-assistant-page">
    <header class="workspace-hero">
      <div class="workspace-hero__main">
        <div class="hero-icon-shell">
          <MagicStick />
        </div>
        <div class="hero-copy">
          <div class="hero-meta-row">
            <span class="hero-kicker">TEACHER AI WORKSPACE</span>
            <span class="hero-state-pill">
              <span class="status-dot"></span>
              {{ lessonLoading || gradingLoading ? 'AI 正在处理中' : '工作台已就绪' }}
            </span>
          </div>
          <h1>教师智能教学助手工作台</h1>
          <p>围绕课前备课、课后批改、学情分析形成 AI 教学闭环。</p>
          <div class="hero-chip-row" aria-label="AI能力标签">
            <span class="hero-chip"><Document /> 智能备课</span>
            <span class="hero-chip"><EditPen /> 智能批改</span>
            <span class="hero-chip"><MagicStick /> 教学评价辅助</span>
          </div>
          <div class="hero-lab-strip" aria-label="AI教学闭环">
            <span>AI探索乐园</span>
            <span>教学实验室</span>
            <span>备课 · 批改 · 分析 · 优化</span>
          </div>
          <div class="hero-metric-strip">
            <article v-for="item in heroFeatureCards" :key="item.label" class="hero-metric-card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.note }}</small>
            </article>
          </div>
        </div>
      </div>

      <div class="workspace-hero__side">
        <div class="hero-side-card hero-side-card--primary">
          <span class="hero-side-card__eyebrow">AI教学引擎</span>
          <div class="hero-side-card__title-row">
            <strong>教学工作流</strong>
            <em>{{ activeTab === 'lesson' ? '备课中枢' : '评价中枢' }}</em>
          </div>
          <p>围绕目标理解、教案生成、Rubric 评分、学情分析与教学优化，形成面向教师的智能教学闭环。</p>
          <div class="hero-workflow-list" aria-label="AI教学引擎工作流">
            <div v-for="(step, index) in heroWorkflowSteps" :key="step" class="hero-workflow-step">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <strong>{{ step }}</strong>
            </div>
          </div>
          <div class="hero-side-card__status">
            <span>当前状态</span>
            <strong>{{ activeTab === 'lesson' ? lessonStatusText : gradingStatusText }}</strong>
          </div>
        </div>
      </div>
    </header>

    <section class="workspace-card overview-band">
      <div class="overview-band__header">
        <div>
          <span class="overview-band__eyebrow">教学智能看板</span>
          <h2>教师智能教学助手运行概览</h2>
        </div>
        <p>围绕备课效率、批改任务、评分可信度与薄弱知识点发现，呈现当前工作台的教学智能数据。</p>
      </div>
      <div class="overview-band__grid">
        <article v-for="item in teachingOverviewStats" :key="item.label" class="overview-stat-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.note }}</small>
        </article>
      </div>
    </section>

    <el-tabs v-model="activeTab" class="assistant-tabs">
      <el-tab-pane name="lesson">
        <template #label>
          <span class="tab-switch-card">
            <span class="tab-switch-card__icon"><Document /></span>
            <span class="tab-switch-card__copy">
              <strong>智能备课</strong>
              <small>教学目标 · 流程 · 练习题</small>
            </span>
          </span>
        </template>

        <div class="assistant-workspace">
          <section class="workspace-card input-panel">
            <div class="panel-heading panel-heading--stack">
              <div class="panel-heading__main">
                <span class="panel-index">01</span>
                <div>
                  <h2>备课参数配置</h2>
                  <p>围绕课程主题、目标与课堂要求，生成更清晰的教案结构。</p>
                </div>
              </div>
              <el-tooltip content="清空表单" placement="bottom">
                <el-button circle aria-label="清空备课表单" :disabled="lessonLoading" @click="clearLessonForm">
                  <el-icon><RefreshLeft /></el-icon>
                </el-button>
              </el-tooltip>
            </div>

            <section class="ability-band ability-band--lesson">
              <div class="ability-band__intro">
                <span class="ability-band__eyebrow">AI能力说明</span>
                <h3>教师备课引擎将课堂目标拆解为可执行教案</h3>
                <p>围绕目标、流程和评价资源形成生成链路，让备课更清晰、更可复用。</p>
              </div>
              <div class="ability-band__grid">
                <article v-for="(item, index) in lessonCapabilitySteps" :key="item.title" class="ability-band__card">
                  <span>{{ String(index + 1).padStart(2, '0') }}</span>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.description }}</p>
                </article>
              </div>
            </section>

            <el-form
              ref="lessonFormRef"
              :model="lessonForm"
              :rules="lessonRules"
              label-position="top"
              class="assistant-form lesson-form"
            >
              <section class="form-block form-span-full">
                <div class="form-block__header">
                  <span class="block-step">01</span>
                  <div>
                    <h3>基础信息</h3>
                    <p>先设置课程、题目与授课范围，帮助 AI 快速理解教学背景。</p>
                  </div>
                </div>
                <div class="form-block__grid">
                  <el-form-item label="关联课程" prop="courseId">
                    <el-select
                      v-model="lessonForm.courseId"
                      clearable
                      filterable
                      :loading="courseLoading"
                      placeholder="可选：从已有课程中带入背景"
                      class="full-width"
                    >
                      <el-option
                        v-for="course in courseOptions"
                        :key="course.value"
                        :label="course.label"
                        :value="course.value"
                      />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="课题名称" prop="topic">
                    <el-input v-model="lessonForm.topic" maxlength="200" placeholder="例如：线性回归的基本原理" />
                  </el-form-item>

                  <el-form-item label="学段" prop="grade">
                    <el-select
                      v-model="lessonForm.grade"
                      filterable
                      allow-create
                      default-first-option
                      class="full-width"
                      placeholder="选择或输入学段"
                    >
                      <el-option label="小学" value="小学" />
                      <el-option label="初中" value="初中" />
                      <el-option label="高中" value="高中" />
                      <el-option label="大学" value="大学" />
                      <el-option label="研一" value="研一" />
                      <el-option label="研二" value="研二" />
                    </el-select>
                  </el-form-item>

                  <el-form-item label="课时分钟数" prop="durationMinutes">
                    <el-input-number
                      v-model="lessonForm.durationMinutes"
                      :min="20"
                      :max="240"
                      :step="5"
                      controls-position="right"
                      class="full-width"
                    />
                  </el-form-item>
                </div>
              </section>

              <section class="form-block form-span-full">
                <div class="form-block__header">
                  <span class="block-step">02</span>
                  <div>
                    <h3>教学设计</h3>
                    <p>补充教学目标与难度偏好，帮助 AI 生成更适配课堂节奏的方案。</p>
                  </div>
                </div>
                <div class="form-block__grid">
                  <el-form-item label="教学目标" prop="objectives" class="form-span-full">
                    <el-input
                      v-model="lessonForm.objectives"
                      type="textarea"
                      :rows="4"
                      maxlength="2000"
                      show-word-limit
                      placeholder="建议按条目输入，例如：理解概念、掌握方法、能够迁移应用"
                    />
                  </el-form-item>

                  <el-form-item label="难度" prop="difficulty" class="form-span-full">
                    <el-segmented
                      v-model="lessonForm.difficulty"
                      :options="['基础', '进阶', '高阶']"
                      class="difficulty-control"
                    />
                  </el-form-item>
                </div>
              </section>

              <section class="form-block form-span-full">
                <div class="form-block__header">
                  <span class="block-step">03</span>
                  <div>
                    <h3>补充要求</h3>
                    <p>可补充课堂形式、资源限制或希望强调的教学风格。</p>
                  </div>
                </div>
                <div class="form-block__grid">
                  <el-form-item label="补充要求" prop="requirements" class="form-span-full">
                    <el-input
                      v-model="lessonForm.requirements"
                      type="textarea"
                      :rows="3"
                      maxlength="2000"
                      show-word-limit
                      placeholder="例如：希望加入讨论活动、实验案例或板书提示"
                    />
                  </el-form-item>
                </div>
              </section>

              <div class="form-actions form-span-full">
                <el-button :disabled="lessonLoading" @click="clearLessonForm">
                  <el-icon><RefreshLeft /></el-icon>
                  清空
                </el-button>
                <el-button type="primary" :loading="lessonLoading" @click="submitLessonPlan">
                  <el-icon><MagicStick /></el-icon>
                  生成教案
                </el-button>
              </div>
            </el-form>
          </section>

          <section class="workspace-card result-panel" aria-live="polite">
            <div class="panel-heading result-heading">
              <div class="panel-heading__main">
                <span class="panel-index">02</span>
                <div>
                  <h2>备课结果</h2>
                  <p>以模块化卡片展示教案结构，便于快速浏览与二次调整。</p>
                </div>
              </div>
              <div class="generation-status" :class="{ 'is-loading': lessonLoading, 'is-ready': lessonResultReady }">
                <span class="status-dot"></span>
                {{ lessonStatusText }}
              </div>
              <el-button
                :icon="CopyDocument"
                :disabled="!lessonResultReady || lessonLoading"
                @click="copyResult(lessonResult, '教案结果已复制')"
              >
                复制结果
              </el-button>
            </div>

            <div v-if="lessonLoading && !lessonResultReady" class="result-state result-state--loading">
              <div class="loading-badge">AI 正在生成教学方案</div>
              <div class="state-orb state-orb--loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <h3>AI 正在组织教案结构与课堂节奏</h3>
              <p>系统会先理解教学背景，再生成流程、活动、练习与评价内容，输出更完整的教学方案。</p>
              <div class="loading-progress-bar" aria-hidden="true">
                <span></span>
              </div>
              <div class="loading-step-list loading-step-list--cards">
                <article
                  v-for="(item, index) in lessonLoadingStages"
                  :key="item.title"
                  class="loading-step-card"
                  :class="{ 'is-active': index === 0 }"
                >
                  <i>{{ String(index + 1).padStart(2, '0') }}</i>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.description }}</p>
                  </div>
                </article>
              </div>
            </div>

            <div v-if="!lessonLoading || lessonResultReady" class="structured-result lesson-result">
              <section class="result-hero-card lesson-result-hero">
                <div class="result-hero-card__header">
                  <div class="result-hero-card__copy">
                    <span class="result-hero-card__label">教案标题</span>
                    <h2>{{ lessonDisplayResult.title }}</h2>
                    <p>产品化教案摘要，便于教师快速浏览、二次编辑与课堂使用。</p>
                  </div>
                  <div class="result-hero-card__status">
                    <span>输出状态</span>
                    <strong>{{ lessonStatusText }}</strong>
                    <small>{{ lessonResultReady ? '结构化教案已生成' : '示例内容展示' }}</small>
                  </div>
                </div>
                <div class="result-meta-tags result-meta-tags--dense">
                  <span>{{ lessonForm.grade }}</span>
                  <span>{{ lessonForm.durationMinutes }} 分钟</span>
                  <span>{{ lessonForm.difficulty }}</span>
                  <span>模块 {{ lessonModuleCards.length }} 项</span>
                </div>
              </section>

              <section class="result-surface">
                <div class="surface-head">
                  <div>
                    <h3>教学核心模块</h3>
                    <p>优先呈现目标、重点与难点，支持教师快速扫读教案骨架。</p>
                  </div>
                </div>
                <div class="lesson-module-grid">
                  <article
                    v-for="(card, index) in lessonCoreCards"
                    :key="card.key"
                    class="lesson-module-card lesson-module-card--featured"
                  >
                    <div class="lesson-module-card__head">
                      <span class="lesson-module-card__index">{{ String(index + 1).padStart(2, '0') }}</span>
                      <div>
                        <h3>{{ card.title }}</h3>
                        <p>{{ card.description }}</p>
                      </div>
                    </div>
                    <ul v-if="card.items.length" class="bullet-list">
                      <li v-for="(item, itemIndex) in card.items" :key="`${card.key}-${itemIndex}`">{{ item }}</li>
                    </ul>
                    <p v-else class="card-empty-text">当前结果中暂无该模块内容。</p>
                  </article>
                </div>
              </section>

              <section class="result-surface">
                <div class="surface-head">
                  <div>
                    <h3>补充模块</h3>
                    <p>补足教学准备与教学提醒，形成完整教案闭环。</p>
                  </div>
                </div>
                <div class="lesson-module-grid lesson-module-grid--secondary">
                  <article
                    v-for="(card, index) in lessonSupplementCards"
                    :key="card.key"
                    class="lesson-module-card"
                  >
                    <div class="lesson-module-card__head">
                      <span class="lesson-module-card__index lesson-module-card__index--soft">
                        {{ String(lessonCoreCards.length + index + 1).padStart(2, '0') }}
                      </span>
                      <div>
                        <h3>{{ card.title }}</h3>
                        <p>{{ card.description }}</p>
                      </div>
                    </div>
                    <ul v-if="card.items.length" class="bullet-list">
                      <li v-for="(item, itemIndex) in card.items" :key="`${card.key}-${itemIndex}`">{{ item }}</li>
                    </ul>
                    <p v-else class="card-empty-text">当前结果中暂无该模块内容。</p>
                  </article>
                </div>
              </section>

              <section class="result-surface timeline-surface">
                <div class="surface-head">
                  <div>
                    <h3>教学时间轴</h3>
                    <p>按课堂推进顺序组织阶段、时间、活动与教学目的。</p>
                  </div>
                </div>
                <div v-if="lessonTeachingSteps.length" class="timeline-list">
                  <article
                    v-for="(step, index) in lessonTeachingSteps"
                    :key="`${step.stage}-${index}`"
                    class="timeline-item"
                  >
                    <div class="timeline-marker">
                      <span class="timeline-marker__index">{{ String(index + 1).padStart(2, '0') }}</span>
                      <span
                        v-if="index !== lessonTeachingSteps.length - 1"
                        class="timeline-marker__line"
                        aria-hidden="true"
                      ></span>
                    </div>
                    <div class="timeline-card">
                      <div class="timeline-card__top">
                        <div>
                          <span class="timeline-card__eyebrow">阶段 {{ index + 1 }}</span>
                          <h3>{{ step.stage }}</h3>
                        </div>
                        <span class="timeline-time-pill">{{ formatScore(step.durationMinutes) }} 分钟</span>
                      </div>
                      <div class="timeline-card__grid">
                        <article class="timeline-card__panel">
                          <span>教师活动</span>
                          <p>{{ step.teacherActivity }}</p>
                        </article>
                        <article class="timeline-card__panel">
                          <span>学生活动</span>
                          <p>{{ step.studentActivity }}</p>
                        </article>
                        <article class="timeline-card__panel timeline-card__panel--wide">
                          <span>教学目的</span>
                          <p>{{ step.purpose }}</p>
                        </article>
                      </div>
                    </div>
                  </article>
                </div>
                <p v-else class="card-empty-text">暂无教学流程。</p>
              </section>

              <section class="result-surface">
                <div class="surface-head">
                  <div>
                    <h3>题目卡片</h3>
                    <p>将练习题整理为可直接用于课堂练习的卡片化内容。</p>
                  </div>
                </div>
                <div v-if="lessonExercises.length" class="exercise-card-grid">
                  <article
                    v-for="(exercise, index) in lessonExercises"
                    :key="`${exercise.question}-${index}`"
                    class="exercise-card exercise-card--question"
                  >
                    <div class="exercise-card__head">
                      <div class="exercise-card__title">
                        <span class="exercise-card__index">题目 {{ index + 1 }}</span>
                        <p class="exercise-card__question">{{ exercise.question }}</p>
                      </div>
                      <div class="inline-tags exercise-card__tags">
                        <el-tag v-if="exercise.type" size="small" effect="plain">{{ exercise.type }}</el-tag>
                        <el-tag v-if="exercise.difficulty" size="small" type="warning" effect="plain">
                          {{ exercise.difficulty }}
                        </el-tag>
                      </div>
                    </div>
                    <div class="answer-block answer-block--product">
                      <span>参考答案</span>
                      <p>{{ exercise.referenceAnswer }}</p>
                    </div>
                  </article>
                </div>
                <p v-else class="card-empty-text">暂无练习题内容。</p>
              </section>

              <section class="result-surface">
                <div class="surface-head">
                  <div>
                    <h3>Rubric 评分维度</h3>
                    <p>将评分标准整理成维度卡片，便于课堂展示与复核。</p>
                  </div>
                </div>
                <div v-if="lessonRubric.length" class="rubric-card-grid rubric-card-grid--product">
                  <article
                    v-for="(item, index) in lessonRubric"
                    :key="`${item.criterion}-${index}`"
                    class="rubric-card rubric-card--product"
                  >
                    <div class="rubric-card__head">
                      <div>
                        <span class="rubric-card__index">{{ String(index + 1).padStart(2, '0') }}</span>
                        <strong>{{ item.criterion }}</strong>
                      </div>
                      <span>{{ formatScore(item.maxScore) }} 分</span>
                    </div>
                    <p>{{ item.description }}</p>
                  </article>
                </div>
                <p v-else class="card-empty-text">暂无 Rubric 评分内容。</p>
              </section>
            </div>

          </section>
        </div>
      </el-tab-pane>

      <el-tab-pane name="grading">
        <template #label>
          <span class="tab-switch-card">
            <span class="tab-switch-card__icon"><EditPen /></span>
            <span class="tab-switch-card__copy">
              <strong>智能批改</strong>
              <small>评分卡 · 扣分原因 · 修改建议</small>
            </span>
          </span>
        </template>

        <div class="assistant-workspace grading-workspace">
          <section class="workspace-card input-panel grading-input-panel">
            <div class="panel-heading panel-heading--stack">
              <div class="panel-heading__main">
                <span class="panel-index">01</span>
                <div>
                  <h2>批改参数配置</h2>
                  <p>按题目、Rubric 和学生答案生成更具报告感的智能批改结果。</p>
                </div>
              </div>
              <el-tooltip content="清空表单" placement="bottom">
                <el-button circle aria-label="清空批改表单" :disabled="gradingLoading" @click="clearGradingForm">
                  <el-icon><RefreshLeft /></el-icon>
                </el-button>
              </el-tooltip>
            </div>

            <section class="ability-band ability-band--grading">
              <div class="ability-band__intro">
                <span class="ability-band__eyebrow">AI能力说明</span>
                <h3>作业评测引擎围绕 Rubric 构建智能评分报告</h3>
                <p>从答案理解到知识定位再到建议生成，帮助教师快速完成评价闭环。</p>
              </div>
              <div class="ability-band__grid">
                <article v-for="(item, index) in gradingCapabilitySteps" :key="item.title" class="ability-band__card">
                  <span>{{ String(index + 1).padStart(2, '0') }}</span>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.description }}</p>
                </article>
              </div>
            </section>

            <section class="grading-entry-card">
              <div class="grading-entry-card__copy">
                <span class="grading-entry-card__eyebrow">AI作业智能评测中心</span>
                <h3>教师输入学生答案即可进行智能批改</h3>
                <p>支持客观题自动判分、代码题专项分析与简答题 Rubric 评价。</p>
              </div>
              <div class="grading-entry-card__actions">
                <span v-for="item in gradingEntryHints" :key="item" class="grading-entry-pill">{{ item }}</span>
              </div>
            </section>

            <el-form
              ref="gradingFormRef"
              :model="gradingForm"
              :rules="gradingRules"
              label-position="top"
              class="assistant-form grading-form"
            >
              <section class="form-block form-span-full">
                <div class="form-block__header">
                  <span class="block-step">01</span>
                  <div>
                    <h3>题目信息</h3>
                    <p>输入题干、题型与总分，让 AI 建立评分上下文。</p>
                  </div>
                </div>
                <div class="form-block__grid">
                  <el-form-item label="题目" prop="question" class="form-span-full">
                    <el-input
                      v-model="gradingForm.question"
                      type="textarea"
                      :rows="3"
                      maxlength="3000"
                      show-word-limit
                      placeholder="输入待批改题目"
                    />
                  </el-form-item>

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

              <section class="form-block form-span-full">
                <div class="form-block__header">
                  <span class="block-step">02</span>
                  <div>
                    <h3>评分标准</h3>
                    <p>按 Rubric 拆分评分维度，让结果更透明、更适合教学评价。</p>
                  </div>
                </div>
                <div class="form-block__grid">
                  <el-form-item label="评分标准" prop="rubric" class="form-span-full rubric-form-item">
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
                          @input="validateRubricField"
                        />
                        <el-input
                          v-model="item.description"
                          :aria-label="`评分说明 ${index + 1}`"
                          maxlength="500"
                          placeholder="评分说明"
                          @input="validateRubricField"
                        />
                        <el-input-number
                          v-model="item.maxScore"
                          :aria-label="`评分分值 ${index + 1}`"
                          :min="0.1"
                          :max="1000"
                          :precision="1"
                          :step="0.1"
                          controls-position="right"
                          @change="validateRubricField"
                        />
                        <el-tooltip content="删除评分维度" placement="top">
                          <el-button
                            circle
                            type="danger"
                            plain
                            :aria-label="`删除评分维度 ${index + 1}`"
                            @click="removeRubricItem(index)"
                          >
                            <el-icon><Delete /></el-icon>
                          </el-button>
                        </el-tooltip>
                      </div>
                      <el-button class="add-rubric-button" :icon="Plus" plain @click="addRubricItem">
                        添加评分维度
                      </el-button>
                    </div>
                  </el-form-item>
                </div>
              </section>
              <section class="form-block form-span-full">
                <div class="form-block__header">
                  <span class="block-step">03</span>
                  <div>
                    <h3>学生答案</h3>
                    <p>输入学生提交内容，AI 将结合 Rubric 输出评分报告与修改建议。</p>
                  </div>
                </div>
                <div class="form-block__grid">
                  <el-form-item label="学生答案" prop="studentAnswer" class="form-span-full">
                    <el-input
                      v-model="gradingForm.studentAnswer"
                      type="textarea"
                      :rows="6"
                      maxlength="5000"
                      show-word-limit
                      placeholder="输入学生提交的答案"
                    />
                  </el-form-item>
                </div>
              </section>

              <div class="form-actions form-span-full">
                <el-button :disabled="gradingLoading" @click="clearGradingForm">
                  <el-icon><RefreshLeft /></el-icon>
                  清空
                </el-button>
                <el-button type="primary" :loading="gradingLoading" @click="submitGrading">
                  <el-icon><MagicStick /></el-icon>
                  开始批改
                </el-button>
              </div>
            </el-form>
          </section>

          <section class="workspace-card result-panel" aria-live="polite">
            <div class="panel-heading result-heading">
              <div class="panel-heading__main">
                <span class="panel-index">02</span>
                <div>
                  <h2>AI作业智能评测中心</h2>
                  <p>以流程化评测、评分卡与教学洞察输出更具产品感的智能批改报告。</p>
                </div>
              </div>
              <div class="generation-status grading-status" :class="{ 'is-loading': gradingLoading, 'is-ready': gradingResultReady }">
                <span class="status-dot"></span>
                {{ gradingStatusText }}
              </div>
              <el-button
                :icon="CopyDocument"
                :disabled="!gradingResultReady || gradingLoading"
                @click="copyResult(gradingResult, '批改结果已复制')"
              >
                复制结果
              </el-button>
            </div>

            <div v-if="gradingLoading && !gradingResultReady" class="result-state result-state--loading">
              <div class="loading-badge">AI 深度分析中</div>
              <div class="state-orb state-orb--loading">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <h3>AI正在对照 Rubric 拆解评分依据</h3>
              <p>系统会依次理解题目、核对评分标准，并整理出分项得分、扣分原因与修改建议。</p>
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

            <div v-if="!gradingLoading || gradingResultReady" class="structured-result grading-result">
              <section class="result-hero-card grading-center-hero">
                <div class="result-hero-card__header grading-center-hero__header">
                  <div class="result-hero-card__copy">
                    <span class="result-hero-card__label">AI作业智能评测中心</span>
                    <h2>{{ gradingDisplayResult.title }}</h2>
                    <p>围绕学生答案、Rubric 评分与反馈建议，输出面向教师评价与教学优化的结构化结果。</p>
                  </div>
                  <div class="result-hero-card__status">
                    <span>输出状态</span>
                    <strong>{{ gradingStatusText }}</strong>
                    <small>{{ gradingResultReady ? '评测报告已生成' : '示例内容展示' }}</small>
                  </div>
                </div>
                <div class="grading-workflow-band">
                  <div class="grading-workflow-band__header">
                    <div>
                      <span class="grading-workflow-band__eyebrow">批改流程</span>
                      <h3>AI作业评测工作流</h3>
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
                    <h3>批改案例卡</h3>
                    <p>展示教师输入学生答案即可进行智能批改的完整示例。</p>
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
                    <h3>AI作业智能评测中心</h3>
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
                    <span>AI可信度</span>
                    <strong>{{ confidencePercent }}%</strong>
                  </div>
                  <el-progress :percentage="confidencePercent" :stroke-width="10" :show-text="false" color="#1d4ed8" />
                  <small>结合答案匹配与 Rubric 评估生成</small>
                </article>
              </section>

              <section class="result-surface insight-surface">
                <div class="surface-head">
                  <div>
                    <h3>AI教学洞察</h3>
                    <p>将本次批改结果转化为可执行的教学观察与下一步优化建议。</p>
                  </div>
                </div>
                <div class="insight-grid">
                  <article class="insight-card insight-card--issue">
                    <div class="insight-card__head">
                      <span>问题发现</span>
                      <h4>本次批改发现的问题</h4>
                    </div>
                    <ul class="bullet-list">
                      <li v-for="item in gradingInsightIssues" :key="item.title">
                        <strong>{{ item.title }}：</strong>{{ item.content }}
                      </li>
                    </ul>
                  </article>

                  <article class="insight-card insight-card--suggestion">
                    <div class="insight-card__head">
                      <span>教学建议</span>
                      <h4>生成教学优化建议</h4>
                    </div>
                    <div class="insight-recommend-list">
                      <article
                        v-for="item in gradingTeachingInsights"
                        :key="item.title"
                        class="insight-recommend-card"
                      >
                        <strong>{{ item.title }}</strong>
                        <p>{{ item.content }}</p>
                      </article>
                    </div>
                  </article>
                </div>
              </section>

              <section class="result-surface">
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

          </section>
        </div>
      </el-tab-pane>
    </el-tabs>

    <section class="workspace-card teaching-loop-band">
      <div class="teaching-loop-band__header">
        <div>
          <span class="teaching-loop-band__eyebrow">AI教学闭环</span>
          <h2>教师智能教学助手运行闭环</h2>
        </div>
        <p>从备课生成到教学优化，持续回流课堂数据与作业反馈，形成稳定的产品工作流。</p>
      </div>
      <div class="teaching-loop-flow">
        <template v-for="(item, index) in teachingLoopSteps" :key="item.title">
          <article class="teaching-loop-step">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <strong>{{ item.title }}</strong>
              <p>{{ item.description }}</p>
            </div>
          </article>
          <div v-if="index !== teachingLoopSteps.length - 1" class="teaching-loop-connector" aria-hidden="true">
            <i></i>
            <span>↓</span>
            <i></i>
          </div>
        </template>
      </div>
    </section>
  </main>
</template>

<style scoped>
.ai-assistant-page {
  --brand: #2563eb;
  --brand-strong: #1d4ed8;
  --brand-soft: #eff6ff;
  --brand-line: #dbeafe;
  --text-primary: #122033;
  --text-secondary: #53657d;
  --text-muted: #7a8aa0;
  --border-soft: #e3ebf5;
  --surface: #ffffff;
  min-height: 100%;
  padding: 28px 30px 42px;
  background: #f5f7fa;
  color: var(--text-primary);
}

.workspace-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(260px, 0.8fr);
  gap: 18px;
  margin-bottom: 20px;
  padding: 21px 22px;
  overflow: hidden;
  border: 1px solid #e1e6ed;
  border-radius: 8px;
  background:
    linear-gradient(135deg, rgb(248 251 255 / 96%), rgb(255 255 255 / 98%)),
    #ffffff;
  box-shadow: 0 10px 24px rgb(31 55 88 / 6%);
}

.workspace-hero::before,
.workspace-hero::after {
  position: absolute;
  border-radius: 999px;
  content: '';
}

.workspace-hero::before {
  top: -80px;
  right: -40px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgb(37 99 235 / 14%), rgb(37 99 235 / 0%) 68%);
}

.workspace-hero::after {
  bottom: -90px;
  left: 56%;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgb(96 165 250 / 14%), rgb(96 165 250 / 0%) 70%);
}

.workspace-hero__main,
.workspace-hero__side {
  position: relative;
  z-index: 1;
}

.workspace-hero__main {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 14px;
  align-items: flex-start;
}

.hero-icon-shell {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  place-items: center;
  border-radius: 8px;
  background: linear-gradient(135deg, #edf5ff, #dbeafe);
  color: #2468d8;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 72%);
}

.hero-icon-shell :deep(svg) {
  width: 22px;
  height: 22px;
}

.hero-copy h1 {
  margin: 6px 0 8px;
  font-size: 26px;
  line-height: 1.2;
  letter-spacing: 0;
}

.hero-copy p {
  max-width: 720px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.6;
}

.hero-copy {
  min-width: 0;
}

.hero-meta-row,
.hero-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.hero-kicker {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgb(37 99 235 / 8%);
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.12em;
}

.hero-state-pill,
.hero-chip {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid #e3e8ef;
  border-radius: 999px;
  background: #ffffff;
  color: #30445f;
  font-size: 12px;
  font-weight: 600;
}

.hero-chip-row {
  margin-top: 14px;
}

.hero-metric-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.hero-metric-card {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: rgb(255 255 255 / 72%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 88%);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.hero-metric-card:hover {
  transform: translateY(-1px);
  border-color: #d5e2f4;
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 88%),
    0 8px 18px rgb(24 45 82 / 8%);
}

.hero-metric-card span,
.hero-side-card__eyebrow {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.hero-metric-card strong {
  color: var(--text-primary);
  font-size: 17px;
  line-height: 1.25;
}

.hero-metric-card small,
.hero-mini-card small,
.hero-side-card p {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
}

.hero-chip :deep(svg) {
  width: 15px;
  height: 15px;
  color: var(--brand);
}

.workspace-hero__side {
  display: grid;
  gap: 14px;
  align-content: start;
}

.hero-side-card,
.hero-mini-card {
  padding: 16px 18px;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  background: rgb(255 255 255 / 84%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 84%);
}

.hero-side-card span,
.hero-mini-card span {
  display: block;
  color: var(--text-muted);
  font-size: 12px;
}

.hero-side-card strong,
.hero-mini-card strong {
  display: block;
  margin-top: 6px;
  font-size: 18px;
  line-height: 1.2;
}

.hero-side-card--primary {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-color: #dbe6f6;
  background: linear-gradient(180deg, rgb(255 255 255 / 94%), rgb(246 250 255 / 92%));
}

.hero-side-card__title-row {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.hero-side-card__title-row strong {
  margin-top: 0;
  font-size: 20px;
}

.hero-side-card__title-row em {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgb(37 99 235 / 10%);
  color: var(--brand-strong);
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}

.hero-side-card p {
  margin: 0;
}

.hero-side-card__status {
  display: grid;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid #e9eef5;
}

.hero-side-card__status span {
  font-size: 12px;
}

.hero-side-card__status strong {
  margin-top: 0;
  font-size: 15px;
  line-height: 1.5;
}

.hero-workflow-list {
  display: grid;
  gap: 10px;
}

.hero-workflow-step {
  position: relative;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e5ebf4;
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.hero-workflow-step:hover {
  transform: translateY(-1px);
  border-color: #d5e2f4;
  box-shadow: 0 8px 18px rgb(24 45 82 / 7%);
}

.hero-workflow-step:not(:last-child)::after {
  position: absolute;
  left: 28px;
  top: calc(100% + 2px);
  width: 1px;
  height: 10px;
  background: #d7e3f6;
  content: '';
}

.hero-workflow-step span {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #edf5ff;
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 700;
}

.hero-workflow-step strong {
  margin-top: 0;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.4;
}

.hero-mini-card {
  display: grid;
  gap: 6px;
}

.hero-mini-card strong {
  margin-top: 0;
  font-size: 15px;
  line-height: 1.45;
}

.hero-side-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.overview-band {
  margin-bottom: 18px;
  padding: 22px 24px;
}

.overview-band__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.overview-band__eyebrow {
  display: inline-block;
  margin-bottom: 6px;
  color: #2c69bd;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.overview-band__header h2 {
  margin: 0;
  color: #172033;
  font-size: 18px;
  line-height: 1.25;
}

.overview-band__header p {
  max-width: 360px;
  margin: 0;
  color: #768195;
  font-size: 13px;
  line-height: 1.65;
}

.overview-band__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.overview-stat-card {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 16px 18px;
  border: 1px solid #e5ebf4;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.overview-stat-card:hover {
  transform: translateY(-1px);
  border-color: #d3e0f5;
  box-shadow: 0 8px 18px rgb(24 45 82 / 8%);
}

.overview-stat-card span {
  color: #7b8798;
  font-size: 12px;
  font-weight: 600;
}

.overview-stat-card strong {
  overflow: hidden;
  color: #172033;
  font-size: 22px;
  font-weight: 720;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overview-stat-card small {
  color: #617084;
  font-size: 12px;
  line-height: 1.5;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgb(34 197 94 / 12%);
}

.assistant-tabs {
  --el-tabs-header-height: auto;
}

.assistant-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
}

.assistant-tabs :deep(.el-tabs__nav-wrap::after),
.assistant-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.assistant-tabs :deep(.el-tabs__nav-wrap) {
  overflow: visible;
}

.assistant-tabs :deep(.el-tabs__nav-scroll) {
  overflow: visible;
}

.assistant-tabs :deep(.el-tabs__nav) {
  display: flex;
  gap: 14px;
  border: 0;
}

.assistant-tabs :deep(.el-tabs__item) {
  height: auto;
  padding: 0;
  border: 0;
}

.tab-switch-card {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 270px;
  padding: 14px 16px;
  border: 1px solid #e1e6ed;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgb(32 63 110 / 4%);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background-color 160ms ease;
}

.assistant-tabs :deep(.el-tabs__item:hover .tab-switch-card) {
  transform: translateY(-1px);
  border-color: #c7d5ea;
  box-shadow: 0 6px 16px rgb(32 63 110 / 8%);
}

.assistant-tabs :deep(.el-tabs__item.is-active .tab-switch-card) {
  border-color: #cfe0fa;
  background: #edf5ff;
  box-shadow: 0 8px 18px rgb(37 99 235 / 10%);
}

.assistant-tabs :deep(.el-tabs__item.is-active .tab-switch-card__icon) {
  background: #2468d8;
  color: #ffffff;
}

.assistant-tabs :deep(.el-tabs__item.is-active .tab-switch-card__copy strong) {
  color: #1f63c4;
}

.tab-switch-card__icon {
  display: grid;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  place-items: center;
  border-radius: 8px;
  background: #edf5ff;
  color: var(--brand);
}

.tab-switch-card__icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.tab-switch-card__copy {
  display: grid;
  gap: 4px;
  min-width: 0;
  text-align: left;
}

.tab-switch-card__copy strong {
  color: var(--text-primary);
  font-size: 15px;
  font-weight: 700;
}

.tab-switch-card__copy small {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
}

.assistant-workspace,
.grading-workspace {
  display: grid;
  grid-template-columns: minmax(320px, 0.84fr) minmax(0, 1.26fr);
  gap: 22px;
  align-items: start;
}

.workspace-card {
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: 0 6px 18px rgb(31 55 88 / 5%);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.workspace-card:hover {
  transform: translateY(-1px);
  border-color: #d6dee9;
  box-shadow: 0 10px 22px rgb(31 55 88 / 7%);
}

.ability-band {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
  padding: 18px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: linear-gradient(180deg, #fbfdff, #f7fbff);
}

.grading-entry-card {
  display: grid;
  gap: 14px;
  margin-bottom: 18px;
  padding: 18px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
}

.grading-entry-card__copy {
  display: grid;
  gap: 8px;
}

.grading-entry-card__eyebrow,
.result-preview-card__head span {
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.grading-entry-card__copy h3,
.result-preview-card__head strong {
  margin: 0;
  color: var(--text-primary);
  font-size: 18px;
  line-height: 1.35;
}

.grading-entry-card__copy p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.65;
}

.grading-entry-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.grading-entry-pill {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #dce8fb;
  border-radius: 999px;
  background: #ffffff;
  color: #355171;
  font-size: 13px;
  font-weight: 650;
}

.ability-band__intro {
  display: grid;
  gap: 8px;
}

.ability-band__eyebrow,
.teaching-loop-band__eyebrow {
  display: inline-block;
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.ability-band__intro h3,
.teaching-loop-band__header h2 {
  margin: 0;
  color: var(--text-primary);
  line-height: 1.35;
}

.ability-band__intro h3 {
  font-size: 18px;
}

.ability-band__intro p,
.teaching-loop-band__header p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.65;
}

.ability-band__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.ability-band__card {
  display: grid;
  gap: 8px;
  min-width: 0;
  padding: 16px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: #ffffff;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.ability-band__card:hover {
  transform: translateY(-1px);
  border-color: #d4deeb;
  box-shadow: 0 8px 18px rgb(24 45 82 / 8%);
}

.ability-band__card span,
.teaching-loop-step span {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #edf5ff;
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 800;
}

.ability-band__card strong,
.teaching-loop-step strong {
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.45;
}

.ability-band__card p,
.teaching-loop-step p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.teaching-loop-band {
  margin-top: 20px;
  padding: 22px 24px;
}

.teaching-loop-band__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.teaching-loop-band__header h2 {
  font-size: 20px;
}

.teaching-loop-band__header p {
  max-width: 360px;
}

.teaching-loop-flow {
  display: grid;
  gap: 12px;
}

.teaching-loop-step {
  position: relative;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  min-width: 0;
  padding: 16px 18px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f9fbff);
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.teaching-loop-step:hover {
  transform: translateY(-1px);
  border-color: #d4deeb;
  box-shadow: 0 8px 18px rgb(24 45 82 / 8%);
}

.teaching-loop-step span {
  margin-top: 2px;
}

.teaching-loop-step p {
  margin-top: 6px;
}

.teaching-loop-connector {
  display: grid;
  justify-items: center;
  gap: 6px;
  margin: -2px 0;
}

.teaching-loop-connector i {
  width: 1px;
  height: 12px;
  background: #d9e5f6;
}

.teaching-loop-connector span {
  color: #90a4bf;
  font-size: 12px;
  font-weight: 700;
}

.input-panel,
.result-panel {
  padding: 24px;
}

.result-panel {
  min-height: 720px;
}

.panel-heading {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid #edf0f4;
}

.panel-heading--stack {
  align-items: flex-start;
}

.panel-heading__main {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  min-width: 0;
}

.panel-heading__main h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.panel-heading__main p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.panel-index,
.block-step {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #edf5ff;
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 0.04em;
}

.assistant-form {
  display: grid;
  gap: 16px;
}

.assistant-form :deep(.el-form-item) {
  min-width: 0;
  margin-bottom: 0;
}

.assistant-form :deep(.el-form-item__label) {
  color: #33465f;
  font-size: 13px;
  font-weight: 700;
}

.assistant-form :deep(.el-input__inner),
.assistant-form :deep(.el-textarea__inner) {
  font-size: 14px;
}

.assistant-form :deep(.el-input__wrapper),
.assistant-form :deep(.el-textarea__inner),
.assistant-form :deep(.el-select .el-input__wrapper),
.assistant-form :deep(.el-input-number) {
  border-radius: 7px;
}

.assistant-form :deep(.el-input__wrapper),
.assistant-form :deep(.el-select .el-input__wrapper),
.assistant-form :deep(.el-input-number),
.assistant-form :deep(.el-textarea__inner) {
  box-shadow: 0 0 0 1px #d8e3f2 inset;
  background: rgb(255 255 255 / 86%);
  transition: box-shadow 160ms ease, transform 160ms ease;
}

.assistant-form :deep(.el-input__wrapper:hover),
.assistant-form :deep(.el-select .el-input__wrapper:hover),
.assistant-form :deep(.el-input-number:hover),
.assistant-form :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #a9c3ed inset;
}
.assistant-form :deep(.el-input__wrapper.is-focus),
.assistant-form :deep(.el-select .el-input__wrapper.is-focus),
.assistant-form :deep(.el-input-number.is-focus),
.assistant-form :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #2563eb inset, 0 0 0 4px rgb(37 99 235 / 10%);
}

.form-block {
  display: grid;
  gap: 18px;
  padding: 20px;
  border: 1px solid #e7eef8;
  border-radius: 8px;
  background: #fbfcfe;
}

.form-block__header {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.form-block__header h3 {
  margin: 0;
  font-size: 16px;
}

.form-block__header p {
  margin: 7px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.form-block__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-span-full {
  grid-column: 1 / -1;
}

.full-width,
.difficulty-control {
  width: 100%;
}

.rubric-editor {
  display: grid;
  gap: 10px;
  width: 100%;
}

.rubric-labels,
.rubric-row {
  display: grid;
  grid-template-columns: minmax(140px, 0.9fr) minmax(220px, 1.6fr) 120px 40px;
  gap: 10px;
  align-items: center;
}

.rubric-labels {
  padding: 0 4px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.rubric-row {
  padding: 10px;
  border: 1px solid #e7eef8;
  border-radius: 8px;
  background: #ffffff;
}

.rubric-row :deep(.el-input-number) {
  width: 100%;
}

.add-rubric-button {
  width: 100%;
  min-height: 44px;
  margin-top: 4px;
  border-style: dashed;
  border-radius: 7px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.form-actions :deep(.el-button) {
  min-width: 116px;
  min-height: 42px;
  border-radius: 7px;
  font-weight: 650;
  transition: transform 160ms ease, box-shadow 160ms ease;
}

.form-actions :deep(.el-button:not(:disabled):hover) {
  transform: translateY(-1px);
}

.form-actions :deep(.el-button--primary:not(:disabled)) {
  box-shadow: 0 6px 14px rgb(37 99 235 / 16%);
}

.panel-heading :deep(.el-button.is-circle) {
  width: 36px;
  height: 36px;
  border-radius: 7px;
}

.result-heading :deep(.el-button) {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 7px;
  font-weight: 650;
}

.result-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 14px;
  align-items: center;
}

.generation-status {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  min-height: 36px;
  padding: 0 14px;
  border-radius: 999px;
  background: #f3f7fd;
  color: #5a6b81;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.generation-status .status-dot {
  width: 7px;
  height: 7px;
  flex-basis: 7px;
  box-shadow: none;
  background: #94a3b8;
}

.generation-status.is-loading {
  background: rgb(37 99 235 / 10%);
  color: var(--brand-strong);
}

.generation-status.is-loading .status-dot {
  background: var(--brand);
  box-shadow: 0 0 0 4px rgb(37 99 235 / 12%);
  animation: pulse 1.2s ease-in-out infinite;
}

.generation-status.is-ready {
  background: rgb(16 185 129 / 10%);
  color: #047857;
}

.generation-status.is-ready .status-dot {
  background: #10b981;
}

.structured-result {
  display: grid;
  gap: 18px;
}

.result-state {
  display: grid;
  justify-items: center;
  gap: 12px;
  min-height: 560px;
  padding: 42px 28px;
  border: 1px dashed #d6e5fb;
  border-radius: 8px;
  background: #f8fbff;
  text-align: center;
}

.result-state--lesson-flow {
  justify-items: stretch;
  gap: 16px;
  text-align: left;
}

.result-state__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.result-state__header > div {
  display: grid;
  gap: 8px;
}

.result-state__header h3 {
  margin: 0;
  font-size: 22px;
}

.result-state__pulse {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-top: 4px;
}

.result-state__pulse span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #cfe0fa;
  box-shadow: 0 0 0 4px rgb(37 99 235 / 10%);
}

.result-state__pulse span:nth-child(2) {
  background: var(--brand);
}

.loading-badge--static {
  background: rgb(37 99 235 / 10%);
  color: var(--brand-strong);
}

.lesson-flow-card {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.lesson-flow-step {
  position: relative;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  padding: 14px 16px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
}

.lesson-flow-step:not(:last-child)::after {
  position: absolute;
  left: 28px;
  bottom: -10px;
  width: 1px;
  height: 10px;
  background: #d9e5f6;
  content: '';
}

.lesson-flow-step strong {
  display: block;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.45;
}

.lesson-flow-step p {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.result-preview-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
}

.result-preview-card__head {
  display: grid;
  gap: 6px;
}

.result-preview-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.result-preview-item {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: #ffffff;
}

.result-preview-item span {
  display: inline-flex;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #edf5ff;
  color: var(--brand-strong);
  font-size: 13px;
  font-weight: 800;
}

.result-preview-item strong {
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.45;
}

.grading-case-card {
  gap: 14px;
}

.grading-case-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.grading-case-panel {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: #ffffff;
}

.grading-case-panel span {
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 700;
}

.grading-case-panel p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.result-state h3 {
  margin: 0;
  font-size: 22px;
}

.result-state p {
  max-width: 420px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.8;
}

.result-state--loading {
  align-content: center;
  border-style: solid;
  border-color: #e2ecfa;
  background:
    radial-gradient(circle at top, rgb(37 99 235 / 7%), rgb(37 99 235 / 0%) 34%),
    linear-gradient(180deg, #f8fbff, #ffffff);
}

.state-orb {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, #ffffff, rgb(255 255 255 / 0%) 38%),
    linear-gradient(135deg, #2563eb, #93c5fd);
  box-shadow: 0 10px 24px rgb(37 99 235 / 18%);
}

.state-orb--loading {
  position: relative;
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  background:
    radial-gradient(circle at center, rgb(255 255 255 / 96%) 0 28%, rgb(255 255 255 / 0%) 29%),
    conic-gradient(from 180deg, rgb(37 99 235 / 18%), #2563eb, #93c5fd, rgb(37 99 235 / 18%));
  animation: spin 5.2s linear infinite;
}

.state-orb--loading span {
  position: absolute;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 0 5px rgb(37 99 235 / 10%);
}

.state-orb--loading span:nth-child(1) {
  top: 8px;
}

.state-orb--loading span:nth-child(2) {
  right: 10px;
  bottom: 16px;
}

.state-orb--loading span:nth-child(3) {
  left: 10px;
  bottom: 16px;
}

.state-orb--idle {
  background:
    radial-gradient(circle at 35% 30%, #ffffff, rgb(255 255 255 / 0%) 38%),
    linear-gradient(135deg, #c7d8f8, #93c5fd);
}

.loading-step-list {
  display: grid;
  gap: 10px;
  width: min(100%, 640px);
  margin-top: 8px;
}

.loading-step-list span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid #d8e5fb;
  border-radius: 999px;
  background: #ffffff;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.loading-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgb(37 99 235 / 10%);
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.loading-progress-bar {
  position: relative;
  width: min(100%, 420px);
  height: 10px;
  overflow: hidden;
  border-radius: 999px;
  background: #e7eef9;
}

.loading-progress-bar span {
  position: absolute;
  inset: 0;
  width: 40%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb, #60a5fa);
  box-shadow: 0 4px 12px rgb(37 99 235 / 18%);
  animation: loading-slide 1.8s ease-in-out infinite;
}

.loading-step-list--cards {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.loading-step-card {
  display: grid;
  gap: 10px;
  min-height: 132px;
  padding: 16px;
  border: 1px solid #dfe9f7;
  border-radius: 8px;
  background: rgb(255 255 255 / 86%);
  text-align: left;
  box-shadow: 0 6px 18px rgb(31 55 88 / 4%);
}

.loading-step-card.is-active {
  border-color: #bfd4fa;
  background: linear-gradient(180deg, #ffffff, #eef5ff);
  box-shadow: 0 10px 22px rgb(37 99 235 / 10%);
}

.loading-step-card i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: #edf5ff;
  color: var(--brand-strong);
  font-size: 12px;
  font-style: normal;
  font-weight: 800;
}

.loading-step-card strong {
  display: block;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.4;
}

.loading-step-card p {
  margin-top: 6px;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
}

.state-hint-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  margin-top: 4px;
}

.state-hint-row--compact {
  justify-content: flex-start;
  margin-top: 0;
}

.state-hint-row span {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 14px;
  border: 1px solid #dce8fb;
  border-radius: 999px;
  background: #ffffff;
  color: #4a5e79;
  font-size: 12px;
  font-weight: 700;
}

.lesson-result {
  gap: 16px;
}

.lesson-result-hero {
  display: grid;
  gap: 16px;
}

.result-hero-card__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.result-hero-card__copy {
  min-width: 0;
}

.result-hero-card__copy p {
  max-width: 700px;
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.result-hero-card__status {
  display: grid;
  gap: 6px;
  min-width: 180px;
  padding: 14px 16px;
  border: 1px solid #dbe6f6;
  border-radius: 8px;
  background: #f8fbff;
}

.result-hero-card__status span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.result-hero-card__status strong {
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.4;
}

.result-hero-card__status small {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.6;
}

.result-meta-tags--dense {
  margin-top: 0;
}

.lesson-module-grid {
  display: grid;
  gap: 16px;
}

.lesson-module-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.lesson-module-grid--secondary {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.lesson-module-card {
  display: grid;
  gap: 14px;
  padding: 20px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.lesson-module-card--featured {
  border-color: #d6e4fb;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.lesson-module-card:hover,
.lesson-module-card--featured:hover {
  transform: translateY(-1px);
  border-color: #c7d7f1;
  box-shadow: 0 10px 22px rgb(31 55 88 / 7%);
}

.lesson-module-card__head {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.lesson-module-card__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 38px;
  flex: 0 0 38px;
  border-radius: 8px;
  background: #edf5ff;
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 800;
}

.lesson-module-card__index--soft {
  background: #f3f7fd;
  color: #7c8ba1;
}

.lesson-module-card__head h3 {
  margin: 0;
  font-size: 16px;
  line-height: 1.35;
}

.lesson-module-card__head p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.lesson-module-card .bullet-list {
  gap: 8px;
  padding-left: 18px;
}

.timeline-list {
  display: grid;
  gap: 14px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
}

.timeline-marker {
  display: grid;
  justify-items: center;
  align-items: start;
  gap: 8px;
}

.timeline-marker__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: #edf5ff;
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 800;
}

.timeline-marker__line {
  width: 2px;
  flex: 1 1 auto;
  min-height: 84px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgb(37 99 235 / 35%), rgb(37 99 235 / 6%));
}

.timeline-card {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid #dbe6f6;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
}

.timeline-card__top {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.timeline-card__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgb(37 99 235 / 10%);
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.timeline-card__top h3 {
  margin: 8px 0 0;
  font-size: 17px;
  line-height: 1.35;
}

.timeline-time-pill {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #eef4ff;
  color: #3766c9;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.timeline-card__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.timeline-card__panel {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: #ffffff;
}

.timeline-card__panel--wide {
  grid-column: 1 / -1;
}

.timeline-card__panel span {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 700;
}

.timeline-card__panel p {
  margin: 0;
  color: #42556f;
  font-size: 14px;
  line-height: 1.75;
}

.exercise-card--question {
  gap: 16px;
}

.exercise-card__title {
  min-width: 0;
}

.exercise-card__index {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgb(37 99 235 / 10%);
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.exercise-card__question {
  margin-top: 10px;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.75;
}

.exercise-card__tags {
  align-items: flex-start;
  justify-content: flex-end;
}

.answer-block--product {
  gap: 10px;
  border: 1px solid #e3ebf5;
  background: #f7faff;
}

.answer-block--product p {
  color: #42556f;
  font-size: 14px;
  line-height: 1.75;
}

.rubric-card-grid--product {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.rubric-card--product {
  gap: 14px;
  padding: 20px;
  border-color: #dbe6f6;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.rubric-card__head {
  align-items: flex-start;
}

.rubric-card__index {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  margin-bottom: 8px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgb(37 99 235 / 10%);
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.rubric-card__head strong {
  display: block;
  font-size: 16px;
  line-height: 1.4;
}

.rubric-card__head span {
  flex: 0 0 auto;
}

.rubric-card--product p {
  color: #42556f;
  font-size: 14px;
  line-height: 1.75;
}

.result-hero-card {
  padding: 24px 24px 22px;
  border: 1px solid rgb(37 99 235 / 12%);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 6px 18px rgb(31 55 88 / 5%);
}

.result-hero-card__label {
  display: inline-flex;
  min-height: 28px;
  padding: 0 12px;
  align-items: center;
  border-radius: 999px;
  background: rgb(37 99 235 / 10%);
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 700;
}

.result-hero-card h2 {
  margin: 14px 0 0;
  font-size: 24px;
  line-height: 1.35;
}

.result-meta-tags,
.inline-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.result-meta-tags {
  margin-top: 16px;
}

.result-meta-tags span {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgb(255 255 255 / 86%);
  color: #4b5f7a;
  font-size: 12px;
  font-weight: 700;
}

.grading-center-hero {
  display: grid;
  gap: 18px;
}

.grading-center-hero__header {
  align-items: flex-start;
}

.grading-workflow-band {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid #e2ebf7;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
}

.grading-workflow-band__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.grading-workflow-band__eyebrow {
  display: inline-block;
  margin-bottom: 6px;
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.grading-workflow-band__header h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
}

.grading-workflow-band__header p {
  max-width: 360px;
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.65;
}

.grading-workflow-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
}

.grading-workflow-step {
  position: relative;
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 16px 14px;
  border: 1px solid #e2ebf7;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.grading-workflow-step:hover {
  transform: translateY(-1px);
  border-color: #d4e1f4;
  box-shadow: 0 8px 18px rgb(24 45 82 / 8%);
}

.grading-workflow-step:not(:last-child)::after {
  position: absolute;
  top: 50%;
  right: -12px;
  width: 12px;
  height: 1px;
  background: #d9e5f6;
  content: '';
}

.grading-workflow-step span {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #edf5ff;
  color: var(--brand-strong);
  font-size: 11px;
  font-weight: 800;
}

.grading-workflow-step strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.55;
}

.result-card-grid,
.exercise-card-grid,
.rubric-card-grid,
.dimension-card-grid,
.feedback-grid,
.insight-grid,
.answer-surface-grid {
  display: grid;
  gap: 16px;
}

.result-card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.result-info-card,
.exercise-card,
.rubric-card,
.dimension-card,
.feedback-card {
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.result-info-card {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.result-card-head h3,
.surface-head h3 {
  margin: 0;
  font-size: 17px;
}

.result-card-head p,
.surface-head p {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.bullet-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 18px;
  color: #42556f;
  font-size: 14px;
  line-height: 1.75;
}

.bullet-list li::marker {
  color: var(--brand);
}

.card-empty-text {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.7;
}

.result-surface,
.answer-card {
  display: grid;
  gap: 16px;
  padding: 22px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
}

.surface-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.surface-head--compact {
  margin-bottom: 12px;
}

.result-table {
  width: 100%;
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
}

.result-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.result-table :deep(.el-table__header-wrapper th) {
  background: #f4f8ff;
  color: #4b607b;
  font-size: 12px;
  font-weight: 800;
}

.result-table :deep(.el-table__body td) {
  color: #41556f;
  font-size: 13px;
}

.result-table :deep(.cell) {
  line-height: 1.7;
  word-break: break-word;
}

.activity-card-list {
  display: grid;
  gap: 12px;
}

.activity-card {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  padding: 16px 18px;
  border: 1px solid #e8eef8;
  border-radius: 8px;
  background: #ffffff;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.activity-card:hover,
.exercise-card:hover,
.rubric-card:hover,
.dimension-card:hover,
.feedback-card:hover,
.result-info-card:hover {
  transform: translateY(-1px);
  border-color: #d4deeb;
  box-shadow: 0 8px 18px rgb(24 45 82 / 8%);
}

.activity-card span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  background: #edf5ff;
  color: var(--brand-strong);
  font-size: 13px;
  font-weight: 800;
}

.activity-card p,
.exercise-card__question,
.answer-block p,
.rubric-card p,
.dimension-card p {
  margin: 0;
  color: #42556f;
  font-size: 14px;
  line-height: 1.8;
}

.exercise-card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.exercise-card {
  display: grid;
  gap: 14px;
  padding: 20px;
}

.exercise-card__head,
.rubric-card__head,
.dimension-card__head,
.metric-card__head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.exercise-card__head strong,
.rubric-card__head strong,
.dimension-card__head strong {
  font-size: 16px;
}

.answer-block {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 8px;
  background: #f5f8fc;
}

.answer-block span {
  color: #60748e;
  font-size: 12px;
  font-weight: 700;
}

.rubric-card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.rubric-card,
.dimension-card {
  display: grid;
  gap: 12px;
  padding: 18px;
}

.rubric-card__head span,
.dimension-card__head span {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgb(37 99 235 / 10%);
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 800;
}
.score-board {
  display: grid;
  grid-template-columns: minmax(180px, 0.9fr) repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.grading-capability-surface {
  gap: 18px;
}

.grading-capability-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.grading-capability-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #f8fbff);
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.grading-capability-card:hover {
  transform: translateY(-1px);
  border-color: #d4deeb;
  box-shadow: 0 8px 18px rgb(24 45 82 / 8%);
}

.grading-capability-card span {
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 700;
}

.grading-capability-card strong {
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.55;
}

.metric-card {
  display: grid;
  gap: 14px;
  padding: 22px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.metric-card:hover {
  transform: translateY(-1px);
  border-color: #d4deeb;
  box-shadow: 0 8px 18px rgb(24 45 82 / 8%);
}

.metric-card span {
  color: #61748e;
  font-size: 12px;
  font-weight: 700;
}

.metric-card strong {
  color: var(--text-primary);
  font-size: 28px;
  line-height: 1;
}

.metric-card small {
  color: var(--text-muted);
  font-size: 14px;
}

.metric-card--primary {
  align-content: center;
  background: linear-gradient(135deg, #2468d8, #4f8ff0);
  color: #ffffff;
  box-shadow: 0 10px 24px rgb(37 99 235 / 18%);
}

.metric-card--primary span,
.metric-card--primary strong,
.metric-card--primary small {
  color: #ffffff;
}

.dimension-card-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.insight-grid {
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
}

.insight-card {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  box-shadow: 0 4px 14px rgb(24 45 82 / 5%);
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.insight-card:hover,
.insight-recommend-card:hover {
  transform: translateY(-1px);
  border-color: #d4deeb;
  box-shadow: 0 8px 18px rgb(24 45 82 / 8%);
}

.insight-card--issue {
  border-top: 4px solid #2563eb;
}

.insight-card--suggestion {
  border-top: 4px solid #0f766e;
}

.insight-card__head {
  display: grid;
  gap: 8px;
}

.insight-card__head span {
  color: var(--brand-strong);
  font-size: 12px;
  font-weight: 700;
}

.insight-card__head h4 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
}

.insight-recommend-list {
  display: grid;
  gap: 12px;
}

.insight-recommend-card {
  display: grid;
  gap: 8px;
  padding: 16px;
  border: 1px solid #e4ebf5;
  border-radius: 8px;
  background: #ffffff;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.insight-recommend-card strong {
  color: var(--text-primary);
  font-size: 15px;
  line-height: 1.45;
}

.insight-recommend-card p {
  margin: 0;
  color: #42556f;
  font-size: 14px;
  line-height: 1.75;
}

.feedback-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.feedback-card {
  padding: 20px;
  background: #fbfcfe;
}

.feedback-card--positive {
  border-top: 4px solid #16a34a;
}

.feedback-card--warning {
  border-top: 4px solid #ea580c;
}

.feedback-card--info {
  border-top: 4px solid #2563eb;
}

.answer-surface-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.answer-block--large {
  min-height: 210px;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.4;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes loading-slide {
  0% {
    transform: translateX(-120%);
  }

  50% {
    transform: translateX(130%);
  }

  100% {
    transform: translateX(260%);
  }
}

@media (max-width: 1260px) {
  .workspace-hero,
  .assistant-workspace,
  .grading-workspace,
  .result-card-grid,
  .lesson-module-grid,
  .lesson-module-grid--secondary,
  .exercise-card-grid,
  .rubric-card-grid,
  .rubric-card-grid--product,
  .dimension-card-grid,
  .feedback-grid,
  .insight-grid,
  .answer-surface-grid,
  .score-board,
  .timeline-card__grid {
    grid-template-columns: 1fr;
  }

  .hero-metric-strip,
  .loading-step-list--cards,
  .ability-band__grid,
  .result-preview-list,
  .grading-case-grid,
  .grading-capability-grid,
  .grading-workflow-list {
    grid-template-columns: 1fr;
  }

  .overview-band__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .result-panel {
    min-height: 620px;
  }
}

@media (max-width: 860px) {
  .ai-assistant-page {
    padding: 18px 14px 28px;
  }

  .workspace-hero,
  .input-panel,
  .result-panel {
    padding: 20px;
  }

  .workspace-hero__main {
    grid-template-columns: 1fr;
  }

  .ability-band__grid,
  .grading-capability-grid,
  .grading-case-grid {
    grid-template-columns: 1fr;
  }

  .overview-band__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .grading-workflow-band__header,
  .grading-center-hero__header,
  .result-state__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .overview-band__header p {
    max-width: none;
  }

  .grading-workflow-band__header p {
    max-width: none;
  }

  .teaching-loop-band__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .teaching-loop-band__header p {
    max-width: none;
  }

  .tab-switch-card {
    min-width: 0;
  }

  .form-block__grid,
  .hero-side-grid {
    grid-template-columns: 1fr;
  }

  .result-heading {
    grid-template-columns: 1fr;
  }

  .result-hero-card__header,
  .lesson-module-card__head,
  .exercise-card__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .generation-status {
    justify-self: start;
  }

  .result-hero-card__status {
    min-width: 0;
  }

  .timeline-item {
    grid-template-columns: 1fr;
  }

  .timeline-marker {
    display: none;
  }

  .timeline-card__grid,
  .lesson-module-grid--secondary,
  .rubric-card-grid--product,
  .grading-capability-grid {
    grid-template-columns: 1fr;
  }

  .grading-workflow-step:not(:last-child)::after {
    top: auto;
    left: 28px;
    right: auto;
    bottom: -10px;
    width: 1px;
    height: 10px;
  }

  .teaching-loop-step:not(:last-child)::after {
    top: auto;
    left: 28px;
    right: auto;
    bottom: -10px;
    width: 1px;
    height: 10px;
  }

  .result-state__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .exercise-card__tags {
    justify-content: flex-start;
  }

  .rubric-labels {
    display: none;
  }

  .rubric-row {
    grid-template-columns: minmax(0, 1fr) 108px 40px;
  }

  .rubric-row > :nth-child(2) {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .rubric-row > :nth-child(3) {
    grid-column: 2;
    grid-row: 1;
  }

  .rubric-row > :nth-child(4) {
    grid-column: 3;
    grid-row: 1;
  }
}

@media (max-width: 560px) {
  .hero-copy h1 {
    font-size: 28px;
  }

  .overview-band {
    padding: 18px;
  }

  .overview-band__grid {
    grid-template-columns: 1fr;
  }

  .grading-workflow-band {
    padding: 16px;
  }

  .ability-band {
    padding: 16px;
  }

  .grading-entry-card,
  .result-preview-card {
    padding: 16px;
  }

  .teaching-loop-band {
    padding: 18px;
  }

  .lesson-flow-step,
  .teaching-loop-step {
    grid-template-columns: 1fr;
  }

  .hero-meta-row,
  .hero-chip-row,
  .result-meta-tags,
  .inline-tags {
    align-items: stretch;
  }

  .hero-state-pill,
  .hero-chip,
  .result-meta-tags span {
    justify-content: center;
  }

  .tab-switch-card {
    padding: 14px;
  }

  .panel-heading,
  .form-block__header,
  .exercise-card__head,
  .rubric-card__head,
  .dimension-card__head,
  .metric-card__head {
    align-items: flex-start;
  }

  .form-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .form-actions :deep(.el-button) {
    width: 100%;
    min-width: 0;
  }

  .activity-card {
    grid-template-columns: 1fr;
  }

  .activity-card span {
    width: 48px;
    height: 48px;
  }

  .overview-stat-card strong {
    white-space: normal;
  }
}

.ai-assistant-page {
  --brand: #8b5cf6;
  --brand-strong: #6d28d9;
  --brand-soft: #f5f3ff;
  --brand-line: #e9ddff;
  --text-primary: #281c3a;
  --text-secondary: #645b79;
  --text-muted: #8a819b;
  --border-soft: rgba(134, 108, 190, 0.16);
  --surface: rgba(255, 255, 255, 0.92);
  position: relative;
  background:
    linear-gradient(rgba(139, 92, 246, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(236, 72, 153, 0.04) 1px, transparent 1px),
    radial-gradient(circle at 14% 10%, rgb(139 92 246 / 12%), transparent 22%),
    radial-gradient(circle at 84% 14%, rgb(52 211 153 / 14%), transparent 20%),
    radial-gradient(circle at 74% 78%, rgb(251 191 36 / 14%), transparent 18%),
    linear-gradient(180deg, #fbf9ff 0%, #f8fbff 48%, #fffdf6 100%);
  background-size: 28px 28px, 28px 28px, auto, auto, auto, auto;
}

.ai-assistant-page::before,
.ai-assistant-page::after {
  position: fixed;
  z-index: 0;
  border-radius: 50%;
  pointer-events: none;
  content: '';
}

.ai-assistant-page::before {
  top: 48px;
  right: 5vw;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgb(236 72 153 / 12%), rgb(236 72 153 / 0%) 68%);
}

.ai-assistant-page::after {
  bottom: 4vh;
  left: 4vw;
  width: 260px;
  height: 260px;
  background: radial-gradient(circle, rgb(52 211 153 / 10%), rgb(52 211 153 / 0%) 70%);
}

.ai-assistant-page > * {
  position: relative;
  z-index: 1;
}

.workspace-hero,
.overview-band,
.teaching-loop-band,
.workspace-card {
  border-color: rgba(139, 92, 246, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow:
    0 1px 0 rgb(255 255 255 / 75%) inset,
    0 14px 30px rgb(109 40 217 / 7%);
}

.workspace-hero {
  padding: 18px 20px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 92%), rgb(247 241 255 / 92%)),
    #fff;
}

.workspace-hero::before {
  top: -52px;
  right: -42px;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgb(139 92 246 / 16%), rgb(139 92 246 / 0%) 68%);
}

.workspace-hero::after {
  bottom: -70px;
  left: 52%;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgb(251 191 36 / 14%), rgb(251 191 36 / 0%) 72%);
}

.hero-icon-shell {
  background: linear-gradient(135deg, rgb(236 72 153 / 16%), rgb(139 92 246 / 16%));
  color: #7c3aed;
}

.hero-kicker {
  background: rgb(139 92 246 / 10%);
  color: var(--brand-strong);
}

.hero-copy h1 {
  font-size: 24px;
}

.hero-chip-row {
  gap: 8px;
}

.hero-chip,
.hero-lab-strip span {
  border: 1px solid rgba(139, 92, 246, 0.14);
  background: rgba(255, 255, 255, 0.82);
  color: #48355f;
  box-shadow: 0 1px 0 rgb(255 255 255 / 72%) inset;
  white-space: nowrap;
}

.hero-chip:nth-child(1) {
  background: rgb(236 72 153 / 10%);
}

.hero-chip:nth-child(2) {
  background: rgb(139 92 246 / 10%);
}

.hero-chip:nth-child(3) {
  background: rgb(52 211 153 / 10%);
}

.hero-chip :deep(svg) {
  color: var(--brand-strong);
}

.hero-lab-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.hero-lab-strip span:nth-child(1) {
  background: rgb(139 92 246 / 12%);
  color: var(--brand-strong);
}

.hero-lab-strip span:nth-child(2) {
  background: rgb(52 211 153 / 12%);
  color: #117a5d;
}

.hero-lab-strip span:nth-child(3) {
  background: rgb(251 191 36 / 15%);
  color: #8b5a00;
}

.overview-band {
  margin-bottom: 16px;
  padding: 20px 22px;
}

.overview-band__eyebrow {
  color: #7c3aed;
}

.overview-stat-card:nth-child(1) {
  background: linear-gradient(180deg, rgb(255 255 255 / 96%), rgb(247 243 255 / 90%));
}

.overview-stat-card:nth-child(2) {
  background: linear-gradient(180deg, rgb(255 255 255 / 96%), rgb(244 255 249 / 90%));
}

.overview-stat-card:nth-child(3) {
  background: linear-gradient(180deg, rgb(255 255 255 / 96%), rgb(246 250 255 / 90%));
}

.overview-stat-card:nth-child(4) {
  background: linear-gradient(180deg, rgb(255 255 255 / 96%), rgb(255 250 235 / 92%));
}

.assistant-tabs :deep(.el-tabs__item.is-active .tab-switch-card) {
  border-color: rgba(139, 92, 246, 0.42);
  background: linear-gradient(135deg, rgb(255 255 255 / 100%), rgb(247 241 255 / 94%));
  box-shadow:
    0 1px 0 rgb(255 255 255 / 92%) inset,
    0 14px 30px rgb(109 40 217 / 12%);
  transform: translateY(-2px);
}

.assistant-tabs :deep(.el-tabs__item:hover .tab-switch-card) {
  border-color: rgba(236, 72, 153, 0.24);
  transform: translateY(-1px);
}

.tab-switch-card {
  min-width: 260px;
  border-color: rgba(139, 92, 246, 0.12);
}

.tab-switch-card__icon {
  border-radius: 6px;
  background: linear-gradient(135deg, rgb(139 92 246 / 14%), rgb(236 72 153 / 14%));
  color: var(--brand-strong);
}

.assistant-workspace {
  gap: 20px;
}

.input-panel,
.result-panel {
  padding: 22px;
}

.panel-heading {
  padding-bottom: 14px;
  border-bottom-color: rgba(139, 92, 246, 0.12);
}

.panel-index,
.block-step,
.ability-band__card span,
.teaching-loop-step span,
.timeline-marker__index,
.lesson-module-card__index,
.exercise-card__index,
.rubric-card__index,
.grading-workflow-step span,
.result-hero-card__label,
.timeline-card__eyebrow,
.timeline-time-pill,
.grading-entry-pill,
.hero-state-pill,
.hero-lab-strip span {
  border-radius: 999px;
}

.workspace-hero__side {
  gap: 12px;
}

.hero-side-card--primary {
  border-color: rgba(139, 92, 246, 0.16);
  background: linear-gradient(180deg, rgb(255 255 255 / 94%), rgb(248 243 255 / 92%));
}

.hero-side-card__title-row em {
  background: rgb(139 92 246 / 10%);
  color: var(--brand-strong);
}

.ability-band,
.grading-entry-card,
.result-hero-card,
.lesson-module-card,
.timeline-card,
.exercise-card,
.rubric-card,
.dimension-card,
.metric-card,
.insight-card,
.insight-recommend-card,
.feedback-card,
.answer-card,
.grading-workflow-band,
.grading-capability-card,
.result-surface,
.result-preview-card,
.activity-card,
.lesson-flow-step {
  border-color: rgba(139, 92, 246, 0.12);
  border-radius: 6px;
  background: linear-gradient(180deg, rgb(255 255 255 / 97%), rgb(251 249 255 / 93%));
  box-shadow:
    0 1px 0 rgb(255 255 255 / 82%) inset,
    0 10px 24px rgb(109 40 217 / 7%);
}

.hero-workflow-step,
.ability-band__card,
.teaching-loop-step,
.grading-workflow-step,
.grading-capability-card,
.lesson-module-card,
.timeline-card,
.exercise-card,
.rubric-card,
.dimension-card,
.result-surface,
.answer-card,
.result-preview-card,
.feedback-card,
.insight-card,
.insight-recommend-card,
.activity-card {
  border-color: rgba(139, 92, 246, 0.12);
}

.hero-workflow-step span,
.ability-band__card span,
.teaching-loop-step span,
.timeline-marker__index,
.lesson-module-card__index,
.exercise-card__index,
.rubric-card__index,
.grading-workflow-step span,
.panel-index,
.block-step {
  background: linear-gradient(135deg, rgb(236 72 153 / 12%), rgb(139 92 246 / 12%));
  color: var(--brand-strong);
}

.grading-entry-card {
  background: linear-gradient(180deg, rgb(255 255 255 / 94%), rgb(248 255 252 / 92%));
}

.lesson-module-card--featured {
  background: linear-gradient(180deg, rgb(255 255 255 / 96%), rgb(249 245 255 / 94%));
}

.result-state,
.grading-workflow-band,
.result-surface,
.answer-card,
.result-preview-card {
  background: linear-gradient(180deg, rgb(255 255 255 / 96%), rgb(251 249 255 / 92%));
}

.result-state--loading {
  background:
    radial-gradient(circle at top, rgb(139 92 246 / 8%), rgb(139 92 246 / 0%) 34%),
    linear-gradient(180deg, rgb(255 255 255 / 98%), rgb(250 247 255 / 96%));
}

.loading-badge,
.generation-status.is-loading,
.result-hero-card__label,
.timeline-card__eyebrow,
.timeline-time-pill,
.hero-kicker {
  background: rgb(139 92 246 / 10%);
  color: var(--brand-strong);
}

.metric-card--primary {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  color: #fff;
}

.metric-card--primary span,
.metric-card--primary strong,
.metric-card--primary small {
  color: #fff;
}

.score-board {
  gap: 14px;
}

.grading-capability-card span {
  color: var(--brand-strong);
}

.insight-card--issue {
  border-top-color: #ec4899;
}

.insight-card--suggestion {
  border-top-color: #34d399;
}

.feedback-card--positive {
  border-top-color: #34d399;
}

.feedback-card--warning {
  border-top-color: #f59e0b;
}

.feedback-card--info {
  border-top-color: #8b5cf6;
}

.bullet-list li::marker {
  color: #8b5cf6;
}

.result-meta-tags span {
  background: rgb(255 255 255 / 88%);
  border: 1px solid rgba(139, 92, 246, 0.12);
}

.assistant-form :deep(.el-input__wrapper),
.assistant-form :deep(.el-select .el-input__wrapper),
.assistant-form :deep(.el-input-number),
.assistant-form :deep(.el-textarea__inner) {
  border-radius: 6px;
  border-color: rgba(139, 92, 246, 0.12);
}

.form-actions :deep(.el-button),
.result-heading :deep(.el-button),
.panel-heading :deep(.el-button.is-circle),
.add-rubric-button {
  white-space: nowrap;
}

@media (max-width: 860px) {
  .workspace-hero {
    padding: 18px;
  }

  .hero-copy h1 {
    font-size: 26px;
  }

  .hero-lab-strip {
    gap: 6px;
  }

  .assistant-tabs :deep(.el-tabs__nav) {
    gap: 10px;
  }

  .tab-switch-card {
    min-width: 0;
  }
}

@media (max-width: 560px) {
  .hero-copy h1 {
    font-size: 24px;
  }

  .hero-lab-strip span,
  .hero-chip {
    width: 100%;
    justify-content: center;
  }

  .score-board {
    grid-template-columns: 1fr;
  }

  .form-actions {
    grid-template-columns: 1fr;
  }
}
</style>
