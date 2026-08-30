<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Delete,
  EditPen,
  FolderOpened,
  Notebook,
  RefreshRight,
  Reading,
  Search,
  Star,
} from '@element-plus/icons-vue'
import {
  cancelGovKnowledgeFavorite,
  getGovKnowledgeTree,
  pageMyGovKnowledgeFavorites,
  pageMyGovKnowledgeNotes,
  saveGovKnowledgeNote,
} from '@/api/gov'

const props = defineProps({
  mode: {
    type: String,
    default: 'favorite',
  },
})

const router = useRouter()
const loading = ref(false)
const records = ref([])
const total = ref(0)
const editingVisible = ref(false)
const editingSaving = ref(false)
const currentItem = ref(null)
const noteDraft = ref('')
const treeCache = ref({})
const filters = reactive({
  keyword: '',
})
const page = reactive({
  pageNum: 1,
  pageSize: 8,
})

const isFavoriteMode = computed(() => props.mode === 'favorite')
const pageTitle = computed(() => (isFavoriteMode.value ? '我的收藏总览' : '我的笔记总览'))
const pageDesc = computed(() => (
  isFavoriteMode.value
    ? '这里把收藏内容按专题、章节和知识点分层展示，方便快速定位。'
    : '这里把笔记内容按专题、章节和知识点分层展示，方便一眼看懂学习轨迹。'
))
const totalText = computed(() => `共${total.value}条记录`)

const treeLookups = computed(() => {
  const result = {}
  Object.entries(treeCache.value || {}).forEach(([subject, nodes]) => {
    result[subject] = buildLookupMap(Array.isArray(nodes) ? nodes : [])
  })
  return result
})

const groupedRecords = computed(() => buildGroupedRecords(records.value, treeLookups.value))

function goBack() {
  router.push({ name: 'gov-knowledge' })
}

function openKnowledge(item) {
  if (!item?.knowledgeId) {
    return
  }
  router.push({
    name: 'gov-knowledge',
    query: {
      subject: item.subject || undefined,
      nodeId: item.knowledgeId,
    },
  })
}

function openChapter(chapter) {
  if (!chapter?.knowledgeId) {
    return
  }
  router.push({
    name: 'gov-knowledge',
    query: {
      subject: chapter.subject || undefined,
      nodeId: chapter.knowledgeId,
    },
  })
}

function openEditor(item) {
  currentItem.value = item
  noteDraft.value = item?.noteContent || ''
  editingVisible.value = true
}

async function removeFavorite(item) {
  if (!item?.knowledgeId) {
    return
  }
  try {
    await ElMessageBox.confirm('确定取消收藏这条知识点吗？', '取消收藏', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await cancelGovKnowledgeFavorite(item.knowledgeId)
    ElMessage.success('已取消收藏')
    await loadRecords()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '取消收藏失败')
    }
  }
}

async function clearNote(item) {
  if (!item?.knowledgeId) {
    return
  }
  try {
    await ElMessageBox.confirm('确定清空这条笔记吗？', '清空笔记', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await saveGovKnowledgeNote(item.knowledgeId, { content: '' })
    ElMessage.success('笔记已清空')
    await loadRecords()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '清空失败')
    }
  }
}

async function saveNote() {
  if (!currentItem.value?.knowledgeId || editingSaving.value) {
    return
  }
  editingSaving.value = true
  try {
    await saveGovKnowledgeNote(currentItem.value.knowledgeId, { content: noteDraft.value })
    ElMessage.success('笔记已保存')
    editingVisible.value = false
    await loadRecords()
  } catch (error) {
    ElMessage.error(error?.message || '笔记保存失败')
  } finally {
    editingSaving.value = false
  }
}

async function loadSubjectTrees(subjects) {
  const nextCache = { ...(treeCache.value || {}) }
  const pendingSubjects = [...new Set(subjects.filter(Boolean))].filter((subject) => !nextCache[subject])
  if (!pendingSubjects.length) {
    return
  }

  const results = await Promise.allSettled(pendingSubjects.map(async (subject) => [subject, await getGovKnowledgeTree(subject)]))
  let changed = false
  results.forEach((result) => {
    if (result.status !== 'fulfilled') {
      return
    }
    const [subject, tree] = result.value
    nextCache[subject] = Array.isArray(tree) ? tree : []
    changed = true
  })

  if (changed) {
    treeCache.value = nextCache
  }
}

async function loadRecords() {
  loading.value = true
  try {
    const params = {
      pageNum: page.pageNum,
      pageSize: page.pageSize,
    }
    const keyword = filters.keyword.trim()
    if (keyword) {
      params.keyword = keyword
    }
    const result = isFavoriteMode.value
      ? await pageMyGovKnowledgeFavorites(params)
      : await pageMyGovKnowledgeNotes(params)
    records.value = result?.records || []
    total.value = Number(result?.total || 0)
    if (records.value.length === 0 && page.pageNum > 1) {
      page.pageNum -= 1
    }
    await loadSubjectTrees(records.value.map((item) => item.subject))
  } catch (error) {
    ElMessage.error(error?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [filters.keyword],
  () => {
    if (page.pageNum === 1) {
      loadRecords()
      return
    }
    page.pageNum = 1
  },
)

watch(
  () => page.pageNum,
  loadRecords,
)

onMounted(loadRecords)

function buildLookupMap(nodes) {
  const map = new Map()

  function walk(list, trail = [], chapterNode = null) {
    list.forEach((node) => {
      const nextTrail = trail.concat(node)
      const nextChapter = node.nodeType === 'CHAPTER' ? node : chapterNode
      map.set(node.id, {
        node,
        trail: nextTrail,
        chapterNode: nextChapter || node,
      })
      if (Array.isArray(node.children) && node.children.length) {
        walk(node.children, nextTrail, nextChapter || node)
      }
    })
  }

  walk(Array.isArray(nodes) ? nodes : [])
  return map
}

function buildGroupedRecords(items, lookupsBySubject) {
  const subjectMap = new Map()

  items.forEach((item, index) => {
    const subjectKey = item.subject || '未分类'
    const lookup = lookupsBySubject[subjectKey]?.get(item.knowledgeId)
    const chapterNode = lookup?.chapterNode || null
    const chapterId = chapterNode?.id || item.knowledgeId
    const chapterTitle = chapterNode?.title || item.title || '未分类章节'
    const chapterStatus = chapterNode?.progressStatus || item.progressStatus || 'TODO'

    let subjectGroup = subjectMap.get(subjectKey)
    if (!subjectGroup) {
      subjectGroup = {
        subject: subjectKey,
        total: 0,
        chapterCount: 0,
        order: index,
        chaptersMap: new Map(),
      }
      subjectMap.set(subjectKey, subjectGroup)
    }

    let chapterGroup = subjectGroup.chaptersMap.get(chapterId)
    if (!chapterGroup) {
      chapterGroup = {
        key: `${subjectKey}-${chapterId}`,
        subject: subjectKey,
        knowledgeId: chapterId,
        title: chapterTitle,
        status: chapterStatus,
        order: index,
        records: [],
      }
      subjectGroup.chaptersMap.set(chapterId, chapterGroup)
      subjectGroup.chapterCount += 1
    }

    const enriched = {
      ...item,
      key: `${item.favoriteId || item.noteId || item.knowledgeId}-${index}`,
      chapterId,
      chapterTitle,
      chapterStatus,
      path: lookup?.trail?.map((node) => node.title) || [chapterTitle],
    }

    if (item.nodeType === 'CHAPTER') {
      chapterGroup.title = item.title || chapterGroup.title
      chapterGroup.status = item.progressStatus || chapterGroup.status
      chapterGroup.knowledgeId = item.knowledgeId || chapterGroup.knowledgeId
      chapterGroup.record = enriched
    }

    chapterGroup.records.push(enriched)
    chapterGroup.order = Math.min(chapterGroup.order, index)
    subjectGroup.total += 1
  })

  return Array.from(subjectMap.values())
    .sort((a, b) => a.order - b.order)
    .map((subjectGroup) => ({
      subject: subjectGroup.subject,
      total: subjectGroup.total,
      chapterCount: subjectGroup.chapterCount,
      chapters: Array.from(subjectGroup.chaptersMap.values())
        .sort((a, b) => a.order - b.order)
        .map((chapter) => ({
          ...chapter,
          records: chapter.records.sort((a, b) => {
            if (a.nodeType === b.nodeType) {
              return 0
            }
            return a.nodeType === 'CHAPTER' ? -1 : 1
          }),
        })),
    }))
}

function getEntryPreview(entry) {
  return isFavoriteMode.value ? entry.contentPreview || '暂无内容摘要' : entry.notePreview || '暂无笔记内容'
}

function progressLabel(status) {
  return status === 'DONE' ? '已完成' : status === 'LEARNING' ? '学习中' : '未学习'
}

function progressType(status) {
  return status === 'DONE' ? 'success' : status === 'LEARNING' ? 'warning' : 'info'
}

function formatTime(value) {
  if (!value) {
    return '-'
  }
  return String(value).replace('T', ' ')
}
</script>

<template>
  <main class="gov-overview-page">
    <section class="gov-overview-shell">
      <header class="overview-header">
        <div class="header-copy">
          <button class="back-button" type="button" @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            <span>返回知识学习</span>
          </button>
          <p class="eyebrow">KNOWLEDGE OVERVIEW</p>
          <h1>{{ pageTitle }}</h1>
          <p class="lead">{{ pageDesc }}</p>
        </div>
        <div class="header-badge">
          <div class="header-badge__icon">
            <el-icon v-if="isFavoriteMode"><Star /></el-icon>
            <el-icon v-else><Notebook /></el-icon>
          </div>
          <div>
            <span>当前总览</span>
            <strong>{{ totalText }}</strong>
            <small>{{ isFavoriteMode ? '收藏过的知识点' : '已记录的学习笔记' }}</small>
          </div>
        </div>
      </header>

      <section class="toolbar">
        <el-input
          v-model="filters.keyword"
          :prefix-icon="Search"
          clearable
          :placeholder="isFavoriteMode ? '按标题、正文摘要搜索收藏' : '按标题、笔记内容搜索笔记'"
        />
        <el-button :icon="RefreshRight" :loading="loading" plain @click="loadRecords">刷新</el-button>
      </section>

      <section v-loading="loading" class="record-panel">
        <div v-if="groupedRecords.length" class="group-list">
          <article v-for="subjectGroup in groupedRecords" :key="subjectGroup.subject" class="subject-group">
            <header class="subject-group__head">
              <div>
                <strong>{{ subjectGroup.subject }}</strong>
                <span>{{ subjectGroup.chapterCount }} 个章节 · {{ subjectGroup.total }} 条{{ isFavoriteMode ? '收藏' : '笔记' }}</span>
              </div>
              <el-tag size="small" effect="plain">{{ subjectGroup.total }} 条</el-tag>
            </header>

            <div class="chapter-list">
              <article v-for="chapter in subjectGroup.chapters" :key="chapter.key" class="chapter-card">
                <button class="chapter-card__head" type="button" @click="openChapter(chapter)">
                  <div class="chapter-card__title">
                    <strong>{{ chapter.title }}</strong>
                    <el-tag size="small" type="info" effect="plain">章节</el-tag>
                  </div>
                  <div class="chapter-card__meta">
                    <el-tag size="small" :type="progressType(chapter.status)" effect="plain">
                      {{ progressLabel(chapter.status) }}
                    </el-tag>
                    <span>{{ chapter.records.length }} 条</span>
                    <el-icon><ArrowRight /></el-icon>
                  </div>
                </button>

                <div class="chapter-card__body">
                  <div class="entry-list">
                    <article v-for="entry in chapter.records" :key="entry.key" class="entry-card" :class="{ 'entry-card--chapter': entry.nodeType === 'CHAPTER' }">
                      <div class="entry-card__main">
                        <div class="entry-head">
                          <strong>{{ entry.title }}</strong>
                          <el-tag size="small" :type="entry.nodeType === 'POINT' ? 'success' : 'info'" effect="plain">
                            {{ entry.nodeType === 'POINT' ? '知识点' : '章节' }}
                          </el-tag>
                        </div>
                        <div class="entry-meta">
                          <el-tag size="small" :type="progressType(entry.progressStatus)" effect="plain">
                            {{ progressLabel(entry.progressStatus) }}
                          </el-tag>
                          <span>{{ isFavoriteMode ? `收藏于 ${formatTime(entry.favoritedAt)}` : `更新于 ${formatTime(entry.updatedAt)}` }}</span>
                        </div>
                        <p>{{ getEntryPreview(entry) }}</p>
                      </div>

                      <div class="entry-actions">
                        <el-button :icon="Reading" plain @click="openKnowledge(entry)">查看</el-button>
                        <el-button
                          v-if="isFavoriteMode"
                          :icon="Delete"
                          plain
                          type="danger"
                          @click="removeFavorite(entry)"
                        >
                          取消收藏
                        </el-button>
                        <template v-else>
                          <el-button :icon="EditPen" plain @click="openEditor(entry)">编辑笔记</el-button>
                          <el-button :icon="Delete" plain type="danger" @click="clearNote(entry)">清空笔记</el-button>
                        </template>
                      </div>
                    </article>
                  </div>
                </div>
              </article>
            </div>
          </article>
        </div>

        <el-empty v-else :description="isFavoriteMode ? '暂无收藏知识点' : '暂无笔记内容'" />

        <el-pagination
          v-if="total > page.pageSize"
          v-model:current-page="page.pageNum"
          class="overview-pagination"
          :page-size="page.pageSize"
          :total="total"
          layout="prev, pager, next, jumper"
        />
      </section>
    </section>

    <el-dialog
      v-model="editingVisible"
      :title="currentItem?.title || '编辑笔记'"
      width="620px"
      append-to-body
    >
      <el-input
        v-model="noteDraft"
        type="textarea"
        :autosize="{ minRows: 8, maxRows: 14 }"
        placeholder="写下你的解题提醒、易错点、自己的理解"
      />
      <template #footer>
        <el-button @click="editingVisible = false">取消</el-button>
        <el-button type="primary" :loading="editingSaving" @click="saveNote">保存</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.gov-overview-page {
  min-height: 100%;
  padding: 28px;
  background:
    linear-gradient(180deg, rgba(250, 250, 255, 0.96) 0%, rgba(244, 246, 252, 1) 100%),
    repeating-linear-gradient(0deg, transparent 0 31px, rgba(93, 83, 135, 0.045) 31px 32px),
    repeating-linear-gradient(90deg, transparent 0 31px, rgba(93, 83, 135, 0.045) 31px 32px);
  color: #1f2937;
}

.gov-overview-shell {
  width: min(1480px, 100%);
  min-height: calc(100vh - 112px);
  margin: 0 auto;
  padding: 34px;
  border: 2px solid #5d537f;
  border-radius: 18px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(250, 251, 255, 0.98) 100%);
  box-shadow:
    10px 10px 0 rgb(93 83 127 / 18%),
    0 24px 52px rgb(84 94 138 / 14%),
    0 2px 0 rgb(255 255 255 / 82%) inset;
}

.overview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding: 26px 28px 24px;
  border: 2px solid #5d537f;
  border-radius: 18px;
  background:
    linear-gradient(90deg, rgba(238, 231, 255, 0.95) 0%, rgba(248, 229, 244, 0.95) 52%, rgba(225, 242, 255, 0.95) 100%);
  box-shadow:
    10px 10px 0 rgb(93 83 127 / 18%),
    0 18px 36px rgb(84 94 138 / 10%);
}

.header-copy {
  min-width: 0;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 15px;
  border: 1.5px solid #5d537f;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff 0%, #f5f7ff 100%);
  color: #2b274f;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 4px 4px 0 rgb(93 83 127 / 14%);
}

.back-button:hover,
.back-button:focus-visible {
  color: #2859d7;
  border-color: #2859d7;
  outline: none;
}

.eyebrow {
  margin: 18px 0 0;
  color: #4f7cf0;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

h1 {
  margin: 10px 0 0;
  color: #182235;
  font-size: clamp(34px, 4vw, 48px);
  font-weight: 900;
  line-height: 1.1;
}

.lead {
  max-width: 760px;
  margin: 12px 0 0;
  color: #5f6e88;
  font-size: 16px;
  line-height: 1.75;
}

.header-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 250px;
  padding: 14px 16px;
  border: 1.5px solid #d1d8ea;
  border-radius: 18px;
  background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
  box-shadow: 6px 6px 0 rgb(93 83 127 / 12%);
}

.header-badge__icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(180deg, #eaf3ff 0%, #dceaff 100%);
  color: #3f83f8;
}

.header-badge__icon .el-icon {
  font-size: 20px;
}

.header-badge span,
.header-badge small {
  display: block;
}

.header-badge span {
  color: #77839b;
  font-size: 12px;
  font-weight: 800;
}

.header-badge strong {
  display: block;
  margin-top: 2px;
  color: #27354a;
  font-size: 16px;
  font-weight: 900;
}

.header-badge small {
  margin-top: 4px;
  color: #7b879a;
  font-size: 12px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 26px;
  padding: 14px;
  border: 1.5px solid #d8def0;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.97) 0%, rgba(248, 250, 255, 0.98) 100%);
  box-shadow: 6px 6px 0 rgb(93 83 127 / 10%);
}

.toolbar :deep(.el-input) {
  flex: 1;
}

.toolbar :deep(.el-input__wrapper) {
  min-height: 46px;
  border-radius: 14px;
  box-shadow: inset 0 0 0 1.5px #d9dff0;
  background: #fff;
}

.toolbar :deep(.el-button) {
  min-height: 46px;
  padding: 0 16px;
  border: 1.5px solid #5d537f;
  border-radius: 14px;
  background: linear-gradient(180deg, #8f7fe8 0%, #7666de 100%);
  color: #fff;
  font-size: 14px;
  font-weight: 900;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 24%);
}

.toolbar :deep(.el-button:hover),
.toolbar :deep(.el-button:focus-visible) {
  border-color: #5d537f;
  background: linear-gradient(180deg, #9b8ef0 0%, #7d70db 100%);
  color: #fff;
  outline: none;
}

.record-panel {
  margin-top: 18px;
  padding: 18px;
  border: 1.5px solid #d8def0;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(250, 251, 255, 0.98) 100%);
  box-shadow: 6px 6px 0 rgb(93 83 127 / 8%);
}

.group-list {
  display: grid;
  gap: 18px;
}

.subject-group {
  padding: 16px;
  border: 1.5px solid #d8def0;
  border-radius: 18px;
  background: linear-gradient(180deg, #fcfdff 0%, #f8faff 100%);
  box-shadow: 4px 4px 0 rgb(93 83 127 / 8%);
}

.subject-group__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  border-bottom: 1px solid #edf1fb;
}

.subject-group__head strong {
  display: block;
  color: #243145;
  font-size: 18px;
  font-weight: 900;
}

.subject-group__head span {
  display: block;
  margin-top: 4px;
  color: #7e8aa0;
  font-size: 12px;
}

.chapter-list {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.chapter-card {
  border: 1.5px solid #dfe5f2;
  border-radius: 16px;
  background: #fff;
  overflow: hidden;
}

.chapter-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  width: 100%;
  padding: 16px 18px;
  border: 0;
  background: linear-gradient(180deg, #fafcff 0%, #f3f6ff 100%);
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.chapter-card__head:hover,
.chapter-card__head:focus-visible {
  background: linear-gradient(180deg, #f4f8ff 0%, #eef4ff 100%);
  outline: none;
}

.chapter-card__title {
  min-width: 0;
}

.chapter-card__title strong {
  display: block;
  color: #243145;
  font-size: 16px;
  font-weight: 900;
}

.chapter-card__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  color: #7f8aa1;
  font-size: 12px;
  font-weight: 700;
}

.chapter-card__body {
  padding: 14px;
}

.entry-list {
  display: grid;
  gap: 12px;
}

.entry-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 176px;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  border: 1.5px solid #d8d4ff;
  border-radius: 16px;
  background: linear-gradient(180deg, #f7f4ff 0%, #ffffff 100%);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 8%);
}

.entry-card--chapter {
  background: linear-gradient(180deg, #f3efff 0%, #ffffff 100%);
}

.entry-card__main {
  min-width: 0;
  flex: 1;
}

.entry-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.entry-head strong {
  color: #243145;
  font-size: 15px;
  font-weight: 900;
}

.entry-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  color: #7b879a;
  font-size: 12px;
  font-weight: 700;
}

.entry-card__main p {
  margin: 12px 0 0;
  color: #52627a;
  font-size: 14px;
  line-height: 1.7;
}

.entry-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex: 0 0 auto;
  width: 176px;
  justify-self: end;
}

.entry-actions :deep(.el-button) {
  width: 100%;
  min-height: 42px;
  padding: 0;
  border: 1px solid #5d537f;
  border-radius: 12px;
  background: linear-gradient(180deg, #8f7fe8 0%, #7666de 100%);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  box-shadow: 3px 4px 0 rgb(61 53 100 / 20%);
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.entry-actions :deep(.el-button:hover),
.entry-actions :deep(.el-button:focus-visible) {
  border-color: #5d537f;
  color: #fff;
  background: linear-gradient(180deg, #9b8ef0 0%, #7d70db 100%);
  outline: none;
}

.entry-actions :deep(.el-button--danger) {
  border-color: #ffb0a6;
  background: linear-gradient(180deg, #fffefe 0%, #fff7f5 100%);
  color: #ff7c71;
}

.entry-actions :deep(.el-button--danger:hover),
.entry-actions :deep(.el-button--danger:focus-visible) {
  border-color: #ff8e82;
  background: linear-gradient(180deg, #fff9f8 0%, #fff2f0 100%);
  color: #f06a5e;
}

.overview-pagination {
  justify-content: center;
  margin-top: 18px;
}

.record-panel :deep(.el-empty) {
  padding: 28px 0 20px;
}

.record-panel :deep(.el-tag) {
  border-radius: 999px;
  min-height: 28px;
  padding: 0 10px;
  border-color: #d8d4ff;
  background: #f4f1ff;
  color: #6f63e8;
  font-weight: 900;
}

.record-panel :deep(.el-tag--success) {
  border-color: #bfe8c9;
  background: #f3fbf5;
  color: #2f9b67;
}

.record-panel :deep(.el-tag--warning) {
  border-color: #f1ddb0;
  background: #fff8e8;
  color: #c98b12;
}

.record-panel :deep(.el-tag--info) {
  border-color: #d8d4ff;
  background: #f4f1ff;
  color: #6f63e8;
}

.record-panel :deep(.el-pagination .btn-prev),
.record-panel :deep(.el-pagination .btn-next),
.record-panel :deep(.el-pagination .number),
.record-panel :deep(.el-pagination .el-input__wrapper) {
  border-radius: 10px;
}

@media (max-width: 780px) {
  .gov-overview-page {
    padding: 14px;
  }

  .gov-overview-shell {
    min-height: calc(100vh - 92px);
    padding: 22px 16px 18px;
  }

  .overview-header {
    flex-direction: column;
  }

  .header-badge {
    width: 100%;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .subject-group__head,
  .entry-card,
  .chapter-card__head {
    flex-direction: column;
    align-items: flex-start;
  }

  .entry-actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
