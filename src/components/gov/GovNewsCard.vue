<script setup>
import { Calendar, Document, PictureFilled, Top } from '@element-plus/icons-vue'

defineProps({
  news: { type: Object, required: true },
})

defineEmits(['open'])

function formatDate(value) {
  if (!value) return '发布时间待定'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
</script>

<template>
  <article
    class="news-card"
    role="link"
    tabindex="0"
    :aria-label="`查看资讯：${news.title}`"
    @click="$emit('open', news)"
    @keydown.enter.prevent="$emit('open', news)"
    @keydown.space.prevent="$emit('open', news)"
  >
    <div class="news-cover">
      <el-image v-if="news.coverUrl" :src="news.coverUrl" :alt="news.title" fit="cover" lazy>
        <template #error><div class="cover-fallback"><el-icon><PictureFilled /></el-icon></div></template>
      </el-image>
      <div v-else class="cover-fallback"><el-icon><Document /></el-icon></div>
      <span v-if="news.isTop" class="top-badge"><el-icon><Top /></el-icon>置顶</span>
    </div>

    <div class="news-body">
      <div class="news-meta">
        <span class="category-name">{{ news.categoryName || '考公资讯' }}</span>
        <span><el-icon><Calendar /></el-icon>{{ formatDate(news.publishedAt) }}</span>
      </div>
      <h2>{{ news.title }}</h2>
      <p>{{ news.summary || '暂无摘要，点击查看资讯详情。' }}</p>
      <span class="read-more">阅读全文 <span aria-hidden="true">→</span></span>
    </div>
  </article>
</template>

<style scoped>
.news-card { display: grid; overflow: hidden; border: 1px solid #e4e9f1; border-radius: 14px; background: #fff; cursor: pointer; grid-template-columns: 230px minmax(0, 1fr); transition: border-color .2s ease, box-shadow .2s ease, transform .2s ease; }
.news-card:hover, .news-card:focus-visible { border-color: #b8d5fb; box-shadow: 0 14px 34px rgb(34 75 126 / 10%); outline: none; transform: translateY(-2px); }
.news-cover { position: relative; min-height: 172px; background: #eef4fb; }
.news-cover :deep(.el-image) { width: 100%; height: 100%; min-height: 172px; display: block; }
.cover-fallback { display: grid; width: 100%; height: 100%; min-height: 172px; place-items: center; background: linear-gradient(145deg, #eaf3ff, #f5f8fc); color: #7da8db; font-size: 42px; }
.top-badge { position: absolute; top: 12px; left: 12px; display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border-radius: 999px; background: rgb(209 68 68 / 92%); color: #fff; font-size: 12px; font-weight: 700; }
.news-body { display: flex; min-width: 0; padding: 24px 26px; flex-direction: column; }
.news-meta { display: flex; align-items: center; gap: 16px; color: #8290a3; font-size: 12px; }
.news-meta span { display: inline-flex; align-items: center; gap: 5px; }
.news-meta .category-name { color: #2f80ed; font-weight: 700; }
h2 { margin: 13px 0 0; color: #182236; font-size: 20px; line-height: 1.45; }
p { display: -webkit-box; overflow: hidden; margin: 11px 0 0; color: #65748a; font-size: 14px; line-height: 1.75; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.read-more { align-self: flex-start; margin-top: auto; padding-top: 16px; color: #2f80ed; font-size: 13px; font-weight: 700; }
@media (max-width: 700px) { .news-card { grid-template-columns: 1fr; } .news-cover, .news-cover :deep(.el-image), .cover-fallback { min-height: 180px; } .news-body { padding: 20px; } }
</style>
