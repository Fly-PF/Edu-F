<script setup>
import { nextTick, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createGovMaterialCategory,
  deleteGovMaterialCategory,
  listAdminGovMaterialCategories,
  updateGovMaterialCategory,
} from '@/api/govMaterial'

const listLoading = ref(false)
const tableData = ref([])

const formRef = ref(null)
const dialogVisible = ref(false)
const dialogMode = ref('create')
const submitLoading = ref(false)
const formError = ref('')
const currentId = ref(null)
const originalStatus = ref(null)

const form = reactive(getDefaultForm())

const statusOptions = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

const rules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 1, max: 50, message: '分类名称不能超过50个字符', trigger: 'blur' },
  ],
  sortOrder: [{ required: true, message: '请输入展示排序', trigger: 'blur' }],
}

function getDefaultForm() {
  return {
    name: '',
    sortOrder: 0,
    status: 1,
  }
}

function resetForm() {
  Object.assign(form, getDefaultForm())
  currentId.value = null
  originalStatus.value = null
  formError.value = ''
  nextTick(() => formRef.value?.clearValidate())
}

function assertResponse(res, fallbackMessage = '操作失败') {
  if (res?.code !== 200 && res?.code !== 201) {
    throw new Error(res?.message || fallbackMessage)
  }
  return res.data
}

function getErrorMessage(error, fallbackMessage = '操作失败') {
  return error?.response?.data?.message || error?.message || fallbackMessage
}

async function loadList() {
  listLoading.value = true
  try {
    const data = assertResponse(await listAdminGovMaterialCategories(), '查询分类列表失败')
    tableData.value = (data || []).map((item) => ({
      ...item,
      status: Number(item.status),
    }))
  } catch (error) {
    tableData.value = []
    ElMessage.error(getErrorMessage(error, '查询分类列表失败'))
  } finally {
    listLoading.value = false
  }
}

function openCreateDialog() {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  resetForm()
  currentId.value = row.id
  originalStatus.value = row.status ?? 1
  Object.assign(form, {
    name: row.name || '',
    sortOrder: row.sortOrder ?? 0,
    status: row.status ?? 1,
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  formError.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const disablingCategory = form.status === 0
    && (dialogMode.value === 'create' || Number(originalStatus.value) !== 0)
  if (disablingCategory) {
    try {
      await ElMessageBox.confirm(
        '如果您禁用，那么该分类下的那些资料链接也将会不再被显示。',
        '停用确认',
        {
          confirmButtonText: '确认停用',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
    } catch {
      return
    }
  }

  submitLoading.value = true
  try {
    const payload = {
      name: form.name.trim(),
      sortOrder: Number(form.sortOrder || 0),
      status: form.status,
    }
    const res = dialogMode.value === 'edit'
      ? await updateGovMaterialCategory(currentId.value, payload)
      : await createGovMaterialCategory(payload)
    assertResponse(res, dialogMode.value === 'edit' ? '修改分类失败' : '新增分类失败')
    dialogVisible.value = false
    ElMessage.success(res.message || (dialogMode.value === 'edit' ? '修改成功' : '新增成功'))
    await loadList()
  } catch (error) {
    formError.value = getErrorMessage(error, dialogMode.value === 'edit' ? '修改分类失败' : '新增分类失败')
    ElMessage.error(formError.value)
  } finally {
    submitLoading.value = false
  }
}

async function handleStatusToggle(row) {
  const nextStatus = row.status === 0 ? 1 : 0
  const actionText = nextStatus === 1 ? '启用' : '停用'
  try {
    if (nextStatus === 0) {
      await ElMessageBox.confirm(
        '如果您禁用，那么该分类下的那些资料链接也将会不再被显示。',
        '停用确认',
        {
          confirmButtonText: '确认停用',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
    } else {
      await ElMessageBox.confirm(`确认${actionText}分类“${row.name}”吗？`, `${actionText}确认`, {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning',
      })
    }
  } catch {
    return
  }

  listLoading.value = true
  try {
    const res = await updateGovMaterialCategory(row.id, {
      name: row.name,
      sortOrder: row.sortOrder,
      status: nextStatus,
    })
    assertResponse(res, `${actionText}失败`)
    ElMessage.success(res.message || `${actionText}成功`)
    await loadList()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, `${actionText}失败`))
  } finally {
    listLoading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('删除后无法恢复，确认继续删除吗？', '删除确认', {
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
      type: 'error',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }

  listLoading.value = true
  try {
    const res = await deleteGovMaterialCategory(row.id)
    assertResponse(res, '删除失败')
    ElMessage.success(res.message || '删除成功')
    await loadList()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '删除失败'))
  } finally {
    listLoading.value = false
  }
}

function formatStatus(row) {
  return row.status === 0 ? '停用' : '启用'
}

function getRowClassName({ row }) {
  return row.status === 0 ? 'disabled-category-row' : ''
}

loadList()
</script>

<template>
  <main class="category-manage-page">
    <section class="toolbar-section">
      <div class="title-block">
        <h1>资料分类管理</h1>
      </div>
      <div class="toolbar-actions">
        <el-button type="primary" :disabled="listLoading" @click="openCreateDialog">新增分类</el-button>
      </div>
    </section>

    <section class="table-section">
      <el-table
        v-loading="listLoading"
        :data="tableData"
        :row-class-name="getRowClassName"
        border
        height="100%"
      >
        <el-table-column prop="name" label="分类名称" min-width="160" show-overflow-tooltip />
        <el-table-column prop="sortOrder" label="排序" width="100" align="center" />
        <el-table-column label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 0 ? 'info' : 'success'" effect="light">
              {{ formatStatus(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" min-width="170" show-overflow-tooltip />
        <el-table-column prop="updateTime" label="更新时间" min-width="170" show-overflow-tooltip />
        <el-table-column label="操作" width="240" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="listLoading" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="warning" :disabled="listLoading" @click="handleStatusToggle(row)">
              {{ row.status === 0 ? '启用' : '停用' }}
            </el-button>
            <el-button link type="danger" :disabled="listLoading" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="table-empty-state">
            <el-empty description="暂无分类数据" :image-size="118" />
          </div>
        </template>
      </el-table>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'edit' ? '编辑分类' : '新增分类'"
      width="480px"
      append-to-body
      destroy-on-close
      @closed="resetForm"
    >
      <el-alert v-if="formError" class="dialog-error" :title="formError" type="error" show-icon />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" maxlength="50" show-word-limit placeholder="请输入分类名称" />
        </el-form-item>
        <el-form-item label="展示排序" prop="sortOrder">
          <el-input-number v-model="form.sortOrder" :min="0" :step="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio :label="1">启用</el-radio>
            <el-radio :label="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="submitLoading" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.category-manage-page {
  display: flex;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
  flex-direction: column;
  padding: 24px;
  overflow: hidden;
}
.toolbar-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.title-block h1 {
  margin: 0;
  color: #111827;
  font-size: 24px;
  font-weight: 700;
}
.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.table-section {
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
}
.table-empty-state {
  display: flex;
  width: 100%;
  min-height: calc(100vh - 254px);
  align-items: center;
  justify-content: center;
  padding: 48px 0;
}
.dialog-error {
  margin-bottom: 16px;
}
:deep(.disabled-category-row) {
  color: #9ca3af;
  background: #f3f4f6;
}
:deep(.disabled-category-row td.el-table__cell) {
  background: #f3f4f6;
}
@media (max-width: 680px) {
  .toolbar-section {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
