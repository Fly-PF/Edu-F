<script setup>
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const props = defineProps({
  studentAnswer: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const annotationDraft = ref('')
const annotationRecords = ref([])

function addAnnotation() {
  const content = annotationDraft.value.trim()
  if (props.disabled || !content) return

  annotationRecords.value.push({
    id: annotationRecords.value.length + 1,
    content,
  })
  annotationDraft.value = ''
}
</script>

<template>
  <section class="answer-annotation-panel" aria-labelledby="answer-annotation-title">
    <div class="answer-annotation-panel__header">
      <div>
        <span>答案批注</span>
        <h4 id="answer-annotation-title">学生答案与教师批注</h4>
      </div>
      <small>{{ annotationRecords.length }} 条批注</small>
    </div>

    <div class="answer-annotation-answer">
      <span>学生答案</span>
      <p>{{ studentAnswer || '暂无学生答案内容。' }}</p>
    </div>

    <div class="answer-annotation-editor">
      <el-input
        v-model="annotationDraft"
        type="textarea"
        :rows="3"
        maxlength="500"
        show-word-limit
        :disabled="disabled"
        placeholder="输入针对学生答案的教师批注"
        @keydown.ctrl.enter.prevent="addAnnotation"
      />
      <el-button type="primary" plain :disabled="disabled || !annotationDraft.trim()" @click="addAnnotation">
        <el-icon><Plus /></el-icon>
        添加批注
      </el-button>
    </div>

    <div v-if="annotationRecords.length" class="answer-annotation-records">
      <article v-for="record in annotationRecords" :key="record.id" class="answer-annotation-record">
        <span>教师批注 {{ record.id }}</span>
        <p>{{ record.content }}</p>
      </article>
    </div>
    <p v-else class="answer-annotation-empty">暂无批注记录，教师审核时可补充重点反馈。</p>
  </section>
</template>

<style scoped>
.answer-annotation-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(52, 211, 153, 0.16);
  border-radius: 6px;
  background: rgb(255 255 255 / 80%);
}

.answer-annotation-panel__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.answer-annotation-panel__header span,
.answer-annotation-answer > span {
  color: #117a5d;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.answer-annotation-panel__header h4 {
  margin: 5px 0 0;
  color: #281c3a;
  font-size: 15px;
}

.answer-annotation-panel__header small,
.answer-annotation-empty,
.answer-annotation-record p {
  color: #645b79;
  font-size: 12px;
  line-height: 1.6;
}

.answer-annotation-panel__header small {
  white-space: nowrap;
}

.answer-annotation-answer {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-left: 3px solid #34d399;
  background: rgb(52 211 153 / 7%);
}

.answer-annotation-answer p,
.answer-annotation-empty {
  margin: 0;
}

.answer-annotation-answer p {
  color: #48355f;
  font-size: 13px;
  line-height: 1.7;
}

.answer-annotation-editor {
  display: grid;
  gap: 8px;
}

.answer-annotation-editor :deep(.el-button) {
  justify-self: end;
  min-width: 112px;
  white-space: nowrap;
}

.answer-annotation-records {
  display: grid;
  gap: 8px;
}

.answer-annotation-record {
  padding: 10px 12px;
  border: 1px solid rgb(139 92 246 / 12%);
  border-radius: 6px;
  background: rgb(139 92 246 / 5%);
}

.answer-annotation-record span {
  color: #6d28d9;
  font-size: 11px;
  font-weight: 700;
}

.answer-annotation-record p {
  margin: 5px 0 0;
}

@media (max-width: 560px) {
  .answer-annotation-panel__header {
    flex-direction: column;
  }

  .answer-annotation-editor :deep(.el-button) {
    justify-self: stretch;
    width: 100%;
  }
}
</style>

