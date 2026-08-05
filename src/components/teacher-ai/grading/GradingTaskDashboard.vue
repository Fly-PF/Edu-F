<script setup>
defineProps({
  task: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <section class="grading-task-dashboard" aria-labelledby="grading-dashboard-title">
    <div class="grading-task-dashboard__header">
      <span>当前批改任务</span>
      <h3 id="grading-dashboard-title">{{ task.course }} · {{ task.title }}</h3>
      <p>{{ task.className }} · 截止时间 {{ task.deadline }}</p>
    </div>

    <div class="grading-task-dashboard__grid">
      <article class="grading-dashboard-card grading-dashboard-card--assignment">
        <span>作业名称</span>
        <strong>{{ task.title }}</strong>
        <small>{{ task.course }}</small>
      </article>
      <article class="grading-dashboard-card">
        <span>提交数量</span>
        <strong>{{ task.submittedCount }}</strong>
        <small>学生已提交</small>
      </article>
      <article class="grading-dashboard-card grading-dashboard-card--complete">
        <span>AI完成数量</span>
        <strong>{{ task.aiCompletedCount }}</strong>
        <small>评分报告已生成</small>
      </article>
      <article class="grading-dashboard-card grading-dashboard-card--review">
        <span>待审核数量</span>
        <strong>{{ task.pendingReviewCount }}</strong>
        <small>等待教师复核</small>
      </article>
    </div>
  </section>
</template>

<style scoped>
.grading-task-dashboard {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid rgba(139, 92, 246, 0.14);
  border-radius: 6px;
  background: linear-gradient(180deg, rgb(255 255 255 / 95%), rgb(248 245 255 / 90%));
}

.grading-task-dashboard__header span {
  color: #6d28d9;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.08em;
}

.grading-task-dashboard__header h3 {
  margin: 5px 0 3px;
  color: #281c3a;
  font-size: 16px;
  line-height: 1.4;
}

.grading-task-dashboard__header p {
  margin: 0;
  color: #8a819b;
  font-size: 12px;
}

.grading-task-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
}

.grading-dashboard-card {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: 6px;
  background: #fff;
}

.grading-dashboard-card > span,
.grading-dashboard-card small {
  color: #8a819b;
  font-size: 11px;
}

.grading-dashboard-card strong {
  overflow: hidden;
  color: #281c3a;
  font-size: 22px;
  line-height: 1.2;
  text-overflow: ellipsis;
}

.grading-dashboard-card--assignment {
  grid-column: 1 / -1;
  border-left: 3px solid #8b5cf6;
}

.grading-dashboard-card--assignment strong {
  font-size: 15px;
}

.grading-dashboard-card--complete strong {
  color: #117a5d;
}

.grading-dashboard-card--review strong {
  color: #be185d;
}

@media (max-width: 560px) {
  .grading-task-dashboard__grid {
    grid-template-columns: 1fr;
  }

  .grading-dashboard-card--assignment {
    grid-column: auto;
  }
}
</style>

