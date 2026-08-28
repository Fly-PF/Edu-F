<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { FolderOpened, Link, Search, View, Document } from '@element-plus/icons-vue'
import { listEnabledGovMaterialCategories, listPublishedGovMaterials } from '@/api/govMaterial'

const loading = ref(false)
const categories = ref([])
const materials = ref([])
const selectedCategoryId = ref('')
const keyword = ref('')
const selectedType = ref('')
const linkDialogVisible = ref(false)
const linkDialogMaterial = ref(null)
const router = useRouter()

const platformLabel = computed(() => ({
  BAIDU: '百度网盘',
  QUARK: '夸克网盘',
}))

const filteredMaterials = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  return materials.value.filter((item) => {
    const matchesKeyword = !value || [item.title, item.description, item.categoryName]
      .some((field) => String(field || '').toLowerCase().includes(value))
    const matchesType = selectedType.value === '' || Number(item.materialType) === Number(selectedType.value)
    return matchesKeyword && matchesType
  })
})

const totalText = computed(() => `共${filteredMaterials.value.length}份资料`)

async function loadCategories() {
  try {
    const res = await listEnabledGovMaterialCategories()
    if (res?.code === 200) {
      categories.value = res.data || []
    }
  } catch (error) {
    categories.value = []
    ElMessage.error(error?.message || '分类加载失败')
  }
}

async function loadMaterials() {
  loading.value = true
  try {
    const categoryId = selectedCategoryId.value || null
    const res = await listPublishedGovMaterials(categoryId)
    if (res?.code === 200) {
      materials.value = res.data || []
    }
  } catch (error) {
    materials.value = []
    ElMessage.error(error?.message || '资料加载失败')
  } finally {
    loading.value = false
  }
}

function handleCategoryChange() {
  loadMaterials()
}

function openMaterial(item) {
  if (Number(item.materialType) === 1) {
    router.push({ name: 'gov-material-preview', query: { id: item.id } })
    return
  }
  linkDialogMaterial.value = item
  linkDialogVisible.value = true
}

function openLink(url) {
  if (!url) return
  window.open(url, '_blank', 'noopener,noreferrer')
}

function normalizePlatform(platform) {
  const key = String(platform || '').toUpperCase()
  return platformLabel.value[key] || platform || '网盘链接'
}

onMounted(() => {
  loadCategories()
  loadMaterials()
})
</script>

<template>
  <main class="gov-material-page">
    <header class="material-hero" aria-labelledby="material-page-title">
      <div class="hero-copy">
        <span class="hero-sticker"><el-icon class="hero-icon"><FolderOpened /></el-icon> GOV MATERIALS</span>
        <h1 id="material-page-title">考公资料下载</h1>
        <p class="hero-description">按分类和类型浏览管理员维护的备考资料。</p>
      </div>
      <div class="hero-art" aria-hidden="true">
        <span class="hero-orbit orbit-primary"><i class="orbit-core"></i></span>
        <span class="hero-orbit orbit-secondary"></span>
        <span class="hero-star star-one">+</span>
        <span class="hero-star star-two">*</span>
        <span class="hero-note note-idea">PLAN</span>
        <span class="hero-note note-make">PASS</span>
        <span class="hero-dot dot-pink"></span>
        <span class="hero-dot dot-mint"></span>
      </div>
    </header>

    <section class="filter-panel" aria-label="资料筛选">
      <div class="filter-head">
        <span class="filter-sticker">资料清单</span>
        <strong>{{ totalText }}</strong>
        <span class="filter-tip">按分类找到适合你的备考资料</span>
      </div>
      <el-input
        v-model="keyword"
        class="search-input"
        :prefix-icon="Search"
        clearable
        placeholder="搜索资料标题或说明"
      />
      <div class="filter-row">
        <span>分类：</span>
        <el-radio-group v-model="selectedCategoryId" class="category-group" aria-label="资料分类" @change="handleCategoryChange">
          <el-radio-button :value="''">全部</el-radio-button>
          <el-radio-button v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </el-radio-button>
        </el-radio-group>
      </div>
      <div class="filter-row">
        <span>类型：</span>
        <el-radio-group v-model="selectedType" class="category-group" aria-label="资料类型">
          <el-radio-button :value="''">全部</el-radio-button>
          <el-radio-button :value="0">网盘</el-radio-button>
          <el-radio-button :value="1">文件</el-radio-button>
        </el-radio-group>
      </div>
    </section>

    <section
      v-loading="loading"
      class="material-list"
      element-loading-text="正在准备资料清单..."
      element-loading-background="rgb(251 251 255 / 78%)"
      :aria-busy="loading"
    >
      <article v-for="item in filteredMaterials" :key="item.id" class="material-card">
        <div class="material-header">
          <h3>{{ item.title }}</h3>
          <span class="category-tag">{{ item.categoryName || '-' }}</span>
        </div>
        <p v-if="item.description" class="material-desc">{{ item.description }}</p>
        <div v-if="Number(item.materialType) === 0" class="link-group">
          <div v-for="(link, index) in item.links" :key="index" class="link-item">
            <el-button
              type="primary"
              link
              :icon="Link"
              @click="openLink(link.url)"
            >
              {{ normalizePlatform(link.platform) }}
            </el-button>
            <span v-if="link.accessCode" class="access-code">提取码：{{ link.accessCode }}</span>
          </div>
        </div>
        <div v-else class="file-summary">
          <el-icon><Document /></el-icon>
          <span>{{ item.fileName || 'PDF文件' }}</span>
        </div>
        <div class="card-actions">
          <el-button type="primary" :icon="View" @click="openMaterial(item)">查看</el-button>
        </div>
      </article>
      <el-empty v-if="!loading && !filteredMaterials.length" description="暂时没有找到资料" :image-size="96" />
    </section>
    <el-dialog
      v-model="linkDialogVisible"
      :title="linkDialogMaterial?.title || '网盘链接'"
      width="min(620px, 92vw)"
      append-to-body
    >
      <div class="dialog-link-list">
        <div v-for="(link, index) in linkDialogMaterial?.links || []" :key="index" class="dialog-link-item">
          <div>
            <strong>{{ normalizePlatform(link.platform) }}</strong>
            <span v-if="link.accessCode">提取码：{{ link.accessCode }}</span>
          </div>
          <el-button type="primary" link :icon="Link" @click="openLink(link.url)">打开链接</el-button>
        </div>
        <el-empty v-if="!linkDialogMaterial?.links?.length" description="暂无网盘链接" :image-size="72" />
      </div>
    </el-dialog>
  </main>
</template>

<style scoped>
.gov-material-page {
  --material-ink: #3d3564;
  --material-ink-soft: #4e4473;
  --material-primary: #8178cf;
  --material-pink: #ee91bb;
  --material-mint: #9de4eb;
  --material-yellow: #fff1a8;
  --material-paper: #fbfbff;
  --material-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
  --material-strong-shadow: 7px 8px 0 rgb(61 53 100 / 70%);
  min-height: 100%;
  padding: 26px clamp(18px, 5vw, 80px) 44px;
  background-color: var(--material-paper);
  background-image: linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px), linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--material-ink);
  font-family: 'Microsoft YaHei', system-ui, sans-serif;
}
.material-hero,
.filter-panel,
.material-list {
  width: min(1600px, 100%);
  margin-inline: auto;
}
.material-hero {
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(290px, 0.8fr);
  min-height: 278px;
  overflow: hidden;
  padding: 36px clamp(30px, 4vw, 58px);
  border: 2px solid var(--material-ink);
  border-radius: 10px;
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%);
  box-shadow: var(--material-strong-shadow);
}
.hero-copy {
  position: relative;
  z-index: 2;
  align-self: center;
  max-width: 640px;
}
.hero-sticker,
.filter-sticker {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px solid var(--material-ink);
  border-radius: 5px;
  background: var(--material-yellow);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 20%);
  color: var(--material-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0;
  transform: rotate(-3deg);
}
.hero-icon {
  width: 18px;
  height: 18px;
  margin-right: 6px;
}
.material-hero h1 {
  margin: 16px 0 12px;
  color: var(--material-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 56px;
  font-weight: 900;
  line-height: 1.1;
}
.hero-description {
  max-width: 540px;
  margin: 0;
  color: var(--material-ink-soft);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.75;
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
  border: 2px dashed var(--material-ink);
  border-radius: 50%;
  opacity: 0.68;
  animation: material-orbit-spin 15s linear infinite;
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
  border-color: var(--material-pink);
  transform: rotate(28deg);
  animation-direction: reverse;
}
.orbit-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 76px;
  aspect-ratio: 1;
  border: 2px solid var(--material-ink);
  border-radius: 50%;
  background: var(--material-mint);
  box-shadow: 5px 5px 0 rgb(61 53 100 / 18%);
  transform: translate(-50%, -50%);
}
.hero-star {
  position: absolute;
  color: var(--material-ink);
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 38px;
  font-weight: 800;
  line-height: 1;
  animation: material-breathe 4.5s ease-in-out infinite;
}
.star-one { top: 40px; right: 30px; color: var(--material-primary); }
.star-two { right: 260px; bottom: 26px; color: var(--material-pink); animation-delay: -2s; }
.hero-note {
  position: absolute;
  display: grid;
  min-width: 68px;
  min-height: 44px;
  place-items: center;
  padding: 6px 10px;
  border: 1px solid var(--material-ink);
  border-radius: 5px;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 18%);
  color: var(--material-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 12px;
  font-weight: 900;
  animation: material-float 6s ease-in-out infinite;
}
.note-idea { top: 56px; right: 142px; background: var(--material-yellow); transform: rotate(7deg); }
.note-make { right: 42px; bottom: 50px; background: var(--material-mint); transform: rotate(-5deg); animation-delay: -3s; }
.hero-dot {
  position: absolute;
  width: 18px;
  aspect-ratio: 1;
  border: 1px solid var(--material-ink);
  border-radius: 50%;
  animation: material-float 7s ease-in-out infinite;
}
.dot-pink { top: 116px; right: 302px; background: var(--material-pink); }
.dot-mint { right: 218px; bottom: 40px; background: #52bbc4; animation-delay: -4s; }
.filter-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 340px);
  gap: 18px 28px;
  margin-top: 34px;
  padding: 22px 24px;
  border: 1px solid rgb(61 53 100 / 52%);
  border-radius: 8px;
  background: rgb(255 255 255 / 92%);
  box-shadow: var(--material-shadow);
}
.filter-head { display: flex; align-items: center; gap: 12px; min-width: 0; }
.filter-head strong { color: var(--material-ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 22px; font-weight: 900; line-height: 1.4; white-space: nowrap; }
.filter-tip { overflow: hidden; color: var(--material-ink-soft); font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.search-input { width: 100%; }
.search-input :deep(.el-input__wrapper) { min-height: 38px; border-radius: 5px; background: #ffffff; box-shadow: 0 0 0 1px rgb(61 53 100 / 40%) inset; }
.search-input :deep(.el-input__wrapper:hover),
.search-input :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 2px var(--material-primary) inset, 3px 4px 0 rgb(61 53 100 / 14%); }
.search-input :deep(.el-input__inner) { color: var(--material-ink); font-weight: 600; }
.filter-row { display: flex; grid-column: 1 / -1; align-items: center; gap: 14px; color: var(--material-ink); font-size: 14px; font-weight: 800; }
.filter-row > span { flex: 0 0 44px; white-space: nowrap; }
.category-group { display: flex; flex-wrap: wrap; gap: 8px; }
.filter-row :deep(.el-radio-button__inner) { border: 1px solid rgb(61 53 100 / 42%); border-radius: 5px; padding: 7px 14px; background: #ffffff; box-shadow: none; color: var(--material-ink); font-weight: 800; white-space: nowrap; transition: color .18s ease, border-color .18s ease, background .18s ease, box-shadow .18s ease; }
.filter-row :deep(.el-radio-button:first-child .el-radio-button__inner),
.filter-row :deep(.el-radio-button:last-child .el-radio-button__inner) { border-radius: 5px; }
.filter-row :deep(.el-radio-button__inner:hover) { border-color: var(--material-primary); color: var(--material-primary); }
.filter-row :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) { border-color: var(--material-ink-soft); background: var(--material-primary); box-shadow: 3px 3px 0 rgb(61 53 100 / 28%); color: #ffffff; }
.material-list { display: grid; align-content: start; gap: 16px; min-height: 300px; padding-top: 28px; }
.material-card { position: relative; overflow: hidden; padding: 20px 24px 18px 28px; border: 1px solid rgb(61 53 100 / 58%); border-radius: 8px; background: #ffffff; box-shadow: var(--material-shadow); transition: border-color .18s ease, box-shadow .18s ease, transform .18s ease; }
.material-card::before { position: absolute; inset: 0 auto 0 0; width: 7px; background: var(--material-primary); content: ''; }
.material-card:nth-child(3n + 1) { background: #ffffff; }
.material-card:nth-child(3n + 1)::before { background: var(--material-primary); }
.material-card:nth-child(3n + 2) { background: #fffafd; }
.material-card:nth-child(3n + 2)::before { background: var(--material-pink); }
.material-card:nth-child(3n)::before { background: #52bbc4; }
.material-card:hover { border-color: var(--material-ink); box-shadow: 6px 7px 0 rgb(61 53 100 / 22%); transform: translate(-2px, -3px); }
.material-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.material-header h3 { margin: 0; color: var(--material-ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 19px; font-weight: 900; line-height: 1.4; }
.category-tag { flex-shrink: 0; padding: 4px 10px; border: 1px solid rgb(61 53 100 / 34%); border-radius: 5px; background: var(--material-yellow); box-shadow: 2px 2px 0 rgb(61 53 100 / 12%); color: #806719; font-size: 12px; font-weight: 800; }
.material-desc { margin: 9px 0 0; color: var(--material-ink-soft); font-size: 14px; line-height: 1.7; }
.link-group { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px; padding-top: 13px; border-top: 1px dashed rgb(61 53 100 / 22%); }
.link-item { display: flex; align-items: center; gap: 8px; padding: 6px 11px; border: 1px solid rgb(61 53 100 / 25%); border-radius: 5px; background: rgb(243 241 255 / 78%); box-shadow: 2px 2px 0 rgb(61 53 100 / 10%); }
.link-item :deep(.el-button) { color: var(--material-primary); font-size: 13px; font-weight: 800; }
.access-code { color: var(--material-ink-soft); font-size: 13px; font-weight: 600; }
.file-summary { display: flex; align-items: center; gap: 8px; margin-top: 15px; padding-top: 13px; border-top: 1px dashed rgb(61 53 100 / 22%); color: var(--material-ink-soft); font-size: 13px; font-weight: 700; }
.file-summary .el-icon { color: var(--material-primary); font-size: 18px; }
.file-summary span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card-actions { display: flex; justify-content: flex-end; margin-top: 14px; }
.card-actions :deep(.el-button) { border-radius: 5px; font-weight: 800; }
.dialog-link-list { display: grid; gap: 12px; }
.dialog-link-item { display: flex; align-items: center; justify-content: space-between; gap: 14px; min-width: 0; padding: 12px 14px; border: 1px solid rgb(61 53 100 / 20%); border-radius: 5px; background: #fbfaff; }
.dialog-link-item > div { display: grid; min-width: 0; gap: 5px; }
.dialog-link-item strong, .dialog-link-item span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dialog-link-item strong { color: var(--material-ink); }
.dialog-link-item span { color: var(--material-ink-soft); font-size: 13px; }
.material-list :deep(.el-empty) { min-height: 260px; border: 2px dashed rgb(61 53 100 / 42%); border-radius: 8px; background: rgb(255 255 255 / 72%); box-shadow: var(--material-shadow); }
.material-list :deep(.el-empty__description p) { color: var(--material-ink-soft); font-weight: 800; }
@keyframes material-orbit-spin { to { rotate: 360deg; } }
@keyframes material-breathe { 50% { opacity: .55; transform: scale(1.12); } }
@keyframes material-float { 50% { translate: 0 -8px; } }
@media (max-width: 840px) {
  .material-hero { grid-template-columns: minmax(0, 1fr); min-height: 300px; }
  .hero-art { width: 52%; opacity: .56; }
  .filter-panel { grid-template-columns: 1fr; }
  .search-input { grid-column: auto; }
}
@media (max-width: 640px) {
  .gov-material-page { padding: 16px 16px 32px; }
  .material-hero { min-height: 290px; padding: 28px 24px; }
  .material-hero h1 { font-size: 42px; }
  .hero-description { max-width: 330px; font-size: 15px; }
  .hero-art { width: 68%; opacity: .35; }
  .orbit-primary { right: -40px; width: 220px; }
  .orbit-secondary { right: -18px; width: 170px; }
  .star-two, .dot-pink { display: none; }
  .filter-panel { gap: 16px; margin-top: 26px; padding: 18px; }
  .filter-head { align-items: stretch; flex-direction: column; gap: 8px; }
  .filter-sticker { align-self: flex-start; }
  .filter-tip { overflow: visible; text-overflow: clip; white-space: normal; }
  .filter-row { align-items: flex-start; flex-direction: column; gap: 9px; }
  .filter-row > span { flex-basis: auto; }
  .category-group { gap: 7px; }
  .filter-row :deep(.el-radio-button__inner) { padding: 7px 11px; }
  .material-list { padding-top: 24px; }
  .material-card { padding: 16px; }
  .material-header { align-items: flex-start; flex-direction: column; gap: 9px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; }
}
</style>
