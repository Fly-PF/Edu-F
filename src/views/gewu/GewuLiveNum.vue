<script setup>
import { ref } from 'vue'

const props = defineProps({
  value: { type: Number, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  step: { type: Number, default: 1 },
  fmt: { type: Function, default: null },
  label: { type: String, default: '参数' },
})

const emit = defineEmits(['change'])
const drag = ref(null)

function normalize(value) {
  const clamped = Math.min(props.max, Math.max(props.min, value))
  return Math.round(clamped / props.step) * props.step
}

function changeBy(offset) {
  emit('change', normalize(props.value + offset))
}

function handlePointerDown(event) {
  event.preventDefault()
  drag.value = { startX: event.clientX, startValue: props.value }
  event.currentTarget.setPointerCapture(event.pointerId)
}

function handlePointerMove(event) {
  if (!drag.value) return

  const offset = Math.round((event.clientX - drag.value.startX) / 14) * props.step
  emit('change', normalize(drag.value.startValue + offset))
}

function handlePointerUp(event) {
  drag.value = null
  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId)
  }
}

function handleKeydown(event) {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
    event.preventDefault()
    changeBy(-props.step)
  } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
    event.preventDefault()
    changeBy(props.step)
  } else if (event.key === 'Home') {
    event.preventDefault()
    emit('change', props.min)
  } else if (event.key === 'End') {
    event.preventDefault()
    emit('change', props.max)
  }
}
</script>

<template>
  <span
    class="live-num"
    role="slider"
    tabindex="0"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="value"
    :aria-valuetext="fmt ? fmt(value) : String(value)"
    :aria-label="label"
    aria-orientation="horizontal"
    :title="`拖动调节${label}`"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
    @keydown="handleKeydown"
  >{{ fmt ? fmt(value) : String(value) }}</span>
</template>
