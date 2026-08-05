<script setup>
defineProps({
  submissions: {
    type: Array,
    default: () => [],
  },
  selectedSubmissionId: {
    type: [String, Number],
    default: null,
  },
})

defineEmits(['select'])

function statusLabel(status) {
  const labels = {
    pending: '待AI批改',
    aiCompleted: 'AI已完成',
    reviewing: '待教师审核',
    reviewed: '已审核',
  }
  return labels[status] || '待处理'
}
</script>

<template>
  <section class="submission-list" aria-labelledby="submission-list-title">
    <div class="submission-list__header">
      <h3 id="submission-list-title">学生</h3>
      <strong>{{ submissions.length }} 人</strong>
    </div>

    <div v-if="submissions.length" class="submission-list__body">
      <button
        v-for="submission in submissions"
        :key="submission.id"
        type="button"
        class="submission-row"
        :class="{ 'is-selected': submission.id === selectedSubmissionId }"
        :aria-pressed="submission.id === selectedSubmissionId"
        @click="$emit('select', submission.id)"
      >
        <span class="submission-row__avatar">{{ submission.name?.slice(0, 1) || '学' }}</span>
        <span class="submission-row__identity">
          <strong>{{ submission.name }}</strong>
          <small>{{ submission.studentNo }}</small>
        </span>
        <span class="submission-row__score">
          <strong>{{ submission.score ?? '--' }}</strong>
          <small>AI评分</small>
        </span>
        <span class="submission-row__status" :class="`is-${submission.status}`">
          {{ statusLabel(submission.status) }}
        </span>
      </button>
    </div>

    <div v-else class="submission-list__empty">选择作业后查看学生列表</div>
  </section>
</template>

<style scoped>
.submission-list {
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e0e6ed;
  border-radius: 8px;
  background: #fff;
}

.submission-list__header {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e8edf2;
}

.submission-list__header h3 {
  margin: 0;
  color: #31445a;
  font-size: 14px;
}

.submission-list__header > strong {
  padding: 5px 9px;
  border-radius: 6px;
  background: #f2f6fa;
  color: #607186;
  font-size: 12px;
  white-space: nowrap;
}

.submission-list__body {
  display: grid;
  max-height: 348px;
  overflow-y: auto;
}

.submission-row {
  display: grid;
  grid-template-columns: 38px minmax(110px, 1fr) 58px auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 64px;
  padding: 10px 14px;
  border: 0;
  border-bottom: 1px solid #edf1f5;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background-color 160ms ease, box-shadow 160ms ease;
}

.submission-row:last-child {
  border-bottom: 0;
}

.submission-row:hover {
  background: #f6f9fc;
}

.submission-row:focus-visible {
  outline: 2px solid rgb(47 111 184 / 45%);
  outline-offset: -2px;
}

.submission-row.is-selected {
  background: #eef5fc;
  box-shadow: 3px 0 0 #3478c7 inset;
}

.submission-row__avatar {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 6px;
  background: #e8f1fa;
  color: #3478c7;
  font-size: 14px;
  font-weight: 800;
}

.submission-row__identity,
.submission-row__score {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.submission-row__identity strong,
.submission-row__score strong {
  overflow: hidden;
  color: #31445a;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.submission-row__identity small,
.submission-row__score small {
  color: #7b8999;
  font-size: 11px;
  white-space: nowrap;
}

.submission-row__status {
  padding: 5px 8px;
  border-radius: 999px;
  background: rgb(251 191 36 / 13%);
  color: #8b5a00;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.submission-row__status.is-aiCompleted,
.submission-row__status.is-reviewing {
  background: rgb(139 92 246 / 10%);
  color: #6d28d9;
}

.submission-row__status.is-reviewed {
  background: rgb(52 211 153 / 12%);
  color: #117a5d;
}

.submission-list__empty {
  padding: 40px 16px;
  color: #8a819b;
  font-size: 13px;
  text-align: center;
}

@media (max-width: 560px) {
  .submission-row {
    grid-template-columns: 38px minmax(0, 1fr) auto;
  }

  .submission-row__score {
    display: none;
  }
}
</style>
