<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ scene: { type: Object, required: true } })
const emit = defineEmits(['update:variable'])
const highlighted = computed(() => new Set(props.scene.highlight || []))
const showForce = computed(() => Boolean(props.scene.showForce))
const blockX = computed(() => 354 + Math.min(150, Math.max(0, Number(props.scene.blockPosition ?? 0) * 150)))
const force = computed(() => Math.max(0, Number(props.scene.force ?? 3.2)))
const dragging = ref(false)

function isHighlighted(id) { return highlighted.value.has(id) }
function moveBlock(event) {
  if (!dragging.value) return
  const svg = event.currentTarget.ownerSVGElement || event.currentTarget
  const rect = svg.getBoundingClientRect()
  emit('update:variable', { name: 'blockPosition', value: Math.min(1, Math.max(0, ((event.clientX - rect.left) / rect.width * 700 - 354) / 150)) })
}
function startBlockDrag(event) { dragging.value = true; event.currentTarget.setPointerCapture?.(event.pointerId); moveBlock(event) }
</script>

<template>
  <section class="scene-shell" aria-label="弹簧测力计拉动木块场景">
    <div class="scene-heading">
      <div><span class="scene-kicker">MECHANICS SCENE</span><h2>弹簧测力计拉动木块</h2></div>
      <div class="readouts"><span>拉力 F = {{ force.toFixed(1) }} N</span><strong>摩擦力 f = {{ force.toFixed(1) }} N</strong></div>
    </div>
    <svg class="scene-canvas" viewBox="0 0 700 360" role="img" aria-label="水平桌面上的弹簧测力计、木块、拉力和摩擦力" @pointermove="moveBlock" @pointerup="dragging = false" @pointercancel="dragging = false">
      <defs><pattern id="mechanics-grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e1e7ef" stroke-width="1" /></pattern><marker id="force-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M 0 0 L 8 4 L 0 8 z" fill="#df648e" /></marker></defs>
      <rect width="700" height="360" rx="8" fill="#fff" /><rect x="24" y="34" width="652" height="280" rx="6" fill="url(#mechanics-grid)" />
      <line x1="70" y1="260" x2="634" y2="260" class="ground" /><rect x="128" y="194" width="130" height="46" rx="6" class="dynamometer" /><line x1="258" y1="217" :x2="blockX" y2="217" class="rope" /><g class="draggable" @pointerdown.stop="startBlockDrag"><rect :x="blockX" y="184" width="78" height="64" rx="5" class="mass" /><text :x="blockX + 30" y="223" class="block-text">木块</text></g>
      <line x1="145" y1="217" x2="232" y2="217" class="scale" /><text x="148" y="181" class="scene-note">弹簧测力计</text><text x="161" y="225" class="formula-label">{{ force.toFixed(1) }} N</text><text x="72" y="291" class="scene-note">水平桌面</text>
      <g v-if="showForce"><line :x1="blockX + 84" y1="205" :x2="blockX + 176" y2="205" :class="['force-arrow', { active: isHighlighted('forceArrow') }]" marker-end="url(#force-arrow)" /><text :x="blockX + 100" y="184" class="force-label">F = {{ force.toFixed(1) }} N</text><line :x1="blockX - 6" y1="229" :x2="blockX - 99" y2="229" :class="['force-arrow', { active: isHighlighted('forceArrow') }]" marker-end="url(#force-arrow)" /><text :x="blockX - 96" y="251" class="force-label">f = {{ force.toFixed(1) }} N</text></g>
    </svg>
  </section>
</template>

<style scoped>
.scene-shell { overflow: hidden; border: 1px solid #3d3564; border-radius: 8px; background: #fff; box-shadow: 5px 6px 0 rgb(61 53 100 / 15%); }.scene-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #e6e1f0; background: #fbfbff; }.scene-kicker { color: #746a9d; font-size: 11px; font-weight: 800; }.scene-heading h2 { margin: 3px 0 0; color: #3d3564; font-size: 19px; }.readouts { display: grid; gap: 2px; color: #756d91; font-size: 12px; text-align: right; }.readouts strong { color: #b34b7b; font-size: 18px; }.scene-canvas { display: block; width: 100%; height: auto; }.ground { stroke: #8895a7; stroke-width: 3; }.dynamometer { fill: #eef5ff; stroke: #536b93; stroke-width: 2; }.rope { stroke: #536b93; stroke-width: 3; }.scale { stroke: #e15b91; stroke-width: 4; }.mass { fill: #52aab4; stroke: #2e6f76; stroke-width: 2; }.block-text { fill: #fff; font-size: 15px; font-weight: 800; }.scene-note { fill: #627189; font-size: 12px; }.force-arrow { stroke: #df648e; stroke-width: 3; }.force-arrow.active { stroke-width: 5; }.force-label { fill: #a73c66; font-size: 12px; font-weight: 800; }.formula-label { fill: #3d3564; font-size: 13px; font-weight: 700; }.draggable { cursor: grab; }
@media (max-width: 560px) { .scene-heading { align-items: flex-start; padding: 14px; }.scene-heading h2 { font-size: 16px; }.readouts strong { font-size: 16px; } }
</style>


