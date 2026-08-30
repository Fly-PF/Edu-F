<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowRight,
  Collection,
  Delete,
  Document,
  EditPen,
  Files,
  FolderOpened,
  Picture,
  Plus,
  Refresh,
  User,
  VideoPlay,
} from '@element-plus/icons-vue'
import {
  createCourseCategory,
  deleteCourseCategory,
  getCourse,
  getCourseChapters,
  listCourseCategories,
  listCourseTags,
  updateCourseCategory,
} from '@/api/course'
import { useUserStore } from '@/stores/user'
import cover1 from '@/assets/course/img1.webp'
import cover2 from '@/assets/course/img2.webp'
import cover3 from '@/assets/course/img3.webp'
import cover4 from '@/assets/course/img4.webp'

const router = useRouter()
const userStore = useUserStore()
const covers = [cover1, cover2, cover3, cover4]
const loading = ref(false)
const categories = ref([])
const availableTags = ref([])
const dialogVisible = ref(false)
const dialogLoading = ref(false)
const editingCategory = ref(null)
const categoryForm = reactive({ name: '', sortOrder: 0, tags: [], matchAll: false })
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailCourse = ref(null)
const detailChapters = ref([])

const isAdmin = computed(() => userStore.hasAnyRole(['ADMIN', 'SUPERADMIN']))
const dialogTitle = computed(() => (editingCategory.value ? '编辑类别' : '新增分类'))

function fallbackCover(course) {
  return covers[Math.abs(Number(course?.id || 0)) % covers.length]
}

function difficultyText(value) {
  return { 1: '入门', 2: '进阶', 3: '高阶' }[value] || '探索中'
}

function courseTypeText(value) {
  return { 1: '理论课', 2: '项目实践课', 3: '实验课' }[value] || '课程'
}

function resourceIcon(type) {
  return { 1: VideoPlay, 2: Document, 3: Picture, 4: Files }[type] || Files
}

function resourceTypeText(type, resource) {
  if (Number(type) === 4 && /\.vtt(?:$|\?)/i.test(resource?.name || resource?.url || '')) return '字幕文件'
  return { 1: '视频', 2: 'PDF', 3: '图片', 4: '数据文件' }[type] || '资源'
}

async function loadPage() {
  loading.value = true
  try {
    const [categoryData, tagData] = await Promise.all([listCourseCategories(), listCourseTags()])
    categories.value = categoryData || []
    availableTags.value = tagData || []
  } catch (error) {
    ElMessage.error(error?.message || '课程分类加载失败')
  } finally {
    loading.value = false
  }
}

function openCreateDialog() {
  editingCategory.value = null
  Object.assign(categoryForm, {
    name: '',
    sortOrder: categories.value.length,
    tags: [],
    matchAll: false,
  })
  dialogVisible.value = true
}

function openEditDialog(category) {
  editingCategory.value = category
  Object.assign(categoryForm, {
    name: category.name,
    sortOrder: category.sortOrder || 0,
    tags: [...(category.tags || [])],
    matchAll: Boolean(category.matchAll),
  })
  dialogVisible.value = true
}

async function saveCategory() {
  if (!categoryForm.name.trim()) {
    ElMessage.warning('请输入分类名称')
    return
  }
  if (!categoryForm.tags.length) {
    ElMessage.warning('请至少选择一个课程标签')
    return
  }

  dialogLoading.value = true
  try {
    const payload = {
      name: categoryForm.name.trim(),
      sortOrder: Number(categoryForm.sortOrder || 0),
      tags: [...categoryForm.tags],
      matchAll: categoryForm.matchAll,
    }
    if (editingCategory.value) {
      await updateCourseCategory(editingCategory.value.id, payload)
      ElMessage.success('分类已保存')
    } else {
      await createCourseCategory(payload)
      ElMessage.success('分类已创建')
    }
    dialogVisible.value = false
    await loadPage()
  } catch (error) {
    ElMessage.error(error?.message || '分类保存失败')
  } finally {
    dialogLoading.value = false
  }
}

async function removeCategory(category) {
  try {
    await ElMessageBox.confirm(`删除“${category.name}”不会影响任何课程和课程标签，是否继续？`, '删除类别', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteCourseCategory(category.id)
    ElMessage.success('分类已删除')
    await loadPage()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '删除失败')
    }
  }
}

function viewMore(category) {
  router.push({
    name: 'course-search',
    query: {
      tags: (category.tags || []).join(','),
      matchAll: category.matchAll ? 'true' : 'false',
    },
  })
}

async function openCourse(course) {
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

onMounted(loadPage)
</script>

<template>
  <main class="category-page">
    <header class="course-hero">
      <div class="hero-copy">
        <p class="hero-kicker"><span></span> AI EXPLORER CLUB</p>
        <h1>把好奇心<br />变成超能力</h1>
        <p class="hero-description">挑一门喜欢的课，和 AI 一起动手、创作、发现新世界。</p>
        <div class="hero-actions">
          <span class="hero-note">本周持续更新</span>
          <el-tooltip content="刷新分类" placement="bottom">
            <el-button class="refresh-button" circle aria-label="刷新分类" :loading="loading" @click="loadPage">
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

    <div v-if="isAdmin" class="category-admin-bar">
      <span>把喜欢的课程聚成一条探索路线</span>
      <el-button class="category-create-button" @click="openCreateDialog">
        <el-icon><Plus /></el-icon>
        新增分类
      </el-button>
    </div>

    <section
      v-loading="loading"
      element-loading-background="transparent"
      class="category-list"
      aria-live="polite"
    >
      <article v-for="category in categories" :key="category.id" class="category-section">
        <header class="category-heading">
          <div>
            <p class="section-kicker">CURATED PATH</p>
            <h2>{{ category.name }}</h2>
            <div class="category-rules">
              <span v-for="tag in category.tags" :key="tag">{{ tag }}</span>
              <small>{{ category.matchAll ? '需要同时拥有全部标签' : '拥有任一标签即可加入' }}</small>
            </div>
          </div>
          <div class="category-actions">
            <template v-if="isAdmin">
              <el-button text :icon="EditPen" @click="openEditDialog(category)">编辑类别</el-button>
              <el-button text type="danger" :icon="Delete" @click="removeCategory(category)">删除类别</el-button>
            </template>
            <button class="view-more-button" type="button" @click="viewMore(category)">
              查看更多 <el-icon><ArrowRight /></el-icon>
            </button>
          </div>
        </header>

        <div v-if="category.courses?.length" class="category-grid">
          <article
            v-for="(course, index) in category.courses"
            :key="course.id"
            class="catalog-card compact-card"
            :class="`card-tone-${index % 4}`"
            role="button"
            tabindex="0"
            @click="openCourse(course)"
            @keydown.enter="openCourse(course)"
            @keydown.space.prevent="openCourse(course)"
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
                <span v-for="tag in (course.tags || []).slice(0, 1)" :key="tag">{{ tag }}</span>
              </div>
              <h3>{{ course.title }}</h3>
              <div class="catalog-meta">
                <span><el-icon><User /></el-icon>{{ course.teacherName || '平台教师' }}</span>
                <span><el-icon><FolderOpened /></el-icon>{{ course.totalChapter || 0 }} 个任务站</span>
              </div>
              <div class="catalog-footer">
                <span><el-icon><Collection /></el-icon>{{ course.resourceCount || 0 }} 个资源</span>
                <b>去探索 <i></i></b>
              </div>
            </div>
          </article>
        </div>
        <el-empty v-else description="这个分类暂时还没有匹配课程" :image-size="56" />
      </article>
      <el-empty v-if="!loading && !categories.length" description="还没有课程分类" />
    </section>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="min(580px, 92vw)" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="分类名称" required>
          <el-input v-model.trim="categoryForm.name" maxlength="100" show-word-limit placeholder="例如：AI 入门课程" />
        </el-form-item>
        <div class="form-row">
          <el-form-item label="展示排序">
            <el-input-number v-model="categoryForm.sortOrder" :min="0" :step="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="标签匹配方式">
            <el-switch v-model="categoryForm.matchAll" active-text="同时匹配全部" inactive-text="匹配任意一个" />
          </el-form-item>
        </div>
        <el-form-item label="课程标签" required>
          <el-select v-model="categoryForm.tags" multiple filterable clearable collapse-tags collapse-tags-tooltip class="full-width" placeholder="选择一个或多个已有标签">
            <el-option v-for="tag in availableTags" :key="tag" :label="tag" :value="tag" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="dialogLoading" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>

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
                  <span class="detail-resource-icon"><component :is="resourceIcon(resource.type)" /></span>
                  <div><strong>{{ resource.name }}</strong><small>{{ resourceTypeText(resource.type, resource) }}</small></div>
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
.category-page { --ink:#3d3564; --purple:#8178cf; --pink:#ee91bb; --yellow:#fff1a8; --cyan:#9de4eb; min-height:100%; padding:30px clamp(18px,5vw,80px) 68px; background-color:#fbfbff; background-image:linear-gradient(90deg,rgb(129 120 207 / 5%) 1px,transparent 1px),linear-gradient(rgb(238 145 187 / 5%) 1px,transparent 1px); background-size:32px 32px; color:var(--ink); }
.course-hero { position:relative; display:flex; min-height:294px; align-items:stretch; justify-content:space-between; gap:30px; padding:clamp(28px,4vw,54px) clamp(26px,5vw,76px); overflow:hidden; border:1px solid rgb(88 77 137 / 26%); border-radius:14px; background:linear-gradient(118deg,#e8e4ff 0%,#f9ddec 43%,#d3f2f2 100%); box-shadow:0 18px 38px rgb(91 77 148 / 13%); isolation:isolate; }
.course-hero::before,.course-hero::after { position:absolute; z-index:-1; content:''; }.course-hero::before { width:430px; height:430px; top:-220px; left:43%; border:2px solid rgb(255 255 255 / 72%); border-radius:43% 57% 62% 38% / 42% 42% 58% 58%; transform:rotate(13deg); }.course-hero::after { width:75%; height:66px; right:-7%; bottom:-28px; border-top:3px dashed rgb(87 75 137 / 38%); transform:rotate(-4deg); }
.hero-copy { position:relative; z-index:1; max-width:560px; }.hero-kicker { display:flex; align-items:center; gap:8px; margin:0; color:#6f649a; font-size:12px; font-weight:800; letter-spacing:1.5px; }.hero-kicker span { width:9px; height:9px; border:1px solid #766b9e; border-radius:50%; background:var(--yellow); box-shadow:2px 2px 0 rgb(61 53 100 / 28%); }.course-hero h1 { margin:0; padding-top:17px; color:#3e3564; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:clamp(38px,5vw,66px); font-weight:900; line-height:1.04; text-shadow:2px 2px 0 rgb(255 255 255 / 72%); }.hero-description { max-width:395px; margin:18px 0 0; color:#615783; font-size:15px; font-weight:650; line-height:1.75; }.hero-actions { display:flex; align-items:center; gap:12px; margin-top:23px; }.hero-note { padding:7px 11px; border:1px solid rgb(78 68 121 / 52%); border-radius:4px; background:var(--yellow); box-shadow:2px 3px 0 rgb(61 53 100 / 25%); font-size:12px; font-weight:800; transform:rotate(-2deg); }.refresh-button { border:1px solid rgb(78 68 121 / 48%) !important; background:#fff !important; color:var(--purple) !important; box-shadow:2px 3px 0 rgb(61 53 100 / 25%); }
.hero-art { position:relative; width:min(37%,370px); min-width:285px; z-index:1; }.hero-art p { position:absolute; z-index:2; top:57px; right:19%; margin:0; color:var(--ink); font-family:Impact,'Arial Black',sans-serif; font-size:clamp(26px,3vw,43px); line-height:.87; text-align:right; transform:rotate(-9deg); }.hero-spray { position:absolute; border:2px solid #4e4473; }.spray-one { width:172px; height:172px; top:14px; right:8px; border-radius:62% 38% 36% 64% / 44% 55% 45% 56%; background:var(--yellow); transform:rotate(-18deg); }.spray-two { width:103px; height:103px; right:183px; bottom:2px; border-radius:41% 59% 67% 33% / 57% 37% 63% 43%; background:var(--cyan); transform:rotate(25deg); }.hero-grid-mark { position:absolute; z-index:-1; width:145px; height:122px; right:4px; bottom:5px; background-image:radial-gradient(#766a9b 1.7px,transparent 2px); background-size:13px 13px; opacity:.72; transform:rotate(8deg); }.hero-sticker { position:absolute; z-index:3; display:grid; place-items:center; border:2px solid #4e4473; color:#4e4473; font-family:Impact,'Arial Black',sans-serif; font-size:21px; box-shadow:2px 3px 0 rgb(61 53 100 / 27%); }.sticker-one { width:50px; height:50px; top:3px; right:0; border-radius:50%; background:#fff; transform:rotate(13deg); }.sticker-two { width:57px; height:40px; bottom:22px; left:35px; border-radius:6px; background:var(--pink); color:#fff; transform:rotate(-11deg); }
.category-admin-bar { display:flex; align-items:center; justify-content:space-between; gap:16px; margin:30px 0 4px; color:#756a94; font-size:13px; }.category-create-button { border:1px solid #776d9e; border-radius:8px; background:#fff; color:var(--ink); box-shadow:2px 3px 0 rgb(61 53 100 / 18%); font-weight:750; }.category-list { display:grid; gap:42px; padding-top:20px; }.category-section { min-width:0; }.category-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; padding-bottom:13px; border-bottom:1px solid rgb(61 53 100 / 21%); }.section-kicker { margin:0 0 4px; color:#d3759f; font-size:11px; font-weight:900; letter-spacing:1px; }.category-heading h2 { margin:0; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:27px; font-weight:900; }.category-rules { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-top:9px; }.category-rules span { padding:3px 7px; border:1px solid rgb(61 53 100 / 35%); border-radius:4px; background:#fff; color:#635a80; font-size:11px; font-weight:700; }.category-rules small { color:#8a80a5; font-size:11px; }.category-actions { display:flex; flex-shrink:0; align-items:center; gap:4px; }.category-actions :deep(.el-button) { font-size:12px; }.view-more-button { display:inline-flex; align-items:center; gap:4px; padding:7px 0 7px 10px; border:0; background:transparent; color:var(--purple); font-weight:800; cursor:pointer; }.category-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:18px; margin-top:19px; }
.catalog-card { --card-accent:#8178cf; --card-soft:#eeebff; min-width:0; overflow:hidden; border:2px solid var(--ink); border-radius:7px; background:#fff; cursor:pointer; box-shadow:5px 5px 0 rgb(61 53 100 / 78%); outline:0; transition:box-shadow .2s ease,transform .2s ease; }.catalog-card:hover,.catalog-card:focus-visible { transform:translate(-3px,-5px) rotate(-.6deg); box-shadow:8px 10px 0 rgb(61 53 100 / 82%); }.card-tone-1 { --card-accent:#e68db5; --card-soft:#ffedf4; }.card-tone-2 { --card-accent:#52bbc4; --card-soft:#e4faf9; }.card-tone-3 { --card-accent:#e0a153; --card-soft:#fff6dc; }.catalog-cover { position:relative; aspect-ratio:16 / 9; overflow:hidden; background:var(--card-soft); }.catalog-cover .el-image { width:100%; height:100%; }.course-type { position:absolute; top:9px; left:9px; z-index:2; padding:4px 7px 3px; border:1px solid var(--ink); border-radius:4px; background:var(--yellow); box-shadow:2px 2px 0 rgb(61 53 100 / 45%); color:var(--ink); font-size:10px; font-weight:800; transform:rotate(-2deg); }.cover-scribble { position:absolute; width:64px; height:18px; right:-8px; bottom:9px; border-top:3px dashed #fff; border-bottom:3px dotted var(--card-accent); transform:rotate(-23deg); }.catalog-card-body { padding:13px 14px 12px; }.catalog-tags { display:flex; min-height:20px; flex-wrap:wrap; gap:5px; }.catalog-tags span { padding:2px 6px; border:1px solid rgb(61 53 100 / 58%); border-radius:3px; background:var(--card-soft); font-size:10px; font-weight:700; }.catalog-card h3 { margin:9px 0 0; overflow:hidden; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:16px; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }.catalog-meta { display:flex; justify-content:space-between; gap:7px; margin-top:12px; padding-top:9px; border-top:1px solid rgb(61 53 100 / 32%); color:#51486f; font-size:10px; }.catalog-meta span,.catalog-footer,.catalog-footer span,.catalog-footer b { display:flex; align-items:center; gap:4px; min-width:0; }.catalog-meta span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.catalog-footer { justify-content:space-between; margin-top:9px; color:#5a5273; font-size:10px; font-weight:700; }.catalog-footer :deep(svg),.catalog-meta :deep(svg) { color:var(--card-accent); }.catalog-footer b { color:var(--card-accent); white-space:nowrap; }.catalog-footer b i { width:7px; height:7px; border-top:2px solid currentcolor; border-right:2px solid currentcolor; transform:rotate(45deg); }.form-row { display:grid; grid-template-columns:150px 1fr; gap:16px; }.full-width { width:100%; }
.course-detail-drawer > img { width:100%; aspect-ratio:16 / 8; border:2px solid var(--ink); border-radius:6px; object-fit:cover; }.detail-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; margin-top:20px; }.detail-heading p { margin:0 0 5px; color:var(--purple); font-size:12px; font-weight:750; }.detail-heading h2 { margin:0; color:var(--ink); font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:24px; font-weight:900; }.detail-facts { display:flex; flex-wrap:wrap; gap:15px; margin-top:15px; color:#5e5576; font-size:13px; }.detail-facts span { display:flex; align-items:center; gap:5px; }.detail-actions { margin-top:18px; }.detail-actions :deep(.el-button) { height:40px; padding:0 19px; border:1px solid var(--ink); border-radius:5px; background:var(--pink); box-shadow:2px 3px 0 rgb(61 53 100 / 24%); color:#fff; font-weight:800; }.detail-intro,.detail-catalog { margin-top:28px; }.detail-intro h3,.detail-catalog h3 { margin:0 0 12px; font-size:16px; }.detail-intro p { margin:0; color:#5d5575; line-height:1.8; white-space:pre-wrap; }.chapter-title { margin-right:10px; font-weight:650; }.detail-catalog :deep(.el-collapse-item__title small) { color:#8a94a4; font-size:11px; }.detail-resource { display:flex; align-items:center; gap:11px; padding:9px 11px; }.detail-resource-icon { display:grid; width:32px; height:32px; place-items:center; border:2px solid var(--ink); border-radius:5px; background:var(--yellow); color:var(--ink); }.detail-resource-icon :deep(svg) { width:16px; }.detail-resource strong,.detail-resource small { display:block; }.detail-resource strong { color:var(--ink); font-size:13px; }.detail-resource small { margin-top:3px; color:#756c8d; font-size:11px; }
@media (max-width:1050px) { .category-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }.hero-art { width:31%; min-width:230px; } }
@media (max-width:680px) { .category-page { padding:18px 16px 42px; }.course-hero { min-height:395px; padding:29px 23px; }.course-hero h1 { font-size:40px; }.hero-art { position:absolute; width:260px; min-width:0; height:185px; right:-26px; bottom:-20px; opacity:.94; }.hero-description,.hero-actions { position:relative; z-index:3; }.category-admin-bar { margin-top:24px; }.category-heading { align-items:flex-start; flex-direction:column; }.category-actions { width:100%; flex-wrap:wrap; }.view-more-button { margin-left:auto; }.category-grid { grid-template-columns:1fr; }.form-row { grid-template-columns:1fr; gap:0; } }
</style>
