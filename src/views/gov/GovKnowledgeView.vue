<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Delete,
  Check,
  Clock,
  Collection,
  EditPen,
  FolderOpened,
  Notebook,
  RefreshRight,
  Reading,
  Search,
  Star,
  StarFilled,
} from '@element-plus/icons-vue'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import 'katex/dist/katex.min.css'
import {
  cancelGovKnowledgeFavorite,
  deleteGovKnowledgeAnnotation,
  collectGovKnowledge,
  getGovKnowledgeAnnotations,
  getGovKnowledgeNode,
  getGovKnowledgeCompare,
  getGovKnowledgeFavorite,
  getGovKnowledgeNote,
  getGovKnowledgeProgress,
  getGovKnowledgeTree,
  saveGovKnowledgeAnnotation,
  saveGovKnowledgeNote,
  updateGovKnowledgeAnnotation,
  updateGovKnowledgeProgress,
} from '@/api/gov'

const router = useRouter()
const route = useRoute()

const topicTabs = [
  { label: '行测', value: 'exam' },
]

const moduleTabsByGroup = {
  exam: [
    { label: '政治理论', value: '政治理论' },
    { label: '常识判断', value: '常识判断' },
    { label: '语言理解与表达', value: '语言理解与表达' },
    { label: '数量关系', value: '数量关系' },
    { label: '判断推理', value: '判断推理' },
    { label: '资料分析', value: '资料分析' },
  ],
}

const progressOptions = [
  { value: 'TODO', label: '未学习', icon: Clock, type: 'info' },
  { value: 'LEARNING', label: '学习中', icon: EditPen, type: 'warning' },
  { value: 'DONE', label: '已完成', icon: Check, type: 'success' },
]

const progressLabelMap = {
  TODO: '未学习',
  LEARNING: '学习中',
  DONE: '已完成',
}

const progressTypeMap = {
  TODO: 'info',
  LEARNING: 'warning',
  DONE: 'success',
}

const nodeTypeLabelMap = {
  CHAPTER: '章节',
  POINT: '知识点',
}

const treeRef = ref()
const activeTopicGroup = ref('exam')
const subjectTabs = computed(() => moduleTabsByGroup.exam)
const activeSubject = ref(resolveSubjectValue(route.query.subject, 'exam'))
const keyword = ref('')
const treeLoading = ref(false)
const detailLoading = ref(false)
const favoriteBusy = ref(false)
const noteSaving = ref(false)
const annotationSaving = ref(false)
const annotationLoading = ref(false)
const savingStatus = ref('')
const treeData = ref([])
const currentNode = ref(null)
const currentProgress = ref(null)
const currentCompare = ref([])
const currentCompareItem = ref(null)
const currentAnnotations = ref([])
const currentFavorite = ref({ knowledgeId: null, favorited: false })
const noteDraft = ref('')
const selectedNodeId = ref(null)
const activeContentSection = ref(null)
const contentDialogVisible = ref(false)
const selectionToolbarVisible = ref(false)
const selectionToolbarStyle = ref({ top: '0px', left: '0px' })
const contentBodyRef = ref(null)
const annotationDialogVisible = ref(false)
const annotationDetailVisible = ref(false)
const compareDetailVisible = ref(false)
const annotationFormMode = ref('create')
const annotationForm = ref(createEmptyAnnotationForm())
const currentAnnotation = ref(null)
const pendingAnnotationSelection = ref(null)
const treeSummary = ref({
  totalNodes: 0,
  totalChapters: 0,
  totalPoints: 0,
  donePoints: 0,
  learningPoints: 0,
  todoPoints: 0,
})

const currentTopicTitle = computed(() => '行测')

const currentSubjectTitle = computed(() => {
  return subjectTabs.value.find((item) => item.value === activeSubject.value)?.label || activeSubject.value
})

const currentProgressStatus = computed(() => {
  return currentProgress.value?.status || currentNode.value?.progressStatus || 'TODO'
})

const currentProgressMeta = computed(() => {
  const status = currentProgressStatus.value
  return {
    label: progressLabelMap[status] || '未学习',
    type: progressTypeMap[status] || 'info',
  }
})

const currentFavoriteMeta = computed(() => ({
  favorited: Boolean(currentFavorite.value?.favorited),
  label: currentFavorite.value?.favorited ? '已收藏' : '收藏',
  icon: currentFavorite.value?.favorited ? StarFilled : Star,
  type: currentFavorite.value?.favorited ? 'warning' : 'primary',
}))

const currentNodeTypeLabel = computed(() => {
  return nodeTypeLabelMap[currentNode.value?.nodeType] || '节点'
})

const currentNodeToneClass = computed(() => (currentNode.value?.nodeType === 'POINT' ? 'tone-point' : 'tone-chapter'))

const currentNodePath = computed(() => {
  if (!selectedNodeId.value) {
    return []
  }
  return findNodePath(treeData.value, selectedNodeId.value)
})

const selectedNodeIsPoint = computed(() => currentNode.value?.nodeType === 'POINT')
const hasCurrentContent = computed(() => Boolean(String(currentNode.value?.contentMd || '').trim()))
const hasCompareItems = computed(() => Array.isArray(currentCompare.value) && currentCompare.value.length > 0)
const hasNoteDraft = computed(() => Boolean(String(noteDraft.value || '').trim()))
const currentChildNodes = computed(() => Array.isArray(currentNode.value?.children) ? currentNode.value.children : [])
const hasChildNodes = computed(() => currentChildNodes.value.length > 0)
const currentContentMarkdown = computed(() => String(currentNode.value?.contentMd || '').trim())
const mainContentSectionKey = 'main-content'
const hasCurrentAnnotations = computed(() => currentAnnotations.value.length > 0)
const annotationColorOptions = [
  { value: 'lavender', label: '淡紫', rgb: '111, 96, 214' },
  { value: 'mint', label: '薄青', rgb: '47, 155, 103' },
  { value: 'teal', label: '湖蓝', rgb: '47, 158, 179' },
  { value: 'peach', label: '暖橙', rgb: '201, 139, 18' },
]

function createEmptyAnnotationForm() {
  return {
    annotationId: null,
    knowledgeId: null,
    sectionKey: '',
    sectionTitle: '',
    startOffset: 0,
    endOffset: 0,
    selectedText: '',
    noteContent: '',
    color: 'lavender',
  }
}

function resolveSubjectValue(value, group = 'exam') {
  const normalized = String(Array.isArray(value) ? value[0] : value || '').trim()
  const tabs = moduleTabsByGroup[group] || moduleTabsByGroup.exam
  const matched = tabs.find((item) => item.value === normalized || item.label === normalized)
  return matched?.value || tabs[0]?.value || '政治理论'
}

function goBack() {
  router.push('/main/gov')
}

function goPractice() {
  router.push({
    name: 'gov-practice',
    query: {
      group: activeTopicGroup.value,
      subject: activeSubject.value,
      nodeId: selectedNodeId.value || undefined,
    },
  })
}

function goCollectionOverview() {
  router.push({ name: 'gov-knowledge-collection' })
}

function goNoteOverview() {
  router.push({ name: 'gov-knowledge-notes' })
}

function getComparePreview(item) {
  const text = String(item?.contentMd || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
  return buildTextPreview(text, 120) || '点击查看详情'
}

async function toggleFavorite() {
  if (!selectedNodeId.value || favoriteBusy.value) {
    return
  }

  favoriteBusy.value = true
  try {
    const result = currentFavorite.value?.favorited
      ? await cancelGovKnowledgeFavorite(selectedNodeId.value)
      : await collectGovKnowledge(selectedNodeId.value)
    currentFavorite.value = result || { knowledgeId: selectedNodeId.value, favorited: !currentFavorite.value?.favorited }
    ElMessage.success(currentFavorite.value?.favorited ? '已收藏' : '已取消收藏')
  } catch (error) {
    ElMessage.error(error?.message || '收藏操作失败')
  } finally {
    favoriteBusy.value = false
  }
}

async function saveNote() {
  if (!selectedNodeId.value || noteSaving.value) {
    return
  }

  noteSaving.value = true
  try {
    const result = await saveGovKnowledgeNote(selectedNodeId.value, { content: noteDraft.value })
    noteDraft.value = result?.content ?? ''
    ElMessage.success(noteDraft.value ? '笔记已保存' : '笔记已清空')
  } catch (error) {
    ElMessage.error(error?.message || '笔记保存失败')
  } finally {
    noteSaving.value = false
  }
}

function setContentBodyRef(el) {
  contentBodyRef.value = el || null
}

function getSectionToolbarStyle(rect) {
  const topLimit = Math.max(12, window.innerHeight - 72)
  const leftLimit = Math.max(12, window.innerWidth - 232)
  const top = Math.min(topLimit, Math.max(12, rect.top - 56))
  const left = Math.min(leftLimit, Math.max(12, rect.left))
  return {
    top: `${top}px`,
    left: `${left}px`,
  }
}

function clearSelectionToolbar() {
  selectionToolbarVisible.value = false
  pendingAnnotationSelection.value = null
  window.getSelection?.()?.removeAllRanges?.()
}

function normalizeSelectedText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function getTextOffset(container, targetNode, targetOffset) {
  let offset = 0
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    if (current === targetNode) {
      return offset + targetOffset
    }
    offset += current.textContent?.length || 0
    current = walker.nextNode()
  }
  return -1
}

function getSelectionBlockElement(node, host) {
  let current = node?.nodeType === Node.TEXT_NODE ? node.parentElement : node
  while (current && current !== host) {
    const tagName = current.tagName || ''
    if (['P', 'LI', 'DIV', 'BLOCKQUOTE', 'PRE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'TD', 'TH'].includes(tagName)) {
      return current
    }
    current = current.parentElement
  }
  return host
}

function getSelectionInfo() {
  const container = contentBodyRef.value
  if (!container) {
    return null
  }
  const contentHost = container.querySelector?.('.section-markdown__body')
  if (!contentHost) {
    return null
  }
  const selection = window.getSelection?.()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null
  }
  const range = selection.getRangeAt(0)
  if (!contentHost.contains(range.commonAncestorContainer)) {
    return null
  }
  const startBlock = getSelectionBlockElement(range.startContainer, contentHost)
  const endBlock = getSelectionBlockElement(range.endContainer, contentHost)
  if (!startBlock || !endBlock || startBlock !== endBlock) {
    return null
  }
  const rawText = normalizeSelectedText(selection.toString())
  if (!rawText) {
    return null
  }
  const startOffset = getTextOffset(contentHost, range.startContainer, range.startOffset)
  const endOffset = getTextOffset(contentHost, range.endContainer, range.endOffset)
  if (startOffset < 0 || endOffset <= startOffset) {
    return null
  }
  return {
    sectionKey: mainContentSectionKey,
    sectionTitle: '正文内容',
    startOffset,
    endOffset,
    selectedText: rawText,
    rect: range.getBoundingClientRect(),
  }
}

function showSelectionToolbar(rect) {
  if (!rect) {
    return
  }
  selectionToolbarStyle.value = getSectionToolbarStyle(rect)
  selectionToolbarVisible.value = true
}

function openAnnotationComposer(selectionInfo) {
  if (!selectionInfo) {
    return
  }
  annotationFormMode.value = 'create'
  annotationForm.value = {
    annotationId: null,
    knowledgeId: selectedNodeId.value,
    sectionKey: selectionInfo.sectionKey,
    sectionTitle: selectionInfo.sectionTitle,
    startOffset: selectionInfo.startOffset,
    endOffset: selectionInfo.endOffset,
    selectedText: selectionInfo.selectedText,
    noteContent: '',
    color: 'lavender',
  }
  annotationDialogVisible.value = true
  clearSelectionToolbar()
  window.getSelection?.()?.removeAllRanges?.()
}

function resetAnnotationComposer() {
  annotationForm.value = createEmptyAnnotationForm()
  annotationFormMode.value = 'create'
  pendingAnnotationSelection.value = null
}

async function saveAnnotation() {
  if (!selectedNodeId.value || annotationSaving.value) {
    return
  }

  annotationSaving.value = true
  try {
    const payload = {
      sectionKey: annotationForm.value.sectionKey,
      sectionTitle: annotationForm.value.sectionTitle,
      startOffset: annotationForm.value.startOffset,
      endOffset: annotationForm.value.endOffset,
      selectedText: annotationForm.value.selectedText,
      noteContent: annotationForm.value.noteContent,
      color: annotationForm.value.color,
    }
    const result = annotationFormMode.value === 'edit' && annotationForm.value.annotationId
      ? await updateGovKnowledgeAnnotation(annotationForm.value.annotationId, payload)
      : await saveGovKnowledgeAnnotation(selectedNodeId.value, payload)
    annotationDialogVisible.value = false
    annotationForm.value = createEmptyAnnotationForm()
    currentAnnotation.value = result || null
    await loadAnnotationList(selectedNodeId.value)
    ElMessage.success(annotationFormMode.value === 'edit' ? '标注已更新' : '标注已保存')
  } catch (error) {
    ElMessage.error(error?.message || '标注保存失败')
  } finally {
    annotationSaving.value = false
  }
}

function editAnnotation(annotation) {
  if (!annotation) {
    return
  }
  annotationFormMode.value = 'edit'
  annotationForm.value = {
    annotationId: annotation.annotationId,
    knowledgeId: annotation.knowledgeId,
    sectionKey: annotation.sectionKey,
    sectionTitle: annotation.sectionTitle,
    startOffset: annotation.startOffset,
    endOffset: annotation.endOffset,
    selectedText: annotation.selectedText,
    noteContent: annotation.noteContent,
    color: annotation.color || 'lavender',
  }
  annotationDialogVisible.value = true
}

function openAnnotationDetail(annotation) {
  currentAnnotation.value = annotation || null
  annotationDetailVisible.value = Boolean(annotation)
}

function openCompareDetail(item) {
  currentCompareItem.value = item || null
  compareDetailVisible.value = Boolean(item)
}

async function removeAnnotation(annotation) {
  if (!annotation?.annotationId) {
    return
  }
  try {
    await ElMessageBox.confirm('确定删除这条标注吗？', '删除标注', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteGovKnowledgeAnnotation(annotation.annotationId)
    await loadAnnotationList(selectedNodeId.value)
    if (currentAnnotation.value?.annotationId === annotation.annotationId) {
      annotationDetailVisible.value = false
      currentAnnotation.value = null
    }
    ElMessage.success('标注已删除')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

async function loadAnnotationList(nodeId) {
  const contentHost = contentBodyRef.value?.querySelector?.('.section-markdown__body')
  if (contentHost) {
    delete contentHost.dataset.baseHtml
  }

  if (!nodeId) {
    currentAnnotations.value = []
    await nextTick()
    restoreAnnotationHighlights()
    return
  }

  annotationLoading.value = true
  try {
    const list = await getGovKnowledgeAnnotations(nodeId).catch(() => [])
    currentAnnotations.value = Array.isArray(list) ? list : []
    await nextTick()
    restoreAnnotationHighlights()
    await applyAnnotationHighlights()
  } catch (error) {
    currentAnnotations.value = []
    await nextTick()
    restoreAnnotationHighlights()
  } finally {
    annotationLoading.value = false
  }
}

function restoreAnnotationHighlights() {
  const contentHost = contentBodyRef.value?.querySelector?.('.section-markdown__body')
  if (!contentHost) {
    return
  }
  if (contentHost.dataset.baseHtml) {
    contentHost.innerHTML = contentHost.dataset.baseHtml
  }
}

function applyAnnotationHighlights() {
  const contentHost = contentBodyRef.value?.querySelector?.('.section-markdown__body')
  if (!contentHost) {
    return
  }
  if (!contentHost.dataset.baseHtml) {
    contentHost.dataset.baseHtml = contentHost.innerHTML
  } else {
    contentHost.innerHTML = contentHost.dataset.baseHtml
  }
  currentAnnotations.value
    .slice()
    .sort((a, b) => (b.startOffset || 0) - (a.startOffset || 0))
    .forEach((annotation) => {
      highlightAnnotationInHost(contentHost, annotation)
    })
}

function highlightAnnotationInHost(host, annotation) {
  if (!host) {
    return
  }
  const range = createRangeFromOffsets(host, annotation.startOffset, annotation.endOffset)
  if (!range) {
    return
  }
  wrapHighlightedRange(range, annotation)
}

function createRangeFromOffsets(host, startOffset, endOffset) {
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  let offset = 0
  let startNode = null
  let start = 0
  let endNode = null
  let end = 0
  while (current) {
    const length = current.textContent?.length || 0
    if (!startNode && offset + length >= startOffset) {
      startNode = current
      start = Math.max(0, startOffset - offset)
    }
    if (offset + length >= endOffset) {
      endNode = current
      end = Math.max(0, endOffset - offset)
      break
    }
    offset += length
    current = walker.nextNode()
  }
  if (!startNode || !endNode) {
    return null
  }
  const range = document.createRange()
  range.setStart(startNode, start)
  range.setEnd(endNode, end)
  return range
}

function wrapHighlightedRange(range, annotation) {
  const wrapper = document.createElement('span')
  wrapper.className = 'annotation-highlight'
  wrapper.dataset.annotationId = String(annotation.annotationId)
  wrapper.dataset.annotationColor = annotation.color || 'lavender'
  wrapper.title = annotation.notePreview || annotation.noteContent || ''
  wrapper.style.setProperty('--annotation-rgb', getAnnotationColorRgb(annotation.color))
  const fragment = range.extractContents()
  const textSpan = document.createElement('span')
  textSpan.className = 'annotation-highlight__text'
  textSpan.appendChild(fragment)
  wrapper.appendChild(textSpan)
  const marker = document.createElement('button')
  marker.type = 'button'
  marker.className = 'annotation-marker'
  marker.textContent = '注'
  marker.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    openAnnotationDetail(annotation)
  })
  wrapper.appendChild(marker)
  range.insertNode(wrapper)
}

function getAnnotationColorRgb(color) {
  return annotationColorOptions.find((item) => item.value === color)?.rgb || annotationColorOptions[0].rgb
}

function handleContentMouseUp() {
  if (!selectedNodeIsPoint.value) {
    return
  }
  const selectionInfo = getSelectionInfo()
  if (!selectionInfo) {
    clearSelectionToolbar()
    return
  }
  pendingAnnotationSelection.value = selectionInfo
  showSelectionToolbar(selectionInfo.rect)
}

function startAnnotationFromSelection() {
  if (!pendingAnnotationSelection.value) {
    return
  }
  openAnnotationComposer(pendingAnnotationSelection.value)
}

function handleContentClick(event) {
  const target = event.target?.closest?.('.annotation-highlight')
  if (!target) {
    return
  }
  const annotationId = Number(target.dataset.annotationId || 0)
  if (!annotationId) {
    return
  }
  const annotation = currentAnnotations.value.find((item) => item.annotationId === annotationId)
  if (annotation) {
    openAnnotationDetail(annotation)
  }
}

function beginCreateAnnotation() {
  if (!pendingAnnotationSelection.value) {
    ElMessage.warning('请先在正文中选中一段文字')
    return
  }
  openAnnotationComposer(pendingAnnotationSelection.value)
}

function handleTreeNodeClick(data) {
  if (!data?.id || data.id === selectedNodeId.value) {
    return
  }
  loadNodeDetail(data.id)
}

async function handleTopicChange() {
  activeSubject.value = resolveSubjectValue('', activeTopicGroup.value)
  selectedNodeId.value = null
  currentNode.value = null
  currentProgress.value = null
  await loadTree()
}

async function handleSubjectChange() {
  await loadTree()
}

async function handleSearch() {
  await loadTree({ selectedId: selectedNodeId.value })
}

async function refreshTree() {
  await loadTree({ selectedId: selectedNodeId.value })
}

async function openChildNode(node) {
  if (!node?.id) {
    return
  }
  await loadNodeDetail(node.id)
}

async function setProgress(status) {
  if (!selectedNodeId.value || !selectedNodeIsPoint.value) {
    return
  }

  if (savingStatus.value) {
    return
  }

  const previousProgress = currentProgress.value ? { ...currentProgress.value } : null
  const previousNodeStatus = currentNode.value?.progressStatus
  savingStatus.value = status
  currentProgress.value = {
    ...(currentProgress.value || {}),
    knowledgeId: selectedNodeId.value,
    status,
  }
  if (currentNode.value) {
    currentNode.value.progressStatus = status
  }
  try {
    const result = await updateGovKnowledgeProgress(selectedNodeId.value, { status })
    currentProgress.value = result || currentProgress.value
    ElMessage.success('学习进度已更新')
    await loadTree({ selectedId: selectedNodeId.value })
  } catch (error) {
    currentProgress.value = previousProgress
    if (currentNode.value) {
      currentNode.value.progressStatus = previousNodeStatus
    }
    ElMessage.error(error?.message || '进度保存失败')
  } finally {
    savingStatus.value = ''
  }
}

async function loadTree(options = {}) {
  const selectedId = options.selectedId ?? null
  treeLoading.value = true
  try {
    treeData.value = []
    treeSummary.value = {
      totalNodes: 0,
      totalChapters: 0,
      totalPoints: 0,
      donePoints: 0,
      learningPoints: 0,
      todoPoints: 0,
    }
    selectedNodeId.value = null
    currentNode.value = null
    currentProgress.value = null
    currentCompare.value = []
    currentCompareItem.value = null
    compareDetailVisible.value = false
    currentAnnotations.value = []
    currentFavorite.value = { knowledgeId: null, favorited: false }
    noteDraft.value = ''
    activeContentSection.value = null
    contentDialogVisible.value = false
    clearSelectionToolbar()
    contentBodyRef.value = null
    treeRef.value?.setCurrentKey?.(null)
    const data = await getGovKnowledgeTree(activeSubject.value, keyword.value.trim())
    treeData.value = Array.isArray(data) ? data : []
    treeSummary.value = summarizeTree(treeData.value)

    if (!treeData.value.length) {
      selectedNodeId.value = null
      currentNode.value = null
      currentProgress.value = null
      treeRef.value?.setCurrentKey?.(null)
      return
    }

    let targetId = null
    if (selectedId && findNodeById(treeData.value, selectedId)) {
      targetId = selectedId
    } else if (selectedNodeId.value && findNodeById(treeData.value, selectedNodeId.value)) {
      targetId = selectedNodeId.value
    } else {
      targetId = findFirstSelectableNode(treeData.value)
    }

    if (targetId) {
      treeRef.value?.setCurrentKey?.(targetId)
      await loadNodeDetail(targetId)
    }
  } catch (error) {
    treeData.value = []
    treeSummary.value = {
      totalNodes: 0,
      totalChapters: 0,
      totalPoints: 0,
      donePoints: 0,
      learningPoints: 0,
      todoPoints: 0,
    }
    selectedNodeId.value = null
    currentNode.value = null
    currentProgress.value = null
    activeContentSection.value = null
    contentDialogVisible.value = false
    currentAnnotations.value = []
    clearSelectionToolbar()
    ElMessage.error(error?.message || '知识库加载失败')
  } finally {
    treeLoading.value = false
  }
}

async function loadNodeDetail(nodeId) {
  if (!nodeId) {
    return
  }

  detailLoading.value = true
  try {
    const [detail, progress, compare, favorite, note] = await Promise.all([
      getGovKnowledgeNode(nodeId),
      getGovKnowledgeProgress(nodeId),
      getGovKnowledgeCompare(nodeId).catch(() => []),
      getGovKnowledgeFavorite(nodeId).catch(() => ({ knowledgeId: nodeId, favorited: false })),
      getGovKnowledgeNote(nodeId).catch(() => ({ knowledgeId: nodeId, content: '', updatedAt: null })),
    ])
    currentNode.value = detail || null
    currentProgress.value = progress || null
    currentCompare.value = Array.isArray(compare) ? compare : []
    currentCompareItem.value = null
    compareDetailVisible.value = false
    currentFavorite.value = favorite || { knowledgeId: nodeId, favorited: false }
    noteDraft.value = note?.content || ''
    activeContentSection.value = null
    contentDialogVisible.value = false
    selectedNodeId.value = nodeId
    treeRef.value?.setCurrentKey?.(nodeId)
    await loadAnnotationList(nodeId)
  } catch (error) {
    currentNode.value = null
    currentProgress.value = null
    currentCompare.value = []
    currentCompareItem.value = null
    compareDetailVisible.value = false
    currentAnnotations.value = []
    currentFavorite.value = { knowledgeId: null, favorited: false }
    noteDraft.value = ''
    activeContentSection.value = null
    contentDialogVisible.value = false
    clearSelectionToolbar()
    ElMessage.error(error?.message || '知识点加载失败')
  } finally {
    detailLoading.value = false
  }
}

function summarizeTree(nodes) {
  const summary = {
    totalNodes: 0,
    totalChapters: 0,
    totalPoints: 0,
    donePoints: 0,
    learningPoints: 0,
    todoPoints: 0,
  }

  walkTree(nodes, (node) => {
    summary.totalNodes += 1
    if (node.nodeType === 'CHAPTER') {
      summary.totalChapters += 1
      return
    }

    if (node.nodeType === 'POINT') {
      summary.totalPoints += 1
      if (node.progressStatus === 'DONE') {
        summary.donePoints += 1
      } else if (node.progressStatus === 'LEARNING') {
        summary.learningPoints += 1
      } else {
        summary.todoPoints += 1
      }
    }
  })

  return summary
}

function walkTree(nodes, visitor, trail = []) {
  nodes.forEach((node) => {
    const nextTrail = trail.concat(node)
    visitor(node, nextTrail)
    if (Array.isArray(node.children) && node.children.length) {
      walkTree(node.children, visitor, nextTrail)
    }
  })
}

function findNodeById(nodes, nodeId) {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node
    }
    if (Array.isArray(node.children) && node.children.length) {
      const found = findNodeById(node.children, nodeId)
      if (found) {
        return found
      }
    }
  }
  return null
}

function findFirstSelectableNode(nodes) {
  for (const node of nodes) {
    if (node.nodeType === 'POINT') {
      return node.id
    }
    if (Array.isArray(node.children) && node.children.length) {
      const childId = findFirstSelectableNode(node.children)
      if (childId) {
        return childId
      }
    }
    if (!Array.isArray(node.children) || node.children.length === 0) {
      return node.id
    }
  }
  return null
}

function findNodePath(nodes, targetId, trail = []) {
  for (const node of nodes) {
    const nextTrail = trail.concat(node.title)
    if (node.id === targetId) {
      return nextTrail
    }
    if (Array.isArray(node.children) && node.children.length) {
      const found = findNodePath(node.children, targetId, nextTrail)
      if (found.length) {
        return found
      }
    }
  }
  return []
}

function progressTagType(status) {
  return progressTypeMap[status] || 'info'
}

function nodeTypeTagType(type) {
  return type === 'POINT' ? 'success' : 'info'
}

function nodeTagClass(type) {
  return type === 'POINT' ? 'knowledge-tag--point' : 'knowledge-tag--chapter'
}

function progressTagClass(status) {
  const value = String(status || 'TODO').toUpperCase()
  if (value === 'DONE') {
    return 'knowledge-tag--done'
  }
  if (value === 'LEARNING') {
    return 'knowledge-tag--learning'
  }
  return 'knowledge-tag--todo'
}

function progressToneClass(status) {
  return `progress-tone-${String(status || 'todo').toLowerCase()}`
}

function subjectTabClass(value) {
  return value ? 'subject-chip--default' : 'subject-chip--default'
}

function buildTextPreview(text, maxLength = 110) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function getChildCardDescription(child) {
  if (child?.contentPreview) {
    return child.contentPreview
  }

  if (child?.summary) {
    return child.summary
  }

  if (child?.description) {
    return child.description
  }

  return child?.nodeType === 'CHAPTER'
    ? '点击进入查看下一级章节与知识点。'
    : '点击进入查看知识点正文、进度和笔记。'
}

function openContentSection(section) {
  activeContentSection.value = section || null
  contentDialogVisible.value = Boolean(section)
}

onMounted(async () => {
  activeTopicGroup.value = 'exam'
  activeSubject.value = resolveSubjectValue(route.query.subject, 'exam')
  const initialNodeId = Number(route.query.nodeId || 0) || null
  await loadTree({ selectedId: initialNodeId })
})

onBeforeUnmount(() => {
  clearSelectionToolbar()
})

watch(
  () => [route.query.group, route.query.subject, route.query.nodeId],
  async () => {
    const nextSubject = resolveSubjectValue(route.query.subject, 'exam')
    const nextNodeId = Number(route.query.nodeId || 0) || null
    if (activeTopicGroup.value !== 'exam') {
      activeTopicGroup.value = 'exam'
    }
    if (nextSubject !== activeSubject.value) {
      activeSubject.value = nextSubject
    }
    await loadTree({ selectedId: nextNodeId })
  },
)
</script>

<template>
  <main class="gov-knowledge-page">
    <section class="gov-knowledge-shell">
      <header class="knowledge-header">
        <div class="header-copy">
          <button class="back-button" type="button" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            <span>返回考公首页</span>
          </button>
          <p class="eyebrow">KNOWLEDGE</p>
          <h1>知识点学习</h1>
          <p class="lead">
            先按行测六科切换，再进入各模块查看章节树、知识点正文和学习进度。
          </p>
          <div class="header-stickers">
            <span class="sticker-chip">{{ currentTopicTitle }}</span>
            <span class="sticker-chip">{{ currentSubjectTitle }}</span>
          </div>
          <div class="header-stats">
            <span class="stat-chip stat-chip--todo">
              <span>未学习</span>
              <strong>{{ treeSummary.todoPoints }}</strong>
            </span>
            <span class="stat-chip stat-chip--learning">
              <span>学习中</span>
              <strong>{{ treeSummary.learningPoints }}</strong>
            </span>
            <span class="stat-chip stat-chip--done">
              <span>已完成</span>
              <strong>{{ treeSummary.donePoints }}</strong>
            </span>
          </div>
        </div>

        <div class="header-side">
          <div class="header-quick-links">
            <el-button class="action-button action-button--ghost" :icon="Collection" plain @click="goCollectionOverview">
              我的收藏
            </el-button>
            <el-button class="action-button action-button--ghost" :icon="Notebook" plain @click="goNoteOverview">
              我的笔记
            </el-button>
          </div>

          <div class="header-badge">
            <div class="header-badge__icon"><el-icon><Notebook /></el-icon></div>
            <div>
              <span>当前科目</span>
              <strong>{{ currentTopicTitle }} / {{ currentSubjectTitle }}</strong>
              <small>{{ treeSummary.totalPoints }} 个知识点，{{ treeSummary.donePoints }} 个已完成</small>
            </div>
          </div>
        </div>
      </header>

      <section class="subject-panel">
        <el-tabs v-model="activeTopicGroup" class="topic-tabs" @tab-change="handleTopicChange">
          <el-tab-pane v-for="item in topicTabs" :key="item.value" :label="item.label" :name="item.value">
            <template #label>
              <span class="tab-chip tab-chip--topic">{{ item.label }}</span>
            </template>
          </el-tab-pane>
        </el-tabs>

        <el-tabs v-model="activeSubject" class="subject-tabs" @tab-change="handleSubjectChange">
          <el-tab-pane
            v-for="item in subjectTabs"
            :key="item.value"
            :name="item.value"
            :disabled="item.disabled"
          >
            <template #label>
              <span :class="['tab-chip', subjectTabClass(item.value)]">{{ item.label }}</span>
            </template>
          </el-tab-pane>
        </el-tabs>

        <div class="search-bar">
          <el-input
            v-model="keyword"
            :prefix-icon="Search"
            clearable
            placeholder="按章节名、知识点、正文关键词搜索"
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
          <el-button class="search-refresh-button" :icon="RefreshRight" :loading="treeLoading" plain @click="refreshTree">
            刷新
          </el-button>
        </div>
      </section>

      <section class="knowledge-workspace">
        <aside class="tree-panel">
          <div class="panel-head">
            <div>
              <strong>章节目录</strong>
              <span>点击节点查看内容</span>
            </div>
          </div>

          <div v-loading="treeLoading" class="tree-body">
            <el-tree
              ref="treeRef"
              :data="treeData"
              :default-expand-all="true"
              :highlight-current="true"
              :indent="18"
              :node-key="'id'"
              :props="{ children: 'children', label: 'title' }"
              class="knowledge-tree"
              empty-text="暂无知识点内容"
              @node-click="handleTreeNodeClick"
            >
              <template #default="{ data }">
                <div class="tree-node">
                  <div class="tree-node__main">
                    <strong>{{ data.title }}</strong>
                    <el-tag
                      size="small"
                      :type="nodeTypeTagType(data.nodeType)"
                      :class="['knowledge-tag', nodeTagClass(data.nodeType)]"
                    >
                      {{ nodeTypeLabelMap[data.nodeType] || '节点' }}
                    </el-tag>
                  </div>
                  <div class="tree-node__meta">
                    <el-tag
                      size="small"
                      :type="progressTagType(data.progressStatus)"
                      :class="['knowledge-tag', progressTagClass(data.progressStatus)]"
                      effect="plain"
                    >
                      {{ progressLabelMap[data.progressStatus] || '未学习' }}
                    </el-tag>
                  </div>
                </div>
              </template>
            </el-tree>
          </div>
        </aside>

        <section class="content-panel">
          <div class="panel-head panel-head--content">
            <div>
              <strong>{{ currentNode?.title || '请选择左侧节点' }}</strong>
              <span v-if="currentNodePath.length">
                <template v-for="(item, index) in currentNodePath" :key="`${item}-${index}`">
                  <span v-if="index" class="crumb-separator"><el-icon><ArrowRight /></el-icon></span>
                  <span>{{ item }}</span>
                </template>
              </span>
            </div>

            <div class="content-actions">

              <el-button
                class="action-button"
                :icon="currentFavoriteMeta.icon"
                :loading="favoriteBusy"
                :plain="!currentFavoriteMeta.favorited"
                :type="currentFavoriteMeta.type"
                :class="currentFavoriteMeta.favorited ? 'action-button--favorite' : 'action-button--primary'"
                @click="toggleFavorite"
              >
                {{ currentFavoriteMeta.label }}
              </el-button>
              <el-button class="action-button action-button--primary" :icon="Reading" plain :disabled="!selectedNodeId" @click="goPractice">
                前往练习
              </el-button>
              <el-button
                class="action-button action-button--ghost"
                :icon="RefreshRight"
                :loading="detailLoading"
                @click="selectedNodeId && loadNodeDetail(selectedNodeId)"
              >
                刷新内容
              </el-button>
            </div>
          </div>

          <div v-loading="detailLoading" class="content-body">
            <template v-if="currentNode">
              <div class="content-layout">
                <div class="content-main">
                  <section class="node-summary" :class="currentNodeToneClass">
                    <div class="summary-line">
                      <span class="section-sticker section-sticker--summary" :class="currentNodeToneClass">
                        <el-icon><component :is="selectedNodeIsPoint ? Reading : FolderOpened" /></el-icon>
                        <span>{{ currentNodeTypeLabel }}</span>
                      </span>
                      <el-tag
                        :type="nodeTypeTagType(currentNode.nodeType)"
                        :class="['knowledge-tag', nodeTagClass(currentNode.nodeType)]"
                        effect="plain"
                      >
                        {{ currentNodeTypeLabel }}
                      </el-tag>
                      <el-tag
                        :type="currentProgressMeta.type"
                        :class="['knowledge-tag', progressTagClass(currentProgressStatus)]"
                        effect="plain"
                      >
                        {{ currentProgressMeta.label }}
                      </el-tag>
                      <span class="node-status-note">
                        <template v-if="selectedNodeIsPoint">可手动更新学习状态</template>
                        <template v-else>章节进度由下级知识点自动汇总</template>
                      </span>
                    </div>

                    <div class="progress-actions">
                      <button
                        v-for="option in progressOptions"
                        :key="option.value"
                        :class="['progress-button', progressToneClass(option.value), { active: currentProgressStatus === option.value }]"
                        type="button"
                        :aria-pressed="currentProgressStatus === option.value"
                        :disabled="!selectedNodeIsPoint"
                        @click.stop="setProgress(option.value)"
                      >
                        <el-icon><component :is="option.icon" /></el-icon>
                        <span>{{ option.label }}</span>
                      </button>
                    </div>
                  </section>

                  <section class="content-card-panel" :class="currentNodeToneClass">
                    <header class="section-head">
                      <div class="section-head__title">
                        <span class="section-sticker section-sticker--content" :class="currentNodeToneClass">
                          <el-icon><Reading /></el-icon>
                          <span>正文</span>
                        </span>
                        <strong>{{ currentNode?.title || "正文内容" }}</strong>
                      </div>
                      <div class="section-head__tools">
                        <span>支持 Markdown + LaTeX</span>
                        <el-button
                          v-if="selectedNodeIsPoint && hasCurrentContent"
                          class="mini-action-button"
                          text
                          type="primary"
                          @click="beginCreateAnnotation"
                        >
                          新增标注
                        </el-button>
                      </div>
                    </header>

                    <section v-if="hasCurrentContent" :ref="setContentBodyRef" class="preview-card preview-card--stacked content-preview-card" @click="handleContentClick" @mouseup="handleContentMouseUp">
                      <header class="section-title">
                        <span>内容预览</span>
                        <small>实时渲染结果</small>
                      </header>
                      <div
                        :key="selectedNodeId || 'content-empty'"
                        class="markdown-preview section-markdown__body markdown-body content-markdown content-markdown--direct"
                      >
                        <MarkdownRenderer
                          :markdown="currentContentMarkdown"
                          :enable-latex="true"
                          :enable-shiki="true"
                        />
                      </div>
                    </section>
                    <el-empty v-else description="当前节点暂无正文内容" />
                  </section>

                  <section v-if="currentChildNodes.length" class="child-card-panel" :class="currentNodeToneClass">
                    <header class="section-head">
                      <div class="section-head__title">
                        <span class="section-sticker section-sticker--child" :class="currentNodeToneClass">
                          <el-icon><FolderOpened /></el-icon>
                          <span>资料</span>
                        </span>
                        <strong>下级资料卡</strong>
                      </div>
                      <span>{{ currentChildNodes.length }} 项</span>
                    </header>

                    <div class="child-card-grid">
                      <button
                        v-for="child in currentChildNodes"
                        :key="child.id"
                        class="child-card"
                        type="button"
                        @click="openChildNode(child)"
                      >
                        <div class="child-card__icon" :class="child.nodeType === 'CHAPTER' ? 'tone-chapter' : 'tone-point'">
                          <el-icon>
                            <component :is="child.nodeType === 'CHAPTER' ? FolderOpened : Reading" />
                          </el-icon>
                        </div>
                        <div class="child-card__main">
                        <div class="child-card__head">
                          <strong>{{ child.title }}</strong>
                          <el-tag
                            size="small"
                            :type="nodeTypeTagType(child.nodeType)"
                            :class="['knowledge-tag', nodeTagClass(child.nodeType)]"
                            effect="plain"
                          >
                              {{ nodeTypeLabelMap[child.nodeType] || '节点' }}
                          </el-tag>
                        </div>
                        <p>{{ getChildCardDescription(child) }}</p>
                        <div class="child-card__tags">
                            <el-tag
                              size="small"
                              :type="progressTagType(child.progressStatus)"
                              :class="['knowledge-tag', progressTagClass(child.progressStatus)]"
                              effect="plain"
                            >
                              {{ progressLabelMap[child.progressStatus] || '未学习' }}
                            </el-tag>
                            <el-tag v-if="child.children?.length" size="small" type="info" effect="plain">
                              {{ child.children.length }} 个下级
                            </el-tag>
                          </div>
                        </div>
                        <el-icon class="child-card__arrow"><ArrowRight /></el-icon>
                      </button>
                    </div>
                  </section>
                  <section v-if="selectedNodeIsPoint" class="compare-panel tone-compare">
                    <header class="section-head">
                      <div class="section-head__title">
                        <span class="section-sticker section-sticker--compare tone-compare">
                          <el-icon><Collection /></el-icon>
                          <span>辨析</span>
                        </span>
                        <strong>易混辨析</strong>
                      </div>
                      <span>{{ currentCompare.length }} 项</span>
                    </header>

                    <div v-if="hasCompareItems" class="compare-list">
                      <button
                        v-for="item in currentCompare"
                        :key="item.id"
                        class="compare-item"
                        type="button"
                        @click="openCompareDetail(item)"
                      >
                        <div class="compare-item__head">
                          <strong>{{ item.title }}</strong>
                          <el-tag size="small" effect="plain">辨析</el-tag>
                        </div>
                        <p>{{ getComparePreview(item) }}</p>
                      </button>
                    </div>
                    <el-empty v-else description="当前节点暂无易混辨析内容" />
                  </section>
                </div>

                <aside class="note-sidebar">
                  <section class="note-panel note-panel--sticky tone-note" :class="currentNodeToneClass">
                    <header class="section-head">
                      <div class="section-head__title">
                        <span class="section-sticker section-sticker--note" :class="currentNodeToneClass">
                          <el-icon><Notebook /></el-icon>
                          <span>笔记</span>
                        </span>
                        <strong>我的笔记</strong>
                      </div>
                      <span>右侧单列随时记录</span>
                    </header>

                    <template v-if="selectedNodeId">
                      <div class="note-body">
                        <div class="note-meta">
                          <span>{{ currentNode?.title || '当前节点' }}</span>
                          <small>{{ currentProgressMeta.label }} · {{ currentNodeTypeLabel }}</small>
                        </div>

                        <el-input
                          v-model="noteDraft"
                          :autosize="{ minRows: 12, maxRows: 20 }"
                          type="textarea"
                          placeholder="记录这部分内容的解题提醒、易错点或自己的理解"
                        />

                        <div class="note-actions">
                          <el-button :loading="noteSaving" type="primary" @click="saveNote">保存笔记</el-button>
                          <el-button :disabled="noteSaving || !hasNoteDraft" plain @click="noteDraft = ''">清空</el-button>
                        </div>
                      </div>
                    </template>
                    <el-empty v-else description="请选择左侧节点后记录笔记" />
                  </section>

                  <section class="note-panel annotation-panel tone-note" :class="currentNodeToneClass">
                    <header class="section-head">
                      <div class="section-head__title">
                        <span class="section-sticker section-sticker--note" :class="currentNodeToneClass">
                          <el-icon><Notebook /></el-icon>
                          <span>标注</span>
                        </span>
                        <strong>我的标注</strong>
                      </div>
                      <span>{{ currentAnnotations.length }} 条</span>
                    </header>

                    <div v-loading="annotationLoading" class="annotation-list">
                      <template v-if="hasCurrentAnnotations">
                        <article
                          v-for="annotation in currentAnnotations"
                          :key="annotation.annotationId"
                          class="annotation-item"
                          :style="{ '--annotation-rgb': getAnnotationColorRgb(annotation.color) }"
                          @click="openAnnotationDetail(annotation)"
                        >
                          <span class="annotation-item__dot"></span>
                          <div class="annotation-item__main">
                            <div class="annotation-item__head">
                              <strong>{{ annotation.sectionTitle }}</strong>
                              <el-tag size="small" effect="plain">注</el-tag>
                            </div>
                            <p>{{ annotation.selectedPreview }}</p>
                            <small>{{ annotation.notePreview }}</small>
                          </div>
                        </article>
                      </template>
                      <el-empty v-else description="暂无标注" />
                    </div>
                  </section>
                </aside>
              </div>
            </template>

            <el-empty v-else description="请先从左侧选择一个知识点" />
          </div>
        </section>
      </section>
    </section>

    <div
      v-if="selectionToolbarVisible"
      class="selection-toolbar"
      :style="selectionToolbarStyle"
      @mousedown.stop
    >
      <span>已选中文本</span>
      <div class="selection-toolbar__actions">
        <el-button size="small" type="primary" @click="startAnnotationFromSelection">标注</el-button>
        <el-button size="small" plain @click="clearSelectionToolbar">取消</el-button>
      </div>
    </div>

    <el-dialog
      v-model="annotationDialogVisible"
      :title="annotationFormMode === 'edit' ? '编辑标注' : '新增标注'"
      width="560px"
      class="annotation-dialog"
      @closed="resetAnnotationComposer"
    >
      <div class="annotation-compose">
        <div class="annotation-quote">
          <span>选中内容</span>
          <p>{{ annotationForm.selectedText }}</p>
        </div>
        <div class="annotation-color-row">
          <button
            v-for="item in annotationColorOptions"
            :key="item.value"
            type="button"
            class="color-chip"
            :class="{ active: annotationForm.color === item.value }"
            :style="{ '--annotation-rgb': item.rgb }"
            @click="annotationForm.color = item.value"
          >
            {{ item.label }}
          </button>
        </div>
        <el-input
          v-model="annotationForm.noteContent"
          :autosize="{ minRows: 5, maxRows: 10 }"
          type="textarea"
          placeholder="写一句简短说明，比如考点、提示、易错点"
        />
      </div>
      <template #footer>
        <el-button @click="annotationDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="annotationSaving" @click="saveAnnotation">保存</el-button>
      </template>
    </el-dialog>

    <el-drawer
      v-model="annotationDetailVisible"
      title="标注详情"
      size="420px"
      class="annotation-detail-drawer"
    >
      <div v-if="currentAnnotation" class="annotation-detail">
        <div class="annotation-detail__quote" :style="{ '--annotation-rgb': getAnnotationColorRgb(currentAnnotation.color) }">
          <span>{{ currentAnnotation.sectionTitle }}</span>
          <p>{{ currentAnnotation.selectedText }}</p>
        </div>
        <p class="annotation-detail__note">{{ currentAnnotation.noteContent }}</p>
        <div class="annotation-detail__meta">
          <span>正文：{{ currentAnnotation.sectionTitle }}</span>
          <span>位置：{{ currentAnnotation.startOffset }} - {{ currentAnnotation.endOffset }}</span>
        </div>
        <div class="annotation-detail__actions">
          <el-button @click="editAnnotation(currentAnnotation)">编辑</el-button>
          <el-button type="danger" plain @click="removeAnnotation(currentAnnotation)">删除</el-button>
        </div>
      </div>
    </el-drawer>

    <el-drawer
      v-model="compareDetailVisible"
      title="辨析详情"
      size="420px"
      class="annotation-detail-drawer"
    >
      <div v-if="currentCompareItem" class="annotation-detail">
        <div class="annotation-detail__quote" style="--annotation-rgb: 111, 96, 214;">
          <span>{{ currentCompareItem.title }}</span>
          <p>{{ getComparePreview(currentCompareItem) }}</p>
        </div>
        <div class="markdown-body compare-markdown compare-markdown--detail">
          <MarkdownRenderer :markdown="currentCompareItem.contentMd" :enable-latex="true" :enable-shiki="true" />
        </div>
      </div>
    </el-drawer>
  </main>

</template>
<style scoped>
.gov-knowledge-page {
  min-height: 100%;
  padding: 28px;
  background:
    linear-gradient(90deg, rgb(120 108 219 / 9%) 1px, transparent 1px),
    linear-gradient(rgb(120 108 219 / 9%) 1px, transparent 1px),
    linear-gradient(180deg, #fafaff 0%, #f3f5ff 100%);
  background-size: 48px 48px, 48px 48px, auto;
  color: #201c3a;
}

.gov-knowledge-shell {
  width: min(1480px, 100%);
  min-height: calc(100vh - 112px);
  margin: 0 auto;
  padding: 24px 28px 22px;
  border: 1px solid #d9d5ff;
  border-radius: 26px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 18px 0 rgb(111 96 214 / 10%), 0 28px 60px rgb(55 50 118 / 10%);
  overflow: hidden;
}

.knowledge-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dfe7fb;
}

.header-copy {
  min-width: 0;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid #cad8f4;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f2f7ff 100%);
  color: #4f6fb4;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 0 rgb(77 113 182 / 12%), 0 8px 18px rgb(77 113 182 / 8%);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.back-button:hover,
.back-button:focus-visible {
  background: linear-gradient(180deg, #ffffff 0%, #eaf1ff 100%);
  color: #365391;
  outline: none;
  transform: translateY(-1px);
}

.eyebrow {
  margin: 10px 0 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4f73b8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.eyebrow::before {
  content: '';
  width: 10px;
  height: 10px;
  border: 1px solid #7e96df;
  border-radius: 999px;
  background: #ffd97a;
  box-shadow: 0 0 0 4px rgb(126 150 223 / 10%);
}

h1 {
  margin: 6px 0 0;
  color: #1f2340;
  font-size: clamp(30px, 4vw, 44px);
  line-height: 1.1;
}

.lead {
  max-width: 720px;
  margin: 6px 0 0;
  color: #70738d;
  font-size: 14px;
  line-height: 1.5;
}

.header-stickers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.sticker-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid #d8d4ff;
  border-radius: 999px;
  background: #f4f1ff;
  color: #6f63e8;
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 6px 12px rgb(82 72 165 / 6%);
}

.header-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid #d8d4ff;
  border-radius: 999px;
  background: #f8f6ff;
  box-shadow: 0 6px 12px rgb(82 72 165 / 6%);
}

.stat-chip span {
  font-size: 12px;
  font-weight: 800;
}

.stat-chip strong {
  font-size: 14px;
  font-weight: 900;
}

.stat-chip--todo {
  border-color: #d8d4ff;
  background: #f6f4ff;
  color: #6f63e8;
}

.stat-chip--learning {
  border-color: #f2ddb1;
  background: #fff8ea;
  color: #c98b12;
}

.stat-chip--done {
  border-color: #cbeed7;
  background: #f1fbf5;
  color: #2f9b67;
}

.header-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  align-self: flex-start;
  min-width: 260px;
  padding: 12px 16px;
  border: 1px solid #d3e0fb;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 96%) 0%, rgb(245 249 255 / 96%) 100%);
  box-shadow: 0 12px 24px rgb(77 113 182 / 10%), inset 0 1px 0 rgb(255 255 255 / 88%);
}

.header-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 0 0 360px;
  min-width: 320px;
}

.header-quick-links {
  display: flex;
  gap: 10px;
}

.header-quick-links .action-button {
  flex: 1 1 0;
}

@media (max-width: 1320px) {
  .header-side {
    flex: 1 1 auto;
    min-width: 0;
  }
}

.header-badge__icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(180deg, #edf4ff 0%, #dceaff 100%);
  color: #4d72b6;
}

.header-badge__icon .el-icon {
  font-size: 20px;
}

.header-badge span,
.header-badge small {
  display: block;
}

.header-badge span {
  color: #7b86ab;
  font-size: 11px;
  font-weight: 800;
}

.header-badge strong {
  display: block;
  margin-top: 2px;
  color: #20315f;
  font-size: 15px;
}

.header-badge small {
  margin-top: 4px;
  color: #6f7da7;
  font-size: 12px;
}

.subject-panel {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
  margin-top: 14px;
  padding: 12px 14px;
  border: 1px solid #d7e2fb;
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 98%) 0%, rgb(248 246 255 / 98%) 100%);
  box-shadow: 0 10px 24px rgb(77 113 182 / 7%), inset 0 1px 0 rgb(255 255 255 / 76%);
}

.topic-tabs,
.subject-tabs {
  width: 100%;
  min-width: 0;
}

.topic-tabs :deep(.el-tabs__header),
.subject-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.topic-tabs :deep(.el-tabs__nav-wrap)::after,
.subject-tabs :deep(.el-tabs__nav-wrap)::after {
  display: none;
}

.topic-tabs :deep(.el-tabs__active-bar),
.subject-tabs :deep(.el-tabs__active-bar) {
  display: none;
}

.topic-tabs :deep(.el-tabs__nav),
.subject-tabs :deep(.el-tabs__nav) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-tabs :deep(.el-tabs__item),
.subject-tabs :deep(.el-tabs__item) {
  height: auto;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  font-weight: 700;
}

.topic-tabs :deep(.el-tabs__item:hover),
.subject-tabs :deep(.el-tabs__item:hover) {
  color: inherit;
}

.tab-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid #cfc8ff;
  border-radius: 999px;
  background: #f8f6ff;
  color: #665ea8;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  box-shadow: 0 6px 12px rgb(82 72 165 / 6%);
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease;
}

.topic-tabs :deep(.el-tabs__item.is-active) .tab-chip--topic {
  border-color: #6e8ed8;
  background: linear-gradient(180deg, #88adf7 0%, #6f8fe0 100%);
  color: #fff;
  box-shadow: 0 8px 16px rgb(77 113 182 / 18%);
}
.subject-chip--default {
  border-color: #d0caff;
  background: #f8f6ff;
  color: #665ea8;
}

.subject-tabs :deep(.el-tabs__item.is-active) .tab-chip {
  border-color: #6e8ed8;
  background: linear-gradient(180deg, #88adf7 0%, #6f8fe0 100%);
  color: #fff;
  box-shadow: 0 8px 16px rgb(77 113 182 / 18%);
}

.subject-tabs :deep(.el-tabs__item:hover) .tab-chip,
.topic-tabs :deep(.el-tabs__item:hover) .tab-chip {
  transform: translateY(-1px);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px;
  border: 1px solid #d8e3fb;
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f7fbff 100%);
  box-shadow: 0 10px 24px rgb(77 113 182 / 7%);
}

.search-bar :deep(.el-input) {
  flex: 1;
}

.search-bar :deep(.el-input__wrapper) {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid #dbe6fb;
  border-radius: 14px;
  background: #f8fbff;
  box-shadow: none;
}

.search-bar :deep(.el-input__wrapper.is-focus) {
  border-color: #6f8fe0;
  box-shadow: 0 0 0 3px rgb(111 143 224 / 12%);
}

.search-refresh-button {
  min-width: 90px;
  height: 42px;
  padding: 0 16px;
  border-color: #6f8fe0;
  border-radius: 14px;
  background: linear-gradient(180deg, #8fb0f5 0%, #6f8fe0 100%);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 8px 16px rgb(77 113 182 / 18%);
}

.search-refresh-button:hover,
.search-refresh-button:focus-visible {
  border-color: #5f82d9;
  background: linear-gradient(180deg, #9bbcf9 0%, #7d9dea 100%);
  color: #fff;
}

.knowledge-tag.el-tag {
  min-width: 0;
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border-width: 1px;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 12%);
}

.knowledge-tag--chapter.el-tag {
  border-color: #7d70db;
  background: linear-gradient(180deg, #f4f1ff 0%, #ffffff 100%);
  color: #6f63e8;
}

.knowledge-tag--point.el-tag {
  border-color: #7d70db;
  background: linear-gradient(180deg, #f4f1ff 0%, #ffffff 100%);
  color: #6f63e8;
}

.knowledge-tag--todo.el-tag {
  border-color: #cad4ea;
  background: #fff;
  color: #6b7389;
}

.knowledge-tag--learning.el-tag {
  border-color: #f1ddb0;
  background: #fff8e8;
  color: #c98b12;
}

.knowledge-tag--done.el-tag {
  border-color: #bfe8c9;
  background: #f3fbf5;
  color: #2f9b67;
}

.knowledge-workspace {
  display: grid;
  grid-template-columns: minmax(260px, 320px) minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
}

.tree-panel,
.content-panel {
  min-width: 0;
  border: 1px solid #d9d5ff;
  border-radius: 20px;
  background: linear-gradient(180deg, #faf8ff 0%, #ffffff 18%);
  box-shadow: 0 12px 26px rgb(82 72 165 / 7%);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid #e7e3ff;
}

.panel-head strong {
  display: block;
  color: #2a2653;
  font-size: 15px;
}

.panel-head span {
  display: block;
  margin-top: 4px;
  color: #8f88b0;
  font-size: 12px;
}

.tree-body {
  min-height: 500px;
  padding: 10px 8px 14px 10px;
}

.knowledge-tree {
  background: transparent;
}

.knowledge-tree :deep(.el-tree-node__content) {
  height: auto;
  padding: 0;
  margin: 0 0 8px;
  border-radius: 14px;
}

.knowledge-tree :deep(.el-tree-node__content:hover),
.knowledge-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  background: #f3f0ff;
}

.knowledge-tree :deep(.el-tree-node__expand-icon) {
  color: #8e82db;
}

.tree-node {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
}

.tree-node__main {
  min-width: 0;
}

.tree-node__main strong {
  display: block;
  color: #2a2653;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.tree-node__meta {
  flex: 0 0 auto;
}

.content-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  background: linear-gradient(180deg, #fffdf9 0%, #ffffff 18%);
}

.panel-head--content {
  align-items: flex-start;
}

.panel-head--content > div:first-child {
  min-width: 0;
}

.panel-head--content > div:first-child > strong {
  font-size: 17px;
}

.panel-head--content > div:first-child > span {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0;
  margin-top: 7px;
}

.crumb-separator {
  display: inline-flex;
  align-items: center;
  margin: 0 6px;
  color: #c0c8d5;
}

.content-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.content-actions :deep(.el-button) {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid #7d70db;
  border-radius: 13px;
  background: linear-gradient(180deg, #ffffff 0%, #f4f1ff 100%);
  color: #6f63e8;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 14%);
}

.action-button--ghost {
  border-color: #7d70db;
  background: linear-gradient(180deg, #ffffff 0%, #f4f1ff 100%);
  color: #6f63e8;
}

.action-button--primary {
  border-color: #7d70db;
  background: linear-gradient(180deg, #8f7fe8 0%, #7666de 100%);
  color: #fff;
}

.action-button--favorite {
  border-color: #7d70db;
  background: linear-gradient(180deg, #fff7da 0%, #ffe08d 100%);
  color: #7f5b00;
}

.content-actions :deep(.el-button:hover),
.content-actions :deep(.el-button:focus-visible) {
  border-color: #7d70db;
  color: #6f63e8;
  background: linear-gradient(180deg, #ffffff 0%, #f4f1ff 100%);
  outline: none;
  transform: translateY(-1px);
}

.content-body {
  flex: 1;
  padding: 14px;
}

.content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 240px;
  gap: 14px;
  align-items: start;
}

.content-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.note-sidebar {
  min-width: 0;
}

.node-summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #dcd8ff;
  border-radius: 18px;
  background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
  position: relative;
  overflow: hidden;
}

.node-summary.tone-chapter {
  border-color: #d9d5ff;
  background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
}

.node-summary.tone-point {
  border-color: #d9d5ff;
  background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
}

.summary-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.section-head__title,
.summary-line {
  min-width: 0;
}

.section-head__title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.section-sticker {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  border: 1px solid var(--sticker-border, #d9d5ff);
  border-radius: 999px;
  background: var(--sticker-bg, #f4f1ff);
  color: var(--sticker-ink, #6f63e8);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.02em;
  box-shadow: 0 6px 14px rgb(111 96 214 / 10%);
  transform: rotate(-1deg);
}

.section-sticker .el-icon {
  font-size: 14px;
}

.section-sticker--summary {
  padding: 7px 12px;
}

.tone-chapter {
  --sticker-bg: #f1edff;
  --sticker-border: #d8d4ff;
  --sticker-ink: #6f63e8;
}

.tone-point {
  --sticker-bg: #f1edff;
  --sticker-border: #d8d4ff;
  --sticker-ink: #6f63e8;
}

.tone-compare {
  --sticker-bg: #f7f3ff;
  --sticker-border: #dbd5ff;
  --sticker-ink: #6b63c6;
}

.tone-note {
  --sticker-bg: #f7f3ff;
  --sticker-border: #dbd5ff;
  --sticker-ink: #6b63c6;
}

.node-status-note {
  color: #7d7aa2;
  font-size: 12px;
}

.progress-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.progress-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border: 1.5px solid #7d70db;
  border-radius: 13px;
  background: linear-gradient(180deg, #ffffff 0%, #f8f9ff 100%);
  color: #5f5b91;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  pointer-events: auto;
  position: relative;
  z-index: 1;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 12%);
}

.progress-tone-todo {
  border-color: #d8d4ff;
  background: linear-gradient(180deg, #fbfbff 0%, #ffffff 100%);
  color: #6f63e8;
}

.progress-tone-learning {
  border-color: #f2ddb1;
  background: linear-gradient(180deg, #fffaf0 0%, #ffffff 100%);
  color: #c98b12;
}

.progress-tone-done {
  border-color: #cbeed7;
  background: linear-gradient(180deg, #f4fff8 0%, #ffffff 100%);
  color: #2f9b67;
}

.progress-button:hover:not(:disabled),
.progress-button:focus-visible:not(:disabled) {
  box-shadow: 4px 5px 0 rgb(61 53 100 / 16%);
  outline: none;
  transform: translateY(-1px);
}

.progress-button.progress-tone-todo.active {
  border-color: #5d537f;
  background: linear-gradient(180deg, #8f7fe8 0%, #7666de 100%);
  color: #fff;
}

.progress-button.progress-tone-learning.active {
  border-color: #e09b24;
  background: linear-gradient(180deg, #ffbe43 0%, #f0a926 100%);
  color: #fff;
}

.progress-button.progress-tone-done.active {
  border-color: #2f9b67;
  background: linear-gradient(180deg, #38b977 0%, #2f9b67 100%);
  color: #fff;
}

.progress-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.child-card-panel,
.markdown-panel,
.compare-panel,
.note-panel {
  padding: 12px 14px;
  border: 1px solid #d9d5ff;
  border-radius: 18px;
  background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
}

.child-card-panel.tone-chapter,
.content-card-panel.tone-chapter {
  border-color: #d9d5ff;
  background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
}

.child-card-panel.tone-point,
.content-card-panel.tone-point {
  border-color: #d9d5ff;
  background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
}

.compare-panel.tone-compare {
  border-color: #f2d7a0;
  background: linear-gradient(180deg, #fffaf0 0%, #ffffff 100%);
}

.note-panel.tone-note {
  border-color: #d7e2ff;
  background: linear-gradient(180deg, #f7faff 0%, #ffffff 100%);
}

.note-panel--sticky {
  position: sticky;
  top: 14px;
}

.note-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border: 1px solid #e2defb;
  border-radius: 14px;
  background: #f8f6ff;
}

.note-meta span {
  color: #2a2653;
  font-size: 13px;
  font-weight: 700;
}

.note-meta small {
  color: #7d7aa2;
  font-size: 12px;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-head strong {
  color: #2a2653;
  font-size: 14px;
}

.section-head span {
  color: #7d7aa2;
  font-size: 12px;
}

.child-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.child-card {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 14px;
  border: 1px solid #dcd8ff;
  border-radius: 14px;
  background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.child-card:hover,
.child-card:focus-visible {
  border-color: #b9afff;
  background: #f6f3ff;
  box-shadow: 0 10px 18px rgb(111 96 214 / 10%);
  outline: none;
  transform: translateY(-1px);
}

.child-card__icon {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px;
  border: 1px solid rgba(111, 99, 232, 0.18);
  box-shadow: 0 8px 16px rgb(111 96 214 / 8%);
}

.child-card__icon .el-icon {
  font-size: 22px;
}

.tone-chapter {
  background: var(--sticker-bg, #ebe8ff);
  color: #6f63e8;
}

.tone-point {
  background: var(--sticker-bg, #ecfbf3);
  color: #23a66d;
}

.child-card__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.child-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.child-card__main strong {
  display: block;
  color: #2a2653;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.child-card__main p {
  margin: 0;
  color: #7d7aa2;
  font-size: 12px;
  line-height: 1.6;
}

.child-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.child-card__arrow {
  flex: 0 0 auto;
  align-self: center;
  color: #9c95cb;
}

.markdown-body {
  min-height: 220px;
}

.compare-panel {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 190px;
  min-height: 0;
}

.compare-list {
  display: grid;
  gap: 4px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1 1 auto;
}

.compare-item {
  width: 100%;
  padding: 4px 6px;
  border: 1px solid #dcd8ff;
  border-radius: 8px;
  background: linear-gradient(180deg, #faf8ff 0%, #ffffff 100%);
  cursor: pointer;
  text-align: left;
}

.compare-item:hover {
  border-color: #bdb3ff;
  background: #f7f4ff;
}

.compare-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.compare-item__head strong {
  color: #2a2653;
  font-size: 11px;
  line-height: 1.2;
}

.compare-item > p {
  margin: 2px 0 0;
  color: #6f6a8e;
  font-size: 10px;
  line-height: 1.25;
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.compare-markdown {
  min-height: 0;
}

.compare-markdown--detail {
  min-height: 0;
  margin-top: 10px;
}

.compare-panel :deep(.el-empty) {
  padding: 8px 0 4px;
}

.note-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.note-sidebar {
  display: grid;
  gap: 14px;
}

.section-head__tools {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.mini-action-button {
  min-height: 30px;
  padding: 0;
  color: #6f63e8;
  font-weight: 800;
}

.content-section-stack {
  display: grid;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 6px;
}

.content-section-card--body {
  padding: 14px 14px 12px;
}

.section-markdown__body {
  cursor: text;
}

.section-markdown__body :deep(p:last-child) {
  margin-bottom: 0;
}

.annotation-list {
  display: grid;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
  padding-right: 4px;
}

.annotation-item {
  display: flex;
  gap: 10px;
  padding: 9px 10px;
  border: 1px solid rgba(var(--annotation-rgb), 0.22);
  border-left: 4px solid rgb(var(--annotation-rgb));
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(var(--annotation-rgb), 0.06) 0%, #ffffff 100%);
  cursor: pointer;
}

.annotation-item__dot {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 999px;
  background: rgb(var(--annotation-rgb));
  box-shadow: 0 0 0 4px rgba(var(--annotation-rgb), 0.14);
  flex: 0 0 auto;
}

.annotation-item__main {
  min-width: 0;
  flex: 1;
}

.annotation-item__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.annotation-item__head strong {
  color: #2a2653;
  font-size: 12px;
  line-height: 1.4;
}

.annotation-item__main p,
.annotation-item__main small {
  display: block;
  margin: 6px 0 0;
  color: #6f6a8e;
  font-size: 11px;
  line-height: 1.6;
}

.annotation-highlight {
  position: relative;
  display: inline;
  padding: 0;
  background: transparent;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.annotation-highlight__text {
  position: relative;
  display: inline;
  padding: 0 1px 1px;
  background: transparent;
  border-bottom: 1px dashed rgba(var(--annotation-rgb), 0.7);
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.annotation-marker {
  position: absolute;
  top: -0.12em;
  right: -0.38em;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border: 1px solid rgba(var(--annotation-rgb), 0.46);
  border-radius: 3px;
  background: #fff;
  color: rgb(var(--annotation-rgb));
  cursor: pointer;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(var(--annotation-rgb), 0.08);
}

.selection-toolbar {
  position: fixed;
  z-index: 2200;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid #d9d5ff;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 18px 36px rgb(62 56 108 / 18%);
}

.selection-toolbar > span {
  color: #5d5a82;
  font-size: 12px;
  font-weight: 700;
}

.selection-toolbar__actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.annotation-compose {
  display: grid;
  gap: 12px;
}

.annotation-quote,
.annotation-detail__quote {
  padding: 12px 13px;
  border: 1px solid rgba(var(--annotation-rgb), 0.2);
  border-left: 4px solid rgb(var(--annotation-rgb));
  border-radius: 12px;
  background: rgba(var(--annotation-rgb), 0.07);
}

.annotation-quote span,
.annotation-detail__quote span {
  display: block;
  color: #7a7394;
  font-size: 12px;
  font-weight: 700;
}

.annotation-quote p,
.annotation-detail__quote p {
  margin: 6px 0 0;
  color: #2a2653;
  font-size: 13px;
  line-height: 1.65;
}

.annotation-color-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(var(--annotation-rgb), 0.24);
  border-radius: 999px;
  background: #fff;
  color: rgb(var(--annotation-rgb));
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.color-chip.active {
  background: rgba(var(--annotation-rgb), 0.11);
}

.annotation-detail {
  display: grid;
  gap: 14px;
}

.annotation-detail__note {
  margin: 0;
  color: #4a476d;
  font-size: 14px;
  line-height: 1.8;
}

.annotation-detail__meta {
  display: grid;
  gap: 6px;
  color: #7a7394;
  font-size: 12px;
}

.annotation-detail__actions {
  display: flex;
  gap: 10px;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  color: #2a2653;
}

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(blockquote),
.markdown-body :deep(pre) {
  margin-bottom: 12px;
}

.content-card-grid {
  display: grid;
  gap: 14px;
}

.content-section-card {
  padding: 14px;
  border: 1px solid #dcd8ff;
  border-radius: 16px;
  background: linear-gradient(180deg, #faf8ff 0%, #ffffff 100%);
}

.content-section-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.content-section-card__title {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.content-section-card__title strong {
  display: block;
  color: #2a2653;
  font-size: 15px;
  line-height: 1.5;
}

.content-section-card__title p {
  margin: 6px 0 0;
  color: #7d7aa2;
  font-size: 12px;
  line-height: 1.6;
}

.content-markdown {
  color: #43416d;
  line-height: 1.9;
}

.content-markdown :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 12px 0;
  border-radius: 8px;
}

.content-markdown :deep(p) {
  margin: 0 0 12px;
}

.content-markdown :deep(h1),
.content-markdown :deep(h2),
.content-markdown :deep(h3),
.content-markdown :deep(h4),
.content-markdown :deep(h5),
.content-markdown :deep(h6) {
  margin: 18px 0 12px;
  color: #2a2653;
}

.content-markdown :deep(strong) {
  color: #2a2653;
}

.content-markdown :deep(em) {
  color: #7d70db;
  font-style: italic;
}

.content-markdown :deep(blockquote) {
  margin: 12px 0;
  padding: 10px 14px;
  border-left: 4px solid #7d70db;
  border-radius: 6px;
  background: #f8f6ff;
  color: #5c5a81;
}

.content-markdown :deep(code) {
  padding: 0 4px;
  border-radius: 4px;
  background: #ece8ff;
  color: #8a5a00;
}

.content-markdown :deep(pre) {
  margin: 12px 0;
  padding: 14px;
  overflow: auto;
  border-radius: 8px;
  background: #0f172a;
}

.content-markdown--direct {
  flex: 1 1 auto;
  min-height: 0;
  padding: 2px 2px 0 2px;
  color: #2f3557;
  font-size: 15px;
  line-height: 1.9;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding-right: 10px;
}

.content-markdown--direct :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 12px 0;
  border-radius: 8px;
}

.content-markdown--direct :deep(h1),
.content-markdown--direct :deep(h2),
.content-markdown--direct :deep(h3),
.content-markdown--direct :deep(h4),
.content-markdown--direct :deep(h5),
.content-markdown--direct :deep(h6) {
  margin: 18px 0 12px;
  color: #1f2937;
}

.content-markdown--direct :deep(p),
.content-markdown--direct :deep(ul),
.content-markdown--direct :deep(ol),
.content-markdown--direct :deep(blockquote),
.content-markdown--direct :deep(pre) {
  margin-bottom: 12px;
}

@media (max-width: 1180px) {
  .knowledge-workspace {
    grid-template-columns: 1fr;
  }

  .content-layout {
    grid-template-columns: 1fr;
  }

  .compare-panel {
    max-height: 150px;
  }

  .note-panel--sticky {
    position: static;
  }

  .tree-body {
    min-height: 320px;
  }
}

@media (max-width: 780px) {
  .gov-knowledge-page {
    padding: 14px;
  }

  .gov-knowledge-shell {
    min-height: calc(100vh - 92px);
    padding: 22px 16px 18px;
  }

  .knowledge-header {
    flex-direction: column;
  }

  .header-badge {
    width: 100%;
  }

  .subject-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .search-bar {
    width: 100%;
  }

  .content-actions {
    justify-content: flex-start;
  }

  .progress-actions {
    flex-direction: column;
  }

  .progress-button {
    width: 100%;
  }

  .child-card-grid {
    grid-template-columns: 1fr;
  }
}

.content-card-panel {
  display: flex;
  flex-direction: column;
  height: 560px;
  min-height: 0;
  padding: 12px 14px;
  border: 1px solid #d9d5ff;
  border-radius: 18px;
  background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
  overflow: hidden;
}

.content-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.content-card {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 14px;
  border: 1px solid #dcd8ff;
  border-radius: 14px;
  background: linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.content-card:hover,
.content-card:focus-visible {
  border-color: #b9afff;
  background: #f6f3ff;
  box-shadow: 0 10px 18px rgb(111 96 214 / 10%);
  outline: none;
  transform: translateY(-1px);
}

.content-card__icon {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 12px;
  background: #ebe8ff;
  color: #6f63e8;
}

.content-card__icon .el-icon {
  font-size: 22px;
}

.content-card__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.content-card__main strong {
  display: block;
  color: #2a2653;
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
}

.content-card__main p {
  margin: 0;
  color: #7d7aa2;
  font-size: 12px;
  line-height: 1.6;
}

.content-card__action {
  color: #6f63e8;
  font-size: 12px;
  font-weight: 700;
}

.content-card__arrow {
  flex: 0 0 auto;
  align-self: center;
  color: #9c95cb;
}


@media (max-width: 1180px) {
  .knowledge-workspace {
    grid-template-columns: 1fr;
  }

  .content-layout {
    grid-template-columns: 1fr;
  }

  .note-panel--sticky {
    position: static;
  }

  .tree-body {
    min-height: 360px;
  }

  .content-card-panel {
    height: auto;
    overflow: visible;
  }

  .content-markdown--direct {
    flex: none;
    overflow-y: visible;
    padding-right: 0;
  }

  .content-card-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 780px) {
  .gov-knowledge-page {
    padding: 14px;
  }

  .gov-knowledge-shell {
    min-height: calc(100vh - 92px);
    padding: 22px 16px 18px;
  }

  .knowledge-header {
    flex-direction: column;
  }

  .header-badge {
    width: 100%;
  }

  .subject-panel {
    flex-direction: column;
    align-items: stretch;
  }

  .search-bar {
    width: 100%;
  }

  .content-actions {
    justify-content: flex-start;
  }

  .progress-actions {
    flex-direction: column;
  }

  .progress-button {
    width: 100%;
  }

  .child-card-grid,
  .content-card-grid {
    grid-template-columns: 1fr;
  }
}
.gov-knowledge-page {
  position: relative;
  min-height: 100vh;
  background:
    linear-gradient(180deg, #f4f1ff 0%, #fafbff 20%, #fdfdff 100%),
    linear-gradient(90deg, rgba(198, 191, 255, 0.18) 0%, transparent 30%, transparent 70%, rgba(174, 234, 244, 0.16) 100%);
}

.gov-knowledge-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(133, 120, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(133, 120, 255, 0.04) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.3;
}

.gov-knowledge-shell {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(125, 112, 219, 0.18);
  border-radius: 30px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 246, 255, 0.96) 46%, rgba(243, 250, 255, 0.96) 100%);
  box-shadow: 0 26px 60px rgba(93, 85, 152, 0.12);
}

.gov-knowledge-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(130, 116, 255, 0.06) 0%, transparent 30%, transparent 70%, rgba(104, 194, 210, 0.06) 100%);
}

.knowledge-header {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 22px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(125, 112, 219, 0.14);
}

.header-copy {
  max-width: 760px;
}

.eyebrow {
  margin: 0 0 12px;
  color: #7a79af;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.22em;
}

.header-copy h1 {
  margin: 0;
  color: #242845;
  font-size: clamp(40px, 4vw, 62px);
  line-height: 1.02;
  letter-spacing: 0;
}

.lead {
  margin: 14px 0 0;
  color: #6a7196;
  font-size: 16px;
  line-height: 1.75;
}

.header-stickers,
.header-stats,
.header-quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.header-stickers {
  margin-top: 18px;
}

.header-stats {
  margin-top: 16px;
}

.sticker-chip,
.stat-chip {
  border: 1px solid rgba(125, 112, 219, 0.18);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 242, 255, 0.95));
  box-shadow: 0 8px 18px rgba(110, 99, 188, 0.08);
}

.sticker-chip {
  padding: 9px 14px;
  color: #6f63e8;
  font-size: 13px;
  font-weight: 800;
}

.stat-chip {
  min-width: 112px;
  padding: 10px 14px;
}

.stat-chip span {
  color: #7a739c;
  font-size: 12px;
  font-weight: 700;
}

.stat-chip strong {
  display: block;
  margin-top: 4px;
  color: #242845;
  font-size: 18px;
  font-weight: 900;
}

.stat-chip--todo strong {
  color: #6f63e8;
}

.stat-chip--learning strong {
  color: #c98b12;
}

.stat-chip--done strong {
  color: #2f9b67;
}

.header-side {
  display: flex;
  min-width: 330px;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
}

.header-quick-links {
  justify-content: flex-end;
}

.action-button {
  min-height: 44px;
  padding: 0 18px;
  border: 1.5px solid rgba(120, 108, 236, 0.55);
  border-radius: 16px;
  box-shadow: 0 8px 0 rgba(120, 108, 236, 0.14);
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0;
}

.action-button :deep(.el-icon) {
  font-size: 15px;
}

.action-button--ghost {
  color: #6f63e8;
  background: linear-gradient(180deg, #ffffff 0%, #f5f2ff 100%);
}

.action-button--primary {
  color: #ffffff;
  background: linear-gradient(180deg, #9a8eff 0%, #6f63e8 100%);
}

.action-button--favorite {
  color: #815b00;
  background: linear-gradient(180deg, #fff7d9 0%, #ffe18c 100%);
}

.action-button:hover,
.action-button:focus-visible {
  transform: translateY(-1px);
}

.header-badge {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 1px solid rgba(125, 112, 219, 0.18);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(245, 242, 255, 0.96));
  box-shadow: 0 14px 32px rgba(93, 85, 152, 0.1);
}

.header-badge__icon {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border: 1px solid rgba(125, 112, 219, 0.16);
  border-radius: 16px;
  background: linear-gradient(180deg, #f3f0ff 0%, #e9e5ff 100%);
  color: #6f63e8;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.header-badge__icon :deep(.el-icon) {
  font-size: 24px;
}

.header-badge span {
  color: #7f7a9d;
  font-size: 12px;
  font-weight: 700;
}

.header-badge strong {
  display: block;
  margin-top: 4px;
  color: #242845;
  font-size: 18px;
  font-weight: 900;
}

.header-badge small {
  display: block;
  margin-top: 6px;
  color: #6f6a8e;
  font-size: 12px;
}

.subject-panel {
  padding: 18px 18px 14px;
  border: 1px solid rgba(125, 112, 219, 0.16);
  border-radius: 26px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 246, 255, 0.96));
  box-shadow: 0 16px 38px rgba(93, 85, 152, 0.08);
}

.topic-tabs,
.subject-tabs {
  margin-bottom: 10px;
}

.topic-tabs :deep(.el-tabs__header),
.subject-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.topic-tabs :deep(.el-tabs__nav-wrap)::after,
.subject-tabs :deep(.el-tabs__nav-wrap)::after {
  display: none;
}

.tab-chip {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 16px;
  border: 1px solid rgba(125, 112, 219, 0.18);
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff 0%, #f3f0ff 100%);
  color: #6d63e7;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 6px 14px rgba(110, 99, 188, 0.08);
}

.tab-chip--topic {
  background: linear-gradient(180deg, #8d84f7 0%, #6f63e8 100%);
  color: #fff;
}

.subject-tabs :deep(.el-tabs__item) {
  padding: 0;
  margin-right: 10px;
  height: auto;
  line-height: 1;
}

.subject-tabs :deep(.el-tabs__item.is-active) .tab-chip {
  background: linear-gradient(180deg, #8d84f7 0%, #6f63e8 100%);
  color: #fff;
}

.search-bar {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(125, 112, 219, 0.16);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(248, 246, 255, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.search-bar :deep(.el-input) {
  flex: 1;
}

.search-bar :deep(.el-input__wrapper) {
  min-height: 52px;
  border: 1px solid rgba(125, 112, 219, 0.22);
  border-radius: 18px;
  box-shadow: none;
  background: #fff;
}

.search-bar :deep(.el-input__inner) {
  color: #2f3358;
  font-size: 14px;
  font-weight: 700;
}

.search-refresh-button {
  min-width: 108px;
  min-height: 52px;
  border: 1px solid rgba(125, 112, 219, 0.48);
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f4f1ff 100%);
  color: #6f63e8;
  box-shadow: 0 8px 0 rgba(125, 112, 219, 0.12);
  font-weight: 800;
}

.search-refresh-button:hover,
.search-refresh-button:focus-visible {
  transform: translateY(-1px);
}

.knowledge-workspace {
  display: grid;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.tree-panel,
.content-panel {
  overflow: hidden;
  border: 1px solid rgba(125, 112, 219, 0.16);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(248, 246, 255, 0.95));
  box-shadow: 0 18px 42px rgba(93, 85, 152, 0.08);
}

.panel-head {
  padding: 18px 20px;
  border-bottom: 1px solid rgba(125, 112, 219, 0.14);
  background: linear-gradient(180deg, rgba(251, 250, 255, 0.98), rgba(245, 242, 255, 0.92));
}

.panel-head strong {
  color: #242845;
  font-size: 18px;
  font-weight: 900;
}

.panel-head span {
  color: #7d7aa2;
  font-size: 12px;
}

.panel-head--content {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.content-actions {
  gap: 10px;
}

.tree-body {
  padding: 14px 14px 16px;
}

.knowledge-tree {
  padding: 2px;
}

.knowledge-tree :deep(.el-tree-node__content) {
  min-height: 56px;
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 18px;
  background: linear-gradient(180deg, #faf8ff 0%, #ffffff 100%);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease, background 0.2s ease;
}

.knowledge-tree :deep(.el-tree-node__content:hover) {
  border-color: rgba(125, 112, 219, 0.22);
  background: linear-gradient(180deg, #f7f4ff 0%, #ffffff 100%);
  box-shadow: 0 10px 20px rgba(110, 99, 188, 0.08);
  transform: translateY(-1px);
}

.knowledge-tree :deep(.el-tree-node.is-current > .el-tree-node__content) {
  border-color: rgba(125, 112, 219, 0.32);
  background: linear-gradient(180deg, #efeaff 0%, #ffffff 100%);
  box-shadow: 0 12px 24px rgba(110, 99, 188, 0.12);
}

.tree-node__main strong {
  color: #242845;
  font-size: 14px;
  font-weight: 800;
}

.knowledge-tag {
  border-radius: 999px;
  font-weight: 700;
}

.content-panel {
  display: flex;
  flex-direction: column;
}

.content-body {
  padding: 16px;
}

.content-layout {
  gap: 16px;
}

.node-summary,
.content-card-panel,
.child-card-panel,
.compare-panel,
.note-panel {
  border: 1px solid rgba(125, 112, 219, 0.16);
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 246, 255, 0.96));
  box-shadow: 0 12px 30px rgba(93, 85, 152, 0.08);
}

.section-sticker {
  border-radius: 999px;
  box-shadow: 0 8px 18px rgba(110, 99, 188, 0.1);
}

.progress-button {
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid rgba(125, 112, 219, 0.24);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f4f1ff 100%);
  box-shadow: 0 8px 0 rgba(125, 112, 219, 0.12);
}

.progress-button.active {
  transform: translateY(-1px);
}

.content-preview-card,
.child-card,
.compare-item,
.note-meta,
.annotation-item,
.annotation-quote,
.annotation-detail__quote,
.selection-toolbar {
  border-radius: 18px;
}

.content-preview-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  padding: 16px;
  border: 1px solid rgba(125, 112, 219, 0.14);
  background: linear-gradient(180deg, #ffffff 0%, #faf8ff 100%);
}

.content-markdown--direct {
  flex: 1 1 auto;
  min-height: 0;
  color: #2f3557;
  font-size: 15px;
  line-height: 1.9;
  overflow-y: auto;
  scrollbar-gutter: stable;
  padding-right: 10px;
}

.content-markdown--direct :deep(h1),
.content-markdown--direct :deep(h2),
.content-markdown--direct :deep(h3),
.content-markdown--direct :deep(h4),
.content-markdown--direct :deep(h5),
.content-markdown--direct :deep(h6) {
  color: #242845;
}

.note-panel {
  padding: 16px;
}

.note-panel :deep(.el-textarea__inner) {
  min-height: 280px;
  border: 1px solid rgba(125, 112, 219, 0.2);
  border-radius: 18px;
  box-shadow: none;
  background: #fff;
}

.note-actions :deep(.el-button) {
  min-height: 42px;
  border-radius: 14px;
  font-weight: 800;
}

.compare-panel {
  padding: 14px;
}

.compare-item {
  padding: 10px 12px;
  border: 1px solid rgba(125, 112, 219, 0.16);
  background: linear-gradient(180deg, #faf8ff 0%, #ffffff 100%);
}

.compare-item:hover {
  border-color: rgba(125, 112, 219, 0.28);
  background: linear-gradient(180deg, #f7f4ff 0%, #ffffff 100%);
}

.annotation-item {
  border: 1px solid rgba(var(--annotation-rgb), 0.24);
}

.selection-toolbar {
  border: 1px solid rgba(125, 112, 219, 0.18);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 36px rgba(93, 85, 152, 0.16);
}

@media (max-width: 1180px) {
  .knowledge-header {
    flex-direction: column;
  }

  .header-side {
    width: 100%;
    min-width: 0;
  }

  .header-quick-links {
    justify-content: flex-start;
  }

  .knowledge-workspace,
  .content-layout {
    grid-template-columns: 1fr;
  }

  .note-panel--sticky {
    position: static;
  }
}

@media (max-width: 780px) {
  .gov-knowledge-shell {
    border-radius: 24px;
  }

  .knowledge-header {
    padding-bottom: 18px;
    margin-bottom: 16px;
  }

  .header-copy h1 {
    font-size: 36px;
  }

  .lead {
    font-size: 14px;
  }

  .header-quick-links,
  .content-actions,
  .progress-actions,
  .search-bar {
    flex-direction: column;
  }

  .search-refresh-button,
  .action-button,
  .progress-button {
    width: 100%;
  }

  .subject-panel,
  .tree-panel,
  .content-panel,
  .note-panel {
    border-radius: 22px;
  }
}
</style>

<style scoped>
.gov-knowledge-page {
  position: relative;
  min-height: 100%;
  padding: 28px;
  color: #26284a;
  background:
    radial-gradient(circle at 11% 12%, rgb(255 225 163 / 60%) 0 4%, transparent 5%),
    radial-gradient(circle at 86% 10%, rgb(176 205 255 / 54%) 0 4.5%, transparent 5.5%),
    radial-gradient(circle at 90% 82%, rgb(191 235 206 / 42%) 0 4.5%, transparent 5.5%),
    linear-gradient(180deg, #faf7ff 0%, #f5f7ff 100%);
}

.gov-knowledge-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(132, 120, 255, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(132, 120, 255, 0.045) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.28;
}

.gov-knowledge-shell {
  position: relative;
  width: min(1480px, 100%);
  min-height: calc(100vh - 112px);
  margin: 0 auto;
  padding: 26px 28px 24px;
  overflow: hidden;
  border: 2px solid rgba(125, 112, 219, 0.18);
  border-radius: 34px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 244, 255, 0.96) 100%);
  box-shadow: 0 14px 0 rgba(111, 99, 232, 0.08), 0 28px 48px rgba(77, 90, 160, 0.10);
}

.knowledge-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 22px;
  padding-bottom: 18px;
  margin-bottom: 18px;
  border-bottom: 1px dashed rgba(125, 112, 219, 0.18);
}

.header-copy {
  min-width: 0;
  max-width: 760px;
}

.back-button,
.action-button,
.search-refresh-button,
.tab-chip,
.sticker-chip,
.stat-chip,
.header-badge,
.section-sticker,
.progress-button,
.child-card,
.compare-item,
.annotation-item,
.color-chip,
.content-card {
  border-radius: 20px;
  border: 2px solid rgba(125, 112, 219, 0.16);
  box-shadow: 0 8px 0 rgba(90, 92, 150, 0.10), 0 18px 28px rgba(90, 92, 150, 0.08);
}

.back-button {
  background: linear-gradient(180deg, #ffffff 0%, #eef3ff 100%);
  color: #6f63e8;
}

.back-button:hover,
.back-button:focus-visible {
  transform: translateY(-2px);
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 0;
  color: #7f79a8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

h1,
.header-copy h1 {
  margin: 8px 0 0;
  color: #232647;
  font-size: clamp(38px, 4.6vw, 72px);
  line-height: 1.02;
  letter-spacing: 0;
}

.lead {
  max-width: 740px;
  margin: 12px 0 0;
  color: #6f7598;
  font-size: 16px;
  line-height: 1.7;
}

.header-stickers,
.header-stats,
.header-quick-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.header-stickers {
  margin-top: 16px;
}

.header-stats {
  margin-top: 14px;
}

.sticker-chip,
.stat-chip {
  background: linear-gradient(180deg, #f5f1ff 0%, #ffffff 100%);
}

.sticker-chip {
  min-height: 32px;
  padding: 0 14px;
  color: #6f63e8;
  font-size: 13px;
  font-weight: 800;
}

.stat-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 14px;
}

.stat-chip span {
  color: #7b7399;
  font-size: 12px;
  font-weight: 800;
}

.stat-chip strong {
  font-size: 16px;
  font-weight: 900;
}

.stat-chip--todo {
  background: linear-gradient(180deg, #f2edff 0%, #ffffff 100%);
  color: #6f63e8;
}

.stat-chip--learning {
  background: linear-gradient(180deg, #fff3d9 0%, #ffffff 100%);
  color: #c98b12;
}

.stat-chip--done {
  background: linear-gradient(180deg, #eaf9ef 0%, #ffffff 100%);
  color: #2f9b67;
}

.header-side {
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 0 0 360px;
  min-width: 320px;
}

.header-quick-links .action-button {
  flex: 1 1 0;
}

.action-button {
  min-height: 46px;
  padding: 0 18px;
  font-size: 14px;
  font-weight: 800;
}

.action-button--ghost {
  background: linear-gradient(180deg, #ffffff 0%, #f2f0ff 100%);
  color: #6f63e8;
}

.action-button--primary {
  background: linear-gradient(180deg, #8f86f6 0%, #6f63e8 100%);
  color: #fff;
}

.action-button--favorite {
  background: linear-gradient(180deg, #fff0b8 0%, #ffd66c 100%);
  color: #6d4b00;
}

.header-badge {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  border: 2px solid rgba(125, 112, 219, 0.14);
  border-radius: 26px;
  background: linear-gradient(180deg, #fbf8ff 0%, #ffffff 100%);
}

.header-badge__icon {
  display: grid;
  width: 56px;
  height: 56px;
  place-items: center;
  border: 2px solid rgba(255, 255, 255, 0.8);
  border-radius: 18px;
  background: linear-gradient(180deg, #90a8f8 0%, #6f63e8 100%);
  color: #fff;
}

.header-badge span {
  color: #7d789d;
  font-size: 12px;
  font-weight: 800;
}

.header-badge strong {
  display: block;
  margin-top: 4px;
  color: #232647;
  font-size: 18px;
  font-weight: 900;
}

.header-badge small {
  display: block;
  margin-top: 6px;
  color: #6f7598;
  font-size: 12px;
}

.subject-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
  padding: 16px;
  border: 2px solid rgba(125, 112, 219, 0.16);
  border-radius: 30px;
  background: linear-gradient(180deg, #fffefc 0%, #f7f4ff 100%);
  box-shadow: 0 12px 0 rgba(111, 99, 232, 0.06), 0 24px 36px rgba(90, 92, 150, 0.08);
}

.topic-tabs,
.subject-tabs {
  width: 100%;
}

.topic-tabs :deep(.el-tabs__header),
.subject-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.topic-tabs :deep(.el-tabs__nav-wrap)::after,
.subject-tabs :deep(.el-tabs__nav-wrap)::after {
  display: none;
}

.tab-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  padding: 0 16px;
  border: 2px solid rgba(125, 112, 219, 0.16);
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff 0%, #f4f1ff 100%);
  color: #6d63e7;
  font-size: 13px;
  font-weight: 800;
}

.tab-chip--topic,
.subject-tabs :deep(.el-tabs__item.is-active) .tab-chip,
.topic-tabs :deep(.el-tabs__item.is-active) .tab-chip--topic {
  background: linear-gradient(180deg, #8c84f7 0%, #6f63e8 100%);
  color: #fff;
}

.search-bar {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 14px;
  border: 2px solid rgba(125, 112, 219, 0.14);
  border-radius: 28px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow: 0 10px 0 rgba(111, 99, 232, 0.05), 0 18px 28px rgba(90, 92, 150, 0.06);
}

.search-bar :deep(.el-input__wrapper) {
  min-height: 54px;
  padding: 0 16px;
  border: 2px solid rgba(125, 112, 219, 0.16);
  border-radius: 20px;
  background: #fff;
  box-shadow: none;
}

.search-bar :deep(.el-input__wrapper.is-focus) {
  border-color: rgba(111, 99, 232, 0.35);
  box-shadow: 0 0 0 4px rgba(111, 99, 232, 0.10);
}

.search-refresh-button {
  min-width: 108px;
  min-height: 54px;
  border-color: rgba(125, 112, 219, 0.22);
  background: linear-gradient(180deg, #ffffff 0%, #f2efff 100%);
  color: #6f63e8;
}

.search-refresh-button:hover,
.search-refresh-button:focus-visible,
.action-button:hover,
.action-button:focus-visible,
.back-button:hover,
.back-button:focus-visible,
.progress-button:hover:not(:disabled),
.progress-button:focus-visible:not(:disabled),
.child-card:hover,
.child-card:focus-visible,
.compare-item:hover,
.compare-item:focus-visible {
  transform: translateY(-2px);
}

.knowledge-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 340px) minmax(0, 1fr);
  gap: 18px;
  margin-top: 16px;
  align-items: start;
}

.tree-panel,
.content-panel {
  min-width: 0;
  overflow: hidden;
  border: 2px solid rgba(125, 112, 219, 0.14);
  border-radius: 30px;
  background: linear-gradient(180deg, #ffffff 0%, #faf8ff 100%);
  box-shadow: 0 12px 0 rgba(111, 99, 232, 0.05), 0 24px 36px rgba(90, 92, 150, 0.08);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid rgba(125, 112, 219, 0.12);
  background: linear-gradient(180deg, #fdfbff 0%, #f5f1ff 100%);
}

.panel-head strong {
  display: block;
  color: #232647;
  font-size: 15px;
  font-weight: 900;
}

.panel-head span {
  display: block;
  margin-top: 4px;
  color: #7f7aa2;
  font-size: 12px;
}

.tree-body {
  min-height: 500px;
  padding: 14px;
}

.knowledge-tree :deep(.el-tree-node__content) {
  min-height: 58px;
  margin-bottom: 10px;
  padding: 0;
  border-radius: 18px;
  background: transparent;
}

.tree-node {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 2px solid rgba(125, 112, 219, 0.12);
  background: linear-gradient(180deg, #fbf7ff 0%, #ffffff 100%);
}

.knowledge-tree :deep(.el-tree-node__content:hover) .tree-node,
.knowledge-tree :deep(.el-tree-node.is-current > .el-tree-node__content) .tree-node {
  border-color: rgba(111, 99, 232, 0.24);
  background: linear-gradient(180deg, #f4f0ff 0%, #ffffff 100%);
}

.tree-node__main strong,
.content-card__main strong,
.child-card__head strong,
.compare-item__head strong,
.annotation-item__head strong {
  color: #232647;
  font-weight: 900;
}

.knowledge-tag.el-tag {
  height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  border-width: 1px;
  font-size: 12px;
  font-weight: 800;
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.10);
}

.knowledge-tag--chapter.el-tag,
.knowledge-tag--point.el-tag {
  border-color: #7d70db;
  background: linear-gradient(180deg, #f5f1ff 0%, #ffffff 100%);
  color: #6f63e8;
}

.content-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
}

.content-body {
  flex: 1;
  padding: 16px;
}

.content-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 16px;
  align-items: start;
}

.content-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.node-summary,
.content-card-panel,
.child-card-panel,
.compare-panel,
.note-panel {
  border: 2px solid rgba(125, 112, 219, 0.14);
  border-radius: 28px;
  background: linear-gradient(180deg, #ffffff 0%, #faf8ff 100%);
  box-shadow: 0 10px 0 rgba(111, 99, 232, 0.05), 0 22px 34px rgba(90, 92, 150, 0.08);
}

.node-summary {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px;
}

.section-sticker {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 2px solid rgba(125, 112, 219, 0.14);
  border-radius: 999px;
  background: linear-gradient(180deg, #f4efff 0%, #ffffff 100%);
  color: #6f63e8;
  font-size: 12px;
  font-weight: 900;
  transform: rotate(-2deg);
}

.progress-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.progress-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 14px;
  border: 2px solid rgba(125, 112, 219, 0.18);
  border-radius: 18px;
  background: linear-gradient(180deg, #ffffff 0%, #f4f1ff 100%);
  color: #5e5a8d;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 0 8px 0 rgba(90, 92, 150, 0.10);
}

.progress-tone-todo.active {
  border-color: #6f63e8;
  background: linear-gradient(180deg, #8f86f6 0%, #6f63e8 100%);
  color: #fff;
}

.progress-tone-learning.active {
  border-color: #e0a22f;
  background: linear-gradient(180deg, #ffcf61 0%, #f0a926 100%);
  color: #fff;
}

.progress-tone-done.active {
  border-color: #2f9b67;
  background: linear-gradient(180deg, #37bf7b 0%, #2f9b67 100%);
  color: #fff;
}

.content-preview-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  padding: 16px;
  border: 2px solid rgba(125, 112, 219, 0.14);
  border-radius: 26px;
  background: linear-gradient(180deg, #ffffff 0%, #fbf8ff 100%);
}

.content-markdown--direct {
  flex: 1 1 auto;
  min-height: 0;
  padding-right: 10px;
  color: #2f3557;
  font-size: 15px;
  line-height: 1.9;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.content-card-grid,
.child-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.child-card,
.content-card {
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 14px;
  border: 2px solid rgba(125, 112, 219, 0.14);
  text-align: left;
  cursor: pointer;
}

.child-card:nth-child(3n + 1),
.content-card:nth-child(3n + 1) {
  background: linear-gradient(180deg, #f6f0ff 0%, #ffffff 100%);
}

.child-card:nth-child(3n + 2),
.content-card:nth-child(3n + 2) {
  background: linear-gradient(180deg, #f1fbff 0%, #ffffff 100%);
}

.child-card:nth-child(3n + 3),
.content-card:nth-child(3n + 3) {
  background: linear-gradient(180deg, #fff7e9 0%, #ffffff 100%);
}

.child-card__icon,
.content-card__icon {
  display: grid;
  width: 50px;
  height: 50px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 16px;
  background: linear-gradient(180deg, #95aff8 0%, #6f63e8 100%);
  color: #fff;
}

.child-card__main,
.content-card__main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.child-card__head,
.content-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.child-card__main p,
.content-card__main p {
  margin: 0;
  color: #7d7aa2;
  font-size: 12px;
  line-height: 1.6;
}

.child-card__arrow,
.content-card__arrow {
  flex: 0 0 auto;
  align-self: center;
  color: #a39acc;
}

.compare-panel {
  padding: 14px;
}

.compare-item,
.annotation-item {
  padding: 12px 14px;
  border: 2px solid rgba(125, 112, 219, 0.14);
  background: linear-gradient(180deg, #faf7ff 0%, #ffffff 100%);
}

.compare-item:hover {
  border-color: rgba(111, 99, 232, 0.26);
  background: linear-gradient(180deg, #f4f0ff 0%, #ffffff 100%);
}

.note-sidebar {
  min-width: 0;
}

.note-panel {
  padding: 16px;
}

.note-panel--sticky {
  position: sticky;
  top: 16px;
}

.note-panel :deep(.el-textarea__inner) {
  min-height: 280px;
  border: 2px solid rgba(125, 112, 219, 0.16);
  border-radius: 20px;
  background: linear-gradient(180deg, #ffffff 0%, #faf8ff 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
}

.selection-toolbar {
  border: 2px solid rgba(125, 112, 219, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 16px 30px rgba(90, 92, 150, 0.14);
}

.annotation-dialog :deep(.el-dialog),
.annotation-detail-drawer :deep(.el-drawer__body) {
  background: linear-gradient(180deg, #ffffff 0%, #faf8ff 100%);
}

.annotation-highlight {
  border-radius: 999px;
  box-shadow: inset 0 -2px 0 rgb(var(--annotation-rgb) / 16%);
}

.annotation-marker {
  border-radius: 999px;
  background: linear-gradient(180deg, rgb(var(--annotation-rgb) / 18%) 0%, rgb(var(--annotation-rgb) / 26%) 100%);
}

@media (max-width: 1180px) {
  .knowledge-header {
    flex-direction: column;
  }

  .header-side {
    width: 100%;
    min-width: 0;
  }

  .header-quick-links {
    justify-content: flex-start;
  }

  .knowledge-workspace,
  .content-layout,
  .content-card-grid,
  .child-card-grid {
    grid-template-columns: 1fr;
  }

  .note-panel--sticky {
    position: static;
  }
}

@media (max-width: 780px) {
  .gov-knowledge-page {
    padding: 14px;
  }

  .gov-knowledge-shell {
    min-height: calc(100vh - 92px);
    padding: 20px 14px 16px;
    border-radius: 26px;
  }

  .header-copy h1 {
    font-size: 38px;
  }

  .search-bar,
  .header-quick-links,
  .content-actions,
  .progress-actions {
    flex-direction: column;
  }

  .search-refresh-button,
  .action-button,
  .progress-button {
    width: 100%;
  }
}
</style>
