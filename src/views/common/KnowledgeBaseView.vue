<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, provide, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import {
  createChatSession,
  deleteChatMessagePair,
  deleteChatSession,
  getKnowledgeBaseCollectionStatus,
  listChatMessages,
  listChatSessionKnowledgeBases,
  listMyKnowledgeBases,
  pageChatSessions,
  pageCollectedKnowledgeBases,
  renameChatSession,
  sendRagChatStream,
} from '@/api/rag'
import {
  ArrowLeft,
  ArrowRight,
  ChatDotRound,
  ChatLineRound,
  Close,
  DocumentAdd,
  FolderAdd,
  MoreFilled,
  Notebook,
  CollectionTag,
  PictureFilled,
  Plus,
  Search,
} from '@element-plus/icons-vue'
import KnowledgeBaseDetailDrawer from './KnowledgeBaseDetailDrawer.vue'

const userStore = useUserStore()
const route = useRoute()
const router = useRouter()
const SIDEBAR_BREAKPOINT = 980

const senderRef = ref(null)
const bubbleListRef = ref(null)
const apiBaseURL = 'http://localhost:8080'
const composerValue = ref('')
const isLoading = ref(false)
const loadingConversationId = ref('')
const chatMessageLoading = ref(false)
const chatMessagesLoaded = ref(false)
const shouldAutoScroll = ref(true)
const activeConversation = ref('')
const expandedSources = ref({})
const conversations = ref([])
const conversationPage = reactive({
  pageNum: 1,
  pageSize: 20,
  total: 0,
})
const conversationLoading = ref(false)
const conversationLoaded = ref(false)
const conversationScrollRef = ref(null)
const messages = ref([])
const pendingChatImages = ref([])
const conversationMessageCache = ref({})
const sessionDialogVisible = ref(false)
const sessionDialogLoading = ref(false)
const sessionCreateLoading = ref(false)
const sessionKnowledgeBaseVisible = ref(false)
const sessionKnowledgeBaseLoading = ref(false)
const sessionKnowledgeBases = ref([])
const detailVisible = ref(false)
const detailKnowledgeBase = ref(null)
const detailCollected = ref(false)
const detailCollectionLoading = ref(false)
const sessionTab = ref('all')
const myKnowledgeBases = ref([])
const collectedKnowledgeBases = ref([])
const selectedKnowledgeBases = ref([])
const sessionForm = reactive({
  sessionName: '',
})
const sessionFilters = reactive({
  keyword: '',
  kb_type: '',
})
const bubbleItems = computed(() =>
  messages.value.map((item, index) => ({
    ...item,
    key: item.id || index,
    placement: item.role === 'assistant' ? 'start' : 'end',
    noStyle: true,
    loading: Boolean(item.loading),
    itemType: item.role,
  }))
)

const promptCards = [
  '请解释【课程名称】中【具体知识点】的定义、原理和应用。',
  '请总结【课程名称】的【具体知识点】部分的重点、难点和易错点。',
  '关于【具体题目或场景】，请根据知识库给出解题思路和关键依据。',
]

const currentConversationTitle = computed(() => {
  return conversations.value.find((item) => item.id === activeConversation.value)?.title || '知识库问答'
})
const hasMoreConversations = computed(() => conversations.value.length < conversationPage.total)

const isCreatePage = computed(() => route.name === 'knowledge-base-create')
const isMyKnowledgeBasePage = computed(() => route.name === 'knowledge-base-my')
const isCollectionPage = computed(() => route.name === 'knowledge-base-collection')
const isModifyPage = computed(() => route.name === 'knowledge-base-modify')
const topbarTitle = computed(() => {
  if (isCreatePage.value) {
    return '新建知识库'
  }
  if (isMyKnowledgeBasePage.value) {
    return '我的知识库'
  }
  if (isCollectionPage.value) {
    return '收藏的知识库'
  }
  if (isModifyPage.value) {
    return '编辑知识库'
  }
  return currentConversationTitle.value
})
const topbarTips = computed(() => {
  if (isCreatePage.value) {
    return '配置知识库基础信息。'
  }
  if (isMyKnowledgeBasePage.value) {
    return '查看和筛选已创建的知识库。'
  }
  if (isCollectionPage.value) {
    return '查看和筛选已收藏的公开知识库。'
  }
  if (isModifyPage.value) {
    return '修改知识库基础信息。'
  }
  return 'AI 生成内容仅供参考，请注意甄别。'
})

const currentUserName = computed(() => userStore.realName || userStore.username || '用户')
const currentUserInitial = computed(() => currentUserName.value.slice(0, 1).toUpperCase())
const sidebarCollapsed = ref(false)
const isCompactSidebar = ref(false)
const sessionTypeOptions = [
  { label: '全部类型', value: '' },
  { label: '其他', value: 1 },
  { label: '课程', value: 2 },
  { label: '教材', value: 3 },
  { label: '政策', value: 4 },
]
const sessionTabs = [
  { label: '全部', value: 'all' },
  { label: '自建', value: 'owned' },
  { label: '收藏', value: 'collected' },
]
const allSessionKnowledgeBases = computed(() => {
  const map = new Map()
  myKnowledgeBases.value.forEach((item) => map.set(item.id, { ...item, sourceType: 'owned' }))
  collectedKnowledgeBases.value.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, { ...item, sourceType: 'collected' })
    }
  })
  return Array.from(map.values())
})
const currentSessionKnowledgeBases = computed(() => {
  if (sessionTab.value === 'owned') {
    return myKnowledgeBases.value.map((item) => ({ ...item, sourceType: 'owned' }))
  }
  if (sessionTab.value === 'collected') {
    return collectedKnowledgeBases.value.map((item) => ({ ...item, sourceType: 'collected' }))
  }
  return allSessionKnowledgeBases.value
})
const selectedKbIds = computed(() => new Set(selectedKnowledgeBases.value.map((item) => item.id)))
const currentConversationLoading = computed(() => isLoading.value && loadingConversationId.value === activeConversation.value)
const showWelcome = computed(() => {
  const hasNoConversation = conversationLoaded.value && !conversationLoading.value && conversations.value.length === 0
  const hasEmptyActiveConversation = Boolean(activeConversation.value) && chatMessagesLoaded.value && !chatMessageLoading.value && messages.value.length === 0
  return hasNoConversation || hasEmptyActiveConversation
})
const typingQueue = ref([])
const typingTimer = ref(null)
const typingAssistantMessage = ref(null)
const typingFinalize = ref(null)
const typingConversationId = ref('')
const sessionKnowledgeBaseSessionId = ref('')
const editingMessageRowId = ref('')
const editingMessageMessageId = ref('')
const editingMessageDraft = ref('')
const editingMessageSubmitting = ref(false)
const deletingMessageRowIds = ref(new Set())
const latestUserMessageRowId = computed(() => {
  for (let index = messages.value.length - 1; index >= 0; index -= 1) {
    const message = messages.value[index]
    if (message?.role === 'user') {
      return message.id || ''
    }
  }
  return ''
})

provide('knowledgeBaseChat', {
  senderRef,
  bubbleListRef,
  composerValue,
  isLoading: currentConversationLoading,
  activeConversation,
  showWelcome,
  expandedSources,
  conversations,
  messages,
  bubbleItems,
  promptCards,
  currentConversationTitle,
  currentUserName,
  currentUserInitial,
  topbarTitle,
  topbarTips,
  scrollBubbleListToBottom,
  handleBubbleListScroll,
  shouldFollowBubbleContent,
  setComposerText,
  handleSend,
  copyMessageContent,
  canReadMessage,
  toggleSources,
  openReferencePreview,
  canRewriteMessage,
  canDeleteMessage,
  isDeletingMessage,
  deleteMessagePair,
  isEditingMessage,
  editingMessageDraft,
  editingMessageSubmitting,
  startMessageEdit,
  cancelMessageEdit,
  submitMessageEdit,
  pendingChatImages,
  addChatImages,
  removeChatImage,
  handleConversationCommand,
  handleSelectConversation,
  handleNewChat,
  handleCreateKnowledgeBase,
  handleMyKnowledgeBase,
  handleKnowledgeBaseCollection,
  isModifyPage,
  isCreatePage,
  isMyKnowledgeBasePage,
  isCollectionPage,
})

function syncSidebarState() {
  const compact = window.innerWidth <= SIDEBAR_BREAKPOINT

  if (compact !== isCompactSidebar.value) {
    isCompactSidebar.value = compact
    sidebarCollapsed.value = compact
    return
  }

  isCompactSidebar.value = compact
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function getBubbleListInstance() {
  return bubbleListRef.value
}

function getBubbleListScrollElement() {
  const root = bubbleListRef.value?.$el || bubbleListRef.value
  return root?.querySelector?.('.el-scrollbar__wrap') || root?.querySelector?.('.elx-bubble-list__list') || root
}

function isBubbleListNearBottom(offset = 80) {
  const target = getBubbleListScrollElement()
  if (!target?.scrollHeight) {
    return true
  }
  return target.scrollHeight - target.scrollTop - target.clientHeight <= offset
}

function handleBubbleListScroll() {
  window.requestAnimationFrame(() => {
    shouldAutoScroll.value = isBubbleListNearBottom()
  })
}

function shouldFollowBubbleContent() {
  return shouldAutoScroll.value
}

function scrollBubbleListToBottom(smooth = true, force = false) {
  if (!force && !shouldAutoScroll.value) {
    return
  }
  const instance = getBubbleListInstance()
  instance?.scrollToBottom?.(smooth)
  shouldAutoScroll.value = true
}

watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    scrollBubbleListToBottom(false, true)
  }
)
function cloneMessages(list = []) {
  return list.map(({ typing, loading, ...item }) => ({
    ...item,
    sources: item.sources ? [...item.sources] : undefined,
  }))
}

function cacheConversationMessages(sessionId = activeConversation.value, list = messages.value) {
  if (!sessionId) {
    return
  }
  conversationMessageCache.value = {
    ...conversationMessageCache.value,
    [String(sessionId)]: list,
  }
}

function removeConversationMessageCache(sessionId) {
  const nextCache = { ...conversationMessageCache.value }
  delete nextCache[String(sessionId)]
  conversationMessageCache.value = nextCache
}

function pushMessage(role, content, extra = {}) {
  const message = {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    role,
    content,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    ...extra,
  }

  messages.value.push(message)
  return message
}

function stopTypingLoop() {
  if (typingTimer.value) {
    window.clearInterval(typingTimer.value)
    typingTimer.value = null
  }
}

function startTypingLoop() {
  if (typingTimer.value || !typingAssistantMessage.value) {
    return
  }

  typingTimer.value = window.setInterval(() => {
    if (!typingQueue.value.length || !typingAssistantMessage.value) {
      if (typingFinalize.value && !typingQueue.value.length) {
        const finalize = typingFinalize.value
        typingFinalize.value = null
        stopTypingLoop()
        finalize()
      }
      return
    }

    typingAssistantMessage.value.content += typingQueue.value.shift()
    if (typingConversationId.value === activeConversation.value) {
      nextTick().then(() => scrollBubbleListToBottom(false))
    }
  }, 24)
}

function pushTypingChunk(text) {
  const chunk = String(text ?? '')
  if (!chunk) {
    return
  }
  typingQueue.value.push(...Array.from(chunk))
  startTypingLoop()
}

async function copyMessageContent(content) {
  const text = String(content ?? '').trim()

  if (!text) {
    return
  }

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

function toggleSources(id) {
  expandedSources.value = {
    ...expandedSources.value,
    [id]: !expandedSources.value[id],
  }
}

function saveCurrentMessages() {
  if (!activeConversation.value) {
    return
  }
  cacheConversationMessages()
}

function showChatPage() {
  if (route.path !== '/main/knowledge-qa/chat') {
    router.push('/main/knowledge-qa/chat')
  }
}

function normalizeConversation(item) {
  return {
    id: String(item.id),
    title: item.sessionName || item.title || '新会话',
  }
}

function formatMessageTime(value) {
  if (!value) {
    return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function getFileExtension(value) {
  const cleanValue = String(value || '').split('?')[0]
  const index = cleanValue.lastIndexOf('.')
  return index >= 0 ? cleanValue.slice(index + 1).toLowerCase() : ''
}

function getChatImageUrl(fileUrl) {
  return `${apiBaseURL}/api/rag/chat/image?objectName=${encodeURIComponent(fileUrl)}`
}

function parseQaImages(metadata) {
  try {
    const qaImg = JSON.parse(metadata || '{}').qaImg
    return Array.isArray(qaImg)
      ? qaImg.filter((item) => item?.fileUrl && item?.fileName).map((item) => ({ ...item, url: getChatImageUrl(item.fileUrl) }))
      : []
  } catch {
    return []
  }
}

function addChatImages(files) {
  for (const file of Array.from(files || [])) {
    const extension = getFileExtension(file.name)
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(extension) || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      ElMessage.warning('仅支持jpg、jpeg、png、webp格式图片')
      continue
    }
    if (file.size > 12 * 1024 * 1024) {
      ElMessage.warning('单张图片不能超过12MB')
      continue
    }
    if (pendingChatImages.value.length >= 10) {
      ElMessage.warning('一次最多选择10张图片')
      break
    }
    pendingChatImages.value.push({ file, fileName: file.name, url: URL.createObjectURL(file) })
  }
}

function removeChatImage(index) {
  const [image] = pendingChatImages.value.splice(index, 1)
  if (image?.url) URL.revokeObjectURL(image.url)
}

function mapDocRefsToSources(docRefs = []) {
  return docRefs
    .map((item) => ({
      label: item.docName || item.contentSource || item.kbName,
      contentSource: item.contentSource || '',
      kbName: item.kbName || '',
      fileUrl: item.fileUrl || '',
      docType: item.docType || getFileExtension(item.fileUrl || item.docName),
      description: item.description || null,
    }))
    .filter((item) => item.label)
}

async function ensureSessionKnowledgeBasesLoaded() {
  if (sessionKnowledgeBases.value.length && sessionKnowledgeBaseSessionId.value === activeConversation.value) {
    return sessionKnowledgeBases.value
  }

  if (!activeConversation.value) {
    return []
  }

  try {
    sessionKnowledgeBases.value = await listChatSessionKnowledgeBases(activeConversation.value)
    sessionKnowledgeBaseSessionId.value = activeConversation.value
  } catch {
    sessionKnowledgeBases.value = []
    sessionKnowledgeBaseSessionId.value = ''
  }

  return sessionKnowledgeBases.value
}

async function openReferencePreview(source) {
  const fileUrl = String(source?.fileUrl || '').trim()

  if (!fileUrl) {
    return
  }

  const sessionKbList = await ensureSessionKnowledgeBasesLoaded()
  const matchedKb = sessionKbList.find((item) => String(item.kbName || '').trim() === String(source.kbName || '').trim())
  const kbId = Number(matchedKb?.id || route.query.kb_id || 0)

  if (!Number.isInteger(kbId) || kbId <= 0) {
    ElMessage.warning('当前引用缺少知识库信息，无法打开预览')
    return
  }

  router.push({
    name: 'knowledge-base-preview',
    query: {
      kb_id: kbId,
      file_url: fileUrl,
      file_name: source.label,
      doc_type: source.docType,
    },
  })
}

function normalizeChatMessage(item) {
  const docRefInfo = item.docRefInfo || []
  return {
    id: item.id || item.messageId || `${item.role}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    role: item.role,
    content: item.content || '',
    time: formatMessageTime(item.createTime),
    sources: mapDocRefsToSources(docRefInfo),
    docRefInfo,
    messageId: item.messageId,
    metadata: item.metadata,
    qaImgs: parseQaImages(item.metadata),
    docRefCount: item.docRefCount || 0,
  }
}

async function loadChatMessages(sessionId) {
  if (!sessionId) {
    messages.value = []
    chatMessagesLoaded.value = false
    return
  }

  chatMessageLoading.value = true
  chatMessagesLoaded.value = false
  messages.value = []
  const cachedMessages = conversationMessageCache.value[String(sessionId)]
  if (cachedMessages) {
    messages.value = cachedMessages
    chatMessagesLoaded.value = true
    chatMessageLoading.value = false
    return
  }

  try {
    const result = await listChatMessages(sessionId)
    messages.value = (result || []).map(normalizeChatMessage)
    cacheConversationMessages(sessionId)
    chatMessagesLoaded.value = true
  } catch (error) {
    messages.value = []
    ElMessage.error(error?.message || '历史消息加载失败')
  } finally {
    chatMessageLoading.value = false
  }
}

async function loadConversationPage(reset = false) {
  if (conversationLoading.value) {
    return
  }
  if (!reset && !hasMoreConversations.value && conversationLoaded.value) {
    return
  }

  conversationLoading.value = true
  try {
    const pageNum = reset ? 1 : conversationPage.pageNum
    const result = await pageChatSessions({
      pageNum,
      pageSize: conversationPage.pageSize,
    })
    const records = (result?.records || []).map(normalizeConversation)

    conversationPage.total = Number(result?.total || 0)
    if (reset) {
      conversations.value = records
    } else {
      const knownIds = new Set(conversations.value.map((item) => item.id))
      records.forEach((item) => {
        if (!knownIds.has(item.id)) {
          conversations.value.push(item)
        }
      })
    }

    conversationLoaded.value = true
    conversationPage.pageNum = pageNum + 1

    if (!activeConversation.value && conversations.value.length) {
      await handleSelectConversation(conversations.value[0].id)
    } else if (reset && conversations.value.length === 0) {
      activeConversation.value = ''
      messages.value = []
      ElMessage.info('当前暂无会话，请先新建会话！')
    }
  } catch (error) {
    ElMessage.error(error?.message || '会话加载失败')
  } finally {
    conversationLoading.value = false
  }
}

function onConversationScroll(event) {
  const target = event?.target
  if (!target || conversationLoading.value || !hasMoreConversations.value) {
    return
  }

  const remaining = target.scrollHeight - target.scrollTop - target.clientHeight
  if (remaining < 120) {
    loadConversationPage()
  }
}

function coverUrl(objectName) {
  if (!objectName) {
    return ''
  }
  return `${apiBaseURL}/api/rag/kb/cover?objectName=${encodeURIComponent(objectName)}`
}

function typeName(value) {
  return sessionTypeOptions.find((item) => item.value === value)?.label || '未知'
}

function sourceName(value) {
  return value === 'owned' ? '自建' : '收藏'
}

function kbSourceType(item) {
  const kbUserId = Number(item?.userId)
  const currentUserId = Number(userStore.userId)
  return kbUserId && currentUserId && kbUserId === currentUserId ? 'owned' : 'collected'
}

function isSelfCreated(item) {
  const kbUserId = Number(item?.userId)
  const currentUserId = Number(userStore.userId)
  return Boolean(kbUserId && currentUserId && kbUserId === currentUserId)
}

function buildSessionKbParams() {
  const params = {}
  const keyword = sessionFilters.keyword.trim()

  if (keyword) {
    params.keyword = keyword
  }
  if (sessionFilters.kb_type !== '' && sessionFilters.kb_type != null) {
    params.kb_type = sessionFilters.kb_type
  }
  return params
}

async function loadSessionKnowledgeBases() {
  sessionDialogLoading.value = true
  try {
    const params = buildSessionKbParams()
    if (sessionTab.value === 'all') {
      const [myResult, collectedResult] = await Promise.all([
        listMyKnowledgeBases({ ...params, status: 1 }),
        pageCollectedKnowledgeBases({ ...params, pageNum: 1, pageSize: 100 }),
      ])
      myKnowledgeBases.value = myResult || []
      collectedKnowledgeBases.value = collectedResult?.records || []
      return
    }

    if (sessionTab.value === 'owned') {
      myKnowledgeBases.value = await listMyKnowledgeBases({ ...params, status: 1 })
      return
    }

    collectedKnowledgeBases.value = (await pageCollectedKnowledgeBases({ ...params, pageNum: 1, pageSize: 100 }))?.records || []
  } catch (error) {
    ElMessage.error(error?.message || '知识库加载失败')
  } finally {
    sessionDialogLoading.value = false
  }
}

function resetSessionDialog() {
  sessionForm.sessionName = ''
  sessionFilters.keyword = ''
  sessionFilters.kb_type = ''
  sessionTab.value = 'all'
  selectedKnowledgeBases.value = []
  myKnowledgeBases.value = []
  collectedKnowledgeBases.value = []
}

function addSelectedKnowledgeBase(item) {
  if (!item?.id || selectedKbIds.value.has(item.id)) {
    return
  }
  selectedKnowledgeBases.value.push(item)
}

function removeSelectedKnowledgeBase(kbId) {
  selectedKnowledgeBases.value = selectedKnowledgeBases.value.filter((item) => item.id !== kbId)
}

function openSessionDialog() {
  resetSessionDialog()
  sessionDialogVisible.value = true
  loadSessionKnowledgeBases()
}

function handleSessionTabChange(value) {
  sessionTab.value = value
  loadSessionKnowledgeBases()
}

async function handleCreateChatSession() {
  const sessionName = sessionForm.sessionName.trim()
  if (!sessionName) {
    ElMessage.warning('请输入会话名称')
    return
  }
  if (!selectedKnowledgeBases.value.length) {
    ElMessage.warning('请至少选择一个知识库')
    return
  }

  sessionCreateLoading.value = true
  try {
    const session = await createChatSession({
      sessionName,
      kbIds: selectedKnowledgeBases.value.map((item) => item.id),
    })
    createLocalConversation(String(session.id), session.sessionName || sessionName)
    sessionDialogVisible.value = false
    ElMessage.success('会话创建成功')
  } catch (error) {
    ElMessage.error(error?.message || '会话创建失败')
  } finally {
    sessionCreateLoading.value = false
  }
}

async function handleSelectConversation(id) {
  cacheConversationMessages()
  activeConversation.value = id
  senderRef.value?.setLoading?.(false)
  await loadChatMessages(id)
  cacheConversationMessages(id)
  expandedSources.value = {}
  composerValue.value = ''
  senderRef.value?.clear?.()
  showChatPage()
}

function handleCreateKnowledgeBase() {
  if (route.path !== '/main/knowledge-qa/create') {
    router.push('/main/knowledge-qa/create')
  }
}

function handleMyKnowledgeBase() {
  if (route.path !== '/main/knowledge-qa/my') {
    router.push('/main/knowledge-qa/my')
  }
}

function handleKnowledgeBaseCollection() {
  if (route.path !== '/main/knowledge-qa/collection') {
    router.push('/main/knowledge-qa/collection')
  }
}

async function openSessionKnowledgeBases() {
  if (!activeConversation.value) {
    ElMessage.warning('当前还未曾选中会话')
    return
  }

  sessionKnowledgeBaseVisible.value = true
  sessionKnowledgeBaseLoading.value = true
  try {
    sessionKnowledgeBases.value = await listChatSessionKnowledgeBases(activeConversation.value)
  } catch (error) {
    sessionKnowledgeBases.value = []
    sessionKnowledgeBaseVisible.value = false
    ElMessage.error(error?.message || '会话知识库加载失败')
  } finally {
    sessionKnowledgeBaseLoading.value = false
  }
}

function handleBackToKnowledgeBaseShow() {
  router.push('/main/knowledge-qa/show')
}

async function setComposerText(text) {
  composerValue.value = ''
  const sender = senderRef.value?.getSender?.()
  if (sender) {
    await sender.reset({ clearHistory: true })
  } else {
    senderRef.value?.clear?.()
    await nextTick()
  }
  composerValue.value = text
  if (sender) {
    await sender.setText(text)
    sender.focus('end')
  } else {
    senderRef.value?.setText(text)
    senderRef.value?.focus?.('end')
  }
}

async function handleSend() {
  const senderText = senderRef.value?.getModelValue?.()?.text || ''
  const question = (senderText || composerValue.value).trim()

  if (!question || currentConversationLoading.value) {
    return
  }

  if (!activeConversation.value) {
    ElMessage.warning('当前暂无会话，请先新建会话！')
    return
  }

  const requestConversationId = activeConversation.value
  shouldAutoScroll.value = true
  const chatImages = [...pendingChatImages.value]
  const temporaryMessageId = crypto.randomUUID()
  const userMessage = pushMessage('user', question, {
    messageId: `${temporaryMessageId}-user`,
    qaImgs: chatImages,
  })
  pendingChatImages.value = []
  const assistantMessage = pushMessage('assistant', '', {
    role: 'assistant',
    messageId: `${temporaryMessageId}-assistant`,
    loading: true,
    sources: [],
    docRefInfo: [],
    docRefCount: 0,
  })
  composerValue.value = ''
  senderRef.value?.clear?.()
  isLoading.value = true
  loadingConversationId.value = requestConversationId
  typingConversationId.value = requestConversationId
  typingQueue.value = []
  typingAssistantMessage.value = assistantMessage
  cacheConversationMessages(requestConversationId)
  let receivedStreamChunk = false
  let typingCompleted = false
  let resolveTypingDone = () => {}
  const typingDone = new Promise((resolve) => {
    resolveTypingDone = resolve
  })

  function applyAssistantFrame(frame = {}) {
    assistantMessage.messageId = frame.messageId || assistantMessage.messageId
    assistantMessage.metadata = frame.metadata ?? assistantMessage.metadata

    if (Array.isArray(frame.docRefInfo)) {
      assistantMessage.docRefInfo = frame.docRefInfo
      assistantMessage.docRefCount = frame.docRefCount ?? frame.docRefInfo.length
      assistantMessage.sources = mapDocRefsToSources(frame.docRefInfo)
    } else if (frame.docRefCount !== undefined) {
      assistantMessage.docRefCount = frame.docRefCount
    }

    if (requestConversationId === activeConversation.value) {
      messages.value = [...messages.value]
    }
  }

  function completeTyping(frame, keepContent = true) {
    typingCompleted = true
    assistantMessage.loading = false
    applyAssistantFrame(frame)

    if (frame.status === 'done') {
      if (!keepContent) {
        assistantMessage.content = frame.content || assistantMessage.content
      }
      assistantMessage.id = frame.id || assistantMessage.id
      assistantMessage.time = formatMessageTime(frame.createTime)
    } else if (frame.status === 'error') {
      assistantMessage.content = frame.content || 'AI回答生成失败'
      ElMessage.error(assistantMessage.content)
    }

    typingQueue.value = []
    typingFinalize.value = null
    stopTypingLoop()
    typingAssistantMessage.value = null
    resolveTypingDone()
  }

  try {
    await sendRagChatStream({
      sessionId: Number(requestConversationId),
      message: question,
      imgFiles: chatImages.map((item) => item.file),
    }, async (frame) => {
      if (frame.status === 'stream') {
        receivedStreamChunk = true
        applyAssistantFrame(frame)
        if (assistantMessage.loading) {
          assistantMessage.loading = false
        }
        pushTypingChunk(frame.content || '')
      } else if (frame.status === 'done') {
        userMessage.messageId = String(frame.messageId || '').replace(/-assistant$/, '-user')
        applyAssistantFrame(frame)
        if (!receivedStreamChunk && frame.content) {
          pushTypingChunk(frame.content)
        }
        typingFinalize.value = () => completeTyping(frame, receivedStreamChunk)
        if (!typingQueue.value.length) {
          typingFinalize.value()
        }
      } else if (frame.status === 'error') {
        completeTyping(frame)
      }

      await nextTick()
      if (requestConversationId === activeConversation.value) {
        scrollBubbleListToBottom(false)
      }
    })
  } catch (error) {
    completeTyping({ status: 'error', content: error?.message || 'AI回答生成失败' })
  } finally {
    if (!typingCompleted) {
      if (typingQueue.value.length) {
        typingFinalize.value = () => completeTyping({ status: 'done' })
        startTypingLoop()
      } else {
        completeTyping({ status: 'done' })
      }
    }
    await typingDone
    if (loadingConversationId.value === requestConversationId) {
      isLoading.value = false
      loadingConversationId.value = ''
    }
    if (typingConversationId.value === requestConversationId) {
      typingConversationId.value = ''
    }
  }
}

function beginChatStreaming(requestConversationId, assistantMessage) {
  composerValue.value = ''
  senderRef.value?.clear?.()
  isLoading.value = true
  loadingConversationId.value = requestConversationId
  typingConversationId.value = requestConversationId
  typingQueue.value = []
  typingAssistantMessage.value = assistantMessage
  cacheConversationMessages(requestConversationId)
}

async function executeChatStream({
  requestConversationId,
  question,
  assistantMessage,
  rewriteMessageId = '',
  onDoneFrame,
}) {
  let receivedStreamChunk = false
  let typingCompleted = false
  let finalStatus = ''
  let resolveTypingDone = () => {}
  const typingDone = new Promise((resolve) => {
    resolveTypingDone = resolve
  })

  function applyAssistantFrame(frame = {}) {
    assistantMessage.messageId = frame.messageId || assistantMessage.messageId
    assistantMessage.metadata = frame.metadata ?? assistantMessage.metadata

    if (Array.isArray(frame.docRefInfo)) {
      assistantMessage.docRefInfo = frame.docRefInfo
      assistantMessage.docRefCount = frame.docRefCount ?? frame.docRefInfo.length
      assistantMessage.sources = mapDocRefsToSources(frame.docRefInfo)
    } else if (frame.docRefCount !== undefined) {
      assistantMessage.docRefCount = frame.docRefCount
    }

    if (requestConversationId === activeConversation.value) {
      messages.value = [...messages.value]
    }
  }

  function completeTyping(frame, keepContent = true) {
    typingCompleted = true
    finalStatus = frame.status || 'done'
    assistantMessage.loading = false
    applyAssistantFrame(frame)

    if (frame.status === 'done') {
      if (!keepContent) {
        assistantMessage.content = frame.content || assistantMessage.content
      }
      assistantMessage.id = frame.id || assistantMessage.id
      assistantMessage.time = formatMessageTime(frame.createTime)
    } else if (frame.status === 'error') {
      assistantMessage.content = frame.content || 'AI回答生成失败'
      ElMessage.error(assistantMessage.content)
    }

    typingQueue.value = []
    typingFinalize.value = null
    stopTypingLoop()
    typingAssistantMessage.value = null
    resolveTypingDone()
  }

  try {
    await sendRagChatStream({
      sessionId: Number(requestConversationId),
      message: question,
      ...(rewriteMessageId ? { rewriteMessageId } : {}),
    }, async (frame) => {
      if (frame.status === 'stream') {
        receivedStreamChunk = true
        applyAssistantFrame(frame)
        if (assistantMessage.loading) {
          assistantMessage.loading = false
        }
        pushTypingChunk(frame.content || '')
      } else if (frame.status === 'done') {
        if (typeof onDoneFrame === 'function') {
          onDoneFrame(frame)
        }
        applyAssistantFrame(frame)
        if (!receivedStreamChunk && frame.content) {
          pushTypingChunk(frame.content)
        }
        typingFinalize.value = () => completeTyping(frame, receivedStreamChunk)
        if (!typingQueue.value.length) {
          typingFinalize.value()
        }
      } else if (frame.status === 'error') {
        completeTyping(frame)
      }

      await nextTick()
      if (requestConversationId === activeConversation.value) {
        scrollBubbleListToBottom(false)
      }
    })
  } catch (error) {
    completeTyping({ status: 'error', content: error?.message || 'AI回答生成失败' })
  } finally {
    if (!typingCompleted) {
      if (typingQueue.value.length) {
        typingFinalize.value = () => completeTyping({ status: 'done' })
        startTypingLoop()
      } else {
        completeTyping({ status: 'done' })
      }
    }
    await typingDone
    if (loadingConversationId.value === requestConversationId) {
      isLoading.value = false
      loadingConversationId.value = ''
    }
    if (typingConversationId.value === requestConversationId) {
      typingConversationId.value = ''
    }
  }

  return finalStatus || 'done'
}

function canRewriteMessage(item) {
  return item?.role === 'user'
    && item.id
    && item.id === latestUserMessageRowId.value
    && !currentConversationLoading.value
    && !editingMessageSubmitting.value
}

function canReadMessage(item) {
  return item?.role === 'assistant'
    && !item.loading
    && item.id !== typingAssistantMessage.value?.id
}

function getPairedAssistantMessage(item) {
  const userIndex = messages.value.findIndex((message) => message?.id === item?.id)
  const assistantMessage = messages.value[userIndex + 1]
  return assistantMessage?.role === 'assistant' ? assistantMessage : null
}

function getMessagePairId(item) {
  const assistantMessage = getPairedAssistantMessage(item)
  const messageId = [item?.messageId, assistantMessage?.messageId]
    .find((value) => /-(user|assistant)$/.test(String(value || '')))
  return String(messageId || '').replace(/-(user|assistant)$/, '-user')
}

function isDeletingMessage(item) {
  return deletingMessageRowIds.value.has(item?.id)
}

function canDeleteMessage(item) {
  const assistantMessage = getPairedAssistantMessage(item)
  return item?.role === 'user'
    && Boolean(assistantMessage)
    && !assistantMessage.loading
    && assistantMessage !== typingAssistantMessage.value
    && Boolean(getMessagePairId(item))
    && !isDeletingMessage(item)
}

async function deleteMessagePair(item) {
  if (!canDeleteMessage(item)) {
    return
  }

  const sessionId = activeConversation.value
  const userRowId = item.id
  const assistantRowId = getPairedAssistantMessage(item)?.id
  const messageId = getMessagePairId(item)
  if (!sessionId || !userRowId || !assistantRowId || !messageId) {
    ElMessage.error('消息删除失败')
    return
  }

  try {
    await ElMessageBox.confirm('删除后无法恢复，确定删除这组问答吗？', '删除消息', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
      type: 'warning',
    })

    deletingMessageRowIds.value = new Set([...deletingMessageRowIds.value, userRowId])
    await deleteChatMessagePair({ sessionId: Number(sessionId), messageId })

    const removeMessagePair = (list) => list.filter((message) => message.id !== userRowId && message.id !== assistantRowId)
    if (activeConversation.value === sessionId) {
      messages.value = removeMessagePair(messages.value)
      cacheConversationMessages(sessionId, messages.value)
    } else if (conversationMessageCache.value[String(sessionId)]) {
      cacheConversationMessages(sessionId, removeMessagePair(conversationMessageCache.value[String(sessionId)]))
    }
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '删除失败')
    }
  } finally {
    const nextDeletingMessageRowIds = new Set(deletingMessageRowIds.value)
    nextDeletingMessageRowIds.delete(userRowId)
    deletingMessageRowIds.value = nextDeletingMessageRowIds
  }
}

function isEditingMessage(item) {
  return Boolean(editingMessageRowId.value && item?.id === editingMessageRowId.value)
}

function startMessageEdit(item) {
  if (!canRewriteMessage(item)) {
    return
  }

  editingMessageRowId.value = item.id || ''
  editingMessageMessageId.value = item.messageId || ''
  editingMessageDraft.value = item.content || ''
}

function cancelMessageEdit() {
  editingMessageRowId.value = ''
  editingMessageMessageId.value = ''
  editingMessageDraft.value = ''
}

async function submitMessageEdit() {
  const targetRowId = editingMessageRowId.value
  const rewriteMessageId = editingMessageMessageId.value.trim()
  const question = editingMessageDraft.value.trim()

  if (!targetRowId || !rewriteMessageId || !question || currentConversationLoading.value) {
    return
  }

  const requestConversationId = activeConversation.value
  if (!requestConversationId) {
    ElMessage.warning('当前暂无会话，请先新建会话！')
    return
  }

  const targetIndex = messages.value.findIndex((item) => item.id === targetRowId && item.role === 'user')
  const latestUserIndex = latestUserMessageRowId.value
    ? messages.value.findIndex((item) => item.id === latestUserMessageRowId.value)
    : -1
  if (targetIndex < 0 || targetIndex !== latestUserIndex) {
    ElMessage.warning('仅能修改最新一条提问消息')
    return
  }

  editingMessageSubmitting.value = true
  shouldAutoScroll.value = true

  try {
    const originalMessages = messages.value.map((item) => ({ ...item }))
    const targetMessage = messages.value[targetIndex]
    messages.value = messages.value.slice(0, targetIndex + 1)
    targetMessage.content = question
    targetMessage.time = formatMessageTime(new Date())

    const assistantMessage = pushMessage('assistant', '', {
      role: 'assistant',
      loading: true,
      sources: [],
      docRefInfo: [],
      docRefCount: 0,
    })

    beginChatStreaming(requestConversationId, assistantMessage)
    cancelMessageEdit()

    const streamStatus = await executeChatStream({
      requestConversationId,
      question,
      assistantMessage,
      rewriteMessageId,
      onDoneFrame(frame) {
        const nextUserMessageId = String(frame.messageId || '').replace(/-assistant$/, '-user')
        if (nextUserMessageId) {
          targetMessage.messageId = nextUserMessageId
        }
        if (frame.createTime) {
          targetMessage.time = formatMessageTime(frame.createTime)
        }
      },
    })

    if (streamStatus !== 'done') {
      messages.value = originalMessages
    }
  } finally {
    editingMessageSubmitting.value = false
  }
}

function handleConversationCommand(command, item) {
  if (command === 'rename') {
    renameConversation(item)
    return
  }

  if (command === 'delete') {
    deleteConversation(item)
  }
}

async function renameConversation(item) {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的对话名称', '重命名', {
      confirmButtonText: '纭畾',
      cancelButtonText: '取消',
      inputValue: item.title,
      inputPattern: /\S/,
      inputErrorMessage: '对话名称不能为空',
    })

    const sessionName = value.trim()
    if (sessionName.length > 50) {
      ElMessage.warning('对话名称不能超过50个字符')
      return
    }

    const session = await renameChatSession({
      sessionId: Number(item.id),
      sessionName,
    })

    const target = conversations.value.find((conversation) => conversation.id === item.id)
    if (target) {
      target.title = session?.sessionName || sessionName
    }
    ElMessage.success('重命名成功')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '重命名失败')
    }
  }
}

async function deleteConversation(item) {
  try {
    await ElMessageBox.confirm(`确定删除「${item.title}」吗？`, '删除对话', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
      type: 'warning',
    })

    await deleteChatSession(Number(item.id))

    const index = conversations.value.findIndex((conversation) => conversation.id === item.id)
    if (index < 0) {
      return
    }

    conversations.value.splice(index, 1)
    conversationPage.total = Math.max(0, conversationPage.total - 1)
    removeConversationMessageCache(item.id)

    if (activeConversation.value === item.id) {
      activeConversation.value = ''
      messages.value = []
      composerValue.value = ''
      senderRef.value?.clear?.()
      const nextConversation = conversations.value[0]

      if (nextConversation) {
        await handleSelectConversation(nextConversation.id)
      }
    }

    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

async function openSessionKnowledgeBaseDetail(item) {
  detailKnowledgeBase.value = item
  detailCollected.value = false

  if (userStore.isLoggedIn && item?.id && !isSelfCreated(item)) {
    detailCollectionLoading.value = true
    try {
      detailCollected.value = Boolean(await getKnowledgeBaseCollectionStatus(item.id))
    } catch (error) {
      detailCollected.value = false
      ElMessage.error(error?.message || '收藏状态加载失败')
    } finally {
      detailCollectionLoading.value = false
    }
  }

  detailVisible.value = true
}

function handleDetailCollectionChange(value) {
  detailCollected.value = value
}
function createLocalConversation(id, title) {
  cacheConversationMessages()
  conversations.value.unshift({ id, title })
  conversationPage.total += 1
  activeConversation.value = id
  senderRef.value?.setLoading?.(false)
  messages.value = []
  chatMessagesLoaded.value = true
  cacheConversationMessages(id)
  expandedSources.value = {}
  composerValue.value = ''
  senderRef.value?.clear?.()
  showChatPage()
}

function handleNewChat() {
  openSessionDialog()
}

onMounted(() => {
  syncSidebarState()
  window.addEventListener('resize', syncSidebarState)
  loadConversationPage(true)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncSidebarState)
})
</script>

<template>
  <main class="knowledge-base-view" :class="{ 'is-compact-sidebar': isCompactSidebar, 'is-sidebar-collapsed': sidebarCollapsed }">
    <aside class="chat-sidebar">
      <div class="assistant-profile">
        <div class="assistant-avatar">AI</div>
        <span>知识库问答</span>
      </div>

      <nav class="sidebar-actions" aria-label="知识库问答导航">
        <button type="button" @click="handleNewChat">
          <el-icon><ChatLineRound /></el-icon>
          <span>新建对话</span>
        </button>
        <button type="button" :class="{ active: isCreatePage }" @click="handleCreateKnowledgeBase">
          <el-icon><FolderAdd /></el-icon>
          <span>新建知识库</span>
        </button>
        <button type="button" :class="{ active: isMyKnowledgeBasePage }" @click="handleMyKnowledgeBase">
          <el-icon><Notebook /></el-icon>
          <span>我的知识库</span>
        </button>
        <button type="button" :class="{ active: isCollectionPage }" @click="handleKnowledgeBaseCollection">
          <el-icon><CollectionTag /></el-icon>
          <span>知识库收藏</span>
        </button>
        <button type="button" @click="openSessionKnowledgeBases">
          <el-icon><DocumentAdd /></el-icon>
          <span>会话知识库</span>
        </button>
      </nav>

      <div class="history-title">历史对话</div>
      <div ref="conversationScrollRef" class="conversation-list" @scroll="onConversationScroll">
        <div
          v-for="item in conversations"
          :key="item.id"
          class="conversation-item"
          :class="{ active: activeConversation === item.id }"
          @click="handleSelectConversation(item.id)"
        >
          <button class="conversation-main" type="button">
            <el-icon><ChatDotRound /></el-icon>
            <span>{{ item.title }}</span>
          </button>

          <el-dropdown trigger="click" @click.stop @command="(command) => handleConversationCommand(command, item)">
            <button class="conversation-more" type="button" aria-label="更多操作">
              <el-icon><MoreFilled /></el-icon>
            </button>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">重命名</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div v-if="conversationLoading" class="conversation-list-tip">加载中...</div>
        <div v-else-if="conversationLoaded && conversations.length === 0" class="conversation-list-tip">暂无历史对话</div>
        <div v-else-if="conversationLoaded && !hasMoreConversations" class="conversation-list-tip">已加载全部</div>
      </div>

      <div class="sidebar-footer">
        <div class="sidebar-footer__user">
          <el-avatar v-if="userStore.avatar" class="user-avatar" :size="24" :src="userStore.avatar" />
          <div v-else class="user-avatar">{{ currentUserInitial }}</div>
          <span>{{ currentUserName }}</span>
        </div>

        <button
          class="sidebar-toggle"
          type="button"
          :aria-label="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="toggleSidebar"
        >
          <el-icon>
            <ArrowRight v-if="sidebarCollapsed" />
            <ArrowLeft v-else />
          </el-icon>
        </button>
      </div>
    </aside>

    <section class="chat-main">
      <header class="chat-topbar">
        <button class="topbar-back" type="button" aria-label="返回知识库" @click="handleBackToKnowledgeBaseShow">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <div class="topbar-title">
          <strong>{{ topbarTitle }}</strong>
          <span>{{ topbarTips }}</span>
        </div>
      </header>

      <div class="chat-view">
        <router-view />
      </div>
    </section>

    <el-dialog v-model="sessionDialogVisible" class="session-dialog" width="1180px" align-center destroy-on-close>
      <template #header>
        <div class="session-dialog__header">
          <div>
            <strong>请选择您的会话依据知识库</strong>
            <span>多选知识库后创建会话</span>
          </div>
        </div>
      </template>

      <div class="session-dialog__body">
        <section class="session-picked">
          <div class="session-field">
            <span>会话名称</span>
            <el-input v-model="sessionForm.sessionName" maxlength="50" show-word-limit placeholder="请输入会话名称" />
          </div>

          <div class="session-picked__list">
            <article
              v-for="item in selectedKnowledgeBases"
              :key="`picked-${item.id}`"
              class="session-picked-card session-picked-card--clickable"
              role="button"
              tabindex="0"
              @click="openSessionKnowledgeBaseDetail(item)"
              @keydown.enter.prevent="openSessionKnowledgeBaseDetail(item)"
              @keydown.space.prevent="openSessionKnowledgeBaseDetail(item)"
            >
              <el-image v-if="item.kbCover" class="session-picked-card__cover" :src="coverUrl(item.kbCover)" fit="contain" />
              <div v-else class="session-picked-card__cover session-picked-card__cover--empty">
                <el-icon><PictureFilled /></el-icon>
              </div>

              <div class="session-picked-card__info">
                <h3>{{ item.kbName }}</h3>
                <div class="session-picked-card__tags">
                  <el-tag size="small">{{ typeName(item.kbType) }}</el-tag>
                  <el-tag size="small" type="info">{{ sourceName(item.sourceType) }}</el-tag>
                </div>
              </div>

              <button class="session-picked-card__remove" type="button" @click.stop="removeSelectedKnowledgeBase(item.id)">
                <el-icon><Close /></el-icon>
              </button>
            </article>
          </div>
        </section>

        <section class="session-select">
          <aside class="session-select__tabs">
            <button
              v-for="item in sessionTabs"
              :key="item.value"
              type="button"
              :class="['session-tab', { active: sessionTab === item.value }]"
              @click="handleSessionTabChange(item.value)"
            >
              {{ item.label }}
            </button>
          </aside>

          <div class="session-select__panel">
            <div class="session-filter-bar">
              <el-input v-model="sessionFilters.keyword" :prefix-icon="Search" clearable placeholder="按知识库名称模糊搜索" @input="loadSessionKnowledgeBases" />
              <el-select v-model="sessionFilters.kb_type" clearable placeholder="按类型筛选" @change="loadSessionKnowledgeBases">
                <el-option v-for="item in sessionTypeOptions" :key="item.value === '' ? 'all' : item.value" :label="item.label" :value="item.value" />
              </el-select>
            </div>

            <div v-loading="sessionDialogLoading" class="session-kb-grid">
              <article
                v-for="item in currentSessionKnowledgeBases"
                :key="`${sessionTab}-${item.id}`"
                class="session-kb-card session-kb-card--clickable"
                role="button"
                tabindex="0"
                @click="openSessionKnowledgeBaseDetail(item)"
                @keydown.enter.prevent="openSessionKnowledgeBaseDetail(item)"
                @keydown.space.prevent="openSessionKnowledgeBaseDetail(item)"
              >
                <div class="session-kb-card__cover-wrap">
                  <el-image v-if="item.kbCover" class="session-kb-card__cover" :src="coverUrl(item.kbCover)" fit="contain" />
                  <div v-else class="session-kb-card__cover session-kb-card__cover--empty">
                    <el-icon><PictureFilled /></el-icon>
                  </div>
                </div>

                <div class="session-kb-card__body">
                  <h3>{{ item.kbName }}</h3>
                  <div class="session-kb-card__tags">
                    <el-tag size="small">{{ typeName(item.kbType) }}</el-tag>
                    <el-tag size="small" type="info">{{ sourceName(item.sourceType) }}</el-tag>
                  </div>
                  <button class="session-kb-card__add" type="button" :disabled="selectedKbIds.has(item.id)" @click.stop="addSelectedKnowledgeBase(item)">
                    <el-icon><Plus /></el-icon>
                  </button>
                </div>
              </article>

              <el-empty v-if="!sessionDialogLoading && currentSessionKnowledgeBases.length === 0" description="暂无知识库" />
            </div>
          </div>
        </section>
      </div>

      <template #footer>
        <div class="session-dialog__footer">
          <el-button @click="sessionDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="sessionCreateLoading" @click="handleCreateChatSession">确认创建</el-button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="sessionKnowledgeBaseVisible" class="session-kb-dialog" width="980px" align-center destroy-on-close>
      <template #header>
        <div class="session-dialog__header">
          <div>
            <strong>会话知识库</strong>
            <span>当前选中会话所依据的知识库</span>
          </div>
        </div>
      </template>

      <div v-loading="sessionKnowledgeBaseLoading" class="session-kb-view">
        <article
          v-for="item in sessionKnowledgeBases"
          :key="`session-kb-${item.id}`"
          class="session-kb-view-card session-kb-view-card--clickable"
          role="button"
          tabindex="0"
          @click="openSessionKnowledgeBaseDetail(item)"
          @keydown.enter.prevent="openSessionKnowledgeBaseDetail(item)"
          @keydown.space.prevent="openSessionKnowledgeBaseDetail(item)"
        >
          <div class="session-kb-view-card__cover-wrap">
            <el-image v-if="item.kbCover" class="session-kb-view-card__cover" :src="coverUrl(item.kbCover)" fit="contain" />
            <div v-else class="session-kb-view-card__cover session-kb-view-card__cover--empty">
              <el-icon><PictureFilled /></el-icon>
            </div>
          </div>

          <div class="session-kb-view-card__body">
            <h3>{{ item.kbName }}</h3>
            <div class="session-kb-view-card__tags">
              <el-tag size="small">{{ typeName(item.kbType) }}</el-tag>
              <el-tag size="small" type="info">{{ sourceName(kbSourceType(item)) }}</el-tag>
            </div>
          </div>
        </article>

        <el-empty v-if="!sessionKnowledgeBaseLoading && sessionKnowledgeBases.length === 0" description="暂无会话知识库" />
      </div>

      <template #footer>
        <div class="session-dialog__footer">
          <el-button type="primary" @click="sessionKnowledgeBaseVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <KnowledgeBaseDetailDrawer
      v-model="detailVisible"
      :knowledge-base="detailKnowledgeBase"
      :show-collection-action="false"
      :collected="detailCollected"
      :collection-loading="detailCollectionLoading"
      :show-my-collection="false"
      @collection-change="handleDetailCollectionChange"
    />
  </main>
</template>

<style scoped>
.knowledge-base-view {
  position: relative;
  display: grid;
  height: 100%;
  min-height: 0;
  --kb-sidebar-width: 282px;
  --kb-sidebar-collapsed-width: 72px;
  grid-template-columns: var(--kb-sidebar-width) minmax(0, 1fr);
  overflow: hidden;
  background: #ffffff;
  color: #111827;
}

.knowledge-base-view.is-sidebar-collapsed {
  --kb-sidebar-width: var(--kb-sidebar-collapsed-width);
}

.chat-sidebar {
  display: flex;
  position: relative;
  z-index: 2;
  min-height: 0;
  flex-direction: column;
  width: var(--kb-sidebar-width);
  overflow: hidden;
  border-right: 1px solid #e5e7eb;
  background: #f7f7f8;
  transition: width 0.18s ease, box-shadow 0.18s ease;
}

.knowledge-base-view.is-compact-sidebar {
  grid-template-columns: minmax(0, 1fr);
}

.knowledge-base-view.is-compact-sidebar .chat-sidebar {
  position: absolute;
  inset: 0 auto 0 0;
  box-shadow: 8px 0 24px rgb(15 23 42 / 10%);
}

.assistant-profile,
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 700;
}

.assistant-profile {
  margin-top: 8px;
}

.knowledge-base-view.is-sidebar-collapsed .assistant-profile {
  justify-content: center;
  padding: 12px 0 8px;
}

.knowledge-base-view.is-sidebar-collapsed .assistant-profile span,
.knowledge-base-view.is-sidebar-collapsed .sidebar-footer__user span,
.knowledge-base-view.is-sidebar-collapsed .history-title,
.knowledge-base-view.is-sidebar-collapsed .conversation-list,
.knowledge-base-view.is-sidebar-collapsed .conversation-list-tip {
  display: none;
}

.knowledge-base-view.is-sidebar-collapsed .sidebar-actions {
  gap: 8px;
  padding: 8px 10px 16px;
}

.knowledge-base-view.is-sidebar-collapsed .sidebar-actions button {
  justify-content: center;
  gap: 0;
  padding: 0;
}

.knowledge-base-view.is-sidebar-collapsed .sidebar-actions button span {
  display: none;
}

.knowledge-base-view.is-sidebar-collapsed .sidebar-actions button .el-icon {
  font-size: 18px;
}

.assistant-avatar,
.user-avatar {
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #2f80ed;
  color: #ffffff;
  font-weight: 800;
}

.assistant-avatar,
.user-avatar {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.user-avatar {
  flex: 0 0 24px;
}

.sidebar-actions {
  display: grid;
  gap: 4px;
  padding: 10px 16px 18px;
}

.sidebar-actions button,
.conversation-main,
.conversation-more {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.sidebar-actions button {
  display: flex;
  height: 38px;
  align-items: center;
  gap: 12px;
  padding: 0 10px;
  border-radius: 8px;
  color: #111827;
  font-size: 14px;
}

.sidebar-actions button:hover,
.sidebar-actions button.active,
.conversation-item:hover,
.conversation-item.active {
  background: #ffffff;
}

.history-title {
  padding: 14px 24px 8px;
  color: #9aa0aa;
  font-size: 12px;
}

.conversation-list {
  display: grid;
  gap: 4px;
  min-height: 0;
  padding: 0 12px 12px;
  overflow: auto;
}

.conversation-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  color: #22252b;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.conversation-main {
  display: grid;
  grid-column: 1 / 3;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  text-align: left;
}

.conversation-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-more {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 8px;
  color: #9aa0aa;
  opacity: 0;
  transition: opacity 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.conversation-item:hover .conversation-more,
.conversation-item.active .conversation-more {
  opacity: 1;
}

.conversation-more:hover,
.conversation-more:focus-visible {
  background: #eceef1;
  color: #5f6672;
  outline: none;
}

.conversation-list-tip {
  padding: 8px 0 4px;
  color: #a0a5ad;
  font-size: 12px;
  text-align: center;
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid #e5e7eb;
  justify-content: space-between;
  padding-block: 14px;
}

.sidebar-footer__user {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
}

.sidebar-footer__user span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-toggle {
  display: grid;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid #d7e2ef;
  border-radius: 6px;
  background: #ffffff;
  color: #64748b;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.sidebar-toggle:hover,
.sidebar-toggle:focus-visible {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
  box-shadow: 0 6px 16px rgb(37 99 235 / 10%);
  outline: none;
}

.sidebar-toggle .el-icon {
  font-size: 16px;
}

.chat-main {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: 56px minmax(0, 1fr);
  background: #ffffff;
}

.chat-topbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #edf0f3;
  padding: 0 18px;
}

.topbar-back {
  position: absolute;
  left: 18px;
  top: 50%;
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #dbe7f8;
  border-radius: 8px;
  background: #ffffff;
  color: #2563eb;
  cursor: pointer;
  transform: translateY(-50%);
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.topbar-back:hover,
.topbar-back:focus-visible {
  border-color: #bfdbfe;
  background: #eff6ff;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.12);
  outline: none;
  transform: translateY(calc(-50% - 1px));
}

.topbar-back .el-icon {
  font-size: 17px;
}

.topbar-title {
  display: grid;
  justify-items: center;
  gap: 2px;
  min-width: 0;
}

.topbar-title strong {
  font-size: 15px;
}

.topbar-title span {
  color: #a0a5ad;
  font-size: 11px;
}

.chat-view {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.session-dialog :deep(.el-dialog) {
  display: flex;
  max-height: calc(100vh - 32px);
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
}

.session-dialog :deep(.el-dialog__body) {
  min-height: 0;
  overflow-y: auto;
  padding: 0 24px 24px;
}

.session-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 22px 24px 16px;
}

.session-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.session-dialog__header strong {
  display: block;
  color: #0f172a;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.35;
}

.session-dialog__header span {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.session-dialog__body {
  display: grid;
  gap: 18px;
}

.session-picked {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid #e5ebf3;
  border-radius: 8px;
  background: #f8fbff;
}

.session-field {
  display: grid;
  gap: 8px;
}

.session-field span {
  color: #1f2937;
  font-size: 13px;
  font-weight: 700;
}

.session-picked__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.session-picked-card,
.session-kb-card {
  overflow: hidden;
  border: 1px solid #dce5f1;
  border-radius: 8px;
  background: #ffffff;
}

.session-picked-card {
  position: relative;
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 74px;
  padding: 8px 10px 8px 8px;
}

.session-picked-card--clickable {
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.session-picked-card--clickable:hover,
.session-picked-card--clickable:focus-visible {
  border-color: #93c5fd;
  background: #f8fbff;
  outline: none;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);
}

.session-picked-card__cover,
.session-kb-card__cover {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.session-picked-card__cover {
  width: 70px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
}

.session-picked-card__cover--empty,
.session-kb-card__cover--empty {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #edf4ff 0%, #f7fafc 100%);
  color: #8aa0c4;
}

.session-picked-card__cover--empty {
  width: 70px;
  height: 56px;
  border-radius: 6px;
}

.session-picked-card__info,
.session-kb-card__body {
  min-width: 0;
}

.session-picked-card__info h3,
.session-kb-card__body h3 {
  overflow: hidden;
  margin: 0;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-picked-card__info h3 {
  font-size: 14px;
  line-height: 1.4;
}

.session-picked-card__tags,
.session-kb-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.session-picked-card__remove,
.session-kb-card__add {
  display: grid;
  place-items: center;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.session-picked-card__remove {
  width: 30px;
  height: 30px;
  border: 1px solid #d7e2ef;
  border-radius: 6px;
  background: #f8fbff;
  color: #9aa0aa;
  transition: background .18s, border-color .18s, color .18s, box-shadow .18s;
}

.session-picked-card__remove:hover {
  border-color: #fecaca;
  background: #fef2f2;
  color: #ef4444;
  box-shadow: 0 6px 14px rgba(239, 68, 68, .12);
}

.session-picked-card__remove:focus-visible {
  outline: none;
  border-color: #fca5a5;
  background: #fef2f2;
  color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, .16);
}

.session-select {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 14px;
  min-height: 0;
}

.session-select__tabs {
  display: grid;
  gap: 8px;
  align-content: start;
  padding: 12px;
  border: 1px solid #e5ebf3;
  border-radius: 8px;
  background: #f8fbff;
}

.session-tab {
  height: 38px;
  border: 1px solid #d7e2ef;
  border-radius: 6px;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
}

.session-tab.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #1d4ed8;
}

.session-select__panel {
  display: grid;
  gap: 12px;
  min-height: 0;
}

.session-filter-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  gap: 12px;
}

.session-kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  grid-auto-rows: max-content;
  align-content: start;
  gap: 12px;
  min-height: 320px;
  max-height: 420px;
  overflow: auto;
  padding-right: 4px;
}

.session-kb-card {
  display: grid;
  grid-template-rows: auto auto;
}

.session-kb-card--clickable {
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.session-kb-card--clickable:hover,
.session-kb-card--clickable:focus-visible {
  border-color: #93c5fd;
  background: #f8fbff;
  outline: none;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);
}

.session-kb-card__cover-wrap {
  overflow: hidden;
  background: #f4f8ff;
}

.session-kb-card__cover {
  display: block;
  width: 100%;
}

.session-kb-card__cover--empty {
  min-height: 118px;
  font-size: 28px;
}

.session-kb-card__body {
  display: grid;
  gap: 8px;
  padding: 12px 12px 14px;
}

.session-kb-card__body h3 {
  font-size: 14px;
  line-height: 1.4;
}

.session-kb-card__add {
  width: 30px;
  height: 30px;
  margin-left: auto;
  border-radius: 6px;
  border: 1px solid #d7e2ef;
  background: #f8fbff;
  color: #2563eb;
  transition: background .18s, border-color .18s, color .18s, box-shadow .18s;
}

.session-kb-card__add:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #bfdbfe;
  box-shadow: 0 6px 14px rgba(37, 99, 235, .12);
}

.session-kb-card__add:focus-visible {
  outline: none;
  background: #eff6ff;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, .18);
}

.session-kb-card__add:disabled {
  color: #cbd5e1;
  background: #f8fbff;
  border-color: #e5ebf3;
  cursor: not-allowed;
}

.session-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.session-kb-view {
  display: grid;
  gap: 12px;
  min-height: 180px;
  max-height: 560px;
  overflow: auto;
}

.session-kb-view-card {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 12px;
  border: 1px solid #dce5f1;
  border-radius: 8px;
  background: #ffffff;
}

.session-kb-view-card--clickable {
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
}

.session-kb-view-card--clickable:hover,
.session-kb-view-card--clickable:focus-visible {
  border-color: #93c5fd;
  background: #f8fbff;
  outline: none;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.12);
}

.session-kb-view-card__cover-wrap,
.session-kb-view-card__cover {
  width: 120px;
  aspect-ratio: 16 / 9;
}

.session-kb-view-card__cover {
  border-radius: 6px;
  background: #f4f8ff;
  object-fit: contain;
}

.session-kb-view-card__cover--empty {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #edf4ff 0%, #f7fafc 100%);
  color: #8aa0c4;
  font-size: 28px;
}

.session-kb-view-card__body {
  min-width: 0;
}

.session-kb-view-card__body h3 {
  overflow: hidden;
  margin: 0;
  color: #111827;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-kb-view-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

@media (max-width: 980px) {
  .knowledge-base-view {
    grid-template-columns: minmax(0, 1fr);
  }

  .topbar-title span {
    display: none;
  }

  .session-select {
    grid-template-columns: 1fr;
  }

  .session-select__tabs {
    grid-template-columns: repeat(3, 1fr);
  }

  .session-filter-bar {
    grid-template-columns: 1fr;
  }

  .session-kb-view-card {
    grid-template-columns: 1fr;
  }

  .session-kb-view-card__cover-wrap,
  .session-kb-view-card__cover {
    width: 100%;
  }
}
/* AI 探索乐园主题壳体 */
.knowledge-base-view {
  --kb-ink: #3d3564;
  --kb-ink-soft: #4e4473;
  --kb-primary: #8178cf;
  --kb-pink: #ee91bb;
  --kb-mint: #9de4eb;
  --kb-yellow: #fff1a8;
  --kb-paper: #fbfbff;
  --kb-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
  grid-template-columns: 266px minmax(0, 1fr);
  background-color: var(--kb-paper);
  background-image: linear-gradient(90deg, rgb(129 120 207 / 4%) 1px, transparent 1px), linear-gradient(rgb(238 145 187 / 4%) 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--kb-ink);
  font-family: 'Microsoft YaHei', system-ui, sans-serif;
}

.knowledge-base-view.is-sidebar-collapsed {
  grid-template-columns: 72px minmax(0, 1fr);
}

.chat-sidebar {
  border-right: 1px solid rgb(61 53 100 / 34%);
  background: rgb(243 241 255 / 92%);
  box-shadow: 4px 0 0 rgb(61 53 100 / 8%);
}

.assistant-profile,
.sidebar-footer {
  color: var(--kb-ink);
}

.assistant-profile {
  padding: 18px 20px 14px;
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-weight: 900;
}

.assistant-avatar,
.user-avatar {
  border: 1px solid var(--kb-ink);
  background: var(--kb-mint);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 18%);
  color: var(--kb-ink);
}

.sidebar-actions {
  gap: 6px;
  padding: 10px 14px 18px;
}

.sidebar-actions button {
  height: 40px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--kb-ink-soft);
  font-weight: 800;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.sidebar-actions button:hover,
.sidebar-actions button.active {
  border-color: rgb(61 53 100 / 38%);
  background: #ffffff;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 12%);
  color: var(--kb-ink);
  transform: translate(-1px, -1px);
}

.sidebar-actions button:first-child {
  border-color: var(--kb-ink-soft);
  background: var(--kb-primary);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 22%);
  color: #ffffff;
}

.sidebar-actions button:first-child:hover {
  background: #7167bd;
  color: #ffffff;
}

.history-title {
  padding: 14px 20px 8px;
  color: rgb(78 68 115 / 58%);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.conversation-list {
  padding-inline: 12px;
}

.conversation-item {
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--kb-ink-soft);
  font-weight: 700;
}

.conversation-item:hover,
.conversation-item.active {
  border-color: rgb(61 53 100 / 32%);
  background: #ffffff;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 10%);
  color: var(--kb-ink);
}

.conversation-more:hover,
.conversation-more:focus-visible {
  border-radius: 5px;
  background: #fff1f7;
  color: #a44877;
}

.conversation-list-tip {
  color: rgb(78 68 115 / 56%);
  font-weight: 700;
}

.sidebar-footer {
  border-top: 1px solid rgb(61 53 100 / 26%);
  padding-inline: 20px;
}

.sidebar-toggle,
.topbar-back {
  border-color: rgb(61 53 100 / 46%);
  border-radius: 5px;
  background: #ffffff;
  color: var(--kb-ink);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 12%);
}

.sidebar-toggle:hover,
.sidebar-toggle:focus-visible,
.topbar-back:hover,
.topbar-back:focus-visible {
  border-color: var(--kb-ink);
  background: #fff1a8;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 18%);
  color: var(--kb-ink);
  outline: none;
  transform: translate(-1px, -1px);
}

.chat-main {
  background: transparent;
}

.chat-topbar {
  border-bottom: 1px solid rgb(61 53 100 / 24%);
  background: rgb(251 251 255 / 90%);
}

.topbar-title strong {
  color: var(--kb-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0;
}

.topbar-title span {
  color: rgb(78 68 115 / 62%);
  font-weight: 600;
}

.chat-view {
  background: transparent;
}

.session-dialog :deep(.el-dialog),
.session-kb-dialog :deep(.el-dialog) {
  border: 2px solid var(--kb-ink);
  border-radius: 8px;
  background: var(--kb-paper);
  box-shadow: 7px 8px 0 rgb(61 53 100 / 38%);
}

.session-dialog :deep(.el-dialog__header),
.session-kb-dialog :deep(.el-dialog__header) {
  border-bottom: 1px solid rgb(61 53 100 / 20%);
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 52%, #d3f2f2 100%);
}

.session-dialog__header strong,
.session-dialog__header span {
  color: var(--kb-ink);
}

.session-dialog__header span {
  opacity: 0.72;
}

.session-picked,
.session-select__tabs {
  border-color: rgb(61 53 100 / 30%);
  border-radius: 6px;
  background: rgb(255 255 255 / 74%);
  box-shadow: var(--kb-shadow);
}

.session-picked-card,
.session-kb-card {
  border-color: rgb(61 53 100 / 30%);
  border-radius: 6px;
  box-shadow: 2px 3px 0 rgb(61 53 100 / 10%);
}

.session-picked-card--clickable:hover,
.session-picked-card--clickable:focus-visible,
.session-kb-card--clickable:hover,
.session-kb-card--clickable:focus-visible {
  border-color: var(--kb-ink);
  background: #fff1f7;
  box-shadow: 4px 5px 0 rgb(61 53 100 / 16%);
  outline: none;
  transform: translate(-1px, -1px);
}

.session-tab {
  border-color: rgb(61 53 100 / 30%);
  border-radius: 5px;
  color: var(--kb-ink-soft);
  font-weight: 800;
}

.session-tab.active {
  border-color: var(--kb-ink-soft);
  background: var(--kb-primary);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 18%);
  color: #ffffff;
}

.session-filter-bar :deep(.el-input__wrapper),
.session-filter-bar :deep(.el-select__wrapper),
.session-field :deep(.el-input__wrapper) {
  border-radius: 5px;
  box-shadow: 0 0 0 1px rgb(61 53 100 / 30%) inset;
}

.session-filter-bar :deep(.el-input__wrapper:hover),
.session-filter-bar :deep(.el-input__wrapper.is-focus),
.session-filter-bar :deep(.el-select__wrapper:hover),
.session-filter-bar :deep(.el-select__wrapper.is-focused),
.session-field :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--kb-primary) inset, 2px 3px 0 rgb(61 53 100 / 12%);
}

.session-kb-card__add,
.session-picked-card__remove {
  border: 1px solid rgb(61 53 100 / 32%);
  border-radius: 5px;
  background: #ffffff;
  color: var(--kb-ink-soft);
}

.session-kb-card__add:hover,
.session-picked-card__remove:hover {
  border-color: var(--kb-ink);
  background: #fff1a8;
  color: var(--kb-ink);
}

.session-dialog__footer :deep(.el-button--primary) {
  border-color: var(--kb-ink-soft);
  border-radius: 5px;
  background: var(--kb-primary);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 22%);
  font-weight: 800;
}

.session-dialog__footer :deep(.el-button--primary:hover),
.session-dialog__footer :deep(.el-button--primary:focus-visible) {
  background: #7167bd;
  box-shadow: 4px 5px 0 rgb(61 53 100 / 24%);
  transform: translate(-1px, -1px);
}

@media (max-width: 980px) {
  .knowledge-base-view.is-sidebar-collapsed {
    grid-template-columns: minmax(0, 1fr);
  }

  .knowledge-base-view.is-compact-sidebar .chat-sidebar {
    border-right: 1px solid rgb(61 53 100 / 34%);
  }

  .knowledge-base-view.is-compact-sidebar.is-sidebar-collapsed {
    grid-template-columns: var(--kb-sidebar-collapsed-width) minmax(0, 1fr);
  }

  .knowledge-base-view.is-compact-sidebar.is-sidebar-collapsed .chat-sidebar {
    position: relative;
    inset: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
