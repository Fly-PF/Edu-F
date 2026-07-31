<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Clock, DocumentChecked, EditPen, RefreshRight } from '@element-plus/icons-vue'
import { listStudentPractices } from '@/api/learningPractice'

const router = useRouter()
const loading = ref(false)
const practices = ref([])

const summary = computed(() => ({
  total: practices.value.length,
  finished: practices.value.filter((item) => item.status === 'REVIEWED').length,
  pending: practices.value.filter((item) => item.status === 'SUBMITTED').length,
}))

function statusText(status) {
  return {
    NOT_STARTED: '待完成',
    SUBMITTED: '待批改',
    REVIEWED: '已反馈',
  }[status] || '待完成'
}

function statusType(status) {
  return { NOT_STARTED: 'info', SUBMITTED: 'warning', REVIEWED: 'success' }[status] || 'info'
}

async function loadPractices() {
  loading.value = true
  try {
    practices.value = (await listStudentPractices()) || []
  } catch (error) {
    ElMessage.error(error?.message || '学习练习加载失败')
  } finally {
    loading.value = false
  }
}

function openPractice(item) {
  router.push({ name: 'student-practice-take', params: { practiceId: item.id } })
}

onMounted(loadPractices)
</script>

<template>
  <main class="practice-center">
    <header class="practice-hero">
      <div>
        <p class="eyebrow">LEARNING PRACTICE</p>
        <h1>学习练习</h1>
        <p>跟随课程完成练习，提交你的思考，等待老师给出具体反馈。</p>
      </div>
      <el-button circle aria-label="刷新练习" :loading="loading" @click="loadPractices">
        <el-icon><RefreshRight /></el-icon>
      </el-button>
    </header>

    <section class="practice-stats" aria-label="练习统计">
      <div><el-icon><EditPen /></el-icon><span>可完成练习</span><strong>{{ summary.total }}</strong></div>
      <div><el-icon><Clock /></el-icon><span>等待批改</span><strong>{{ summary.pending }}</strong></div>
      <div><el-icon><DocumentChecked /></el-icon><span>已获得反馈</span><strong>{{ summary.finished }}</strong></div>
    </section>

    <section v-loading="loading" class="practice-grid">
      <article v-for="item in practices" :key="item.id" class="practice-card">
        <div class="practice-card-top">
          <span class="course-label">{{ item.courseName }}</span>
          <el-tag :type="statusType(item.status)" effect="plain">{{ statusText(item.status) }}</el-tag>
        </div>
        <h2>{{ item.title }}</h2>
        <p>{{ item.intro }}</p>
        <div class="practice-meta">
          <span>{{ item.questionCount }} 道题</span>
          <span>满分 {{ item.totalScore }} 分</span>
          <span v-if="item.score !== null && item.score !== undefined">当前得分 {{ item.score }} 分</span>
        </div>
        <footer>
          <small v-if="item.status === 'SUBMITTED'">已提交，等待老师批改</small>
          <small v-else-if="item.status === 'REVIEWED'">老师已给出反馈，可查看答案解析</small>
          <small v-else>建议学习完课程资料后再开始</small>
          <el-button type="primary" @click="openPractice(item)">
            {{ item.status === 'NOT_STARTED' ? '开始练习' : '查看练习' }}
          </el-button>
        </footer>
      </article>
    </section>

    <el-empty v-if="!loading && practices.length === 0" description="暂时没有可完成的学习练习" />
  </main>
</template>

<style scoped>
:global(:root) { --explore-ink: #3d3564; --explore-purple: #8178cf; --explore-pink: #ee91bb; --explore-mint: #52bbc4; --explore-yellow: #fff1a8; --explore-paper: #fbfbff; }
.practice-center { min-height: 100%; padding: 36px clamp(18px, 5vw, 80px) 56px; background-color: var(--explore-paper); background-image: linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px), linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px); background-size: 32px 32px; color: var(--explore-ink); }
.practice-hero { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; max-width: 1560px; margin: 0 auto 28px; padding: clamp(24px, 4vw, 44px); overflow: hidden; border: 1px solid var(--explore-ink); border-radius: 8px; background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 52%, #d3f2f2 100%); box-shadow: 7px 8px 0 rgb(61 53 100 / 25%); }
.practice-hero::before, .practice-hero::after { position: absolute; border: 1px dashed rgb(61 53 100 / 32%); border-radius: 50%; content: ''; pointer-events: none; }
.practice-hero::before { top: -80px; right: 6%; width: 220px; height: 140px; transform: rotate(-14deg); }
.practice-hero::after { right: 12%; bottom: -72px; width: 230px; height: 140px; border-color: rgb(82 187 196 / 55%); transform: rotate(18deg); }
.practice-hero > div, .practice-hero > button { position: relative; z-index: 1; }
.eyebrow { margin: 0 0 8px; color: #63598a; font-size: 11px; font-weight: 800; letter-spacing: 0; }
h1 { margin: 0; color: var(--explore-ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-size: clamp(34px, 4vw, 52px); font-weight: 900; }
.practice-hero p:last-child { max-width: 620px; margin: 12px 0 0; color: #5e577d; font-size: 15px; line-height: 1.75; }
.practice-hero > .el-button { flex: 0 0 auto; border: 1px solid #4e4473; border-radius: 5px; background: #fff; color: var(--explore-ink); box-shadow: 3px 4px 0 rgb(61 53 100 / 28%); }
.practice-hero > .el-button:hover { border-color: #4e4473; color: var(--explore-ink); transform: translate(-2px, -2px); box-shadow: 5px 6px 0 rgb(61 53 100 / 28%); }
.practice-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 980px; margin: 0 auto 30px; overflow: hidden; border: 1px solid var(--explore-ink); border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 14%); }
.practice-stats div { display: grid; grid-template-columns: auto 1fr; gap: 2px 11px; align-items: center; padding: 18px 22px; border-right: 1px solid rgb(61 53 100 / 12%); }
.practice-stats div:last-child { border-right: 0; }
.practice-stats .el-icon { grid-row: span 2; color: var(--explore-purple); font-size: 23px; }
.practice-stats div:nth-child(2) .el-icon { color: #c8799e; }
.practice-stats div:nth-child(3) .el-icon { color: var(--explore-mint); }
.practice-stats span { color: #756d91; font-size: 12px; }
.practice-stats strong { color: var(--explore-ink); font-size: 24px; font-weight: 900; }
.practice-grid { display: grid; max-width: 1560px; min-height: 200px; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; margin: 0 auto; }
.practice-card { position: relative; display: flex; min-height: 285px; flex-direction: column; padding: 23px; border: 1px solid var(--explore-ink); border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 14%); }
.practice-card:nth-child(4n + 1) { background: #fffdf0; }
.practice-card:nth-child(4n + 2) { background: #f8f5ff; }
.practice-card:nth-child(4n + 3) { background: #effcfc; }
.practice-card:nth-child(4n + 4) { background: #fff2f8; }
.practice-card::after { position: absolute; top: -7px; right: 18px; width: 42px; height: 14px; border: 1px solid rgb(61 53 100 / 22%); background: var(--explore-yellow); content: ''; opacity: 0.8; transform: rotate(3deg); }
.practice-card-top, footer, .practice-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.course-label { max-width: 70%; overflow: hidden; color: var(--explore-ink); font-size: 13px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.practice-card :deep(.el-tag) { border-color: rgb(61 53 100 / 22%); color: var(--explore-ink); }
.practice-card h2 { margin: 22px 0 9px; color: var(--explore-ink); font-size: 20px; font-weight: 900; line-height: 1.4; }
.practice-card > p { flex: 1; margin: 0; color: #665f80; font-size: 14px; line-height: 1.75; }
.practice-meta { justify-content: flex-start; flex-wrap: wrap; margin: 22px 0 17px; color: #655d7e; font-size: 12px; }
.practice-meta span { padding: 5px 8px; border: 1px solid rgb(61 53 100 / 12%); border-radius: 4px; background: rgb(255 255 255 / 72%); }
footer { padding-top: 15px; border-top: 1px dashed rgb(61 53 100 / 20%); }
footer small { max-width: 58%; color: #756d91; line-height: 1.5; }
.practice-card :deep(.el-button) { white-space: nowrap; word-break: keep-all; border: 1px solid #4e4473; border-radius: 5px; background: var(--explore-purple); box-shadow: 3px 4px 0 rgb(61 53 100 / 25%); font-weight: 800; }
.practice-card :deep(.el-button:hover) { background: #7369c2; transform: translate(-2px, -2px); box-shadow: 5px 6px 0 rgb(61 53 100 / 25%); }
.practice-center :deep(.el-empty) { max-width: 720px; margin: 34px auto; border: 1px solid var(--explore-ink); border-radius: 8px; background: #fff; box-shadow: 4px 5px 0 rgb(61 53 100 / 12%); }
@media (max-width: 1050px) { .practice-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 720px) { .practice-center { padding: 24px 16px 36px; } .practice-hero { padding: 24px 20px 28px; } .practice-hero::before, .practice-hero::after { right: -50px; opacity: 0.55; } .practice-stats, .practice-grid { grid-template-columns: 1fr; } .practice-stats div { border-right: 0; border-bottom: 1px solid rgb(61 53 100 / 12%); } .practice-stats div:last-child { border-bottom: 0; } }
@media (prefers-reduced-motion: reduce) { .practice-center *, .practice-center *::before, .practice-center *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
</style>
