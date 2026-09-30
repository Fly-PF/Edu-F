<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { List, Plus, Search } from '@element-plus/icons-vue'
import { listProblemCategories, listProblems, listProblemSubjects } from '@/api/problemSolving'
import { useUserStore } from '@/stores/user'
import ProblemAuthoringManage from './ProblemAuthoringManage.vue'

const router = useRouter()
const userStore = useUserStore()
const isTeacher = computed(() => userStore.roleCode === 'TEACHER')
const authoringVisible = ref(false)
const subject = ref('')
const category = ref('')
const difficulty = ref('')
const keyword = ref('')
const page = ref(1)
const pageSize = 6
const subjects = ref([])
const categories = ref([])
const problems = ref([])
const total = ref(0)
const loading = ref(false)

function resetPage() { page.value = 1 }
async function loadProblems() {
  loading.value = true
  try {
    const result = await listProblems({ subjectId: subject.value || undefined, categoryId: category.value || undefined, difficulty: difficulty.value || undefined, keyword: keyword.value.trim() || undefined, pageNum: page.value, pageSize })
    problems.value = result.records || []
    total.value = result.total || 0
  } finally { loading.value = false }
}
async function changeSubject() {
  category.value = ''
  resetPage()
  categories.value = await listProblemCategories(subject.value || undefined)
  await loadProblems()
}
async function changeFilters() { resetPage(); await loadProblems() }
async function changePage() { await loadProblems() }
function openProblem(problem) { router.push({ name: 'problem-solving-detail', params: { problemId: problem.id } }) }
function refreshProblems() { loadProblems() }
function openProblemManage() { router.push({ name: 'teacher-problem-solving-manage' }) }

onMounted(async () => {
  subjects.value = await listProblemSubjects()
  categories.value = await listProblemCategories()
  await loadProblems()
})
</script>

<template>
  <main class="problem-catalog">
    <header class="catalog-hero">
      <div>
        <p>PROBLEM SOLVING</p>
        <h1>讲题</h1>
        <span>把图形、推导和结论放在同一个可回放的学习过程里。</span>
      </div>
      <div class="hero-actions">
        <div class="hero-note"><strong>互动讲题</strong><span>围绕题目逐步讲解与追问</span></div>
        <div v-if="isTeacher" class="authoring-actions">
          <el-button type="primary" :icon="Plus" @click="authoringVisible = true">新增题目</el-button>
          <el-button type="primary" :icon="List" @click="openProblemManage">题目管理</el-button>
        </div>
      </div>
    </header>

    <section class="filter-panel" aria-label="题目筛选">
      <el-select v-model="subject" placeholder="全部科目" clearable @change="changeSubject"><el-option v-for="item in subjects" :key="item.id" :label="item.name" :value="item.id" /></el-select>
      <el-select v-model="category" placeholder="全部题型" clearable @change="changeFilters"><el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" /></el-select>
      <el-select v-model="difficulty" placeholder="全部难度" clearable @change="changeFilters"><el-option label="基础" value="基础" /><el-option label="中等" value="中等" /><el-option label="困难" value="困难" /></el-select>
      <el-input v-model="keyword" class="keyword-input" placeholder="搜索题目、标签或知识点" clearable @change="changeFilters"><template #prefix><el-icon><Search /></el-icon></template></el-input>
    </section>

    <div class="result-bar"><span>共 {{ total }} 道讲题</span><span>选择一道题，进入互动推导</span></div>
    <section v-loading="loading" class="problem-grid">
      <article v-for="problem in problems" :key="problem.id" class="problem-card">
        <div class="card-top"><span>{{ problem.subject }} · {{ problem.category }}</span><el-tag effect="plain">{{ problem.mastery }}</el-tag></div>
        <h2>{{ problem.title }}</h2><p>{{ problem.intro }}</p>
        <div class="tag-row"><el-tag v-for="tag in problem.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag></div>
        <footer><span>{{ problem.difficulty }} · v{{ problem.version }}</span><el-button type="primary" @click="openProblem(problem)">开始讲题</el-button></footer>
      </article>
    </section>
    <el-empty v-if="!loading && !problems.length" description="没有匹配的讲题，请调整筛选条件" />
    <el-pagination v-if="total > pageSize" v-model:current-page="page" class="pagination" background layout="prev, pager, next" :total="total" :page-size="pageSize" @current-change="changePage" />

    <el-drawer v-if="isTeacher" v-model="authoringVisible" title="新增题目" size="min(960px, 94vw)" destroy-on-close @closed="refreshProblems">
      <ProblemAuthoringManage />
    </el-drawer>
  </main>
</template>

<style scoped>
:global(:root) { --solve-ink: #3d3564; --solve-purple: #7566bb; --solve-pink: #e15b91; --solve-mint: #52aab4; --solve-paper: #fbfbff; }
.problem-catalog { min-height: 100%; padding: 34px clamp(18px, 5vw, 80px) 56px; background: var(--solve-paper); color: var(--solve-ink); }.catalog-hero { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; max-width: 1280px; margin: 0 auto 24px; padding: 34px 38px; border: 1px solid var(--solve-ink); border-radius: 8px; background: #e8e4ff; box-shadow: 7px 8px 0 rgb(61 53 100 / 20%); }.catalog-hero p { margin: 0 0 8px; color: #645a91; font-size: 11px; font-weight: 800; letter-spacing: 0; }.catalog-hero h1 { margin: 0; font-size: 44px; line-height: 1; }.catalog-hero span { display: block; margin-top: 12px; color: #5e577d; font-size: 15px; }.hero-actions { display: flex; align-items: center; gap: 12px; }.authoring-actions { display: grid; gap: 8px; }.authoring-actions :deep(.el-button) { width: 128px; height: 36px; margin: 0; }.hero-note { display: grid; flex: 0 0 auto; gap: 6px; padding: 14px 18px; border: 1px solid #3d3564; border-radius: 6px; background: #fff; }.hero-note strong { color: var(--solve-pink); font-size: 18px; }.hero-note span { margin: 0; font-size: 12px; }.filter-panel { display: grid; max-width: 1280px; grid-template-columns: repeat(3, minmax(130px, 180px)) minmax(220px, 1fr); gap: 12px; margin: 0 auto; padding: 15px; border: 1px solid #d9d3e5; border-radius: 8px; background: #fff; }.filter-panel :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px #cfc8de inset; }.filter-panel :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px var(--solve-purple) inset; }.result-bar { display: flex; justify-content: space-between; gap: 16px; max-width: 1280px; margin: 24px auto 14px; color: #6b6482; font-size: 13px; }.result-bar span:first-child { color: var(--solve-ink); font-weight: 800; }.problem-grid { display: grid; max-width: 1280px; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; margin: 0 auto; }.problem-card { display: flex; min-height: 272px; flex-direction: column; padding: 22px; border: 1px solid #3d3564; border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 13%); }.problem-card:nth-child(3n + 2) { background: #f5fcfc; }.problem-card:nth-child(3n + 3) { background: #fff8fb; }.card-top, footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.card-top > span { color: #655b91; font-size: 12px; font-weight: 800; }.card-top :deep(.el-tag) { border-color: #a5d1d3; background: #effafa; color: #28747b; }.problem-card h2 { margin: 22px 0 9px; font-size: 20px; line-height: 1.4; }.problem-card p { flex: 1; margin: 0; color: #655e7d; font-size: 14px; line-height: 1.75; }.tag-row { display: flex; flex-wrap: wrap; gap: 7px; margin: 20px 0; }.tag-row :deep(.el-tag) { border-color: #d9d3e5; background: rgb(255 255 255 / 65%); color: #5d5579; }.problem-card footer { padding-top: 15px; border-top: 1px dashed #cfc8dc; color: #776f91; font-size: 12px; }.problem-card :deep(.el-button) { border-radius: 5px; font-weight: 800; }.pagination { display: flex; justify-content: center; margin-top: 28px; }
@media (max-width: 900px) { .filter-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); }.keyword-input { grid-column: span 2; }.problem-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }@media (max-width: 620px) { .problem-catalog { padding: 22px 16px 36px; }.catalog-hero { align-items: flex-start; flex-direction: column; padding: 28px 22px; }.catalog-hero h1 { font-size: 36px; }.hero-actions { width: 100%; align-items: stretch; flex-direction: column; }.authoring-actions { width: 100%; }.hero-note { width: auto; }.hero-actions :deep(.el-button) { width: 100%; }.filter-panel, .problem-grid { grid-template-columns: 1fr; }.keyword-input { grid-column: auto; }.result-bar { flex-direction: column; gap: 5px; }.problem-card { min-height: 250px; } }
</style>
