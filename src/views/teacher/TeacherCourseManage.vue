<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Collection,
  Delete,
  EditPen,
  FolderOpened,
  Management,
  MoreFilled,
  Plus,
  Promotion,
  Refresh,
  Search,
  View,
} from '@element-plus/icons-vue'
import {
  createCourse,
  deleteDraftCourse,
  getCourseChapters,
  listTeacherCourses,
  publishCourse,
} from '@/api/course'
import cover1 from '@/assets/course/img1.webp'
import cover2 from '@/assets/course/img2.webp'
import cover3 from '@/assets/course/img3.webp'
import cover4 from '@/assets/course/img4.webp'

const router = useRouter()
const route = useRoute()
const covers = [cover1, cover2, cover3, cover4]

const loading = ref(false)
const statusFilter = ref('')
const keyword = ref('')
const courses = ref([])

const createVisible = ref(false)
const createLoading = ref(false)
const createFormRef = ref()
const createTagInput = ref('')
const createForm = reactive({
  title: '',
  grade: '通用',
  difficulty: 1,
  courseType: 1,
  tags: [],
})

const previewVisible = ref(false)
const previewLoading = ref(false)
const previewCourse = ref(null)
const previewChapters = ref([])

const createRules = {
  title: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  grade: [{ required: true, message: '请选择适配学段', trigger: 'change' }],
  difficulty: [{ required: true, message: '请选择课程难度', trigger: 'change' }],
  courseType: [{ required: true, message: '请选择课程类型', trigger: 'change' }],
}

const statusOptions = [
  { label: '全部', value: '' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
]

const filteredCourses = computed(() => courses.value)

const courseStats = computed(() => {
  const draft = courses.value.filter((item) => item.status === 'draft').length
  const published = courses.value.filter((item) => item.status === 'published').length
  const resources = courses.value.reduce((total, item) => total + Number(item.resourceCount || 0), 0)
  return { total: courses.value.length, draft, published, resources }
})

function fallbackCover(course) {
  return covers[Math.abs(Number(course?.id || 0)) % covers.length]
}

function statusMeta(status) {
  const map = {
    draft: { label: '草稿', type: 'info' },
    published: { label: '已发布', type: 'success' },
    archived: { label: '已归档', type: 'warning' },
  }
  return map[status] || map.draft
}

function difficultyText(value) {
  return { 1: '入门', 2: '进阶', 3: '高阶' }[value] || '未设置'
}

function courseTypeText(value) {
  return { 1: '理论课', 2: '项目实践课', 3: '实验课' }[value] || '课程'
}

function formatDate(value) {
  if (!value) return '刚刚更新'
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(value),
  )
}

async function loadCourses() {
  loading.value = true
  try {
    courses.value =
      (await listTeacherCourses({
        status: statusFilter.value || undefined,
        keyword: keyword.value.trim() || undefined,
      })) || []
  } catch (error) {
    ElMessage.error(error?.message || '课程加载失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  Object.assign(createForm, {
    title: '',
    grade: '通用',
    difficulty: 1,
    courseType: 1,
    tags: [],
  })
  createTagInput.value = ''
  createVisible.value = true
}

function addCreateTag() {
  const tag = createTagInput.value.trim()
  if (!tag) return
  if (createForm.tags.length >= 8) {
    ElMessage.warning('最多添加 8 个标签')
    return
  }
  if (!createForm.tags.includes(tag)) {
    createForm.tags.push(tag)
  }
  createTagInput.value = ''
}

function removeCreateTag(tag) {
  createForm.tags = createForm.tags.filter((item) => item !== tag)
}

async function submitCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return
  createLoading.value = true
  try {
    const course = await createCourse({
      title: createForm.title.trim(),
      description: '',
      tags: createForm.tags,
      coverUrl: '',
      grade: createForm.grade,
      difficulty: createForm.difficulty,
      courseType: createForm.courseType,
    })
    ElMessage.success('课程草稿已创建')
    createVisible.value = false
    openEditor(course)
  } catch (error) {
    ElMessage.error(error?.message || '课程创建失败')
  } finally {
    createLoading.value = false
  }
}

function openEditor(course) {
  router.push({ name: 'teacher-course-resources', query: { courseId: course.id } })
}

async function handleCourseCommand(command, course) {
  if (command === 'edit') {
    openEditor(course)
    return
  }
  if (command === 'preview') {
    await openPreview(course)
    return
  }
  if (command === 'publish') {
    await handlePublish(course)
    return
  }
  if (command === 'delete') {
    await handleDelete(course)
    return
  }
}

async function handlePublish(course) {
  try {
    await ElMessageBox.confirm(`确定发布《${course.title}》吗？发布后将进入平台公开课程。`, '发布课程', {
      type: 'warning',
      confirmButtonText: '发布',
      cancelButtonText: '取消',
    })
    await publishCourse(course.id)
    ElMessage.success('课程已发布')
    await loadCourses()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '课程发布失败')
    }
  }
}

async function handleDelete(course) {
  try {
    await ElMessageBox.confirm(`删除草稿《${course.title}》后无法恢复，是否继续？`, '删除草稿', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await deleteDraftCourse(course.id)
    ElMessage.success('课程草稿已删除')
    await loadCourses()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

async function openPreview(course) {
  previewVisible.value = true
  previewLoading.value = true
  previewCourse.value = course
  previewChapters.value = []
  try {
    previewChapters.value = (await getCourseChapters(course.id)) || []
  } catch (error) {
    ElMessage.error(error?.message || '课程目录加载失败')
  } finally {
    previewLoading.value = false
  }
}

watch(statusFilter, loadCourses)
onMounted(async () => {
  await loadCourses()
  if (route.query.create === '1') {
    openCreateDialog()
  }
})
</script>

<template>
  <div class="course-module-shell">
    <aside class="course-sidebar">
      <div class="sidebar-heading">
        <span class="sidebar-mark"><Collection /></span>
        <div>
          <strong>课程工作台</strong>
          <small>教师课程管理</small>
        </div>
      </div>

      <el-button class="create-course-button" type="primary" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新建课程
      </el-button>

      <nav class="course-nav" aria-label="课程管理导航">
        <button type="button" class="active">
          <el-icon><Management /></el-icon>
          <span>管理课程</span>
        </button>
      </nav>

      <div class="sidebar-note">
        <span>{{ courseStats.published }}</span>
        <small>门课程正在公开</small>
      </div>
    </aside>

    <main class="course-workspace">
      <header class="workspace-header">
        <div>
          <p class="eyebrow">MY COURSES</p>
          <h1>管理课程</h1>
          <p>维护课程内容、章节资源和发布状态。</p>
        </div>
        <el-tooltip content="刷新课程" placement="bottom">
          <el-button circle aria-label="刷新课程" :loading="loading" @click="loadCourses">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </header>

      <section class="stats-band" aria-label="课程统计">
        <div>
          <span>全部课程</span>
          <strong>{{ courseStats.total }}</strong>
        </div>
        <div>
          <span>草稿</span>
          <strong>{{ courseStats.draft }}</strong>
        </div>
        <div>
          <span>已发布</span>
          <strong>{{ courseStats.published }}</strong>
        </div>
        <div>
          <span>课程资源</span>
          <strong>{{ courseStats.resources }}</strong>
        </div>
      </section>

      <section class="course-toolbar">
        <el-segmented v-model="statusFilter" :options="statusOptions" />
        <el-input
          v-model="keyword"
          clearable
          class="course-search"
          placeholder="搜索课程名称或介绍"
          @keyup.enter="loadCourses"
          @clear="loadCourses"
        >
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
      </section>

      <section v-loading="loading" class="course-grid" aria-live="polite">
        <article
          v-for="course in filteredCourses"
          :key="course.id"
          class="course-card"
          @click="openEditor(course)"
        >
          <div class="cover-frame">
            <el-image :src="course.coverUrl || fallbackCover(course)" fit="cover" />
            <el-tag class="status-tag" :type="statusMeta(course.status).type" effect="dark" size="small">
              {{ statusMeta(course.status).label }}
            </el-tag>
          </div>
          <div class="course-card-body">
            <div class="card-title-row">
              <div>
                <h2>{{ course.title }}</h2>
                <p>{{ course.grade }} · {{ difficultyText(course.difficulty) }} · {{ courseTypeText(course.courseType) }}</p>
              </div>
              <el-dropdown
                trigger="click"
                @click.stop
                @command="(command) => handleCourseCommand(command, course)"
              >
                <el-button text circle aria-label="课程操作">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit" :icon="EditPen">编辑课程</el-dropdown-item>
                    <el-dropdown-item command="preview" :icon="View">预览课程</el-dropdown-item>
                    <el-dropdown-item
                      v-if="course.status === 'draft'"
                      command="publish"
                      :icon="Promotion"
                    >
                      发布课程
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="course.status === 'draft'"
                      divided
                      command="delete"
                      :icon="Delete"
                    >
                      删除草稿
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>

            <div class="tag-list">
              <span v-for="tag in (course.tags || []).slice(0, 3)" :key="tag">{{ tag }}</span>
              <span v-if="!course.tags?.length" class="empty-tag">暂无标签</span>
            </div>

            <div class="course-card-meta">
              <span><el-icon><FolderOpened /></el-icon>{{ course.totalChapter || 0 }} 章</span>
              <span><el-icon><Collection /></el-icon>{{ course.resourceCount || 0 }} 个资源</span>
              <span>{{ course.totalDuration || 0 }} 分钟</span>
            </div>
            <div class="card-footer">
              <span>{{ formatDate(course.updatedTime || course.createdTime) }}</span>
              <strong>编辑内容</strong>
            </div>
          </div>
        </article>
      </section>

      <el-empty
        v-if="!loading && filteredCourses.length === 0"
        description="还没有符合条件的课程"
      >
        <el-button type="primary" @click="openCreateDialog">
          新建课程
        </el-button>
      </el-empty>
    </main>

    <el-dialog v-model="createVisible" title="新建课程" width="min(680px, 94vw)" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-position="top">
        <el-form-item label="课程名称" prop="title">
          <el-input v-model.trim="createForm.title" maxlength="200" show-word-limit placeholder="例如：Python 数据分析基础" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="适配学段" prop="grade">
            <el-select v-model="createForm.grade" class="full-width">
              <el-option label="通用" value="通用" />
              <el-option label="小学" value="小学" />
              <el-option label="初中" value="初中" />
              <el-option label="高中" value="高中" />
              <el-option label="大学" value="大学" />
            </el-select>
          </el-form-item>
          <el-form-item label="课程难度" prop="difficulty">
            <el-segmented
              v-model="createForm.difficulty"
              :options="[
                { label: '入门', value: 1 },
                { label: '进阶', value: 2 },
                { label: '高阶', value: 3 },
              ]"
            />
          </el-form-item>
        </div>
        <el-form-item label="课程类型" prop="courseType">
          <el-radio-group v-model="createForm.courseType">
            <el-radio-button :value="1">理论课</el-radio-button>
            <el-radio-button :value="2">项目实践课</el-radio-button>
            <el-radio-button :value="3">实验课</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="课程标签">
          <div class="tag-editor">
            <el-tag v-for="tag in createForm.tags" :key="tag" closable @close="removeCreateTag(tag)">
              {{ tag }}
            </el-tag>
            <el-input
              v-model.trim="createTagInput"
              maxlength="20"
              placeholder="输入标签后按回车"
              @keyup.enter="addCreateTag"
            />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="submitCreate">创建并编辑</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="previewVisible" size="min(720px, 92vw)" title="课程预览">
      <div v-loading="previewLoading" class="course-preview">
        <template v-if="previewCourse">
          <img :src="previewCourse.coverUrl || fallbackCover(previewCourse)" alt="课程封面" />
          <h2>{{ previewCourse.title }}</h2>
          <div class="preview-tags">
            <el-tag v-for="tag in previewCourse.tags || []" :key="tag" effect="plain">{{ tag }}</el-tag>
          </div>
          <p>{{ previewCourse.description || '老师暂未填写课程介绍。' }}</p>
          <h3>课程目录</h3>
          <el-collapse>
            <el-collapse-item v-for="chapter in previewChapters" :key="chapter.id" :name="chapter.id">
              <template #title>
                <span class="preview-chapter-title">{{ chapter.sortOrder + 1 }}. {{ chapter.title }}</span>
              </template>
              <div v-for="resource in chapter.resources" :key="resource.id" class="preview-resource-row">
                <Collection />
                <span>{{ resource.name }}</span>
              </div>
              <el-empty v-if="!chapter.resources?.length" description="暂无资源" :image-size="52" />
            </el-collapse-item>
          </el-collapse>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.course-module-shell {
  display: grid;
  min-height: 100%;
  grid-template-columns: 220px minmax(0, 1fr);
  background: #f5f7fa;
  color: #172033;
}

.course-sidebar {
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

.sidebar-mark :deep(svg) {
  width: 20px;
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

.create-course-button {
  width: 100%;
  height: 42px;
  border-radius: 7px;
}

.course-nav {
  display: grid;
  gap: 6px;
  margin-top: 18px;
}

.course-nav button {
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

.course-nav button:hover {
  background: #f4f7fb;
  color: #245da9;
}

.course-nav button.active {
  background: #edf5ff;
  color: #1f63c4;
  font-weight: 650;
}

.sidebar-note {
  margin-top: auto;
  padding: 17px;
  border-top: 1px solid #edf0f4;
}

.sidebar-note span,
.sidebar-note small {
  display: block;
}

.sidebar-note span {
  color: #173e73;
  font-size: 24px;
  font-weight: 720;
}

.sidebar-note small {
  margin-top: 3px;
  color: #8590a1;
}

.course-workspace {
  min-width: 0;
  padding: 28px 30px 44px;
}

.workspace-header {
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

.workspace-header h1 {
  margin: 0;
  color: #172033;
  font-size: 27px;
  font-weight: 720;
  letter-spacing: 0;
}

.workspace-header p:last-child {
  margin: 8px 0 0;
  color: #768195;
  font-size: 14px;
}

.stats-band {
  display: grid;
  margin-top: 24px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid #e1e6ed;
  border-radius: 8px;
  background: #ffffff;
}

.stats-band > div {
  min-width: 0;
  padding: 18px 20px;
  border-right: 1px solid #e7ebf0;
}

.stats-band > div:last-child {
  border-right: 0;
}

.stats-band span,
.stats-band strong {
  display: block;
}

.stats-band span {
  color: #7c8798;
  font-size: 12px;
}

.stats-band strong {
  margin-top: 5px;
  color: #172033;
  font-size: 23px;
}

.course-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin: 24px 0 18px;
}

.course-search {
  width: min(360px, 42vw);
}

.space-label {
  color: #657187;
  font-size: 14px;
}

.course-grid {
  display: grid;
  min-height: 180px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.course-card {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e0e5ec;
  border-radius: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.course-card:hover {
  transform: translateY(-2px);
  border-color: #c6d8ed;
  box-shadow: 0 10px 26px rgb(32 62 98 / 9%);
}

.cover-frame {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #e9eef4;
}

.cover-frame .el-image {
  width: 100%;
  height: 100%;
}

.status-tag {
  position: absolute;
  top: 12px;
  left: 12px;
}

.course-card-body {
  padding: 16px;
}

.card-title-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 32px;
  gap: 8px;
}

.card-title-row h2 {
  margin: 0;
  overflow: hidden;
  color: #172033;
  font-size: 16px;
  font-weight: 680;
  line-height: 23px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-title-row p {
  margin: 5px 0 0;
  overflow: hidden;
  color: #8490a3;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-list {
  display: flex;
  min-height: 26px;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 13px;
}

.tag-list span {
  padding: 3px 8px;
  border-radius: 4px;
  background: #f0f4f8;
  color: #5f6d80;
  font-size: 11px;
}

.tag-list .empty-tag {
  background: transparent;
  color: #a0a8b4;
}

.course-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
  color: #707c8f;
  font-size: 12px;
}

.course-card-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 13px;
  border-top: 1px solid #edf0f4;
  color: #8a94a4;
  font-size: 12px;
}

.card-footer strong {
  color: #2b67b5;
  font-weight: 650;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.full-width {
  width: 100%;
}

.tag-editor {
  display: flex;
  width: 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tag-editor .el-input {
  width: 190px;
}

.course-preview > img {
  width: 100%;
  aspect-ratio: 16 / 8;
  border-radius: 8px;
  object-fit: cover;
}

.course-preview h2 {
  margin: 20px 0 10px;
  font-size: 24px;
}

.course-preview > p {
  color: #657187;
  line-height: 1.8;
  white-space: pre-wrap;
}

.preview-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.course-preview h3 {
  margin: 28px 0 12px;
}

.preview-chapter-title {
  font-weight: 650;
}

.preview-resource-row {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 12px;
  color: #657187;
}

.preview-resource-row svg {
  width: 16px;
}

@media (max-width: 1180px) {
  .course-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .course-module-shell {
    grid-template-columns: 1fr;
  }

  .course-sidebar {
    position: static;
    min-height: auto;
    padding: 14px 16px;
    border-right: 0;
    border-bottom: 1px solid #e3e8ef;
  }

  .sidebar-heading,
  .sidebar-note {
    display: none;
  }

  .course-nav {
    display: flex;
    margin-top: 10px;
  }

  .course-nav button {
    flex: 1;
    justify-content: center;
  }

  .course-workspace {
    padding: 22px 16px 36px;
  }

  .stats-band {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-band > div:nth-child(2) {
    border-right: 0;
  }

  .stats-band > div:nth-child(-n + 2) {
    border-bottom: 1px solid #e7ebf0;
  }
}

@media (max-width: 580px) {
  .workspace-header h1 {
    font-size: 23px;
  }

  .course-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .course-search,
  .course-toolbar :deep(.el-segmented) {
    width: 100%;
  }

  .course-grid {
    grid-template-columns: 1fr;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
