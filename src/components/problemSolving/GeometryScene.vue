<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import JXG from 'jsxgraph'
import '../../../node_modules/jsxgraph/distrib/jsxgraph.css'

const props = defineProps({ title: { type: String, default: '平面几何' }, definition: { type: Object, required: true }, scene: { type: Object, required: true } })
const emit = defineEmits(['update:entity'])
const boardHost = ref(null)
let board = null
let elements = []

function bounds(points) {
  if (!points.length) return [-1, 5, 7, -1]
  const xs = points.map(point => Number(point.x) || 0)
  const ys = points.map(point => Number(point.y) || 0)
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
  elements = []
}

function createBoard() {
  destroyBoard()
  if (!boardHost.value) return
  const entities = props.scene.entities || props.definition.entities || []
  const points = entities.filter(item => item.type === 'point')
  board = JXG.JSXGraph.initBoard(boardHost.value, {
    boundingbox: bounds(points),
    axis: true,
    showCopyright: false,
    showNavigation: false,
    pan: { enabled: false },
    zoom: { enabled: false },
  })
  const pointMap = Object.fromEntries(points.map(item => {
    const element = board.create('point', [Number(item.x) || 0, Number(item.y) || 0], {
      name: item.label || item.id,
      fixed: item.fixed === true,
      size: 3,
      fillColor: '#e15b91',
      strokeColor: '#e15b91',
      label: { offset: [8, -8], fontSize: 14 },
    })
    if (item.fixed !== true) element.on('up', () => emit('update:entity', { id: item.id, changes: { x: Number(element.X().toFixed(3)), y: Number(element.Y().toFixed(3)) } }))
    elements.push([item.id, element])
    return [item.id, element]
  }))
  for (const curve of entities.filter(item => item.type === 'function')) {
    const createCurve = (from, to) => {
      const fn = curve.kind === 'inverse'
        ? value => Number(curve.coefficient) / value
        : value => Number(curve.slope) * value + Number(curve.intercept)
      const element = board.create('functiongraph', [fn, from, to], {
        strokeColor: curve.color || '#7566bb', strokeWidth: 3, highlight: false,
      })
      elements.push([curve.id, element])
    }
    const domain = curve.domain || [-5, 5]
    if (curve.kind === 'inverse') {
      createCurve(domain[0], -0.2)
      createCurve(0.2, domain[1])
    } else {
      createCurve(domain[0], domain[1])
    }
    if (curve.label) {
      const label = board.create('text', [curve.labelX ?? domain[1] - 1, curve.labelY ?? 0, curve.label], {
        fontSize: 14, strokeColor: curve.color || '#7566bb', fixed: true,
      })
      elements.push([curve.id, label])
    }
  }
  for (const segment of entities.filter(item => item.type === 'segment' || item.type === 'line')) {
    const ends = (segment.points || [segment.from, segment.to]).map(id => pointMap[id]).filter(Boolean)
    if (ends.length === 2) {
      const element = board.create('line', ends, { straightFirst: segment.type === 'line', straightLast: segment.type === 'line', strokeColor: '#3974c9', strokeWidth: 2, highlight: false })
      elements.push([segment.id, element])
    }
  }
  for (const polygon of entities.filter(item => item.type === 'polygon')) {
    const vertices = (polygon.points || []).map(id => pointMap[id]).filter(Boolean)
    if (vertices.length >= 3) {
      const element = board.create('polygon', vertices, {
      fillColor: '#b9d7ff',
      fillOpacity: 0.4,
      borders: { strokeColor: '#3974c9', strokeWidth: 2 },
      vertices: { visible: false },
    })
      elements.push([polygon.id, element])
    }
  }
  for (const circle of entities.filter(item => item.type === 'circle')) {
    const center = pointMap[circle.center]
    if (center && Number.isFinite(Number(circle.radius))) {
      const element = board.create('circle', [center, Number(circle.radius)], { strokeColor: '#3974c9', strokeWidth: 2, fillColor: '#b9d7ff', fillOpacity: 0.2, highlight: false })
      elements.push([circle.id, element])
    }
  }
  syncScene()
}

function syncScene() {
  if (!board) return
  const revealed = new Set(props.scene.revealed || [])
  for (const [id, element] of elements) {
    element.setAttribute({ visible: revealed.has(id) })
    for (const border of element.borders || []) border.setAttribute({ visible: revealed.has(id) })
  }
  board.update()
}

onMounted(createBoard)
watch(() => [props.definition, props.scene.entities], createBoard, { deep: true })
watch(() => JSON.stringify(props.scene.revealed || []), syncScene)
onBeforeUnmount(destroyBoard)
</script>

<template>
  <section class="scene-shell">
    <header><strong>{{ title }}</strong><span>拖动顶点观察变化</span></header>
    <div ref="boardHost" class="jxgbox" role="img" aria-label="平面几何图形" />
  </section>
</template>

<style scoped>
.scene-shell{overflow:hidden;border:1px solid #3d3564;border-radius:8px;background:#fff}.scene-shell header{display:flex;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #e6e1f0;color:#3d3564}.scene-shell header span{color:#718096;font-size:12px}.jxgbox{width:100%;height:450px;border:0;background:#fff}@media(max-width:560px){.jxgbox{height:320px}}
</style>
