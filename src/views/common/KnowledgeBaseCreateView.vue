<script setup>
import { onBeforeUnmount, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, PictureFilled } from '@element-plus/icons-vue'
import { createKnowledgeBase } from '@/api/rag'

const router = useRouter()
const formRef = ref(null)
const coverUploadRef = ref(null)
const coverPreviewUrl = ref('')
const coverFile = ref(null)
const submitting = ref(false)

const form = reactive({
  kb_name: '',
  description: '',
  kb_type: 1,
  is_public: 0,
})

const rules = {
  kb_name: [{ required: true, message: '请输入知识库名称', trigger: 'blur' }],
  kb_cover: [
    {
      validator: (_rule, _value, callback) => {
        if (coverFile.value) {
          callback()
          return
        }
        callback(new Error('请选择封面图'))
      },
      trigger: 'change',
    },
  ],
  kb_type: [{ required: true, message: '请选择知识库类型', trigger: 'change' }],
  is_public: [{ required: true, message: '请选择公开状态', trigger: 'change' }],
}

const kbTypeOptions = [
  { label: '其他', value: 1 },
  { label: '课程', value: 2 },
  { label: '教材', value: 3 },
  { label: '政策', value: 4 },
]

function revokeCoverPreview() {
  if (coverPreviewUrl.value) {
    URL.revokeObjectURL(coverPreviewUrl.value)
  }
}

function handleCoverChange(uploadFile) {
  const rawFile = uploadFile.raw
  if (!rawFile) {
    return
  }

  revokeCoverPreview()
  coverFile.value = rawFile
  coverPreviewUrl.value = URL.createObjectURL(rawFile)
  formRef.value?.validateField('kb_cover')
}

function buildFormData() {
  const data = new FormData()
  data.append('kb_name', form.kb_name)
  data.append('description', form.description || '')
  data.append('kb_type', String(form.kb_type))
  data.append('is_public', String(form.is_public))
  data.append('kb_cover', coverFile.value)

  return data
}

function resetForm() {
  formRef.value?.resetFields()
  coverUploadRef.value?.clearFiles()
  coverFile.value = null
  revokeCoverPreview()
  coverPreviewUrl.value = ''
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  submitting.value = true
  try {
    await createKnowledgeBase(buildFormData())
    ElMessage.success('创建成功')
    resetForm()
    router.push('/main/knowledge-qa/my')
  } catch (error) {
    ElMessage.error(error?.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(revokeCoverPreview)
</script>

<template>
  <div class="create-page">
    <div class="create-panel">
      <el-form ref="formRef" class="create-form" :model="form" :rules="rules" label-position="top">
        <el-form-item label="知识库名称" prop="kb_name">
          <el-input v-model="form.kb_name" maxlength="200" show-word-limit placeholder="请输入知识库名称" />
        </el-form-item>

        <el-form-item label="封面图" prop="kb_cover">
          <div class="cover-field">
            <el-upload
              ref="coverUploadRef"
              action="#"
              accept="image/*"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="handleCoverChange"
            >
              <el-button :icon="Plus">选择图片</el-button>
            </el-upload>

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
        </el-form-item>

        <el-form-item label="库说明" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="5" resize="none" placeholder="请输入库说明" />
        </el-form-item>

        <el-form-item label="知识库类型" prop="kb_type">
          <el-select v-model="form.kb_type" class="full-control" placeholder="请选择知识库类型">
            <el-option v-for="item in kbTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="公开状态" prop="is_public">
          <el-radio-group v-model="form.is_public">
            <el-radio-button :value="0">私有</el-radio-button>
            <el-radio-button :value="1">平台公开</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <div class="form-actions">
          <el-button type="primary" :loading="submitting" @click="handleSubmit">新建</el-button>
        </div>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.create-page {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: clamp(20px, 3vw, 46px) clamp(18px, 5vw, 80px) 64px;
  background: transparent;
}

.create-panel {
  position: relative;
  overflow: hidden;
  width: min(760px, 100%);
  margin: 0 auto;
  border: 2px solid var(--kb-ink, #3d3564);
  border-radius: 8px;
  padding: 32px;
  background: linear-gradient(118deg, rgb(232 228 255 / 86%) 0%, rgb(249 221 236 / 74%) 48%, rgb(211 242 242 / 84%) 100%);
  box-shadow: 7px 8px 0 rgb(61 53 100 / 30%);
}

.create-panel::before {
  position: absolute;
  top: 14px;
  right: 18px;
  z-index: 0;
  padding: 4px 8px;
  border: 1px solid var(--kb-ink, #3d3564);
  border-radius: 4px;
  background: var(--kb-yellow, #fff1a8);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 18%);
  color: var(--kb-ink, #3d3564);
  content: 'MAKE IT';
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0;
  transform: rotate(3deg);
}

.create-form {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 12px;
}

.cover-field {
  display: grid;
  gap: 12px;
}

.cover-preview,
.cover-empty {
  width: 220px;
  height: 124px;
  border-radius: 6px;
}

.cover-preview {
  display: block;
  border: 2px solid var(--kb-ink, #3d3564);
  background: #ffffff;
  box-shadow: 4px 5px 0 rgb(61 53 100 / 18%);
  cursor: zoom-in;
}

.cover-preview :deep(.el-image__inner) {
  object-fit: contain;
}

.cover-empty {
  display: grid;
  place-items: center;
  border: 2px dashed var(--kb-ink-soft, #4e4473);
  background-color: #ffffff;
  background-image: radial-gradient(var(--kb-pink, #ee91bb) 1px, transparent 1px);
  background-size: 12px 12px;
  color: var(--kb-primary, #8178cf);
  font-size: 28px;
}

.full-control {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.create-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.create-form :deep(.el-form-item__label) {
  padding-bottom: 8px;
  color: var(--kb-ink, #3d3564);
  font-weight: 800;
}

.create-form :deep(.el-input__wrapper),
.create-form :deep(.el-select__wrapper),
.create-form :deep(.el-textarea__inner) {
  border-radius: 5px;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 0 0 1px rgb(61 53 100 / 44%) inset;
}

.create-form :deep(.el-input__wrapper:hover),
.create-form :deep(.el-select__wrapper:hover),
.create-form :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 2px var(--kb-pink, #ee91bb) inset;
}

.create-form :deep(.el-input__wrapper.is-focus),
.create-form :deep(.el-select__wrapper.is-focused),
.create-form :deep(.el-textarea__inner:focus) {
  box-shadow: 0 0 0 2px var(--kb-primary, #8178cf) inset, 3px 4px 0 rgb(61 53 100 / 14%);
}

.create-form :deep(.el-radio-button__inner) {
  border-color: rgb(61 53 100 / 42%);
  border-radius: 5px;
  background: #ffffff;
  color: var(--kb-ink, #3d3564);
  font-weight: 800;
  white-space: nowrap;
}

.create-form :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  border-color: var(--kb-ink-soft, #4e4473);
  background: var(--kb-mint, #9de4eb);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 18%);
  color: var(--kb-ink, #3d3564);
}

.create-panel :deep(.el-button) {
  min-height: 34px;
  border: 1px solid var(--kb-ink-soft, #4e4473);
  border-radius: 5px;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 20%);
  font-weight: 800;
  white-space: nowrap;
}

.create-panel :deep(.el-button--primary) {
  background: var(--kb-primary, #8178cf);
  color: #ffffff;
}

.create-panel :deep(.el-button:not(.is-disabled):hover),
.create-panel :deep(.el-button:not(.is-disabled):focus-visible) {
  box-shadow: 5px 6px 0 rgb(61 53 100 / 24%);
  outline: none;
  transform: translate(-2px, -2px);
}

.create-panel :deep(.el-button.is-disabled) {
  border-color: rgb(61 53 100 / 20%);
  box-shadow: none;
  opacity: 0.56;
}

@media (max-width: 640px) {
  .create-page {
    padding: 18px 16px 40px;
  }

  .create-panel {
    padding: 42px 18px 20px;
  }

  .cover-preview,
  .cover-empty {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
}
</style>
