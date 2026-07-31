<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Clock, Delete, DocumentChecked, MagicStick, Opportunity, Plus, Promotion, RefreshRight, User } from '@element-plus/icons-vue'
import {
  createAiCompanionSession,
  clearAiCompanionConversations,
  getAiCompanionContext,
  listAiCompanionMessages,
  listAiCompanionSessions,
  saveAiCompanionExchange,
} from '@/api/aiCompanion'

const props = defineProps({
  courseId: { type: [Number, String], default: '' },
  chapterId: { type: [Number, String], default: '' },
  resourceId: { type: [Number, String], default: '' },
  courseTitle: { type: String, default: '' },
  chapterTitle: { type: String, default: '' },
  resourceTitle: { type: String, default: '' },
  progress: { type: Number, default: 0 },
})

const open = defineModel('open', { type: Boolean, default: false })
const input = ref('')
const thinking = ref(false)
const thinkingHint = ref('正在读取课程上下文...')
const thinkingTimers = []
const loadingConversation = ref(false)
const messageListRef = ref(null)
const inputRef = ref(null)
const sessionId = ref(null)
const serverContext = ref(null)
const sessions = ref([])

const context = computed(() => ({
  course: serverContext.value?.courseTitle || props.courseTitle || '当前课程',
  chapter: serverContext.value?.chapterTitle || props.chapterTitle || '当前章节',
  resource: serverContext.value?.resourceName || props.resourceTitle || '当前学习资源',
  progress: Math.max(0, Math.min(100, Number(serverContext.value?.progress ?? props.progress ?? 0))),
  courseIntro: serverContext.value?.courseIntro || '',
  nextChapter: serverContext.value?.nextChapterTitle || '',
  suggestions: serverContext.value?.personalizedSuggestions || [],
}))

function createWelcomeMessage(content = '你好，我会结合你正在学习的课程、章节和资源提供学习帮助。') {
  return { id: Date.now(), role: 'assistant', content, generationMode: null }
}

const messages = ref([createWelcomeMessage()])

const generationLabel = computed(() => {
  const latest = [...messages.value].reverse().find((message) => message.role === 'assistant' && message.generationMode)
  if (latest?.generationMode === 'MODEL') return '真实模型'
  if (latest?.generationMode === 'SAFETY_BLOCKED') return '安全拦截'
  if (latest?.generationMode === 'FALLBACK') return '演示回退'
  if (latest?.generationMode === 'MODEL_TIMEOUT') return '模型回答超时'
  if (latest?.generationMode === 'MODEL_UNAVAILABLE') return '模型暂不可用'
  if (latest?.generationMode === 'MODEL_DISABLED') return '模型未启用'
  return '后端生成'
})

const quickPrompts = ['总结当前内容', '解释核心概念', '推荐下一步学习', '检查我的理解']

function clearThinkingTimers() {
  thinkingTimers.splice(0).forEach((timer) => window.clearTimeout(timer))
}

function startThinkingHint() {
  clearThinkingTimers()
  thinkingHint.value = '正在读取课程上下文...'
  thinkingTimers.push(window.setTimeout(() => {
    thinkingHint.value = '本地模型正在组织回答...'
  }, 1500))
  thinkingTimers.push(window.setTimeout(() => {
    thinkingHint.value = '首次加载模型可能需要一些时间，请稍候...'
  }, 10000))
}

function requestErrorMessage(error) {
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return '模型回答超时了，请稍后重试；如果连续超时，请确认 Ollama 正在运行。'
  }
  if (error?.message === 'Network Error') {
    return '无法连接后端，请确认后端终端仍在运行。'
  }
  return error?.message || '智能学伴回答失败，请稍后重试。'
}

async function scrollToBottom() {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

function sendMessage(text = input.value) {
  const question = String(text || '').trim()
  if (!question || thinking.value) return
  if (!sessionId.value) {
    ElMessage.warning('智能学伴会话尚未准备完成')
    return
  }

  const temporaryId = `temp-${Date.now()}`
  messages.value.push({ id: temporaryId, role: 'user', content: question })
  input.value = ''
  thinking.value = true
  startThinkingHint()
  scrollToBottom()

  saveAiCompanionExchange(sessionId.value, {
    question,
    chapterId: Number(props.chapterId) || null,
    resourceId: Number(props.resourceId) || null,
  }).then((saved) => {
    messages.value = messages.value.filter((message) => message.id !== temporaryId)
    messages.value.push(...mapServerMessages(saved))
  }).catch((error) => {
    messages.value = messages.value.filter((message) => message.id !== temporaryId)
    messages.value.push({
      id: Date.now() + 1,
      role: 'assistant',
      content: requestErrorMessage(error),
      generationMode: null,
    })
    ElMessage.error(requestErrorMessage(error))
  }).finally(() => {
    thinking.value = false
    clearThinkingTimers()
    thinkingHint.value = '正在读取课程上下文...'
    scrollToBottom()
  })
}

function renderMessage(content = '') {
  const escaped = String(content)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>')
}

function continueAsking(message) {
  input.value = '请结合刚才的回答，再具体解释一下：'
  nextTick(() => inputRef.value?.focus())
}

function regenerateAnswer(message) {
  const messageIndex = messages.value.findIndex((item) => item.id === message.id)
  const previousQuestion = [...messages.value.slice(0, messageIndex)]
    .reverse()
    .find((item) => item.role === 'user')?.content
  if (!previousQuestion) {
    ElMessage.info('没有找到可以重新生成的问题')
    return
  }
  sendMessage(previousQuestion)
}

function sessionLabel(session) {
  const time = session.lastMessageTime || session.updateTime || session.createTime
  return `${session.title || '学习对话'}${time ? ` · ${String(time).slice(5, 16)}` : ''}`
}

async function switchConversation(id) {
  if (!id || id === sessionId.value || thinking.value) return
  loadingConversation.value = true
  try {
    sessionId.value = id
    const storedMessages = await listAiCompanionMessages(id)
    messages.value = storedMessages?.length ? mapServerMessages(storedMessages) : [createWelcomeMessage()]
    scrollToBottom()
  } catch (error) {
    ElMessage.error(error?.message || '加载历史对话失败')
  } finally {
    loadingConversation.value = false
  }
}

onUnmounted(() => {
  clearThinkingTimers()
})

function mapServerMessages(list = []) {
  return list.map((message) => ({
    id: message.id,
    role: String(message.role || '').toLowerCase() === 'user' ? 'user' : 'assistant',
    content: message.content,
    generationMode: message.generationMode || null,
    modelName: message.modelName || null,
    sourceSummary: message.sourceSummary || null,
    safetyStatus: message.safetyStatus || null,
    responseTimeMs: message.responseTimeMs || null,
  }))
}

function generationLabelFor(message) {
  if (message.generationMode === 'MODEL') {
    return `真实模型${message.modelName ? ` · ${message.modelName}` : ''}`
  }
  if (message.generationMode === 'SAFETY_BLOCKED') return '安全拦截'
  if (message.generationMode === 'FALLBACK') return '演示回退'
  if (message.generationMode === 'MODEL_TIMEOUT') return '模型回答超时'
  if (message.generationMode === 'MODEL_UNAVAILABLE') return '模型暂不可用'
  if (message.generationMode === 'MODEL_DISABLED') return '模型未启用'
  return '后端生成'
}

async function loadContext() {
  if (!props.courseId) return
  serverContext.value = await getAiCompanionContext(
    props.courseId,
    Number(props.chapterId) || undefined,
    Number(props.resourceId) || undefined,
  )
}

async function loadConversation() {
  if (!props.courseId || loadingConversation.value) return
  loadingConversation.value = true
  try {
    const [contextData, sessionList] = await Promise.all([
      getAiCompanionContext(
        props.courseId,
        Number(props.chapterId) || undefined,
        Number(props.resourceId) || undefined,
      ),
      listAiCompanionSessions(props.courseId),
    ])
    serverContext.value = contextData
    sessions.value = sessionList || []
    let session = sessions.value[0]
    if (!session) {
      session = await createAiCompanionSession({
        courseId: Number(props.courseId),
        chapterId: Number(props.chapterId) || null,
        title: `${context.value.course}学习对话`,
      })
      sessions.value = [session]
    }
    sessionId.value = session.id
    const storedMessages = await listAiCompanionMessages(session.id)
    messages.value = storedMessages?.length
      ? mapServerMessages(storedMessages)
      : [createWelcomeMessage()]
    scrollToBottom()
  } catch (error) {
    sessionId.value = null
    ElMessage.error(error?.message || '智能学伴后端连接失败')
  } finally {
    loadingConversation.value = false
  }
}

async function startNewConversation() {
  thinking.value = false
  loadingConversation.value = true
  try {
    const session = await createAiCompanionSession({
      courseId: Number(props.courseId),
      chapterId: Number(props.chapterId) || null,
      title: `${context.value.course}学习对话`,
    })
    sessionId.value = session.id
    sessions.value = [session, ...sessions.value]
    messages.value = [createWelcomeMessage('新对话已创建。你可以继续询问当前课程内容。')]
    ElMessage.success('已新建智能学伴对话')
  } catch (error) {
    ElMessage.error(error?.message || '新建对话失败')
  } finally {
    loadingConversation.value = false
  }
}

async function clearAllConversations() {
  if (thinking.value || loadingConversation.value) return
  try {
    await ElMessageBox.confirm(
      '这会删除你在智能学伴中的全部历史问答，删除后无法恢复。课程进度和课程资料不会受影响。',
      '清空全部对话',
      { confirmButtonText: '确认清空', cancelButtonText: '取消', type: 'warning' },
    )
    loadingConversation.value = true
    await clearAiCompanionConversations()
    sessions.value = []
    sessionId.value = null
    messages.value = [createWelcomeMessage('全部历史对话已清空。你可以开始一段新的学习对话。')]
    await startNewConversation()
    ElMessage.success('已清空全部智能学伴对话')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '清空对话失败')
    }
  } finally {
    loadingConversation.value = false
  }
}

watch(open, (value) => {
  if (value) loadConversation()
})
watch(() => props.courseId, () => {
  sessionId.value = null
  serverContext.value = null
  messages.value = [createWelcomeMessage()]
  if (open.value) loadConversation()
})
watch([() => props.chapterId, () => props.resourceId], () => {
  if (open.value && sessionId.value) {
    loadContext().catch((error) => ElMessage.error(error?.message || '课程上下文更新失败'))
  }
})
</script>

<template>
  <el-drawer v-model="open" size="min(440px, 94vw)" class="companion-drawer" append-to-body>
    <template #header>
      <div class="companion-heading">
        <span class="companion-icon"><el-icon><MagicStick /></el-icon></span>
        <div>
          <h2>智能学伴</h2>
          <span>课程上下文 · {{ generationLabel }}</span>
        </div>
      </div>
    </template>

    <div v-loading="loadingConversation" class="companion-body">
      <section class="learning-context" aria-label="当前学习内容">
        <div>
          <span>当前课程</span>
          <strong>{{ context.course }}</strong>
        </div>
        <p>{{ context.chapter }} · {{ context.resource }}</p>
        <div class="context-progress">
          <span>章节进度</span>
          <strong>{{ context.progress }}%</strong>
        </div>
        <el-progress :percentage="context.progress" :stroke-width="6" :show-text="false" />
      </section>

      <div class="conversation-toolbar">
        <span class="model-status" :class="{ busy: thinking }">
          <i></i>{{ thinking ? '模型回答中' : generationLabel }}
        </span>
        <span><el-icon><ChatDotRound /></el-icon>学习对话</span>
        <el-tooltip content="新建对话" placement="bottom">
          <el-button circle text aria-label="新建对话" :disabled="loadingConversation" @click="startNewConversation">
            <el-icon><Plus /></el-icon>
          </el-button>
        </el-tooltip>
      </div>

      <div v-if="sessions.length > 1" class="session-history">
        <span><el-icon><Clock /></el-icon>历史对话</span>
        <el-select :model-value="sessionId" size="small" :disabled="thinking || loadingConversation" @update:model-value="switchConversation">
          <el-option v-for="session in sessions" :key="session.id" :label="sessionLabel(session)" :value="session.id" />
        </el-select>
      </div>

      <section v-if="context.suggestions.length" class="personalized-suggestions" aria-label="个性化学习建议">
        <div class="suggestions-heading"><el-icon><Opportunity /></el-icon><span>为你安排的下一步</span></div>
        <button
          v-for="suggestion in context.suggestions"
          :key="`${suggestion.type}-${suggestion.title}`"
          type="button"
          :disabled="thinking || loadingConversation || !sessionId"
          @click="sendMessage(suggestion.prompt)"
        >
          <strong>{{ suggestion.title }}</strong>
          <span>{{ suggestion.description }}</span>
        </button>
      </section>

      <div ref="messageListRef" class="message-list">
        <article
          v-for="message in messages"
          :key="message.id"
          class="message-row"
          :class="[message.role, { 'safety-blocked': message.safetyStatus === 'BLOCKED' }]"
        >
          <span class="message-avatar">
            <el-icon><User v-if="message.role === 'user'" /><MagicStick v-else /></el-icon>
          </span>
          <div class="message-content">
            <div v-if="message.role === 'assistant' && message.sourceSummary" class="source-card">
              <el-icon><DocumentChecked /></el-icon>
              <span>{{ message.sourceSummary }}</span>
            </div>
            <p v-html="renderMessage(message.content)"></p>
            <small v-if="message.role === 'assistant' && message.generationMode" class="generation-label">
              {{ generationLabelFor(message) }}<span v-if="message.responseTimeMs"> · {{ message.responseTimeMs }}ms</span>
            </small>
            <div v-if="message.role === 'assistant' && message.generationMode" class="answer-actions">
              <button type="button" :disabled="thinking" @click="regenerateAnswer(message)">
                <el-icon><RefreshRight /></el-icon>重新生成
              </button>
              <button type="button" :disabled="thinking" @click="continueAsking(message)">
                <el-icon><ChatDotRound /></el-icon>继续追问
              </button>
            </div>
          </div>
        </article>
        <article v-if="thinking" class="message-row assistant">
          <span class="message-avatar"><el-icon><MagicStick /></el-icon></span>
          <div class="thinking-content">
            <p class="thinking-text"><i></i><i></i><i></i></p>
            <small>{{ thinkingHint }}</small>
          </div>
        </article>
      </div>

      <div class="quick-prompts">
        <button
          v-for="prompt in quickPrompts"
          :key="prompt"
          type="button"
          :disabled="thinking"
          @click="sendMessage(prompt)"
        >
          {{ prompt }}
        </button>
      </div>

      <form class="message-composer" @submit.prevent="sendMessage()">
        <el-input
          ref="inputRef"
          v-model="input"
          type="textarea"
          :rows="2"
          maxlength="500"
          show-word-limit
          resize="none"
          placeholder="询问当前课程内容"
          :disabled="loadingConversation || !sessionId"
          @keydown.ctrl.enter.prevent="sendMessage()"
        />
        <el-tooltip content="发送问题" placement="top">
          <el-button
            circle
            type="primary"
            native-type="submit"
            :loading="thinking"
            :disabled="loadingConversation || !sessionId || !input.trim()"
          >
            <el-icon><Promotion /></el-icon>
          </el-button>
        </el-tooltip>
      </form>
      <div class="conversation-clear-action">
        <el-tooltip content="清空全部对话" placement="top">
          <el-button circle text type="danger" aria-label="清空全部对话" :disabled="thinking || loadingConversation" @click="clearAllConversations">
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
:global(:root) {
  --explore-ink: #3d3564;
  --explore-purple: #8178cf;
  --explore-pink: #ee91bb;
  --explore-mint: #52bbc4;
  --explore-yellow: #fff1a8;
  --explore-paper: #fbfbff;
}

:deep(.companion-drawer) {
  --el-drawer-bg-color: var(--explore-paper);
  --el-text-color-primary: var(--explore-ink);
  --el-border-color-lighter: rgb(61 53 100 / 16%);
  background-color: var(--explore-paper);
  background-image:
    linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px),
    linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
}

:deep(.companion-drawer .el-drawer__header) {
  margin-bottom: 0;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgb(61 53 100 / 14%);
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 52%, #d3f2f2 100%);
}

:deep(.companion-drawer .el-drawer__body) {
  min-height: 0;
  padding: 0 18px 16px;
}

.companion-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.companion-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 1px solid var(--explore-ink);
  border-radius: 8px;
  background: var(--explore-yellow);
  color: var(--explore-ink);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 20%);
  font-size: 20px;
}

.companion-heading h2,
.companion-heading span {
  margin: 0;
}

.companion-heading h2 {
  color: var(--explore-ink);
  font-size: 20px;
  font-weight: 900;
}

.companion-heading div > span {
  display: block;
  margin-top: 4px;
  color: #655d86;
  font-size: 12px;
}

.companion-body {
  display: flex;
  height: calc(100vh - 92px);
  min-height: 0;
  flex-direction: column;
}

.learning-context {
  position: relative;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--explore-ink);
  border-radius: 8px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
}

.learning-context::after {
  position: absolute;
  top: -8px;
  right: 14px;
  width: 48px;
  height: 16px;
  border: 1px solid rgb(61 53 100 / 25%);
  background: var(--explore-pink);
  content: '';
  opacity: 0.75;
  transform: rotate(3deg);
}

.learning-context > div,
.context-progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.learning-context span {
  color: #736b91;
  font-size: 11px;
}

.learning-context strong {
  overflow: hidden;
  color: var(--explore-ink);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.learning-context p {
  margin: 8px 0 13px;
  overflow: hidden;
  color: #5f577f;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-progress { margin-bottom: 7px; }

.learning-context :deep(.el-progress-bar__outer) { background: #eeeafa; }
.learning-context :deep(.el-progress-bar__inner) { background: var(--explore-purple); }

.conversation-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 15px 2px 8px;
  color: var(--explore-ink);
  font-size: 13px;
  font-weight: 800;
}

.conversation-toolbar > span { display: inline-flex; align-items: center; gap: 6px; }

.model-status {
  margin-left: auto;
  color: #28725e;
  font-size: 10px;
  font-weight: 700;
}

.model-status i {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 5px;
  border-radius: 50%;
  background: currentColor;
}

.model-status.busy { color: var(--explore-purple); }
.model-status.busy i { animation: status-pulse 800ms infinite alternate; }

.session-history {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  margin: 0 0 8px;
  color: #655d86;
  font-size: 11px;
}

.session-history > span { display: inline-flex; align-items: center; gap: 4px; }
.session-history :deep(.el-select__wrapper) { border: 1px solid rgb(61 53 100 / 18%); box-shadow: 2px 3px 0 rgb(61 53 100 / 8%); }

.personalized-suggestions {
  display: grid;
  gap: 7px;
  margin: 2px 0 8px;
  padding: 12px;
  border: 1px solid #55aeb4;
  border-radius: 8px;
  background: #ecfbfc;
  box-shadow: 3px 4px 0 rgb(82 187 196 / 18%);
}

.suggestions-heading { display: inline-flex; align-items: center; gap: 5px; color: #28725e; font-size: 11px; font-weight: 800; }

.personalized-suggestions button,
.quick-prompts button,
.answer-actions button {
  font: inherit;
  cursor: pointer;
}

.personalized-suggestions button {
  display: grid;
  gap: 2px;
  padding: 9px;
  border: 1px solid rgb(61 53 100 / 22%);
  border-radius: 6px;
  background: #fff;
  color: var(--explore-ink);
  text-align: left;
}

.personalized-suggestions button:hover:not(:disabled) { border-color: var(--explore-purple); background: #f7f4ff; transform: translate(-1px, -1px); }
.personalized-suggestions button:disabled { cursor: not-allowed; opacity: 0.6; }
.personalized-suggestions strong { font-size: 11px; }
.personalized-suggestions button span { color: #65768b; font-size: 10px; line-height: 1.4; }

.source-card {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  margin-bottom: 6px;
  padding: 8px 9px;
  border-left: 3px solid var(--explore-mint);
  border-radius: 4px;
  background: #eefafa;
  color: #376c72;
  font-size: 10px;
  line-height: 1.45;
}

.source-card .el-icon { flex: 0 0 auto; margin-top: 1px; color: #287f88; }

.message-list { min-height: 180px; flex: 1; overflow-y: auto; padding: 10px 4px 14px; scrollbar-color: #c6bfea transparent; }
.message-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 15px; }
.message-row.user { flex-direction: row-reverse; }

.message-avatar {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--explore-ink);
  border-radius: 8px;
  background: var(--explore-yellow);
  color: var(--explore-ink);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 13%);
}

.message-row.user .message-avatar { background: var(--explore-pink); }
.message-content { max-width: 82%; }

.message-row p {
  margin: 0;
  padding: 11px 13px;
  border: 1px solid rgb(61 53 100 / 18%);
  border-radius: 8px;
  background: #fff;
  color: var(--explore-ink);
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  box-shadow: 2px 3px 0 rgb(61 53 100 / 8%);
}

.message-row p :deep(h3),
.message-row p :deep(h4) { margin: 0 0 8px; color: var(--explore-ink); font-size: 13px; }
.message-row p :deep(li) { margin-left: 16px; }
.generation-label { display: block; margin-top: 5px; color: #847d9f; font-size: 10px; }

.answer-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.answer-actions button { display: inline-flex; align-items: center; gap: 3px; padding: 3px 5px; border: 0; border-radius: 4px; background: transparent; color: #70698d; font-size: 10px; }
.answer-actions button:hover:not(:disabled), .answer-actions button.selected { background: #f2efff; color: var(--explore-ink); }
.answer-actions button:disabled { cursor: default; opacity: 0.65; }
.message-row.safety-blocked p { border-color: #d6a84f; background: #fff9ed; color: #725826; }
.message-row.user p { border-color: #dca0be; background: #fff0f7; }

.thinking-text { display: flex; align-items: center; gap: 4px; min-height: 18px; }
.thinking-content { display: flex; flex-direction: column; gap: 3px; }
.thinking-content small { color: #847d9f; font-size: 10px; }
.thinking-text i { width: 5px; height: 5px; border-radius: 50%; background: var(--explore-purple); animation: thinking 900ms infinite alternate; }
.thinking-text i:nth-child(2) { animation-delay: 150ms; }
.thinking-text i:nth-child(3) { animation-delay: 300ms; }

.quick-prompts { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 10px; }
.quick-prompts button { padding: 7px 9px; border: 1px solid rgb(61 53 100 / 22%); border-radius: 5px; background: #fff; color: var(--explore-ink); font-size: 11px; box-shadow: 2px 3px 0 rgb(61 53 100 / 9%); }
.quick-prompts button:hover:not(:disabled) { border-color: var(--explore-purple); background: #f5f2ff; transform: translate(-1px, -1px); }
.quick-prompts button:disabled { cursor: not-allowed; opacity: 0.55; }

.message-composer { display: grid; grid-template-columns: minmax(0, 1fr) 42px; align-items: end; gap: 9px; padding-top: 11px; border-top: 1px solid rgb(61 53 100 / 15%); }
.message-composer :deep(.el-textarea__inner) { border: 1px solid var(--explore-ink); border-radius: 6px; background: #fff; color: var(--explore-ink); box-shadow: 3px 4px 0 rgb(61 53 100 / 10%); }
.message-composer :deep(.el-textarea__inner:focus) { border-color: var(--explore-purple); box-shadow: 3px 4px 0 rgb(129 120 207 / 25%); }
.message-composer .el-button { width: 42px; height: 42px; border: 1px solid #4e4473; border-radius: 5px; background: var(--explore-purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 28%); }
.conversation-clear-action { display: flex; justify-content: flex-end; min-height: 30px; padding-top: 5px; }
.conversation-clear-action .el-button { width: 30px; height: 30px; color: #ad527d; }

@keyframes thinking { from { opacity: 0.3; transform: translateY(1px); } to { opacity: 1; transform: translateY(-1px); } }
@keyframes status-pulse { from { opacity: 0.45; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .message-row *, .personalized-suggestions button, .quick-prompts button { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
}

@media (max-width: 560px) {
  :deep(.companion-drawer .el-drawer__body) { padding: 0 14px 14px; }
  .companion-body { height: calc(100vh - 82px); }
  .message-content { max-width: 86%; }
}
</style>
