<script setup>
import { computed, ref } from 'vue'
import SubmissionList from './SubmissionList.vue'

const gradingTasks = []
const selectedTaskId = ref(null)
const selectedSubmissionId = ref(null)

const selectedTask = computed(() => gradingTasks.find((task) => task.id === selectedTaskId.value) || null)
const selectedSubmission = computed(
  () => selectedTask.value?.submissions?.find((submission) => submission.id === selectedSubmissionId.value) || null,
)

function selectTask(taskId) {
  selectedTaskId.value = taskId
  const task = gradingTasks.find((item) => item.id === taskId)
  selectedSubmissionId.value = task?.submissions[0]?.id || null
}

function selectSubmission(submissionId) {
  selectedSubmissionId.value = submissionId
}
</script>

<template>
  <div class="grading-task-center">
    <section class="grading-task-center__overview" aria-label="作业与学生选择">
      <div class="grading-task-picker">
        <label for="grading-task-select">选择作业</label>
        <select id="grading-task-select" v-model="selectedTaskId" :disabled="!gradingTasks.length" @change="selectTask(selectedTaskId)">
          <option :value="null">暂无可批改作业</option>
          <option v-for="task in gradingTasks" :key="task.id" :value="task.id">
            {{ task.title }}
          </option>
        </select>
      </div>

      <SubmissionList
        :submissions="selectedTask?.submissions || []"
        :selected-submission-id="selectedSubmissionId"
        @select="selectSubmission"
      />
    </section>

    <slot :task="selectedTask" :submission="selectedSubmission" />
  </div>
</template>

<style scoped>
.grading-task-center {
  display: grid;
  gap: 24px;
  min-width: 0;
}

.grading-task-center__overview {
  display: grid;
  grid-template-columns: minmax(220px, 0.65fr) minmax(0, 1.35fr);
  gap: 18px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5eaf0;
}

.grading-task-picker {
  display: grid;
  align-content: start;
  gap: 8px;
}

.grading-task-picker label {
  color: #31445a;
  font-size: 13px;
  font-weight: 700;
}

.grading-task-picker select {
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid #d7e0e9;
  border-radius: 8px;
  background: #fff;
  color: #516174;
  font: inherit;
}

@media (max-width: 860px) {
  .grading-task-center__overview {
    grid-template-columns: 1fr;
  }
}
</style>
