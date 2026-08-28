<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getPublishedGovMaterialFileUrl, listPublishedGovMaterials } from '@/api/govMaterial'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const error = ref('')
const material = ref(null)
const pdfUrl = ref('')

const materialId = computed(() => Number(route.query.id))

function clearPdfUrl() {
  if (pdfUrl.value.startsWith('blob:')) URL.revokeObjectURL(pdfUrl.value)
  pdfUrl.value = ''
}

async function loadPreview() {
  clearPdfUrl()
  error.value = ''
  if (!Number.isInteger(materialId.value) || materialId.value <= 0) {
    error.value = '资料参数无效'
    return
  }
  loading.value = true
  try {
    const response = await listPublishedGovMaterials()
    const materials = response?.code === 200 ? response.data : response
    const found = (materials || []).find((item) => Number(item.id) === materialId.value && Number(item.materialType) === 1)
    if (!found?.fileUrl) {
      error.value = '资料不存在或暂不可预览'
      return
    }
    material.value = found
    const sourceUrl = getPublishedGovMaterialFileUrl(found.fileUrl)
    try {
      const response = await fetch(sourceUrl)
      if (!response.ok) throw new Error('PDF加载失败')
      const blob = await response.blob()
      pdfUrl.value = `${URL.createObjectURL(blob)}#toolbar=1&navpanes=0`
    } catch {
      pdfUrl.value = `${sourceUrl}#toolbar=1&navpanes=0`
    }
  } catch (loadError) {
    error.value = loadError?.message || '资料加载失败'
    ElMessage.error(error.value)
  } finally {
    loading.value = false
  }
}

function handleBack() {
  router.push('/main/gov/materials')
}

onMounted(loadPreview)
onBeforeUnmount(clearPdfUrl)
</script>

<template>
  <main class="gov-material-preview-page">
    <section class="preview-panel">
      <header class="preview-head">
        <el-button :icon="ArrowLeft" text @click="handleBack">返回资料列表</el-button>
        <div class="preview-title">
          <el-icon><Document /></el-icon>
          <div>
            <h1>{{ material?.title || 'PDF资料预览' }}</h1>
            <span>{{ material?.fileName || 'PDF文件' }}</span>
          </div>
        </div>
      </header>
      <section v-loading="loading" class="preview-body">
        <el-result v-if="error" icon="error" title="预览失败" :sub-title="error">
          <template #extra><el-button type="primary" :icon="ArrowLeft" @click="handleBack">返回</el-button></template>
        </el-result>
        <iframe v-else-if="pdfUrl" :src="pdfUrl" title="PDF资料预览" />
        <el-empty v-else-if="!loading" description="暂无可预览内容" />
      </section>
    </section>
  </main>
</template>

<style scoped>
.gov-material-preview-page { min-height: 100%; padding: 24px clamp(16px, 4vw, 64px) 40px; background: #fbfbff; color: #3d3564; }
.preview-panel { display: grid; grid-template-rows: auto minmax(0, 1fr); width: min(1280px, 100%); min-height: calc(100vh - 112px); margin: 0 auto; overflow: hidden; border: 2px solid #3d3564; border-radius: 8px; background: #ffffff; box-shadow: 6px 7px 0 rgb(61 53 100 / 20%); }
.preview-head { display: flex; align-items: center; gap: 18px; min-width: 0; padding: 18px 24px; border-bottom: 2px solid rgb(61 53 100 / 20%); background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%); }
.preview-head :deep(.el-button) { flex-shrink: 0; color: #3d3564; font-weight: 800; }
.preview-title { display: flex; min-width: 0; align-items: center; gap: 10px; }
.preview-title > .el-icon { flex-shrink: 0; font-size: 24px; }
.preview-title h1 { overflow: hidden; margin: 0; font-size: 20px; text-overflow: ellipsis; white-space: nowrap; }
.preview-title span { display: block; overflow: hidden; margin-top: 4px; color: #6c638d; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.preview-body { display: grid; min-height: 0; place-items: stretch; padding: 16px; overflow: hidden; background: #f4f3fb; }
.preview-body iframe { width: 100%; min-height: 680px; border: 1px solid #d5d0e6; background: #ffffff; }
.preview-body :deep(.el-result) { align-self: center; }
@media (max-width: 640px) { .gov-material-preview-page { padding: 12px; } .preview-panel { min-height: calc(100vh - 88px); } .preview-head { align-items: flex-start; flex-direction: column; padding: 16px; } .preview-title { width: 100%; } .preview-title h1 { font-size: 17px; } .preview-body { padding: 8px; } .preview-body iframe { min-height: 560px; } }
</style>
