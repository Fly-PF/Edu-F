<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@element-plus/icons-vue'
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
</style>
