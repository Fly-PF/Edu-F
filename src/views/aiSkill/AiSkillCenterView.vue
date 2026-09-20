<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  cancelCollectSkill,
  collectSkill,
  deleteSkill,
  exportSkill,
  getMySkills,
  getSkillCategories,
  getSkillCollections,
  getSkillDetail,
  getSkillMarket,
  importSkill,
  invokeSkill,
  offlineSkill,
  publishSkill,
} from '@/api/aiSkill'

const route = useRoute()
const router = useRouter()

const skillTypeOptions = [
  { label: '讲题方法', value: 'TEACHING_METHOD' },
  { label: '答题步骤', value: 'ANSWER_STEPS' },
  { label: '批改标准', value: 'GRADING_STANDARD' },
  { label: '学习计划', value: 'STUDY_PLAN' },
  { label: '其他', value: 'OTHER' },
]
const statusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已下线', value: 'OFFLINE' },
]
const visibilityMap = { PRIVATE: '仅自己使用', PUBLIC: '公开发布' }
const statusMap = {
  DRAFT: { label: '草稿', type: 'info' },
  PUBLISHED: { label: '已发布', type: 'success' },
  OFFLINE: { label: '已下线', type: 'warning' },
}

const activeTab = ref(route.path.includes('/mine') ? 'mine' : 'market')
const loading = ref(false)
const actionId = ref(null)
const skills = ref([])
const total = ref(0)
const categories = ref([])
const detailVisible = ref(false)
const detailLoading = ref(false)
const currentDetail = ref(null)
const invokeVisible = ref(false)
const invokeLoading = ref(false)
const invokeInput = ref('')
const invokeResult = ref('')
const invokeTarget = ref(null)
const importVisible = ref(false)
const importLoading = ref(false)
const importFile = ref(null)
const importForm = reactive({ skillName: '', description: '', skillType: '', subjectType: '', targetAudience: '', visibility: 'PRIVATE', categoryIds: [] })
const query = reactive({ keyword: '', skillType: '', subjectType: '', targetAudience: '', categoryId: '', status: '', pageNum: 1, pageSize: 12 })

const subjectCategories = computed(() => categories.value.filter((item) => item.categoryType === 'SUBJECT'))
const audienceCategories = computed(() => categories.value.filter((item) => item.categoryType === 'AUDIENCE'))
const isMarket = computed(() => activeTab.value === 'market')
const isMine = computed(() => activeTab.value === 'mine')
const pageTitle = computed(() => activeTab.value === 'market' ? '技能市场' : activeTab.value === 'mine' ? '我的 Skill' : '我的收藏')
const emptyText = computed(() => activeTab.value === 'market' ? '还没有找到合适的 Skill' : activeTab.value === 'mine' ? '你还没有创建 Skill' : '还没有收藏 Skill')
const emptyButtonText = computed(() => activeTab.value === 'market' ? '创建 Skill' : activeTab.value === 'mine' ? '新建 Skill' : '去市场看看')

function getCategoryName(item) {
  return item.categoryName || item.name || item.label || ''
}

function skillTypeLabel(value) {
  return skillTypeOptions.find((item) => item.value === value)?.label || value || '其他'
}

function statusMeta(value) {
  return statusMap[value] || { label: value || '未知', type: 'info' }
}

function formatTime(value) {
  return value ? String(value).replace('T', ' ').slice(0, 16) : '-'
}

function errorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function normalizePage(page) {
  if (Array.isArray(page)) {
    return { records: page, total: page.length, pageNum: query.pageNum, pageSize: query.pageSize }
  }
  return {
    records: page?.records || page?.list || page?.rows || page?.content || [],
    total: Number(page?.total ?? page?.totalElements ?? 0),
    pageNum: Number(page?.pageNum ?? page?.current ?? query.pageNum),
    pageSize: Number(page?.pageSize ?? page?.size ?? query.pageSize),
  }
}

function buildQuery() {
  const params = { pageNum: query.pageNum, pageSize: query.pageSize }

  if (activeTab.value === 'mine') {
    params.keyword = query.keyword?.trim?.() || ''
    if (query.status) params.status = query.status
    return params
  }

  if (activeTab.value === 'collections') {
    return params
  }

  ;['keyword', 'skillType', 'subjectType', 'targetAudience', 'categoryId'].forEach((key) => {
    const value = typeof query[key] === 'string' ? query[key].trim() : query[key]
    if (value !== '' && value !== null && value !== undefined) params[key] = value
  })
  return params
}

async function loadCategories() {
  try {
    categories.value = await getSkillCategories()
  } catch (error) {
    categories.value = []
  }
}

async function loadMineSkills() {
  const keyword = query.keyword?.trim?.() || ''

  if (query.status) {
    return normalizePage(await getMySkills({
      keyword,
      status: query.status,
      pageNum: query.pageNum,
      pageSize: query.pageSize,
    }))
  }

  const statuses = ['DRAFT', 'PUBLISHED', 'OFFLINE']
  const pages = await Promise.all(statuses.map((status) => getMySkills({
    keyword,
    status,
    pageNum: 1,
    pageSize: 1000,
  }).then(normalizePage)))
  const allRecords = pages.flatMap((page) => page.records)
  const start = (query.pageNum - 1) * query.pageSize
  const end = start + query.pageSize

  return {
    records: allRecords.slice(start, end),
    total: allRecords.length,
    pageNum: query.pageNum,
    pageSize: query.pageSize,
  }
}

async function loadSkills() {
  loading.value = true
  try {
    const page = activeTab.value === 'mine'
      ? await loadMineSkills()
      : normalizePage(await (activeTab.value === 'collections' ? getSkillCollections : getSkillMarket)(buildQuery()))
    skills.value = page.records
    total.value = page.total
    query.pageNum = page.pageNum
    query.pageSize = page.pageSize
  } catch (error) {
    skills.value = []
    total.value = 0
    ElMessage.error(errorMessage(error, 'Skill 加载失败'))
  } finally {
    loading.value = false
  }
}

function search() {
  query.pageNum = 1
  loadSkills()
}

function resetSearch() {
  Object.assign(query, { keyword: '', skillType: '', subjectType: '', targetAudience: '', categoryId: '', status: '', pageNum: 1 })
  loadSkills()
}

function handleTabChange(name) {
  const path = name === 'mine' ? '/main/ai-skills/mine' : '/main/ai-skills'
  if (name === 'collections') {
    router.push({ path: '/main/ai-skills', query: { tab: 'collections' } })
  } else if (route.path !== path || route.query.tab) {
    router.push(path)
  }
}

function createSkill() {
  router.push('/main/ai-skills/editor')
}

function editSkill(row) {
  router.push(`/main/ai-skills/editor/${row.id}`)
}

async function showDetail(row) {
  detailVisible.value = true
  detailLoading.value = true
  currentDetail.value = null
  try {
    currentDetail.value = await getSkillDetail(row.id)
  } catch (error) {
    detailVisible.value = false
    ElMessage.error(errorMessage(error, '详情加载失败'))
  } finally {
    detailLoading.value = false
  }
}

async function toggleCollect(row) {
  actionId.value = row.id
  try {
    if (row.collected) {
      await cancelCollectSkill(row.id)
      ElMessage.success('已取消收藏')
    } else {
      await collectSkill(row.id)
      ElMessage.success('已收藏')
    }
    await loadSkills()
  } catch (error) {
    ElMessage.error(errorMessage(error, row.collected ? '取消收藏失败' : '收藏失败'))
  } finally {
    actionId.value = null
  }
}

function filenameFromDisposition(disposition) {
  if (!disposition) return ''
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition)
  if (utf8Match) return decodeURIComponent(utf8Match[1])
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  return match ? decodeURIComponent(match[1]) : ''
}

async function downloadSkill(row) {
  actionId.value = row.id
  try {
    const response = await exportSkill(row.id)
    const blob = response?.data instanceof Blob ? response.data : new Blob([response?.data || response])
    const headerName = filenameFromDisposition(response?.headers?.['content-disposition'])
    const fileName = headerName || `${row.skillName || 'Skill'}.zip`
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    ElMessage.error(errorMessage(error, '导出 Skill 失败'))
  } finally {
    actionId.value = null
  }
}

async function publishRow(row) {
  const label = row.status === 'OFFLINE' ? '重新发布' : '发布'
  try { await ElMessageBox.confirm(`确认${label}“${row.skillName}”吗？`, `${label}确认`, { type: 'warning' }) } catch { return }
  actionId.value = row.id
  try {
    await publishSkill(row.id)
    ElMessage.success(`${label}成功`)
    await loadSkills()
  } catch (error) {
    ElMessage.error(errorMessage(error, `${label}失败`))
  } finally {
    actionId.value = null
  }
}

async function offlineRow(row) {
  try { await ElMessageBox.confirm(`确认下线“${row.skillName}”吗？`, '下线确认', { type: 'warning' }) } catch { return }
  actionId.value = row.id
  try {
    await offlineSkill(row.id)
    ElMessage.success('下线成功')
    await loadSkills()
  } catch (error) {
    ElMessage.error(errorMessage(error, '下线失败'))
  } finally {
    actionId.value = null
  }
}

async function deleteRow(row) {
  try { await ElMessageBox.confirm(`确认删除“${row.skillName}”吗？删除后不可恢复。`, '删除确认', { type: 'warning' }) } catch { return }
  actionId.value = row.id
  try {
    await deleteSkill(row.id)
    ElMessage.success('删除成功')
    await loadSkills()
  } catch (error) {
    ElMessage.error(errorMessage(error, '删除失败'))
  } finally {
    actionId.value = null
  }
}

function openInvoke(row) {
  invokeTarget.value = row
  invokeInput.value = row.exampleInput || ''
  invokeResult.value = ''
  invokeVisible.value = true
}

async function runInvoke() {
  if (!invokeInput.value.trim()) {
    ElMessage.warning('请输入调用内容')
    return
  }
  invokeLoading.value = true
  try {
    const data = await invokeSkill(invokeTarget.value.id, { sourceModule: 'skill-market', inputText: invokeInput.value.trim() })
    invokeResult.value = data?.assembledPrompt || ''
  } catch (error) {
    ElMessage.error(errorMessage(error, '试用 Skill 失败'))
  } finally {
    invokeLoading.value = false
  }
}

async function copyPrompt() {
  await navigator.clipboard.writeText(invokeResult.value)
  ElMessage.success('已复制')
}

function openImport() {
  Object.assign(importForm, { skillName: '', description: '', skillType: '', subjectType: '', targetAudience: '', visibility: 'PRIVATE', categoryIds: [] })
  importFile.value = null
  importVisible.value = true
}

function beforeImportUpload(file) {
  importFile.value = file
  return false
}

function handleImportChange(uploadFile) {
  importFile.value = uploadFile?.raw || uploadFile
}

async function submitImport() {
  if (!importFile.value) {
    ElMessage.warning('请先选择 zip 文件')
    return
  }
  importLoading.value = true
  try {
    await importSkill({ ...importForm, file: importFile.value })
    ElMessage.success('导入成功，已保存为草稿，可继续编辑后发布。')
    importVisible.value = false
    activeTab.value = 'mine'
    await router.push('/main/ai-skills/mine')
    await loadSkills()
  } catch (error) {
    ElMessage.error(errorMessage(error, '导入失败'))
  } finally {
    importLoading.value = false
  }
}

function handleEmptyAction() {
  if (activeTab.value === 'collections') {
    activeTab.value = 'market'
    handleTabChange('market')
    return
  }
  createSkill()
}

watch(
  () => route.fullPath,
  () => {
    activeTab.value = route.query.tab === 'collections' ? 'collections' : route.path.includes('/mine') ? 'mine' : 'market'
    query.pageNum = 1
    loadSkills()
  },
)

onMounted(async () => {
  await loadCategories()
  await loadSkills()
})
</script>

<template>
  <main class="skill-page">
    <header class="page-header">
      <div class="hero-copy">
        <p class="eyebrow">AI SKILL MARKET</p>
        <h1>{{ pageTitle }}</h1>
        <p>把讲题方法、答题步骤、批改标准和学习计划，整理成可以复用和分享的 Skill。</p>
        <div class="header-actions">
          <el-button @click="openImport">导入 Skill</el-button>
          <el-button type="primary" @click="createSkill">创建 Skill</el-button>
        </div>
      </div>
      <div class="hero-doodle" aria-hidden="true">
        <div class="orbit orbit-one"></div>
        <div class="orbit orbit-two"></div>
        <div class="idea-card">
          <span>SKILL</span>
          <strong>?</strong>
        </div>
        <span class="spark spark-a">+</span>
        <span class="spark spark-b">*</span>
        <span class="paper-chip chip-make">MAKE</span>
        <span class="paper-chip chip-go">GO!</span>
      </div>
    </header>

    <section class="content-panel">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="技能市场" name="market" />
        <el-tab-pane label="我的 Skill" name="mine" />
        <el-tab-pane label="我的收藏" name="collections" />
      </el-tabs>

      <div v-if="activeTab !== 'collections'" class="toolbar">
        <el-input v-model="query.keyword" clearable placeholder="搜索 Skill 名称或说明" @keyup.enter="search" />
        <el-select v-if="isMarket" v-model="query.skillType" clearable placeholder="技能类型">
          <el-option v-for="item in skillTypeOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-if="isMarket" v-model="query.subjectType" clearable placeholder="学科类型">
          <el-option v-for="item in subjectCategories" :key="item.id" :label="getCategoryName(item)" :value="getCategoryName(item)" />
        </el-select>
        <el-select v-if="isMarket" v-model="query.targetAudience" clearable placeholder="适用人群">
          <el-option v-for="item in audienceCategories" :key="item.id" :label="getCategoryName(item)" :value="getCategoryName(item)" />
        </el-select>
        <el-select v-if="isMine" v-model="query.status" clearable placeholder="全部状态">
          <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-button type="primary" @click="search">搜索</el-button>
        <el-button @click="resetSearch">重置</el-button>
      </div>

      <div v-loading="loading" class="skill-grid">
        <el-empty v-if="!skills.length" :description="emptyText">
          <el-button type="primary" @click="handleEmptyAction">{{ emptyButtonText }}</el-button>
        </el-empty>
        <article v-for="item in skills" v-else :key="item.id" class="skill-card">
          <div class="card-sticker">MAKE IT</div>
          <span class="card-plus">+</span>
          <div class="card-hero-row">
            <div class="skill-icon" aria-hidden="true">
              <span>SK</span>
            </div>
            <div class="tag-row">
              <el-tag size="small">{{ skillTypeLabel(item.skillType) }}</el-tag>
              <el-tag v-if="!isMarket" size="small" :type="statusMeta(item.status).type">{{ statusMeta(item.status).label }}</el-tag>
              <el-tag v-if="!isMarket" size="small" type="info">{{ visibilityMap[item.visibility] || item.visibility }}</el-tag>
            </div>
          </div>
          <h2>{{ item.skillName }}</h2>
          <p class="description">{{ item.description || '暂无简介' }}</p>
          <dl class="meta-list">
            <div><dt>适用对象</dt><dd>{{ item.targetAudience || '-' }}</dd></div>
            <div><dt>学科类型</dt><dd>{{ item.subjectType || '-' }}</dd></div>
            <div><dt>创建者</dt><dd>{{ item.creatorName || '-' }}</dd></div>
            <div><dt>更新时间</dt><dd>{{ formatTime(item.updateTime) }}</dd></div>
          </dl>
          <p class="usage">{{ item.usageGuide || '暂无使用方法说明' }}</p>
          <div class="card-actions">
            <template v-if="isMine">
              <div class="secondary-actions">
                <el-button @click="editSkill(item)">编辑</el-button>
                <el-button v-if="['PUBLISHED', 'OFFLINE'].includes(item.status)" @click="downloadSkill(item)">导出</el-button>
                <el-button v-if="['PUBLISHED', 'OFFLINE'].includes(item.status)" class="danger-action" :loading="actionId === item.id" @click="deleteRow(item)">删除</el-button>
              </div>
              <el-button v-if="item.status === 'DRAFT'" class="wide-action" type="primary" :loading="actionId === item.id" @click="publishRow(item)">发布到市场</el-button>
              <el-button v-if="item.status === 'PUBLISHED'" class="wide-action" type="primary" :loading="actionId === item.id" @click="offlineRow(item)">下线 Skill</el-button>
              <el-button v-if="item.status === 'OFFLINE'" class="wide-action" type="primary" :loading="actionId === item.id" @click="publishRow(item)">重新发布</el-button>
            </template>
            <template v-else>
              <div class="secondary-actions">
                <el-button :loading="actionId === item.id" @click="toggleCollect(item)">{{ item.collected ? '取消收藏' : '收藏' }}</el-button>
                <el-button @click="showDetail(item)">查看详情</el-button>
                <el-button @click="downloadSkill(item)">下载</el-button>
              </div>
              <el-button class="wide-action" type="primary" @click="openInvoke(item)">试用 Skill</el-button>
            </template>
          </div>
        </article>
      </div>

      <el-pagination
        v-if="total > 0"
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @current-change="loadSkills"
        @size-change="search"
      />
    </section>

    <el-dialog v-model="detailVisible" title="Skill 详情" width="min(860px, 94vw)">
      <div v-loading="detailLoading">
        <template v-if="currentDetail">
          <div class="detail-head">
            <h2>{{ currentDetail.skillName }}</h2>
            <div class="tag-row">
              <el-tag>{{ skillTypeLabel(currentDetail.skillType) }}</el-tag>
              <el-tag :type="statusMeta(currentDetail.status).type">{{ statusMeta(currentDetail.status).label }}</el-tag>
            </div>
          </div>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="适用对象">{{ currentDetail.targetAudience || '-' }}</el-descriptions-item>
            <el-descriptions-item label="学科类型">{{ currentDetail.subjectType || '-' }}</el-descriptions-item>
            <el-descriptions-item label="创建者">{{ currentDetail.creatorName || '-' }}</el-descriptions-item>
            <el-descriptions-item label="更新时间">{{ formatTime(currentDetail.updateTime) }}</el-descriptions-item>
            <el-descriptions-item label="使用方法" :span="2">{{ currentDetail.usageGuide || '-' }}</el-descriptions-item>
            <el-descriptions-item label="示例输入" :span="2">{{ currentDetail.exampleInput || '-' }}</el-descriptions-item>
            <el-descriptions-item label="示例效果" :span="2">{{ currentDetail.exampleOutput || '-' }}</el-descriptions-item>
          </el-descriptions>
          <h3>文件清单</h3>
          <el-empty v-if="!currentDetail.files?.length" description="暂无文件" />
          <el-collapse v-else>
            <el-collapse-item v-for="file in currentDetail.files" :key="`${file.isInReferences}-${file.fileName}`" :title="`${file.isInReferences ? 'references/' : ''}${file.fileName}`">
              <pre v-if="file.content" class="file-content">{{ file.content }}</pre>
              <p v-else class="muted">当前仅展示文件清单。</p>
            </el-collapse-item>
          </el-collapse>
        </template>
      </div>
    </el-dialog>

    <el-dialog v-model="invokeVisible" title="试用 Skill" width="min(900px, 94vw)" :close-on-click-modal="false">
      <el-form label-position="top">
        <el-form-item label="输入内容">
          <el-input v-model="invokeInput" type="textarea" :rows="5" placeholder="请输入要交给 Skill 组织的教学或学习内容" />
        </el-form-item>
        <el-form-item v-if="invokeResult" label="已生成调用提示词">
          <el-input v-model="invokeResult" type="textarea" :rows="12" readonly />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="invokeVisible = false">关闭</el-button>
        <el-button v-if="invokeResult" @click="copyPrompt">复制</el-button>
        <el-button type="primary" :loading="invokeLoading" @click="runInvoke">生成调用内容</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="importVisible" title="导入 Skill" width="min(720px, 94vw)" :close-on-click-modal="false">
      <el-alert class="import-tip" type="info" show-icon :closable="false">
        <p>支持 zip 文件。zip 内必须包含 SKILL.md，README.md 可选，references/*.md 可选。</p>
        <p>可以直接在 zip 根目录放 SKILL.md，也可以多包一层文件夹。</p>
      </el-alert>
      <el-upload drag :auto-upload="false" accept=".zip" :limit="1" :before-upload="beforeImportUpload" :on-change="handleImportChange" :on-remove="() => { importFile = null }">
        <div class="upload-text">选择或拖入 Skill zip 文件</div>
      </el-upload>
      <el-form class="import-form" label-width="92px">
        <el-form-item label="Skill 名称"><el-input v-model="importForm.skillName" placeholder="可选，留空使用文件内信息" /></el-form-item>
        <el-form-item label="简介"><el-input v-model="importForm.description" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="技能类型"><el-select v-model="importForm.skillType" clearable><el-option v-for="item in skillTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="可见范围"><el-radio-group v-model="importForm.visibility"><el-radio-button label="PRIVATE">仅自己使用</el-radio-button><el-radio-button label="PUBLIC">公开发布</el-radio-button></el-radio-group></el-form-item>
        <el-form-item label="分类"><el-select v-model="importForm.categoryIds" multiple clearable><el-option v-for="item in categories" :key="item.id" :label="getCategoryName(item)" :value="item.id" /></el-select></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button type="primary" :loading="importLoading" @click="submitImport">导入</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.skill-page {
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
  grid-template-columns: minmax(0, 1fr) 380px;
  min-height: 270px;
  gap: 20px;
  align-items: center;
  overflow: hidden;
  padding: 44px clamp(26px, 5vw, 58px);
  border: 2px solid #565083;
  border-radius: 10px;
  background:
    linear-gradient(110deg, rgba(221, 214, 255, 0.92), rgba(255, 219, 236, 0.9) 48%, rgba(209, 247, 250, 0.9)),
    linear-gradient(rgba(86, 80, 131, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(86, 80, 131, 0.08) 1px, transparent 1px);
  background-size: auto, 24px 24px, 24px 24px;
  box-shadow: 10px 10px 0 #6f6a91;
}
.hero-copy { position: relative; z-index: 2; max-width: 720px; }
.eyebrow {
  display: inline-flex;
  align-items: center;
  margin: 0 0 18px;
  padding: 7px 13px;
  border: 2px solid #565083;
  background: #fff0a8;
  color: #30295d;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0;
  box-shadow: 4px 4px 0 rgba(86, 80, 131, 0.28);
  transform: rotate(-2deg);
}
h1 { margin: 0; color: #352c65; font-size: clamp(44px, 6vw, 74px); line-height: 1; font-weight: 900; }
.page-header p:last-of-type { max-width: 600px; margin: 18px 0 0; color: #58517f; font-size: 18px; font-weight: 700; line-height: 1.65; }
.header-actions, .toolbar, .tag-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.header-actions { margin-top: 24px; }
.hero-doodle { position: relative; width: 340px; height: 220px; justify-self: end; }
.orbit { position: absolute; inset: 22px 72px 16px 78px; border: 3px solid #78d3dc; border-radius: 50%; animation: orbit-spin 7s linear infinite; }
.orbit-two { border-color: #aaa5c4; border-style: dashed; transform: rotate(62deg); animation-duration: 10s; animation-direction: reverse; }
.idea-card { position: absolute; top: 64px; left: 120px; display: grid; width: 126px; height: 126px; place-items: center; border: 3px solid #565083; background: #fff; box-shadow: 8px 8px 0 rgba(86, 80, 131, 0.25); animation: float-card 3.8s ease-in-out infinite; }
.idea-card span { color: #69cbd0; font-size: 14px; font-weight: 900; letter-spacing: 2px; }
.idea-card strong { color: #352c65; font-size: 52px; line-height: 0.8; }
.spark { position: absolute; color: #7bd0d5; font-size: 34px; font-weight: 900; animation: twinkle 2s ease-in-out infinite; }
.spark-a { right: 30px; bottom: 46px; }
.spark-b { left: 48px; top: 38px; color: #f08abb; animation-delay: 0.4s; }
.paper-chip { position: absolute; padding: 6px 13px; border: 2px solid #565083; background: #fff5af; color: #352c65; font-size: 13px; font-weight: 900; box-shadow: 4px 4px 0 rgba(86, 80, 131, 0.25); }
.chip-make { right: 10px; top: 44px; transform: rotate(7deg); }
.chip-go { left: 46px; bottom: 38px; transform: rotate(-8deg); }
.content-panel { margin-top: 46px; padding: 24px; border-top: 3px solid #8176d7; background: transparent; }
:deep(.el-tabs__nav-wrap::after) { height: 0; }
:deep(.el-tabs__item) { color: #655d90; font-weight: 800; }
:deep(.el-tabs__item.is-active) { color: #352c65; }
:deep(.el-tabs__active-bar) { height: 4px; border-radius: 999px; background: #8176d7; }
.toolbar { margin: 18px 0 26px; padding: 16px; border: 2px solid #d8d3f5; border-radius: 10px; background: rgba(255, 255, 255, 0.78); box-shadow: 6px 6px 0 rgba(129, 118, 215, 0.16); }
.toolbar .el-input { width: 280px; }
.toolbar .el-select { width: 150px; }
.skill-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 24px; min-height: 240px; }
.skill-grid :deep(.el-empty) { grid-column: 1 / -1; padding: 44px 0; border: 2px dashed #b8b0dd; border-radius: 8px; background: rgba(255, 253, 244, 0.76); }
.skill-card {
  position: relative;
  isolation: isolate;
  display: flex;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  padding: 22px 22px 20px;
  border: 2px solid #352c65;
  border-radius: 6px;
  background:
    radial-gradient(circle at 92% 18%, rgba(255, 235, 150, 0.24) 0 38px, transparent 39px),
    radial-gradient(circle at 12% 86%, rgba(245, 174, 203, 0.055) 0 72px, transparent 73px),
    linear-gradient(145deg, #fffef3 0%, #fffdf0 52%, #fffbed 100%);
  box-shadow: 3px 4px 0 rgba(53, 44, 101, 0.22);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.skill-card::before {
  content: '';
  position: absolute;
  right: -46px;
  bottom: -44px;
  z-index: -1;
  width: 150px;
  height: 150px;
  border: 3px solid rgba(53, 44, 101, 0.3);
  border-radius: 50%;
  background: repeating-linear-gradient(135deg, rgba(120, 211, 220, 0.2) 0 8px, transparent 8px 16px);
}
.skill-card::after {
  content: '';
  position: absolute;
  top: 86px;
  right: 26px;
  width: 46px;
  height: 18px;
  border-top: 3px solid rgba(240, 138, 187, 0.72);
  border-radius: 50%;
  transform: rotate(-18deg);
}
.skill-card:hover { transform: translate(-1px, -2px); box-shadow: 5px 6px 0 rgba(53, 44, 101, 0.24); }
.card-sticker {
  position: absolute;
  top: 14px;
  right: 16px;
  z-index: 2;
  padding: 6px 13px;
  border: 2px solid #352c65;
  border-radius: 3px;
  background: #fff0a2;
  color: #352c65;
  font-size: 12px;
  font-weight: 900;
  box-shadow: 2px 2px 0 rgba(53, 44, 101, 0.16);
  transform: rotate(7deg);
}
.card-plus {
  position: absolute;
  top: 66px;
  left: 26px;
  color: #7bd0d5;
  font-size: 34px;
  font-weight: 900;
  line-height: 1;
  animation: twinkle 2.4s ease-in-out infinite;
}
.card-hero-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  min-height: 72px;
  margin-bottom: 10px;
  padding-right: 104px;
}
.skill-icon {
  position: relative;
  display: grid;
  width: 64px;
  height: 64px;
  flex: 0 0 auto;
  place-items: center;
  border: 2px solid #352c65;
  border-radius: 5px;
  background:
    linear-gradient(rgba(53, 44, 101, 0.07) 2px, transparent 2px),
    linear-gradient(90deg, rgba(53, 44, 101, 0.07) 2px, transparent 2px),
    #e9fbfc;
  background-size: 18px 18px;
  box-shadow: 3px 3px 0 rgba(53, 44, 101, 0.14);
  transform: rotate(-3deg);
}
.skill-icon::before {
  content: '';
  position: absolute;
  right: -10px;
  bottom: 10px;
  width: 20px;
  height: 20px;
  border: 2px solid #352c65;
  border-radius: 50%;
  background: #f2a6c8;
}
.skill-icon span { color: #352c65; font-size: 24px; font-weight: 900; letter-spacing: 0; }
.skill-card .tag-row { justify-content: flex-end; max-width: 170px; padding-top: 30px; }
.skill-card h2 {
  margin: 0 0 8px;
  color: #352c65;
  font-size: 25px;
  font-weight: 900;
  line-height: 1.25;
}
.description {
  margin: 0 0 12px;
  color: #5c547e;
  font-size: 15px;
  font-weight: 800;
  line-height: 1.65;
}
.meta-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0;
  padding: 10px;
  border: 2px dashed rgba(53, 44, 101, 0.4);
  border-radius: 5px;
  background: rgba(255, 253, 242, 0.88);
}
.meta-list div { min-width: 0; padding: 7px 8px; border-radius: 4px; background: rgba(255, 250, 238, 0.92); }
dt { color: #8176a8; font-size: 12px; font-weight: 900; }
dd { margin: 4px 0 0; overflow: hidden; color: #30295d; font-weight: 900; text-overflow: ellipsis; white-space: nowrap; }
.usage {
  margin: 10px 0 14px;
  color: #70698d;
  font-weight: 700;
  line-height: 1.6;
}
.card-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 3px solid rgba(53, 44, 101, 0.18);
}
.secondary-actions { display: grid; grid-template-columns: repeat(auto-fit, minmax(82px, 1fr)); gap: 10px; }
.secondary-actions :deep(.el-button) {
  width: 100%;
  min-width: 0;
  margin-left: 0;
  padding: 8px 10px;
  border: 2px solid #706998;
  border-radius: 5px;
  background: #fffdf0;
  color: #352c65;
}
.wide-action {
  width: 100%;
  min-height: 40px;
  margin-left: 0 !important;
  border-width: 2px !important;
  border-radius: 6px !important;
  font-size: 15px;
  box-shadow: 2px 3px 0 rgba(53, 44, 101, 0.18) !important;
}
.danger-action {
  --el-button-text-color: #c24b66;
  --el-button-border-color: #f2a4b6;
  --el-button-hover-text-color: #a9344f;
  --el-button-hover-border-color: #d45e78;
  --el-button-hover-bg-color: #fff0f4;
}.el-pagination { justify-content: flex-end; margin-top: 24px; }
.detail-head { display: flex; justify-content: space-between; gap: 16px; align-items: center; margin-bottom: 16px; }
.detail-head h2 { margin: 0; color: #352c65; }
h3 { margin: 18px 0 10px; font-size: 16px; color: #352c65; }
.file-content { max-height: 360px; overflow: auto; margin: 0; padding: 12px; border-radius: 8px; background: #252047; color: #f8fafc; white-space: pre-wrap; }
.muted { margin: 0; color: #64748b; }
.import-tip { margin-bottom: 14px; }
.import-tip p { margin: 0; }
.upload-text { color: #6d49d8; font-weight: 900; }
.import-form { margin-top: 18px; }
.import-form .el-select { width: 100%; }
:deep(.el-button) { min-height: 36px; border-color: #706998; border-radius: 8px; color: #352c65; font-weight: 900; box-shadow: 1px 2px 0 rgba(86, 80, 131, 0.1); }
:deep(.el-button.is-link) { box-shadow: none; }
:deep(.el-button--primary) { --el-button-bg-color: #8176d7; --el-button-border-color: #5f5799; --el-button-hover-bg-color: #6f64c7; --el-button-hover-border-color: #514983; color: #fff; }
:deep(.el-tag) { border-color: #d8d0f1; border-radius: 6px; background: #f5f0ff; color: #4a4178; font-weight: 900; }
:deep(.el-input__wrapper), :deep(.el-select__wrapper), :deep(.el-textarea__inner) { border: 1px solid #c9c1e8; border-radius: 8px; box-shadow: none; }
@keyframes orbit-spin { to { transform: rotate(360deg); } }
@keyframes float-card { 0%, 100% { transform: translateY(0) rotate(1deg); } 50% { transform: translateY(-10px) rotate(-2deg); } }
@keyframes twinkle { 0%, 100% { opacity: 0.45; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.08); } }
@media (max-width: 980px) { .page-header { grid-template-columns: 1fr; } .hero-doodle { justify-self: center; } }
@media (max-width: 760px) { .page-header { padding: 28px 20px; box-shadow: 6px 6px 0 #6f6a91; } .toolbar .el-input, .toolbar .el-select { width: 100%; } .skill-grid { grid-template-columns: 1fr; } .hero-doodle { width: 260px; transform: scale(0.84); transform-origin: center; } }
</style>
















