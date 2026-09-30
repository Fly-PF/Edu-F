<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import JXG from 'jsxgraph'
import '../../../node_modules/jsxgraph/distrib/jsxgraph.css'

const props = defineProps({ scene: { type: Object, required: true } })
const emit = defineEmits(['update:t'])
const mainBoardHost = ref(null)
const areaBoardHost = ref(null)
const a = computed(() => Number(props.scene.a ?? -1))
const b = computed(() => Number(props.scene.b ?? 2))
const c = computed(() => Number(props.scene.c ?? 3))
const rootLeft = computed(() => Number(props.scene.rootLeft ?? -1))
const rootRight = computed(() => Number(props.scene.rootRight ?? 3))
const t = computed(() => Math.min(rootRight.value, Math.max(rootLeft.value, Number(props.scene.t ?? 1))))
const area = computed(() => Math.abs(rootRight.value - rootLeft.value) * Math.max(0, parabolaY(t.value)) / 2)
let mainBoard = null
let areaBoard = null
let parabola = null
let pointA = null
let pointB = null
let pointP = null
let baseLine = null
let triangle = null
let altitude = null
let areaCurve = null
let areaPoint = null

function parabolaY(x) {
  return a.value * x * x + b.value * x + c.value
}

function destroyBoards() {
  if (mainBoard) JXG.JSXGraph.freeBoard(mainBoard)
  if (areaBoard) JXG.JSXGraph.freeBoard(areaBoard)
  mainBoard = null
  areaBoard = null
}

function createBoards() {
  if (!mainBoardHost.value || !areaBoardHost.value) return
  destroyBoards()
  mainBoard = JXG.JSXGraph.initBoard(mainBoardHost.value, {
    boundingbox: [-1.5, 5.5, 3.6, -0.5],
    axis: true,
    keepaspectratio: true,
    showCopyright: false,
    showNavigation: false,
    pan: { enabled: false },
    zoom: { enabled: false },
  })
  parabola = mainBoard.create('functiongraph', [parabolaY, -1.5, 3.6], { strokeColor: '#7566bb', strokeWidth: 3, highlight: false })
  pointA = mainBoard.create('point', [rootLeft.value, 0], { name: `A(${rootLeft.value}, 0)`, fixed: true, size: 3, fillColor: '#3d3564', strokeColor: '#3d3564' })
  pointB = mainBoard.create('point', [rootRight.value, 0], { name: `B(${rootRight.value}, 0)`, fixed: true, size: 3, fillColor: '#3d3564', strokeColor: '#3d3564' })
  pointA.setAttribute({ label: { offset: [-16, 16] } })
  pointB.setAttribute({ label: { offset: [8, 16] } })
  baseLine = mainBoard.create('segment', [pointA, pointB], { strokeColor: '#3d3564', strokeWidth: 3, highlight: false })
  pointP = mainBoard.create('glider', [t.value, parabolaY(t.value), parabola], { name: 'P', size: 4, fillColor: '#e15b91', strokeColor: '#fff', strokeWidth: 2, highlight: false })
  triangle = mainBoard.create('polygon', [pointP, pointA, pointB], { fillColor: '#7566bb', fillOpacity: 0.18, borders: { strokeColor: '#7566bb', strokeWidth: 2 }, vertices: { visible: false }, highlight: false })
  const foot = mainBoard.create('point', [() => pointP.X(), 0], { visible: false, fixed: true })
  altitude = mainBoard.create('segment', [pointP, foot], { strokeColor: '#52aab4', strokeWidth: 2.5, dash: 2, highlight: false })
  pointP.on('drag', () => emit('update:t', Number(Math.min(rootRight.value, Math.max(rootLeft.value, pointP.X())).toFixed(3))))

  areaBoard = JXG.JSXGraph.initBoard(areaBoardHost.value, {
    boundingbox: [-0.2, 8.8, 3.2, -0.7],
    axis: true,
    showCopyright: false,
    showNavigation: false,
    pan: { enabled: false },
    zoom: { enabled: false },
  })
  areaCurve = areaBoard.create('functiongraph', [value => Math.abs(rootRight.value - rootLeft.value) * Math.max(0, parabolaY(value)) / 2, rootLeft.value, rootRight.value], { strokeColor: '#e15b91', strokeWidth: 3, highlight: false })
  areaPoint = areaBoard.create('point', [() => t.value, () => area.value], { name: '', fixed: true, size: 3, fillColor: '#52aab4', strokeColor: '#fff', strokeWidth: 2, highlight: false })
  syncScene()
}

function syncScene() {
  if (!mainBoard || !areaBoard || !pointP) return
  pointP.moveTo([t.value, parabolaY(t.value)])
  const highlighted = new Set(props.scene.highlight || [])
  const revealed = new Set(props.scene.revealed || [])
  parabola.setAttribute({ visible: revealed.has('parabola') })
  pointA.setAttribute({ visible: revealed.has('A') })
  pointB.setAttribute({ visible: revealed.has('B') })
  pointP.setAttribute({ visible: revealed.has('P') })
  baseLine.setAttribute({ visible: revealed.has('baseLine') })
  triangle.setAttribute({ visible: revealed.has('triangle') })
  areaCurve.setAttribute({ visible: revealed.has('areaChart') })
  areaPoint.setAttribute({ visible: revealed.has('areaChart') })
  baseLine.setAttribute({ strokeColor: highlighted.has('AB') ? '#db6d9b' : '#3d3564', strokeWidth: highlighted.has('AB') ? 4 : 3 })
  for (const border of triangle.borders) border.setAttribute({ visible: revealed.has('triangle'), strokeColor: highlighted.has('triangle') ? '#db6d9b' : '#7566bb', strokeWidth: highlighted.has('triangle') ? 3 : 2 })
  triangle.setAttribute({ fillColor: highlighted.has('triangle') ? '#db6d9b' : '#7566bb', fillOpacity: highlighted.has('triangle') ? 0.23 : 0.18 })
  pointP.setAttribute({ fillColor: highlighted.has('P') ? '#d83779' : '#e15b91' })
  altitude.setAttribute({ visible: revealed.has('altitude'), strokeColor: highlighted.has('altitude') ? '#de779f' : '#52aab4', strokeWidth: highlighted.has('altitude') ? 3.5 : 2.5 })
  areaCurve.setAttribute({ strokeWidth: highlighted.has('areaChart') ? 4 : 3 })
  mainBoard.update()
  areaBoard.update()
}

onMounted(createBoards)
watch(() => [props.scene.a, props.scene.b, props.scene.c, props.scene.rootLeft, props.scene.rootRight], createBoards)
watch(() => [props.scene.t, props.scene.showAltitude, JSON.stringify(props.scene.highlight || []), JSON.stringify(props.scene.revealed || [])], syncScene)
onBeforeUnmount(destroyBoards)
</script>

<template>
  <section class="scene-shell" aria-label="二次函数动点面积场景">
    <div class="scene-heading">
      <div><span class="scene-kicker">COORDINATE SCENE</span><h2>二次函数动点与三角形</h2></div>
      <div class="area-readout"><span>当前面积</span><strong>{{ area.toFixed(3) }}</strong></div>
    </div>
    <div class="board-grid">
      <div ref="mainBoardHost" class="jxgbox main-board" role="img" aria-label="二次函数、点 P 与三角形 PAB" />
      <section class="area-panel"><strong>面积函数 S(t)</strong><div ref="areaBoardHost" class="jxgbox area-board" role="img" aria-label="面积函数图像" /><span>y = {{ a }}t² + {{ b }}t + {{ c }}</span></section>
    </div>
  </section>
</template>

<style scoped>
.scene-shell{overflow:hidden;border:1px solid #3d3564;border-radius:8px;background:#fff;box-shadow:5px 6px 0 rgb(61 53 100 / 15%)}.scene-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #e6e1f0;background:#fbfbff}.scene-kicker{color:#746a9d;font-size:11px;font-weight:800}.scene-heading h2{margin:3px 0 0;color:#3d3564;font-size:19px}.area-readout{display:grid;gap:2px;min-width:100px;text-align:right}.area-readout span{color:#756d91;font-size:12px}.area-readout strong{color:#b34b7b;font-size:22px}.board-grid{display:grid;grid-template-columns:minmax(0,2fr) minmax(220px,1fr);gap:16px;padding:16px}.jxgbox{width:100%;border:1px solid #d7e0e9;background:#fff}.main-board{height:420px}.area-panel{display:grid;grid-template-rows:auto 1fr auto;gap:8px;min-height:0;padding:12px;border:1px solid #d7e0e9;border-radius:6px;background:#f8fbfd;color:#3d3564}.area-panel strong{font-size:15px}.area-panel span{color:#5c5775;font-size:13px;font-weight:700}.area-board{height:330px}@media(max-width:680px){.scene-heading{align-items:flex-start;padding:14px}.scene-heading h2{font-size:16px}.area-readout strong{font-size:18px}.board-grid{grid-template-columns:1fr;padding:12px}.main-board{height:330px}.area-board{height:260px}}
</style>


