<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const props = defineProps({ title: { type: String, required: true }, definition: { type: Object, required: true }, scene: { type: Object, required: true } })
const host = ref(null)
let renderer; let animationFrame

function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0 }
function vector(value) { return new THREE.Vector3(number(value?.x), number(value?.y), number(value?.z)) }
function addLabel(scene, label, position) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128
  const context = canvas.getContext('2d'); context.fillStyle = '#334155'; context.font = 'bold 34px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(label, 256, 64)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true })); sprite.position.set(...position); sprite.scale.set(4.6, 1.15, 1); scene.add(sprite)
}
function renderScene() {
  if (!host.value) return
  renderer?.dispose()
  host.value.replaceChildren()
  const width = host.value.clientWidth || 640; const height = host.value.clientHeight || 420
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(width, height)
  host.value.append(renderer.domElement)
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#ffffff')
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100); camera.position.set(7, 6, 9)
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.target.set(0, 0, 0)
  if (props.definition.visualModel === 'cubeVolume') {
    camera.position.set(7.5, 6.5, 9.5); controls.target.set(0, 0, 0)
    scene.add(new THREE.HemisphereLight('#ffffff', '#d5e0ea', 2))
    const light = new THREE.DirectionalLight('#ffffff', 2); light.position.set(5, 7, 6); scene.add(light)
    for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
      const cube = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 1.15), new THREE.MeshLambertMaterial({ color: '#78b8bd', transparent: true, opacity: .48 }))
      cube.position.set(x * 1.18, y * 1.18, z * 1.18); scene.add(cube)
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: '#286e75' })); edges.position.copy(cube.position); scene.add(edges)
    }
    addLabel(scene, '大正方体边长 6 cm = 3 × 2 cm', [0, 2.5, 0])
    addLabel(scene, '3 × 3 × 3 = 27 个小正方体', [0, -2.55, 0])
  } else {
    scene.add(new THREE.GridHelper(10, 10, '#dce4ef', '#edf2f7'))
    const axes = new THREE.AxesHelper(4); scene.add(axes)
  const labels = [['X', [4.25, 0, 0]], ['Y', [0, 4.25, 0]], ['Z', [0, 0, 4.25]]]
  for (const [label, position] of labels) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256
    const context = canvas.getContext('2d'); context.fillStyle = '#334155'; context.font = 'bold 64px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(label, 128, 128)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) })); sprite.position.set(...position); sprite.scale.set(.55, .55, 1); scene.add(sprite)
  }
  const points = Object.fromEntries((props.scene.entities || props.definition.entities || []).filter(item => item.type === 'point').map(item => [item.id, vector(item)]))
  for (const item of props.scene.entities || props.definition.entities || []) {
    if (item.type === 'point') { const dot = new THREE.Mesh(new THREE.SphereGeometry(.11, 18, 12), new THREE.MeshBasicMaterial({ color: '#e15b91' })); dot.position.copy(points[item.id]); scene.add(dot) }
    if (item.type === 'segment') { const from = points[item.from]; const to = points[item.to]; if (from && to) scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([from, to]), new THREE.LineBasicMaterial({ color: '#3974c9' }))) }
    if (item.type === 'polygon' && Array.isArray(item.points)) { const vertices = item.points.map(id => points[id]).filter(Boolean); if (vertices.length > 2) scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices), new THREE.LineBasicMaterial({ color: '#3974c9' }))) }
  }
  }
  const frame = () => { controls.update(); renderer.render(scene, camera); animationFrame = requestAnimationFrame(frame) }; frame()
}
function destroy() { cancelAnimationFrame(animationFrame); renderer?.dispose(); renderer = null }
onMounted(renderScene)
watch(() => [props.scene.entities, props.definition.entities], () => { destroy(); renderScene() }, { deep: true })
onBeforeUnmount(destroy)
</script>

<template>
  <section class="scene-shell"><header><strong>{{ title }}</strong><span>可拖动旋转</span></header><div ref="host" class="scene-canvas" role="img" :aria-label="title" /></section>
</template>

<style scoped>
.scene-shell{overflow:hidden;border:1px solid #3d3564;border-radius:8px;background:#fff}.scene-shell header{display:flex;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #e6e1f0;color:#3d3564}.scene-shell header span{color:#718096;font-size:12px}.scene-canvas{width:100%;height:450px;touch-action:none}@media(max-width:560px){.scene-canvas{height:320px}}
</style>
