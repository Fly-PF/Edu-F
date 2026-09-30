<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import JXG from 'jsxgraph'
import '../../../node_modules/jsxgraph/distrib/jsxgraph.css'

const props = defineProps({ definition: { type: Object, required: true }, scene: { type: Object, required: true } })
const emit = defineEmits(['update:series-point'])
const boardHost = ref(null)
let board = null
let curves = []

function bounds(series) {
  const points = series.flatMap(item => item.points || []).filter(point => Array.isArray(point) && point.length >= 2)
  if (!points.length) return [-1, 5, 5, -1]
  const xs = points.map(point => Number(point[0]) || 0)
  const ys = points.map(point => Number(point[1]) || 0)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const padding = Math.max(1, (Math.max(maxX - minX, maxY - minY) || 1) * 0.2)
  return [minX - padding, maxY + padding, maxX + padding, minY - padding]
}

function destroyBoard() {
  if (!board) return
  JXG.JSXGraph.freeBoard(board)
  board = null
  curves = []
}

function createBoard() {
  destroyBoard()
  if (!boardHost.value) return
  const series = props.scene.series || props.definition.series || []
  board = JXG.JSXGraph.initBoard(boardHost.value, {
    boundingbox: bounds(series),
    axis: true,
    showCopyright: false,
    showNavigation: false,
    pan: { enabled: false },
    zoom: { enabled: false },
  })
  for (const item of series) {
    const points = (item.points || []).filter(point => Array.isArray(point) && point.length >= 2)
    if (points.length < 2) continue
    const curve = board.create('curve', [points.map(point => Number(point[0]) || 0), points.map(point => Number(point[1]) || 0)], {
      strokeColor: item.color || '#3974c9',
      strokeWidth: 3,
      highlight: false,
    })
    curves.push([item.id, curve])
    points.forEach((point, index) => {
      const handle = board.create('point', [Number(point[0]) || 0, Number(point[1]) || 0], { name: '', size: 3, fillColor: '#e15b91', strokeColor: '#fff', strokeWidth: 2, fixed: false })
      handle.on('up', () => emit('update:series-point', { seriesId: item.id, pointIndex: index, point: [Number(handle.X().toFixed(3)), Number(handle.Y().toFixed(3))] }))
    })
  }
  syncScene()
}

function syncScene() {
  if (!board) return
  const revealed = new Set(props.scene.revealed || [])
  for (const [id, curve] of curves) curve.setAttribute({ visible: revealed.has(id) })
  board.update()
}

onMounted(createBoard)
watch(() => [props.definition, props.scene.series], createBoard, { deep: true })
watch(() => JSON.stringify(props.scene.revealed || []), syncScene)
onBeforeUnmount(destroyBoard)
</script>

<template>
  <section class="scene-shell">
    <header><strong>数据图像场景</strong><span>拖动曲线数据点</span></header>
    <div ref="boardHost" class="jxgbox" role="img" aria-label="数据图像" />
  </section>
</template>

<style scoped>
.scene-shell{overflow:hidden;border:1px solid #3d3564;border-radius:8px;background:#fff}.scene-shell header{display:flex;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #e6e1f0;color:#3d3564}.scene-shell header span{color:#718096;font-size:12px}.jxgbox{width:100%;height:450px;border:0;background:#fff}@media(max-width:560px){.jxgbox{height:320px}}
</style>


