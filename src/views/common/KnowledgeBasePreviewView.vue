<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Document, Picture } from '@element-plus/icons-vue'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import { getKnowledgeBaseDocumentPreviewContent, getKnowledgeBaseDocumentPreviewImages } from '@/api/rag'

const apiBaseURL = ''
const supportedExtensions = ['pdf', 'ppt', 'pptx', 'txt', 'md', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp']

const route = useRoute()
const router = useRouter()

const previewLoading = ref(false)
const previewError = ref('')
const previewData = ref(null)
const previewPages = ref([])

const kbId = computed(() => Number(route.query.kb_id))
const fileUrl = computed(() => String(route.query.file_url || ''))
const fileName = computed(() => String(route.query.file_name || '') || getFileName(fileUrl.value))
const extension = computed(() => normalizeExtension(route.query.doc_type) || getExtension(fileUrl.value) || getExtension(fileName.value))

const previewType = computed(() => {
  if (['jpg', 'jpeg', 'png', 'webp'].includes(extension.value)) {
    return 'image'
  }
  if (['pdf', 'ppt', 'pptx'].includes(extension.value)) {
    return 'pages'
  }
  if (['doc', 'docx'].includes(extension.value)) {
    return 'html'
  }
  if (extension.value === 'md') {
    return 'markdown'
  }
  return 'text'
})

const previewUrl = computed(() => {
  if (!fileUrl.value || !kbId.value) {
    return ''
  }
  return `${apiBaseURL}/api/rag/files/preview?file_url=${encodeURIComponent(fileUrl.value)}&kb_id=${encodeURIComponent(String(kbId.value))}`
})

const displayTypeText = computed(() => {
  if (!extension.value) {
    return '未知类型'
  }
  return previewType.value === 'pages' ? `${extension.value.toUpperCase()} 图片预览` : `${extension.value.toUpperCase()} 类型`
})

const textContent = computed(() => previewData.value?.content || '')
const htmlContent = computed(() => previewData.value?.html || '')

function normalizeExtension(value) {
  return String(value || '').replace(/^\./, '').trim().toLowerCase()
}

function getExtension(value) {
  const cleanValue = String(value || '').split('?')[0]
  const index = cleanValue.lastIndexOf('.')
  return index >= 0 ? cleanValue.slice(index + 1).toLowerCase() : ''
}

function getFileName(value) {
  const cleanValue = String(value || '').split('?')[0]
  const index = cleanValue.lastIndexOf('/')
  return index >= 0 ? cleanValue.slice(index + 1) : cleanValue || '文件预览'
}

function handleBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push('/main/knowledge-qa/show')
}

async function loadPreview() {
  previewData.value = null
  previewPages.value = []

  if (!Number.isInteger(kbId.value) || kbId.value <= 0 || !fileUrl.value) {
    previewError.value = '文件参数无效'
    return
  }
  if (!supportedExtensions.includes(extension.value)) {
    previewError.value = '暂不支持预览该文件类型'
    return
  }

  previewLoading.value = true
  previewError.value = ''
  try {
    if (previewType.value === 'image') {
      return
    }

    if (previewType.value === 'pages') {
    const data = await getKnowledgeBaseDocumentPreviewImages({
        kb_id: kbId.value,
        file_url: fileUrl.value,
      })
      previewPages.value = data?.pages || []
      return
    }

    previewData.value = await getKnowledgeBaseDocumentPreviewContent({
      kb_id: kbId.value,
      file_url: fileUrl.value,
    })
  } catch (error) {
    previewError.value = error?.message || '文件预览失败'
  } finally {
    previewLoading.value = false
  }
}

function handleImageError() {
  previewError.value = '文件预览失败'
}

onMounted(loadPreview)
watch(() => route.fullPath, loadPreview)
</script>

<template>
  <div class="kb-preview-page">
    <section class="preview-panel">
      <div class="preview-head">
        <el-button class="back-btn" :icon="ArrowLeft" text @click="handleBack">返回</el-button>
        <div class="file-title-wrap">
          <div class="file-icon">
            <el-icon v-if="previewType === 'image'"><Picture /></el-icon>
            <el-icon v-else><Document /></el-icon>
          </div>
          <div class="file-title">
            <h2>{{ fileName }}</h2>
            <span>{{ displayTypeText }}</span>
          </div>
        </div>
      </div>

      <div class="preview-shell" v-loading="previewLoading" element-loading-text="等待文件解析，请耐心等待！">
        <div v-if="previewError" class="error-state">
          <el-result icon="error" title="预览失败" :sub-title="previewError">
            <template #extra>
              <el-button type="primary" :icon="ArrowLeft" @click="handleBack">返回</el-button>
            </template>
          </el-result>
        </div>

        <template v-else-if="previewType === 'image' && previewUrl">
          <img class="image-preview" :src="previewUrl" :alt="fileName" @error="handleImageError" />
        </template>

        <template v-else-if="previewType === 'pages'">
          <div class="page-preview-list">
            <section v-for="page in previewPages" :key="page.pageNum" class="page-item">
              <div class="page-head">page {{ page.pageNum }}/{{ previewPages.length }}</div>
              <img class="page-image" :src="page.imageUrl" :alt="`${fileName} 第${page.pageNum}页`" />
            </section>
            <el-empty v-if="!previewPages.length && !previewLoading" description="暂无可预览内容" />
          </div>
        </template>

        <template v-else-if="previewType === 'markdown' && previewData">
          <div class="markdown-preview">
            <MarkdownRenderer :markdown="textContent" :enable-latex="true" :enable-shiki="true" />
          </div>
        </template>

        <template v-else-if="previewType === 'html' && previewData">
          <div class="html-preview">
            <el-empty v-if="!htmlContent" description="暂无可预览内容" />
            <div v-else class="word-preview-body" v-html="htmlContent"></div>
          </div>
        </template>

        <template v-else-if="previewType === 'text' && previewData">
          <div class="text-preview">
            <el-empty v-if="!textContent" description="暂无可预览内容" />
            <pre v-else>{{ textContent }}</pre>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<style scoped>
.kb-preview-page {
  min-height: calc(100vh - 64px);
  overflow: auto;
  padding: 24px;
  background: #f6f8fb;
}

.preview-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(1280px, 100%);
  min-height: calc(100vh - 112px);
  margin: 0 auto;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #ffffff;
}

.preview-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid #eef2f7;
}

.back-btn {
  flex: 0 0 auto;
  color: #475569;
}

.file-title-wrap {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 12px;
}

.file-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 8px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 20px;
}

.file-title {
  min-width: 0;
}

.file-title h2 {
  overflow: hidden;
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-title span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
}

.preview-shell {
  min-height: 0;
  padding: 18px;
  overflow: auto;
  background: #f8fafc;
}

.error-state {
  display: grid;
  min-height: 520px;
  place-items: center;
}

.text-preview,
.markdown-preview,
.html-preview,
.image-preview {
  width: 100%;
  min-height: 640px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
}

.image-preview {
  display: block;
  max-height: calc(100vh - 190px);
  margin: auto;
  object-fit: contain;
}

.page-preview-list {
  display: grid;
  gap: 20px;
}

.page-item {
  padding: 16px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #ffffff;
}

.page-head {
  margin-bottom: 12px;
  color: #1e3a8a;
  font-size: 14px;
  font-weight: 600;
}

.page-image {
  display: block;
  width: 100%;
  max-width: 1040px;
  margin: 0 auto;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
}

.text-preview {
  overflow: auto;
  padding: 18px;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.7;
}

.markdown-preview {
  overflow: auto;
  padding: 18px;
  color: #0f172a;
}

.html-preview {
  overflow: auto;
  padding: 28px;
  color: #0f172a;
}

.word-preview-body {
  max-width: 920px;
  margin: 0 auto;
  font-size: 15px;
  line-height: 1.8;
}

.word-preview-body :deep(p) {
  margin: 0 0 12px;
}

.word-preview-body :deep(table) {
  width: 100%;
  margin: 16px 0;
  border-collapse: collapse;
}

.word-preview-body :deep(td) {
  padding: 8px 10px;
  border: 1px solid #dbe3ee;
  vertical-align: top;
}

.word-preview-body :deep(img) {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 12px 0;
}

.text-preview pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}

@media (max-width: 640px) {
  .kb-preview-page {
    padding: 14px;
  }

  .preview-panel {
    min-height: calc(100vh - 92px);
  }

  .preview-head {
    align-items: flex-start;
    flex-wrap: wrap;
    padding: 16px;
  }

  .preview-shell {
    padding: 10px;
  }

  .text-preview,
  .markdown-preview,
  .html-preview {
    min-height: 560px;
  }
}

/* AI 探索乐园文件预览主题 */
.kb-preview-page {
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: clamp(18px, 3vw, 38px) clamp(18px, 5vw, 80px) 64px;
  background-color: #fbfbff;
  background-image:
    linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px),
    linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
}

.preview-panel {
  position: relative;
  display: block;
  width: min(1440px, 100%);
  min-width: 0;
  min-height: auto;
  margin: 0 auto;
  overflow: visible;
  border: 2px solid var(--kb-ink, #3d3564);
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 7px 8px 0 rgb(61 53 100 / 28%);
}

.preview-head {
  min-width: 0;
  padding: 20px 24px;
  border-bottom: 2px solid rgb(61 53 100 / 30%);
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%);
}

.back-btn {
  min-height: 34px;
  border: 1px solid var(--kb-ink-soft, #4e4473);
  border-radius: 5px;
  background: rgb(255 255 255 / 80%);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 16%);
  color: var(--kb-ink, #3d3564);
  font-weight: 800;
  white-space: nowrap;
}

.back-btn:hover,
.back-btn:focus-visible {
  background: var(--kb-yellow, #fff1a8);
  box-shadow: 4px 5px 0 rgb(61 53 100 / 22%);
  color: var(--kb-ink, #3d3564);
  outline: none;
  transform: translate(-1px, -1px);
}

.file-title-wrap,
.file-title,
.preview-shell,
.page-preview-list,
.page-item {
  min-width: 0;
}

.file-icon {
  flex: 0 0 auto;
  border: 1px solid var(--kb-ink, #3d3564);
  border-radius: 7px;
  background: var(--kb-mint, #9de4eb);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 16%);
  color: var(--kb-ink, #3d3564);
}

.file-title {
  flex: 1;
  overflow: hidden;
}

.file-title h2 {
  color: var(--kb-ink, #3d3564);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 20px;
  font-weight: 900;
}

.file-title span {
  color: var(--kb-ink-soft, #4e4473);
  font-weight: 700;
}

.preview-shell {
  display: grid;
  min-height: 0;
  padding: clamp(12px, 2vw, 24px);
  overflow: visible;
  background-color: #fbfbff;
  background-image: radial-gradient(rgb(129 120 207 / 18%) 1px, transparent 1px);
  background-size: 12px 12px;
}

.error-state {
  min-height: 360px;
  color: var(--kb-ink, #3d3564);
}

.text-preview,
.markdown-preview,
.html-preview,
.image-preview {
  min-height: 560px;
  border: 2px solid rgb(61 53 100 / 54%);
  border-radius: 7px;
  background: #ffffff;
  box-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
}

.image-preview {
  min-height: 0;
  max-height: min(72dvh, 860px);
}

.page-preview-list {
  display: grid;
  gap: 20px;
}

.page-item {
  padding: 16px;
  border: 2px solid rgb(61 53 100 / 44%);
  border-radius: 7px;
  background: #ffffff;
  box-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
}

.page-head {
  margin-bottom: 12px;
  color: var(--kb-ink, #3d3564);
  font-size: 14px;
  font-weight: 900;
}

.page-image {
  width: 100%;
  max-width: 1040px;
  height: auto;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 12%);
}

.text-preview,
.markdown-preview,
.html-preview {
  color: var(--kb-ink, #3d3564);
}

.word-preview-body :deep(td) {
  border-color: rgb(61 53 100 / 34%);
}

@media (max-width: 640px) {
  .kb-preview-page {
    padding: 18px 16px 40px;
  }

  .preview-head {
    align-items: flex-start;
    padding: 16px;
  }

  .preview-shell {
    padding: 10px;
  }

  .text-preview,
  .markdown-preview,
  .html-preview {
    min-height: 480px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .back-btn {
    transition: none;
  }
}
</style>
