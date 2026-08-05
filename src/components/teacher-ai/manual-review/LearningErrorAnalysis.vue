<script setup>
import { computed } from 'vue'
import { buildLearningInsight } from '@/utils/teacherAiLearningInsight'

const props = defineProps({
  gradingStrengths: {
    type: Array,
    default: () => [],
  },
  gradingDimensionScores: {
    type: Array,
    default: () => [],
  },
  gradingDeductions: {
    type: Array,
    default: () => [],
  },
  gradingSuggestions: {
    type: Array,
    default: () => [],
  },
})

const learningInsight = computed(() => buildLearningInsight({
  strengths: props.gradingStrengths,
  dimensionScores: props.gradingDimensionScores,
  deductions: props.gradingDeductions,
  suggestions: props.gradingSuggestions,
}))
</script>

<template>
  <section class="learning-error-analysis" aria-labelledby="learning-error-analysis-title">
    <div class="learning-error-analysis__header">
      <div>
        <span>学习反馈</span>
        <h3 id="learning-error-analysis-title">本次学习洞察</h3>
        <p>把本次批改结果转化为下一轮备课可以直接参考的教学线索。</p>
      </div>
      <strong>已反馈至智能备课</strong>
    </div>

    <div class="learning-error-analysis__grid">
      <article class="learning-error-card learning-error-card--mastered">
        <span>掌握较好</span>
        <ul v-if="learningInsight.masteredPoints.length">
          <li v-for="(item, index) in learningInsight.masteredPoints" :key="`learning-mastered-${index}`">{{ item }}</li>
        </ul>
        <p v-else>本次结果中暂无明确的优势维度。</p>
      </article>

      <article class="learning-error-card learning-error-card--danger">
        <span>薄弱知识点</span>
        <ul v-if="learningInsight.weakPoints.length">
          <li v-for="(item, index) in learningInsight.weakPoints" :key="`learning-weak-${index}`">{{ item }}</li>
        </ul>
        <p v-else>本次结果中暂无明确的薄弱维度。</p>
      </article>

      <article class="learning-error-card learning-error-card--weak">
        <span>常见错误</span>
        <ul v-if="learningInsight.errorPatterns.length">
          <li v-for="(item, index) in learningInsight.errorPatterns" :key="`learning-error-${index}`">{{ item }}</li>
        </ul>
        <p v-else>本次结果中暂无明确的错误模式。</p>
      </article>

      <article class="learning-error-card learning-error-card--advice">
        <span>下一步教学建议</span>
        <ul v-if="learningInsight.teachingSuggestions.length">
          <li v-for="(item, index) in learningInsight.teachingSuggestions" :key="`learning-advice-${index}`">{{ item }}</li>
        </ul>
        <p v-else>本次结果中暂无进一步教学建议。</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.learning-error-analysis {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 6px;
  background: linear-gradient(180deg, rgb(255 255 255 / 97%), rgb(255 251 238 / 94%));
  box-shadow: 0 10px 24px rgb(146 64 14 / 6%);
}

.learning-error-analysis__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.learning-error-analysis__header span,
.learning-error-card > span {
  color: #9a5a00;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.learning-error-analysis__header h3 {
  margin: 6px 0 4px;
  color: #281c3a;
  font-size: 18px;
}

.learning-error-analysis__header p {
  margin: 0;
  color: #645b79;
  font-size: 13px;
  line-height: 1.6;
}

.learning-error-analysis__header > strong {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgb(245 158 11 / 12%);
  color: #9a5a00;
  font-size: 12px;
  white-space: nowrap;
}

.learning-error-analysis__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.learning-error-card {
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(245, 158, 11, 0.14);
  border-radius: 6px;
  background: rgb(255 255 255 / 82%);
}

.learning-error-card--danger {
  border-top: 3px solid #ec4899;
}

.learning-error-card--mastered {
  border-top: 3px solid #34d399;
}

.learning-error-card--weak {
  border-top: 3px solid #f59e0b;
}

.learning-error-card--advice {
  border-top: 3px solid #34d399;
}

.learning-error-card ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding-left: 18px;
}

.learning-error-card li,
.learning-error-card p {
  margin: 0;
  color: #645b79;
  font-size: 13px;
  line-height: 1.6;
}

.learning-weak-list {
  display: grid;
  gap: 12px;
}

.learning-weak-item {
  display: grid;
  gap: 6px;
}

.learning-weak-item > div {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.learning-weak-item strong {
  overflow: hidden;
  color: #281c3a;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.learning-weak-item small {
  color: #9a5a00;
  font-size: 11px;
  white-space: nowrap;
}

@media (max-width: 1040px) {
  .learning-error-analysis__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .learning-error-analysis__grid {
    grid-template-columns: 1fr;
  }

  .learning-error-analysis__header {
    flex-direction: column;
  }
}
</style>
