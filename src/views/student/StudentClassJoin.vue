<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowRight,
  Collection,
  Connection,
  Document,
  Plus,
  Promotion,
  RefreshRight,
  School,
  User,
} from '@element-plus/icons-vue'
import {
  joinStudentClass,
  leaveStudentClass,
  listJoinablePublicClasses,
  listStudentClasses,
} from '@/api/studentClass'

const router = useRouter()
const loading = ref(false)
const loadError = ref(false)
const joining = ref(false)
const joinVisible = ref(false)
const joinMode = ref('invite')
const classes = ref([])

const joinForm = reactive({
  classCode: '',
  classId: '',
})

const publicClasses = reactive({
  keyword: '',
  records: [],
  loading: false,
})

const stats = computed(() => {
  const active = classes.value.filter((item) => Number(item.status) === 1).length
  const totalCourses = classes.value.reduce((sum, item) => sum + Number(item.assignedCourseCount || 0), 0)
  const totalStudents = classes.value.reduce((sum, item) => sum + Number(item.studentCount || 0), 0)
  return {
    total: classes.value.length,
    active,
    totalCourses,
    totalStudents,
  }
})

function joinTypeText(joinType) {
  return Number(joinType) === 2 ? '公开加入' : '邀请码加入'
}

function statusText(status) {
  return Number(status) === 1 ? '进行中' : '已归档'
}

function statusType(status) {
  return Number(status) === 1 ? 'success' : 'info'
}

function formatDate(value) {
  if (!value) return '刚刚加入'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function classInitial(item) {
  return String(item?.className || '班').trim().slice(0, 1) || '班'
}

function classAccent(item) {
  const accents = ['blue', 'teal', 'violet', 'amber']
  const id = Number(item?.classId)
  return accents[(Number.isFinite(id) ? Math.abs(id) : 0) % accents.length]
}

async function loadClasses() {
  loading.value = true
  loadError.value = false
  try {
    classes.value = (await listStudentClasses()) || []
  } catch (error) {
    loadError.value = true
    ElMessage.error(error?.message || '班级列表加载失败')
  } finally {
    loading.value = false
  }
}

async function loadPublicClasses(keyword = '') {
  publicClasses.keyword = keyword
  publicClasses.loading = true

  try {
    publicClasses.records = (await listJoinablePublicClasses({
      keyword: keyword || undefined,
    })) || []
  } catch (error) {
    ElMessage.error(error?.message || '公开班级加载失败')
  } finally {
    publicClasses.loading = false
  }
}

function selectPublicClass(item) {
  joinForm.classId = item?.classId || ''
}

function publicClassLabel(item) {
  return item?.className || '-'
}

async function openJoinDialog(mode = 'invite') {
  joinMode.value = mode
  joinForm.classCode = ''
  joinForm.classId = ''
  joinVisible.value = true

  if (mode === 'public') {
    publicClasses.records = []
    publicClasses.keyword = ''
    await loadPublicClasses()
  }
}

function openClassDetail(item) {
  router.push({
    name: 'student-class-detail',
    query: { classId: item.classId },
  })
}

async function submitJoin() {
  const payload =
    joinMode.value === 'invite'
      ? { classCode: joinForm.classCode.trim() }
      : { classId: Number(joinForm.classId) || null }

  if (joinMode.value === 'invite' && !payload.classCode) {
    ElMessage.warning('请输入班级邀请码')
    return
  }

  if (joinMode.value === 'public' && !payload.classId) {
    ElMessage.warning('请选择公开班级')
    return
  }

  joining.value = true
  try {
    await joinStudentClass(payload)
    ElMessage.success('加入班级成功')
    joinVisible.value = false
    await loadClasses()
  } catch (error) {
    ElMessage.error(error?.message || '加入班级失败')
  } finally {
    joining.value = false
  }
}

async function handleLeave(item) {
  try {
    await ElMessageBox.confirm(`确认退出“${item.className}”吗？退出后需要重新加入才能继续查看班级内容。`, '退出班级', {
      type: 'warning',
      confirmButtonText: '退出',
      cancelButtonText: '取消',
    })
    await leaveStudentClass(item.classId)
    ElMessage.success('已退出班级')
    await loadClasses()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error?.message || '退出班级失败')
    }
  }
}

onMounted(loadClasses)

watch(joinMode, (mode) => {
  if (mode === 'public' && joinVisible.value && !publicClasses.records.length) {
    loadPublicClasses()
  }
})
</script>

<template>
  <div class="student-class-page">
    <section class="hero-panel">
      <div class="hero-decoration hero-decoration-one" aria-hidden="true"></div>
      <div class="hero-decoration hero-decoration-two" aria-hidden="true"></div>
      <div class="hero-copy">
        <p class="eyebrow">MY LEARNING SPACE</p>
        <h1>我的学习班级</h1>
        <p>在这里查看你的学习班级，与老师和同学一起完成课程学习。</p>
      </div>

      <div class="hero-actions">
        <el-button type="primary" @click="openJoinDialog('invite')">
          <el-icon><Promotion /></el-icon>
          邀请码加入
        </el-button>
        <el-button class="secondary-action" @click="openJoinDialog('public')">
          <el-icon><Plus /></el-icon>
          发现公开班级
        </el-button>
        <el-tooltip content="刷新班级" placement="bottom">
          <el-button circle :loading="loading" aria-label="刷新班级" @click="loadClasses">
            <el-icon><RefreshRight /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </section>

    <section class="overview-card" aria-label="学习概览">
      <div class="overview-intro">
        <span class="overview-mark"><Collection /></span>
        <div>
          <span class="section-kicker">LEARNING OVERVIEW</span>
          <h2>你的学习版图</h2>
        </div>
      </div>
      <div class="overview-items">
        <div class="overview-item">
          <strong>{{ stats.total }}</strong>
          <span>已加入班级</span>
        </div>
        <div class="overview-item">
          <strong>{{ stats.active }}</strong>
          <span>正在进行</span>
        </div>
        <div class="overview-item">
          <strong>{{ stats.totalCourses }}</strong>
          <span>待学习课程</span>
        </div>
        <div class="overview-item">
          <strong>{{ stats.totalStudents }}</strong>
          <span>一起学习的同学</span>
        </div>
      </div>
    </section>

    <main class="class-list-section" v-loading="loading">
      <header class="section-header">
        <div>
          <p class="section-kicker">MY CLASSROOMS</p>
          <h2>继续你的班级学习</h2>
          <p class="section-description">选择一个班级，进入课程、任务和同学们的学习空间。</p>
        </div>
        <span class="class-count">{{ classes.length }} 个班级</span>
      </header>

      <div v-if="classes.length" class="class-grid">
        <article v-for="item in classes" :key="item.classId" class="class-card">
          <div class="class-card-banner" :class="`is-${classAccent(item)}`">
            <span class="class-initial">{{ classInitial(item) }}</span>
            <el-tag size="small" :type="statusType(item.status)">{{ statusText(item.status) }}</el-tag>
          </div>

          <div class="class-card-body">
            <div class="class-title-row">
              <div>
                <h3>{{ item.className }}</h3>
                <p>{{ item.school || '学习班级' }}<span v-if="item.grade"> · {{ item.grade }}</span></p>
              </div>
              <span class="join-type">{{ joinTypeText(item.joinType) }}</span>
            </div>

            <div class="class-meta-list">
              <span><el-icon><School /></el-icon>{{ item.teacherName || '老师未设置' }}</span>
              <span><el-icon><Document /></el-icon>{{ item.assignedCourseCount || 0 }} 门课程</span>
              <span><el-icon><User /></el-icon>{{ item.studentCount || 0 }} 位同学</span>
            </div>

            <div class="class-card-footer">
              <span class="join-time">加入于 {{ formatDate(item.joinTime) }}</span>
              <div class="card-actions">
                <el-button link type="danger" @click="handleLeave(item)">退出班级</el-button>
                <el-button type="primary" @click="openClassDetail(item)">
                  进入班级
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div v-else-if="loadError" class="empty-state empty-state-error">
        <div class="empty-visual"><el-icon><RefreshRight /></el-icon></div>
        <h2>班级暂时没有加载出来</h2>
        <p>网络好像有点忙，刷新后再试一次吧。</p>
        <el-button type="primary" @click="loadClasses">重新加载</el-button>
      </div>

      <div v-else class="empty-state">
        <div class="empty-visual">
          <span class="empty-visual-spark"></span>
          <el-icon><School /></el-icon>
          <span class="empty-visual-plus"><Plus /></span>
        </div>
        <h2>还没有加入班级</h2>
        <p>输入老师提供的邀请码，或发现公开班级，开启你的学习旅程。</p>
        <div class="empty-route-hints" aria-label="加入班级方式">
          <span><el-icon><Promotion /></el-icon>使用老师提供的邀请码</span>
          <span><el-icon><Plus /></el-icon>发现可加入的公开班级</span>
        </div>
        <div class="empty-actions">
          <el-button type="primary" @click="openJoinDialog('invite')">
            <el-icon><Promotion /></el-icon>
            输入邀请码
          </el-button>
          <el-button class="secondary-action" @click="openJoinDialog('public')">
            <el-icon><Plus /></el-icon>
            发现公开班级
          </el-button>
        </div>
      </div>
    </main>

    <el-dialog v-model="joinVisible" class="join-dialog" title="加入一个学习班级" width="min(620px, 92vw)">
      <p class="dialog-intro">选择适合你的加入方式，准备好后就可以开始班级学习。</p>
      <el-tabs v-model="joinMode">
        <el-tab-pane label="使用邀请码" name="invite">
          <div class="join-tab-hint">老师分享给你的邀请码可以直接找到对应班级。</div>
          <el-form label-position="top">
            <el-form-item label="班级邀请码">
              <el-input
                v-model.trim="joinForm.classCode"
                maxlength="30"
                size="large"
                placeholder="请输入老师提供的邀请码"
              >
                <template #prefix><el-icon><Connection /></el-icon></template>
              </el-input>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="发现公开班级" name="public">
          <div class="join-tab-hint">搜索公开班级，找到感兴趣的学习社区后加入。</div>
          <el-form label-position="top">
            <el-form-item label="搜索公开班级">
              <el-select
                v-model="joinForm.classId"
                class="public-class-select"
                clearable
                filterable
                remote
                :remote-method="loadPublicClasses"
                :loading="publicClasses.loading"
                placeholder="搜索班级名称或选择班级"
              >
                <el-option
                  v-for="item in publicClasses.records"
                  :key="item.classId"
                  :label="publicClassLabel(item)"
                  :value="item.classId"
                >
                  <div class="public-class-option">
                    <span>{{ item.className }}</span>
                    <small>{{ item.teacherName || '老师未设置' }} · {{ item.grade || '不限学段' }}</small>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-form>

          <div class="public-class-results" v-loading="publicClasses.loading">
            <button
              v-for="item in publicClasses.records"
              :key="item.classId"
              type="button"
              class="public-class-card"
              :class="{ active: Number(joinForm.classId) === Number(item.classId) }"
              @click="selectPublicClass(item)"
            >
              <div class="public-class-heading">
                <div class="public-class-avatar">{{ classInitial(item) }}</div>
                <div>
                  <h3>{{ item.className }}</h3>
                  <p>{{ item.school || '公开学习班级' }}<span v-if="item.grade"> · {{ item.grade }}</span></p>
                </div>
                <el-tag size="small" type="success">公开</el-tag>
              </div>
              <div class="public-class-meta">
                <span>{{ item.teacherName || '老师未设置' }}</span>
                <span>{{ item.assignedCourseCount || 0 }} 门课程</span>
                <span>{{ item.studentCount || 0 }} 位同学</span>
              </div>
            </button>

          <el-empty
              v-if="!publicClasses.loading && !publicClasses.records.length"
              description="暂时没有可加入的公开班级"
            >
              <p class="public-empty-help">老师创建公开班级后会显示在这里。</p>
            </el-empty>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="joinVisible = false">取消</el-button>
        <el-button type="primary" :loading="joining" @click="submitJoin">加入班级</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.student-class-page {
  min-height: 100%;
  padding: 22px clamp(18px, 4vw, 56px) 42px;
  background: #f4f8fc;
  color: #172b45;
}

.hero-panel,
.overview-card,
.class-list-section {
  width: min(1280px, 100%);
  margin: 0 auto;
}

.hero-panel {
  position: relative;
  display: flex;
  min-height: 190px;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  overflow: hidden;
  padding: 28px clamp(24px, 5vw, 60px) 26px;
  border: 1px solid #d8e8f5;
  border-radius: 20px;
  background: linear-gradient(118deg, #eaf5ff 0%, #f8fcff 61%, #eef8f7 100%);
  box-shadow: 0 16px 38px rgb(34 91 137 / 8%);
}

.hero-panel::after {
  position: absolute;
  right: 12%;
  bottom: -72px;
  width: 270px;
  height: 150px;
  border: 1px solid rgb(84 160 211 / 18%);
  border-radius: 50%;
  content: '';
  transform: rotate(-12deg);
}

.hero-copy,
.hero-actions {
  position: relative;
  z-index: 1;
}

.hero-copy {
  max-width: 650px;
}

.eyebrow,
.section-kicker {
  margin: 0 0 10px;
  color: #327ab7;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.hero-copy h1 {
  margin: 0;
  color: #193b5b;
  font-size: clamp(28px, 3vw, 36px);
  font-weight: 750;
  line-height: 1.2;
}

.hero-copy p:last-child {
  max-width: 540px;
  margin: 11px 0 0;
  color: #5f7891;
  font-size: 15px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.hero-actions .el-button:not(.is-circle),
.empty-actions .el-button:not(.is-circle) {
  min-height: 40px;
  padding: 0 17px;
}

.secondary-action {
  border-color: #c7ddec;
  background: rgb(255 255 255 / 82%);
  color: #3173a9;
}

.secondary-action:hover {
  border-color: #a6cbe6;
  background: #ffffff;
  color: #24669e;
}

.hero-decoration {
  position: absolute;
  border-radius: 50%;
  background: rgb(90 168 214 / 13%);
}

.hero-decoration-one {
  top: -70px;
  right: 32%;
  width: 180px;
  height: 180px;
}

.hero-decoration-two {
  right: 5%;
  bottom: 23px;
  width: 68px;
  height: 68px;
  border: 8px solid rgb(105 191 177 / 16%);
  background: transparent;
}

.overview-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  margin-top: 14px;
  padding: 12px 18px;
  border: 1px solid #e0e9f1;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgb(41 79 112 / 5%);
}

.overview-intro {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 175px;
}

.overview-mark {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 11px;
  background: #e8f4ff;
  color: #307db7;
}

.overview-mark :deep(svg) {
  width: 17px;
}

.overview-intro .section-kicker {
  margin-bottom: 3px;
  font-size: 10px;
}

.overview-intro h2 {
  margin: 0;
  color: #263f58;
  font-size: 15px;
}

.overview-items {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(4, minmax(100px, 1fr));
}

.overview-item {
  padding: 0 16px;
  border-left: 1px solid #e8eef3;
}

.overview-item:first-child {
  padding-left: 0;
  border-left: 0;
}

.overview-item strong,
.overview-item span {
  display: block;
}

.overview-item strong {
  color: #234e70;
  font-size: 20px;
  font-weight: 750;
  line-height: 1.1;
}

.overview-item span {
  margin-top: 3px;
  color: #7b8da0;
  font-size: 12px;
}

.class-list-section {
  margin-top: 28px;
}

.section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 12px;
}

.section-header .section-kicker {
  margin-bottom: 7px;
}

.section-header h2 {
  margin: 0;
  color: #1c354d;
  font-size: 26px;
  font-weight: 750;
}

.section-description {
  margin: 5px 0 0;
  color: #7a8b9d;
  font-size: 13px;
}

.class-count {
  padding-bottom: 4px;
  color: #71869a;
  font-size: 13px;
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.class-card {
  overflow: hidden;
  border: 1px solid #dae6f0;
  border-radius: 15px;
  background: #ffffff;
  box-shadow: 0 9px 24px rgb(38 77 112 / 6%);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.class-card:hover {
  border-color: #b9d5e9;
  box-shadow: 0 15px 30px rgb(38 77 112 / 11%);
  transform: translateY(-3px);
}

.class-card-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  min-height: 92px;
  padding: 18px 19px;
  background: #e8f4ff;
}

.class-card-banner.is-teal {
  background: #e7f6f3;
}

.class-card-banner.is-violet {
  background: #f0effb;
}

.class-card-banner.is-amber {
  background: #fff4df;
}

.class-initial {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid rgb(255 255 255 / 74%);
  border-radius: 14px;
  background: rgb(255 255 255 / 68%);
  color: #2874a9;
  font-size: 21px;
  font-weight: 750;
}

.is-teal .class-initial {
  color: #238578;
}

.is-violet .class-initial {
  color: #7169ae;
}

.is-amber .class-initial {
  color: #b37a2e;
}

.class-card-body {
  padding: 19px 20px 17px;
}

.class-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.class-title-row h3 {
  margin: 0;
  overflow: hidden;
  color: #203d56;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.class-title-row p {
  margin: 6px 0 0;
  overflow: hidden;
  color: #7b8c9e;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.join-type {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 5px;
  background: #f0f5f9;
  color: #6c8194;
  font-size: 10px;
}

.class-meta-list {
  display: grid;
  gap: 8px;
  margin-top: 20px;
  padding: 14px 0;
  border-top: 1px solid #edf2f6;
  border-bottom: 1px solid #edf2f6;
  color: #6e8193;
  font-size: 12px;
}

.class-meta-list span {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.class-meta-list .el-icon {
  color: #7ba7c8;
}

.class-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 14px;
}

.join-time {
  color: #96a4b1;
  font-size: 11px;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 3px;
}

.card-actions .el-button {
  margin-left: 0;
}

.card-actions .el-button--primary {
  padding: 8px 10px;
}

.empty-state {
  display: flex;
  min-height: 278px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  padding: 28px 20px;
  border: 1px dashed #cbddea;
  border-radius: 16px;
  background: #fbfdff;
  text-align: center;
}

.empty-visual {
  position: relative;
  display: grid;
  width: 74px;
  height: 74px;
  place-items: center;
  border: 1px solid #cfe4f3;
  border-radius: 24px 24px 29px 20px;
  background: #eaf6ff;
  color: #4e94c0;
  font-size: 31px;
  transform: rotate(-4deg);
}

.empty-visual::before {
  position: absolute;
  inset: 7px;
  border: 1px solid rgb(116 185 219 / 28%);
  border-radius: 22px 23px 28px 17px;
  content: '';
}

.empty-visual-spark {
  position: absolute;
  top: 5px;
  right: 7px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f2c970;
}

.empty-visual-plus {
  position: absolute;
  right: -9px;
  bottom: -7px;
  display: grid;
  width: 25px;
  height: 25px;
  place-items: center;
  border: 3px solid #fbfdff;
  border-radius: 50%;
  background: #58b29e;
  color: #ffffff;
  font-size: 13px;
  transform: rotate(4deg);
}

.empty-visual-plus :deep(svg) {
  width: 14px;
}

.empty-state h2 {
  margin: 17px 0 0;
  color: #29465f;
  font-size: 20px;
}

.empty-state p {
  max-width: 420px;
  margin: 6px 0 0;
  color: #7b8e9f;
  font-size: 13px;
  line-height: 1.7;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}

.empty-route-hints {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 7px 18px;
  margin-top: 14px;
  color: #7890a2;
  font-size: 11px;
}

.empty-route-hints span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.empty-route-hints .el-icon {
  color: #72a5c6;
}

.empty-state-error .empty-visual {
  background: #f2f6fa;
  color: #7990a4;
}

.empty-state-error .empty-visual :deep(svg) {
  animation: spin 1.2s linear infinite;
}

.empty-state-error h2 {
  margin-top: 24px;
}

.join-dialog :deep(.el-dialog__body) {
  padding-top: 2px;
}

.join-dialog :deep(.el-tabs__header) {
  margin-bottom: 12px;
}

.join-dialog :deep(.el-input__wrapper),
.join-dialog :deep(.el-select__wrapper) {
  min-height: 44px;
}

.dialog-intro,
.join-tab-hint {
  color: #75899b;
  font-size: 13px;
  line-height: 1.7;
}

.dialog-intro {
  margin: 0 0 10px;
}

.join-tab-hint {
  margin: 0 0 12px;
}

.public-empty-help {
  margin: -10px 0 0;
  color: #9aa8b4;
  font-size: 11px;
}

.join-dialog :deep(.el-tabs__item) {
  font-weight: 650;
}

.join-dialog :deep(.el-form-item__label) {
  color: #506b82;
  font-weight: 650;
}

.public-class-select {
  width: 100%;
}

.public-class-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.public-class-option span,
.public-class-option small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-class-option small {
  flex: 0 0 auto;
  color: #8797a7;
}

.public-class-results {
  display: grid;
  max-height: 310px;
  gap: 10px;
  margin-top: 4px;
  overflow-y: auto;
  padding: 2px 4px 2px 0;
}

.public-class-card {
  width: 100%;
  padding: 13px 14px;
  border: 1px solid #dfe9f1;
  border-radius: 11px;
  background: #ffffff;
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease;
}

.public-class-card:hover,
.public-class-card.active {
  border-color: #79b9df;
  background: #f3faff;
}

.public-class-heading {
  display: flex;
  align-items: center;
  gap: 10px;
}

.public-class-heading > div:nth-child(2) {
  min-width: 0;
  flex: 1;
}

.public-class-avatar {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: #e7f3fc;
  color: #347ba8;
  font-size: 15px;
  font-weight: 700;
}

.public-class-heading h3 {
  margin: 0;
  overflow: hidden;
  color: #2b465c;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-class-heading p {
  margin: 3px 0 0;
  overflow: hidden;
  color: #8798a8;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-class-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px 14px;
  margin: 12px 0 0 44px;
  color: #7b8e9f;
  font-size: 11px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 900px) {
  .hero-panel {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions {
    justify-content: flex-start;
  }

  .overview-card {
    align-items: flex-start;
    flex-direction: column;
    gap: 17px;
  }

  .overview-items {
    width: 100%;
  }
}

@media (max-width: 980px) {
  .class-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .student-class-page {
    padding: 18px 14px 36px;
  }

  .hero-panel {
    min-height: 0;
    padding: 24px 20px 22px;
  }

  .hero-copy h1 {
    font-size: 30px;
  }

  .hero-actions {
    width: 100%;
  }

  .hero-actions .el-button:not(.is-circle) {
    flex: 1 1 auto;
  }

  .overview-card {
    padding: 14px;
  }

  .overview-items {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 12px;
  }

  .overview-item {
    padding: 0 12px;
  }

  .overview-item:nth-child(odd) {
    padding-left: 0;
    border-left: 0;
  }

  .section-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .section-header h2 {
    font-size: 23px;
  }

  .class-grid {
    grid-template-columns: 1fr;
  }

  .class-card-footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .card-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .empty-state {
    min-height: 280px;
    padding: 25px 14px;
  }
}
</style>
