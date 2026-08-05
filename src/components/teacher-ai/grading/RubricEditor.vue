<script setup>
defineProps({
  rubric: {
    type: Array,
    required: true,
  },
  maxScore: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['add', 'remove', 'validate'])

const actions = {
  add: () => emit('add'),
  remove: (index) => emit('remove', index),
  validate: () => emit('validate'),
}
</script>

<template>
  <div
    class="teacher-ai-rubric-editor"
    :data-rubric-count="rubric.length"
    :data-max-score="maxScore"
  >
    <slot :actions="actions" />
  </div>
</template>

<style scoped>
.teacher-ai-rubric-editor {
  display: contents;
}
</style>
