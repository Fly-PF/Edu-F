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
          <strong>课程工作台</strong>
          <small>章节资源管理</small>
        </div>
      </div>
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
        <header class="editor-header">
          <div>
            <p class="eyebrow">COURSE EDITOR</p>
            <div class="title-line">
              <h1>{{ course.title }}</h1>
              <el-tag :type="statusMeta.type">{{ statusMeta.label }}</el-tag>
            </div>
            <p>编辑课程资料，整理章节并上传学习资源。</p>
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

    <el-dialog v-model="createChapterVisible" title="新增章节" width="min(480px, 92vw)">
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

    <el-dialog v-model="externalVisible" title="添加外部资源" width="min(560px, 94vw)">
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

    <el-dialog v-model="editResourceVisible" title="编辑资源" width="min(560px, 94vw)">
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

    <el-dialog v-model="previewVisible" :title="previewResource?.name || '资源预览'" width="min(960px, 96vw)">
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
</style>
