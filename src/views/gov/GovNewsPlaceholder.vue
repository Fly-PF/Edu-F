<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Document, Refresh, Search } from '@element-plus/icons-vue'
import { listGovNews, listGovNewsCategories } from '@/api/govNews'
import GovNewsCard from '@/components/gov/GovNewsCard.vue'

const PAGE_SIZE = 8
const route = useRoute()
const router = useRouter()

const categories = ref([])
const records = ref([])
const total = ref(0)
const loading = ref(false)
const categoryLoading = ref(false)
const errorMessage = ref('')
const categoryError = ref('')
const filters = reactive({
  categoryId: route.query.categoryId || '',
  keywordInput: String(route.query.keyword || ''),
  keyword: String(route.query.keyword || ''),
  pageNum: Math.max(1, Number(route.query.pageNum) || 1),
  pageSize: PAGE_SIZE,
})

const resultSummary = computed(() => {
  if (loading.value) return '正在加载资讯…'
  if (errorMessage.value) return '资讯加载失败'
  return `共 ${total.value} 条资讯`
})

function currentQuery() {
  const query = {}
  if (filters.categoryId !== '') query.categoryId = String(filters.categoryId)
  if (filters.keyword) query.keyword = filters.keyword
  if (filters.pageNum > 1) query.pageNum = String(filters.pageNum)
  return query
}

function syncQuery() {
  return router.replace({ name: 'gov-news', query: currentQuery() })
}

async function loadCategories() {
  categoryLoading.value = true
  categoryError.value = ''
  try {
    categories.value = await listGovNewsCategories()
  } catch (error) {
    categories.value = []
    categoryError.value = error?.message || '分类加载失败'
  } finally {
    categoryLoading.value = false
  }
}

async function loadNews() {
  loading.value = true
  errorMessage.value = ''
  try {
    const page = await listGovNews({
      categoryId: filters.categoryId,
      keyword: filters.keyword,
      pageNum: filters.pageNum,
      pageSize: filters.pageSize,
    })
    records.value = page.records
    total.value = page.total
  } catch (error) {
    records.value = []
    total.value = 0
    errorMessage.value = error?.message || '资讯加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function applyFilters() {
  await syncQuery()
  await loadNews()
}

function searchNews() {
  filters.keyword = filters.keywordInput.trim()
  filters.pageNum = 1
  applyFilters()
}

function selectCategory(categoryId) {
  if (filters.categoryId === categoryId) return
  filters.categoryId = categoryId
  filters.pageNum = 1
  applyFilters()
}

function clearFilters() {
  filters.categoryId = ''
  filters.keywordInput = ''
  filters.keyword = ''
  filters.pageNum = 1
  applyFilters()
}

function changePage(pageNum) {
  filters.pageNum = pageNum
  applyFilters()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function openDetail(news) {
  router.push({
    name: 'gov-news-detail',
    params: { newsId: news.id },
    query: currentQuery(),
  })
}

onMounted(() => {
  loadCategories()
  loadNews()
})
</script>

<template>
  <main class="gov-news-page">
    <section class="gov-news-shell">
      <header class="page-header">
        <button class="back-button" type="button" @click="router.push('/main/gov')">
          <el-icon><ArrowLeft /></el-icon><span>返回考公专题</span>
        </button>
        <span>考公专题 · 资讯中心</span>
      </header>

      <div class="page-hero">
        <div class="hero-icon"><el-icon><Document /></el-icon></div>
        <div>
          <p>INFORMATION</p>
          <h1>考公资讯与公告</h1>
          <span>及时了解招考公告、政策解读与备考资讯。</span>
        </div>
      </div>

      <section class="filter-panel" aria-label="资讯筛选">
        <form class="search-form" @submit.prevent="searchNews">
          <el-input v-model="filters.keywordInput" clearable placeholder="搜索标题或资讯内容" aria-label="资讯关键词">
            <template #prefix><el-icon><Search /></el-icon></template>
          </el-input>
          <el-button type="primary" native-type="submit" :icon="Search">搜索</el-button>
        </form>

        <div class="category-row" aria-label="资讯分类">
          <span class="category-label">分类</span>
          <div v-loading="categoryLoading" class="category-options">
            <button type="button" :class="{ active: filters.categoryId === '' }" @click="selectCategory('')">全部</button>
            <button
              v-for="category in categories"
              :key="category.id"
              type="button"
              :class="{ active: String(filters.categoryId) === String(category.id) }"
              @click="selectCategory(category.id)"
            >{{ category.name }}</button>
          </div>
          <button v-if="categoryError" class="category-retry" type="button" @click="loadCategories">分类加载失败，重试</button>
        </div>
      </section>

      <div class="result-heading"><strong>{{ resultSummary }}</strong><span>资讯排序由发布端统一维护</span></div>

      <section v-loading="loading" class="news-results" aria-live="polite">
        <div v-if="errorMessage && !loading" class="state-panel error-state">
          <el-icon><Refresh /></el-icon>
          <h2>暂时无法加载资讯</h2>
          <p>{{ errorMessage }}</p>
          <el-button type="primary" plain @click="loadNews">重新加载</el-button>
        </div>

        <div v-else-if="records.length" class="news-list">
          <GovNewsCard v-for="news in records" :key="news.id" :news="news" @open="openDetail" />
        </div>

        <el-empty v-else-if="!loading" description="暂无符合条件的资讯">
          <el-button v-if="filters.categoryId !== '' || filters.keyword" @click="clearFilters">清除筛选</el-button>
        </el-empty>

        <el-pagination
          v-if="!errorMessage && total > filters.pageSize"
          :current-page="filters.pageNum"
          :page-size="filters.pageSize"
          :total="total"
          layout="prev, pager, next, jumper"
          background
          @current-change="changePage"
        />
      </section>
    </section>
  </main>
</template>

<style scoped>
.gov-news-page { min-height: 100%; padding: 34px; background: #f5f7fb; color: #1f2937; }
.gov-news-shell { width: min(1120px, 100%); min-height: calc(100vh - 132px); margin: 0 auto; overflow: hidden; border: 1px solid #e3e8f1; border-radius: 12px; background: #fff; box-shadow: 0 18px 45px rgb(28 45 76 / 9%); }
.page-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 22px 28px; border-bottom: 1px solid #edf0f5; color: #7b879a; font-size: 12px; font-weight: 800; letter-spacing: .08em; }
.back-button { display: inline-flex; align-items: center; gap: 7px; padding: 5px 0; border: 0; background: transparent; color: #52627a; cursor: pointer; font: inherit; }
.back-button:hover, .back-button:focus-visible { color: #2f80ed; outline: none; }
.page-hero { display: flex; align-items: center; gap: 20px; padding: 36px 40px 30px; background: linear-gradient(135deg, #f8fbff, #fff); }
.hero-icon { display: grid; width: 64px; height: 64px; flex: 0 0 auto; place-items: center; border-radius: 15px; background: #eaf3ff; color: #2f80ed; font-size: 30px; }
.page-hero p { margin: 0; color: #2f80ed; font-size: 11px; font-weight: 800; letter-spacing: .14em; }
.page-hero h1 { margin: 6px 0 5px; color: #172033; font-size: clamp(26px, 4vw, 36px); }
.page-hero span { color: #718096; font-size: 14px; }
.filter-panel { margin: 0 40px; padding: 22px 24px; border: 1px solid #e6ebf2; border-radius: 12px; background: #fafcff; }
.search-form { display: flex; max-width: 620px; gap: 10px; }
.category-row { display: flex; align-items: flex-start; gap: 14px; margin-top: 18px; }
.category-label { flex: 0 0 auto; padding-top: 7px; color: #7b879a; font-size: 13px; font-weight: 700; }
.category-options { display: flex; min-height: 34px; flex-wrap: wrap; gap: 8px; }
.category-options button, .category-retry { padding: 7px 13px; border: 1px solid transparent; border-radius: 999px; background: transparent; color: #5f6e82; cursor: pointer; font: inherit; font-size: 13px; }
.category-options button:hover, .category-options button:focus-visible, .category-options button.active { border-color: #c9ddfa; background: #eaf3ff; color: #2475d8; outline: none; }
.category-retry { color: #d05a5a; }
.result-heading { display: flex; align-items: center; justify-content: space-between; margin: 30px 40px 14px; color: #8591a2; font-size: 12px; }
.result-heading strong { color: #344054; font-size: 14px; }
.news-results { min-height: 320px; padding: 0 40px 42px; }
.news-list { display: grid; gap: 16px; }
.state-panel { display: flex; min-height: 300px; align-items: center; justify-content: center; flex-direction: column; text-align: center; }
.state-panel > .el-icon { color: #d66a6a; font-size: 34px; }
.state-panel h2 { margin: 14px 0 0; font-size: 18px; }
.state-panel p { margin: 8px 0 18px; color: #7b879a; font-size: 13px; }
.news-results :deep(.el-pagination) { justify-content: center; margin-top: 30px; }
@media (max-width: 700px) { .gov-news-page { padding: 14px; } .page-header { padding: 17px 18px; } .page-header > span { display: none; } .page-hero { align-items: flex-start; padding: 26px 20px; } .hero-icon { width: 50px; height: 50px; font-size: 24px; } .filter-panel { margin: 0 18px; padding: 18px; } .search-form { align-items: stretch; flex-direction: column; } .category-row { flex-direction: column; gap: 7px; } .category-label { padding-top: 0; } .result-heading { align-items: flex-start; margin: 25px 18px 12px; flex-direction: column; gap: 4px; } .news-results { padding: 0 18px 30px; } }
</style>
