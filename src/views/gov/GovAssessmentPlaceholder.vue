<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Check,
  Clock,
  Close,
  DataAnalysis,
  Document,
  EditPen,
  Refresh,
  Timer,
  Trophy,
  Warning,
} from '@element-plus/icons-vue'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import 'katex/dist/katex.min.css'
import {
  createGovMockExam,
  getGovMockExam,
  getGovMockExamReport,
  listGovMockExamRecords,
  submitGovMockExam,
} from '@/api/govAssessment'

const SUBJECTS = [
  { value: '', label: '综合' },
  { value: '政治理论', label: '政治理论' },
  { value: '常识判断', label: '常识判断' },
  { value: '语言理解与表达', label: '语言理解与表达' },
  { value: '数量关系', label: '数量关系' },
  { value: '判断推理', label: '判断推理' },
  { value: '资料分析', label: '资料分析' },
]

const QUESTION_COUNTS = [10, 20, 30]
const DURATION_OPTIONS = [30, 60, 90, 120]

const view = ref('setup')
const records = ref([])
const loadingRecords = ref(false)
const creating = ref(false)
const loadingExam = ref(false)
const submitting = ref(false)
const exam = ref(null)
const report = ref(null)
const answers = ref({})
const remainingSeconds = ref(0)
const activeQuestionId = ref(null)

const form = reactive({
  subject: '',
  questionCount: 20,
  difficulty: null,
  durationMinutes: 60,
})

let timerId = null
let timerFired = false

const questions = computed(() => exam.value?.questions || [])
const answeredCount = computed(() => questions.value.filter((question) => isAnswered(question)).length)
const progressPercent = computed(() => questions.value.length
  ? Math.round((answeredCount.value / questions.value.length) * 100)
  : 0)
const examStartedAt = computed(() => {
  const value = exam.value?.startedAt
  return value ? new Date(value).getTime() : Date.now()
})
const examDurationSeconds = computed(() => Number(exam.value?.durationLimitSeconds) || 0)
const reportDurationText = computed(() => formatDuration(Number(report.value?.durationUsedSeconds) || 0))

function isAnswered(question) {
  const answer = answers.value[question.questionId]
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer)
}

function getSelectedAnswers(question) {
  const answer = answers.value[question.questionId]
  return Array.isArray(answer) ? answer : answer ? [answer] : []
}

function initAnswers(items) {
  const nextAnswers = {}
  ;(items || []).forEach((question) => {
    nextAnswers[question.questionId] = question.questionType === 'MULTIPLE' ? [] : ''
  })
  answers.value = nextAnswers
  activeQuestionId.value = items?.[0]?.questionId || null
}

function clearTimer() {
  if (timerId) {
    window.clearInterval(timerId)
    timerId = null
  }
}

function remainingFromServer() {
  const elapsed = Math.max(0, Math.floor((Date.now() - examStartedAt.value) / 1000))
  return Math.max(0, examDurationSeconds.value - elapsed)
}

function startTimer() {
  clearTimer()
  timerFired = false
  remainingSeconds.value = remainingFromServer()
  if (remainingSeconds.value <= 0) {
    handleTimeout()
    return
  }

  timerId = window.setInterval(() => {
    remainingSeconds.value = remainingFromServer()
    if (remainingSeconds.value <= 0) {
      handleTimeout()
    }
  }, 1000)
}

function handleTimeout() {
  if (timerFired) return
  timerFired = true
  clearTimer()
  ElMessage.warning('考试时间已到，系统已自动交卷')
  submitExam(true)
}

function formatRemaining(value) {
  const total = Math.max(0, Number(value) || 0)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return [hours, minutes, seconds].map((item) => String(item).padStart(2, '0')).join(':')
}

function formatDuration(value) {
  const total = Math.max(0, Number(value) || 0)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes} 分 ${seconds} 秒`
}

function subjectLabel(subject) {
  return SUBJECTS.find((item) => item.value === subject)?.label || subject || '综合'
}

function difficultyLabel(value) {
  if (!value) return '不限'
  return `${value} 星`
}

function statusLabel(status) {
  return {
    DOING: '进行中',
    FINISHED: '已完成',
  }[status] || status || '-'
}

function statusType(status) {
  return status === 'FINISHED' ? 'success' : 'warning'
}

function scrollToQuestion(questionId) {
  activeQuestionId.value = questionId
  window.requestAnimationFrame(() => {
    document.getElementById(`gov-question-${questionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}

async function loadRecords() {
  loadingRecords.value = true
  try {
    records.value = await listGovMockExamRecords()
  } catch (error) {
    records.value = []
    ElMessage.error(error?.message || '历史记录加载失败')
  } finally {
    loadingRecords.value = false
  }
}

async function startExam() {
  if (!form.questionCount) {
    ElMessage.warning('请选择题量')
    return
  }

  creating.value = true
  try {
    const data = await createGovMockExam({
      subject: form.subject || null,
      questionCount: Number(form.questionCount),
      difficulty: form.difficulty ? Number(form.difficulty) : null,
      durationLimitSeconds: Number(form.durationMinutes) * 60,
    })
    exam.value = data
    report.value = null
    initAnswers(data?.questions || [])
    view.value = 'exam'
    startTimer()
  } catch (error) {
    ElMessage.error(error?.message || '模拟考试创建失败')
  } finally {
    creating.value = false
  }
}

async function resumeExam(record) {
  loadingExam.value = true
  try {
    if (record.status === 'FINISHED') {
      await showReport(record.practiceId)
      return
    }

    const data = await getGovMockExam(record.practiceId)
    exam.value = data
    report.value = null
    initAnswers(data?.questions || [])
    view.value = 'exam'
    startTimer()
  } catch (error) {
    ElMessage.error(error?.message || '模拟考试加载失败')
  } finally {
    loadingExam.value = false
  }
}

async function showReport(practiceId) {
  loadingExam.value = true
  try {
    report.value = await getGovMockExamReport(practiceId)
    exam.value = null
    clearTimer()
    view.value = 'report'
  } catch (error) {
    ElMessage.error(error?.message || '测评报告加载失败')
  } finally {
    loadingExam.value = false
  }
}

async function submitExam(autoSubmitted = false) {
  if (submitting.value || !exam.value) return

  if (!autoSubmitted) {
    const unanswered = questions.value.filter((question) => !isAnswered(question)).length
    const warning = unanswered
      ? `还有 ${unanswered} 道题未作答，交卷后无法修改。`
      : '交卷后将自动评分并生成测评报告。'
    try {
      await ElMessageBox.confirm(warning, '确认交卷', {
        type: 'warning',
        confirmButtonText: '确认交卷',
        cancelButtonText: '继续作答',
      })
    } catch {
      return
    }
  }

  submitting.value = true
  try {
    report.value = await submitGovMockExam(exam.value.practiceId, {
      autoSubmitted,
      answers: questions.value.map((question) => ({
        questionId: question.questionId,
        selectedAnswers: getSelectedAnswers(question),
      })),
    })
    exam.value = null
    clearTimer()
    view.value = 'report'
    ElMessage.success(autoSubmitted ? '已自动交卷' : '交卷成功')
    loadRecords()
  } catch (error) {
    timerFired = false
    startTimer()
    ElMessage.error(error?.message || '交卷失败')
  } finally {
    submitting.value = false
  }
}

function backToSetup() {
  clearTimer()
  exam.value = null
  report.value = null
  view.value = 'setup'
  loadRecords()
}

function selectedClass(question, key) {
  const selected = getSelectedAnswers(question)
  if (question.type === 'MULTIPLE') return selected.includes(key) ? 'is-selected' : ''
  return selected[0] === key ? 'is-selected' : ''
}

onMounted(loadRecords)
onBeforeUnmount(clearTimer)
</script>

<template>
  <main v-loading="loadingExam" class="gov-assessment-page">
    <template v-if="view === 'setup'">
      <section class="assessment-shell">
        <header class="page-header">
          <div>
            <p class="eyebrow">GOVERNMENT EXAM ASSESSMENT</p>
            <h1>模拟考试与测评</h1>
            <span>随机抽题、限时作答、自动评分与错题复盘</span>
          </div>
          <div class="header-mark"><el-icon><Trophy /></el-icon></div>
        </header>

        <section class="setup-grid">
          <div class="exam-config-panel">
            <div class="panel-title">
              <el-icon><EditPen /></el-icon>
              <div><strong>新建模拟考试</strong><span>本次题目创建后固定，中途可继续作答</span></div>
            </div>

            <div class="config-grid">
              <label class="field-block">
                <span>科目范围</span>
                <el-select v-model="form.subject" size="large" placeholder="选择科目">
                  <el-option v-for="item in SUBJECTS" :key="item.value" :label="item.label" :value="item.value" />
                </el-select>
              </label>
              <label class="field-block">
                <span>题目数量</span>
                <el-select v-model="form.questionCount" size="large">
                  <el-option v-for="count in QUESTION_COUNTS" :key="count" :label="`${count} 题`" :value="count" />
                </el-select>
              </label>
              <label class="field-block">
                <span>题目难度</span>
                <el-select v-model="form.difficulty" size="large" placeholder="不限难度">
                  <el-option label="不限难度" :value="null" />
                  <el-option v-for="level in 5" :key="level" :label="`${level} 星`" :value="level" />
                </el-select>
              </label>
              <label class="field-block">
                <span>考试时长</span>
                <el-select v-model="form.durationMinutes" size="large">
                  <el-option v-for="minutes in DURATION_OPTIONS" :key="minutes" :label="`${minutes} 分钟`" :value="minutes" />
                </el-select>
              </label>
            </div>

            <el-button class="start-button" type="primary" size="large" :loading="creating" @click="startExam">
              <el-icon><Timer /></el-icon>
              开始模拟考试
            </el-button>
          </div>

          <div class="setup-summary">
            <div class="summary-mark"><el-icon><DataAnalysis /></el-icon></div>
            <h2>覆盖行测六科</h2>
            <p>综合模式按当前题库随机抽题；专项模式限定单科范围。</p>
            <ul>
              <li><el-icon><Check /></el-icon>交卷后自动判分</li>
              <li><el-icon><Check /></el-icon>生成科目表现分析</li>
              <li><el-icon><Check /></el-icon>展示错题答案与解析</li>
            </ul>
          </div>
        </section>

        <section class="history-panel">
          <div class="panel-title history-title">
            <el-icon><Document /></el-icon>
            <div><strong>模拟记录</strong><span>继续未完成的考试或查看已生成报告</span></div>
          </div>
          <el-table v-loading="loadingRecords" :data="records" class="history-table" empty-text="暂无模拟考试记录">
            <el-table-column label="科目" min-width="150">
              <template #default="{ row }">{{ subjectLabel(row.subject) }}</template>
            </el-table-column>
            <el-table-column label="题量" width="80">
              <template #default="{ row }">{{ row.totalCount }}</template>
            </el-table-column>
            <el-table-column label="答对" width="80">
              <template #default="{ row }">{{ row.correctCount ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="得分" width="90">
              <template #default="{ row }">{{ row.score ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="statusType(row.status)" effect="plain">{{ statusLabel(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="" width="110" align="right">
              <template #default="{ row }">
                <el-button text type="primary" @click="resumeExam(row)">
                  {{ row.status === 'FINISHED' ? '查看报告' : '继续考试' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </section>
      </section>
    </template>

    <template v-else-if="view === 'exam' && exam">
      <section class="exam-workspace">
        <header class="exam-toolbar">
          <el-button text @click="backToSetup"><el-icon><ArrowLeft /></el-icon>返回</el-button>
          <div class="exam-toolbar-center">
            <strong>{{ subjectLabel(exam.subject) }}模拟考试</strong>
            <span>{{ answeredCount }} / {{ exam.totalCount }} 已作答</span>
          </div>
          <div class="exam-timer" :class="{ urgent: remainingSeconds <= 300 }">
            <el-icon><Clock /></el-icon>
            <span>{{ formatRemaining(remainingSeconds) }}</span>
          </div>
          <el-button type="primary" :loading="submitting" @click="submitExam(false)">交卷</el-button>
        </header>

        <div class="exam-layout">
          <section class="question-list">
            <article
              v-for="question in questions"
              :id="`gov-question-${question.questionId}`"
              :key="question.questionId"
              class="question-card"
              :class="{ active: activeQuestionId === question.questionId }"
            >
              <div class="question-heading">
                <span class="question-index">{{ question.questionOrder }}</span>
                <div>
                  <strong>{{ question.questionType === 'SINGLE' ? '单选题' : '多选题' }}</strong>
                  <small>{{ question.subject }} · {{ difficultyLabel(question.difficulty) }}</small>
                </div>
                <span v-if="isAnswered(question)" class="answered-mark"><el-icon><Check /></el-icon></span>
              </div>

              <div v-if="question.content?.material" class="question-material">
                <MarkdownRenderer :markdown="question.content.material" :enable-latex="true" :enable-shiki="true" />
              </div>
              <div class="question-stem">
                <MarkdownRenderer :markdown="question.content?.stem || ''" :enable-latex="true" :enable-shiki="true" />
              </div>

              <el-radio-group
                v-if="question.questionType === 'SINGLE'"
                v-model="answers[question.questionId]"
                class="option-list"
              >
                <el-radio v-for="option in question.content?.options || []" :key="option.key" :value="option.key">
                  <span class="option-content">
                    <b>{{ option.key }}</b>
                    <MarkdownRenderer :markdown="option.content" :enable-latex="true" :enable-shiki="true" />
                  </span>
                </el-radio>
              </el-radio-group>
              <el-checkbox-group
                v-else
                v-model="answers[question.questionId]"
                class="option-list"
              >
                <el-checkbox v-for="option in question.content?.options || []" :key="option.key" :value="option.key">
                  <span class="option-content">
                    <b>{{ option.key }}</b>
                    <MarkdownRenderer :markdown="option.content" :enable-latex="true" :enable-shiki="true" />
                  </span>
                </el-checkbox>
              </el-checkbox-group>
            </article>
          </section>

          <aside class="answer-sheet">
            <div class="answer-sheet-heading">
              <strong>答题卡</strong>
              <span>{{ progressPercent }}%</span>
            </div>
            <div class="answer-grid">
              <button
                v-for="question in questions"
                :key="question.questionId"
                class="answer-number"
                :class="{
                  answered: isAnswered(question),
                  active: activeQuestionId === question.questionId,
                }"
                type="button"
                @click="scrollToQuestion(question.questionId)"
              >
                {{ question.questionOrder }}
              </button>
            </div>
            <div class="answer-legend">
              <span><i class="legend-current" />当前</span>
              <span><i class="legend-done" />已答</span>
              <span><i class="legend-pending" />未答</span>
            </div>
          </aside>
        </div>
      </section>
    </template>

    <template v-else-if="view === 'report' && report">
      <section class="report-shell">
        <header class="page-header report-header">
          <div>
            <p class="eyebrow">MOCK EXAM REPORT</p>
            <h1>模拟考试报告</h1>
            <span>{{ subjectLabel(report.subject) }} · {{ report.totalCount }} 题</span>
          </div>
          <el-button text @click="backToSetup"><el-icon><ArrowLeft /></el-icon>返回模拟考试</el-button>
        </header>

        <section class="report-stats">
          <div class="stat-card score">
            <span>总分</span>
            <strong>{{ report.score }}</strong>
            <small>满分 100</small>
          </div>
          <div class="stat-card">
            <span>答对</span>
            <strong>{{ report.correctCount }}<small> / {{ report.totalCount }}</small></strong>
            <em>正确率 {{ report.accuracyRate }}%</em>
          </div>
          <div class="stat-card">
            <span>用时</span>
            <strong>{{ reportDurationText }}</strong>
            <em>限时 {{ formatDuration(report.durationLimitSeconds) }}</em>
          </div>
        </section>

        <section class="report-section">
          <div class="section-title">
            <el-icon><DataAnalysis /></el-icon>
            <div><strong>科目表现</strong><span>按题目所属科目统计正确率</span></div>
          </div>
          <div class="subject-breakdown">
            <div v-for="item in report.subjectBreakdown" :key="item.subject" class="subject-row">
              <div class="subject-row-head">
                <strong>{{ subjectLabel(item.subject) }}</strong>
                <span>{{ item.correctCount }} / {{ item.totalCount }} · {{ item.accuracyRate }}%</span>
              </div>
              <div class="progress-track"><i :style="{ width: `${item.accuracyRate}%` }" /></div>
            </div>
          </div>
        </section>

        <section class="report-section">
          <div class="section-title">
            <el-icon><Warning /></el-icon>
            <div><strong>错题解析</strong><span>共 {{ report.wrongQuestions?.length || 0 }} 道错题</span></div>
          </div>

          <div v-if="report.wrongQuestions?.length" class="wrong-question-list">
            <article v-for="item in report.wrongQuestions" :key="item.questionId" class="wrong-question-card">
              <div class="question-heading">
                <span class="question-index">{{ item.questionOrder }}</span>
                <div>
                  <strong>{{ item.questionType === 'SINGLE' ? '单选题' : '多选题' }}</strong>
                  <small>{{ item.subject }} · {{ difficultyLabel(item.difficulty) }}</small>
                </div>
                <el-tag type="danger" effect="plain">答错</el-tag>
              </div>

              <div v-if="item.content?.material" class="question-material">
                <MarkdownRenderer :markdown="item.content.material" :enable-latex="true" :enable-shiki="true" />
              </div>
              <div class="question-stem">
                <MarkdownRenderer :markdown="item.content?.stem || ''" :enable-latex="true" :enable-shiki="true" />
              </div>

              <div class="report-options">
                <div
                  v-for="option in item.content?.options || []"
                  :key="option.key"
                  class="report-option"
                  :class="{
                    correct: item.correctAnswers?.includes(option.key),
                    wrong: item.selectedAnswers?.includes(option.key) && !item.correctAnswers?.includes(option.key),
                  }"
                >
                  <b>{{ option.key }}</b>
                  <MarkdownRenderer :markdown="option.content" :enable-latex="true" :enable-shiki="true" />
                </div>
              </div>

              <div class="answer-summary">
                <span>你的答案：<b>{{ item.selectedAnswers?.length ? item.selectedAnswers.join('、') : '未作答' }}</b></span>
                <span>正确答案：<b>{{ item.correctAnswers?.join('、') }}</b></span>
              </div>
              <div v-if="item.analysis" class="analysis-block">
                <strong>解析</strong>
                <MarkdownRenderer :markdown="item.analysis" :enable-latex="true" :enable-shiki="true" />
              </div>
            </article>
          </div>

          <div v-else class="all-correct">
            <el-icon><Trophy /></el-icon>
            <strong>全部答对</strong>
            <span>本次模拟考试没有错题。</span>
          </div>
        </section>
      </section>
    </template>
  </main>
</template>

<style scoped>
.gov-assessment-page {
  min-height: 100%;
  padding: 32px;
  background: #f4f7fb;
  color: #1f2937;
}

.assessment-shell,
.exam-workspace,
.report-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 30px;
  border: 1px solid #dce4ef;
  border-radius: 8px;
  background: linear-gradient(118deg, #ffffff 0%, #eef6f4 100%);
}

.eyebrow {
  margin: 0;
  color: #2f80ed;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.page-header h1 {
  margin: 9px 0 0;
  color: #172033;
  font-size: 32px;
  line-height: 1.2;
}

.page-header span {
  display: block;
  margin-top: 9px;
  color: #6d7c91;
  font-size: 14px;
}

.header-mark {
  display: grid;
  width: 62px;
  height: 62px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: #eaf3ff;
  color: #2f80ed;
}

.header-mark .el-icon {
  font-size: 30px;
}

.setup-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(280px, 0.75fr);
  gap: 18px;
  margin-top: 18px;
}

.exam-config-panel,
.setup-summary,
.history-panel {
  border: 1px solid #e1e7f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 26px rgb(30 55 90 / 6%);
}

.exam-config-panel {
  padding: 24px;
}

.panel-title,
.section-title {
  display: flex;
  align-items: center;
  gap: 11px;
}

.panel-title > .el-icon,
.section-title > .el-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #eaf3ff;
  color: #2f80ed;
}

.panel-title strong,
.section-title strong {
  display: block;
  color: #27354a;
  font-size: 15px;
}

.panel-title span,
.section-title span {
  display: block;
  margin-top: 3px;
  color: #8793a5;
  font-size: 12px;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin-top: 24px;
}

.field-block {
  display: grid;
  gap: 8px;
  color: #4b5a70;
  font-size: 13px;
  font-weight: 700;
}

.field-block :deep(.el-select) {
  width: 100%;
}

.start-button {
  width: 100%;
  margin-top: 24px;
}

.setup-summary {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: 24px;
  background: #18374f;
  color: #ffffff;
}

.summary-mark {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 10px;
  background: rgb(255 255 255 / 12%);
  color: #9fd8cf;
}

.summary-mark .el-icon {
  font-size: 25px;
}

.setup-summary h2 {
  margin: 20px 0 0;
  font-size: 20px;
}

.setup-summary p {
  margin: 9px 0 0;
  color: #c4d4e1;
  font-size: 13px;
  line-height: 1.7;
}

.setup-summary ul {
  display: grid;
  gap: 10px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.setup-summary li {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e1edf2;
  font-size: 13px;
}

.setup-summary li .el-icon {
  color: #7ee0c8;
}

.history-panel {
  margin-top: 18px;
  padding: 22px 24px 12px;
}

.history-title {
  margin-bottom: 16px;
}

.history-table {
  width: 100%;
}

.exam-workspace {
  min-height: calc(100vh - 64px);
}

.exam-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 16px;
  padding: 13px 18px;
  border: 1px solid #dce4ef;
  border-radius: 8px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 0 7px 20px rgb(31 55 90 / 7%);
  backdrop-filter: blur(10px);
}

.exam-toolbar-center {
  display: grid;
  justify-items: center;
  gap: 3px;
}

.exam-toolbar-center strong {
  color: #27354a;
  font-size: 15px;
}

.exam-toolbar-center span {
  color: #8793a5;
  font-size: 12px;
}

.exam-timer {
  display: flex;
  min-width: 96px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  border: 1px solid #cfe3ed;
  border-radius: 6px;
  background: #f1f8fa;
  color: #1b7284;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.exam-timer.urgent {
  border-color: #f1c0bd;
  background: #fff0ef;
  color: #c4453f;
}

.exam-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 250px;
  gap: 18px;
  align-items: start;
  margin-top: 18px;
}

.question-list {
  display: grid;
  gap: 16px;
}

.question-card,
.wrong-question-card {
  padding: 22px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgb(31 55 90 / 5%);
}

.question-card.active {
  border-color: #8db9f1;
  box-shadow: 0 0 0 3px rgb(47 128 237 / 10%);
}

.question-heading {
  display: flex;
  align-items: center;
  gap: 11px;
}

.question-index {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 7px;
  background: #eaf3ff;
  color: #2f80ed;
  font-size: 13px;
  font-weight: 900;
}

.question-heading strong {
  display: block;
  color: #27354a;
  font-size: 14px;
}

.question-heading small {
  display: block;
  margin-top: 3px;
  color: #8a96a8;
  font-size: 12px;
}

.answered-mark {
  display: grid;
  width: 28px;
  height: 28px;
  margin-left: auto;
  place-items: center;
  border-radius: 50%;
  background: #e7f7ef;
  color: #1e9b6e;
}

.question-material {
  margin-top: 18px;
  padding: 14px 16px;
  border-left: 3px solid #e8a53e;
  background: #fdf9f1;
  color: #5a6374;
  font-size: 14px;
  line-height: 1.8;
}

.question-stem {
  margin-top: 18px;
  color: #27354a;
  font-size: 15px;
  line-height: 1.8;
}

.option-list {
  display: grid;
  gap: 10px;
  margin-top: 20px;
}

.option-list :deep(.el-radio),
.option-list :deep(.el-checkbox) {
  display: flex;
  width: 100%;
  height: auto;
  min-height: 46px;
  align-items: center;
  margin: 0;
  padding: 10px 13px;
  border: 1px solid #e1e7f0;
  border-radius: 6px;
  background: #fafbfd;
  color: #354258;
  line-height: 1.6;
}

.option-list :deep(.el-radio:hover),
.option-list :deep(.el-checkbox:hover) {
  border-color: #8db9f1;
  background: #f5f9ff;
}

.option-list :deep(.el-radio.is-checked),
.option-list :deep(.el-checkbox.is-checked) {
  border-color: #2f80ed;
  background: #eef5ff;
}

.option-list :deep(.el-radio__label),
.option-list :deep(.el-checkbox__label) {
  flex: 1;
  padding-left: 10px;
  white-space: normal;
}

.option-content {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: 9px;
}

.option-content > b {
  min-width: 20px;
  padding-top: 2px;
  color: #2f80ed;
  font-weight: 900;
}

.answer-sheet {
  position: sticky;
  top: 86px;
  padding: 18px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgb(31 55 90 / 5%);
}

.answer-sheet-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 13px;
  border-bottom: 1px solid #edf0f5;
}

.answer-sheet-heading strong {
  color: #27354a;
  font-size: 14px;
}

.answer-sheet-heading span {
  color: #2f80ed;
  font-size: 12px;
  font-weight: 800;
}

.answer-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 9px;
  margin-top: 16px;
}

.answer-number {
  display: grid;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid #dfe5ee;
  border-radius: 6px;
  background: #ffffff;
  color: #718096;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.answer-number.answered {
  border-color: #a4d7c3;
  background: #e9f8f0;
  color: #16825a;
}

.answer-number.active {
  border-color: #2f80ed;
  box-shadow: 0 0 0 2px rgb(47 128 237 / 12%);
  color: #2f80ed;
}

.answer-legend {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 18px;
  color: #8a96a8;
  font-size: 11px;
}

.answer-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.answer-legend i {
  width: 9px;
  height: 9px;
  border: 1px solid #dfe5ee;
  border-radius: 2px;
}

.legend-current {
  border-color: #2f80ed !important;
  background: #eaf3ff;
}

.legend-done {
  border-color: #a4d7c3 !important;
  background: #e9f8f0;
}

.legend-pending {
  background: #f4f6fa;
}

.report-header {
  align-items: flex-end;
}

.report-stats {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 16px;
  margin-top: 18px;
}

.stat-card {
  display: grid;
  min-height: 150px;
  align-content: center;
  padding: 22px 24px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgb(31 55 90 / 5%);
}

.stat-card span {
  color: #7c899d;
  font-size: 13px;
  font-weight: 800;
}

.stat-card strong {
  margin-top: 8px;
  color: #21334d;
  font-size: 36px;
  line-height: 1.1;
}

.stat-card strong small {
  color: #7c899d;
  font-size: 17px;
}

.stat-card em,
.stat-card small {
  margin-top: 7px;
  color: #8b97a8;
  font-size: 12px;
  font-style: normal;
}

.stat-card.score {
  border-color: #9ac6f5;
  background: #f2f8ff;
}

.stat-card.score strong {
  color: #2f80ed;
}

.report-section {
  margin-top: 18px;
  padding: 22px 24px;
  border: 1px solid #dfe5ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgb(31 55 90 / 5%);
}

.subject-breakdown {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.subject-row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #4e5d72;
  font-size: 13px;
}

.subject-row-head span {
  color: #7d899b;
}

.progress-track {
  height: 7px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 99px;
  background: #edf1f6;
}

.progress-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2f80ed, #2baa83);
}

.wrong-question-list {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.report-options {
  display: grid;
  gap: 9px;
  margin-top: 20px;
}

.report-option {
  display: flex;
  min-height: 42px;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 13px;
  border: 1px solid #e2e7ef;
  border-radius: 6px;
  background: #fafbfd;
  color: #3a475c;
  line-height: 1.6;
}

.report-option > b {
  min-width: 20px;
  padding-top: 2px;
  color: #2f80ed;
  font-weight: 900;
}

.report-option.correct {
  border-color: #9ed8bf;
  background: #eefaf4;
}

.report-option.wrong {
  border-color: #efb9b5;
  background: #fff2f1;
}

.answer-summary {
  display: grid;
  gap: 5px;
  margin-top: 18px;
  padding: 12px 14px;
  border-radius: 6px;
  background: #f5f7fa;
  color: #536176;
  font-size: 13px;
}

.answer-summary b {
  color: #26364d;
}

.analysis-block {
  margin-top: 14px;
  padding: 14px 16px;
  border-left: 3px solid #2f80ed;
  background: #f5f9ff;
  color: #4e5d72;
  font-size: 13px;
  line-height: 1.8;
}

.analysis-block > strong {
  display: block;
  margin-bottom: 5px;
  color: #2f80ed;
}

.all-correct {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  min-height: 180px;
  color: #8a96a8;
}

.all-correct .el-icon {
  color: #2baa83;
  font-size: 42px;
}

.all-correct strong {
  color: #2a3a50;
  font-size: 17px;
}

.all-correct span {
  font-size: 13px;
}

@media (max-width: 900px) {
  .gov-assessment-page {
    padding: 18px;
  }

  .setup-grid,
  .exam-layout {
    grid-template-columns: 1fr;
  }

  .answer-sheet {
    position: static;
  }

  .exam-toolbar {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .exam-toolbar-center {
    grid-column: 2;
  }

  .exam-timer {
    grid-column: 3;
  }

  .exam-toolbar .el-button {
    grid-column: 3;
  }
}

@media (max-width: 620px) {
  .gov-assessment-page {
    padding: 12px;
  }

  .page-header {
    padding: 20px;
  }

  .page-header h1 {
    font-size: 27px;
  }

  .header-mark {
    width: 50px;
    height: 50px;
  }

  .config-grid,
  .report-stats {
    grid-template-columns: 1fr;
  }

  .exam-toolbar {
    grid-template-columns: 1fr auto;
  }

  .exam-toolbar-center {
    grid-column: 1;
    grid-row: 2;
  }

  .exam-timer {
    grid-column: 2;
    grid-row: 1;
  }

  .exam-toolbar .el-button {
    grid-column: 2;
    grid-row: 2;
  }

  .question-card,
  .wrong-question-card {
    padding: 18px;
  }

  .answer-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>

