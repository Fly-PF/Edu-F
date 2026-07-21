<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, MagicStick, Search, StarFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { listAiProjectCases } from '@/api/aiExhibit'
import drawGuessCover from '@/assets/img/bd5497d4-7e7a-4984-965d-2a2024e85d8f.png'
import textClassificationCover from '@/assets/img/ad5e70fe-b530-433a-bb6d-ef956ad7882f.png'

const router = useRouter()
const loading = ref(false)
const cases = ref([])

const filters = reactive({
  keyword: '',
})

const cardPresets = {
  waste_sorting_assistant: {
    title: '垃圾分类助手',
    subtitle: '识别图片中的垃圾类别',
    badge: '最新上架',
    theme: 'night',
    heat: '264,209',
    learners: '60,966',
    motif: 'orbit',
  },
  wrong_answer_helper: {
    title: '错题讲解',
    subtitle: '训练你的 AI 解题助手',
    badge: '热门训练',
    theme: 'blue',
    heat: '79,423',
    learners: '14,886',
    motif: 'text',
  },
  text_classification: {
    coverImage: textClassificationCover,
  },
  face_recognition: {
    title: '人脸识别',
    subtitle: '录入人脸并与实时画面做比对',
    badge: '实时体验',
    theme: 'dark',
    heat: '118,204',
    learners: '26,480',
    motif: 'face',
  },
  emotion_diary_analysis: {
    title: '情绪日记',
    subtitle: '分析文本中的情绪倾向',
    badge: 'AI体验',
    theme: 'peach',
    heat: '136,582',
    learners: '35,069',
    motif: 'music',
  },
  plant_recognition: {
    title: '校园植物识别',
    subtitle: '用视觉模型生成科普卡片',
    badge: '最新上架',
    theme: 'lime',
    heat: '205,675',
    learners: '57,714',
    motif: 'image',
  },
  poetry_learning_assistant: {
    title: '古诗词学习',
    subtitle: '生成解释、意象和背诵练习',
    badge: '热门训练',
    theme: 'purple',
    heat: '83,707',
    learners: '17,985',
    motif: 'pose',
  },
}

const fallbackCards = [
  {
    id: 'local-draw-guess',
    projectCode: 'draw_guess',
    projectName: '你画我猜',
    caseSummary: '在画布上绘画，AI 实时猜测结果',
    gradeBand: '小学',
    subjectDirection: '美术',
    practiceType: 'vision',
    aiCapability: 'vision',
    badge: '优先体验',
    theme: 'paper',
    heat: '454,929',
    learners: '46,477',
    motif: 'cover',
    coverImage: drawGuessCover,
  },
  {
    id: 'local-text-classify',
    projectCode: 'text_classification',
    projectName: '文本分类',
    caseSummary: '文本分类的训练与模型使用',
    gradeBand: '初中',
    subjectDirection: '信息科技',
    practiceType: 'text',
    aiCapability: 'llm',
    badge: '最新上架',
    theme: 'blue',
    heat: '79,423',
    learners: '14,886',
    motif: 'text',
  },
  {
    id: 'local-face-recognition',
    projectCode: 'face_recognition',
    projectName: '人脸识别',
    caseSummary: '录入一张人脸，再和当前摄像头画面做实时比对',
    gradeBand: '初中',
    subjectDirection: '信息科技',
    practiceType: 'vision',
    aiCapability: 'vision',
    badge: '实时体验',
    theme: 'dark',
    heat: '118,204',
    learners: '26,480',
    motif: 'face',
  },
  {
    id: 'local-doodle',
    projectCode: 'doodle_recognition',
    projectName: '涂鸦识别',
    caseSummary: '使用 AI 模型识别简笔画',
    gradeBand: '小学',
    subjectDirection: '美术',
    practiceType: 'vision',
    aiCapability: 'vision',
    badge: '最新上架',
    theme: 'yellow',
    heat: '454,929',
    learners: '46,477',
    motif: 'doodle',
  },
  {
    id: 'local-gesture',
    projectCode: 'gesture_classification',
    projectName: '手势分类',
    caseSummary: '手势分类的训练与模型使用',
    gradeBand: '初中',
    subjectDirection: '信息科技',
    practiceType: 'vision',
    aiCapability: 'vision',
    badge: '热门训练',
    theme: 'yellow',
    heat: '175,565',
    learners: '33,132',
    motif: 'hand',
  },
  {
    id: 'local-speech',
    projectCode: 'speech_classification',
    projectName: '语音分类',
    caseSummary: '音频分类的训练与模型使用',
    gradeBand: '高中',
    subjectDirection: '信息科技',
    practiceType: 'speech',
    aiCapability: 'speech',
    badge: '热门训练',
    theme: 'dark',
    heat: '48,373',
    learners: '11,521',
    motif: 'wave',
  },
]

const exhibitCards = computed(() => {
  const remoteCards = cases.value.map((item) => ({
    ...item,
    ...(cardPresets[item.projectCode] || {}),
    coverImage: resolveCoverImage(item.projectCode, item.cover || item.coverImage, cardPresets[item.projectCode]),
  }))

  const priorityCards = fallbackCards
    .filter((item) => item.projectCode === 'draw_guess')
    .map((item) => ({
      ...item,
      coverImage: resolveCoverImage(item.projectCode, item.coverImage),
    }))
  const otherFallbackCards = fallbackCards
    .filter((item) => item.projectCode !== 'draw_guess')
    .map((item) => ({
      ...item,
      coverImage: resolveCoverImage(item.projectCode, item.coverImage),
    }))
  const allCards = [...priorityCards, ...remoteCards, ...otherFallbackCards]
  const seenKeys = new Set()
  const uniqueCards = allCards.filter((item) => {
    const key = item.projectCode || item.id
    if (seenKeys.has(key)) {
      return false
    }
    seenKeys.add(key)
    return true
  })
  const keyword = filters.keyword.trim().toLowerCase()
  if (!keyword) return uniqueCards

  return uniqueCards.filter((item) => {
    return [item.projectName, item.title, item.caseSummary, item.subjectDirection, item.aiCapability]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword))
  })
})

function resolveCoverImage(projectCode, coverImage, preset = {}) {
  if (coverImage) {
    return coverImage
  }

  if (preset?.coverImage) {
    return preset.coverImage
  }

  if (projectCode === 'face_recognition') {
    return null
  }

  if (projectCode === 'text_classification') {
    return textClassificationCover
  }

  return drawGuessCover
}

async function loadCases() {
  loading.value = true
  try {
    const result = await listAiProjectCases({ pageNum: 1, pageSize: 20 })
    cases.value = result?.records || []
  } catch (error) {
    cases.value = []
    console.warn('AI exhibit remote cases failed:', error)
  } finally {
    loading.value = false
  }
}

function openExperience(item) {
  if (item.projectCode === 'draw_guess') {
    router.push({ name: 'ai-draw-guess' })
    return
  }

  if (item.projectCode === 'face_recognition') {
    router.push({ name: 'ai-face-recognition' })
    return
  }

  router.push({
    name: 'ai-experience',
    params: { caseId: item.id },
    query: { code: item.projectCode, title: item.title || item.projectName },
  })
}

onMounted(loadCases)
</script>

<template>
  <div class="ai-exhibit-page">
    <section class="discovery-hero">
      <div class="hero-spark spark-one"></div>
      <div class="hero-spark spark-two"></div>
      <div class="hero-copy">
        <p class="hero-kicker"><MagicStick :size="14" /> AI EXPLORATION CLUB</p>
        <h1>AI 探索乐园</h1>
        <p class="hero-description">动手试一试，把好奇心变成属于你的 AI 小发明。</p>
        <div class="hero-actions">
          <button
            v-if="exhibitCards.length"
            class="hero-start"
            type="button"
            @click="openExperience(exhibitCards[0])"
          >
            从 {{ exhibitCards[0].title || exhibitCards[0].projectName }} 开始
            <ArrowRight :size="18" />
          </button>
          <span class="hero-note"><StarFilled :size="14" /> 一起发现 AI 的 100 种可能</span>
        </div>
      </div>
      <div class="hero-art" aria-hidden="true">
        <span class="art-orbit orbit-one"></span>
        <span class="art-orbit orbit-two"></span>
        <span class="art-core"><span></span><span></span><span></span></span>
        <span class="art-card card-one">IDEA</span>
        <span class="art-card card-two">MAKE</span>
        <span class="art-star star-one">+</span>
        <span class="art-star star-two">*</span>
      </div>
    </section>
    <section class="catalog-toolbar">
      <div>
        <p class="eyebrow">AI EXPERIENCE</p>
        <h1>AI 体验</h1>
      </div>
      <el-input
        v-model="filters.keyword"
        class="catalog-search"
        clearable
        :prefix-icon="Search"
        placeholder="搜索 AI 体验"
      />
    </section>

    <section v-loading="loading" class="experience-grid">
      <button
        v-for="item in exhibitCards"
        :key="`${item.projectCode}-${item.id}`"
        type="button"
        class="experience-card"
        :class="[
          `theme-${item.theme || 'blue'}`,
          `motif-${item.motif || 'text'}`,
          { 'has-cover': !!item.coverImage, 'is-light-text': item.projectCode === 'text_classification' },
        ]"
        @click="openExperience(item)"
      >
        <img v-if="item.coverImage" class="cover-image" :src="item.coverImage" alt="" aria-hidden="true" />
        <span v-if="!item.coverImage" class="corner-badge">{{ item.badge || 'AI体验' }}</span>
        <span v-if="!item.coverImage" class="visual visual-one"></span>
        <span v-if="!item.coverImage" class="visual visual-two"></span>
        <span v-if="!item.coverImage" class="visual visual-three"></span>

        <span class="card-title">{{ item.title || item.projectName }}</span>
        <span class="card-action">点击进入体验</span>
      </button>

      <el-empty v-if="!loading && exhibitCards.length === 0" description="暂无 AI 体验" />
    </section>
  </div>
</template>

<style scoped>
.ai-exhibit-page {
  min-height: calc(100vh - 64px);
  padding: 56px 64px 72px;
  background: #fbfbfd;
}

.catalog-toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin: 0 auto 34px;
  max-width: 1600px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #7c6cf5;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0;
}

.catalog-toolbar h1 {
  margin: 0;
  color: #202335;
  font-size: 28px;
  line-height: 1.2;
}

.catalog-search {
  width: 320px;
}

.experience-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(260px, 1fr));
  gap: 48px 36px;
  max-width: 1600px;
  margin: 0 auto;
}

.experience-card {
  position: relative;
  display: grid;
  min-height: 184px;
  overflow: hidden;
  padding: 26px 26px 20px;
  border: 0;
  border-radius: 26px;
  color: #fff;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 18px 36px rgb(39 44 70 / 8%);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.experience-card.has-cover {
  min-height: 0;
  aspect-ratio: 3 / 2;
  padding: 42px 24px 18px 44px;
}

.cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
}

.experience-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 24px 44px rgb(39 44 70 / 15%);
}

.card-title {
  position: relative;
  z-index: 2;
}

.card-title {
  align-self: start;
  max-width: 80%;
  margin-top: 8px;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.15;
}

.card-action {
  position: relative;
  z-index: 2;
  align-self: start;
  margin-top: 8px;
  color: rgb(255 255 255 / 84%);
  font-size: 14px;
  font-weight: 700;
}

.corner-badge {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 3;
  width: 104px;
  height: 38px;
  transform: translate(28px, 18px) rotate(45deg);
  background: linear-gradient(135deg, #ff7955, #ff59cc);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  line-height: 38px;
  text-align: center;
}

.visual {
  position: absolute;
  pointer-events: none;
}

.theme-night {
  background: radial-gradient(circle at 70% 20%, #38406c 0, transparent 16%), linear-gradient(135deg, #071026 0%, #18213d 100%);
}

.theme-blue {
  background: linear-gradient(135deg, #0a3db7 0%, #123ed0 100%);
}

.theme-lime {
  background: linear-gradient(135deg, #bbfb27 0%, #9cf332 100%);
  color: #101827;
}

.theme-yellow {
  background: linear-gradient(135deg, #fff044 0%, #ffd534 100%);
  color: #121212;
}

.theme-paper {
  background: linear-gradient(135deg, #ffffff 0%, #f7f2ff 100%);
  color: #26213b;
}

.theme-purple {
  background: linear-gradient(135deg, #7540bc 0%, #8a4cd5 100%);
}

.theme-peach {
  background: linear-gradient(135deg, #f8d2a7 0%, #f7bd8d 100%);
  color: #27160e;
}

.theme-dark {
  background: linear-gradient(135deg, #07111f 0%, #111c35 100%);
}

.motif-orbit .visual-one {
  right: -82px;
  bottom: -56px;
  width: 220px;
  height: 220px;
  border: 2px solid rgb(255 255 255 / 42%);
  border-radius: 50%;
  box-shadow: 0 0 42px rgb(160 210 255 / 52%);
}

.motif-orbit .visual-two {
  right: 20px;
  bottom: 34px;
  width: 132px;
  height: 14px;
  transform: rotate(-18deg);
  border-radius: 999px;
  background: rgb(255 255 255 / 42%);
  filter: blur(2px);
}

.motif-text .visual-one,
.motif-text .visual-two,
.motif-text .visual-three {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  color: #fff;
  font-size: 28px;
  font-weight: 900;
  line-height: 50px;
  text-align: center;
}

.motif-text .visual-one {
  right: 66px;
  bottom: 48px;
  transform: rotate(9deg);
  background: #ff6961;
}

.motif-text .visual-two {
  right: 22px;
  bottom: 88px;
  transform: rotate(-8deg);
  background: #ffe25d;
}

.motif-text .visual-three {
  right: 120px;
  bottom: 82px;
  transform: rotate(7deg);
  background: #4bb4ff;
}

.motif-text .visual-one::before,
.motif-text .visual-two::before,
.motif-text .visual-three::before {
  content: 'T';
}

.motif-image .visual-one,
.motif-image .visual-two,
.motif-image .visual-three {
  right: 26px;
  width: 120px;
  height: 74px;
  border: 8px solid #fff;
  border-radius: 6px;
  background: linear-gradient(135deg, #9fd7f1, #f3f7b0 52%, #7cc06b 53%);
  box-shadow: 0 8px 16px rgb(29 50 69 / 18%);
}

.motif-image .visual-one {
  bottom: 20px;
  transform: rotate(-10deg);
}

.motif-image .visual-two {
  right: 104px;
  bottom: 64px;
  transform: rotate(12deg);
}

.motif-image .visual-three {
  right: 0;
  bottom: 96px;
  transform: rotate(-16deg);
}

.motif-doodle .visual-one {
  right: -20px;
  bottom: -32px;
  width: 210px;
  height: 210px;
  border-radius: 50%;
  background: #fff;
}

.motif-doodle .visual-two {
  right: 82px;
  bottom: 42px;
  width: 150px;
  height: 64px;
  border: 12px solid #202020;
  border-right: 0;
  border-bottom: 0;
  border-radius: 50% 0 0 0;
  transform: rotate(-28deg);
}

.motif-doodle .visual-three {
  right: -6px;
  bottom: -10px;
  width: 56px;
  height: 188px;
  transform: rotate(35deg);
  border-radius: 18px;
  background: linear-gradient(90deg, #f9b632, #ffe173 56%, #f9b632 57%);
}

.motif-pose .visual-one {
  right: 24px;
  bottom: 0;
  width: 142px;
  height: 182px;
  border-radius: 80px 80px 18px 18px;
  background: linear-gradient(150deg, #f4c6aa, #8f5aca 56%, #6e3bb5 57%);
}

.motif-pose .visual-two {
  right: 132px;
  bottom: 32px;
  width: 74px;
  height: 126px;
  border-radius: 42px 42px 16px 16px;
  background: rgb(255 255 255 / 28%);
  filter: blur(2px);
}

.motif-face .visual-one {
  right: 40px;
  bottom: 24px;
  width: 136px;
  height: 136px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 32%, #d7f9ff 0, #91ecf4 36%, #3bcee4 72%, #1b90c8 100%);
  box-shadow: inset 0 -10px 22px rgb(10 68 115 / 16%);
}

.motif-face .visual-two {
  right: 82px;
  bottom: 56px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgb(255 255 255 / 26%);
}

.motif-face .visual-three {
  right: 132px;
  bottom: 68px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgb(255 255 255 / 36%);
}

.motif-music .visual-one,
.motif-music .visual-two,
.motif-music .visual-three {
  background: #2d2d2d;
}

.motif-music .visual-one {
  right: 42px;
  bottom: 26px;
  width: 104px;
  height: 84px;
  clip-path: polygon(0 24%, 100% 0, 100% 100%, 0 78%);
}

.motif-music .visual-two {
  right: 136px;
  bottom: 42px;
  width: 62px;
  height: 62px;
  border-radius: 50%;
}

.motif-music .visual-three {
  right: 10px;
  bottom: 40px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
}

.motif-hand .visual-one {
  right: 62px;
  bottom: 0;
  width: 80px;
  height: 132px;
  border-radius: 46px 46px 12px 12px;
  background: #ffc6bf;
}

.motif-hand .visual-two,
.motif-hand .visual-three {
  bottom: 28px;
  width: 46px;
  height: 114px;
  border-radius: 28px;
  background: #ffc6bf;
}

.motif-hand .visual-two {
  right: 26px;
  transform: rotate(24deg);
}

.motif-hand .visual-three {
  right: 118px;
  transform: rotate(-24deg);
}

.motif-wave .visual-one {
  right: -30px;
  bottom: -18px;
  width: 220px;
  height: 84px;
  border-radius: 50%;
  border-top: 8px solid rgb(124 177 255 / 70%);
  filter: blur(1px);
}

.motif-wave .visual-two {
  right: 20px;
  bottom: 36px;
  width: 170px;
  height: 48px;
  background: repeating-radial-gradient(circle, rgb(150 200 255 / 76%) 0 2px, transparent 3px 12px);
}

.experience-card.has-cover .card-title,
.experience-card.has-cover .card-action {
  position: relative;
  z-index: 2;
  color: #312c46;
}

.experience-card.has-cover .card-title {
  max-width: 72%;
  margin-top: 12px;
}

.experience-card.has-cover .card-action {
  color: rgb(49 44 70 / 74%);
}

.experience-card.has-cover .corner-badge {
  color: #fff;
}

.experience-card.is-light-text .card-title,
.experience-card.is-light-text .card-action {
  color: #fff;
}

.experience-card.is-light-text .card-action {
  color: rgb(255 255 255 / 86%);
}

@media (max-width: 1400px) {
  .experience-grid {
    grid-template-columns: repeat(3, minmax(260px, 1fr));
  }
}

@media (max-width: 1060px) {
  .ai-exhibit-page {
    padding: 32px 24px;
  }

  .experience-grid {
    grid-template-columns: repeat(2, minmax(240px, 1fr));
  }
}

@media (max-width: 720px) {
  .catalog-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .catalog-search {
    width: 100%;
  }

  .experience-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}
/* AI exploration visual system */
.ai-exhibit-page {
  --ink: #3d3564;
  --purple: #8178cf;
  --pink: #ee91bb;
  --mint: #9de4eb;
  --yellow: #fff1a8;
  position: relative;
  isolation: isolate;
  padding: 30px clamp(18px, 5vw, 80px) 72px;
  overflow: hidden;
  background-color: #fbfbff;
  background-image: linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px), linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
}

.discovery-hero {
  position: relative;
  display: flex;
  min-height: 312px;
  max-width: 1600px;
  margin: 0 auto 42px;
  padding: clamp(28px, 4vw, 54px) clamp(26px, 5vw, 76px);
  overflow: hidden;
  border: 1px solid rgb(88 77 137 / 26%);
  border-radius: 14px;
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%);
  box-shadow: 0 18px 38px rgb(91 77 148 / 13%);
}

.discovery-hero::before,
.discovery-hero::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.discovery-hero::before {
  width: 430px;
  height: 430px;
  top: -250px;
  left: 43%;
  border: 2px solid rgb(255 255 255 / 72%);
  border-radius: 43% 57% 62% 38% / 42% 42% 58% 58%;
  transform: rotate(13deg);
}

.discovery-hero::after {
  right: -6%;
  bottom: -34px;
  width: 74%;
  height: 74px;
  border-top: 3px dashed rgb(87 75 137 / 35%);
  transform: rotate(-4deg);
}

.hero-copy { position: relative; z-index: 2; max-width: 570px; }
.hero-kicker { display: flex; align-items: center; gap: 8px; margin: 0; color: #6f649a; font-size: 12px; font-weight: 850; letter-spacing: 1.5px; }
.hero-kicker :deep(svg) { color: #d3759f; }
.discovery-hero h1 { margin: 15px 0 0; color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: clamp(42px, 5vw, 68px); font-weight: 900; line-height: 1.04; text-shadow: 2px 2px 0 rgb(255 255 255 / 72%); }
.hero-description { max-width: 430px; margin: 18px 0 0; color: #615783; font-size: 15px; font-weight: 650; line-height: 1.75; }
.hero-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; margin-top: 25px; }
.hero-start { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 8px; min-width: 214px; height: 46px; padding: 0 16px; border: 1px solid #4e4473; border-radius: 5px; background: var(--purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 28%); color: #fff; font-size: 14px; font-weight: 800; line-height: 1; white-space: nowrap; word-break: keep-all; cursor: pointer; transition: transform .2s ease, box-shadow .2s ease; }
.hero-start:hover { transform: translate(-2px, -3px); box-shadow: 5px 7px 0 rgb(61 53 100 / 26%); }
.hero-note { display: inline-flex; align-items: center; gap: 6px; color: #65597f; font-size: 12px; font-weight: 800; }
.hero-note :deep(svg) { color: #e2a153; }

.hero-art { position: absolute; z-index: 1; top: 50%; right: clamp(24px, 7vw, 108px); width: min(31vw, 360px); height: 250px; transform: translateY(-47%); }
.art-orbit { position: absolute; inset: 32px 20px; border: 2px solid rgb(78 68 115 / 44%); border-radius: 50%; animation: orbit-spin 12s linear infinite; }
.orbit-two { inset: 65px 0 0 0; border-style: dashed; transform: rotate(58deg); animation-direction: reverse; animation-duration: 15s; }
.art-core { position: absolute; top: 76px; left: 50%; display: grid; width: 118px; height: 118px; place-items: center; transform: translateX(-50%); border: 2px solid #4e4473; border-radius: 42% 58% 57% 43% / 49% 39% 61% 51%; background: var(--yellow); box-shadow: 7px 7px 0 rgb(61 53 100 / 20%); animation: core-wobble 5s ease-in-out infinite; }
.art-core span { position: absolute; width: 14px; height: 14px; border-radius: 50%; background: #e68db5; }.art-core span:nth-child(1) { transform: translate(-25px, -19px); }.art-core span:nth-child(2) { background: #52bbc4; transform: translate(27px, 13px); }.art-core span:nth-child(3) { width: 22px; height: 22px; background: #8178cf; }
.art-card { position: absolute; display: grid; width: 74px; height: 54px; place-items: center; border: 2px solid #4e4473; border-radius: 7px; box-shadow: 3px 4px 0 rgb(61 53 100 / 23%); color: #4e4473; font-family: Impact, 'Arial Black', sans-serif; font-size: 15px; letter-spacing: 1px; }.card-one { top: 12px; right: 20px; background: var(--mint); transform: rotate(11deg); animation: float-card 4.5s ease-in-out infinite; }.card-two { bottom: 13px; left: 13px; background: var(--pink); color: #fff; transform: rotate(-9deg); animation: float-card 5.5s ease-in-out infinite reverse; }
.art-star { position: absolute; color: #d3759f; font-size: 35px; font-weight: 900; }.star-one { top: 0; left: 34px; animation: sparkle 2.1s ease-in-out infinite; }.star-two { right: 0; bottom: 25px; color: #52bbc4; animation: sparkle 2.1s .65s ease-in-out infinite; }
.hero-spark { position: absolute; border-radius: 50%; opacity: .65; filter: blur(2px); }.spark-one { top: 23%; right: 42%; width: 13px; height: 13px; background: #e68db5; animation: sparkle 2.3s ease-in-out infinite; }.spark-two { bottom: 21%; right: 31%; width: 9px; height: 9px; background: #e0a153; animation: sparkle 2.3s .8s ease-in-out infinite; }

.catalog-toolbar { align-items: flex-end; margin-bottom: 26px; padding: 0 4px 14px; border-bottom: 1px solid rgb(61 53 100 / 20%); }
.catalog-toolbar .eyebrow { display: none; }
.catalog-toolbar h1 { color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 28px; font-weight: 900; }
.catalog-search { width: min(320px, 100%); }.catalog-search :deep(.el-input__wrapper) { min-height: 42px; border: 1px solid rgb(78 68 121 / 38%); border-radius: 6px; background: rgb(255 255 255 / 86%); box-shadow: 2px 3px 0 rgb(61 53 100 / 12%); }.catalog-search :deep(.el-input__inner) { color: var(--ink); font-weight: 650; }

.experience-grid { gap: 22px; }
.experience-card { min-height: 212px; padding: 25px 24px 21px; border: 2px solid var(--ink); border-radius: 9px; box-shadow: 5px 5px 0 rgb(61 53 100 / 76%); transition: transform .22s ease, box-shadow .22s ease; }
.experience-card.has-cover { min-height: 212px; aspect-ratio: auto; padding: 25px 24px 21px; }
.experience-card:hover { transform: translate(-4px, -6px) rotate(-.45deg); box-shadow: 10px 11px 0 rgb(61 53 100 / 76%); }
.experience-card::after { position: absolute; inset: 0; z-index: 1; content: ''; background: linear-gradient(180deg, transparent 24%, rgb(44 37 79 / 14%) 100%); pointer-events: none; }
.experience-card.has-cover::after { background: linear-gradient(180deg, transparent 25%, rgb(43 34 83 / 35%) 100%); }
.cover-image { z-index: 0; width: 100%; height: 100%; object-fit: cover; opacity: .9; mix-blend-mode: multiply; }
.experience-card.has-cover .card-title, .experience-card.has-cover .card-action { color: #fff; text-shadow: 0 1px 2px rgb(61 53 100 / 32%); }
.experience-card.has-cover .card-title { max-width: 82%; margin-top: 18px; }.experience-card.has-cover .card-action { color: rgb(255 255 255 / 92%); }
.card-title { z-index: 2; max-width: 76%; margin-top: 12px; font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 23px; font-weight: 900; line-height: 1.14; }.card-action { display: inline-flex; align-items: center; gap: 5px; z-index: 2; margin-top: auto; padding-top: 14px; color: rgb(255 255 255 / 88%); font-size: 13px; font-weight: 800; }
.corner-badge { top: 12px; right: 12px; width: auto; height: auto; padding: 4px 8px; transform: rotate(3deg); border: 1px solid var(--ink); border-radius: 4px; background: var(--yellow); box-shadow: 2px 2px 0 rgb(61 53 100 / 35%); color: var(--ink); font-size: 10px; line-height: 1.25; }
.theme-blue { background: linear-gradient(135deg, #8178cf, #6a9bd1); }.theme-night, .theme-dark { background: linear-gradient(135deg, #514d87, #6d8ab7); }.theme-lime { background: linear-gradient(135deg, #b4e9ca, #9de4eb); }.theme-yellow { background: linear-gradient(135deg, #fff1a8, #f9d6a8); }.theme-paper { background: linear-gradient(135deg, #fff, #f9edf3); }.theme-purple { background: linear-gradient(135deg, #a995d8, #e2a4c3); }.theme-peach { background: linear-gradient(135deg, #f6cfa9, #eea4ba); }
.theme-lime, .theme-yellow, .theme-paper { color: var(--ink); }.theme-lime .card-action, .theme-yellow .card-action, .theme-paper .card-action { color: #5e5576; }.theme-lime .visual, .theme-yellow .visual, .theme-paper .visual { opacity: .7; }
.motif-orbit .visual-one { box-shadow: 0 0 0 8px rgb(255 255 255 / 12%); animation: orbit-spin 12s linear infinite; }.motif-doodle .visual-one { background: rgb(255 255 255 / 82%); }.motif-face .visual-one { background: radial-gradient(circle at 35% 32%, #e5fcff, #9de4eb 46%, #7aabd8); }.motif-hand .visual-one, .motif-hand .visual-two, .motif-hand .visual-three { background: #f6c7bd; }

@keyframes orbit-spin { to { transform: rotate(360deg); } }
@keyframes core-wobble { 0%, 100% { transform: translateX(-50%) rotate(-4deg); } 50% { transform: translateX(-50%) rotate(5deg) translateY(-7px); } }
@keyframes float-card { 0%, 100% { margin-top: 0; } 50% { margin-top: -11px; } }
@keyframes sparkle { 0%, 100% { opacity: .38; transform: scale(.75) rotate(0); } 50% { opacity: 1; transform: scale(1.2) rotate(12deg); } }

@media (max-width: 850px) { .hero-art { right: -25px; opacity: .56; }.hero-copy { max-width: 470px; }.experience-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { .ai-exhibit-page { padding: 18px 16px 44px; }.discovery-hero { min-height: 405px; margin-bottom: 28px; padding: 30px 24px; }.discovery-hero h1 { font-size: 42px; }.hero-art { top: auto; bottom: -35px; right: -35px; width: 270px; transform: none; }.catalog-toolbar { align-items: stretch; flex-direction: column; gap: 16px; }.catalog-search { width: 100%; }.experience-grid { grid-template-columns: 1fr; gap: 18px; }.experience-card, .experience-card.has-cover { min-height: 205px; }.hero-note { width: 100%; } }
</style>
