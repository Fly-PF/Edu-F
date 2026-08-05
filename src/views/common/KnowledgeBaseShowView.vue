<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Location, Message, PictureFilled } from '@element-plus/icons-vue'
import { getKnowledgeBaseCollectionStatus, listPublicKnowledgeBases } from '@/api/rag'
import { useUserStore } from '@/stores/user'
import KnowledgeBaseDetailDrawer from './KnowledgeBaseDetailDrawer.vue'

const apiBaseURL = (import.meta.env.VITE_APP_REQUEST_BASE_URL || '').replace(/\/$/, '')
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const detailVisible = ref(false)
const detailKnowledgeBase = ref(null)
const detailCollected = ref(false)
const detailCollectionLoading = ref(false)

const sections = ref([
  { title: '课程', type: 2, items: [] },
  { title: '教材', type: 3, items: [] },
  { title: '政策', type: 4, items: [] },
  { title: '其他', type: 1, items: [] },
])

const visibleSections = computed(() => sections.value.filter((section) => section.items.length > 0))

function coverUrl(objectName) {
  if (!objectName) {
    return ''
  }
  return `${apiBaseURL}/api/rag/kb/cover?objectName=${encodeURIComponent(objectName)}`
}

function goKnowledgeBaseChat() {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  router.push('/knowledge-qa/chat')
}

function goKnowledgeBaseMore(section) {
  router.push({
    path: '/main/knowledge-qa/more',
    query: { kb_type: section.type },
  })
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

async function loadPublicKnowledgeBases() {
  loading.value = true
  try {
    const results = await Promise.all(
      sections.value.map((section) => listPublicKnowledgeBases({ kb_type: section.type, limit: 4 })),
    )

    sections.value = sections.value.map((section, index) => ({
      ...section,
      items: results[index] || [],
    }))
  } catch (error) {
    ElMessage.error(error?.message || '知识库加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadPublicKnowledgeBases)
</script>

<template>
  <div class="kb-show-page">
    <main class="page-shell">
      <section class="kb-banner" aria-labelledby="kb-page-title">
        <div class="banner-copy">
          <span class="eyebrow">AI 探索乐园 · PUBLIC LAB</span>
          <h1 id="kb-page-title">公开知识库<span class="title-dot">·</span></h1>
          <p>把好奇心变成新发现。挑一份课程、教材或政策资料，开始你的探索任务。</p>
          <div class="banner-actions">
            <el-button class="primary-action" type="primary" :icon="ArrowRight" @click="goKnowledgeBaseChat">
              开始探索
            </el-button>
            <span class="banner-note">今天也可以问一个“为什么”</span>
          </div>
        </div>
        <div class="banner-visual" aria-hidden="true">
          <span class="orbit orbit-wide"></span>
          <span class="orbit orbit-small"></span>
          <span class="spark spark-one">✦</span>
          <span class="spark spark-two">+</span>
          <span class="spark spark-three">✦</span>
          <div class="core-card">
            <span>IDEA</span>
            <strong>?</strong>
          </div>
          <span class="visual-sticker sticker-make">MAKE</span>
          <span class="visual-sticker sticker-go">GO!</span>
        </div>
      </section>

      <div v-loading="loading" class="section-wrap">
        <div v-if="!loading && !visibleSections.length" class="empty-state">
          <div class="empty-icon"><el-icon><PictureFilled /></el-icon></div>
          <h2>还没有公开资料</h2>
          <p>新的探索内容正在路上，先去问问 AI 吧。</p>
          <el-button class="secondary-action" :icon="ArrowRight" @click="goKnowledgeBaseChat">去问 AI</el-button>
        </div>

        <section
          v-for="section in visibleSections"
          :key="section.type"
          class="kb-section"
          :data-tone="section.type"
        >
          <div class="section-head">
            <div>
              <span class="section-kicker">探索任务 / {{ section.title }}</span>
              <h2>{{ section.title }}</h2>
              <p>选一个主题，打开一段新的知识旅程。</p>
            </div>
            <button
              class="section-more"
              type="button"
              :aria-label="`查看更多${section.title}知识库`"
              @click="goKnowledgeBaseMore(section)"
            >
              <span>查看更多</span>
              <el-icon><ArrowRight /></el-icon>
            </button>
          </div>

          <div class="kb-grid">
            <article
              v-for="item in section.items"
              :key="`${section.type}-${item.id}-${item.kbName}`"
              class="kb-card"
              :class="`tone-${section.type}`"
              role="button"
              tabindex="0"
              :aria-label="`打开${item.kbName}知识库详情`"
              @click="openDetail(item)"
              @keydown.enter.prevent="openDetail(item)"
              @keydown.space.prevent="openDetail(item)"
            >
              <div class="cover-wrap">
                <el-image
                  v-if="item.kbCover"
                  class="cover-img"
                  :src="coverUrl(item.kbCover)"
                  :alt="`${item.kbName}封面`"
                  fit="contain"
                />
                <div v-else class="cover-empty" aria-label="暂无封面">
                  <el-icon><PictureFilled /></el-icon>
                </div>
                <span class="card-pin" aria-hidden="true"></span>
              </div>
              <div class="card-body">
                <div class="card-heading">
                  <h3>{{ item.kbName }}</h3>
                  <el-icon aria-hidden="true"><ArrowRight /></el-icon>
                </div>
                <p v-if="item.description">{{ item.description }}</p>
                <div class="meta-line">
                  <el-tag size="small">{{ section.title }}</el-tag>
                  <span class="meta-text">点击打开探索</span>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>

    <footer class="site-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="footer-logo"><span>Edu-F</span> AI教育</div>
          <p>服务协议 | 个人信息保护政策 | 儿童个人信息保护政策</p>
          <p>Copyright © 2026 Edu-F AI 教育平台</p>
        </div>

        <div class="footer-contact">
          <h2>联系我们</h2>
          <p>
            <el-icon><Location /></el-icon>
            齐鲁工业大学 AI Edu
          </p>
          <p>
            <el-icon><Message /></el-icon>
            contact@edu-f.ai
          </p>
        </div>
      </div>
    </footer>

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
.kb-show-page {
  --ink: #3d3564;
  --ink-soft: #655d82;
  --purple: #8178cf;
  --pink: #ee91bb;
  --mint: #52bbc4;
  --yellow: #fff1a8;
  min-height: 100%;
  overflow: auto;
  background-color: #fbfbff;
  background-image:
    linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px),
    linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--ink);
  font-family: 'Microsoft YaHei', 'Trebuchet MS', sans-serif;
}

.page-shell {
  width: min(1480px, calc(100% - 32px));
  margin: 0 auto;
  padding: clamp(18px, 5vw, 72px) 0 28px;
}

.kb-banner {
  position: relative;
  display: grid;
  min-height: 330px;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
  align-items: center;
  gap: 28px;
  overflow: hidden;
  padding: clamp(28px, 5vw, 62px);
  border: 2px solid var(--ink);
  border-radius: 10px;
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%);
  box-shadow: 7px 8px 0 rgb(61 53 100 / 70%);
}

.kb-banner::before {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(90deg, rgb(61 53 100 / 7%) 1px, transparent 1px),
    linear-gradient(rgb(61 53 100 / 7%) 1px, transparent 1px);
  background-size: 28px 28px;
  content: '';
  opacity: 0.55;
}

.banner-copy,
.banner-visual {
  position: relative;
  z-index: 1;
}

.banner-copy {
  display: grid;
  max-width: 700px;
  justify-items: start;
  gap: 16px;
}

.eyebrow,
.section-kicker {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  color: var(--ink);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.eyebrow {
  padding: 6px 10px;
  border: 1px solid var(--ink);
  background: var(--yellow);
  box-shadow: 3px 3px 0 rgb(61 53 100 / 18%);
  transform: rotate(-2deg);
}

.banner-copy h1 {
  margin: 0;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: clamp(42px, 5.4vw, 68px);
  font-weight: 900;
  line-height: 1.1;
}

.title-dot {
  color: var(--pink);
}

.banner-copy p {
  max-width: 620px;
  margin: 0;
  color: var(--ink-soft);
  font-size: clamp(16px, 1.8vw, 20px);
  font-weight: 700;
  line-height: 1.65;
}

.banner-actions {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.banner-note {
  color: var(--ink-soft);
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.kb-show-page :deep(.el-button) {
  white-space: nowrap;
  word-break: keep-all;
}

.primary-action,
.secondary-action {
  height: 44px;
  padding: 0 18px;
  border: 1px solid #4e4473;
  border-radius: 5px;
  font-weight: 800;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.primary-action {
  background: var(--purple);
  color: #ffffff;
}

.secondary-action {
  background: #ffffff;
  color: var(--ink);
}

.primary-action:hover,
.primary-action:focus-visible,
.secondary-action:hover,
.secondary-action:focus-visible {
  background: #9289db;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 34%);
  outline: none;
  transform: translate(-2px, -2px);
}

.secondary-action:hover,
.secondary-action:focus-visible {
  background: #f5f2ff;
}

.kb-show-page :deep(.el-button.is-disabled),
.kb-show-page :deep(.el-button:disabled) {
  cursor: not-allowed;
  opacity: 0.55;
  box-shadow: 1px 2px 0 rgb(61 53 100 / 12%);
  transform: none;
}

.banner-visual {
  width: min(420px, 100%);
  height: 250px;
  justify-self: end;
}

.orbit,
.core-card,
.visual-sticker,
.spark {
  position: absolute;
}

.orbit {
  top: 50%;
  left: 50%;
  border: 2px solid rgb(61 53 100 / 38%);
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(-18deg);
}

.orbit-wide {
  width: min(390px, 96%);
  height: 170px;
  border-style: dashed;
  animation: orbit-spin 14s linear infinite;
}

.orbit-small {
  width: 280px;
  height: 132px;
  border-color: rgb(82 187 196 / 70%);
  transform: translate(-50%, -50%) rotate(22deg);
  animation: orbit-spin-reverse 11s linear infinite;
}

.orbit::after {
  position: absolute;
  top: 50%;
  right: -7px;
  width: 12px;
  height: 12px;
  border: 2px solid var(--ink);
  border-radius: 50%;
  background: var(--pink);
  content: '';
}

.core-card {
  top: 50%;
  left: 50%;
  display: grid;
  width: 112px;
  height: 112px;
  place-items: center;
  border: 2px solid var(--ink);
  background: #ffffff;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 32%);
  transform: translate(-50%, -50%) rotate(4deg);
  animation: core-float 7s ease-in-out infinite;
}

.core-card span {
  color: var(--mint);
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.core-card strong {
  color: var(--ink);
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 48px;
  line-height: 0.8;
}

.spark {
  color: var(--ink);
  font-size: 26px;
  font-weight: 900;
  animation: spark-breathe 5s ease-in-out infinite;
}

.spark-one { top: 20px; left: 12%; color: var(--pink); }
.spark-two { right: 10%; bottom: 24px; color: var(--mint); font-size: 36px; animation-delay: -2s; }
.spark-three { top: 18%; right: 18%; color: var(--purple); font-size: 18px; animation-delay: -3s; }

.visual-sticker {
  padding: 6px 9px;
  border: 1px solid var(--ink);
  color: var(--ink);
  font-size: 12px;
  font-weight: 900;
  box-shadow: 3px 3px 0 rgb(61 53 100 / 18%);
}

.sticker-make {
  top: 7%;
  right: 3%;
  background: var(--yellow);
  transform: rotate(6deg);
}

.sticker-go {
  bottom: 5%;
  left: 8%;
  background: #ffffff;
  transform: rotate(-8deg);
}

.section-wrap {
  position: relative;
  display: grid;
  gap: 48px;
  min-height: 320px;
  padding: 58px 0 32px;
}

.section-wrap :deep(.el-loading-mask) {
  background: rgb(251 251 255 / 76%);
}

.kb-section {
  --section-color: var(--purple);
  position: relative;
  display: grid;
  gap: 20px;
  padding-top: 20px;
  border-top: 2px solid var(--section-color);
}

.kb-section[data-tone='3'] { --section-color: var(--pink); }
.kb-section[data-tone='4'] { --section-color: var(--mint); }
.kb-section[data-tone='1'] { --section-color: #e4c84d; }

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.section-kicker {
  margin-bottom: 6px;
  color: var(--section-color);
  font-size: 11px;
  letter-spacing: 0.08em;
}

.section-head h2 {
  margin: 0;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 28px;
  font-weight: 900;
  line-height: 1.2;
}

.section-head p {
  margin: 7px 0 0;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.5;
}

.section-more {
  display: inline-flex;
  height: 36px;
  flex: 0 0 auto;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid var(--ink);
  border-radius: 5px;
  background: #ffffff;
  color: var(--ink);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 15%);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  white-space: nowrap;
}

.section-more:hover,
.section-more:focus-visible {
  background: var(--yellow);
  box-shadow: 5px 6px 0 rgb(61 53 100 / 22%);
  outline: none;
  transform: translate(-2px, -2px);
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.kb-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgb(61 53 100 / 54%);
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  box-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.kb-card:hover,
.kb-card:focus-visible {
  border-color: var(--ink);
  box-shadow: 6px 7px 0 rgb(61 53 100 / 28%);
  outline: none;
  transform: translate(-2px, -3px);
}

.cover-wrap,
.cover-img,
.cover-empty {
  width: 100%;
  aspect-ratio: 16 / 9;
}

.cover-wrap {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid rgb(61 53 100 / 16%);
  background: #f3efff;
}

.tone-2 .cover-wrap { background: #e9e5ff; }
.tone-3 .cover-wrap { background: #fce4ef; }
.tone-4 .cover-wrap { background: #ddf5f5; }
.tone-1 .cover-wrap { background: #fff5c5; }

.cover-img {
  display: block;
  transition: transform 0.35s ease;
}

.cover-img :deep(img) {
  width: 100%;
  height: 100%;
}

.kb-card:hover .cover-img,
.kb-card:focus-visible .cover-img {
  transform: scale(1.04);
}

.cover-empty {
  display: grid;
  place-items: center;
  background-image:
    linear-gradient(90deg, rgb(129 120 207 / 12%) 1px, transparent 1px),
    linear-gradient(rgb(129 120 207 / 12%) 1px, transparent 1px);
  background-size: 20px 20px;
  color: var(--purple);
  font-size: 34px;
}

.card-pin {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 11px;
  height: 11px;
  border: 1px solid var(--ink);
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 1px 2px 0 rgb(61 53 100 / 18%);
}

.card-body {
  display: grid;
  min-height: 136px;
  gap: 10px;
  padding: 16px 15px 17px;
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-heading h3 {
  min-width: 0;
  overflow: hidden;
  margin: 0;
  color: var(--ink);
  font-size: 17px;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-heading .el-icon {
  flex: 0 0 auto;
  color: var(--section-color, var(--purple));
  font-size: 18px;
  transition: transform 0.2s ease;
}

.kb-card:hover .card-heading .el-icon,
.kb-card:focus-visible .card-heading .el-icon {
  transform: translateX(3px);
}

.card-body p {
  display: -webkit-box;
  min-height: 40px;
  overflow: hidden;
  margin: 0;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.55;
}

.meta-line {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.meta-line :deep(.el-tag) {
  border: 1px solid var(--ink);
  border-radius: 4px;
  background: var(--yellow);
  color: var(--ink);
  font-weight: 900;
  box-shadow: 2px 2px 0 rgb(61 53 100 / 15%);
  transform: rotate(-2deg);
}

.meta-text {
  color: var(--ink-soft);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.empty-state {
  display: grid;
  max-width: 560px;
  justify-items: center;
  gap: 10px;
  margin: 0 auto;
  padding: 46px 24px;
  border: 1px dashed var(--ink);
  border-radius: 8px;
  background: rgb(255 255 255 / 78%);
  text-align: center;
}

.empty-icon {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border: 1px solid var(--ink);
  background: var(--yellow);
  color: var(--ink);
  font-size: 26px;
  transform: rotate(-4deg);
}

.empty-state h2 {
  margin: 6px 0 0;
  color: var(--ink);
  font-size: 22px;
  font-weight: 900;
}

.empty-state p {
  margin: 0 0 8px;
  color: var(--ink-soft);
  font-size: 14px;
}

.site-footer {
  border-top: 1px solid rgb(61 53 100 / 18%);
  background: rgb(255 255 255 / 68%);
}

.footer-inner {
  display: grid;
  width: min(1480px, calc(100% - 32px));
  grid-template-columns: 1.2fr 0.8fr;
  gap: 48px;
  margin: 0 auto;
  padding: 36px 0 46px;
}

.footer-brand {
  padding-right: 48px;
  border-right: 1px solid rgb(61 53 100 / 16%);
}

.footer-logo {
  color: var(--ink);
  font-size: 25px;
  font-weight: 900;
}

.footer-logo span { color: var(--purple); }

.footer-brand p,
.footer-contact p {
  margin: 14px 0 0;
  color: var(--ink-soft);
  font-size: 12px;
  line-height: 1.7;
}

.footer-contact h2 {
  margin: 0;
  color: var(--ink);
  font-size: 20px;
  font-weight: 900;
}

.footer-contact p {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-contact .el-icon { color: var(--mint); font-size: 17px; }

@keyframes orbit-spin {
  from { transform: translate(-50%, -50%) rotate(-18deg); }
  to { transform: translate(-50%, -50%) rotate(342deg); }
}

@keyframes orbit-spin-reverse {
  from { transform: translate(-50%, -50%) rotate(22deg); }
  to { transform: translate(-50%, -50%) rotate(-338deg); }
}

@keyframes core-float {
  0%, 100% { transform: translate(-50%, -50%) rotate(4deg); }
  50% { transform: translate(-50%, calc(-50% - 6px)) rotate(1deg); }
}

@keyframes spark-breathe {
  0%, 100% { opacity: 0.62; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.08); }
}

@media (max-width: 1180px) {
  .kb-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}

@media (max-width: 860px) {
  .kb-banner {
    grid-template-columns: 1fr;
  }

  .banner-visual {
    width: min(440px, 100%);
    height: 190px;
    justify-self: center;
    opacity: 0.86;
  }

  .kb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 600px) {
  .page-shell,
  .footer-inner { width: calc(100% - 32px); }

  .page-shell { padding-top: 18px; }

  .kb-banner {
    min-height: 0;
    gap: 16px;
    padding: 26px 20px 20px;
  }

  .banner-copy { gap: 13px; }
  .banner-copy h1 { font-size: 40px; }
  .banner-copy p { font-size: 15px; }
  .banner-actions { gap: 12px; }
  .banner-note { font-size: 11px; }
  .banner-visual { height: 145px; opacity: 0.68; }
  .core-card { width: 88px; height: 88px; }
  .core-card strong { font-size: 38px; }
  .orbit-wide { height: 120px; }
  .orbit-small { width: 210px; height: 96px; }

  .section-wrap { gap: 38px; padding-top: 42px; }
  .section-head { align-items: flex-start; flex-direction: column; gap: 14px; }
  .section-head h2 { font-size: 24px; }
  .section-more { align-self: flex-start; }
  .kb-grid { grid-template-columns: 1fr; gap: 16px; }
  .card-body { min-height: 126px; }

  .footer-inner { grid-template-columns: 1fr; gap: 24px; padding: 30px 0 38px; }
  .footer-brand { padding-right: 0; border-right: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .kb-show-page *,
  .kb-show-page *::before,
  .kb-show-page *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
