<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ definition: { type: Object, required: true }, scene: { type: Object, required: true } })
const emit = defineEmits(['update:entity'])
const draggingBar = ref('')
const entities = computed(() => props.scene.entities || props.definition.entities || [])
const bars = computed(() => entities.value.filter(item => item.type === 'bar'))
const linePoints = computed(() => entities.value.filter(item => item.type === 'linePoint').sort((a, b) => Number(a.x) - Number(b.x)))
const sectors = computed(() => entities.value.filter(item => item.type === 'sector'))
const maxValue = computed(() => Math.max(1, ...bars.value.map(item => Number(item.value) || 0)))
const lineMaxX = computed(() => Math.max(1, ...linePoints.value.map(item => Number(item.x) || 0)))
const lineMaxY = computed(() => Math.max(1, ...linePoints.value.map(item => Number(item.y) || 0)))
const linePath = computed(() => linePoints.value.map((item, index) => `${index ? 'L' : 'M'} ${72 + (Number(item.x) || 0) / lineMaxX.value * 590} ${350 - (Number(item.y) || 0) / lineMaxY.value * 260}`).join(' '))
const pieSlices = computed(() => { let start = -Math.PI / 2; const total = Math.max(1, sectors.value.reduce((sum, item) => sum + (Number(item.value) || 0), 0)); return sectors.value.map((item, index) => { const end = start + (Number(item.value) || 0) / total * Math.PI * 2; const x1 = 360 + Math.cos(start) * 120; const y1 = 210 + Math.sin(start) * 120; const x2 = 360 + Math.cos(end) * 120; const y2 = 210 + Math.sin(end) * 120; const path = `M 360 210 L ${x1} ${y1} A 120 120 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`; start = end; return { ...item, path, color: ['#5b8fd1', '#e15b91', '#52aab4', '#d99b48'][index % 4] } }) })
function startBar(event, id) { draggingBar.value = id; event.currentTarget.setPointerCapture?.(event.pointerId) }
function dragBar(event) {
  if (!draggingBar.value || !bars.value.length) return
  const svg = event.currentTarget
  const rect = svg.getBoundingClientRect()
  const y = (event.clientY - rect.top) / rect.height * 420
  emit('update:entity', { id: draggingBar.value, changes: { value: Number(Math.max(0, Math.min(maxValue.value * 1.2, (350 - y) / 260 * maxValue.value)).toFixed(2)) } })
}
</script>

<template>
  <section class="scene-shell"><header><strong>统计图表</strong><span>拖动柱形调整数据</span></header><svg viewBox="0 0 720 420" role="img" aria-label="统计图表" @pointermove="dragBar" @pointerup="draggingBar = ''" @pointercancel="draggingBar = ''"><template v-if="bars.length"><line x1="72" y1="350" x2="680" y2="350"/><line x1="72" y1="42" x2="72" y2="350"/><g v-for="(bar,index) in bars" :key="bar.id"><rect :x="96 + index * 92" :y="350 - (Number(bar.value) || 0) / maxValue * 260" width="56" :height="(Number(bar.value) || 0) / maxValue * 260" class="draggable-bar" @pointerdown.stop="startBar($event, bar.id)"/><text :x="124 + index * 92" y="378">{{ bar.label || index + 1 }}</text><text :x="124 + index * 92" :y="338 - (Number(bar.value) || 0) / maxValue * 260">{{ bar.value }}</text></g></template><template v-else-if="linePoints.length"><line x1="72" y1="350" x2="680" y2="350"/><line x1="72" y1="42" x2="72" y2="350"/><path :d="linePath"/><circle v-for="item in linePoints" :key="item.id" :cx="72 + Number(item.x) / lineMaxX * 590" :cy="350 - Number(item.y) / lineMaxY * 260" r="5"/><text v-for="item in linePoints" :key="`${item.id}-label`" :x="72 + Number(item.x) / lineMaxX * 590" y="378">{{ item.label || item.x }}</text></template><template v-else-if="sectors.length"><path v-for="slice in pieSlices" :key="slice.id" :d="slice.path" :fill="slice.color"/><text v-for="(slice,index) in pieSlices" :key="`${slice.id}-label`" x="560" :y="120 + index * 32">{{ slice.label }} {{ slice.value }}</text></template><text v-else x="360" y="210" class="empty">AI 将根据题干生成统计数据图</text></svg></section>
</template>

<style scoped>
.scene-shell{overflow:hidden;border:1px solid #3d3564;border-radius:8px;background:#fff}.scene-shell header{display:flex;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #e6e1f0;color:#3d3564}.scene-shell header span{color:#718096;font-size:12px}.scene-shell svg{display:block;width:100%;height:auto;min-height:320px}.scene-shell line{stroke:#64748b;stroke-width:2}.scene-shell rect{fill:#5b8fd1}.scene-shell .draggable-bar{cursor:ns-resize}.scene-shell path{fill:none;stroke:#e15b91;stroke-width:3}.scene-shell circle{fill:#e15b91}.scene-shell text{fill:#405068;font-size:16px;text-anchor:middle}.scene-shell .empty{fill:#718096}
</style>
