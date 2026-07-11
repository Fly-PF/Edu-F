<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  Check,
  Clock,
  Collection,
  Document,
  Files,
  FolderOpened,
  Picture,
  Refresh,
  VideoPlay,
} from '@element-plus/icons-vue'
import {
  getCourse,
  getCourseChapters,
  listCourseStudyRecords,
  saveCourseStudyRecord,
} from '@/api/course'
import cover1 from '@/assets/course/img1.webp'
import cover2 from '@/assets/course/img2.webp'
import cover3 from '@/assets/course/img3.webp'
import cover4 from '@/assets/course/img4.webp'

const route = useRoute()
const router = useRouter()
const covers = [cover1, cover2, cover3, cover4]
const loading = ref(false)
const saving = ref(false)
const course = ref(null)
const chapters = ref([])
const records = ref([])
const selectedChapterId = ref(null)
const selectedResourceId = ref(null)
const videoRef = ref(null)
const pdfViewerUrl = ref('')
const sessionStartedAt = ref(Date.now())
let lastVideoReportAt = 0

const courseId = computed(() => Number(route.params.courseId || route.query.courseId || 0))
const selectedChapter = computed(() => chapters.value.find((item) => item.id === selectedChapterId.value) || null)
const selectedResource = computed(() => {
  const resources = selectedChapter.value?.resources || []
  return resources.find((item) => item.id === selectedResourceId.value) || resources[0] || null
})

const recordMap = computed(() => {
  const map = {}
  records.value.forEach((item) => {
    map[item.chapterId] = item
  })
  return map
})

const chapterCount = computed(() => chapters.value.length)
const completedCount = computed(() =>
  chapters.value.filter((chapter) => Number(recordMap.value[chapter.id]?.finishStatus || 0) === 1).length,
)
const progressPercent = computed(() => {
  if (!chapterCount.value) return 0
  return Math.round((completedCount.value / chapterCount.value) * 100)
})

const resourceTypes = {
  1: { label: '视频', icon: VideoPlay, tag: 'success' },
  2: { label: 'PDF', icon: Document, tag: 'warning' },
  3: { label: '图片', icon: Picture, tag: 'info' },
  4: { label: '文件', icon: Files, tag: '' },
}

function fallbackCover(item) {
  return covers[Math.abs(Number(item?.id || 0)) % covers.length]
}

function resourceTypeMeta(type) {
  return resourceTypes[type] || resourceTypes[4]
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (!value) return '-'
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function chapterProgress(chapter) {
  return Number(recordMap.value[chapter.id]?.progress || 0)
}

function chapterCompleted(chapter) {
  return Number(recordMap.value[chapter.id]?.finishStatus || 0) === 1
}

function selectResource(chapter, resource) {
  selectedChapterId.value = chapter.id
  selectedResourceId.value = resource?.id || null
  sessionStartedAt.value = Date.now()
  lastVideoReportAt = 0
  nextTick(() => {
    if (videoRef.value) {
      videoRef.value.currentTime = 0
    }
  })
  saveProgress({ progress: Math.max(chapterProgress(chapter), 10) }, false)
}

function selectFirstResource() {
  const firstChapter = chapters.value.find((item) => item.resources?.length) || chapters.value[0]
  selectedChapterId.value = firstChapter?.id || null
  selectedResourceId.value = firstChapter?.resources?.[0]?.id || null
}

function revokePdfViewerUrl() {
  if (pdfViewerUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(pdfViewerUrl.value)
  }
  pdfViewerUrl.value = ''
}

async function preparePdfViewer(resource) {
  revokePdfViewerUrl()
  if (!resource || resource.type !== 2 || !resource.url) return
  try {
    const response = await fetch(resource.url)
    if (!response.ok) throw new Error(`PDF load failed: ${response.status}`)
    const blob = await response.blob()
    const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' })
    pdfViewerUrl.value = `${URL.createObjectURL(pdfBlob)}#toolbar=1&navpanes=0`
  } catch {
    pdfViewerUrl.value = `${resource.url}#toolbar=1&navpanes=0`
  }
}

async function loadAll() {
  if (!courseId.value) {
    ElMessage.error('课程ID不存在')
    router.push('/main/courses')
    return
  }
  loading.value = true
  try {
    const [courseData, chapterData, recordData] = await Promise.all([
      getCourse(courseId.value),
      getCourseChapters(courseId.value),
      listCourseStudyRecords(courseId.value),
    ])
    course.value = courseData
    chapters.value = chapterData || []
    records.value = recordData || []
    if (!selectedChapterId.value) {
      selectFirstResource()
    }
  } catch (error) {
    ElMessage.error(error?.message || '课程学习内容加载失败')
  } finally {
    loading.value = false
  }
}

async function refreshRecords() {
  records.value = (await listCourseStudyRecords(courseId.value)) || []
}

function buildProgressPayload(extra = {}) {
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - sessionStartedAt.value) / 60000))
  return {
    chapterId: selectedChapterId.value,
    resourceId: selectedResource.value?.id || null,
    progress: chapterProgress(selectedChapter.value || {}) || 10,
    studyDuration: elapsedMinutes,
    finishStatus: 0,
    ...extra,
  }
}

async function saveProgress(extra = {}, showMessage = true) {
  if (!selectedChapterId.value || saving.value) return
  saving.value = true
  try {
    await saveCourseStudyRecord(courseId.value, buildProgressPayload(extra))
    await refreshRecords()
    if (showMessage) ElMessage.success('学习进度已保存')
  } catch (error) {
    if (showMessage) ElMessage.error(error?.message || '学习进度保存失败')
  } finally {
    saving.value = false
  }
}

function reportVideoProgress() {
  if (!videoRef.value || !selectedChapter.value) return
  const now = Date.now()
  if (now - lastVideoReportAt < 8000) return
  lastVideoReportAt = now
  const duration = Number(videoRef.value.duration || 0)
  const progress = duration > 0 ? Math.min(95, Math.round((videoRef.value.currentTime / duration) * 100)) : 20
  saveProgress({ progress }, false)
}

function markCompleted() {
  saveProgress({ progress: 100, finishStatus: 1 }, true)
}

function goBack() {
  router.push('/main/courses')
}

onMounted(loadAll)
watch(selectedResource, (resource) => {
  preparePdfViewer(resource)
})
onBeforeUnmount(revokePdfViewerUrl)
</script>

<template>
  <main v-loading="loading" class="study-page">
    <aside class="study-sidebar">
      <button class="back-button" type="button" @click="goBack">
        <el-icon><ArrowLeft /></el-icon>
        <span>课程列表</span>
      </button>

      <div class="course-mini">
        <img :src="course?.coverUrl || fallbackCover(course)" alt="课程封面" />
        <div>
          <p>{{ course?.teacherName || '平台教师' }}</p>
          <h1>{{ course?.title || '课程学习' }}</h1>
        </div>
      </div>

      <div class="study-progress">
        <div>
          <span>学习进度</span>
          <strong>{{ progressPercent }}%</strong>
        </div>
        <el-progress :percentage="progressPercent" :stroke-width="8" />
        <small>{{ completedCount }}/{{ chapterCount }} 个章节已完成</small>
      </div>

      <div class="chapter-list">
        <section
          v-for="(chapter, chapterIndex) in chapters"
          :key="chapter.id"
          class="chapter-item"
          :class="{ active: chapter.id === selectedChapterId }"
        >
          <button class="chapter-head" type="button" @click="selectResource(chapter, chapter.resources?.[0])">
            <span class="chapter-index">{{ chapterIndex + 1 }}</span>
            <span>
              <strong>{{ chapter.title }}</strong>
              <small>{{ chapter.resources?.length || 0 }} 个资源 · {{ chapterProgress(chapter) }}%</small>
            </span>
            <el-icon v-if="chapterCompleted(chapter)" class="complete-icon"><Check /></el-icon>
          </button>
          <div class="resource-list">
            <button
              v-for="resource in chapter.resources || []"
              :key="resource.id"
              class="resource-link"
              :class="{ selected: resource.id === selectedResourceId }"
              type="button"
              @click="selectResource(chapter, resource)"
            >
              <el-icon><component :is="resourceTypeMeta(resource.type).icon" /></el-icon>
              <span>{{ resource.name }}</span>
            </button>
          </div>
        </section>
      </div>
    </aside>

    <section class="study-main">
      <header class="viewer-header">
        <div>
          <p>{{ selectedChapter?.title || '选择章节' }}</p>
          <h2>{{ selectedResource?.name || '暂无学习资源' }}</h2>
        </div>
        <div class="viewer-actions">
          <el-button circle aria-label="刷新" :loading="loading" @click="loadAll">
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button type="success" :loading="saving" :disabled="!selectedChapter" @click="markCompleted">
            <el-icon><Check /></el-icon>
            标记完成
          </el-button>
        </div>
      </header>

      <div v-if="selectedResource" class="viewer-body">
        <video
          v-if="selectedResource.type === 1"
          ref="videoRef"
          :src="selectedResource.url"
          controls
          @timeupdate="reportVideoProgress"
          @ended="markCompleted"
        />
        <iframe
          v-else-if="selectedResource.type === 2"
          :src="pdfViewerUrl"
          title="PDF 预览"
        />
        <el-image
          v-else-if="selectedResource.type === 3"
          :src="selectedResource.url"
          fit="contain"
          class="image-viewer"
        />
        <div v-else class="file-viewer">
          <el-icon><Files /></el-icon>
          <strong>{{ selectedResource.name }}</strong>
          <span>{{ formatFileSize(selectedResource.fileSize) }}</span>
          <el-link :href="selectedResource.url" target="_blank" type="primary">打开资源</el-link>
        </div>
      </div>

      <el-empty v-else class="empty-viewer" description="当前课程还没有可学习资源" />

      <footer class="resource-facts" v-if="selectedResource">
        <span>
          <el-icon><Collection /></el-icon>
          {{ resourceTypeMeta(selectedResource.type).label }}
        </span>
        <span>
          <el-icon><Files /></el-icon>
          {{ formatFileSize(selectedResource.fileSize) }}
        </span>
        <span>
          <el-icon><Clock /></el-icon>
          {{ selectedResource.duration || selectedChapter?.duration || 0 }} 分钟
        </span>
        <span>
          <el-icon><FolderOpened /></el-icon>
          章节进度 {{ selectedChapter ? chapterProgress(selectedChapter) : 0 }}%
        </span>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.study-page {
  display: grid;
  min-height: calc(100vh - 64px);
  grid-template-columns: 340px minmax(0, 1fr);
  background: #f4f6f9;
  color: #172033;
}

.study-sidebar {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #e1e7ef;
  background: #ffffff;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  margin: 18px 18px 0;
  padding: 8px 10px;
  border: 1px solid #dce5ef;
  border-radius: 6px;
  background: #ffffff;
  color: #41536b;
  cursor: pointer;
}

.course-mini {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  padding: 18px;
}

.course-mini img {
  width: 92px;
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  object-fit: cover;
}

.course-mini p,
.course-mini h1 {
  margin: 0;
}

.course-mini p {
  color: #6b7a90;
  font-size: 12px;
}

.course-mini h1 {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  font-size: 17px;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.study-progress {
  margin: 0 18px 16px;
  padding: 14px;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  background: #f8fafc;
}

.study-progress > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.study-progress span,
.study-progress small {
  color: #728095;
  font-size: 12px;
}

.study-progress strong {
  font-size: 20px;
}

.chapter-list {
  min-height: 0;
  overflow: auto;
  padding: 0 12px 18px;
}

.chapter-item {
  border-radius: 8px;
}

.chapter-item.active {
  background: #f1f7ff;
}

.chapter-head,
.resource-link {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.chapter-head {
  gap: 10px;
  padding: 12px 10px;
}

.chapter-index {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 6px;
  background: #e4eef9;
  color: #2d68ac;
  font-size: 12px;
  font-weight: 700;
}

.chapter-head span:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.chapter-head strong,
.chapter-head small,
.resource-link span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-head strong {
  color: #243044;
  font-size: 13px;
}

.chapter-head small {
  margin-top: 4px;
  color: #8290a3;
  font-size: 11px;
}

.complete-icon {
  color: #18a058;
}

.resource-list {
  padding: 0 8px 8px 48px;
}

.resource-link {
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  color: #5f6f84;
  font-size: 12px;
}

.resource-link:hover,
.resource-link.selected {
  background: #ffffff;
  color: #2563eb;
}

.study-main {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  padding: 22px clamp(18px, 3vw, 34px);
}

.viewer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
}

.viewer-header p,
.viewer-header h2 {
  margin: 0;
}

.viewer-header p {
  color: #6f7e92;
  font-size: 13px;
}

.viewer-header h2 {
  margin-top: 5px;
  font-size: 22px;
}

.viewer-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.viewer-body {
  display: grid;
  min-height: 0;
  flex: 1;
  place-items: center;
  overflow: hidden;
  border: 1px solid #dce4ee;
  border-radius: 8px;
  background: #ffffff;
}

.viewer-body video,
.viewer-body iframe,
.image-viewer {
  width: 100%;
  height: 100%;
  min-height: 520px;
  border: 0;
  background: #111827;
}

.image-viewer {
  background: #f8fafc;
}

.file-viewer {
  display: grid;
  justify-items: center;
  gap: 10px;
  color: #526174;
}

.file-viewer .el-icon {
  font-size: 52px;
  color: #2f69ad;
}

.file-viewer strong {
  color: #1f2937;
  font-size: 18px;
}

.empty-viewer {
  flex: 1;
  border: 1px solid #dce4ee;
  border-radius: 8px;
  background: #ffffff;
}

.resource-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 14px;
  color: #65758b;
  font-size: 13px;
}

.resource-facts span {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

@media (max-width: 920px) {
  .study-page {
    grid-template-columns: 1fr;
  }

  .study-sidebar {
    max-height: 480px;
    border-right: 0;
    border-bottom: 1px solid #e1e7ef;
  }

  .viewer-body video,
  .viewer-body iframe,
  .image-viewer {
    min-height: 420px;
  }
}
</style>
