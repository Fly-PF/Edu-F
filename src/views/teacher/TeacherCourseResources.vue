<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Collection,
  Delete,
  Document,
  EditPen,
  Files,
  Link,
  Management,
  Picture,
  Plus,
  Promotion,
  Refresh,
  UploadFilled,
  VideoPlay,
  View,
} from '@element-plus/icons-vue'
import {
  createChapter,
  createBlockProjectResource,
  createExternalResource,
  deleteChapter,
  deleteResource,
  getTeacherCourse,
  getTeacherCourseChapters,
  publishCourse,
  reorderChapters,
  updateChapter,
  updateCourse,
  updateResource,
  uploadCourseCover,
  uploadCourseResource,
} from '@/api/course'
import { listBlockGallery } from '@/api/blockProject'
import cover1 from '@/assets/course/img1.webp'

const route = useRoute()
const router = useRouter()
const courseId = computed(() => Number(route.query.courseId || 0))

const loading = ref(false)
const savingCourse = ref(false)
const publishing = ref(false)
const coverUploading = ref(false)
const coverProgress = ref(0)
const course = ref(null)
const chapters = ref([])
const selectedChapterId = ref(null)
const courseForm = reactive({
  title: '',
  description: '',
  grade: '通用',
  difficulty: 1,
  courseType: 1,
  isPublic: 0,
  tags: [],
  seriesName: '',
  seriesOrder: 0,
})

const chapterDraft = reactive({ title: '', duration: 0 })
const chapterSaving = ref(false)
const createChapterVisible = ref(false)
const createChapterLoading = ref(false)
const createChapterForm = reactive({ title: '', duration: 0 })

const resourceUploading = ref(false)
const resourceUploadProgress = ref(0)
const externalVisible = ref(false)
const externalLoading = ref(false)
const externalForm = reactive({
  name: '',
  type: 2,
  url: '',
  duration: 0,
})

const editResourceVisible = ref(false)
const editResourceLoading = ref(false)
const editingResource = ref(null)
const editResourceForm = reactive({
  name: '',
  type: 2,
  url: '',
  duration: 0,
})

const previewVisible = ref(false)
const previewResource = ref(null)
const blockProjectVisible = ref(false)
const blockProjectLoading = ref(false)
const blockProjectSaving = ref(false)
const blockProjectKeyword = ref('')
const publicBlockProjects = ref([])
const selectedBlockProjectId = ref(null)

const selectedChapter = computed(() => {
  return chapters.value.find((item) => Number(item.id) === Number(selectedChapterId.value)) || null
})

const statusMeta = computed(() => {
  const map = {
    draft: { label: '草稿', type: 'info' },
    published: { label: '已发布', type: 'success' },
    archived: { label: '已归档', type: 'warning' },
  }
  return map[course.value?.status] || map.draft
})

const resourceTypes = [
  { label: '视频', value: 1 },
  { label: 'PDF 文档', value: 2 },
  { label: '图片素材', value: 3 },
  { label: '数据文件', value: 4 },
]

function resourceTypeMeta(type) {
  const map = {
    1: { label: '视频', tag: 'success', icon: VideoPlay },
    2: { label: 'PDF', tag: 'warning', icon: Document },
    3: { label: '图片', tag: 'primary', icon: Picture },
    4: { label: '数据文件', tag: 'info', icon: Files },
    5: { label: '积木项目', tag: 'success', icon: Collection },
  }
  return map[type] || map[4]
}

function selectChapter(chapter) {
  selectedChapterId.value = chapter.id
  chapterDraft.title = chapter.title
  chapterDraft.duration = chapter.duration || 0
}

function syncCourseForm(courseData) {
  Object.assign(courseForm, {
    title: courseData?.title || '',
    description: courseData?.description || '',
    grade: courseData?.grade || '通用',
    difficulty: courseData?.difficulty || 1,
    courseType: courseData?.courseType || 1,
    isPublic: Number(courseData?.isPublic ?? (courseData?.publicCourse ? 1 : 0)),
    tags: [...(courseData?.tags || [])],
    seriesName: courseData?.seriesName || '',
    seriesOrder: Number(courseData?.seriesOrder || 0),
  })
}

async function loadAll() {
  if (!courseId.value) {
    course.value = null
    chapters.value = []
    selectedChapterId.value = null
    return
  }
  loading.value = true
  try {
    const [courseData, chapterData] = await Promise.all([
      getTeacherCourse(courseId.value),
      getTeacherCourseChapters(courseId.value),
    ])
    course.value = courseData
    chapters.value = chapterData || []
    syncCourseForm(courseData)

    const current = chapters.value.find((item) => Number(item.id) === Number(selectedChapterId.value))
    if (current) {
      selectChapter(current)
    } else if (chapters.value.length) {
      selectChapter(chapters.value[0])
    } else {
      selectedChapterId.value = null
    }
  } catch (error) {
    ElMessage.error(error?.message || '课程内容加载失败')
  } finally {
    loading.value = false
  }
}

function goManage() {
  router.push({ name: 'teacher-courses' })
}

function goCreate() {
  router.push({ name: 'teacher-courses', query: { create: '1' } })
}

async function saveCourse() {
  if (!courseForm.title.trim()) {
    ElMessage.warning('课程名称不能为空')
    return
  }
  savingCourse.value = true
  try {
    course.value = await updateCourse(courseId.value, {
      title: courseForm.title.trim(),
      description: courseForm.description,
      isPublic: courseForm.isPublic,
      grade: courseForm.grade,
      difficulty: courseForm.difficulty,
      courseType: courseForm.courseType,
      tags: courseForm.tags.map((tag) => tag.trim()).filter(Boolean),
      seriesName: courseForm.seriesName.trim(),
      seriesOrder: Number(courseForm.seriesOrder || 0),
    })
    syncCourseForm(course.value)
    ElMessage.success('课程信息已保存')
  } catch (error) {
    ElMessage.error(error?.message || '课程保存失败')
  } finally {
    savingCourse.value = false
  }
}

async function handleCoverUpload(request) {
  coverUploading.value = true
  coverProgress.value = 0
  try {
    course.value = await uploadCourseCover(courseId.value, request.file, (event) => {
      if (event.total) coverProgress.value = Math.round((event.loaded / event.total) * 100)
    })
    request.onSuccess?.(course.value)
    ElMessage.success('课程封面已更新')
  } catch (error) {
    request.onError?.(error)
    ElMessage.error(error?.message || '封面上传失败')
  } finally {
    coverUploading.value = false
  }
}

async function handlePublish() {
  try {
    await ElMessageBox.confirm('发布前请确认每个章节都已经添加至少一个资源。', '发布课程', {
      type: 'warning',
      confirmButtonText: '确认发布',
      cancelButtonText: '取消',
    })
    publishing.value = true
    course.value = await publishCourse(courseId.value)
    ElMessage.success('课程已发布到课程列表')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '课程发布失败')
    }
  } finally {
    publishing.value = false
  }
}

function openCreateChapter() {
  createChapterForm.title = `第 ${chapters.value.length + 1} 章`
  createChapterForm.duration = 0
  createChapterVisible.value = true
}

async function submitCreateChapter() {
  if (!createChapterForm.title.trim()) {
    ElMessage.warning('请输入章节名称')
    return
  }
  createChapterLoading.value = true
  try {
    const chapter = await createChapter(courseId.value, {
      title: createChapterForm.title.trim(),
      duration: Number(createChapterForm.duration || 0),
      sortOrder: chapters.value.length,
    })
    createChapterVisible.value = false
    await loadAll()
    const created = chapters.value.find((item) => Number(item.id) === Number(chapter.id))
    if (created) selectChapter(created)
    ElMessage.success('章节已创建')
  } catch (error) {
    ElMessage.error(error?.message || '章节创建失败')
  } finally {
    createChapterLoading.value = false
  }
}

async function saveChapter() {
  if (!selectedChapter.value) return
  if (!chapterDraft.title.trim()) {
    ElMessage.warning('章节名称不能为空')
    return
  }
  chapterSaving.value = true
  try {
    await updateChapter(courseId.value, selectedChapter.value.id, {
      title: chapterDraft.title.trim(),
      duration: Number(chapterDraft.duration || 0),
    })
    await loadAll()
    ElMessage.success('章节已保存')
  } catch (error) {
    ElMessage.error(error?.message || '章节保存失败')
  } finally {
    chapterSaving.value = false
  }
}

async function removeChapter(chapter) {
  try {
    await ElMessageBox.confirm(`删除“${chapter.title}”会同时删除其全部资源和学习记录，是否继续？`, '删除章节', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteChapter(courseId.value, chapter.id)
    await loadAll()
    ElMessage.success('章节已删除')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '章节删除失败')
    }
  }
}

async function moveChapter(index, offset) {
  const targetIndex = index + offset
  if (targetIndex < 0 || targetIndex >= chapters.value.length) return
  const next = [...chapters.value]
  const [chapter] = next.splice(index, 1)
  next.splice(targetIndex, 0, chapter)
  chapters.value = next
  try {
    await reorderChapters(
      courseId.value,
      next.map((item, sortOrder) => ({ id: item.id, sortOrder })),
    )
    await loadAll()
  } catch (error) {
    ElMessage.error(error?.message || '章节排序失败')
    await loadAll()
  }
}

async function handleResourceUpload(request) {
  if (!selectedChapter.value) return
  resourceUploading.value = true
  resourceUploadProgress.value = 0
  try {
    await uploadCourseResource(courseId.value, selectedChapter.value.id, request.file, 0, (event) => {
      if (event.total) resourceUploadProgress.value = Math.round((event.loaded / event.total) * 100)
    })
    request.onSuccess?.()
    await loadAll()
    ElMessage.success('资源已上传')
  } catch (error) {
    request.onError?.(error)
    ElMessage.error(error?.message || '资源上传失败')
  } finally {
    resourceUploading.value = false
  }
}

function openExternalDialog() {
  Object.assign(externalForm, { name: '', type: 2, url: '', duration: 0 })
  externalVisible.value = true
}

async function openBlockProjectDialog() {
  selectedBlockProjectId.value = null
  blockProjectKeyword.value = ''
  blockProjectVisible.value = true
  await loadPublicBlockProjects()
}

async function loadPublicBlockProjects() {
  blockProjectLoading.value = true
  try {
    publicBlockProjects.value = await listBlockGallery({ keyword: blockProjectKeyword.value.trim() }) || []
  } catch (error) {
    ElMessage.error(error?.message || '公开积木项目加载失败')
  } finally {
    blockProjectLoading.value = false
  }
}

async function submitBlockProjectResource() {
  if (!selectedChapter.value || !selectedBlockProjectId.value) {
    ElMessage.warning('请选择一个公开积木项目')
    return
  }
  blockProjectSaving.value = true
  try {
    await createBlockProjectResource(courseId.value, selectedChapter.value.id, {
      projectId: selectedBlockProjectId.value,
      sortOrder: selectedChapter.value.resources?.length || 0,
    })
    blockProjectVisible.value = false
    await loadAll()
    ElMessage.success('积木项目已添加到章节')
  } catch (error) {
    ElMessage.error(error?.message || '积木项目添加失败')
  } finally {
    blockProjectSaving.value = false
  }
}

async function submitExternalResource() {
  if (!selectedChapter.value) return
  if (!externalForm.name.trim() || !externalForm.url.trim()) {
    ElMessage.warning('请填写资源名称和地址')
    return
  }
  externalLoading.value = true
  try {
    await createExternalResource(courseId.value, selectedChapter.value.id, {
      name: externalForm.name.trim(),
      type: externalForm.type,
      url: externalForm.url.trim(),
      duration: Number(externalForm.duration || 0),
      sortOrder: selectedChapter.value.resources?.length || 0,
    })
    externalVisible.value = false
    await loadAll()
    ElMessage.success('外部资源已添加')
  } catch (error) {
    ElMessage.error(error?.message || '资源添加失败')
  } finally {
    externalLoading.value = false
  }
}

function openEditResource(resource) {
  if (Number(resource?.type) === 5) {
    ElMessage.info('积木项目请删除后重新选择')
    return
  }
  editingResource.value = resource
  Object.assign(editResourceForm, {
    name: resource.name,
    type: resource.type,
    url: resource.storedUrl || resource.url,
    duration: resource.duration || 0,
  })
  editResourceVisible.value = true
}

function isManagedResource(resource) {
  if (Number(resource?.type) === 5) return false
  return Boolean(resource?.storedUrl && !/^https?:\/\//i.test(resource.storedUrl))
}

async function submitEditResource() {
  if (!editingResource.value || !editResourceForm.name.trim()) {
    ElMessage.warning('资源名称不能为空')
    return
  }
  editResourceLoading.value = true
  try {
    const payload = {
      name: editResourceForm.name.trim(),
      type: editResourceForm.type,
      duration: Number(editResourceForm.duration || 0),
    }
    if (!isManagedResource(editingResource.value)) {
      if (!editResourceForm.url.trim()) {
        ElMessage.warning('资源地址不能为空')
        return
      }
      payload.url = editResourceForm.url.trim()
    }
    await updateResource(
      courseId.value,
      selectedChapter.value.id,
      editingResource.value.id,
      payload,
    )
    editResourceVisible.value = false
    await loadAll()
    ElMessage.success('资源已保存')
  } catch (error) {
    ElMessage.error(error?.message || '资源保存失败')
  } finally {
    editResourceLoading.value = false
  }
}

async function removeResource(resource) {
  try {
    await ElMessageBox.confirm(`确定删除资源“${resource.name}”吗？`, '删除资源', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteResource(courseId.value, selectedChapter.value.id, resource.id)
    await loadAll()
    ElMessage.success('资源已删除')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '资源删除失败')
    }
  }
}

function openPreview(resource) {
  previewResource.value = resource
  previewVisible.value = true
}

function formatFileSize(size) {
  const number = Number(size || 0)
  if (!number) return '外部资源'
  if (number < 1024 * 1024) return `${Math.max(1, Math.round(number / 1024))} KB`
  return `${(number / 1024 / 1024).toFixed(1)} MB`
}

watch(courseId, loadAll)
onMounted(loadAll)
</script>

<template>
  <div class="course-editor-shell">
    <aside class="editor-sidebar">
      <div class="sidebar-heading">
        <span class="sidebar-mark"><Collection /></span>
        <div>
          <strong>探索工作台</strong>
          <small>课程资源实验室</small>
        </div>
      </div>
      <span class="sidebar-sticker">MAKE A COURSE</span>
      <el-button class="create-button" type="primary" @click="goCreate">
        <el-icon><Plus /></el-icon>
        新建课程
      </el-button>
      <nav aria-label="课程管理导航">
        <button type="button" class="active" @click="goManage">
          <el-icon><Management /></el-icon>
          <span>管理课程</span>
        </button>
      </nav>
      <button v-if="course" type="button" class="back-link" @click="goManage">
        <el-icon><ArrowLeft /></el-icon>
        返回课程列表
      </button>
    </aside>

    <main v-loading="loading" class="editor-workspace">
      <el-empty v-if="!courseId" description="请先从课程列表选择一门课程">
        <el-button type="primary" @click="goManage">进入课程管理</el-button>
      </el-empty>

      <template v-else-if="course">
        <header class="explore-hero">
          <div class="hero-copy">
            <div class="hero-kicker">
              <span class="hero-sticker">AI LAB</span>
              <p class="eyebrow">COURSE EXPLORER</p>
            </div>
            <div class="title-line">
              <h1>{{ course.title }}</h1>
              <el-tag :type="statusMeta.type">{{ statusMeta.label }}</el-tag>
            </div>
            <p>整理你的章节任务，给每个好奇心准备一份可动手的素材。</p>
            <div class="hero-stats" aria-label="课程概览">
              <span class="hero-stat"><strong>{{ chapters.length }}</strong><small>章节任务</small></span>
              <span class="hero-stat"><strong>{{ selectedChapter?.resources?.length || 0 }}</strong><small>当前素材</small></span>
              <span class="hero-stat"><strong>{{ courseForm.tags.length }}</strong><small>探索标签</small></span>
            </div>
          </div>
          <div class="header-actions">
            <el-tooltip content="刷新" placement="bottom">
              <el-button circle aria-label="刷新课程" @click="loadAll">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
            <el-button :loading="savingCourse" @click="saveCourse">保存资料</el-button>
            <el-button
              v-if="course.status === 'draft'"
              type="primary"
              :loading="publishing"
              @click="handlePublish"
            >
              <el-icon><Promotion /></el-icon>
              发布课程
            </el-button>
          </div>
          <div class="hero-art" aria-hidden="true">
            <span class="orbit orbit-one"></span>
            <span class="orbit orbit-two"></span>
            <span class="hero-core"></span>
            <span class="hero-dot dot-pink"></span>
            <span class="hero-dot dot-mint"></span>
            <span class="hero-dot dot-yellow"></span>
            <span class="hero-star star-one">✦</span>
            <span class="hero-star star-two">+</span>
          </div>
        </header>

        <section class="course-profile-band">
          <div class="cover-editor">
            <el-upload
              :show-file-list="false"
              accept="image/jpeg,image/png,image/webp"
              :http-request="handleCoverUpload"
            >
              <button type="button" class="cover-button" aria-label="上传课程封面">
                <img :src="course.coverUrl || cover1" alt="课程封面" />
                <span><el-icon><UploadFilled /></el-icon>更换封面</span>
              </button>
            </el-upload>
            <el-progress
              v-if="coverUploading"
              :percentage="coverProgress"
              :stroke-width="5"
              :show-text="false"
            />
          </div>

          <el-form class="course-form" label-position="top">
            <el-form-item label="课程名称">
              <el-input v-model="courseForm.title" maxlength="200" show-word-limit />
            </el-form-item>
            <div class="field-grid">
              <el-form-item label="适配学段">
                <el-select v-model="courseForm.grade" class="full-width">
                  <el-option label="通用" value="通用" />
                  <el-option label="研一" value="研一" />
                  <el-option label="研二" value="研二" />
                  <el-option label="研三" value="研三" />
                  <el-option label="大学" value="大学" />
                </el-select>
              </el-form-item>
              <el-form-item label="课程难度">
                <el-segmented
                  v-model="courseForm.difficulty"
                  :options="[
                    { label: '入门', value: 1 },
                    { label: '进阶', value: 2 },
                    { label: '高阶', value: 3 },
                  ]"
                />
              </el-form-item>
              <el-form-item label="课程类型">
                <el-select v-model="courseForm.courseType" class="full-width">
                  <el-option label="理论课" :value="1" />
                  <el-option label="项目实践课" :value="2" />
                  <el-option label="实验课" :value="3" />
                </el-select>
              </el-form-item>
              <el-form-item label="课程公开状态">
                <el-switch
                  v-model="courseForm.isPublic"
                  :active-value="1"
                  :inactive-value="0"
                  active-text="公开"
                  inactive-text="不公开"
                />
              </el-form-item>
              <el-form-item label="课程系列">
                <el-input v-model.trim="courseForm.seriesName" maxlength="100" placeholder="例如：AI 入门第 1 季" />
              </el-form-item>
              <el-form-item label="系列内排序">
                <el-input-number v-model="courseForm.seriesOrder" :min="0" :step="1" controls-position="right" />
              </el-form-item>
            </div>
            <el-form-item label="课程介绍">
              <el-input
                v-model="courseForm.description"
                type="textarea"
                :rows="5"
                maxlength="3000"
                show-word-limit
                placeholder="填写课程目标、内容范围和适合人群"
              />
            </el-form-item>
            <el-form-item label="课程标签">
              <el-select
                v-model="courseForm.tags"
                multiple
                filterable
                allow-create
                default-first-option
                clearable
                collapse-tags
                collapse-tags-tooltip
                class="full-width"
                placeholder="输入后回车创建标签，例如：AI 入门"
              />
            </el-form-item>
          </el-form>
        </section>

        <section class="content-editor">
          <div class="chapter-panel">
            <div class="panel-heading">
              <div>
                <h2>章节目录</h2>
                <span>{{ chapters.length }} 个章节</span>
              </div>
              <el-tooltip content="新增章节" placement="top">
                <el-button circle type="primary" aria-label="新增章节" @click="openCreateChapter">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </el-tooltip>
            </div>

            <div class="chapter-list">
              <button
                v-for="(chapter, index) in chapters"
                :key="chapter.id"
                type="button"
                class="chapter-item"
                :class="{ active: Number(chapter.id) === Number(selectedChapterId) }"
                @click="selectChapter(chapter)"
              >
                <span class="chapter-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="chapter-copy">
                  <strong>{{ chapter.title }}</strong>
                  <small>{{ chapter.resources?.length || 0 }} 个资源 · {{ chapter.duration || 0 }} 分钟</small>
                </span>
                <span class="chapter-order" @click.stop>
                  <el-button text circle size="small" :disabled="index === 0" @click="moveChapter(index, -1)">
                    <el-icon><ArrowUp /></el-icon>
                  </el-button>
                  <el-button
                    text
                    circle
                    size="small"
                    :disabled="index === chapters.length - 1"
                    @click="moveChapter(index, 1)"
                  >
                    <el-icon><ArrowDown /></el-icon>
                  </el-button>
                </span>
              </button>
              <el-empty v-if="chapters.length === 0" description="还没有章节" :image-size="72" />
            </div>
          </div>

          <div class="resource-panel">
            <template v-if="selectedChapter">
              <div class="chapter-editor-row">
                <div class="chapter-fields">
                  <el-input v-model="chapterDraft.title" maxlength="200" placeholder="章节名称" />
                  <el-input-number v-model="chapterDraft.duration" :min="0" :max="9999" controls-position="right" />
                  <span>分钟</span>
                </div>
                <div class="chapter-actions">
                  <el-button :loading="chapterSaving" @click="saveChapter">保存章节</el-button>
                  <el-tooltip content="删除章节" placement="top">
                    <el-button circle type="danger" plain aria-label="删除章节" @click="removeChapter(selectedChapter)">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-tooltip>
                </div>
              </div>

              <div class="resource-toolbar">
                <div>
                  <h2>章节资源</h2>
                  <p>支持视频、PDF、图片和数据文件。</p>
                </div>
                <div>
                  <el-upload
                    :show-file-list="false"
                    :http-request="handleResourceUpload"
                    accept="video/*,.pdf,application/pdf,image/*,.csv,.xls,.xlsx,.zip"
                  >
                    <el-button type="primary" :loading="resourceUploading">
                      <el-icon><UploadFilled /></el-icon>
                      上传资源
                    </el-button>
                  </el-upload>
                  <el-button @click="openExternalDialog">
                    <el-icon><Link /></el-icon>
                    外部链接
                  </el-button>
                  <el-button type="primary" plain @click="openBlockProjectDialog">
                    <el-icon><Collection /></el-icon>
                    添加积木项目
                  </el-button>
                </div>
              </div>

              <el-progress
                v-if="resourceUploading"
                class="upload-progress"
                :percentage="resourceUploadProgress"
                :stroke-width="7"
              />

              <div class="resource-table" role="table" aria-label="章节资源">
                <div class="resource-table-head" role="row">
                  <span>资源名称</span>
                  <span>类型</span>
                  <span>大小/时长</span>
                  <span>操作</span>
                </div>
                <div v-for="resource in selectedChapter.resources || []" :key="resource.id" class="resource-row" role="row">
                  <div class="resource-name">
                    <span class="resource-icon">
                      <component :is="resourceTypeMeta(resource.type).icon" />
                    </span>
                    <div>
                      <strong>{{ resource.name }}</strong>
                      <small>{{ isManagedResource(resource) ? '已上传文件' : '外部资源' }}</small>
                    </div>
                  </div>
                  <div>
                    <el-tag size="small" :type="resourceTypeMeta(resource.type).tag" effect="plain">
                      {{ resourceTypeMeta(resource.type).label }}
                    </el-tag>
                  </div>
                  <div class="resource-size">
                    <span>{{ formatFileSize(resource.fileSize) }}</span>
                    <small v-if="resource.duration">{{ resource.duration }} 分钟</small>
                  </div>
                  <div class="resource-actions">
                    <el-tooltip content="预览" placement="top">
                      <el-button text circle aria-label="预览资源" @click="openPreview(resource)">
                        <el-icon><View /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="编辑" placement="top">
                      <el-button text circle aria-label="编辑资源" @click="openEditResource(resource)">
                        <el-icon><EditPen /></el-icon>
                      </el-button>
                    </el-tooltip>
                    <el-tooltip content="删除" placement="top">
                      <el-button text circle type="danger" aria-label="删除资源" @click="removeResource(resource)">
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </div>
                </div>
                <el-empty
                  v-if="!selectedChapter.resources?.length"
                  description="本章节还没有学习资源"
                  :image-size="78"
                />
              </div>
            </template>
            <el-empty v-else description="请先新增或选择一个章节" />
          </div>
        </section>
      </template>
    </main>

    <el-dialog v-model="createChapterVisible" class="explore-dialog" title="新增章节" width="min(480px, 92vw)">
      <el-form label-position="top">
        <el-form-item label="章节名称">
          <el-input v-model.trim="createChapterForm.title" maxlength="200" />
        </el-form-item>
        <el-form-item label="预计学习时长">
          <el-input-number v-model="createChapterForm.duration" :min="0" :max="9999" controls-position="right" />
          <span class="unit-text">分钟</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createChapterVisible = false">取消</el-button>
        <el-button type="primary" :loading="createChapterLoading" @click="submitCreateChapter">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="blockProjectVisible" class="explore-dialog" title="添加公开积木项目" width="min(680px, 94vw)">
      <el-input v-model.trim="blockProjectKeyword" placeholder="搜索项目名称、简介或作者" clearable @keyup.enter="loadPublicBlockProjects">
        <template #append><el-button :loading="blockProjectLoading" @click="loadPublicBlockProjects">搜索</el-button></template>
      </el-input>
      <el-radio-group v-model="selectedBlockProjectId" class="block-project-picker" v-loading="blockProjectLoading">
        <el-radio v-for="project in publicBlockProjects" :key="project.id" :value="project.id" class="block-project-option">
          <strong>{{ project.title }}</strong>
          <span>{{ project.ownerName || '匿名作者' }} · {{ project.description || '暂无简介' }}</span>
        </el-radio>
        <el-empty v-if="!blockProjectLoading && !publicBlockProjects.length" description="没有匹配的公开项目" :image-size="54" />
      </el-radio-group>
      <template #footer>
        <el-button @click="blockProjectVisible = false">取消</el-button>
        <el-button type="primary" :loading="blockProjectSaving" @click="submitBlockProjectResource">添加到当前章节</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="externalVisible" class="explore-dialog" title="添加外部资源" width="min(560px, 94vw)">
      <el-form label-position="top">
        <el-form-item label="资源名称">
          <el-input v-model.trim="externalForm.name" maxlength="200" />
        </el-form-item>
        <div class="dialog-field-grid">
          <el-form-item label="资源类型">
            <el-select v-model="externalForm.type" class="full-width">
              <el-option v-for="item in resourceTypes" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="预计学习时长">
            <el-input-number v-model="externalForm.duration" :min="0" :max="9999" controls-position="right" />
          </el-form-item>
        </div>
        <el-form-item label="资源地址">
          <el-input v-model.trim="externalForm.url" placeholder="https://..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="externalVisible = false">取消</el-button>
        <el-button type="primary" :loading="externalLoading" @click="submitExternalResource">添加资源</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editResourceVisible" class="explore-dialog" title="编辑资源" width="min(560px, 94vw)">
      <el-form label-position="top">
        <el-form-item label="资源名称">
          <el-input v-model.trim="editResourceForm.name" maxlength="200" />
        </el-form-item>
        <div class="dialog-field-grid">
          <el-form-item label="资源类型">
            <el-select v-model="editResourceForm.type" class="full-width">
              <el-option v-for="item in resourceTypes" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="预计学习时长">
            <el-input-number v-model="editResourceForm.duration" :min="0" :max="9999" controls-position="right" />
          </el-form-item>
        </div>
        <el-form-item v-if="!isManagedResource(editingResource)" label="资源地址">
          <el-input v-model.trim="editResourceForm.url" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editResourceVisible = false">取消</el-button>
        <el-button type="primary" :loading="editResourceLoading" @click="submitEditResource">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="previewVisible" class="explore-dialog" :title="previewResource?.name || '资源预览'" width="min(960px, 96vw)">
      <div v-if="previewResource" class="resource-preview">
        <video v-if="previewResource.type === 1" :src="previewResource.url" controls />
        <iframe v-else-if="previewResource.type === 2" :src="previewResource.url" title="PDF 预览" />
        <el-image v-else-if="previewResource.type === 3" :src="previewResource.url" fit="contain" />
        <div v-else class="download-preview">
          <el-icon><Files /></el-icon>
          <strong>{{ previewResource.name }}</strong>
          <el-link :href="previewResource.url" target="_blank" type="primary">打开资源</el-link>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.course-editor-shell {
  display: grid;
  min-height: 100%;
  grid-template-columns: 220px minmax(0, 1fr);
  background: #f5f7fa;
  color: #172033;
}

.editor-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  min-height: calc(100vh - 64px);
  flex-direction: column;
  align-self: start;
  padding: 24px 18px;
  border-right: 1px solid #e3e8ef;
  background: #ffffff;
}

.sidebar-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 6px 24px;
}

.sidebar-mark {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 8px;
  background: #edf5ff;
  color: #2468d8;
}

.sidebar-heading strong,
.sidebar-heading small {
  display: block;
}

.sidebar-heading strong {
  font-size: 15px;
}

.sidebar-heading small {
  margin-top: 3px;
  color: #8490a3;
  font-size: 12px;
}

.create-button {
  width: 100%;
  height: 42px;
  border-radius: 7px;
}

.editor-sidebar nav {
  margin-top: 18px;
}

.editor-sidebar nav button,
.back-link {
  display: flex;
  width: 100%;
  height: 42px;
  align-items: center;
  gap: 11px;
  padding: 0 13px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #536074;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.editor-sidebar nav button.active {
  background: #edf5ff;
  color: #1f63c4;
  font-weight: 650;
}

.back-link {
  margin-top: auto;
  color: #708096;
}

.back-link:hover {
  background: #f4f7fb;
  color: #245da9;
}

.editor-workspace {
  min-width: 0;
  min-height: calc(100vh - 64px);
  padding: 28px 30px 48px;
}

.editor-header {
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

.title-line {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.title-line h1 {
  max-width: min(680px, 68vw);
  margin: 0;
  overflow: hidden;
  color: #172033;
  font-size: 27px;
  font-weight: 720;
  letter-spacing: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-header > div > p:last-child {
  margin: 8px 0 0;
  color: #768195;
  font-size: 14px;
}

.header-actions {
  display: flex;
  flex-shrink: 0;
  gap: 9px;
}

.course-profile-band {
  display: grid;
  margin-top: 24px;
  padding: 22px;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  border: 1px solid #e1e6ed;
  border-radius: 8px;
  background: #ffffff;
}

.cover-button {
  position: relative;
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: #e8edf3;
  cursor: pointer;
}

.cover-button img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-button span {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  height: 42px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  background: rgb(16 29 48 / 76%);
  color: #ffffff;
  font-size: 13px;
}

.cover-editor :deep(.el-upload) {
  width: 100%;
}

.cover-editor .el-progress {
  margin-top: 10px;
}

.course-form {
  min-width: 0;
}

.field-grid {
  display: grid;
  grid-template-columns: 1fr 1.15fr 1fr;
  gap: 14px;
}

.full-width {
  width: 100%;
}

.content-editor {
  display: grid;
  min-height: 520px;
  margin-top: 20px;
  grid-template-columns: 300px minmax(0, 1fr);
  border: 1px solid #e1e6ed;
  border-radius: 8px;
  background: #ffffff;
}

.chapter-panel {
  min-width: 0;
  padding: 18px;
  border-right: 1px solid #e4e8ee;
  background: #fbfcfd;
}

.panel-heading,
.chapter-editor-row,
.resource-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-heading h2,
.resource-toolbar h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 680;
}

.panel-heading span,
.resource-toolbar p {
  margin: 4px 0 0;
  color: #8590a1;
  font-size: 12px;
}

.chapter-list {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.chapter-item {
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: 68px;
  grid-template-columns: 32px minmax(0, 1fr) 30px;
  align-items: center;
  gap: 9px;
  padding: 9px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: #536074;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.chapter-item:hover {
  background: #f1f5f9;
}

.chapter-item.active {
  border-color: #c8dbf2;
  background: #edf5ff;
  color: #1e5da7;
}

.chapter-index {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 6px;
  background: #ffffff;
  color: #56708f;
  font-size: 11px;
  font-weight: 700;
}

.chapter-copy {
  min-width: 0;
}

.chapter-copy strong,
.chapter-copy small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-copy strong {
  font-size: 13px;
  font-weight: 650;
}

.chapter-copy small {
  margin-top: 5px;
  color: #8a94a4;
  font-size: 11px;
}

.chapter-order {
  display: flex;
  flex-direction: column;
}

.chapter-order .el-button + .el-button {
  margin-left: 0;
}

.resource-panel {
  min-width: 0;
  padding: 20px 22px;
}

.chapter-editor-row {
  padding-bottom: 18px;
  border-bottom: 1px solid #e7ebf0;
}

.chapter-fields {
  display: grid;
  min-width: 0;
  flex: 1;
  grid-template-columns: minmax(180px, 1fr) 120px auto;
  align-items: center;
  gap: 9px;
}

.chapter-fields > span {
  color: #7b8698;
  font-size: 12px;
}

.chapter-actions,
.resource-toolbar > div:last-child {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
}

.resource-toolbar {
  align-items: flex-end;
  margin-top: 22px;
}

.resource-toolbar :deep(.el-upload) {
  display: block;
}

.upload-progress {
  margin: 16px 0 4px;
}

.resource-table {
  margin-top: 16px;
  overflow: hidden;
  border: 1px solid #e4e8ee;
  border-radius: 7px;
}

.resource-table-head,
.resource-row {
  display: grid;
  min-width: 680px;
  grid-template-columns: minmax(260px, 1.7fr) 110px 130px 112px;
  align-items: center;
  gap: 12px;
}

.resource-table-head {
  padding: 10px 14px;
  background: #f6f8fa;
  color: #7b8697;
  font-size: 11px;
  font-weight: 650;
}

.resource-row {
  min-height: 68px;
  padding: 10px 14px;
  border-top: 1px solid #e9edf2;
}

.resource-name {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 11px;
}

.resource-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 7px;
  background: #edf4fb;
  color: #2f69ad;
}

.resource-icon :deep(svg) {
  width: 17px;
}

.resource-name > div {
  min-width: 0;
}

.resource-name strong,
.resource-name small,
.resource-size span,
.resource-size small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-name strong {
  color: #263247;
  font-size: 13px;
}

.resource-name small,
.resource-size small {
  margin-top: 4px;
  color: #8b95a5;
  font-size: 11px;
}

.resource-size {
  color: #69768a;
  font-size: 12px;
}

.resource-actions {
  display: flex;
  gap: 2px;
}

.dialog-field-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.unit-text {
  margin-left: 8px;
  color: #7b8698;
}

.resource-preview {
  min-height: 480px;
  background: #111827;
}

.resource-preview video,
.resource-preview iframe,
.resource-preview .el-image {
  display: block;
  width: 100%;
  height: min(68vh, 680px);
  border: 0;
}

.download-preview {
  display: grid;
  min-height: 480px;
  place-items: center;
  align-content: center;
  gap: 15px;
  background: #f5f7fa;
}

.download-preview .el-icon {
  color: #4374b2;
  font-size: 46px;
}

@media (max-width: 1120px) {
  .course-profile-band {
    grid-template-columns: 210px minmax(0, 1fr);
  }

  .field-grid {
    grid-template-columns: 1fr 1fr;
  }

  .content-editor {
    grid-template-columns: 260px minmax(0, 1fr);
  }

  .resource-table {
    overflow-x: auto;
  }
}

@media (max-width: 820px) {
  .course-editor-shell {
    grid-template-columns: 1fr;
  }

  .editor-sidebar {
    position: static;
    min-height: auto;
    padding: 14px 16px;
    border-right: 0;
    border-bottom: 1px solid #e3e8ef;
  }

  .sidebar-heading,
  .back-link {
    display: none;
  }

  .editor-sidebar nav {
    margin-top: 10px;
  }

  .editor-sidebar nav button {
    justify-content: center;
  }

  .editor-workspace {
    min-height: auto;
    padding: 22px 16px 36px;
  }

  .editor-header {
    flex-direction: column;
  }

  .title-line h1 {
    max-width: 82vw;
    font-size: 23px;
  }

  .course-profile-band {
    grid-template-columns: 1fr;
  }

  .cover-editor {
    width: min(360px, 100%);
  }

  .content-editor {
    grid-template-columns: 1fr;
  }

  .chapter-panel {
    border-right: 0;
    border-bottom: 1px solid #e4e8ee;
  }

  .chapter-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 580px) {
  .header-actions,
  .chapter-editor-row,
  .resource-toolbar {
    width: 100%;
    align-items: stretch;
    flex-direction: column;
  }

  .header-actions .el-button,
  .resource-toolbar .el-button {
    width: 100%;
  }

  .field-grid,
  .dialog-field-grid,
  .chapter-list {
    grid-template-columns: 1fr;
  }

  .chapter-fields {
    grid-template-columns: minmax(0, 1fr) 110px auto;
  }

  .resource-panel {
    padding: 18px 14px;
  }
}
.block-project-picker { display: grid; width: 100%; max-height: 360px; margin-top: 16px; overflow: auto; gap: 8px; }
.block-project-option { display: grid; width: 100%; height: auto; margin: 0; padding: 10px 12px; border: 1px solid rgb(61 53 100 / 20%); border-radius: 6px; background: #fff; }
.block-project-option :deep(.el-radio__label) { display: grid; min-width: 0; gap: 4px; padding-left: 8px; }
.block-project-option strong,.block-project-option span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.block-project-option span { color: #756a94; font-size: 12px; }
</style>

<style scoped>
:global(:root) {
  --explore-ink: #3d3564;
  --explore-purple: #8178cf;
  --explore-pink: #ee91bb;
  --explore-mint: #9de4eb;
  --explore-mint-strong: #52bbc4;
  --explore-yellow: #fff1a8;
  --explore-paper: #fbfbff;
  --explore-line: rgb(61 53 100 / 22%);
  --explore-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
}

.course-editor-shell {
  --ink: var(--explore-ink);
  --purple: var(--explore-purple);
  --pink: var(--explore-pink);
  --mint: var(--explore-mint);
  --mint-strong: var(--explore-mint-strong);
  --yellow: var(--explore-yellow);
  display: grid;
  min-height: 100%;
  grid-template-columns: 238px minmax(0, 1fr);
  background-color: var(--explore-paper);
  background-image: linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px), linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--ink);
  font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
}

.editor-sidebar {
  position: sticky;
  top: 0;
  z-index: 4;
  display: flex;
  min-height: calc(100vh - 64px);
  flex-direction: column;
  align-self: start;
  padding: 28px 18px 22px;
  border-right: 2px solid var(--explore-ink);
  background: rgb(255 255 255 / 88%);
  box-shadow: 5px 0 0 rgb(61 53 100 / 8%);
}

.sidebar-heading { gap: 11px; padding: 0 6px 11px; }
.sidebar-mark {
  width: 42px;
  height: 42px;
  border: 2px solid var(--ink);
  border-radius: 8px;
  background: var(--mint);
  box-shadow: 3px 3px 0 rgb(61 53 100 / 23%);
  color: var(--ink);
}
.sidebar-heading strong { color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 16px; font-weight: 900; }
.sidebar-heading small { color: #756b92; font-size: 12px; font-weight: 700; }
.sidebar-sticker,
.hero-sticker,
.panel-sticker {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  padding: 4px 7px;
  border: 1px solid var(--ink);
  border-radius: 3px;
  background: var(--yellow);
  box-shadow: 2px 3px 0 rgb(61 53 100 / 18%);
  color: var(--ink);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .04em;
  transform: rotate(-3deg);
}
.sidebar-sticker { margin: 4px 6px 18px; }

.course-editor-shell :deep(.el-button) {
  min-height: 36px;
  border: 1px solid var(--ink);
  border-radius: 5px;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 24%);
  color: var(--ink);
  font-weight: 800;
  white-space: nowrap;
  word-break: keep-all;
  transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease;
}
.course-editor-shell :deep(.el-button:hover) { transform: translate(-2px, -2px); box-shadow: 5px 6px 0 rgb(61 53 100 / 26%); }
.course-editor-shell :deep(.el-button:focus-visible),
.course-editor-shell button:focus-visible { outline: 3px solid rgb(238 145 187 / 70%); outline-offset: 2px; }
.course-editor-shell :deep(.el-button.is-disabled),
.course-editor-shell :deep(.el-button.is-disabled:hover) { transform: none; box-shadow: none; opacity: .48; }
.course-editor-shell :deep(.el-button--primary) { border-color: #4e4473; background: var(--purple); color: #ffffff; }
.course-editor-shell :deep(.el-button--primary:hover) { background: #756bc2; }
.course-editor-shell :deep(.el-button.is-circle) { min-width: 36px; padding: 0; }
.create-button { width: 100%; height: 44px; margin-top: 0; }
.editor-sidebar nav { margin-top: 20px; }
.editor-sidebar nav button,
.back-link {
  width: 100%;
  min-height: 43px;
  border: 1px solid transparent;
  border-radius: 5px;
  color: #675d86;
  font-weight: 800;
  white-space: nowrap;
}
.editor-sidebar nav button:hover,
.back-link:hover { border-color: var(--ink); background: #f0edff; color: var(--ink); }
.editor-sidebar nav button.active { border-color: var(--ink); background: #e8e4ff; box-shadow: 3px 4px 0 rgb(61 53 100 / 13%); color: var(--ink); }
.back-link { margin-top: auto; }

.editor-workspace { min-width: 0; min-height: calc(100vh - 64px); padding: clamp(18px, 5vw, 56px) clamp(18px, 5vw, 80px) 64px; }

.explore-hero {
  position: relative;
  display: flex;
  min-height: 226px;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  overflow: hidden;
  isolation: isolate;
  margin-bottom: 24px;
  padding: 30px 32px;
  border: 2px solid var(--ink);
  border-radius: 8px;
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%);
  box-shadow: 7px 8px 0 rgb(61 53 100 / 25%);
}
.hero-copy { position: relative; z-index: 2; max-width: min(720px, 72%); }
.hero-kicker { display: flex; align-items: center; gap: 12px; min-height: 26px; }
.hero-sticker { background: #ffffff; transform: rotate(-4deg); }
.eyebrow { margin: 0; color: #685da0; font-family: 'Trebuchet MS', sans-serif; font-size: 11px; font-weight: 900; letter-spacing: .12em; }
.title-line { gap: 11px; margin-top: 10px; }
.title-line h1 { max-width: 100%; color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: clamp(34px, 4vw, 54px); font-weight: 900; line-height: 1.08; white-space: normal; }
.title-line :deep(.el-tag) { border: 1px solid var(--ink); border-radius: 3px; background: var(--yellow); color: var(--ink); font-weight: 900; }
.explore-hero .hero-copy > p:not(.eyebrow) { max-width: 540px; margin: 12px 0 0; color: #5c527c; font-size: 15px; font-weight: 700; line-height: 1.7; }
.hero-stats { display: flex; flex-wrap: wrap; gap: 9px; margin-top: 21px; }
.hero-stat { display: inline-flex; min-width: 90px; flex-direction: column; gap: 2px; padding: 7px 10px; border: 1px solid var(--ink); border-radius: 5px; background: rgb(255 255 255 / 72%); box-shadow: 2px 3px 0 rgb(61 53 100 / 15%); }
.hero-stat strong { font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 21px; line-height: 1; }
.hero-stat small { color: #766c91; font-size: 10px; font-weight: 800; }
.header-actions { position: relative; z-index: 3; display: flex; flex-shrink: 0; align-items: center; gap: 9px; margin-top: 4px; }
.hero-art { position: absolute; z-index: 1; right: 18px; bottom: -32px; width: 330px; height: 220px; pointer-events: none; }
.orbit { position: absolute; top: 47px; left: 48px; width: 232px; height: 112px; border: 2px dashed rgb(61 53 100 / 44%); border-radius: 50%; transform: rotate(-18deg); animation: orbit-spin 13s linear infinite; }
.orbit-two { top: 28px; left: 72px; width: 176px; height: 160px; border-style: solid; border-color: rgb(61 53 100 / 20%); transform: rotate(33deg); animation-duration: 17s; animation-direction: reverse; }
.hero-core { position: absolute; top: 77px; left: 139px; width: 62px; height: 62px; border: 2px solid var(--ink); border-radius: 50%; background: var(--mint); box-shadow: 5px 6px 0 rgb(61 53 100 / 22%); animation: core-float 6s ease-in-out infinite; }
.hero-core::after { position: absolute; inset: 14px; border: 2px solid var(--ink); border-radius: 50%; background: #ffffff; content: ''; }
.hero-dot { position: absolute; width: 17px; height: 17px; border: 1px solid var(--ink); border-radius: 50%; box-shadow: 2px 3px 0 rgb(61 53 100 / 18%); }
.dot-pink { top: 51px; right: 22px; background: var(--pink); }
.dot-mint { right: 76px; bottom: 22px; background: var(--mint-strong); }
.dot-yellow { top: 20px; left: 82px; background: var(--yellow); }
.hero-star { position: absolute; color: var(--ink); font-family: 'Trebuchet MS', sans-serif; font-size: 30px; font-weight: 900; animation: star-breathe 5s ease-in-out infinite; }
.star-one { top: 24px; right: 92px; }
.star-two { right: 8px; bottom: 35px; color: var(--pink); font-size: 34px; animation-delay: 1.5s; }

.course-profile-band,
.content-editor {
  border: 2px solid var(--ink);
  border-radius: 8px;
  box-shadow: var(--explore-shadow);
}
.course-profile-band { grid-template-columns: 250px minmax(0, 1fr); gap: 28px; padding: 24px; background: rgb(255 255 255 / 90%); }
.cover-button { border: 2px solid var(--ink); border-radius: 5px; box-shadow: 4px 5px 0 rgb(61 53 100 / 22%); background: #e8e4ff; }
.cover-button span { height: 42px; background: rgb(61 53 100 / 86%); font-weight: 800; }
.cover-editor .el-progress { margin-top: 12px; }
.course-form :deep(.el-form-item) { margin-bottom: 17px; }
.course-form :deep(.el-form-item__label),
.resource-panel :deep(.el-form-item__label) { padding-bottom: 6px; color: var(--ink); font-size: 12px; font-weight: 900; }
.course-editor-shell :deep(.el-input__wrapper),
.course-editor-shell :deep(.el-textarea__inner),
.course-editor-shell :deep(.el-select__wrapper),
.course-editor-shell :deep(.el-input-number) { border: 1px solid rgb(61 53 100 / 33%); border-radius: 5px; background: #ffffff; box-shadow: 2px 3px 0 rgb(61 53 100 / 10%); }
.course-editor-shell :deep(.el-input__wrapper.is-focus),
.course-editor-shell :deep(.el-textarea__inner:focus),
.course-editor-shell :deep(.el-select__wrapper.is-focused) { border-color: var(--purple); box-shadow: 0 0 0 2px rgb(129 120 207 / 18%); }
.course-editor-shell :deep(.el-input__inner),
.course-editor-shell :deep(.el-textarea__inner),
.course-editor-shell :deep(.el-select__selected-item) { color: var(--ink); }
.course-editor-shell :deep(.el-textarea__inner) { min-height: 112px; padding: 11px 12px; }
.course-editor-shell :deep(.el-segmented) { width: 100%; border: 1px solid rgb(61 53 100 / 25%); border-radius: 5px; background: #f3f0ff; }
.course-editor-shell :deep(.el-segmented__item-selected) { background: var(--purple); box-shadow: 2px 3px 0 rgb(61 53 100 / 18%); color: #ffffff; }
.course-editor-shell :deep(.el-switch.is-checked .el-switch__core) { border-color: var(--mint-strong); background: var(--mint-strong); }
.course-editor-shell :deep(.el-switch__label) { color: #776e91; font-weight: 800; }

.content-editor { min-height: 520px; grid-template-columns: 300px minmax(0, 1fr); overflow: hidden; background: rgb(255 255 255 / 92%); }
.chapter-panel { padding: 21px 18px; border-right: 2px dashed rgb(61 53 100 / 25%); background: #f2f0ff; }
.panel-heading { align-items: flex-start; }
.panel-heading h2,
.resource-toolbar h2 { color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 21px; font-weight: 900; }
.panel-heading span,
.resource-toolbar p { color: #766c91; font-size: 12px; font-weight: 700; }
.panel-heading .panel-sticker { margin-left: auto; }
.chapter-list { gap: 10px; margin-top: 18px; }
.chapter-item { min-height: 76px; grid-template-columns: 36px minmax(0, 1fr) 32px; padding: 10px; border: 1px solid transparent; border-radius: 5px; color: var(--ink); }
.chapter-item:hover { border-color: var(--ink); background: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 13%); }
.chapter-item.active { border: 2px solid var(--ink); background: #ffffff; box-shadow: 4px 5px 0 rgb(61 53 100 / 18%); color: var(--ink); }
.chapter-index { width: 32px; height: 32px; border: 1px solid var(--ink); border-radius: 4px; background: var(--yellow); color: var(--ink); font-weight: 900; }
.chapter-copy strong { color: var(--ink); font-weight: 900; }
.chapter-copy small { color: #7d7398; font-weight: 700; }
.chapter-order :deep(.el-button) { min-height: 25px; border: 0; box-shadow: none; background: transparent; }
.chapter-order :deep(.el-button:hover) { box-shadow: none; }
.resource-panel { padding: 22px 24px 28px; background: #ffffff; }
.chapter-editor-row { padding-bottom: 18px; border-bottom: 2px dashed rgb(61 53 100 / 22%); }
.chapter-fields { grid-template-columns: minmax(180px, 1fr) 120px auto; }
.chapter-fields > span { color: #756b92; font-weight: 800; }
.chapter-actions,
.resource-toolbar > div:last-child { gap: 9px; }
.resource-toolbar { align-items: flex-end; margin-top: 23px; }
.resource-toolbar .el-button--primary { min-height: 40px; }
.upload-progress { margin: 17px 0 5px; }
.resource-table { margin-top: 17px; border: 2px solid rgb(61 53 100 / 24%); border-radius: 5px; background: #ffffff; }
.resource-table-head { padding: 11px 14px; background: #e8e4ff; color: #6f6494; font-size: 11px; font-weight: 900; }
.resource-row { min-height: 76px; padding: 11px 14px; border-top: 1px dashed rgb(61 53 100 / 21%); }
.resource-row:hover { background: #fcfbff; }
.resource-icon { width: 36px; height: 36px; border: 1px solid var(--ink); border-radius: 5px; background: var(--mint); box-shadow: 2px 3px 0 rgb(61 53 100 / 14%); color: var(--ink); }
.resource-name strong { color: var(--ink); font-weight: 900; }
.resource-name small,
.resource-size small { color: #81769b; font-weight: 700; }
.resource-size { color: #625778; font-weight: 800; }
.resource-actions { gap: 0; }
.resource-actions :deep(.el-button + .el-button) { margin-left: 0; }
.resource-actions :deep(.el-button) { min-height: 30px; border: 1px solid transparent; box-shadow: none; background: transparent; }
.resource-actions :deep(.el-button:hover) { border-color: var(--ink); background: #f0edff; box-shadow: 2px 3px 0 rgb(61 53 100 / 13%); }
.resource-table :deep(.el-tag) { border: 1px solid var(--ink); border-radius: 3px; font-weight: 900; }
.resource-table :deep(.el-tag--success) { background: #d8f4f2; color: var(--ink); }
.resource-table :deep(.el-tag--warning) { background: var(--yellow); color: var(--ink); }
.resource-table :deep(.el-tag--primary) { background: #e8e4ff; color: var(--ink); }
.resource-table :deep(.el-tag--info) { background: #f5ddeb; color: var(--ink); }
.course-editor-shell :deep(.el-empty) { padding: 42px 12px; }
.course-editor-shell :deep(.el-empty__description p) { color: #756b92; font-weight: 700; }

.dialog-field-grid { gap: 14px; }
.unit-text { color: #756b92; font-weight: 800; }
.resource-preview { min-height: 480px; background: var(--ink); }
.download-preview { background: #f2f0ff; color: var(--ink); }
.download-preview .el-icon { color: var(--purple); }

@keyframes orbit-spin { to { transform: rotate(342deg); } }
@keyframes core-float { 50% { transform: translateY(-7px); } }
@keyframes star-breathe { 50% { opacity: .52; transform: scale(.86) rotate(8deg); } }

:global(.explore-dialog) { border: 2px solid #3d3564; border-radius: 8px; box-shadow: 7px 8px 0 rgb(61 53 100 / 25%); }
:global(.explore-dialog .el-dialog__header) { border-bottom: 2px dashed rgb(61 53 100 / 18%); }
:global(.explore-dialog .el-dialog__title) { color: #3d3564; font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-weight: 900; }
:global(.explore-dialog .el-dialog__body) { color: #3d3564; }
:global(.explore-dialog .el-dialog__footer .el-button) { white-space: nowrap; word-break: keep-all; }

@media (max-width: 1120px) {
  .course-profile-band { grid-template-columns: 210px minmax(0, 1fr); }
  .field-grid { grid-template-columns: 1fr 1fr; }
  .content-editor { grid-template-columns: 260px minmax(0, 1fr); }
  .resource-table { overflow-x: auto; }
}

@media (min-width: 821px) {
  .resource-table { overflow: visible; }
  .resource-table-head,
  .resource-row { min-width: 0; grid-template-columns: minmax(0, 1.7fr) 86px 90px 108px; }
}

@media (max-width: 820px) {
  .course-editor-shell { grid-template-columns: 1fr; }
  .editor-sidebar { position: static; min-height: auto; padding: 14px 16px; border-right: 0; border-bottom: 2px solid var(--ink); box-shadow: 0 4px 0 rgb(61 53 100 / 8%); }
  .sidebar-heading { display: flex; padding-bottom: 7px; }
  .sidebar-sticker { display: none; }
  .editor-sidebar nav { margin-top: 11px; }
  .editor-sidebar nav button { justify-content: center; }
  .back-link { display: none; }
  .editor-workspace { min-height: auto; padding: 22px 16px 40px; }
  .explore-hero { min-height: 280px; flex-direction: column; padding: 25px 22px 125px; }
  .hero-copy { max-width: 100%; }
  .header-actions { width: 100%; margin-top: 14px; }
  .header-actions .el-button { flex: 1; }
  .hero-art { right: -18px; bottom: -70px; opacity: .48; transform: scale(.78); transform-origin: right bottom; }
  .course-profile-band { grid-template-columns: 1fr; }
  .cover-editor { width: min(360px, 100%); }
  .content-editor { grid-template-columns: 1fr; }
  .chapter-panel { border-right: 0; border-bottom: 2px dashed rgb(61 53 100 / 25%); }
  .chapter-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 580px) {
  .editor-workspace { padding-right: 16px; padding-left: 16px; }
  .explore-hero { min-height: 330px; padding: 21px 17px 137px; }
  .title-line h1 { font-size: 34px; }
  .header-actions,
  .chapter-editor-row,
  .resource-toolbar { width: 100%; align-items: stretch; flex-direction: column; }
  .header-actions .el-button,
  .resource-toolbar .el-button { width: 100%; }
  .hero-stats { gap: 6px; }
  .hero-stat { min-width: 80px; }
  .field-grid,
  .dialog-field-grid,
  .chapter-list { grid-template-columns: 1fr; }
  .course-profile-band { padding: 17px; }
  .content-editor { min-height: 0; }
  .resource-panel { padding: 18px 14px 22px; }
  .chapter-fields { grid-template-columns: minmax(0, 1fr) 104px auto; }
  .resource-toolbar > div:last-child { width: 100%; flex-direction: column; }
  .resource-toolbar :deep(.el-upload) { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  .course-editor-shell *,
  .course-editor-shell *::before,
  .course-editor-shell *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>
