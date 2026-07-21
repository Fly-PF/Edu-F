<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Back, Collection, FolderAdd, Search, Share, UserFilled } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { listBlockGallery, listMyBlockProjects, remixBlockProject } from '@/api/blockProject'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const keyword = ref('')
const scope = ref('all')
const loading = ref(false)
const projects = ref([])

const filteredProjects = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return projects.value.filter((project) => !query || [project.title, project.description, project.ownerName].join(' ').toLowerCase().includes(query))
})

async function loadProjects() {
  if (!userStore.isLoggedIn) {
    projects.value = []
    return
  }
  loading.value = true
  try {
    if (scope.value === 'mine') projects.value = await listMyBlockProjects() || []
    else projects.value = await listBlockGallery() || []
  } catch (error) {
    projects.value = []
    ElMessage.error(error?.message || '项目加载失败')
  } finally {
    loading.value = false
  }
}

function selectScope(value) {
  scope.value = value
  loadProjects()
}

function createProject() { router.push('/tools/blocks') }
function openProject(project) { router.push({ path: '/tools/blocks', query: { projectId: project.id } }) }
async function remixProject(project) {
  try {
    const copy = await remixBlockProject(project.id)
    router.push({ path: '/tools/blocks', query: { projectId: copy.id } })
  } catch (error) {
    ElMessage.error(error?.message || '复制创作失败')
  }
}

function goBack() { router.push('/tools/blocks') }
onMounted(loadProjects)
</script>

<template>
  <main class="project-gallery-page">
    <header class="gallery-header">
      <button class="back-button" type="button" aria-label="返回积木工坊" @click="goBack"><el-icon><Back /></el-icon></button>
      <div><p>BLOCK PROJECTS</p><h1>积木项目库</h1></div>
      <el-button class="create-button" @click="createProject"><el-icon><FolderAdd /></el-icon>创建新项目</el-button>
    </header>

    <div class="gallery-layout">
      <aside class="filter-sidebar">
        <section><h2>探索</h2><button :class="{ active: scope === 'all' }" type="button" @click="selectScope('all')">全部作品 <span>›</span></button><button :class="{ active: scope === 'mine' }" type="button" @click="selectScope('mine')">我的项目 <span>›</span></button></section>
        <section><h2>方向</h2><button class="active" type="button">积木创作 <span>›</span></button><button type="button">互动故事 <span>›</span></button><button type="button">AI 实验 <span>›</span></button></section>
        <div class="tip-card"><strong>动手试一试</strong><p>拖拽积木，让角色在舞台上完成你的创意。</p><button type="button" @click="createProject">开始创建</button></div>
      </aside>

      <section class="gallery-content" aria-label="积木项目列表">
        <div class="gallery-toolbar"><el-input v-model="keyword" placeholder="搜索项目、作者或创意" clearable><template #prefix><el-icon><Search /></el-icon></template></el-input><span>{{ filteredProjects.length }} 个项目</span></div>
        <div v-loading="loading" class="project-grid">
          <article v-for="(project, index) in filteredProjects" :key="project.id" class="project-card" :class="`tone-${index % 4}`">
            <div class="card-head"><span class="project-badge">积木创作</span><div><span class="stat">{{ project.viewCount || 0 }} 浏览</span><el-icon><Share /></el-icon></div></div>
            <h2>{{ project.title }}</h2><p>{{ project.description || '还没有写项目简介，打开看看这个创意吧。' }}</p>
            <div class="tag-row"><span>互动舞台</span><span v-if="project.sourceProjectId">复制创作</span><span v-if="project.published">公开作品</span></div>
            <footer><span><el-icon><UserFilled /></el-icon>{{ project.ownerName || '创作者' }}</span><span><el-icon><Collection /></el-icon>{{ project.remixCount || 0 }} 次复制</span><div><button type="button" @click="openProject(project)">打开</button><button v-if="scope === 'all'" type="button" @click="remixProject(project)">复制创作</button></div></footer>
          </article>
          <el-empty v-if="!loading && !filteredProjects.length" :image-size="80" :description="userStore.isLoggedIn ? '还没有符合条件的项目' : '登录后查看并管理你的项目'" />
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.project-gallery-page { --ink:#3d3564; --purple:#8178cf; --pink:#ee91bb; --mint:#9de4eb; --yellow:#fff1a8; min-height:calc(100vh - 64px); padding:28px clamp(18px,4vw,64px) 60px; background-color:#fbfbff; background-image:linear-gradient(90deg,rgb(129 120 207 / 5%) 1px,transparent 1px),linear-gradient(rgb(238 145 187 / 5%) 1px,transparent 1px); background-size:32px 32px; color:var(--ink); }
.gallery-header { display:flex; align-items:center; gap:13px; max-width:1500px; margin:0 auto 25px; }.back-button { display:grid; width:42px; height:42px; place-items:center; border:1px solid var(--ink); border-radius:5px; background:var(--yellow); color:var(--ink); box-shadow:2px 3px 0 rgb(61 53 100 / 24%); cursor:pointer; }.gallery-header p { margin:0; color:#746895; font-family:'Trebuchet MS',sans-serif; font-size:11px; font-weight:900; letter-spacing:1px; }.gallery-header h1 { margin:3px 0 0; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:28px; font-weight:900; }.create-button { margin-left:auto; border:1px solid #4e4473!important; border-radius:5px!important; background:var(--purple)!important; box-shadow:3px 4px 0 rgb(61 53 100 / 28%); color:#fff!important; font-weight:800; }
.gallery-layout { display:grid; grid-template-columns:235px minmax(0,1fr); gap:32px; max-width:1500px; margin:0 auto; }.filter-sidebar { display:grid; align-content:start; gap:25px; }.filter-sidebar h2 { margin:0 0 10px; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:17px; font-weight:900; }.filter-sidebar section { display:grid; gap:7px; }.filter-sidebar section button { display:flex; align-items:center; justify-content:space-between; padding:11px 13px; border:1px solid transparent; border-radius:5px; background:rgb(255 255 255 / 72%); color:#625878; font-size:14px; font-weight:750; text-align:left; cursor:pointer; }.filter-sidebar section button.active { border-color:rgb(61 53 100 / 30%); background:#e9e5ff; color:var(--ink); box-shadow:2px 3px 0 rgb(61 53 100 / 12%); }.filter-sidebar section button span { color:var(--purple); font-size:22px; line-height:.7; }.tip-card { padding:15px; border:2px solid var(--ink); border-radius:7px; background:linear-gradient(135deg,#fff1a8,#f9ddec); box-shadow:4px 5px 0 rgb(61 53 100 / 26%); }.tip-card strong { font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:17px; font-weight:900; }.tip-card p { margin:8px 0 13px; color:#625878; font-size:13px; line-height:1.6; }.tip-card button { border:1px solid var(--ink); border-radius:4px; background:#fff; color:var(--ink); font-weight:800; cursor:pointer; padding:7px 10px; box-shadow:2px 2px 0 rgb(61 53 100 / 18%); }
.gallery-content { min-width:0; }.gallery-toolbar { display:flex; align-items:center; gap:14px; margin-bottom:18px; }.gallery-toolbar :deep(.el-input) { max-width:570px; }.gallery-toolbar :deep(.el-input__wrapper) { min-height:40px; border:1px solid var(--ink); box-shadow:2px 3px 0 rgb(61 53 100 / 17%); }.gallery-toolbar span { color:#756a94; font-size:13px; font-weight:800; white-space:nowrap; }.project-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }.project-card { --soft:#efeaff; min-width:0; padding:18px; border:2px solid var(--ink); border-radius:8px; background:linear-gradient(145deg,#fff 0%,var(--soft) 175%); box-shadow:4px 5px 0 rgb(61 53 100 / 31%); }.tone-1 { --soft:#e4faf9; }.tone-2 { --soft:#fff7d6; }.tone-3 { --soft:#ffedf4; }.card-head,.card-head div,footer,footer > span,footer div { display:flex; align-items:center; }.card-head { justify-content:space-between; gap:10px; }.card-head div { gap:7px; color:#8178cf; }.project-badge { padding:4px 6px; border:1px solid var(--ink); border-radius:3px; background:var(--yellow); font-size:10px; font-weight:900; transform:rotate(-2deg); }.stat { font-size:11px; font-weight:800; }.project-card h2 { margin:16px 0 0; overflow:hidden; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:20px; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }.project-card > p { display:-webkit-box; min-height:44px; overflow:hidden; margin:9px 0 0; color:#625878; font-size:13px; line-height:1.7; -webkit-box-orient:vertical; -webkit-line-clamp:2; }.tag-row { display:flex; min-height:25px; flex-wrap:wrap; gap:5px; margin-top:13px; }.tag-row span { padding:3px 6px; border:1px solid rgb(61 53 100 / 25%); border-radius:3px; background:#fff; color:#746895; font-size:10px; font-weight:800; }footer { justify-content:space-between; gap:7px; margin-top:16px; padding-top:11px; border-top:1px solid rgb(61 53 100 / 25%); color:#675c85; font-size:11px; }footer > span { gap:4px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }footer div { margin-left:auto; gap:5px; }footer button { padding:5px 7px; border:1px solid var(--ink); border-radius:3px; background:#fff; color:var(--ink); font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; }footer button:last-child { background:var(--purple); color:#fff; }
@media (max-width:900px) { .gallery-layout { grid-template-columns:1fr; }.filter-sidebar { grid-template-columns:repeat(3,minmax(0,1fr)); align-items:start; }.tip-card { display:none; }.project-grid { grid-template-columns:1fr; } }
@media (max-width:640px) { .project-gallery-page { padding:20px 16px 45px; }.gallery-header h1 { font-size:23px; }.create-button { padding:8px 9px!important; }.filter-sidebar { grid-template-columns:1fr 1fr; gap:14px; }.filter-sidebar section:last-of-type { display:none; }.gallery-toolbar { align-items:stretch; flex-direction:column; }.gallery-toolbar :deep(.el-input) { max-width:none; }.project-card { padding:15px; }footer { flex-wrap:wrap; }footer div { width:100%; margin-left:0; }footer button { flex:1; } }
</style>
