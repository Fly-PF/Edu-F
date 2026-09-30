<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowRight, Back, ChatDotRound, Close, CopyDocument, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import 'katex/dist/katex.min.css'
import SceneEngine from '@/components/problemSolving/SceneEngine.vue'
import { createProblemSession, getProblem, getProblemImage } from '@/api/problemSolving'
import { connectLessonSocket } from '@/problemSolving/lessonSocket'
import { useLessonSessionStore } from '@/stores/lessonSession'

const route = useRoute(); const router = useRouter(); const session = useLessonSessionStore()
const problem = ref(null); const loading = ref(true); const question = ref(''); const answerVisible = ref(false); const aiDrawerVisible = ref(false); const chatHistoryRef = ref(null); const questionSenderRef = ref(null)
const imageUrls = ref({})
const currentStep = computed(() => session.lessonSteps[session.currentStepIndex])
const hasPreviousStep = computed(() => Boolean(session.lessonSteps[session.currentStepIndex - 1]?.text))
const hasNextStep = computed(() => Boolean(session.lessonSteps[session.currentStepIndex + 1]?.text))
const sceneDefinition = computed(() => problem.value?.definition.sceneDefinition || { sceneType: 'textOnly' })
const problemImageUrls = computed(() => (problem.value?.images || []).map(item => imageUrls.value[item.id]).filter(Boolean))
const isQuestionLoading = computed(() => session.qaHistory.some(item => item.loading))
function normalizeMarkdown(markdown) {
  return String(markdown || '').split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g)
    .map((part, index) => index % 2 ? part : part
      .replace(/(^|\n)(#{1,6})(?=\S)/g, '$1$2 ')
      .replace(/(具体来说：)\s*(?=\d+\.\s)/g, '$1\n\n')
      .replace(/([。；])\s*(?=\d+\.\s)/g, '$1\n\n')
      .replace(/(?:△|\\triangle\s*)([A-Za-z]{2,})(?:(?:△|\\triangle\s*)\1)*/g, '$\\triangle $1$')
      .replace(/\b([A-Za-z]\w*(?:\([^()]*\))?\s*=\s*[-+*/^().A-Za-z0-9²³×÷]+?)\1\b/g, '$$$1$')
      .replace(/\b([A-Za-z]\w*(?:\([^()]*\))?\s*=\s*[-+*/^().A-Za-z0-9²³×÷]+(?:\s*[<>≤≥=]\s*[-+*/^().A-Za-z0-9²³×÷]+)*)/g, '$$$1$'))
    .join('')
}
function formatAiAnswerMarkdown(markdown) {
  return String(markdown || '').split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\$[^$\n]+\$)/g)
    .map((part, index) => index % 2 ? part : part
      .replace(/(^|\n)\s*(#{1,6})\s*结论(?=\S)/g, '$1$2 结论\n\n')
      .replace(/([。！？])\s*(#{1,6})\s*结论(?=\S)/g, '$1\n\n$2 结论\n\n')
      .replace(/(^|\n)\s*(#{1,6})\s*推导(?=\d+\.)/g, '$1$2 推导\n\n')
      .replace(/([。！？])\s*(#{1,6})\s*推导(?=\d+\.)/g, '$1\n\n$2 推导\n\n')
      .replace(/([。；：])\s*(\d+)\.(?=[\u4e00-\u9fff])/g, '$1\n\n$2. ')
      .replace(/(^|\n)(\s*)(\d+)\.(?=\S)/g, '$1$2$3. ')
    ).join('')
}

async function loadProblem(problemId) {
  loading.value = true; session.clear(); clearImageUrls(); problem.value = null; answerVisible.value = false; aiDrawerVisible.value = false
  try {
    problem.value = await getProblem(problemId); session.initialize(problem.value)
    const imageLoad = Promise.all((problem.value.images || []).map(async image => { try { const response = await getProblemImage(image.url); return [image.id, URL.createObjectURL(response.data)] } catch { return [image.id, ''] } }))
    const sessionInfo = await createProblemSession(problem.value.id)
    const connection = connectLessonSocket(sessionInfo, {
      onState: (status) => session.setSocketStatus(status), onEvent: (event) => session.applySocketEvent(event), onError: (message) => ElMessage.error(message),
    })
    session.attachSocket(sessionInfo, connection)
    imageUrls.value = Object.fromEntries(await imageLoad)
  } catch (error) { ElMessage.error(error.message || '讲题加载失败') } finally { loading.value = false }
}
function clearImageUrls() { Object.values(imageUrls.value).forEach(url => URL.revokeObjectURL(url)); imageUrls.value = {} }
watch(() => route.params.problemId, loadProblem, { immediate: true })
watch(() => session.qaHistory, async () => { await nextTick(); const container = chatHistoryRef.value; if (container) container.scrollTop = container.scrollHeight }, { deep: true })
function back() { router.push({ name: 'problem-solving-catalog' }) }
function openAiDrawer() { aiDrawerVisible.value = true }
function startLesson() { if (!session.webSocketConnection?.startLesson()) ElMessage.warning('实时会话未连接，请稍后重试') }
function selectStep(index) {
  if (!session.selectStep(index)) return
  session.webSocketConnection?.selectStep(session.lessonSteps[index].id)
}
function nextStep() {
  const nextIndex = session.currentStepIndex + 1
  if (!session.selectStep(nextIndex)) return
  session.webSocketConnection?.selectStep(session.lessonSteps[nextIndex].id)
}
function previousStep() {
  const previousIndex = session.currentStepIndex - 1
  if (!session.selectStep(previousIndex)) return
  session.webSocketConnection?.selectStep(session.lessonSteps[previousIndex].id)
}
function updateT(value) { session.updateVariable('t', value) }
function updateExtension(value) { session.updateVariable('extension', value) }
function updateSceneVariable({ name, value }) { session.updateVariable(name, value) }
function updateSceneEntity({ id, changes }) { session.updateEntity(id, changes) }
function updateSeriesPoint({ seriesId, pointIndex, point }) { session.updateSeriesPoint(seriesId, pointIndex, point) }
function setQuestion(text) { question.value = text; questionSenderRef.value?.setText(text); questionSenderRef.value?.focus('end') }
function syncQuestion() { question.value = questionSenderRef.value?.getModelValue?.().text || '' }
function askAi() {
  const text = questionSenderRef.value?.getModelValue?.().text.trim() || question.value.trim(); if (!text || isQuestionLoading.value) return
  const eventId = crypto.randomUUID(); session.startQuestion(text, eventId)
  const sent = session.webSocketConnection?.sendQuestion({ eventId, cardId: currentStep.value?.id || 'UNDERSTAND', question: text, level: 'basic' })
  if (!sent) { session.failQuestion(eventId, '实时会话未连接，请稍后重试。'); ElMessage.warning('实时会话未连接') } else { question.value = ''; questionSenderRef.value?.clear() }
}
async function copyMessageContent(content) {
  const text = String(content ?? '').trim()
  if (!text) return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    ElMessage.success('已复制内容')
  } catch {
    ElMessage.error('复制失败')
  }
}
onBeforeUnmount(() => { clearImageUrls(); session.clear() })
</script>

<template>
  <main v-if="problem" class="lesson-page">
    <button class="back-link" type="button" @click="back"><el-icon><Back /></el-icon>返回讲题题库</button>
    <header class="lesson-header"><div><p>{{ problem.subject }} · {{ problem.category }} · {{ problem.difficulty }}</p><h1>{{ problem.title }}</h1></div><small>题目版本 v{{ problem.version }}</small></header>
    <section class="problem-stem"><h2>题面</h2><MarkdownRenderer class="problem-markdown" :markdown="normalizeMarkdown(problem.definition.stem)" :enable-latex="true"/><div v-if="problemImageUrls.length" class="problem-images"><el-image v-for="(url, index) in problemImageUrls" :key="url" :src="url" :preview-src-list="problemImageUrls" :initial-index="index" fit="contain"/></div><p v-if="problem.intro" class="intro">{{ problem.intro }}</p></section>
    <section v-if="problem.standardAnswer || problem.answerAnalysis" class="solution-panel"><el-button plain @click="answerVisible = !answerVisible">{{ answerVisible ? '隐藏答案和解析' : '显示答案和解析' }}</el-button><div v-if="answerVisible" class="solution-content"><section class="solution-block solution-answer"><div class="solution-block-title"><span>最终结论</span><h2>标准答案</h2></div><MarkdownRenderer class="solution-markdown" :markdown="normalizeMarkdown(problem.standardAnswer)" :enable-latex="true"/></section><section class="solution-block solution-analysis"><div class="solution-block-title"><span>过程推导</span><h2>答案解析</h2></div><MarkdownRenderer class="solution-markdown" :markdown="normalizeMarkdown(problem.answerAnalysis)" :enable-latex="true"/></section></div></section>
    <Transition name="lesson-state" mode="out-in">
      <section v-if="!session.lessonStarted" class="start-panel">
        <div class="start-panel-copy"><strong>准备好后开始 AI 讲题</strong><span>AI 会按四个步骤实时讲解，并在需要时同步绘图。</span></div>
        <div class="start-panel-route" aria-label="讲题流程"><span><b>01</b>理解题意</span><span><b>02</b>建立模型</span><span><b>03</b>推导计算</span><span><b>04</b>检验总结</span></div>
        <el-button type="primary" size="large" :disabled="session.socketStatus !== 'connected'" @click="startLesson">开始 AI 讲题</el-button>
      </section>
      <div v-else class="lesson-workspace">
        <section class="lesson-layout">
          <aside class="step-rail"><button v-for="(step, index) in session.lessonSteps" :key="step.id" type="button" :class="{ active: index === session.currentStepIndex, available: Boolean(step.text) }" :disabled="!step.text" @click="selectStep(index)"><span>{{ index + 1 }}</span><strong>{{ step.title }}</strong></button></aside>
          <div class="lesson-main"><SceneEngine :definition="sceneDefinition" :scene="session.currentSceneState" @update:t="updateT" @update:extension="updateExtension" @update:variable="updateSceneVariable" @update:entity="updateSceneEntity" @update:series-point="updateSeriesPoint" /></div>
          <aside class="explanation-panel"><span>第 {{ session.currentStepIndex + 1 }} 步</span><h2>{{ currentStep?.title }}</h2><MarkdownRenderer class="step-markdown" :markdown="normalizeMarkdown(currentStep?.text || 'AI 正在组织本步讲解…')" :enable-latex="true" /><div class="step-navigation"><el-button v-if="session.currentStepIndex > 0" :disabled="!hasPreviousStep" @click="previousStep">上一步</el-button><el-button v-if="session.currentStepIndex < 3" type="primary" :disabled="!hasNextStep" @click="nextStep">下一步<el-icon><ArrowRight /></el-icon></el-button></div></aside>
        </section>
      </div>
    </Transition>
    <button v-if="session.lessonStarted" class="ai-drawer-trigger" type="button" aria-label="打开 AI 问答" @click="openAiDrawer"><el-icon><ChatDotRound /></el-icon><span>问 AI</span></button>
    <el-drawer v-model="aiDrawerVisible" class="ai-question-drawer" direction="rtl" size="min(440px, 94vw)" :with-header="false" append-to-body>
      <section class="ai-question-panel" :class="{ 'is-empty': !session.qaHistory.length }">
        <div class="ai-question-heading"><span class="ai-question-icon"><el-icon><ChatDotRound /></el-icon></span><div><strong>问 AI</strong><span>围绕本题与当前讲解继续追问</span></div><button class="ai-drawer-close" type="button" aria-label="关闭 AI 问答" @click="aiDrawerVisible = false"><el-icon><Close /></el-icon></button></div>
        <div ref="chatHistoryRef" class="ai-message-list">
          <div v-if="!session.qaHistory.length" class="ai-chat-empty">
            <span class="ai-empty-icon"><el-icon><ChatDotRound /></el-icon></span>
            <div class="ai-empty-copy"><strong>卡在这一步了？问问 AI</strong><span>它会结合当前题目和讲解进度，陪你把思路理清楚。</span></div>
            <div class="ai-question-examples"><button type="button" @click="setQuestion('为什么要这样设？')">为什么要这样设？</button><button type="button" @click="setQuestion('这一步是怎么推出来的？')">这一步是怎么推出来的？</button><button type="button" @click="setQuestion('能换一种思路讲吗？')">能换一种思路讲吗？</button></div>
          </div>
          <template v-for="item in session.qaHistory" :key="item.turnId">
            <article class="chat-message chat-message-user"><div class="message-avatar">我</div><div class="message-stack"><div class="message-label">我</div><div class="message-bubble">{{ item.question }}</div><div class="message-actions"><el-tooltip content="复制" placement="top"><button class="copy-button" type="button" @click.stop="copyMessageContent(item.question)"><el-icon><CopyDocument /></el-icon></button></el-tooltip></div></div></article>
            <article class="chat-message chat-message-ai"><div class="message-avatar">AI</div><div class="message-stack"><div class="message-label">AI 解题助手</div><div class="message-bubble"><span v-if="item.loading && !item.answer" class="ai-loading"><el-icon class="is-loading"><Loading /></el-icon> 正在思考…</span><MarkdownRenderer v-else-if="item.answer" class="answer-markdown" :markdown="formatAiAnswerMarkdown(item.answer)" :enable-latex="true" /></div><div v-if="item.answer && !item.loading" class="message-actions"><el-tooltip content="复制" placement="top"><button class="copy-button" type="button" @click.stop="copyMessageContent(item.answer)"><el-icon><CopyDocument /></el-icon></button></el-tooltip></div></div></article>
          </template>
        </div>
        <div class="ai-question-composer"><XSender ref="questionSenderRef" class="ai-question-sender" placeholder="继续追问这道题" submit-type="enter" :clearable="true" :loading="isQuestionLoading" :disabled="session.socketStatus !== 'connected' || isQuestionLoading" :custom-style="{ height: '76px', minHeight: '76px', maxHeight: '76px' }" @submit="askAi" @change="syncQuestion" /></div>
      </section>
    </el-drawer>
  </main>
  <el-skeleton v-else-if="loading" animated :rows="8" />
</template>

<style scoped>
.lesson-page {
  --lesson-ink: #3d3564;
  --lesson-purple: #7566bb;
  --lesson-pink: #e15b91;
  --lesson-mint: #52aab4;
  --lesson-paper: #fbfbff;
  min-width: 0;
  min-height: 100%;
  overflow-x: hidden;
  padding: 26px clamp(18px, 4vw, 64px) 56px;
  background: var(--lesson-paper);
  color: var(--lesson-ink);
}

.back-link,
.lesson-header,
.problem-stem,
.solution-panel,
.start-panel,
.lesson-workspace { max-width: 1280px; margin-right: auto; margin-left: auto; }

.back-link { display: inline-flex; align-items: center; gap: 5px; padding: 5px 0; border: 0; background: transparent; color: #655b91; cursor: pointer; font-weight: 700; transition: color .18s ease, transform .18s ease; }
.back-link:hover,.back-link:focus-visible { color: var(--lesson-pink); outline: none; transform: translateX(-2px); }
.lesson-header { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-top: 19px; margin-bottom: 20px; }
.lesson-header p { margin: 0; color: #756d91; font-size: 13px; font-weight: 700; }
.lesson-header h1 { margin: 5px 0 0; color: var(--lesson-ink); font-size: 30px; line-height: 1.35; }
.lesson-header small { padding: 6px 9px; border: 1px solid #d9d3e5; border-radius: 5px; color: #756d91; background: #fff; font-size: 12px; white-space: nowrap; }

.problem-stem,.solution-panel,.explanation-panel { border: 1px solid #d9d3e5; border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 8%); }
.problem-stem { padding: 18px 20px; border-color: #cbc5e0; background: #f5f3fb; }
.problem-stem h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 12px; color: var(--lesson-ink); font-size: 18px; }
.problem-stem h2::after { height: 1px; flex: 1; background: #d7d2e7; content: ''; }
.problem-markdown,.solution-markdown { background: transparent !important; line-height: 1.72; }
.problem-markdown :deep(p),.solution-markdown :deep(p) { margin: 0 0 12px; }
.problem-markdown :deep(p:last-child),.solution-markdown :deep(p:last-child) { margin-bottom: 0; }
.problem-images { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
.problem-images :deep(.el-image) { width: min(100%, 320px); height: 220px; border: 1px solid #d9d3e5; border-radius: 6px; background: #fbfbff; }
.intro { margin: 14px 0 0; padding-top: 12px; border-top: 1px solid #ddd8ea; color: #655e7d; }
.solution-panel { margin-top: 12px; padding: 14px 16px; border-color: #d5d0e3; background: #fcfbff; box-shadow: none; }
.solution-panel :deep(.el-button) { border-color: #bbb1dc; background: #f5f2ff; color: #5b4f98; font-weight: 800; }
.solution-content { display: grid; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cfc8dc; }
.solution-block { padding: 16px 18px 18px; border: 1px solid; border-radius: 7px; }
.solution-answer { border-color: #c9c1eb; border-left: 4px solid #7e70bc; background: #f4f1ff; }
.solution-analysis { border-color: #b9ddd8; border-left: 4px solid #4e9f9a; background: #eff9f7; }
.solution-block-title { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; }
.solution-block-title span { padding: 3px 7px; border-radius: 4px; font-size: 11px; font-weight: 800; line-height: 1.35; }
.solution-answer .solution-block-title span { background: #ddd6f5; color: #584b96; }
.solution-analysis .solution-block-title span { background: #ccebe5; color: #26746f; }
.solution-block-title h2 { margin: 0; color: var(--lesson-ink); font-size: 17px; }
.solution-markdown { color: #4d466b; }
.solution-block :deep(h3) { margin: 16px 0 7px; color: #443b69; font-size: 15px; }
.solution-block :deep(ul),.solution-block :deep(ol) { margin: 0 0 12px; padding-left: 20px; }
.solution-block :deep(li + li) { margin-top: 5px; }
.solution-block :deep(.katex-display) { max-width: 100%; margin: 12px 0; overflow: auto; padding: 9px 11px; border: 1px solid currentColor; border-color: rgb(77 70 107 / 16%); border-radius: 5px; background: transparent !important; }

.start-panel { display: grid; grid-template-columns: minmax(260px, 1.25fr) minmax(310px, 1fr) auto; align-items: center; gap: 28px; margin-top: 22px; padding: 25px 28px; border: 1px solid var(--lesson-ink); border-radius: 8px; background: #e8e4ff; box-shadow: 7px 8px 0 rgb(61 53 100 / 18%); }
.start-panel-copy { display: grid; gap: 8px; }
.start-panel strong { color: var(--lesson-ink); font-size: 22px; }
.start-panel-copy span { color: #5e577d; line-height: 1.7; }
.start-panel-route { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.start-panel-route span { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 9px 10px; border: 1px solid #cfc8de; border-radius: 5px; background: rgb(255 255 255 / 72%); color: #5e577d; font-size: 13px; font-weight: 700; white-space: nowrap; }
.start-panel-route b { color: var(--lesson-pink); font-size: 11px; }
.start-panel :deep(.el-button) { min-width: 126px; height: 44px; margin: 0; border-radius: 5px; font-weight: 800; box-shadow: 0 3px 0 rgb(61 53 100 / 20%); }

.lesson-workspace { margin-top: 22px; }
.lesson-layout { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(360px, .9fr); grid-template-areas: "steps steps" "scene explanation"; align-items: start; gap: 18px; }
.step-rail { display: grid; grid-area: steps; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 10px; border: 1px solid #d9d3e5; border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 8%); }
.step-rail button { display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 10px; border: 1px solid transparent; border-radius: 6px; background: transparent; color: #756d91; font: inherit; text-align: left; }
.step-rail button:disabled { cursor: not-allowed; opacity: .58; }
.step-rail button.available { cursor: pointer; transition: border-color .16s ease, background .16s ease, color .16s ease; }
.step-rail button.available:hover,.step-rail button.available:focus-visible { border-color: #c5bde8; background: #f6f3ff; color: var(--lesson-purple); outline: none; }
.step-rail .active { border-color: #a5d1d3; background: #effafa; color: #28747b; box-shadow: inset 0 3px 0 var(--lesson-mint); }
.step-rail span { display: grid; width: 25px; height: 25px; flex: 0 0 25px; place-items: center; border: 1px solid #d9d3e5; border-radius: 50%; background: #fff; color: #746a9d; font-size: 12px; font-weight: 800; }
.step-rail .active span { border-color: var(--lesson-mint); background: var(--lesson-mint); color: #fff; }
.lesson-main { grid-area: scene; min-width: 0; }
.explanation-panel { grid-area: explanation; padding: 20px; line-height: 1.8; }
.explanation-panel > span { color: var(--lesson-pink); font-size: 12px; font-weight: 800; }
.explanation-panel h2 { margin: 4px 0 13px; color: var(--lesson-ink); font-size: 21px; line-height: 1.4; }
.step-markdown { color: #554d70; }
.explanation-panel :deep(.el-button) { width: 100%; margin-top: 8px; border-radius: 5px; font-weight: 800; }
.step-navigation { display: flex; gap: 10px; margin-top: 8px; }
.step-navigation :deep(.el-button) { width: auto; flex: 1; margin-top: 0; }

.ai-drawer-trigger { position: fixed; z-index: 10; top: 50%; right: 0; display: inline-flex; align-items: center; gap: 7px; padding: 12px 13px 12px 11px; border: 1px solid #4dafa4; border-right: 0; border-radius: 7px 0 0 7px; background: #167e76; color: #fff; box-shadow: -3px 4px 0 rgb(22 134 125 / 20%); cursor: pointer; font: inherit; font-size: 13px; font-weight: 800; transform: translateY(-50%); transition: background .16s ease, transform .16s ease; }
.ai-drawer-trigger:hover,.ai-drawer-trigger:focus-visible { background: #126d65; outline: none; transform: translate(-3px, -50%); }
:global(.ai-question-drawer .el-drawer__body) { padding: 0; overflow: hidden; }
.ai-question-panel { display: grid; height: 100%; grid-template-rows: auto minmax(0, 1fr) auto; gap: 0; overflow: hidden; border: 0; background: #f4fffd; }
.ai-question-panel.is-empty { grid-template-rows: auto minmax(0, 1fr) auto; }
.ai-question-heading { display: flex; align-items: center; gap: 11px; padding: 15px 20px; border-bottom: 1px solid #b6e5dd; background: #d9f6ef; color: #176f69; }
.ai-question-icon { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid #6fc8bd; border-radius: 7px; background: #fff; color: #16867d; font-size: 18px; box-shadow: 2px 2px 0 rgb(22 134 125 / 14%); }
.ai-question-heading div { display: grid; gap: 2px; }
.ai-drawer-close { display: grid; width: 30px; height: 30px; margin-left: auto; place-items: center; border: 1px solid #8acfc7; border-radius: 5px; background: #fff; color: #237b74; cursor: pointer; font-size: 16px; }
.ai-drawer-close:hover,.ai-drawer-close:focus-visible { border-color: #3da99d; background: #dff8f2; outline: none; }
.ai-question-heading strong { font-size: 16px; }
.ai-question-heading span { color: #477f78; font-size: 13px; }
.ai-message-list { min-height: 0; overflow: auto; padding: 12px 20px; background: #fbfffe; scrollbar-color: #6fc8bd transparent; }
.ai-chat-empty { display: grid; grid-template-columns: auto minmax(0, 450px); justify-content: center; align-content: center; align-items: center; column-gap: 12px; row-gap: 14px; width: fit-content; max-width: 100%; min-height: 100%; margin: 0 auto; padding: 12px 4px; color: #4b7b75; text-align: left; }
.ai-empty-icon { display: grid; width: 44px; height: 44px; place-items: center; border: 1px solid #73c9bf; border-radius: 50%; background: #dff8f2; color: #16867d; font-size: 21px; }
.ai-empty-copy { display: grid; gap: 4px; }
.ai-empty-copy strong { color: #1e6d66; font-size: 15px; }
.ai-empty-copy span { font-size: 13px; line-height: 1.6; }
.ai-question-examples { display: flex; grid-column: 1 / -1; justify-content: center; flex-wrap: wrap; gap: 8px; }
.ai-question-examples button { padding: 7px 11px; border: 1px solid #9edbd2; border-radius: 5px; background: #fff; color: #247a72; cursor: pointer; font-size: 12px; font-weight: 700; transition: border-color .16s ease, background .16s ease, color .16s ease, transform .16s ease; }
.ai-question-examples button:hover,.ai-question-examples button:focus-visible { border-color: #3da99d; background: #dff8f2; color: #126d65; outline: none; transform: translateY(-1px); }
.chat-message { display: flex; align-items: flex-start; gap: 9px; width: min(760px, 100%); margin: 0 0 18px; }
.chat-message-user { flex-direction: row-reverse; margin-left: auto; }
.message-avatar { display: grid; width: 28px; height: 28px; flex: 0 0 28px; place-items: center; border-radius: 50%; background: #d9f0eb; color: #26766f; font-size: 10px; font-weight: 800; }
.chat-message-user .message-avatar { background: #f8e7ee; color: #a94770; }
.message-stack { min-width: 0; max-width: min(86%, 640px); }
.message-label { margin: 0 0 5px; color: #7c8991; font-size: 12px; font-weight: 700; }
.chat-message-user .message-label { text-align: right; }
.message-bubble { min-width: 0; padding: 12px 14px; border: 1px solid #c5e1db; border-radius: 7px; background: #fff; color: #3e5856; font-size: 14px; line-height: 1.75; box-shadow: 0 3px 10px rgb(43 112 105 / 5%); overflow-wrap: anywhere; }
.chat-message-user .message-bubble { border-color: #eacfdc; background: #fff8fb; color: #70465b; white-space: pre-wrap; }
.ai-loading { display: inline-flex; align-items: center; gap: 7px; min-height: 26px; color: #3b7b76; font-size: 13px; }
.answer-markdown { min-width: 0; max-width: 100%; overflow-wrap: anywhere; word-break: break-word; line-height: 1.75; }
.answer-markdown :deep(p),.answer-markdown :deep(ul),.answer-markdown :deep(ol),.answer-markdown :deep(blockquote),.answer-markdown :deep(pre),.answer-markdown :deep(h1),.answer-markdown :deep(h2),.answer-markdown :deep(h3) { margin: 0 0 10px; }
.answer-markdown :deep(p:last-child),.answer-markdown :deep(ul:last-child),.answer-markdown :deep(ol:last-child),.answer-markdown :deep(pre:last-child) { margin-bottom: 0; }
.answer-markdown :deep(ul),.answer-markdown :deep(ol) { padding-left: 20px; }
.answer-markdown :deep(li + li) { margin-top: 5px; }
.answer-markdown :deep(h1) { font-size: 18px; }.answer-markdown :deep(h2) { font-size: 16px; }.answer-markdown :deep(h3) { font-size: 15px; }
.answer-markdown :deep(code) { padding: .1em .32em; border-radius: 4px; background: #edfafa; color: #28747b; }
.answer-markdown :deep(pre) { max-width: 100%; overflow: auto; padding: 10px 12px; border-radius: 6px; background: #f4f7f7; }
.answer-markdown :deep(pre code) { padding: 0; background: transparent; color: inherit; }
.answer-markdown :deep(table),.answer-markdown :deep(.katex-display) { max-width: 100%; overflow: auto; }
.answer-markdown :deep(.katex-display) { display: block; margin: 12px 0; padding: 2px 0; }
.answer-markdown :deep(blockquote) { margin-left: 0; padding: 8px 10px; border-left: 3px solid var(--lesson-mint); background: #effafa; color: #547178; }
.ai-question-composer { padding: 12px 20px 14px; border-top: 1px solid #b6e5dd; background: #e1f8f3; }
.ai-question-sender { overflow: hidden; border: 1px solid #67b9af; border-radius: 7px; background: #fff; box-shadow: 2px 3px 0 rgb(22 134 125 / 14%); }
.ai-question-sender :deep(.elx-x-sender__content),.ai-question-sender :deep(.elx-x-sender__chat-room) { background: #fff; }
.ai-question-sender :deep([contenteditable='true']) { color: #3e5856; caret-color: #16867d; }
.ai-question-sender :deep(.chat-placeholder-wrap) { color: #75918e; font-weight: 600; }
.ai-question-sender :deep(.elx-x-sender__send-button) { border: 1px solid #237b74; border-radius: 5px; background: #16867d; box-shadow: 2px 3px 0 rgb(22 134 125 / 20%); color: #fff; }
.ai-question-sender :deep(.elx-x-sender__send-button:not(.is-disabled):hover),.ai-question-sender :deep(.elx-x-sender__send-button:not(.is-disabled):focus-visible) { background: #126d65; box-shadow: 3px 4px 0 rgb(22 134 125 / 24%); outline: none; transform: translate(-1px, -1px); }
.ai-question-sender :deep(.elx-x-sender__send-button.is-disabled) { border-color: #b6d9d3; background: #cfe7e3; box-shadow: none; color: #6f918c; }
.message-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; }.chat-message-user .message-actions { justify-content: flex-end; }
.copy-button { display: grid; width: 26px; height: 26px; place-items: center; border: 1px solid #d8e4e5; border-radius: 6px; background: #fff; color: #71818b; cursor: pointer; transition: border-color .16s ease, background .16s ease, color .16s ease; }
.copy-button:hover,.copy-button:focus-visible { border-color: #a5d1d3; background: #effafa; color: #28747b; outline: none; }

.lesson-state-enter-active,.lesson-state-leave-active { transition: opacity .25s ease, transform .25s ease; }.lesson-state-enter-from,.lesson-state-leave-to { opacity: 0; transform: translateY(10px); }
@media (max-width: 1060px) { .start-panel { grid-template-columns: minmax(0, 1fr) auto; }.start-panel-route { grid-column: 1 / -1; order: 3; } }
@media (max-width: 800px) { .lesson-layout { grid-template-columns: 1fr; grid-template-areas: "steps" "scene" "explanation"; }.step-rail { grid-auto-flow: column; grid-auto-columns: minmax(132px, 1fr); grid-template-columns: none; overflow-x: auto; } }
@media (max-width: 760px) { .lesson-header { align-items: flex-start; flex-direction: column; gap: 8px; }.start-panel { grid-template-columns: 1fr; gap: 18px; padding: 22px; }.start-panel-route { grid-column: auto; width: 100%; }.start-panel :deep(.el-button) { width: 100%; }.ai-drawer-trigger span { display: none; }.ai-drawer-trigger { padding: 12px 11px; } }
@media (max-width: 520px) { .lesson-page { padding: 20px 14px 38px; }.lesson-header h1 { font-size: 25px; }.problem-stem { padding: 16px; }.start-panel strong { font-size: 20px; }.start-panel-route { grid-template-columns: 1fr; }.ai-message-list,.ai-question-heading,.ai-question-composer { padding-right: 14px; padding-left: 14px; }.message-stack { max-width: calc(100% - 37px); }.ai-question-composer { gap: 8px; } }
</style>
