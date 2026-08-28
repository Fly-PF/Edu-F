<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  ChatDotRound,
  Collection,
  Compass,
  DataAnalysis,
  DocumentChecked,
  HomeFilled,
  MagicStick,
  Reading,
  Refresh,
  TrendCharts,
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import AbilityRadar from '@/components/learning/AbilityRadar.vue'
import StudentWrongBooks from '@/components/learning/StudentWrongBooks.vue'
import {
  askStudentLearningAssistant,
  getStudentGrowthOverview,
  refreshStudentCourseRecommendations,
} from '@/api/learningAnalysis'
import { isCourseCompleted } from '@/utils/courseCompletion'

const router = useRouter()
const loading = ref(false)
const refreshing = ref(false)
const recommending = ref(false)
const asking = ref(false)
const assistantVisible = ref(false)
const activeSection = ref('overview')
const overview = ref(null)
const question = ref('')
const conversation = ref([])

const profile = computed(() => overview.value?.abilityProfile || {
  overallScore: 0,
  level: '暂无数据',
  dataConfidence: 0,
  summary: '完成课程学习后会形成能力画像。',
  pattern: '数据积累中',
  balanceScore: 0,
  dimensions: [],
  strengths: [],
  gaps: [],
  nextActions: [],
})
const alerts = computed(() => overview.value?.riskAlerts || [])
const courses = computed(() => overview.value?.courses || [])
const courseDeadlines = computed(() => courses.value
  .filter(course => String(course?.deadline || '').trim() && !isCourseCompleted(course))
  .slice()
  .sort((first, second) => deadlineTimestamp(first.deadline) - deadlineTimestamp(second.deadline)))
const deadlineEmptyText = computed(() => courses.value.some(course => String(course?.deadline || '').trim())
  ? '已完成课程无需提醒'
  : '当前课程未设置截止时间')
const nextDeadline = computed(() => courseDeadlines.value[0] || null)
const recommendations = computed(() => overview.value?.recommendations || [])
const learningProfile = computed(() => overview.value?.learningProfile || {
  shares: [],
  totalStudyMinutes: 0,
  dominantType: '暂无学习记录',
  insight: '',
})
const practiceEvidence = computed(() => overview.value?.practiceEvidence || {
  totalPractices: 0,
  reviewedPractices: 0,
  pendingPractices: 0,
  averageScore: 0,
  wrongQuestionCount: 0,
  scores: [],
  wrongQuestions: [],
})
const reviewedPractices = computed(() => practiceEvidence.value.scores || [])
const wrongQuestions = computed(() => practiceEvidence.value.wrongQuestions || [])
const practiceSummary = computed(() => ({
  total: Number(practiceEvidence.value.totalPractices || 0),
  reviewed: Number(practiceEvidence.value.reviewedPractices || 0),
  pending: Number(practiceEvidence.value.pendingPractices || 0),
  average: Number(practiceEvidence.value.averageScore || 0),
}))

const navigation = computed(() => [
  { id: 'overview', label: '学习总览', hint: '今天先做什么', icon: HomeFilled },
  { id: 'ability', label: '能力画像', hint: '看见成长变化', icon: DataAnalysis },
  { id: 'wrong-books', label: '错题本', hint: '整理与复盘', icon: Collection, badge: wrongQuestions.value.length },
  { id: 'courses', label: '课程记录', hint: '进度与推荐', icon: Reading },
])

const sectionMeta = computed(() => ({
  overview: { eyebrow: 'LEARNING HOME', title: '我的学习总览', description: '先看重点，再决定今天的学习方向。' },
  ability: { eyebrow: 'ABILITY PROFILE', title: '我的能力画像', description: '课程进度、学习投入和练习反馈共同形成这份画像。' },
  'wrong-books': { eyebrow: 'SMART REVIEW', title: '错题本', description: '把真实错题分门别类，复盘时更快找到重点。' },
  courses: { eyebrow: 'COURSE JOURNEY', title: '课程记录与推荐', description: '继续上次的课程，也可以探索下一门适合自己的课。' },
})[activeSection.value])

const chartColors = ['#8178cf', '#52bbc4', '#e3ba3d', '#ee91bb', '#557f9d', '#70a75a']
const profilePieStyle = computed(() => {
  const shares = learningProfile.value.shares?.filter(item => Number(item.share) > 0) || []
  if (!shares.length) return { background: '#ebeaf2' }
  let offset = 0
  const stops = shares.map((item, index) => {
    const start = offset
    offset += Number(item.share || 0)
    return `${chartColors[index % chartColors.length]} ${start}% ${offset}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

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

function riskClass(level) {
  return { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }[level] || 'low'
}

function sourceLabel(source) {
  return source === 'MODEL' ? '大模型基于真实学情回答' : '基于真实学情的规则建议（模型未连接）'
}

function practiceLabel(item) {
  const title = String(item?.title ?? item?.practiceTitle ?? '').trim()
  if (!title) return '练习反馈'
  return /^\d+$/.test(title) ? `练习 ${title}` : title
}

function openCourse(item) {
  if (!item?.courseId) return
  router.push({ name: 'course-learn', params: { courseId: item.courseId } })
}

function openRecommendedCourse(item) {
  if (!item?.courseType) return
  router.push({ name: 'student-platform-courses', query: { courseType: item.courseType } })
}

function openPractice(item) {
  const practiceId = item?.practiceId || item?.id
  if (!practiceId) return
  router.push({ name: 'student-practice-take', params: { practiceId } })
}

function openPracticeCenter() {
  router.push({ name: 'student-practices' })
}

function switchSection(section) {
  activeSection.value = section
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function loadOverview() {
  loading.value = true
  try {
    overview.value = await getStudentGrowthOverview()
  } catch (error) {
    overview.value = null
    ElMessage.error(error.message || '学情画像加载失败')
  } finally {
    loading.value = false
  }
}

async function refresh() {
  refreshing.value = true
  await loadOverview()
  refreshing.value = false
  ElMessage.success('已按最新学习记录更新')
}

async function refreshRecommendations() {
  recommending.value = true
  try {
    overview.value = await refreshStudentCourseRecommendations()
    ElMessage.success('课程推荐已更新')
  } catch (error) {
    ElMessage.error(error.message || '课程推荐更新失败')
  } finally {
    recommending.value = false
  }
}

function useQuestion(value) {
  question.value = value
  assistantVisible.value = true
}

async function askAssistant() {
  const value = question.value.trim()
  if (!value || asking.value) return
  conversation.value.push({ role: 'user', text: value })
  question.value = ''
  asking.value = true
  try {
    const reply = await askStudentLearningAssistant({ question: value })
    conversation.value.push({ role: 'assistant', ...reply })
  } catch (error) {
    ElMessage.error(error.message || 'AI 学情助手暂时无法回答')
  } finally {
    asking.value = false
  }
}

onMounted(loadOverview)
</script>

<template>
  <main v-loading="loading" class="analysis-page student-analysis-page">
    <div class="analysis-layout">
      <aside class="analysis-sidebar">
        <div class="sidebar-brand">
          <span class="brand-mark"><Compass /></span>
          <div><strong>成长探索站</strong><small>LEARNING LAB</small></div>
        </div>

        <nav class="analysis-nav" aria-label="学情分析导航">
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

        <div class="sidebar-score">
          <span>当前能力值</span>
          <strong>{{ profile.overallScore }}</strong>
          <small>{{ profile.level }} · 可信度 {{ profile.dataConfidence }}%</small>
        </div>
      </aside>

      <section class="analysis-content">
        <header class="content-header">
          <div>
            <span class="eyebrow">{{ sectionMeta.eyebrow }}</span>
            <h1>{{ sectionMeta.title }}</h1>
            <p>{{ sectionMeta.description }}</p>
          </div>
          <el-button :loading="refreshing" title="刷新最新学情" aria-label="刷新最新学情" @click="refresh">
            <el-icon><Refresh /></el-icon><span>刷新</span>
          </el-button>
        </header>

        <template v-if="overview">
          <div v-show="activeSection === 'overview'" class="section-view overview-view">
            <section class="explore-banner">
              <div class="banner-copy">
                <span>{{ nextDeadline ? '课程截止提醒' : '今日探索任务' }}</span>
                <template v-if="nextDeadline">
                  <h2>「{{ nextDeadline.courseName }}」{{ deadlineMeta(nextDeadline.deadline).tone === 'overdue' ? '已到截止时间' : '即将截止' }}</h2>
                  <p>截止时间：{{ nextDeadline.deadline }} · 当前进度 {{ nextDeadline.progress }}%，{{ deadlineMeta(nextDeadline.deadline).label }}。</p>
                </template>
                <template v-else>
                  <h2>{{ alerts.length ? `先完成「${alerts[0].courseName}」的下一步` : '保持节奏，继续下一章' }}</h2>
                  <p>{{ alerts.length ? alerts[0].action : '当前没有设置课程截止时间，按计划继续推进。' }}</p>
                </template>
                <el-button type="primary" @click="nextDeadline ? openCourse(nextDeadline) : (alerts.length ? openCourse(alerts[0]) : switchSection('courses'))">
                  {{ nextDeadline || alerts.length ? '去课程处理' : '继续学习' }} <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
              <div class="banner-orbit" aria-hidden="true">
                <span class="orbit-ring" />
                <span class="orbit-core">GO</span>
                <i class="orbit-note idea">IDEA</i>
                <i class="orbit-note make">MAKE</i>
                <b class="orbit-star">✦</b>
              </div>
            </section>

            <section class="summary-strip" aria-label="个人学习概览">
              <div class="summary-cell"><span>能力总览</span><strong>{{ profile.overallScore }}</strong><small>{{ profile.level }}</small></div>
              <div class="summary-cell"><span>画像可信度</span><strong>{{ profile.dataConfidence }}<em>%</em></strong><small>学习证据覆盖度</small></div>
              <div class="summary-cell"><span>课程平均推进</span><strong>{{ overview.summary.averageProgress }}<em>%</em></strong><small>{{ overview.summary.courseCount }} 门在学课程</small></div>
              <div class="summary-cell"><span>累计有效学习</span><strong>{{ overview.summary.studyMinutes }}<em>min</em></strong><small>章节学习记录</small></div>
            </section>

            <section class="deadline-strip panel" aria-label="课程截止提醒">
              <div class="panel-heading">
                <div><span class="section-label">COURSE DEADLINES</span><h2>课程截止提醒</h2><p>只展示班级下发记录中已设置的真实截止时间。</p></div>
                <span class="count-chip">{{ courseDeadlines.length }} 门</span>
              </div>
              <div v-if="courseDeadlines.length" class="deadline-list">
                <button v-for="course in courseDeadlines.slice(0, 3)" :key="`${course.classId}-${course.courseId}`" type="button" class="deadline-item" @click="openCourse(course)">
                  <span class="deadline-mark"><Reading /></span>
                  <span><strong>{{ course.courseName }}</strong><small>截止 {{ course.deadline }} · 当前进度 {{ course.progress }}%</small></span>
                  <b :class="deadlineMeta(course.deadline).tone">{{ deadlineMeta(course.deadline).label }}</b>
                  <el-icon><ArrowRight /></el-icon>
                </button>
              </div>
              <div v-else class="deadline-empty"><Reading /><span>{{ deadlineEmptyText }}</span></div>
            </section>

            <section class="overview-grid">
              <article class="panel alert-panel">
                <div class="panel-heading">
                  <div><span class="section-label">NEXT ACTION</span><h2>现在值得处理的事</h2><p>按照影响程度排列，每项都能直接行动。</p></div>
                  <span class="count-chip">{{ alerts.length }} 项</span>
                </div>
                <div v-if="alerts.length" class="alert-list">
                  <section v-for="item in alerts.slice(0, 3)" :key="`${item.courseId}-${item.riskScore}`" class="alert-item">
                    <div class="alert-top"><strong>{{ item.courseName }}</strong><span class="risk-chip" :class="riskClass(item.riskLevel)">风险 {{ item.riskScore }}</span></div>
                    <p>{{ item.evidence }}</p>
                    <div class="alert-action"><span>{{ item.nextChapter || '课程复盘' }}</span><b>{{ item.action }}</b></div>
                    <el-button text @click="openCourse(item)">去学习 <el-icon><ArrowRight /></el-icon></el-button>
                  </section>
                </div>
                <div v-else class="stable-state"><strong>当前状态稳定</strong><span>继续完成正在学习课程的下一章节，画像会随记录更新。</span></div>
              </article>

              <article class="panel practice-panel">
                <div class="panel-heading">
                  <div><span class="section-label">PRACTICE PULSE</span><h2>练习反馈</h2><p>只统计已经提交和批改的真实练习。</p></div>
                  <el-button text @click="openPracticeCenter">去练习 <el-icon><ArrowRight /></el-icon></el-button>
                </div>
                <div class="practice-pulse">
                  <div class="practice-average"><span>平均得分</span><strong>{{ practiceSummary.reviewed ? `${practiceSummary.average}%` : '--' }}</strong><small>{{ practiceSummary.reviewed }} 份已反馈</small></div>
                  <div class="practice-facts">
                    <span><b>{{ practiceSummary.pending }}</b><small>待批改</small></span>
                    <span><b>{{ practiceSummary.total }}</b><small>练习总数</small></span>
                    <span><b>{{ wrongQuestions.length }}</b><small>真实错题</small></span>
                  </div>
                </div>
                <div v-if="reviewedPractices.length" class="recent-practice-list">
                  <button v-for="item in reviewedPractices.slice(0, 3)" :key="item.practiceId" type="button" @click="openPractice(item)">
                    <span>{{ item.score }}<small>/{{ item.totalScore }}</small></span>
                    <div><strong>{{ practiceLabel(item) }}</strong><small>{{ item.courseName }}</small></div>
                    <el-icon><ArrowRight /></el-icon>
                  </button>
                </div>
                <div v-else class="practice-empty"><DocumentChecked /><span>获得老师反馈后，这里会出现练习记录。</span></div>
                <button class="wrong-book-shortcut" type="button" @click="switchSection('wrong-books')">
                  <span><Collection /></span>
                  <div><strong>整理错题本</strong><small>{{ wrongQuestions.length ? `${wrongQuestions.length} 道题等待分类复盘` : '当前没有需要整理的错题' }}</small></div>
                  <el-icon><ArrowRight /></el-icon>
                </button>
              </article>
            </section>
          </div>

          <div v-show="activeSection === 'ability'" class="section-view ability-view">
            <section class="ability-grid">
              <article class="panel ability-panel">
                <div class="panel-heading"><div><span class="section-label">ABILITY RADAR</span><h2>能力雷达</h2><p>{{ profile.summary }}</p></div><el-icon><DataAnalysis /></el-icon></div>
                <AbilityRadar :profile="profile" />
                <div class="evidence-sources" aria-label="能力画像证据来源">
                  <span class="evidence-source active"><DocumentChecked />课程学习</span>
                  <span class="evidence-source active"><DocumentChecked />学习练习</span>
                  <span class="evidence-source pending"><i />项目作品待接入</span>
                  <span class="evidence-source pending"><i />AI 展馆实践待接入</span>
                </div>
              </article>

              <aside class="ability-notes">
                <article class="panel note-panel strength-note">
                  <span class="section-label">STRENGTHS</span><h2>我的优势</h2>
                  <ul v-if="profile.strengths?.length"><li v-for="item in profile.strengths" :key="item">{{ item }}</li></ul>
                  <p v-else>继续积累学习记录后，会找到更稳定的优势。</p>
                </article>
                <article class="panel note-panel gap-note">
                  <span class="section-label">NEXT STEPS</span><h2>下一步</h2>
                  <ol v-if="profile.nextActions?.length"><li v-for="item in profile.nextActions" :key="item">{{ item }}</li></ol>
                  <p v-else>完成下一章课程，画像会给出更具体的行动。</p>
                </article>
              </aside>
            </section>

            <section class="panel mix-panel mix-panel-wide">
              <div class="panel-heading"><div><span class="section-label">LEARNING MIX</span><h2>课程主题投入</h2><p>{{ learningProfile.insight }}</p></div><el-icon><TrendCharts /></el-icon></div>
              <div class="mix-body">
                <div class="mix-pie" :style="profilePieStyle"><div><strong>{{ learningProfile.totalStudyMinutes }}</strong><span>分钟</span></div></div>
                <div class="mix-legend">
                  <div v-for="(item, index) in learningProfile.shares" :key="item.categoryKey"><i :style="{ background: chartColor(index) }" /><strong>{{ item.typeName }}</strong><small>{{ item.studyMinutes }} 分钟</small><b>{{ item.share }}%</b></div>
                </div>
              </div>
            </section>
          </div>

          <div v-if="activeSection === 'wrong-books'" class="section-view wrong-books-view">
            <StudentWrongBooks :wrong-questions="wrongQuestions" @open-practice="openPractice" />
          </div>

          <div v-show="activeSection === 'courses'" class="section-view courses-view">
            <section class="course-layout">
              <article class="panel course-panel">
                <div class="panel-heading"><div><span class="section-label">COURSE STATUS</span><h2>正在学习</h2><p>进度和时长来自每一章的学习记录。</p></div><span class="count-chip">{{ courses.length }} 门</span></div>
                <div v-if="courses.length" class="course-list">
                  <button v-for="course in courses" :key="`${course.classId}-${course.courseId}`" type="button" class="course-row" @click="openCourse(course)">
                    <span class="course-mark">{{ course.courseName.slice(0, 1) }}</span>
                    <span class="course-copy"><strong>{{ course.courseName }}</strong><small>{{ course.nextChapter }} · {{ course.studyMinutes }} 分钟</small><small :class="{ 'course-deadline': course.deadline }">{{ course.deadline ? `截止 ${course.deadline}` : '未设置截止时间' }}</small><i><b :style="{ width: `${course.progress}%` }" /></i></span>
                    <span>{{ course.progress }}%</span><el-icon><ArrowRight /></el-icon>
                  </button>
                </div>
                <div v-else class="course-empty"><Reading /><strong>还没有课程学习记录</strong><span>选择一门课程开始探索吧。</span></div>
              </article>

              <article class="panel recommendation-panel">
                <div class="panel-heading">
                  <div><span class="section-label">AI COURSE MATCH</span><h2>适合下一步探索</h2><p>从课程库已有课程中匹配。</p></div>
                  <el-button :loading="recommending" title="更新课程推荐" aria-label="更新课程推荐" @click="refreshRecommendations"><el-icon><MagicStick /></el-icon></el-button>
                </div>
                <div v-if="recommendations.length" class="recommendation-list">
                  <button v-for="item in recommendations" :key="item.courseId" type="button" @click="openRecommendedCourse(item)">
                    <span>{{ item.score }}</span><div><strong>{{ item.courseName }}</strong><small>{{ item.courseCategory || item.courseTypeName }} · {{ item.reason }}</small></div><el-icon><ArrowRight /></el-icon>
                  </button>
                </div>
                <el-empty v-else description="课程库暂无可推荐课程" :image-size="64" />
              </article>
            </section>
          </div>
        </template>

        <section v-else class="panel empty-state"><el-empty description="暂无可分析的学习数据" /><p>完成课程章节学习后，这里会生成能力画像和具体建议。</p></section>
      </section>
    </div>

    <button class="assistant-edge-trigger" type="button" aria-label="打开 AI 学习对话" @click="assistantVisible = true">
      <el-icon><ChatDotRound /></el-icon><span>问 AI</span>
    </button>
    <el-drawer v-model="assistantVisible" class="assistant-drawer" title="AI 学习对话" direction="rtl" size="min(420px, 92vw)">
      <div class="drawer-intro">围绕你的课程进度、练习反馈和能力画像回答。</div>
      <div v-if="!conversation.length" class="question-starters">
        <button type="button" @click="useQuestion('我目前最需要先补哪一门课？')">我目前最需要先补哪一门课？</button>
        <button type="button" @click="useQuestion('我的学习坚持能力为什么偏低？')">我的学习坚持能力为什么偏低？</button>
        <button type="button" @click="useQuestion('本周怎样安排学习更合适？')">本周怎样安排学习更合适？</button>
      </div>
      <div v-else class="conversation-list drawer-conversation">
        <div v-for="(item, index) in conversation" :key="index" class="message" :class="item.role">
          <p>{{ item.text || item.answer }}</p>
          <template v-if="item.role === 'assistant'"><strong>下一步：{{ item.nextStep }}</strong><small>{{ sourceLabel(item.source) }} · {{ (item.references || []).join('；') }}</small></template>
        </div>
      </div>
      <div class="ask-row"><el-input v-model="question" maxlength="300" placeholder="例如：我为什么需要补这门课？" @keyup.enter="askAssistant" /><el-button type="primary" :loading="asking" @click="askAssistant">提问</el-button></div>
    </el-drawer>
  </main>
</template>

<style scoped>
.student-analysis-page {
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

.analysis-layout {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr);
  max-width: 1540px;
  gap: 24px;
  margin: 0 auto;
}

.analysis-sidebar {
  position: sticky;
  top: 18px;
  display: flex;
  height: calc(100vh - 36px);
  min-height: 520px;
  flex-direction: column;
  padding: 18px 13px;
  border: 1.5px solid rgb(61 53 100 / 28%);
  border-radius: 8px;
  background: rgb(255 255 255 / 94%);
  box-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
}

.sidebar-brand { display: flex; align-items: center; gap: 10px; padding: 2px 7px 17px; border-bottom: 1px dashed rgb(61 53 100 / 24%); }
.brand-mark { display: grid; width: 37px; height: 37px; flex: 0 0 auto; place-items: center; border: 1px solid var(--purple-deep); border-radius: 6px; background: var(--yellow); box-shadow: 2px 3px 0 rgb(61 53 100 / 14%); }
.brand-mark svg { width: 19px; }
.sidebar-brand strong,
.sidebar-brand small { display: block; }
.sidebar-brand strong { color: var(--ink); font-family: "Trebuchet MS", "Microsoft YaHei", sans-serif; font-size: 15px; font-weight: 900; }
.sidebar-brand small { margin-top: 3px; color: #8982a1; font-size: 9px; font-weight: 800; }

.analysis-nav { display: grid; gap: 7px; margin-top: 17px; }
.analysis-nav button { display: grid; grid-template-columns: 32px minmax(0, 1fr) 18px; align-items: center; gap: 9px; width: 100%; min-height: 60px; padding: 9px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.analysis-nav button > .el-icon:first-child { display: grid; width: 31px; height: 31px; place-items: center; border: 1px solid rgb(61 53 100 / 24%); border-radius: 5px; background: rgb(232 228 255 / 65%); color: var(--purple-deep); }
.analysis-nav button:nth-child(2) > .el-icon:first-child { background: rgb(157 228 235 / 38%); }
.analysis-nav button:nth-child(3) > .el-icon:first-child { background: rgb(238 145 187 / 22%); }
.analysis-nav button:nth-child(4) > .el-icon:first-child { background: rgb(255 241 168 / 55%); }
.analysis-nav button:hover { border-color: rgb(61 53 100 / 22%); background: rgb(157 228 235 / 13%); }
.analysis-nav button.active { border-color: var(--purple-deep); background: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 12%); transform: translate(-1px, -1px); }
.analysis-nav button.active::before { position: absolute; width: 3px; height: 30px; margin-left: -10px; border-radius: 2px; background: var(--purple); content: ""; }
.analysis-nav button { position: relative; }
.analysis-nav button > span { min-width: 0; }
.analysis-nav strong,
.analysis-nav small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.analysis-nav strong { font-size: 12px; }
.analysis-nav small { margin-top: 4px; color: #817a99; font-size: 9px; }
.analysis-nav button > b { display: grid; min-width: 20px; height: 20px; place-items: center; border-radius: 4px; background: var(--pink); color: #fff; font-size: 9px; }
.nav-arrow { color: #978fad; font-size: 12px; }

.sidebar-score { display: grid; margin-top: auto; padding: 14px; border: 1px solid rgb(61 53 100 / 24%); border-radius: 6px; background: linear-gradient(135deg, rgb(232 228 255 / 72%), rgb(255 241 168 / 48%)); }
.sidebar-score span { color: var(--ink-soft); font-size: 10px; font-weight: 800; }
.sidebar-score strong { margin: 6px 0 4px; color: var(--purple-deep); font-family: "Trebuchet MS", sans-serif; font-size: 31px; line-height: 1; }
.sidebar-score small { color: #7b7497; font-size: 9px; }

.analysis-content { min-width: 0; }
.content-header { display: flex; min-height: 88px; align-items: flex-end; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
.content-header h1 { margin: 5px 0 4px; color: var(--ink); font-family: "Trebuchet MS", "Microsoft YaHei", sans-serif; font-size: 34px; font-weight: 900; line-height: 1.15; }
.content-header p { margin: 0; color: var(--ink-soft); font-size: 12px; line-height: 1.6; }
.eyebrow,
.section-label { color: var(--purple-deep); font-size: 10px; font-weight: 900; letter-spacing: .1em; }
.content-header > .el-button { min-width: 78px; height: 39px; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--yellow); color: var(--ink); box-shadow: 3px 4px 0 rgb(61 53 100 / 18%); font-weight: 900; }
.content-header > .el-button:hover { background: #ffe982; box-shadow: 5px 6px 0 rgb(61 53 100 / 24%); transform: translate(-2px, -2px); }

.section-view { min-width: 0; }
.explore-banner { position: relative; display: flex; min-height: 210px; align-items: center; justify-content: space-between; gap: 30px; overflow: hidden; margin-bottom: 18px; padding: clamp(24px, 4vw, 42px); border: 1.5px solid rgb(61 53 100 / 30%); border-radius: 8px; background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%); box-shadow: 7px 8px 0 rgb(61 53 100 / 18%); }
.banner-copy { position: relative; z-index: 2; max-width: 650px; }
.banner-copy > span { display: inline-block; padding: 5px 8px; border: 1px solid var(--purple-deep); border-radius: 4px; background: var(--yellow); color: var(--ink); box-shadow: 2px 3px 0 rgb(61 53 100 / 14%); font-size: 10px; font-weight: 900; transform: rotate(-1deg); }
.banner-copy h2 { max-width: 620px; margin: 13px 0 8px; color: var(--ink); font-family: "Trebuchet MS", "Microsoft YaHei", sans-serif; font-size: 27px; font-weight: 900; line-height: 1.35; }
.banner-copy p { max-width: 600px; margin: 0 0 19px; color: #61597f; font-size: 13px; line-height: 1.7; }
.banner-copy :deep(.el-button) { min-height: 39px; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 28%); font-weight: 900; }
.banner-orbit { position: relative; width: 240px; height: 160px; flex: 0 0 240px; }
.orbit-ring { position: absolute; inset: 19px 6px; border: 2px dashed rgb(61 53 100 / 34%); border-radius: 50%; animation: orbit-spin 15s linear infinite; }
.orbit-core { position: absolute; top: 50%; left: 50%; display: grid; width: 72px; height: 72px; place-items: center; border: 2px solid var(--purple-deep); border-radius: 50%; background: var(--mint); box-shadow: 5px 6px 0 rgb(61 53 100 / 18%); color: var(--ink); font-family: "Trebuchet MS", sans-serif; font-size: 22px; font-weight: 900; transform: translate(-50%, -50%); }
.orbit-note { position: absolute; padding: 7px 9px; border: 1px solid var(--purple-deep); border-radius: 4px; background: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 14%); color: var(--ink); font-size: 10px; font-style: normal; font-weight: 900; }
.orbit-note.idea { top: 4px; right: 19px; transform: rotate(4deg); }
.orbit-note.make { bottom: 6px; left: 4px; background: var(--yellow); transform: rotate(-4deg); }
.orbit-star { position: absolute; top: 20px; left: 27px; color: var(--pink); font-size: 26px; animation: star-breathe 5s ease-in-out infinite; }
@keyframes orbit-spin { to { transform: rotate(360deg); } }
@keyframes star-breathe { 50% { opacity: .45; transform: scale(.88); } }

.summary-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); margin-bottom: 18px; overflow: hidden; border: 1.5px solid rgb(61 53 100 / 26%); border-radius: 8px; background: rgb(255 255 255 / 94%); box-shadow: 4px 5px 0 rgb(61 53 100 / 12%); }
.summary-cell { min-width: 0; padding: 17px; border-top: 4px solid var(--pink); border-right: 1px solid rgb(61 53 100 / 12%); }
.summary-cell:nth-child(2) { border-top-color: var(--purple); }
.summary-cell:nth-child(3) { border-top-color: var(--mint-strong); }
.summary-cell:nth-child(4) { border-top-color: #d8b332; border-right: 0; }
.summary-cell span,
.summary-cell strong,
.summary-cell small { display: block; }
.summary-cell span { color: var(--ink-soft); font-size: 10px; font-weight: 800; }
.summary-cell strong { margin: 8px 0 4px; color: var(--ink); font-family: "Trebuchet MS", sans-serif; font-size: 29px; line-height: 1; }
.summary-cell em { font-size: 12px; font-style: normal; }
.summary-cell small { overflow: hidden; color: #847d9d; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }

.deadline-strip { margin-bottom: 18px; padding: 18px 20px; background: linear-gradient(135deg, #fff, rgb(255 241 168 / 24%)); }
.deadline-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.deadline-item { display: grid; grid-template-columns: 35px minmax(0, 1fr) auto 14px; align-items: center; gap: 9px; min-width: 0; padding: 11px; border: 1px solid rgb(61 53 100 / 19%); border-radius: 5px; background: #fff; color: var(--ink); text-align: left; cursor: pointer; }
.deadline-item:hover { border-color: var(--purple-deep); box-shadow: 3px 4px 0 rgb(61 53 100 / 13%); transform: translate(-1px, -1px); }
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

.overview-grid,
.ability-grid,
.course-layout { display: grid; grid-template-columns: minmax(0, 1.08fr) minmax(330px, .92fr); gap: 18px; }
.panel { border: 1.5px solid rgb(61 53 100 / 26%); border-radius: 8px; background: rgb(255 255 255 / 96%); box-shadow: 4px 5px 0 rgb(61 53 100 / 12%); }
.alert-panel,
.practice-panel,
.ability-panel,
.note-panel,
.mix-panel,
.course-panel,
.recommendation-panel { min-width: 0; padding: 20px; }
.alert-panel { background: linear-gradient(135deg, #fff, rgb(255 241 168 / 23%)); }
.practice-panel { background: linear-gradient(135deg, #fff, rgb(157 228 235 / 14%)); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.panel-heading h2 { margin: 4px 0; color: var(--ink); font-family: "Trebuchet MS", "Microsoft YaHei", sans-serif; font-size: 20px; font-weight: 900; }
.panel-heading p { margin: 0; color: #7c7598; font-size: 11px; line-height: 1.6; }
.count-chip { flex: 0 0 auto; padding: 5px 8px; border: 1px solid var(--purple-deep); border-radius: 4px; background: var(--yellow); color: var(--ink); font-size: 10px; font-weight: 900; transform: rotate(1deg); }

.alert-list { display: grid; gap: 9px; }
.alert-item { padding: 12px 13px; border: 1px solid rgb(238 145 187 / 36%); border-left: 4px solid var(--pink); border-radius: 5px; background: rgb(255 255 255 / 82%); }
.alert-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.alert-top strong { min-width: 0; overflow: hidden; color: var(--ink); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.risk-chip { flex: 0 0 auto; padding: 3px 6px; border: 1px solid; border-radius: 4px; font-size: 9px; font-weight: 900; }
.risk-chip.high { border-color: #c66a8f; background: rgb(238 145 187 / 22%); color: #973e66; }
.risk-chip.medium { border-color: #d3ad36; background: rgb(255 241 168 / 68%); color: #725a16; }
.risk-chip.low { border-color: var(--mint-strong); background: rgb(157 228 235 / 38%); color: #26727b; }
.alert-item > p { margin: 7px 0; color: #746d8e; font-size: 10px; line-height: 1.55; }
.alert-action { display: flex; gap: 6px; color: #746d8e; font-size: 10px; }
.alert-action b { color: var(--purple-deep); }
.alert-item :deep(.el-button) { height: auto; margin-top: 6px; padding: 0; color: var(--purple-deep); font-size: 10px; font-weight: 900; }
.stable-state { display: grid; min-height: 180px; place-items: center; align-content: center; text-align: center; }
.stable-state strong { color: #28766e; }
.stable-state span { max-width: 360px; margin-top: 7px; color: #797290; font-size: 11px; line-height: 1.6; }

.practice-pulse { display: grid; grid-template-columns: 130px minmax(0, 1fr); align-items: stretch; gap: 12px; }
.practice-average { display: grid; align-content: center; padding: 13px; border-left: 4px solid var(--purple); background: rgb(232 228 255 / 48%); }
.practice-average span,
.practice-average small { color: #776f93; font-size: 9px; }
.practice-average strong { margin: 5px 0; color: var(--purple-deep); font-size: 27px; line-height: 1; }
.practice-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border: 1px solid rgb(61 53 100 / 13%); }
.practice-facts span { display: grid; place-items: center; align-content: center; border-right: 1px solid rgb(61 53 100 / 12%); }
.practice-facts span:last-child { border-right: 0; }
.practice-facts b { color: var(--ink); font-size: 18px; }
.practice-facts small { margin-top: 3px; color: #847d9d; font-size: 8px; white-space: nowrap; }
.recent-practice-list { display: grid; margin-top: 12px; border-top: 1px solid rgb(61 53 100 / 12%); }
.recent-practice-list button { display: grid; grid-template-columns: 43px minmax(0, 1fr) 16px; align-items: center; gap: 9px; padding: 9px 3px; border: 0; border-bottom: 1px solid rgb(61 53 100 / 11%); background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.recent-practice-list button:hover { background: rgb(157 228 235 / 18%); }
.recent-practice-list button > span { display: grid; height: 34px; place-items: center; align-content: center; border: 1px solid rgb(61 53 100 / 22%); border-radius: 4px; background: rgb(157 228 235 / 31%); color: #26716b; font-size: 13px; font-weight: 900; }
.recent-practice-list button > span small { font-size: 8px; }
.recent-practice-list div { min-width: 0; }
.recent-practice-list strong,
.recent-practice-list div small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recent-practice-list strong { font-size: 11px; }
.recent-practice-list div small { margin-top: 3px; color: #847d9d; font-size: 9px; }
.practice-empty { display: flex; min-height: 80px; align-items: center; justify-content: center; gap: 8px; color: #7d7598; font-size: 10px; }
.wrong-book-shortcut { display: grid; grid-template-columns: 35px minmax(0, 1fr) 17px; align-items: center; gap: 9px; width: 100%; margin-top: 12px; padding: 10px; border: 1px solid var(--purple-deep); border-radius: 6px; background: rgb(238 145 187 / 15%); color: var(--ink); text-align: left; cursor: pointer; }
.wrong-book-shortcut:hover { box-shadow: 3px 4px 0 rgb(61 53 100 / 14%); transform: translate(-2px, -2px); }
.wrong-book-shortcut > span { display: grid; width: 33px; height: 33px; place-items: center; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--yellow); }
.wrong-book-shortcut > span svg { width: 17px; }
.wrong-book-shortcut div { min-width: 0; }
.wrong-book-shortcut strong,
.wrong-book-shortcut small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wrong-book-shortcut strong { font-size: 11px; }
.wrong-book-shortcut small { margin-top: 3px; color: #817a99; font-size: 9px; }

.ability-grid { grid-template-columns: minmax(0, 1.25fr) minmax(290px, .75fr); }
.ability-panel { background: linear-gradient(135deg, #fff, rgb(232 228 255 / 44%)); }
.panel-heading > .el-icon { color: var(--purple); font-size: 23px; }
.evidence-sources { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 13px; }
.evidence-source { display: inline-flex; align-items: center; gap: 5px; padding: 5px 7px; border: 1px solid rgb(61 53 100 / 22%); border-radius: 4px; color: #7a7394; font-size: 9px; font-weight: 800; white-space: nowrap; }
.evidence-source.active { border-color: rgb(82 187 196 / 58%); background: rgb(157 228 235 / 24%); color: #2a746f; }
.evidence-source i { width: 6px; height: 6px; border: 1px solid #958da9; border-radius: 50%; }
.ability-notes { display: grid; gap: 18px; }
.note-panel { min-height: 0; }
.note-panel h2 { margin: 5px 0 12px; color: var(--ink); font-size: 18px; }
.note-panel ul,
.note-panel ol { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.note-panel li { position: relative; padding: 9px 10px 9px 29px; border: 1px solid rgb(61 53 100 / 14%); border-radius: 5px; background: #fff; color: #625b7f; font-size: 11px; line-height: 1.55; }
.note-panel li::before { position: absolute; top: 10px; left: 10px; display: grid; width: 13px; height: 13px; place-items: center; border-radius: 3px; background: var(--mint); color: var(--ink); content: "✓"; font-size: 8px; font-weight: 900; }
.gap-note li::before { background: var(--yellow); content: "→"; }
.strength-note { background: linear-gradient(135deg, #fff, rgb(157 228 235 / 18%)); }
.gap-note { background: linear-gradient(135deg, #fff, rgb(255 241 168 / 24%)); }
.note-panel > p { color: #7a7394; font-size: 11px; line-height: 1.6; }
.mix-panel-wide { margin-top: 18px; background: linear-gradient(135deg, #fff, rgb(157 228 235 / 16%)); }
.mix-body { display: grid; grid-template-columns: 155px minmax(0, 1fr); align-items: center; gap: 24px; }
.mix-pie { display: grid; width: 148px; aspect-ratio: 1; place-items: center; border: 2px solid rgb(61 53 100 / 20%); border-radius: 50%; box-shadow: 3px 4px 0 rgb(61 53 100 / 12%); }
.mix-pie > div { display: grid; width: 84px; aspect-ratio: 1; place-items: center; align-content: center; border: 1px solid var(--purple-deep); border-radius: 50%; background: #fff; }
.mix-pie strong { color: var(--purple-deep); font-size: 24px; }
.mix-pie span { color: #7e7798; font-size: 9px; }
.mix-legend { display: grid; }
.mix-legend > div { display: grid; grid-template-columns: 9px minmax(0, 1fr) auto auto; align-items: center; gap: 9px; padding: 10px 3px; border-bottom: 1px solid rgb(61 53 100 / 12%); }
.mix-legend i { width: 9px; height: 9px; border-radius: 50%; }
.mix-legend strong { color: var(--ink); font-size: 11px; }
.mix-legend small { color: #827b9b; font-size: 9px; }
.mix-legend b { color: var(--purple-deep); font-size: 11px; }

.course-layout { align-items: start; }
.course-panel,
.recommendation-panel { background: rgb(255 255 255 / 96%); }
.course-list,
.recommendation-list { display: grid; }
.course-row { display: grid; grid-template-columns: 39px minmax(0, 1fr) auto 16px; align-items: center; gap: 10px; width: 100%; padding: 12px 2px; border: 0; border-bottom: 1px solid rgb(61 53 100 / 12%); background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.course-row:hover,
.recommendation-list button:hover { background: rgb(157 228 235 / 18%); }
.course-mark { display: grid; width: 37px; height: 37px; place-items: center; border: 1px solid var(--purple-deep); border-radius: 4px; background: var(--yellow); font-weight: 900; }
.course-copy { min-width: 0; }
.course-copy strong,
.course-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.course-copy strong { font-size: 11px; }
.course-copy small { margin-top: 3px; color: #827b9b; font-size: 9px; }
.course-copy small.course-deadline { color: #77612a; font-weight: 800; }
.course-copy i { display: block; height: 4px; margin-top: 7px; overflow: hidden; background: rgb(61 53 100 / 11%); }
.course-copy i b { display: block; height: 100%; background: var(--purple); }
.course-row > span:nth-last-of-type(1) { color: var(--purple-deep); font-size: 10px; font-weight: 900; }
.recommendation-panel .panel-heading > .el-button { width: 38px; height: 38px; flex: 0 0 auto; margin: 0; border: 1px solid var(--purple-deep); border-radius: 5px; background: var(--yellow); color: var(--ink); box-shadow: 2px 3px 0 rgb(61 53 100 / 16%); }
.recommendation-list button { display: grid; grid-template-columns: 43px minmax(0, 1fr) 17px; align-items: center; gap: 10px; padding: 12px 2px; border: 0; border-bottom: 1px solid rgb(61 53 100 / 12%); background: transparent; color: var(--ink); text-align: left; cursor: pointer; }
.recommendation-list button > span { display: grid; width: 40px; height: 37px; place-items: center; border: 1px solid var(--purple-deep); border-radius: 4px; background: rgb(157 228 235 / 34%); color: #25736f; font-size: 12px; font-weight: 900; }
.recommendation-list div { min-width: 0; }
.recommendation-list strong,
.recommendation-list small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.recommendation-list strong { font-size: 11px; }
.recommendation-list small { margin-top: 4px; color: #827b9b; font-size: 9px; }
.course-empty { display: grid; min-height: 340px; place-items: center; align-content: center; color: #7d7698; text-align: center; }
.course-empty svg { width: 35px; margin-bottom: 12px; color: var(--purple); }
.course-empty strong { color: var(--ink); }
.course-empty span { margin-top: 6px; font-size: 11px; }

.empty-state { min-height: 460px; padding: 30px; text-align: center; }
.empty-state p { color: var(--ink-soft); font-size: 12px; }
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
.message strong,
.message small { display: block; margin-top: 6px; }
.message small { color: #766f90; font-size: 9px; }
.ask-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-top: 14px; }

.student-analysis-page button,
.student-analysis-page :deep(.el-button) { white-space: nowrap; word-break: keep-all; transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, border-color .2s ease; }
.student-analysis-page button:focus-visible,
.student-analysis-page :deep(.el-button:focus-visible) { outline: 3px solid rgb(82 187 196 / 42%); outline-offset: 2px; }

@media (max-width: 1040px) {
  .analysis-layout { grid-template-columns: 196px minmax(0, 1fr); gap: 18px; }
  .overview-grid,
  .course-layout { grid-template-columns: 1fr; }
  .ability-grid { grid-template-columns: 1fr; }
  .ability-notes { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .deadline-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 760px) {
  .student-analysis-page { padding: 14px 13px 38px; }
  .analysis-layout { grid-template-columns: minmax(0, 1fr); }
  .analysis-sidebar { position: static; height: auto; min-height: 0; padding: 11px; }
  .sidebar-brand,
  .sidebar-score { display: none; }
  .analysis-nav { display: flex; gap: 7px; margin: 0; overflow-x: auto; padding-bottom: 3px; scrollbar-width: none; }
  .analysis-nav::-webkit-scrollbar { display: none; }
  .analysis-nav button { grid-template-columns: 27px auto; min-width: 137px; min-height: 51px; }
  .analysis-nav button > .el-icon:first-child { width: 27px; height: 27px; }
  .analysis-nav small,
  .nav-arrow,
  .analysis-nav button > b { display: none; }
  .content-header { min-height: 72px; align-items: center; }
  .content-header h1 { font-size: 27px; }
  .content-header p { max-width: 430px; }
  .content-header > .el-button { min-width: 40px; width: 40px; padding: 0; }
  .content-header > .el-button span { display: none; }
  .explore-banner { min-height: 250px; align-items: flex-start; }
  .banner-copy { max-width: 76%; }
  .banner-orbit { position: absolute; right: -45px; bottom: -24px; opacity: .48; transform: scale(.72); }
  .summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .summary-cell:nth-child(2) { border-right: 0; }
  .summary-cell:nth-child(-n+2) { border-bottom: 1px solid rgb(61 53 100 / 12%); }
  .deadline-list { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 520px) {
  .content-header { align-items: flex-start; }
  .content-header p { max-width: 260px; }
  .explore-banner { min-height: 275px; padding: 22px 18px; }
  .banner-copy { max-width: 100%; }
  .banner-copy h2 { font-size: 23px; }
  .banner-copy p { max-width: 88%; }
  .summary-cell { padding: 14px 11px; }
  .summary-cell strong { font-size: 25px; }
  .deadline-strip { padding: 16px 13px; }
  .deadline-item { grid-template-columns: 33px minmax(0, 1fr) auto; }
  .deadline-item > .el-icon { display: none; }
  .deadline-item > b { grid-column: 2; justify-self: start; }
  .overview-grid,
  .course-layout { gap: 14px; }
  .alert-panel,
  .practice-panel,
  .ability-panel,
  .note-panel,
  .mix-panel,
  .course-panel,
  .recommendation-panel { padding: 16px 13px; }
  .practice-pulse { grid-template-columns: 1fr; }
  .practice-facts { min-height: 68px; }
  .ability-notes { grid-template-columns: 1fr; }
  .mix-body { grid-template-columns: 1fr; justify-items: center; }
  .mix-legend { width: 100%; }
  .course-row { grid-template-columns: 37px minmax(0, 1fr) auto; }
  .course-row > .el-icon { display: none; }
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
