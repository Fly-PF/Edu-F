<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus, PictureFilled } from '@element-plus/icons-vue'
import { getMyKnowledgeBase, updateKnowledgeBase } from '@/api/rag'

const route = useRoute()
const router = useRouter()

const formRef = ref(null)
const isEditing = ref(false)
const coverPreviewUrl = ref('')
const coverPreviewObjectUrl = ref('')
const coverFile = ref(null)
const submitting = ref(false)
const loading = ref(false)
const kbId = Number(route.query.kb_id)
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

function coverUrl(objectName) {
  if (!objectName) {
    return ''
  }

  return `http://localhost:8080/api/rag/kb/cover?objectName=${encodeURIComponent(objectName)}`
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
      router.back()
    }
    return
  }

  loading.value = true
  try {
    const data = await getMyKnowledgeBase(kbId)
    applyKnowledgeBase(data)
  } catch (error) {
    ElMessage.error(error?.message || '知识库加载失败')
    if (backOnError) {
      router.back()
    }
  } finally {
    loading.value = false
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

function handleBack() {
  router.push('/main/knowledge-qa/my')
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
              fit="cover"
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
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  cursor: zoom-in;
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

  .create-form :deep(.el-radio-group) {
    flex-wrap: wrap;
  }
}
</style>
