<template>
  <main class="class-manage-page">
    <div class="page-header">
      <h2>班级管理</h2>
      <el-button type="primary" @click="openCreateDialog">创建班级</el-button>
    </div>

    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="queryParams" size="default">
        <el-form-item label="班级名称">
          <el-input v-model="queryParams.className" placeholder="请输入" clearable />
        </el-form-item>
        <el-form-item label="学段">
          <el-select v-model="queryParams.grade" placeholder="全部" clearable style="width:120px">
            <el-option label="研一" value="研一" />
            <el-option label="研二" value="研二" />
            <el-option label="研三" value="研三" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.classStatus" placeholder="全部" clearable style="width:120px">
            <el-option label="正常" :value="1" />
            <el-option label="已归档" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="table-card" shadow="never">
      <el-table :data="classList" v-loading="loading" border stripe>
        <el-table-column prop="className" label="班级名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="grade" label="学段" width="80" align="center" />
        <el-table-column prop="school" label="学校" min-width="160" show-overflow-tooltip />
        <el-table-column prop="studentCount" label="学生数" width="80" align="center" />
        <el-table-column label="加入方式" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.joinType === 2 ? 'success' : 'info'" size="small">
              {{ row.joinType === 2 ? '公开加入' : '邀请码' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.classStatus === 1 ? 'success' : 'warning'" size="small">
              {{ row.classStatus === 1 ? '正常' : '已归档' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="goToDetail(row)">
              详情
            </el-button>
            <el-button type="primary" link size="small" @click="openEditDialog(row)">
              编辑
            </el-button>
            <el-button
              :type="row.classStatus === 1 ? 'warning' : 'success'"
              link
              size="small"
              @click="handleArchiveToggle(row)"
            >
              {{ row.classStatus === 1 ? '归档' : '恢复' }}
            </el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
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
        <el-form-item v-if="!isEditing && formData.joinType === 1" label="邀请码" prop="classCode">
          <el-input v-model="formData.classCode" placeholder="不填则自动生成" maxlength="30" />
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
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
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
  joinType: 1,
  classCode: ''
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
  formData.classCode = ''
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
  formData.classCode = ''
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
        joinType: formData.joinType,
        classCode: formData.classCode.trim() || undefined
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
  padding: 24px;
  background: #f4f6f9;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  font-weight: 600;
}

.filter-card {
  margin-bottom: 16px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
}

.table-card {
  border: 1px solid #e5eaf2;
  border-radius: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
