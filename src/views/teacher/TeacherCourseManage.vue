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
  deleteCourse,
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
const createForm = reactive({
  title: '',
  grade: '通用',
  difficulty: 1,
  courseType: 1,
  isPublic: 0,
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
    isPublic: 0,
    tags: [],
  })
  createVisible.value = true
}

async function submitCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return
  createLoading.value = true
  try {
    const course = await createCourse({
      title: createForm.title.trim(),
      description: '',
      coverUrl: '',
      isPublic: createForm.isPublic,
      grade: createForm.grade,
      difficulty: createForm.difficulty,
      courseType: createForm.courseType,
      tags: createForm.tags.map((tag) => tag.trim()).filter(Boolean),
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
    await deleteCourse(course.id)
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
      <section class="explore-banner" aria-labelledby="course-page-title">
        <div class="banner-copy">
          <p class="eyebrow">AI EXPLORATION LAB · MY COURSES</p>
          <h1 id="course-page-title">管理课程</h1>
          <p class="banner-description">把灵感变成一门课，选择一个任务，继续你的创造之旅。</p>
          <div class="banner-actions">
            <el-button class="banner-primary" type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              新建课程
            </el-button>
            <span class="banner-note">准备好了吗？MAKE IT!</span>
          </div>
        </div>
        <div class="banner-decoration" aria-hidden="true">
          <span class="orbit orbit-one"></span>
          <span class="orbit orbit-two"></span>
          <span class="orbit-dot dot-one"></span>
          <span class="orbit-dot dot-two"></span>
          <span class="orbit-core"></span>
          <span class="mini-sticker sticker-idea">IDEA</span>
          <span class="mini-sticker sticker-make">MAKE</span>
          <span class="mini-star star-one">✦</span>
          <span class="mini-star star-two">+</span>
        </div>
      </section>

      <header class="workspace-header">
        <div>
          <p class="section-kicker">选择你的任务</p>
          <p class="workspace-hint">维护课程内容、章节资源和发布状态。</p>
        </div>
        <el-tooltip content="刷新课程" placement="bottom">
          <el-button class="refresh-button" circle aria-label="刷新课程" :loading="loading" @click="loadCourses">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </header>

      <section class="stats-band" aria-label="课程统计">
        <div class="stat-card stat-purple">
          <span class="stat-icon"><Collection /></span>
          <span>全部课程</span>
          <strong>{{ courseStats.total }}</strong>
        </div>
        <div class="stat-card stat-yellow">
          <span class="stat-icon"><EditPen /></span>
          <span>草稿</span>
          <strong>{{ courseStats.draft }}</strong>
        </div>
        <div class="stat-card stat-mint">
          <span class="stat-icon"><Promotion /></span>
          <span>已发布</span>
          <strong>{{ courseStats.published }}</strong>
        </div>
        <div class="stat-card stat-pink">
          <span class="stat-icon"><FolderOpened /></span>
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
          role="button"
          tabindex="0"
          :aria-label="`打开课程 ${course.title}`"
          @click="openEditor(course)"
          @keydown.enter="openEditor(course)"
        >
          <div class="cover-frame">
            <el-image :src="course.coverUrl || fallbackCover(course)" fit="cover" />
            <el-tag class="status-tag" :type="statusMeta(course.status).type" effect="dark" size="small">
              {{ statusMeta(course.status).label }}
            </el-tag>
            <span class="cover-scribble" aria-hidden="true"></span>
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

            <div class="course-card-meta">
              <span><el-icon><FolderOpened /></el-icon>{{ course.totalChapter || 0 }} 章</span>
              <span><el-icon><Collection /></el-icon>{{ course.resourceCount || 0 }} 个资源</span>
              <span>{{ course.totalDuration || 0 }} 分钟</span>
            </div>
            <div class="card-footer">
              <span>{{ formatDate(course.updatedTime || course.createdTime) }}</span>
              <strong>编辑内容 <el-icon><EditPen /></el-icon></strong>
            </div>
          </div>
        </article>
      </section>

      <section v-if="!loading && filteredCourses.length === 0" class="empty-state" aria-live="polite">
        <el-empty description="还没有符合条件的课程">
          <el-button class="empty-create" type="primary" @click="openCreateDialog">
            <el-icon><Plus /></el-icon>
            新建课程
          </el-button>
        </el-empty>
      </section>
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
              <el-option label="研一" value="研一" />
              <el-option label="研二" value="研二" />
              <el-option label="研三" value="研三" />
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
        <el-form-item label="课程公开状态">
          <el-switch
            v-model="createForm.isPublic"
            :active-value="1"
            :inactive-value="0"
            active-text="公开"
            inactive-text="不公开"
          />
        </el-form-item>
        <el-form-item label="课程标签">
          <el-select
            v-model="createForm.tags"
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
:global(:root) {
  --course-ink: #3d3564;
  --course-purple: #8178cf;
  --course-pink: #ee91bb;
  --course-mint: #9de4eb;
  --course-mint-strong: #52bbc4;
  --course-yellow: #fff1a8;
  --course-paper: #fbfbff;
}

.course-module-shell {
  --ink: var(--course-ink);
  --purple: var(--course-purple);
  --pink: var(--course-pink);
  --mint: var(--course-mint);
  --yellow: var(--course-yellow);
  display: grid;
  min-height: 100%;
  grid-template-columns: 226px minmax(0, 1fr);
  background-color: var(--course-paper);
  background-image: linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px),
    linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
  color: var(--ink);
  font-family: 'Microsoft YaHei', Arial, sans-serif;
}

.course-sidebar {
  position: sticky;
  top: 0;
  display: flex;
  min-height: calc(100vh - 64px);
  flex-direction: column;
  align-self: start;
  padding: 26px 18px 22px;
  border-right: 2px solid rgb(61 53 100 / 18%);
  background: rgb(255 255 255 / 84%);
}

.sidebar-heading {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 6px 24px;
}

.sidebar-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 2px solid var(--ink);
  border-radius: 7px;
  background: var(--mint);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 24%);
  color: var(--ink);
  transform: rotate(-3deg);
}

.sidebar-mark :deep(svg) { width: 21px; }
.sidebar-heading strong, .sidebar-heading small { display: block; }
.sidebar-heading strong { font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 15px; font-weight: 900; }
.sidebar-heading small { margin-top: 3px; color: #756a94; font-size: 12px; }

.create-course-button,
.banner-primary,
.empty-create {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #4e4473;
  border-radius: 5px;
  background: var(--purple);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
  color: #fff;
  font-weight: 800;
  white-space: nowrap;
}

.create-course-button { width: 100%; height: 44px; }
.create-course-button:hover, .banner-primary:hover, .empty-create:hover { transform: translate(-2px, -2px); box-shadow: 5px 6px 0 rgb(61 53 100 / 28%); }

.course-nav { display: grid; gap: 7px; margin-top: 19px; }
.course-nav button {
  display: flex;
  width: 100%;
  height: 43px;
  align-items: center;
  gap: 11px;
  padding: 0 13px;
  border: 1px solid transparent;
  border-radius: 5px;
  background: transparent;
  color: #635a80;
  cursor: pointer;
  font: inherit;
  font-weight: 750;
  text-align: left;
}

.course-nav button:hover, .course-nav button.active { border-color: rgb(61 53 100 / 28%); background: #e9e5ff; color: var(--ink); box-shadow: 2px 3px 0 rgb(61 53 100 / 12%); }
.sidebar-note { margin-top: auto; padding: 17px 6px 0; border-top: 1px solid rgb(61 53 100 / 18%); }
.sidebar-note span, .sidebar-note small { display: block; }
.sidebar-note span { color: var(--purple); font-family: 'Trebuchet MS', sans-serif; font-size: 29px; font-weight: 900; }
.sidebar-note small { margin-top: 3px; color: #756a94; font-size: 12px; }

.course-workspace { width: min(100%, 1580px); min-width: 0; margin: 0 auto; padding: clamp(22px, 4vw, 56px) clamp(18px, 4.5vw, 76px) 58px; }

.explore-banner {
  position: relative;
  display: flex;
  min-height: 246px;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  overflow: hidden;
  padding: clamp(26px, 4vw, 43px);
  border: 2px solid var(--ink);
  border-radius: 9px;
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%);
  box-shadow: 7px 8px 0 rgb(61 53 100 / 45%);
}

.banner-copy { position: relative; z-index: 2; max-width: 575px; }
.eyebrow { margin: 0 0 11px; color: #6f649a; font-size: 11px; font-weight: 900; letter-spacing: 1.6px; }
.explore-banner h1 { margin: 0; color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: clamp(38px, 5vw, 62px); font-weight: 900; line-height: 1.06; }
.banner-description { max-width: 430px; margin: 15px 0 0; color: #615783; font-size: 15px; font-weight: 650; line-height: 1.75; }
.banner-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 13px; margin-top: 21px; }
.banner-primary { min-height: 42px; padding: 0 16px; }
.banner-note { display: inline-block; padding: 7px 11px; border: 1px solid var(--ink); border-radius: 4px; background: var(--yellow); box-shadow: 2px 3px 0 rgb(61 53 100 / 23%); color: var(--ink); font-size: 12px; font-weight: 900; transform: rotate(-2deg); }

.banner-decoration { position: relative; flex: 0 0 365px; height: 220px; opacity: .92; }
.orbit { position: absolute; border: 2px dashed rgb(61 53 100 / 42%); border-radius: 50%; animation: orbit-spin 14s linear infinite; }
.orbit-one { width: 275px; height: 172px; top: 24px; left: 40px; transform: rotate(-22deg); }
.orbit-two { width: 172px; height: 258px; top: -20px; left: 94px; border-color: rgb(238 145 187 / 68%); animation-duration: 18s; animation-direction: reverse; }
.orbit-core { position: absolute; top: 78px; left: 145px; width: 65px; height: 65px; border: 2px solid var(--ink); border-radius: 50%; background: var(--mint); box-shadow: 4px 5px 0 rgb(61 53 100 / 25%); }
.orbit-dot { position: absolute; width: 15px; height: 15px; border: 2px solid var(--ink); border-radius: 50%; box-shadow: 2px 2px 0 rgb(61 53 100 / 18%); }
.dot-one { top: 36px; left: 69px; background: var(--pink); }
.dot-two { right: 43px; bottom: 35px; background: var(--yellow); }
.mini-sticker { position: absolute; padding: 8px 10px; border: 1px solid var(--ink); border-radius: 4px; background: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 23%); font-family: 'Trebuchet MS', sans-serif; font-size: 11px; font-weight: 900; }
.sticker-idea { top: 16px; right: 18px; transform: rotate(7deg); }
.sticker-make { bottom: 23px; left: 4px; background: var(--yellow); transform: rotate(-8deg); }
.mini-star { position: absolute; color: var(--ink); font-family: 'Trebuchet MS', sans-serif; font-size: 27px; font-weight: 900; animation: float-note 6s ease-in-out infinite; }
.star-one { top: 4px; left: 185px; color: var(--pink); }
.star-two { right: 3px; top: 107px; color: var(--purple); animation-delay: -2s; }

.workspace-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-top: 35px; }
.section-kicker { margin: 0; color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 22px; font-weight: 900; }
.workspace-hint { margin: 6px 0 0; color: #756a94; font-size: 13px; }
.refresh-button { border: 1px solid var(--ink) !important; background: #fff !important; color: var(--purple) !important; box-shadow: 2px 3px 0 rgb(61 53 100 / 23%); }
.refresh-button:hover { transform: translate(-2px, -2px); box-shadow: 4px 5px 0 rgb(61 53 100 / 25%); }

.stats-band { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-top: 17px; }
.stat-card { position: relative; min-width: 0; min-height: 115px; padding: 16px 18px; border: 2px solid var(--ink); border-radius: 7px; box-shadow: 4px 5px 0 rgb(61 53 100 / 17%); }
.stat-purple { background: #ece9ff; }
.stat-yellow { background: #fff7d2; }
.stat-mint { background: #e4faf9; }
.stat-pink { background: #ffedf4; }
.stat-card > span:not(.stat-icon), .stat-card strong { display: block; }
.stat-card > span:not(.stat-icon) { color: #635a80; font-size: 12px; font-weight: 750; }
.stat-card strong { margin-top: 5px; color: var(--ink); font-family: 'Trebuchet MS', sans-serif; font-size: 30px; font-weight: 900; }
.stat-icon { position: absolute; top: 13px; right: 15px; display: grid; width: 30px; height: 30px; place-items: center; border: 1px solid var(--ink); border-radius: 5px; background: #fff; color: var(--purple); }
.stat-yellow .stat-icon { color: #b7821d; }
.stat-mint .stat-icon { color: var(--mint-strong); }
.stat-pink .stat-icon { color: #d3759f; }

.course-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin: 28px 0 19px; }
.course-search { width: min(380px, 42vw); }
.course-toolbar :deep(.el-segmented) { padding: 4px; border: 1px solid rgb(61 53 100 / 35%); border-radius: 5px; background: #fff; box-shadow: 2px 3px 0 rgb(61 53 100 / 14%); }
.course-toolbar :deep(.el-segmented__item) { min-width: 64px; color: #756a94; font-weight: 750; white-space: nowrap; }
.course-toolbar :deep(.el-segmented__item-selected) { color: #fff; }
.course-toolbar :deep(.el-segmented__item-selected::after) { background: var(--purple); }
.course-search :deep(.el-input__wrapper) { min-height: 40px; border: 1px solid var(--ink); border-radius: 5px; background: #fff; box-shadow: 2px 3px 0 rgb(61 53 100 / 14%); }
.course-search :deep(.el-input__inner) { color: var(--ink); }

.course-grid { display: grid; min-height: 180px; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 19px; }
.course-card { --card-accent: var(--purple); min-width: 0; overflow: hidden; border: 2px solid var(--ink); border-radius: 7px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 21%); cursor: pointer; outline: 0; transition: box-shadow .22s ease, transform .22s ease; }
.course-card:nth-child(4n + 2) { --card-accent: var(--pink); }
.course-card:nth-child(4n + 3) { --card-accent: var(--mint-strong); }
.course-card:nth-child(4n + 4) { --card-accent: #d19a42; }
.course-card:hover, .course-card:focus-visible { transform: translate(-3px, -4px) rotate(-.35deg); box-shadow: 7px 9px 0 rgb(61 53 100 / 70%); }
.cover-frame { position: relative; aspect-ratio: 16 / 9; overflow: hidden; background: #e9e5ff; }
.cover-frame .el-image { width: 100%; height: 100%; }
.cover-frame::after { position: absolute; inset: 0; background: linear-gradient(120deg, transparent 45%, rgb(255 255 255 / 24%) 46%, transparent 52%); content: ''; pointer-events: none; }
.status-tag { position: absolute; top: 11px; left: 11px; z-index: 1; border: 1px solid var(--ink) !important; border-radius: 4px !important; box-shadow: 2px 2px 0 rgb(61 53 100 / 35%); font-weight: 900; transform: rotate(-3deg); }
.status-tag.el-tag--success { background: var(--mint-strong) !important; }
.status-tag.el-tag--info { background: var(--yellow) !important; color: var(--ink) !important; }
.status-tag.el-tag--warning { background: var(--pink) !important; color: #fff !important; }
.cover-scribble { position: absolute; right: -9px; bottom: 12px; z-index: 1; width: 68px; height: 18px; border-top: 3px dashed #fff; border-bottom: 3px dotted var(--card-accent); transform: rotate(-23deg); }
.course-card-body { padding: 15px 16px 14px; }
.card-title-row { display: grid; grid-template-columns: minmax(0, 1fr) 32px; gap: 8px; }
.card-title-row h2 { margin: 0; overflow: hidden; color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 18px; font-weight: 900; line-height: 23px; text-overflow: ellipsis; white-space: nowrap; }
.card-title-row p { margin: 5px 0 0; overflow: hidden; color: #756a94; font-size: 12px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.card-title-row :deep(.el-button) { color: var(--ink); }
.course-card-meta { display: flex; flex-wrap: wrap; gap: 11px; margin-top: 14px; color: #635a80; font-size: 12px; font-weight: 650; }
.course-card-meta span { display: inline-flex; align-items: center; gap: 4px; }
.course-card-meta :deep(svg) { color: var(--card-accent); }
.card-footer { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 15px; padding-top: 12px; border-top: 1px solid rgb(61 53 100 / 22%); color: #8a80a5; font-size: 12px; }
.card-footer strong { display: inline-flex; align-items: center; gap: 4px; color: var(--card-accent); font-weight: 900; white-space: nowrap; }
.card-footer :deep(svg) { width: 13px; }

.empty-state { min-height: 280px; display: grid; place-items: center; margin-top: 15px; border: 2px dashed rgb(61 53 100 / 25%); border-radius: 7px; background: rgb(255 255 255 / 58%); }
.empty-state :deep(.el-empty__description) { color: #756a94; font-weight: 750; }
.empty-create { min-height: 40px; padding: 0 14px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.full-width { width: 100%; }
.course-preview { color: var(--ink); }
.course-preview > img { width: 100%; aspect-ratio: 16 / 8; border: 2px solid var(--ink); border-radius: 6px; object-fit: cover; }
.course-preview h2 { margin: 20px 0 10px; font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 25px; font-weight: 900; }
.course-preview > p { color: #635a80; line-height: 1.8; white-space: pre-wrap; }
.course-preview h3 { margin: 28px 0 12px; font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: 18px; font-weight: 900; }
.preview-chapter-title { font-weight: 800; }
.preview-resource-row { display: flex; align-items: center; gap: 9px; padding: 8px 12px; color: #635a80; }
.preview-resource-row svg { width: 16px; color: var(--purple); }

:deep(.el-dialog), :deep(.el-drawer) { --el-text-color-primary: var(--ink); }
:deep(.el-dialog) { border: 2px solid var(--ink); border-radius: 7px; box-shadow: 7px 8px 0 rgb(61 53 100 / 40%); }
:deep(.el-dialog__title), :deep(.el-drawer__header) { color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-weight: 900; }
:deep(.el-dialog__footer .el-button--primary) { border-color: #4e4473; border-radius: 5px; background: var(--purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 25%); font-weight: 800; white-space: nowrap; }
:deep(.el-dialog__footer .el-button:not(.el-button--primary)) { border-color: var(--ink); border-radius: 5px; color: var(--ink); white-space: nowrap; }
:deep(.el-form-item__label) { color: var(--ink); font-weight: 800; }
:deep(.el-input__wrapper), :deep(.el-select__wrapper) { border: 1px solid rgb(61 53 100 / 45%); border-radius: 5px; box-shadow: 2px 3px 0 rgb(61 53 100 / 12%); }
:deep(.el-radio-button__inner) { color: var(--ink); font-weight: 750; }
:deep(.el-switch.is-checked .el-switch__core) { border-color: var(--mint-strong); background: var(--mint-strong); }

@keyframes orbit-spin { to { transform: rotate(338deg); } }
@keyframes float-note { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }

@media (max-width: 1180px) {
  .course-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .banner-decoration { flex-basis: 305px; transform: scale(.9); transform-origin: right center; }
}

@media (max-width: 820px) {
  .course-module-shell { grid-template-columns: 1fr; }
  .course-sidebar { position: static; min-height: auto; padding: 14px 16px; border-right: 0; border-bottom: 2px solid rgb(61 53 100 / 18%); }
  .sidebar-heading, .sidebar-note { display: none; }
  .course-nav { display: flex; margin-top: 2px; }
  .course-nav button { flex: 1; justify-content: center; }
  .course-workspace { padding: 22px 16px 40px; }
  .explore-banner { min-height: 230px; padding: 26px 23px; }
  .banner-decoration { position: absolute; right: -82px; bottom: -35px; width: 300px; opacity: .55; transform: scale(.78); transform-origin: right bottom; }
  .stats-band { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 580px) {
  .explore-banner { min-height: 290px; align-items: flex-start; }
  .explore-banner h1 { font-size: 39px; }
  .banner-description { max-width: 290px; }
  .workspace-header { margin-top: 30px; }
  .section-kicker { font-size: 20px; }
  .course-toolbar { align-items: stretch; flex-direction: column; gap: 12px; }
  .course-search, .course-toolbar :deep(.el-segmented) { width: 100%; }
  .course-toolbar :deep(.el-segmented) { width: 100%; }
  .course-toolbar :deep(.el-segmented__group) { display: grid; width: 100%; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .course-toolbar :deep(.el-segmented__item) { min-width: 0; }
  .course-grid { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>
