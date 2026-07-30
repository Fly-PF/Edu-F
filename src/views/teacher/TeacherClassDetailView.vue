<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Calendar,
  Collection,
  CopyDocument,
  DataAnalysis,
  Delete,
  Link,
  Plus,
  Refresh,
  School,
  Search,
  User,
  View,
} from '@element-plus/icons-vue'
import {
  assignCourseToClass,
  getClassAssignedCourses,
  getClassAssignableCourses,
  getClassCourseStudyRecords,
  getClassInviteCode,
  getClassStudents,
  getStudentCourseStudyRecords,
  getTeacherClassDetail,
  refreshClassInviteCode,
  removeAssignedCourse,
  removeClassStudent,
  updateAssignedCourseDeadline,
} from '@/api/teacherClassDetail'
import classDetailMascot from '@/assets/teacher/class-detail-mascot.png'

const route = useRoute()

const currentClassId = ref('')
const pageLoading = ref(false)
const classDetail = ref({})
const inviteInfo = ref({})

const assignDialogVisible = ref(false)
const assignForm = reactive({
  courseId: '',
  deadline: '',
})

const assignableCourses = reactive({
  keyword: '',
  records: [],
  loading: false,
})

const deadlineDialogVisible = ref(false)
const deadlineForm = reactive({
  courseId: '',
  courseName: '',
  deadline: '',
})

const studyDetailDialogVisible = ref(false)
const studyDetailLoading = ref(false)
const studyDetail = ref({})

const students = reactive({
  keyword: '',
  pageNum: 1,
  pageSize: 10,
  total: 0,
  records: [],
  loading: false,
})

const assignedCourses = reactive({
  keyword: '',
  pageNum: 1,
  pageSize: 10,
  total: 0,
  records: [],
  loading: false,
})

const progressQuery = reactive({
  courseId: '',
  keyword: '',
  studyStatus: '',
  pageNum: 1,
  pageSize: 10,
  total: 0,
  records: [],
  loading: false,
})

const classStatusMap = {
  0: { label: '已归档', type: 'info' },
  1: { label: '正常', type: 'success' },
}

const joinTypeMap = {
  1: '邀请码加入',
  2: '公开加入',
}

const difficultyMap = {
  1: '入门',
  2: '进阶',
  3: '高阶',
}

const courseTypeMap = {
  1: '理论课',
  2: '项目实践课',
  3: '实验课',
}

const studyStatusMap = {
  0: { label: '未开始', type: 'info' },
  1: { label: '学习中', type: 'warning' },
  2: { label: '已完成', type: 'success' },
  3: { label: '已逾期', type: 'danger' },
}

const finishStatusMap = {
  0: { label: '未完成', type: 'info' },
  1: { label: '已完成', type: 'success' },
}

const visibleClassCode = computed(() => inviteInfo.value.classCode || classDetail.value.classCode || '-')
const visibleJoinType = computed(() => inviteInfo.value.joinType ?? classDetail.value.joinType)
const selectedProgressCourse = computed(() => {
  return assignedCourses.records.find((item) => Number(item.courseId) === Number(progressQuery.courseId))
})
const completedProgressCount = computed(() => {
  return progressQuery.records.filter((item) => Number(item.studyStatus) === 2).length
})
const activeProgressCount = computed(() => {
  return progressQuery.records.filter((item) => Number(item.studyStatus) === 1).length
})
const averageProgress = computed(() => {
  if (!progressQuery.records.length) {
    return 0
  }

  const total = progressQuery.records.reduce((sum, item) => sum + Number(item.progress || 0), 0)
  return Math.round(total / progressQuery.records.length)
})
const quickStats = computed(() => [
  {
    label: '学生数',
    value: classDetail.value.studentCount ?? students.total ?? 0,
    suffix: '人',
    icon: User,
  },
  {
    label: '已下发课程',
    value: assignedCourses.total || assignedCourses.records.length,
    suffix: '门',
    icon: Collection,
  },
  {
    label: '平均完成度',
    value: averageProgress.value,
    suffix: '%',
    icon: DataAnalysis,
  },
  {
    label: '进行中',
    value: activeProgressCount.value,
    suffix: '人',
    icon: View,
  },
])
const moduleLinks = [
  { label: '概览', desc: '班级基础信息', href: '#class-summary', icon: School },
  { label: '邀请码', desc: '复制和刷新', href: '#invite-code', icon: Link },
  { label: '学生', desc: '搜索与移除', href: '#students', icon: User },
  { label: '课程', desc: '下发和截止', href: '#courses', icon: Collection },
  { label: '进度', desc: '学习跟踪', href: '#progress', icon: DataAnalysis },
]

function normalizeId(value) {
  return String(value || '').trim()
}

function readResponse(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) {
    return response
  }

  if (response.code === 200) {
    return response.data
  }

  throw new Error(response.message || '操作失败')
}

function showError(error, fallback = '操作失败') {
  ElMessage.error(error?.message || fallback)
}

function getStatusMeta(map, value) {
  return map[value] || { label: '未知', type: 'info' }
}

function toNumber(value) {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : value
}

function getAssignableCourseLabel(course) {
  const suffix = Number(course?.isPublic) === 1 ? '#公开本人课程' : '#本人非公开课程'
  return `${course?.courseName || '-'} ${suffix}`
}

function getStudentInitial(name) {
  return (name || '学').slice(0, 1)
}

async function copyInviteCode() {
  const code = visibleClassCode.value

  if (!code || code === '-') {
    ElMessage.warning('暂无可复制的邀请码')
    return
  }

  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(code)
    } else {
      const input = document.createElement('input')
      input.value = code
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    ElMessage.success(`邀请码 ${code} 已复制`)
  } catch (error) {
    showError(error, '邀请码复制失败')
  }
}

async function loadAssignableCourses(keyword = '') {
  if (!currentClassId.value) {
    assignableCourses.records = []
    return
  }

  assignableCourses.keyword = keyword
  assignableCourses.loading = true

  try {
    const data = readResponse(await getClassAssignableCourses(currentClassId.value, {
      keyword: keyword || undefined,
    }))
    assignableCourses.records = data || []
  } catch (error) {
    showError(error, '可下发课程加载失败')
  } finally {
    assignableCourses.loading = false
  }
}

async function loadClassDetail() {
  const data = readResponse(await getTeacherClassDetail(currentClassId.value))
  classDetail.value = data || {}
}

async function loadInviteCode() {
  const data = readResponse(await getClassInviteCode(currentClassId.value))
  inviteInfo.value = data || {}
}

async function loadStudents() {
  students.loading = true

  try {
    const data = readResponse(await getClassStudents(currentClassId.value, {
      pageNum: students.pageNum,
      pageSize: students.pageSize,
      keyword: students.keyword || undefined,
    }))

    students.records = data?.records || []
    students.total = data?.total || 0
  } catch (error) {
    showError(error, '学生列表加载失败')
  } finally {
    students.loading = false
  }
}

async function loadAssignedCourses() {
  assignedCourses.loading = true

  try {
    const data = readResponse(await getClassAssignedCourses(currentClassId.value, {
      pageNum: assignedCourses.pageNum,
      pageSize: assignedCourses.pageSize,
      keyword: assignedCourses.keyword || undefined,
    }))

    assignedCourses.records = data?.records || []
    assignedCourses.total = data?.total || 0

    if (!progressQuery.courseId && assignedCourses.records.length > 0) {
      progressQuery.courseId = assignedCourses.records[0].courseId
      await loadCourseProgress()
    }
  } catch (error) {
    showError(error, '已下发课程加载失败')
  } finally {
    assignedCourses.loading = false
  }
}

async function loadCourseProgress() {
  if (!progressQuery.courseId) {
    progressQuery.records = []
    progressQuery.total = 0
    return
  }

  progressQuery.loading = true

  try {
    const data = readResponse(await getClassCourseStudyRecords(
      currentClassId.value,
      progressQuery.courseId,
      {
        pageNum: progressQuery.pageNum,
        pageSize: progressQuery.pageSize,
        keyword: progressQuery.keyword || undefined,
        studyStatus: progressQuery.studyStatus === '' ? undefined : progressQuery.studyStatus,
      },
    ))

    progressQuery.records = data?.records || []
    progressQuery.total = data?.total || 0
  } catch (error) {
    showError(error, '学习进度加载失败')
  } finally {
    progressQuery.loading = false
  }
}

async function loadPageData() {
  if (!currentClassId.value) {
    return
  }

  pageLoading.value = true

  try {
    await Promise.all([loadClassDetail(), loadInviteCode(), loadStudents(), loadAssignedCourses()])
  } catch (error) {
    showError(error, '班级详情加载失败')
  } finally {
    pageLoading.value = false
  }
}

function resetStudentSearch() {
  students.pageNum = 1
  loadStudents()
}

function resetCourseSearch() {
  assignedCourses.pageNum = 1
  loadAssignedCourses()
}

function resetProgressSearch() {
  progressQuery.pageNum = 1
  loadCourseProgress()
}

function handleProgressCourseChange() {
  progressQuery.pageNum = 1
  loadCourseProgress()
}

async function refreshInviteCode() {
  try {
    await ElMessageBox.confirm('刷新后旧邀请码将不可再用于加入班级，确认刷新吗？', '刷新邀请码', {
      type: 'warning',
      confirmButtonText: '刷新',
      cancelButtonText: '取消',
    })

    const data = readResponse(await refreshClassInviteCode(currentClassId.value))
    inviteInfo.value = {
      ...inviteInfo.value,
      classCode: data?.classCode,
    }
    classDetail.value = {
      ...classDetail.value,
      classCode: data?.classCode,
    }
    ElMessage.success('邀请码已刷新')
  } catch (error) {
    if (error !== 'cancel') {
      showError(error, '邀请码刷新失败')
    }
  }
}

async function removeStudent(row) {
  try {
    await ElMessageBox.confirm(`确认将学生“${row.studentName}”移出该班级吗？`, '移除学生', {
      type: 'warning',
      confirmButtonText: '移除',
      cancelButtonText: '取消',
    })

    readResponse(await removeClassStudent(currentClassId.value, row.studentId))
    ElMessage.success('学生已移除')
    await Promise.all([loadStudents(), loadClassDetail()])
  } catch (error) {
    if (error !== 'cancel') {
      showError(error, '移除学生失败')
    }
  }
}

async function openAssignDialog() {
  assignForm.courseId = ''
  assignForm.deadline = ''
  assignableCourses.keyword = ''
  assignableCourses.records = []
  assignDialogVisible.value = true
  await loadAssignableCourses()
}

async function saveAssignCourse() {
  if (!assignForm.courseId) {
    ElMessage.warning('请选择课程')
    return
  }

  try {
    readResponse(await assignCourseToClass({
      courseId: toNumber(assignForm.courseId),
      classId: toNumber(currentClassId.value),
      deadline: assignForm.deadline || null,
    }))
    assignDialogVisible.value = false
    ElMessage.success('课程已下发')
    await loadAssignableCourses(assignableCourses.keyword)
    await loadAssignedCourses()
  } catch (error) {
    showError(error, '课程下发失败')
  }
}

function openDeadlineDialog(row) {
  deadlineForm.courseId = row.courseId
  deadlineForm.courseName = row.courseName
  deadlineForm.deadline = row.deadline || ''
  deadlineDialogVisible.value = true
}

async function saveDeadline() {
  try {
    readResponse(await updateAssignedCourseDeadline(
      currentClassId.value,
      deadlineForm.courseId,
      deadlineForm.deadline || null,
    ))
    deadlineDialogVisible.value = false
    ElMessage.success('截止时间已修改')
    await loadAssignedCourses()
  } catch (error) {
    showError(error, '截止时间修改失败')
  }
}

async function removeCourse(row) {
  try {
    await ElMessageBox.confirm(`确认从班级中移除课程“${row.courseName}”吗？`, '移除课程', {
      type: 'warning',
      confirmButtonText: '移除',
      cancelButtonText: '取消',
    })

    readResponse(await removeAssignedCourse(currentClassId.value, row.courseId))
    ElMessage.success('课程已移除')
    if (Number(progressQuery.courseId) === Number(row.courseId)) {
      progressQuery.courseId = ''
      progressQuery.records = []
      progressQuery.total = 0
    }
    await loadAssignedCourses()
  } catch (error) {
    if (error !== 'cancel') {
      showError(error, '移除课程失败')
    }
  }
}

async function openStudyDetail(row) {
  const courseId = row.courseId || progressQuery.courseId
  studyDetailDialogVisible.value = true
  studyDetailLoading.value = true
  studyDetail.value = {}

  try {
    const data = readResponse(await getStudentCourseStudyRecords(
      currentClassId.value,
      courseId,
      row.studentId,
    ))
    studyDetail.value = data || {}
  } catch (error) {
    showError(error, '学习明细加载失败')
  } finally {
    studyDetailLoading.value = false
  }
}

watch(
  () => route.query.classId,
  (classId) => {
    const normalizedClassId = normalizeId(classId)

    if (!normalizedClassId) {
      currentClassId.value = ''
      return
    }

    if (normalizedClassId !== currentClassId.value) {
      currentClassId.value = normalizedClassId
      students.pageNum = 1
      assignedCourses.pageNum = 1
      progressQuery.pageNum = 1
      progressQuery.courseId = ''
      loadPageData()
    }
  },
  { immediate: true },
)
</script>

<template>
  <main class="teacher-class-detail">
    <section class="page-header">
      <div class="header-copy">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>班级管理</el-breadcrumb-item>
          <el-breadcrumb-item>{{ classDetail.className || '班级详情' }}</el-breadcrumb-item>
        </el-breadcrumb>
        <p class="eyebrow">拥抱AI，班级在路上</p>
        <h1>{{ classDetail.className || '班级详情' }}</h1>
        <span>用一个轻量工作台集中处理邀请码、学生、课程与学习进度。</span>
        <div class="header-pills">
          <span>{{ classDetail.school || '学校信息待加载' }}</span>
          <span>{{ classDetail.grade || '学段待加载' }}</span>
          <span>{{ classDetail.studentCount ?? students.total ?? 0 }} 名学生</span>
        </div>
      </div>
      <div class="header-metrics" aria-label="班级关键数据">
        <div>
          <strong>{{ visibleClassCode }}</strong>
          <span>当前邀请码</span>
        </div>
        <div>
          <strong>{{ assignedCourses.total || assignedCourses.records.length }}</strong>
          <span>已下发课程</span>
        </div>
      </div>
    </section>

    <el-empty v-if="!currentClassId" description="请从班级列表进入班级详情" />

    <template v-else>
      <div class="detail-shell">
        <aside class="module-sidebar">
          <div class="sidebar-card">
            <div class="sidebar-class">
              <div class="sidebar-cover mascot-cover" aria-hidden="true">
                <img :src="classDetailMascot" alt="" />
              </div>
              <div>
                <strong>{{ classDetail.className || '班级详情' }}</strong>
                <span>{{ classDetail.school || '-' }}</span>
              </div>
            </div>
            <nav class="module-nav" aria-label="班级详情模块导航">
              <a v-for="item in moduleLinks" :key="item.label" :href="item.href">
                <span class="module-thumb">
                  <el-icon><component :is="item.icon" /></el-icon>
                </span>
                <strong>{{ item.label }}</strong>
                <em>{{ item.desc }}</em>
              </a>
            </nav>
          </div>
        </aside>

        <div class="detail-content">
          <section
            id="class-summary"
            v-loading="pageLoading"
            class="summary-panel class-hero-panel"
          >
            <div class="summary-main">
              <div class="class-cover-card mascot-cover" aria-hidden="true">
                <img :src="classDetailMascot" alt="" />
              </div>
              <div class="summary-copy">
                <div class="title-row">
                  <h2>{{ classDetail.className || '-' }}</h2>
                  <el-tag :type="getStatusMeta(classStatusMap, classDetail.classStatus).type">
                    {{ getStatusMeta(classStatusMap, classDetail.classStatus).label }}
                  </el-tag>
                </div>
                <p>
                  <el-icon><School /></el-icon>
                  {{ classDetail.school || '-' }} · {{ classDetail.grade || '-' }}
                </p>
                <div class="class-meta-row">
                  <span>
                    <el-icon><Calendar /></el-icon>
                    创建于 {{ classDetail.createTime || '-' }}
                  </span>
                  <span>
                    <el-icon><Link /></el-icon>
                    {{ joinTypeMap[classDetail.joinType] || '-' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="summary-grid">
              <div v-for="item in quickStats" :key="item.label" class="summary-item">
                <span>
                  <el-icon><component :is="item.icon" /></el-icon>
                  {{ item.label }}
                </span>
                <strong>
                  <el-statistic :value="item.value" :suffix="item.suffix" />
                </strong>
              </div>
            </div>
          </section>

          <section
            id="invite-code"
            class="section-panel invite-panel warm-panel"
          >
        <div class="invite-info">
          <span class="panel-icon">
            <el-icon><Link /></el-icon>
          </span>
          <div>
            <div class="invite-heading">
              <h2>邀请码</h2>
              <div class="invite-code">{{ visibleClassCode }}</div>
            </div>
            <p>当前加入方式：{{ joinTypeMap[visibleJoinType] || '-' }}</p>
          </div>
        </div>
        <div class="section-actions">
          <el-tooltip content="复制邀请码给学生加入班级" placement="top">
            <el-button plain @click="copyInviteCode">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
          </el-tooltip>
          <el-tooltip content="生成新的邀请码，旧码会失效" placement="top">
            <el-button type="primary" @click="refreshInviteCode">
              <el-icon><Refresh /></el-icon>
              刷新
            </el-button>
          </el-tooltip>
        </div>
          </section>

          <section
            id="students"
            class="section-panel students-panel"
          >
        <div class="section-title">
          <div>
            <h2>
              <el-icon><User /></el-icon>
              学生管理
            </h2>
            <p>按姓名或账号搜索学生</p>
          </div>
          <div class="filter-actions">
            <el-input
              v-model="students.keyword"
              clearable
              placeholder="学生姓名或账号"
              @keyup.enter="resetStudentSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="resetStudentSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
          </div>
        </div>

        <el-table v-loading="students.loading" :data="students.records" border stripe class="detail-table">
          <el-table-column label="学生姓名" min-width="180">
            <template #default="{ row }">
              <div class="student-cell">
                <el-avatar :size="34">{{ getStudentInitial(row.studentName) }}</el-avatar>
                <div>
                  <strong>{{ row.studentName || '-' }}</strong>
                  <span>已加入班级</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="studentNo" label="学生账号" min-width="150" />
          <el-table-column prop="joinTime" label="加入时间" min-width="180" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-tooltip content="将该学生移出当前班级" placement="top">
                <el-button type="danger" link @click="removeStudent(row)">
                  <el-icon><Delete /></el-icon>
                  移除
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="students.pageNum"
            v-model:page-size="students.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="students.total"
            background
            layout="total, sizes, prev, pager, next"
            @current-change="loadStudents"
            @size-change="resetStudentSearch"
          />
        </div>
          </section>

          <section
            id="courses"
            class="section-panel courses-panel"
          >
        <div class="section-title">
          <div>
            <h2>
              <el-icon><Collection /></el-icon>
              已下发课程
            </h2>
            <p>管理班级内课程和截止时间</p>
          </div>
          <div class="filter-actions">
            <el-input
              v-model="assignedCourses.keyword"
              clearable
              placeholder="课程名称"
              @keyup.enter="resetCourseSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button @click="resetCourseSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button type="primary" @click="openAssignDialog">
              <el-icon><Plus /></el-icon>
              下发课程
            </el-button>
          </div>
        </div>

        <el-table v-loading="assignedCourses.loading" :data="assignedCourses.records" border stripe class="detail-table">
          <el-table-column label="课程" min-width="220">
            <template #default="{ row }">
              <div class="course-cell">
                <el-image v-if="row.cover" class="course-cover" :src="row.cover" fit="cover" />
                <div v-else class="course-cover placeholder-cover">课</div>
                <div>
                  <strong>{{ row.courseName }}</strong>
                  <span>{{ row.grade || '-' }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="难度" width="100">
            <template #default="{ row }">{{ difficultyMap[row.difficulty] || '-' }}</template>
          </el-table-column>
          <el-table-column label="类型" width="120">
            <template #default="{ row }">{{ courseTypeMap[row.courseType] || '-' }}</template>
          </el-table-column>
          <el-table-column prop="publishTime" label="下发时间" min-width="180" />
          <el-table-column prop="deadline" label="截止时间" min-width="180" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-tooltip content="修改该课程的完成截止时间" placement="top">
                <el-button type="primary" link @click="openDeadlineDialog(row)">
                  <el-icon><Edit /></el-icon>
                  改截止
                </el-button>
              </el-tooltip>
              <el-tooltip content="从当前班级移除这门课程" placement="top">
                <el-button type="danger" link @click="removeCourse(row)">
                  <el-icon><Delete /></el-icon>
                  移除
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="assignedCourses.pageNum"
            v-model:page-size="assignedCourses.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="assignedCourses.total"
            background
            layout="total, sizes, prev, pager, next"
            @current-change="loadAssignedCourses"
            @size-change="resetCourseSearch"
          />
        </div>
          </section>

          <section
            id="progress"
            class="section-panel progress-panel"
          >
        <div class="section-title">
          <div>
            <h2>
              <el-icon><DataAnalysis /></el-icon>
              学习进度
            </h2>
            <p>{{ selectedProgressCourse?.courseName || '选择课程后查看班级学习情况' }}</p>
          </div>
          <div class="progress-filters">
            <el-select
              v-model="progressQuery.courseId"
              placeholder="选择课程"
              @change="handleProgressCourseChange"
            >
              <el-option
                v-for="course in assignedCourses.records"
                :key="course.courseId"
                :label="course.courseName"
                :value="course.courseId"
              />
            </el-select>
            <el-select
              v-model="progressQuery.studyStatus"
              clearable
              placeholder="学习状态"
              @change="resetProgressSearch"
            >
              <el-option label="未开始" :value="0" />
              <el-option label="学习中" :value="1" />
              <el-option label="已完成" :value="2" />
              <el-option label="已逾期" :value="3" />
            </el-select>
            <el-input
              v-model="progressQuery.keyword"
              clearable
              placeholder="学生姓名或账号"
              @keyup.enter="resetProgressSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="resetProgressSearch">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
          </div>
        </div>

        <div class="progress-overview">
          <div>
            <span>当前课程平均完成度</span>
            <strong>{{ averageProgress }}%</strong>
          </div>
          <div>
            <span>已完成</span>
            <strong>{{ completedProgressCount }} 人</strong>
          </div>
          <div>
            <span>学习中</span>
            <strong>{{ activeProgressCount }} 人</strong>
          </div>
        </div>

        <el-table v-loading="progressQuery.loading" :data="progressQuery.records" border stripe class="detail-table">
          <el-table-column label="学生姓名" min-width="150">
            <template #default="{ row }">
              <div class="student-cell compact">
                <el-avatar :size="30">{{ getStudentInitial(row.studentName) }}</el-avatar>
                <strong>{{ row.studentName || '-' }}</strong>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="studentNo" label="学生账号" min-width="140" />
          <el-table-column label="章节进度" min-width="150">
            <template #default="{ row }">
              {{ row.finishedChapter ?? 0 }}/{{ row.totalChapter ?? 0 }}
            </template>
          </el-table-column>
          <el-table-column label="完成度" min-width="180">
            <template #default="{ row }">
              <el-progress :percentage="row.progress || 0" />
            </template>
          </el-table-column>
          <el-table-column label="学习时长" min-width="120">
            <template #default="{ row }">{{ row.studyDuration ?? 0 }} 分钟</template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusMeta(studyStatusMap, row.studyStatus).type">
                {{ getStatusMeta(studyStatusMap, row.studyStatus).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="lastStudyTime" label="最近学习" min-width="180" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-tooltip content="查看该学生的章节学习记录" placement="top">
                <el-button type="primary" link @click="openStudyDetail(row)">
                  <el-icon><View /></el-icon>
                  明细
                </el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-row">
          <el-pagination
            v-model:current-page="progressQuery.pageNum"
            v-model:page-size="progressQuery.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="progressQuery.total"
            background
            layout="total, sizes, prev, pager, next"
            @current-change="loadCourseProgress"
            @size-change="resetProgressSearch"
          />
        </div>
          </section>
        </div>
      </div>
    </template>

    <el-dialog v-model="assignDialogVisible" title="下发课程" width="460px">
      <el-form label-width="90px">
        <el-form-item label="课程">
          <el-select
            v-model="assignForm.courseId"
            class="assign-course-select"
            clearable
            filterable
            remote
            :remote-method="loadAssignableCourses"
            :loading="assignableCourses.loading"
            placeholder="搜索或选择课程"
          >
            <el-option
              v-for="course in assignableCourses.records"
              :key="course.courseId"
              :label="getAssignableCourseLabel(course)"
              :value="course.courseId"
            >
              <div class="assign-course-option">
                <span>{{ course.courseName }}</span>
                <el-tag size="small" :type="Number(course.isPublic) === 1 ? 'success' : 'info'">
                  {{ Number(course.isPublic) === 1 ? '公开本人课程' : '本人非公开课程' }}
                </el-tag>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="截止时间">
          <el-date-picker
            v-model="assignForm.deadline"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="可不设置"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAssignCourse">下发</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="deadlineDialogVisible" title="修改截止时间" width="460px">
      <el-form label-width="90px">
        <el-form-item label="课程">
          <el-input v-model="deadlineForm.courseName" disabled />
        </el-form-item>
        <el-form-item label="截止时间">
          <el-date-picker
            v-model="deadlineForm.deadline"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="可不设置"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="deadlineDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDeadline">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="studyDetailDialogVisible" title="学习明细" width="840px">
      <div v-loading="studyDetailLoading">
        <div class="detail-summary">
          <div>
            <span>学生</span>
            <strong>{{ studyDetail.studentName || '-' }}</strong>
          </div>
          <div>
            <span>课程</span>
            <strong>{{ studyDetail.courseName || '-' }}</strong>
          </div>
          <div>
            <span>完成度</span>
            <strong>{{ studyDetail.progress ?? 0 }}%</strong>
          </div>
          <div>
            <span>学习时长</span>
            <strong>{{ studyDetail.studyDuration ?? 0 }} 分钟</strong>
          </div>
        </div>

        <el-table :data="studyDetail.chapters || []" border>
          <el-table-column prop="sort" label="序号" width="80" />
          <el-table-column prop="chapterName" label="章节" min-width="220" />
          <el-table-column label="进度" min-width="160">
            <template #default="{ row }">
              <el-progress :percentage="row.progress || 0" />
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getStatusMeta(finishStatusMap, row.finishStatus).type">
                {{ getStatusMeta(finishStatusMap, row.finishStatus).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="学习时长" width="120">
            <template #default="{ row }">{{ row.studyDuration ?? 0 }} 分钟</template>
          </el-table-column>
          <el-table-column prop="lastStudyTime" label="最近学习" min-width="170" />
        </el-table>
      </div>
    </el-dialog>
  </main>
</template>

<style scoped>
.teacher-class-detail {
  max-width: 1280px;
  margin: 0 auto;
  padding: 28px 32px 36px;
  position: relative;
  isolation: isolate;
  background:
    radial-gradient(circle at 14% 0%, rgba(64, 158, 255, 0.18), transparent 32%),
    radial-gradient(circle at 82% 8%, rgba(45, 116, 214, 0.16), transparent 30%),
    linear-gradient(180deg, #eef6ff 0, #f8fbff 42%, #f7f9fc 100%);
  scroll-behavior: smooth;
}

.teacher-class-detail::before {
  content: '';
  position: absolute;
  inset: 0 18px auto;
  height: 420px;
  z-index: -1;
  background:
    linear-gradient(90deg, rgba(64, 158, 255, 0.1) 1px, transparent 1px),
    linear-gradient(180deg, rgba(64, 158, 255, 0.08) 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(180deg, #000 0, transparent 100%);
  pointer-events: none;
}

.page-header,
.summary-panel,
.section-panel {
  border: 1px solid rgba(203, 219, 239, 0.78);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 42px rgb(30 64 112 / 10%);
  backdrop-filter: blur(18px);
  transition: box-shadow 0.22s ease, transform 0.22s ease, border-color 0.22s ease;
}

.summary-panel:hover,
.section-panel:hover {
  border-color: rgba(64, 158, 255, 0.36);
  box-shadow: 0 24px 52px rgb(30 64 112 / 14%);
  transform: translateY(-3px);
}

.summary-panel,
.section-panel {
  --panel-accent: #409eff;
  --panel-soft: rgba(236, 245, 255, 0.72);
  --panel-image: none;
}

.page-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 300px);
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 24px;
  min-height: 292px;
  padding: 36px;
  overflow: hidden;
  position: relative;
  background:
    linear-gradient(90deg, rgba(3, 10, 28, 0.94) 0%, rgba(10, 34, 70, 0.84) 48%, rgba(64, 158, 255, 0.24) 100%),
    var(--header-image) center / cover;
  box-shadow: 0 28px 70px rgb(15 38 77 / 22%);
}

.page-header::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0) 0 62%, rgba(4, 14, 34, 0.48) 100%),
    radial-gradient(circle at 76% 18%, rgba(91, 178, 255, 0.36), transparent 22%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(180deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px);
  background-size: auto, auto, 42px 42px, 42px 42px;
  pointer-events: none;
}

.header-copy,
.header-metrics {
  position: relative;
  z-index: 1;
}

.header-copy {
  max-width: 760px;
}

.header-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.header-pills span {
  display: inline-flex;
  width: auto;
  align-items: center;
  min-height: 30px;
  margin-top: 0;
  padding: 6px 12px;
  border: 1px solid rgba(147, 197, 253, 0.34);
  border-radius: 8px;
  background: rgba(8, 24, 52, 0.32);
  color: rgba(255, 255, 255, 0.92);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 10%);
  backdrop-filter: blur(14px);
  font-size: 13px;
}

.header-metrics {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.header-metrics div {
  min-width: 0;
  position: relative;
  padding: 16px;
  border: 1px solid rgba(147, 197, 253, 0.34);
  border-radius: 8px;
  background: linear-gradient(135deg, rgba(8, 24, 52, 0.6), rgba(64, 158, 255, 0.18));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 14%), 0 16px 28px rgb(2 8 23 / 18%);
  backdrop-filter: blur(18px);
}

.header-metrics div::before {
  content: '';
  display: block;
  width: 7px;
  height: 7px;
  margin-bottom: 10px;
  border-radius: 50%;
  background: #67e8f9;
  box-shadow: 0 0 14px rgb(103 232 249 / 76%);
}

.header-metrics strong,
.header-metrics span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-metrics strong {
  color: #ffffff;
  font-size: 26px;
  line-height: 1.15;
}

.header-metrics span {
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
}

.page-header::before {
  content: '';
  position: absolute;
  right: 32px;
  bottom: 0;
  width: 42%;
  height: 2px;
  border-radius: 999px 999px 0 0;
  background: linear-gradient(90deg, transparent, #67e8f9, #409eff, transparent);
  box-shadow: 0 0 18px rgb(64 158 255 / 68%);
  pointer-events: none;
}

.eyebrow {
  margin: 12px 0 8px;
  color: #67e8f9;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: #ffffff;
  font-size: 38px;
  line-height: 1.25;
  text-shadow: 0 2px 10px rgb(0 0 0 / 18%);
}

.page-header span {
  display: block;
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.84);
  font-size: 14px;
}

.page-header :deep(.el-breadcrumb__inner),
.page-header :deep(.el-breadcrumb__separator) {
  color: rgba(255, 255, 255, 0.78);
}

.page-header :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #ffffff;
  font-weight: 600;
}

h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #111827;
  font-size: 18px;
  line-height: 1.35;
}

.detail-shell {
  display: grid;
  grid-template-columns: 226px minmax(0, 1fr);
  gap: 22px;
  align-items: start;
}

.detail-content {
  min-width: 0;
}

.module-sidebar {
  position: sticky;
  top: 18px;
  z-index: 3;
}

.sidebar-card {
  padding: 12px;
  border: 1px solid rgba(124, 179, 255, 0.24);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgba(7, 20, 45, 0.86), rgba(18, 42, 76, 0.72)),
    var(--sidebar-image) center / cover;
  box-shadow: 0 22px 44px rgb(15 38 77 / 18%);
  backdrop-filter: blur(18px);
}

.sidebar-class {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  padding: 0 0 14px;
  border-bottom: 1px solid rgba(147, 197, 253, 0.22);
  margin-bottom: 12px;
}

.sidebar-cover {
  min-height: 96px;
  border-radius: 8px;
  background-position: center;
  background-size: cover;
  box-shadow: inset 0 -48px 68px rgb(3 10 28 / 52%), 0 12px 22px rgb(2 8 23 / 18%);
}

.sidebar-class strong,
.sidebar-class span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-class strong {
  color: #ffffff;
  font-size: 14px;
}

.sidebar-class span {
  margin-top: 3px;
  color: rgba(219, 234, 254, 0.72);
  font-size: 12px;
}

.module-nav {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.module-nav a {
  display: grid;
  grid-template-columns: 56px minmax(0, 1fr);
  grid-template-areas:
    'icon title'
    'icon desc';
  gap: 4px 12px;
  align-items: center;
  min-height: 66px;
  padding: 8px;
  border: 1px solid rgba(147, 197, 253, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 8%);
  color: rgba(248, 250, 252, 0.92);
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.module-nav a:hover {
  border-color: rgba(103, 232, 249, 0.42);
  background: rgba(64, 158, 255, 0.16);
  box-shadow: 0 14px 28px rgb(6 95 170 / 18%), inset 0 1px 0 rgb(255 255 255 / 12%);
  transform: translateX(4px);
}

.module-thumb {
  display: grid;
  grid-area: icon;
  width: 56px;
  height: 48px;
  overflow: hidden;
  place-items: center;
  border-radius: 8px;
  background-position: center;
  background-size: cover;
  filter: saturate(0.92) contrast(1.05);
  box-shadow: inset 0 -34px 48px rgb(3 10 28 / 52%);
  color: #ffffff;
  font-size: 18px;
}

.module-thumb .el-icon {
  padding: 5px;
  border-radius: 8px;
  background: rgb(2 8 23 / 36%);
  backdrop-filter: blur(6px);
}

.module-nav strong {
  grid-area: title;
  overflow: hidden;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.module-nav em {
  grid-area: desc;
  overflow: hidden;
  color: rgba(219, 234, 254, 0.58);
  font-size: 12px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-actions,
.filter-actions,
.progress-filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.teacher-class-detail :deep(.el-button) {
  border-radius: 8px;
  font-weight: 600;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.teacher-class-detail :deep(.el-button:hover) {
  box-shadow: 0 12px 24px rgb(64 158 255 / 18%);
  transform: translateY(-2px);
}

.teacher-class-detail :deep(.el-button--primary) {
  border-color: #409eff;
  background: linear-gradient(135deg, #409eff, #2563eb);
  box-shadow: 0 12px 24px rgb(64 158 255 / 22%);
}

.teacher-class-detail :deep(.el-button--primary:hover) {
  border-color: #38bdf8;
  background: linear-gradient(135deg, #38bdf8, #2563eb);
}

.summary-panel {
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(500px, 1.2fr);
  gap: 24px;
  margin-bottom: 20px;
  padding: 24px;
  overflow: hidden;
  position: relative;
  scroll-margin-top: 18px;
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.9) 0 52%, rgba(235, 246, 255, 0.74) 100%),
    var(--summary-image) center / cover;
}

.summary-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 10% 0%, rgba(64, 158, 255, 0.16), transparent 28%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px);
  background-size: auto, 38px 38px;
  pointer-events: none;
}

.class-hero-panel {
  border-color: rgba(64, 158, 255, 0.24);
}

.summary-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.class-cover-card {
  width: 112px;
  height: 82px;
  flex: 0 0 auto;
  border-radius: 8px;
  background-position: center;
  background-size: cover;
  filter: saturate(0.9) contrast(1.04);
  box-shadow: 0 16px 30px rgb(22 38 66 / 16%), inset 0 -36px 54px rgb(7 18 38 / 36%);
}

.summary-copy {
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 8px;
}

.summary-main p,
.section-title p,
.invite-info p,
.course-cell span {
  color: #6b7280;
  font-size: 14px;
}

.summary-main p,
.class-meta-row span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.class-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  position: relative;
  z-index: 1;
}

.summary-item {
  min-width: 0;
  padding: 14px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(248, 251, 255, 0.72));
  border: 1px solid rgba(207, 224, 247, 0.78);
  box-shadow: 0 12px 24px rgb(22 38 66 / 7%), inset 0 1px 0 rgb(255 255 255 / 74%);
  backdrop-filter: blur(12px);
}

.summary-item span,
.detail-summary span {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 13px;
}

.summary-item span .el-icon {
  color: #409eff;
}

.summary-item strong,
.detail-summary strong {
  display: block;
  overflow: hidden;
  color: #111827;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-item :deep(.el-statistic__content) {
  color: #111827;
  font-size: 23px;
  font-weight: 700;
}

.summary-item :deep(.el-statistic__suffix) {
  margin-left: 2px;
  color: #64748b;
  font-size: 13px;
}

.section-panel {
  margin-bottom: 20px;
  padding: 24px;
  position: relative;
  scroll-margin-top: 18px;
  overflow: hidden;
  border-color: color-mix(in srgb, var(--panel-accent) 22%, #e4eaf3);
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.92) 0 56%, var(--panel-soft) 100%),
    var(--panel-image) right center / cover;
}

.section-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(90deg, transparent, var(--panel-accent), rgba(103, 232, 249, 0.72), transparent);
  opacity: 0.76;
  transition: opacity 0.2s ease;
}

.section-panel:hover::before {
  opacity: 1;
}

.section-panel::after {
  content: '';
  position: absolute;
  right: -80px;
  top: -90px;
  width: 250px;
  height: 250px;
  border-radius: 50%;
  background:
    radial-gradient(circle, color-mix(in srgb, var(--panel-accent) 26%, transparent), transparent 66%);
  opacity: 0.78;
  pointer-events: none;
}

.section-panel > * {
  position: relative;
  z-index: 1;
}

.warm-panel {
  --panel-accent: #38bdf8;
  --panel-soft: rgba(229, 246, 255, 0.72);
}

.students-panel {
  --panel-accent: #10b981;
  --panel-soft: rgba(232, 252, 244, 0.72);
}

.courses-panel {
  --panel-accent: #6366f1;
  --panel-soft: rgba(238, 242, 255, 0.72);
}

.progress-panel {
  --panel-accent: #0891b2;
  --panel-soft: rgba(229, 250, 255, 0.72);
}

.section-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.section-title .el-icon {
  color: #409eff;
}

.section-title h2 {
  margin-bottom: 6px;
}

.invite-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.92) 0 52%, rgba(229, 246, 255, 0.72) 100%),
    var(--panel-image) right center / cover;
}

.section-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.invite-info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.panel-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.68);
  color: var(--panel-accent);
  font-size: 22px;
  box-shadow: 0 12px 24px rgb(22 38 66 / 9%), 0 0 0 4px color-mix(in srgb, var(--panel-accent) 10%, transparent);
  backdrop-filter: blur(12px);
}

.warm-panel .panel-icon {
  background: rgba(240, 249, 255, 0.88);
}

.invite-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  margin-bottom: 6px;
}

.invite-code {
  min-width: 180px;
  padding: 10px 16px;
  border: 1px dashed color-mix(in srgb, var(--panel-accent) 42%, #ffffff);
  border-radius: 8px;
  background: rgba(248, 251, 255, 0.86);
  color: #1f2937;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: center;
  user-select: all;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 90%), 0 10px 24px rgb(64 158 255 / 8%);
}

.filter-actions .el-input {
  width: 220px;
}

.filter-actions :deep(.el-input__wrapper),
.progress-filters :deep(.el-input__wrapper),
.progress-filters :deep(.el-select__wrapper) {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 0 0 1px rgba(207, 224, 247, 0.86) inset, 0 8px 18px rgb(22 38 66 / 4%);
  transition: box-shadow 0.18s ease, transform 0.18s ease;
}

.filter-actions :deep(.el-input__wrapper:hover),
.progress-filters :deep(.el-input__wrapper:hover),
.progress-filters :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.6) inset, 0 10px 22px rgb(64 158 255 / 8%);
}

.progress-filters {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.progress-filters .el-select,
.progress-filters .el-input {
  width: 180px;
}

.detail-table {
  overflow: hidden;
  border-radius: 8px;
  border: 1px solid rgba(220, 232, 247, 0.82);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: 0 14px 28px rgb(33 61 104 / 6%);
  backdrop-filter: blur(12px);
}

.detail-table :deep(.el-table__header th) {
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(241, 247, 255, 0.96));
  color: #334155;
  font-weight: 700;
}

.detail-table :deep(.el-table__body td) {
  background-color: rgba(255, 255, 255, 0.82);
}

.detail-table :deep(.el-table__body tr:hover > td) {
  background-color: #eef7ff !important;
}

.student-cell {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.student-cell .el-avatar {
  flex: 0 0 auto;
  background: linear-gradient(135deg, var(--panel-accent, #409eff), #2563eb);
  box-shadow: 0 8px 18px color-mix(in srgb, var(--panel-accent, #409eff) 24%, transparent);
  color: #ffffff;
  font-weight: 700;
}

.student-cell strong {
  display: block;
  overflow: hidden;
  color: #111827;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.student-cell span {
  display: block;
  margin-top: 2px;
  color: #94a3b8;
  font-size: 12px;
}

.student-cell.compact strong {
  font-weight: 600;
}

.assign-course-select {
  width: 100%;
}

.assign-course-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.assign-course-option span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.course-cell strong {
  display: block;
  margin-bottom: 4px;
  color: #111827;
}

.course-cover {
  width: 56px;
  height: 40px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: 6px;
  border: 1px solid rgba(207, 224, 247, 0.8);
  background: #e5f1ff;
  box-shadow: 0 8px 18px rgb(22 38 66 / 7%);
}

.placeholder-cover {
  display: grid;
  place-items: center;
  color: #409eff;
  font-weight: 700;
}

.progress-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.progress-overview > div {
  position: relative;
  overflow: hidden;
  padding: 14px 16px;
  border: 1px solid rgba(8, 145, 178, 0.18);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.84), rgba(244, 251, 255, 0.74));
  box-shadow: 0 12px 24px rgb(33 61 104 / 6%);
  backdrop-filter: blur(10px);
}

.progress-overview > div::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 12px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #67e8f9;
  box-shadow: 0 0 14px rgb(103 232 249 / 72%);
}

.progress-overview span {
  display: block;
  color: #64748b;
  font-size: 13px;
}

.progress-overview strong {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 20px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.detail-summary > div {
  min-width: 0;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(207, 224, 247, 0.72);
  background: rgba(248, 251, 255, 0.82);
  box-shadow: 0 10px 20px rgb(22 38 66 / 5%);
}

.teacher-class-detail {
  background:
    radial-gradient(circle at 12% 0%, rgba(117, 87, 246, 0.14), transparent 30%),
    radial-gradient(circle at 86% 10%, rgba(64, 158, 255, 0.12), transparent 28%),
    linear-gradient(180deg, #f3f5ff 0, #f8faff 44%, #ffffff 100%);
}

.teacher-class-detail::before {
  background:
    linear-gradient(90deg, rgba(117, 87, 246, 0.09) 1px, transparent 1px),
    linear-gradient(180deg, rgba(117, 87, 246, 0.07) 1px, transparent 1px);
  background-size: 34px 34px;
}

.page-header,
.summary-panel,
.section-panel {
  border-color: rgba(126, 102, 255, 0.18);
  background: rgba(255, 255, 255, 0.58);
  box-shadow: 0 18px 46px rgb(63 55 130 / 7%);
  backdrop-filter: blur(14px);
}

.summary-panel:hover,
.section-panel:hover {
  border-color: rgba(117, 87, 246, 0.36);
  box-shadow: 0 24px 58px rgb(63 55 130 / 10%);
}

.page-header {
  min-height: 276px;
  background:
    linear-gradient(105deg, rgba(246, 247, 255, 0.96) 0 56%, rgba(238, 243, 255, 0.82) 100%),
    var(--header-image) center / cover;
  box-shadow: 0 22px 60px rgb(63 55 130 / 8%);
}

.page-header::after {
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.42)),
    linear-gradient(90deg, rgba(117, 87, 246, 0.08) 1px, transparent 1px),
    linear-gradient(180deg, rgba(117, 87, 246, 0.06) 1px, transparent 1px);
  background-size: auto, 38px 38px, 38px 38px;
}

.page-header::before {
  right: 34px;
  width: 48%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #7b61ff, #409eff, transparent);
  box-shadow: 0 0 16px rgb(117 87 246 / 34%);
}

.eyebrow {
  color: #7557f6;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0;
}

h1 {
  color: #070721;
  font-size: 42px;
  font-weight: 800;
  text-shadow: none;
}

.page-header span {
  color: #20233f;
}

.page-header :deep(.el-breadcrumb__inner),
.page-header :deep(.el-breadcrumb__separator) {
  color: #6e7191;
}

.page-header :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner) {
  color: #070721;
}

.header-pills span {
  border-color: rgba(117, 87, 246, 0.42);
  background: rgba(255, 255, 255, 0.38);
  color: #7557f6;
  box-shadow: none;
}

.header-metrics div {
  border-color: rgba(117, 87, 246, 0.26);
  background: rgba(255, 255, 255, 0.38);
  box-shadow: 0 14px 32px rgb(63 55 130 / 7%);
}

.header-metrics div::before {
  background: #7557f6;
  box-shadow: 0 0 14px rgb(117 87 246 / 42%);
}

.header-metrics strong {
  color: #070721;
}

.header-metrics span {
  color: #6e7191;
}

.sidebar-card {
  border-color: rgba(117, 87, 246, 0.22);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.68), rgba(247, 248, 255, 0.54)),
    var(--sidebar-image) center / cover;
  box-shadow: 0 18px 44px rgb(63 55 130 / 8%);
}

.sidebar-class {
  border-bottom-color: rgba(117, 87, 246, 0.16);
}

.sidebar-cover {
  opacity: 0.78;
  box-shadow: inset 0 -44px 60px rgb(255 255 255 / 22%), 0 12px 24px rgb(63 55 130 / 8%);
}

.sidebar-class strong {
  color: #070721;
}

.sidebar-class span {
  color: #6e7191;
}

.module-nav a {
  border-color: rgba(117, 87, 246, 0.18);
  background: rgba(255, 255, 255, 0.36);
  box-shadow: none;
  color: #171832;
}

.module-nav a:hover {
  border-color: rgba(117, 87, 246, 0.54);
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 16px 34px rgb(117 87 246 / 10%);
}

.module-thumb {
  filter: saturate(0.86) contrast(1.02);
  box-shadow: inset 0 -32px 46px rgb(27 18 82 / 32%);
}

.module-nav em {
  color: #777a98;
}

.teacher-class-detail :deep(.el-button--primary) {
  border-color: #7557f6;
  background: linear-gradient(135deg, #7557f6, #409eff);
  box-shadow: 0 12px 26px rgb(117 87 246 / 20%);
}

.teacher-class-detail :deep(.el-button--primary:hover) {
  border-color: #7557f6;
  background: linear-gradient(135deg, #8269ff, #55aaff);
}

.summary-panel {
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.7) 0 58%, rgba(242, 244, 255, 0.58) 100%),
    var(--summary-image) center / cover;
}

.summary-panel::after {
  background:
    radial-gradient(circle at 8% 0%, rgba(117, 87, 246, 0.12), transparent 30%),
    linear-gradient(90deg, rgba(117, 87, 246, 0.06) 1px, transparent 1px);
  background-size: auto, 36px 36px;
}

.class-cover-card {
  opacity: 0.84;
  box-shadow: 0 14px 30px rgb(63 55 130 / 10%), inset 0 -34px 54px rgb(27 18 82 / 18%);
}

.summary-item,
.progress-overview > div,
.detail-summary > div {
  border-color: rgba(117, 87, 246, 0.18);
  background: rgba(255, 255, 255, 0.46);
  box-shadow: 0 14px 34px rgb(63 55 130 / 6%);
}

.summary-item span .el-icon,
.section-title .el-icon {
  color: #7557f6;
}

.section-panel {
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.62) 0 62%, var(--panel-soft) 100%),
    var(--panel-image) right center / cover;
}

.section-panel::before {
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--panel-accent), #409eff, transparent);
}

.section-panel::after {
  opacity: 0.46;
}

.warm-panel {
  --panel-accent: #7557f6;
  --panel-soft: rgba(241, 238, 255, 0.5);
}

.students-panel {
  --panel-accent: #7557f6;
  --panel-soft: rgba(242, 244, 255, 0.5);
}

.courses-panel {
  --panel-accent: #7557f6;
  --panel-soft: rgba(240, 245, 255, 0.52);
}

.progress-panel {
  --panel-accent: #7557f6;
  --panel-soft: rgba(242, 244, 255, 0.5);
}

.invite-panel {
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.62) 0 58%, rgba(241, 238, 255, 0.5) 100%),
    var(--panel-image) right center / cover;
}

.panel-icon {
  background: rgba(255, 255, 255, 0.5);
  color: #7557f6;
  box-shadow: 0 0 0 1px rgba(117, 87, 246, 0.16), 0 12px 28px rgb(63 55 130 / 7%);
}

.warm-panel .panel-icon {
  background: rgba(255, 255, 255, 0.52);
}

.invite-code {
  border-color: rgba(117, 87, 246, 0.48);
  background: rgba(255, 255, 255, 0.46);
  color: #070721;
  box-shadow: none;
}

.filter-actions :deep(.el-input__wrapper),
.progress-filters :deep(.el-input__wrapper),
.progress-filters :deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.52);
  box-shadow: 0 0 0 1px rgba(117, 87, 246, 0.18) inset;
}

.filter-actions :deep(.el-input__wrapper:hover),
.progress-filters :deep(.el-input__wrapper:hover),
.progress-filters :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(117, 87, 246, 0.46) inset, 0 10px 24px rgb(117 87 246 / 8%);
}

.detail-table {
  border-color: rgba(117, 87, 246, 0.16);
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 14px 34px rgb(63 55 130 / 6%);
}

.detail-table :deep(.el-table__header th) {
  background: rgba(246, 247, 255, 0.9);
  color: #171832;
}

.detail-table :deep(.el-table__body td) {
  background-color: rgba(255, 255, 255, 0.62);
}

.detail-table :deep(.el-table__body tr:hover > td) {
  background-color: #f3f0ff !important;
}

.student-cell .el-avatar {
  background: linear-gradient(135deg, #7557f6, #409eff);
  box-shadow: 0 8px 18px rgb(117 87 246 / 16%);
}

.course-cover {
  border-color: rgba(117, 87, 246, 0.18);
  box-shadow: 0 8px 18px rgb(63 55 130 / 6%);
}

.progress-overview > div::after {
  background: #7557f6;
  box-shadow: 0 0 14px rgb(117 87 246 / 42%);
}

.teacher-class-detail {
  background:
    radial-gradient(circle at 12% 0%, rgba(64, 158, 255, 0.13), transparent 30%),
    radial-gradient(circle at 88% 8%, rgba(45, 116, 214, 0.1), transparent 26%),
    linear-gradient(180deg, #f2f8ff 0, #f8fbff 46%, #ffffff 100%);
}

.teacher-class-detail::before {
  background:
    linear-gradient(90deg, rgba(64, 158, 255, 0.08) 1px, transparent 1px),
    linear-gradient(180deg, rgba(64, 158, 255, 0.06) 1px, transparent 1px);
  background-size: 34px 34px;
}

.page-header,
.summary-panel,
.section-panel {
  border-color: rgba(64, 158, 255, 0.2);
  background: rgba(250, 253, 255, 0.84);
  box-shadow: 0 18px 44px rgb(33 61 104 / 8%);
}

.summary-panel:hover,
.section-panel:hover {
  border-color: rgba(64, 158, 255, 0.38);
  box-shadow: 0 24px 54px rgb(33 61 104 / 11%);
}

.page-header {
  background:
    linear-gradient(105deg, rgba(247, 251, 255, 0.98) 0 58%, rgba(232, 245, 255, 0.9) 100%),
    linear-gradient(135deg, rgba(64, 158, 255, 0.1), rgba(255, 255, 255, 0));
  box-shadow: 0 22px 56px rgb(33 61 104 / 9%);
}

.page-header::after {
  background:
    radial-gradient(circle at 78% 18%, rgba(64, 158, 255, 0.12), transparent 26%),
    linear-gradient(90deg, rgba(64, 158, 255, 0.08) 1px, transparent 1px),
    linear-gradient(180deg, rgba(64, 158, 255, 0.06) 1px, transparent 1px);
  background-size: auto, 38px 38px, 38px 38px;
}

.page-header::before {
  background: linear-gradient(90deg, transparent, #409eff, #2d74d6, transparent);
  box-shadow: 0 0 16px rgb(64 158 255 / 32%);
}

.eyebrow {
  color: #409eff;
}

h1 {
  color: #080a24;
}

.page-header span,
.header-metrics span,
.sidebar-class span,
.module-nav em {
  color: #64748b;
}

.page-header :deep(.el-breadcrumb__inner),
.page-header :deep(.el-breadcrumb__separator) {
  color: #7a8498;
}

.page-header :deep(.el-breadcrumb__item:last-child .el-breadcrumb__inner),
.header-metrics strong,
.sidebar-class strong {
  color: #080a24;
}

.header-pills span,
.header-metrics div {
  border-color: rgba(64, 158, 255, 0.24);
  background: rgba(255, 255, 255, 0.72);
  color: #2d74d6;
}

.header-metrics div::before,
.progress-overview > div::after {
  background: #409eff;
  box-shadow: 0 0 14px rgb(64 158 255 / 42%);
}

.sidebar-card {
  border-color: rgba(64, 158, 255, 0.18);
  background:
    linear-gradient(180deg, rgba(250, 253, 255, 0.92), rgba(240, 248, 255, 0.86)),
    linear-gradient(135deg, rgba(64, 158, 255, 0.12), transparent);
  box-shadow: 0 18px 42px rgb(33 61 104 / 8%);
}

.sidebar-cover,
.class-cover-card {
  background:
    linear-gradient(135deg, rgba(64, 158, 255, 0.18), rgba(255, 255, 255, 0.6)),
    linear-gradient(90deg, rgba(64, 158, 255, 0.13) 1px, transparent 1px),
    linear-gradient(180deg, rgba(64, 158, 255, 0.1) 1px, transparent 1px) !important;
  background-size: auto, 18px 18px, 18px 18px !important;
  opacity: 1;
  box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.18), 0 12px 24px rgb(33 61 104 / 7%);
}

.module-nav a {
  border-color: rgba(64, 158, 255, 0.18);
  background: rgba(255, 255, 255, 0.74);
  color: #1f2937;
}

.module-nav a:hover {
  border-color: rgba(64, 158, 255, 0.44);
  background: #ffffff;
  box-shadow: 0 16px 34px rgb(64 158 255 / 10%);
}

.module-thumb {
  background:
    linear-gradient(135deg, rgba(64, 158, 255, 0.18), rgba(255, 255, 255, 0.58)),
    linear-gradient(90deg, rgba(64, 158, 255, 0.16) 1px, transparent 1px),
    linear-gradient(180deg, rgba(64, 158, 255, 0.12) 1px, transparent 1px) !important;
  background-size: auto, 14px 14px, 14px 14px !important;
  color: #409eff;
  box-shadow: inset 0 0 0 1px rgba(64, 158, 255, 0.2);
}

.module-thumb .el-icon {
  background: rgba(255, 255, 255, 0.72);
}

.teacher-class-detail :deep(.el-button--primary) {
  border-color: #409eff;
  background: linear-gradient(135deg, #409eff, #2d74d6);
  box-shadow: 0 12px 26px rgb(64 158 255 / 18%);
}

.teacher-class-detail :deep(.el-button--primary:hover) {
  border-color: #2d74d6;
  background: linear-gradient(135deg, #55aaff, #2f75d4);
}

.summary-panel,
.section-panel,
.invite-panel {
  background:
    linear-gradient(105deg, rgba(255, 255, 255, 0.82) 0 64%, rgba(236, 245, 255, 0.72) 100%),
    linear-gradient(135deg, rgba(64, 158, 255, 0.06), transparent);
}

.summary-panel::after {
  background:
    radial-gradient(circle at 8% 0%, rgba(64, 158, 255, 0.1), transparent 28%),
    linear-gradient(90deg, rgba(64, 158, 255, 0.05) 1px, transparent 1px);
  background-size: auto, 36px 36px;
}

.warm-panel,
.students-panel,
.courses-panel,
.progress-panel {
  --panel-accent: #409eff;
  --panel-soft: rgba(236, 245, 255, 0.66);
}

.summary-item,
.progress-overview > div,
.detail-summary > div,
.invite-code,
.panel-icon {
  border-color: rgba(64, 158, 255, 0.18);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 12px 30px rgb(33 61 104 / 6%);
}

.summary-item span .el-icon,
.section-title .el-icon,
.panel-icon {
  color: #409eff;
}

.section-panel::before {
  background: linear-gradient(90deg, transparent, #409eff, rgba(45, 116, 214, 0.62), transparent);
}

.section-panel::after {
  opacity: 0.32;
}

.filter-actions :deep(.el-input__wrapper),
.progress-filters :deep(.el-input__wrapper),
.progress-filters :deep(.el-select__wrapper) {
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.18) inset;
}

.filter-actions :deep(.el-input__wrapper:hover),
.progress-filters :deep(.el-input__wrapper:hover),
.progress-filters :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.44) inset, 0 10px 24px rgb(64 158 255 / 8%);
}

.detail-table {
  border-color: rgba(64, 158, 255, 0.16);
  background: rgba(255, 255, 255, 0.74);
  box-shadow: 0 14px 34px rgb(33 61 104 / 6%);
}

.detail-table :deep(.el-table__header th) {
  background: rgba(247, 251, 255, 0.94);
}

.detail-table :deep(.el-table__body tr:hover > td) {
  background-color: #ecf5ff !important;
}

.student-cell .el-avatar {
  background: linear-gradient(135deg, #409eff, #2d74d6);
  box-shadow: 0 8px 18px rgb(64 158 255 / 16%);
}

.teacher-class-detail {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.55;
  color: #111827;
  font-variant-numeric: tabular-nums;
}

.eyebrow {
  margin: 12px 0 10px;
  color: #409eff;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: 0;
}

h1 {
  color: #080a24;
  font-size: 36px;
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: 0;
}

h2 {
  color: #111827;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.35;
  letter-spacing: 0;
}

.page-header > .header-copy > span {
  max-width: 620px;
  margin-top: 14px;
  color: #4b5872;
  font-size: 15px;
  line-height: 1.7;
}

.header-pills span,
.header-metrics span,
.module-nav strong,
.section-title p,
.summary-main p,
.invite-info p,
.course-cell span,
.student-cell span {
  font-size: 13px;
  line-height: 1.45;
}

.module-nav strong {
  font-weight: 700;
}

.module-nav em,
.class-meta-row,
.sidebar-class span,
.detail-summary span,
.summary-item span,
.progress-overview span {
  font-size: 12px;
  line-height: 1.45;
}

.header-metrics strong {
  font-size: 24px;
  line-height: 1.18;
}

.summary-item :deep(.el-statistic__content) {
  font-size: 24px;
  line-height: 1.15;
}

.invite-code {
  font-size: 20px;
  line-height: 1.2;
}

.detail-table {
  font-size: 14px;
}

.teacher-class-detail :deep(.el-button) {
  font-size: 14px;
}

.teacher-class-detail {
  --header-image: linear-gradient(135deg, rgba(64, 158, 255, 0.08), rgba(255, 255, 255, 0));
  --sidebar-image: linear-gradient(135deg, rgba(64, 158, 255, 0.08), rgba(255, 255, 255, 0));
  --summary-image: linear-gradient(135deg, rgba(64, 158, 255, 0.06), rgba(255, 255, 255, 0));
  --panel-image: linear-gradient(135deg, rgba(64, 158, 255, 0.04), rgba(255, 255, 255, 0));
}

.summary-panel,
.section-panel {
  border: 1.5px solid rgba(64, 158, 255, 0.28);
  background:
    linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  box-shadow:
    0 18px 0 -14px rgba(64, 158, 255, 0.18),
    0 22px 46px rgba(33, 61, 104, 0.11),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
}

.summary-panel:hover,
.section-panel:hover {
  border-color: rgba(64, 158, 255, 0.5);
  box-shadow:
    0 22px 0 -14px rgba(64, 158, 255, 0.22),
    0 30px 62px rgba(33, 61, 104, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.98);
  transform: translateY(-5px) scale(1.003);
}

.summary-panel::before,
.section-panel::before {
  height: 4px;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(90deg, #409eff, #77bfff 52%, rgba(64, 158, 255, 0));
  opacity: 1;
}

.summary-panel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 251, 255, 0.98) 100%),
    linear-gradient(135deg, rgba(64, 158, 255, 0.07), transparent);
}

.section-panel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 251, 255, 0.98) 100%),
    linear-gradient(135deg, rgba(64, 158, 255, 0.05), transparent);
}

.invite-panel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 251, 255, 0.98) 100%),
    linear-gradient(135deg, rgba(64, 158, 255, 0.06), transparent);
}

.summary-item,
.progress-overview > div,
.detail-summary > div,
.invite-code,
.panel-icon,
.detail-table {
  border: 1px solid rgba(64, 158, 255, 0.2);
  background: #ffffff;
  box-shadow:
    0 12px 28px rgba(33, 61, 104, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.98);
}

.summary-item,
.progress-overview > div,
.detail-summary > div {
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.summary-item:hover,
.progress-overview > div:hover,
.detail-summary > div:hover {
  border-color: rgba(64, 158, 255, 0.4);
  box-shadow:
    0 18px 36px rgba(33, 61, 104, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 1);
  transform: translateY(-3px);
}

.module-nav a {
  border: 1px solid rgba(64, 158, 255, 0.24);
  background: #ffffff;
  box-shadow:
    0 10px 24px rgba(33, 61, 104, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.98);
}

.module-nav a:hover {
  border-color: rgba(64, 158, 255, 0.48);
  box-shadow:
    0 16px 34px rgba(33, 61, 104, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 1);
}

.summary-panel,
.section-panel {
  border: 1px solid rgba(64, 158, 255, 0.22);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 251, 255, 0.96) 100%),
    linear-gradient(135deg, rgba(64, 158, 255, 0.04), transparent);
  box-shadow:
    0 14px 34px rgba(33, 61, 104, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
}

.summary-panel:hover,
.section-panel:hover {
  border-color: rgba(64, 158, 255, 0.34);
  box-shadow:
    0 18px 42px rgba(33, 61, 104, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.98);
  transform: translateY(-2px);
}

.summary-panel::before,
.section-panel::before {
  height: 2px;
  background: linear-gradient(90deg, #409eff, rgba(64, 158, 255, 0.24), transparent);
}

.summary-item,
.progress-overview > div,
.detail-summary > div,
.invite-code,
.panel-icon,
.detail-table {
  border: 1px solid rgba(64, 158, 255, 0.16);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 24px rgba(33, 61, 104, 0.06);
}

.summary-item:hover,
.progress-overview > div:hover,
.detail-summary > div:hover {
  border-color: rgba(64, 158, 255, 0.24);
  box-shadow: 0 12px 28px rgba(33, 61, 104, 0.08);
  transform: translateY(-1px);
}

.module-nav a {
  border: 1px solid rgba(64, 158, 255, 0.18);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 8px 18px rgba(33, 61, 104, 0.05);
}

.module-nav a:hover {
  border-color: rgba(64, 158, 255, 0.34);
  box-shadow: 0 12px 26px rgba(33, 61, 104, 0.08);
}

.sidebar-cover,
.class-cover-card,
.module-thumb {
  background-position: center !important;
  background-size: cover !important;
  background-repeat: no-repeat !important;
  overflow: hidden;
  position: relative;
  filter: saturate(0.88) contrast(1.02) brightness(1.04);
}

.sidebar-cover,
.class-cover-card {
  border: 1px solid rgba(64, 158, 255, 0.2);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.55),
    inset 0 -42px 60px rgba(255, 255, 255, 0.26),
    0 12px 24px rgba(33, 61, 104, 0.08);
}

.sidebar-cover::after,
.class-cover-card::after,
.module-thumb::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(236, 245, 255, 0.22)),
    linear-gradient(135deg, rgba(64, 158, 255, 0.08), transparent 54%);
  pointer-events: none;
}

.sidebar-cover {
  min-height: 92px;
}

.class-cover-card {
  width: 104px;
  height: 76px;
}

.module-thumb {
  border: 1px solid rgba(64, 158, 255, 0.18);
  color: #ffffff;
  box-shadow:
    inset 0 -34px 46px rgba(15, 23, 42, 0.28),
    0 8px 16px rgba(33, 61, 104, 0.07);
}

.module-thumb .el-icon {
  display: grid;
  position: relative;
  z-index: 1;
  width: 30px;
  height: 30px;
  padding: 0;
  place-items: center;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.28);
  color: #ffffff;
  font-size: 22px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.module-thumb .el-icon svg {
  width: 20px;
  height: 20px;
}

.sidebar-cover,
.class-cover-card {
  background:
    var(--class-cover-image) center / contain no-repeat,
    linear-gradient(135deg, #f7fbff, #ffffff) !important;
  filter: none;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.72),
    0 12px 24px rgba(33, 61, 104, 0.08);
}

.sidebar-cover::after,
.class-cover-card::after {
  background: linear-gradient(135deg, rgba(64, 158, 255, 0.04), transparent 58%);
}

.mascot-cover {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f7fbff, #ffffff) !important;
}

.sidebar-cover img,
.class-cover-card img {
  display: block;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
  object-fit: contain;
  object-position: center;
}

.sidebar-cover,
.class-cover-card {
  padding: 8px;
  background:
    linear-gradient(135deg, #f7fbff, #ffffff) !important;
}

@media (max-width: 1080px) {
  .page-header {
    grid-template-columns: 1fr;
    align-items: end;
  }

  .detail-shell {
    grid-template-columns: 1fr;
  }

  .module-sidebar {
    position: static;
  }

  .sidebar-card {
    padding: 12px;
  }

  .sidebar-class {
    display: none;
  }

  .module-nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .module-nav a:hover {
    transform: translateY(-2px);
  }

  .summary-panel {
    grid-template-columns: 1fr;
  }

  .summary-grid,
  .progress-overview,
  .detail-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .section-title {
    flex-direction: column;
  }

  .filter-actions,
  .progress-filters {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 700px) {
  .teacher-class-detail {
    padding: 20px 16px;
  }

  .filter-actions,
  .section-actions,
  .invite-panel,
  .invite-heading {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-actions .el-input,
  .progress-filters .el-select,
  .progress-filters .el-input,
  .invite-code {
    width: 100%;
  }

  .module-nav {
    grid-template-columns: 1fr;
  }

  .module-nav a {
    min-height: 58px;
  }

  .summary-grid,
  .progress-overview,
  .detail-summary {
    grid-template-columns: 1fr;
  }

  .summary-main {
    align-items: flex-start;
    flex-direction: column;
  }

  .page-header {
    min-height: 300px;
    padding: 24px;
  }

  .header-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .header-metrics strong {
    font-size: 20px;
  }
}
</style>
