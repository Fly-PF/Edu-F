<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
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
import { getStudentCourseChapters, getStudentPublicCourse, listStudentPublicCourses } from '@/api/course'
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

const summary = computed(() => ({
  courses: courses.value.length,
  chapters: courses.value.reduce((total, item) => total + Number(item.totalChapter || 0), 0),
  resources: courses.value.reduce((total, item) => total + Number(item.resourceCount || 0), 0),
}))

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
      (await listStudentPublicCourses({
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
      getStudentPublicCourse(course.id),
      getStudentCourseChapters(course.id),
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
    <header class="course-list-header">
      <div>
        <p class="eyebrow">COURSE CATALOG</p>
        <h1>平台课程列表</h1>
        <p>浏览教师已发布的课程与章节资源。</p>
      </div>
      <el-tooltip content="刷新课程" placement="bottom">
        <el-button circle aria-label="刷新课程" :loading="loading" @click="loadCourses">
          <el-icon><Refresh /></el-icon>
        </el-button>
      </el-tooltip>
    </header>

    <section class="catalog-summary" aria-label="课程列表统计">
      <div>
        <span>公开课程</span>
        <strong>{{ summary.courses }}</strong>
      </div>
      <div>
        <span>课程章节</span>
        <strong>{{ summary.chapters }}</strong>
      </div>
      <div>
        <span>学习资源</span>
        <strong>{{ summary.resources }}</strong>
      </div>
    </section>

    <section class="catalog-toolbar">
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
      <el-button @click="resetFilters">重置</el-button>
    </section>

    <section v-loading="loading" class="catalog-grid" aria-live="polite">
      <article v-for="course in courses" :key="course.id" class="catalog-card" @click="startLearning(course)">
        <div class="catalog-cover">
          <el-image :src="course.coverUrl || fallbackCover(course)" fit="cover" />
          <span>{{ courseTypeText(course.courseType) }}</span>
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
            <span><el-icon><FolderOpened /></el-icon>{{ course.totalChapter || 0 }} 章</span>
            <span><el-icon><Collection /></el-icon>{{ course.resourceCount || 0 }} 个资源</span>
            <span><el-icon><Clock /></el-icon>{{ course.totalDuration || 0 }} 分钟</span>
          </div>
        </div>
      </article>
    </section>

    <el-empty v-if="!loading && courses.length === 0" description="没有符合条件的公开课程">
      <el-button @click="resetFilters">清除筛选</el-button>
    </el-empty>

    <el-drawer v-model="detailVisible" size="min(760px, 94vw)" title="课程详情">
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
  min-height: 100%;
  padding: 30px clamp(18px, 4vw, 54px) 48px;
  background: #f5f7fa;
  color: #172033;
}

.course-list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.eyebrow {
  margin: 0 0 7px;
  color: #2c69bd;
  font-size: 11px;
  font-weight: 750;
}

.course-list-header h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 720;
  letter-spacing: 0;
}

.course-list-header p:last-child {
  margin: 8px 0 0;
  color: #768195;
  font-size: 14px;
}

.catalog-summary {
  display: grid;
  width: min(660px, 100%);
  margin-top: 24px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid #e1e6ed;
  border-radius: 8px;
  background: #ffffff;
}

.catalog-summary > div {
  padding: 17px 20px;
  border-right: 1px solid #e7ebf0;
}

.catalog-summary > div:last-child {
  border-right: 0;
}

.catalog-summary span,
.catalog-summary strong {
  display: block;
}

.catalog-summary span {
  color: #7c8798;
  font-size: 12px;
}

.catalog-summary strong {
  margin-top: 4px;
  font-size: 22px;
}

.catalog-toolbar {
  display: grid;
  margin: 24px 0 18px;
  grid-template-columns: minmax(240px, 1.5fr) repeat(3, minmax(130px, 0.55fr)) auto;
  gap: 10px;
}

.catalog-search {
  min-width: 0;
}

.catalog-grid {
  display: grid;
  min-height: 180px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
}

.catalog-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e0e5ec;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.catalog-card:hover {
  transform: translateY(-2px);
  border-color: #c6d8ed;
  box-shadow: 0 11px 26px rgb(32 62 98 / 9%);
}

.catalog-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #e9eef4;
}

.catalog-cover .el-image {
  width: 100%;
  height: 100%;
}

.catalog-cover > span {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 5px 9px;
  border-radius: 4px;
  background: rgb(20 35 56 / 78%);
  color: #ffffff;
  font-size: 11px;
  font-weight: 650;
}

.catalog-card-body {
  padding: 17px;
}

.catalog-tags {
  display: flex;
  min-height: 23px;
  flex-wrap: wrap;
  gap: 6px;
}

.catalog-tags span {
  padding: 3px 7px;
  border-radius: 4px;
  background: #edf3f8;
  color: #5f7085;
  font-size: 10px;
}

.catalog-card h2 {
  margin: 12px 0 0;
  overflow: hidden;
  font-size: 17px;
  font-weight: 680;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-card-body > p {
  display: -webkit-box;
  min-height: 42px;
  margin: 8px 0 0;
  overflow: hidden;
  color: #748094;
  font-size: 13px;
  line-height: 21px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.catalog-meta {
  display: grid;
  margin-top: 15px;
  grid-template-columns: 1fr 1fr;
  gap: 8px 10px;
  padding-top: 14px;
  border-top: 1px solid #edf0f4;
  color: #788497;
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

.course-detail-drawer > img {
  width: 100%;
  aspect-ratio: 16 / 8;
  border-radius: 8px;
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
  color: #6e7d91;
  font-size: 12px;
}

.detail-heading h2 {
  margin: 0;
  font-size: 24px;
}

.detail-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-top: 15px;
  color: #6e7b8f;
  font-size: 13px;
}

.detail-facts span {
  display: flex;
  align-items: center;
  gap: 5px;
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
  color: #5f6d80;
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
  border-radius: 6px;
  background: #edf4fb;
  color: #2f69ad;
}

.detail-resource-icon :deep(svg) {
  width: 16px;
}

.detail-resource strong,
.detail-resource small {
  display: block;
}

.detail-resource strong {
  color: #344054;
  font-size: 13px;
}

.detail-resource small {
  margin-top: 3px;
  color: #8b95a5;
  font-size: 11px;
}

@media (max-width: 1100px) {
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
    padding: 22px 16px 36px;
  }

  .course-list-header h1 {
    font-size: 24px;
  }

  .catalog-summary {
    grid-template-columns: 1fr;
  }

  .catalog-summary > div {
    border-right: 0;
    border-bottom: 1px solid #e7ebf0;
  }

  .catalog-summary > div:last-child {
    border-bottom: 0;
  }

  .catalog-toolbar,
  .catalog-grid {
    grid-template-columns: 1fr;
  }

  .catalog-search {
    grid-column: auto;
  }
}
</style>
