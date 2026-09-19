<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Collection, Refresh } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import StudentWrongBooks from '@/components/learning/StudentWrongBooks.vue'
import { getStudentGrowthOverview } from '@/api/learningAnalysis'

const router = useRouter()
const loading = ref(false)
const overview = ref(null)
const wrongQuestions = computed(() => overview.value?.practiceEvidence?.wrongQuestions || [])

async function loadPage() {
  loading.value = true
  try {
    overview.value = await getStudentGrowthOverview()
  } catch (error) {
    overview.value = null
    ElMessage.error(error.message || '错题记录加载失败')
  } finally {
    loading.value = false
  }
}

function openPractice(item) {
  if (!item?.practiceId) return
  router.push({ name: 'student-practice-take', params: { practiceId: item.practiceId } })
}

onMounted(loadPage)
</script>

<template>
  <main class="wrong-book-page">
    <header class="page-header">
      <div>
        <button type="button" class="back-button" @click="router.push('/main/home')">
          <el-icon><ArrowLeft /></el-icon>返回首页
        </button>
        <p>PERSONAL REVIEW CENTER</p>
        <h1><el-icon><Collection /></el-icon>错题本</h1>
        <span>整理真实练习中的错题，找到原因，再练一次。</span>
      </div>
      <el-button circle aria-label="刷新错题" :loading="loading" @click="loadPage"><el-icon><Refresh /></el-icon></el-button>
    </header>
    <StudentWrongBooks
      v-loading="loading"
      :wrong-questions="wrongQuestions"
      @open-practice="openPractice"
    />
  </main>
</template>

<style scoped>
.wrong-book-page{min-height:calc(100vh - 64px);padding:30px 34px 48px;background:#f5f7fb;color:#27354a}.page-header{display:flex;width:min(1180px,100%);align-items:end;justify-content:space-between;gap:24px;margin:0 auto 20px}.page-header p{margin:20px 0 5px;color:#8178cf;font-size:11px;font-weight:900;letter-spacing:.12em}.page-header h1{display:flex;align-items:center;gap:10px;margin:0;color:#2f2853;font-size:34px}.page-header h1 .el-icon{color:#d8891e}.page-header span{display:block;margin-top:8px;color:#718096;font-size:14px}.back-button{display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;color:#64748b;cursor:pointer;font:inherit;font-size:13px;font-weight:700}.wrong-book-page :deep(.wrong-book-shell){width:min(1180px,100%);margin:0 auto}@media(max-width:640px){.wrong-book-page{padding:20px 14px 36px}.page-header{align-items:start}.page-header h1{font-size:28px}}
</style>
