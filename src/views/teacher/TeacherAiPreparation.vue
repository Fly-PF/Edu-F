<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CopyDocument, MagicStick, RefreshLeft } from '@element-plus/icons-vue'
import { listTeacherCourses } from '@/api/course'
import { generateLessonPlan } from '@/api/teacherAi'
import { useUserStore } from '@/stores/user'
import LessonPlanningWorkspace from '@/components/teacher-ai/lesson-planning/LessonPlanningWorkspace.vue'
import {
  createEmptyLearningInsight,
  hasLearningInsight,
  loadLearningInsight,
} from '@/utils/teacherAiLearningInsight'

const courseLoading = ref(false)
const courseOptions = ref([])
const route = useRoute()
const userStore = useUserStore()
const lessonFormRef = ref()
const lessonLoading = ref(false)
const lessonSlowNotice = ref(false)
const lessonResult = ref(null)
const learningInsight = ref(createEmptyLearningInsight())
let lessonSlowNoticeTimer = null

function createLessonDefaults() {
  const queryTopic = Array.isArray(route.query.topic) ? route.query.topic[0] : route.query.topic
  const queryCourseId = Array.isArray(route.query.courseId) ? route.query.courseId[0] : route.query.courseId

  return {
    courseId: queryCourseId && Number.isFinite(Number(queryCourseId)) ? Number(queryCourseId) : null,
    topic: typeof queryTopic === 'string' ? queryTopic : '',
    grade: '大学',
    durationMinutes: 45,
    objectives: '',
    difficulty: '进阶',
    requirements: '',
  }
}

const lessonForm = reactive(createLessonDefaults())

const lessonRules = {
  topic: [
    { required: true, message: '请输入课题名称', trigger: 'blur' },
    { max: 200, message: '课题名称不能超过200个字符', trigger: 'blur' },
  ],
  grade: [{ required: true, message: '请选择或输入学段', trigger: 'change' }],
  durationMinutes: [
    { required: true, message: '请输入课时分钟数', trigger: 'change' },
    { type: 'number', min: 20, max: 240, message: '课时应为20到240分钟', trigger: 'change' },
  ],
  objectives: [
    { required: true, message: '请输入教学目标', trigger: 'blur' },
    { max: 2000, message: '教学目标不能超过2000个字符', trigger: 'blur' },
  ],
  difficulty: [{ required: true, message: '请选择难度', trigger: 'change' }],
  requirements: [{ max: 2000, message: '补充要求不能超过2000个字符', trigger: 'blur' }],
}

function normalizeList(value) {
  return Array.isArray(value) ? value.filter((item) => item !== null && item !== undefined && item !== '') : []
}

function formatScore(value) {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return '--'
  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1).replace(/\.0$/, '')
}
const lessonDisplayResult = computed(() => lessonResult.value)
const lessonModuleCards = computed(() => [
  {
    key: 'objectives',
    title: '教学目标',
    description: '围绕知识、能力与素养形成可执行目标',
    items: normalizeList(lessonDisplayResult.value?.objectives),
  },
  {
    key: 'keyPoints',
    title: '教学重点',
    description: '突出本节课必须掌握的核心内容',
    items: normalizeList(lessonDisplayResult.value?.keyPoints),
  },
  {
    key: 'difficultPoints',
    title: '教学难点',
    description: '提前标出学生容易卡住的环节',
    items: normalizeList(lessonDisplayResult.value?.difficultPoints),
  },
  {
    key: 'preparations',
    title: '教学准备',
    description: '课前资源、素材与设备准备提示',
    items: normalizeList(lessonDisplayResult.value?.preparations),
  },
  {
    key: 'notes',
    title: '教学提醒',
    description: '帮助教师快速把握课堂节奏',
    items: normalizeList(lessonDisplayResult.value?.notes),
  },
])

const lessonTeachingSteps = computed(() => normalizeList(lessonDisplayResult.value?.teachingSteps))
const lessonActivities = computed(() => normalizeList(lessonDisplayResult.value?.activities))
const lessonExercises = computed(() => normalizeList(lessonDisplayResult.value?.exercises))
const lessonRubric = computed(() => normalizeList(lessonDisplayResult.value?.rubric))
const lessonCoreCards = computed(() =>
  lessonModuleCards.value.filter((card) => ['objectives', 'keyPoints', 'difficultPoints'].includes(card.key)),
)
const lessonSupplementCards = computed(() =>
  lessonModuleCards.value.filter((card) => !['objectives', 'keyPoints', 'difficultPoints'].includes(card.key)),
)

const lessonResultReady = computed(() => Boolean(lessonResult.value))
const learningInsightReady = computed(() => hasLearningInsight(learningInsight.value))
const lessonStatusText = computed(() =>
  lessonLoading.value ? 'AI 正在生成课堂方案…' : lessonResultReady.value ? '课堂探索地图已展开' : '准备开始探索',
)
const lessonLoadingStages = [
  {
    title: '解析教学背景',
    description: '识别课题、学段、目标与难度偏好',
  },
  {
    title: '编排课堂结构',
    description: '生成教学流程、活动设计与环节时长',
  },
  {
    title: '补全评价内容',
    description: '输出练习题与 Rubric 评分建议',
  },
]
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
  if (lessonLoading.value) return
  const valid = await lessonFormRef.value?.validate().catch(() => false)
  if (!valid) return

  lessonResult.value = null
  lessonLoading.value = true
  startLessonWaitNotice()
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
    ElMessage.success('课堂方案已展开')
  } catch (error) {
    lessonResult.value = null
    ElMessage.error(error?.message || 'AI 服务暂时不可用，请稍后重试。')
  } finally {
    lessonLoading.value = false
    stopLessonWaitNotice()
  }
}

function clearLessonForm() {
  Object.assign(lessonForm, createLessonDefaults())
  lessonResult.value = null
  lessonFormRef.value?.clearValidate()
}

function loadRelevantLearningInsight() {
  learningInsight.value = loadLearningInsight({
    ownerId: userStore.userId || null,
    ownerUsername: userStore.username || null,
    sourceTopic: lessonForm.topic,
    sourceQuestion: lessonForm.topic,
    courseId: lessonForm.courseId,
  })
}

function startLessonWaitNotice() {
  stopLessonWaitNotice()
  lessonSlowNoticeTimer = window.setTimeout(() => {
    if (lessonLoading.value) lessonSlowNotice.value = true
  }, 9000)
}

function stopLessonWaitNotice() {
  if (lessonSlowNoticeTimer !== null) window.clearTimeout(lessonSlowNoticeTimer)
  lessonSlowNoticeTimer = null
  lessonSlowNotice.value = false
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
onUnmounted(stopLessonWaitNotice)
watch(
  () => [lessonForm.topic, lessonForm.courseId],
  loadRelevantLearningInsight,
  { immediate: true },
)
</script>

<template>
  <main class="ai-assistant-page">
    <section class="explore-hero preparation-hero" aria-labelledby="preparation-workbench-title">
      <div class="explore-hero__content">
        <span class="explore-kicker">AI COURSE LAB</span>
        <h1 id="preparation-workbench-title">把教学灵感变成一节好课</h1>
        <p>结合学生学习反馈，和 AI 一起设计更适合当前班级的课堂。</p>
        <a class="handmade-action" href="#lesson-builder">
          <el-icon><MagicStick /></el-icon>
          开始设计
        </a>
      </div>
      <div class="orbit-scene" aria-hidden="true">
        <span class="orbit orbit--large"></span>
        <span class="orbit orbit--small"></span>
        <span class="scene-star scene-star--one">✦</span>
        <span class="scene-star scene-star--two">✦</span>
        <span class="scene-dot scene-dot--pink"></span>
        <span class="scene-dot scene-dot--mint"></span>
        <span class="scene-dot scene-dot--yellow"></span>
        <div class="idea-note">
          <span>CLASS</span>
          <strong>学习反馈</strong>
        </div>
        <span class="make-label">ADAPT</span>
      </div>
    </section>

    <section id="lesson-builder" class="active-workbench" aria-labelledby="lesson-builder-title">

      <LessonPlanningWorkspace
        :lesson-form="lessonForm"
        :lesson-result="lessonResult"
        :lesson-loading="lessonLoading"
      >
          <section class="workspace-card input-panel lesson-creation-sheet">
            <div class="panel-heading panel-heading--stack">
              <div class="panel-heading__main">
                <div>
                  <span class="section-kicker">课程创作</span>
                  <h2 id="lesson-builder-title">这节课想解决什么？</h2>
                  <p class="panel-intro">先写下一个教学灵感，学习雷达会帮助你把它变成更贴近班级的课堂。</p>
                </div>
              </div>
              <el-tooltip content="重新开始" placement="bottom">
                <el-button circle aria-label="清空备课内容" :disabled="lessonLoading" @click="clearLessonForm">
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
              <section class="form-block form-span-full theme-prompt">
                <div class="form-block__grid">
                  <el-form-item label="你想探索什么主题？" prop="topic" class="form-span-full">
                    <el-input
                      v-model="lessonForm.topic"
                      type="textarea"
                      :rows="3"
                      maxlength="200"
                      placeholder="输入一个课程主题、概念或真实教学问题"
                    />
                  </el-form-item>
                </div>
              </section>

              <section class="form-block form-span-full goal-prompt">
                <div class="form-block__grid">
                  <el-form-item label="希望学生学会什么？" prop="objectives" class="form-span-full">
                    <el-input
                      v-model="lessonForm.objectives"
                      type="textarea"
                      :rows="4"
                      maxlength="2000"
                      show-word-limit
                      placeholder="输入教学目标、重点或课堂组织要求"
                    />
                  </el-form-item>
                </div>
              </section>

              <section class="form-block form-span-full course-requirements-block">
                <div class="form-block__grid">
                  <el-form-item label="还有哪些课程期待？" prop="requirements" class="form-span-full">
                    <el-input
                      v-model="lessonForm.requirements"
                      type="textarea"
                      :rows="3"
                      maxlength="2000"
                      show-word-limit
                      placeholder="补充课堂活动、案例素材或练习设计要求"
                    />
                  </el-form-item>
                </div>
              </section>

              <section class="class-learning-radar form-span-full" aria-labelledby="class-learning-radar-title">
                <div class="class-learning-radar__head">
                  <div class="class-learning-radar__mark" aria-hidden="true">🧠</div>
                  <div>
                    <span class="section-kicker">学习反馈</span>
                    <h3 id="class-learning-radar-title">班级学习雷达</h3>
                    <p>根据最近学习反馈，寻找这节课最值得关注的教学切入点。</p>
                  </div>
                  <span v-if="learningInsightReady" class="class-learning-radar__status">洞察已更新</span>
                </div>

                <div v-if="learningInsightReady" class="class-learning-radar__content">
                  <div>
                    <span>薄弱知识点</span>
                    <ul>
                      <li v-for="(item, index) in learningInsight.weakPoints" :key="`radar-weak-${index}`">{{ item }}</li>
                      <li v-if="!learningInsight.weakPoints.length">本次反馈未标出明显薄弱点</li>
                    </ul>
                  </div>
                  <div>
                    <span>常见错误</span>
                    <ul>
                      <li v-for="(item, index) in learningInsight.errorPatterns" :key="`radar-error-${index}`">{{ item }}</li>
                      <li v-if="!learningInsight.errorPatterns.length">本次反馈未发现集中错误模式</li>
                    </ul>
                  </div>
                  <div>
                    <span>本节课将调整</span>
                    <ul class="radar-suggestion-list">
                      <li
                        v-for="(item, index) in learningInsight.teachingSuggestions"
                        :key="`radar-suggestion-${index}`"
                      >
                        {{ item }}
                      </li>
                    </ul>
                  </div>
                </div>
                <div v-else class="class-learning-radar__invitation">
                  <strong>当前主题暂无可用的近期学习反馈。</strong>
                  <p>完成与当前主题相关的智能批改后，这里会呈现薄弱点、错误模式和下一步教学建议。</p>
                </div>
              </section>

              <details class="lesson-advanced-disclosure form-span-full">
                <summary>
                  <span>调整探索条件</span>
                  <small>学段、课时与难度</small>
                </summary>
                <section class="form-block">
                  <div class="form-block__grid">
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
                    <el-form-item label="难度" prop="difficulty" class="form-span-full">
                      <el-segmented
                        v-model="lessonForm.difficulty"
                        :options="['基础', '进阶', '高阶']"
                        class="difficulty-control"
                      />
                    </el-form-item>
                  </div>
                </section>
              </details>

              <div class="form-actions form-span-full">
                <el-button :disabled="lessonLoading" @click="clearLessonForm">
                  <el-icon><RefreshLeft /></el-icon>
                  清空
                </el-button>
                <el-button type="primary" :loading="lessonLoading" :disabled="lessonLoading" @click="submitLessonPlan">
                  <el-icon><MagicStick /></el-icon>
                  生成课堂方案
                </el-button>
              </div>
            </el-form>
          </section>
          <section v-if="lessonLoading || lessonResultReady" class="workspace-card result-panel" aria-live="polite">
            <div class="panel-heading result-heading">
              <div class="panel-heading__main">
                <div>
                  <span class="section-kicker">{{ lessonLoading ? '灵感编排中' : '探索已展开' }}</span>
                  <h2>{{ lessonLoading ? '课堂方案正在生长' : '课堂探索地图' }}</h2>
                </div>
              </div>
              <div class="generation-status" :class="{ 'is-loading': lessonLoading, 'is-ready': lessonResultReady }">
                <span class="status-dot"></span>
                {{ lessonStatusText }}
              </div>
              <el-button
                v-if="lessonResultReady"
                :icon="CopyDocument"
                :disabled="lessonLoading"
                @click="copyResult(lessonResult, '课堂方案已复制')"
              >
                复制课堂方案
              </el-button>
            </div>

            <div v-if="lessonLoading && !lessonResultReady" class="result-state result-state--loading">
              <div class="lesson-building-visual" aria-hidden="true">
                <span class="lesson-building-orbit"></span>
                <div class="lesson-building-notes">
                  <i>目标</i>
                  <i>活动</i>
                  <i>练习</i>
                </div>
              </div>
              <h3>AI 正在生成课堂方案…</h3>
              <p>正在组织教学目标、活动与练习，请稍候。</p>
              <p v-if="lessonSlowNotice">模型正在深入分析，本次生成可能需要十几秒。</p>
              <div class="loading-progress-bar" aria-hidden="true">
                <span></span>
              </div>
            </div>

            <div v-else class="structured-result lesson-result">
              <section class="result-hero-card lesson-result-hero">
                <div class="result-hero-card__header">
                  <div class="result-hero-card__copy">
                    <h2>{{ lessonDisplayResult?.title || lessonForm.topic }}</h2>
                  </div>
                </div>
              </section>

              <section class="personalized-course-map" aria-labelledby="personalized-course-map-title">
                <div class="personalized-course-map__head">
                  <div>
                    <span class="section-kicker">从学生出发</span>
                    <h3 id="personalized-course-map-title">课堂探索地图</h3>
                  </div>
                  <p>沿着学生现状、目标突破和课堂反馈展开，呈现这节课为什么这样设计。</p>
                </div>

                <article class="exploration-map-node exploration-map-node--student">
                  <div>
                    <h4>学生现状</h4>
                    <div v-if="learningInsightReady" class="student-situation-grid">
                      <div>
                        <span>需要关注</span>
                        <p>{{ learningInsight.weakPoints.slice(0, 2).join('、') || '本次反馈未标出明显薄弱点' }}</p>
                      </div>
                      <div>
                        <span>常见表现</span>
                        <p>{{ learningInsight.errorPatterns.slice(0, 2).join('；') || '本次反馈未发现集中错误模式' }}</p>
                      </div>
                    </div>
                    <p v-else class="map-guidance-text">当前主题暂无可用的近期学习反馈，先依据教师输入展开课堂地图。</p>
                  </div>
                </article>

                <div class="exploration-map-connector" aria-hidden="true">↓</div>

                <article class="exploration-map-node exploration-map-node--goal">
                  <div>
                    <h4>核心目标</h4>
                    <ul v-if="lessonCoreCards[0]?.items.length" class="bullet-list">
                      <li v-for="(item, index) in lessonCoreCards[0].items" :key="`map-goal-${index}`">{{ item }}</li>
                    </ul>
                    <p v-else class="map-guidance-text">围绕教师提出的教学目标确定本节课核心方向。</p>
                  </div>
                </article>

                <div class="exploration-map-connector" aria-hidden="true">↓</div>

                <article class="exploration-map-node exploration-map-node--activity">
                  <div>
                    <h4>探索活动</h4>
                    <div v-if="lessonTeachingSteps.length" class="class-activity-route">
                      <div v-for="(step, index) in lessonTeachingSteps.slice(0, 3)" :key="`map-activity-${index}`">
                        <strong>{{ step.stage }}</strong>
                        <p>{{ step.studentActivity || step.teacherActivity }}</p>
                      </div>
                    </div>
                    <p v-else class="map-guidance-text">课堂活动会围绕目标突破和学生参与逐步展开。</p>
                  </div>
                </article>

                <div class="exploration-map-connector" aria-hidden="true">↓</div>

                <article class="exploration-map-node exploration-map-node--feedback">
                  <div>
                    <h4>练习与反馈</h4>
                    <div class="lesson-map-summary-grid">
                      <div>
                        <span>教学大纲</span>
                        <ul v-if="lessonCoreCards[1]?.items.length">
                          <li v-for="(item, index) in lessonCoreCards[1].items.slice(0, 3)" :key="`map-outline-${index}`">{{ item }}</li>
                        </ul>
                        <p v-else>从关键概念和已有经验进入主题。</p>
                      </div>
                      <div>
                        <span>教学流程</span>
                        <ul v-if="lessonCoreCards[2]?.items.length">
                          <li v-for="(item, index) in lessonCoreCards[2].items.slice(0, 3)" :key="`map-flow-${index}`">{{ item }}</li>
                        </ul>
                        <p v-else>围绕学习难点安排解释与辨析。</p>
                      </div>
                      <div>
                        <span>课堂练习</span>
                        <ul v-if="lessonExercises.length">
                          <li v-for="(item, index) in lessonExercises.slice(0, 2)" :key="`map-exercise-${index}`">{{ item.question }}</li>
                        </ul>
                        <p v-else>通过任务和练习完成知识迁移。</p>
                      </div>
                    </div>
                  </div>
                </article>
              </section>

              <section class="design-reasoning-surface" aria-labelledby="design-reasoning-title">
                <div class="design-reasoning-surface__head">
                  <div>
                    <span class="section-kicker">AI教学调整</span>
                    <h3 id="design-reasoning-title">为什么这样设计？</h3>
                  </div>
                  <span v-if="learningInsightReady" class="design-reasoning-surface__status">依据近期学习反馈</span>
                </div>

                <div v-if="learningInsightReady" class="design-reasoning-grid">
                  <div>
                    <span>发现</span>
                    <ul>
                      <li v-for="(item, index) in learningInsight.weakPoints" :key="`reason-weak-${index}`">{{ item }}</li>
                      <li v-for="(item, index) in learningInsight.errorPatterns.slice(0, 2)" :key="`reason-error-${index}`">{{ item }}</li>
                    </ul>
                  </div>
                  <div>
                    <span>因此本节课</span>
                    <ul class="design-reasoning-checks">
                      <li
                        v-for="(item, index) in learningInsight.teachingSuggestions"
                        :key="`reason-suggestion-${index}`"
                      >
                        {{ item }}
                      </li>
                    </ul>
                  </div>
                </div>
                <div v-else class="design-reasoning-surface__invitation">
                  <strong>当前主题暂无可用的近期学习反馈。</strong>
                  <p>本次方案仅依据教师输入生成；相关批改完成后，AI会说明如何调整案例、练习和任务难度。</p>
                </div>
              </section>

              <details class="lesson-detail-disclosure">
                <summary>
                  <span>查看完整教案</span>
                  <small>教学准备、活动、练习与评价标准</small>
                </summary>
              <section class="result-surface">
                <div class="surface-head">
                  <div>
                    <h3>补充模块</h3>
                    <p>补足教学准备与教学提醒，形成完整教案闭环。</p>
                  </div>
                </div>
                <div class="lesson-module-grid lesson-module-grid--secondary">
                  <article
                    v-for="(card, index) in lessonSupplementCards"
                    :key="card.key"
                    class="lesson-module-card"
                  >
                    <div class="lesson-module-card__head">
                      <span class="lesson-module-card__index lesson-module-card__index--soft">
                        {{ String(lessonCoreCards.length + index + 1).padStart(2, '0') }}
                      </span>
                      <div>
                        <h3>{{ card.title }}</h3>
                        <p>{{ card.description }}</p>
                      </div>
                    </div>
                    <ul v-if="card.items.length" class="bullet-list">
                      <li v-for="(item, itemIndex) in card.items" :key="`${card.key}-${itemIndex}`">{{ item }}</li>
                    </ul>
                    <p v-else class="card-empty-text">这一部分等待更多课堂灵感。</p>
                  </article>
                </div>
              </section>

              <section class="result-surface timeline-surface">
                <div class="surface-head">
                  <div>
                    <h3>教学时间轴</h3>
                    <p>按课堂推进顺序组织阶段、时间、活动与教学目的。</p>
                  </div>
                </div>
                <div v-if="lessonTeachingSteps.length" class="timeline-list">
                  <article
                    v-for="(step, index) in lessonTeachingSteps"
                    :key="`${step.stage}-${index}`"
                    class="timeline-item"
                  >
                    <div class="timeline-marker">
                      <span class="timeline-marker__index">{{ String(index + 1).padStart(2, '0') }}</span>
                      <span
                        v-if="index !== lessonTeachingSteps.length - 1"
                        class="timeline-marker__line"
                        aria-hidden="true"
                      ></span>
                    </div>
                    <div class="timeline-card">
                      <div class="timeline-card__top">
                        <div>
                          <span class="timeline-card__eyebrow">阶段 {{ index + 1 }}</span>
                          <h3>{{ step.stage }}</h3>
                        </div>
                        <span class="timeline-time-pill">{{ formatScore(step.durationMinutes) }} 分钟</span>
                      </div>
                      <div class="timeline-card__grid">
                        <article class="timeline-card__panel">
                          <span>教师活动</span>
                          <p>{{ step.teacherActivity }}</p>
                        </article>
                        <article class="timeline-card__panel">
                          <span>学生活动</span>
                          <p>{{ step.studentActivity }}</p>
                        </article>
                        <article class="timeline-card__panel timeline-card__panel--wide">
                          <span>教学目的</span>
                          <p>{{ step.purpose }}</p>
                        </article>
                      </div>
                    </div>
                  </article>
                </div>
                <p v-else class="card-empty-text">课堂路径还可以继续展开。</p>
              </section>

              <section class="result-surface">
                <div class="surface-head">
                  <div>
                    <h3>课堂练习</h3>
                  </div>
                </div>
                <div v-if="lessonExercises.length" class="exercise-card-grid">
                  <article
                    v-for="(exercise, index) in lessonExercises"
                    :key="`${exercise.question}-${index}`"
                    class="exercise-card exercise-card--question"
                  >
                    <div class="exercise-card__head">
                      <div class="exercise-card__title">
                        <span class="exercise-card__index">题目 {{ index + 1 }}</span>
                        <p class="exercise-card__question">{{ exercise.question }}</p>
                      </div>
                      <div class="inline-tags exercise-card__tags">
                        <el-tag v-if="exercise.type" size="small" effect="plain">{{ exercise.type }}</el-tag>
                        <el-tag v-if="exercise.difficulty" size="small" type="warning" effect="plain">
                          {{ exercise.difficulty }}
                        </el-tag>
                      </div>
                    </div>
                    <div class="answer-block answer-block--product">
                      <span>参考答案</span>
                      <p>{{ exercise.referenceAnswer }}</p>
                    </div>
                  </article>
                </div>
                <p v-else class="card-empty-text">练习设计可在后续探索中继续补充。</p>
              </section>

              <section class="result-surface">
                <div class="surface-head">
                  <div>
                    <h3>Rubric 评分维度</h3>
                    <p>将评分标准整理成维度卡片，便于课堂展示与复核。</p>
                  </div>
                </div>
                <div v-if="lessonRubric.length" class="rubric-card-grid rubric-card-grid--product">
                  <article
                    v-for="(item, index) in lessonRubric"
                    :key="`${item.criterion}-${index}`"
                    class="rubric-card rubric-card--product"
                  >
                    <div class="rubric-card__head">
                      <div>
                        <span class="rubric-card__index">{{ String(index + 1).padStart(2, '0') }}</span>
                        <strong>{{ item.criterion }}</strong>
                      </div>
                      <span>{{ formatScore(item.maxScore) }} 分</span>
                    </div>
                    <p>{{ item.description }}</p>
                  </article>
                </div>
                <p v-else class="card-empty-text">评价维度可结合课堂目标继续完善。</p>
              </section>
              </details>
            </div>

          </section>
          <section v-else class="lesson-creation-invitation" aria-labelledby="lesson-invitation-title">
            <div class="lesson-creation-invitation__spark" aria-hidden="true">✦</div>
            <div>
              <span class="section-kicker">下一段课堂旅程</span>
              <h2 id="lesson-invitation-title">带着一个教学想法出发</h2>
              <p>写下主题和期待，课堂目标、教学路径与练习设计会从这里逐步展开。</p>
            </div>
            <div class="lesson-creation-route" aria-hidden="true">
              <span>教学想法</span><i>→</i><span>课堂路径</span><i>→</i><span>探索地图</span>
            </div>
          </section>
      </LessonPlanningWorkspace>
    </section>
  </main>
</template>

<style scoped src="./TeacherAiAssistant.css"></style>

<style scoped>
.ai-assistant-page {
  min-height: 100%;
  background: #f7f9fb;
}

.active-workbench {
  width: min(1120px, calc(100% - 40px));
  margin: 0 auto;
  padding: 28px 0 48px;
}

.active-workbench__header {
  margin-bottom: 20px;
}

.active-workbench__header h1 {
  margin: 0;
  color: #25384d;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0;
}

:deep(.teacher-ai-lesson-planning-workspace) {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.workspace-card {
  padding: 22px !important;
  border: 1px solid #e1e7ee !important;
  border-radius: 10px !important;
  background: #fff !important;
  box-shadow: none !important;
}

.panel-heading {
  margin-bottom: 18px;
}

.panel-heading h2 {
  color: #31445a;
  font-size: 17px;
}

.form-block {
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.form-block + .form-block {
  padding-top: 18px !important;
  border-top: 1px solid #edf1f5 !important;
}

.form-block__header {
  display: none;
}

.lesson-result > .result-surface {
  padding: 20px 0 !important;
  border: 0 !important;
  border-top: 1px solid #edf1f5 !important;
  border-radius: 0 !important;
  background: transparent !important;
}

.lesson-result-hero {
  padding: 0 0 18px !important;
  border: 0 !important;
  background: transparent !important;
}

.lesson-outline-summary__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.lesson-outline-summary__grid article {
  min-width: 0;
  padding-left: 14px;
  border-left: 3px solid #b9cee3;
}

.lesson-outline-summary__grid strong {
  color: #31445a;
  font-size: 13px;
}

.lesson-outline-summary__grid p {
  color: #7b8999;
  font-size: 13px;
}

.lesson-advanced-disclosure,
.lesson-detail-disclosure {
  overflow: hidden;
  border: 1px solid #e1e7ee;
  border-radius: 8px;
  background: #ffffff;
}

.lesson-advanced-disclosure > summary,
.lesson-detail-disclosure > summary {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 13px 15px;
  color: #40546b;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  list-style: none;
}

.lesson-advanced-disclosure > summary::-webkit-details-marker,
.lesson-detail-disclosure > summary::-webkit-details-marker {
  display: none;
}

.lesson-advanced-disclosure > summary::after,
.lesson-detail-disclosure > summary::after {
  color: #7d8b9c;
  content: '展开';
  font-size: 11px;
  font-weight: 500;
}

.lesson-advanced-disclosure[open] > summary::after,
.lesson-detail-disclosure[open] > summary::after {
  content: '收起';
}

.lesson-advanced-disclosure > summary small,
.lesson-detail-disclosure > summary small {
  margin-left: auto;
  color: #8793a2;
  font-size: 11px;
  font-weight: 400;
}

.lesson-advanced-disclosure[open] > summary,
.lesson-detail-disclosure[open] > summary {
  border-bottom: 1px solid #e7ebf0;
}

.lesson-advanced-disclosure .form-block,
.lesson-detail-disclosure .result-surface {
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}

.lesson-flow-summary__list {
  display: grid;
  gap: 0;
  border: 1px solid #e4e9ef;
  border-radius: 7px;
}

.lesson-flow-summary__list article {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 11px 13px;
}

.lesson-flow-summary__list article + article {
  border-top: 1px solid #e8edf2;
}

.lesson-flow-summary__list span,
.lesson-flow-summary__list small {
  color: #758398;
  font-size: 11px;
}

.lesson-flow-summary__list strong {
  color: #2d4057;
  font-size: 13px;
}

.lesson-detail-disclosure .timeline-surface {
  display: block !important;
}

.lesson-result > .result-surface,
.lesson-result > .lesson-detail-disclosure,
.lesson-result-hero {
  box-shadow: none !important;
}

.exercise-card .answer-block {
  display: none;
}

@media (max-width: 520px) {
  .active-workbench {
    width: min(100% - 24px, 1120px);
    padding-top: 20px;
  }

  .workspace-card {
    padding: 16px !important;
  }

  .lesson-outline-summary__grid {
    grid-template-columns: 1fr;
  }

  .lesson-advanced-disclosure > summary,
  .lesson-detail-disclosure > summary {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .lesson-advanced-disclosure > summary small,
  .lesson-detail-disclosure > summary small {
    width: 100%;
    margin-left: 0;
  }
}

/* AI exploration lab theme */
.ai-assistant-page {
  min-height: 100%;
  background-color: #fbfbff;
  background-image:
    linear-gradient(rgba(129, 120, 207, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(129, 120, 207, 0.055) 1px, transparent 1px);
  background-size: 32px 32px;
  color: #3d3564;
}

.explore-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 0.8fr);
  gap: 48px;
  align-items: center;
  width: min(1600px, calc(100% - 48px));
  min-height: 330px;
  margin: 0 auto;
  padding: 54px clamp(28px, 5vw, 76px);
  overflow: hidden;
  border-bottom: 1px dashed rgba(61, 53, 100, 0.24);
  background: rgba(251, 251, 255, 0.84);
}

.explore-hero__content {
  position: relative;
  z-index: 2;
}

.explore-kicker,
.section-kicker {
  color: #8178cf;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.explore-hero h1 {
  margin: 12px 0 10px;
  color: #3d3564;
  font-size: clamp(34px, 4vw, 58px);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1.08;
}

.explore-hero p {
  margin: 0 0 28px;
  color: #645b84;
  font-size: clamp(16px, 1.5vw, 21px);
}

.exploration-route {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: -8px 0 24px;
  color: #645b84;
  font-size: 12px;
  font-weight: 700;
}

.exploration-route span {
  padding: 6px 9px;
  border: 1px solid rgba(61, 53, 100, 0.18);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.72);
}

.exploration-route i {
  color: #ee91bb;
  font-style: normal;
}

.handmade-action {
  display: inline-flex;
  gap: 9px;
  align-items: center;
  min-height: 44px;
  padding: 0 20px;
  border: 1px solid #3d3564;
  border-radius: 7px;
  background: #8178cf;
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.22);
  color: #fff;
  font-size: 14px;
  font-weight: 750;
  text-decoration: none;
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.handmade-action:hover {
  box-shadow: 2px 3px 0 rgba(61, 53, 100, 0.22);
  transform: translate(2px, 2px);
}

.orbit-scene {
  position: relative;
  min-height: 230px;
}

.orbit {
  position: absolute;
  border: 1px dashed rgba(61, 53, 100, 0.35);
  border-radius: 50%;
  transform: rotate(-12deg);
}

.orbit--large {
  inset: 10px 8% 8px 4%;
}

.orbit--small {
  inset: 44px 21% 38px 20%;
  transform: rotate(18deg);
}

.idea-note {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  gap: 7px;
  width: 152px;
  padding: 22px;
  border: 1px solid rgba(61, 53, 100, 0.4);
  border-radius: 8px;
  background: #fff1a8;
  box-shadow: 6px 7px 0 rgba(61, 53, 100, 0.14);
  color: #3d3564;
  transform: translate(-50%, -50%) rotate(-3deg);
}

.idea-note span,
.make-label {
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.12em;
}

.idea-note strong {
  font-size: 18px;
}

.make-label {
  position: absolute;
  right: 12%;
  bottom: 24px;
  padding: 7px 10px;
  border: 1px solid #3d3564;
  border-radius: 5px;
  background: #9de4eb;
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.14);
  transform: rotate(5deg);
}

.scene-star,
.scene-dot {
  position: absolute;
}

.scene-star {
  color: #ee91bb;
  font-size: 25px;
}

.scene-star--one { top: 15px; right: 20%; }
.scene-star--two { bottom: 14px; left: 10%; color: #8178cf; }

.scene-dot {
  width: 13px;
  height: 13px;
  border: 1px solid rgba(61, 53, 100, 0.35);
  border-radius: 50%;
}

.scene-dot--pink { top: 35%; left: 4%; background: #ee91bb; }
.scene-dot--mint { top: 8%; left: 42%; background: #9de4eb; }
.scene-dot--yellow { right: 5%; bottom: 42%; background: #fff1a8; }

.active-workbench {
  width: min(1600px, calc(100% - 48px));
  padding: 44px clamp(0px, 2vw, 24px) 72px;
}

:deep(.teacher-ai-lesson-planning-workspace) {
  gap: 36px;
}

.workspace-card {
  padding: clamp(22px, 3vw, 38px) !important;
  border: 1px solid rgba(61, 53, 100, 0.25) !important;
  border-radius: 9px !important;
  background: rgba(255, 255, 255, 0.9) !important;
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.14) !important;
}

.input-panel {
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.panel-heading h2,
.result-hero-card__copy h2,
.surface-head h3 {
  color: #3d3564 !important;
}

.panel-heading h2 {
  margin-top: 5px;
  font-size: 24px !important;
}

.panel-heading--stack {
  padding: 0 2px;
}

.panel-intro {
  max-width: 620px;
  margin: 7px 0 0;
  color: #70688b;
  font-size: 13px;
  line-height: 1.7;
}

.lesson-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.lesson-form > .theme-prompt,
.lesson-form > .lesson-advanced-disclosure,
.lesson-form > .form-actions {
  grid-column: 1 / -1 !important;
}

.lesson-form > .theme-prompt {
  padding: clamp(18px, 2.4vw, 28px) !important;
  border: 1px solid rgba(61, 53, 100, 0.26) !important;
  border-left: 5px solid #8178cf !important;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94) !important;
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.12) !important;
}

.theme-prompt :deep(.el-textarea__inner) {
  min-height: 126px !important;
  padding: 18px;
  font-size: 16px;
  line-height: 1.7;
}

.lesson-form > .goal-prompt,
.lesson-form > .course-requirements-block {
  grid-column: auto !important;
  padding: 16px !important;
  border: 1px solid rgba(61, 53, 100, 0.18) !important;
  border-radius: 7px;
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.08) !important;
}

.lesson-form > .goal-prompt {
  background: rgba(157, 228, 235, 0.13) !important;
}

.lesson-form > .course-requirements-block {
  background: rgba(255, 241, 168, 0.18) !important;
}

.class-learning-radar {
  position: relative;
  display: grid;
  gap: 16px;
  overflow: hidden;
  padding: 19px 21px;
  border: 1px solid rgba(61, 53, 100, 0.24);
  border-radius: 8px;
  background: rgba(157, 228, 235, 0.22);
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.09);
}

.class-learning-radar::after {
  position: absolute;
  top: -24px;
  right: -18px;
  width: 78px;
  height: 78px;
  border: 1px dashed rgba(61, 53, 100, 0.16);
  border-radius: 50%;
  content: '';
}

.class-learning-radar__head {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
}

.class-learning-radar__mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(61, 53, 100, 0.28);
  border-radius: 7px;
  background: #9de4eb;
  box-shadow: 2px 3px 0 rgba(61, 53, 100, 0.12);
  color: #3d3564;
  font-size: 18px;
}

.class-learning-radar__head h3 {
  margin: 3px 0 2px;
  color: #3d3564;
  font-size: 17px;
}

.class-learning-radar__head p,
.class-learning-radar__invitation p {
  margin: 0;
  color: #70688b;
  font-size: 12px;
  line-height: 1.65;
}

.class-learning-radar__status,
.design-reasoning-surface__status {
  position: relative;
  z-index: 1;
  padding: 6px 9px;
  border: 1px solid rgba(61, 53, 100, 0.2);
  border-radius: 5px;
  background: #fff1a8;
  color: #554d73;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
}

.class-learning-radar__content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border-top: 1px dashed rgba(61, 53, 100, 0.2);
}

.class-learning-radar__content > div {
  min-width: 0;
  padding: 15px 18px 0;
  border-left: 1px dashed rgba(61, 53, 100, 0.18);
}

.class-learning-radar__content > div:first-child {
  padding-left: 0;
  border-left: 0;
}

.class-learning-radar__content > div:last-child {
  padding-right: 0;
}

.class-learning-radar__content span,
.design-reasoning-grid > div > span {
  color: #8178cf;
  font-size: 11px;
  font-weight: 800;
}

.class-learning-radar__content ul,
.design-reasoning-grid ul {
  display: grid;
  gap: 6px;
  margin: 8px 0 0;
  padding-left: 17px;
}

.class-learning-radar__content li,
.design-reasoning-grid li {
  color: #554d73;
  font-size: 12px;
  line-height: 1.55;
}

.radar-suggestion-list,
.design-reasoning-checks {
  list-style: none;
  padding-left: 0 !important;
}

.radar-suggestion-list li::before,
.design-reasoning-checks li::before {
  margin-right: 7px;
  color: #8178cf;
  content: '\2713';
  font-weight: 800;
}

.class-learning-radar__invitation {
  position: relative;
  z-index: 1;
  padding: 13px 15px;
  border-top: 1px dashed rgba(61, 53, 100, 0.2);
  background: rgba(255, 255, 255, 0.48);
}

.class-learning-radar__invitation strong {
  display: block;
  margin-bottom: 4px;
  color: #3d3564;
  font-size: 13px;
}

.lesson-form :deep(.el-form-item__label) {
  color: #4f4773;
  font-weight: 750;
}

.lesson-form :deep(.el-textarea__inner),
.lesson-form :deep(.el-input__wrapper),
.lesson-form :deep(.el-select__wrapper) {
  border: 1px solid rgba(61, 53, 100, 0.22);
  border-radius: 7px;
  background: #fff;
  box-shadow: none;
}

.lesson-form :deep(.el-textarea__inner:focus),
.lesson-form :deep(.el-input__wrapper.is-focus),
.lesson-form :deep(.el-select__wrapper.is-focused) {
  border-color: #8178cf;
  box-shadow: 0 0 0 3px rgba(129, 120, 207, 0.13);
}

.form-actions :deep(.el-button--primary) {
  border-color: #3d3564;
  background: #8178cf;
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.2);
}

.form-actions :deep(.el-button) {
  min-height: 42px;
  border-radius: 7px;
  white-space: nowrap;
}

.lesson-advanced-disclosure,
.lesson-detail-disclosure {
  border-color: rgba(61, 53, 100, 0.22);
  background: rgba(255, 255, 255, 0.72);
}

.personalized-course-map {
  display: grid;
  gap: 0;
  width: min(1080px, 100%);
  margin: 10px auto 28px;
}

.personalized-course-map__head {
  display: flex;
  gap: 28px;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 22px;
  padding: 0 4px 14px;
  border-bottom: 1px dashed rgba(61, 53, 100, 0.24);
}

.personalized-course-map__head h3 {
  margin: 4px 0 0;
  color: #3d3564;
  font-size: 21px;
}

.personalized-course-map__head p {
  max-width: 460px;
  margin: 0;
  color: #70688b;
  font-size: 12px;
  line-height: 1.7;
  text-align: right;
}

.exploration-map-node,
.knowledge-route {
  position: relative;
  display: grid;
  min-width: 0;
  margin: 0 auto;
  border: 1px solid rgba(61, 53, 100, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.11);
}

.exploration-map-node {
  grid-template-columns: auto minmax(0, 1fr);
  gap: 15px;
  width: min(820px, calc(100% - 64px));
  padding: 18px 20px;
}

.exploration-map-node--student {
  width: min(900px, calc(100% - 30px));
  border-left: 5px solid #9de4eb;
  background: rgba(238, 253, 252, 0.95);
}

.exploration-map-node--goal {
  border-left: 5px solid #8178cf;
}

.exploration-map-node--activity {
  width: min(920px, calc(100% - 22px));
  border-left: 5px solid #ee91bb;
  background: rgba(255, 247, 251, 0.96);
}

.exploration-map-node--feedback {
  width: min(780px, calc(100% - 78px));
  border-left: 5px solid #fff1a8;
  background: rgba(255, 253, 239, 0.96);
}

.exploration-map-node__index {
  display: grid;
  place-items: center;
  width: 34px;
  height: 30px;
  border: 1px solid rgba(61, 53, 100, 0.25);
  border-radius: 5px;
  background: #fff;
  color: #8178cf;
  font-size: 11px;
  font-weight: 850;
  box-shadow: 2px 2px 0 rgba(61, 53, 100, 0.09);
}

.exploration-map-node h4,
.knowledge-route h4 {
  margin: 4px 0 10px;
  color: #3d3564;
  font-size: 16px;
}

.exploration-map-node .bullet-list {
  margin-bottom: 0;
}

.exploration-map-connector {
  display: grid;
  place-items: center;
  height: 34px;
  color: #8178cf;
  font-size: 18px;
  font-weight: 850;
}

.student-situation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.student-situation-grid > div {
  padding-left: 12px;
  border-left: 3px solid rgba(129, 120, 207, 0.28);
}

.student-situation-grid span,
.class-activity-route strong,
.learning-feedback-route span {
  color: #645b84;
  font-size: 11px;
  font-weight: 800;
}

.student-situation-grid p,
.map-guidance-text,
.knowledge-route__stages p,
.class-activity-route p {
  margin: 5px 0 0;
  color: #5b5378;
  font-size: 12px;
  line-height: 1.65;
}

.knowledge-route {
  width: min(1040px, 100%);
  padding: 20px 22px 22px;
  border-style: dashed;
  background: rgba(248, 246, 255, 0.94);
}

.knowledge-route__title {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 15px;
}

.knowledge-route__title h4 {
  margin: 0;
}

.knowledge-route__stages {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
}

.knowledge-route__stages article {
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(61, 53, 100, 0.18);
  border-radius: 6px;
  background: #fff;
}

.knowledge-route__stages article:nth-of-type(1) { background: rgba(157, 228, 235, 0.18); }
.knowledge-route__stages article:nth-of-type(2) { background: rgba(255, 241, 168, 0.24); }
.knowledge-route__stages article:nth-of-type(3) { background: rgba(238, 145, 187, 0.12); }

.knowledge-route__stages article > span {
  color: #3d3564;
  font-size: 12px;
  font-weight: 800;
}

.knowledge-route__stages ul {
  display: grid;
  gap: 5px;
  margin: 8px 0 0;
  padding-left: 16px;
}

.knowledge-route__stages li {
  color: #5b5378;
  font-size: 11px;
  line-height: 1.55;
}

.knowledge-route__stages > i {
  align-self: center;
  color: #8178cf;
  font-style: normal;
  font-weight: 850;
}

.class-activity-route {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.class-activity-route > div {
  min-width: 0;
  padding: 10px 12px;
  border: 1px dashed rgba(61, 53, 100, 0.18);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.62);
}

.learning-feedback-route {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.learning-feedback-route span {
  padding: 6px 9px;
  border: 1px solid rgba(61, 53, 100, 0.18);
  border-radius: 5px;
  background: #fff;
}

.design-reasoning-surface {
  display: grid;
  gap: 17px;
  width: min(980px, 100%);
  margin: 0 auto 28px;
  padding: 20px 22px;
  border: 1px solid rgba(61, 53, 100, 0.24);
  border-radius: 8px;
  background: rgba(255, 241, 168, 0.24);
  box-shadow: 4px 5px 0 rgba(61, 53, 100, 0.1);
}

.design-reasoning-surface__head {
  display: flex;
  gap: 18px;
  align-items: flex-start;
  justify-content: space-between;
}

.design-reasoning-surface__head h3 {
  margin: 4px 0 0;
  color: #3d3564;
  font-size: 18px;
}

.design-reasoning-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  padding-top: 14px;
  border-top: 1px dashed rgba(61, 53, 100, 0.2);
}

.design-reasoning-grid > div {
  min-width: 0;
  padding-left: 13px;
  border-left: 3px solid rgba(238, 145, 187, 0.46);
}

.design-reasoning-grid > div:last-child {
  border-left-color: rgba(129, 120, 207, 0.42);
}

.design-reasoning-surface__invitation {
  padding-top: 13px;
  border-top: 1px dashed rgba(61, 53, 100, 0.2);
}

.design-reasoning-surface__invitation strong {
  display: block;
  margin-bottom: 4px;
  color: #3d3564;
  font-size: 13px;
}

.design-reasoning-surface__invitation p {
  margin: 0;
  color: #70688b;
  font-size: 12px;
  line-height: 1.65;
}

.lesson-outline-summary__grid {
  grid-template-columns: 1fr;
}

.lesson-outline-summary__grid article {
  padding-left: 0;
  border-left: 0;
}

.lesson-flow-summary__list {
  gap: 8px;
}

.lesson-flow-summary__list article {
  padding: 8px 0;
}

.result-panel {
  padding-right: 0 !important;
  padding-left: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.lesson-creation-invitation {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 20px;
  align-items: center;
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 24px 4px;
  border-top: 1px dashed rgba(61, 53, 100, 0.24);
  border-bottom: 1px dashed rgba(61, 53, 100, 0.24);
}

.lesson-creation-invitation__spark {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid rgba(61, 53, 100, 0.24);
  border-radius: 50%;
  background: #fff1a8;
  box-shadow: 3px 4px 0 rgba(61, 53, 100, 0.1);
  color: #8178cf;
  font-size: 22px;
}

.lesson-creation-invitation h2 {
  margin: 5px 0 5px;
  color: #3d3564;
  font-size: 20px;
}

.lesson-creation-invitation p {
  max-width: 660px;
  margin: 0;
  color: #70688b;
  font-size: 13px;
  line-height: 1.7;
}

.lesson-creation-route {
  display: flex;
  gap: 7px;
  align-items: center;
  color: #8178cf;
  font-size: 11px;
  font-weight: 750;
  white-space: nowrap;
}

.lesson-creation-route span {
  padding: 6px 8px;
  border: 1px solid rgba(61, 53, 100, 0.16);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.64);
}

.lesson-creation-route i {
  color: #ee91bb;
  font-style: normal;
}

.result-state--loading {
  min-height: 250px;
  border: 1px dashed rgba(61, 53, 100, 0.24) !important;
  border-radius: 8px;
  background: rgba(157, 228, 235, 0.1) !important;
  box-shadow: none !important;
}

.result-state--loading .lesson-building-visual {
  grid-row: span 2;
  margin: 0;
  transform: scale(0.72);
  transform-origin: left center;
}

.result-state--loading h3 {
  margin: 0;
  color: var(--ai-ink);
  font-size: 14px;
}

.result-state--loading p {
  margin: 0;
  color: #70688b;
  font-size: 12px;
}

.result-state--loading .loading-progress-bar {
  grid-column: 2;
  margin-top: 3px;
}

.lesson-result-hero {
  margin-bottom: 20px;
  padding: 18px 20px !important;
  border: 1px solid var(--ai-border) !important;
  border-radius: 7px !important;
  background: rgba(255, 255, 255, 0.7) !important;
  box-shadow: var(--ai-shadow) !important;
}

.lesson-result-hero h2 {
  margin: 0;
  color: var(--ai-ink);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 24px;
}

.personalized-course-map {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0 18px;
  margin-top: 0;
}

.personalized-course-map__head,
.design-reasoning-surface {
  grid-column: 1 / -1;
}

.personalized-course-map__head { margin-bottom: 15px; }

.exploration-map-node {
  grid-template-columns: minmax(0, 1fr);
  width: auto !important;
  margin: 0 !important;
  align-self: start;
}

.exploration-map-node--student { grid-column: 1 / span 7; }
.exploration-map-node--goal { grid-column: 6 / -1; }
.exploration-map-node--activity { grid-column: 1 / span 8; }
.exploration-map-node--feedback { grid-column: 5 / -1; }

.personalized-course-map > .exploration-map-connector {
  grid-column: 1 / -1;
  height: 25px;
}

.lesson-map-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.lesson-map-summary-grid > div {
  min-width: 0;
  padding: 10px;
  border: 1px dashed rgb(61 53 100 / 20%);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.6);
}

.lesson-map-summary-grid span {
  color: #645b84;
  font-size: 11px;
  font-weight: 800;
}

.lesson-map-summary-grid ul {
  display: grid;
  gap: 5px;
  margin: 7px 0 0;
  padding-left: 15px;
}

.lesson-map-summary-grid li,
.lesson-map-summary-grid p {
  color: #5b5378;
  font-size: 11px;
  line-height: 1.55;
}

.lesson-map-summary-grid p { margin: 7px 0 0; }
.design-reasoning-surface { margin-top: 21px; }

@media (max-width: 900px) {
  .explore-hero { grid-template-columns: 1fr; }

  .explore-hero__content {
    position: relative;
    z-index: 2;
    max-width: 72%;
  }

  .orbit-scene {
    position: absolute;
    right: 8px;
    bottom: -28px;
    width: 320px;
    min-height: 220px;
    opacity: 0.76;
  }

  .lesson-form { grid-template-columns: 1fr 1fr; }

  .lesson-form > .theme-prompt,
  .lesson-form > .goal-prompt,
  .lesson-form > .course-requirements-block {
    grid-column: 1 / -1 !important;
  }

  .exploration-map-node--student,
  .exploration-map-node--goal,
  .exploration-map-node--activity,
  .exploration-map-node--feedback {
    grid-column: 1 / -1;
  }
}

@media (max-width: 600px) {
  .ai-assistant-page { padding: 16px 14px 45px; }

  .explore-hero {
    min-height: 0;
    padding: 29px 23px 145px;
  }

  .explore-hero h1 { font-size: 40px; }

  .orbit-scene {
    right: -72px;
    bottom: -52px;
    width: 280px;
    min-height: 190px;
    opacity: 0.72;
    transform: scale(0.72);
    transform-origin: bottom right;
  }

  .explore-hero__content { max-width: 100%; }
  .explore-hero p { max-width: 270px; }

  .active-workbench { padding-top: 28px; }
  .lesson-map-summary-grid { grid-template-columns: 1fr; }
  .result-state--loading { grid-template-columns: 1fr; }

  .result-state--loading .lesson-building-visual {
    grid-row: auto;
    transform-origin: center;
  }

  .result-state--loading .loading-progress-bar { grid-column: auto; }

  .form-actions { justify-content: stretch; }
  .form-actions :deep(.el-button) { flex: 1; }
}

@media (max-width: 380px) {
  .explore-hero h1 { font-size: 34px; }

  .form-actions {
    display: grid;
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}

.lesson-building-visual {
  position: relative;
  width: 112px;
  height: 88px;
  margin-bottom: 4px;
}

.lesson-building-orbit {
  position: absolute;
  inset: 5px 17px;
  border: 1px dashed rgba(129, 120, 207, 0.55);
  border-radius: 50%;
  animation: lesson-building-spin 7s linear infinite;
}

.lesson-building-orbit::after {
  position: absolute;
  top: -5px;
  left: 50%;
  width: 9px;
  height: 9px;
  border: 1px solid rgba(61, 53, 100, 0.3);
  border-radius: 50%;
  background: #ee91bb;
  content: '';
}

.lesson-building-notes {
  position: absolute;
  inset: 0;
}

.lesson-building-notes i {
  position: absolute;
  padding: 5px 7px;
  border: 1px solid rgba(61, 53, 100, 0.2);
  border-radius: 5px;
  background: #fff;
  box-shadow: 2px 3px 0 rgba(61, 53, 100, 0.08);
  color: #645b84;
  font-size: 10px;
  font-style: normal;
  font-weight: 750;
  animation: lesson-note-float 1.8s ease-in-out infinite alternate;
}

.lesson-building-notes i:nth-child(1) { top: 0; left: 0; }
.lesson-building-notes i:nth-child(2) { top: 31px; right: 0; animation-delay: 180ms; }
.lesson-building-notes i:nth-child(3) { bottom: 0; left: 23px; animation-delay: 360ms; }

.result-state--loading h3 {
  color: #3d3564;
}

.result-state--loading p {
  max-width: 560px;
  color: #70688b;
}

.result-state--loading .loading-progress-bar span {
  background: linear-gradient(90deg, #8178cf, #9de4eb, #ee91bb);
}

@keyframes lesson-building-spin {
  to { transform: rotate(360deg); }
}

@keyframes lesson-note-float {
  to { transform: translateY(-4px); }
}

.generation-status {
  color: #645b84 !important;
}

@media (max-width: 900px) {
  .explore-hero {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .orbit-scene {
    min-height: 190px;
  }

  .lesson-form {
    grid-template-columns: 1fr;
  }

  .lesson-form > .goal-prompt,
  .lesson-form > .course-requirements-block {
    grid-column: 1 / -1 !important;
  }

  .class-learning-radar__content,
  .design-reasoning-grid {
    grid-template-columns: 1fr;
  }

  .class-learning-radar__content > div,
  .class-learning-radar__content > div:first-child,
  .class-learning-radar__content > div:last-child {
    padding: 13px 0 0;
    border-top: 1px dashed rgba(61, 53, 100, 0.16);
    border-left: 0;
  }

  .class-learning-radar__content > div:first-child {
    border-top: 0;
  }

  .exploration-map-node,
  .exploration-map-node--student,
  .exploration-map-node--activity,
  .exploration-map-node--feedback {
    width: 100%;
  }

  .knowledge-route__stages {
    grid-template-columns: 1fr;
  }

  .knowledge-route__stages > i {
    transform: rotate(90deg);
    justify-self: center;
  }

  .lesson-creation-invitation {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .lesson-creation-route {
    grid-column: 2;
    flex-wrap: wrap;
    white-space: normal;
  }
}

@media (max-width: 600px) {
  .explore-hero,
  .active-workbench {
    width: min(100% - 24px, 1600px);
  }

  .explore-hero {
    padding: 34px 18px;
  }

  .workspace-card {
    padding: 18px !important;
  }

  .class-learning-radar__head {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .class-learning-radar__status {
    grid-column: 2;
  }

  .personalized-course-map__head,
  .design-reasoning-surface__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .class-learning-radar__status,
  .design-reasoning-surface__status {
    justify-self: start;
  }

  .personalized-course-map__head p {
    text-align: left;
  }

  .student-situation-grid,
  .class-activity-route {
    grid-template-columns: 1fr;
  }

  .lesson-creation-invitation {
    grid-template-columns: 1fr;
    padding: 22px 0;
    text-align: center;
  }

  .lesson-creation-invitation__spark {
    margin: 0 auto;
  }

  .lesson-creation-route {
    grid-column: auto;
    justify-content: center;
  }

  .exploration-route {
    display: grid;
    grid-template-columns: 1fr;
    width: min(280px, 100%);
  }

  .exploration-route i {
    display: none;
  }

  .exploration-route span {
    text-align: center;
  }

  .form-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-actions :deep(.el-button) {
    width: 100%;
    margin-left: 0;
  }

  .panel-heading {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .result-heading > .el-button {
    width: 100%;
  }
}

@media (max-width: 380px) {
  .form-actions {
    grid-template-columns: 1fr;
  }
}

/* Edu-F AI playground composition */
.ai-assistant-page {
  --ai-ink: #3d3564;
  --ai-purple: #8178cf;
  --ai-purple-dark: #4e4473;
  --ai-pink: #ee91bb;
  --ai-mint: #9de4eb;
  --ai-mint-dark: #52bbc4;
  --ai-yellow: #fff1a8;
  --ai-border: rgb(61 53 100 / 28%);
  --ai-shadow: 4px 5px 0 rgb(61 53 100 / 14%);
  --ai-shadow-strong: 7px 8px 0 rgb(61 53 100 / 55%);
  min-height: 100%;
  padding: clamp(18px, 4vw, 54px) clamp(18px, 5vw, 80px) 72px;
  background-color: #fbfbff;
  color: var(--ai-ink);
}

.explore-hero {
  width: min(1600px, 100%);
  min-height: 294px;
  margin: 0 auto;
  padding: clamp(28px, 4vw, 50px) clamp(26px, 5vw, 76px);
  border: 2px solid var(--ai-ink);
  border-radius: 9px;
  background: linear-gradient(118deg, #e8e4ff 0%, #f9ddec 46%, #d3f2f2 100%);
  box-shadow: var(--ai-shadow-strong);
}

.explore-hero__content { max-width: 610px; }

.explore-hero h1 {
  max-width: 610px;
  margin: 13px 0 0;
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: clamp(40px, 5vw, 60px);
  line-height: 1.05;
}

.explore-hero p {
  max-width: 490px;
  margin: 15px 0 0;
  color: #615783;
  font-size: 15px;
  line-height: 1.7;
}

.handmade-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 42px;
  margin-top: 22px;
  padding: 10px 15px;
  border: 1px solid var(--ai-purple-dark);
  border-radius: 5px;
  background: var(--ai-purple);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
  color: #fff;
  font-weight: 850;
  text-decoration: none;
  white-space: nowrap;
  word-break: keep-all;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.handmade-action:hover,
.handmade-action:focus-visible {
  background: #7067bd;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 30%);
  transform: translate(-2px, -2px);
}

.handmade-action:focus-visible {
  outline: 3px solid rgb(82 187 196 / 48%);
  outline-offset: 3px;
}

.active-workbench {
  width: min(1480px, 100%);
  margin: 0 auto;
  padding: 38px 0 12px;
}

.lesson-creation-sheet {
  padding: 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.lesson-creation-sheet .panel-heading { margin-bottom: 20px; }

.lesson-creation-sheet .panel-heading h2 {
  margin-top: 6px;
  color: var(--ai-ink) !important;
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
  font-size: 27px !important;
}

.lesson-creation-sheet .panel-intro {
  max-width: 610px;
  color: #70688b;
}

.lesson-form {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 15px 18px;
}

.lesson-form > .theme-prompt {
  grid-column: 1 / span 7 !important;
  min-height: 236px;
  padding: 22px !important;
  border: 2px solid var(--ai-ink) !important;
  border-radius: 8px;
  background: #fff !important;
  box-shadow: var(--ai-shadow-strong) !important;
}

.lesson-form > .goal-prompt,
.lesson-form > .course-requirements-block {
  grid-column: 8 / -1 !important;
  min-height: 0;
  padding: 18px !important;
  border: 1px solid var(--ai-border) !important;
  border-radius: 7px;
  box-shadow: var(--ai-shadow) !important;
}

.lesson-form > .goal-prompt { background: rgba(232, 228, 255, 0.82) !important; }
.lesson-form > .course-requirements-block { background: rgba(255, 241, 168, 0.46) !important; }

.lesson-form > .theme-prompt :deep(.el-form-item__label) {
  color: var(--ai-ink);
  font-size: 16px;
}

.lesson-form :deep(.el-form-item__label) {
  color: #554d73;
  font-weight: 800;
}

.lesson-form :deep(.el-textarea__inner),
.lesson-form :deep(.el-input__wrapper),
.lesson-form :deep(.el-select__wrapper) {
  border: 1px solid var(--ai-border);
  border-radius: 5px;
  background: #fff;
  box-shadow: none;
}

.lesson-form :deep(.el-textarea__inner:focus),
.lesson-form :deep(.el-input__wrapper.is-focus),
.lesson-form :deep(.el-select__wrapper.is-focused) {
  border-color: var(--ai-purple);
  box-shadow: 0 0 0 3px rgb(129 120 207 / 15%);
}

.class-learning-radar {
  grid-column: 1 / -1 !important;
  border: 1px solid var(--ai-border);
  border-radius: 8px;
  background: rgba(157, 228, 235, 0.32);
  box-shadow: var(--ai-shadow);
}

.lesson-advanced-disclosure {
  grid-column: 1 / -1 !important;
  border: 1px dashed var(--ai-border);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.58);
  box-shadow: none;
}

.lesson-advanced-disclosure summary,
.lesson-detail-disclosure summary,
.form-actions :deep(.el-button) {
  white-space: nowrap;
  word-break: keep-all;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  padding-top: 2px;
}

.form-actions :deep(.el-button) {
  min-height: 42px;
  border-radius: 5px;
}

.form-actions :deep(.el-button--primary) {
  border-color: var(--ai-purple-dark);
  background: var(--ai-purple);
  box-shadow: 3px 4px 0 rgb(61 53 100 / 28%);
}

.form-actions :deep(.el-button--primary:hover),
.form-actions :deep(.el-button--primary:focus-visible) {
  background: #7067bd;
  box-shadow: 5px 6px 0 rgb(61 53 100 / 30%);
  transform: translate(-2px, -2px);
}

.result-panel {
  padding: 24px 0 0 !important;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
}

.result-panel:has(.result-state--loading) .result-heading { display: none; }

.result-state--loading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 5px 16px;
  align-items: center;
  min-height: 0;
  padding: 15px 17px !important;
  border: 1px dashed var(--ai-border) !important;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.65) !important;
  box-shadow: none !important;
}
</style>
