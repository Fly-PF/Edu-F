<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { PictureFilled, Search } from '@element-plus/icons-vue'
import { listMyKnowledgeBases } from '@/api/rag'

const apiBaseURL = 'http://localhost:8080'
const router = useRouter()

const loading = ref(false)
const knowledgeBases = ref([])
const filters = reactive({
  keyword: '',
  status: '',
  is_public: '',
  kb_type: '',
})

const statusOptions = [
  { label: '全部', value: '' },
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

const publicOptions = [
  { label: '全部', value: '' },
  { label: '公开', value: 1 },
  { label: '非公开', value: 0 },
]

const typeOptions = [
  { label: '全部', value: '' },
  { label: '课程', value: 2 },
  { label: '教材', value: 3 },
  { label: '政策', value: 4 },
  { label: '其他', value: 1 },
]

const totalText = computed(() => `共${knowledgeBases.value.length}个知识库`)
const queryParams = computed(() => {
  const params = {}
  const keyword = filters.keyword.trim()

  if (keyword) {
    params.keyword = keyword
  }
  if (filters.status !== '') {
    params.status = filters.status
  }
  if (filters.is_public !== '') {
    params.is_public = filters.is_public
  }
  if (filters.kb_type !== '') {
    params.kb_type = filters.kb_type
  }

  return params
})

function coverUrl(objectName) {
  if (!objectName) {
    return ''
  }
  return `${apiBaseURL}/api/rag/kb/cover?objectName=${encodeURIComponent(objectName)}`
}

function typeName(value) {
  return typeOptions.find((item) => item.value === value)?.label || '未知'
}

function publicName(value) {
  return value === 1 ? '公开' : '非公开'
}

function statusName(value) {
  return value === 1 ? '启用' : '停用'
}

function handleCardClick(item) {
  if (item?.id == null) {
    ElMessage.warning('知识库数据缺少ID，暂时无法进入编辑页')
    return
  }

  router.push({
    name: 'knowledge-base-modify',
    query: { kb_id: item.id },
  })
}

async function loadKnowledgeBases() {
  loading.value = true
  try {
    knowledgeBases.value = await listMyKnowledgeBases(queryParams.value)
  } catch (error) {
    ElMessage.error(error?.message || '知识库加载失败')
  } finally {
    loading.value = false
  }
}

watch(queryParams, loadKnowledgeBases)
onMounted(loadKnowledgeBases)
</script>

<template>
  <div class="my-kb-page">
    <section class="filter-panel">
      <div class="filter-head">
        <strong>{{ totalText }}</strong>
        <el-input v-model="filters.keyword" class="search-input" :prefix-icon="Search" clearable placeholder="请输入关键词" />
      </div>

      <div class="filter-row">
        <span>状态：</span>
        <el-radio-group v-model="filters.status">
          <el-radio-button v-for="item in statusOptions" :key="item.label" :value="item.value">{{ item.label }}</el-radio-button>
        </el-radio-group>
      </div>

      <div class="filter-row">
        <span>权限：</span>
        <el-radio-group v-model="filters.is_public">
          <el-radio-button v-for="item in publicOptions" :key="item.label" :value="item.value">{{ item.label }}</el-radio-button>
        </el-radio-group>
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
          @click="handleCardClick(item)"
          @keydown.enter.prevent="handleCardClick(item)"
          @keydown.space.prevent="handleCardClick(item)"
        >
          <div class="cover-wrap">
            <el-image v-if="item.kbCover" class="cover-img" :src="coverUrl(item.kbCover)" fit="cover" />
            <div v-else class="cover-empty">
              <el-icon><PictureFilled /></el-icon>
            </div>
          </div>
          <div class="card-body">
            <h3>{{ item.kbName }}</h3>
            <div class="meta-line">
              <el-tag size="small">{{ typeName(item.kbType) }}</el-tag>
              <el-tag size="small" :type="item.publicFlag === 1 ? 'success' : 'info'">{{ publicName(item.publicFlag) }}</el-tag>
              <el-tag size="small" :type="item.status === 1 ? 'primary' : 'warning'">{{ statusName(item.status) }}</el-tag>
            </div>
          </div>
        </article>
      </div>
      <el-empty v-else description="暂无知识库" />
    </section>
  </div>
</template>

<style scoped>
.my-kb-page {
  height: 100%;
  min-height: 0;
  overflow: auto;
  background: #eef3fb;
}

.filter-panel {
  display: grid;
  gap: 14px;
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
  min-height: 300px;
  width: min(1200px, calc(100% - 48px));
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
  border-radius: 8px;
  border: 1px solid #e6edf7;
  background: #ffffff;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.07);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.kb-card:hover {
  border-color: #cdd9eb;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.12);
  transform: translateY(-3px);
}

.cover-wrap,
.cover-img,
.cover-empty {
  width: 100%;
  aspect-ratio: 16 / 9;
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
  gap: 14px;
  padding: 16px 16px 18px;
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

.meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-line :deep(.el-tag) {
  border-radius: 5px;
  font-weight: 600;
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

  .kb-content {
    padding-inline: 0;
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
