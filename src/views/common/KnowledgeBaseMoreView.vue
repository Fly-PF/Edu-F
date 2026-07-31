<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Compass, PictureFilled, Search } from '@element-plus/icons-vue'
import { getKnowledgeBaseCollectionStatus, pagePublicKnowledgeBases } from '@/api/rag'
import { useUserStore } from '@/stores/user'
import KnowledgeBaseDetailDrawer from './KnowledgeBaseDetailDrawer.vue'

const apiBaseURL = 'http://localhost:8080'
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const knowledgeBases = ref([])
const total = ref(0)
const detailVisible = ref(false)
const detailKnowledgeBase = ref(null)
const detailCollected = ref(false)
const detailCollectionLoading = ref(false)
const searchInput = ref(null)
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

function focusSearch() {
  nextTick(() => searchInput.value?.focus())
}

function startExploring() {
  router.push('/main/knowledge-qa/chat')
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
    <section class="explore-hero" aria-labelledby="explore-title">
      <div class="hero-copy">
        <span class="hero-sticker">KNOWLEDGE BASE</span>
        <h1 id="explore-title">知识库探索站</h1>
        <p>按主题发现公开知识库，把好奇的问题变成清晰的答案。</p>
        <el-button class="hero-action" :icon="Compass" @click="startExploring">进入知识问答</el-button>
      </div>
      <div class="hero-art" aria-hidden="true">
        <span class="hero-orbit orbit-primary"><i class="orbit-core"></i></span>
        <span class="hero-orbit orbit-secondary"></span>
        <span class="hero-star star-one">+</span>
        <span class="hero-star star-two">*</span>
        <span class="hero-note note-idea">IDEA</span>
        <span class="hero-note note-make">MAKE</span>
        <span class="hero-dot dot-pink"></span>
        <span class="hero-dot dot-mint"></span>
      </div>
    </section>

    <section class="filter-panel" aria-label="知识库筛选">
      <div class="filter-head">
        <span class="filter-sticker">知识库清单</span>
        <strong>{{ totalText }}</strong>
        <span class="filter-tip">按类型发现公开知识库</span>
      </div>
      <el-input ref="searchInput" v-model="filters.keyword" class="search-input" :prefix-icon="Search" clearable placeholder="搜索知识库" />
      <div class="filter-row">
        <span>类型：</span>
        <el-radio-group v-model="filters.kb_type" class="type-group" aria-label="知识库类型">
          <el-radio-button v-for="item in typeOptions" :key="item.label" :value="item.value">{{ item.label }}</el-radio-button>
        </el-radio-group>
      </div>
    </section>

    <section
      v-loading="loading"
      element-loading-text="正在准备探索清单..."
      element-loading-background="rgb(251 251 255 / 78%)"
      class="kb-content"
      :aria-busy="loading"
    >
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
            <p>{{ item.description || '这座知识库正在等你探索。' }}</p>
            <div class="meta-line">
              <el-tag size="small" :class="`tag-type-${item.kbType}`">{{ typeName(item.kbType) }}</el-tag>
              <el-tag size="small" class="tag-public">公开</el-tag>
              <el-tag size="small" class="tag-active">启用</el-tag>
            </div>
          </div>
        </article>
      </div>
      <el-empty v-else description="暂时没有找到知识库" />

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
  --kb-ink: #3d3564;
  --kb-ink-soft: #4e4473;
  --kb-primary: #8178cf;
  --kb-pink: #ee91bb;
  --kb-mint: #9de4eb;
  --kb-mint-strong: #52bbc4;
  --kb-yellow: #fff1a8;
  --kb-paper: #fbfbff;
  --kb-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
  --kb-strong-shadow: 7px 8px 0 rgb(61 53 100 / 70%);
  min-height: 100%;
  padding: 26px clamp(18px, 5vw, 80px) 44px;
  background-color: var(--kb-paper);
  background-image: linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px), linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--kb-ink);
  font-family: 'Microsoft YaHei', system-ui, sans-serif;
}

.explore-hero,
.filter-panel,
.kb-content {
  width: min(1600px, 100%);
  margin-inline: auto;
}

.explore-hero {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(290px, 0.8fr);
  min-height: 278px;
  overflow: hidden;
  padding: 36px clamp(30px, 4vw, 58px);
  border: 2px solid var(--kb-ink);
  border-radius: 10px;
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%);
  box-shadow: var(--kb-strong-shadow);
}

.hero-copy {
  position: relative;
  z-index: 2;
  align-self: center;
  max-width: 660px;
}

.hero-sticker,
.filter-sticker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid var(--kb-ink);
  border-radius: 5px;
  background: var(--kb-yellow);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 20%);
  color: var(--kb-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  transform: rotate(-3deg);
}

.hero-copy h1 {
  margin: 16px 0 12px;
  color: var(--kb-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 56px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.1;
}

.hero-copy p {
  max-width: 540px;
  margin: 0;
  color: var(--kb-ink-soft);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.75;
}

.hero-action {
  min-height: 40px;
  margin-top: 22px;
  padding-inline: 18px;
  border: 1px solid var(--kb-ink-soft);
  border-radius: 5px;
  background: var(--kb-primary);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
  color: #ffffff;
  font-weight: 800;
  white-space: nowrap;
  word-break: keep-all;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.hero-action:hover {
  border-color: var(--kb-ink);
  background: #7167bd;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 30%);
  color: #ffffff;
  transform: translate(-2px, -2px);
}

.hero-action:focus-visible {
  outline: 3px solid var(--kb-yellow);
  outline-offset: 3px;
}

.hero-action.is-disabled,
.hero-action.is-disabled:hover {
  border-color: rgb(61 53 100 / 22%);
  background: #c9c4e9;
  box-shadow: none;
  color: rgb(61 53 100 / 56%);
  transform: none;
}

.hero-art {
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 1;
  width: min(47%, 600px);
  pointer-events: none;
}

.hero-orbit {
  position: absolute;
  display: block;
  border: 2px dashed var(--kb-ink);
  border-radius: 50%;
  opacity: 0.68;
  animation: kb-orbit-spin 15s linear infinite;
}

.orbit-primary {
  top: 22px;
  right: 46px;
  width: 260px;
  aspect-ratio: 1.35;
  transform: rotate(-19deg);
}

.orbit-secondary {
  right: 94px;
  bottom: 24px;
  width: 224px;
  aspect-ratio: 1.35;
  border-color: var(--kb-pink);
  transform: rotate(28deg);
  animation-direction: reverse;
}

.orbit-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 76px;
  aspect-ratio: 1;
  border: 2px solid var(--kb-ink);
  border-radius: 50%;
  background: var(--kb-mint);
  box-shadow: 5px 5px 0 rgb(61 53 100 / 18%);
  transform: translate(-50%, -50%);
}

.hero-star {
  position: absolute;
  color: var(--kb-ink);
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  animation: kb-star-breathe 4.5s ease-in-out infinite;
}

.star-one { top: 40px; right: 30px; color: var(--kb-primary); }
.star-two { right: 260px; bottom: 26px; color: var(--kb-pink); animation-delay: -2s; }

.hero-note {
  position: absolute;
  display: grid;
  min-width: 68px;
  min-height: 44px;
  place-items: center;
  padding: 6px 10px;
  border: 1px solid var(--kb-ink);
  border-radius: 5px;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 18%);
  color: var(--kb-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0;
  animation: kb-note-float 6s ease-in-out infinite;
}

.note-idea { top: 56px; right: 142px; background: var(--kb-yellow); transform: rotate(7deg); }
.note-make { right: 42px; bottom: 50px; background: var(--kb-mint); transform: rotate(-5deg); animation-delay: -3s; }

.hero-dot {
  position: absolute;
  width: 18px;
  aspect-ratio: 1;
  border: 1px solid var(--kb-ink);
  border-radius: 50%;
  animation: kb-note-float 7s ease-in-out infinite;
}

.dot-pink { top: 116px; right: 302px; background: var(--kb-pink); }
.dot-mint { right: 218px; bottom: 40px; background: var(--kb-mint-strong); animation-delay: -4s; }

.filter-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 18px 28px;
  margin-top: 34px;
  padding: 22px 24px;
  border: 1px solid rgb(61 53 100 / 52%);
  border-radius: 8px;
  background: rgb(255 255 255 / 92%);
  box-shadow: var(--kb-shadow);
}

.filter-head { display: flex; align-items: center; gap: 12px; min-width: 0; }
.filter-head strong { color: var(--kb-ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 22px; font-weight: 900; line-height: 1.4; white-space: nowrap; word-break: keep-all; }
.filter-tip { overflow: hidden; color: var(--kb-ink-soft); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.search-input { width: 100%; }
.search-input :deep(.el-input__wrapper) { min-height: 38px; border-radius: 5px; background: #ffffff; box-shadow: 0 0 0 1px rgb(61 53 100 / 40%) inset; }
.search-input :deep(.el-input__wrapper:hover),
.search-input :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px var(--kb-primary) inset, 3px 4px 0 rgb(61 53 100 / 14%); }
.search-input :deep(.el-input__inner) { color: var(--kb-ink); font-weight: 600; }

.filter-row { display: flex; grid-column: 1 / -1; align-items: center; gap: 14px; color: var(--kb-ink); font-size: 14px; font-weight: 800; }
.filter-row > span { flex: 0 0 44px; color: var(--kb-ink); white-space: nowrap; word-break: keep-all; }
.type-group { display: flex; flex-wrap: wrap; gap: 8px; }
.filter-row :deep(.el-radio-button__inner) { border: 1px solid rgb(61 53 100 / 42%); border-radius: 5px; padding: 7px 14px; background: #ffffff; box-shadow: none; color: var(--kb-ink); font-weight: 800; white-space: nowrap; word-break: keep-all; transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease; }
.filter-row :deep(.el-radio-button:first-child .el-radio-button__inner),
.filter-row :deep(.el-radio-button:last-child .el-radio-button__inner) { border-radius: 5px; }
.filter-row :deep(.el-radio-button__inner:hover) { border-color: var(--kb-primary); color: var(--kb-primary); }
.filter-row :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { border-color: var(--kb-ink-soft); background: var(--kb-primary); box-shadow: 3px 3px 0 rgb(61 53 100 / 28%); color: #ffffff; }

.kb-content { min-height: 300px; padding-top: 28px; }
.kb-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 24px; }
.kb-card { overflow: hidden; border: 1px solid rgb(61 53 100 / 62%); border-radius: 8px; background: #ffffff; cursor: pointer; box-shadow: var(--kb-shadow); transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease; }
.kb-card:nth-child(4n + 1) .cover-wrap { background: #f3f1ff; }
.kb-card:nth-child(4n + 2) .cover-wrap { background: #fff1f7; }
.kb-card:nth-child(4n + 3) .cover-wrap { background: #edfbfa; }
.kb-card:nth-child(4n) .cover-wrap { background: #fffbe1; }
.kb-card:hover,
.kb-card:focus-visible { border-color: var(--kb-ink); box-shadow: 6px 7px 0 rgb(61 53 100 / 22%); outline: none; transform: translate(-2px, -3px); }
.cover-wrap,
.cover-img,
.cover-empty { width: 100%; aspect-ratio: 16 / 9; }
.cover-wrap { background: #f3f1ff; }
.cover-img { display: block; }
.cover-empty { display: grid; place-items: center; background-image: radial-gradient(circle, rgb(129 120 207 / 18%) 1.5px, transparent 1.5px); background-size: 14px 14px; color: var(--kb-primary); font-size: 34px; }
.card-body { display: grid; gap: 10px; min-height: 146px; padding: 14px 15px 16px; }
.card-body h3 { overflow: hidden; margin: 0; color: var(--kb-ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 17px; font-weight: 900; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.card-body p { display: -webkit-box; min-height: 40px; overflow: hidden; margin: 0; -webkit-box-orient: vertical; -webkit-line-clamp: 2; color: var(--kb-ink-soft); font-size: 13px; font-weight: 600; line-height: 1.55; }
.meta-line { display: flex; flex-wrap: wrap; gap: 8px; }
.meta-line :deep(.el-tag) { border: 1px solid rgb(61 53 100 / 34%); border-radius: 5px; font-weight: 800; white-space: nowrap; word-break: keep-all; }
.meta-line :deep(.tag-type-1),
.meta-line :deep(.tag-public) { background: #fff1f7; color: #a44877; }
.meta-line :deep(.tag-type-2),
.meta-line :deep(.tag-active) { background: #f3f1ff; color: #5b53a5; }
.meta-line :deep(.tag-type-3) { background: #fffbe1; color: #806719; }
.meta-line :deep(.tag-type-4) { background: #edfbfa; color: #287e85; }
.kb-pagination { justify-content: center; margin-top: 26px; }
.kb-pagination :deep(.btn-prev),
.kb-pagination :deep(.btn-next),
.kb-pagination :deep(.number),
.kb-pagination :deep(.el-pagination__jump) { color: var(--kb-ink); font-weight: 800; }
.kb-pagination :deep(.number.is-active) { color: var(--kb-primary); }
.kb-pagination :deep(.el-input__wrapper) { border-radius: 5px; box-shadow: 0 0 0 1px rgb(61 53 100 / 35%) inset; }
.kb-content :deep(.el-empty) { min-height: 260px; border: 2px dashed rgb(61 53 100 / 42%); border-radius: 8px; background: rgb(255 255 255 / 72%); box-shadow: var(--kb-shadow); }
.kb-content :deep(.el-empty__description p) { color: var(--kb-ink-soft); font-weight: 800; }

@keyframes kb-orbit-spin { to { rotate: 360deg; } }
@keyframes kb-star-breathe { 50% { opacity: 0.55; transform: scale(1.12); } }
@keyframes kb-note-float { 50% { translate: 0 -8px; } }

@media (max-width: 1100px) {
  .kb-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 840px) {
  .public-kb-page { padding-top: 20px; }
  .explore-hero { grid-template-columns: minmax(0, 1fr); min-height: 300px; }
  .hero-art { width: 52%; opacity: 0.56; }
  .filter-panel { grid-template-columns: 1fr; }
  .search-input { grid-column: auto; }
  .kb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .public-kb-page { padding: 16px 16px 32px; }
  .explore-hero { min-height: 290px; padding: 28px 24px; }
  .hero-copy h1 { font-size: 42px; }
  .hero-copy p { max-width: 330px; font-size: 15px; }
  .hero-art { width: 68%; opacity: 0.35; }
  .orbit-primary { right: -40px; width: 220px; }
  .orbit-secondary { right: -18px; width: 170px; }
  .star-two,
  .dot-pink { display: none; }
  .filter-panel { gap: 16px; margin-top: 26px; padding: 18px; }
  .filter-head { align-items: stretch; flex-direction: column; gap: 8px; }
  .filter-sticker { align-self: flex-start; }
  .filter-tip { overflow: visible; text-overflow: clip; white-space: normal; }
  .filter-row { align-items: flex-start; flex-direction: column; gap: 9px; }
  .filter-row > span { flex-basis: auto; }
  .type-group { gap: 7px; }
  .filter-row :deep(.el-radio-button__inner) { padding: 7px 11px; }
  .kb-content { padding-top: 24px; }
  .kb-grid { grid-template-columns: 1fr; gap: 20px; }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
}
</style>
