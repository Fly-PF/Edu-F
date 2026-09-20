<script setup>
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createAdminSkillCategory,
  deleteAdminSkillCategory,
  getAdminSkillCategories,
  updateAdminSkillCategory,
} from '@/api/aiSkill'

const typeOptions = [
  { label: '学科', value: 'SUBJECT' },
  { label: '适用人群', value: 'AUDIENCE' },
  { label: '其他', value: 'OTHER' },
]
const enabledOptions = [
  { label: '启用', value: 1 },
  { label: '停用', value: 0 },
]

const loading = ref(false)
const saving = ref(false)
const rows = ref([])
const dialogVisible = ref(false)
const mode = ref('create')
const editingId = ref(null)
const formRef = ref()
const query = reactive({ categoryType: '', enabledOnly: false })
const form = reactive({ categoryType: 'SUBJECT', categoryName: '', sort: 10, enabled: 1 })
const rules = {
  categoryType: [{ required: true, message: '请选择分类类型', trigger: 'change' }],
  categoryName: [{ required: true, message: '请输入分类名称', trigger: 'blur' }, { max: 50, message: '分类名称不能超过50字', trigger: 'blur' }],
}

function typeLabel(value) {
  return typeOptions.find((item) => item.value === value)?.label || value || '-'
}

function enabledLabel(value) {
  return Number(value) === 1 || value === true ? '启用' : '停用'
}

function errorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function formatTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 16) : '-'
}

function buildParams() {
  const params = {}
  if (query.categoryType) params.categoryType = query.categoryType
  if (query.enabledOnly) params.enabledOnly = true
  return params
}

async function loadRows() {
  loading.value = true
  try {
    rows.value = await getAdminSkillCategories(buildParams())
  } catch (error) {
    rows.value = []
    ElMessage.error(errorMessage(error, '分类加载失败'))
  } finally {
    loading.value = false
  }
}

function resetSearch() {
  query.categoryType = ''
  query.enabledOnly = false
  loadRows()
}

function openCreate() {
  mode.value = 'create'
  editingId.value = null
  Object.assign(form, { categoryType: 'SUBJECT', categoryName: '', sort: 10, enabled: 1 })
  dialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate?.())
}

function openEdit(row) {
  mode.value = 'edit'
  editingId.value = row.id || row.categoryId
  Object.assign(form, {
    categoryType: row.categoryType || 'SUBJECT',
    categoryName: row.categoryName || row.name || '',
    sort: row.sort ?? row.sortOrder ?? 10,
    enabled: Number(row.enabled ?? row.status ?? 1) === 0 ? 0 : 1,
  })
  dialogVisible.value = true
  setTimeout(() => formRef.value?.clearValidate?.())
}

async function saveCategory() {
  if (!await formRef.value?.validate().catch(() => false)) return
  saving.value = true
  try {
    const payload = { ...form }
    if (mode.value === 'edit') {
      await updateAdminSkillCategory(editingId.value, payload)
      ElMessage.success('分类已更新')
    } else {
      await createAdminSkillCategory(payload)
      ElMessage.success('分类已创建')
    }
    dialogVisible.value = false
    await loadRows()
  } catch (error) {
    ElMessage.error(errorMessage(error, '保存分类失败'))
  } finally {
    saving.value = false
  }
}

async function removeCategory(row) {
  const id = row.id || row.categoryId
  const name = row.categoryName || row.name
  try { await ElMessageBox.confirm(`确认删除分类“${name}”吗？`, '删除确认', { type: 'warning' }) } catch { return }
  try {
    await deleteAdminSkillCategory(id)
    ElMessage.success('分类已删除')
    await loadRows()
  } catch (error) {
    ElMessage.error(errorMessage(error, '删除分类失败'))
  }
}

onMounted(loadRows)
</script>

<template>
  <main class="manage-page">
    <header class="page-header">
      <div class="hero-copy">
        <p class="eyebrow">ADMIN BOARD</p>
        <h1>Skill 分类管理</h1>
        <p>维护 AI Skill 的学科、适用人群和其他分类，让市场筛选更清楚。</p>
      </div>
      <div class="admin-doodle" aria-hidden="true">
        <div class="category-card">SUBJECT</div>
        <div class="category-card card-b">AUDIENCE</div>
        <span class="spark spark-a">+</span>
        <span class="spark spark-b">*</span>
      </div>
      <el-button type="primary" @click="openCreate">新增分类</el-button>
    </header>

    <section class="panel">
      <div class="toolbar">
        <el-select v-model="query.categoryType" clearable placeholder="全部类型">
          <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-checkbox v-model="query.enabledOnly">只看启用</el-checkbox>
        <el-button type="primary" @click="loadRows">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <el-table v-loading="loading" :data="rows" border empty-text="暂无分类">
        <el-table-column label="分类名称" min-width="180">
          <template #default="{ row }">{{ row.categoryName || row.name }}</template>
        </el-table-column>
        <el-table-column label="类型" width="120">
          <template #default="{ row }">{{ typeLabel(row.categoryType) }}</template>
        </el-table-column>
        <el-table-column label="排序" width="100">
          <template #default="{ row }">{{ row.sort ?? row.sortOrder ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="Number(row.enabled ?? row.status ?? 1) === 1 ? 'success' : 'info'">{{ enabledLabel(row.enabled ?? row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="更新时间" width="180">
          <template #default="{ row }">{{ formatTime(row.updateTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="removeCategory(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="mode === 'create' ? '新增分类' : '编辑分类'" width="480px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="分类类型" prop="categoryType">
          <el-select v-model="form.categoryType">
            <el-option v-for="item in typeOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类名称" prop="categoryName">
          <el-input v-model="form.categoryName" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="99999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.enabled">
            <el-radio-button v-for="item in enabledOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.manage-page {
  min-height: 100%;
  padding: 34px clamp(18px, 4vw, 54px);
  box-sizing: border-box;
  background:
    linear-gradient(rgba(112, 96, 176, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(112, 96, 176, 0.055) 1px, transparent 1px),
    #fbfaff;
  background-size: 28px 28px;
  color: #29244d;
}
.page-header {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 270px auto;
  min-height: 190px;
  gap: 22px;
  align-items: center;
  overflow: hidden;
  padding: 34px clamp(24px, 4vw, 48px);
  border: 2px solid #565083;
  border-radius: 10px;
  background:
    linear-gradient(110deg, rgba(224, 218, 255, 0.94), rgba(255, 224, 238, 0.9) 52%, rgba(212, 248, 250, 0.9)),
    linear-gradient(rgba(86, 80, 131, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(86, 80, 131, 0.08) 1px, transparent 1px);
  background-size: auto, 24px 24px, 24px 24px;
  box-shadow: 10px 10px 0 #6f6a91;
}
.hero-copy { position: relative; z-index: 2; }
.eyebrow { display: inline-flex; margin: 0 0 14px; padding: 7px 13px; border: 2px solid #565083; background: #fff0a8; color: #30295d; font-size: 13px; font-weight: 900; box-shadow: 4px 4px 0 rgba(86, 80, 131, 0.28); transform: rotate(-2deg); }
h1 { margin: 0; color: #352c65; font-size: clamp(34px, 4.2vw, 56px); line-height: 1; font-weight: 900; }
header p:not(.eyebrow) { max-width: 580px; margin: 14px 0 0; color: #58517f; font-size: 17px; font-weight: 700; line-height: 1.6; }
.admin-doodle { position: relative; width: 240px; height: 120px; }
.category-card { position: absolute; left: 18px; top: 16px; padding: 13px 18px; border: 2px solid #565083; background: #fff; color: #352c65; font-weight: 900; box-shadow: 5px 5px 0 rgba(86, 80, 131, 0.22); transform: rotate(-5deg); animation: bob 3.1s ease-in-out infinite; }
.card-b { left: 92px; top: 56px; background: #e6fbff; transform: rotate(6deg); animation-delay: 0.45s; }
.spark { position: absolute; color: #7bd0d5; font-size: 30px; font-weight: 900; animation: twinkle 2s ease-in-out infinite; }
.spark-a { right: 36px; top: 12px; }
.spark-b { left: 46px; bottom: 0; color: #f08abb; animation-delay: 0.4s; }
.panel { margin-top: 42px; padding: 22px; border: 2px solid #6a638f; border-radius: 10px; background: rgba(255, 255, 255, 0.92); box-shadow: 7px 7px 0 rgba(86, 80, 131, 0.18); }
.toolbar { display: flex; gap: 12px; align-items: center; margin-bottom: 18px; padding-bottom: 16px; border-bottom: 2px solid #eee9ff; }
.toolbar .el-select { width: 180px; }
.el-select { width: 100%; }
:deep(.el-table) { border: 2px solid #6a638f; border-radius: 8px; overflow: hidden; color: #30295d; }
:deep(.el-table th.el-table__cell) { background: #f4efff; color: #352c65; font-weight: 900; }
:deep(.el-table td.el-table__cell) { border-color: #ece6ff; }
:deep(.el-button) { min-height: 36px; border-color: #706998; border-radius: 8px; color: #352c65; font-weight: 900; box-shadow: 3px 3px 0 rgba(86, 80, 131, 0.16); }
:deep(.el-button.is-link) { box-shadow: none; }
:deep(.el-button--primary) { --el-button-bg-color: #8176d7; --el-button-border-color: #5f5799; --el-button-hover-bg-color: #6f64c7; --el-button-hover-border-color: #514983; color: #fff; }
:deep(.el-tag) { border-color: #d8d0f1; border-radius: 6px; background: #f5f0ff; color: #4a4178; font-weight: 900; }
:deep(.el-input__wrapper), :deep(.el-select__wrapper) { border: 1px solid #c9c1e8; border-radius: 8px; box-shadow: none; }
:deep(.el-radio-button__inner) { border-color: #c9c1e8; color: #352c65; font-weight: 900; }
@keyframes bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -8px; } }
@keyframes twinkle { 0%, 100% { opacity: 0.45; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.08); } }
@media (max-width: 980px) { .page-header { grid-template-columns: 1fr; } .admin-doodle { display: none; } }
@media (max-width: 700px) { .page-header, .toolbar { align-items: stretch; flex-direction: column; display: flex; } .toolbar .el-select { width: 100%; } }
</style>

