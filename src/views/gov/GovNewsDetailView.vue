<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Calendar, Document, Refresh, Top } from '@element-plus/icons-vue'
import { getGovNewsDetail } from '@/api/govNews'
import GovNewsContent from '@/components/gov/GovNewsContent.vue'

const route = useRoute()
const router = useRouter()
const news = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const publishedText = computed(() => {
  const value = news.value?.publishedAt
  if (!value) return '发布时间待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(date)
})

function backToList() {
  router.push({
    name: 'gov-news',
    query: {
      ...(route.query.categoryId ? { categoryId: route.query.categoryId } : {}),
      ...(route.query.keyword ? { keyword: route.query.keyword } : {}),
      ...(Number(route.query.pageNum) > 1 ? { pageNum: route.query.pageNum } : {}),
    },
  })
}

async function loadDetail() {
  loading.value = true
  errorMessage.value = ''
  try {
    news.value = await getGovNewsDetail(route.params.newsId)
  } catch (error) {
    news.value = null
    errorMessage.value = error?.message || '资讯详情加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <main class="news-detail-page">
    <article v-loading="loading" class="detail-shell">
      <header class="detail-toolbar">
        <button type="button" @click="backToList"><el-icon><ArrowLeft /></el-icon>返回资讯列表</button>
        <span>考公资讯与公告</span>
      </header>

      <div v-if="errorMessage && !loading" class="detail-state">
        <el-icon><Refresh /></el-icon>
        <h1>暂时无法加载资讯</h1>
        <p>{{ errorMessage }}</p>
        <el-button type="primary" plain @click="loadDetail">重新加载</el-button>
      </div>

      <template v-else-if="news">
        <header class="article-header">
          <div class="article-tags">
            <span class="category-tag">{{ news.categoryName || '考公资讯' }}</span>
            <span v-if="news.isTop" class="top-tag"><el-icon><Top /></el-icon>置顶</span>
          </div>
          <h1>{{ news.title }}</h1>
          <div class="article-time"><el-icon><Calendar /></el-icon>{{ publishedText }}</div>
        </header>

        <el-image v-if="news.coverUrl" class="article-cover" :src="news.coverUrl" :alt="news.title" fit="cover" />
        <section class="article-content">
          <GovNewsContent v-if="news.contentMd" :content="news.contentMd" />
          <el-empty v-else description="该资讯暂无正文内容"><el-icon><Document /></el-icon></el-empty>
        </section>
      </template>
    </article>
  </main>
</template>

<style scoped>
.news-detail-page { min-height: 100%; padding: 34px; background: #f5f7fb; color: #1f2937; }
.detail-shell { width: min(980px, 100%); min-height: calc(100vh - 132px); margin: 0 auto; overflow: hidden; border: 1px solid #e3e8f1; border-radius: 12px; background: #fff; box-shadow: 0 18px 45px rgb(28 45 76 / 9%); }
.detail-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 22px 28px; border-bottom: 1px solid #edf0f5; color: #8995a6; font-size: 12px; font-weight: 700; }
.detail-toolbar button { display: inline-flex; align-items: center; gap: 7px; padding: 5px 0; border: 0; background: transparent; color: #52627a; cursor: pointer; font: inherit; }
.detail-toolbar button:hover, .detail-toolbar button:focus-visible { color: #2f80ed; outline: none; }
.article-header { max-width: 780px; margin: 0 auto; padding: 54px 30px 34px; text-align: center; }
.article-tags { display: flex; justify-content: center; gap: 8px; }
.article-tags span { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.category-tag { background: #eaf3ff; color: #2878dc; }
.top-tag { background: #fff0f0; color: #cb5151; }
.article-header h1 { margin: 18px 0 15px; color: #172033; font-size: clamp(28px, 5vw, 42px); line-height: 1.35; }
.article-time { display: inline-flex; align-items: center; gap: 6px; color: #8995a6; font-size: 13px; }
.article-cover { display: block; width: calc(100% - 80px); max-height: 460px; margin: 0 auto 10px; border-radius: 14px; }
.article-content { max-width: 780px; min-height: 260px; margin: 0 auto; padding: 38px 30px 70px; border-top: 1px solid #eef1f5; }
.detail-state { display: flex; min-height: 520px; align-items: center; justify-content: center; flex-direction: column; text-align: center; }
.detail-state > .el-icon { color: #d66a6a; font-size: 38px; }
.detail-state h1 { margin: 16px 0 0; font-size: 22px; }
.detail-state p { margin: 9px 0 20px; color: #7b879a; }
@media (max-width: 700px) { .news-detail-page { padding: 14px; } .detail-toolbar { padding: 17px 18px; } .detail-toolbar > span { display: none; } .article-header { padding: 38px 20px 28px; } .article-cover { width: calc(100% - 36px); } .article-content { padding: 30px 20px 50px; } }
</style>
