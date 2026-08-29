<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import GovNewsContent from '@/components/gov/GovNewsContent.vue'
import {
  createGovNews, createGovNewsCategory, getAdminGovNewsCategories, getAdminGovNewsDetail,
  getAdminGovNewsList, offlineGovNews, publishGovNews, updateGovNews,
  updateGovNewsCategory, updateGovNewsCategoryStatus,
} from '@/api/govNews'
import { buildGovNewsCategoryPayload, buildGovNewsPayload, getGovNewsStatusMeta } from '@/utils/govNewsAdmin'

const activeTab = ref('news')
const categories = ref([])
const categoryLoading = ref(false)
const categoryError = ref('')
const newsLoading = ref(false)
const newsError = ref('')
const newsRows = ref([])
const total = ref(0)
const query = reactive({ categoryId: '', keyword: '', status: '', pageNum: 1, pageSize: 10 })
const editorVisible = ref(false)
const editorMode = ref('create')
const editorTab = ref('edit')
const editorLoading = ref(false)
const saving = ref(false)
const formRef = ref()
const editingId = ref(null)
const form = reactive(defaultNewsForm())
const detailVisible = ref(false)
const detailLoading = ref(false)
const detail = ref(null)
const actionId = ref(null)
const categoryDialogVisible = ref(false)
const categoryFormRef = ref()
const categorySaving = ref(false)
const categoryMode = ref('create')
const categoryId = ref(null)
const categoryForm = reactive({ name: '', sortOrder: 0 })

const newsRules = {
  categoryId: [{ required: true, message: '请选择分类', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }, { max: 200, message: '标题不能超过200字', trigger: 'blur' }],
  summary: [{ max: 500, message: '摘要不能超过500字', trigger: 'blur' }],
  coverUrl: [{ max: 1000, message: '封面地址不能超过1000字', trigger: 'blur' }],
  contentMd: [{ required: true, message: '请输入正文', trigger: 'blur' }],
}
const categoryRules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }, { max: 50, message: '分类名称不能超过50字', trigger: 'blur' }],
}
const editorCategories = computed(() => categories.value.filter(item => item.status === 1 || item.id === form.categoryId))

function defaultNewsForm() { return { categoryId: '', title: '', summary: '', coverUrl: '', isTop: 0, contentMd: '' } }
function errorMessage(error, fallback) { return error?.response?.data?.message || error?.message || fallback }
function formatTime(value) { return value ? String(value).replace('T', ' ').slice(0, 19) : '—' }
function cleanQuery() {
  const params = { pageNum: query.pageNum, pageSize: query.pageSize }
  if (query.categoryId !== '') params.categoryId = query.categoryId
  if (query.status !== '') params.status = query.status
  if (query.keyword.trim()) params.keyword = query.keyword.trim()
  return params
}
async function loadCategories() {
  categoryLoading.value = true; categoryError.value = ''
  try { categories.value = await getAdminGovNewsCategories() }
  catch (e) { categories.value = []; categoryError.value = errorMessage(e, '分类加载失败') }
  finally { categoryLoading.value = false }
}
async function loadNews() {
  newsLoading.value = true; newsError.value = ''
  try {
    const page = await getAdminGovNewsList(cleanQuery())
    newsRows.value = page.records; total.value = page.total; query.pageNum = page.pageNum; query.pageSize = page.pageSize
  } catch (e) { newsRows.value = []; total.value = 0; newsError.value = errorMessage(e, '资讯加载失败') }
  finally { newsLoading.value = false }
}
function search() { query.pageNum = 1; loadNews() }
function resetSearch() { Object.assign(query, { categoryId: '', keyword: '', status: '', pageNum: 1 }); loadNews() }
function openCreate() {
  editorMode.value = 'create'; editingId.value = null; Object.assign(form, defaultNewsForm()); editorTab.value = 'edit'; editorVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
async function openEdit(row) {
  editorMode.value = 'edit'; editingId.value = row.id; editorVisible.value = true; editorLoading.value = true; editorTab.value = 'edit'
  try { Object.assign(form, await getAdminGovNewsDetail(row.id)) }
  catch (e) { editorVisible.value = false; ElMessage.error(errorMessage(e, '详情加载失败')) }
  finally { editorLoading.value = false }
}
async function saveNews() {
  if (!await formRef.value?.validate().catch(() => false)) return
  saving.value = true
  try {
    const payload = buildGovNewsPayload(form)
    if (editorMode.value === 'edit') await updateGovNews(editingId.value, payload); else await createGovNews(payload)
    ElMessage.success(editorMode.value === 'edit' ? '资讯已更新' : '草稿已创建'); editorVisible.value = false; await loadNews()
  } catch (e) { ElMessage.error(errorMessage(e, '保存失败')) }
  finally { saving.value = false }
}
async function showDetail(row) {
  detailVisible.value = true; detailLoading.value = true; detail.value = null
  try { detail.value = await getAdminGovNewsDetail(row.id) }
  catch (e) { detailVisible.value = false; ElMessage.error(errorMessage(e, '详情加载失败')) }
  finally { detailLoading.value = false }
}
async function changeNewsStatus(row) {
  const publishing = row.status !== 1
  const label = publishing ? (row.status === 2 ? '重新发布' : '发布') : '下架'
  try { await ElMessageBox.confirm(`确认${label}资讯“${row.title}”吗？`, `${label}确认`, { type: 'warning' }) } catch { return }
  actionId.value = row.id
  try { publishing ? await publishGovNews(row.id) : await offlineGovNews(row.id); ElMessage.success(`${label}成功`); await loadNews() }
  catch (e) { ElMessage.error(errorMessage(e, `${label}失败`)) }
  finally { actionId.value = null }
}
function openCategory(row) {
  categoryMode.value = row ? 'edit' : 'create'; categoryId.value = row?.id ?? null
  Object.assign(categoryForm, { name: row?.name || '', sortOrder: row?.sortOrder ?? 0 }); categoryDialogVisible.value = true
  nextTick(() => categoryFormRef.value?.clearValidate())
}
async function saveCategory() {
  if (!await categoryFormRef.value?.validate().catch(() => false)) return
  categorySaving.value = true
  try {
    const payload = buildGovNewsCategoryPayload(categoryForm)
    if (categoryMode.value === 'edit') await updateGovNewsCategory(categoryId.value, payload); else await createGovNewsCategory(payload)
    ElMessage.success(categoryMode.value === 'edit' ? '分类已更新' : '分类已创建'); categoryDialogVisible.value = false; await loadCategories()
  } catch (e) { ElMessage.error(errorMessage(e, '保存分类失败')) }
  finally { categorySaving.value = false }
}
async function toggleCategory(row) {
  const status = row.status === 1 ? 0 : 1; const label = status ? '启用' : '停用'
  try { await ElMessageBox.confirm(`确认${label}分类“${row.name}”吗？`, `${label}确认`, { type: 'warning' }) } catch { return }
  try { await updateGovNewsCategoryStatus(row.id, status); ElMessage.success(`${label}成功`); await loadCategories() }
  catch (e) { ElMessage.error(errorMessage(e, `${label}失败`)) }
}
onMounted(async () => { await loadCategories(); await loadNews() })
</script>

<template>
  <main class="manage-page">
    <header><h1>考公资讯管理</h1><p>维护用户端展示的资讯、公告与分类。</p></header>
    <el-tabs v-model="activeTab" class="manage-tabs">
      <el-tab-pane label="资讯管理" name="news">
        <div class="toolbar">
          <el-select v-model="query.categoryId" clearable placeholder="全部分类"><el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" /></el-select>
          <el-select v-model="query.status" clearable placeholder="全部状态"><el-option label="草稿" :value="0"/><el-option label="已发布" :value="1"/><el-option label="已下架" :value="2"/></el-select>
          <el-input v-model="query.keyword" clearable placeholder="搜索标题或正文" @keyup.enter="search" />
          <el-button type="primary" @click="search">搜索</el-button><el-button @click="resetSearch">重置</el-button>
          <el-button class="push-right" type="primary" @click="openCreate">新建资讯</el-button>
        </div>
        <el-alert v-if="newsError" :title="newsError" type="error" show-icon><template #default><el-button link type="primary" @click="loadNews">重试</el-button></template></el-alert>
        <el-table v-loading="newsLoading" :data="newsRows" border empty-text="暂无资讯">
          <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip><template #default="{row}"><el-link type="primary" @click="showDetail(row)">{{ row.title }}</el-link></template></el-table-column>
          <el-table-column prop="categoryName" label="分类" width="130" />
          <el-table-column label="状态" width="100" align="center"><template #default="{row}"><el-tag :type="getGovNewsStatusMeta(row.status).type">{{ getGovNewsStatusMeta(row.status).label }}</el-tag></template></el-table-column>
          <el-table-column label="置顶" width="80" align="center"><template #default="{row}"><el-tag v-if="row.isTop === 1" type="danger">置顶</el-tag><span v-else>否</span></template></el-table-column>
          <el-table-column label="发布时间" width="170"><template #default="{row}">{{ formatTime(row.publishedAt) }}</template></el-table-column>
          <el-table-column label="更新时间" width="170"><template #default="{row}">{{ formatTime(row.updateTime) }}</template></el-table-column>
          <el-table-column label="操作" width="210" fixed="right"><template #default="{row}"><el-button link type="primary" @click="openEdit(row)">编辑</el-button><el-button link @click="showDetail(row)">查看</el-button><el-button link :type="row.status === 1 ? 'danger' : 'success'" :loading="actionId === row.id" @click="changeNewsStatus(row)">{{ row.status === 0 ? '发布' : row.status === 1 ? '下架' : '重新发布' }}</el-button></template></el-table-column>
        </el-table>
        <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="loadNews" @size-change="search" />
      </el-tab-pane>
      <el-tab-pane label="分类管理" name="categories">
        <div class="toolbar"><el-button class="push-right" type="primary" @click="openCategory()">新建分类</el-button></div>
        <el-alert v-if="categoryError" :title="categoryError" type="error" show-icon><template #default><el-button link type="primary" @click="loadCategories">重试</el-button></template></el-alert>
        <el-table v-loading="categoryLoading" :data="categories" border empty-text="暂无分类"><el-table-column prop="name" label="分类名称"/><el-table-column prop="sortOrder" label="排序" width="100"/><el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="row.status === 1 ? 'success' : 'info'">{{ row.status === 1 ? '启用' : '停用' }}</el-tag></template></el-table-column><el-table-column label="创建时间" width="180"><template #default="{row}">{{ formatTime(row.createTime) }}</template></el-table-column><el-table-column label="更新时间" width="180"><template #default="{row}">{{ formatTime(row.updateTime) }}</template></el-table-column><el-table-column label="操作" width="150"><template #default="{row}"><el-button link type="primary" @click="openCategory(row)">编辑</el-button><el-button link :type="row.status === 1 ? 'warning' : 'success'" @click="toggleCategory(row)">{{ row.status === 1 ? '停用' : '启用' }}</el-button></template></el-table-column></el-table>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="editorVisible" :title="editorMode === 'create' ? '新建资讯' : '编辑资讯'" width="min(1000px, 94vw)" destroy-on-close :close-on-click-modal="false">
      <div v-loading="editorLoading"><el-tabs v-model="editorTab"><el-tab-pane label="编辑" name="edit"><el-form ref="formRef" :model="form" :rules="newsRules" label-width="90px"><el-form-item label="分类" prop="categoryId"><el-select v-model="form.categoryId"><el-option v-for="item in editorCategories" :key="item.id" :label="item.name" :value="item.id"/></el-select></el-form-item><el-form-item label="标题" prop="title"><el-input v-model="form.title" maxlength="200" show-word-limit/></el-form-item><el-form-item label="摘要" prop="summary"><el-input v-model="form.summary" type="textarea" :rows="3" maxlength="500" show-word-limit/></el-form-item><el-form-item label="封面 URL" prop="coverUrl"><el-input v-model="form.coverUrl"/></el-form-item><el-form-item label="置顶"><el-switch v-model="form.isTop" :active-value="1" :inactive-value="0"/></el-form-item><el-form-item label="正文" prop="contentMd"><el-input v-model="form.contentMd" type="textarea" :rows="16" placeholder="支持 Markdown、LaTeX 与 Markdown 图片 URL"/></el-form-item></el-form></el-tab-pane><el-tab-pane label="预览" name="preview"><GovNewsContent :content="form.contentMd" /></el-tab-pane></el-tabs></div>
      <template #footer><el-button @click="editorVisible=false">取消</el-button><el-button type="primary" :loading="saving" @click="saveNews">{{ editorMode === 'create' ? '保存草稿' : '保存修改' }}</el-button></template>
    </el-dialog>
    <el-dialog v-model="detailVisible" title="资讯详情" width="min(900px, 94vw)"><div v-loading="detailLoading"><template v-if="detail"><h2>{{ detail.title }}</h2><p class="meta">{{ detail.categoryName }} · {{ getGovNewsStatusMeta(detail.status).label }} · {{ formatTime(detail.publishedAt) }}</p><GovNewsContent :content="detail.contentMd" /></template></div></el-dialog>
    <el-dialog v-model="categoryDialogVisible" :title="categoryMode === 'create' ? '新建分类' : '编辑分类'" width="480px"><el-form ref="categoryFormRef" :model="categoryForm" :rules="categoryRules" label-width="90px"><el-form-item label="分类名称" prop="name"><el-input v-model="categoryForm.name" maxlength="50" show-word-limit/></el-form-item><el-form-item label="排序"><el-input-number v-model="categoryForm.sortOrder" :min="0" :max="99999"/></el-form-item></el-form><template #footer><el-button @click="categoryDialogVisible=false">取消</el-button><el-button type="primary" :loading="categorySaving" @click="saveCategory">保存</el-button></template></el-dialog>
  </main>
</template>

<style scoped>
.manage-page{height:100%;overflow:auto;padding:24px;background:#f4f6f9;box-sizing:border-box}.manage-page>header,.manage-tabs{padding:20px 24px;background:#fff}.manage-page>header{padding-bottom:6px}.manage-page h1{margin:0;font-size:24px}.manage-page header p,.meta{color:#64748b}.toolbar{display:flex;gap:12px;margin-bottom:16px}.toolbar .el-input{width:280px}.toolbar .el-select{width:160px}.push-right{margin-left:auto}.el-alert{margin-bottom:14px}.el-pagination{justify-content:flex-end;margin-top:18px}:deep(.gov-news-content img){max-width:100%;height:auto}
</style>
