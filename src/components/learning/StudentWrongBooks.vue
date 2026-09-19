<script setup>
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowRight,
  Collection,
  Delete,
  EditPen,
  FolderAdd,
  FolderOpened,
  MoreFilled,
  Plus,
  Search,
  RefreshRight,
  View,
} from '@element-plus/icons-vue'
import {
  addQuestionToWrongBook,
  createStudentWrongBook,
  deleteStudentWrongBook,
  getStudentWrongBooks,
  removeQuestionFromWrongBook,
  renameStudentWrongBook,
  submitWrongQuestionRetrain,
} from '@/api/learningAnalysis'

const props = defineProps({
  wrongQuestions: { type: Array, default: () => [] },
})

const emit = defineEmits(['open-practice'])
const loading = ref(false)
const actionLoading = ref(false)
const books = ref([])
const selectedBookId = ref('all')
const keyword = ref('')
const courseFilter = ref('all')
const typeFilter = ref('all')
const reasonFilter = ref('all')
const masteryFilter = ref('all')
const detailVisible = ref(false)
const detailQuestion = ref(null)
const retrainVisible = ref(false)
const retrainQuestion = ref(null)
const retrainAnswer = ref('')
const retrainResult = ref(null)

const selectedBook = computed(() => {
  if (selectedBookId.value === 'all') return null
  return books.value.find(item => String(item.id) === String(selectedBookId.value)) || null
})

const sourceQuestions = computed(() => selectedBook.value?.questions || props.wrongQuestions || [])
const normalizedQuestions = computed(() => sourceQuestions.value.map((item) => {
  const source = props.wrongQuestions.find(question => questionKey(question) === questionKey(item))
  return {
    ...item,
    options: item.options?.length ? item.options : (source?.options || []),
    questionType: item.questionType || 'SHORT',
    wrongReason: item.wrongReason || inferWrongReason(item),
    mastered: Boolean(item.mastered),
  }
}))
const courseOptions = computed(() => [...new Set(normalizedQuestions.value.map(item => item.courseName).filter(Boolean))])
const reasonOptions = computed(() => [...new Set(normalizedQuestions.value.map(item => item.wrongReason).filter(Boolean))])
const visibleQuestions = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  return normalizedQuestions.value.filter((item) => {
    if (courseFilter.value !== 'all' && item.courseName !== courseFilter.value) return false
    if (typeFilter.value !== 'all' && item.questionType !== typeFilter.value) return false
    if (reasonFilter.value !== 'all' && item.wrongReason !== reasonFilter.value) return false
    if (masteryFilter.value === 'mastered' && !item.mastered) return false
    if (masteryFilter.value === 'review' && item.mastered) return false
    return !value || [item.content, item.courseName, item.practiceTitle, item.referenceAnswer, item.wrongReason]
      .some(text => String(text || '').toLowerCase().includes(value))
  })
})

function inferWrongReason(item) {
  if (item.teacherFeedback) return '答题方法需要改进'
  return item.questionType === 'SINGLE' ? '知识点未掌握' : '审题或表达不完整'
}

function questionKey(item) {
  return `${item.practiceId}-${item.questionId}`
}

function practiceLabel(item) {
  const title = String(item?.practiceTitle || '').trim()
  if (!title) return '练习反馈'
  return /^\d+$/.test(title) ? `练习 ${title}` : title
}

function isInBook(book, question) {
  return (book.questions || []).some(item => questionKey(item) === questionKey(question))
}

function replaceBook(updated) {
  const index = books.value.findIndex(item => String(item.id) === String(updated.id))
  if (index >= 0) books.value.splice(index, 1, updated)
  else books.value.push(updated)
}

async function loadBooks() {
  loading.value = true
  try {
    books.value = (await getStudentWrongBooks()) || []
    if (selectedBookId.value !== 'all' && !selectedBook.value) selectedBookId.value = 'all'
  } catch (error) {
    ElMessage.error(error.message || '错题本加载失败')
  } finally {
    loading.value = false
  }
}

async function createBook(question = null) {
  try {
    const { value } = await ElMessageBox.prompt('给错题本起一个清楚、好找的名字。', '新建错题本', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：机器学习重点题',
      inputPattern: /^\s*\S(?:.{0,38}\S)?\s*$/,
      inputErrorMessage: '请输入 1 至 40 个字',
    })
    actionLoading.value = true
    let created = await createStudentWrongBook(value.trim())
    if (question) created = await addQuestionToWrongBook(created.id, question)
    replaceBook(created)
    selectedBookId.value = created.id
    ElMessage.success(question ? '错题本已创建并收录这道题' : '错题本已创建')
    return created
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '创建失败')
    return null
  } finally {
    actionLoading.value = false
  }
}

async function renameBook(book) {
  try {
    const { value } = await ElMessageBox.prompt('名称修改后，里面的错题不会变化。', '重命名错题本', {
      confirmButtonText: '保存',
      cancelButtonText: '取消',
      inputValue: book.name,
      inputPattern: /^\s*\S(?:.{0,38}\S)?\s*$/,
      inputErrorMessage: '请输入 1 至 40 个字',
    })
    actionLoading.value = true
    replaceBook(await renameStudentWrongBook(book.id, value.trim()))
    ElMessage.success('名称已更新')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '重命名失败')
  } finally {
    actionLoading.value = false
  }
}

async function deleteBook(book) {
  try {
    await ElMessageBox.confirm(`确定删除“${book.name}”吗？全部错题中的原始记录不会受影响。`, '删除错题本', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    actionLoading.value = true
    await deleteStudentWrongBook(book.id)
    books.value = books.value.filter(item => item.id !== book.id)
    selectedBookId.value = 'all'
    ElMessage.success('错题本已删除')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error.message || '删除失败')
  } finally {
    actionLoading.value = false
  }
}

async function archiveQuestion(bookId, question) {
  try {
    actionLoading.value = true
    replaceBook(await addQuestionToWrongBook(bookId, question))
    ElMessage.success('已收入错题本')
  } catch (error) {
    ElMessage.error(error.message || '收录失败')
  } finally {
    actionLoading.value = false
  }
}

async function removeQuestion(question) {
  if (!selectedBook.value) return
  try {
    actionLoading.value = true
    await removeQuestionFromWrongBook(selectedBook.value.id, question)
    const updated = {
      ...selectedBook.value,
      questionCount: Math.max(0, Number(selectedBook.value.questionCount || 0) - 1),
      questions: selectedBook.value.questions.filter(item => questionKey(item) !== questionKey(question)),
    }
    replaceBook(updated)
    ElMessage.success('已从当前错题本移除')
  } catch (error) {
    ElMessage.error(error.message || '移除失败')
  } finally {
    actionLoading.value = false
  }
}

function openRetrain(question) {
  if (!selectedBook.value || !question.id) {
    ElMessage.info('请先将题目收入一个自定义错题本，再开始重练')
    return
  }
  retrainQuestion.value = question
  retrainAnswer.value = ''
  retrainResult.value = null
  retrainVisible.value = true
}

function openDetail(question) {
  detailQuestion.value = question
  detailVisible.value = true
}

function closeRetrain() {
  retrainVisible.value = false
  retrainQuestion.value = null
  retrainAnswer.value = ''
  retrainResult.value = null
}

async function submitRetrain() {
  if (!retrainAnswer.value.trim()) {
    ElMessage.warning('请先填写重练答案')
    return
  }
  try {
    actionLoading.value = true
    const updated = await submitWrongQuestionRetrain(selectedBook.value.id, retrainQuestion.value.id, retrainAnswer.value.trim())
    retrainResult.value = updated
    const book = selectedBook.value
    replaceBook({
      ...book,
      questions: book.questions.map(item => item.id === updated.id ? updated : item),
    })
    retrainQuestion.value = updated
    ElMessage.success(updated.mastered ? '回答正确，这道题已标记为掌握' : '答案已保存，请结合解析继续复习')
  } catch (error) {
    ElMessage.error(error.message || '重练提交失败')
  } finally {
    actionLoading.value = false
  }
}

function resetFilters() {
  keyword.value = ''
  courseFilter.value = 'all'
  typeFilter.value = 'all'
  reasonFilter.value = 'all'
  masteryFilter.value = 'all'
}

onMounted(loadBooks)
</script>

<template>
  <section v-loading="loading" class="wrong-book-shell" aria-label="错题本">
    <aside class="book-rail">
      <div class="rail-heading">
        <span class="rail-icon"><Collection /></span>
        <div><strong>我的错题本</strong><small>{{ books.length }} 个自定义本</small></div>
      </div>

      <nav class="book-list" aria-label="错题本列表">
        <button type="button" :class="{ active: selectedBookId === 'all' }" @click="selectedBookId = 'all'">
          <span class="book-symbol all"><FolderOpened /></span>
          <span><strong>全部错题</strong><small>自动汇总已批改错题</small></span>
          <b>{{ wrongQuestions.length }}</b>
        </button>

        <button
          v-for="book in books"
          :key="book.id"
          type="button"
          :class="{ active: String(selectedBookId) === String(book.id) }"
          @click="selectedBookId = book.id"
        >
          <span class="book-symbol"><Collection /></span>
          <span><strong>{{ book.name }}</strong><small>自定义错题本</small></span>
          <b>{{ book.questionCount || 0 }}</b>
        </button>
      </nav>

      <button class="create-book-button" type="button" :disabled="actionLoading" @click="createBook()">
        <el-icon><Plus /></el-icon><span>新建错题本</span>
      </button>
    </aside>

    <div class="book-workspace">
      <header class="book-toolbar">
        <div>
          <span class="section-label">SMART REVIEW BOOK</span>
          <h2>{{ selectedBook?.name || '全部错题' }}</h2>
          <p>{{ selectedBook ? '按你的分类集中复盘，题目来自真实批改记录。' : '老师完成批改后，未满分题目会自动出现在这里。' }}</p>
        </div>
        <div v-if="selectedBook" class="book-actions">
          <el-button title="重命名错题本" aria-label="重命名错题本" :disabled="actionLoading" @click="renameBook(selectedBook)"><el-icon><EditPen /></el-icon></el-button>
          <el-button title="删除错题本" aria-label="删除错题本" :disabled="actionLoading" @click="deleteBook(selectedBook)"><el-icon><Delete /></el-icon></el-button>
        </div>
      </header>

      <div class="book-filter-row">
        <label>
          <el-icon><Search /></el-icon>
          <input v-model="keyword" type="search" placeholder="搜索题目、课程或练习" aria-label="搜索错题" />
        </label>
        <span><strong>{{ visibleQuestions.length }}</strong> 道题</span>
      </div>

      <div class="advanced-filters">
        <select v-model="courseFilter" aria-label="按课程筛选"><option value="all">全部课程</option><option v-for="course in courseOptions" :key="course" :value="course">{{ course }}</option></select>
        <select v-model="typeFilter" aria-label="按题型筛选"><option value="all">全部题型</option><option value="SINGLE">单选题</option><option value="SHORT">开放题</option></select>
        <select v-model="reasonFilter" aria-label="按错因筛选"><option value="all">全部错因</option><option v-for="reason in reasonOptions" :key="reason" :value="reason">{{ reason }}</option></select>
        <select v-model="masteryFilter" aria-label="按掌握状态筛选"><option value="all">全部状态</option><option value="review">待复习</option><option value="mastered">已掌握</option></select>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <div v-if="visibleQuestions.length" class="wrong-card-list">
        <article v-for="(item, index) in visibleQuestions" :key="questionKey(item)" class="wrong-card">
          <header>
            <span class="question-number">{{ String(index + 1).padStart(2, '0') }}</span>
            <div class="question-source">
              <strong>{{ item.courseName || '课程练习' }}</strong>
              <small>{{ practiceLabel(item) }}</small>
            </div>
            <span class="question-score">得分 {{ item.awardedScore ?? 0 }}/{{ item.score ?? 0 }}</span>
          </header>

          <div class="question-tags"><span>{{ item.questionType === 'SINGLE' ? '单选题' : '开放题' }}</span><span>{{ item.wrongReason }}</span><span :class="{ mastered: item.mastered }">{{ item.mastered ? '已掌握' : '待复习' }}</span></div>

          <h3>{{ item.content }}</h3>

          <div v-if="item.questionType === 'SINGLE' && item.options?.length" class="choice-options compact">
            <div v-for="(option, optionIndex) in item.options" :key="`${questionKey(item)}-${optionIndex}`">
              <b>{{ String.fromCharCode(65 + optionIndex) }}</b><span>{{ option.replace(/^[A-D][.、：:]\s*/, '') }}</span>
            </div>
          </div>

          <details class="answer-sheet">
            <summary>查看答案与讲解 <el-icon><ArrowRight /></el-icon></summary>
            <div>
              <section><span>参考答案</span><p>{{ item.referenceAnswer || '老师暂未提供参考答案' }}</p></section>
              <section><span>题目讲解</span><p>{{ item.explanation || '老师暂未补充讲解，可以回到练习查看反馈。' }}</p></section>
            </div>
          </details>

          <footer>
            <el-button text @click="emit('open-practice', item)">回到原练习 <el-icon><ArrowRight /></el-icon></el-button>
            <el-button @click="openDetail(item)"><el-icon><View /></el-icon>查看详情</el-button>
            <el-button class="retrain-question" @click="openRetrain(item)"><el-icon><RefreshRight /></el-icon>错题重练</el-button>
            <template v-if="selectedBook">
              <el-button class="remove-question" :loading="actionLoading" @click="removeQuestion(item)">移出当前本</el-button>
            </template>
            <template v-else-if="books.length">
              <el-dropdown trigger="click" :disabled="actionLoading" @command="bookId => archiveQuestion(bookId, item)">
                <el-button class="archive-question"><el-icon><FolderAdd /></el-icon>收入错题本</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-for="book in books"
                      :key="book.id"
                      :command="book.id"
                      :disabled="isInBook(book, item)"
                    >
                      {{ book.name }}{{ isInBook(book, item) ? '（已收录）' : '' }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
            <el-button v-else class="archive-question" :loading="actionLoading" @click="createBook(item)">
              <el-icon><FolderAdd /></el-icon>新建错题本并收录
            </el-button>
          </footer>
        </article>
      </div>

      <div v-else class="wrong-empty">
        <span><MoreFilled /></span>
        <strong>{{ keyword ? '没有找到符合条件的错题' : selectedBook ? '这个错题本还是空的' : '目前没有错题' }}</strong>
        <p>{{ keyword ? '换一个关键词试试。' : selectedBook ? '回到“全部错题”，把需要重点复盘的题目收入这里。' : '完成练习并等待老师批改后，错题会自动归档。' }}</p>
        <el-button v-if="keyword" @click="keyword = ''">清除搜索</el-button>
      </div>
    </div>

    <el-drawer v-model="detailVisible" title="错题详情" size="min(620px, 94vw)" @closed="detailQuestion = null">
      <div v-if="detailQuestion" class="question-detail">
        <div class="detail-tags"><span>{{ detailQuestion.courseName || '课程练习' }}</span><span>{{ detailQuestion.questionType === 'SINGLE' ? '单选题' : '开放题' }}</span><span>{{ detailQuestion.wrongReason }}</span></div>
        <h3>{{ detailQuestion.content }}</h3>
        <div v-if="detailQuestion.questionType === 'SINGLE' && detailQuestion.options?.length" class="choice-options">
          <div v-for="(option, optionIndex) in detailQuestion.options" :key="`detail-${optionIndex}`">
            <b>{{ String.fromCharCode(65 + optionIndex) }}</b><span>{{ option.replace(/^[A-D][.、：:]\s*/, '') }}</span>
          </div>
        </div>
        <section><b>你的答案</b><p>{{ detailQuestion.studentAnswer || '未作答' }}</p></section>
        <section><b>参考答案</b><p>{{ detailQuestion.referenceAnswer || '暂无参考答案' }}</p></section>
        <section><b>题目解析</b><p>{{ detailQuestion.explanation || '暂无解析' }}</p></section>
        <section><b>教师反馈</b><p>{{ detailQuestion.teacherFeedback || '老师暂未补充逐题反馈' }}</p></section>
      </div>
    </el-drawer>

    <el-dialog v-model="retrainVisible" title="错题重练" width="min(620px, 94vw)" destroy-on-close @closed="closeRetrain">
      <div v-if="retrainQuestion" class="retrain-dialog">
        <h3>{{ retrainQuestion.content }}</h3>
        <el-radio-group v-if="retrainQuestion.questionType === 'SINGLE'" v-model="retrainAnswer" class="retrain-options" :disabled="Boolean(retrainResult)">
          <el-radio v-for="(option, optionIndex) in retrainQuestion.options || []" :key="`retrain-${optionIndex}`" :value="String.fromCharCode(65 + optionIndex)" border>
            <b>{{ String.fromCharCode(65 + optionIndex) }}</b> {{ option.replace(/^[A-D][.、：:]\s*/, '') }}
          </el-radio>
        </el-radio-group>
        <el-input v-else v-model="retrainAnswer" type="textarea" :rows="4" maxlength="5000" show-word-limit placeholder="写下这次的答案" :disabled="Boolean(retrainResult)" />
        <div v-if="retrainResult" class="retrain-feedback" :class="{ mastered: retrainResult.mastered }">
          <strong>{{ retrainResult.mastered ? '回答正确，已经掌握' : '还需要继续复习' }}</strong>
          <p><b>参考答案：</b>{{ retrainResult.referenceAnswer || '暂无参考答案' }}</p>
          <p><b>解析：</b>{{ retrainResult.explanation || '暂无解析' }}</p>
        </div>
      </div>
      <template #footer><el-button @click="closeRetrain">关闭</el-button><el-button v-if="!retrainResult" type="primary" :loading="actionLoading" @click="submitRetrain">提交重练</el-button></template>
    </el-dialog>
  </section>
</template>

<style scoped>
.wrong-book-shell {
  display: grid;
  grid-template-columns: 236px minmax(0, 1fr);
  min-height: 650px;
  overflow: hidden;
  border: 1.5px solid rgb(61 53 100 / 28%);
  border-radius: 8px;
  background: rgb(255 255 255 / 96%);
  box-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
}

.book-rail {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 20px 14px;
  border-right: 1px solid rgb(61 53 100 / 18%);
  background: linear-gradient(180deg, rgb(232 228 255 / 64%), rgb(251 251 255 / 94%));
}

.rail-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 7px 16px;
  border-bottom: 1px dashed rgb(61 53 100 / 22%);
}

.rail-icon,
.book-symbol {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid #4e4473;
  border-radius: 5px;
  background: #fff1a8;
  color: #3d3564;
}

.rail-icon { width: 34px; height: 34px; box-shadow: 2px 3px 0 rgb(61 53 100 / 14%); }
.rail-icon svg,
.book-symbol svg { width: 17px; }
.rail-heading strong,
.rail-heading small { display: block; }
.rail-heading strong { color: #3d3564; font-size: 15px; }
.rail-heading small { margin-top: 3px; color: #7b7398; font-size: 10px; }

.book-list {
  display: grid;
  gap: 7px;
  margin-top: 14px;
}

.book-list button {
  display: grid;
  grid-template-columns: 31px minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  width: 100%;
  min-height: 57px;
  padding: 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: #3d3564;
  text-align: left;
  cursor: pointer;
}

.book-list button:hover { border-color: rgb(61 53 100 / 22%); background: rgb(255 255 255 / 72%); }
.book-list button.active { border-color: #4e4473; background: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 12%); }
.book-symbol { width: 29px; height: 29px; background: rgb(238 145 187 / 24%); }
.book-symbol.all { background: rgb(157 228 235 / 48%); }
.book-list button > span:nth-child(2) { min-width: 0; }
.book-list strong,
.book-list small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-list strong { font-size: 12px; }
.book-list small { margin-top: 3px; color: #817a99; font-size: 9px; }
.book-list b { min-width: 22px; padding: 3px 5px; border-radius: 4px; background: rgb(129 120 207 / 13%); font-size: 10px; text-align: center; }

.create-book-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 38px;
  margin-top: auto;
  border: 1px dashed #4e4473;
  border-radius: 5px;
  background: #fff;
  color: #4e4473;
  cursor: pointer;
  font-weight: 800;
}

.create-book-button:hover { background: #fff1a8; transform: translateY(-2px); }

.book-workspace { min-width: 0; padding: clamp(18px, 3vw, 32px); }
.book-toolbar { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.book-toolbar h2 { margin: 5px 0 5px; color: #3d3564; font-family: "Trebuchet MS", "Microsoft YaHei", sans-serif; font-size: 27px; font-weight: 900; }
.book-toolbar p { margin: 0; color: #746d91; font-size: 12px; line-height: 1.6; }
.section-label { color: #4e4473; font-size: 10px; font-weight: 900; letter-spacing: .1em; }
.book-actions { display: inline-flex; gap: 8px; }
.book-actions :deep(.el-button) { width: 36px; height: 36px; margin: 0; padding: 0; border: 1px solid #4e4473; border-radius: 5px; color: #3d3564; box-shadow: 2px 3px 0 rgb(61 53 100 / 13%); }
.book-actions :deep(.el-button:last-child) { background: rgb(238 145 187 / 17%); color: #a1456d; }

.book-filter-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 22px 0 13px; }
.book-filter-row label { display: flex; width: min(410px, 100%); height: 38px; align-items: center; gap: 8px; padding: 0 11px; border: 1px solid rgb(61 53 100 / 28%); border-radius: 5px; background: #fff; }
.book-filter-row label:focus-within { border-color: #8178cf; box-shadow: 0 0 0 2px rgb(129 120 207 / 18%); }
.book-filter-row input { width: 100%; min-width: 0; border: 0; outline: 0; color: #3d3564; font: inherit; }
.book-filter-row > span { flex: 0 0 auto; padding: 6px 9px; border: 1px solid rgb(61 53 100 / 24%); border-radius: 4px; background: #fff1a8; color: #3d3564; font-size: 11px; transform: rotate(1deg); }
.advanced-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) auto;gap:8px;margin:-4px 0 15px}.advanced-filters select{min-width:0;height:36px;padding:0 9px;border:1px solid rgb(61 53 100 / 24%);border-radius:5px;background:#fff;color:#615a80}.question-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.question-tags span,.detail-tags span{padding:3px 7px;border-radius:4px;background:#f1effb;color:#655c8c;font-size:10px;font-weight:800}.question-tags span.mastered{background:#e8f7ef;color:#16814f}.retrain-question{border-color:#8178cf;color:#6157a8}.question-detail h3,.retrain-dialog h3{color:#3d3564;line-height:1.7}.detail-tags{display:flex;flex-wrap:wrap;gap:7px}.question-detail section{margin-top:12px;padding:12px;border-radius:6px;background:#f7f8fb}.question-detail section b{color:#4e4473;font-size:12px}.question-detail section p{margin:6px 0 0;color:#615a80;line-height:1.7;white-space:pre-wrap}.retrain-feedback{margin-top:14px;padding:13px;border-left:4px solid #d8891e;background:#fff8ed;color:#75511f}.retrain-feedback.mastered{border-left-color:#18a66a;background:#eef9f2;color:#146941}.retrain-feedback p{margin:7px 0 0;line-height:1.6}
.choice-options{display:grid;gap:8px;margin:12px 0}.choice-options>div{display:flex;min-height:38px;align-items:center;gap:10px;padding:8px 11px;border:1px solid #e1e5ed;border-radius:5px;background:#fafbfe;color:#615a80}.choice-options b{display:grid;width:25px;height:25px;flex:0 0 auto;place-items:center;border:1px solid #8178cf;border-radius:50%;color:#5d53a4;font-size:11px}.choice-options.compact{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:0}.retrain-options{display:grid;gap:9px}.retrain-options :deep(.el-radio){box-sizing:border-box;width:100%;height:auto;min-height:44px;margin:0;padding:9px 12px}.retrain-options :deep(.el-radio__label){min-width:0;white-space:normal;line-height:1.5}

.wrong-card-list { display: grid; gap: 14px; }
.wrong-card { min-width: 0; padding: 17px 18px 13px; border: 1px solid rgb(61 53 100 / 25%); border-left: 4px solid #ee91bb; border-radius: 7px; background: #fff; box-shadow: 3px 4px 0 rgb(61 53 100 / 10%); }
.wrong-card:nth-child(3n + 2) { border-left-color: #8178cf; }
.wrong-card:nth-child(3n) { border-left-color: #52bbc4; }
.wrong-card > header { display: grid; grid-template-columns: 31px minmax(0, 1fr) auto; align-items: center; gap: 10px; }
.question-number { display: grid; width: 29px; height: 29px; place-items: center; border: 1px solid #4e4473; border-radius: 4px; background: rgb(238 145 187 / 20%); color: #8d3f64; font-size: 10px; font-weight: 900; }
.question-source { min-width: 0; }
.question-source strong,
.question-source small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.question-source strong { color: #4e4473; font-size: 11px; }
.question-source small { margin-top: 2px; color: #8b84a3; font-size: 9px; }
.question-score { padding: 4px 7px; border: 1px solid rgb(238 145 187 / 55%); border-radius: 4px; background: rgb(238 145 187 / 13%); color: #9e466e; font-size: 10px; font-weight: 900; white-space: nowrap; }
.wrong-card h3 { margin: 14px 0; color: #3d3564; font-size: 15px; line-height: 1.7; }

.answer-sheet { border-top: 1px dashed rgb(61 53 100 / 18%); border-bottom: 1px dashed rgb(61 53 100 / 18%); }
.answer-sheet summary { display: inline-flex; align-items: center; gap: 5px; padding: 10px 0; color: #6d6590; cursor: pointer; font-size: 11px; font-weight: 800; list-style: none; }
.answer-sheet summary::-webkit-details-marker { display: none; }
.answer-sheet summary .el-icon { transition: transform .2s ease; }
.answer-sheet[open] summary .el-icon { transform: rotate(90deg); }
.answer-sheet > div { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; padding: 0 0 12px; }
.answer-sheet section { padding: 10px 11px; border-radius: 5px; background: rgb(157 228 235 / 18%); }
.answer-sheet section:nth-child(2) { background: rgb(255 241 168 / 27%); }
.answer-sheet span { color: #4e4473; font-size: 10px; font-weight: 900; }
.answer-sheet p { margin: 5px 0 0; color: #615a80; font-size: 11px; line-height: 1.7; white-space: pre-wrap; }

.wrong-card footer { display: flex; align-items: center; justify-content: flex-end; gap: 9px; padding-top: 12px; }
.wrong-card footer :deep(.el-button) { margin: 0; font-weight: 800; white-space: nowrap; }
.wrong-card footer :deep(.el-button--text) { margin-right: auto; color: #4e4473; }
.archive-question,
.remove-question { border: 1px solid #4e4473; border-radius: 5px; box-shadow: 2px 3px 0 rgb(61 53 100 / 16%); }
.archive-question { background: #8178cf; color: #fff; }
.remove-question { background: #fff; color: #6d6590; }

.wrong-empty { display: grid; min-height: 330px; place-items: center; align-content: center; padding: 30px; text-align: center; }
.wrong-empty > span { display: grid; width: 54px; height: 54px; place-items: center; border: 1px solid #4e4473; border-radius: 7px; background: #fff1a8; box-shadow: 3px 4px 0 rgb(61 53 100 / 14%); }
.wrong-empty > span svg { width: 25px; color: #3d3564; }
.wrong-empty strong { margin-top: 15px; color: #3d3564; font-size: 16px; }
.wrong-empty p { max-width: 430px; margin: 7px 0 0; color: #7c7598; font-size: 12px; line-height: 1.7; }

@media (max-width: 800px) {
  .wrong-book-shell { width: 100%; max-width: 100%; grid-template-columns: minmax(0, 1fr); }
  .book-rail { border-right: 0; border-bottom: 1px solid rgb(61 53 100 / 18%); }
  .book-list { display: flex; min-width: 0; max-width: 100%; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
  .book-list::-webkit-scrollbar { display: none; }
  .book-list button { min-width: 190px; }
  .create-book-button { align-self: flex-start; margin-top: 12px; padding: 0 14px; }
  .book-workspace { box-sizing: border-box; width: 100%; max-width: 100%; }
  .advanced-filters{grid-template-columns:repeat(2,minmax(0,1fr))}
}

@media (max-width: 540px) {
  .book-workspace { padding: 17px 13px; }
  .book-toolbar { gap: 12px; }
  .book-toolbar h2 { font-size: 22px; }
  .book-toolbar p { max-width: 230px; }
  .book-filter-row { align-items: stretch; flex-direction: column; }
  .book-filter-row > span { align-self: flex-start; }
  .wrong-card { padding: 14px 12px 11px; }
  .wrong-card > header { grid-template-columns: 31px minmax(0, 1fr); }
  .question-score { grid-column: 2; justify-self: start; }
  .answer-sheet > div { grid-template-columns: 1fr; }
  .choice-options.compact { grid-template-columns: 1fr; }
  .wrong-card footer { align-items: stretch; flex-direction: column; }
  .wrong-card footer :deep(.el-button--text) { align-self: flex-start; margin-right: 0; }
  .wrong-card footer :deep(.el-dropdown),
  .wrong-card footer :deep(.el-dropdown .el-button),
  .wrong-card footer > .el-button { width: 100%; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}
</style>
