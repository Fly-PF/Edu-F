<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import 'katex/dist/katex.min.css'
import { ChatDotRound, Close, DocumentChecked, EditPen, MagicStick, QuestionFilled, RefreshRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getGovPracticeAiSkills, sendGovPracticeAiStream } from '@/api/govPracticeAi'

const props = defineProps({
  question: { type: Object, required: true },
  selectedAnswers: { type: Array, default: () => [] },
})

const defaultSkill = { id: null, skillName: '默认讲题 Skill', description: '按审题、关键信息、推理排除、结论检查的流程讲解', source: 'DEFAULT' }
const drawerVisible = ref(false)
const skillDialogVisible = ref(false)
const selectedSkill = ref({ ...defaultSkill })
const skills = ref([])
const skillKeyword = ref('')
const messages = ref([])
const inputValue = ref('')
const isStreaming = ref(false)
const skillLoading = ref(false)
const messageList = ref(null)
const activeAction = ref('')
const currentStep = ref(-1)
let abortController = null
let renderTimer = null

const solutionSteps = [
  { name: '审题', detail: '锁定题干条件' },
  { name: '定位', detail: '提取核心考点' },
  { name: '排除', detail: '逐项验证干扰项' },
  { name: '落点', detail: '确认正确结论' },
]

const visibleSkills = computed(() => {
  const keyword = skillKeyword.value.trim().toLowerCase()
  const availableSkills = skills.value.filter((skill) => skill.source === 'MY' || skill.source === 'COLLECTION')
  if (!keyword) return availableSkills
  return availableSkills.filter((skill) => `${skill.skillName} ${skill.description || ''}`.toLowerCase().includes(keyword))
})
const mySkills = computed(() => visibleSkills.value.filter((skill) => skill.source === 'MY'))
const collectedSkills = computed(() => visibleSkills.value.filter((skill) => skill.source === 'COLLECTION'))
const activeStep = computed(() => currentStep.value)
const actionStatus = computed(() => {
  if (!activeAction.value) return '等待开始本题讲解'
  if (currentStep.value >= 0) return `第 ${currentStep.value + 1} 步：${solutionSteps[currentStep.value].name}`
  if (isStreaming.value) return `${promptForAction(activeAction.value)}中`
  return '本轮讲解已完成，可继续追问'
})

function openDrawer() {
  drawerVisible.value = true
  if (!skills.value.length) loadSkills()
}

async function loadSkills() {
  skillLoading.value = true
  try {
    skills.value = await getGovPracticeAiSkills()
  } catch (error) {
    ElMessage.error(error.message || 'Skill列表加载失败')
  } finally {
    skillLoading.value = false
  }
}

function openSkillDialog() {
  skillKeyword.value = ''
  skillDialogVisible.value = true
  if (!skills.value.length) loadSkills()
}

async function chooseSkill(skill) {
  if (selectedSkill.value.id === skill.id) {
    skillDialogVisible.value = false
    return
  }
  try {
    await ElMessageBox.confirm('切换后将清空本题全部讲解和聊天记录，并重新开始。', '切换讲题 Skill', {
      confirmButtonText: '确认切换',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }
  resetSession()
  selectedSkill.value = { ...skill }
  skillDialogVisible.value = false
}

function resetSession() {
  abortController?.abort()
  abortController = null
  stopStreamRendering()
  isStreaming.value = false
  messages.value = []
  inputValue.value = ''
  activeAction.value = ''
  currentStep.value = -1
  selectedSkill.value = { ...defaultSkill }
}

function closeDrawer() {
  abortController?.abort()
  abortController = null
  stopStreamRendering()
  isStreaming.value = false
}

function stopStreamRendering() {
  if (renderTimer) clearTimeout(renderTimer)
  renderTimer = null
}

function renderQueuedChunk(message) {
  renderTimer = null
  if (!message.renderQueue) {
    if (message.streamDone) {
      finishAssistantMessage(message)
    }
    return
  }
  const batchSize = Math.min(24, Math.max(4, Math.ceil(message.renderQueue.length / 10)))
  message.content += message.renderQueue.slice(0, batchSize)
  message.renderQueue = message.renderQueue.slice(batchSize)
  scrollToBottom()
  renderTimer = setTimeout(() => renderQueuedChunk(message), 16)
}

function enqueueStreamChunk(message, content) {
  message.renderQueue += content || ''
  if (message.action !== 'STEP_EXPLAIN' && !renderTimer) renderQueuedChunk(message)
}

function normalizeAssistantMarkdown(content) {
  let markdown = content.replace(/(^|\n)#{1,6}\s*/g, '$1# ')
  markdown = markdown
    .replace(/\*\*(科目|题型|题干|选项|正确答案|解析|提示|检查要点)\*\*\s*：/g, '$1：')
    .replace(/\*\*(科目|题型|题干|选项|正确答案|解析|提示|检查要点)\s*：\*\*/g, '$1：')
  const markerCount = (markdown.match(/\*\*/g) || []).length
  if (markerCount % 2 !== 0) {
    const lastMarkerIndex = markdown.lastIndexOf('**')
    markdown = `${markdown.slice(0, lastMarkerIndex)}${markdown.slice(lastMarkerIndex + 2)}`
  }
  return markdown
    .replace(/^\*\*([^*\n]+)\*\*(?=\S)/, '# $1\n\n')
    .replace(/([^\n#\s])(科目|题型|题干|选项|正确答案|解析|提示|检查要点)\s*：/g, '$1\n\n$2：')
    .replace(/(选项\s*：)\s*-\s*/g, '$1\n\n- ')
    .replace(/([^\n])\s*-\s*([A-D])\.\s*/g, '$1\n- $2. ')
    .replace(/---(?=\S)/g, '---\n\n')
    .replace(/---\s*$/gm, '')
    .replace(/^(正确答案|解析|提示|检查要点|易错点|关键依据|排除路径)\s*：\s*/gm, '## $1\n\n')
}

function parsePracticeCard(content) {
  const markdown = normalizeAssistantMarkdown(content)
  if (!/(变式.*题|少提示.*练习)/.test(markdown)) return null
  const stem = markdown.match(/(?:^|\n)题干：\s*([^\n]+)/)?.[1]?.trim()
  const options = [...markdown.matchAll(/(?:^|\n)-\s*([A-D])\.\s*([^\n]+)/g)]
    .map(([, key, value]) => ({ key, value: value.replace(/\s*(?:>|\*+)?\s*请作答.*$/, '').trim() }))
  const hint = markdown.match(/(?:^|\n)提示：\s*([^\n]+)/)?.[1]?.trim()
  if (!stem || options.length < 2) return null
  return {
    title: markdown.match(/^# ([^\n]+)/m)?.[1] || '练习题',
    stem,
    options,
    hint,
    selectedAnswer: '',
    submitted: false,
  }
}

function parseStepExplanation(content) {
  try {
    const explanation = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
    if (!Array.isArray(explanation.steps) || explanation.steps.length !== solutionSteps.length) return null
    const steps = explanation.steps.map((step, index) => {
      const content = typeof step === 'string' ? step : step?.content
      return typeof content === 'string' && content.trim() ? { ...solutionSteps[index], content: content.trim() } : null
    })
    if (steps.some((step) => !step)) return null
    return { steps, conclusion: explanation.conclusion || '', currentStep: 0 }
  } catch {
    return null
  }
}

function finishAssistantMessage(message) {
  if (message.finished) return
  message.finished = true
  message.streaming = false
  if (message.action === 'STEP_EXPLAIN' && !message.failed) {
    message.stepExplanation = parseStepExplanation(message.content)
    if (message.stepExplanation) currentStep.value = message.stepExplanation.currentStep
    else message.content = '未能生成分步讲解，请重新点击“分步讲题”。'
  } else if (!message.failed) {
    message.practice = parsePracticeCard(message.content)
  }
  isStreaming.value = false
}

function changeStep(message, direction) {
  const nextStep = message.stepExplanation.currentStep + direction
  if (nextStep < 0 || nextStep >= message.stepExplanation.steps.length) return
  message.stepExplanation.currentStep = nextStep
  currentStep.value = nextStep
  scrollToBottom()
}

function promptForAction(action) {
  return {
    STEP_EXPLAIN: '请分步讲解这道题',
    EXPLAIN_MORE: '请把整道题再讲细一点',
    VARIANT: '请给我一道变式题',
    LOW_HINT: '请给我一道少提示练习',
    RESTATEMENT: '请引导我复述题意',
    PRACTICE_ANSWER: '请评价我的练习作答',
  }[action] || ''
}

async function sendAction(action, text = '', practice = null) {
  if (isStreaming.value) return
  const userText = action === 'FREE_CHAT' || action === 'PRACTICE_ANSWER' ? text.trim() : promptForAction(action)
  if (!userText) return
  activeAction.value = action
  if (action === 'STEP_EXPLAIN') currentStep.value = -1
  messages.value.push({ role: 'user', content: userText })
  const assistantMessage = { role: 'assistant', action, content: '', renderQueue: '', streamDone: false, streaming: true, finished: false, failed: false }
  messages.value.push(assistantMessage)
  inputValue.value = ''
  isStreaming.value = true
  abortController = new AbortController()
  try {
    await sendGovPracticeAiStream({
      skillId: selectedSkill.value.id,
      action,
      stem: props.question.stem,
      subject: props.question.subject,
      questionType: props.question.type,
      options: props.question.options.map(([key, value]) => `${key}. ${value}`),
      correctAnswers: props.question.answer,
      selectedAnswers: props.selectedAnswers,
      analysis: props.question.analysis,
      userMessage: action === 'FREE_CHAT' ? userText : '',
      practiceStem: practice?.stem || '',
      practiceOptions: practice?.options?.map((option) => `${option.key}. ${option.value}`) || [],
      practiceAnswer: practice?.selectedAnswer || '',
      history: messages.value.slice(0, -2).map(({ role, content }) => ({ role, content })),
    }, async (event) => {
      if (event.status === 'stream') enqueueStreamChunk(assistantMessage, event.content)
      if (event.status === 'error') {
        stopStreamRendering()
        assistantMessage.renderQueue = ''
        assistantMessage.content = event.content || 'AI讲题生成失败，请稍后重试'
        assistantMessage.failed = true
      }
      if (event.status === 'done') {
        assistantMessage.streamDone = true
        if (assistantMessage.action === 'STEP_EXPLAIN') {
          assistantMessage.content += assistantMessage.renderQueue
          assistantMessage.renderQueue = ''
          finishAssistantMessage(assistantMessage)
        }
      }
      await scrollToBottom()
    }, abortController.signal)
  } catch (error) {
    if (error.name !== 'AbortError') {
      stopStreamRendering()
      assistantMessage.renderQueue = ''
      assistantMessage.content = error.message || 'AI讲题生成失败，请稍后重试'
      assistantMessage.failed = true
      ElMessage.error(assistantMessage.content)
    }
  } finally {
    assistantMessage.streamDone = true
    if (assistantMessage.action === 'STEP_EXPLAIN' && assistantMessage.renderQueue) {
      assistantMessage.content += assistantMessage.renderQueue
      assistantMessage.renderQueue = ''
    }
    if (!assistantMessage.renderQueue) {
      finishAssistantMessage(assistantMessage)
    }
    abortController = null
    await scrollToBottom()
  }
}

function sendFreeQuestion() {
  sendAction('FREE_CHAT', inputValue.value)
}

function submitPracticeAnswer(message) {
  const practice = message.practice
  if (isStreaming.value || practice.submitted || !practice.selectedAnswer) return
  practice.submitted = true
  sendAction('PRACTICE_ANSWER', `我的作答：${practice.selectedAnswer}`, practice)
}

async function scrollToBottom() {
  await nextTick()
  if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight
}

watch(() => props.question.id, () => resetSession())

defineExpose({ openDrawer, resetSession })
</script>

<template>
  <button class="ai-entry" type="button" @click="openDrawer">
    <el-icon><ChatDotRound /></el-icon><span>AI 讲题</span>
  </button>

  <el-drawer v-model="drawerVisible" direction="rtl" size="500px" :with-header="false" @closed="closeDrawer">
    <section class="ai-drawer">
      <header class="ai-header">
        <div><p><i />AI 解题工作台</p><strong>第 {{ String(question.id).padStart(2, '0') }} 题 · {{ question.subject }}</strong><small>{{ question.type === 'MULTIPLE' ? '多选题' : '单选题' }} · 针对本题的专属推理</small></div>
        <button type="button" aria-label="关闭 AI 讲题" @click="drawerVisible = false"><el-icon><Close /></el-icon></button>
      </header>

      <button class="skill-switcher" type="button" @click="openSkillDialog">
        <span><small>当前解题方法</small><strong>{{ selectedSkill.skillName }}</strong><em>{{ selectedSkill.description }}</em></span>
        <span>更换</span>
      </button>

      <section class="solution-route" aria-label="解题路径"><div class="route-heading"><strong>解题路径</strong><span :class="{ streaming: isStreaming }">{{ actionStatus }}</span></div><div class="route-steps"><div v-for="(step, index) in solutionSteps" :key="step.name" :class="{ active: index <= activeStep, current: index === activeStep }"><i>{{ index + 1 }}</i><span><strong>{{ step.name }}</strong><small>{{ step.detail }}</small></span></div></div></section>

      <section class="quick-actions" aria-label="讲题操作">
        <button class="primary-action" :class="{ active: activeAction === 'STEP_EXPLAIN' }" type="button" :disabled="isStreaming" @click="sendAction('STEP_EXPLAIN')"><el-icon><MagicStick /></el-icon><span><strong>分步讲题</strong><small>从题干到结论</small></span></button>
        <button :class="{ active: activeAction === 'EXPLAIN_MORE' }" type="button" :disabled="isStreaming" @click="sendAction('EXPLAIN_MORE')"><el-icon><RefreshRight /></el-icon><span>深度解析</span></button>
        <button :class="{ active: activeAction === 'VARIANT' }" type="button" :disabled="isStreaming" @click="sendAction('VARIANT')"><el-icon><EditPen /></el-icon><span>出道变式</span></button>
        <button :class="{ active: activeAction === 'LOW_HINT' }" type="button" :disabled="isStreaming" @click="sendAction('LOW_HINT')"><el-icon><QuestionFilled /></el-icon><span>少提示练习</span></button>
        <button :class="{ active: activeAction === 'RESTATEMENT' }" type="button" :disabled="isStreaming" @click="sendAction('RESTATEMENT')"><el-icon><DocumentChecked /></el-icon><span>复述题意</span></button>
      </section>

      <div ref="messageList" class="message-list">
        <div v-if="!messages.length" class="empty-message"><span><el-icon><MagicStick /></el-icon></span><strong>准备开始解题</strong><p>从分步讲题开始，AI 会带你梳理题干、考点和排除逻辑。</p></div>
        <article v-for="(message, index) in messages" :key="index" class="chat-message" :class="message.role">
          <span>{{ message.role === 'user' ? '我' : 'AI' }}</span>
          <p v-if="message.role === 'user'">{{ message.content }}</p>
          <div v-else class="assistant-content">
            <div class="assistant-label"><span>AI 导师</span><small>{{ message.streaming ? '正在组织讲解' : '本题讲解' }}</small></div>
            <section v-if="message.stepExplanation" class="step-explanation-card">
              <div class="step-explanation-heading"><span>第 {{ message.stepExplanation.currentStep + 1 }} 步</span><strong>{{ message.stepExplanation.steps[message.stepExplanation.currentStep].name }}</strong><small>{{ message.stepExplanation.steps[message.stepExplanation.currentStep].detail }}</small></div>
              <MarkdownRenderer
                class="ai-markdown step-explanation-content"
                :markdown="message.stepExplanation.steps[message.stepExplanation.currentStep].content"
                :allow-html="false"
                :sanitize="true"
                :enable-latex="true"
                :enable-mermaid="false"
                :enable-shiki="true"
              />
              <p v-if="message.stepExplanation.currentStep === message.stepExplanation.steps.length - 1 && message.stepExplanation.conclusion" class="step-conclusion">{{ message.stepExplanation.conclusion }}</p>
              <div class="step-explanation-actions"><button type="button" :disabled="message.stepExplanation.currentStep === 0" @click="changeStep(message, -1)">上一步</button><button type="button" :disabled="message.stepExplanation.currentStep === message.stepExplanation.steps.length - 1" @click="changeStep(message, 1)">下一步</button></div>
            </section>
            <MarkdownRenderer
              v-else-if="message.content && (message.action !== 'STEP_EXPLAIN' || !message.streaming)"
              class="ai-markdown"
              :markdown="normalizeAssistantMarkdown(message.content)"
              :allow-html="false"
              :sanitize="true"
              :enable-latex="true"
              :enable-mermaid="false"
              :enable-shiki="true"
            />
            <section v-if="message.practice" class="practice-card">
              <div><strong>{{ message.practice.title }}</strong><span>{{ message.practice.submitted ? '已提交作答' : '选择你的答案' }}</span></div>
              <p>{{ message.practice.stem }}</p>
              <button v-for="option in message.practice.options" :key="option.key" type="button" :class="{ selected: message.practice.selectedAnswer === option.key }" :disabled="isStreaming || message.practice.submitted" @click="message.practice.selectedAnswer = option.key"><i>{{ option.key }}</i><span>{{ option.value }}</span></button>
              <small v-if="message.practice.hint">提示：{{ message.practice.hint }}</small>
              <button class="practice-submit" type="button" :disabled="!message.practice.selectedAnswer || message.practice.submitted || isStreaming" @click="submitPracticeAnswer(message)">{{ message.practice.submitted ? '已提交，等待反馈' : '确认作答' }}</button>
            </section>
            <i v-if="message.streaming" />
          </div>
        </article>
      </div>

      <form class="chat-input" @submit.prevent="sendFreeQuestion">
        <textarea v-model="inputValue" :disabled="isStreaming" maxlength="500" placeholder="继续追问这道题，例如：为什么 A 项不对？" @keydown.enter.exact.prevent="sendFreeQuestion" />
        <button type="submit" :disabled="isStreaming || !inputValue.trim()">发送</button>
      </form>
    </section>
  </el-drawer>

  <el-dialog v-model="skillDialogVisible" title="讲题方法库" width="560px" append-to-body>
    <el-input v-model="skillKeyword" placeholder="搜索我创建或收藏的 Skill" clearable />
    <div class="skill-list">
      <p v-if="skillLoading" class="no-skills">Skill列表加载中</p>
      <p class="skill-group">推荐方法</p>
      <button class="skill-option" :class="{ active: selectedSkill.id === null }" type="button" @click="chooseSkill(defaultSkill)">
        <strong>{{ defaultSkill.skillName }}</strong><span>{{ defaultSkill.description }}</span>
      </button>
      <template v-if="mySkills.length"><p class="skill-group">我创建的</p><button v-for="skill in mySkills" :key="skill.id" class="skill-option" :class="{ active: selectedSkill.id === skill.id }" type="button" @click="chooseSkill(skill)"><strong>{{ skill.skillName }}</strong><span>{{ skill.description || '暂无简介' }}</span></button></template>
      <template v-if="collectedSkills.length"><p class="skill-group">我收藏的</p><button v-for="skill in collectedSkills" :key="skill.id" class="skill-option" :class="{ active: selectedSkill.id === skill.id }" type="button" @click="chooseSkill(skill)"><strong>{{ skill.skillName }}</strong><span>{{ skill.description || '暂无简介' }}</span></button></template>
      <p v-if="!skillLoading && !visibleSkills.length" class="no-skills">没有匹配的 Skill</p>
    </div>
  </el-dialog>
</template>

<style scoped>
.ai-entry{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px;border:1px solid #b9d4f4;border-radius:6px;background:#f4f9ff;color:#2073c9;cursor:pointer;font:inherit;font-size:13px;font-weight:800;transition:.18s ease}.ai-entry:hover{border-color:#77afe5;background:#eaf4ff;box-shadow:0 5px 12px rgb(32 115 201 / 12%)}.ai-drawer{display:flex;height:100%;min-height:0;flex-direction:column}.ai-header{display:flex;align-items:flex-start;justify-content:space-between;padding:2px 0 18px;border-bottom:1px solid #e8edf3}.ai-header p{display:flex;align-items:center;gap:7px;margin:0;color:#2479cd;font-size:12px;font-weight:900;letter-spacing:.05em}.ai-header p i{width:7px;height:7px;border-radius:50%;background:#1dad75;box-shadow:0 0 0 4px #e7f8f0}.ai-header strong{display:block;margin-top:7px;color:#1d2c42;font-size:17px;line-height:1.2}.ai-header small{display:block;margin-top:5px;color:#8794a7;font-size:11px}.ai-header button{display:grid;width:32px;height:32px;place-items:center;border:1px solid transparent;border-radius:6px;background:transparent;color:#718096;cursor:pointer;font-size:18px;transition:.18s ease}.ai-header button:hover{border-color:#dce6f1;background:#f6f9fc;color:#32425a}.skill-switcher{display:flex;align-items:center;justify-content:space-between;width:100%;margin:15px 0 0;padding:12px 13px;border:1px solid #dce8f5;border-radius:7px;background:#f8fbff;color:#2377ca;cursor:pointer;text-align:left;transition:.18s ease}.skill-switcher:hover{border-color:#9fc6ed;box-shadow:0 5px 14px rgb(40 105 176 / 8%)}.skill-switcher small,.skill-switcher strong,.skill-switcher em{display:block}.skill-switcher small{color:#8190a4;font-size:11px}.skill-switcher strong{margin-top:3px;color:#2d405b;font-size:13px}.skill-switcher em{max-width:340px;overflow:hidden;margin-top:3px;color:#7890aa;font-size:11px;font-style:normal;text-overflow:ellipsis;white-space:nowrap}.skill-switcher>span:last-child{font-size:12px;font-weight:900}.solution-route{margin-top:15px;padding:13px 14px 14px;border:1px solid #e5edf6;border-radius:7px;background:#fff}.route-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.route-heading strong{color:#34445c;font-size:12px}.route-heading span{overflow:hidden;color:#8b98aa;font-size:11px;text-align:right;text-overflow:ellipsis;white-space:nowrap}.route-heading span.streaming{color:#2377ca}.route-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;margin-top:13px}.route-steps>div{position:relative;display:grid;gap:5px;min-width:0;color:#a5b0bf}.route-steps>div:not(:last-child)::after{position:absolute;top:8px;left:20px;width:calc(100% - 16px);height:1px;background:#dce5ee;content:""}.route-steps i{position:relative;z-index:1;display:grid;width:17px;height:17px;place-items:center;border:1px solid #d3dde9;border-radius:50%;background:#fff;color:#8996a8;font-size:10px;font-style:normal;font-weight:800}.route-steps strong,.route-steps small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.route-steps strong{font-size:11px}.route-steps small{font-size:9px}.route-steps .active{color:#2678ca}.route-steps .active i{border-color:#92c0eb;background:#eaf4ff;color:#2377ca}.route-steps .active:not(:last-child)::after{background:#a9d1f4}.route-steps .current i{border-color:#2377ca;background:#2377ca;color:#fff;box-shadow:0 0 0 4px rgb(35 119 202 / 12%)}.quick-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:14px}.quick-actions button{display:flex;min-width:0;align-items:center;gap:7px;padding:8px 9px;border:1px solid #e0e7ef;border-radius:6px;background:#fff;color:#536276;cursor:pointer;font:inherit;font-size:12px;text-align:left;transition:.18s ease}.quick-actions button:hover:not(:disabled),.quick-actions button.active{border-color:#9bc5ee;background:#f5faff;color:#2377ca}.quick-actions button:disabled{cursor:not-allowed;opacity:.55}.quick-actions .el-icon{font-size:15px}.quick-actions .primary-action{grid-column:span 2;padding:10px 11px;border-color:#2f80ed;background:#2f80ed;color:#fff}.quick-actions .primary-action:hover:not(:disabled),.quick-actions .primary-action.active{border-color:#216dcb;background:#216dcb;color:#fff;box-shadow:0 6px 14px rgb(47 128 237 / 21%)}.quick-actions span,.quick-actions strong,.quick-actions small{display:block}.quick-actions span{overflow:hidden;white-space:nowrap}.quick-actions strong{font-size:12px}.quick-actions small{margin-top:2px;color:rgb(255 255 255 / 76%);font-size:10px}.message-list{min-height:0;flex:1;overflow:auto;margin:16px -5px 0;padding:0 5px}.empty-message{display:grid;justify-items:center;max-width:290px;margin:45px auto 0;color:#7e8c9f;text-align:center}.empty-message>span{display:grid;width:42px;height:42px;place-items:center;border:1px solid #d7e9fa;border-radius:50%;background:#eef7ff;color:#2f80ed;font-size:20px;box-shadow:0 7px 16px rgb(40 120 203 / 10%)}.empty-message strong{margin-top:13px;color:#3a4b61;font-size:14px}.empty-message p{margin:7px 0 0;font-size:12px;line-height:1.75}.chat-message{display:flex;gap:8px;margin-bottom:16px}.chat-message>span{display:grid;width:26px;height:26px;flex:0 0 auto;place-items:center;border-radius:50%;background:#eaf3ff;color:#2377ca;font-size:10px;font-weight:900}.chat-message p,.assistant-content{max-width:calc(100% - 39px);margin:0;padding:11px 12px;border-radius:7px;color:#405068;font-size:13px;line-height:1.7;word-break:break-word}.chat-message.user{justify-content:flex-end}.chat-message.user>span{order:2;background:#e8f7ee;color:#198653}.chat-message.user p{background:#eff9f3;color:#315c46;white-space:pre-wrap}.assistant-content{min-width:0;flex:1;border:1px solid #e5ebf2;background:#fff;box-shadow:0 5px 16px rgb(38 63 94 / 5%)}.assistant-label{display:flex;align-items:center;justify-content:space-between;margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid #edf1f5}.assistant-label span{color:#2d5f91;font-size:11px;font-weight:900}.assistant-label small{color:#92a0b0;font-size:10px}.ai-markdown{color:#405068;font-size:13px;line-height:1.75;overflow-wrap:anywhere}.ai-markdown :deep(p),.ai-markdown :deep(ul),.ai-markdown :deep(ol),.ai-markdown :deep(blockquote),.ai-markdown :deep(pre),.ai-markdown :deep(h1),.ai-markdown :deep(h2),.ai-markdown :deep(h3),.ai-markdown :deep(h4){margin:0 0 9px}.ai-markdown :deep(h1){padding:0;color:#1d2c42;font-size:17px;line-height:1.5}.ai-markdown :deep(h2){padding:7px 9px;border-left:3px solid #2f80ed;border-radius:0 4px 4px 0;background:#f3f8fd;color:#275882;font-size:13px;line-height:1.45}.ai-markdown :deep(h2:nth-of-type(3n+2)){border-left-color:#21a778;background:#f0faf6;color:#257259}.ai-markdown :deep(h2:nth-of-type(3n)){border-left-color:#d99127;background:#fff8ed;color:#986219}.ai-markdown :deep(h3),.ai-markdown :deep(h4){color:#27354a;font-size:13px;line-height:1.55}.ai-markdown :deep(p:last-child),.ai-markdown :deep(ul:last-child),.ai-markdown :deep(ol:last-child),.ai-markdown :deep(pre:last-child){margin-bottom:0}.ai-markdown :deep(ul),.ai-markdown :deep(ol){padding-left:20px}.ai-markdown :deep(li + li){margin-top:4px}.ai-markdown :deep(strong),.ai-markdown :deep(h1),.ai-markdown :deep(h2),.ai-markdown :deep(h3),.ai-markdown :deep(h4){color:#27354a}.ai-markdown :deep(code){padding:.08em .3em;border-radius:4px;background:#e7f0fb;color:#1e68b8;font-size:.92em}.ai-markdown :deep(pre){max-width:100%;overflow:auto;padding:9px;border-radius:5px;background:#edf2f7}.ai-markdown :deep(pre code){padding:0;background:transparent;color:inherit}.ai-markdown :deep(blockquote){padding:8px 10px;border-left:3px solid #a8cfef;border-radius:0 5px 5px 0;background:#f7fbff;color:#62748a}.practice-card{margin-top:14px;padding:13px;border:1px solid #bcdaf4;border-radius:7px;background:#f8fbff}.practice-card>div{display:flex;align-items:center;justify-content:space-between;gap:10px}.practice-card>div strong{color:#285d90;font-size:13px}.practice-card>div span{color:#8292a5;font-size:11px}.practice-card>p{margin:10px 0!important;color:#34455c;font-size:13px;font-weight:700}.practice-card>button:not(.practice-submit){display:flex;width:100%;align-items:center;gap:8px;margin-top:7px;padding:8px 9px;border:1px solid #dce7f2;border-radius:5px;background:#fff;color:#526276;cursor:pointer;font:inherit;font-size:12px;text-align:left}.practice-card>button:not(.practice-submit):hover:not(:disabled),.practice-card>button.selected{border-color:#6da9e2;background:#eaf5ff;color:#235f9d}.practice-card>button:disabled{cursor:default}.practice-card>button i{display:grid;width:20px;height:20px;flex:0 0 auto;place-items:center;border:1px solid #c9d8e7;border-radius:50%;font-size:10px;font-style:normal;font-weight:900}.practice-card>button.selected i{border-color:#2f80ed;background:#2f80ed;color:#fff}.practice-card>small{display:block;margin-top:10px;padding:7px 8px;border-left:2px solid #d99127;background:#fff8ed;color:#89672e;font-size:11px;line-height:1.55}.practice-card .practice-submit{display:block;width:100%;height:34px;margin-top:11px;border:0;border-radius:5px;background:#2f80ed;color:#fff;cursor:pointer;font:inherit;font-size:12px;font-weight:900}.practice-card .practice-submit:disabled{cursor:not-allowed;opacity:.55}.chat-message i{display:inline-block;width:5px;height:14px;margin-left:3px;background:#2377ca;vertical-align:-2px;animation:blink 1s step-end infinite}@keyframes blink{50%{opacity:0}}.chat-input{display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #e8edf3}.chat-input textarea{min-height:42px;flex:1;resize:none;padding:9px 10px;border:1px solid #dce4ee;border-radius:6px;color:#334155;font:inherit;font-size:12px;line-height:1.45;outline:none;transition:.18s ease}.chat-input textarea:focus{border-color:#82b6eb;box-shadow:0 0 0 3px rgb(47 128 237 / 10%)}.chat-input button{align-self:flex-end;height:42px;padding:0 13px;border:0;border-radius:6px;background:#2f80ed;color:#fff;cursor:pointer;font:inherit;font-size:12px;font-weight:900;transition:.18s ease}.chat-input button:hover:not(:disabled){background:#216dcb}.chat-input button:disabled{cursor:not-allowed;opacity:.55}.skill-list{max-height:390px;overflow:auto;margin-top:14px}.skill-group{margin:15px 0 7px;color:#7d899a;font-size:12px;font-weight:800}.skill-option{display:grid;width:100%;gap:4px;margin-top:7px;padding:12px;border:1px solid #e1e7ef;border-radius:6px;background:#fff;color:#334155;cursor:pointer;text-align:left;transition:.18s ease}.skill-option:hover,.skill-option.active{border-color:#91c0ed;background:#f6fbff;box-shadow:0 4px 11px rgb(34 104 177 / 6%)}.skill-option strong{font-size:13px}.skill-option span{overflow:hidden;color:#7b8798;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.no-skills{padding:20px 0;color:#8793a4;font-size:13px;text-align:center}@media(max-width:560px){.ai-entry{height:32px;padding:0 9px}.route-steps small{display:none}.skill-switcher em{max-width:250px}.quick-actions button{font-size:11px}}
</style>

<style scoped>
.step-explanation-card{margin-top:2px;border:1px solid #bcdaf4;border-radius:7px;background:#f8fbff}.step-explanation-heading{padding:12px 13px;border-bottom:1px solid #dce8f4;background:#eef7ff}.step-explanation-heading span,.step-explanation-heading strong,.step-explanation-heading small{display:block}.step-explanation-heading span{color:#2f80ed;font-size:10px;font-weight:900}.step-explanation-heading strong{margin-top:3px;color:#285d90;font-size:15px}.step-explanation-heading small{margin-top:3px;color:#748ba5;font-size:11px}.step-explanation-content{padding:13px}.step-explanation-content :deep(p:last-child){margin-bottom:0}.step-conclusion{margin:0 13px 13px!important;padding:9px 10px;border-left:3px solid #1ea76f;background:#effaf5;color:#287051;font-size:12px;font-weight:700}.step-explanation-actions{display:flex;justify-content:space-between;padding:11px 13px;border-top:1px solid #dce8f4;background:#fff}.step-explanation-actions button{height:30px;padding:0 12px;border:1px solid #c9dced;border-radius:5px;background:#fff;color:#286aa9;cursor:pointer;font:inherit;font-size:12px;font-weight:800}.step-explanation-actions button:last-child{border-color:#2f80ed;background:#2f80ed;color:#fff}.step-explanation-actions button:disabled{cursor:not-allowed;opacity:.45}
</style>
