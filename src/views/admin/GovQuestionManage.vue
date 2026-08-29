<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import {
  createAdminGovQuestion,
  deleteAdminGovQuestion,
  importAdminGovQuestions,
  listAdminGovQuestions,
  updateAdminGovQuestion,
} from '@/api/govQuestion'

const SUBJECTS = [
  '政治理论',
  '常识判断',
  '语言理解与表达',
  '数量关系',
  '判断推理',
  '资料分析',
]

const QUESTION_TYPES = [
  { label: '单选题', value: 'SINGLE' },
  { label: '多选题', value: 'MULTIPLE' },
]

const SOURCE_TYPES = [
  { label: '真题', value: 'REAL' },
  { label: '模拟题', value: 'SIMULATION' },
]

const STATUS_OPTIONS = [
  { label: '草稿', value: 0 },
  { label: '已上架', value: 1 },
  { label: '已下架', value: 2 },
]

const listLoading = ref(false)
const tableData = ref([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogMode = ref('create')
const submitLoading = ref(false)
const currentId = ref(null)
const formRef = ref(null)
const importVisible = ref(false)
const importLoading = ref(false)
const importFile = ref(null)
const importData = ref([])
const importResult = ref(null)

const query = reactive({
  subject: '',
  questionType: '',
  status: '',
  keyword: '',
  pageNum: 1,
  pageSize: 10,
})

const form = reactive(getDefaultForm())

const rules = {
  subject: [{ required: true, message: '请选择科目', trigger: 'change' }],
  questionType: [{ required: true, message: '请选择题型', trigger: 'change' }],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  sourceType: [{ required: true, message: '请选择题目来源', trigger: 'change' }],
  stem: [{ required: true, message: '请输入题干', trigger: 'blur' }],
}

const validOptions = computed(() => form.options.filter((item) => item.content.trim()))
const optionKeys = computed(() => validOptions.value.map((item) => item.key))

function getDefaultForm() {
  return {
    subject: '',
    questionType: 'SINGLE',
    difficulty: 1,
    examYear: '',
    sourceType: 'SIMULATION',
    status: 0,
    stem: '',
    material: '',
    analysis: '',
    tagsText: '',
    options: [
      { key: 'A', content: '' },
      { key: 'B', content: '' },
      { key: 'C', content: '' },
      { key: 'D', content: '' },
    ],
    answers: [],
  }
}

function resetForm() {
  Object.assign(form, getDefaultForm())
  currentId.value = null
  nextTick(() => formRef.value?.clearValidate())
}

async function loadList() {
  listLoading.value = true
  try {
    const params = {
      pageNum: query.pageNum,
      pageSize: query.pageSize,
    }
    if (query.subject) params.subject = query.subject
    if (query.questionType) params.questionType = query.questionType
    if (query.status !== '') params.status = query.status
    if (query.keyword.trim()) params.keyword = query.keyword.trim()
    const data = await listAdminGovQuestions(params)
    tableData.value = data?.records || []
    total.value = Number(data?.total) || 0
  } catch (error) {
    tableData.value = []
    total.value = 0
    ElMessage.error(error?.message || '题库查询失败')
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

function openCreateDialog() {
  dialogMode.value = 'create'
  resetForm()
  dialogVisible.value = true
}

function openEditDialog(row) {
  dialogMode.value = 'edit'
  resetForm()
  currentId.value = row.id
  const content = row.content || {}
  Object.assign(form, {
    subject: row.subject || '',
    questionType: row.questionType || 'SINGLE',
    difficulty: Number(row.difficulty) || 1,
    examYear: row.examYear ?? '',
    sourceType: row.sourceType || 'SIMULATION',
    status: row.status ?? 0,
    stem: content.stem || '',
    material: content.material || '',
    analysis: content.analysis || '',
    tagsText: (content.tags || []).join('，'),
    options: (content.options || []).length
      ? content.options.map((item) => ({ key: item.key, content: item.content }))
      : getDefaultForm().options,
    answers: row.questionType === 'SINGLE'
      ? content.answer?.[0] || ''
      : content.answer || [],
  })
  dialogVisible.value = true
}

function addOption() {
  if (form.options.length >= 8) {
    ElMessage.warning('最多支持 8 个选项')
    return
  }
  const key = String.fromCharCode(65 + form.options.length)
  form.options.push({ key, content: '' })
}

function removeOption(index) {
  if (form.options.length <= 2) {
    ElMessage.warning('至少保留两个选项')
    return
  }
  const removedKey = form.options[index]?.key
  form.options.splice(index, 1)
  form.answers = answerList(form.answers).filter((answer) => answer !== removedKey)
}

function handleQuestionTypeChange() {
  form.answers = []
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  if (validOptions.value.length < 2) {
    ElMessage.warning('请至少填写两个有效选项')
    return
  }
  if (!answerList(form.answers).length) {
    ElMessage.warning('请选择正确答案')
    return
  }

  submitLoading.value = true
  try {
    const payload = {
      subject: form.subject,
      questionType: form.questionType,
      difficulty: Number(form.difficulty),
      examYear: form.examYear === '' ? null : Number(form.examYear),
      sourceType: form.sourceType,
      status: Number(form.status),
      content: {
        stem: form.stem.trim(),
        material: form.material.trim() || null,
        options: validOptions.value.map((item) => ({
          key: item.key.trim().toUpperCase(),
          content: item.content.trim(),
        })),
        answer: answerList(form.answers).map((item) => String(item).trim().toUpperCase()),
        analysis: form.analysis.trim() || null,
        tags: form.tagsText.split(/[，,]/).map((item) => item.trim()).filter(Boolean),
      },
    }
    await (dialogMode.value === 'edit'
      ? updateAdminGovQuestion(currentId.value, payload)
      : createAdminGovQuestion(payload))
    dialogVisible.value = false
    ElMessage.success(dialogMode.value === 'edit' ? '题目已保存' : '题目已创建')
    loadList()
  } catch (error) {
    ElMessage.error(error?.message || '保存失败')
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm('删除后无法恢复，确认删除这道题吗？', '删除确认', {
      type: 'error',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  listLoading.value = true
  try {
    await deleteAdminGovQuestion(row.id)
    ElMessage.success('题目已删除')
    if (tableData.value.length === 1 && query.pageNum > 1) {
      query.pageNum -= 1
    }
    loadList()
  } catch (error) {
    ElMessage.error(error?.message || '删除失败')
  } finally {
    listLoading.value = false
  }
}

function openImportDialog() {
  importVisible.value = true
  importFile.value = null
  importData.value = []
  importResult.value = null
}

function handleImportFileChange(uploadFile) {
  const file = uploadFile?.raw
  importFile.value = null
  importData.value = []
  importResult.value = null
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || '[]'))
      if (!Array.isArray(data) || !data.length) {
        throw new Error('JSON 必须是非空数组')
      }
      importData.value = data
      importFile.value = file
    } catch (error) {
      ElMessage.error(error?.message || 'JSON 文件解析失败')
    }
  }
  reader.onerror = () => ElMessage.error('文件读取失败')
  reader.readAsText(file)
}

async function handleImport() {
  if (!importData.value.length) {
    ElMessage.warning('请先选择包含题目的 JSON 文件')
    return
  }

  importLoading.value = true
  try {
    importResult.value = await importAdminGovQuestions(importData.value)
    ElMessage.success(`导入完成：成功 ${importResult.value.successCount} 道`)
    loadList()
  } catch (error) {
    ElMessage.error(error?.message || '批量导入失败')
  } finally {
    importLoading.value = false
  }
}

function statusLabel(status) {
  return STATUS_OPTIONS.find((item) => item.value === Number(status))?.label || '未知'
}

function statusType(status) {
  return { 0: 'info', 1: 'success', 2: 'warning' }[Number(status)] || 'info'
}

function typeLabel(type) {
  return QUESTION_TYPES.find((item) => item.value === type)?.label || type
}

function sourceLabel(type) {
  return SOURCE_TYPES.find((item) => item.value === type)?.label || type
}

function answerList(value) {
  return Array.isArray(value) ? value : value ? [value] : []
}

function questionPreview(row) {
  return row.content?.stem || '-'
}

onMounted(loadList)
</script>

<template>
  <main class="gov-question-page">
    <section class="toolbar-section">
      <div class="title-block">
        <h1>题库管理</h1>
      </div>
      <div class="toolbar-actions">
        <el-select v-model="query.subject" class="filter-select" placeholder="全部科目" clearable @change="handleSearch">
          <el-option v-for="item in SUBJECTS" :key="item" :label="item" :value="item" />
        </el-select>
        <el-select v-model="query.questionType" class="filter-select" placeholder="全部题型" clearable @change="handleSearch">
          <el-option v-for="item in QUESTION_TYPES" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="query.status" class="filter-select" placeholder="全部状态" clearable @change="handleSearch">
          <el-option v-for="item in STATUS_OPTIONS" :key="String(item.value)" :label="item.label" :value="item.value" />
        </el-select>
        <el-input
          v-model="query.keyword"
          class="keyword-input"
          clearable
          placeholder="搜索题干或解析"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" :icon="Search" :loading="listLoading" @click="handleSearch">搜索</el-button>
        <el-button type="primary" :icon="Plus" :disabled="listLoading" @click="openCreateDialog">新增题目</el-button>
        <el-button type="success" :icon="Upload" :disabled="listLoading" @click="openImportDialog">批量导入</el-button>
      </div>
    </section>

    <section class="table-section">
      <el-table v-loading="listLoading" :data="tableData" border height="100%">
        <el-table-column prop="id" label="ID" width="72" align="center" />
        <el-table-column label="题干" min-width="280" show-overflow-tooltip>
          <template #default="{ row }">{{ questionPreview(row) }}</template>
        </el-table-column>
        <el-table-column label="科目" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.subject }}</template>
        </el-table-column>
        <el-table-column label="题型" width="90" align="center">
          <template #default="{ row }">{{ typeLabel(row.questionType) }}</template>
        </el-table-column>
        <el-table-column prop="difficulty" label="难度" width="78" align="center" />
        <el-table-column label="来源" width="90" align="center">
          <template #default="{ row }">{{ sourceLabel(row.sourceType) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="92" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="light">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="170" show-overflow-tooltip />
        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="listLoading" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" :disabled="listLoading" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无题目数据" :image-size="118" />
        </template>
      </el-table>
    </section>

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

    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'edit' ? '编辑题目' : '新增题目'"
      width="860px"
      append-to-body
      destroy-on-close
      @closed="resetForm"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="92px">
        <el-row :gutter="18">
          <el-col :span="12">
            <el-form-item label="科目" prop="subject">
              <el-select v-model="form.subject" class="full-width" placeholder="请选择科目">
                <el-option v-for="item in SUBJECTS" :key="item" :label="item" :value="item" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="题型" prop="questionType">
              <el-select v-model="form.questionType" class="full-width" @change="handleQuestionTypeChange">
                <el-option v-for="item in QUESTION_TYPES" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="18">
          <el-col :span="8">
            <el-form-item label="难度" prop="difficulty">
              <el-select v-model="form.difficulty" class="full-width">
                <el-option v-for="level in 5" :key="level" :label="`${level} 星`" :value="level" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="年份">
              <el-input v-model="form.examYear" placeholder="可空" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="来源" prop="sourceType">
              <el-select v-model="form.sourceType" class="full-width">
                <el-option v-for="item in SOURCE_TYPES" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="题干" prop="stem">
          <el-input v-model="form.stem" type="textarea" :rows="3" maxlength="2000" show-word-limit />
        </el-form-item>
        <el-form-item label="材料">
          <el-input v-model="form.material" type="textarea" :rows="2" maxlength="3000" show-word-limit />
        </el-form-item>
        <el-form-item label="选项">
          <div class="options-editor">
            <div v-for="(option, index) in form.options" :key="`${index}-${option.key}`" class="option-row">
              <el-input v-model="option.key" class="option-key" maxlength="2" />
              <el-input v-model="option.content" class="option-content" placeholder="选项内容" />
              <el-button type="danger" :icon="Delete" circle @click="removeOption(index)" />
            </div>
            <el-button type="primary" :icon="Plus" text @click="addOption">添加选项</el-button>
          </div>
        </el-form-item>
        <el-form-item label="正确答案">
          <el-radio-group v-if="form.questionType === 'SINGLE'" v-model="form.answers">
            <el-radio v-for="option in validOptions" :key="option.key" :value="option.key">
              {{ option.key }}. {{ option.content }}
            </el-radio>
          </el-radio-group>
          <el-checkbox-group v-else v-model="form.answers" class="answer-checkbox-group">
            <el-checkbox v-for="option in validOptions" :key="option.key" :value="option.key">
              {{ option.key }}. {{ option.content }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
        <el-form-item label="解析">
          <el-input v-model="form.analysis" type="textarea" :rows="3" maxlength="3000" show-word-limit />
        </el-form-item>
        <el-form-item label="标签">
          <el-input v-model="form.tagsText" placeholder="多个标签用逗号分隔" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio v-for="item in STATUS_OPTIONS" :key="item.value" :value="item.value">{{ item.label }}</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="submitLoading" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确认</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="importVisible"
      title="批量导入题目"
      width="680px"
      append-to-body
      destroy-on-close
      @closed="openImportDialog"
    >
      <el-upload
        drag
        action="#"
        accept=".json,application/json"
        :auto-upload="false"
        :limit="1"
        :on-change="handleImportFileChange"
        :on-remove="openImportDialog"
      >
        <div class="import-upload">
          <el-icon class="upload-icon"><Upload /></el-icon>
          <span>选择 JSON 文件</span>
          <small>文件内容必须是题目对象的数组</small>
        </div>
      </el-upload>
      <el-alert
        v-if="importData.length"
        class="import-preview"
        :title="`已解析 ${importData.length} 道题`"
        type="info"
        show-icon
      />
      <div v-if="importResult" class="import-result">
        <el-alert
          :title="`成功 ${importResult.successCount} 道，失败 ${importResult.failedCount} 道`"
          :type="importResult.failedCount ? 'warning' : 'success'"
          show-icon
        />
        <ul v-if="importResult.errors?.length" class="import-errors">
          <li v-for="error in importResult.errors" :key="error.index">
            第 {{ error.index }} 条：{{ error.reason }}
          </li>
        </ul>
      </div>
      <template #footer>
        <el-button :disabled="importLoading" @click="importVisible = false">关闭</el-button>
        <el-button type="primary" :loading="importLoading" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.gov-question-page {
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
  flex-wrap: wrap;
}

.filter-select {
  width: 150px;
}

.keyword-input {
  width: 210px;
}

.table-section {
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
  border-radius: 8px;
  background: #ffffff;
}

.pagination-bar {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;
}

.full-width {
  width: 100%;
}

.options-editor {
  display: grid;
  width: 100%;
  gap: 10px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-key {
  width: 74px;
  flex: 0 0 auto;
}

.option-content {
  min-width: 0;
  flex: 1;
}

.answer-checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
}

.import-upload {
  display: grid;
  justify-items: center;
  gap: 7px;
  padding: 20px;
  color: #64748b;
}

.upload-icon {
  color: #2f80ed;
  font-size: 34px;
}

.import-upload small {
  color: #94a3b8;
  font-size: 12px;
}

.import-preview,
.import-result {
  margin-top: 16px;
}

.import-errors {
  max-height: 180px;
  margin: 12px 0 0;
  padding-left: 20px;
  overflow: auto;
  color: #b42318;
  font-size: 13px;
  line-height: 1.7;
}

@media (max-width: 760px) {
  .toolbar-section {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-select,
  .keyword-input {
    width: 100%;
  }

  .option-row {
    flex-wrap: wrap;
  }

  .option-content {
    width: calc(100% - 100px);
  }
}
</style>
