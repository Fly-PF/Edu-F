<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ definition: { type: Object, required: true }, scene: { type: Object, required: true } })
const emit = defineEmits(['update:entity'])
const draggingNode = ref('')
const entities = computed(() => props.scene.entities || props.definition.entities || [])
const nodes = computed(() => entities.value.filter(item => item.type === 'node'))
const nodeById = computed(() => Object.fromEntries(nodes.value.map(item => [item.id, item])))
const branches = computed(() => entities.value.filter(item => item.type === 'branch').map(item => ({ ...item, fromNode: nodeById.value[item.from], toNode: nodeById.value[item.to] })).filter(item => item.fromNode && item.toNode))
function point(event) {
  const svg = event.currentTarget.ownerSVGElement || event.currentTarget
  const rect = svg.getBoundingClientRect()
  return { x: Math.max(20, Math.min(700, (event.clientX - rect.left) / rect.width * 720)), y: Math.max(20, Math.min(400, (event.clientY - rect.top) / rect.height * 420)) }
}
function startDrag(event, id) { draggingNode.value = id; event.currentTarget.setPointerCapture?.(event.pointerId) }
function drag(event) { if (draggingNode.value) emit('update:entity', { id: draggingNode.value, changes: point(event) }) }
function stopDrag() { draggingNode.value = '' }
</script>

<template>
  <section class="scene-shell"><header><strong>概率树状图</strong><span>拖动节点调整布局</span></header><svg viewBox="0 0 720 420" role="img" aria-label="概率树状图" @pointermove="drag" @pointerup="stopDrag" @pointercancel="stopDrag"><g v-for="branch in branches" :key="branch.id"><line :x1="branch.fromNode.x" :y1="branch.fromNode.y" :x2="branch.toNode.x" :y2="branch.toNode.y"/><text :x="(Number(branch.fromNode.x) + Number(branch.toNode.x)) / 2" :y="(Number(branch.fromNode.y) + Number(branch.toNode.y)) / 2 - 9">{{ branch.label }}</text></g><g v-for="node in nodes" :key="node.id"><circle :cx="node.x" :cy="node.y" r="9" class="draggable-node" @pointerdown.stop="startDrag($event, node.id)"/><text :x="Number(node.x) + 10" :y="Number(node.y) - 8" class="node-label">{{ node.label || node.id }}</text></g><text v-if="!nodes.length" x="360" y="210" class="empty">AI 将根据题干生成概率分支</text></svg></section>
</template>

<style scoped>
.scene-shell{overflow:hidden;border:1px solid #3d3564;border-radius:8px;background:#fff}.scene-shell header{display:flex;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #e6e1f0;color:#3d3564}.scene-shell header span{color:#718096;font-size:12px}.scene-shell svg{display:block;width:100%;height:auto;min-height:320px}.scene-shell line{stroke:#3974c9;stroke-width:2}.scene-shell circle{fill:#e15b91}.scene-shell .draggable-node{cursor:grab}.scene-shell text{fill:#405068;font-size:14px;text-anchor:middle}.scene-shell .node-label{text-anchor:start}.scene-shell .empty{fill:#718096}
</style>
