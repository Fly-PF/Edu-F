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
            <el-image v-if="item.kbCover" class="cover-img" :src="coverUrl(item.kbCover)" fit="contain" />
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
  padding: clamp(18px, 3vw, 38px) clamp(18px, 5vw, 80px) 64px;
  background: transparent;
}

.filter-panel {
  position: relative;
  overflow: hidden;
  display: grid;
  gap: 14px;
  width: min(1440px, 100%);
  margin: 0 auto;
  padding: 26px 28px;
  border: 2px solid var(--kb-ink, #3d3564);
  border-radius: 8px;
  background: linear-gradient(118deg, rgb(232 228 255 / 88%) 0%, rgb(249 221 236 / 78%) 48%, rgb(211 242 242 / 86%) 100%);
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
  content: 'MY LAB';
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 11px;
  font-weight: 900;
  transform: rotate(-3deg);
}

.filter-panel::after {
  position: absolute;
  top: -42px;
  right: 6%;
  width: 104px;
  height: 104px;
  border: 2px dashed rgb(61 53 100 / 34%);
  border-radius: 50%;
  content: '';
  opacity: 0.55;
  animation: orbit-drift 12s linear infinite;
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
  min-height: 300px;
  width: min(1440px, 100%);
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
  box-shadow: var(--kb-shadow, 4px 5px 0 rgb(61 53 100 / 14%));
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
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
  background-image: radial-gradient(var(--kb-pink, #ee91bb) 1px, transparent 1px);
  background-size: 12px 12px;
  color: var(--kb-primary, #8178cf);
  font-size: 34px;
}

.card-body {
  display: grid;
  gap: 14px;
  padding: 16px 16px 18px;
  background: #ffffff;
}

.kb-card:nth-child(4n + 1) .card-body {
  background: #f4f2ff;
}

.kb-card:nth-child(4n + 2) .card-body {
  background: #fff3f8;
}

.kb-card:nth-child(4n + 3) .card-body {
  background: #effcfc;
}

.kb-card:nth-child(4n) .card-body {
  background: #fffbe4;
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

.meta-line :deep(.el-tag:nth-child(2)) {
  background: var(--kb-mint, #9de4eb);
  transform: rotate(2deg);
}

.meta-line :deep(.el-tag:nth-child(3)) {
  background: #ffd7e8;
  transform: rotate(-1deg);
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
  .my-kb-page {
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
