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
const choiceLabels = ['A', 'B', 'C', 'D']

function statusText(status) { return { SUBMITTED: '已提交，等待老师批改', REVIEWED: '老师已完成批改' }[status] || '未提交' }
function choiceValue(value) {
  const text = String(value || '').trim().toUpperCase()
  if (/^\d+$/.test(text)) return choiceLabels[Number(text) - 1] || ''
  return choiceLabels.includes(text) ? text : ''
}

function choiceLabel(index) {
  return choiceLabels[index] || ''
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
            <el-radio v-for="(option, optionIndex) in question.options.slice(0, 4)" :key="`${question.id}-${optionIndex}`" :value="choiceLabel(optionIndex)">
              <span class="choice-option"><b>{{ choiceLabel(optionIndex) }}</b><span>{{ option }}</span></span>
            </el-radio>
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
:global(:root) { --explore-ink: #3d3564; --explore-purple: #8178cf; --explore-pink: #ee91bb; --explore-mint: #52bbc4; --explore-yellow: #fff1a8; --explore-paper: #fbfbff; }
.practice-take-page { min-height: 100%; padding: 32px max(18px, calc((100% - 980px) / 2)) 112px; background-color: var(--explore-paper); background-image: linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px), linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px); background-size: 32px 32px; color: var(--explore-ink); }
.take-header { position: relative; display: grid; gap: 12px; padding: 20px 24px 27px; border: 1px solid var(--explore-ink); border-radius: 8px; background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 52%, #d3f2f2 100%); box-shadow: 7px 8px 0 rgb(61 53 100 / 24%); }
.take-header > .el-button { justify-self: start; color: var(--explore-ink); font-weight: 800; white-space: nowrap; word-break: keep-all; }
.take-heading p { margin: 8px 0 5px; color: #655d86; font-size: 13px; font-weight: 800; }
.take-heading h1 { margin: 0; color: var(--explore-ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 34px; font-weight: 900; line-height: 1.25; }
.take-heading span { display: block; max-width: 760px; margin-top: 10px; color: #5e577d; font-size: 14px; line-height: 1.7; }
.take-header > .el-tag { position: absolute; top: 24px; right: 24px; border: 1px solid var(--explore-ink); border-radius: 5px; background: var(--explore-yellow); color: var(--explore-ink); font-weight: 800; }
.teacher-feedback { display: flex; gap: 12px; margin: 25px 0 20px; padding: 17px; border: 1px solid #398b82; border-radius: 8px; background: #ecfbf6; color: #276b62; box-shadow: 4px 5px 0 rgb(82 187 196 / 16%); }
.teacher-feedback .el-icon { margin-top: 2px; color: #398b82; font-size: 22px; }.teacher-feedback strong { color: #276b62; }.teacher-feedback p { margin: 6px 0 0; color: #47766f; line-height: 1.6; }
.question-list { display: grid; gap: 18px; margin-top: 26px; }
.question-card { padding: 24px; border: 1px solid var(--explore-ink); border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 14%); }
.question-card:nth-child(4n + 1) { background: #fffdf0; }.question-card:nth-child(4n + 2) { background: #f8f5ff; }.question-card:nth-child(4n + 3) { background: #effcfc; }.question-card:nth-child(4n + 4) { background: #fff2f8; }
.question-title { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; gap: 11px; align-items: start; }.question-title > span { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid var(--explore-ink); border-radius: 6px; background: var(--explore-yellow); color: var(--explore-ink); font-size: 13px; font-weight: 900; box-shadow: 2px 3px 0 rgb(61 53 100 / 12%); }
.question-title h2 { margin: 3px 0 0; color: var(--explore-ink); font-size: 17px; font-weight: 800; line-height: 1.6; }.question-title small { padding: 5px 8px; border: 1px solid rgb(61 53 100 / 17%); border-radius: 4px; background: rgb(255 255 255 / 70%); color: #655d7e; white-space: nowrap; }
.option-list { display: grid; gap: 10px; margin: 20px 0 0 45px; }.option-list :deep(.el-radio) { display: flex; height: auto; min-height: 40px; align-items: center; margin: 0; padding: 9px 12px; border: 1px solid rgb(61 53 100 / 18%); border-radius: 6px; background: rgb(255 255 255 / 78%); color: var(--explore-ink); line-height: 1.6; }
.option-list :deep(.el-radio:hover) { border-color: var(--explore-purple); background: #f7f4ff; }.option-list :deep(.el-radio.is-checked) { border-color: var(--explore-purple); background: #eeeafa; box-shadow: 3px 4px 0 rgb(129 120 207 / 18%); }.option-list :deep(.el-radio__label) { white-space: normal; word-break: break-word; }
.choice-option { display: inline-flex; align-items: flex-start; gap: 8px; }.choice-option b { min-width: 18px; color: var(--explore-ink); font-weight: 900; }
.question-card :deep(.el-textarea) { display: block; margin-top: 20px; }.question-card :deep(.el-textarea__inner) { border: 1px solid var(--explore-ink); border-radius: 6px; background: rgb(255 255 255 / 82%); color: var(--explore-ink); box-shadow: 3px 4px 0 rgb(61 53 100 / 9%); }
.question-result { margin-top: 18px; padding: 13px 14px; border: 1px solid #398b82; border-radius: 6px; background: #ecfbf6; color: #276b62; }.question-result strong { font-size: 14px; }.question-result p { margin: 7px 0 0; font-size: 13px; line-height: 1.65; }
.reference-answer { display: flex; gap: 10px; margin-top: 14px; padding: 14px; border: 1px solid rgb(82 187 196 / 35%); border-radius: 6px; background: #eefafa; color: #376c72; }.reference-answer .el-icon { margin-top: 2px; }.reference-answer strong { font-size: 13px; }.reference-answer p { margin: 6px 0 0; font-size: 13px; line-height: 1.65; }
.submit-bar { position: fixed; right: 0; bottom: 0; left: 0; z-index: 5; display: flex; align-items: center; justify-content: center; gap: 36px; padding: 14px clamp(16px, 5vw, 80px); border-top: 1px solid var(--explore-ink); background: rgb(251 251 255 / 96%); box-shadow: 0 -5px 0 rgb(61 53 100 / 9%); color: #665f80; }
.submit-bar :deep(.el-button) { border: 1px solid #4e4473; border-radius: 5px; background: var(--explore-purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 28%); font-weight: 800; white-space: nowrap; word-break: keep-all; }.submit-bar :deep(.el-button:hover) { background: #7369c2; transform: translate(-2px, -2px); box-shadow: 5px 6px 0 rgb(61 53 100 / 28%); }
@media (max-width: 700px) { .practice-take-page { padding: 20px 16px 96px; }.take-header { padding: 17px 18px 23px; }.take-heading h1 { font-size: 29px; }.take-header > .el-tag { position: static; width: fit-content; }.question-card { padding: 18px; }.question-title { grid-template-columns: 32px minmax(0, 1fr); }.question-title small { grid-column: 2; justify-self: start; }.option-list { margin-left: 0; }.submit-bar { justify-content: space-between; gap: 12px; padding: 12px 16px; font-size: 12px; } }
@media (prefers-reduced-motion: reduce) { .practice-take-page *, .practice-take-page *::before, .practice-take-page *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
</style>
