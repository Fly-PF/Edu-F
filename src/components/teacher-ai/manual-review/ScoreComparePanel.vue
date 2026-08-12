<script setup>
import { computed } from 'vue'

const props = defineProps({
  gradingDisplayResult: {
    type: Object,
    default: null,
  },
  gradingResultMaxScore: {
    type: Number,
    default: 10,
  },
  teacherScore: {
    type: Number,
    default: null,
  },
  reviewStatus: {
    type: String,
    default: 'pending',
  },
})

const aiScore = computed(() => {
  const value = Number(props.gradingDisplayResult?.totalScore)
  return Number.isFinite(value) ? value : null
})

const hasTeacherScore = computed(
  () => props.teacherScore !== null && Number.isFinite(Number(props.teacherScore)),
)

const scoreDifference = computed(() => {
  if (!hasTeacherScore.value || aiScore.value === null) return null
  return Number(props.teacherScore) - aiScore.value
})

const differenceLabel = computed(() => {
  if (scoreDifference.value === null) return '--'
  if (scoreDifference.value === 0) return '0'
  return scoreDifference.value > 0 ? `+${scoreDifference.value}` : String(scoreDifference.value)
})

const differenceReason = computed(() => {
  if (props.reviewStatus === 'accepted') return '教师确认建议评分，无分数调整。'
  if (props.reviewStatus === 'modified' && scoreDifference.value !== null) {
    return scoreDifference.value === 0 ? '教师保存审核结果，分数保持一致。' : '教师已根据审核意见调整评分。'
  }
  return '教师尚未提交审核调整，等待复核。'
})
</script>

<template>
  <section class="score-compare-panel" aria-labelledby="score-compare-title">
    <div class="score-compare-panel__header">
      <div>
        <h4 id="score-compare-title">评分确认</h4>
      </div>
      <small>满分 {{ gradingResultMaxScore }} 分</small>
    </div>

    <div class="score-compare-grid">
      <article class="score-compare-card score-compare-card--ai">
        <span>AI建议分</span>
        <strong>{{ aiScore ?? '--' }}</strong>
        <small>系统评估结果</small>
      </article>
      <article class="score-compare-card score-compare-card--teacher">
        <span>教师评分</span>
        <strong>{{ hasTeacherScore ? teacherScore : '--' }}</strong>
        <small>{{ reviewStatus === 'pending' ? '等待教师确认' : '当前审核结果' }}</small>
      </article>
      <article class="score-compare-card score-compare-card--difference">
        <span>分数差异</span>
        <strong :class="{ 'is-positive': scoreDifference > 0, 'is-negative': scoreDifference < 0 }">
          {{ differenceLabel }}
        </strong>
        <small>教师评分 - AI建议分</small>
      </article>
    </div>

    <div class="score-compare-reason">
      <span>差异原因</span>
      <p>{{ differenceReason }}</p>
    </div>
  </section>
</template>

<style scoped>
.score-compare-panel {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid #dfe6ed;
  border-radius: 8px;
  background: #fff;
}

.score-compare-panel__header,
.score-compare-reason {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.score-compare-reason span {
  color: #607186;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.06em;
}

.score-compare-panel__header h4 {
  margin: 5px 0 0;
  color: #31445a;
  font-size: 15px;
}

.score-compare-panel__header small,
.score-compare-card small,
.score-compare-reason p {
  color: #738196;
  font-size: 12px;
  line-height: 1.6;
}

.score-compare-panel__header small {
  white-space: nowrap;
}

.score-compare-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.score-compare-card {
  display: grid;
  gap: 6px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #e5eaf0;
  border-radius: 8px;
  background: #f9fbfd;
}

.score-compare-card > span {
  color: #738196;
  font-size: 12px;
  font-weight: 700;
}

.score-compare-card strong {
  color: #31445a;
  font-size: 24px;
  line-height: 1.1;
}

.score-compare-card--ai strong {
  color: #3478c7;
}

.score-compare-card--teacher strong {
  color: #117a5d;
}

.score-compare-card--difference strong.is-positive {
  color: #117a5d;
}

.score-compare-card--difference strong.is-negative {
  color: #be185d;
}

.score-compare-card small {
  margin: 0;
}

.score-compare-reason {
  padding-top: 12px;
  border-top: 1px solid #e8edf2;
}

.score-compare-reason p {
  flex: 1;
  margin: 0;
  text-align: right;
}

@media (max-width: 560px) {
  .score-compare-grid {
    grid-template-columns: 1fr;
  }

  .score-compare-panel__header,
  .score-compare-reason {
    flex-direction: column;
  }

  .score-compare-reason p {
    text-align: left;
  }
}
</style>
