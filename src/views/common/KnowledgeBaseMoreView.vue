<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { PictureFilled, Search } from '@element-plus/icons-vue'
import { getKnowledgeBaseCollectionStatus, pagePublicKnowledgeBases } from '@/api/rag'
import { useUserStore } from '@/stores/user'
import KnowledgeBaseDetailDrawer from './KnowledgeBaseDetailDrawer.vue'

const apiBaseURL = 'http://localhost:8080'
const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const knowledgeBases = ref([])
const total = ref(0)
const detailVisible = ref(false)
const detailKnowledgeBase = ref(null)
const detailCollected = ref(false)
const detailCollectionLoading = ref(false)
const filters = reactive({
  keyword: '',
  kb_type: normalizeType(route.query.kb_type),
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

function normalizeType(value) {
  const type = Number(value)
  return [1, 2, 3, 4].includes(type) ? type : ''
}

function coverUrl(objectName) {
  if (!objectName) {
    return ''
  }
  return `${apiBaseURL}/api/rag/kb/cover?objectName=${encodeURIComponent(objectName)}`
}

function typeName(value) {
  return typeOptions.find((item) => item.value === value)?.label || '未知'
}

function isSelfCreated(item) {
  const kbUserId = Number(item?.userId)
  const currentUserId = Number(userStore.userId)
  return Boolean(kbUserId && currentUserId && kbUserId === currentUserId)
}

async function openDetail(item) {
  detailKnowledgeBase.value = item
  detailCollected.value = false

  if (userStore.isLoggedIn && item?.id && !isSelfCreated(item)) {
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

async function loadKnowledgeBases() {
  loading.value = true
  try {
    const result = await pagePublicKnowledgeBases(buildQueryParams())
    knowledgeBases.value = result?.records || []
    total.value = Number(result?.total || 0)
  } catch (error) {
    ElMessage.error(error?.message || '知识库加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query.kb_type,
  (value) => {
    const nextType = normalizeType(value)
    if (filters.kb_type !== nextType) {
      filters.kb_type = nextType
    }
  },
)

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
  <div class="public-kb-page">
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
              <el-tag size="small" type="success">公开</el-tag>
              <el-tag size="small" type="primary">启用</el-tag>
            </div>
          </div>
        </article>
      </div>
      <el-empty v-else description="暂无知识库" />

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
      @collection-change="handleCollectionChange"
    />
  </div>
</template>

<style scoped>
.public-kb-page {
  height: 100%;
  min-height: 0;
  overflow: auto;
  background: #eef3fb;
}

.filter-panel {
  display: grid;
  gap: 18px;
  width: min(1200px, calc(100% - 48px));
  margin: 18px auto 0;
  padding: 22px 24px 24px;
  border: 1px solid #e6edf7;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.07);
}

.filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.filter-head strong {
  color: #0f172a;
  font-size: 18px;
  line-height: 1.4;
}

.search-input {
  width: min(320px, 100%);
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 6px;
  box-shadow: 0 0 0 1px #d7e0ee inset;
}

.search-input :deep(.el-input__wrapper:hover),
.search-input :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #6366f1 inset, 0 8px 18px rgba(99, 102, 241, 0.12);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.filter-row span {
  flex: 0 0 44px;
  color: #1f2937;
}

.filter-row :deep(.el-radio-button__inner) {
  border: 1px solid #d9e2ef;
  padding: 7px 14px;
  background: transparent;
  box-shadow: none;
  color: #374151;
  font-weight: 600;
  transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.filter-row :deep(.el-radio-button:first-child .el-radio-button__inner) {
  border-radius: 6px 0 0 6px;
}

.filter-row :deep(.el-radio-button:last-child .el-radio-button__inner) {
  border-radius: 0 6px 6px 0;
}

.filter-row :deep(.el-radio-button__inner:hover) {
  color: #4f46e5;
}

.filter-row :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  border-color: #4f46e5;
  background: #4f46e5;
  box-shadow: 0 8px 18px rgba(79, 70, 229, 0.24);
  color: #ffffff;
}

.kb-content {
  width: min(1200px, calc(100% - 48px));
  min-height: 300px;
  margin: 0 auto;
  padding: 22px 0 36px;
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(244px, 1fr));
  gap: 20px;
}

.kb-card {
  overflow: hidden;
  border: 1px solid #e6edf7;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.07);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.kb-card:hover,
.kb-card:focus-visible {
  border-color: #cdd9eb;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
  outline: none;
  transform: translateY(-3px);
}

.cover-wrap,
.cover-img,
.cover-empty {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.cover-wrap {
  background: #f8fbff;
}

.cover-img {
  display: block;
}

.cover-empty {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #e8efff 0%, #f7fafc 100%);
  color: #8aa0c4;
  font-size: 34px;
}

.card-body {
  display: grid;
  gap: 10px;
  padding: 14px 15px 16px;
}

.card-body h3 {
  overflow: hidden;
  margin: 0;
  color: #111827;
  font-size: 17px;
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
  color: #64748b;
  font-size: 13px;
  line-height: 1.55;
}

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-line :deep(.el-tag) {
  border-radius: 5px;
  font-weight: 600;
}

.kb-pagination {
  justify-content: center;
  margin-top: 26px;
}

.kb-content :deep(.el-empty) {
  border: 1px dashed #d6dfec;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

@media (max-width: 640px) {
  .filter-panel,
  .kb-content {
    width: calc(100% - 28px);
  }

  .filter-panel {
    padding-inline: 14px;
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
}
</style>
