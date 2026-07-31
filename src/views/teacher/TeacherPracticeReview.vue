<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, DocumentChecked, Plus, RefreshRight } from '@element-plus/icons-vue'
import { deleteTeacherPractice, listTeacherPracticeCourses, listTeacherPracticeSubmissions, publishTeacherPractice, reviewPracticeSubmission } from '@/api/learningPractice'

const loading = ref(false)
const saving = ref(false)
const status = ref('SUBMITTED')
const submissions = ref([])
const reviewVisible = ref(false)
const activeSubmission = ref(null)
const reviewForm = reactive({ feedback: '', questionReviews: {} })
const publishVisible = ref(false)
const publishing = ref(false)
const courseLoading = ref(false)
const teacherCourses = ref([])
const publishForm = reactive({ courseId: null, title: '', intro: '', totalScore: 100, questions: [] })

const pendingCount = computed(() => submissions.value.filter((item) => item.status === 'SUBMITTED').length)
const totalScore = computed(() => {
  const autoScore = Number(activeSubmission.value?.autoScore || 0)
  const manualScore = Object.values(reviewForm.questionReviews)
    .reduce((sum, item) => sum + Number(item.score || 0), 0)
  return autoScore + manualScore
})

function statusText(value) { return value === 'REVIEWED' ? '已批改' : '待批改' }
function statusType(value) { return value === 'REVIEWED' ? 'success' : 'warning' }
function formatTime(value) { return value ? String(value).replace('T', ' ').slice(0, 16) : '-' }

function newQuestion(type = 'SINGLE') {
  return {
    type,
    content: '',
    options: type === 'SINGLE' ? ['', '', '', ''] : [],
    referenceAnswer: type === 'SINGLE' ? 'A' : '',
    explanation: '',
    score: type === 'SINGLE' ? 20 : 80,
  }
}

function resetPublishForm() {
  publishForm.courseId = teacherCourses.value[0]?.id || null
  publishForm.title = ''
  publishForm.intro = ''
  publishForm.totalScore = 100
  publishForm.questions = [newQuestion('SINGLE'), newQuestion('SHORT')]
}

async function openPublish() {
  courseLoading.value = true
  try {
    teacherCourses.value = (await listTeacherPracticeCourses()) || []
    if (!teacherCourses.value.length) {
      ElMessage.warning('当前账号没有可发布练习的课程')
      return
    }
    resetPublishForm()
    publishVisible.value = true
  } catch (error) { ElMessage.error(error?.message || '课程列表加载失败') }
  finally { courseLoading.value = false }
}

function changeQuestionType(question) {
  if (question.type === 'SINGLE') {
    question.options = question.options?.length >= 2 ? question.options : ['', '', '', '']
    question.referenceAnswer = question.referenceAnswer || 'A'
  } else {
    question.options = []
    question.referenceAnswer = question.referenceAnswer === 'A' ? '' : question.referenceAnswer
  }
}

function addOption(question) { if (question.options.length < 6) question.options.push('') }
function removeOption(question, index) { if (question.options.length > 2) question.options.splice(index, 1) }
function addQuestion() { publishForm.questions.push(newQuestion('SINGLE')) }
function removeQuestion(index) { if (publishForm.questions.length > 1) publishForm.questions.splice(index, 1) }

async function publishPractice() {
  if (!publishForm.courseId || !publishForm.title.trim()) { ElMessage.warning('请选择课程并填写练习标题'); return }
  const scores = publishForm.questions.reduce((sum, question) => sum + Number(question.score || 0), 0)
  if (scores !== Number(publishForm.totalScore)) { ElMessage.warning('题目分值之和需要等于练习总分'); return }
  for (let index = 0; index < publishForm.questions.length; index += 1) {
    const question = publishForm.questions[index]
    if (!question.content.trim() || !question.referenceAnswer.trim()) { ElMessage.warning(`请完整填写第 ${index + 1} 题`); return }
    if (question.type === 'SINGLE' && (question.options.length < 2 || question.options.some((item) => !item.trim()))) {
      ElMessage.warning(`请填写第 ${index + 1} 题的全部选项`); return
    }
  }
  publishing.value = true
  try {
    await publishTeacherPractice({
      courseId: publishForm.courseId,
      title: publishForm.title.trim(),
      intro: publishForm.intro.trim(),
      totalScore: Number(publishForm.totalScore),
      questions: publishForm.questions.map((item) => ({
        type: item.type,
        content: item.content.trim(),
        options: item.type === 'SINGLE' ? item.options.map((option) => option.trim()) : [],
        referenceAnswer: item.referenceAnswer.trim().toUpperCase(),
        explanation: item.explanation.trim(),
        score: Number(item.score),
      })),
    })
    ElMessage.success('习题已发布，学生现在可以在学习练习中看到')
    publishVisible.value = false
  } catch (error) { ElMessage.error(error?.message || '习题发布失败') }
  finally { publishing.value = false }
}

async function loadSubmissions() {
  loading.value = true
  try { submissions.value = (await listTeacherPracticeSubmissions(status.value || undefined)) || [] }
  catch (error) { ElMessage.error(error?.message || '学生提交加载失败') }
  finally { loading.value = false }
}

async function removePractice(item) {
  try {
    await ElMessageBox.confirm(
      `确定删除“${item.practiceTitle}”吗？这会同时删除该练习的题目和所有学生提交、评分记录，无法恢复。`,
      '确认删除练习',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' },
    )
    await deleteTeacherPractice(item.practiceId)
    ElMessage.success('练习已删除')
    await loadSubmissions()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除练习失败')
  }
}

function openReview(item) {
  activeSubmission.value = item
  reviewForm.feedback = item.feedback || ''
  reviewForm.questionReviews = {}
  ;(item.answers || [])
    .filter((answer) => answer.questionType === 'SHORT')
    .forEach((answer) => {
      reviewForm.questionReviews[answer.questionId] = {
        score: answer.awardedScore ?? 0,
        feedback: answer.teacherFeedback || '',
      }
    })
  reviewVisible.value = true
}

async function saveReview() {
  if (!activeSubmission.value) return
  const openAnswers = (activeSubmission.value.answers || []).filter((answer) => answer.questionType === 'SHORT')
  for (const answer of openAnswers) {
    const review = reviewForm.questionReviews[answer.questionId]
    if (review?.score === null || review?.score === undefined || review.score < 0 || review.score > answer.score) {
      ElMessage.warning(`第 ${activeSubmission.value.answers.indexOf(answer) + 1} 题得分应在 0 到 ${answer.score} 分之间`)
      return
    }
    if (!String(review.feedback || '').trim()) {
      ElMessage.warning(`请填写第 ${activeSubmission.value.answers.indexOf(answer) + 1} 题的反馈`)
      return
    }
  }
  if (!reviewForm.feedback.trim()) { ElMessage.warning('请填写整份练习的总反馈'); return }
  saving.value = true
  try {
    await reviewPracticeSubmission(activeSubmission.value.submissionId, {
      score: totalScore.value,
      feedback: reviewForm.feedback.trim(),
      questionReviews: openAnswers.map((answer) => ({
        questionId: answer.questionId,
        score: Number(reviewForm.questionReviews[answer.questionId].score),
        feedback: reviewForm.questionReviews[answer.questionId].feedback.trim(),
      })),
    })
    ElMessage.success('批改已保存，学生现在可以看到反馈')
    reviewVisible.value = false
    await loadSubmissions()
  } catch (error) { ElMessage.error(error?.message || '批改保存失败') }
  finally { saving.value = false }
}

onMounted(loadSubmissions)
</script>

<template>
  <main class="practice-review-page">
    <header class="review-header">
      <div><p class="eyebrow">PRACTICE REVIEW</p><h1>练习批改</h1><p>查看学生提交的课程练习，结合参考答案给出评分和具体反馈。</p></div>
      <div class="header-actions"><el-button type="primary" :loading="courseLoading" @click="openPublish"><el-icon><Plus /></el-icon>发布习题</el-button><el-button circle aria-label="刷新学生提交" :loading="loading" @click="loadSubmissions"><el-icon><RefreshRight /></el-icon></el-button></div>
    </header>

    <section class="review-summary"><div><span>当前列表</span><strong>{{ submissions.length }}</strong></div><div><span>待批改</span><strong>{{ pendingCount }}</strong></div><div><span>批改后学生可见答案解析</span><el-icon><DocumentChecked /></el-icon></div></section>

    <section class="review-toolbar"><el-radio-group v-model="status" @change="loadSubmissions"><el-radio-button label="SUBMITTED">待批改</el-radio-button><el-radio-button label="REVIEWED">已批改</el-radio-button><el-radio-button label="">全部</el-radio-button></el-radio-group></section>

    <section class="submission-list" v-loading="loading">
      <article v-for="item in submissions" :key="item.submissionId" class="submission-card">
        <div class="submission-main"><div class="submission-top"><span>{{ item.courseName }}</span><el-tag :type="statusType(item.status)">{{ statusText(item.status) }}</el-tag></div><h2>{{ item.practiceTitle }}</h2><p>{{ item.studentName || '学生' }} · {{ formatTime(item.submitTime) }} 提交</p><div class="score-line"><span>客观题自动得分 <strong>{{ item.autoScore }}</strong> 分</span><span v-if="item.teacherScore !== null && item.teacherScore !== undefined">老师评分 <strong>{{ item.teacherScore }}</strong> 分</span></div></div>
        <div class="submission-actions"><el-button type="danger" plain @click="removePractice(item)">删除练习</el-button><el-button type="primary" plain @click="openReview(item)">{{ item.status === 'REVIEWED' ? '查看批改' : '开始批改' }}</el-button></div>
      </article>
    </section>
    <el-empty v-if="!loading && !submissions.length" description="当前没有需要查看的学生练习提交" />

    <el-dialog v-model="reviewVisible" class="review-dialog" width="min(900px, 94vw)" :title="activeSubmission ? `${activeSubmission.studentName || '学生'}的练习` : '练习批改'" destroy-on-close>
      <template v-if="activeSubmission">
        <div class="dialog-meta"><span>{{ activeSubmission.courseName }}</span><span>{{ activeSubmission.practiceTitle }}</span></div>
        <article v-for="(answer, index) in activeSubmission.answers" :key="answer.questionId" class="answer-card">
          <h3>{{ index + 1 }}. {{ answer.questionContent }} <small>满分 {{ answer.score }} 分</small></h3>
          <p><b>学生答案：</b>{{ answer.studentAnswer || '未作答' }}</p>
          <p><b>参考答案：</b>{{ answer.referenceAnswer || '开放题，请结合学习目标进行评价' }}</p>
          <p v-if="answer.explanation" class="explanation">{{ answer.explanation }}</p>
          <div v-if="answer.questionType === 'SINGLE'" class="auto-question-score">
            本题由系统自动评分：<strong>{{ answer.awardedScore }} / {{ answer.score }} 分</strong>
          </div>
          <div v-else-if="reviewForm.questionReviews[answer.questionId]" class="question-review-editor">
            <label>本题得分</label>
            <div class="score-editor"><el-input-number v-model="reviewForm.questionReviews[answer.questionId].score" :min="0" :max="answer.score" /><span>/ {{ answer.score }} 分</span></div>
            <label>本题反馈</label>
            <el-input v-model="reviewForm.questionReviews[answer.questionId].feedback" type="textarea" :rows="3" maxlength="500" show-word-limit placeholder="针对这道开放题指出优点和需要改进的地方" />
          </div>
        </article>
        <el-form label-position="top" class="review-form">
          <div class="total-score-row"><span>本次练习总分</span><strong>{{ totalScore }} / 100 分</strong><small>选择题自动得分与开放题得分之和</small></div>
          <el-form-item label="整份练习总反馈"><el-input v-model="reviewForm.feedback" type="textarea" :rows="4" maxlength="1000" show-word-limit placeholder="总结整体完成情况，并给出下一步学习建议" /></el-form-item>
        </el-form>
      </template>
      <template #footer><el-button @click="reviewVisible = false">取消</el-button><el-button type="primary" :loading="saving" @click="saveReview"><el-icon><Check /></el-icon>保存批改</el-button></template>
    </el-dialog>

    <el-dialog v-model="publishVisible" class="publish-dialog" width="min(920px, 94vw)" title="发布习题" destroy-on-close>
      <el-form label-position="top" class="publish-form">
        <div class="publish-base">
          <el-form-item label="发布到课程"><el-select v-model="publishForm.courseId" placeholder="请选择课程"><el-option v-for="course in teacherCourses" :key="course.id" :label="course.name" :value="course.id" /></el-select></el-form-item>
          <el-form-item label="练习总分"><el-input-number v-model="publishForm.totalScore" :min="1" :max="100" /></el-form-item>
        </div>
        <el-form-item label="练习标题"><el-input v-model="publishForm.title" maxlength="120" show-word-limit placeholder="例如：第一章基础概念练习" /></el-form-item>
        <el-form-item label="练习说明"><el-input v-model="publishForm.intro" type="textarea" :rows="2" maxlength="500" show-word-limit placeholder="告诉学生这份练习主要考查什么" /></el-form-item>

        <article v-for="(question, index) in publishForm.questions" :key="index" class="publish-question">
          <div class="question-heading"><strong>第 {{ index + 1 }} 题</strong><el-button text type="danger" :disabled="publishForm.questions.length === 1" @click="removeQuestion(index)">删除本题</el-button></div>
          <div class="question-config"><el-form-item label="题型"><el-select v-model="question.type" @change="changeQuestionType(question)"><el-option label="单选题" value="SINGLE" /><el-option label="开放题" value="SHORT" /></el-select></el-form-item><el-form-item label="分值"><el-input-number v-model="question.score" :min="1" :max="100" /></el-form-item></div>
          <el-form-item label="题干"><el-input v-model="question.content" type="textarea" :rows="2" maxlength="3000" placeholder="请输入题目内容" /></el-form-item>
          <template v-if="question.type === 'SINGLE'"><div class="options-title"><span>选项</span><el-button text type="primary" :disabled="question.options.length >= 6" @click="addOption(question)">添加选项</el-button></div><div v-for="(option, optionIndex) in question.options" :key="optionIndex" class="option-row"><b>{{ String.fromCharCode(65 + optionIndex) }}</b><el-input v-model="question.options[optionIndex]" :placeholder="`选项 ${String.fromCharCode(65 + optionIndex)}`" /><el-button text type="danger" :disabled="question.options.length <= 2" @click="removeOption(question, optionIndex)">删除</el-button></div><el-form-item label="正确答案"><el-radio-group v-model="question.referenceAnswer"><el-radio v-for="(_, optionIndex) in question.options" :key="optionIndex" :label="String.fromCharCode(65 + optionIndex)">{{ String.fromCharCode(65 + optionIndex) }}</el-radio></el-radio-group></el-form-item></template>
          <el-form-item :label="question.type === 'SINGLE' ? '答案说明' : '参考答案或评分提示'"><el-input v-model="question.referenceAnswer" v-if="question.type === 'SHORT'" type="textarea" :rows="2" placeholder="写出参考要点，供批改时查看" /><el-input v-model="question.explanation" v-else type="textarea" :rows="2" placeholder="解释正确答案的原因" /></el-form-item>
          <el-form-item v-if="question.type === 'SHORT'" label="答案解析"><el-input v-model="question.explanation" type="textarea" :rows="2" placeholder="学生被批改后可看到的解析" /></el-form-item>
        </article>
        <el-button class="add-question" plain @click="addQuestion"><el-icon><Plus /></el-icon>添加题目</el-button>
      </el-form>
      <template #footer><el-button @click="publishVisible = false">取消</el-button><el-button type="primary" :loading="publishing" @click="publishPractice">确认发布</el-button></template>
    </el-dialog>
  </main>
</template>

<style scoped>
:global(:root) { --explore-ink: #3d3564; --explore-purple: #8178cf; --explore-pink: #ee91bb; --explore-mint: #52bbc4; --explore-yellow: #fff1a8; --explore-paper: #fbfbff; }
.practice-review-page { min-height: 100%; padding: 36px clamp(18px, 4vw, 80px) 56px; background-color: var(--explore-paper); background-image: linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px), linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px); background-size: 32px 32px; color: var(--explore-ink); }
.review-header { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; max-width: 1560px; margin: 0 auto 28px; padding: 30px clamp(22px, 4vw, 44px); overflow: hidden; border: 1px solid var(--explore-ink); border-radius: 8px; background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 52%, #d3f2f2 100%); box-shadow: 7px 8px 0 rgb(61 53 100 / 25%); }
.review-header::after { position: absolute; right: 8%; bottom: -90px; width: 260px; height: 165px; border: 1px dashed rgb(61 53 100 / 32%); border-radius: 50%; content: ''; transform: rotate(-14deg); }
.review-header > div { position: relative; z-index: 1; }.header-actions, .submission-actions { display: flex; align-items: flex-start; gap: 10px; }
.eyebrow { margin: 0 0 8px; color: #655d86; font-size: 11px; font-weight: 800; letter-spacing: 0; }.review-header h1 { margin: 0; color: var(--explore-ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 38px; font-weight: 900; }.review-header p:last-child { max-width: 660px; margin: 11px 0 0; color: #5e577d; font-size: 14px; line-height: 1.75; }
.header-actions :deep(.el-button) { border: 1px solid #4e4473; border-radius: 5px; font-weight: 800; white-space: nowrap; word-break: keep-all; }.header-actions :deep(.el-button--primary) { background: var(--explore-purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 28%); }.header-actions :deep(.el-button:hover) { transform: translate(-2px, -2px); box-shadow: 5px 6px 0 rgb(61 53 100 / 28%); }
.review-summary { display: grid; max-width: 980px; margin: 0 auto 26px; grid-template-columns: repeat(3, 1fr); overflow: hidden; border: 1px solid var(--explore-ink); border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 14%); }.review-summary div { display: grid; gap: 5px; padding: 18px 22px; border-right: 1px solid rgb(61 53 100 / 12%); }.review-summary div:last-child { border-right: 0; }.review-summary span { color: #756d91; font-size: 12px; }.review-summary strong { color: var(--explore-ink); font-size: 24px; font-weight: 900; }.review-summary .el-icon { color: var(--explore-mint); font-size: 23px; }
.review-toolbar { max-width: 1560px; margin: 0 auto 17px; }.review-toolbar :deep(.el-radio-button__inner) { border-color: rgb(61 53 100 / 24%); color: var(--explore-ink); box-shadow: none; font-weight: 800; }.review-toolbar :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { border-color: var(--explore-ink); background: var(--explore-purple); color: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 24%); }
.submission-list { display: grid; max-width: 1560px; min-height: 180px; gap: 15px; margin: 0 auto; }.submission-card { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 21px 23px; border: 1px solid var(--explore-ink); border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 14%); }.submission-card:nth-child(3n + 1) { background: #fffdf0; }.submission-card:nth-child(3n + 2) { background: #f8f5ff; }.submission-card:nth-child(3n + 3) { background: #effcfc; }.submission-main { min-width: 0; }.submission-top { display: flex; align-items: center; gap: 10px; color: var(--explore-ink); font-size: 13px; font-weight: 800; }.submission-card :deep(.el-tag) { border-color: rgb(61 53 100 / 24%); color: var(--explore-ink); }.submission-card h2 { margin: 11px 0 4px; color: var(--explore-ink); font-size: 18px; font-weight: 900; }.submission-card p { margin: 0; color: #756d91; font-size: 13px; }.score-line { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 13px; color: #655d7e; font-size: 12px; }.score-line strong { color: var(--explore-ink); }
.submission-actions :deep(.el-button) { border-radius: 5px; font-weight: 800; white-space: nowrap; word-break: keep-all; }.submission-actions :deep(.el-button--primary) { border-color: #4e4473; background: var(--explore-purple); color: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 24%); }.submission-actions :deep(.el-button--danger) { border-color: #ad527d; background: #fff2f8; color: #ad527d; }.submission-actions :deep(.el-button:hover) { transform: translate(-2px, -2px); }
.practice-review-page :deep(.el-empty) { max-width: 720px; margin: 34px auto; border: 1px solid var(--explore-ink); border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 12%); }.practice-review-page :deep(.review-dialog .el-dialog), .practice-review-page :deep(.publish-dialog .el-dialog) { border: 1px solid var(--explore-ink); border-radius: 8px; background: var(--explore-paper); box-shadow: 7px 8px 0 rgb(61 53 100 / 22%); }.practice-review-page :deep(.review-dialog .el-dialog__header), .practice-review-page :deep(.publish-dialog .el-dialog__header) { margin-right: 0; padding: 21px 24px 15px; border-bottom: 1px solid rgb(61 53 100 / 14%); background: linear-gradient(118deg, #e8e4ff, #f9ddec); }.practice-review-page :deep(.review-dialog .el-dialog__title), .practice-review-page :deep(.publish-dialog .el-dialog__title) { color: var(--explore-ink); font-weight: 900; }.practice-review-page :deep(.review-dialog .el-dialog__body), .practice-review-page :deep(.publish-dialog .el-dialog__body) { max-height: 68vh; overflow-y: auto; padding: 22px 24px; }.dialog-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; color: #655d7e; font-size: 13px; }.dialog-meta span { padding: 5px 9px; border: 1px solid rgb(61 53 100 / 16%); border-radius: 4px; background: var(--explore-yellow); }.answer-card { padding: 17px; border: 1px solid var(--explore-ink); border-radius: 7px; background: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 10%); }.answer-card + .answer-card { margin-top: 14px; }.answer-card h3 { margin: 0; color: var(--explore-ink); font-size: 14px; line-height: 1.6; }.answer-card h3 small { margin-left: 4px; color: #756d91; font-weight: 400; }.answer-card p { margin: 9px 0 0; color: #5e577d; line-height: 1.6; white-space: pre-wrap; }.answer-card .explanation { color: #39766d; }.auto-question-score { margin-top: 14px; padding: 10px 12px; border: 1px solid #398b82; border-radius: 6px; background: #ecfbf6; color: #276b62; font-size: 13px; }.question-review-editor { display: grid; gap: 9px; margin-top: 16px; padding-top: 15px; border-top: 1px dashed rgb(61 53 100 / 25%); }.question-review-editor label { color: var(--explore-ink); font-size: 13px; font-weight: 800; }.score-editor { display: flex; align-items: center; gap: 10px; color: #6b6484; font-size: 13px; }.review-form { margin-top: 22px; padding-top: 18px; border-top: 1px solid rgb(61 53 100 / 15%); }.total-score-row { display: grid; grid-template-columns: auto auto 1fr; gap: 12px; align-items: baseline; margin-bottom: 18px; padding: 15px; border: 1px solid #55aeb4; border-radius: 7px; background: #ecfbfc; }.total-score-row span { color: #476e73; }.total-score-row strong { color: #287f88; font-size: 21px; }.total-score-row small { color: #6e898d; }.publish-base, .question-config { display: grid; grid-template-columns: 1fr 180px; gap: 16px; }.publish-question { margin-top: 18px; padding: 18px; border: 1px solid var(--explore-ink); border-radius: 8px; background: #fffdf0; box-shadow: 3px 4px 0 rgb(61 53 100 / 10%); }.question-heading, .options-title, .option-row { display: flex; align-items: center; gap: 10px; }.question-heading { justify-content: space-between; margin-bottom: 14px; color: var(--explore-ink); }.options-title { justify-content: space-between; margin-bottom: 7px; color: var(--explore-ink); font-size: 13px; font-weight: 800; }.option-row { margin-bottom: 8px; }.option-row b { width: 20px; color: var(--explore-purple); }.add-question { width: 100%; margin-top: 16px; }
.practice-review-page :deep(.el-dialog__footer) { padding: 14px 24px 22px; border-top: 1px solid rgb(61 53 100 / 14%); }.practice-review-page :deep(.el-dialog .el-button--primary) { border-color: #4e4473; border-radius: 5px; background: var(--explore-purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 23%); font-weight: 800; }.practice-review-page :deep(.el-dialog .el-button:hover) { transform: translate(-1px, -1px); }
@media (max-width: 700px) { .practice-review-page { padding: 24px 16px 36px; }.review-header { align-items: stretch; flex-direction: column; padding: 24px 20px 28px; }.review-header h1 { font-size: 32px; }.header-actions { align-items: stretch; flex-direction: column; }.header-actions :deep(.el-button) { width: 100%; }.review-summary { grid-template-columns: 1fr; }.review-summary div { border-right: 0; border-bottom: 1px solid rgb(61 53 100 / 12%); }.review-summary div:last-child { border-bottom: 0; }.submission-card { align-items: stretch; flex-direction: column; }.submission-actions, .submission-card .el-button { width: 100%; }.total-score-row, .publish-base, .question-config { grid-template-columns: 1fr; gap: 7px; }.practice-review-page :deep(.review-dialog .el-dialog__body), .practice-review-page :deep(.publish-dialog .el-dialog__body) { padding: 18px 16px; }.practice-review-page :deep(.el-dialog__footer) { padding: 12px 16px 18px; } }
@media (prefers-reduced-motion: reduce) { .practice-review-page *, .practice-review-page *::before, .practice-review-page *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
</style>
