<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, FolderOpened, Plus, RefreshRight, Search } from '@element-plus/icons-vue'
import {
  createGovMaterial,
  deleteGovMaterial,
  listAdminGovMaterialCategories,
  listAdminGovMaterials,
  publishGovMaterial,
  updateGovMaterial,
  withdrawGovMaterial,
} from '@/api/govMaterial'

const listLoading = ref(false)
const tableData = ref([])
const total = ref(0)
const categoryOptions = ref([])

const query = reactive({
  categoryId: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
})

const formRef = ref(null)
const uploadRef = ref(null)
const dialogVisible = ref(false)
const dialogMode = ref('create')
const submitLoading = ref(false)
const formError = ref('')
const currentId = ref(null)
const uploadFile = ref(null)
const govFileMaxSize = parseFileSize(import.meta.env.VITE_MAX_GOV_FILE_SIZE || '100MB')

const form = reactive(getDefaultForm())

function parseFileSize(value) {
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)?$/i)
  if (!match) return 100 * 1024 * 1024
  const units = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 }
  return Number(match[1]) * (units[(match[2] || 'B').toUpperCase()] || 1)
}

const statusOptions = [
  { label: '全部', value: '' },
  { label: '草稿', value: 0 },
  { label: '已发布', value: 1 },
  { label: '已下架', value: 2 },
]

const materialStatusOptions = [
  { label: '草稿', value: 0 },
  { label: '已发布', value: 1 },
  { label: '已下架', value: 2 },
]

const platformOptions = [
  { label: '百度网盘', value: 'BAIDU' },
  { label: '夸克网盘', value: 'QUARK' },
]

const enabledCategoryOptions = computed(() =>
  categoryOptions.value.filter((item) => Number(item.status) === 1),
)

const rules = {
  categoryId: [{ required: true, message: '请选择所属分类', trigger: 'change' }],
  title: [
    { required: true, message: '请输入资料标题', trigger: 'blur' },
    { min: 1, max: 200, message: '资料标题不能超过200个字符', trigger: 'blur' },
  ],
  sortOrder: [{ required: true, message: '请输入展示排序', trigger: 'blur' }],
}

function getDefaultForm() {
  return {
    categoryId: '',
    title: '',
    description: '',
    status: 0,
    sortOrder: 0,
    materialType: 0,
    file: null,
    links: [{ platform: 'BAIDU', url: '', accessCode: '' }],
  }
}

function resetForm() {
  Object.assign(form, getDefaultForm())
  currentId.value = null
  uploadFile.value = null
  formError.value = ''
  nextTick(() => formRef.value?.clearValidate())
}

function resetQuery() {
  query.categoryId = ''
  query.status = ''
  query.pageNum = 1
  query.pageSize = 10
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

async function loadCategories() {
  try {
    const data = assertResponse(await listAdminGovMaterialCategories(), '查询分类列表失败')
    categoryOptions.value = (data || []).map((item) => ({
      label: item.name,
      value: item.id,
      status: Number(item.status),
    }))
  } catch (error) {
    categoryOptions.value = []
    ElMessage.error(getErrorMessage(error, '查询分类列表失败'))
  }
}

async function loadList() {
  listLoading.value = true
  try {
    const params = {
      pageNum: query.pageNum,
      pageSize: query.pageSize,
    }
    if (query.categoryId !== '') {
      params.categoryId = query.categoryId
    }
    if (query.status !== '') {
      params.status = query.status
    }
    const data = assertResponse(await listAdminGovMaterials(params), '查询资料列表失败')
    tableData.value = data?.records || []
    total.value = data?.total || 0
  } catch (error) {
    tableData.value = []
    total.value = 0
    ElMessage.error(getErrorMessage(error, '查询资料列表失败'))
  } finally {
    listLoading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  loadList()
}

function handleSizeChange(size) {
  query.pageSize = size
  query.pageNum = 1
  loadList()
}

function handleCurrentChange(page) {
  query.pageNum = page
  loadList()
}

async function openCreateDialog() {
  await loadCategories()
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  resetForm()
  currentId.value = row.id
  Object.assign(form, {
    categoryId: row.categoryId,
    title: row.title || '',
    description: row.description || '',
    status: row.status ?? 0,
    sortOrder: row.sortOrder ?? 0,
    materialType: Number(row.materialType ?? 0),
    file: null,
    links: (row.links || []).map((link) => ({
      platform: link.platform || 'BAIDU',
      url: link.url || '',
      accessCode: link.accessCode || '',
    })),
  })
  uploadFile.value = null
  if (!form.links.length) {
    form.links.push({ platform: 'BAIDU', url: '', accessCode: '' })
  }
  dialogVisible.value = true
}

function handleFileChange(uploadedFile) {
  const file = uploadedFile?.raw
  if (!file) return
  if (!/\.pdf$/i.test(file.name || '')) {
    formError.value = '仅允许上传PDF格式文件'
    uploadFile.value = null
    uploadRef.value?.clearFiles()
    return
  }
  if (file.size > govFileMaxSize) {
    formError.value = `文件不能超过${Math.round(govFileMaxSize / 1024 / 1024)}MB`
    uploadFile.value = null
    uploadRef.value?.clearFiles()
    return
  }
  formError.value = ''
  uploadFile.value = file
  form.file = file
}

function handleFileRemove() {
  uploadFile.value = null
  form.file = null
}

function handleFileExceed(files) {
  const file = files?.[0]
  uploadRef.value?.clearFiles()
  if (file) {
    file.uid = `${Date.now()}${Math.random().toString(36).slice(2)}`
    window.setTimeout(() => uploadRef.value?.handleStart(file), 0)
  }
}

function addLink() {
  form.links.push({ platform: 'BAIDU', url: '', accessCode: '' })
}

function removeLink(index) {
  form.links.splice(index, 1)
  if (!form.links.length) {
    form.links.push({ platform: 'BAIDU', url: '', accessCode: '' })
  }
}

async function handleSubmit() {
  formError.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const validLinks = form.links.filter((link) => link.url.trim() && link.platform.trim())
  if (form.materialType === 0 && !validLinks.length) {
    formError.value = '请至少添加一个有效的网盘链接'
    ElMessage.error(formError.value)
    return
  }
  if (form.materialType === 1 && !uploadFile.value && dialogMode.value === 'create') {
    formError.value = '请选择PDF文件'
    ElMessage.error(formError.value)
    return
  }

  submitLoading.value = true
  try {
    const payload = {
      categoryId: form.categoryId,
      title: form.title.trim(),
      description: form.description.trim(),
      materialType: form.materialType,
      status: form.status,
      sortOrder: Number(form.sortOrder || 0),
      links: form.materialType === 0 ? validLinks.map((link) => ({
        platform: link.platform.trim().toUpperCase(),
        url: link.url.trim(),
        accessCode: (link.accessCode || '').trim(),
      })) : [],
      file: form.materialType === 1 ? uploadFile.value : null,
    }
    const res = dialogMode.value === 'edit'
      ? await updateGovMaterial(currentId.value, payload)
      : await createGovMaterial(payload)
    assertResponse(res, dialogMode.value === 'edit' ? '修改资料失败' : '新增资料失败')
    dialogVisible.value = false
    ElMessage.success(res.message || (dialogMode.value === 'edit' ? '修改成功' : '新增成功'))
    await loadList()
  } catch (error) {
    formError.value = getErrorMessage(error, dialogMode.value === 'edit' ? '修改资料失败' : '新增资料失败')
    ElMessage.error(formError.value)
  } finally {
    submitLoading.value = false
  }
}

async function handlePublish(row) {
  listLoading.value = true
  try {
    const res = await publishGovMaterial(row.id)
    assertResponse(res, '发布失败')
    ElMessage.success(res.message || '发布成功')
    await loadList()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '发布失败'))
  } finally {
    listLoading.value = false
  }
}

async function handleWithdraw(row) {
  listLoading.value = true
  try {
    const res = await withdrawGovMaterial(row.id)
    assertResponse(res, '下架失败')
    ElMessage.success(res.message || '下架成功')
    await loadList()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '下架失败'))
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
    const res = await deleteGovMaterial(row.id)
    assertResponse(res, '删除失败')
    ElMessage.success(res.message || '删除成功')
    if (tableData.value.length === 1 && query.pageNum > 1) {
      query.pageNum -= 1
    }
    await loadList()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, '删除失败'))
  } finally {
    listLoading.value = false
  }
}

function formatStatus(row) {
  return { 0: '草稿', 1: '已发布', 2: '已下架' }[row.status] || '未知'
}

function getStatusType(status) {
  return { 0: 'info', 1: 'success', 2: 'warning' }[status] || 'info'
}

function getCategoryName(categoryId) {
  const option = categoryOptions.value.find((item) => item.value === categoryId)
  return option?.label || '-'
}

onMounted(() => {
  loadCategories()
  loadList()
})
</script>

<template>
  <main class="material-manage-page">
    <section class="material-shell">
      <header class="hero">
        <div class="hero-copy">
          <p class="eyebrow">GOV MATERIALS ADMIN</p>
          <h1>资料内容管理</h1>
          <p class="lead">维护考公资料的标题、分类、网盘链接与发布状态。</p>
        </div>
        <div class="hero-badge">
          <el-icon><FolderOpened /></el-icon>
          <div><span>当前模块</span><strong>资料内容</strong></div>
        </div>
      </header>

      <section class="toolbar-shell">
        <div class="filter-heading"><strong>资料筛选</strong><span>按分类与状态快速定位资料</span></div>
        <div class="toolbar-actions">
          <el-select v-model="query.categoryId" class="filter-select" placeholder="全部分类" clearable @change="handleSearch">
            <el-option
              v-for="item in categoryOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-select v-model="query.status" class="filter-select" placeholder="全部状态" clearable @change="handleSearch">
            <el-option v-for="item in statusOptions" :key="String(item.value)" :label="item.label" :value="item.value" />
          </el-select>
          <el-button :icon="Search" type="primary" :loading="listLoading" @click="handleSearch">搜索</el-button>
          <el-button :icon="RefreshRight" plain :disabled="listLoading" @click="resetQuery(); loadList()">刷新</el-button>
          <el-button type="primary" :icon="Plus" :disabled="listLoading" @click="openCreateDialog">新增资料</el-button>
        </div>
      </section>

      <section class="table-card">
        <header class="card-head"><div><strong>资料列表</strong><span>仅展示当前管理员可维护的资料记录</span></div><span>{{ total ? `共 ${total} 条资料` : '暂无资料' }}</span></header>
        <div class="table-section">
          <el-table v-loading="listLoading" :data="tableData" border height="100%">
            <el-table-column prop="title" label="资料标题" min-width="180" show-overflow-tooltip />
            <el-table-column label="所属分类" min-width="120" show-overflow-tooltip>
              <template #default="{ row }">{{ getCategoryName(row.categoryId) }}</template>
            </el-table-column>
            <el-table-column label="资料类型" width="110" align="center">
              <template #default="{ row }">{{ Number(row.materialType) === 0 ? '网盘链接' : '文件' }}</template>
            </el-table-column>
            <el-table-column prop="sortOrder" label="排序" width="80" align="center" />
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" effect="light">{{ formatStatus(row) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" min-width="170" show-overflow-tooltip />
            <el-table-column label="操作" width="260" fixed="right" align="center">
              <template #default="{ row }">
                <el-button link type="primary" :disabled="listLoading" @click="openEditDialog(row)">编辑</el-button>
                <el-button v-if="row.status !== 1" link type="success" :disabled="listLoading" @click="handlePublish(row)">发布</el-button>
                <el-button v-if="row.status === 1" link type="warning" :disabled="listLoading" @click="handleWithdraw(row)">下架</el-button>
                <el-button link type="danger" :disabled="listLoading" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
            <template #empty>
              <div class="table-empty-state"><el-empty description="暂无资料数据" :image-size="118" /></div>
            </template>
          </el-table>
        </div>
        <div v-if="total" class="pagination-bar">
          <el-pagination
            v-model:current-page="query.pageNum"
            v-model:page-size="query.pageSize"
            :page-sizes="[10, 20, 50]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            background
            :disabled="listLoading"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </section>

    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'edit' ? '编辑资料' : '新增资料'"
      width="720px"
      append-to-body
      destroy-on-close
      @closed="resetForm"
    >
      <el-alert v-if="formError" class="dialog-error" :title="formError" type="error" show-icon />
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="所属分类" prop="categoryId">
              <el-select v-model="form.categoryId" class="full-width" placeholder="请选择分类">
                <el-option
                  v-for="item in enabledCategoryOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="展示排序" prop="sortOrder">
              <el-input-number v-model="form.sortOrder" class="full-width" :min="0" :step="1" controls-position="right" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="资料标题" prop="title">
          <el-input v-model="form.title" maxlength="200" show-word-limit placeholder="请输入资料标题" />
        </el-form-item>
        <el-form-item label="资料说明" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="1000" show-word-limit placeholder="请输入资料说明" />
        </el-form-item>
        <el-form-item label="资料类型" prop="materialType">
          <el-radio-group v-if="dialogMode === 'create'" v-model="form.materialType">
            <el-radio :label="0">网盘链接资料</el-radio>
            <el-radio :label="1">PDF文件资料</el-radio>
          </el-radio-group>
          <el-tag v-else effect="plain">{{ form.materialType === 1 ? 'PDF文件资料' : '网盘链接资料' }}</el-tag>
        </el-form-item>
        <el-form-item label="资料状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio v-for="item in materialStatusOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.materialType === 0" label="网盘链接" prop="links">
          <div class="links-list">
            <div v-for="(link, index) in form.links" :key="index" class="link-row">
              <el-select v-model="link.platform" class="link-platform" placeholder="平台">
                <el-option v-for="opt in platformOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
              </el-select>
              <el-input v-model="link.url" class="link-url" placeholder="网盘链接" />
              <el-input v-model="link.accessCode" class="link-code" placeholder="提取码（可选）" />
              <el-button type="danger" :icon="Delete" circle @click="removeLink(index)" />
            </div>
            <el-button type="primary" :icon="Plus" text @click="addLink">添加链接</el-button>
          </div>
        </el-form-item>
        <el-form-item v-else label="PDF文件" prop="file">
          <el-upload
            ref="uploadRef"
            class="pdf-upload"
            drag
            action="#"
            accept=".pdf,application/pdf"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :on-exceed="handleFileExceed"
          >
            <div class="upload-placeholder">点击或拖拽上传PDF文件</div>
            <template #tip>
              <div class="el-upload__tip">仅支持PDF，大小不超过{{ Math.round(govFileMaxSize / 1024 / 1024) }}MB{{ dialogMode === 'edit' ? '；重新上传后替换原文件' : '' }}</div>
            </template>
          </el-upload>
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
.material-manage-page {
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
.material-shell {
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
.filter-heading { display: flex; align-items: baseline; gap: 12px; }
.filter-heading strong { color: #2c2d48; font-size: 17px; }
.filter-heading span { color: #8a8fb0; font-size: 11px; }
.toolbar-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.filter-select { width: 160px; }
.table-card { display: flex; min-height: 0; flex: 1; flex-direction: column; margin-top: 18px; border: 2px solid var(--gov-primary-deep); border-radius: 16px; background: linear-gradient(180deg, #fff 0%, #fffdfc 100%); box-shadow: 6px 6px 0 rgb(103 94 186 / 12%); }
.card-head { padding: 14px 16px 12px; border-bottom: 1px dashed rgb(114 102 193 / 22%); }
.card-head strong,.card-head span { display: block; }
.card-head strong { color: #2c2d48; font-size: 17px; }
.card-head span { margin-top: 4px; color: #8a8fb0; font-size: 11px; }
.table-section { min-height: 300px; flex: 1; overflow: hidden; padding: 10px; }
.table-empty-state { display: flex; width: 100%; min-height: 260px; align-items: center; justify-content: center; padding: 48px 0; }
.pagination-bar { display: flex; justify-content: flex-end; padding: 12px 16px 16px; border-top: 1px dashed rgb(114 102 193 / 22%); }
.dialog-error { margin-bottom: 16px; }
.full-width { width: 100%; }
:deep(.el-table) { --el-table-border-color: #e0dcfb; --el-table-header-bg-color: #f7f4ff; --el-table-row-hover-bg-color: #faf8ff; color: #47496a; }
:deep(.el-table th.el-table__cell) { color: #5f5a8f; font-weight: 800; }
:deep(.el-dialog__body) { overflow-x: hidden; }
.pdf-upload,:deep(.pdf-upload .el-upload),:deep(.pdf-upload .el-upload-dragger),:deep(.pdf-upload .el-upload-list) { width: 100%; max-width: 100%; box-sizing: border-box; }
:deep(.pdf-upload .el-upload-list) { overflow: hidden; }
:deep(.pdf-upload .el-upload-list__item) { max-width: 100%; box-sizing: border-box; }
:deep(.pdf-upload .el-upload-list__item-name) { display: block; min-width: 0; max-width: calc(100% - 36px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.links-list { display: flex; width: 100%; flex-direction: column; gap: 10px; }
.link-row { display: flex; align-items: center; gap: 10px; }
.link-platform { width: 140px; flex-shrink: 0; }
.link-url { flex: 1; min-width: 0; }
.link-code { width: 140px; flex-shrink: 0; }
.upload-placeholder { color: #606266; font-size: 14px; }
@media (max-width: 860px) { .toolbar-shell { align-items: stretch; flex-direction: column; } .toolbar-actions { justify-content: flex-start; } }
@media (max-width: 680px) { .material-manage-page { padding: 14px; } .material-shell { padding: 18px; } .hero { align-items: stretch; flex-direction: column; } .hero-badge { min-width: 0; } .toolbar-actions { align-items: stretch; flex-direction: column; } .filter-select,.toolbar-actions :deep(.el-button) { width: 100%; } .table-section { overflow-x: auto; } .link-row { flex-wrap: wrap; } .link-url { width: 100%; } }
</style>
