<script setup>
defineProps({
  gradingForm: {
    type: Object,
    required: true,
  },
  gradingResult: {
    type: Object,
    default: null,
  },
  gradingLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit', 'clear', 'copy'])

const actions = {
  submit: () => emit('submit'),
  clear: () => emit('clear'),
  copy: () => emit('copy'),
}
</script>

<template>
  <div
    class="teacher-ai-grading-workspace assistant-workspace grading-workspace"
    :data-loading="gradingLoading"
    :data-has-result="Boolean(gradingResult)"
  >
    <slot name="input" :actions="actions" />
    <slot name="result" :actions="actions" />
  </div>
</template>
