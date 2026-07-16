<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
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
  updateClassInviteCode,
} from '@/api/teacherClassDetail'

const route = useRoute()

const currentClassId = ref('')
const pageLoading = ref(false)
const classDetail = ref({})
const inviteInfo = ref({})

const inviteDialogVisible = ref(false)
const inviteForm = reactive({
  classCode: '',
})

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

function openInviteDialog() {
  inviteForm.classCode = visibleClassCode.value === '-' ? '' : visibleClassCode.value
  inviteDialogVisible.value = true
}

async function saveInviteCode() {
  const classCode = inviteForm.classCode.trim()

  if (!classCode) {
    ElMessage.warning('请输入新的邀请码')
    return
  }

  try {
    const data = readResponse(await updateClassInviteCode(currentClassId.value, classCode))
    inviteInfo.value = {
      ...inviteInfo.value,
      classCode: data?.classCode || classCode,
    }
    classDetail.value = {
      ...classDetail.value,
      classCode: data?.classCode || classCode,
    }
    inviteDialogVisible.value = false
    ElMessage.success('邀请码已修改')
  } catch (error) {
    showError(error, '邀请码修改失败')
  }
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
      <div>
        <p class="eyebrow">老师班级详情页</p>
        <h1>{{ classDetail.className || '班级详情' }}</h1>
      </div>
    </section>

    <el-empty v-if="!currentClassId" description="请从班级列表进入班级详情" />

    <template v-else>
      <section v-loading="pageLoading" class="summary-panel">
        <div class="summary-main">
          <div class="class-avatar">{{ (classDetail.className || '班').slice(0, 1) }}</div>
          <div>
            <div class="title-row">
              <h2>{{ classDetail.className || '-' }}</h2>
              <el-tag :type="getStatusMeta(classStatusMap, classDetail.classStatus).type">
                {{ getStatusMeta(classStatusMap, classDetail.classStatus).label }}
              </el-tag>
            </div>
            <p>{{ classDetail.school || '-' }} · {{ classDetail.grade || '-' }}</p>
          </div>
        </div>

        <div class="summary-grid">
          <div class="summary-item">
            <span>学生数</span>
            <strong>{{ classDetail.studentCount ?? 0 }}</strong>
          </div>
          <div class="summary-item">
            <span>加入方式</span>
            <strong>{{ joinTypeMap[classDetail.joinType] || '-' }}</strong>
          </div>
          <div class="summary-item">
            <span>邀请码</span>
            <strong>{{ visibleClassCode }}</strong>
          </div>
          <div class="summary-item">
            <span>创建时间</span>
            <strong>{{ classDetail.createTime || '-' }}</strong>
          </div>
        </div>
      </section>

      <section class="section-panel invite-panel">
        <div class="invite-info">
          <div>
            <div class="invite-heading">
              <h2>邀请码</h2>
              <div class="invite-code">{{ visibleClassCode }}</div>
            </div>
            <p>当前加入方式：{{ joinTypeMap[visibleJoinType] || '-' }}</p>
          </div>
        </div>
        <div class="section-actions">
          <el-button @click="openInviteDialog">修改</el-button>
          <el-button type="primary" @click="refreshInviteCode">刷新</el-button>
        </div>
      </section>

      <section class="section-panel">
        <div class="section-title">
          <div>
            <h2>学生管理</h2>
            <p>按姓名或账号搜索学生</p>
          </div>
          <div class="filter-actions">
            <el-input
              v-model="students.keyword"
              clearable
              placeholder="学生姓名或账号"
              @keyup.enter="resetStudentSearch"
            />
            <el-button type="primary" @click="resetStudentSearch">搜索</el-button>
          </div>
        </div>

        <el-table v-loading="students.loading" :data="students.records" border>
          <el-table-column prop="studentName" label="学生姓名" min-width="140" />
          <el-table-column prop="studentNo" label="学生账号" min-width="150" />
          <el-table-column prop="joinTime" label="加入时间" min-width="180" />
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button type="danger" link @click="removeStudent(row)">移除</el-button>
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

      <section class="section-panel">
        <div class="section-title">
          <div>
            <h2>已下发课程</h2>
            <p>管理班级内课程和截止时间</p>
          </div>
          <div class="filter-actions">
            <el-input
              v-model="assignedCourses.keyword"
              clearable
              placeholder="课程名称"
              @keyup.enter="resetCourseSearch"
            />
            <el-button @click="resetCourseSearch">搜索</el-button>
            <el-button type="primary" @click="openAssignDialog">下发课程</el-button>
          </div>
        </div>

        <el-table v-loading="assignedCourses.loading" :data="assignedCourses.records" border>
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
              <el-button type="primary" link @click="openDeadlineDialog(row)">改截止</el-button>
              <el-button type="danger" link @click="removeCourse(row)">移除</el-button>
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

      <section class="section-panel">
        <div class="section-title">
          <div>
            <h2>学习进度</h2>
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
            />
            <el-button type="primary" @click="resetProgressSearch">查询</el-button>
          </div>
        </div>

        <el-table v-loading="progressQuery.loading" :data="progressQuery.records" border>
          <el-table-column prop="studentName" label="学生姓名" min-width="130" />
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
              <el-button type="primary" link @click="openStudyDetail(row)">明细</el-button>
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
    </template>

    <el-dialog v-model="inviteDialogVisible" title="修改邀请码" width="420px">
      <el-form label-width="90px">
        <el-form-item label="邀请码">
          <el-input v-model="inviteForm.classCode" maxlength="32" placeholder="请输入新的邀请码" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="inviteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveInviteCode">保存</el-button>
      </template>
    </el-dialog>

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
  padding: 32px;
}

.page-header,
.summary-panel,
.section-panel {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
  padding: 24px;
}

.eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 14px;
  font-weight: 600;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  color: #111827;
  font-size: 28px;
  line-height: 1.25;
}

h2 {
  color: #111827;
  font-size: 18px;
  line-height: 1.35;
}

.section-actions,
.filter-actions,
.progress-filters {
  display: flex;
  align-items: center;
  gap: 10px;
}

.summary-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(480px, 1.25fr);
  gap: 24px;
  margin-bottom: 20px;
  padding: 24px;
}

.summary-main {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 16px;
}

.class-avatar {
  display: grid;
  width: 64px;
  height: 64px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #2563eb;
  color: #ffffff;
  font-size: 28px;
  font-weight: 700;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.summary-main p,
.section-title p,
.course-cell span {
  color: #6b7280;
  font-size: 14px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.summary-item {
  min-width: 0;
  padding: 14px;
  border-radius: 8px;
  background: #f8fafc;
}

.summary-item span,
.detail-summary span {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 13px;
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

.section-panel {
  margin-bottom: 20px;
  padding: 24px;
}

.section-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 18px;
}

.section-title h2 {
  margin-bottom: 6px;
}

.invite-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.invite-info {
  min-width: 0;
}

.invite-heading {
  display: flex;
  align-items: center;
  gap: 36px;
  margin-bottom: 6px;
}

.invite-code {
  min-width: 160px;
  padding: 10px 16px;
  border: 1px dashed #93c5fd;
  border-radius: 8px;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-align: center;
}

.filter-actions .el-input {
  width: 220px;
}

.progress-filters {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.progress-filters .el-select,
.progress-filters .el-input {
  width: 180px;
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
  background: #e5e7eb;
}

.placeholder-cover {
  display: grid;
  place-items: center;
  color: #4b5563;
  font-weight: 700;
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
  background: #f8fafc;
}

@media (max-width: 1080px) {
  .summary-panel {
    grid-template-columns: 1fr;
  }

  .summary-grid,
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

  .page-header,
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

  .summary-grid,
  .detail-summary {
    grid-template-columns: 1fr;
  }
}
</style>
