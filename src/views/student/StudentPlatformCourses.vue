<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  Clock,
  Collection,
  Document,
  Files,
  FolderOpened,
  Picture,
  Refresh,
  Search,
  User,
  VideoPlay,
} from '@element-plus/icons-vue'
import { getCourse, getCourseChapters, listPublicCourses } from '@/api/course'
import cover1 from '@/assets/course/img1.webp'
import cover2 from '@/assets/course/img2.webp'
import cover3 from '@/assets/course/img3.webp'
import cover4 from '@/assets/course/img4.webp'

const covers = [cover1, cover2, cover3, cover4]
const router = useRouter()
const loading = ref(false)
const courses = ref([])
const filters = reactive({
  keyword: '',
  grade: '',
  difficulty: null,
  courseType: null,
})

const detailVisible = ref(false)
const detailLoading = ref(false)
const detailCourse = ref(null)
const detailChapters = ref([])

function fallbackCover(course) {
  return covers[Math.abs(Number(course?.id || 0)) % covers.length]
}

function difficultyText(value) {
  return { 1: '入门', 2: '进阶', 3: '高阶' }[value] || '未设置'
}

function courseTypeText(value) {
  return { 1: '理论课', 2: '项目实践课', 3: '实验课' }[value] || '课程'
}

function resourceIcon(type) {
  return { 1: VideoPlay, 2: Document, 3: Picture, 4: Files }[type] || Files
}

function resourceTypeText(type) {
  return { 1: '视频', 2: 'PDF', 3: '图片', 4: '数据文件' }[type] || '资源'
}

async function loadCourses() {
  loading.value = true
  try {
    courses.value =
      (await listPublicCourses({
        keyword: filters.keyword.trim() || undefined,
        grade: filters.grade || undefined,
        difficulty: filters.difficulty || undefined,
        courseType: filters.courseType || undefined,
      })) || []
  } catch (error) {
    ElMessage.error(error?.message || '课程列表加载失败')
  } finally {
    loading.value = false
  }
}

function resetFilters() {
  Object.assign(filters, { keyword: '', grade: '', difficulty: null, courseType: null })
  loadCourses()
}

async function openDetail(course) {
  detailVisible.value = true
  detailLoading.value = true
  detailCourse.value = course
  detailChapters.value = []
  try {
    const [courseData, chapterData] = await Promise.all([
      getCourse(course.id),
      getCourseChapters(course.id),
    ])
    detailCourse.value = courseData
    detailChapters.value = chapterData || []
  } catch (error) {
    ElMessage.error(error?.message || '课程详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

function startLearning(course) {
  if (!course?.id) return
  router.push({ name: 'course-learn', params: { courseId: course.id } })
}

onMounted(loadCourses)
</script>

<template>
  <main class="platform-course-page">
    <header class="course-hero">
      <div class="hero-copy">
        <p class="hero-kicker"><span></span> AI EXPLORER CLUB</p>
        <h1>把好奇心<br />变成超能力</h1>
        <p class="hero-description">挑一门喜欢的课，和 AI 一起动手、创作、发现新世界。</p>
        <div class="hero-actions">
          <span class="hero-note">本周持续更新</span>
          <el-tooltip content="刷新课程" placement="bottom">
            <el-button
              class="refresh-button"
              circle
              aria-label="刷新课程"
              :loading="loading"
              @click="loadCourses"
            >
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>

      <div class="hero-art" aria-hidden="true">
        <div class="hero-spray spray-one"></div>
        <div class="hero-spray spray-two"></div>
        <div class="hero-sticker sticker-one">AI</div>
        <div class="hero-sticker sticker-two">GO!</div>
        <div class="hero-grid-mark"></div>
        <p>CREATE<br />PLAY<br />LEARN</p>
      </div>
    </header>

    <section class="catalog-browser" aria-label="课程筛选">
      <div class="browser-heading">
        <p>探索地图</p>
        <h2>今天，想解锁什么新技能？</h2>
      </div>
      <div class="catalog-toolbar">
      <el-input
        v-model="filters.keyword"
        clearable
        class="catalog-search"
        placeholder="搜索课程名称或介绍"
        @keyup.enter="loadCourses"
        @clear="loadCourses"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="filters.grade" clearable placeholder="适配学段" @change="loadCourses">
        <el-option label="通用" value="通用" />
        <el-option label="小学" value="小学" />
        <el-option label="初中" value="初中" />
        <el-option label="高中" value="高中" />
        <el-option label="大学" value="大学" />
      </el-select>
      <el-select v-model="filters.difficulty" clearable placeholder="课程难度" @change="loadCourses">
        <el-option label="入门" :value="1" />
        <el-option label="进阶" :value="2" />
        <el-option label="高阶" :value="3" />
      </el-select>
      <el-select v-model="filters.courseType" clearable placeholder="课程类型" @change="loadCourses">
        <el-option label="理论课" :value="1" />
        <el-option label="项目实践课" :value="2" />
        <el-option label="实验课" :value="3" />
      </el-select>
        <el-tooltip content="清除筛选" placement="bottom">
          <el-button class="reset-button" circle aria-label="清除筛选" @click="resetFilters">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </section>

    <section v-loading="loading" class="catalog-grid" aria-live="polite">
      <article
        v-for="(course, index) in courses"
        :key="course.id"
        class="catalog-card"
        :class="`card-tone-${index % 4}`"
        role="button"
        tabindex="0"
        @click="openDetail(course)"
        @keydown.enter="openDetail(course)"
        @keydown.space.prevent="openDetail(course)"
      >
        <div class="catalog-cover">
          <el-image :src="course.coverUrl || fallbackCover(course)" fit="cover" />
          <span class="course-type">{{ courseTypeText(course.courseType) }}</span>
          <span class="cover-scribble"></span>
        </div>
        <div class="catalog-card-body">
          <div class="catalog-tags">
            <span>{{ course.grade || '通用' }}</span>
            <span>{{ difficultyText(course.difficulty) }}</span>
            <span v-for="tag in (course.tags || []).slice(0, 2)" :key="tag">{{ tag }}</span>
          </div>
          <h2>{{ course.title }}</h2>
          <p>{{ course.description || '老师暂未填写课程介绍。' }}</p>
          <div class="catalog-meta">
            <span><el-icon><User /></el-icon>{{ course.teacherName || '平台教师' }}</span>
            <span><el-icon><FolderOpened /></el-icon>{{ course.totalChapter || 0 }} 个任务站</span>
          </div>
          <div class="catalog-footer">
            <span><el-icon><Collection /></el-icon>{{ course.resourceCount || 0 }} 个资源</span>
            <span><el-icon><Clock /></el-icon>{{ course.totalDuration || 0 }} 分钟</span>
            <b>去探索 <i></i></b>
          </div>
        </div>
      </article>
    </section>

    <el-empty v-if="!loading && courses.length === 0" description="没有符合条件的公开课程">
      <el-button @click="resetFilters">清除筛选</el-button>
    </el-empty>

    <el-drawer v-model="detailVisible" class="course-drawer" size="min(760px, 94vw)" title="课程详情">
      <div v-loading="detailLoading" class="course-detail-drawer">
        <template v-if="detailCourse">
          <img :src="detailCourse.coverUrl || fallbackCover(detailCourse)" alt="课程封面" />
          <div class="detail-heading">
            <div>
              <p>{{ detailCourse.grade }} · {{ difficultyText(detailCourse.difficulty) }}</p>
              <h2>{{ detailCourse.title }}</h2>
            </div>
            <el-tag type="success">已发布</el-tag>
          </div>
          <div class="detail-facts">
            <span><el-icon><User /></el-icon>{{ detailCourse.teacherName || '平台教师' }}</span>
            <span><el-icon><FolderOpened /></el-icon>{{ detailCourse.totalChapter || 0 }} 个章节</span>
            <span><el-icon><Collection /></el-icon>{{ detailCourse.resourceCount || 0 }} 个资源</span>
          </div>
          <div class="detail-actions">
            <el-button type="primary" @click="startLearning(detailCourse)">开始学习</el-button>
          </div>
          <section class="detail-intro">
            <h3>课程介绍</h3>
            <p>{{ detailCourse.description || '老师暂未填写课程介绍。' }}</p>
          </section>
          <section class="detail-catalog">
            <h3>课程目录</h3>
            <el-collapse>
              <el-collapse-item v-for="(chapter, index) in detailChapters" :key="chapter.id" :name="chapter.id">
                <template #title>
                  <span class="chapter-title">{{ index + 1 }}. {{ chapter.title }}</span>
                  <small>{{ chapter.resources?.length || 0 }} 个资源</small>
                </template>
                <div v-for="resource in chapter.resources || []" :key="resource.id" class="detail-resource">
                  <span class="detail-resource-icon">
                    <component :is="resourceIcon(resource.type)" />
                  </span>
                  <div>
                    <strong>{{ resource.name }}</strong>
                    <small>{{ resourceTypeText(resource.type) }}</small>
                  </div>
                </div>
                <el-empty v-if="!chapter.resources?.length" description="暂无资源" :image-size="50" />
              </el-collapse-item>
            </el-collapse>
            <el-empty v-if="detailChapters.length === 0" description="暂无课程目录" />
          </section>
        </template>
      </div>
    </el-drawer>
  </main>
</template>

<style scoped>
.platform-course-page {
  --ink: #3d3564;
  --purple: #8178cf;
  --pink: #ee91bb;
  --yellow: #fff1a8;
  --cyan: #9de4eb;
  min-height: 100%;
  padding: 30px clamp(18px, 5vw, 80px) 68px;
  overflow: hidden;
  background-color: #fbfbff;
  background-image:
    linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px),
    linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--ink);
}

.course-hero {
  position: relative;
  display: flex;
  min-height: 294px;
  align-items: stretch;
  justify-content: space-between;
  gap: 30px;
  padding: clamp(28px, 4vw, 54px) clamp(26px, 5vw, 76px);
  overflow: hidden;
  border: 1px solid rgb(88 77 137 / 26%);
  border-radius: 14px;
  background:
    linear-gradient(118deg, #e8e4ff 0%, #f9ddec 43%, #d3f2f2 100%);
  box-shadow: 0 18px 38px rgb(91 77 148 / 13%);
  isolation: isolate;
}

.course-hero::before,
.course-hero::after {
  position: absolute;
  z-index: -1;
  display: block;
  content: '';
}

.course-hero::before {
  width: 430px;
  height: 430px;
  top: -220px;
  left: 43%;
  border: 2px solid rgb(255 255 255 / 72%);
  border-radius: 43% 57% 62% 38% / 42% 42% 58% 58%;
  transform: rotate(13deg);
}

.course-hero::after {
  width: 75%;
  height: 66px;
  right: -7%;
  bottom: -28px;
  border-top: 3px dashed rgb(87 75 137 / 38%);
  transform: rotate(-4deg);
}

.hero-copy {
  position: relative;
  z-index: 1;
  max-width: 560px;
}

.hero-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  color: #6f649a;
  font-family: 'Trebuchet MS', sans-serif;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.hero-kicker span {
  width: 9px;
  height: 9px;
  border: 1px solid #766b9e;
  border-radius: 50%;
  background: var(--yellow);
  box-shadow: 2px 2px 0 rgb(61 53 100 / 28%);
}

.course-hero h1 {
  margin: 0;
  padding-top: 17px;
  color: #3e3564;
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: clamp(38px, 5vw, 66px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.04;
  text-shadow: 2px 2px 0 rgb(255 255 255 / 72%);
}

.hero-description {
  max-width: 395px;
  margin: 18px 0 0;
  color: #615783;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.75;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 23px;
}

.hero-note {
  padding: 7px 11px;
  border: 1px solid rgb(78 68 121 / 52%);
  border-radius: 4px;
  background: var(--yellow);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 25%);
  color: var(--ink);
  font-size: 12px;
  font-weight: 800;
  transform: rotate(-2deg);
}

.refresh-button {
  width: 38px;
  height: 38px;
  border: 1px solid rgb(78 68 121 / 48%) !important;
  background: #ffffff !important;
  color: var(--purple) !important;
  box-shadow: 2px 3px 0 rgb(61 53 100 / 25%);
}

.refresh-button:hover,
.refresh-button:focus-visible {
  transform: translate(-1px, -1px) rotate(12deg);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 25%);
}

.hero-art {
  position: relative;
  width: min(37%, 370px);
  min-width: 285px;
  z-index: 1;
}

.hero-art p {
  position: absolute;
  z-index: 2;
  top: 57px;
  right: 19%;
  margin: 0;
  color: var(--ink);
  font-family: Impact, 'Arial Black', sans-serif;
  font-size: clamp(26px, 3vw, 43px);
  line-height: 0.87;
  text-align: right;
  transform: rotate(-9deg);
}

.hero-spray {
  position: absolute;
  border: 2px solid #4e4473;
}

.spray-one {
  width: 172px;
  height: 172px;
  top: 14px;
  right: 8px;
  border-radius: 62% 38% 36% 64% / 44% 55% 45% 56%;
  background: var(--yellow);
  transform: rotate(-18deg);
}

.spray-two {
  width: 103px;
  height: 103px;
  right: 183px;
  bottom: 2px;
  border-radius: 41% 59% 67% 33% / 57% 37% 63% 43%;
  background: var(--cyan);
  transform: rotate(25deg);
}

.hero-grid-mark {
  position: absolute;
  z-index: -1;
  width: 145px;
  height: 122px;
  right: 4px;
  bottom: 5px;
  background-image: radial-gradient(#766a9b 1.7px, transparent 2px);
  background-size: 13px 13px;
  opacity: 0.72;
  transform: rotate(8deg);
}

.hero-sticker {
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  border: 2px solid #4e4473;
  color: #4e4473;
  font-family: Impact, 'Arial Black', sans-serif;
  font-size: 21px;
  line-height: 1;
  box-shadow: 2px 3px 0 rgb(61 53 100 / 27%);
}

.sticker-one {
  width: 50px;
  height: 50px;
  top: 3px;
  right: 0;
  border-radius: 50%;
  background: #ffffff;
  transform: rotate(13deg);
}

.sticker-two {
  width: 57px;
  height: 40px;
  bottom: 22px;
  left: 35px;
  border-radius: 6px;
  background: var(--pink);
  color: #ffffff;
  transform: rotate(-11deg);
}

.catalog-browser {
  padding-top: 40px;
}

.browser-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 20px;
}

.browser-heading p {
  margin: 0;
  color: #d3759f;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 1px;
}

.browser-heading h2 {
  flex: 1;
  margin: 0;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: clamp(25px, 3vw, 36px);
  font-weight: 900;
  letter-spacing: 0;
}

.catalog-toolbar {
  display: grid;
  margin: 17px 0 25px;
  grid-template-columns: minmax(220px, 1.5fr) repeat(3, minmax(130px, 0.55fr)) auto;
  gap: 12px;
}

.catalog-search {
  min-width: 0;
}

.catalog-toolbar :deep(.el-input__wrapper),
.catalog-toolbar :deep(.el-select__wrapper) {
  min-height: 42px;
  border: 1px solid #857bad;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 2px 3px 0 rgb(105 94 150 / 15%);
}

.catalog-toolbar :deep(.el-input__wrapper.is-focus),
.catalog-toolbar :deep(.el-select__wrapper.is-focused) {
  box-shadow: 3px 4px 0 rgb(238 145 187 / 45%);
}

.catalog-toolbar :deep(.el-input__inner),
.catalog-toolbar :deep(.el-select__placeholder),
.catalog-toolbar :deep(.el-select__selected-item) {
  color: var(--ink);
  font-size: 13px;
  font-weight: 650;
}

.catalog-toolbar :deep(.el-input__prefix-inner),
.catalog-toolbar :deep(.el-select__caret) {
  color: var(--purple);
}

.reset-button {
  width: 42px;
  height: 42px;
  border: 1px solid #776d9e !important;
  border-radius: 8px !important;
  background: var(--yellow) !important;
  color: var(--ink) !important;
  box-shadow: 2px 3px 0 rgb(61 53 100 / 22%);
}

.reset-button:hover,
.reset-button:focus-visible {
  transform: translate(-1px, -1px);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 26%);
}

.catalog-grid {
  display: grid;
  min-height: 180px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(18px, 2vw, 29px);
}

.catalog-card {
  --card-accent: #8178cf;
  --card-soft: #eeebff;
  min-width: 0;
  overflow: hidden;
  border: 2px solid var(--ink);
  border-radius: 7px;
  background: #ffffff;
  cursor: pointer;
  box-shadow: 5px 5px 0 rgb(61 53 100 / 78%);
  outline: none;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.catalog-card:hover,
.catalog-card:focus-visible {
  transform: translate(-3px, -5px) rotate(-0.6deg);
  box-shadow: 8px 10px 0 rgb(61 53 100 / 82%);
}

.card-tone-1 {
  --card-accent: #e68db5;
  --card-soft: #ffedf4;
}

.card-tone-2 {
  --card-accent: #52bbc4;
  --card-soft: #e4faf9;
}

.card-tone-3 {
  --card-accent: #e0a153;
  --card-soft: #fff6dc;
}

.catalog-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--card-soft);
}

.catalog-cover .el-image {
  width: 100%;
  height: 100%;
}

.catalog-cover .course-type {
  position: absolute;
  top: 11px;
  left: 11px;
  z-index: 2;
  padding: 5px 9px 4px;
  border: 1px solid var(--ink);
  border-radius: 4px;
  background: var(--yellow);
  box-shadow: 2px 2px 0 rgb(61 53 100 / 45%);
  color: var(--ink);
  font-size: 11px;
  font-weight: 800;
  transform: rotate(-2deg);
}

.cover-scribble {
  position: absolute;
  width: 74px;
  height: 19px;
  right: -8px;
  bottom: 12px;
  border-top: 4px dashed #ffffff;
  border-bottom: 4px dotted var(--card-accent);
  transform: rotate(-23deg);
}

.catalog-card-body {
  padding: 18px 18px 15px;
}

.catalog-tags {
  display: flex;
  min-height: 23px;
  flex-wrap: wrap;
  gap: 6px;
}

.catalog-tags span {
  padding: 3px 7px 2px;
  border: 1px solid rgb(61 53 100 / 72%);
  border-radius: 3px;
  background: var(--card-soft);
  color: var(--ink);
  font-size: 10px;
  font-weight: 750;
}

.catalog-card h2 {
  margin: 11px 0 0;
  overflow: hidden;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 19px;
  font-weight: 900;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-card-body > p {
  display: -webkit-box;
  min-height: 42px;
  margin: 8px 0 0;
  overflow: hidden;
  color: #655d7d;
  font-size: 13px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.catalog-meta {
  display: flex;
  min-width: 0;
  justify-content: space-between;
  gap: 10px;
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid rgb(61 53 100 / 42%);
  color: #51486f;
  font-size: 11px;
}

.catalog-meta span {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-meta span:last-child {
  flex: 0 0 auto;
}

.catalog-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  color: #5a5273;
  font-size: 11px;
  font-weight: 700;
}

.catalog-footer > span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.catalog-footer > span :deep(svg),
.catalog-meta :deep(svg) {
  color: var(--card-accent);
}

.catalog-footer b {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  color: var(--card-accent);
  font-size: 12px;
  white-space: nowrap;
}

.catalog-footer b i {
  width: 8px;
  height: 8px;
  border-top: 2px solid currentcolor;
  border-right: 2px solid currentcolor;
  transform: rotate(45deg);
}

.course-detail-drawer > img {
  width: 100%;
  aspect-ratio: 16 / 8;
  border: 2px solid var(--ink);
  border-radius: 6px;
  object-fit: cover;
}

.detail-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-top: 20px;
}

.detail-heading p {
  margin: 0 0 5px;
  color: var(--purple);
  font-size: 12px;
  font-weight: 750;
}

.detail-heading h2 {
  margin: 0;
  color: var(--ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 24px;
  font-weight: 900;
}

.detail-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
  color: #5e5576;
  font-size: 13px;
}

.detail-facts span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.detail-actions {
  margin-top: 18px;
}

.detail-actions :deep(.el-button) {
  height: 40px;
  padding: 0 19px;
  border: 1px solid var(--ink);
  border-radius: 5px;
  background: var(--pink);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 24%);
  color: #ffffff;
  font-weight: 800;
}

.detail-intro,
.detail-catalog {
  margin-top: 28px;
}

.detail-intro h3,
.detail-catalog h3 {
  margin: 0 0 12px;
  font-size: 16px;
}

.detail-intro p {
  margin: 0;
  color: #5d5575;
  line-height: 1.8;
  white-space: pre-wrap;
}

.chapter-title {
  margin-right: 10px;
  font-weight: 650;
}

.detail-catalog :deep(.el-collapse-item__title small) {
  color: #8a94a4;
  font-size: 11px;
}

.detail-resource {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 11px;
}

.detail-resource-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 2px solid var(--ink);
  border-radius: 5px;
  background: var(--yellow);
  color: var(--ink);
}

.detail-resource-icon :deep(svg) {
  width: 16px;
}

.detail-resource strong,
.detail-resource small {
  display: block;
}

.detail-resource strong {
  color: var(--ink);
  font-size: 13px;
}

.detail-resource small {
  margin-top: 3px;
  color: #756c8d;
  font-size: 11px;
}

@media (max-width: 1100px) {
  .hero-art {
    width: 31%;
    min-width: 230px;
  }

  .catalog-toolbar {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .catalog-search {
    grid-column: span 2;
  }

  .catalog-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 680px) {
  .platform-course-page {
    padding: 18px 16px 42px;
  }

  .course-hero {
    min-height: 395px;
    padding: 29px 23px;
  }

  .course-hero h1 {
    font-size: 40px;
  }

  .hero-art {
    position: absolute;
    width: 260px;
    min-width: 0;
    height: 185px;
    right: -26px;
    bottom: -20px;
    opacity: 0.94;
  }

  .hero-description,
  .hero-actions {
    position: relative;
    z-index: 3;
  }

  .catalog-browser {
    padding-top: 35px;
  }

  .browser-heading {
    display: block;
  }

  .browser-heading p {
    margin-bottom: 4px;
  }

  .catalog-toolbar,
  .catalog-grid {
    grid-template-columns: 1fr;
  }

  .catalog-search {
    grid-column: auto;
  }

  .reset-button {
    justify-self: end;
  }
}
</style>
