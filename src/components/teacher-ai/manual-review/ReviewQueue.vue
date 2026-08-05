<script setup>
import { computed } from 'vue'

defineProps({
  selectedReviewId: {
    type: String,
    default: '',
  },
})

defineEmits(['select'])

const rawReviewItems = []

function resolvePriority(item) {
  if (item.confidence < 80 || item.disputed) return 'high'
  if (item.confidence < 90) return 'medium'
  return 'normal'
}

function priorityLabel(priority) {
  if (priority === 'high') return '高优先级'
  if (priority === 'medium') return '中优先级'
  return '常规复核'
}

const reviewItems = computed(() =>
  rawReviewItems
    .map((item) => ({ ...item, priority: resolvePriority(item) }))
    .sort((a, b) => {
      const order = { high: 0, medium: 1, normal: 2 }
      return order[a.priority] - order[b.priority]
    }),
)
</script>

<template>
  <section class="review-queue" aria-labelledby="review-queue-title">
    <div class="review-queue__header">
      <div>
        <span>风险筛选</span>
        <h3 id="review-queue-title">待人工审核队列</h3>
        <p>优先处理低可信度或存在评分争议的结果。</p>
      </div>
      <strong>{{ reviewItems.length }} 项待审核</strong>
    </div>

    <div class="review-queue__list">
      <button
        v-for="item in reviewItems"
        :key="item.id"
        type="button"
        class="review-queue-item"
        :class="[`is-${item.priority}`, { 'is-selected': item.id === selectedReviewId }]"
        :aria-pressed="item.id === selectedReviewId"
        @click="$emit('select', item)"
      >
        <span class="review-queue-item__priority">{{ priorityLabel(item.priority) }}</span>
        <span class="review-queue-item__identity">
          <strong>{{ item.name }}</strong>
          <small>{{ item.studentNo }}</small>
        </span>
        <span class="review-queue-item__metrics">
          <strong>{{ item.score }}</strong>
          <small>可信度 {{ item.confidence }}%</small>
        </span>
        <span class="review-queue-item__reason">{{ item.reason }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.review-queue {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(236, 72, 153, 0.16);
  border-radius: 6px;
  background: linear-gradient(180deg, rgb(255 255 255 / 97%), rgb(255 247 251 / 94%));
  box-shadow: 0 10px 24px rgb(157 23 77 / 6%);
}

.review-queue__header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.review-queue__header span {
  color: #be185d;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.review-queue__header h3 {
  margin: 6px 0 4px;
  color: #281c3a;
  font-size: 18px;
}

.review-queue__header p {
  margin: 0;
  color: #645b79;
  font-size: 13px;
  line-height: 1.6;
}

.review-queue__header > strong {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgb(236 72 153 / 10%);
  color: #be185d;
  font-size: 12px;
  white-space: nowrap;
}

.review-queue__list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.review-queue-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid rgba(139, 92, 246, 0.12);
  border-radius: 6px;
  background: rgb(255 255 255 / 84%);
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
}

.review-queue-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgb(109 40 217 / 8%);
}

.review-queue-item:focus-visible {
  outline: 2px solid rgb(236 72 153 / 45%);
  outline-offset: 2px;
}

.review-queue-item.is-selected {
  border-color: rgb(139 92 246 / 40%);
  box-shadow: 3px 0 0 #8b5cf6 inset;
}

.review-queue-item.is-high {
  border-top: 3px solid #ec4899;
}

.review-queue-item.is-medium {
  border-top: 3px solid #f59e0b;
}

.review-queue-item.is-normal {
  border-top: 3px solid #34d399;
}

.review-queue-item__priority {
  grid-column: 1 / -1;
  width: fit-content;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgb(236 72 153 / 10%);
  color: #be185d;
  font-size: 11px;
  font-weight: 700;
}

.review-queue-item.is-medium .review-queue-item__priority {
  background: rgb(245 158 11 / 12%);
  color: #9a5a00;
}

.review-queue-item.is-normal .review-queue-item__priority {
  background: rgb(52 211 153 / 12%);
  color: #117a5d;
}

.review-queue-item__identity,
.review-queue-item__metrics {
  display: grid;
  gap: 3px;
}

.review-queue-item__metrics {
  text-align: right;
}

.review-queue-item__identity strong,
.review-queue-item__metrics strong {
  color: #281c3a;
  font-size: 14px;
}

.review-queue-item__identity small,
.review-queue-item__metrics small,
.review-queue-item__reason {
  color: #8a819b;
  font-size: 11px;
}

.review-queue-item__reason {
  grid-column: 1 / -1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 860px) {
  .review-queue__list {
    grid-template-columns: 1fr;
  }

  .review-queue__header {
    flex-direction: column;
  }
}
</style>
