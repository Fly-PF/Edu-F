<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Document, Refresh, Picture } from '@element-plus/icons-vue'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import { getKnowledgeBaseDocumentPreviewContent, getKnowledgeBaseDocumentPreviewImages } from '@/api/rag'

const route = useRoute()
const router = useRouter()

const previewLoading = ref(false)
const previewError = ref('')
const previewData = ref(null)
const previewPages = ref([])

const kbId = computed(() => Number(route.query.kb_id))
const fileUrl = computed(() => String(route.query.file_url || ''))
const fileName = computed(() => String(route.query.file_name || '') || getFileName(fileUrl.value))
const docType = computed(() => normalizeDocType(route.query.doc_type || getExtension(fileUrl.value)))
const extension = computed(() => getExtension(fileUrl.value))

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
  if (!fileUrl.value) {
    return ''
  }

  return `http://localhost:8080/api/rag/files/preview?file_url=${encodeURIComponent(fileUrl.value)}&kb_id=${encodeURIComponent(String(kbId.value || ''))}`
})

const displayTypeText = computed(() => {
  const value = docType.value || extension.value
  if (!value) {
    return '未知类型'
  }
  return previewType.value === 'pages' ? `${value.toUpperCase()} 图片预览` : `${value.toUpperCase()} 类型`
})

const textContent = computed(() => previewData.value?.content || '')
const htmlContent = computed(() => previewData.value?.html || '')

function getExtension(value) {
  const cleanValue = String(value || '').split('?')[0]
  const index = cleanValue.lastIndexOf('.')
  return index >= 0 ? cleanValue.slice(index + 1).toLowerCase() : ''
}

function normalizeDocType(value) {
  const ext = String(value || '').replace(/^\./, '').trim().toLowerCase()
  return ext || ''
}

function getFileName(value) {
  const cleanValue = String(value || '').split('?')[0]
  const index = cleanValue.lastIndexOf('/')
  return index >= 0 ? cleanValue.slice(index + 1) : cleanValue || '文件预览'
}

function handleBack() {
  router.push({
    path: '/knowledge-qa/modify',
    query: { kb_id: Number.isInteger(kbId.value) && kbId.value > 0 ? kbId.value : route.query.kb_id },
  })
}

async function loadPreview() {
  if (!Number.isInteger(kbId.value) || kbId.value <= 0 || !fileUrl.value) {
    previewError.value = '文件参数无效'
    return
  }

  previewLoading.value = true
  previewError.value = ''
  try {
    previewData.value = null
    previewPages.value = []

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

    const data = await getKnowledgeBaseDocumentPreviewContent({
      kb_id: kbId.value,
      file_url: fileUrl.value,
    })
    previewData.value = data || null
  } catch (error) {
    previewData.value = null
    previewPages.value = []
    previewError.value = error?.message || '文件预览失败'
    ElMessage.error(previewError.value)
  } finally {
    previewLoading.value = false
  }
}

function handleRefresh() {
  loadPreview()
}

onMounted(loadPreview)
</script>

<template>
  <div class="file-show-page">
    <section class="file-show-panel">
      <div class="file-head">
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
        <el-button class="refresh-btn" :icon="Refresh" text @click="handleRefresh">刷新</el-button>
      </div>

      <div class="preview-shell" v-loading="previewLoading" element-loading-text="等待文件解析，请耐心等待！">
        <template v-if="previewType === 'image' && previewUrl">
          <img class="image-preview" :src="previewUrl" :alt="fileName" />
        </template>

        <template v-else-if="previewType === 'pages'">
          <div class="page-preview-list">
            <section v-for="page in previewPages" :key="page.pageNum" class="page-item">
              <div class="page-head">page {{ page.pageNum }}/{{ previewPages.length }}</div>
              <img class="page-image" :src="page.imageUrl" :alt="`${fileName} 第${page.pageNum}页`" />
            </section>
            <el-empty v-if="!previewPages.length && !previewError" description="暂无可预览内容" />
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

        <el-empty v-else-if="previewError" :description="previewError" />
        <el-empty v-else description="暂无可预览内容" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.file-show-page {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: 24px;
  background: linear-gradient(180deg, #f3f7fc 0%, #f8fafc 48%, #ffffff 100%);
}

.file-show-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  width: min(1280px, 100%);
  min-height: calc(100vh - 104px);
  margin: 0 auto;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
}

.file-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #eef2f7;
}

.back-btn,
.refresh-btn {
  flex: 0 0 auto;
  color: #475569;
}

.file-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
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
  display: grid;
  min-height: 0;
  padding: 18px;
  background: #f8fafc;
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
  border: 0;
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
  .file-show-page {
    padding: 14px;
  }

  .file-show-panel {
    min-height: calc(100vh - 28px);
  }

  .file-head {
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
</style>
