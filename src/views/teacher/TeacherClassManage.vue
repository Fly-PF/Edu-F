<template>
  <main class="class-manage-page">
    <section class="page-hero">
      <div class="hero-copy">
        <div class="hero-kicker">
          <span class="kicker-mark"></span>
          <span>教师工作台</span>
          <span class="kicker-divider">/</span>
          <span>班级管理</span>
        </div>
        <h1>把每个班级，带进清晰的学习节奏</h1>
        <p>集中查看班级状态、学生规模与加入方式，让日常教学安排更从容。</p>
      </div>
      <div class="hero-actions">
        <div class="hero-note">
          <el-icon><InfoFilled /></el-icon>
          <span>班级邀请码可在详情页管理</span>
        </div>
        <el-button class="create-button" type="primary" @click="openCreateDialog">
          <el-icon><Plus /></el-icon>
          创建班级
        </el-button>
      </div>
    </section>

    <section class="summary-grid" aria-label="班级概览">
      <article class="summary-card total-summary">
        <div class="summary-icon"><el-icon><School /></el-icon></div>
        <div>
          <span class="summary-label">班级总数</span>
          <strong>{{ total }}</strong>
          <small>已创建的教学班级</small>
        </div>
      </article>
      <article class="summary-card active-summary">
        <div class="summary-icon"><el-icon><Calendar /></el-icon></div>
        <div>
          <span class="summary-label">当前页正常班级</span>
          <strong>{{ activeClassCount }}</strong>
          <small>正在进行教学安排</small>
        </div>
      </article>
      <article class="summary-card student-summary">
        <div class="summary-icon"><el-icon><UserFilled /></el-icon></div>
        <div>
          <span class="summary-label">当前页学生</span>
          <strong>{{ studentCount }}</strong>
          <small>已加入班级的学生</small>
        </div>
      </article>
    </section>

    <el-card class="filter-card" shadow="never">
      <div class="section-heading filter-heading">
        <div>
          <span class="section-kicker">CLASS DIRECTORY</span>
          <h2>筛选班级</h2>
        </div>
        <span class="section-hint">按条件快速定位教学班级</span>
      </div>
      <el-form class="filter-form" :inline="true" :model="queryParams" size="default">
        <el-form-item label="班级名称">
          <el-input v-model="queryParams.className" class="name-filter" placeholder="输入班级名称" clearable />
        </el-form-item>
        <el-form-item label="学段">
          <el-select v-model="queryParams.grade" class="select-filter" placeholder="全部学段" clearable>
            <el-option label="研一" value="研一" />
            <el-option label="研二" value="研二" />
            <el-option label="研三" value="研三" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.classStatus" class="select-filter" placeholder="全部状态" clearable>
            <el-option label="正常" :value="1" />
            <el-option label="已归档" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item class="filter-actions">
          <el-button class="search-button" type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button class="reset-button" @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <div class="section-heading table-heading">
        <div>
          <span class="section-kicker">MY CLASSES</span>
          <h2>班级目录</h2>
          <p>查看班级规模、加入方式与当前教学状态</p>
        </div>
        <div class="table-count">
          <span class="count-mark"></span>
          <span>{{ total }} 个班级</span>
        </div>
      </div>

      <el-table class="class-table" :data="classList" v-loading="loading" border stripe>
        <el-table-column label="班级名称" min-width="190" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="class-name-cell">
              <div class="class-name-icon"><el-icon><School /></el-icon></div>
              <div>
                <strong>{{ row.className || '未命名班级' }}</strong>
                <span>教学班级</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="grade" label="学段" width="92" align="center" />
        <el-table-column prop="school" label="学校" min-width="170" show-overflow-tooltip />
        <el-table-column label="学生数" width="110" align="center">
          <template #default="{ row }">
            <span class="student-count"><el-icon><UserFilled /></el-icon>{{ row.studentCount ?? 0 }} 人</span>
          </template>
        </el-table-column>
        <el-table-column label="加入方式" width="120" align="center">
          <template #default="{ row }">
            <el-tag class="status-tag" :type="row.joinType === 2 ? 'success' : 'info'" size="small">
              {{ row.joinType === 2 ? '公开加入' : '邀请码' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="92" align="center">
          <template #default="{ row }">
            <el-tag class="status-tag" :type="row.classStatus === 1 ? 'success' : 'warning'" size="small">
              {{ row.classStatus === 1 ? '正常' : '已归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="290" fixed="right">
          <template #default="{ row }">
            <el-button class="row-action" type="primary" link size="small" @click="goToDetail(row)">
              详情
              <el-icon><ArrowRight /></el-icon>
            </el-button>
            <el-button class="row-action" type="primary" link size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button
              class="row-action"
              :type="row.classStatus === 1 ? 'warning' : 'success'"
              link
              size="small"
              @click="handleArchiveToggle(row)"
            >
              {{ row.classStatus === 1 ? '归档' : '恢复' }}
            </el-button>
            <el-button class="row-action" type="danger" link size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty-state">
            <div class="empty-icon"><el-icon><School /></el-icon></div>
            <strong>还没有班级</strong>
            <p>创建一个班级后，这里会显示班级规模和教学状态。</p>
            <el-button type="primary" @click="openCreateDialog">
              <el-icon><Plus /></el-icon>
              建立第一个班级
            </el-button>
          </div>
        </template>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pageNum"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="fetchClasses"
          @size-change="fetchClasses"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      class="class-dialog"
      :title="isEditing ? '编辑班级' : '创建班级'"
      width="520px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="班级名称" prop="className">
          <el-input v-model="formData.className" placeholder="请输入班级名称" maxlength="50" />
        </el-form-item>
        <el-form-item label="学段" prop="grade">
          <el-input v-model="formData.grade" placeholder="请输入学段" maxlength="20" />
        </el-form-item>
        <el-form-item label="所属学校" prop="school">
          <el-input v-model="formData.school" placeholder="请输入所属学校" maxlength="50" />
        </el-form-item>
        <el-form-item label="加入方式" prop="joinType">
          <el-radio-group v-model="formData.joinType">
            <el-radio :value="1">仅邀请码加入</el-radio>
            <el-radio :value="2">公开可直接加入</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">
          {{ isEditing ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>
  </main>
</template>

<script setup>
import { computed, ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowRight,
  Calendar,
  InfoFilled,
  Plus,
  Refresh,
  School,
  Search,
  UserFilled,
} from '@element-plus/icons-vue'
import {
  getTeacherClassList,
  createTeacherClass,
  updateTeacherClass,
  updateTeacherClassStatus,
  deleteTeacherClass
} from '@/api/teacherClass'

const router = useRouter()

const loading = ref(false)
const classList = ref([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

const activeClassCount = computed(() => classList.value.filter((item) => item.classStatus === 1).length)
const studentCount = computed(() => classList.value.reduce((sum, item) => sum + Number(item.studentCount || 0), 0))

const queryParams = reactive({
  className: '',
  grade: '',
  classStatus: null
})

const dialogVisible = ref(false)
const isEditing = ref(false)
const submitting = ref(false)
const editingId = ref(null)
const formRef = ref(null)

const formData = reactive({
  className: '',
  grade: '',
  school: '',
  joinType: 1
})

const formRules = {
  className: [{ required: true, message: '请输入班级名称', trigger: 'blur' }],
  grade: [{ required: true, message: '请输入学段', trigger: 'blur' }],
  school: [{ required: true, message: '请输入所属学校', trigger: 'blur' }],
  joinType: [{ required: true, message: '请选择加入方式', trigger: 'change' }]
}

async function fetchClasses() {
  loading.value = true
  try {
    const params = {
      pageNum: pageNum.value,
      pageSize: pageSize.value
    }
    if (queryParams.className) params.className = queryParams.className
    if (queryParams.grade) params.grade = queryParams.grade
    if (queryParams.classStatus !== null) {
      params.classStatus = queryParams.classStatus
    }
    const res = await getTeacherClassList(params)
    if (res.code === 200 && res.data) {
      classList.value = res.data.records || []
      total.value = res.data.total || 0
    } else {
      ElMessage.error(res.message || '查询失败')
    }
  } catch (e) {
    ElMessage.error('获取班级列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pageNum.value = 1
  fetchClasses()
}

function handleReset() {
  queryParams.className = ''
  queryParams.grade = ''
  queryParams.classStatus = null
  pageNum.value = 1
  fetchClasses()
}

function openCreateDialog() {
  isEditing.value = false
  editingId.value = null
  formData.className = ''
  formData.grade = ''
  formData.school = ''
  formData.joinType = 1
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function openEditDialog(row) {
  isEditing.value = true
  editingId.value = row.id
  formData.className = row.className
  formData.grade = row.grade
  formData.school = row.school
  formData.joinType = row.joinType
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

async function submitForm() {
  try {
    const valid = await formRef.value?.validate()
    if (!valid) return
  } catch {
    return
  }

  submitting.value = true
  try {
    let res
    if (isEditing.value) {
      res = await updateTeacherClass(editingId.value, {
        className: formData.className.trim(),
        grade: formData.grade.trim(),
        school: formData.school.trim(),
        joinType: formData.joinType
      })
    } else {
      res = await createTeacherClass({
        className: formData.className.trim(),
        grade: formData.grade.trim(),
        school: formData.school.trim(),
        joinType: formData.joinType
      })
    }
    if (res.code === 200) {
      ElMessage.success(isEditing.value ? '修改成功' : '创建成功')
      dialogVisible.value = false
      fetchClasses()
    } else {
      ElMessage.error(res.message || '操作失败')
    }
  } catch (e) {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}

async function handleArchiveToggle(row) {
  const newStatus = row.classStatus === 1 ? 0 : 1
  const actionText = newStatus === 0 ? '归档' : '恢复'
  try {
    await ElMessageBox.confirm(
      `确定${actionText}班级「${row.className}」吗？`,
      '提示',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const res = await updateTeacherClassStatus(row.id, { classStatus: newStatus })
    if (res.code === 200) {
      ElMessage.success(`${actionText}成功`)
      fetchClasses()
    } else {
      ElMessage.error(res.message || `${actionText}失败`)
    }
  } catch {
    // cancelled
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除班级「${row.className}」吗？删除后不可恢复。`,
      '警告',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'error' }
    )
    const res = await deleteTeacherClass(row.id)
    if (res.code === 200) {
      ElMessage.success('删除成功')
      fetchClasses()
    } else {
      ElMessage.error(res.message || '删除失败')
    }
  } catch {
    // cancelled
  }
}

function goToDetail(row) {
  router.push({
    name: 'teacher-class-detail',
    query: { classId: row.id }
  })
}

onMounted(() => {
  fetchClasses()
})
</script>

<style scoped>
.class-manage-page {
  min-height: 100%;
  padding: 28px clamp(20px, 3.5vw, 48px) 44px;
  background: #f3f7fa;
}

.page-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  min-height: 168px;
  padding: 28px 32px;
  border: 1px solid #d9e6ef;
  border-radius: 8px;
  background: #154d6c;
  color: #ffffff;
  box-shadow: 0 12px 28px rgb(31 78 107 / 12%);
}

.hero-copy {
  min-width: 0;
}

.hero-kicker {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #bce5e5;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.kicker-mark,
.count-mark {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: #67d5c6;
}

.kicker-divider {
  color: #73a9b3;
}

.hero-copy h1 {
  margin: 14px 0 0;
  color: #ffffff;
  font-size: clamp(24px, 2.2vw, 32px);
  font-weight: 700;
  line-height: 1.25;
}

.hero-copy p {
  max-width: 620px;
  margin: 12px 0 0;
  color: #d8edf0;
  font-size: 14px;
  line-height: 1.7;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: 0 0 auto;
  gap: 18px;
}

.hero-note {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #d8edf0;
  font-size: 12px;
  white-space: nowrap;
}

.hero-note .el-icon {
  color: #79d9cb;
}

.create-button {
  min-width: 132px;
  height: 42px;
  border: 0;
  border-radius: 6px;
  background: #f6c85f;
  color: #173b53;
  font-weight: 700;
  box-shadow: 0 8px 18px rgb(3 34 50 / 18%);
}

.create-button:hover,
.create-button:focus-visible {
  border-color: #ffdc86;
  background: #ffdc86;
  color: #173b53;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin: 18px 0;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 15px;
  min-height: 112px;
  padding: 20px;
  border: 1px solid #dde8ef;
  border-top: 3px solid #3fa9a0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 18px rgb(18 59 82 / 5%);
}

.active-summary {
  border-top-color: #4b8ed8;
}

.student-summary {
  border-top-color: #e8ae46;
}

.summary-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #e7f5f4;
  color: #168b84;
  font-size: 20px;
}

.active-summary .summary-icon {
  background: #e9f1fb;
  color: #3479bd;
}

.student-summary .summary-icon {
  background: #fff4dc;
  color: #b77a1d;
}

.summary-label {
  display: block;
  color: #657786;
  font-size: 12px;
  line-height: 1.2;
}

.summary-card strong {
  display: block;
  margin-top: 5px;
  color: #173b53;
  font-size: 26px;
  line-height: 1;
}

.summary-card small {
  display: block;
  margin-top: 7px;
  color: #9aaab5;
  font-size: 12px;
}

.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.section-kicker {
  display: block;
  color: #6f9baa;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  line-height: 1.2;
}

.section-heading h2 {
  margin: 7px 0 0;
  color: #173b53;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.section-hint {
  padding-top: 2px;
  color: #94a5af;
  font-size: 12px;
}

.filter-card,
.table-card {
  border: 1px solid #dce7ee;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 20px rgb(18 59 82 / 4%);
}

.filter-card {
  margin-bottom: 18px;
}

.filter-card :deep(.el-card__body) {
  padding: 22px 24px 12px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0 22px;
  margin-top: 22px;
}

.filter-form :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 12px;
}

.filter-form :deep(.el-form-item__label) {
  color: #637783;
  font-size: 13px;
  font-weight: 600;
}

.name-filter {
  width: 220px;
}

.select-filter {
  width: 142px;
}

.filter-form :deep(.el-input__wrapper),
.filter-form :deep(.el-select__wrapper) {
  min-height: 38px;
  border: 1px solid #d8e4eb;
  border-radius: 5px;
  box-shadow: none;
}

.filter-form :deep(.el-input__wrapper.is-focus),
.filter-form :deep(.el-select__wrapper.is-focused) {
  border-color: #3d9ba0;
  box-shadow: 0 0 0 2px rgb(61 155 160 / 12%);
}

.filter-actions {
  margin-left: auto;
}

.filter-actions .el-button {
  height: 38px;
  border-radius: 5px;
  font-weight: 600;
}

.search-button {
  border-color: #2f8c98;
  background: #2f8c98;
}

.search-button:hover,
.search-button:focus-visible {
  border-color: #24737d;
  background: #24737d;
}

.reset-button {
  border-color: #d8e4eb;
  color: #637783;
}

.table-card :deep(.el-card__body) {
  padding: 24px;
}

.table-heading {
  align-items: center;
  margin-bottom: 20px;
}

.table-heading p {
  margin: 6px 0 0;
  color: #8b9ca7;
  font-size: 12px;
}

.table-count {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border: 1px solid #d9eceb;
  border-radius: 5px;
  background: #f3fbfa;
  color: #337b7b;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.class-table {
  --el-table-border-color: #e3ebef;
  --el-table-header-bg-color: #f5f9fa;
  --el-table-row-hover-bg-color: #f5fbfb;
  color: #3f5662;
}

.class-table :deep(.el-table__header-wrapper th) {
  height: 46px;
  color: #5c737e;
  font-size: 12px;
  font-weight: 700;
}

.class-table :deep(.el-table__body-wrapper td) {
  height: 66px;
  color: #4d626d;
  font-size: 13px;
}

.class-name-cell {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.class-name-icon {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 6px;
  background: #e7f5f4;
  color: #168b84;
  font-size: 17px;
}

.class-name-cell strong,
.class-name-cell span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.class-name-cell strong {
  color: #173b53;
  font-size: 13px;
  font-weight: 700;
}

.class-name-cell span {
  margin-top: 4px;
  color: #9aaab5;
  font-size: 11px;
}

.student-count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #526d79;
  font-weight: 600;
}

.student-count .el-icon {
  color: #5695b2;
}

.status-tag {
  border-radius: 4px;
  font-weight: 600;
}

.row-action {
  margin-right: 9px;
  font-weight: 600;
}

.row-action .el-icon {
  margin-left: 3px;
}

.empty-state {
  display: flex;
  min-height: 220px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 28px 20px;
}

.empty-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 8px;
  background: #e7f5f4;
  color: #168b84;
  font-size: 24px;
}

.empty-state strong {
  margin-top: 14px;
  color: #173b53;
  font-size: 15px;
}

.empty-state p {
  margin: 7px 0 16px;
  color: #8a9aa4;
  font-size: 12px;
  text-align: center;
}

.empty-state .el-button {
  height: 36px;
  border-radius: 5px;
  background: #2f8c98;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.pagination-wrapper :deep(.el-pagination) {
  --el-pagination-button-bg-color: #f5f9fa;
  --el-pagination-hover-color: #2f8c98;
}

:deep(.el-dialog) {
  border-radius: 8px;
}

:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 22px 24px 16px;
  border-bottom: 1px solid #e6eef2;
}

:deep(.el-dialog__title) {
  color: #173b53;
  font-size: 18px;
  font-weight: 700;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

@media (max-width: 900px) {
  .page-hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .hero-actions {
    width: 100%;
    align-items: flex-start;
    flex-direction: row;
    justify-content: space-between;
  }

  .filter-actions {
    margin-left: 0;
  }

  .table-card :deep(.el-card__body),
  .filter-card :deep(.el-card__body) {
    padding-right: 18px;
    padding-left: 18px;
  }
}

@media (max-width: 640px) {
  :global(.class-dialog) {
    width: calc(100vw - 24px) !important;
    margin: 12px auto;
  }

  :global(.class-dialog .el-dialog__body) {
    padding: 20px 16px;
  }

  :global(.class-dialog .el-form-item__content) {
    min-width: 0;
  }

  :global(.class-dialog .el-radio-group) {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .class-manage-page {
    padding: 18px 14px 28px;
  }

  .page-hero {
    min-height: 0;
    padding: 22px 20px;
  }

  .hero-copy h1 {
    font-size: 24px;
  }

  .hero-actions {
    align-items: stretch;
    flex-direction: column;
    gap: 14px;
  }

  .hero-note {
    white-space: normal;
  }

  .create-button {
    width: 100%;
  }

  .summary-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    margin: 14px 0;
  }

  .summary-card {
    min-height: 92px;
    padding: 16px;
  }

  .section-heading {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .filter-form {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }

  .name-filter,
  .select-filter {
    width: 100%;
  }

  .filter-actions {
    display: flex;
    gap: 10px;
  }

  .filter-actions .el-button {
    flex: 1;
  }

  .table-card :deep(.el-card__body) {
    padding: 18px 12px;
  }

  .pagination-wrapper {
    justify-content: center;
    overflow-x: auto;
    padding-bottom: 2px;
  }

  .pagination-wrapper :deep(.el-pagination) {
    flex-wrap: nowrap;
  }
}

</style>

<style>
@import '@/assets/creative-lab.css';
</style>
