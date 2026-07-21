<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  CopyDocument,
  Delete,
  Document,
  EditPen,
  MagicStick,
  Plus,
  RefreshLeft,
} from '@element-plus/icons-vue'
import { listTeacherCourses } from '@/api/course'
import { generateGrading, generateLessonPlan } from '@/api/teacherAi'

const activeTab = ref('lesson')
const courseLoading = ref(false)
const courseOptions = ref([])
const lessonFormRef = ref()
const gradingFormRef = ref()
const lessonLoading = ref(false)
const gradingLoading = ref(false)
const lessonResult = ref(null)
const gradingResult = ref(null)
const gradingResultMaxScore = ref(10)
let rubricSequence = 3

function createLessonDefaults() {
  return {
    courseId: null,
    topic: '',
    grade: '大学',
    durationMinutes: 45,
    objectives: '',
    difficulty: '进阶',
    requirements: '',
  }
}

function createGradingDefaults() {
  return {
    question: '',
    questionType: '简答题',
    referenceAnswer: '',
    rubric: [
      { id: 1, criterion: '知识准确性', description: '核心概念和结论准确', maxScore: 4 },
      { id: 2, criterion: '要点完整性', description: '覆盖题目要求的主要得分点', maxScore: 3 },
      { id: 3, criterion: '逻辑与表达', description: '思路清晰，表达规范且有依据', maxScore: 3 },
    ],
    studentAnswer: '',
    maxScore: 10,
  }
}

const lessonForm = reactive(createLessonDefaults())
const gradingForm = reactive(createGradingDefaults())

const lessonRules = {
  topic: [
    { required: true, message: '请输入课题名称', trigger: 'blur' },
    { max: 200, message: '课题名称不能超过200个字符', trigger: 'blur' },
  ],
  grade: [{ required: true, message: '请选择或输入学段', trigger: 'change' }],
  durationMinutes: [
    { required: true, message: '请输入课时分钟数', trigger: 'change' },
    { type: 'number', min: 20, max: 240, message: '课时应为20至240分钟', trigger: 'change' },
  ],
  objectives: [
    { required: true, message: '请输入教学目标', trigger: 'blur' },
    { max: 2000, message: '教学目标不能超过2000个字符', trigger: 'blur' },
  ],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  requirements: [{ max: 2000, message: '补充要求不能超过2000个字符', trigger: 'blur' }],
}

function validateRubric(_rule, value, callback) {
  if (!Array.isArray(value) || value.length === 0) {
    callback(new Error('请至少添加一个评分维度'))
    return
  }

  const invalidItem = value.find(
    (item) =>
      !item.criterion?.trim() ||
      !item.description?.trim() ||
      !Number.isFinite(Number(item.maxScore)) ||
      Number(item.maxScore) <= 0,
  )
  if (invalidItem) {
    callback(new Error('请完整填写每个评分维度、说明和分值'))
    return
  }

  const rubricTotal = value.reduce((sum, item) => sum + Number(item.maxScore || 0), 0)
  if (Number.isFinite(Number(gradingForm.maxScore)) && Math.abs(rubricTotal - Number(gradingForm.maxScore)) > 0.001) {
    callback(new Error(`评分维度合计 ${rubricTotal} 分，必须等于总分`))
    return
  }
  callback()
}

const gradingRules = {
  question: [
    { required: true, message: '请输入题目', trigger: 'blur' },
    { max: 3000, message: '题目不能超过3000个字符', trigger: 'blur' },
  ],
  questionType: [{ required: true, message: '请选择题型', trigger: 'change' }],
  referenceAnswer: [
    { required: true, message: '请输入参考答案', trigger: 'blur' },
    { max: 5000, message: '参考答案不能超过5000个字符', trigger: 'blur' },
  ],
  rubric: [{ validator: validateRubric, trigger: 'change' }],
  studentAnswer: [
    { required: true, message: '请输入学生答案', trigger: 'blur' },
    { max: 5000, message: '学生答案不能超过5000个字符', trigger: 'blur' },
  ],
  maxScore: [
    { required: true, message: '请输入总分', trigger: 'change' },
    { type: 'number', min: 0.1, max: 1000, message: '总分应大于0且不超过1000', trigger: 'change' },
  ],
}

const confidencePercent = computed(() => {
  const confidence = Number(gradingResult.value?.confidence || 0)
  return Math.max(0, Math.min(100, Math.round(confidence * 100)))
})

const scorePercent = computed(() => {
  const total = Number(gradingResult.value?.totalScore || 0)
  return Math.max(0, Math.min(100, Math.round((total / Number(gradingResultMaxScore.value || 1)) * 100)))
})

async function loadCourses() {
  courseLoading.value = true
  try {
    const courses = (await listTeacherCourses()) || []
    courseOptions.value = courses.map((course) => ({
      value: course.id,
      label: course.title || course.courseName || `课程 ${course.id}`,
    }))
  } catch (error) {
    courseOptions.value = []
    ElMessage.warning(error?.message || '关联课程加载失败，仍可继续填写并生成教案')
  } finally {
    courseLoading.value = false
  }
}

async function submitLessonPlan() {
  const valid = await lessonFormRef.value?.validate().catch(() => false)
  if (!valid) return

  lessonLoading.value = true
  try {
    lessonResult.value = await generateLessonPlan({
      courseId: lessonForm.courseId || undefined,
      topic: lessonForm.topic.trim(),
      grade: lessonForm.grade.trim(),
      durationMinutes: lessonForm.durationMinutes,
      objectives: lessonForm.objectives.trim(),
      difficulty: lessonForm.difficulty,
      requirements: lessonForm.requirements.trim() || undefined,
    })
    ElMessage.success('教案已生成')
  } catch (error) {
    ElMessage.error(error?.message || '教案生成失败，请稍后重试')
  } finally {
    lessonLoading.value = false
  }
}

async function submitGrading() {
  const valid = await gradingFormRef.value?.validate().catch(() => false)
  if (!valid) return

  gradingLoading.value = true
  try {
    const maxScore = Number(gradingForm.maxScore)
    gradingResult.value = await generateGrading({
      question: gradingForm.question.trim(),
      questionType: gradingForm.questionType,
      referenceAnswer: gradingForm.referenceAnswer.trim(),
      rubric: gradingForm.rubric.map((item) => ({
        criterion: item.criterion.trim(),
        description: item.description.trim(),
        maxScore: Number(item.maxScore),
      })),
      studentAnswer: gradingForm.studentAnswer.trim(),
      maxScore,
    })
    gradingResultMaxScore.value = maxScore
    ElMessage.success('批改已完成')
  } catch (error) {
    ElMessage.error(error?.message || '智能批改失败，请稍后重试')
  } finally {
    gradingLoading.value = false
  }
}

function addRubricItem() {
  rubricSequence += 1
  gradingForm.rubric.push({
    id: rubricSequence,
    criterion: '',
    description: '',
    maxScore: 1,
  })
  validateRubricField()
}

function removeRubricItem(index) {
  if (gradingForm.rubric.length === 1) {
    ElMessage.warning('至少保留一个评分维度')
    return
  }
  gradingForm.rubric.splice(index, 1)
  validateRubricField()
}

function validateRubricField() {
  gradingFormRef.value?.validateField('rubric').catch(() => {})
}

function clearLessonForm() {
  Object.assign(lessonForm, createLessonDefaults())
  lessonResult.value = null
  lessonFormRef.value?.clearValidate()
}

function clearGradingForm() {
  rubricSequence = 3
  Object.assign(gradingForm, createGradingDefaults())
  gradingResult.value = null
  gradingResultMaxScore.value = 10
  gradingFormRef.value?.clearValidate()
}

async function copyResult(result, successMessage) {
  if (!result) return
  const text = JSON.stringify(result, null, 2)
  let textarea = null
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      if (!document.execCommand('copy')) {
        throw new Error('浏览器拒绝复制操作')
      }
    }
    ElMessage.success(successMessage)
  } catch {
    ElMessage.error('复制失败，请检查浏览器剪贴板权限')
  } finally {
    textarea?.remove()
  }
}

onMounted(loadCourses)
</script>

<template>
  <main class="ai-assistant-page">
    <header class="page-header">
      <div class="page-title">
        <span class="title-icon"><MagicStick /></span>
        <div>
          <h1>AI备课与批改</h1>
          <p>教师工作台</p>
        </div>
      </div>
    </header>

    <el-tabs v-model="activeTab" class="assistant-tabs">
      <el-tab-pane name="lesson">
        <template #label>
          <span class="tab-label"><Document />智能备课</span>
        </template>

        <div class="assistant-workspace">
          <section class="input-panel">
            <div class="panel-heading">
              <div>
                <span class="panel-index">01</span>
                <h2>备课参数</h2>
              </div>
              <el-tooltip content="清空表单" placement="bottom">
                <el-button circle aria-label="清空备课表单" :disabled="lessonLoading" @click="clearLessonForm">
                  <el-icon><RefreshLeft /></el-icon>
                </el-button>
              </el-tooltip>
            </div>

            <el-form
              ref="lessonFormRef"
              :model="lessonForm"
              :rules="lessonRules"
              label-position="top"
              class="assistant-form lesson-form"
            >
              <el-form-item label="关联课程" prop="courseId">
                <el-select
                  v-model="lessonForm.courseId"
                  clearable
                  filterable
                  :loading="courseLoading"
                  placeholder="可选"
                  class="full-width"
                >
                  <el-option
                    v-for="course in courseOptions"
                    :key="course.value"
                    :label="course.label"
                    :value="course.value"
                  />
                </el-select>
              </el-form-item>

              <el-form-item label="课题名称" prop="topic">
                <el-input
                  v-model="lessonForm.topic"
                  maxlength="200"
                  placeholder="例如：线性回归的基本原理"
                />
              </el-form-item>

              <el-form-item label="学段" prop="grade">
                <el-select
                  v-model="lessonForm.grade"
                  filterable
                  allow-create
                  default-first-option
                  class="full-width"
                  placeholder="选择或输入学段"
                >
                  <el-option label="小学" value="小学" />
                  <el-option label="初中" value="初中" />
                  <el-option label="高中" value="高中" />
                  <el-option label="大学" value="大学" />
                  <el-option label="研一" value="研一" />
                  <el-option label="研二" value="研二" />
                </el-select>
              </el-form-item>

              <el-form-item label="课时分钟数" prop="durationMinutes">
                <el-input-number
                  v-model="lessonForm.durationMinutes"
                  :min="20"
                  :max="240"
                  :step="5"
                  controls-position="right"
                  class="full-width"
                />
              </el-form-item>

              <el-form-item label="教学目标" prop="objectives" class="form-span-full">
                <el-input
                  v-model="lessonForm.objectives"
                  type="textarea"
                  :rows="4"
                  maxlength="2000"
                  show-word-limit
                  placeholder="每行填写一个教学目标"
                />
              </el-form-item>

              <el-form-item label="难度" prop="difficulty" class="form-span-full">
                <el-segmented
                  v-model="lessonForm.difficulty"
                  :options="['基础', '进阶', '高阶']"
                  class="difficulty-control"
                />
              </el-form-item>

              <el-form-item label="补充要求" prop="requirements" class="form-span-full">
                <el-input
                  v-model="lessonForm.requirements"
                  type="textarea"
                  :rows="3"
                  maxlength="2000"
                  show-word-limit
                  placeholder="可选"
                />
              </el-form-item>

              <div class="form-actions form-span-full">
                <el-button :disabled="lessonLoading" @click="clearLessonForm">
                  <el-icon><RefreshLeft /></el-icon>
                  清空
                </el-button>
                <el-button type="primary" :loading="lessonLoading" @click="submitLessonPlan">
                  <el-icon><MagicStick /></el-icon>
                  生成教案
                </el-button>
              </div>
            </el-form>
          </section>

          <section v-loading="lessonLoading" class="result-panel" aria-live="polite">
            <div class="panel-heading result-heading">
              <div>
                <span class="panel-index">02</span>
                <h2>教案结果</h2>
              </div>
              <el-button
                :icon="CopyDocument"
                :disabled="!lessonResult || lessonLoading"
                @click="copyResult(lessonResult, '教案结果已复制')"
              >
                复制结果
              </el-button>
            </div>

            <el-empty v-if="!lessonResult && !lessonLoading" description="暂无教案结果" :image-size="88" />

            <div v-else-if="lessonResult" class="structured-result">
              <div class="result-title-band">
                <span>教案标题</span>
                <h2>{{ lessonResult.title }}</h2>
              </div>

              <div class="overview-grid">
                <section class="result-section">
                  <h3>教学目标</h3>
                  <ul><li v-for="item in lessonResult.objectives" :key="item">{{ item }}</li></ul>
                </section>
                <section class="result-section">
                  <h3>教学重点</h3>
                  <ul><li v-for="item in lessonResult.keyPoints" :key="item">{{ item }}</li></ul>
                </section>
                <section class="result-section">
                  <h3>教学难点</h3>
                  <ul><li v-for="item in lessonResult.difficultPoints" :key="item">{{ item }}</li></ul>
                </section>
                <section class="result-section">
                  <h3>教学准备</h3>
                  <ul><li v-for="item in lessonResult.preparations" :key="item">{{ item }}</li></ul>
                </section>
              </div>

              <section class="result-section wide-section">
                <h3>教学流程</h3>
                <el-table :data="lessonResult.teachingSteps" border class="result-table">
                  <el-table-column prop="stage" label="阶段" width="96" />
                  <el-table-column prop="durationMinutes" label="时长" width="72">
                    <template #default="{ row }">{{ row.durationMinutes }} 分钟</template>
                  </el-table-column>
                  <el-table-column prop="teacherActivity" label="教师活动" min-width="210" />
                  <el-table-column prop="studentActivity" label="学生活动" min-width="210" />
                  <el-table-column prop="purpose" label="设计意图" min-width="170" />
                </el-table>
              </section>

              <section class="result-section wide-section">
                <h3>课堂活动</h3>
                <ol class="activity-list">
                  <li v-for="(item, index) in lessonResult.activities" :key="item">
                    <span>{{ String(index + 1).padStart(2, '0') }}</span>
                    <p>{{ item }}</p>
                  </li>
                </ol>
              </section>

              <section class="result-section wide-section">
                <h3>练习题</h3>
                <div class="exercise-list">
                  <article v-for="(exercise, index) in lessonResult.exercises" :key="`${exercise.question}-${index}`">
                    <div class="exercise-heading">
                      <strong>练习 {{ index + 1 }}</strong>
                      <div>
                        <el-tag size="small" effect="plain">{{ exercise.type }}</el-tag>
                        <el-tag size="small" type="warning" effect="plain">{{ exercise.difficulty }}</el-tag>
                      </div>
                    </div>
                    <p class="exercise-question">{{ exercise.question }}</p>
                    <dl>
                      <dt>参考答案</dt>
                      <dd>{{ exercise.referenceAnswer }}</dd>
                    </dl>
                  </article>
                </div>
              </section>

              <section class="result-section wide-section">
                <h3>评分 Rubric</h3>
                <el-table :data="lessonResult.rubric" border class="result-table">
                  <el-table-column prop="criterion" label="评分维度" width="130" />
                  <el-table-column prop="description" label="评分说明" min-width="280" />
                  <el-table-column prop="maxScore" label="满分" width="80" />
                </el-table>
              </section>

              <section class="result-section wide-section notes-section">
                <h3>教学注意事项</h3>
                <ul><li v-for="item in lessonResult.notes" :key="item">{{ item }}</li></ul>
              </section>
            </div>
          </section>
        </div>
      </el-tab-pane>

      <el-tab-pane name="grading">
        <template #label>
          <span class="tab-label"><EditPen />智能批改</span>
        </template>

        <div class="assistant-workspace grading-workspace">
          <section class="input-panel grading-input-panel">
            <div class="panel-heading">
              <div>
                <span class="panel-index">01</span>
                <h2>批改参数</h2>
              </div>
              <el-tooltip content="清空表单" placement="bottom">
                <el-button circle aria-label="清空批改表单" :disabled="gradingLoading" @click="clearGradingForm">
                  <el-icon><RefreshLeft /></el-icon>
                </el-button>
              </el-tooltip>
            </div>

            <el-form
              ref="gradingFormRef"
              :model="gradingForm"
              :rules="gradingRules"
              label-position="top"
              class="assistant-form grading-form"
            >
              <el-form-item label="题目" prop="question" class="form-span-full">
                <el-input
                  v-model="gradingForm.question"
                  type="textarea"
                  :rows="3"
                  maxlength="3000"
                  show-word-limit
                  placeholder="输入待批改题目"
                />
              </el-form-item>

              <el-form-item label="题型" prop="questionType">
                <el-select v-model="gradingForm.questionType" filterable allow-create class="full-width">
                  <el-option label="简答题" value="简答题" />
                  <el-option label="论述题" value="论述题" />
                  <el-option label="计算题" value="计算题" />
                  <el-option label="案例分析题" value="案例分析题" />
                  <el-option label="编程题" value="编程题" />
                </el-select>
              </el-form-item>

              <el-form-item label="总分" prop="maxScore">
                <el-input-number
                  v-model="gradingForm.maxScore"
                  :min="0.1"
                  :max="1000"
                  :precision="1"
                  :step="0.1"
                  controls-position="right"
                  class="full-width"
                  @change="validateRubricField"
                />
              </el-form-item>

              <el-form-item label="参考答案" prop="referenceAnswer" class="form-span-full">
                <el-input
                  v-model="gradingForm.referenceAnswer"
                  type="textarea"
                  :rows="4"
                  maxlength="5000"
                  show-word-limit
                  placeholder="输入参考答案或参考要点"
                />
              </el-form-item>

              <el-form-item label="评分标准" prop="rubric" class="form-span-full rubric-form-item">
                <div class="rubric-editor">
                  <div class="rubric-labels" aria-hidden="true">
                    <span>评分维度</span>
                    <span>评分说明</span>
                    <span>分值</span>
                    <span></span>
                  </div>
                  <div v-for="(item, index) in gradingForm.rubric" :key="item.id" class="rubric-row">
                    <el-input
                      v-model="item.criterion"
                      :aria-label="`评分维度 ${index + 1}`"
                      maxlength="100"
                      placeholder="评分维度"
                      @input="validateRubricField"
                    />
                    <el-input
                      v-model="item.description"
                      :aria-label="`评分说明 ${index + 1}`"
                      maxlength="500"
                      placeholder="评分说明"
                      @input="validateRubricField"
                    />
                    <el-input-number
                      v-model="item.maxScore"
                      :aria-label="`评分分值 ${index + 1}`"
                      :min="0.1"
                      :max="1000"
                      :precision="1"
                      :step="0.1"
                      controls-position="right"
                      @change="validateRubricField"
                    />
                    <el-tooltip content="删除评分维度" placement="top">
                      <el-button
                        circle
                        type="danger"
                        plain
                        :aria-label="`删除评分维度 ${index + 1}`"
                        @click="removeRubricItem(index)"
                      >
                        <el-icon><Delete /></el-icon>
                      </el-button>
                    </el-tooltip>
                  </div>
                  <el-button class="add-rubric-button" :icon="Plus" plain @click="addRubricItem">
                    添加评分维度
                  </el-button>
                </div>
              </el-form-item>

              <el-form-item label="学生答案" prop="studentAnswer" class="form-span-full">
                <el-input
                  v-model="gradingForm.studentAnswer"
                  type="textarea"
                  :rows="6"
                  maxlength="5000"
                  show-word-limit
                  placeholder="输入学生提交的答案"
                />
              </el-form-item>

              <div class="form-actions form-span-full">
                <el-button :disabled="gradingLoading" @click="clearGradingForm">
                  <el-icon><RefreshLeft /></el-icon>
                  清空
                </el-button>
                <el-button type="primary" :loading="gradingLoading" @click="submitGrading">
                  <el-icon><MagicStick /></el-icon>
                  开始批改
                </el-button>
              </div>
            </el-form>
          </section>

          <section v-loading="gradingLoading" class="result-panel" aria-live="polite">
            <div class="panel-heading result-heading">
              <div>
                <span class="panel-index">02</span>
                <h2>批改结果</h2>
              </div>
              <el-button
                :icon="CopyDocument"
                :disabled="!gradingResult || gradingLoading"
                @click="copyResult(gradingResult, '批改结果已复制')"
              >
                复制结果
              </el-button>
            </div>

            <el-empty v-if="!gradingResult && !gradingLoading" description="暂无批改结果" :image-size="88" />

            <div v-else-if="gradingResult" class="structured-result grading-result">
              <section class="score-summary">
                <div class="total-score">
                  <span>总得分</span>
                  <strong>{{ gradingResult.totalScore }}</strong>
                  <small>/ {{ gradingResultMaxScore }}</small>
                </div>
                <div class="score-progress">
                  <div>
                    <span>得分率</span>
                    <strong>{{ scorePercent }}%</strong>
                  </div>
                  <el-progress :percentage="scorePercent" :stroke-width="9" :show-text="false" color="#2f855a" />
                </div>
                <div class="score-progress confidence-progress">
                  <div>
                    <span>AI 置信度</span>
                    <strong>{{ confidencePercent }}%</strong>
                  </div>
                  <el-progress :percentage="confidencePercent" :stroke-width="9" :show-text="false" color="#b7791f" />
                </div>
              </section>

              <section class="result-section wide-section">
                <h3>分项得分</h3>
                <el-table :data="gradingResult.dimensionScores" border class="result-table">
                  <el-table-column prop="criterion" label="评分维度" width="140" />
                  <el-table-column label="得分" width="100">
                    <template #default="{ row }">
                      <strong class="dimension-score">{{ row.score }} / {{ row.maxScore }}</strong>
                    </template>
                  </el-table-column>
                  <el-table-column prop="reason" label="评分理由" min-width="300" />
                </el-table>
              </section>

              <div class="feedback-grid">
                <section class="result-section feedback-section strengths-section">
                  <h3>答案优点</h3>
                  <ul><li v-for="item in gradingResult.strengths" :key="item">{{ item }}</li></ul>
                </section>
                <section class="result-section feedback-section deductions-section">
                  <h3>扣分原因</h3>
                  <ul><li v-for="item in gradingResult.deductions" :key="item">{{ item }}</li></ul>
                </section>
                <section class="result-section feedback-section suggestions-section">
                  <h3>修改建议</h3>
                  <ul><li v-for="item in gradingResult.suggestions" :key="item">{{ item }}</li></ul>
                </section>
              </div>

              <section class="result-section wide-section revised-answer">
                <h3>参考改写答案</h3>
                <p>{{ gradingResult.revisedAnswer }}</p>
              </section>
            </div>
          </section>
        </div>
      </el-tab-pane>
    </el-tabs>
  </main>
</template>

<style scoped>
.ai-assistant-page {
  min-height: 100%;
  padding: 26px 28px 42px;
  background: #f4f6f9;
  color: #172033;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  place-items: center;
  border-radius: 8px;
  background: #2468d8;
  color: #ffffff;
}

.title-icon svg {
  width: 22px;
}

.page-title h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0;
}

.page-title p {
  margin: 3px 0 0;
  color: #7b8798;
  font-size: 12px;
}

.assistant-tabs {
  --el-tabs-header-height: 48px;
}

.assistant-tabs :deep(.el-tabs__header) {
  margin-bottom: 18px;
  border-bottom: 1px solid #dfe5ed;
}

.assistant-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.assistant-tabs :deep(.el-tabs__item) {
  height: 48px;
  padding: 0 24px;
  font-size: 15px;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.tab-label svg {
  width: 17px;
}

.assistant-workspace {
  display: grid;
  grid-template-columns: minmax(360px, 0.82fr) minmax(560px, 1.38fr);
  gap: 18px;
  align-items: start;
}

.grading-workspace {
  grid-template-columns: minmax(460px, 0.95fr) minmax(520px, 1.25fr);
}

.input-panel,
.result-panel {
  min-width: 0;
  border: 1px solid #e0e5ec;
  border-radius: 8px;
  background: #ffffff;
}

.input-panel {
  padding: 22px;
}

.result-panel {
  min-height: 520px;
  padding: 22px;
}

.panel-heading {
  display: flex;
  min-height: 36px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.panel-heading > div {
  display: flex;
  align-items: center;
  gap: 9px;
}

.panel-heading h2 {
  margin: 0;
  font-size: 17px;
  font-weight: 680;
  letter-spacing: 0;
}

.panel-index {
  color: #2468d8;
  font-size: 11px;
  font-weight: 750;
}

.assistant-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
}

.assistant-form :deep(.el-form-item) {
  min-width: 0;
  margin-bottom: 19px;
}

.assistant-form :deep(.el-form-item__label) {
  color: #465267;
  font-size: 13px;
  font-weight: 650;
}

.form-span-full {
  grid-column: 1 / -1;
}

.full-width,
.difficulty-control {
  width: 100%;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 3px;
}

.form-actions .el-button {
  min-width: 108px;
}

.result-panel > .el-empty {
  min-height: 390px;
}

.structured-result {
  display: grid;
  gap: 18px;
}

.result-title-band {
  padding: 18px 20px;
  border-left: 4px solid #2468d8;
  background: #f2f6fc;
}

.result-title-band span {
  color: #6e7b8f;
  font-size: 12px;
}

.result-title-band h2 {
  margin: 5px 0 0;
  font-size: 20px;
  line-height: 1.45;
  letter-spacing: 0;
}

.overview-grid,
.feedback-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid #e7ebf1;
  border-left: 1px solid #e7ebf1;
}

.result-section {
  min-width: 0;
  padding: 17px 18px;
  border-right: 1px solid #e7ebf1;
  border-bottom: 1px solid #e7ebf1;
}

.wide-section {
  padding: 0;
  border: 0;
}

.result-section h3 {
  margin: 0 0 12px;
  color: #273349;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0;
}

.wide-section > h3 {
  padding-bottom: 10px;
  border-bottom: 1px solid #e6eaf0;
}

.result-section ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
  color: #5d697c;
  font-size: 13px;
  line-height: 1.65;
}

.result-section li::marker {
  color: #3f7fd6;
}

.result-table {
  width: 100%;
}

.result-table :deep(.cell) {
  line-height: 1.55;
  word-break: break-word;
}

.activity-list {
  display: grid;
  gap: 1px;
  margin: 0;
  padding: 0;
  background: #e8ecf1;
  list-style: none;
}

.activity-list li {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: start;
  gap: 13px;
  padding: 13px 15px;
  background: #ffffff;
}

.activity-list span {
  color: #2468d8;
  font-size: 12px;
  font-weight: 750;
}

.activity-list p {
  margin: 0;
  color: #5d697c;
  font-size: 13px;
  line-height: 1.65;
}

.exercise-list {
  display: grid;
  border-top: 1px solid #e4e9ef;
}

.exercise-list article {
  padding: 16px 2px;
  border-bottom: 1px solid #e4e9ef;
}

.exercise-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.exercise-heading > div {
  display: flex;
  gap: 6px;
}

.exercise-question {
  margin: 11px 0;
  color: #2f3a4d;
  font-size: 14px;
  line-height: 1.65;
}

.exercise-list dl {
  display: grid;
  grid-template-columns: 70px minmax(0, 1fr);
  margin: 0;
  padding: 10px 12px;
  background: #f6f8fa;
  color: #687488;
  font-size: 13px;
  line-height: 1.6;
}

.exercise-list dt {
  color: #445065;
  font-weight: 650;
}

.exercise-list dd {
  margin: 0;
}

.notes-section {
  padding: 16px 18px;
  border-left: 3px solid #b7791f;
  background: #fffbeb;
}

.notes-section > h3 {
  border-bottom: 0;
}

.rubric-editor {
  display: grid;
  width: 100%;
  gap: 9px;
}

.rubric-labels,
.rubric-row {
  display: grid;
  grid-template-columns: minmax(110px, 0.8fr) minmax(170px, 1.6fr) 112px 34px;
  gap: 8px;
  align-items: center;
}

.rubric-labels {
  padding: 0 1px;
  color: #7b8798;
  font-size: 11px;
}

.rubric-row .el-input-number {
  width: 100%;
}

.add-rubric-button {
  width: 100%;
  margin-top: 2px;
  border-style: dashed;
}

.score-summary {
  display: grid;
  grid-template-columns: minmax(130px, 0.55fr) repeat(2, minmax(150px, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid #dfe5ec;
  border-radius: 8px;
  background: #dfe5ec;
}

.total-score,
.score-progress {
  min-width: 0;
  padding: 17px 18px;
  background: #ffffff;
}

.total-score span,
.score-progress span {
  color: #738095;
  font-size: 12px;
}

.total-score strong {
  display: inline-block;
  margin: 4px 4px 0 0;
  color: #23734b;
  font-size: 30px;
  line-height: 1;
}

.total-score small {
  color: #7b8798;
  font-size: 13px;
}

.score-progress > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.score-progress strong {
  color: #23734b;
  font-size: 14px;
}

.confidence-progress strong {
  color: #9b6518;
}

.dimension-score {
  color: #23734b;
}

.feedback-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.feedback-section {
  padding-top: 19px;
  border-top: 3px solid #8190a5;
}

.strengths-section {
  border-top-color: #2f855a;
}

.deductions-section {
  border-top-color: #c05621;
}

.suggestions-section {
  border-top-color: #2b6cb0;
}

.revised-answer {
  padding: 18px;
  border: 1px solid #dfe5ec;
  background: #f7f9fb;
}

.revised-answer > h3 {
  border-bottom: 0;
}

.revised-answer p {
  margin: 0;
  color: #465267;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

@media (max-width: 1180px) {
  .assistant-workspace,
  .grading-workspace {
    grid-template-columns: 1fr;
  }

  .result-panel {
    min-height: 440px;
  }
}

@media (max-width: 760px) {
  .ai-assistant-page {
    padding: 20px 14px 32px;
  }

  .assistant-tabs :deep(.el-tabs__item) {
    padding: 0 16px;
  }

  .input-panel,
  .result-panel {
    padding: 17px 14px;
  }

  .assistant-form,
  .overview-grid,
  .feedback-grid,
  .score-summary {
    grid-template-columns: 1fr;
  }

  .form-span-full {
    grid-column: auto;
  }

  .result-heading {
    align-items: flex-start;
  }

  .rubric-labels {
    display: none;
  }

  .rubric-row {
    grid-template-columns: minmax(0, 1fr) 108px 34px;
  }

  .rubric-row > :nth-child(2) {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .rubric-row > :nth-child(3) {
    grid-column: 2;
    grid-row: 1;
  }

  .rubric-row > :nth-child(4) {
    grid-column: 3;
    grid-row: 1;
  }

  .score-summary {
    gap: 0;
    background: #ffffff;
  }

  .score-summary > * {
    border-bottom: 1px solid #e4e9ef;
  }

  .score-summary > *:last-child {
    border-bottom: 0;
  }

  .exercise-heading,
  .panel-heading {
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .page-title h1 {
    font-size: 21px;
  }

  .result-heading {
    flex-direction: column;
  }

  .result-heading > .el-button {
    width: 100%;
  }

  .form-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .form-actions .el-button {
    width: 100%;
    min-width: 0;
    margin: 0;
  }

  .exercise-heading {
    flex-direction: column;
  }

  .exercise-list dl {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
