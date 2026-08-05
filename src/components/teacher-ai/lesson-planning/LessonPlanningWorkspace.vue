<script setup>
defineProps({
  lessonForm: {
    type: Object,
    required: true,
  },
  lessonResult: {
    type: Object,
    default: null,
  },
  lessonLoading: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <div
    class="teacher-ai-lesson-planning-workspace assistant-workspace"
    :data-loading="lessonLoading"
    :data-has-result="Boolean(lessonResult)"
  >
    <slot />
  </div>
</template>

