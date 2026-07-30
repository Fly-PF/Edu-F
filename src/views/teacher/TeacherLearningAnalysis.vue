<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowRight, ChatDotRound, DataAnalysis, Refresh, TrendCharts } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { getTeacherClassList } from '@/api/teacherClass'
import { askTeacherLearningAssistant, getTeacherGrowthDashboard } from '@/api/learningAnalysis'
import AbilityRadar from '@/components/learning/AbilityRadar.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const asking = ref(false)
const classes = ref([])
const dashboard = ref(null)
const selectedClassId = ref('')
const selectedStudentId = ref('')
const stateFilter = ref('ALL')
const question = ref('')
const conversation = ref([])

const stateMeta = {
  FOCUS: { label: '重点干预', tone: 'focus' },
  ATTENTION: { label: '需要关注', tone: 'attention' },
  STEADY: { label: '稳定推进', tone: 'steady' },
}
const chartColors = ['#287bb8', '#2b9671', '#d38b33', '#7b62c9', '#c45b76', '#4f8791']

const students = computed(() => dashboard.value?.studentAbilities || [])
const alerts = computed(() => dashboard.value?.riskAlerts || [])
const trend = computed(() => dashboard.value?.classTrend || { totalStudyMinutes: 0, activeStudents: 0, days: [] })
const classProfile = computed(() => dashboard.value?.classProfile || { shares: [], totalStudyMinutes: 0, insight: '' })
const summary = computed(() => dashboard.value?.summary || { studentCount: 0, averageProgress: 0, courseCount: 0 })
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
const trendMax = computed(() => Math.max(1, ...trend.value.days.map(item => Number(item.studyMinutes || 0))))
const trendPoints = computed(() => trend.value.days.map((item, index, days) => {
  const x = days.length === 1 ? 50 : (index * 100) / (days.length - 1)
  const y = 88 - (Number(item.studyMinutes || 0) / trendMax.value) * 68
  return `${x},${y}`
}).join(' '))
const classPieStyle = computed(() => {
  const shares = classProfile.value.shares?.filter(item => Number(item.share) > 0) || []
  if (!shares.length) return { background: '#e7edf3' }
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

function chartColor(index) {
  return chartColors[index % chartColors.length]
}

function stateInfo(student) {
  return stateMeta[student?.learningState] || stateMeta.ATTENTION
}

function sourceLabel(source) {
  return source === 'MODEL' ? 'DeepSeek 基于班级真实学情回答' : '基于真实学情的规则建议'
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
  await loadDashboard()
  ElMessage.success('已按最新学习记录更新画像')
}

function selectStudent(studentId) {
  selectedStudentId.value = String(studentId)
}

function useQuestion(value) {
  question.value = value
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
  await loadDashboard()
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
  <main v-loading="loading" class="analysis-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">AI TEACHING DIAGNOSIS</span>
        <h1>班级学习画像</h1>
        <p>先看每位学生的学习状态，再决定本周的教学重点。</p>
      </div>
      <div class="header-actions">
        <el-select v-model="selectedClassId" class="class-select" aria-label="选择班级">
          <el-option v-for="item in classes" :key="item.classId ?? item.id" :label="item.className" :value="String(item.classId ?? item.id)" />
        </el-select>
        <el-button circle title="刷新班级学情" aria-label="刷新班级学情" @click="refresh"><el-icon><Refresh /></el-icon></el-button>
      </div>
    </header>

    <template v-if="dashboard">
      <section class="summary-strip" aria-label="班级学习状态总览">
        <div class="summary-cell focus"><span>重点干预</span><strong>{{ stateCounts.FOCUS }}</strong><small>优先安排一对一或小组跟进</small></div>
        <div class="summary-cell attention"><span>需要关注</span><strong>{{ stateCounts.ATTENTION }}</strong><small>本周需要检查学习节奏</small></div>
        <div class="summary-cell steady"><span>稳定推进</span><strong>{{ stateCounts.STEADY }}</strong><small>保持节奏并完成下一章节</small></div>
        <div class="summary-cell"><span>近 7 天活跃</span><strong>{{ trend.activeStudents }}<em>/{{ summary.studentCount }}</em></strong><small>{{ trend.totalStudyMinutes }} 分钟真实学习记录</small></div>
      </section>

      <section class="decision-grid">
        <article class="panel decision-panel">
          <span class="section-label">THIS WEEK'S TEACHING PRIORITY</span>
          <template v-if="priorityStudent">
            <div class="decision-heading">
              <div>
                <h2>先跟进 {{ priorityStudent.studentName }}</h2>
                <p>{{ priorityStudent.priorityReason }}</p>
              </div>
              <span class="state-chip" :class="stateInfo(priorityStudent).tone">{{ stateInfo(priorityStudent).label }}</span>
            </div>
            <div class="decision-action"><span>建议动作</span><strong>{{ priorityStudent.recommendedAction }}</strong></div>
          </template>
          <div v-else class="stable-state"><strong>等待学习记录</strong><span>学生开始课程学习后会生成分层与教学重点。</span></div>
        </article>

        <article class="panel trend-panel">
          <div class="panel-heading"><div><span class="section-label">WEEKLY ACTIVITY</span><h2>近 7 天学习趋势</h2></div><el-icon><TrendCharts /></el-icon></div>
          <div class="trend-chart">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="近七天学习时长折线图"><line x1="0" y1="88" x2="100" y2="88" class="axis" /><line x1="0" y1="52" x2="100" y2="52" class="grid" /><polyline :points="trendPoints" class="trend-line" /></svg>
            <div class="trend-bars"><div v-for="item in trend.days" :key="item.date" class="trend-day"><i :style="{ height: `${Math.max(3, Number(item.studyMinutes || 0) / trendMax * 100)}%` }" /><strong>{{ item.studyMinutes }}</strong><small>{{ item.date }}</small></div></div>
          </div>
        </article>
      </section>

      <section class="panel matrix-panel">
        <div class="matrix-header">
          <div><span class="section-label">STUDENT LEARNING OVERVIEW</span><h2>学生学习总览</h2><p>这里用于筛选和定位学生，完整能力画像只在下方展示一次。</p></div>
          <el-radio-group v-model="stateFilter" class="state-filter" aria-label="按学习状态筛选">
            <el-radio-button value="ALL">全部 {{ students.length }}</el-radio-button>
            <el-radio-button value="FOCUS">重点 {{ stateCounts.FOCUS }}</el-radio-button>
            <el-radio-button value="ATTENTION">关注 {{ stateCounts.ATTENTION }}</el-radio-button>
            <el-radio-button value="STEADY">稳定 {{ stateCounts.STEADY }}</el-radio-button>
          </el-radio-group>
        </div>

        <div class="profile-matrix" role="table" aria-label="学生学习总览">
          <div class="matrix-row matrix-labels" role="row"><span>学生</span><span>学习状态</span><span>综合能力</span><span>画像特征</span><span>当前教学重点</span><span /></div>
          <button v-for="student in visibleStudents" :key="student.studentId" type="button" class="matrix-row student-row" :class="{ selected: String(student.studentId) === String(selectedStudent?.studentId) }" @click="selectStudent(student.studentId)">
            <span class="student-name"><i>{{ student.studentName.slice(0, 1) }}</i><strong>{{ student.studentName }}</strong><small>画像可信度 {{ student.abilityProfile?.dataConfidence ?? 0 }}%</small></span>
            <span><b class="state-chip" :class="stateInfo(student).tone">{{ stateInfo(student).label }}</b><small v-if="student.topRiskLevel !== 'LOW'" class="risk-text">风险 {{ student.topRiskScore }}</small></span>
            <span class="ability-cell"><strong>{{ student.abilityProfile?.overallScore ?? 0 }}</strong><small>/ 100 · {{ student.abilityProfile?.level || '暂无数据' }}</small></span>
            <span class="pattern-cell"><strong>{{ student.abilityProfile?.pattern || student.abilityProfile?.level || '数据积累中' }}</strong><small>均衡度 {{ student.abilityProfile?.balanceScore ?? 0 }}%</small></span>
            <span class="reason-cell"><strong>{{ student.topRiskCourse }}</strong><small>{{ student.priorityReason }}</small></span>
            <span class="row-arrow"><el-icon><ArrowRight /></el-icon></span>
          </button>
        </div>
      </section>

      <section class="detail-grid">
        <article class="panel detail-panel">
          <template v-if="selectedStudent">
            <div class="panel-heading"><div><span class="section-label">SELECTED STUDENT</span><h2>{{ selectedStudent.studentName }} 的能力雷达</h2><p>{{ selectedStudent.abilityProfile?.summary }}</p></div></div>
            <AbilityRadar :profile="selectedStudent.abilityProfile" />
            <div class="detail-action"><span>教师下一步</span><strong>{{ selectedStudent.recommendedAction }}</strong><p>{{ selectedStudent.priorityReason }}</p></div>
          </template>
          <div v-else class="stable-state"><strong>暂无学生画像</strong></div>
        </article>

        <article class="panel assistant-panel">
          <div class="panel-heading"><div><span class="section-label">AI TEACHING ASSISTANT</span><h2>问 AI：下一步怎么教</h2><p>回答基于班级真实画像、趋势和预警。</p></div><el-icon><ChatDotRound /></el-icon></div>
          <div v-if="!conversation.length" class="question-starters"><button type="button" @click="useQuestion('本周应优先关注哪些学生和课程？')">本周应优先关注哪些学生和课程？</button><button type="button" @click="useQuestion('针对重点干预学生，给我一个20分钟的课堂安排。')">针对重点干预学生，给我一个20分钟的课堂安排。</button><button type="button" @click="useQuestion('哪些课程主题需要在课堂上重新讲解？')">哪些课程主题需要在课堂上重新讲解？</button></div>
          <div v-else class="conversation-list"><div v-for="(item, index) in conversation" :key="index" class="message" :class="item.role"><p>{{ item.text || item.answer }}</p><template v-if="item.role === 'assistant'"><strong>建议动作：{{ item.nextStep }}</strong><small>{{ sourceLabel(item.source) }} · {{ (item.references || []).join('；') }}</small></template></div></div>
          <div class="ask-row"><el-input v-model="question" maxlength="300" placeholder="例如：谁需要我先介入？" @keyup.enter="askAssistant" /><el-button type="primary" :loading="asking" @click="askAssistant">提问</el-button></div>
        </article>
      </section>

      <section class="bottom-grid">
        <article class="panel mix-panel"><div class="panel-heading"><div><span class="section-label">COURSE THEME MIX</span><h2>课程类型学习占比</h2><p>按课程主题汇总真实学习时长。</p></div><el-icon><DataAnalysis /></el-icon></div><div class="mix-body"><div class="mix-pie" :style="classPieStyle"><div><strong>{{ classProfile.totalStudyMinutes }}</strong><span>分钟</span></div></div><div class="mix-legend"><div v-for="(item, index) in classProfile.shares" :key="item.categoryKey"><i :style="{ background: chartColor(index) }" /><strong>{{ item.typeName }}</strong><small>{{ item.studyMinutes }} 分钟 · {{ item.courseCount }} 门</small><b>{{ item.share }}%</b></div></div></div></article>
        <article class="panel alert-panel"><div class="panel-heading"><div><span class="section-label">RISK QUEUE</span><h2>待处理风险</h2><p>只显示有具体证据的中高风险记录。</p></div><span class="alert-count">{{ alerts.length }}</span></div><div v-if="alerts.length" class="alert-list"><button v-for="item in alerts" :key="`${item.studentId}-${item.courseId}`" type="button" @click="selectStudent(item.studentId)"><i :class="item.riskLevel === 'HIGH' ? 'high' : 'medium'">{{ item.riskScore }}</i><span><strong>{{ item.studentName }} · {{ item.courseName }}</strong><small>{{ item.evidence }}</small></span><el-icon><ArrowRight /></el-icon></button></div><div v-else class="stable-state"><strong>当前没有中高风险</strong></div></article>
      </section>
    </template>

    <section v-else class="panel empty-state"><el-empty description="暂无可分析的班级学习数据" /><p>学生完成课程学习后会生成个人画像与教学分层。</p></section>
  </main>
</template>

<style scoped>
.analysis-page{min-height:100%;padding:30px clamp(16px,4vw,52px) 46px;background:#f4f7fa;color:#24364b}.page-header,.panel-heading,.matrix-header,.decision-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.page-header{align-items:flex-end;margin-bottom:18px}.eyebrow,.section-label{color:#1875b4;font-size:11px;font-weight:800;letter-spacing:.08em}.page-header h1{margin:7px 0 5px;font-size:31px;line-height:1.2}.page-header p,.panel-heading p,.matrix-header p{margin:0;color:#748397;font-size:13px;line-height:1.55}.header-actions{display:flex;align-items:center;gap:9px}.class-select{width:230px}.summary-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:16px;border:1px solid #dce6ef;background:#fff}.summary-cell{min-width:0;padding:16px;border-right:1px solid #e5edf3}.summary-cell:last-child{border-right:0}.summary-cell.focus{border-top:3px solid #c0523d}.summary-cell.attention{border-top:3px solid #d28a2c}.summary-cell.steady{border-top:3px solid #2d9671}.summary-cell span,.summary-cell strong,.summary-cell small{display:block}.summary-cell span{color:#748397;font-size:12px}.summary-cell strong{margin:8px 0 4px;color:#235c8e;font-size:28px;line-height:1}.summary-cell.focus strong{color:#b84b36}.summary-cell.attention strong{color:#aa7126}.summary-cell.steady strong{color:#287657}.summary-cell em{font-size:13px;font-style:normal}.summary-cell small{overflow:hidden;color:#8a98a7;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.decision-grid,.detail-grid,.bottom-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(330px,.9fr);gap:16px;margin-bottom:16px}.panel{border:1px solid #dce6ef;background:#fff}.decision-panel,.trend-panel,.matrix-panel,.detail-panel,.assistant-panel,.mix-panel,.alert-panel{padding:20px}.decision-heading{align-items:flex-start;margin-top:7px}.decision-heading h2{margin:0 0 5px;color:#293f58;font-size:22px}.decision-heading p{margin:0;color:#536d87;font-size:13px;line-height:1.55}.state-chip{display:inline-flex;align-items:center;justify-content:center;width:max-content;border:1px solid #d7e2eb;padding:4px 7px;background:#f8fafc;color:#536a83;font-size:11px;font-style:normal;font-weight:700;white-space:nowrap}.state-chip.focus{border-color:#ecc5bc;background:#fff4f1;color:#b94e37}.state-chip.attention{border-color:#ead7b4;background:#fff9ef;color:#9b671c}.state-chip.steady{border-color:#bfdfcf;background:#f1faf5;color:#287957}.decision-action,.detail-action{display:grid;gap:4px;margin-top:16px;padding:12px 14px;border-left:3px solid #2d9671;background:#f2faf6;color:#436e59;font-size:12px;line-height:1.55}.decision-action span,.detail-action span{color:#6b8878;font-size:11px}.decision-action strong,.detail-action strong{font-size:13px}.trend-panel .panel-heading{align-items:flex-start;margin-bottom:8px}.panel-heading h2,.matrix-header h2{margin:4px 0;color:#293f58;font-size:20px;line-height:1.3}.panel-heading>.el-icon{color:#237dbb;font-size:21px}.trend-chart{height:150px;position:relative}.trend-chart svg{position:absolute;inset:0;width:100%;height:106px}.axis{stroke:#cddbe7;stroke-width:1}.grid{stroke:#edf2f6;stroke-width:1;stroke-dasharray:2 3}.trend-line{fill:none;stroke:#277dbb;stroke-width:3;vector-effect:non-scaling-stroke}.trend-bars{position:absolute;top:8px;right:0;bottom:0;left:0;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;align-items:end}.trend-day{display:grid;height:132px;grid-template-rows:82px 19px 15px;align-items:end;text-align:center}.trend-day i{display:block;align-self:end;justify-self:center;width:min(18px,62%);min-height:3px;background:#b8d9ed}.trend-day strong{color:#346183;font-size:11px}.trend-day small{color:#7f8fa0;font-size:10px}.matrix-panel{margin-bottom:16px}.matrix-header{align-items:flex-end;margin-bottom:16px}.state-filter{flex:0 0 auto}.profile-matrix{border-top:1px solid #dfe8ef}.matrix-row{display:grid;grid-template-columns:minmax(120px,1.15fr) 100px minmax(100px,.9fr) minmax(100px,.9fr) minmax(110px,.95fr) minmax(190px,1.55fr) 24px;gap:14px;align-items:center;width:100%;min-width:890px;padding:13px 10px;border:0;border-bottom:1px solid #e6edf2;background:#fff;color:#304b67;text-align:left}.matrix-labels{padding:9px 10px;background:#f7fafc;color:#718397;font-size:11px;font-weight:700}.student-row{cursor:pointer}.student-row:hover,.student-row.selected{background:#f1f8fc}.student-row.selected{box-shadow:inset 3px 0 #2c82c2}.student-name{display:grid;grid-template-columns:32px minmax(0,1fr);column-gap:8px;align-items:center}.student-name i{display:grid;width:31px;height:31px;grid-row:span 2;place-items:center;border-radius:50%;background:#e3f0fa;color:#2871aa;font-size:12px;font-style:normal;font-weight:800}.student-name strong,.student-name small,.reason-cell strong,.reason-cell small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.student-name strong,.reason-cell strong{font-size:13px}.student-name small,.reason-cell small{margin-top:3px;color:#76899c;font-size:11px}.risk-text{display:block;margin-top:5px;color:#bb563e;font-size:10px}.dimension-cell{display:grid;grid-template-columns:25px minmax(0,1fr);gap:6px;align-items:center}.dimension-cell>b{color:#2b638f;font-size:13px}.dimension-cell i,.detail-dimensions i{display:block;height:6px;overflow:hidden;background:#e7eef3}.dimension-cell em,.detail-dimensions em{display:block;height:100%;background:#5e9dcc}.dimension-cell em.good,.detail-dimensions em.good{background:#2d9671}.dimension-cell em.middle,.detail-dimensions em.middle{background:#3986bf}.dimension-cell em.low,.detail-dimensions em.low{background:#d38b33}.row-arrow{justify-self:end;color:#66849d}.detail-grid{grid-template-columns:minmax(0,1.1fr) minmax(330px,.9fr)}.detail-panel .panel-heading{align-items:flex-start;margin-bottom:14px}.overall-score{display:grid;place-items:center;min-width:58px;height:58px;background:#edf7f2;color:#287957}.overall-score strong{font-size:22px;line-height:1}.overall-score span{margin-top:3px;font-size:10px}.detail-dimensions{display:grid;border-top:1px solid #e6edf2}.detail-dimensions>div{display:grid;grid-template-columns:minmax(100px,1fr) 28px minmax(110px,1fr);gap:9px;align-items:center;padding:12px 0;border-bottom:1px solid #e6edf2}.detail-dimensions strong,.detail-dimensions span,.detail-dimensions small{display:block}.detail-dimensions strong{font-size:13px}.detail-dimensions span{margin-top:3px;color:#668097;font-size:11px}.detail-dimensions>b{color:#2b638f;font-size:14px}.detail-dimensions small{grid-column:1/-1;color:#7c8d9e;font-size:11px;line-height:1.45}.detail-action p{margin:0;color:#4d705c}.assistant-panel .panel-heading{align-items:flex-start}.question-starters{display:flex;flex-wrap:wrap;gap:8px;min-height:119px;align-content:center}.question-starters button{border:1px solid #d5e5f1;background:#f6fbff;color:#36709e;cursor:pointer;font-size:12px;line-height:1.4;padding:8px 10px;text-align:left}.question-starters button:hover{border-color:#7db3dc;background:#edf7ff}.conversation-list{display:grid;gap:9px;max-height:210px;margin-bottom:12px;overflow:auto}.message{max-width:88%;padding:9px 11px;font-size:12px;line-height:1.55}.message p{margin:0}.message.user{justify-self:end;background:#e8f3fc;color:#315b80}.message.assistant{background:#f5f8fb;color:#465f78}.message.assistant strong,.message.assistant small{display:block}.message.assistant strong{margin-top:7px;color:#2f7658}.message.assistant small{margin-top:4px;color:#8090a1;font-size:10px}.ask-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:12px}.mix-body{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;gap:18px}.mix-pie{display:grid;width:142px;height:142px;place-items:center;border-radius:50%}.mix-pie>div{display:grid;width:86px;height:86px;place-items:center;border-radius:50%;background:#fff;text-align:center}.mix-pie strong,.mix-pie span{display:block}.mix-pie strong{color:#24608f;font-size:23px;line-height:1}.mix-pie span{color:#7b8c9c;font-size:10px}.mix-legend{display:grid;gap:10px}.mix-legend>div{display:grid;grid-template-columns:8px minmax(80px,1fr) minmax(100px,1fr) auto;gap:7px;align-items:center}.mix-legend i{width:8px;height:8px;border-radius:50%}.mix-legend strong{font-size:12px}.mix-legend small{color:#7f8fa1;font-size:11px}.mix-legend b{color:#236ca5;font-size:13px}.alert-count{display:grid;width:29px;height:29px;place-items:center;background:#fff3f0;color:#ba533b;font-size:13px;font-weight:800}.alert-list{border-top:1px solid #e6edf2}.alert-list button{display:grid;grid-template-columns:30px minmax(0,1fr) 18px;gap:10px;align-items:center;width:100%;padding:11px 0;border:0;border-bottom:1px solid #e6edf2;background:#fff;color:#304b67;text-align:left;cursor:pointer}.alert-list button:hover{background:#f4f9fd}.alert-list i{display:grid;width:28px;height:28px;place-items:center;background:#fff7ed;color:#a96e22;font-size:11px;font-style:normal;font-weight:800}.alert-list i.high{background:#fff1ef;color:#be5039}.alert-list strong,.alert-list small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.alert-list strong{font-size:12px}.alert-list small{margin-top:4px;color:#75879a;font-size:11px}.stable-state{display:grid;gap:7px;min-height:96px;place-content:center;color:#61768c;text-align:center}.stable-state strong{color:#347357;font-size:14px}.stable-state span{font-size:12px;line-height:1.6}.empty-state{display:grid;min-height:350px;place-items:center}.empty-state p{margin:0 20px 28px;color:#77879a;font-size:13px}@media(max-width:900px){.decision-grid,.detail-grid,.bottom-grid{grid-template-columns:1fr}.matrix-panel{overflow:auto}.matrix-header{align-items:stretch;flex-direction:column}.state-filter{align-self:flex-start}}@media(max-width:640px){.analysis-page{padding:24px 14px 34px}.page-header{align-items:stretch;flex-direction:column}.header-actions,.class-select{width:100%}.summary-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.summary-cell:nth-child(2){border-right:0}.summary-cell:nth-child(-n+2){border-bottom:1px solid #e5edf3}.summary-cell:last-child{border-bottom:0}.decision-panel,.trend-panel,.matrix-panel,.detail-panel,.assistant-panel,.mix-panel,.alert-panel{padding:16px}.decision-heading{align-items:stretch;flex-direction:column}.trend-chart{height:146px}.trend-day{grid-template-rows:78px 19px 15px}.trend-bars{gap:3px}.matrix-panel{margin-right:-14px;margin-left:-14px;border-right:0;border-left:0}.matrix-header{padding:0 14px}.profile-matrix{overflow:auto}.matrix-row{min-width:820px}.mix-body{grid-template-columns:1fr;justify-items:center}.mix-legend{width:100%}.mix-legend>div{grid-template-columns:8px minmax(68px,1fr) minmax(92px,1fr) auto}.detail-dimensions>div{grid-template-columns:minmax(90px,1fr) 25px minmax(90px,1fr)}.message{max-width:96%}}
</style>

<style scoped>
.eyebrow,
.section-label {
  letter-spacing: 0;
}

.matrix-row {
  grid-template-columns: minmax(140px, 1.1fr) 100px 112px minmax(130px, .9fr) minmax(220px, 1.65fr) 24px;
  min-width: 820px;
}

.ability-cell,
.pattern-cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.ability-cell strong {
  color: #256d8d;
  font-size: 18px;
}

.ability-cell small,
.pattern-cell small {
  overflow: hidden;
  color: #76899c;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pattern-cell strong {
  overflow: hidden;
  color: #31755f;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-panel {
  min-width: 0;
}

@media (max-width: 640px) {
  .matrix-row {
    min-width: 760px;
  }
}
</style>
