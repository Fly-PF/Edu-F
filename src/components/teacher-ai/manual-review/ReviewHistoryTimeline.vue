<script setup>
import { computed } from 'vue'

const props = defineProps({
  gradingResultReady: {
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
  reviewStatus: {
    type: String,
    default: 'pending',
  },
  reviewScore: {
    type: Number,
    default: null,
  },
  reviewOpinion: {
    type: String,
    default: '',
  },
})

const timelineItems = computed(() => {
  const aiScore = props.gradingDisplayResult?.totalScore ?? '--'
  const teacherCompleted = props.reviewStatus === 'accepted' || props.reviewStatus === 'modified'
  const reviewText = props.reviewStatus === 'modified'
    ? `教师将结果确认至 ${props.reviewScore ?? '--'} 分${props.reviewOpinion ? `，意见：${props.reviewOpinion}` : ''}`
    : props.reviewStatus === 'accepted'
      ? `教师接受 AI 评分 ${aiScore} 分${props.reviewOpinion ? `，意见：${props.reviewOpinion}` : ''}`
      : '等待教师确认评分并填写审核意见。'

  return [
    {
      title: 'AI分析完成',
      description: props.gradingResultReady
        ? `已生成 ${aiScore} / ${props.gradingResultMaxScore} 分的结构化评分报告。`
      : '等待批改结果。',
      status: props.gradingResultReady ? 'complete' : 'preview',
    },
    {
      title: '风险筛选',
      description: `依据 AI 可信度 ${props.confidencePercent}% 与评分争议进入人工复核队列。`,
      status: props.gradingResultReady ? 'complete' : 'preview',
    },
    {
      title: '教师审核',
      description: reviewText,
      status: teacherCompleted ? 'complete' : 'active',
    },
    {
      title: '记录追踪',
      description: teacherCompleted ? '本次前端审核状态已记录，可继续追踪后续发布流程。' : '完成审核后记录状态变化。',
      status: teacherCompleted ? 'complete' : 'pending',
    },
  ]
})
</script>

<template>
  <section class="review-history" aria-labelledby="review-history-title">
    <div class="review-history__header">
      <span>审核轨迹</span>
      <h3 id="review-history-title">评分与状态变化记录</h3>
    </div>

    <div class="review-history__timeline">
      <article v-for="(item, index) in timelineItems" :key="item.title" class="review-history-item">
        <div class="review-history-item__marker" :class="`is-${item.status}`">
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <i v-if="index !== timelineItems.length - 1"></i>
        </div>
        <div class="review-history-item__content">
          <strong>{{ item.title }}</strong>
          <p>{{ item.description }}</p>
          <small>当前会话</small>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.review-history {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(139, 92, 246, 0.14);
  border-radius: 6px;
  background: linear-gradient(180deg, rgb(255 255 255 / 97%), rgb(249 246 255 / 94%));
  box-shadow: 0 10px 24px rgb(109 40 217 / 7%);
}

.review-history__header span {
  color: #6d28d9;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.review-history__header h3 {
  margin: 6px 0 0;
  color: #281c3a;
  font-size: 18px;
}

.review-history__timeline {
  display: grid;
}

.review-history-item {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 12px;
  min-width: 0;
}

.review-history-item__marker {
  position: relative;
  display: grid;
  justify-items: center;
}

.review-history-item__marker span {
  z-index: 1;
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 50%;
  background: #f3f0f8;
  color: #8a819b;
  font-size: 10px;
  font-weight: 800;
}

.review-history-item__marker.is-complete span {
  background: rgb(52 211 153 / 16%);
  color: #117a5d;
}

.review-history-item__marker.is-active span {
  background: rgb(139 92 246 / 15%);
  color: #6d28d9;
}

.review-history-item__marker i {
  position: absolute;
  top: 30px;
  bottom: 0;
  width: 1px;
  background: rgba(139, 92, 246, 0.18);
}

.review-history-item__content {
  display: grid;
  gap: 5px;
  padding: 4px 0 18px;
}

.review-history-item__content strong {
  color: #281c3a;
  font-size: 14px;
}

.review-history-item__content p {
  margin: 0;
  color: #645b79;
  font-size: 13px;
  line-height: 1.6;
}

.review-history-item__content small {
  color: #9d91b0;
  font-size: 11px;
}
</style>
