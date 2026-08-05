<script setup>
import { computed, ref } from 'vue'
import { Document, MagicStick, UploadFilled } from '@element-plus/icons-vue'

const props = defineProps({
  tasks: {
    type: Array,
    default: () => [],
  },
  activeTaskId: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['select-task'])

const sourceMode = ref('task')
const selectedFileName = ref('')
const batchStage = ref('select')

const activeTask = computed(() => props.tasks.find((task) => task.id === props.activeTaskId) || props.tasks[0] || null)
const processingProgress = computed(() => {
  if (batchStage.value === 'ready') return 100
  if (sourceMode.value === 'upload' && selectedFileName.value) return 68
  if (!activeTask.value?.submittedCount) return 0
  return Math.min(100, Math.round((activeTask.value.aiCompletedCount / activeTask.value.submittedCount) * 100))
})
const stageText = computed(() => {
  if (batchStage.value === 'ready') return '审核队列已生成'
  if (sourceMode.value === 'upload' && selectedFileName.value) return 'AI正在处理上传内容'
  return '已选择现有批改任务'
})

function selectTask(taskId) {
  emit('select-task', taskId)
  batchStage.value = 'processing'
}

function handleFileChange(file) {
  selectedFileName.value = file?.name || ''
  batchStage.value = selectedFileName.value ? 'processing' : 'select'
}

function generateReviewQueue() {
  if (sourceMode.value === 'upload' && !selectedFileName.value) return
  batchStage.value = 'ready'
}
</script>

<template>
  <section class="batch-grading-panel" aria-labelledby="batch-grading-title">
    <div class="batch-grading-panel__header">
      <div>
        <span>批量批改</span>
        <h3 id="batch-grading-title">AI批量处理流程</h3>
      </div>
      <strong>前端演示流程</strong>
    </div>

    <el-segmented v-model="sourceMode" :options="[{ label: '选择任务', value: 'task' }, { label: '上传作答', value: 'upload' }]" />

    <div v-if="sourceMode === 'task'" class="batch-source-panel">
      <el-select :model-value="activeTaskId" class="batch-task-select" placeholder="选择批改任务" @change="selectTask">
        <el-option
          v-for="task in tasks"
          :key="task.id"
          :label="`${task.course} · ${task.title}`"
          :value="task.id"
        />
      </el-select>
      <span class="batch-source-summary">
        <el-icon><Document /></el-icon>
        {{ activeTask?.submittedCount || 0 }} 份学生提交
      </span>
    </div>

    <div v-else class="batch-source-panel batch-source-panel--upload">
      <el-upload
        :auto-upload="false"
        :limit="1"
        accept=".xlsx,.csv,.zip,.pdf,.doc,.docx"
        :on-change="handleFileChange"
      >
        <el-button plain>
          <el-icon><UploadFilled /></el-icon>
          选择学生作答文件
        </el-button>
      </el-upload>
      <span class="batch-source-summary">{{ selectedFileName || '尚未选择文件' }}</span>
    </div>

    <div class="batch-progress-card">
      <div class="batch-progress-card__head">
        <span>AI处理进度</span>
        <strong>{{ processingProgress }}%</strong>
      </div>
      <el-progress :percentage="processingProgress" :stroke-width="9" :show-text="false" color="#8b5cf6" />
      <small>{{ stageText }}</small>
    </div>

    <div class="batch-flow">
      <span :class="{ 'is-complete': sourceMode === 'task' || selectedFileName }">01 上传/选择任务</span>
      <i>→</i>
      <span :class="{ 'is-active': batchStage === 'processing', 'is-complete': batchStage === 'ready' }">02 AI批量处理</span>
      <i>→</i>
      <span :class="{ 'is-complete': batchStage === 'ready' }">03 生成审核队列</span>
    </div>

    <el-button
      type="primary"
      plain
      :disabled="sourceMode === 'upload' && !selectedFileName"
      @click="generateReviewQueue"
    >
      <el-icon><MagicStick /></el-icon>
      模拟生成审核队列
    </el-button>
  </section>
</template>

<style scoped>
.batch-grading-panel {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(52, 211, 153, 0.16);
  border-radius: 6px;
  background: linear-gradient(180deg, rgb(255 255 255 / 95%), rgb(244 255 249 / 90%));
}

.batch-grading-panel__header,
.batch-progress-card__head,
.batch-source-panel {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

.batch-grading-panel__header {
  align-items: flex-start;
}

.batch-grading-panel__header span {
  color: #117a5d;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.batch-grading-panel__header h3 {
  margin: 5px 0 0;
  color: #281c3a;
  font-size: 16px;
}

.batch-grading-panel__header > strong {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgb(52 211 153 / 11%);
  color: #117a5d;
  font-size: 11px;
  white-space: nowrap;
}

.batch-source-panel {
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 6px;
  background: #fff;
}

.batch-task-select {
  min-width: 0;
  flex: 1;
}

.batch-source-summary {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  overflow: hidden;
  max-width: 180px;
  color: #645b79;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.batch-progress-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 6px;
  background: #fff;
}

.batch-progress-card__head span,
.batch-progress-card small {
  color: #645b79;
  font-size: 12px;
}

.batch-progress-card__head strong {
  color: #6d28d9;
  font-size: 14px;
}

.batch-flow {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}

.batch-flow span {
  padding: 6px 8px;
  border-radius: 999px;
  background: #f3f0f8;
  color: #8a819b;
  font-size: 11px;
  font-weight: 650;
  white-space: nowrap;
}

.batch-flow span.is-active {
  background: rgb(139 92 246 / 12%);
  color: #6d28d9;
}

.batch-flow span.is-complete {
  background: rgb(52 211 153 / 12%);
  color: #117a5d;
}

.batch-flow i {
  color: #9d91b0;
  font-size: 11px;
  font-style: normal;
}

.batch-grading-panel > :deep(.el-button) {
  justify-self: end;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .batch-source-panel,
  .batch-grading-panel__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .batch-task-select,
  .batch-grading-panel > :deep(.el-button) {
    width: 100%;
  }
}
</style>

