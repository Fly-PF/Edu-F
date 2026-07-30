<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Collection,
  Refresh,
  User,
} from '@element-plus/icons-vue'
import { getStudentClassDetail, getStudentClassCourses } from '@/api/studentClass'
import cover1 from '@/assets/course/img1.webp'
import cover2 from '@/assets/course/img2.webp'
import cover3 from '@/assets/course/img3.webp'
import cover4 from '@/assets/course/img4.webp'

const route = useRoute()
const router = useRouter()
const covers = [cover1, cover2, cover3, cover4]

const classInfo = ref(null)
const courseList = ref([])
const detailLoading = ref(false)
const loading = ref(false)
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(8)

const summary = computed(() => {
  const courses = classInfo.value?.assignedCourses || courseList.value
  const completed = courses.filter((course) => Number(course.studyStatus) === 2).length
  const averageProgress = courses.length
    ? Math.round(courses.reduce((sum, course) => sum + Number(course.progress || 0), 0) / courses.length)
    : 0

  return {
    courses: total.value || courses.length,
    completed,
    averageProgress,
  }
})

function difficultyText(value) {
  return { 1: '入门', 2: '进阶', 3: '高阶' }[value] || '课程'
}

function statusText(status) {
  return { 0: '待开始', 1: '学习中', 2: '已完成', 3: '已逾期' }[status] || '待开始'
}

function courseCover(course, index) {
  return course.cover || covers[Math.abs(Number(course.courseId || index)) % covers.length]
}

function formatDate(value) {
  if (!value) return '未设置'
  return String(value).slice(0, 10).replaceAll('-', '.')
}

function statusClass(status) {
  return {
    0: 'status-pending',
    1: 'status-learning',
    2: 'status-complete',
    3: 'status-overdue',
  }[status] || 'status-pending'
}

async function fetchCourses() {
  if (!classInfo.value?.id) return
  loading.value = true
  try {
    const data = await getStudentClassCourses(classInfo.value.id, {
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    courseList.value = data.records || []
    total.value = data.total || 0
  } catch (error) {
    ElMessage.error(error.message || '获取课程列表失败')
  } finally {
    loading.value = false
  }
}

function goStudy(course) {
  router.push({
    name: 'course-learn',
    params: { courseId: course.courseId },
  })
}

function goBack() {
  router.push({ name: 'student-classes' })
}

async function loadClassDetail(classId) {
  const id = String(classId || '').trim()
  if (!id) {
    ElMessage.warning('缺少班级ID')
    return
  }

  classInfo.value = null
  courseList.value = []
  total.value = 0
  pageNum.value = 1
  detailLoading.value = true
  try {
    classInfo.value = await getStudentClassDetail(id)
    await fetchCourses()
  } catch (error) {
    ElMessage.error(error.message || '查询班级详情失败')
    classInfo.value = null
  } finally {
    detailLoading.value = false
  }
}

watch(() => route.query.classId, loadClassDetail, { immediate: true })
</script>

<template>
  <main v-loading="detailLoading" class="student-class-detail-page">
    <template v-if="classInfo">
      <section class="class-hero">
        <div class="hero-topline">
          <button class="back-button" type="button" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            <span>返回我的班级</span>
          </button>
          <el-button circle :loading="loading" aria-label="刷新班级详情" @click="fetchCourses">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>

        <div class="hero-content">
          <div class="class-identity">
            <div class="class-badge">{{ classInfo.grade?.slice(0, 1) || '班' }}</div>
            <div>
              <p class="eyebrow">MY CLASSROOM</p>
              <h1>{{ classInfo.className }}</h1>
              <p class="class-description">
                {{ classInfo.school }} · {{ classInfo.grade }} · {{ classInfo.teacher?.teacherName || '授课教师' }}
              </p>
            </div>
          </div>

          <div class="hero-facts">
            <div class="hero-fact">
              <el-icon><User /></el-icon>
              <span>班级同学</span>
              <strong>{{ classInfo.studentCount || 0 }}</strong>
            </div>
            <div class="hero-fact">
              <el-icon><Collection /></el-icon>
              <span>班级课程</span>
              <strong>{{ summary.courses }}</strong>
            </div>
            <div class="hero-fact hero-fact-accent">
              <el-icon><Check /></el-icon>
              <span>我的平均进度</span>
              <strong>{{ summary.averageProgress }}%</strong>
            </div>
          </div>
        </div>
      </section>

      <section class="learning-strip" aria-label="班级学习概览">
        <div class="strip-title">
          <span class="strip-kicker">LEARNING PATH</span>
          <h2>继续完成班级课程</h2>
          <p>从上次学习的位置继续，逐步完成老师下发的学习任务。</p>
        </div>
        <div class="strip-progress">
          <div class="progress-label">
            <span>课程完成概览</span>
            <strong>{{ summary.completed }}/{{ summary.courses }} 门</strong>
          </div>
          <el-progress :percentage="summary.averageProgress" :stroke-width="9" :show-text="false" />
        </div>
      </section>

      <section class="course-section">
        <div class="section-heading">
          <div>
            <p class="eyebrow">ASSIGNED COURSES</p>
            <h2>班级课程</h2>
            <p>老师为本班安排的课程都会显示在这里。</p>
          </div>
          <span class="course-count">{{ total }} 门课程</span>
        </div>

        <div v-loading="loading" class="course-grid">
          <article v-for="(course, index) in courseList" :key="course.courseId" class="course-tile">
            <div class="course-cover">
              <img :src="courseCover(course, index)" :alt="`${course.courseName}课程封面`" />
              <span class="difficulty-badge">{{ difficultyText(course.difficulty) }}</span>
              <span class="course-number">{{ String((pageNum - 1) * pageSize + index + 1).padStart(2, '0') }}</span>
            </div>

            <div class="course-tile-body">
              <div class="course-title-row">
                <h3>{{ course.courseName }}</h3>
                <span class="status-badge" :class="statusClass(course.studyStatus)">
                  <el-icon v-if="Number(course.studyStatus) === 2"><Check /></el-icon>
                  {{ statusText(course.studyStatus) }}
                </span>
              </div>

              <div class="course-meta">
                <span><el-icon><Calendar /></el-icon>下发 {{ formatDate(course.publishTime) }}</span>
                <span v-if="course.deadline"><el-icon><Clock /></el-icon>截止 {{ formatDate(course.deadline) }}</span>
              </div>

              <div class="course-progress">
                <div>
                  <span>学习进度</span>
                  <strong>{{ course.progress || 0 }}%</strong>
                </div>
                <el-progress :percentage="Number(course.progress || 0)" :stroke-width="7" :show-text="false" />
              </div>

              <button class="study-button" type="button" @click="goStudy(course)">
                <span>{{ Number(course.studyStatus) === 2 ? '再次学习' : '进入学习' }}</span>
                <el-icon><ArrowRight /></el-icon>
              </button>
            </div>
          </article>
        </div>

        <el-empty v-if="!loading && courseList.length === 0" description="老师还没有下发课程" />

        <div v-if="total > pageSize" class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pageNum"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[8, 16, 32]"
            layout="total, sizes, prev, pager, next, jumper"
            @current-change="fetchCourses"
            @size-change="fetchCourses"
          />
        </div>
      </section>
    </template>

    <el-empty v-else-if="!detailLoading" class="missing-class" description="请从班级列表进入班级详情" />
  </main>
</template>

<style scoped>
.student-class-detail-page {
  min-height: 100%;
  padding: 30px clamp(18px, 4vw, 56px) 56px;
  background: #f5f7fa;
  color: #172033;
}

.class-hero,
.learning-strip,
.course-section {
  max-width: 1280px;
  margin: 0 auto;
}

.class-hero {
  padding: 26px clamp(22px, 4vw, 46px) 34px;
  border: 1px solid #dce7f2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 44px rgb(37 78 112 / 8%);
}

.hero-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border: 0;
  background: transparent;
  color: #4c78a8;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
}

.back-button:hover {
  color: #2167af;
}

.hero-content {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 36px;
}

.class-identity {
  display: flex;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.class-badge {
  display: grid;
  width: 68px;
  height: 68px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #dff1ff;
  color: #2576bc;
  font-size: 28px;
  font-weight: 800;
}

.eyebrow,
.strip-kicker {
  margin: 0 0 8px;
  color: #317bc1;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}

.class-identity h1,
.section-heading h2,
.strip-title h2 {
  margin: 0;
  color: #172033;
  font-weight: 750;
  letter-spacing: 0;
}

.class-identity h1 {
  font-size: 34px;
  line-height: 1.12;
}

.class-description,
.section-heading p,
.strip-title p {
  margin: 9px 0 0;
  color: #718096;
  font-size: 14px;
  line-height: 1.6;
}

.hero-facts {
  display: flex;
  align-items: stretch;
  gap: 10px;
  flex: 0 0 auto;
}

.hero-fact {
  display: grid;
  min-width: 108px;
  padding: 13px 15px;
  border-left: 1px solid #e5edf5;
  color: #718096;
  gap: 5px;
}

.hero-fact .el-icon {
  color: #6a9dcc;
  font-size: 16px;
}

.hero-fact span {
  font-size: 12px;
}

.hero-fact strong {
  color: #24364b;
  font-size: 23px;
  line-height: 1;
}

.hero-fact-accent strong,
.hero-fact-accent .el-icon {
  color: #1a9b83;
}

.learning-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  margin-top: 18px;
  padding: 22px 28px;
  border: 1px solid #dcefe9;
  border-radius: 8px;
  background: #f5fbf9;
}

.strip-title h2 {
  font-size: 21px;
}

.strip-title p {
  margin-top: 5px;
}

.strip-progress {
  width: min(360px, 38%);
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  color: #65768c;
  font-size: 13px;
}

.progress-label strong {
  color: #198b76;
}

.course-section {
  margin-top: 42px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 18px;
}

.section-heading h2 {
  font-size: 28px;
}

.course-count {
  padding-bottom: 5px;
  color: #6e8296;
  font-size: 13px;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 18px;
}

.course-tile {
  overflow: hidden;
  border: 1px solid #dce7f1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgb(26 56 87 / 5%);
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.course-tile:hover {
  border-color: #9fc8e7;
  box-shadow: 0 18px 32px rgb(26 56 87 / 11%);
  transform: translateY(-3px);
}

.course-cover {
  position: relative;
  overflow: hidden;
  aspect-ratio: 1.75;
  background: #eaf3fa;
}

.course-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.difficulty-badge,
.course-number {
  position: absolute;
  top: 12px;
  padding: 5px 8px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
}

.difficulty-badge {
  left: 12px;
  background: rgb(22 45 68 / 84%);
  color: #ffffff;
}

.course-number {
  right: 12px;
  background: rgb(255 255 255 / 88%);
  color: #4e7398;
}

.course-tile-body {
  padding: 18px 18px 16px;
}

.course-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.course-title-row h3 {
  min-width: 0;
  margin: 0;
  color: #1b2b3d;
  font-size: 17px;
  line-height: 1.35;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 3px;
  padding: 4px 7px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
}

.status-pending {
  background: #f0f3f7;
  color: #738298;
}

.status-learning {
  background: #e9f3ff;
  color: #377bb8;
}

.status-complete {
  background: #e8f7f1;
  color: #16856c;
}

.status-overdue {
  background: #fff0ed;
  color: #c35d53;
}

.course-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin: 15px 0 17px;
  color: #8a99aa;
  font-size: 11px;
}

.course-meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.course-meta .el-icon {
  color: #78a6ca;
}

.course-progress {
  padding-top: 13px;
  border-top: 1px solid #edf2f6;
}

.course-progress > div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: #76879a;
  font-size: 12px;
}

.course-progress strong {
  color: #2870ad;
}

.study-button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-top: 17px;
  padding: 10px 12px;
  border: 1px solid #c8e0f2;
  border-radius: 6px;
  background: #f5faff;
  color: #2878b8;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  transition: background 160ms ease, color 160ms ease;
}

.study-button:hover {
  background: #2f80ed;
  color: #ffffff;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 24px;
}

.missing-class {
  min-height: 50vh;
}

@media (max-width: 860px) {
  .hero-content,
  .learning-strip {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-facts,
  .strip-progress {
    width: 100%;
  }

  .hero-fact {
    flex: 1;
  }
}

@media (max-width: 560px) {
  .student-class-detail-page {
    padding: 16px 14px 36px;
  }

  .class-hero {
    padding: 20px 18px 24px;
  }

  .class-identity h1 {
    font-size: 28px;
  }

  .hero-facts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
  }

  .hero-fact {
    min-width: 0;
    padding: 10px 8px;
  }

  .hero-fact strong {
    font-size: 19px;
  }

  .hero-fact span {
    font-size: 10px;
  }

  .learning-strip {
    padding: 18px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 4px;
  }
}
</style>
