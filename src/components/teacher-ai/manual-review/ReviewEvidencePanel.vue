<script setup>
import { computed } from 'vue'

const props = defineProps({
  gradingDisplayResult: {
    type: Object,
    default: null,
  },
  gradingDimensionScores: {
    type: Array,
    default: () => [],
  },
  gradingStrengths: {
    type: Array,
    default: () => [],
  },
  gradingDeductions: {
    type: Array,
    default: () => [],
  },
  confidencePercent: {
    type: Number,
    default: 0,
  },
})

const matchedRubricCount = computed(
  () => props.gradingDimensionScores.filter((item) => item?.criterion && item?.reason).length,
)
const rubricMatchPercent = computed(() => {
  if (!props.gradingDimensionScores.length) return 0
  return Math.round((matchedRubricCount.value / props.gradingDimensionScores.length) * 100)
})
</script>

<template>
  <section class="review-evidence-panel" aria-labelledby="review-evidence-title">
    <div class="review-evidence-panel__header">
      <div>
        <span>审核证据</span>
        <h4 id="review-evidence-title">AI评分证据摘要</h4>
      </div>
      <strong>Rubric 匹配 {{ rubricMatchPercent }}%</strong>
    </div>

    <div class="review-evidence-panel__grid">
      <article class="review-evidence-card">
        <span>AI评分依据</span>
        <strong>{{ gradingDisplayResult?.totalScore ?? '--' }} 分</strong>
        <p>综合 {{ gradingDimensionScores.length }} 个 Rubric 维度与参考答案匹配结果。</p>
      </article>

      <article class="review-evidence-card review-evidence-card--answer">
        <span>答案证据</span>
        <ul v-if="gradingStrengths.length || gradingDeductions.length">
          <li v-for="(item, index) in gradingStrengths.slice(0, 2)" :key="`review-strength-${index}`">{{ item }}</li>
          <li v-for="(item, index) in gradingDeductions.slice(0, 2)" :key="`review-deduction-${index}`">{{ item }}</li>
        </ul>
        <p v-else>暂无可用于人工审核的答案证据。</p>
      </article>

      <article class="review-evidence-card review-evidence-card--rubric">
        <span>Rubric匹配情况</span>
        <strong>{{ matchedRubricCount }} / {{ gradingDimensionScores.length }}</strong>
        <el-progress :percentage="rubricMatchPercent" :stroke-width="7" :show-text="false" color="#34d399" />
        <small>AI可信度 {{ confidencePercent }}%</small>
      </article>
    </div>
  </section>
</template>

<style scoped>
.review-evidence-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 6px;
  background: rgb(255 255 255 / 78%);
}

.review-evidence-panel__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.review-evidence-panel__header span,
.review-evidence-card > span {
  color: #6d28d9;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.review-evidence-panel__header h4 {
  margin: 5px 0 0;
  color: #281c3a;
  font-size: 15px;
}

.review-evidence-panel__header > strong {
  color: #117a5d;
  font-size: 12px;
  white-space: nowrap;
}

.review-evidence-panel__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.review-evidence-card {
  display: grid;
  gap: 7px;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 6px;
  background: #fff;
}

.review-evidence-card strong {
  color: #281c3a;
  font-size: 20px;
}

.review-evidence-card p,
.review-evidence-card li,
.review-evidence-card small {
  margin: 0;
  color: #645b79;
  font-size: 12px;
  line-height: 1.6;
}

.review-evidence-card ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 16px;
}

@media (max-width: 860px) {
  .review-evidence-panel__grid {
    grid-template-columns: 1fr;
  }

  .review-evidence-panel__header {
    flex-direction: column;
  }
}
</style>

