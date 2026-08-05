<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { PictureFilled, Search } from '@element-plus/icons-vue'
import { getKnowledgeBaseCollectionStatus, pageCollectedKnowledgeBases } from '@/api/rag'
import { useUserStore } from '@/stores/user'
import KnowledgeBaseDetailDrawer from './KnowledgeBaseDetailDrawer.vue'

const apiBaseURL = (import.meta.env.VITE_APP_REQUEST_BASE_URL || '').replace(/\/$/, '')
const userStore = useUserStore()

const loading = ref(false)
const knowledgeBases = ref([])
const total = ref(0)
const detailVisible = ref(false)
const detailKnowledgeBase = ref(null)
const detailCollected = ref(false)
const detailCollectionLoading = ref(false)
const collectionChanged = ref(false)
const filters = reactive({
  keyword: '',
  kb_type: '',
})
const page = reactive({
  pageNum: 1,
  pageSize: 8,
})

const typeOptions = [
  { label: '全部', value: '' },
  { label: '课程', value: 2 },
  { label: '教材', value: 3 },
  { label: '政策', value: 4 },
  { label: '其他', value: 1 },
]

const totalText = computed(() => `共${total.value}个知识库`)

function coverUrl(objectName) {
  if (!objectName) {
    return ''
  }
  return `${apiBaseURL}/api/rag/kb/cover?objectName=${encodeURIComponent(objectName)}`
}

function typeName(value) {
  return typeOptions.find((item) => item.value === value)?.label || '未知'
}

function buildQueryParams() {
  const params = {
    pageNum: page.pageNum,
    pageSize: page.pageSize,
  }
  const keyword = filters.keyword.trim()

  if (keyword) {
    params.keyword = keyword
  }
  if (filters.kb_type !== '') {
    params.kb_type = filters.kb_type
  }

  return params
}

function isSelfCreated(item) {
  const kbUserId = Number(item?.userId)
  const currentUserId = Number(userStore.userId)
  return Boolean(kbUserId && currentUserId && kbUserId === currentUserId)
}

async function openDetail(item) {
  detailKnowledgeBase.value = item
  detailCollected.value = false
  collectionChanged.value = false

  if (item?.id && !isSelfCreated(item)) {
    detailCollectionLoading.value = true
    try {
      detailCollected.value = Boolean(await getKnowledgeBaseCollectionStatus(item.id))
    } catch (error) {
      detailCollected.value = false
      ElMessage.error(error?.message || '收藏状态加载失败')
    } finally {
      detailCollectionLoading.value = false
    }
  }

  detailVisible.value = true
}

function handleCollectionChange(value) {
  detailCollected.value = value
  collectionChanged.value = true
}

function handleDetailClosed() {
  if (!collectionChanged.value) {
    return
  }
  collectionChanged.value = false
  loadKnowledgeBases()
}

async function loadKnowledgeBases() {
  loading.value = true
  try {
    const result = await pageCollectedKnowledgeBases(buildQueryParams())
    knowledgeBases.value = result?.records || []
    total.value = Number(result?.total || 0)
    if (knowledgeBases.value.length === 0 && page.pageNum > 1) {
      page.pageNum -= 1
    }
  } catch (error) {
    ElMessage.error(error?.message || '知识库加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [filters.keyword, filters.kb_type],
  () => {
    if (page.pageNum === 1) {
      loadKnowledgeBases()
      return
    }
    page.pageNum = 1
  },
)

watch(
  () => page.pageNum,
  loadKnowledgeBases,
)

onMounted(loadKnowledgeBases)
</script>

<template>
  <div class="collection-kb-page">
    <section class="filter-panel">
      <div class="filter-head">
        <strong>{{ totalText }}</strong>
        <el-input v-model="filters.keyword" class="search-input" :prefix-icon="Search" clearable placeholder="请输入关键词" />
      </div>

      <div class="filter-row">
        <span>类型：</span>
        <el-radio-group v-model="filters.kb_type">
          <el-radio-button v-for="item in typeOptions" :key="item.label" :value="item.value">{{ item.label }}</el-radio-button>
        </el-radio-group>
      </div>
    </section>

    <section v-loading="loading" class="kb-content">
      <div v-if="knowledgeBases.length" class="kb-grid">
        <article
          v-for="item in knowledgeBases"
          :key="`${item.id}-${item.kbName}-${item.kbCover}`"
          class="kb-card"
          role="button"
          tabindex="0"
          @click="openDetail(item)"
          @keydown.enter.prevent="openDetail(item)"
          @keydown.space.prevent="openDetail(item)"
        >
          <div class="cover-wrap">
            <el-image v-if="item.kbCover" class="cover-img" :src="coverUrl(item.kbCover)" fit="contain" />
            <div v-else class="cover-empty">
              <el-icon><PictureFilled /></el-icon>
            </div>
          </div>
          <div class="card-body">
            <h3>{{ item.kbName }}</h3>
            <p v-if="item.description">{{ item.description }}</p>
            <div class="meta-line">
              <el-tag size="small">{{ typeName(item.kbType) }}</el-tag>
            </div>
          </div>
        </article>
      </div>
      <el-empty v-else description="暂无收藏知识库" />

      <el-pagination
        v-if="total > page.pageSize"
        v-model:current-page="page.pageNum"
        class="kb-pagination"
        :page-size="page.pageSize"
        :total="total"
        layout="prev, pager, next, jumper"
      />
    </section>

    <KnowledgeBaseDetailDrawer
      v-model="detailVisible"
      :knowledge-base="detailKnowledgeBase"
      :collected="detailCollected"
      :collection-loading="detailCollectionLoading"
      :show-my-collection="false"
      @collection-change="handleCollectionChange"
      @closed="handleDetailClosed"
    />
  </div>
</template>

<style scoped>
.collection-kb-page {
  height: 100%;
  min-height: 0;
  overflow: auto;
  padding: clamp(18px, 3vw, 38px) clamp(18px, 5vw, 80px) 64px;
  background: transparent;
}

.filter-panel {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 18px;
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 26px 28px;
  border: 2px solid var(--kb-ink, #3d3564);
  border-radius: 8px;
  background: linear-gradient(118deg, rgb(249 221 236 / 84%) 0%, rgb(232 228 255 / 78%) 50%, rgb(211 242 242 / 86%) 100%);
  box-shadow: 7px 8px 0 rgb(61 53 100 / 28%);
}

.filter-panel::before {
  position: absolute;
  top: 14px;
  left: 28px;
  padding: 4px 8px;
  border: 1px solid var(--kb-ink, #3d3564);
  border-radius: 4px;
  background: var(--kb-yellow, #fff1a8);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 18%);
  color: var(--kb-ink, #3d3564);
  content: 'STARRED';
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 11px;
  font-weight: 900;
  transform: rotate(3deg);
}

.filter-panel::after {
  position: absolute;
  right: 8%;
  bottom: -34px;
  width: 90px;
  height: 90px;
  border: 2px dashed rgb(61 53 100 / 34%);
  border-radius: 50%;
  content: '';
  opacity: 0.52;
  animation: orbit-drift 12s linear infinite reverse;
}

.filter-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 18px;
}

.filter-head strong {
  color: var(--kb-ink, #3d3564);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 22px;
  font-weight: 900;
  line-height: 1.4;
}

.search-input {
  width: min(320px, 100%);
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 5px;
  background: rgb(255 255 255 / 90%);
  box-shadow: 0 0 0 1px rgb(61 53 100 / 42%) inset;
}

.search-input :deep(.el-input__wrapper:hover),
.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px var(--kb-primary, #8178cf) inset, 3px 4px 0 rgb(61 53 100 / 14%);
}

.filter-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--kb-ink, #3d3564);
  font-size: 14px;
  font-weight: 800;
}

.filter-row span {
  flex: 0 0 44px;
  color: var(--kb-ink-soft, #4e4473);
}

.filter-row :deep(.el-radio-button__inner) {
  border: 1px solid rgb(61 53 100 / 38%);
  padding: 7px 14px;
  background: rgb(255 255 255 / 78%);
  box-shadow: none;
  color: var(--kb-ink, #3d3564);
  font-weight: 800;
  white-space: nowrap;
  transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.filter-row :deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 6px 0 0 6px;
}

.filter-row :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 6px 6px 0;
}

.filter-row :deep(.el-radio-button__inner:hover) {
  border-color: var(--kb-ink-soft, #4e4473);
  background: #ffffff;
  color: var(--kb-ink, #3d3564);
}

.filter-row :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  border-color: var(--kb-ink-soft, #4e4473);
  background: var(--kb-primary, #8178cf);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 20%);
  color: #ffffff;
}

.kb-content {
  width: min(1440px, 100%);
  min-height: 300px;
  margin: 0 auto;
  padding: 28px 0 36px;
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 22px;
}

.kb-card {
  overflow: hidden;
  border: 2px solid var(--kb-ink, #3d3564);
  border-radius: 7px;
  background: #ffffff;
  cursor: pointer;
  box-shadow: var(--kb-shadow, 4px 5px 0 rgb(61 53 100 / 14%));
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.kb-card:hover,
.kb-card:focus-visible {
  border-color: var(--kb-ink-soft, #4e4473);
  box-shadow: 7px 8px 0 rgb(61 53 100 / 24%);
  outline: none;
  transform: translate(-2px, -2px);
}

.cover-wrap,
.cover-img,
.cover-empty {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.cover-wrap {
  background: #f7f5ff;
}

.cover-img {
  display: block;
}

.cover-empty {
  display: grid;
  place-items: center;
  background-color: #f7f5ff;
  background-image: radial-gradient(var(--kb-mint, #9de4eb) 1px, transparent 1px);
  background-size: 12px 12px;
  color: var(--kb-primary, #8178cf);
  font-size: 34px;
}

.card-body {
  display: grid;
  gap: 10px;
  padding: 14px 15px 16px;
  background: #ffffff;
}

.kb-card:nth-child(4n + 1) .card-body {
  background: #fff3f8;
}

.kb-card:nth-child(4n + 2) .card-body {
  background: #effcfc;
}

.kb-card:nth-child(4n + 3) .card-body {
  background: #fffbe4;
}

.kb-card:nth-child(4n) .card-body {
  background: #f4f2ff;
}

.card-body h3 {
  overflow: hidden;
  margin: 0;
  color: var(--kb-ink, #3d3564);
  font-size: 17px;
  font-weight: 900;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-body p {
  display: -webkit-box;
  min-height: 40px;
  overflow: hidden;
  margin: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--kb-ink-soft, #4e4473);
  font-size: 13px;
  line-height: 1.55;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-line :deep(.el-tag) {
  border: 1px solid rgb(61 53 100 / 44%);
  border-radius: 4px;
  background: var(--kb-yellow, #fff1a8);
  box-shadow: 2px 2px 0 rgb(61 53 100 / 12%);
  color: var(--kb-ink, #3d3564);
  font-weight: 800;
  transform: rotate(-2deg);
}

.kb-pagination {
  justify-content: center;
  margin-top: 26px;
}

.kb-pagination :deep(.el-pager li),
.kb-pagination :deep(.btn-prev),
.kb-pagination :deep(.btn-next) {
  border: 1px solid rgb(61 53 100 / 34%);
  border-radius: 4px;
  background: #ffffff;
  color: var(--kb-ink, #3d3564);
  font-weight: 800;
}

.kb-pagination :deep(.el-pager li.is-active) {
  border-color: var(--kb-ink-soft, #4e4473);
  background: var(--kb-primary, #8178cf);
  color: #ffffff;
}

.kb-content :deep(.el-empty) {
  min-height: 260px;
  border: 2px dashed rgb(61 53 100 / 48%);
  border-radius: 7px;
  background: rgb(255 255 255 / 80%);
  box-shadow: var(--kb-shadow, 4px 5px 0 rgb(61 53 100 / 14%));
}

@keyframes orbit-drift {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .collection-kb-page {
    padding: 18px 16px 40px;
  }

  .filter-panel {
    padding: 38px 16px 18px;
  }

  .filter-head {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .filter-row span {
    flex-basis: auto;
  }

  .filter-row :deep(.el-radio-group) {
    display: flex;
    flex-wrap: wrap;
  }

  .filter-row :deep(.el-radio-button__inner) {
    border-radius: 5px;
  }

  .kb-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 641px) and (max-width: 1100px) {
  .kb-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .filter-panel::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
