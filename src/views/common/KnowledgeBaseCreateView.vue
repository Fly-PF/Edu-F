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
              fit="cover"
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
  min-height: 0;
  overflow: auto;
  padding: 28px 24px;
  background: #ffffff;
}

.create-panel {
  width: min(760px, 100%);
  margin: 0 auto;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  padding: 24px;
  background: #ffffff;
}

.create-form {
  display: grid;
  gap: 4px;
}

.cover-field {
  display: grid;
  gap: 12px;
}

.cover-preview,
.cover-empty {
  width: 220px;
  height: 124px;
  border-radius: 8px;
}

.cover-preview {
  display: block;
  border: 1px solid #dbeafe;
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

.full-control {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .create-page {
    padding: 18px 14px;
  }

  .create-panel {
    padding: 18px;
  }

  .cover-preview,
  .cover-empty {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }
}
</style>
