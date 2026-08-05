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
  gradingSuggestions: {
    type: Array,
    default: () => [],
  },
  confidencePercent: {
    type: Number,
    default: 0,
  },
})

const displayConfidencePercent = computed(() => {
  const explicitValue = Number(props.confidencePercent)
  if (explicitValue > 0) return Math.max(0, Math.min(100, Math.round(explicitValue)))

  const resultConfidence = Number(props.gradingDisplayResult?.confidence)
  if (!Number.isFinite(resultConfidence)) return 0
  return Math.max(0, Math.min(100, Math.round(resultConfidence * 100)))
})
</script>

<template>
  <div
    class="teacher-ai-grading-report"
    :data-dimension-count="gradingDimensionScores.length"
    :data-strength-count="gradingStrengths.length"
    :data-deduction-count="gradingDeductions.length"
    :data-suggestion-count="gradingSuggestions.length"
    :data-result-title="gradingDisplayResult?.title || ''"
  >
    <slot />

    <section class="grading-evidence-panel" aria-labelledby="grading-evidence-title">
      <div class="grading-evidence-panel__header">
        <div>
          <span class="grading-evidence-panel__eyebrow">评分可解释性</span>
          <h3 id="grading-evidence-title">AI评分依据与证据</h3>
          <p>将 Rubric 维度、答案表现和 AI 置信度放在同一处，便于教师快速复核。</p>
        </div>
        <span class="grading-evidence-panel__status">可复核报告</span>
      </div>

      <div class="grading-evidence-summary">
        <article class="grading-evidence-metric grading-evidence-metric--confidence">
          <span>AI可信度</span>
          <strong>{{ displayConfidencePercent }}%</strong>
          <el-progress :percentage="displayConfidencePercent" :stroke-width="8" :show-text="false" color="#8b5cf6" />
          <small>基于答案匹配与 Rubric 评估</small>
        </article>
        <article class="grading-evidence-metric">
          <span>评分维度</span>
          <strong>{{ gradingDimensionScores.length }} 项</strong>
          <small>每项均保留评分理由</small>
        </article>
        <article class="grading-evidence-metric">
          <span>反馈证据</span>
          <strong>{{ gradingStrengths.length + gradingDeductions.length }} 条</strong>
          <small>优点与失分点共同构成</small>
        </article>
      </div>

      <div v-if="gradingDimensionScores.length" class="grading-evidence-rubric-grid">
        <article
          v-for="(item, index) in gradingDimensionScores"
          :key="`evidence-${item.criterion}-${index}`"
          class="grading-evidence-rubric-card"
        >
          <div class="grading-evidence-rubric-card__head">
            <span>{{ String(index + 1).padStart(2, '0') }}</span>
            <strong>{{ item.criterion || '未命名维度' }}</strong>
            <b>{{ item.score ?? '--' }} / {{ item.maxScore ?? '--' }}</b>
          </div>
          <p>{{ item.reason || '该评分维度暂无具体理由。' }}</p>
        </article>
      </div>
      <p v-else class="grading-evidence-empty">当前暂无可展示的 Rubric 评分依据。</p>

      <div class="grading-evidence-notes">
        <article class="grading-evidence-note grading-evidence-note--positive">
          <span>答案表现证据</span>
          <ul v-if="gradingStrengths.length">
            <li v-for="(item, index) in gradingStrengths" :key="`evidence-strength-${index}`">{{ item }}</li>
          </ul>
          <p v-else>暂无答案优点证据。</p>
        </article>
        <article class="grading-evidence-note grading-evidence-note--warning">
          <span>失分与改进证据</span>
          <ul v-if="gradingDeductions.length || gradingSuggestions.length">
            <li v-for="(item, index) in gradingDeductions" :key="`evidence-deduction-${index}`">{{ item }}</li>
            <li v-for="(item, index) in gradingSuggestions" :key="`evidence-suggestion-${index}`">{{ item }}</li>
          </ul>
          <p v-else>暂无失分或改进证据。</p>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.teacher-ai-grading-report {
  display: grid;
  gap: 18px;
  min-width: 0;
}

.grading-evidence-panel {
  display: grid;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(139, 92, 246, 0.14);
  border-radius: 6px;
  background: linear-gradient(180deg, rgb(255 255 255 / 97%), rgb(249 246 255 / 94%));
  box-shadow: 0 10px 24px rgb(109 40 217 / 7%);
}

.grading-evidence-panel__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.grading-evidence-panel__eyebrow {
  color: #6d28d9;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.grading-evidence-panel h3 {
  margin: 6px 0 4px;
  color: #281c3a;
  font-size: 18px;
  line-height: 1.35;
}

.grading-evidence-panel__header p,
.grading-evidence-metric small,
.grading-evidence-rubric-card p,
.grading-evidence-note p,
.grading-evidence-note li {
  color: #645b79;
  font-size: 13px;
  line-height: 1.65;
}

.grading-evidence-panel__header p {
  margin: 0;
}

.grading-evidence-panel__status {
  flex: 0 0 auto;
  padding: 6px 10px;
  border: 1px solid rgb(52 211 153 / 25%);
  border-radius: 999px;
  background: rgb(52 211 153 / 11%);
  color: #117a5d;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.grading-evidence-summary,
.grading-evidence-rubric-grid,
.grading-evidence-notes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.grading-evidence-metric,
.grading-evidence-rubric-card,
.grading-evidence-note {
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 6px;
  background: rgb(255 255 255 / 82%);
}

.grading-evidence-metric {
  display: grid;
  gap: 8px;
}

.grading-evidence-metric > span,
.grading-evidence-note > span {
  color: #8a819b;
  font-size: 12px;
  font-weight: 700;
}

.grading-evidence-metric strong {
  color: #281c3a;
  font-size: 22px;
  line-height: 1.15;
}

.grading-evidence-metric small {
  margin: 0;
}

.grading-evidence-rubric-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grading-evidence-rubric-card {
  display: grid;
  gap: 8px;
}

.grading-evidence-rubric-card__head {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.grading-evidence-rubric-card__head > span {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 6px;
  background: rgb(236 72 153 / 12%);
  color: #6d28d9;
  font-size: 11px;
  font-weight: 800;
}

.grading-evidence-rubric-card__head strong {
  color: #281c3a;
  font-size: 14px;
}

.grading-evidence-rubric-card__head b {
  color: #6d28d9;
  font-size: 13px;
  white-space: nowrap;
}

.grading-evidence-rubric-card p {
  margin: 0;
}

.grading-evidence-notes {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grading-evidence-note {
  border-top: 3px solid #34d399;
}

.grading-evidence-note--warning {
  border-top-color: #f59e0b;
}

.grading-evidence-note ul {
  display: grid;
  gap: 6px;
  margin: 10px 0 0;
  padding-left: 18px;
}

.grading-evidence-note p {
  margin: 10px 0 0;
}

.grading-evidence-empty {
  margin: 0;
  padding: 14px;
  border: 1px dashed rgba(139, 92, 246, 0.22);
  color: #8a819b;
  font-size: 13px;
  text-align: center;
}

@media (max-width: 860px) {
  .grading-evidence-summary,
  .grading-evidence-rubric-grid,
  .grading-evidence-notes {
    grid-template-columns: 1fr;
  }

  .grading-evidence-panel__header {
    flex-direction: column;
  }
}
</style>
