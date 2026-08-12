<script setup>
import { computed, ref, watch } from 'vue'
import { Check, EditPen } from '@element-plus/icons-vue'
import AnswerAnnotationPanel from './AnswerAnnotationPanel.vue'
import LearningErrorAnalysis from './LearningErrorAnalysis.vue'
import ReviewEvidencePanel from './ReviewEvidencePanel.vue'
import ReviewHistoryTimeline from './ReviewHistoryTimeline.vue'
import ScoreComparePanel from './ScoreComparePanel.vue'

const props = defineProps({
  gradingResult: {
    type: Object,
    default: null,
  },
  gradingResultReady: {
    type: Boolean,
    default: false,
  },
  gradingLoading: {
    type: Boolean,
    default: false,
  },
  gradingDisplayResult: {
    type: Object,
    default: null,
  },
  gradingResultMaxScore: {
    type: Number,
    default: 10,
  },
  confidencePercent: {
    type: Number,
    default: 0,
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
  reviewState: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['copy', 'review-change'])

const reviewScore = ref(null)
const reviewOpinion = ref('')
const reviewStatus = ref('pending')

const canReview = computed(() => Boolean(props.gradingResultReady && props.gradingResult && !props.gradingLoading))
const hasValidReviewScore = computed(
  () => reviewScore.value !== null && Number.isFinite(Number(reviewScore.value)),
)
const displayConfidencePercent = computed(() => {
  const explicitValue = Number(props.confidencePercent)
  if (explicitValue > 0) return Math.max(0, Math.min(100, Math.round(explicitValue)))

  const resultConfidence = Number(props.gradingDisplayResult?.confidence)
  if (!Number.isFinite(resultConfidence)) return 0
  return Math.max(0, Math.min(100, Math.round(resultConfidence * 100)))
})
const reviewStatusText = computed(() => {
  if (reviewStatus.value === 'accepted') return '已确认建议评分'
  if (reviewStatus.value === 'modified') return '已确认教师评分'
  return canReview.value ? '待教师审核' : '等待批改结果'
})

function resetReviewState(result) {
  const resultScore = Number(result?.totalScore)
  const savedScore = props.reviewState?.score
  const normalizedSavedScore = Number(savedScore)
  reviewScore.value = savedScore !== null
    && savedScore !== undefined
    && Number.isFinite(normalizedSavedScore)
    ? normalizedSavedScore
    : Number.isFinite(resultScore) ? resultScore : null
  reviewOpinion.value = String(props.reviewState?.opinion || '')
  reviewStatus.value = ['pending', 'accepted', 'modified'].includes(props.reviewState?.status)
    ? props.reviewState.status
    : 'pending'
}

function acceptAiResult() {
  if (!canReview.value) return
  const score = Number(props.gradingResult?.totalScore)
  reviewScore.value = Number.isFinite(score) ? score : null
  reviewStatus.value = 'accepted'
  emit('review-change', { status: 'accepted', score: reviewScore.value, opinion: reviewOpinion.value })
}

function saveReviewChanges() {
  if (!canReview.value || !hasValidReviewScore.value) return
  reviewStatus.value = 'modified'
  emit('review-change', { status: 'modified', score: Number(reviewScore.value), opinion: reviewOpinion.value })
}

function markReviewPending() {
  if (!canReview.value) return
  reviewStatus.value = 'pending'
  emit('review-change', {
    status: reviewStatus.value,
    score: hasValidReviewScore.value ? Number(reviewScore.value) : null,
    opinion: reviewOpinion.value,
  })
}

watch(
  [() => props.gradingResult, () => props.reviewState],
  ([result]) => resetReviewState(result),
  { immediate: true, deep: true },
)

const actions = {
  copy: () => emit('copy'),
}
</script>

<template>
  <div
    class="teacher-ai-manual-review-workspace"
    :data-loading="gradingLoading"
    :data-review-ready="gradingResultReady"
    :data-has-result="Boolean(gradingResult)"
  >
    <slot :actions="actions" />

    <section class="manual-review-panel" aria-labelledby="manual-review-title">
      <div class="manual-review-panel__header">
        <div>
          <h3 id="manual-review-title">教师审核</h3>
        </div>
        <span class="manual-review-status" :class="`is-${reviewStatus}`">{{ reviewStatusText }}</span>
      </div>

      <ReviewEvidencePanel
        :grading-display-result="gradingDisplayResult"
        :grading-dimension-scores="gradingDimensionScores"
        :grading-strengths="gradingStrengths"
        :grading-deductions="gradingDeductions"
        :confidence-percent="displayConfidencePercent"
      />

      <ScoreComparePanel
        :grading-display-result="gradingDisplayResult"
        :grading-result-max-score="gradingResultMaxScore"
        :teacher-score="reviewScore"
        :review-status="reviewStatus"
      />

      <AnswerAnnotationPanel
        :student-answer="gradingDisplayResult?.studentAnswer"
        :disabled="!canReview"
      />

      <div class="manual-review-editor">
        <div class="manual-review-editor__score">
          <div class="manual-review-field__head">
            <label for="manual-review-score">教师确认分数</label>
            <span>AI建议分 {{ gradingDisplayResult?.totalScore ?? '--' }} / {{ gradingResultMaxScore }}</span>
          </div>
          <el-input-number
            id="manual-review-score"
            v-model="reviewScore"
            :min="0"
            :max="gradingResultMaxScore"
            :precision="1"
            :step="0.5"
            controls-position="right"
            :disabled="!canReview"
            class="manual-review-score-input"
            @change="markReviewPending"
          />
          <small>可信度 {{ displayConfidencePercent }}%</small>
        </div>

        <div class="manual-review-field">
          <div class="manual-review-field__head">
            <label for="manual-review-opinion">审核意见</label>
            <span>临时保存在当前会话</span>
          </div>
          <el-input
            id="manual-review-opinion"
            v-model="reviewOpinion"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
            :disabled="!canReview"
            placeholder="补充教师审核意见，例如：同意评分，建议加强案例说明。"
            @input="markReviewPending"
          />
        </div>
      </div>

      <div class="manual-review-panel__actions">
        <el-button :disabled="!canReview" @click="acceptAiResult">
          <el-icon><Check /></el-icon>
          采用建议评分
        </el-button>
        <el-button type="primary" :disabled="!canReview || !hasValidReviewScore" @click="saveReviewChanges">
          <el-icon><EditPen /></el-icon>
          确认评分
        </el-button>
      </div>
    </section>

    <ReviewHistoryTimeline
      :grading-result-ready="gradingResultReady"
      :grading-display-result="gradingDisplayResult"
      :grading-result-max-score="gradingResultMaxScore"
      :confidence-percent="displayConfidencePercent"
      :review-status="reviewStatus"
      :review-score="reviewScore"
      :review-opinion="reviewOpinion"
    />

    <LearningErrorAnalysis
      :grading-strengths="gradingStrengths"
      :grading-dimension-scores="gradingDimensionScores"
      :grading-deductions="gradingDeductions"
      :grading-suggestions="gradingSuggestions"
    />
  </div>
</template>

<style scoped>
.teacher-ai-manual-review-workspace {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.manual-review-panel {
  display: grid;
  gap: 22px;
  padding: 22px;
  border: 1px solid rgba(52, 211, 153, 0.2);
  border-radius: 6px;
  background: linear-gradient(180deg, rgb(255 255 255 / 97%), rgb(244 255 249 / 94%));
  box-shadow: 0 10px 24px rgb(15 118 110 / 7%);
}

.manual-review-panel__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.manual-review-panel__eyebrow {
  color: #117a5d;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.manual-review-panel h3 {
  margin: 6px 0 4px;
  color: #281c3a;
  font-size: 18px;
  line-height: 1.35;
}

.manual-review-panel p,
.manual-review-panel small,
.manual-review-field__head span {
  color: #645b79;
  font-size: 13px;
  line-height: 1.65;
}

.manual-review-panel__header p {
  margin: 0;
}

.manual-review-status,
.manual-review-panel__flow span {
  border-radius: 999px;
  white-space: nowrap;
}

.manual-review-status {
  flex: 0 0 auto;
  padding: 6px 10px;
  background: rgb(251 191 36 / 14%);
  color: #8b5a00;
  font-size: 12px;
  font-weight: 700;
}

.manual-review-status.is-accepted {
  background: rgb(52 211 153 / 14%);
  color: #117a5d;
}

.manual-review-status.is-modified {
  background: rgb(139 92 246 / 12%);
  color: #6d28d9;
}

.manual-review-panel__flow {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.manual-review-panel__flow span {
  padding: 7px 10px;
  border: 1px solid rgba(139, 92, 246, 0.14);
  background: #fff;
  color: #645b79;
  font-size: 12px;
  font-weight: 650;
}

.manual-review-panel__flow span.is-active {
  border-color: rgb(139 92 246 / 28%);
  background: rgb(139 92 246 / 10%);
  color: #6d28d9;
}

.manual-review-panel__flow span.is-complete {
  border-color: rgb(52 211 153 / 28%);
  background: rgb(52 211 153 / 10%);
  color: #117a5d;
}

.manual-review-panel__flow i {
  color: #9d91b0;
  font-size: 14px;
  font-style: normal;
}

.manual-review-editor {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 20px;
}

.manual-review-editor__score,
.manual-review-field {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 18px;
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 6px;
  background: rgb(255 255 255 / 82%);
}

.manual-review-field__head {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.manual-review-field__head label {
  color: #281c3a;
  font-size: 13px;
  font-weight: 700;
}

.manual-review-field__head span {
  font-size: 12px;
  white-space: nowrap;
}

.manual-review-score-input {
  width: 100%;
}

.manual-review-field :deep(.el-textarea__inner) {
  min-height: 132px !important;
  resize: vertical;
}

.manual-review-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: -6px;
  justify-content: flex-end;
}

.manual-review-panel__actions :deep(.el-button) {
  min-width: 132px;
  white-space: nowrap;
}

@media (max-width: 860px) {
  .manual-review-panel__header,
  .manual-review-field__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .manual-review-editor {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .manual-review-panel {
    gap: 18px;
    padding: 18px;
  }

  .manual-review-editor__score,
  .manual-review-field {
    padding: 16px;
  }
}
</style>
