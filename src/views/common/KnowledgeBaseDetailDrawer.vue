<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CollectionTag, Document, FolderOpened, PictureFilled, Star, Tickets } from '@element-plus/icons-vue'
import { cancelKnowledgeBaseCollection, collectKnowledgeBase, listPublicKnowledgeBaseDocuments, pageKnowledgeBaseDocuments } from '@/api/rag'
import router from '@/router'
import { useUserStore } from '@/stores/user'

const apiBaseURL = (import.meta.env.VITE_APP_REQUEST_BASE_URL || '').replace(/\/$/, '')
const userStore = useUserStore()

const visible = defineModel({ type: Boolean, default: false })
const props = defineProps({
  knowledgeBase: {
    type: Object,
    default: null,
  },
  showCollectionAction: {
    type: Boolean,
    default: true,
  },
  collected: {
    type: Boolean,
    default: false,
  },
  collectionLoading: {
    type: Boolean,
    default: false,
  },
  showMyCollection: {
    type: Boolean,
    default: true,
  },
})
const emit = defineEmits(['collection-change', 'closed'])

const loading = ref(false)
const collectionSubmitting = ref(false)
const documents = ref([])
const activeGroups = ref([])

const isSelfCreated = computed(() => {
  const kbUserId = Number(props.knowledgeBase?.userId)
  const currentUserId = Number(userStore.userId)
  return Boolean(kbUserId && currentUserId && kbUserId === currentUserId)
})
const isCollectionBusy = computed(() => props.collectionLoading || collectionSubmitting.value)
const collectionButtonType = computed(() => (props.collected ? 'warning' : 'primary'))
const collectionButtonClass = computed(() => ({ collected: props.collected }))
const collectionButtonText = computed(() => (props.collected ? '已收藏' : '收藏'))

const typeMap = {
  1: '其他',
  2: '课程',
  3: '教材',
  4: '政策',
}

const groupedDocuments = computed(() => {
  const groups = []
  const groupMap = new Map()

  documents.value.forEach((document) => {
    const extension = normalizeExtension(document.docType || document.docName)
    const key = extension || 'UNKNOWN'
    if (!groupMap.has(key)) {
      const group = {
        key,
        title: `${key}类型`,
        documents: [],
      }
      groupMap.set(key, group)
      groups.push(group)
    }
    groupMap.get(key).documents.push(document)
  })

  return groups
})

function coverUrl(objectName) {
  if (!objectName) {
    return ''
  }
  return `${apiBaseURL}/api/rag/kb/cover?objectName=${encodeURIComponent(objectName)}`
}

function typeName(value) {
  return typeMap[value] || '未知'
}

function publicName(value) {
  return value === 1 ? '公开' : '非公开'
}

function normalizeExtension(value) {
  const text = String(value || '').trim()
  const extension = text.includes('.') ? text.split('.').pop() : text
  return extension ? extension.toUpperCase() : ''
}

function fileTypeName(document) {
  const extension = normalizeExtension(document.docType || document.docName)
  return extension ? `${extension}文件` : '文件'
}

function fileDescription(document) {
  return String(document?.description || '').trim() || '暂无文件描述'
}

async function loadDocuments(kbId) {
  loading.value = true
  documents.value = []
  try {
    const result = isSelfCreated.value
      ? await pageKnowledgeBaseDocuments({ kb_id: kbId, pageNum: 1, pageSize: 1000 })
      : await listPublicKnowledgeBaseDocuments({ kb_id: kbId })
    documents.value = Array.isArray(result?.records) ? result.records : (result || [])
    activeGroups.value = groupedDocuments.value.slice(0, 1).map((group) => group.key)
  } catch (error) {
    ElMessage.error(error?.message || '知识库文件加载失败')
  } finally {
    loading.value = false
  }
}

async function toggleCollection() {
  if (!props.knowledgeBase?.id || isCollectionBusy.value) {
    return
  }
  if (isSelfCreated.value) {
    ElMessage.warning('该知识库由您自己创建，无需收藏')
    return
  }

  collectionSubmitting.value = true
  try {
    if (props.collected) {
      await cancelKnowledgeBaseCollection(props.knowledgeBase.id)
      emit('collection-change', false)
      ElMessage.success('已取消收藏')
    } else {
      await collectKnowledgeBase(props.knowledgeBase.id)
      emit('collection-change', true)
      ElMessage.success('收藏成功')
    }
  } catch (error) {
    ElMessage.error(error?.message || '操作失败')
  } finally {
    collectionSubmitting.value = false
  }
}

function goMyCollection() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  router.push('/main/knowledge-qa/collection')
}

function openDocumentPreview(document) {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }

  router.push({
    path: '/main/knowledge-qa/preview',
    query: {
      kb_id: props.knowledgeBase.id,
      file_url: document.fileUrl,
      file_name: document.docName,
      doc_type: document.docType,
    },
  })
}

watch(
  () => [visible.value, props.knowledgeBase?.id],
  ([isVisible, kbId]) => {
    if (isVisible && kbId) {
      loadDocuments(kbId)
    }
  },
)
</script>

<template>
  <el-drawer v-model="visible" size="min(640px, 92vw)" title="知识库详情" @closed="emit('closed')">
    <div v-loading="loading" class="kb-detail-drawer">
      <template v-if="knowledgeBase">
        <el-image v-if="knowledgeBase.kbCover" class="detail-cover" :src="coverUrl(knowledgeBase.kbCover)" fit="contain" />
        <div v-else class="detail-cover-empty">
          <el-icon><PictureFilled /></el-icon>
        </div>

        <div class="detail-heading">
          <div>
            <p>{{ typeName(knowledgeBase.kbType) }} · {{ publicName(knowledgeBase.publicFlag) }}</p>
            <h2>{{ knowledgeBase.kbName }}</h2>
          </div>
          <div class="detail-actions">
            <el-button
              v-if="showCollectionAction"
              :type="collectionButtonType"
              :plain="!collected"
              :loading="isCollectionBusy"
              :class="collectionButtonClass"
              @click="toggleCollection"
            >
              <el-icon><Star /></el-icon>
              {{ collectionButtonText }}
            </el-button>
            <el-button v-if="showMyCollection" plain class="my-collection-button" @click="goMyCollection">
              <el-icon><CollectionTag /></el-icon>
              我的收藏
            </el-button>
          </div>
        </div>

        <div class="detail-facts">
          <span><el-icon><CollectionTag /></el-icon>{{ typeName(knowledgeBase.kbType) }}</span>
          <span><el-icon><Tickets /></el-icon>{{ publicName(knowledgeBase.publicFlag) }}</span>
          <span><el-icon><FolderOpened /></el-icon>{{ documents.length }} 个文件</span>
        </div>

        <section class="detail-intro">
          <h3>知识库介绍</h3>
          <p>{{ knowledgeBase.description || '暂无知识库介绍。' }}</p>
        </section>

        <section class="detail-files">
          <h3>知识库文件</h3>
          <div class="detail-file-scroll">
            <el-collapse v-if="groupedDocuments.length" v-model="activeGroups">
              <el-collapse-item v-for="group in groupedDocuments" :key="group.key" :name="group.key">
                <template #title>
                  <span class="group-title">{{ group.title }}</span>
                  <small>{{ group.documents.length }} 个文件</small>
                </template>
                <div v-for="document in group.documents" :key="document.id" class="detail-file">
                  <div class="detail-file-inner">
                    <span class="detail-file-icon">
                      <el-icon><Document /></el-icon>
                    </span>
                    <div class="detail-file-text">
                      <el-tooltip effect="light" placement="top-start" popper-class="detail-file-tooltip">
                        <template #content>
                          <div class="detail-file-tooltip-content">{{ fileDescription(document) }}</div>
                        </template>
                        <strong
                          class="detail-file-name"
                          role="button"
                          tabindex="0"
                          @click.stop="openDocumentPreview(document)"
                          @keydown.enter.prevent.stop="openDocumentPreview(document)"
                          @keydown.space.prevent.stop="openDocumentPreview(document)"
                        >
                          {{ document.docName }}
                        </strong>
                      </el-tooltip>
                      <small>{{ fileTypeName(document) }}</small>
                    </div>
                  </div>
                </div>
              </el-collapse-item>
            </el-collapse>
            <el-empty v-else description="暂无知识库文件" :image-size="72" />
          </div>
        </section>
      </template>
    </div>
  </el-drawer>
</template>

<style scoped>
.kb-detail-drawer {
  display: flex;
  height: 100%;
  flex-direction: column;
  min-height: 220px;
}

:deep(.el-drawer__body) {
  overflow: hidden;
  padding-top: 8px;
}

.detail-cover,
.detail-cover-empty {
  width: min(620px, 100%);
  aspect-ratio: 16 / 8;
  margin: 0 auto;
  border-radius: 8px;
  background: #f8fbff;
}

.detail-cover-empty {
  display: grid;
  place-items: center;
  color: #8aa0c4;
  font-size: 42px;
}

.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-top: 20px;
}

.detail-heading p {
  margin: 0 0 5px;
  color: #6e7d91;
  font-size: 12px;
}

.detail-heading h2 {
  margin: 0;
  color: #172033;
  font-size: 24px;
}

.detail-heading :deep(.el-button) {
  width: 112px;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  font-weight: 700;
}

.detail-actions {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 8px;
}

.detail-actions :deep(.el-button + .el-button) {
  margin-left: 0;
}

.detail-heading :deep(.el-button.collected) {
  border-color: #f6b23c;
  background: #f6b23c;
  color: #ffffff;
  box-shadow: 0 8px 16px rgba(246, 178, 60, 0.18);
}

.detail-heading :deep(.my-collection-button) {
  border-color: #f3cf89;
  background: #fff8ec;
  color: #b66b00;
}

.detail-heading :deep(.my-collection-button:hover),
.detail-heading :deep(.my-collection-button:focus-visible) {
  border-color: #e9b85f;
  background: #fff3da;
  color: #995b00;
}

.detail-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
  color: #6e7b8f;
  font-size: 13px;
}

.detail-facts span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.detail-intro {
  margin-top: 24px;
}

.detail-files {
  display: flex;
  min-height: 300px;
  flex: 1;
  flex-direction: column;
  margin-top: 28px;
}

.detail-intro h3,
.detail-files h3 {
  margin: 0 0 12px;
  color: #172033;
  font-size: 16px;
}

.detail-intro p {
  margin: 0;
  color: #5f6d80;
  line-height: 1.8;
  white-space: pre-wrap;
}

.group-title {
  margin-right: 10px;
  font-weight: 650;
}

.detail-files :deep(.el-collapse-item__title small) {
  color: #8a94a4;
  font-size: 11px;
}

.detail-file-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.detail-file {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
}

.detail-file-inner {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 11px;
}

.detail-file-text {
  min-width: 0;
}

.detail-file-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 6px;
  background: #edf4fb;
  color: #2f69ad;
}

.detail-file strong,
.detail-file small {
  display: block;
}

.detail-file strong {
  overflow: hidden;
  color: #344054;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-file-name {
  cursor: pointer;
}

.detail-file-name:hover,
.detail-file-name:focus-visible {
  color: #1d63b7;
  outline: none;
  text-decoration: underline;
}

.detail-file small {
  margin-top: 3px;
  color: #8b95a5;
  font-size: 11px;
}

:global(.detail-file-tooltip) {
  max-width: 320px;
}

:global(.detail-file-tooltip-content) {
  color: #344054;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
