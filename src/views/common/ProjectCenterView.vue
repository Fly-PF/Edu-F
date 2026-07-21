<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Collection, FolderAdd, Search, Share, UserFilled } from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'
import { listBlockGallery, listMyBlockProjects, remixBlockProject } from '@/api/blockProject'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const keyword = ref('')
const scope = ref('all')
const type = ref('all')
const loading = ref(false)
const blockProjects = ref([])
const pythonProjects = ref([])

const typeOptions = [
  { id: 'all', label: '全部项目' },
  { id: 'blocks', label: '积木工坊' },
  { id: 'python', label: 'Python 工坊' },
  { id: 'ai', label: 'AI 工坊' },
]

const projects = computed(() => {
  const blocks = blockProjects.value.map((project) => ({ ...project, type: 'blocks', typeLabel: '积木创作' }))
  const python = pythonProjects.value.map((project) => ({ ...project, type: 'python', typeLabel: 'Python 创作', ownerName: '我的作品' }))
  return [...blocks, ...python]
})

const filteredProjects = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return projects.value.filter((project) => {
    const matchesType = type.value === 'all' || project.type === type.value
    const searchable = [project.title, project.description, project.ownerName].filter(Boolean).join(' ').toLowerCase()
    return matchesType && (!query || searchable.includes(query))
  })
})

function loadPythonProjects() {
  try {
    const saved = JSON.parse(localStorage.getItem('edu-python-projects') || '[]')
    pythonProjects.value = Array.isArray(saved) ? saved : []
  } catch {
    pythonProjects.value = []
  }
}

async function loadBlockProjects() {
  if (!userStore.isLoggedIn) {
    blockProjects.value = []
    return
  }

  loading.value = true
  try {
    blockProjects.value = scope.value === 'mine'
      ? (await listMyBlockProjects() || [])
      : (await listBlockGallery() || [])
  } catch (error) {
    blockProjects.value = []
    ElMessage.error(error?.message || '项目加载失败')
  } finally {
    loading.value = false
  }
}

async function refreshProjects() {
  loadPythonProjects()
  await loadBlockProjects()
}

function selectScope(value) {
  scope.value = value
  refreshProjects()
}

function selectType(value) {
  type.value = value
  router.replace({ query: value === 'all' ? {} : { type: value } })
}

function createProject() {
  if (type.value === 'python') router.push('/tools/python')
  else if (type.value === 'ai') router.push('/tools/ai')
  else router.push('/tools/blocks')
}

function openProject(project) {
  if (project.type === 'blocks') {
    router.push({ path: '/tools/blocks', query: { projectId: project.id } })
    return
  }
  if (project.type === 'python') {
    router.push('/tools/python')
    return
  }
  router.push('/tools/ai')
}

async function remixProject(project) {
  if (project.type !== 'blocks') {
    openProject(project)
    return
  }
  try {
    const copy = await remixBlockProject(project.id)
    router.push({ path: '/tools/blocks', query: { projectId: copy.id } })
  } catch (error) {
    ElMessage.error(error?.message || '复制创作失败')
  }
}

function emptyText() {
  if (type.value === 'ai') return 'AI 工坊作品正在准备中，先去动手创建一个吧'
  if (!userStore.isLoggedIn && type.value !== 'python') return '登录后即可查看、保存和发布积木作品'
  return '还没有符合条件的项目，开始一个新作品吧'
}

watch(() => route.query.type, (value) => {
  type.value = typeOptions.some((item) => item.id === value) ? value : 'all'
}, { immediate: true })

onMounted(refreshProjects)
</script>

<template>
  <main class="project-center-page">
    <section class="project-hero">
      <div>
        <span class="hero-sticker">MY MAKER SPACE</span>
        <h1>项目中心</h1>
        <p>把积木、代码和 AI 创意都收进你的作品集。</p>
        <button class="create-button" type="button" @click="createProject"><el-icon><FolderAdd /></el-icon>新建项目</button>
      </div>
      <div class="hero-decoration" aria-hidden="true">
        <span class="orbit orbit-one"></span><span class="orbit orbit-two"></span><span class="core"></span><span class="mini-card card-one">MAKE</span><span class="mini-card card-two">IDEA</span>
      </div>
    </section>

    <section class="project-layout">
      <aside class="filter-sidebar" aria-label="项目筛选">
        <section>
          <h2>快速查看</h2>
          <button :class="{ active: scope === 'all' }" type="button" @click="selectScope('all')">全部作品 <span>+</span></button>
          <button :class="{ active: scope === 'mine' }" type="button" @click="selectScope('mine')">我的项目 <span>+</span></button>
        </section>
        <section>
          <h2>创作工坊</h2>
          <button v-for="item in typeOptions" :key="item.id" :class="{ active: type === item.id }" type="button" @click="selectType(item.id)">{{ item.label }} <span>+</span></button>
        </section>
        <div class="tip-card"><strong>动手试一试</strong><p>每一个点子，都可以从第一块积木、第一行代码开始。</p><button type="button" @click="createProject">开始创作</button></div>
      </aside>

      <section class="project-content" aria-label="项目列表">
        <div class="project-toolbar">
          <el-input v-model="keyword" placeholder="搜索项目、作者或创意" clearable><template #prefix><el-icon><Search /></el-icon></template></el-input>
          <button class="refresh-button" type="button" @click="refreshProjects">刷新</button>
          <span>{{ filteredProjects.length }} 个项目</span>
        </div>
        <div v-loading="loading" class="project-grid">
          <article v-for="(project, index) in filteredProjects" :key="`${project.type}-${project.id}`" class="project-card" :class="[`tone-${index % 4}`, project.type]">
            <div class="card-head"><span class="project-badge">{{ project.typeLabel }}</span><span class="card-icon">{{ project.type === 'blocks' ? '▦' : 'Py' }}</span></div>
            <h2>{{ project.title }}</h2><p>{{ project.description || '这是一个正在成长的创意项目，打开看看它会带来什么惊喜。' }}</p>
            <div class="tag-row"><span>{{ project.type === 'blocks' ? '互动舞台' : '代码实验' }}</span><span v-if="project.published">公开作品</span><span v-if="project.sourceProjectId">复制创作</span></div>
            <footer><span><el-icon><UserFilled /></el-icon>{{ project.ownerName || '创作者' }}</span><span v-if="project.type === 'blocks'"><el-icon><Collection /></el-icon>{{ project.remixCount || 0 }} 次复制</span><div><button type="button" @click="openProject(project)">打开</button><button v-if="project.type === 'blocks' && scope === 'all'" type="button" @click="remixProject(project)">复制创作</button></div></footer>
          </article>
          <div v-if="!loading && !filteredProjects.length" class="empty-state">
            <el-empty :image-size="86" :description="emptyText()"><template #default><button class="empty-create" type="button" @click="createProject">开始探索</button></template></el-empty>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped>
.project-center-page { --ink:#3d3564; --purple:#8178cf; --pink:#ee91bb; --mint:#9de4eb; --yellow:#fff1a8; min-height:calc(100vh - 64px); padding:clamp(20px,4vw,58px) clamp(16px,5vw,80px) 64px; background-color:#fbfbff; background-image:linear-gradient(90deg,rgb(129 120 207 / 5%) 1px,transparent 1px),linear-gradient(rgb(238 145 187 / 5%) 1px,transparent 1px); background-size:32px 32px; color:var(--ink); font-family:'Microsoft YaHei',Arial,sans-serif; }
.project-hero { position:relative; display:flex; min-height:244px; max-width:1560px; margin:0 auto 36px; overflow:hidden; padding:clamp(28px,4vw,46px); border:2px solid var(--ink); border-radius:9px; background:linear-gradient(118deg,#e8e4ff 0%,#f9ddec 46%,#d3f2f2 100%); box-shadow:7px 8px 0 rgb(61 53 100 / 45%); }.project-hero > div:first-child { position:relative; z-index:2; }.hero-sticker,.project-badge { display:inline-block; padding:5px 8px; border:1px solid var(--ink); border-radius:4px; background:var(--yellow); box-shadow:2px 3px 0 rgb(61 53 100 / 20%); font-family:'Trebuchet MS',sans-serif; font-size:10px; font-weight:900; transform:rotate(-3deg); }.project-hero h1 { margin:12px 0 0; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:clamp(38px,5vw,58px); font-weight:900; line-height:1.05; }.project-hero p { max-width:500px; margin:12px 0 0; color:#5f567b; font-size:16px; line-height:1.7; }.create-button,.empty-create { display:inline-flex; align-items:center; justify-content:center; gap:7px; margin-top:21px; padding:10px 14px; border:1px solid #4e4473; border-radius:5px; background:var(--purple); box-shadow:3px 4px 0 rgb(61 53 100 / 28%); color:#fff; font-weight:900; white-space:nowrap; cursor:pointer; }.create-button:hover,.empty-create:hover { transform:translate(-2px,-2px); box-shadow:5px 6px 0 rgb(61 53 100 / 28%); }.hero-decoration { position:absolute; right:2%; bottom:-60px; width:390px; height:300px; opacity:.9; }.orbit { position:absolute; border:2px dashed rgb(61 53 100 / 42%); border-radius:50%; animation:orbit 14s linear infinite; }.orbit-one { width:275px; height:180px; top:47px; left:48px; transform:rotate(-22deg); }.orbit-two { width:180px; height:265px; top:0; left:98px; border-color:rgb(238 145 187 / 65%); transform:rotate(28deg); animation-duration:18s; animation-direction:reverse; }.core { position:absolute; top:111px; left:159px; width:62px; height:62px; border:2px solid var(--ink); border-radius:50%; background:var(--mint); box-shadow:4px 5px 0 rgb(61 53 100 / 25%); }.mini-card { position:absolute; padding:8px; border:1px solid var(--ink); border-radius:4px; background:#fff; box-shadow:3px 4px 0 rgb(61 53 100 / 23%); font-family:'Trebuchet MS',sans-serif; font-size:11px; font-weight:900; }.card-one { top:32px; right:8px; transform:rotate(8deg); }.card-two { bottom:84px; left:8px; background:var(--yellow); transform:rotate(-8deg); }
.project-layout { display:grid; grid-template-columns:235px minmax(0,1fr); gap:32px; max-width:1560px; margin:auto; }.filter-sidebar { display:grid; align-content:start; gap:25px; }.filter-sidebar h2 { margin:0 0 10px; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:17px; font-weight:900; }.filter-sidebar section { display:grid; gap:7px; }.filter-sidebar section button { display:flex; align-items:center; justify-content:space-between; padding:11px 13px; border:1px solid transparent; border-radius:5px; background:rgb(255 255 255 / 74%); color:#625878; font-size:14px; font-weight:800; text-align:left; cursor:pointer; white-space:nowrap; }.filter-sidebar section button.active { border-color:rgb(61 53 100 / 30%); background:#e9e5ff; color:var(--ink); box-shadow:2px 3px 0 rgb(61 53 100 / 12%); }.filter-sidebar section button span { color:var(--purple); font-size:20px; }.tip-card { padding:15px; border:2px solid var(--ink); border-radius:7px; background:linear-gradient(135deg,#fff1a8,#f9ddec); box-shadow:4px 5px 0 rgb(61 53 100 / 26%); }.tip-card strong { font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:17px; font-weight:900; }.tip-card p { margin:8px 0 13px; color:#625878; font-size:13px; line-height:1.6; }.tip-card button,.refresh-button { padding:7px 10px; border:1px solid var(--ink); border-radius:4px; background:#fff; box-shadow:2px 2px 0 rgb(61 53 100 / 18%); color:var(--ink); font-weight:800; white-space:nowrap; cursor:pointer; }
.project-content { min-width:0; }.project-toolbar { display:flex; align-items:center; gap:12px; margin-bottom:18px; }.project-toolbar :deep(.el-input) { max-width:570px; }.project-toolbar :deep(.el-input__wrapper) { min-height:40px; border:1px solid var(--ink); box-shadow:2px 3px 0 rgb(61 53 100 / 17%); }.project-toolbar > span { color:#756a94; font-size:13px; font-weight:800; white-space:nowrap; }.project-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18px; }.empty-state { display:grid; min-height:390px; grid-column:1 / -1; place-items:center; }.project-card { --soft:#efeaff; min-width:0; padding:18px; border:2px solid var(--ink); border-radius:8px; background:linear-gradient(145deg,#fff 0%,var(--soft) 175%); box-shadow:4px 5px 0 rgb(61 53 100 / 31%); }.tone-1 { --soft:#e4faf9; }.tone-2 { --soft:#fff7d6; }.tone-3 { --soft:#ffedf4; }.card-head,footer,footer > span,footer div { display:flex; align-items:center; }.card-head { justify-content:space-between; gap:10px; }.card-icon { display:grid; width:30px; height:30px; place-items:center; border:1px solid var(--ink); border-radius:5px; background:#fff; color:var(--purple); font-family:'Trebuchet MS',sans-serif; font-weight:900; }.project-card h2 { margin:16px 0 0; overflow:hidden; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:20px; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }.project-card > p { display:-webkit-box; min-height:44px; overflow:hidden; margin:9px 0 0; color:#625878; font-size:13px; line-height:1.7; -webkit-box-orient:vertical; -webkit-line-clamp:2; }.tag-row { display:flex; min-height:25px; flex-wrap:wrap; gap:5px; margin-top:13px; }.tag-row span { padding:3px 6px; border:1px solid rgb(61 53 100 / 25%); border-radius:3px; background:#fff; color:#746895; font-size:10px; font-weight:800; }footer { justify-content:space-between; gap:7px; margin-top:16px; padding-top:11px; border-top:1px solid rgb(61 53 100 / 25%); color:#675c85; font-size:11px; }footer > span { gap:4px; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }footer div { margin-left:auto; gap:5px; }footer button { padding:5px 7px; border:1px solid var(--ink); border-radius:3px; background:#fff; color:var(--ink); font-size:11px; font-weight:800; cursor:pointer; white-space:nowrap; }footer button:last-child { background:var(--purple); color:#fff; }
@keyframes orbit { to { transform:rotate(338deg); } }
@media (max-width:900px) { .project-layout { grid-template-columns:1fr; }.filter-sidebar { grid-template-columns:repeat(3,minmax(0,1fr)); align-items:start; }.tip-card { display:none; }.project-grid { grid-template-columns:1fr; } }
@media (max-width:640px) { .project-center-page { padding:20px 16px 45px; }.project-hero { min-height:260px; padding:29px 23px; }.project-hero h1 { font-size:40px; }.project-hero p { max-width:250px; font-size:14px; }.hero-decoration { right:-120px; bottom:-73px; transform:scale(.7); transform-origin:bottom right; opacity:.55; }.filter-sidebar { grid-template-columns:1fr 1fr; gap:14px; }.filter-sidebar section:last-of-type { grid-column:1 / -1; grid-template-columns:1fr 1fr; }.filter-sidebar section:last-of-type h2 { grid-column:1 / -1; }.project-toolbar { align-items:stretch; flex-wrap:wrap; }.project-toolbar :deep(.el-input) { max-width:none; flex-basis:100%; }.project-card { padding:15px; }footer { flex-wrap:wrap; }footer div { width:100%; margin-left:0; }footer button { flex:1; } }
@media (prefers-reduced-motion:reduce) { *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; } }
</style>
