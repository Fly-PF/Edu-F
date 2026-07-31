<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowRight,
  ChatDotRound,
  Compass,
  DataAnalysis,
  MagicStick,
  Refresh,
  TrendCharts,
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import AbilityRadar from '@/components/learning/AbilityRadar.vue'
import {
  askStudentLearningAssistant,
  getStudentGrowthOverview,
  refreshStudentCourseRecommendations,
} from '@/api/learningAnalysis'

const router = useRouter()
const loading = ref(false)
const refreshing = ref(false)
const recommending = ref(false)
const asking = ref(false)
const overview = ref(null)
const question = ref('')
const conversation = ref([])

const profile = computed(() => overview.value?.abilityProfile || {
  overallScore: 0, level: '暂无数据', dataConfidence: 0, summary: '完成课程学习后会形成能力画像。', pattern: '数据积累中', balanceScore: 0, dimensions: [], strengths: [], gaps: [], nextActions: [],
})
const alerts = computed(() => overview.value?.riskAlerts || [])
const courses = computed(() => overview.value?.courses || [])
const recommendations = computed(() => overview.value?.recommendations || [])
const learningProfile = computed(() => overview.value?.learningProfile || { shares: [], totalStudyMinutes: 0, dominantType: '暂无学习记录', insight: '' })
const chartColors = ['#287bb8', '#2b9671', '#d38b33', '#7b62c9', '#c45b76', '#4f8791']

function chartColor(index) {
  return chartColors[index % chartColors.length]
}

const profilePieStyle = computed(() => {
  const shares = learningProfile.value.shares?.filter(item => Number(item.share) > 0) || []
  if (!shares.length) return { background: '#e7edf3' }
  let offset = 0
  const stops = shares.map((item, index) => {
    const start = offset
    offset += Number(item.share || 0)
    return `${chartColor(index)} ${start}% ${offset}%`
  })
  return { background: `conic-gradient(${stops.join(', ')})` }
})

function riskClass(level) {
  return { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' }[level] || 'low'
}

function sourceLabel(source) {
  return source === 'MODEL' ? '大模型基于真实学情回答' : '基于真实学情的规则建议（模型未连接）'
}

function openCourse(item) {
  if (!item?.courseId) return
  router.push({ name: 'course-learn', params: { courseId: item.courseId } })
}

function openRecommendedCourse(item) {
  if (!item?.courseType) return
  router.push({ name: 'student-platform-courses', query: { courseType: item.courseType } })
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
  ElMessage.success('已按最新学习记录更新画像')
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
  <main v-loading="loading" class="analysis-page">
    <header class="page-header">
      <div>
        <span class="eyebrow">AI LEARNING INSIGHT</span>
        <h1>我的学情画像</h1>
        <p>把课程进度、学习投入和实践记录变成看得懂的能力结论与下一步。</p>
      </div>
      <el-button circle :loading="refreshing" title="刷新学情画像" aria-label="刷新学情画像" @click="refresh"><el-icon><Refresh /></el-icon></el-button>
    </header>

    <template v-if="overview">
      <section class="summary-strip" aria-label="个人学习概览">
        <div class="summary-cell score"><span>能力总览</span><strong>{{ profile.overallScore }}</strong><small>{{ profile.level }}</small></div>
        <div class="summary-cell"><span>画像可信度</span><strong>{{ profile.dataConfidence }}<em>%</em></strong><small>由真实学习记录覆盖度决定</small></div>
        <div class="summary-cell"><span>课程平均推进</span><strong>{{ overview.summary.averageProgress }}<em>%</em></strong><small>{{ overview.summary.courseCount }} 门已学习课程</small></div>
        <div class="summary-cell"><span>累计有效学习</span><strong>{{ overview.summary.studyMinutes }}<em>min</em></strong><small>来自章节学习记录</small></div>
      </section>

      <section class="top-grid">
        <article class="panel ability-panel">
          <div class="panel-heading"><div><span class="section-label">ABILITY PROFILE</span><h2>能力雷达</h2><p>{{ profile.summary }}</p></div><el-icon><DataAnalysis /></el-icon></div>
          <AbilityRadar :profile="profile" />
          <div class="profile-actions"><strong>下一步</strong><span v-for="item in profile.nextActions" :key="item">{{ item }}</span></div>
        </article>

        <article class="panel alert-panel">
          <div class="panel-heading"><div><span class="section-label">ACTIONABLE ALERTS</span><h2>我现在该处理什么</h2><p>每项预警都对应真实证据和具体动作。</p></div><span class="count-chip">{{ alerts.length }} 项</span></div>
          <div v-if="alerts.length" class="alert-list">
            <section v-for="item in alerts" :key="`${item.courseId}-${item.riskScore}`" class="alert-item">
              <div class="alert-top"><strong>{{ item.courseName }}</strong><span class="risk-chip" :class="riskClass(item.riskLevel)">风险 {{ item.riskScore }}</span></div>
              <p>{{ item.evidence }}</p>
              <div class="alert-action"><span>下一章：{{ item.nextChapter || '课程复盘' }}</span><b>{{ item.action }}</b></div>
              <el-button text type="primary" @click="openCourse(item)">去学习 <el-icon><ArrowRight /></el-icon></el-button>
            </section>
          </div>
          <div v-else class="stable-state"><strong>当前没有需要立即处理的风险</strong><span>继续完成正在学习课程的下一章节，画像会随记录更新。</span></div>
        </article>
      </section>

      <section class="middle-grid">
        <article class="panel assistant-panel">
          <div class="panel-heading"><div><span class="section-label">AI LEARNING ASSISTANT</span><h2>问 AI：我该怎么学</h2><p>对话只带入你的真实学情，不会编造课程或学习数据。</p></div><el-icon><ChatDotRound /></el-icon></div>
          <div v-if="!conversation.length" class="question-starters">
            <button type="button" @click="useQuestion('我目前最需要先补哪一门课？')">我目前最需要先补哪一门课？</button>
            <button type="button" @click="useQuestion('我的学习坚持能力为什么偏低？')">我的学习坚持能力为什么偏低？</button>
            <button type="button" @click="useQuestion('本周怎样安排学习更合适？')">本周怎样安排学习更合适？</button>
          </div>
          <div v-else class="conversation-list">
            <div v-for="(item, index) in conversation" :key="index" class="message" :class="item.role">
              <p>{{ item.text || item.answer }}</p>
              <template v-if="item.role === 'assistant'"><strong>下一步：{{ item.nextStep }}</strong><small>{{ sourceLabel(item.source) }} · {{ (item.references || []).join('；') }}</small></template>
            </div>
          </div>
          <div class="ask-row"><el-input v-model="question" maxlength="300" placeholder="例如：我为什么需要补这门课？" @keyup.enter="askAssistant" /><el-button type="primary" :loading="asking" @click="askAssistant">提问</el-button></div>
        </article>

        <article class="panel mix-panel">
          <div class="panel-heading"><div><span class="section-label">LEARNING MIX</span><h2>课程类型学习占比</h2><p>按课程主题汇总真实学习时长，例如数据分析、机器学习、计算机视觉；不按理论课或实践课分类。</p></div><el-icon><TrendCharts /></el-icon></div>
          <div class="mix-body"><div class="mix-pie" :style="profilePieStyle"><div><strong>{{ learningProfile.totalStudyMinutes }}</strong><span>分钟</span></div></div><div class="mix-legend"><div v-for="(item, index) in learningProfile.shares" :key="item.categoryKey"><i :style="{ background: chartColor(index) }" /><strong>{{ item.typeName }}</strong><small>{{ item.studyMinutes }} 分钟</small><b>{{ item.share }}%</b></div></div></div>
          <p class="mix-insight"><el-icon><Compass /></el-icon>{{ learningProfile.insight }}</p>
        </article>
      </section>

      <section class="bottom-grid">
        <article class="panel course-panel"><div class="panel-heading"><div><span class="section-label">COURSE STATUS</span><h2>课程学习状态</h2></div></div><button v-for="course in courses" :key="`${course.classId}-${course.courseId}`" type="button" class="course-row" @click="openCourse(course)"><span class="course-mark">{{ course.courseName.slice(0, 1) }}</span><span class="course-copy"><strong>{{ course.courseName }}</strong><small>{{ course.nextChapter }} · {{ course.studyMinutes }} 分钟</small><i><b :style="{ width: `${course.progress}%` }" /></i></span><span>{{ course.progress }}%</span><el-icon><ArrowRight /></el-icon></button></article>
        <article class="panel recommendation-panel"><div class="panel-heading"><div><span class="section-label">AI COURSE MATCH</span><h2>推荐的下一门课</h2><p>只从课程库已有候选课程中推荐。</p></div><el-button circle :loading="recommending" title="更新课程推荐" aria-label="更新课程推荐" @click="refreshRecommendations"><el-icon><MagicStick /></el-icon></el-button></div><div v-if="recommendations.length" class="recommendation-list"><button v-for="item in recommendations" :key="item.courseId" type="button" @click="openRecommendedCourse(item)"><span>{{ item.score }}</span><div><strong>{{ item.courseName }}</strong><small>{{ item.courseCategory || item.courseTypeName }} · {{ item.reason }}</small></div><el-icon><ArrowRight /></el-icon></button></div><el-empty v-else description="课程库暂无可推荐课程" :image-size="54" /></article>
      </section>
    </template>
    <section v-else class="panel empty-state"><el-empty description="暂无可分析的学习数据" /><p>完成课程章节学习后，这里会生成能力画像和具体建议。</p></section>
  </main>
</template>

<style scoped>
.analysis-page{min-height:100%;padding:30px clamp(16px,4vw,52px) 46px;background:#f4f7fa;color:#24364b}.page-header,.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.page-header{align-items:flex-end;margin-bottom:18px}.eyebrow,.section-label{color:#1875b4;font-size:11px;font-weight:800;letter-spacing:.08em}.page-header h1{margin:7px 0 5px;font-size:31px;line-height:1.2}.page-header p,.panel-heading p{margin:0;color:#748397;font-size:13px;line-height:1.55}.summary-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:16px;border:1px solid #dce6ef;background:#fff}.summary-cell{min-width:0;padding:16px;border-right:1px solid #e5edf3}.summary-cell:last-child{border-right:0}.summary-cell span,.summary-cell strong,.summary-cell small{display:block}.summary-cell span{color:#748397;font-size:12px}.summary-cell strong{margin:8px 0 4px;color:#235c8e;font-size:28px;line-height:1}.summary-cell.score{border-top:3px solid #2d9671}.summary-cell.score strong{color:#287657}.summary-cell em{font-size:13px;font-style:normal}.summary-cell small{overflow:hidden;color:#8a98a7;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.top-grid,.middle-grid,.bottom-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr);gap:16px;margin-bottom:16px}.panel{border:1px solid #dce6ef;background:#fff}.ability-panel,.alert-panel,.assistant-panel,.mix-panel,.course-panel,.recommendation-panel{padding:20px}.panel-heading{align-items:flex-start;margin-bottom:14px}.panel-heading h2{margin:4px 0;color:#293f58;font-size:20px;line-height:1.3}.panel-heading>.el-icon{color:#237dbb;font-size:21px}.dimension-list{border-top:1px solid #edf1f5}.dimension-row{display:grid;grid-template-columns:45px minmax(0,1fr);gap:11px;padding:12px 0;border-bottom:1px solid #edf1f5}.dimension-score{display:grid;width:39px;height:39px;place-items:center;background:#edf3f8;color:#587087;font-size:14px;font-weight:800}.dimension-score.strong{background:#eaf7f1;color:#28795a}.dimension-score.steady{background:#edf5fb;color:#2872aa}.dimension-score.focus{background:#fff5e9;color:#a66d25}.dimension-copy strong,.dimension-copy small{display:block}.dimension-copy strong{font-size:13px}.dimension-copy small{margin-top:3px;color:#77899c;font-size:11px}.dimension-copy p{margin:3px 0 0;color:#516b84;font-size:12px;line-height:1.5}.profile-actions{display:grid;gap:5px;margin-top:14px;padding:11px 13px;border-left:3px solid #2d9671;background:#f2faf6;color:#426e59;font-size:12px;line-height:1.5}.count-chip,.risk-chip{padding:5px 8px;border:1px solid #d7e2eb;background:#f8fafc;color:#536a83;font-size:11px;white-space:nowrap}.alert-list{display:grid;gap:10px}.alert-item{padding:12px;border-left:3px solid #d48a2c;background:#fffaf2}.alert-top,.alert-action{display:flex;align-items:center;justify-content:space-between;gap:12px}.alert-top strong{color:#344f6d;font-size:14px}.risk-chip.high{border-color:#e8bfb4;background:#fff3f0;color:#bd5136}.risk-chip.medium{border-color:#ead5ae;background:#fff9ee;color:#9e681d}.risk-chip.low{border-color:#c4dfd2;background:#f1faf6;color:#2d805f}.alert-item p{margin:8px 0;color:#536c84;font-size:12px;line-height:1.55}.alert-action{align-items:flex-start;flex-direction:column;gap:3px;color:#7c8d9e;font-size:11px}.alert-action b{color:#886023;font-size:12px;line-height:1.5}.alert-item .el-button{margin-top:5px;padding:0}.stable-state{display:grid;gap:7px;min-height:180px;place-content:center;color:#61768c;text-align:center}.stable-state strong{color:#347357;font-size:14px}.stable-state span{font-size:12px;line-height:1.6}.question-starters{display:flex;flex-wrap:wrap;gap:8px;min-height:123px;align-content:center}.question-starters button{border:1px solid #d5e5f1;background:#f6fbff;color:#36709e;cursor:pointer;font-size:12px;line-height:1.4;padding:8px 10px;text-align:left}.question-starters button:hover{border-color:#7db3dc;background:#edf7ff}.conversation-list{display:grid;gap:9px;max-height:222px;margin-bottom:12px;overflow:auto}.message{max-width:88%;padding:9px 11px;font-size:12px;line-height:1.55}.message p{margin:0}.message.user{justify-self:end;background:#e8f3fc;color:#315b80}.message.assistant{background:#f5f8fb;color:#465f78}.message.assistant strong,.message.assistant small{display:block}.message.assistant strong{margin-top:7px;color:#2f7658}.message.assistant small{margin-top:4px;color:#8090a1;font-size:10px}.ask-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-top:12px}.mix-body{display:grid;grid-template-columns:150px minmax(0,1fr);align-items:center;gap:18px}.mix-pie{display:grid;width:142px;height:142px;place-items:center;border-radius:50%}.mix-pie>div{display:grid;width:86px;height:86px;place-items:center;border-radius:50%;background:#fff;text-align:center}.mix-pie strong,.mix-pie span{display:block}.mix-pie strong{color:#24608f;font-size:23px;line-height:1}.mix-pie span{color:#7b8c9c;font-size:10px}.mix-legend{display:grid;gap:10px}.mix-legend>div{display:grid;grid-template-columns:8px minmax(70px,1fr) minmax(70px,1fr) auto;gap:7px;align-items:center}.mix-legend i{width:8px;height:8px;border-radius:50%}.mix-legend strong{font-size:12px}.mix-legend small{color:#7f8fa1;font-size:11px}.mix-legend b{color:#236ca5;font-size:13px}.mix-insight{display:flex;gap:6px;margin:14px 0 0;padding-top:12px;border-top:1px solid #edf1f5;color:#59728b;font-size:12px;line-height:1.55}.mix-insight .el-icon{flex:0 0 auto;margin-top:2px;color:#277eb9}.course-row,.recommendation-list button{display:grid;align-items:center;width:100%;border:0;border-top:1px solid #edf1f5;background:#fff;color:#324d69;text-align:left;cursor:pointer}.course-row{grid-template-columns:34px minmax(0,1fr) auto 17px;gap:10px;padding:11px 0}.course-mark{display:grid;width:32px;height:32px;place-items:center;background:#e7f1fa;color:#2674ae;font-size:13px;font-weight:800}.course-copy{min-width:0}.course-copy strong,.course-copy small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.course-copy strong{font-size:13px}.course-copy small{margin:3px 0 7px;color:#7d8d9f;font-size:11px}.course-copy i{display:block;height:5px;overflow:hidden;background:#e6edf3}.course-copy i b{display:block;height:100%;background:#2b84c6}.course-row>span:last-of-type{color:#286da4;font-size:13px;font-weight:800}.recommendation-list button{grid-template-columns:34px minmax(0,1fr) 17px;gap:10px;padding:11px 0}.recommendation-list button>span{display:grid;width:30px;height:30px;place-items:center;background:#edf6fb;color:#2372ad;font-size:11px;font-weight:800}.recommendation-list strong,.recommendation-list small{display:block}.recommendation-list strong{font-size:13px}.recommendation-list small{overflow:hidden;margin-top:3px;color:#718398;font-size:11px;line-height:1.45;text-overflow:ellipsis;white-space:nowrap}.empty-state{display:grid;min-height:350px;place-items:center}.empty-state p{margin:0 20px 28px;color:#77879a;font-size:13px}@media(max-width:1000px){.top-grid,.middle-grid,.bottom-grid{grid-template-columns:1fr}.summary-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.summary-cell:nth-child(2){border-right:0}.summary-cell:nth-child(-n+2){border-bottom:1px solid #e5edf3}}@media(max-width:640px){.analysis-page{padding:24px 14px 34px}.page-header{align-items:stretch;flex-direction:column}.summary-strip{grid-template-columns:1fr}.summary-cell,.summary-cell:nth-child(2){border-right:0;border-bottom:1px solid #e5edf3}.summary-cell:last-child{border-bottom:0}.ability-panel,.alert-panel,.assistant-panel,.mix-panel,.course-panel,.recommendation-panel{padding:16px}.panel-heading{align-items:stretch;flex-direction:column}.mix-body{grid-template-columns:1fr;justify-items:center}.mix-legend{width:100%}.mix-legend>div{grid-template-columns:8px minmax(68px,1fr) minmax(62px,1fr) auto}.alert-top{align-items:flex-start;flex-direction:column;gap:5px}.message{max-width:96%}}
</style>

<style scoped>
.eyebrow,
.section-label {
  letter-spacing: 0;
}

.ability-panel {
  min-width: 0;
}
</style>

<style>
@import '@/assets/creative-lab.css';
</style>
