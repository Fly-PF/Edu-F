<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, CircleCheck, DocumentChecked } from '@element-plus/icons-vue'
import { getStudentPractice, submitStudentPractice } from '@/api/learningPractice'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const practice = ref(null)
const answers = reactive({})
const practiceId = computed(() => Number(route.params.practiceId))
const isReadOnly = computed(() => ['SUBMITTED', 'REVIEWED'].includes(practice.value?.submissionStatus))

function statusText(status) { return { SUBMITTED: '已提交，等待老师批改', REVIEWED: '老师已完成批改' }[status] || '未提交' }
function choiceValue(value) {
  const text = String(value || '').trim().toUpperCase()
  if (/^\d+$/.test(text)) return String.fromCharCode(64 + Number(text))
  return text
}

async function loadPractice() {
  loading.value = true
  try {
    const data = await getStudentPractice(practiceId.value)
    practice.value = data
    Object.keys(answers).forEach((key) => delete answers[key])
    ;(data.questions || []).forEach((question) => {
      answers[question.id] = question.type === 'SINGLE' ? choiceValue(question.answer) : (question.answer || '')
    })
  } catch (error) {
    ElMessage.error(error?.message || '练习加载失败')
    router.replace({ name: 'student-practices' })
  } finally { loading.value = false }
}

function unansweredCount() { return (practice.value?.questions || []).filter((question) => !String(answers[question.id] || '').trim()).length }

async function submit() {
  const count = unansweredCount()
  if (count) { ElMessage.warning(`还有 ${count} 道题未完成`) ; return }
  try {
    await ElMessageBox.confirm('提交后老师将看到你的答案。老师批改前仍可在这里查看提交内容。', '确认提交练习', { type: 'warning', confirmButtonText: '提交练习', cancelButtonText: '再检查一下' })
    submitting.value = true
    practice.value = await submitStudentPractice(practiceId.value, { answers: practice.value.questions.map((item) => ({ questionId: item.id, answer: answers[item.id] })) })
    ElMessage.success('练习已提交，等待老师批改')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '提交失败')
  } finally { submitting.value = false }
}

onMounted(loadPractice)
</script>

<template>
  <main v-loading="loading" class="practice-take-page">
    <template v-if="practice">
      <header class="take-header">
        <el-button text @click="router.push({ name: 'student-practices' })"><el-icon><ArrowLeft /></el-icon>返回学习练习</el-button>
        <div class="take-heading"><p>{{ practice.courseName }}</p><h1>{{ practice.title }}</h1><span>{{ practice.intro }}</span></div>
        <el-tag :type="practice.submissionStatus === 'REVIEWED' ? 'success' : practice.submissionStatus === 'SUBMITTED' ? 'warning' : 'info'">{{ statusText(practice.submissionStatus) }}</el-tag>
      </header>

      <section v-if="practice.submissionStatus === 'REVIEWED'" class="teacher-feedback">
        <el-icon><CircleCheck /></el-icon><div><strong>老师的反馈 · {{ practice.score }} / {{ practice.totalScore }} 分</strong><p>{{ practice.teacherFeedback || '老师已确认你的完成情况，继续保持对课程资料的复盘。' }}</p></div>
      </section>

      <section class="question-list">
        <article v-for="(question, index) in practice.questions" :key="question.id" class="question-card">
          <div class="question-title"><span>{{ index + 1 }}</span><h2>{{ question.content }}</h2><small>{{ question.score }} 分</small></div>
          <el-radio-group v-if="question.type === 'SINGLE'" v-model="answers[question.id]" :disabled="isReadOnly" class="option-list">
            <el-radio v-for="option in question.options" :key="option" :value="option.slice(0, 1)">{{ option }}</el-radio>
          </el-radio-group>
          <el-input v-else v-model="answers[question.id]" :disabled="isReadOnly" type="textarea" :rows="5" maxlength="500" show-word-limit placeholder="写下你的理解、观察或设计思路" />
          <div v-if="practice.submissionStatus === 'REVIEWED' && question.awardedScore !== null && question.awardedScore !== undefined" class="question-result">
            <strong>本题得分：{{ question.awardedScore }} / {{ question.score }} 分</strong>
            <p v-if="question.teacherFeedback">老师反馈：{{ question.teacherFeedback }}</p>
            <p v-else-if="question.type === 'SINGLE'">本题由系统根据标准答案自动评分。</p>
          </div>
          <div v-if="question.referenceAnswer" class="reference-answer"><el-icon><DocumentChecked /></el-icon><div><strong>参考答案：{{ question.referenceAnswer }}</strong><p>{{ question.explanation }}</p></div></div>
        </article>
      </section>
      <footer v-if="!isReadOnly" class="submit-bar"><span>共 {{ practice.questions.length }} 题，满分 {{ practice.totalScore }} 分</span><el-button type="primary" :loading="submitting" @click="submit">提交给老师批改</el-button></footer>
    </template>
  </main>
</template>

<style scoped>
.practice-take-page { min-height: 100%; padding: 28px max(18px, calc((100% - 900px) / 2)) 100px; background: #f5f7fb; color: #172038; }
.take-header { position: relative; display: grid; gap: 12px; padding-bottom: 25px; border-bottom: 1px solid #e4e9f1; }.take-heading p { margin: 8px 0 5px; color: #6651d9; font-size: 13px; font-weight: 650; }.take-heading h1 { margin: 0; font-size: 28px; }.take-heading span { display: block; margin-top: 9px; color: #718096; font-size: 14px; }.take-header > .el-tag { position: absolute; top: 38px; right: 0; }
.teacher-feedback { display: flex; gap: 12px; margin: 22px 0; padding: 17px; border: 1px solid #bfe4cf; border-radius: 8px; background: #f1fbf5; }.teacher-feedback .el-icon { margin-top: 2px; color: #16a05d; font-size: 22px; }.teacher-feedback strong { color: #146b42; }.teacher-feedback p { margin: 6px 0 0; color: #3d6c55; line-height: 1.6; }
.question-list { display: grid; gap: 16px; margin-top: 24px; }.question-card { padding: 23px; border: 1px solid #e1e6ef; border-radius: 8px; background: #fff; }.question-title { display: grid; grid-template-columns: 30px 1fr auto; gap: 10px; align-items: start; }.question-title > span { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 50%; background: #eae6ff; color: #5e47d3; font-size: 13px; font-weight: 700; }.question-title h2 { margin: 3px 0 0; font-size: 17px; line-height: 1.55; }.question-title small { padding: 5px 8px; border-radius: 4px; background: #f0f3f8; color: #65748b; }.option-list { display: grid; gap: 12px; margin: 20px 0 0 40px; }.option-list :deep(.el-radio) { height: auto; margin: 0; line-height: 1.6; }.question-card :deep(.el-textarea) { display: block; margin-top: 20px; }.question-result { margin-top: 18px; padding: 13px 14px; border: 1px solid #c9dfef; border-radius: 6px; background: #f1f7fc; color: #315c7c; }.question-result strong { font-size: 14px; }.question-result p { margin: 7px 0 0; font-size: 13px; line-height: 1.65; }.reference-answer { display: flex; gap: 10px; margin-top: 14px; padding: 14px; border-radius: 6px; background: #f0f8f4; color: #37684f; }.reference-answer .el-icon { margin-top: 2px; }.reference-answer strong { font-size: 13px; }.reference-answer p { margin: 6px 0 0; font-size: 13px; line-height: 1.65; }.submit-bar { position: fixed; right: 0; bottom: 0; left: 0; display: flex; align-items: center; justify-content: center; gap: 36px; padding: 14px; border-top: 1px solid #dde4ee; background: rgb(255 255 255 / 96%); box-shadow: 0 -6px 18px rgb(26 42 65 / 6%); color: #66758a; }
@media (max-width: 700px) { .practice-take-page { padding: 20px 16px 88px; }.take-header > .el-tag { position: static; width: fit-content; }.question-card { padding: 18px; }.option-list { margin-left: 0; }.submit-bar { justify-content: space-between; gap: 12px; padding: 12px 16px; font-size: 12px; } }
</style>
