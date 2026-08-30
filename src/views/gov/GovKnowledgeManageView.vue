<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, CirclePlus, Delete, EditPen, FolderOpened, RefreshRight, Search } from '@element-plus/icons-vue'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import 'katex/dist/katex.min.css'
import {
  createGovKnowledgeNode,
  deleteAdminGovKnowledgeCompare,
  deleteGovKnowledgeNode,
  getAdminGovKnowledgeCompare,
  getAdminGovKnowledgeNode,
  getAdminGovKnowledgeTree,
  saveAdminGovKnowledgeCompare,
  updateAdminGovKnowledgeCompare,
  updateGovKnowledgeNode,
} from '@/api/gov'

const router = useRouter()

const subjectTabs = [
  { label: '政治理论', value: '政治理论' },
  { label: '常识判断', value: '常识判断' },
  { label: '语言理解与表达', value: '语言理解与表达' },
  { label: '数量关系', value: '数量关系' },
  { label: '判断推理', value: '判断推理' },
  { label: '资料分析', value: '资料分析' },
]

const nodeTypeOptions = [
  { label: '章节', value: 'CHAPTER' },
  { label: '知识点', value: 'POINT' },
]

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

const treeRef = ref()
const formRef = ref()
const contentRef = ref()
const loading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const deleting = ref(false)
const activeSubject = ref(subjectTabs[0].value)
const keyword = ref('')
const treeData = ref([])
const currentNode = ref(null)
const selectedNodeId = ref(null)
const mode = ref('edit')
const draftSaving = ref(false)
const submitting = ref(false)
const hasLocalDraft = ref(false)
const compareLoading = ref(false)
const compareSaving = ref(false)
const compareDialogVisible = ref(false)
const compareDetailVisible = ref(false)
const compareMode = ref('create')
const currentCompare = ref([])
const currentCompareItem = ref(null)
const compareForm = reactive(defaultCompareForm())

const form = reactive(defaultForm())

const currentSubjectLabel = computed(() => subjectTabs.find((item) => item.value === activeSubject.value)?.label || activeSubject.value)
const currentNodePath = computed(() => findNodePath(treeData.value, selectedNodeId.value))
const selectedNodeIsPoint = computed(() => currentNode.value?.nodeType === 'POINT')
const parentOptions = computed(() => {
  const options = [{ label: '根节点', value: 0 }]
  walkTree(treeData.value, (node) => {
    if (node.nodeType === 'CHAPTER') {
      options.push({ label: node.title, value: node.id })
    }
  })
  return options
})
const previewEnabled = computed(() => Boolean(String(form.contentMd || '').trim()))
const hasCompareItems = computed(() => Array.isArray(currentCompare.value) && currentCompare.value.length > 0)

watch(activeSubject, async () => {
  resetCurrent()
  resetForm()
  await loadTree()
})

function defaultForm() {
  return {
    subject: activeSubject.value,
    nodeType: 'CHAPTER',
    parentId: 0,
    title: '',
    contentMd: '',
    sortOrder: 0,
    status: 1,
  }
}

function defaultCompareForm() {
  return {
    compareId: null,
    knowledgeId: null,
    title: '',
    contentMd: '',
    sortOrder: 0,
    status: 1,
  }
}

function resetForm() {
  Object.assign(form, defaultForm())
  formRef.value?.clearValidate?.()
}

function resetCurrent() {
  selectedNodeId.value = null
  currentNode.value = null
  currentCompare.value = []
  currentCompareItem.value = null
  compareDetailVisible.value = false
}

function fillForm(node) {
  Object.assign(form, {
    subject: node.subject,
    nodeType: node.nodeType,
    parentId: node.parentId || 0,
    title: node.title || '',
    contentMd: node.contentMd || '',
    sortOrder: node.sortOrder ?? 0,
    status: node.status ?? 1,
  })
}

function resetCompareForm() {
  Object.assign(compareForm, defaultCompareForm())
  compareMode.value = 'create'
}

function fillCompareForm(item) {
  Object.assign(compareForm, {
    compareId: item?.id || null,
    knowledgeId: item?.knowledgeId || selectedNodeId.value || null,
    title: item?.title || '',
    contentMd: item?.contentMd || '',
    sortOrder: item?.sortOrder ?? 0,
    status: item?.status ?? 1,
  })
}

function buildTextPreview(text, maxLength = 120) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function getComparePreview(item) {
  const text = String(item?.contentMd || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\s+/g, ' ')
  return buildTextPreview(text, 120) || '点击查看详情'
}

function walkTree(nodes, visitor) {
  nodes.forEach((node) => {
    visitor(node)
    if (Array.isArray(node.children) && node.children.length) {
      walkTree(node.children, visitor)
    }
  })
}

function findNodeById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    if (Array.isArray(node.children) && node.children.length) {
      const found = findNodeById(node.children, id)
      if (found) {
        return found
      }
    }
  }
  return null
}

function findNodePath(nodes, id, path = []) {
  if (!id) {
    return []
  }
  for (const node of nodes) {
    const nextPath = path.concat(node.title)
    if (node.id === id) {
      return nextPath
    }
    if (Array.isArray(node.children) && node.children.length) {
      const found = findNodePath(node.children, id, nextPath)
      if (found.length) {
        return found
      }
    }
  }
  return []
}

function getDraftKey() {
  if (typeof window === 'undefined') {
    return ''
  }
  if (mode.value === 'edit' && selectedNodeId.value) {
    return `edu-f:gov-knowledge-admin-draft:edit:${activeSubject.value}:${selectedNodeId.value}`
  }
  if (mode.value === 'create') {
    return `edu-f:gov-knowledge-admin-draft:create:${activeSubject.value}:${form.nodeType}:${form.parentId || 0}`
  }
  return ''
}

function readDraftPayload() {
  const key = getDraftKey()
  if (!key || typeof window === 'undefined') {
    return null
  }
  const raw = window.sessionStorage.getItem(key)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function refreshDraftState() {
  hasLocalDraft.value = Boolean(readDraftPayload())
}

function applyDraftPayload() {
  const draft = readDraftPayload()
  if (!draft?.form) {
    refreshDraftState()
    return false
  }
  Object.assign(form, draft.form)
  refreshDraftState()
  return true
}

function clearDraftPayload() {
  const key = getDraftKey()
  if (!key || typeof window === 'undefined') {
    return
  }
  window.sessionStorage.removeItem(key)
  refreshDraftState()
}

async function saveDraft() {
  const key = getDraftKey()
  if (!key || typeof window === 'undefined') {
    ElMessage.warning('请先选择节点或新建内容')
    return
  }
  draftSaving.value = true
  try {
    window.sessionStorage.setItem(key, JSON.stringify({
      form: { ...form },
      selectedNodeId: selectedNodeId.value,
      mode: mode.value,
      subject: activeSubject.value,
      savedAt: new Date().toISOString(),
    }))
    refreshDraftState()
    ElMessage.success('已暂存')
  } catch (error) {
    ElMessage.error(error?.message || '暂存失败')
  } finally {
    draftSaving.value = false
  }
}

async function loadCompareList(nodeId) {
  if (!nodeId) {
    currentCompare.value = []
    currentCompareItem.value = null
    compareDetailVisible.value = false
    return
  }
  compareLoading.value = true
  try {
    const list = await getAdminGovKnowledgeCompare(nodeId).catch(() => [])
    currentCompare.value = Array.isArray(list) ? list : []
  } catch {
    currentCompare.value = []
  } finally {
    compareLoading.value = false
  }
}

function goBack() {
  router.push('/main/admin')
}

function selectNode(node) {
  if (!node?.id) {
    return
  }
  loadNodeDetail(node.id)
}

async function loadNodeDetail(nodeId) {
  if (!nodeId) {
    return
  }

  detailLoading.value = true
  try {
    const [detail, compare] = await Promise.all([
      getAdminGovKnowledgeNode(nodeId),
      getAdminGovKnowledgeCompare(nodeId).catch(() => []),
    ])
    currentNode.value = detail || null
    selectedNodeId.value = nodeId
    mode.value = 'edit'
    if (detail) {
      fillForm(detail)
    }
    resetCompareForm()
    applyDraftPayload()
    currentCompare.value = Array.isArray(compare) ? compare : []
    currentCompareItem.value = null
    compareDetailVisible.value = false
    treeRef.value?.setCurrentKey?.(nodeId)
  } catch (error) {
    currentNode.value = null
    currentCompare.value = []
    currentCompareItem.value = null
    compareDetailVisible.value = false
    ElMessage.error(error?.message || '节点详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

async function loadTree(preferId = null) {
  loading.value = true
  try {
    const data = await getAdminGovKnowledgeTree(activeSubject.value, keyword.value.trim())
    treeData.value = Array.isArray(data) ? data : []
    if (!treeData.value.length) {
      resetCurrent()
      resetForm()
      resetCompareForm()
      return
    }

    const nextId =
      (preferId && findNodeById(treeData.value, preferId) && preferId)
      || (selectedNodeId.value && findNodeById(treeData.value, selectedNodeId.value) && selectedNodeId.value)
      || treeData.value[0]?.id

    if (nextId) {
      treeRef.value?.setCurrentKey?.(nextId)
      await loadNodeDetail(nextId)
    }
  } catch (error) {
    treeData.value = []
    resetCurrent()
    resetForm()
    resetCompareForm()
    ElMessage.error(error?.message || '知识树加载失败')
  } finally {
    loading.value = false
  }
}

function startCreateChapter() {
  mode.value = 'create'
  resetCurrent()
  resetForm()
  resetCompareForm()
  form.subject = activeSubject.value
  form.nodeType = 'CHAPTER'
  form.parentId = 0
  form.status = 1
  form.sortOrder = nextSortOrder(0)
  applyDraftPayload()
}

function startCreatePoint() {
  if (!currentNode.value) {
    ElMessage.warning('请先选中一个章节')
    return
  }
  const chapter = currentNode.value.nodeType === 'CHAPTER' ? currentNode.value : findNodeById(treeData.value, currentNode.value.parentId)
  if (!chapter) {
    ElMessage.warning('当前节点不是章节，不能新增知识点')
    return
  }
  mode.value = 'create'
  resetCurrent()
  resetForm()
  resetCompareForm()
  form.subject = chapter.subject
  form.nodeType = 'POINT'
  form.parentId = chapter.id
  form.status = 1
  form.sortOrder = nextSortOrder(chapter.id)
  applyDraftPayload()
}

function startEditCurrent() {
  if (!currentNode.value) {
    ElMessage.warning('请先选择一个节点')
    return
  }
  mode.value = 'edit'
  fillForm(currentNode.value)
  applyDraftPayload()
}

function startCreateCompare() {
  if (!selectedNodeIsPoint.value) {
    ElMessage.warning('请先选中一个知识点')
    return
  }
  compareMode.value = 'create'
  fillCompareForm({
    knowledgeId: selectedNodeId.value,
    sortOrder: currentCompare.value.length,
    status: 1,
  })
  compareDialogVisible.value = true
}

function openCompareDetail(item) {
  currentCompareItem.value = item || null
  compareDetailVisible.value = Boolean(item)
}

function editCompare(item) {
  if (!item) {
    return
  }
  compareMode.value = 'edit'
  fillCompareForm(item)
  compareDialogVisible.value = true
}

async function saveCompare() {
  if (!selectedNodeIsPoint.value || compareSaving.value) {
    return
  }
  if (!String(compareForm.title || '').trim() || !String(compareForm.contentMd || '').trim()) {
    ElMessage.warning('请填写标题和内容')
    return
  }

  compareSaving.value = true
  try {
    const isEdit = compareMode.value === 'edit' && compareForm.compareId
    const payload = {
      title: compareForm.title.trim(),
      contentMd: compareForm.contentMd.trim(),
      sortOrder: Number(compareForm.sortOrder || 0),
      status: Number(compareForm.status ?? 1),
    }
    await (isEdit
      ? updateAdminGovKnowledgeCompare(compareForm.compareId, payload)
      : saveAdminGovKnowledgeCompare(selectedNodeId.value, payload))
    compareDialogVisible.value = false
    resetCompareForm()
    await loadCompareList(selectedNodeId.value)
    ElMessage.success(isEdit ? '辨析已更新' : '辨析已保存')
  } catch (error) {
    ElMessage.error(error?.message || '保存失败')
  } finally {
    compareSaving.value = false
  }
}

async function removeCompare(item) {
  if (!item?.id) {
    return
  }
  try {
    await ElMessageBox.confirm('确定删除这条辨析吗？', '删除辨析', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteAdminGovKnowledgeCompare(item.id)
    await loadCompareList(selectedNodeId.value)
    if (currentCompareItem.value?.id === item.id) {
      compareDetailVisible.value = false
      currentCompareItem.value = null
    }
    ElMessage.success('辨析已删除')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

function nextSortOrder(parentId) {
  const sameLevel = []
  walkTree(treeData.value, (node) => {
    if (Number(node.parentId || 0) === Number(parentId || 0)) {
      sameLevel.push(Number(node.sortOrder || 0))
    }
  })
  return (sameLevel.length ? Math.max(...sameLevel) : -1) + 1
}

async function submitForm() {
  const valid = await formRef.value?.validate?.().catch(() => false)
  if (!valid) {
    return
  }

  const payload = {
    subject: form.subject,
    nodeType: form.nodeType,
    parentId: form.nodeType === 'CHAPTER' ? 0 : form.parentId,
    title: form.title.trim(),
    contentMd: form.nodeType === 'POINT' ? form.contentMd.trim() : String(form.contentMd || '').trim() || null,
    sortOrder: Number(form.sortOrder || 0),
    status: Number(form.status ?? 1),
  }

  submitting.value = true
  try {
    const result = mode.value === 'create'
      ? await createGovKnowledgeNode(payload)
      : await updateGovKnowledgeNode(selectedNodeId.value, payload)
    const id = result?.id || result?.data?.id || selectedNodeId.value
    clearDraftPayload()
    ElMessage.success(mode.value === 'create' ? '提交成功' : '提交成功')
    await loadTree(id)
    mode.value = 'edit'
  } catch (error) {
    ElMessage.error(error?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

async function removeCurrent() {
  if (!currentNode.value) {
    ElMessage.warning('请先选择一个节点')
    return
  }

  try {
    await ElMessageBox.confirm('确认删除这个节点及其子节点吗？', '删除确认', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  deleting.value = true
  try {
    await deleteGovKnowledgeNode(selectedNodeId.value)
    clearDraftPayload()
    ElMessage.success('删除成功')
    await loadTree()
  } catch (error) {
    ElMessage.error(error?.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  loadTree()
  refreshDraftState()
})
</script>

<template>
  <main class="gov-knowledge-manage-page">
    <section class="gov-knowledge-shell">
      <header class="hero">
        <div class="hero-copy">
          <button class="back-button" type="button" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            <span>返回后台</span>
          </button>
          <p class="eyebrow">GOV KNOWLEDGE ADMIN</p>
          <h1>考公知识库</h1>
          <p class="lead">维护行测六科的章节树、正文内容、排序与启停状态。</p>
        </div>
        <div class="hero-badge">
          <el-icon><FolderOpened /></el-icon>
          <div>
            <span>当前科目</span>
            <strong>{{ currentSubjectLabel }}</strong>
          </div>
        </div>
      </header>

      <section class="toolbar-shell">
        <div class="subject-strip">
          <el-segmented v-model="activeSubject" class="subject-tabs" :options="subjectTabs" />
        </div>
        <div class="search-shell">
          <el-input v-model="keyword" clearable placeholder="按标题或正文搜索知识点" @keyup.enter="loadTree()" />
          <el-button :icon="Search" type="primary" @click="loadTree()">搜索</el-button>
          <el-button :icon="RefreshRight" plain @click="loadTree()">刷新</el-button>
        </div>
      </section>

      <section class="workspace">
        <aside class="tree-card">
          <header class="card-head">
            <div>
              <strong>知识树</strong>
              <span>先选章节，再新增知识点</span>
            </div>
            <div class="card-actions">
              <el-button :icon="CirclePlus" type="primary" @click="startCreateChapter">新增章节</el-button>
              <el-button :icon="FolderOpened" type="warning" :disabled="!currentNode" @click="startCreatePoint">新增知识点</el-button>
            </div>
          </header>
          <div v-loading="loading" class="tree-body">
            <el-tree
              ref="treeRef"
              :data="treeData"
              node-key="id"
              :default-expand-all="true"
              :highlight-current="true"
              :props="{ children: 'children', label: 'title' }"
              class="tree-view"
              @node-click="selectNode"
            >
              <template #default="{ data }">
                <div class="tree-node">
                  <div class="tree-node__main">
                    <strong>{{ data.title }}</strong>
                    <div class="tree-node__meta">
                      <el-tag size="small" effect="plain">{{ data.nodeType === 'CHAPTER' ? '章节' : '知识点' }}</el-tag>
                      <el-tag size="small" :type="data.status === 1 ? 'success' : 'info'" effect="plain">
                        {{ data.status === 1 ? '启用' : '停用' }}
                      </el-tag>
                    </div>
                  </div>
                  <el-icon class="tree-node__arrow"><ArrowRight /></el-icon>
                </div>
              </template>
            </el-tree>
          </div>
        </aside>

        <section class="editor-card">
          <header class="card-head card-head--editor">
            <div>
              <strong>{{ mode === 'create' ? '新建 / 编辑' : '节点详情' }}</strong>
              <span v-if="currentNodePath.length">{{ currentNodePath.join(' / ') }}</span>
            </div>
            <div class="card-actions">
              <el-button :icon="EditPen" :disabled="!currentNode" plain @click="startEditCurrent">编辑当前</el-button>
              <el-button plain :loading="draftSaving" @click="saveDraft">暂存</el-button>
              <el-button type="primary" :loading="submitting" @click="submitForm">提交</el-button>
              <el-button :icon="Delete" :disabled="!currentNode" type="danger" :loading="deleting" @click="removeCurrent">删除</el-button>
            </div>
          </header>

          <div class="editor-body">
            <section class="form-card">
              <header class="section-title">
                <span>基础信息</span>
                <small>科目、类型、状态和排序</small>
              </header>
              <el-form ref="formRef" :model="form" label-width="88px">
                <el-row :gutter="14" class="base-info-grid">
                  <el-col :span="12">
                    <el-form-item label="科目" prop="subject">
                      <el-select v-model="form.subject" :disabled="mode === 'edit'" class="full-control">
                        <el-option v-for="item in subjectTabs" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="类型" prop="nodeType">
                      <el-select v-model="form.nodeType" :disabled="mode === 'edit'" class="full-control">
                        <el-option v-for="item in nodeTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="父节点" prop="parentId">
                      <el-select v-model="form.parentId" :disabled="mode === 'edit' || form.nodeType === 'CHAPTER'" class="full-control">
                        <el-option v-for="item in parentOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="12">
                    <el-form-item label="状态" prop="status">
                      <el-select v-model="form.status" class="full-control">
                        <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
                      </el-select>
                    </el-form-item>
                  </el-col>
                  <el-col :span="16">
                    <el-form-item label="标题" prop="title">
                      <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="请输入标题" />
                    </el-form-item>
                  </el-col>
                  <el-col :span="8">
                    <el-form-item label="排序" prop="sortOrder">
                      <el-input-number v-model="form.sortOrder" :min="0" controls-position="right" class="full-control" />
                    </el-form-item>
                  </el-col>
                </el-row>
              </el-form>
            </section>

            <section class="preview-card preview-card--stacked">
              <header class="section-title">
                <span>内容预览</span>
                <small>{{ previewEnabled ? '实时渲染结果' : '暂无内容' }}</small>
              </header>
              <div v-if="previewEnabled" class="markdown-preview">
                <MarkdownRenderer :markdown="form.contentMd" :enable-latex="true" :enable-shiki="true" />
              </div>
              <el-empty v-else description="输入正文后可预览" />
            </section>

            <section class="form-card form-card--large">
              <header class="section-title">
                <span>正文内容</span>
                <small>支持 Markdown + LaTeX</small>
              </header>
              <el-input
                ref="contentRef"
                v-model="form.contentMd"
                type="textarea"
                :rows="10"
                maxlength="50000"
                show-word-limit
                placeholder="Markdown + LaTeX 正文"
                @paste="handleContentPaste"
              />
            </section>

            <section class="form-card compare-card">
              <header class="section-title">
                <span>易混辨析</span>
                <small>
                  <template v-if="selectedNodeIsPoint">
                    {{ hasCompareItems ? `${currentCompare.length} 条内容` : '一条一条维护，点击查看详情' }}
                  </template>
                  <template v-else>请先选中一个知识点</template>
                </small>
              </header>
              <div class="compare-toolbar">
                <el-button type="primary" :disabled="!selectedNodeIsPoint" @click="startCreateCompare">新增辨析</el-button>
              </div>
              <div v-loading="compareLoading" class="compare-list">
                <template v-if="selectedNodeIsPoint && hasCompareItems">
                  <button
                    v-for="item in currentCompare"
                    :key="item.id"
                    type="button"
                    class="compare-item"
                    @click="openCompareDetail(item)"
                  >
                    <div class="compare-item__head">
                      <strong>{{ item.title }}</strong>
                      <el-tag size="small" :type="item.status === 1 ? 'success' : 'info'" effect="plain">
                        {{ item.status === 1 ? '启用' : '停用' }}
                      </el-tag>
                    </div>
                    <p>{{ getComparePreview(item) }}</p>
                    <div class="compare-item__foot">
                      <span>排序 {{ item.sortOrder ?? 0 }}</span>
                      <div class="compare-item__actions">
                        <el-button size="small" text type="primary" @click.stop="editCompare(item)">编</el-button>
                        <el-button size="small" text type="danger" @click.stop="removeCompare(item)">删</el-button>
                      </div>
                    </div>
                  </button>
                </template>
                <el-empty v-else :description="selectedNodeIsPoint ? '当前知识点暂无辨析内容' : '请选择一个知识点后维护辨析内容'" />
              </div>
            </section>
          </div>
        </section>
      </section>
    </section>

    <el-dialog
      v-model="compareDialogVisible"
      :title="compareMode === 'edit' ? '编辑辨析' : '新增辨析'"
      width="560px"
      @closed="resetCompareForm"
    >
      <div class="compare-compose">
        <el-input v-model="compareForm.title" maxlength="200" show-word-limit placeholder="请输入辨析标题" />
        <el-input
          v-model="compareForm.contentMd"
          :rows="8"
          type="textarea"
          maxlength="50000"
          show-word-limit
          placeholder="Markdown + LaTeX 内容"
        />
        <div class="compare-compose__row">
          <el-input-number v-model="compareForm.sortOrder" :min="0" controls-position="right" />
          <el-select v-model="compareForm.status" class="compare-status">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="compareDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="compareSaving" @click="saveCompare">保存</el-button>
      </template>
    </el-dialog>

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
        <div class="annotation-detail__meta">
          <span>排序：{{ currentCompareItem.sortOrder ?? 0 }}</span>
          <span>状态：{{ currentCompareItem.status === 1 ? '启用' : '停用' }}</span>
        </div>
        <div class="markdown-body compare-markdown compare-markdown--detail">
          <MarkdownRenderer :markdown="currentCompareItem.contentMd" :enable-latex="true" :enable-shiki="true" />
        </div>
      </div>
    </el-drawer>
  </main>
</template>

<style scoped>
.gov-knowledge-manage-page {
  --gov-primary: #786ce8;
  --gov-primary-deep: #6354d8;
  --gov-primary-soft: #f1efff;
  --gov-border: #cfc7f8;
  --gov-ink: #2e314e;
  --gov-subtle: #747996;
  --gov-shadow: rgb(87 79 155 / 18%);

  min-height: 100%;
  padding: 24px;
  box-sizing: border-box;
  overflow-y: auto;
  background:
    linear-gradient(90deg, rgb(120 108 232 / 8%) 1px, transparent 1px),
    linear-gradient(rgb(120 108 232 / 8%) 1px, transparent 1px),
    linear-gradient(180deg, #fffeff 0%, #f7f6ef 100%);
  background-size: 48px 48px, 48px 48px, auto;
}

.gov-knowledge-shell {
  width: min(1500px, 100%);
  min-height: calc(100vh - 120px);
  margin: 0 auto;
  padding: 24px;
  box-sizing: border-box;
  border: 2px solid var(--gov-border);
  border-radius: 20px;
  background: rgb(255 255 255 / 95%);
  box-shadow: 0 18px 0 rgb(103 94 186 / 8%), 0 22px 46px rgb(76 83 130 / 10%);
}

.hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.hero-copy {
  min-width: 0;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: var(--gov-subtle);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0;
}

.back-button:hover,
.back-button:focus-visible {
  color: var(--gov-primary-deep);
  outline: none;
}

.eyebrow {
  margin: 8px 0 0;
  color: var(--gov-primary);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
}

h1 {
  margin: 8px 0 0;
  color: var(--gov-ink);
  font-size: 34px;
  line-height: 1.1;
}

.lead {
  margin: 8px 0 0;
  color: var(--gov-subtle);
  font-size: 14px;
}

.hero-badge {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 240px;
  padding: 12px 16px;
  border: 2px solid #d8d1fa;
  border-radius: 16px;
  background: linear-gradient(180deg, #fffdf7 0%, #f7f3ff 100%);
  box-shadow: 0 10px 22px rgb(102 111 144 / 8%);
}

.hero-badge .el-icon {
  font-size: 22px;
  color: #5a6885;
}

.hero-badge span,
.hero-badge strong {
  display: block;
}

.hero-badge span {
  color: #7f8799;
  font-size: 11px;
  font-weight: 800;
}

.hero-badge strong {
  margin-top: 3px;
  color: #2b3348;
  font-size: 17px;
}

.toolbar-shell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-top: 14px;
  padding: 12px;
  border: 2px solid var(--gov-primary-deep);
  border-radius: 16px;
  background: linear-gradient(180deg, #fffdfa 0%, #ffffff 100%);
  box-shadow: 6px 6px 0 rgb(103 94 186 / 10%);
}

.subject-strip {
  flex: 1;
  min-width: 0;
}

.subject-tabs :deep(.el-segmented) {
  width: 100%;
}

.search-shell {
  display: flex;
  width: min(520px, 100%);
  gap: 10px;
}

.search-shell :deep(.el-input) {
  flex: 1;
}

.workspace {
  display: grid;
  grid-template-columns: 348px minmax(0, 1fr);
  gap: 14px;
  margin-top: 18px;
  min-height: 0;
}

.tree-card,
.editor-card {
  border: 2px solid var(--gov-primary-deep);
  border-radius: 16px;
  background: linear-gradient(180deg, #fff 0%, #fffdfc 100%);
  box-shadow: 6px 6px 0 rgb(103 94 186 / 12%);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 12px;
  border-bottom: 1px dashed rgb(114 102 193 / 22%);
}

.card-head strong {
  display: block;
  color: #2c2d48;
  font-size: 17px;
}

.card-head span {
  display: block;
  margin-top: 4px;
  color: #8a8fb0;
  font-size: 11px;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.tree-body {
  min-height: 520px;
  padding: 10px 10px 14px;
}

.tree-view :deep(.el-tree-node__content) {
  height: auto;
  padding: 2px 0;
}

.tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
}

.tree-node:hover {
  background: rgb(123 111 227 / 8%);
  border-color: rgb(123 111 227 / 14%);
}

.tree-node__main {
  min-width: 0;
}

.tree-node__main strong {
  display: block;
  color: #2e3050;
  font-size: 12.5px;
  line-height: 1.35;
}

.tree-node__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.tree-node__arrow {
  color: #a2abbb;
  flex: 0 0 auto;
}

.editor-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card-head--editor > div:first-child {
  min-width: 0;
}

.editor-body {
  display: grid;
  gap: 10px;
  padding: 8px 10px 10px;
}

.form-card,
.preview-card {
  padding: 10px 12px 12px;
  border: 1px solid #e0dcfb;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #fcfbff 100%);
}

.form-card--large {
  background: linear-gradient(180deg, #ffffff 0%, #fcfcff 100%);
}

.section-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.section-title span {
  color: #2c2d48;
  font-size: 13px;
  font-weight: 800;
}

.section-title small {
  color: #9096ae;
  font-size: 11px;
}

.full-control {
  width: 100%;
}

.preview-card {
  min-width: 0;
}

.markdown-preview {
  min-height: 92px;
}

.base-info-grid :deep(.el-form-item) {
  margin-bottom: 6px;
}

.base-info-grid :deep(.el-form-item__label) {
  padding-right: 10px;
}

.preview-card--stacked {
  min-height: 84px;
  max-height: 216px;
  padding: 8px 10px 10px;
}

.preview-card--stacked .markdown-preview {
  min-height: 0;
  max-height: 126px;
  overflow: auto;
  font-size: 11px;
  line-height: 1.34;
}

.preview-card--stacked .markdown-preview :deep(h1) {
  margin: 0 0 3px;
  font-size: 17px;
  line-height: 1.15;
}

.preview-card--stacked .markdown-preview :deep(h2),
.preview-card--stacked .markdown-preview :deep(h3),
.preview-card--stacked .markdown-preview :deep(h4),
.preview-card--stacked .markdown-preview :deep(h5),
.preview-card--stacked .markdown-preview :deep(h6) {
  margin: 4px 0 2px;
  line-height: 1.18;
}

.preview-card--stacked .markdown-preview :deep(p) {
  margin: 3px 0;
  line-height: 1.34;
}

.preview-card--stacked .markdown-preview :deep(ul),
.preview-card--stacked .markdown-preview :deep(ol) {
  margin: 3px 0 3px 16px;
  padding-left: 16px;
}

.preview-card--stacked .markdown-preview :deep(li) {
  margin: 1px 0;
  line-height: 1.34;
}

.preview-card--stacked .markdown-preview :deep(p:first-child),
.preview-card--stacked .markdown-preview :deep(h1:first-child),
.preview-card--stacked .markdown-preview :deep(h2:first-child),
.preview-card--stacked .markdown-preview :deep(h3:first-child),
.preview-card--stacked .markdown-preview :deep(h4:first-child),
.preview-card--stacked .markdown-preview :deep(h5:first-child),
.preview-card--stacked .markdown-preview :deep(h6:first-child),
.preview-card--stacked .markdown-preview :deep(ul:first-child),
.preview-card--stacked .markdown-preview :deep(ol:first-child) {
  margin-top: 0;
}

.preview-card--stacked .markdown-preview :deep(p:last-child),
.preview-card--stacked .markdown-preview :deep(h1:last-child),
.preview-card--stacked .markdown-preview :deep(h2:last-child),
.preview-card--stacked .markdown-preview :deep(h3:last-child),
.preview-card--stacked .markdown-preview :deep(h4:last-child),
.preview-card--stacked .markdown-preview :deep(h5:last-child),
.preview-card--stacked .markdown-preview :deep(h6:last-child),
.preview-card--stacked .markdown-preview :deep(ul:last-child),
.preview-card--stacked .markdown-preview :deep(ol:last-child) {
  margin-bottom: 0;
}

.compare-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 170px;
}

.compare-toolbar {
  display: flex;
  justify-content: flex-start;
  flex: 0 0 auto;
}

.compare-list {
  display: grid;
  gap: 3px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  flex: 1 1 auto;
}

.compare-item {
  width: 100%;
  padding: 2px 4px;
  border: 1px solid #dcd8ff;
  border-radius: 6px;
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
  gap: 4px;
}

.compare-item__head strong {
  color: #2a2653;
  font-size: 9px;
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compare-item > p {
  margin: 1px 0 0;
  color: #6f6a8e;
  font-size: 9px;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.compare-item__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-top: 1px;
  color: #8984ab;
  font-size: 8px;
}

.compare-item__actions {
  display: inline-flex;
  gap: 1px;
}

.compare-compose {
  display: grid;
  gap: 10px;
}

.compare-compose__row {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 10px;
}

.compare-status {
  width: 100%;
}

.compare-markdown--detail {
  min-height: 0;
  margin-top: 10px;
}

.compare-card :deep(.el-empty) {
  padding: 6px 0 2px;
}

.compare-card :deep(.el-button--primary) {
  min-height: 26px;
  padding: 0 8px;
}

.compare-card :deep(.el-button--small.is-text) {
  padding: 0 2px;
}

.annotation-detail {
  display: grid;
  gap: 12px;
}

.annotation-detail__quote {
  padding: 12px 13px;
  border: 1px solid rgba(111, 96, 214, 0.18);
  border-left: 4px solid rgb(111, 96, 214);
  border-radius: 12px;
  background: rgba(111, 96, 214, 0.06);
}

.annotation-detail__quote span {
  display: block;
  color: #7a7394;
  font-size: 12px;
  font-weight: 700;
}

.annotation-detail__quote p {
  margin: 6px 0 0;
  color: #2a2653;
  font-size: 13px;
  line-height: 1.65;
}

.annotation-detail__meta {
  display: grid;
  gap: 6px;
  color: #7a7394;
  font-size: 12px;
}

.tree-card :deep(.el-button),
.editor-card :deep(.el-button) {
  border-radius: 10px;
  box-shadow: none;
  min-height: 36px;
  padding: 0 14px;
}

.tree-card :deep(.el-button--primary) {
  --el-button-bg-color: var(--gov-primary);
  --el-button-border-color: var(--gov-primary);
  --el-button-hover-bg-color: var(--gov-primary-deep);
  --el-button-hover-border-color: var(--gov-primary-deep);
}

.tree-card :deep(.el-button--warning) {
  --el-button-bg-color: #f7b52e;
  --el-button-border-color: #f7b52e;
  --el-button-hover-bg-color: #f2a902;
  --el-button-hover-border-color: #f2a902;
}

.editor-card :deep(.el-button--primary) {
  --el-button-bg-color: var(--gov-primary);
  --el-button-border-color: var(--gov-primary);
  --el-button-hover-bg-color: var(--gov-primary-deep);
  --el-button-hover-border-color: var(--gov-primary-deep);
}

.editor-card :deep(.el-button--danger) {
  --el-button-bg-color: #f0717f;
  --el-button-border-color: #f0717f;
  --el-button-hover-bg-color: #ea5e6e;
  --el-button-hover-border-color: #ea5e6e;
}

.gov-knowledge-manage-page :deep(.el-button--primary) {
  --el-button-bg-color: var(--gov-primary);
  --el-button-border-color: var(--gov-primary);
  --el-button-hover-bg-color: var(--gov-primary-deep);
  --el-button-hover-border-color: var(--gov-primary-deep);
  --el-button-active-bg-color: var(--gov-primary-deep);
  --el-button-active-border-color: var(--gov-primary-deep);
}

.gov-knowledge-manage-page :deep(.el-segmented) {
  --el-color-primary: var(--gov-primary);
  --el-segmented-item-selected-bg-color: var(--gov-primary);
  --el-segmented-item-selected-text-color: #ffffff;
  --el-segmented-item-selected-border-color: var(--gov-primary);
}

.editor-card :deep(.el-input__wrapper),
.editor-card :deep(.el-textarea__inner),
.editor-card :deep(.el-select__wrapper),
.editor-card :deep(.el-input-number__wrapper),
.tree-card :deep(.el-segmented__item),
.toolbar-shell :deep(.el-input__wrapper) {
  border-radius: 12px;
}

@media (max-width: 1240px) {
  .workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  .hero,
  .toolbar-shell {
    flex-direction: column;
    align-items: stretch;
  }

  .search-shell {
    width: 100%;
  }

  .compare-compose__row {
    grid-template-columns: 1fr;
  }

  .compare-card {
    max-height: none;
  }

  .compare-list {
    max-height: 150px;
  }
}

@media (max-width: 780px) {
  .gov-knowledge-manage-page {
    padding: 14px;
  }

  .gov-knowledge-shell {
    padding: 18px 14px;
  }

  h1 {
    font-size: 30px;
  }
}
</style>

