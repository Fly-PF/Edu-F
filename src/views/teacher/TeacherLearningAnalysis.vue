<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  ChatDotRound,
  Compass,
  DataAnalysis,
  DocumentChecked,
  HomeFilled,
  Reading,
  Refresh,
  TrendCharts,
  UserFilled,
} from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { getTeacherClassList } from '@/api/teacherClass'
import { askTeacherLearningAssistant, getTeacherGrowthDashboard } from '@/api/learningAnalysis'
import { isCourseCompleted } from '@/utils/courseCompletion'
import AbilityRadar from '@/components/learning/AbilityRadar.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const refreshing = ref(false)
const asking = ref(false)
const assistantVisible = ref(false)
const activeSection = ref('overview')
const classes = ref([])
const dashboard = ref(null)
const selectedClassId = ref('')
const selectedStudentId = ref('')
const stateFilter = ref('ALL')
const selectedCourseId = ref('ALL')
const selectedPracticeId = ref('ALL')
const accuracyFilter = ref('ALL')
const question = ref('')
const conversation = ref([])

const stateMeta = {
  FOCUS: { label: '重点干预', tone: 'focus' },
  ATTENTION: { label: '需要关注', tone: 'attention' },
  STEADY: { label: '稳定推进', tone: 'steady' },
}
const chartColors = ['#8178cf', '#52bbc4', '#e3ba3d', '#ee91bb', '#557f9d', '#70a75a']

const students = computed(() => dashboard.value?.studentAbilities || [])
const alerts = computed(() => dashboard.value?.riskAlerts || [])
const trend = computed(() => dashboard.value?.classTrend || { totalStudyMinutes: 0, activeStudents: 0, days: [] })
const classProfile = computed(() => dashboard.value?.classProfile || { shares: [], totalStudyMinutes: 0, insight: '' })
const summary = computed(() => dashboard.value?.summary || { studentCount: 0, averageProgress: 0, courseCount: 0 })
const questionAccuracy = computed(() => dashboard.value?.questionAccuracy || [])
const deadlineEmptyText = computed(() => (dashboard.value?.risks || []).some(item => String(item?.deadline || '').trim())
  ? '已完成课程无需提醒'
  : '当前班级没有设置课程截止时间')
const courseDeadlines = computed(() => {
  const grouped = new Map()
  ;(dashboard.value?.risks || []).forEach(item => {
    if (!item?.courseId || !String(item.deadline || '').trim() || isCourseCompleted(item)) return
    const key = String(item.courseId)
    const current = grouped.get(key) || {
      courseId: item.courseId,
      courseName: item.courseName,
      deadline: item.deadline,
      studentId: item.studentId,
      studentCount: 0,
      incompleteStudents: 0,
      progressTotal: 0,
    }
    current.studentCount += 1
    current.incompleteStudents += Number(item.progress || 0) < 100 ? 1 : 0
    current.progressTotal += Number(item.progress || 0)
    grouped.set(key, current)
  })
  return Array.from(grouped.values())
    .map(item => ({ ...item, averageProgress: item.studentCount ? Math.round(item.progressTotal / item.studentCount) : 0 }))
    .sort((first, second) => deadlineTimestamp(first.deadline) - deadlineTimestamp(second.deadline))
})

const stateCounts = computed(() => students.value.reduce((result, item) => {
  const state = item.learningState || 'ATTENTION'
  result[state] = (result[state] || 0) + 1
  return result
}, { FOCUS: 0, ATTENTION: 0, STEADY: 0 }))
const visibleStudents = computed(() => stateFilter.value === 'ALL'
  ? students.value
  : students.value.filter(item => (item.learningState || 'ATTENTION') === stateFilter.value))
const selectedStudent = computed(() => students.value.find(item => String(item.studentId) === String(selectedStudentId.value)) || students.value[0] || null)
const priorityStudent = computed(() => students.value.find(item => item.learningState === 'FOCUS')
  || students.value.find(item => item.learningState === 'ATTENTION')
  || students.value[0]
  || null)

const courseOptions = computed(() => {
  const courses = new Map()
  questionAccuracy.value.forEach(item => courses.set(String(item.courseId), item.courseName))
  return Array.from(courses, ([value, label]) => ({ value, label }))
})
const practiceOptions = computed(() => questionAccuracy.value
  .filter(item => selectedCourseId.value === 'ALL' || String(item.courseId) === selectedCourseId.value)
  .map(item => ({ value: String(item.practiceId), label: item.practiceTitle })))
const basePracticeGroups = computed(() => questionAccuracy.value.filter(item => (
  (selectedCourseId.value === 'ALL' || String(item.courseId) === selectedCourseId.value)
  && (selectedPracticeId.value === 'ALL' || String(item.practiceId) === selectedPracticeId.value)
)))
const accuracyStats = computed(() => {
  const questions = basePracticeGroups.value.flatMap(item => item.questions || [])
  const attempts = questions.reduce((total, item) => total + Number(item.attemptCount || 0), 0)
  const correct = questions.reduce((total, item) => total + Number(item.correctCount || 0), 0)
  return {
    questionCount: questions.length,
    average: attempts ? Math.round(correct * 100 / attempts) : null,
    lowCount: questions.filter(item => Number(item.attemptCount) > 0 && Number(item.accuracy) < 60).length,
    emptyCount: questions.filter(item => !Number(item.attemptCount)).length,
    reviewedSubmissions: basePracticeGroups.value.reduce((total, item) => total + Number(item.reviewedSubmissionCount || 0), 0),
  }
})
const visiblePracticeGroups = computed(() => basePracticeGroups.value.map(practice => ({
  ...practice,
  questions: (practice.questions || [])
    .map((item, index) => ({ ...item, displayOrder: index + 1 }))
    .filter(matchesAccuracyFilter)
    .sort((first, second) => questionSortValue(first) - questionSortValue(second)),
})).filter(item => item.questions.length))
const lowQuestionCount = computed(() => questionAccuracy.value
  .flatMap(item => item.questions || [])
  .filter(item => Number(item.attemptCount) > 0 && Number(item.accuracy) < 60).length)

const navigation = computed(() => [
  { id: 'overview', label: '班级总览', hint: '教学重点与趋势', icon: HomeFilled },
  { id: 'students', label: '学生画像', hint: '查看每位学生', icon: UserFilled },
  { id: 'accuracy', label: '习题正答率', hint: '定位薄弱题目', icon: DocumentChecked, badge: lowQuestionCount.value },
  { id: 'course-risk', label: '课程与风险', hint: '课程投入与预警', icon: Reading },
])
const sectionMeta = computed(() => ({
  overview: { eyebrow: 'CLASS LEARNING HOME', title: '班级学习总览', description: '先看全班状态和本周重点，再安排教学。' },
  students: { eyebrow: 'STUDENT PROFILES', title: '学生能力画像', description: '选择一名学生，查看能力证据和下一步建议。' },
  accuracy: { eyebrow: 'QUESTION INSIGHT', title: '习题正答率', description: '按已批改答卷统计每道题，低正答率题目优先显示。' },
  'course-risk': { eyebrow: 'COURSE & RISK', title: '课程投入与风险', description: '结合课程主题投入，集中处理有证据的学习风险。' },
})[activeSection.value])

const trendMax = computed(() => Math.max(1, ...trend.value.days.map(item => Number(item.studyMinutes || 0))))
const trendPoints = computed(() => {
  const days = trend.value.days || []
  const width = 700
  const height = 150
  const left = 28
  const right = 18
  const top = 18
  const bottom = 18
  const step = days.length > 1 ? (width - left - right) / (days.length - 1) : 0

  return days.map((item, index) => {
    const minutes = Math.max(0, Number(item.studyMinutes || 0))
    const x = days.length > 1 ? left + index * step : width / 2
    const y = top + (height - top - bottom) * (1 - minutes / trendMax.value)
    return { ...item, minutes, x, y }
  })
})
const trendLinePoints = computed(() => trendPoints.value.map(item => `${item.x},${item.y}`).join(' '))
const trendGuides = computed(() => [0, .5, 1].map(ratio => ({
  y: 18 + (150 - 18 - 18) * ratio,
  value: Math.round(trendMax.value * (1 - ratio)),
})))
const classPieStyle = computed(() => {
  const shares = classProfile.value.shares?.filter(item => Number(item.share) > 0) || []
  if (!shares.length) return { background: '#ebeaf2' }
  let offset = 0
  const stops = shares.map((item, index) => {
    const start = offset
    offset += Number(item.share || 0)
    return `${chartColors[index % chartColors.length]} ${start}% ${offset}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

function unwrap(value) {
  if (value?.code != null) {
    if (Number(value.code) === 200) return value.data
    throw new Error(value.message || '请求失败')
  }
  return value
}

function stateInfo(student) {
  return stateMeta[student?.learningState] || stateMeta.ATTENTION
}

function chartColor(index) {
  return chartColors[index % chartColors.length]
}

function deadlineTimestamp(value) {
  const timestamp = Date.parse(String(value || '').replace(' ', 'T'))
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER
}

function deadlineMeta(value) {
  const timestamp = deadlineTimestamp(value)
  if (!Number.isFinite(timestamp) || timestamp === Number.MAX_SAFE_INTEGER) {
    return { label: '已设置截止时间', tone: 'neutral' }
  }
  const diff = timestamp - Date.now()
  if (diff <= 0) return { label: '已到截止时间', tone: 'overdue' }
  const hours = Math.ceil(diff / 3600000)
  if (hours < 24) return { label: `剩余 ${hours} 小时`, tone: 'soon' }
  const days = Math.ceil(diff / 86400000)
  return { label: days === 1 ? '剩余 1 天' : `剩余 ${days} 天`, tone: days <= 3 ? 'soon' : 'normal' }
}

function sourceLabel(source) {
  return source === 'MODEL' ? '大模型基于班级真实学情回答' : '基于真实学情的规则建议'
}

function questionTypeLabel(type) {
  return { SINGLE: '单选题', SHORT: '简答题' }[type] || '习题'
}

function accuracyTone(item) {
  if (!Number(item.attemptCount)) return 'empty'
  if (Number(item.accuracy) < 60) return 'low'
  if (Number(item.accuracy) < 80) return 'medium'
  return 'high'
}

function questionSortValue(item) {
  return Number(item.attemptCount) ? Number(item.accuracy) : 101
}

function matchesAccuracyFilter(item) {
  const attempts = Number(item.attemptCount)
  const accuracy = Number(item.accuracy)
  if (accuracyFilter.value === 'LOW') return attempts > 0 && accuracy < 60
  if (accuracyFilter.value === 'MEDIUM') return attempts > 0 && accuracy >= 60 && accuracy < 80
  if (accuracyFilter.value === 'HIGH') return attempts > 0 && accuracy >= 80
  if (accuracyFilter.value === 'EMPTY') return attempts === 0
  return true
}

function switchSection(section) {
  activeSection.value = section
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function selectStudent(studentId) {
  selectedStudentId.value = String(studentId)
}

function openStudent(studentId) {
  selectStudent(studentId)
  switchSection('students')
}

function useQuestion(value) {
  question.value = value
  assistantVisible.value = true
}

async function loadClasses() {
  const data = unwrap(await getTeacherClassList({ pageNum: 1, pageSize: 100 }))
  classes.value = data?.records || data?.list || (Array.isArray(data) ? data : [])
  const routeClassId = route.query.classId
  const exists = classes.value.some(item => String(item.classId ?? item.id) === String(routeClassId))
  selectedClassId.value = exists ? String(routeClassId) : String(classes.value[0]?.classId ?? classes.value[0]?.id ?? '')
}

async function loadDashboard() {
  if (!selectedClassId.value) return
  loading.value = true
  try {
    dashboard.value = await getTeacherGrowthDashboard(selectedClassId.value)
    if (!students.value.some(item => String(item.studentId) === String(selectedStudentId.value))) {
      selectedStudentId.value = String(students.value[0]?.studentId ?? '')
    }
  } catch (error) {
    dashboard.value = null
    ElMessage.error(error.message || '班级学情加载失败')
  } finally {
    loading.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await loadDashboard()
  refreshing.value = false
  ElMessage.success('已按最新学习记录更新')
}

async function askAssistant() {
  const value = question.value.trim()
  if (!value || asking.value || !selectedClassId.value) return
  conversation.value.push({ role: 'user', text: value })
  question.value = ''
  asking.value = true
  try {
    const reply = await askTeacherLearningAssistant(selectedClassId.value, { question: value })
    conversation.value.push({ role: 'assistant', ...reply })
  } catch (error) {
    ElMessage.error(error.message || 'AI 教学助手暂时无法回答')
  } finally {
    asking.value = false
  }
}

watch(selectedClassId, async (classId, previous) => {
  if (!classId || classId === previous) return
  router.replace({ query: { ...route.query, classId } })
  conversation.value = []
  selectedStudentId.value = ''
  stateFilter.value = 'ALL'
  selectedCourseId.value = 'ALL'
  selectedPracticeId.value = 'ALL'
  await loadDashboard()
})

watch(selectedCourseId, () => {
  if (!practiceOptions.value.some(item => item.value === selectedPracticeId.value)) {
    selectedPracticeId.value = 'ALL'
  }
})

onMounted(async () => {
  try {
    await loadClasses()
    await loadDashboard()
  } catch (error) {
    ElMessage.error(error.message || '班级列表加载失败')
  }
})
</script>

<template>
  <main v-loading="loading" class="analysis-page teacher-analysis-page">
    <div class="analysis-layout">
      <aside class="analysis-sidebar">
        <div class="sidebar-brand">
          <span class="brand-mark"><Compass /></span>
          <div><strong>教学观察站</strong><small>TEACHING LAB</small></div>
        </div>

        <nav class="analysis-nav" aria-label="教师学情分析导航">
          <button
            v-for="item in navigation"
            :key="item.id"
            type="button"
            :class="{ active: activeSection === item.id }"
            @click="switchSection(item.id)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span><strong>{{ item.label }}</strong><small>{{ item.hint }}</small></span>
            <b v-if="item.badge">{{ item.badge }}</b>
            <el-icon v-else class="nav-arrow"><ArrowRight /></el-icon>
          </button>
        </nav>

        <div class="sidebar-snapshot">
          <span>班级平均进度</span>
          <strong>{{ summary.averageProgress }}%</strong>
          <small>{{ summary.studentCount }} 名学生 · {{ summary.courseCount }} 门课程</small>
        </div>
      </aside>

      <section class="analysis-content">
        <header class="content-header">
          <div>
            <span class="eyebrow">{{ sectionMeta.eyebrow }}</span>
            <h1>{{ sectionMeta.title }}</h1>
            <p>{{ sectionMeta.description }}</p>
          </div>
          <div class="header-actions">
            <el-select v-model="selectedClassId" class="class-select" aria-label="选择班级">
              <el-option v-for="item in classes" :key="item.classId ?? item.id" :label="item.className" :value="String(item.classId ?? item.id)" />
            </el-select>
            <el-button :loading="refreshing" title="刷新最新学情" aria-label="刷新最新学情" @click="refresh">
              <el-icon><Refresh /></el-icon><span>刷新</span>
            </el-button>
          </div>
        </header>

        <template v-if="dashboard">
          <div v-show="activeSection === 'overview'" class="section-view overview-view">
            <section class="focus-banner">
              <div class="banner-copy">
                <span>本周教学焦点</span>
                <template v-if="priorityStudent">
                  <h2>先跟进 {{ priorityStudent.studentName }}</h2>
                  <p>{{ priorityStudent.priorityReason }}</p>
                  <el-button type="primary" @click="openStudent(priorityStudent.studentId)">
                    查看学生画像 <el-icon><ArrowRight /></el-icon>
                  </el-button>
                </template>
                <template v-else>
                  <h2>等待学习记录</h2>
                  <p>学生开始课程学习后，这里会给出本周教学重点。</p>
                </template>
              </div>
              <div class="banner-orbit" aria-hidden="true">
                <span class="orbit-ring" />
                <span class="orbit-core">GO</span>
                <i class="orbit-note idea">NOTICE</i>
                <i class="orbit-note make">GUIDE</i>
                <b class="orbit-star">✦</b>
              </div>
            </section>

            <section class="deadline-strip panel" aria-label="班级课程截止提醒">
              <div class="panel-heading">
                <div><span class="section-label">COURSE DEADLINES</span><h2>班级课程截止提醒</h2><p>只展示课程下发记录中已设置的真实截止时间，不参与风险评分。</p></div>
                <span class="count-chip">{{ courseDeadlines.length }} 门</span>
              </div>
              <div v-if="courseDeadlines.length" class="deadline-list">
                <button v-for="course in courseDeadlines.slice(0, 4)" :key="course.courseId" type="button" class="deadline-item" :disabled="!course.studentId" @click="course.studentId && openStudent(course.studentId)">
                  <span class="deadline-mark"><Reading /></span>
                  <span><strong>{{ course.courseName }}</strong><small>截止 {{ course.deadline }} · 平均进度 {{ course.averageProgress }}% · {{ course.incompleteStudents }} 名未完成</small></span>
                  <b :class="deadlineMeta(course.deadline).tone">{{ deadlineMeta(course.deadline).label }}</b>
                  <el-icon><ArrowRight /></el-icon>
                </button>
              </div>
              <div v-else class="deadline-empty"><Reading /><span>{{ deadlineEmptyText }}</span></div>
            </section>

            <section class="summary-strip" aria-label="班级学习状态概览">
              <div class="summary-cell"><span>重点干预</span><strong>{{ stateCounts.FOCUS }}</strong><small>建议优先跟进</small></div>
              <div class="summary-cell"><span>需要关注</span><strong>{{ stateCounts.ATTENTION }}</strong><small>本周检查节奏</small></div>
              <div class="summary-cell"><span>稳定推进</span><strong>{{ stateCounts.STEADY }}</strong><small>保持当前安排</small></div>
              <div class="summary-cell"><span>近 7 天活跃</span><strong>{{ trend.activeStudents }}<em>/{{ summary.studentCount }}</em></strong><small>{{ trend.totalStudyMinutes }} 分钟有效学习</small></div>
            </section>

            <section class="overview-grid">
              <article class="panel priority-panel">
                <div class="panel-heading">
                  <div><span class="section-label">TEACHING PRIORITY</span><h2>教学优先级</h2><p>从真实进度、练习和风险证据中提取。</p></div>
                  <span v-if="priorityStudent" class="state-chip" :class="stateInfo(priorityStudent).tone">{{ stateInfo(priorityStudent).label }}</span>
                </div>
                <template v-if="priorityStudent">
                  <div class="priority-student">
                    <span>{{ priorityStudent.studentName.slice(0, 1) }}</span>
                    <div><strong>{{ priorityStudent.studentName }}</strong><small>{{ priorityStudent.topRiskCourse }}</small></div>
                    <b>{{ priorityStudent.abilityProfile?.overallScore ?? 0 }}</b>
                  </div>
                  <div class="action-note"><span>建议动作</span><strong>{{ priorityStudent.recommendedAction }}</strong></div>
                </template>
                <div v-else class="stable-state"><strong>暂无需要优先处理的学生</strong></div>
              </article>

              <article class="panel trend-panel">
                <div class="panel-heading"><div><span class="section-label">WEEKLY ACTIVITY</span><h2>近 7 天学习趋势</h2><p>按班级真实章节学习分钟汇总。</p></div><el-icon><TrendCharts /></el-icon></div>
                <div class="trend-chart" role="img" aria-label="近七天班级学习时长折线图">
                  <svg viewBox="0 0 700 190" preserveAspectRatio="none" aria-hidden="true">
                    <g class="trend-guides">
                      <line v-for="guide in trendGuides" :key="guide.y" x1="28" :y1="guide.y" x2="682" :y2="guide.y" />
                      <text v-for="guide in trendGuides" :key="`label-${guide.y}`" x="0" :y="guide.y + 3">{{ guide.value }}</text>
                    </g>
                    <polyline v-if="trendLinePoints" class="trend-line" :points="trendLinePoints" />
                    <g v-for="item in trendPoints" :key="item.date">
                      <circle class="trend-point" :cx="item.x" :cy="item.y" r="4" />
                      <text class="trend-value" :x="item.x" :y="item.y - 10">{{ item.minutes }}</text>
                      <text class="trend-date" :x="item.x" y="181">{{ item.date }}</text>
                    </g>
                  </svg>
                </div>
              </article>
            </section>
          </div>

          <div v-show="activeSection === 'students'" class="section-view students-view">
            <section class="panel student-directory">
              <div class="panel-heading student-heading">
                <div><span class="section-label">STUDENT DIRECTORY</span><h2>选择学生</h2><p>画像只在右侧展示一次，列表用于快速定位。</p></div>
                <el-radio-group v-model="stateFilter" class="state-filter" aria-label="按学习状态筛选">
                  <el-radio-button value="ALL">全部 {{ students.length }}</el-radio-button>
                  <el-radio-button value="FOCUS">重点 {{ stateCounts.FOCUS }}</el-radio-button>
                  <el-radio-button value="ATTENTION">关注 {{ stateCounts.ATTENTION }}</el-radio-button>
                  <el-radio-button value="STEADY">稳定 {{ stateCounts.STEADY }}</el-radio-button>
                </el-radio-group>
              </div>
              <div class="student-list">
                <button
                  v-for="student in visibleStudents"
                  :key="student.studentId"
                  type="button"
                  class="student-row"
                  :class="{ selected: String(student.studentId) === String(selectedStudent?.studentId) }"
                  @click="selectStudent(student.studentId)"
                >
                  <span class="student-avatar">{{ student.studentName.slice(0, 1) }}</span>
                  <span class="student-name"><strong>{{ student.studentName }}</strong><small>画像可信度 {{ student.abilityProfile?.dataConfidence ?? 0 }}%</small></span>
                  <span class="state-chip" :class="stateInfo(student).tone">{{ stateInfo(student).label }}</span>
                  <span class="student-score"><strong>{{ student.abilityProfile?.overallScore ?? 0 }}</strong><small>{{ student.abilityProfile?.level }}</small></span>
                  <span class="student-reason"><strong>{{ student.abilityProfile?.pattern || '数据积累中' }}</strong><small>{{ student.priorityReason }}</small></span>
                  <el-icon><ArrowRight /></el-icon>
                </button>
              </div>
            </section>

            <section v-if="selectedStudent" class="student-detail-grid">
              <article class="panel ability-panel">
                <div class="panel-heading"><div><span class="section-label">SELECTED STUDENT</span><h2>{{ selectedStudent.studentName }} 的能力画像</h2><p>{{ selectedStudent.abilityProfile?.summary }}</p></div><el-icon><DataAnalysis /></el-icon></div>
                <AbilityRadar :profile="selectedStudent.abilityProfile" />
              </article>
              <aside class="student-notes">
                <article class="panel student-note action-card">
                  <span class="section-label">NEXT ACTION</span><h2>教师下一步</h2><p>{{ selectedStudent.recommendedAction }}</p>
                </article>
                <article class="panel student-note evidence-card">
                  <span class="section-label">CURRENT EVIDENCE</span><h2>当前判断依据</h2><p>{{ selectedStudent.priorityReason }}</p>
                  <div><span>主要风险课程</span><strong>{{ selectedStudent.topRiskCourse }}</strong></div>
                </article>
              </aside>
            </section>
            <section v-else class="panel empty-state"><el-empty description="暂无学生画像" /></section>
          </div>

          <div v-show="activeSection === 'accuracy'" class="section-view accuracy-view">
            <section class="accuracy-summary" aria-label="习题正答率概览">
              <div><span>平均正答率</span><strong>{{ accuracyStats.average == null ? '--' : `${accuracyStats.average}%` }}</strong><small>按每次真实作答加权</small></div>
              <div><span>低于 60%</span><strong>{{ accuracyStats.lowCount }}</strong><small>建议优先讲解</small></div>
              <div><span>已批改答卷</span><strong>{{ accuracyStats.reviewedSubmissions }}</strong><small>当前筛选范围</small></div>
              <div><span>暂无作答</span><strong>{{ accuracyStats.emptyCount }}</strong><small>共 {{ accuracyStats.questionCount }} 道题</small></div>
            </section>

            <section class="panel accuracy-workbench">
              <div class="accuracy-toolbar">
                <div>
                  <label>课程</label>
                  <el-select v-model="selectedCourseId" aria-label="筛选课程">
                    <el-option label="全部课程" value="ALL" />
                    <el-option v-for="item in courseOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </div>
                <div>
                  <label>练习</label>
                  <el-select v-model="selectedPracticeId" aria-label="筛选练习">
                    <el-option label="全部练习" value="ALL" />
                    <el-option v-for="item in practiceOptions" :key="item.value" :label="item.label" :value="item.value" />
                  </el-select>
                </div>
                <div class="accuracy-filter-wrap">
                  <label>掌握情况</label>
                  <el-radio-group v-model="accuracyFilter" class="accuracy-filter" aria-label="筛选正答率">
                    <el-radio-button value="ALL">全部</el-radio-button>
                    <el-radio-button value="LOW">低于 60%</el-radio-button>
                    <el-radio-button value="MEDIUM">60%–79%</el-radio-button>
                    <el-radio-button value="HIGH">80% 以上</el-radio-button>
                    <el-radio-button value="EMPTY">暂无作答</el-radio-button>
                  </el-radio-group>
                </div>
              </div>

              <div v-if="visiblePracticeGroups.length" class="practice-groups">
                <article v-for="practice in visiblePracticeGroups" :key="practice.practiceId" class="practice-group">
                  <header>
                    <div><span>{{ practice.courseName }}</span><h2>{{ practice.practiceTitle }}</h2></div>
                    <small>{{ practice.reviewedSubmissionCount }} 份已批改答卷</small>
                  </header>
                  <div class="question-table" role="table" :aria-label="`${practice.practiceTitle}正答率`">
                    <div class="question-row question-labels" role="row">
                      <span>题目</span><span>题目内容</span><span>作答</span><span>正确</span><span>正答率</span>
                    </div>
                    <div v-for="item in practice.questions" :key="item.questionId" class="question-row" role="row">
                      <span class="question-number"><b>第 {{ item.displayOrder }} 题</b><small>{{ questionTypeLabel(item.questionType) }} · {{ item.score }} 分</small></span>
                      <p>{{ item.content }}</p>
                      <span class="question-count"><b>{{ item.attemptCount }}</b><small>人作答</small></span>
                      <span class="question-count"><b>{{ item.correctCount }}</b><small>人正确</small></span>
                      <span class="accuracy-cell" :class="accuracyTone(item)">
                        <strong>{{ item.attemptCount ? `${item.accuracy}%` : '--' }}</strong>
                        <i><b :style="{ width: `${item.attemptCount ? item.accuracy : 0}%` }" /></i>
                        <small>{{ item.attemptCount ? (item.accuracy < 60 ? '建议讲解' : item.accuracy < 80 ? '继续巩固' : '掌握良好') : '暂无作答' }}</small>
                      </span>
                    </div>
                  </div>
                </article>
              </div>
              <el-empty v-else description="当前筛选下暂无习题数据" :image-size="72" />
            </section>
          </div>

          <div v-show="activeSection === 'course-risk'" class="section-view course-risk-view">
            <section class="course-risk-grid">
              <article class="panel mix-panel">
                <div class="panel-heading"><div><span class="section-label">COURSE THEME MIX</span><h2>课程主题学习占比</h2><p>{{ classProfile.insight || '按真实学习时长汇总。' }}</p></div><el-icon><DataAnalysis /></el-icon></div>
                <div class="mix-body">
                  <div class="mix-pie" :style="classPieStyle"><div><strong>{{ classProfile.totalStudyMinutes }}</strong><span>分钟</span></div></div>
                  <div class="mix-legend">
                    <div v-for="(item, index) in classProfile.shares" :key="item.categoryKey"><i :style="{ background: chartColor(index) }" /><strong>{{ item.typeName }}</strong><small>{{ item.studyMinutes }} 分钟 · {{ item.courseCount }} 门</small><b>{{ item.share }}%</b></div>
                  </div>
                </div>
              </article>

              <article class="panel risk-panel">
                <div class="panel-heading"><div><span class="section-label">RISK QUEUE</span><h2>需要处理的风险</h2><p>只显示有具体学习证据的中高风险。</p></div><span class="count-chip">{{ alerts.length }} 项</span></div>
                <div v-if="alerts.length" class="risk-list">
                  <button v-for="item in alerts" :key="`${item.studentId}-${item.courseId}`" type="button" @click="openStudent(item.studentId)">
                    <i :class="item.riskLevel === 'HIGH' ? 'high' : 'medium'">{{ item.riskScore }}</i>
                    <span><strong>{{ item.studentName }} · {{ item.courseName }}</strong><small>{{ item.evidence }}</small><b>{{ item.action }}</b></span>
                    <el-icon><ArrowRight /></el-icon>
                  </button>
                </div>
                <div v-else class="stable-state"><strong>当前没有中高风险</strong><span>继续观察课程推进和练习反馈。</span></div>
              </article>
            </section>
          </div>
        </template>

        <section v-else class="panel empty-state"><el-empty description="暂无可分析的班级学习数据" /><p>学生完成课程和练习后，这里会生成真实学情。</p></section>
      </section>
    </div>

    <button class="assistant-edge-trigger" type="button" aria-label="打开 AI 教学对话" @click="assistantVisible = true">
      <el-icon><ChatDotRound /></el-icon><span>问 AI</span>
    </button>
    <el-drawer v-model="assistantVisible" class="assistant-drawer" title="AI 教学对话" direction="rtl" size="min(420px, 92vw)">
      <div class="drawer-intro">回答只基于当前班级的真实画像、练习统计、学习趋势和风险记录。</div>
      <div v-if="!conversation.length" class="question-starters">
        <button type="button" @click="useQuestion('本周应优先关注哪些学生和课程？')">本周应优先关注哪些学生和课程？</button>
        <button type="button" @click="useQuestion('哪些低正答率习题值得课堂讲解？')">哪些低正答率习题值得课堂讲解？</button>
        <button type="button" @click="useQuestion('哪些课程主题需要重新讲解？')">哪些课程主题需要重新讲解？</button>
      </div>
      <div v-else class="conversation-list drawer-conversation">
        <div v-for="(item, index) in conversation" :key="index" class="message" :class="item.role">
          <p>{{ item.text || item.answer }}</p>
          <template v-if="item.role === 'assistant'"><strong>建议动作：{{ item.nextStep }}</strong><small>{{ sourceLabel(item.source) }} · {{ (item.references || []).join('；') }}</small></template>
        </div>
      </div>
      <div class="ask-row"><el-input v-model="question" maxlength="300" placeholder="例如：哪些题需要我先讲？" @keyup.enter="askAssistant" /><el-button type="primary" :loading="asking" @click="askAssistant">提问</el-button></div>
    </el-drawer>
  </main>
</template>

<style scoped>
.teacher-analysis-page {
  --ink: #3d3564;
  --ink-soft: #6d668d;
  --purple: #8178cf;
  --purple-deep: #4e4473;
  --pink: #ee91bb;
  --mint: #9de4eb;
  --mint-strong: #52bbc4;
  --yellow: #fff1a8;
  padding: 24px clamp(16px, 4vw, 64px) 48px;
}

.analysis-layout { display: grid; grid-template-columns: 218px minmax(0, 1fr); max-width: 1540px; gap: 24px; margin: 0 auto; }
.analysis-sidebar { position: sticky; top: 18px; display: flex; height: calc(100vh - 36px); min-height: 520px; flex-direction: column; padding: 18px 13px; border: 1.5px solid rgb(61 53 100 / 28%); border-radius: 8px; background: rgb(255 255 255 / 94%); box-shadow: 4px 5px 0 rgb(61 53 100 / 14%); }
.sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 2px 7px 17px; border-bottom: 1px dashed rgb(61 53 100 / 24%); }
.brand-mark { display: grid; width: 37px; height: 37px; flex: 0 0 auto; place-items: center; border: 1px solid var(--purple-deep); border-radius: 6px; background: var(--yellow); box-shadow: 2px 3px 0 rgb(61 53 100 / 14%); }
.brand-mark svg { width: 19px; }
.sidebar-brand strong, .sidebar-brand small { display: block; }
.sidebar-brand strong { color: var(--ink); font-family: "Trebuchet MS", "Microsoft YaHei", sans-serif; font-size: 15px; font-weight: 900; }
.sidebar-brand small { margin-top: 3px; color: #8982a1; font-size: 9px; font-weight: 800; }
.analysis-nav { display: grid; gap: 7px; margin-top: 17px; }
.analysis-nav button { position: relative; display: grid; grid-template-columns: 32px minmax(0, 1fr) 18px; align-items: center; gap: 9px; width: 100%; min-height: 60px; padding: 9px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.analysis-nav button > .el-icon:first-child { display: grid; width: 31px; height: 31px; place-items: center; border: 1px solid rgb(61 53 100 / 24%); border-radius: 5px; background: rgb(232 228 255 / 65%); color: var(--purple-deep); }
.analysis-nav button:nth-child(2) > .el-icon:first-child { background: rgb(157 228 235 / 38%); }
.analysis-nav button:nth-child(3) > .el-icon:first-child { background: rgb(238 145 187 / 22%); }
.analysis-nav button:nth-child(4) > .el-icon:first-child { background: rgb(255 241 168 / 55%); }
.analysis-nav button:hover { border-color: rgb(61 53 100 / 22%); background: rgb(157 228 235 / 13%); }
.analysis-nav button.active { border-color: var(--purple-deep); background: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 12%); transform: translate(-1px, -1px); }
.analysis-nav button.active::before { position: absolute; width: 3px; height: 30px; margin-left: -10px; border-radius: 2px; background: var(--purple); content: ""; }
.analysis-nav button > span { min-width: 0; }
.analysis-nav strong, .analysis-nav small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.analysis-nav strong { font-size: 12px; }
.analysis-nav small { margin-top: 4px; color: #817a99; font-size: 9px; }
.analysis-nav button > b { display: grid; min-width: 20px; height: 20px; place-items: center; border-radius: 4px; background: var(--pink); color: #fff; font-size: 9px; }
.nav-arrow { color: #978fad; font-size: 12px; }
.sidebar-snapshot { display: grid; margin-top: auto; padding: 14px; border: 1px solid rgb(61 53 100 / 24%); border-radius: 6px; background: linear-gradient(135deg, rgb(232 228 255 / 72%), rgb(255 241 168 / 38%)); }
.sidebar-snapshot span { color: #746d91; font-size: 9px; font-weight: 800; }
.sidebar-snapshot strong { margin: 7px 0 4px; color: var(--ink); font-size: 26px; line-height: 1; }
.sidebar-snapshot small { color: #817a99; font-size: 9px; line-height: 1.5; }

.analysis-content { min-width: 0; }
.content-header { display: flex; min-height: 98px; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
.content-header h1 { margin: 7px 0 5px; color: var(--ink); font-family: "Trebuchet MS", "Microsoft YaHei", sans-serif; font-size: 31px; font-weight: 900; line-height: 1.2; }
.content-header p { margin: 0; color: var(--ink-soft); font-size: 12px; line-height: 1.6; }
.eyebrow, .section-label { color: var(--purple-deep); font-size: 10px; font-weight: 900; letter-spacing: 0; }
.header-actions { display: flex; align-items: center; gap: 9px; }
.class-select { width: 210px; }
.header-actions :deep(.el-button) { min-width: 76px; height: 40px; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--yellow); color: var(--ink); box-shadow: 3px 4px 0 rgb(61 53 100 / 20%); font-weight: 900; }

.focus-banner { position: relative; display: flex; min-height: 220px; align-items: center; justify-content: space-between; margin-bottom: 18px; padding: 27px clamp(20px, 4vw, 42px); overflow: hidden; border: 1.5px solid rgb(61 53 100 / 30%); border-radius: 8px; background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%); box-shadow: 6px 7px 0 rgb(61 53 100 / 17%); }
.banner-copy { position: relative; z-index: 1; min-width: 0; }
.banner-copy > span { display: inline-flex; padding: 6px 9px; border: 1px solid var(--purple-deep); border-radius: 4px; background: var(--yellow); box-shadow: 2px 3px 0 rgb(61 53 100 / 14%); color: var(--ink); font-size: 10px; font-weight: 900; transform: rotate(-1deg); }
.banner-copy h2 { max-width: 620px; margin: 13px 0 8px; color: var(--ink); font-size: 27px; font-weight: 900; line-height: 1.35; }
.banner-copy p { max-width: 650px; margin: 0 0 19px; color: #61597f; font-size: 13px; line-height: 1.7; }
.banner-copy :deep(.el-button) { min-height: 39px; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 28%); font-weight: 900; }
.banner-orbit { position: relative; width: 240px; height: 160px; flex: 0 0 240px; }
.orbit-ring { position: absolute; inset: 19px 6px; border: 2px dashed rgb(61 53 100 / 34%); border-radius: 50%; animation: orbit-spin 15s linear infinite; }
.orbit-core { position: absolute; top: 50%; left: 50%; display: grid; width: 72px; height: 72px; place-items: center; border: 2px solid var(--purple-deep); border-radius: 50%; background: var(--mint); box-shadow: 5px 6px 0 rgb(61 53 100 / 18%); color: var(--ink); font-family: "Trebuchet MS", sans-serif; font-size: 22px; font-weight: 900; transform: translate(-50%, -50%); }
.orbit-note { position: absolute; padding: 7px 9px; border: 1px solid var(--purple-deep); border-radius: 4px; background: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 14%); color: var(--ink); font-size: 9px; font-style: normal; font-weight: 900; }
.orbit-note.idea { top: 4px; right: 19px; transform: rotate(4deg); }
.orbit-note.make { bottom: 6px; left: 4px; background: var(--yellow); transform: rotate(-4deg); }
.orbit-star { position: absolute; top: 20px; left: 27px; color: var(--pink); font-size: 26px; animation: star-breathe 5s ease-in-out infinite; }
@keyframes orbit-spin { to { transform: rotate(360deg); } }
@keyframes star-breathe { 50% { opacity: .45; transform: scale(.88); } }

.summary-strip, .accuracy-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 18px; overflow: hidden; border: 1.5px solid rgb(61 53 100 / 26%); border-radius: 8px; background: rgb(255 255 255 / 94%); box-shadow: 4px 5px 0 rgb(61 53 100 / 12%); }
.summary-cell, .accuracy-summary > div { min-width: 0; padding: 17px; border-top: 4px solid var(--pink); border-right: 1px solid rgb(61 53 100 / 12%); }
.summary-cell:nth-child(2), .accuracy-summary > div:nth-child(2) { border-top-color: var(--purple); }
.summary-cell:nth-child(3), .accuracy-summary > div:nth-child(3) { border-top-color: var(--mint-strong); }
.summary-cell:nth-child(4), .accuracy-summary > div:nth-child(4) { border-top-color: #d8b332; border-right: 0; }
.summary-cell span, .summary-cell strong, .summary-cell small, .accuracy-summary span, .accuracy-summary strong, .accuracy-summary small { display: block; }
.summary-cell span, .accuracy-summary span { color: var(--ink-soft); font-size: 10px; font-weight: 800; }
.summary-cell strong, .accuracy-summary strong { margin: 8px 0 4px; color: var(--ink); font-family: "Trebuchet MS", sans-serif; font-size: 29px; line-height: 1; }
.summary-cell em { font-size: 12px; font-style: normal; }
.summary-cell small, .accuracy-summary small { overflow: hidden; color: #847d9d; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }

.deadline-strip { margin-bottom: 18px; padding: 18px 20px; background: linear-gradient(135deg, #fff, rgb(255 241 168 / 24%)); }
.deadline-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.deadline-item { display: grid; grid-template-columns: 35px minmax(0, 1fr) auto 14px; align-items: center; gap: 9px; min-width: 0; padding: 11px; border: 1px solid rgb(61 53 100 / 19%); border-radius: 5px; background: #fff; color: var(--ink); text-align: left; cursor: pointer; }
.deadline-item:hover:not(:disabled) { border-color: var(--purple-deep); box-shadow: 3px 4px 0 rgb(61 53 100 / 13%); transform: translate(-1px, -1px); }
.deadline-item:disabled { cursor: default; opacity: .8; }
.deadline-mark { display: grid; width: 33px; height: 33px; place-items: center; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--yellow); }
.deadline-mark svg { width: 16px; }
.deadline-item > span:nth-child(2) { min-width: 0; }
.deadline-item strong,
.deadline-item small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.deadline-item strong { font-size: 11px; }
.deadline-item small { margin-top: 4px; color: #7d7698; font-size: 8px; }
.deadline-item > b { padding: 4px 6px; border: 1px solid rgb(61 53 100 / 20%); border-radius: 4px; color: var(--purple-deep); font-size: 9px; white-space: nowrap; }
.deadline-item > b.soon { border-color: #d3ad36; background: rgb(255 241 168 / 62%); color: #725a16; }
.deadline-item > b.overdue { border-color: #c66a8f; background: rgb(238 145 187 / 20%); color: #973e66; }
.deadline-item > b.normal { border-color: var(--mint-strong); background: rgb(157 228 235 / 28%); color: #26727b; }
.deadline-empty { display: flex; min-height: 64px; align-items: center; justify-content: center; gap: 8px; border: 1px dashed rgb(61 53 100 / 24%); color: #817a99; font-size: 10px; }
.deadline-empty svg { width: 18px; color: var(--purple); }

.panel { min-width: 0; border: 1.5px solid rgb(61 53 100 / 26%); border-radius: 8px; background: rgb(255 255 255 / 96%); box-shadow: 4px 5px 0 rgb(61 53 100 / 12%); }
.overview-grid, .student-detail-grid, .course-risk-grid { display: grid; grid-template-columns: minmax(0, 1.04fr) minmax(330px, .96fr); gap: 18px; }
.priority-panel, .trend-panel, .student-directory, .ability-panel, .student-note, .accuracy-workbench, .mix-panel, .risk-panel { padding: 20px; }
.priority-panel { background: linear-gradient(135deg, #fff, rgb(255 241 168 / 22%)); }
.trend-panel, .mix-panel { background: linear-gradient(135deg, #fff, rgb(157 228 235 / 15%)); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.panel-heading h2 { margin: 4px 0; color: var(--ink); font-size: 20px; font-weight: 900; }
.panel-heading p { margin: 0; color: #7c7598; font-size: 11px; line-height: 1.6; }
.panel-heading > .el-icon { color: var(--purple); font-size: 23px; }
.state-chip { display: inline-flex; width: max-content; align-items: center; justify-content: center; padding: 4px 7px; border: 1px solid; border-radius: 4px; font-size: 9px; font-weight: 900; white-space: nowrap; }
.state-chip.focus { border-color: #c66a8f; background: rgb(238 145 187 / 22%); color: #973e66; }
.state-chip.attention { border-color: #d3ad36; background: rgb(255 241 168 / 68%); color: #725a16; }
.state-chip.steady { border-color: var(--mint-strong); background: rgb(157 228 235 / 38%); color: #26727b; }
.priority-student { display: grid; grid-template-columns: 43px minmax(0, 1fr) auto; align-items: center; gap: 11px; padding: 14px 0; border-top: 1px solid rgb(61 53 100 / 12%); border-bottom: 1px solid rgb(61 53 100 / 12%); }
.priority-student > span { display: grid; width: 41px; height: 41px; place-items: center; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--yellow); font-weight: 900; }
.priority-student div { min-width: 0; }
.priority-student strong, .priority-student small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.priority-student strong { font-size: 13px; }
.priority-student small { margin-top: 4px; color: #817a99; font-size: 10px; }
.priority-student > b { color: var(--purple-deep); font-size: 24px; }
.action-note { display: grid; gap: 5px; margin-top: 14px; padding: 11px 13px; border-left: 4px solid var(--mint-strong); background: rgb(157 228 235 / 25%); }
.action-note span { color: #776f92; font-size: 9px; }
.action-note strong { color: var(--ink); font-size: 11px; line-height: 1.6; }
.trend-chart { height: 190px; padding: 2px 0 0; }
.trend-chart svg { display: block; width: 100%; height: 190px; overflow: visible; }
.trend-guides line { stroke: rgb(61 53 100 / 13%); stroke-dasharray: 3 5; stroke-width: 1; }
.trend-guides text { fill: #918ba4; font-size: 10px; text-anchor: start; }
.trend-line { fill: none; stroke: var(--purple); stroke-linecap: round; stroke-linejoin: round; stroke-width: 4; vector-effect: non-scaling-stroke; }
.trend-point { fill: var(--yellow); stroke: var(--purple-deep); stroke-width: 2; vector-effect: non-scaling-stroke; }
.trend-value { fill: var(--purple-deep); font-size: 11px; font-weight: 900; text-anchor: middle; }
.trend-date { fill: #847d9d; font-size: 10px; text-anchor: middle; }

.student-directory { margin-bottom: 18px; }
.student-heading { align-items: flex-end; }
.state-filter { flex: 0 0 auto; }
.student-list { display: grid; border-top: 1px solid rgb(61 53 100 / 13%); }
.student-row { display: grid; grid-template-columns: 38px minmax(120px, .7fr) 84px 90px minmax(190px, 1.4fr) 18px; align-items: center; gap: 12px; width: 100%; padding: 12px 8px; border: 0; border-bottom: 1px solid rgb(61 53 100 / 12%); background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.student-row:hover, .student-row.selected { background: rgb(157 228 235 / 18%); }
.student-row.selected { box-shadow: inset 4px 0 var(--purple); }
.student-avatar { display: grid; width: 35px; height: 35px; place-items: center; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--yellow); font-size: 11px; font-weight: 900; }
.student-name, .student-score, .student-reason { min-width: 0; }
.student-name strong, .student-name small, .student-score strong, .student-score small, .student-reason strong, .student-reason small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.student-name strong, .student-reason strong { font-size: 11px; }
.student-name small, .student-score small, .student-reason small { margin-top: 4px; color: #827b9b; font-size: 8px; }
.student-score strong { color: var(--purple-deep); font-size: 18px; }
.student-detail-grid { grid-template-columns: minmax(0, 1.2fr) minmax(270px, .8fr); }
.ability-panel { background: linear-gradient(135deg, #fff, rgb(232 228 255 / 42%)); }
.student-notes { display: grid; gap: 18px; }
.student-note h2 { margin: 6px 0 10px; color: var(--ink); font-size: 18px; }
.student-note p { margin: 0; color: #696281; font-size: 11px; line-height: 1.7; }
.action-card { border-top: 4px solid var(--mint-strong); }
.evidence-card { border-top: 4px solid var(--pink); }
.evidence-card div { display: grid; gap: 5px; margin-top: 16px; padding: 10px; border: 1px solid rgb(61 53 100 / 14%); background: rgb(255 241 168 / 27%); }
.evidence-card div span { color: #817a99; font-size: 9px; }
.evidence-card div strong { font-size: 11px; }

.accuracy-workbench { padding: 18px; }
.accuracy-toolbar { display: grid; grid-template-columns: minmax(180px, .7fr) minmax(180px, .8fr) minmax(390px, 1.5fr); gap: 14px; align-items: end; padding: 14px; border: 1px dashed rgb(61 53 100 / 24%); background: rgb(232 228 255 / 24%); }
.accuracy-toolbar > div { display: grid; gap: 6px; min-width: 0; }
.accuracy-toolbar label { color: var(--ink-soft); font-size: 9px; font-weight: 900; }
.accuracy-filter { width: 100%; }
.practice-groups { display: grid; gap: 17px; margin-top: 18px; }
.practice-group { overflow: hidden; border: 1px solid rgb(61 53 100 / 20%); border-radius: 6px; background: #fff; }
.practice-group > header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 13px 15px; border-bottom: 1px solid rgb(61 53 100 / 13%); background: linear-gradient(90deg, rgb(157 228 235 / 22%), rgb(255 241 168 / 18%)); }
.practice-group > header span { color: var(--purple-deep); font-size: 9px; font-weight: 900; }
.practice-group > header h2 { margin: 4px 0 0; color: var(--ink); font-size: 15px; }
.practice-group > header small { color: #7f7897; font-size: 9px; white-space: nowrap; }
.question-table { min-width: 0; }
.question-row { display: grid; grid-template-columns: 92px minmax(240px, 1fr) 64px 64px minmax(145px, .55fr); align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid rgb(61 53 100 / 11%); }
.question-row:last-child { border-bottom: 0; }
.question-labels { padding-top: 8px; padding-bottom: 8px; background: rgb(129 120 207 / 7%); color: #756e90; font-size: 9px; font-weight: 900; }
.question-row > p { margin: 0; color: #57506f; font-size: 11px; line-height: 1.55; overflow-wrap: anywhere; }
.question-number b, .question-number small, .question-count b, .question-count small { display: block; }
.question-number b { font-size: 10px; }
.question-number small, .question-count small { margin-top: 4px; color: #87809e; font-size: 8px; }
.question-count b { font-size: 13px; }
.accuracy-cell { display: grid; grid-template-columns: 42px minmax(55px, 1fr); align-items: center; gap: 5px 8px; }
.accuracy-cell strong { color: var(--purple-deep); font-size: 13px; }
.accuracy-cell > i { display: block; height: 7px; overflow: hidden; background: rgb(61 53 100 / 11%); }
.accuracy-cell > i b { display: block; height: 100%; background: var(--purple); }
.accuracy-cell small { grid-column: 1 / -1; color: #7e7796; font-size: 8px; }
.accuracy-cell.low strong { color: #a74470; }
.accuracy-cell.low > i b { background: var(--pink); }
.accuracy-cell.medium > i b { background: var(--purple); }
.accuracy-cell.high strong { color: #27756f; }
.accuracy-cell.high > i b { background: var(--mint-strong); }
.accuracy-cell.empty strong { color: #918ba4; }
.accuracy-cell.empty > i b { background: #c9c6d2; }

.course-risk-grid { align-items: start; }
.mix-body { display: grid; grid-template-columns: 155px minmax(0, 1fr); align-items: center; gap: 24px; }
.mix-pie { display: grid; width: 148px; aspect-ratio: 1; place-items: center; border: 2px solid rgb(61 53 100 / 20%); border-radius: 50%; box-shadow: 3px 4px 0 rgb(61 53 100 / 12%); }
.mix-pie > div { display: grid; width: 84px; aspect-ratio: 1; place-items: center; align-content: center; border: 1px solid var(--purple-deep); border-radius: 50%; background: #fff; }
.mix-pie strong, .mix-pie span { display: block; text-align: center; }
.mix-pie strong { color: var(--purple-deep); font-size: 24px; }
.mix-pie span { color: #7e7798; font-size: 9px; }
.mix-legend { display: grid; }
.mix-legend > div { display: grid; grid-template-columns: 9px minmax(0, 1fr) minmax(95px, auto) auto; align-items: center; gap: 9px; padding: 10px 3px; border-bottom: 1px solid rgb(61 53 100 / 12%); }
.mix-legend i { width: 9px; height: 9px; border-radius: 50%; }
.mix-legend strong { color: var(--ink); font-size: 11px; }
.mix-legend small { color: #827b9b; font-size: 9px; }
.mix-legend b { color: var(--purple-deep); font-size: 11px; }
.count-chip { flex: 0 0 auto; padding: 5px 8px; border: 1px solid var(--purple-deep); border-radius: 4px; background: var(--yellow); color: var(--ink); font-size: 10px; font-weight: 900; transform: rotate(1deg); }
.risk-list { display: grid; }
.risk-list button { display: grid; grid-template-columns: 35px minmax(0, 1fr) 17px; align-items: center; gap: 10px; width: 100%; padding: 11px 3px; border: 0; border-bottom: 1px solid rgb(61 53 100 / 12%); background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.risk-list button:hover { background: rgb(238 145 187 / 10%); }
.risk-list button > i { display: grid; width: 33px; height: 33px; place-items: center; border: 1px solid #d3ad36; border-radius: 4px; background: rgb(255 241 168 / 55%); color: #715916; font-size: 10px; font-style: normal; font-weight: 900; }
.risk-list button > i.high { border-color: #c66a8f; background: rgb(238 145 187 / 20%); color: #9a3f69; }
.risk-list button > span { min-width: 0; }
.risk-list strong, .risk-list small, .risk-list b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.risk-list strong { font-size: 11px; }
.risk-list small { margin-top: 4px; color: #817a99; font-size: 9px; }
.risk-list b { margin-top: 5px; color: var(--purple-deep); font-size: 9px; }

.stable-state { display: grid; min-height: 170px; place-items: center; align-content: center; color: #77708e; text-align: center; }
.stable-state strong { color: #28766e; }
.stable-state span { margin-top: 7px; font-size: 10px; }
.empty-state { min-height: 420px; padding: 30px; text-align: center; }
.empty-state p { color: var(--ink-soft); font-size: 11px; }
.assistant-edge-trigger { position: fixed; top: 50%; right: 0; z-index: 8; display: inline-flex; align-items: center; gap: 5px; padding: 13px 8px 13px 9px; border: 1px solid var(--purple-deep); border-right: 0; border-radius: 6px 0 0 6px; background: var(--purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 25%); color: #fff; cursor: pointer; font-size: 12px; font-weight: 800; writing-mode: vertical-rl; transform: translateY(-50%); }
.assistant-edge-trigger:hover { background: #7066bf; transform: translate(-2px, -50%); }
.drawer-intro { margin-bottom: 15px; padding: 10px 12px; border-left: 3px solid var(--mint-strong); background: #effafa; color: #55727b; font-size: 12px; line-height: 1.6; }
.question-starters { display: grid; gap: 9px; }
.question-starters button { padding: 10px 12px; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--yellow); color: var(--ink); text-align: left; cursor: pointer; font-weight: 700; }
.question-starters button:nth-child(2) { background: rgb(238 145 187 / 22%); }
.question-starters button:nth-child(3) { background: rgb(157 228 235 / 32%); }
.conversation-list { display: grid; max-height: calc(100vh - 260px); gap: 10px; overflow-y: auto; }
.message { padding: 10px 12px; border-radius: 5px; color: var(--ink); font-size: 12px; line-height: 1.6; }
.message.user { background: rgb(129 120 207 / 16%); }
.message.assistant { background: rgb(157 228 235 / 25%); }
.message p { margin: 0; }
.message strong, .message small { display: block; margin-top: 6px; }
.message small { color: #766f90; font-size: 9px; }
.ask-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-top: 14px; }

.teacher-analysis-page button, .teacher-analysis-page :deep(.el-button) { white-space: nowrap; word-break: keep-all; transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, border-color .2s ease; }
.teacher-analysis-page button:focus-visible, .teacher-analysis-page :deep(.el-button:focus-visible) { outline: 3px solid rgb(82 187 196 / 42%); outline-offset: 2px; }

@media (max-width: 1120px) {
  .analysis-layout { grid-template-columns: 196px minmax(0, 1fr); gap: 18px; }
  .accuracy-toolbar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .accuracy-filter-wrap { grid-column: 1 / -1; }
  .question-row { grid-template-columns: 82px minmax(190px, 1fr) 54px 54px minmax(130px, .55fr); }
}

@media (max-width: 880px) {
  .analysis-layout { grid-template-columns: minmax(0, 1fr); }
  .analysis-sidebar { position: static; height: auto; min-height: 0; padding: 11px; }
  .sidebar-brand, .sidebar-snapshot { display: none; }
  .analysis-nav { display: flex; gap: 7px; margin: 0; overflow-x: auto; padding-bottom: 3px; scrollbar-width: none; }
  .analysis-nav::-webkit-scrollbar { display: none; }
  .analysis-nav button { grid-template-columns: 27px auto; min-width: 137px; min-height: 51px; }
  .analysis-nav button > .el-icon:first-child { width: 27px; height: 27px; }
  .analysis-nav small, .nav-arrow, .analysis-nav button > b { display: none; }
  .overview-grid, .student-detail-grid, .course-risk-grid { grid-template-columns: 1fr; }
  .student-notes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .student-row { grid-template-columns: 38px minmax(110px, .8fr) 82px 70px minmax(160px, 1.1fr) 18px; }
  .student-list { overflow-x: auto; }
  .student-row { min-width: 720px; }
  .question-table { overflow-x: auto; }
  .question-row { min-width: 720px; }
}

@media (max-width: 640px) {
  .teacher-analysis-page { padding: 14px 13px 38px; }
  .content-header { min-height: 82px; align-items: flex-start; }
  .content-header h1 { font-size: 27px; }
  .content-header p { max-width: 260px; }
  .header-actions { align-items: flex-end; flex-direction: column; }
  .class-select { width: 172px; }
  .header-actions :deep(.el-button) { width: 40px; min-width: 40px; padding: 0; }
  .header-actions :deep(.el-button span) { display: none; }
  .focus-banner { min-height: 270px; align-items: flex-start; padding: 22px 18px; }
  .banner-copy { max-width: 100%; }
  .banner-copy h2 { font-size: 23px; }
  .banner-copy p { max-width: 82%; }
  .banner-orbit { position: absolute; right: -48px; bottom: -25px; opacity: .46; transform: scale(.72); }
  .summary-strip, .accuracy-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .summary-cell:nth-child(2), .accuracy-summary > div:nth-child(2) { border-right: 0; }
  .summary-cell:nth-child(-n+2), .accuracy-summary > div:nth-child(-n+2) { border-bottom: 1px solid rgb(61 53 100 / 12%); }
  .summary-cell, .accuracy-summary > div { padding: 14px 11px; }
  .summary-cell strong, .accuracy-summary strong { font-size: 25px; }
  .deadline-strip { padding: 16px 13px; }
  .deadline-list { grid-template-columns: minmax(0, 1fr); }
  .deadline-item { grid-template-columns: 33px minmax(0, 1fr) auto; }
  .deadline-item > .el-icon { display: none; }
  .deadline-item > b { grid-column: 2; justify-self: start; }
  .student-heading { align-items: stretch; flex-direction: column; }
  .state-filter { max-width: 100%; overflow-x: auto; }
  .student-directory { padding: 16px 13px; }
  .student-directory { margin-right: -13px; margin-left: -13px; border-right: 0; border-left: 0; border-radius: 0; }
  .student-notes { grid-template-columns: 1fr; }
  .ability-panel, .student-note, .mix-panel, .risk-panel { padding: 16px 13px; }
  .accuracy-workbench { padding: 13px; }
  .accuracy-toolbar { grid-template-columns: 1fr; padding: 12px; }
  .accuracy-filter-wrap { grid-column: auto; }
  .accuracy-filter { display: flex; max-width: 100%; overflow-x: auto; }
  .practice-group > header { align-items: flex-start; flex-direction: column; gap: 7px; }
  .mix-body { grid-template-columns: 1fr; justify-items: center; }
  .mix-legend { width: 100%; }
  .assistant-edge-trigger { top: auto; bottom: 20px; padding: 9px 11px; border-right: 1px solid var(--purple-deep); writing-mode: horizontal-tb; transform: none; }
  .assistant-edge-trigger:hover { transform: translateY(-2px); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; transition-duration: .01ms !important; }
}
</style>

<style>
@import '@/assets/creative-lab.css';
</style>
