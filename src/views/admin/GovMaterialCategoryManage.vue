<script setup>
import { nextTick, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { FolderOpened, Plus } from '@element-plus/icons-vue'
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
    <section class="category-shell">
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow">GOV MATERIALS ADMIN</p>
          <h1>资料分类管理</h1>
          <p class="lead">维护考公资料的分类目录、展示排序与启停状态。</p>
        </div>
        <div class="hero-badge">
          <el-icon><FolderOpened /></el-icon>
          <div><span>当前模块</span><strong>资料分类</strong></div>
        </div>
      </header>

      <section class="toolbar-shell">
        <div class="section-title"><strong>分类目录</strong><span>分类状态会影响用户端资料展示</span></div>
        <div class="toolbar-actions">
          <el-button type="primary" :icon="Plus" :disabled="listLoading" @click="openCreateDialog">新增分类</el-button>
        </div>
      </section>

      <section class="table-card">
        <header class="card-head"><div><strong>分类列表</strong><span>按排序值查看当前资料分类</span></div></header>
        <div class="table-section">
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
              <div class="table-empty-state"><el-empty description="暂无分类数据" :image-size="118" /></div>
            </template>
          </el-table>
        </div>
      </section>
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
  --gov-primary: #786ce8;
  --gov-primary-deep: #6354d8;
  --gov-border: #cfc7f8;
  --gov-ink: #2e314e;
  --gov-subtle: #747996;
  min-height: 100%;
  box-sizing: border-box;
  overflow-y: auto;
  padding: 24px;
  background: linear-gradient(90deg, rgb(120 108 232 / 8%) 1px, transparent 1px), linear-gradient(rgb(120 108 232 / 8%) 1px, transparent 1px), linear-gradient(180deg, #fffeff 0%, #f7f6ef 100%);
  background-size: 48px 48px, 48px 48px, auto;
}
.category-shell {
  display: flex;
  width: min(1500px, 100%);
  min-height: calc(100vh - 120px);
  box-sizing: border-box;
  margin: 0 auto;
  flex-direction: column;
  padding: 24px;
  border: 2px solid var(--gov-border);
  border-radius: 20px;
  background: rgb(255 255 255 / 95%);
  box-shadow: 0 18px 0 rgb(103 94 186 / 8%), 0 22px 46px rgb(76 83 130 / 10%);
}
.hero,.toolbar-shell,.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.hero-copy { min-width: 0; }
.eyebrow { margin: 0; color: var(--gov-primary); font-size: 11px; font-weight: 800; letter-spacing: .12em; }
h1 { margin: 8px 0 0; color: var(--gov-ink); font-size: 34px; line-height: 1.1; }
.lead { margin: 8px 0 0; color: var(--gov-subtle); font-size: 14px; }
.hero-badge { display: flex; min-width: 210px; align-items: center; gap: 10px; padding: 12px 16px; border: 2px solid #d8d1fa; border-radius: 16px; background: linear-gradient(180deg, #fffdf7 0%, #f7f3ff 100%); box-shadow: 0 10px 22px rgb(102 111 144 / 8%); }
.hero-badge .el-icon { color: #5a6885; font-size: 22px; }
.hero-badge span,.hero-badge strong { display: block; }
.hero-badge span { color: #7f8799; font-size: 11px; font-weight: 800; }
.hero-badge strong { margin-top: 3px; color: #2b3348; font-size: 17px; }
.toolbar-shell { align-items: center; margin-top: 18px; padding: 12px 14px; border: 2px solid var(--gov-primary-deep); border-radius: 16px; background: linear-gradient(180deg, #fffdfa 0%, #ffffff 100%); box-shadow: 6px 6px 0 rgb(103 94 186 / 10%); }
.section-title { display: flex; align-items: baseline; gap: 12px; }
.section-title strong { color: #2c2d48; font-size: 17px; }
.section-title span { color: #8a8fb0; font-size: 11px; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.table-card { display: flex; min-height: 0; flex: 1; flex-direction: column; margin-top: 18px; border: 2px solid var(--gov-primary-deep); border-radius: 16px; background: linear-gradient(180deg, #fff 0%, #fffdfc 100%); box-shadow: 6px 6px 0 rgb(103 94 186 / 12%); }
.card-head { padding: 14px 16px 12px; border-bottom: 1px dashed rgb(114 102 193 / 22%); }
.card-head strong,.card-head span { display: block; }
.card-head strong { color: #2c2d48; font-size: 17px; }
.card-head span { margin-top: 4px; color: #8a8fb0; font-size: 11px; }
.table-section { min-height: 320px; flex: 1; overflow: hidden; padding: 10px; }
.table-empty-state { display: flex; width: 100%; min-height: 260px; align-items: center; justify-content: center; padding: 48px 0; }
.dialog-error { margin-bottom: 16px; }
:deep(.el-table) { --el-table-border-color: #e0dcfb; --el-table-header-bg-color: #f7f4ff; --el-table-row-hover-bg-color: #faf8ff; color: #47496a; }
:deep(.el-table th.el-table__cell) { color: #5f5a8f; font-weight: 800; }
:deep(.disabled-category-row),:deep(.disabled-category-row td.el-table__cell) { color: #999bb2; background: #f7f5fb; }
@media (max-width: 680px) { .category-manage-page { padding: 14px; } .category-shell { padding: 18px; } .hero,.toolbar-shell { align-items: stretch; flex-direction: column; } .hero-badge { min-width: 0; } .toolbar-actions :deep(.el-button) { width: 100%; } .table-section { overflow-x: auto; } }
</style>
