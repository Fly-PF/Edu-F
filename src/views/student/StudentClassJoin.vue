<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Document, Plus, Promotion, RefreshRight, School } from '@element-plus/icons-vue'
import {
  joinStudentClass,
  leaveStudentClass,
  listJoinablePublicClasses,
  listStudentClasses,
} from '@/api/studentClass'

const router = useRouter()
const loading = ref(false)
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

async function loadClasses() {
  loading.value = true
  try {
    classes.value = (await listStudentClasses()) || []
  } catch (error) {
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
      <div class="hero-copy">
        <p class="eyebrow">MY CLASSES</p>
        <h1>学生班级列表 / 加入班级</h1>
        <p>
          查看你已经加入的班级，通过邀请码加入老师班级，或者通过公开班级 ID 直接加入开放班级。
        </p>
      </div>

      <div class="hero-actions">
        <el-button type="primary" @click="openJoinDialog('invite')">
          <el-icon><Promotion /></el-icon>
          邀请码加入
        </el-button>
        <el-button @click="openJoinDialog('public')">
          <el-icon><Plus /></el-icon>
          公开班级加入
        </el-button>
        <el-button circle :loading="loading" aria-label="刷新班级" @click="loadClasses">
          <el-icon><RefreshRight /></el-icon>
        </el-button>
      </div>
    </section>

    <section class="stats-band">
      <article>
        <span>已加入班级</span>
        <strong>{{ stats.total }}</strong>
      </article>
      <article>
        <span>进行中班级</span>
        <strong>{{ stats.active }}</strong>
      </article>
      <article>
        <span>班级课程数</span>
        <strong>{{ stats.totalCourses }}</strong>
      </article>
      <article>
        <span>班级总人数</span>
        <strong>{{ stats.totalStudents }}</strong>
      </article>
    </section>

    <section class="content-grid">
      <aside class="guide-panel">
        <div class="guide-card">
          <span class="guide-icon"><Connection /></span>
          <h2>加入方式</h2>
          <p>邀请码适合老师定向拉班，公开班级 ID 适合直接进入开放班级。</p>
        </div>
        <div class="guide-card">
          <span class="guide-icon"><School /></span>
          <h2>班级信息</h2>
          <p>列表会展示老师、学段、学校、课程数和入班时间，方便你快速回到学习入口。</p>
        </div>
      </aside>

      <main class="class-list-panel" v-loading="loading">
        <header class="panel-header">
          <div>
            <h2>我的班级</h2>
            <p>共 {{ classes.length }} 个班级</p>
          </div>
        </header>

        <div v-if="classes.length" class="class-grid">
          <article v-for="item in classes" :key="item.classId" class="class-card">
            <div class="card-top">
              <div>
                <h3>{{ item.className }}</h3>
                <p>{{ item.school }} / {{ item.grade }}</p>
              </div>
              <el-tag size="small" :type="statusType(item.status)">{{ statusText(item.status) }}</el-tag>
            </div>

            <div class="tag-row">
              <el-tag effect="plain">{{ joinTypeText(item.joinType) }}</el-tag>
              <el-tag effect="plain" type="info">邀请码 {{ item.classCode }}</el-tag>
            </div>

            <dl class="meta-grid">
              <div>
                <dt>老师</dt>
                <dd>{{ item.teacherName || '未设置' }}</dd>
              </div>
              <div>
                <dt>课程数</dt>
                <dd>{{ item.assignedCourseCount || 0 }}</dd>
              </div>
              <div>
                <dt>班级人数</dt>
                <dd>{{ item.studentCount || 0 }}</dd>
              </div>
              <div>
                <dt>加入时间</dt>
                <dd>{{ formatDate(item.joinTime) }}</dd>
              </div>
            </dl>

            <div class="card-actions">
              <el-button type="primary" plain @click="openClassDetail(item)">
                <el-icon><Document /></el-icon>
                详情
              </el-button>
              <el-button type="danger" plain @click="handleLeave(item)">退出班级</el-button>
            </div>
          </article>
        </div>

        <el-empty
          v-else
          description="你还没有加入任何班级"
        >
          <el-button type="primary" @click="openJoinDialog('invite')">立即加入</el-button>
        </el-empty>
      </main>
    </section>

    <el-dialog v-model="joinVisible" title="加入班级" width="min(560px, 92vw)">
      <el-tabs v-model="joinMode">
        <el-tab-pane label="邀请码加入" name="invite">
          <el-form label-position="top">
            <el-form-item label="班级邀请码">
              <el-input
                v-model.trim="joinForm.classCode"
                maxlength="30"
                placeholder="请输入老师提供的邀请码"
              />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="公开班级加入" name="public">
          <el-form label-position="top">
            <el-form-item label="公开班级">
              <el-select
                v-model="joinForm.classId"
                class="public-class-select"
                clearable
                filterable
                remote
                :remote-method="loadPublicClasses"
                :loading="publicClasses.loading"
                placeholder="搜索或选择公开班级"
              >
                <el-option
                  v-for="item in publicClasses.records"
                  :key="item.classId"
                  :label="publicClassLabel(item)"
                  :value="item.classId"
                >
                  <div class="public-class-option">
                    <span>{{ item.className }}</span>
                    <small>{{ item.teacherName || '未设置老师' }} / {{ item.grade || '-' }}</small>
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
              <div class="card-top">
                <div>
                  <h3>{{ item.className }}</h3>
                  <p>{{ item.school || '-' }} / {{ item.grade || '-' }}</p>
                </div>
                <el-tag size="small" type="success">公开</el-tag>
              </div>

              <dl class="meta-grid compact">
                <div>
                  <dt>老师</dt>
                  <dd>{{ item.teacherName || '未设置' }}</dd>
                </div>
                <div>
                  <dt>课程数</dt>
                  <dd>{{ item.assignedCourseCount || 0 }}</dd>
                </div>
                <div>
                  <dt>班级人数</dt>
                  <dd>{{ item.studentCount || 0 }}</dd>
                </div>
                <div>
                  <dt>状态</dt>
                  <dd>{{ statusText(item.status) }}</dd>
                </div>
              </dl>
            </button>

            <el-empty
              v-if="!publicClasses.loading && !publicClasses.records.length"
              description="暂无可加入公开班级"
            />
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <el-button @click="joinVisible = false">取消</el-button>
        <el-button type="primary" :loading="joining" @click="submitJoin">确认加入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.student-class-page {
  min-height: 100%;
  padding: 28px;
  background:
    radial-gradient(circle at top left, rgb(70 130 180 / 10%), transparent 34%),
    linear-gradient(180deg, #f7fbff 0%, #f3f6fb 100%);
  color: #172033;
}

.hero-panel {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 30px 32px;
  border: 1px solid #dce7f4;
  border-radius: 24px;
  background: rgb(255 255 255 / 88%);
  box-shadow: 0 18px 48px rgb(41 72 120 / 10%);
  backdrop-filter: blur(14px);
}

.hero-copy {
  max-width: 720px;
}

.eyebrow {
  margin: 0 0 10px;
  color: #2966b8;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.16em;
}

.hero-copy h1 {
  margin: 0;
  font-size: 34px;
  line-height: 1.15;
}

.hero-copy p:last-child {
  margin: 14px 0 0;
  color: #5e6c82;
  font-size: 15px;
  line-height: 1.8;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.stats-band {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-top: 20px;
}

.stats-band article,
.guide-card,
.class-list-panel,
.class-card {
  border: 1px solid #e0e7f1;
  background: rgb(255 255 255 / 92%);
  box-shadow: 0 12px 32px rgb(35 63 108 / 7%);
}

.stats-band article {
  padding: 20px 22px;
  border-radius: 18px;
}

.stats-band span,
.stats-band strong {
  display: block;
}

.stats-band span {
  color: #738197;
  font-size: 13px;
}

.stats-band strong {
  margin-top: 8px;
  font-size: 28px;
}

.content-grid {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  gap: 18px;
  margin-top: 20px;
}

.guide-panel {
  display: grid;
  gap: 18px;
}

.guide-card {
  padding: 22px;
  border-radius: 20px;
}

.guide-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(135deg, #d8ebff 0%, #edf6ff 100%);
  color: #2563b8;
}

.guide-icon :deep(svg) {
  width: 22px;
}

.guide-card h2 {
  margin: 16px 0 10px;
  font-size: 18px;
}

.guide-card p,
.panel-header p {
  margin: 0;
  color: #6d798d;
  line-height: 1.7;
}

.class-list-panel {
  min-width: 0;
  padding: 22px;
  border-radius: 22px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-header h2 {
  margin: 0;
  font-size: 22px;
}

.class-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 18px;
}

.class-card {
  padding: 18px;
  border-radius: 18px;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-top h3 {
  margin: 0;
  font-size: 18px;
}

.card-top p {
  margin: 6px 0 0;
  color: #7a879a;
  font-size: 13px;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 18px;
  margin: 18px 0 0;
}

.meta-grid dt {
  color: #7a8799;
  font-size: 12px;
}

.meta-grid dd {
  margin: 6px 0 0;
  color: #1d2737;
  font-size: 14px;
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 18px;
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
  color: #7a8799;
}

.public-class-results {
  display: grid;
  max-height: 320px;
  gap: 12px;
  margin-top: 12px;
  overflow-y: auto;
  padding: 2px 4px 2px 0;
}

.public-class-card {
  width: 100%;
  min-height: 164px;
  padding: 16px;
  border: 1px solid #dfe8f4;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 10px 24px rgb(35 63 108 / 6%);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.public-class-card.active {
  border-color: #409eff;
  background: #f2f8ff;
  box-shadow: 0 12px 26px rgb(64 158 255 / 15%);
}

.meta-grid.compact {
  gap: 12px;
  margin-top: 14px;
}

@media (max-width: 1100px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .guide-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .student-class-page {
    padding: 18px;
  }

  .hero-panel {
    flex-direction: column;
    padding: 24px;
  }

  .hero-copy h1 {
    font-size: 28px;
  }

  .hero-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .stats-band,
  .class-grid,
  .guide-panel {
    grid-template-columns: 1fr;
  }
}
</style>
