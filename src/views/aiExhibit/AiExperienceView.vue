<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Back, Delete, Download, EditPen, Plus, Upload, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getAiProjectCase, submitAiPractice } from '@/api/aiExhibit'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const detail = ref(null)
const result = ref(null)

const classes = ref([])

const presetClassNames = {
  waste_sorting_assistant: ['可回收物', '厨余垃圾'],
  wrong_answer_helper: ['会做的题', '不会做的题'],
  emotion_diary_analysis: ['积极情绪', '需要关注'],
  plant_recognition: ['植物A', '植物B'],
  poetry_learning_assistant: ['诗句理解', '意象分析'],
}

const presetThemeText = {
  waste_sorting_assistant: '上传文本',
  wrong_answer_helper: '上传题目',
  emotion_diary_analysis: '上传日记',
  plant_recognition: '上传图片',
  poetry_learning_assistant: '上传诗句',
}

const experienceCode = computed(() => {
  return String(route.params.caseId || route.query.code || '')
})

const caseTitle = computed(() => detail.value?.projectName || 'AI体验')

function createClassItem(name) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    samples: [],
    text: '',
    fileName: '',
  }
}

function buildInitialClasses(code) {
  const presetNames = presetClassNames[code] || ['分类1', '分类2']
  return presetNames.map((name) => createClassItem(name))
}

function addClass() {
  classes.value.push(createClassItem(`分类${classes.value.length + 1}`))
}

function removeClass(index) {
  if (classes.value.length <= 1) {
    ElMessage.warning('至少保留一个分类')
    return
  }
  classes.value.splice(index, 1)
}

function addSample(index) {
  const target = classes.value[index]
  if (!target.text && !target.fileName) {
    ElMessage.warning('先输入一个样本或上传一个附件')
    return
  }
  target.samples.push(target.text || target.fileName)
  target.text = ''
  target.fileName = ''
}

function onUploadChange(file, index) {
  classes.value[index].fileName = file?.name || ''
}

function hasSamples() {
  return classes.value.some((item) => item.samples.length > 0)
}

function sampleCount() {
  return classes.value.reduce((sum, item) => sum + item.samples.length, 0)
}

async function loadCase() {
  const code = experienceCode.value
  if (!code || code.startsWith('local-')) {
    detail.value = {
      projectName: String(route.query.title || 'AI体验'),
      projectCode: code,
      caseSummary: '本地演示体验',
      practiceType: 'text',
      aiCapability: 'llm',
      taskSteps: ['准备分类', '添加样本', '开始训练'],
      submissionRequirements: '提交训练结果截图和分类说明。',
    }
    classes.value = buildInitialClasses(code)
    return
  }

  loading.value = true
  try {
    detail.value = await getAiProjectCase(Number(code))
    classes.value = buildInitialClasses(detail.value.projectCode)
  } catch (error) {
    ElMessage.error(error?.message || '体验页加载失败')
    router.replace('/main/ai-exhibit')
  } finally {
    loading.value = false
  }
}

function composeTrainingPayload() {
  return classes.value.map((item) => ({
    name: item.name,
    samples: item.samples,
  }))
}

function trainLocally() {
  result.value = {
    summary: '已完成本地训练演示。',
    details: [
      `当前分类数：${classes.value.length}`,
      `样本数：${sampleCount()}`,
      `适合年级：${detail.value?.gradeBand || '-'}`,
    ],
    warnings: hasSamples() ? [] : ['至少训练一个分类，才能查看训练结果。'],
  }
}

async function startTraining() {
  if (!hasSamples()) {
    result.value = {
      summary: '至少训练一个分类，才能查看训练结果',
      details: [],
      warnings: ['请先为任一分类添加样本。'],
    }
    return
  }

  const code = detail.value?.projectCode || experienceCode.value
  if (String(code).startsWith('local-')) {
    trainLocally()
    return
  }

  saving.value = true
  try {
    const payload = composeTrainingPayload()
    const response = await submitAiPractice(detail.value.id, {
      practiceType: detail.value.practiceType,
      inputText: JSON.stringify(payload),
      answerText: `分类数：${classes.value.length}`,
      note: `样本总数：${sampleCount()}`,
    })
    result.value = response?.aiResult || response
  } catch (error) {
    ElMessage.error(error?.message || '训练提交失败')
  } finally {
    saving.value = false
  }
}

function downloadModel() {
  ElMessage.info('当前为演示版本，模型下载功能暂未开放')
}

function goBack() {
  router.push('/main/ai-exhibit')
}

watch(
  () => route.params.caseId,
  () => {
    loadCase()
  },
)

onMounted(loadCase)
</script>

<template>
  <div class="ai-experience-page">
    <button class="back-button" type="button" @click="goBack">
      <Back :size="24" />
    </button>

    <div class="workbench">
      <section class="categories-panel">
        <div class="panel-header">
          <div>
            <h2>{{ caseTitle }}</h2>
            <p>{{ detail?.caseSummary }}</p>
          </div>
          <div class="panel-actions">
            <el-button :icon="Upload" plain>
              {{ presetThemeText[detail?.projectCode] || '上传文本' }}
            </el-button>
            <el-button type="primary" :icon="Plus" @click="addClass">添加样本</el-button>
          </div>
        </div>

        <div class="category-stack" v-loading="loading">
          <article v-for="(item, index) in classes" :key="item.id" class="category-card">
            <div class="category-head">
              <div class="category-title">
                <span class="dot"></span>
                <strong>{{ item.name }}</strong>
                <el-button text :icon="EditPen" />
              </div>
              <div class="category-tools">
                <el-upload
                  :auto-upload="false"
                  :show-file-list="false"
                  :on-change="(file) => onUploadChange(file, index)"
                >
                  <template #trigger>
                    <el-button plain :icon="Upload">上传文本</el-button>
                  </template>
                </el-upload>
                <el-button type="primary" :icon="Plus" @click="addSample(index)">添加样本</el-button>
                <el-button plain circle :icon="Delete" @click="removeClass(index)" />
              </div>
            </div>

            <textarea
              v-model="item.text"
              class="sample-input"
              rows="4"
              :placeholder="`请输入 ${item.name} 的样本内容`"
            />
            <div class="sample-list">
              <span v-for="sample in item.samples" :key="sample" class="sample-tag">{{ sample }}</span>
            </div>
          </article>

          <button class="add-class" type="button" @click="addClass">+ 添加一个分类</button>
        </div>
      </section>

      <aside class="result-panel">
        <div class="train-card">
          <button class="train-button" type="button" @click="startTraining">开始训练</button>
        </div>

        <div class="result-card">
          <template v-if="result">
            <div class="result-warning" v-if="result.warnings && result.warnings.length">
              <WarningFilled :size="22" />
              <span>{{ result.warnings[0] }}</span>
            </div>
            <p class="result-summary">{{ result.summary }}</p>
            <ul class="result-list">
              <li v-for="item in result.details || []" :key="item">{{ item }}</li>
            </ul>
            <el-button :icon="Download" class="download-button" disabled @click="downloadModel">
              下载模型
            </el-button>
          </template>

          <template v-else>
            <div class="empty-state">
              <WarningFilled :size="26" />
              <p>至少训练一个模型，才能查看训练结果</p>
              <el-button :icon="Download" disabled>下载模型</el-button>
            </div>
          </template>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.ai-experience-page {
  min-height: calc(100vh - 64px);
  padding: 24px 26px 32px;
  background: #fafafe;
}

.back-button {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  margin-bottom: 20px;
  border: 0;
  border-radius: 50%;
  background: #ede9ff;
  color: #5a4bd6;
  cursor: pointer;
}

.workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 22px;
  align-items: start;
}

.categories-panel,
.result-panel {
  min-width: 0;
}

.panel-header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.panel-header h2 {
  margin: 0;
  font-size: 18px;
}

.panel-header p {
  margin: 6px 0 0;
  color: #6b7280;
}

.panel-actions,
.category-tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-stack {
  position: relative;
  display: grid;
  gap: 18px;
  padding-bottom: 12px;
}

.category-stack::after {
  content: '';
  position: absolute;
  right: -10px;
  top: 24%;
  width: 34px;
  height: 42%;
  border-right: 2px solid #a8a1d8;
  border-top: 2px solid transparent;
  border-bottom: 2px solid transparent;
  border-radius: 24px;
  opacity: 0.45;
}

.category-card {
  position: relative;
  padding: 18px 22px 18px 18px;
  border: 1px solid #e8e5f4;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(85 78 150 / 8%);
}

.category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.category-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f37c16;
}

.sample-input {
  width: 100%;
  min-height: 116px;
  padding: 16px;
  border: 2px solid #e5e1f7;
  border-radius: 12px;
  background: #fbfaff;
  color: #111827;
  resize: vertical;
  outline: none;
}

.sample-input:focus {
  border-color: #b8acf7;
  box-shadow: 0 0 0 3px rgb(138 112 255 / 12%);
}

.hidden-input {
  display: none;
}

.sample-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  min-height: 36px;
  margin-top: 12px;
}

.sample-tag {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #f3efff;
  color: #5546c7;
  font-size: 13px;
  font-weight: 600;
}

.add-class {
  height: 60px;
  border: 0;
  border-radius: 12px;
  background: #ece7ff;
  color: #675ae0;
  font-size: 16px;
  cursor: pointer;
}

.result-panel {
  display: grid;
  gap: 20px;
  padding-top: 6px;
}

.train-card {
  display: grid;
  place-items: center;
  min-height: 160px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(85 78 150 / 8%);
}

.train-button {
  min-width: 180px;
  height: 48px;
  border: 0;
  border-radius: 10px;
  background: #ebe3ff;
  color: #5a4bd6;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
}

.result-card {
  min-height: 248px;
  padding: 28px 18px;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 28px rgb(85 78 150 / 8%);
}

.result-warning {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: center;
  margin-bottom: 18px;
  color: #d69a00;
  font-size: 15px;
  line-height: 1.5;
  text-align: center;
}

.result-summary {
  margin: 0 0 14px;
  color: #4b5563;
  text-align: center;
  line-height: 1.7;
}

.result-list {
  margin: 0;
  padding-left: 20px;
  color: #374151;
  line-height: 1.8;
}

.download-button {
  display: flex;
  width: 100%;
  margin-top: 18px;
  justify-content: center;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 14px;
  min-height: 100%;
  color: #52525b;
  text-align: center;
}

.empty-state p {
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 1180px) {
  .workbench {
    grid-template-columns: 1fr;
  }

  .result-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .ai-experience-page {
    padding: 16px;
  }

  .result-panel {
    grid-template-columns: 1fr;
  }

  .panel-header,
  .category-head {
    flex-direction: column;
    align-items: start;
  }

  .panel-actions,
  .category-tools {
    flex-wrap: wrap;
  }
}
</style>
