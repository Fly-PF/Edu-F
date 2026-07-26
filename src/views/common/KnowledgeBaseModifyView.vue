<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, genFileId } from 'element-plus'
import { ArrowLeft, Delete, Edit, Files, Plus, PictureFilled, Refresh, Search, UploadFilled, View } from '@element-plus/icons-vue'
import { deleteRagDocument, getMyKnowledgeBase, pageKnowledgeBaseDocuments, updateKnowledgeBase, updateRagDocument, uploadRagFile } from '@/api/rag'

const route = useRoute()
const router = useRouter()

const formRef = ref(null)
const isEditing = ref(false)
const coverPreviewUrl = ref('')
const coverPreviewObjectUrl = ref('')
const coverFile = ref(null)
const submitting = ref(false)
const uploadDialogVisible = ref(false)
const uploadSubmitting = ref(false)
const uploadFile = ref(null)
const uploadRef = ref(null)
const documentEditDialogVisible = ref(false)
const documentEditSubmitting = ref(false)
const editingDocument = ref(null)
const documentDeletingId = ref(null)
const loading = ref(false)
const docLoading = ref(false)
const kbId = Number(route.query.kb_id)
const documentTotal = ref(0)
const documentRecords = ref([])
const snapshot = ref({
  kb_name: '',
  description: '',
  kb_type: 1,
  is_public: 0,
  status: 1,
  coverPreviewUrl: '',
})

const form = reactive({
  kb_name: '',
  description: '',
  kb_type: 1,
  is_public: 0,
  status: 1,
})

const documentQuery = reactive({
  pageNum: 1,
  pageSize: 10,
  doc_type: '',
  doc_name: '',
})

const uploadForm = reactive({
  description: '',
})

const documentEditForm = reactive({
  doc_name: '',
  description: '',
})

const rules = {
  kb_name: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }],
  kb_type: [{ required: true, message: '请选择知识库类型', trigger: 'change' }],
  is_public: [{ required: true, message: '请选择公开状态', trigger: 'change' }],
}

const kbTypeOptions = [
  { label: '其他', value: 1 },
  { label: '课程', value: 2 },
  { label: '教材', value: 3 },
  { label: '政策', value: 4 },
]

const documentTypeOptions = [
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.md',
  '.ppt',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]

const uploadAccept = documentTypeOptions.join(',')

function backToKnowledgeBaseMy() {
  router.replace('/main/knowledge-qa/my')
}

const groupedDocuments = computed(() => {
  const groups = new Map()

  documentRecords.value.forEach((item) => {
    const docType = item.docType || '未分类'
    if (!groups.has(docType)) {
      groups.set(docType, [])
    }
    groups.get(docType).push(item)
  })

  return Array.from(groups.entries()).map(([docType, items]) => ({
    docType,
    title: formatDocumentType(docType),
    count: items.length,
    items,
  }))
})

function coverUrl(objectName) {
  if (!objectName) {
    return ''
  }

  return `http://localhost:8080/api/rag/kb/cover?objectName=${encodeURIComponent(objectName)}`
}

function formatDocumentType(docType) {
  if (!docType) {
    return '未分类'
  }

  return `${String(docType).replace(/^\./, '').toUpperCase()} 类型`
}

function formatDocumentFilterLabel(docType) {
  if (!docType) {
    return ''
  }

  return String(docType).replace(/^\./, '').toLowerCase()
}

function formatDateTime(value) {
  return value ? String(value).replace('T', ' ') : '-'
}

function getDocumentExtension(row) {
  return row?.docType || ''
}

function getDocumentBaseName(row) {
  const docName = row?.docName || ''
  const extension = getDocumentExtension(row)
  return extension && docName.toLowerCase().endsWith(extension.toLowerCase())
    ? docName.slice(0, -extension.length)
    : docName
}

function buildDocumentParams() {
  const params = {
    kb_id: kbId,
    pageNum: documentQuery.pageNum,
    pageSize: documentQuery.pageSize,
  }

  const docName = documentQuery.doc_name.trim()
  if (docName) {
    params.doc_name = docName
  }

  if (documentQuery.doc_type) {
    params.doc_type = documentQuery.doc_type
  }

  return params
}

function revokeCoverPreview() {
  if (coverPreviewObjectUrl.value) {
    URL.revokeObjectURL(coverPreviewObjectUrl.value)
    coverPreviewObjectUrl.value = ''
  }
}

function initCoverPreview(src) {
  revokeCoverPreview()
  coverFile.value = null
  coverPreviewUrl.value = src || ''
  coverPreviewObjectUrl.value = ''
}

function captureSnapshot() {
  snapshot.value = {
    kb_name: form.kb_name,
    description: form.description,
    kb_type: form.kb_type,
    is_public: form.is_public,
    status: form.status,
    coverPreviewUrl: coverPreviewUrl.value,
  }
}

function restoreSnapshot() {
  const current = snapshot.value
  revokeCoverPreview()
  Object.assign(form, {
    kb_name: current.kb_name,
    description: current.description,
    kb_type: current.kb_type,
    is_public: current.is_public,
    status: current.status,
  })
  coverFile.value = null
  coverPreviewUrl.value = current.coverPreviewUrl
  coverPreviewObjectUrl.value = ''
  formRef.value?.clearValidate()
}

function applyKnowledgeBase(data) {
  form.kb_name = data?.kbName || ''
  form.description = data?.description || ''
  form.kb_type = data?.kbType || 1
  form.is_public = data?.publicFlag ?? 0
  form.status = data?.status ?? 1
  initCoverPreview(coverUrl(data?.kbCover))
  captureSnapshot()
  isEditing.value = false
  formRef.value?.clearValidate()
}

function handleCoverChange(uploadFile) {
  const rawFile = uploadFile.raw
  if (!rawFile) {
    return
  }

  revokeCoverPreview()
  coverFile.value = rawFile
  coverPreviewObjectUrl.value = URL.createObjectURL(rawFile)
  coverPreviewUrl.value = coverPreviewObjectUrl.value
}

async function loadKnowledgeBase(options = {}) {
  const { backOnError = true } = options

  if (!Number.isInteger(kbId) || kbId <= 0) {
    ElMessage.error('知识库参数错误')
    if (backOnError) {
      backToKnowledgeBaseMy()
    }
    return
  }

  loading.value = true
  try {
    const data = await getMyKnowledgeBase(kbId)
    applyKnowledgeBase(data)
    await loadDocuments()
  } catch (error) {
    ElMessage.error(error?.message || '知识库加载失败')
    if (backOnError) {
      backToKnowledgeBaseMy()
    }
  } finally {
    loading.value = false
  }
}

async function loadDocuments() {
  if (!Number.isInteger(kbId) || kbId <= 0) {
    documentRecords.value = []
    documentTotal.value = 0
    return
  }

  docLoading.value = true
  try {
    const data = await pageKnowledgeBaseDocuments(buildDocumentParams())
    documentRecords.value = data?.records || []
    documentTotal.value = data?.total || 0
  } catch (error) {
    documentRecords.value = []
    documentTotal.value = 0
    ElMessage.error(error?.message || '文件列表加载失败')
  } finally {
    docLoading.value = false
  }
}

function handleEdit() {
  isEditing.value = true
}

function handleCancel() {
  restoreSnapshot()
  isEditing.value = false
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid || !Number.isInteger(kbId) || kbId <= 0) {
    return
  }

  submitting.value = true
  try {
    const data = new FormData()
    data.append('kb_id', String(kbId))
    data.append('kb_name', form.kb_name)
    data.append('description', form.description || '')
    data.append('kb_type', String(form.kb_type))
    data.append('is_public', String(form.is_public))
    data.append('status', String(form.status))
    if (coverFile.value) {
      data.append('kb_cover', coverFile.value)
    }

    await updateKnowledgeBase(data)
    ElMessage.success('更新成功')
    await loadKnowledgeBase({ backOnError: false })
  } catch (error) {
    ElMessage.error(error?.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

function handleDocumentSearch() {
  documentQuery.pageNum = 1
  loadDocuments()
}

function handleDocumentReset() {
  documentQuery.pageNum = 1
  documentQuery.pageSize = 10
  documentQuery.doc_type = ''
  documentQuery.doc_name = ''
  loadDocuments()
}

function openUploadDialog() {
  uploadDialogVisible.value = true
  uploadFile.value = null
  uploadForm.description = ''
  uploadRef.value?.clearFiles()
}

function handleUploadChange(file) {
  uploadFile.value = file.raw || null
}

function handleUploadExceed(files) {
  const file = files[0]
  if (!file) {
    return
  }

  uploadRef.value?.clearFiles()
  file.uid = genFileId()
  uploadRef.value?.handleStart(file)
  uploadFile.value = file
}

function handleUploadRemove() {
  uploadFile.value = null
}

async function handleUploadSubmit() {
  if (!Number.isInteger(kbId) || kbId <= 0) {
    ElMessage.error('知识库参数错误')
    return
  }

  if (!uploadFile.value) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  uploadSubmitting.value = true
  try {
    const data = new FormData()
    data.append('kbId', String(kbId))
    data.append('file', uploadFile.value)
    if (uploadForm.description.trim()) {
      data.append('description', uploadForm.description.trim())
    }

    await uploadRagFile(data)
    ElMessage.success('上传成功')
    uploadDialogVisible.value = false
    uploadRef.value?.clearFiles()
    uploadFile.value = null
    uploadForm.description = ''
    documentQuery.pageNum = 1
    await loadDocuments()
  } catch (error) {
    ElMessage.error(error?.message || '上传失败')
  } finally {
    uploadSubmitting.value = false
  }
}

function handleDocumentSizeChange(size) {
  documentQuery.pageSize = size
  documentQuery.pageNum = 1
  loadDocuments()
}

function handleDocumentCurrentChange(page) {
  documentQuery.pageNum = page
  loadDocuments()
}

function handleViewDocument(row) {
  if (!row?.fileUrl) {
    ElMessage.warning('文件地址缺失，暂时无法预览')
    return
  }

  router.push({
    name: 'knowledge-base-file-show',
    query: {
      kb_id: kbId,
      file_url: row.fileUrl,
      file_name: row.docName,
      doc_type: row.docType,
    },
  })
}

function handleEditDocument(row) {
  if (!row?.id) {
    ElMessage.warning('文件ID缺失，暂时无法编辑')
    return
  }

  editingDocument.value = row
  documentEditForm.doc_name = getDocumentBaseName(row)
  documentEditForm.description = row.description || ''
  documentEditDialogVisible.value = true
}

async function handleDocumentEditSubmit() {
  const baseName = documentEditForm.doc_name.trim()
  const extension = getDocumentExtension(editingDocument.value)
  if (!baseName) {
    ElMessage.warning('请输入文件名称')
    return
  }

  documentEditSubmitting.value = true
  try {
    const data = new FormData()
    data.append('kb_id', String(kbId))
    data.append('doc_id', String(editingDocument.value.id))
    data.append('doc_name', `${baseName}${extension}`)
    if (documentEditForm.description.trim()) {
      data.append('description', documentEditForm.description.trim())
    }

    await updateRagDocument(data)
    ElMessage.success('更新成功')
    documentEditDialogVisible.value = false
    editingDocument.value = null
    await loadDocuments()
  } catch (error) {
    ElMessage.error(error?.message || '更新失败')
  } finally {
    documentEditSubmitting.value = false
  }
}

async function handleDeleteDocument(row) {
  if (!row?.id) {
    ElMessage.warning('文件ID缺失，暂时无法删除')
    return
  }

  try {
    await ElMessageBox.confirm(`确认删除文件“${row.docName || '-'}”吗？`, '删除文件', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }

  documentDeletingId.value = row.id
  try {
    const data = new FormData()
    data.append('kb_id', String(kbId))
    data.append('doc_id', String(row.id))
    await deleteRagDocument(data)
    ElMessage.success('删除成功')
    if (documentRecords.value.length === 1 && documentQuery.pageNum > 1) {
      documentQuery.pageNum -= 1
    }
    await loadDocuments()
  } catch (error) {
    ElMessage.error(error?.message || '删除失败')
  } finally {
    documentDeletingId.value = null
  }
}

function handleBack() {
  backToKnowledgeBaseMy()
}

onMounted(loadKnowledgeBase)
onBeforeUnmount(revokeCoverPreview)
</script>

<template>
  <div v-loading="loading" class="create-page">
    <div class="create-panel">
      <div class="page-head">
        <el-button class="back-btn" :icon="ArrowLeft" text @click="handleBack">返回</el-button>
        <div class="head-title">
          <h2>修改知识库</h2>
          <span>更新知识库基础信息</span>
        </div>
      </div>

      <div class="editor-shell">
        <div class="cover-pane">
          <div class="cover-field">
            <div class="cover-head">
              <div class="cover-label">封面图</div>
              <el-upload
                action="#"
                accept="image/*"
                :disabled="!isEditing || submitting"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleCoverChange"
              >
                <el-button class="cover-btn" :icon="Plus" :disabled="!isEditing || submitting">更换</el-button>
              </el-upload>
            </div>

            <el-image
              v-if="coverPreviewUrl"
              class="cover-preview"
              :src="coverPreviewUrl"
              fit="contain"
              :preview-src-list="[coverPreviewUrl]"
              :initial-index="0"
              preview-teleported
            />

            <div v-else class="cover-empty">
              <el-icon><PictureFilled /></el-icon>
            </div>
          </div>
        </div>

        <el-form ref="formRef" class="create-form" :model="form" :rules="rules" label-position="top">
          <el-form-item label="知识库名称" prop="kb_name">
            <el-input v-model="form.kb_name" :disabled="!isEditing || submitting" maxlength="200" show-word-limit placeholder="请输入知识库名称" />
          </el-form-item>

          <el-form-item label="知识库类型" prop="kb_type">
            <el-select v-model="form.kb_type" class="full-control" :disabled="!isEditing || submitting" placeholder="请选择知识库类型">
              <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>

          <div class="split-row">
            <el-form-item label="公开状态" prop="is_public">
              <el-radio-group v-model="form.is_public" :disabled="!isEditing || submitting">
                <el-radio-button :value="0">私有</el-radio-button>
                <el-radio-button :value="1">平台公开</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="启用状态" prop="status">
              <el-radio-group v-model="form.status" :disabled="!isEditing || submitting">
                <el-radio-button :value="1">启用</el-radio-button>
                <el-radio-button :value="0">停用</el-radio-button>
              </el-radio-group>
            </el-form-item>
          </div>

          <el-form-item label="库说明">
            <el-input v-model="form.description" :disabled="!isEditing || submitting" type="textarea" :rows="6" resize="none" placeholder="请输入库说明" />
          </el-form-item>

          <div class="form-actions">
            <template v-if="!isEditing">
              <el-button type="primary" :disabled="loading || submitting" @click="handleEdit">编辑</el-button>
            </template>
            <template v-else>
              <el-button :disabled="submitting" @click="handleCancel">取消</el-button>
              <el-button type="primary" :loading="submitting" @click="handleSubmit">完成</el-button>
            </template>
          </div>
        </el-form>
      </div>

      <div class="document-section">
        <div class="document-head">
          <div class="document-title">
            <el-icon><Files /></el-icon>
            <span>知识库文件</span>
          </div>
          <div class="document-head-actions">
            <div class="document-subtitle">按文件类型分组展示</div>
          </div>
        </div>

        <div class="document-toolbar">
          <el-input
            v-model="documentQuery.doc_name"
            class="doc-search"
            clearable
            placeholder="按文件名模糊搜索"
            @keyup.enter="handleDocumentSearch"
          />
          <el-select
            v-model="documentQuery.doc_type"
            class="doc-select"
            clearable
            placeholder="文件类型"
            @change="handleDocumentSearch"
          >
            <el-option
              v-for="item in documentTypeOptions"
              :key="item"
              :label="formatDocumentFilterLabel(item)"
              :value="item"
            />
          </el-select>
          <el-button type="primary" :icon="Search" :loading="docLoading" @click="handleDocumentSearch">搜索</el-button>
          <el-button :icon="Refresh" :disabled="docLoading" @click="handleDocumentReset">重置</el-button>
          <el-button class="doc-upload-btn" type="primary" :icon="UploadFilled" :disabled="loading || uploadSubmitting" @click="openUploadDialog">上传文件解析</el-button>
        </div>

        <div v-loading="docLoading" class="document-content">
          <template v-if="groupedDocuments.length">
            <section v-for="group in groupedDocuments" :key="group.docType" class="document-group">
              <div class="group-head">
                <div class="group-name">{{ group.title }}</div>
                <div class="group-count">{{ group.count }} 个文件</div>
              </div>
              <el-table :data="group.items" border class="document-table">
                <el-table-column prop="docName" label="文件名称" min-width="180" show-overflow-tooltip />
                <el-table-column prop="docType" label="类型" width="120" align="center">
                  <template #default="{ row }">
                    <el-tag type="info" effect="light">{{ formatDocumentType(row.docType) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="description" label="说明" min-width="180" show-overflow-tooltip />
                <el-table-column prop="createTime" label="创建时间" min-width="170" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ formatDateTime(row.createTime) }}
                  </template>
                </el-table-column>
                <el-table-column prop="updateTime" label="更新时间" min-width="170" show-overflow-tooltip>
                  <template #default="{ row }">
                    {{ formatDateTime(row.updateTime) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="240" align="center" fixed="right">
                  <template #default="{ row }">
                    <div class="document-actions">
                      <el-button link type="primary" :icon="View" @click="handleViewDocument(row)">查看</el-button>
                      <el-button link type="primary" :icon="Edit" @click="handleEditDocument(row)">编辑</el-button>
                      <el-button link type="danger" :icon="Delete" :loading="documentDeletingId === row.id" :disabled="documentDeletingId !== null" @click="handleDeleteDocument(row)">删除</el-button>
                    </div>
                  </template>
                </el-table-column>
              </el-table>
            </section>
          </template>
          <el-empty v-else class="document-empty" description="暂无文件数据" />
        </div>

        <div v-if="documentTotal > 0" class="document-pagination">
          <el-pagination
            v-model:current-page="documentQuery.pageNum"
            v-model:page-size="documentQuery.pageSize"
            :page-sizes="[5, 10, 20]"
            :total="documentTotal"
            layout="total, sizes, prev, pager, next, jumper"
            background
            :disabled="docLoading"
            @size-change="handleDocumentSizeChange"
            @current-change="handleDocumentCurrentChange"
          />
        </div>
      </div>

      <el-dialog
        v-model="uploadDialogVisible"
        title="上传知识库文件"
        width="520px"
        :close-on-click-modal="!uploadSubmitting"
        :close-on-press-escape="!uploadSubmitting"
        :show-close="!uploadSubmitting"
      >
        <div class="upload-dialog-body" v-loading="uploadSubmitting" element-loading-text="文件上传中，请稍候">
          <div class="upload-kb-card">
            <div class="upload-kb-label">当前知识库</div>
            <div class="upload-kb-name">{{ form.kb_name || '未命名知识库' }}</div>
            <div class="upload-kb-tip">支持 jpg、jpeg、png、webp、pdf、ppt、pptx、txt、md、docx、doc 格式</div>
          </div>

          <el-form label-position="top">
            <el-form-item label="文件" required>
              <el-upload
                ref="uploadRef"
                class="file-upload-control"
                action="#"
                drag
                :accept="uploadAccept"
                :auto-upload="false"
                :limit="1"
                :disabled="uploadSubmitting"
                :on-change="handleUploadChange"
                :on-exceed="handleUploadExceed"
                :on-remove="handleUploadRemove"
              >
                <el-icon class="upload-icon"><UploadFilled /></el-icon>
                <div class="upload-text">拖拽文件到这里，或点击选择文件</div>
              </el-upload>
            </el-form-item>

            <el-form-item label="文件说明">
              <el-input
                v-model="uploadForm.description"
                type="textarea"
                :rows="4"
                maxlength="500"
                show-word-limit
                resize="none"
                :disabled="uploadSubmitting"
                placeholder="可填写文件用途、内容范围等说明"
              />
            </el-form-item>
          </el-form>
        </div>

        <template #footer>
          <el-button :disabled="uploadSubmitting" @click="uploadDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="uploadSubmitting" @click="handleUploadSubmit">上传</el-button>
        </template>
      </el-dialog>

      <el-dialog
        v-model="documentEditDialogVisible"
        title="编辑文件信息"
        width="520px"
        :close-on-click-modal="!documentEditSubmitting"
        :close-on-press-escape="!documentEditSubmitting"
        :show-close="!documentEditSubmitting"
      >
        <div class="upload-dialog-body" v-loading="documentEditSubmitting" element-loading-text="文件信息更新中，请稍候">
          <div class="upload-kb-card">
            <div class="upload-kb-label">当前知识库</div>
            <div class="upload-kb-name">{{ form.kb_name || '未命名知识库' }}</div>
            <div class="upload-kb-tip">文件后缀 {{ getDocumentExtension(editingDocument) || '-' }} 不允许修改</div>
          </div>

          <el-form label-position="top">
            <el-form-item label="文件名称" required>
              <el-input
                v-model="documentEditForm.doc_name"
                maxlength="180"
                show-word-limit
                :disabled="documentEditSubmitting"
                placeholder="请输入文件名称"
              >
                <template #append>{{ getDocumentExtension(editingDocument) }}</template>
              </el-input>
            </el-form-item>

            <el-form-item label="文件描述">
              <el-input
                v-model="documentEditForm.description"
                type="textarea"
                :rows="4"
                maxlength="500"
                show-word-limit
                resize="none"
                :disabled="documentEditSubmitting"
                placeholder="可填写文件用途、内容范围等说明"
              />
            </el-form-item>
          </el-form>
        </div>

        <template #footer>
          <el-button :disabled="documentEditSubmitting" @click="documentEditDialogVisible = false">取消</el-button>
          <el-button type="primary" :loading="documentEditSubmitting" @click="handleDocumentEditSubmit">保存</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 30px 24px 46px;
  background: linear-gradient(180deg, #f3f7fc 0%, #f8fafc 46%, #ffffff 100%);
}

.create-panel {
  width: min(1240px, 100%);
  margin: 0 auto;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  padding: 28px 28px 24px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.page-head {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid #eef2f7;
}

.back-btn {
  flex: 0 0 auto;
  color: #475569;
}

.head-title {
  min-width: 0;
}

.head-title h2 {
  margin: 0;
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
  letter-spacing: 0;
}

.head-title span {
  display: block;
  margin-top: 5px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.4;
}

.editor-shell {
  display: grid;
  grid-template-columns: 284px minmax(0, 1fr);
  gap: 30px;
  align-items: start;
}

.document-section {
  margin-top: 24px;
  padding-top: 22px;
  border-top: 1px solid #eef2f7;
}

.document-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.document-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
}

.document-subtitle {
  color: #64748b;
  font-size: 13px;
  line-height: 32px;
  white-space: nowrap;
}

.document-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
  flex-wrap: nowrap;
}

.document-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.doc-search {
  width: 260px;
}

.doc-select {
  width: 180px;
}

.doc-upload-btn {
  margin-left: auto;
}

.document-content {
  display: grid;
  gap: 16px;
  min-height: 180px;
}

.document-group {
  padding: 14px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #ffffff;
}

.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.group-name {
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.group-count {
  color: #64748b;
  font-size: 12px;
}

.document-empty {
  padding: 32px 0;
}

.document-actions {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.document-actions :deep(.el-button) {
  margin-left: 0;
}

.document-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.upload-dialog-body {
  display: grid;
  gap: 18px;
}

.upload-kb-card {
  padding: 14px 16px;
  border: 1px solid #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
}

.upload-kb-label {
  color: #64748b;
  font-size: 12px;
}

.upload-kb-name {
  overflow: hidden;
  margin-top: 4px;
  color: #0f172a;
  font-size: 16px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-kb-tip {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.file-upload-control {
  width: 100%;
}

.file-upload-control :deep(.el-upload),
.file-upload-control :deep(.el-upload-dragger) {
  width: 100%;
}

.upload-icon {
  color: #409eff;
  font-size: 30px;
}

.upload-text {
  margin-top: 8px;
  color: #475569;
  font-size: 14px;
}

.cover-pane {
  display: grid;
  align-content: start;
  padding-right: 30px;
  border-right: 1px solid #eef2f7;
}

.cover-label {
  color: #334155;
  font-size: 14px;
  font-weight: 700;
}

.create-form {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.cover-field {
  display: grid;
  gap: 14px;
}

.cover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.cover-preview,
.cover-empty {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
}

.cover-preview {
  display: block;
  overflow: hidden;
  border: 1px solid #dbeafe;
  background: #f8fafc;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  cursor: zoom-in;
}

.cover-preview :deep(.el-image__inner) {
  object-fit: contain;
}

.cover-empty {
  display: grid;
  place-items: center;
  border: 1px dashed #cbd5e1;
  background: #f8fafc;
  color: #94a3b8;
  font-size: 28px;
}

.split-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.full-control {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 6px;
  padding-top: 18px;
  border-top: 1px solid #eef2f7;
}

.create-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.create-form :deep(.el-form-item__label) {
  padding-bottom: 9px;
  color: #334155;
  font-weight: 600;
  line-height: 1.2;
}

.create-form :deep(.el-input__wrapper),
.create-form :deep(.el-select__wrapper),
.create-form :deep(.el-textarea__inner) {
  border-radius: 6px;
  box-shadow: 0 0 0 1px #dbe3ee inset;
}

.create-form :deep(.el-input__wrapper:hover),
.create-form :deep(.el-select__wrapper:hover),
.create-form :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px #b8c7dc inset;
}

.create-form :deep(.el-input__wrapper.is-focus),
.create-form :deep(.el-select__wrapper.is-focused),
.create-form :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 1px #409eff inset, 0 0 0 3px rgba(64, 158, 255, 0.12);
}

.create-form :deep(.el-radio-group) {
  flex-wrap: nowrap;
}

.create-form :deep(.el-radio-button.is-disabled.is-active .el-radio-button__inner),
.create-form :deep(.el-radio-button.is-disabled.is-checked .el-radio-button__inner) {
  border-color: #409eff;
  background: #409eff;
  color: #ffffff;
  box-shadow: -1px 0 0 0 #409eff;
  opacity: 0.9;
}

.create-form :deep(.el-radio-button.is-disabled:not(.is-active):not(.is-checked) .el-radio-button__inner) {
  background: #f8fafc;
  color: #94a3b8;
}

.create-form :deep(.el-radio-button__inner),
.form-actions :deep(.el-button),
.cover-btn {
  border-radius: 6px;
}

.form-actions :deep(.el-button) {
  min-width: 86px;
}

@media (max-width: 640px) {
  .create-page {
    padding: 18px 14px;
  }

  .create-panel {
    padding: 18px;
  }

  .page-head {
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 18px;
  }

  .editor-shell,
  .split-row {
    grid-template-columns: 1fr;
  }

  .cover-pane {
    padding-right: 0;
    padding-bottom: 18px;
    border-right: 0;
    border-bottom: 1px solid #eef2f7;
  }

  .cover-preview,
  .cover-empty {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  .form-actions {
    flex-direction: column;
  }

  .form-actions :deep(.el-button) {
    width: 100%;
  }

  .document-toolbar {
    flex-direction: column;
  }

  .document-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .doc-search,
  .doc-select,
  .doc-upload-btn {
    width: 100%;
  }

  .doc-upload-btn {
    margin-left: 0;
  }

  .create-form :deep(.el-radio-group) {
    flex-wrap: wrap;
  }
}
</style>
