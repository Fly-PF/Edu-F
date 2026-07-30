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
.practice-center { min-height: 100%; padding: 34px clamp(18px, 5vw, 72px) 52px; background: #f5f7fb; color: #182038; }
.practice-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.eyebrow { margin: 0 0 7px; color: #6651d9; font-size: 11px; font-weight: 700; }
h1 { margin: 0; font-size: 30px; } .practice-hero p:last-child { margin: 9px 0 0; color: #728097; font-size: 14px; }
.practice-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); max-width: 820px; margin: 28px 0; overflow: hidden; border: 1px solid #e3e8f1; border-radius: 8px; background: #fff; }
.practice-stats div { display: grid; grid-template-columns: auto 1fr; gap: 2px 10px; align-items: center; padding: 17px 20px; border-right: 1px solid #edf0f5; } .practice-stats div:last-child { border-right: 0; }
.practice-stats .el-icon { grid-row: span 2; color: #6854dc; font-size: 21px; } .practice-stats span { color: #748198; font-size: 12px; } .practice-stats strong { font-size: 21px; }
.practice-grid { display: grid; min-height: 200px; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.practice-card { display: flex; min-height: 260px; flex-direction: column; padding: 23px; border: 1px solid #e2e7ef; border-radius: 8px; background: #fff; box-shadow: 0 8px 24px rgb(42 52 80 / 5%); }
.practice-card-top, footer, .practice-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; } .course-label { color: #6351ca; font-size: 13px; font-weight: 650; }
.practice-card h2 { margin: 21px 0 8px; font-size: 20px; } .practice-card > p { flex: 1; margin: 0; color: #718096; font-size: 14px; line-height: 1.75; }
.practice-meta { justify-content: flex-start; flex-wrap: wrap; margin: 22px 0 17px; color: #69778b; font-size: 12px; } .practice-meta span { padding: 4px 8px; border-radius: 4px; background: #f0f3f8; }
footer { padding-top: 15px; border-top: 1px solid #edf0f4; } footer small { color: #7e899a; line-height: 1.5; }
@media (max-width: 720px) { .practice-center { padding: 24px 16px 36px; } .practice-stats, .practice-grid { grid-template-columns: 1fr; } .practice-stats div { border-right: 0; border-bottom: 1px solid #edf0f5; } .practice-stats div:last-child { border-bottom: 0; } }
</style>
