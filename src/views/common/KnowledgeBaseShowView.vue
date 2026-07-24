<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Location, Message, PictureFilled } from '@element-plus/icons-vue'
import { getKnowledgeBaseCollectionStatus, listPublicKnowledgeBases } from '@/api/rag'
import { useUserStore } from '@/stores/user'
import KnowledgeBaseDetailDrawer from './KnowledgeBaseDetailDrawer.vue'

const apiBaseURL = 'http://localhost:8080'
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
    <section class="kb-banner">
      <div class="banner-copy">
        <h1>公开知识库</h1>
        <p>聚合课程、教材、政策等优质公开资源</p>
        <el-button type="primary" :icon="ArrowRight" @click="goKnowledgeBaseChat">开始知识库问答</el-button>
      </div>
      <div class="banner-visual" aria-hidden="true">
        <span class="book book-one"></span>
        <span class="book book-two"></span>
        <span class="book book-three"></span>
        <span class="node node-one"></span>
        <span class="node node-two"></span>
        <span class="node node-three"></span>
      </div>
    </section>

    <div v-loading="loading" class="section-wrap">
      <section v-for="section in visibleSections" :key="section.type" class="kb-section">
        <div class="section-head">
          <h2>{{ section.title }}</h2>
          <button class="section-more" type="button" @click="goKnowledgeBaseMore(section)">
            <span>更多</span>
            <el-icon><ArrowRight /></el-icon>
          </button>
        </div>

        <div class="kb-grid">
          <article
            v-for="item in section.items"
            :key="`${section.type}-${item.id}-${item.kbName}`"
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
                <el-tag size="small">{{ section.title }}</el-tag>
              </div>
            </div>
          </article>
        </div>

      </section>
    </div>

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
  height: 100%;
  min-height: 0;
  overflow: auto;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0, rgba(255, 255, 255, 0) 240px),
    linear-gradient(135deg, #eef4ff 0%, #f5f9ff 46%, #edf7f1 100%);
  color: #111827;
}

.kb-banner {
  position: relative;
  display: flex;
  overflow: hidden;
  min-height: 300px;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  padding: 34px max(24px, calc((100% - 1200px) / 2));
  background:
    linear-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.18) 1px, transparent 1px),
    linear-gradient(120deg, #3f63df 0%, #1885e8 48%, #39cfe0 100%);
  background-size: 42px 42px, 42px 42px, auto;
  color: #ffffff;
  box-shadow: inset 0 -1px 0 rgba(255, 255, 255, 0.52);
}

.kb-banner::before {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(13, 39, 130, 0.26) 0%, rgba(35, 145, 230, 0.05) 58%, rgba(255, 255, 255, 0.18) 100%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(18, 88, 193, 0.1));
  content: '';
}

.kb-banner::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 44px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(236, 244, 255, 0.32));
  content: '';
}

.banner-copy,
.banner-visual {
  position: relative;
  z-index: 1;
}

.banner-copy {
  display: grid;
  gap: 16px;
  justify-items: start;
}

.banner-copy h1 {
  margin: 0;
  color: #ffffff;
  font-size: 46px;
  font-weight: 900;
  line-height: 1.15;
  letter-spacing: 0;
  text-shadow: 0 8px 18px rgba(15, 23, 42, 0.2);
}

.banner-copy p {
  width: fit-content;
  margin: 0;
  padding: 10px 26px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(9, 93, 217, 0.76);
  box-shadow: 0 14px 32px rgba(17, 74, 180, 0.18);
  color: #ffffff;
  font-size: 19px;
  font-weight: 800;
  line-height: 1.4;
  backdrop-filter: blur(10px);
}

.banner-copy :deep(.el-button) {
  width: fit-content;
  min-width: 150px;
  height: 42px;
  border: 0;
  border-radius: 6px;
  background: #ffffff;
  color: #1168e8;
  font-weight: 800;
  box-shadow: 0 14px 30px rgba(20, 75, 171, 0.2);
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.banner-copy :deep(.el-button:hover),
.banner-copy :deep(.el-button:focus-visible) {
  background: #eef6ff;
  color: #0b55c7;
  box-shadow: 0 18px 36px rgba(20, 75, 171, 0.26);
  transform: translateY(-1px);
}

.banner-visual {
  width: min(360px, 34vw);
  height: 170px;
  flex: 0 0 auto;
}

.book,
.node {
  position: absolute;
  display: block;
}

.book {
  left: 50%;
  width: 168px;
  height: 78px;
  border-radius: 8px;
  transform: translateX(-50%) skewX(-18deg) rotate(-6deg);
  box-shadow: 0 20px 34px rgba(16, 38, 127, 0.28);
}

.book-one {
  top: 72px;
  background: #0d45c7;
}

.book-two {
  top: 48px;
  background: linear-gradient(135deg, #10d4e5, #1db6e8);
}

.book-three {
  top: 24px;
  background: linear-gradient(135deg, #7bf4ff, #1e65e9);
  box-shadow: 0 24px 42px rgba(9, 84, 199, 0.34);
}

.book-three::after {
  position: absolute;
  inset: 18px 44px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 18px 0 0 rgba(255, 255, 255, 0.34), -18px 0 0 rgba(255, 255, 255, 0.34);
  content: '';
}

.node {
  width: 42px;
  height: 50px;
  border: 2px solid rgba(177, 236, 255, 0.82);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 22px rgba(16, 38, 127, 0.18);
  backdrop-filter: blur(4px);
}

.node-one {
  top: 36px;
  left: 26px;
}

.node-two {
  right: 18px;
  bottom: 40px;
}

.node-three {
  top: 14px;
  right: 54px;
}

.section-wrap {
  display: grid;
  gap: 28px;
  width: 100%;
  min-height: 320px;
  margin: 0 auto;
  padding: 28px 0 44px;
}

.kb-section {
  position: relative;
  display: grid;
  gap: 18px;
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 22px 24px 24px;
  border: 1px solid rgba(218, 228, 243, 0.72);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.8), rgba(242, 247, 255, 0.92));
  box-shadow: 0 18px 42px rgba(38, 62, 111, 0.08);
}

.kb-section::before {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 3px;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(90deg, #4f8df7, #40d0dc);
  content: '';
}

.kb-section:nth-child(4n + 2) {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(243, 250, 255, 0.94));
}

.kb-section:nth-child(4n + 3) {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(241, 250, 244, 0.94));
}

.kb-section:nth-child(4n + 4) {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(250, 245, 255, 0.94));
}

.kb-section:nth-child(4n + 2)::before {
  background: linear-gradient(90deg, #48a5f6, #72d4fa);
}

.kb-section:nth-child(4n + 3)::before {
  background: linear-gradient(90deg, #37b884, #9fe2b7);
}

.kb-section:nth-child(4n + 4)::before {
  background: linear-gradient(90deg, #8a7cf6, #efb8f4);
}

.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.section-head h2 {
  margin: 0;
  color: #0f1f38;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.35;
}

.section-head span {
  color: #64748b;
  font-size: 13px;
}

.section-more {
  display: inline-flex;
  height: 34px;
  align-items: center;
  gap: 6px;
  padding: 0 13px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.86);
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.section-more:hover,
.section-more:focus-visible {
  border-color: rgba(37, 99, 235, 0.34);
  background: #ffffff;
  box-shadow: 0 12px 22px rgba(37, 99, 235, 0.14);
  outline: none;
  transform: translateY(-1px);
}

.section-more .el-icon {
  font-size: 14px;
}

.kb-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.kb-card {
  overflow: hidden;
  border: 1px solid rgba(218, 229, 244, 0.92);
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  box-shadow: 0 14px 28px rgba(35, 54, 94, 0.07);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, background 0.18s ease;
}

.kb-card:hover,
.kb-card:focus-visible {
  border-color: rgba(96, 148, 232, 0.5);
  box-shadow: 0 20px 40px rgba(35, 54, 94, 0.14);
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
  position: relative;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.52), rgba(255, 255, 255, 0)),
    #f6faff;
}

.cover-wrap::after {
  position: absolute;
  inset: auto 0 0;
  height: 1px;
  background: linear-gradient(90deg, rgba(219, 234, 254, 0), rgba(147, 197, 253, 0.6), rgba(219, 234, 254, 0));
  content: '';
}

.cover-img {
  display: block;
  transition: transform 0.22s ease;
}

.kb-card:hover .cover-img,
.kb-card:focus-visible .cover-img {
  transform: scale(1.03);
}

.cover-empty {
  display: grid;
  place-items: center;
  background:
    linear-gradient(rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.12) 1px, transparent 1px),
    linear-gradient(135deg, #edf4ff 0%, #f8fbff 100%);
  background-size: 22px 22px, 22px 22px, auto;
  color: #7f96ba;
  font-size: 34px;
}

.card-body {
  display: grid;
  gap: 11px;
  padding: 16px 15px 17px;
}

.card-body h3 {
  overflow: hidden;
  margin: 0;
  color: #0f172a;
  font-size: 17px;
  font-weight: 800;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.18s ease;
}

.kb-card:hover .card-body h3,
.kb-card:focus-visible .card-body h3 {
  color: #1d5fd8;
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
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.08);
}

.section-wrap :deep(.el-empty) {
  border: 1px dashed #d6dfec;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
}

.site-footer {
  padding: 70px clamp(28px, 6vw, 112px);
  border-top: 1px solid #ded8f4;
  background: #f4f1fb;
}

.footer-inner {
  display: grid;
  width: min(1180px, 100%);
  grid-template-columns: 1.1fr 0.9fr;
  gap: 64px;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.footer-brand {
  padding-right: 64px;
  border-right: 1px solid #ded8f4;
}

.footer-logo {
  color: #5140bd;
  font-size: 36px;
  font-weight: 900;
}

.footer-logo span {
  color: #6b54e8;
}

.footer-brand p,
.footer-contact p {
  color: #5140bd;
  font-size: 20px;
  line-height: 1.8;
}

.footer-brand p:first-of-type {
  margin-top: 32px;
  font-weight: 800;
}

.footer-contact h2 {
  color: #4631b1;
  font-size: 32px;
  font-weight: 900;
}

.footer-contact p {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 22px;
}

.footer-contact .el-icon {
  color: #a296d8;
  font-size: 24px;
}

@media (max-width: 1180px) {
  .kb-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .kb-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .section-wrap {
    width: calc(100% - 28px);
  }

  .kb-banner {
    align-items: stretch;
    flex-direction: column;
    min-height: 0;
    padding: 24px 18px;
  }

  .banner-copy h1 {
    font-size: 32px;
  }

  .banner-copy p {
    width: 100%;
    padding-inline: 16px;
    font-size: 16px;
  }

  .banner-visual {
    width: 100%;
    height: 126px;
  }

  .kb-grid {
    grid-template-columns: 1fr;
  }

  .footer-inner {
    grid-template-columns: 1fr;
  }

  .footer-brand {
    padding-right: 0;
    border-right: 0;
  }
}
</style>
