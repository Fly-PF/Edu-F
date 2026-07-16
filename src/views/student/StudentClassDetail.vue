<template>
  <main class="student-class-detail-page">
    <el-card class="query-card" shadow="never">
      <el-form :inline="true" @keyup.enter="handleQuery">
        <el-form-item label="班级ID">
          <el-input
            v-model="inputClassId"
            placeholder="请输入班级ID"
            clearable
            style="width: 220px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleQuery" :disabled="!inputClassId">查询</el-button>
          <el-button @click="goBack">返回</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <template v-if="classInfo">
    <div class="page-header">
      <div class="class-header-info">
        <h2>{{ classInfo.className }}</h2>
        <div class="class-meta">
          <span>{{ classInfo.school }} / {{ classInfo.grade }}</span>
          <span class="meta-divider">|</span>
          <span>老师：{{ classInfo.teacher?.teacherName }}</span>
          <span class="meta-divider">|</span>
          <span>{{ classInfo.studentCount }} 名学生</span>
        </div>
      </div>
    </div>

    <el-card class="course-card" shadow="never" v-if="classInfo">
      <template #header>
        <span>班级课程</span>
      </template>

      <el-table :data="courseList" v-loading="loading" border stripe>
        <el-table-column prop="courseName" label="课程名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="grade" label="学段" width="80" align="center" />
        <el-table-column prop="difficulty" label="难度" width="80" align="center">
          <template #default="{ row }">
            <span>{{ ['', '入门', '进阶', '高阶'][row.difficulty] || '' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="publishTime" label="下发时间" width="180" />
        <el-table-column prop="deadline" label="截止时间" width="180" />
        <el-table-column label="学习状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.studyStatus)" size="small">
              {{ statusText(row.studyStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="120" align="center">
          <template #default="{ row }">
            <el-progress :percentage="row.progress || 0" :stroke-width="14" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goStudy(row)">
              开始学习
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" v-if="total > 0">
        <el-pagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchCourses"
          @size-change="fetchCourses"
        />
      </div>
    </el-card>

    <el-empty v-else description="请输入班级ID查询班级详情" />
    </template>
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getStudentClassDetail, getStudentClassCourses } from '@/api/studentClass'

const router = useRouter()

const inputClassId = ref('')
const classInfo = ref(null)
const courseList = ref([])
const loading = ref(false)
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

function statusType(status) {
  const map = { 0: 'info', 1: 'primary', 2: 'success', 3: 'danger' }
  return map[status] || 'info'
}

function statusText(status) {
  const map = { 0: '未开始', 1: '学习中', 2: '已完成', 3: '已逾期' }
  return map[status] || '未知'
}

async function fetchCourses() {
  loading.value = true
  try {
    const data = await getStudentClassCourses(classInfo.value?.id, {
      pageNum: pageNum.value,
      pageSize: pageSize.value
    })
    courseList.value = data.records || []
    total.value = data.total || 0
  } catch (e) {
    ElMessage.error(e.message || '获取课程列表失败')
  } finally {
    loading.value = false
  }
}

function goStudy(row) {
  router.push({
    name: 'course-learn',
    params: { courseId: row.courseId }
  })
}

async function handleQuery() {
  const id = inputClassId.value?.trim()
  if (!id) {
    ElMessage.warning('请输入班级ID')
    return
  }
  classInfo.value = null
  courseList.value = []
  total.value = 0
  pageNum.value = 1
  try {
    const data = await getStudentClassDetail(id)
    classInfo.value = data
    fetchCourses()
  } catch (e) {
    ElMessage.error(e.message || '查询失败')
    classInfo.value = null
  }
}

function goBack() {
  router.push({ name: 'main-student' })
}
</script>

<style scoped>
.student-class-detail-page {
  min-height: 100%;
  padding: 24px;
  background: #f4f6f9;
}

.query-card {
  margin-bottom: 16px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  margin-top: 16px;
}

.class-header-info h2 {
  margin: 0 0 6px;
  color: #111827;
  font-size: 22px;
  font-weight: 600;
}

.class-meta {
  color: #64748b;
  font-size: 14px;
}

.meta-divider {
  margin: 0 8px;
  color: #cbd5e1;
}

.course-card {
  border: 1px solid #e5eaf2;
  border-radius: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

</style>
