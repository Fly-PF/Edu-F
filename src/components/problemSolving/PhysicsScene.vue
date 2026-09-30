<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import Matter from 'matter-js'

const props = defineProps({ definition: { type: Object, required: true }, scene: { type: Object, required: true } })
const emit = defineEmits(['update:variable'])

const width = 700
const height = 380
const sceneType = computed(() => props.definition.sceneType)
const active = computed(() => new Set(props.scene.physicsActions || []))
const dragging = ref('')
const collision = ref({ first: 145, second: 470, phase: '碰前' })
let collisionFrame = 0
const title = computed(() => ({
  physicsInclinedPlane: '斜面机械效率', physicsCollision: '水平碰撞', physicsPulley: '动滑轮',
  physicsReflection: '光的反射', physicsMagneticField: '通电螺线管', physicsCircuit: '串联电路',
}[sceneType.value] || '物理场景'))
function shown(action) { return active.value.has(action) }
function value(name, fallback) { return Number.isFinite(Number(props.scene[name])) ? Number(props.scene[name]) : fallback }
function clamp(number, min, max) { return Math.min(max, Math.max(min, number)) }
function point(event) {
  const svg = event.currentTarget.ownerSVGElement || event.currentTarget
  const rect = svg.getBoundingClientRect()
  return { x: (event.clientX - rect.left) / rect.width * width, y: (event.clientY - rect.top) / rect.height * height }
}
function update(name, next) { emit('update:variable', { name, value: Number(next.toFixed(3)) }) }
function beginDrag(event, name) { dragging.value = name; event.currentTarget.setPointerCapture?.(event.pointerId) }
function drag(event) {
  if (!dragging.value) return
  const current = point(event)
  if (dragging.value === 'inclinePosition') update('inclinePosition', clamp((current.x - 190) / 240, 0, 1))
  if (dragging.value === 'ropeEnd') update('ropeEnd', clamp((current.y - 274) / 72, 0, 1))
  if (dragging.value === 'incidentAngle') update('incidentAngle', clamp((192 - current.y) / 2.6, 15, 75))
  if (dragging.value === 'currentDirection') update('currentDirection', current.y < 194 ? 1 : -1)
  if (dragging.value === 'r2') update('r2', clamp((current.x - 360) / 12, 1, 20))
  if (dragging.value === 'collision') collision.value = { ...collision.value, first: clamp(current.x, 90, collision.value.second - 64), phase: '准备碰撞' }
}
function endDrag() { const name = dragging.value; dragging.value = ''; if (name === 'collision') launchCollision() }
const incline = computed(() => { const p = value('inclinePosition', .5); return { x: 190 + p * 240, y: 260 - p * 135 } })
const ropeEnd = computed(() => value('ropeEnd', 0))
const pulley = computed(() => { const y = 154 - ropeEnd.value * 36; return { y, left: y + 48, blockY: y + 92, freeEndY: y + 120 + ropeEnd.value * 72 } })
const inclineForce = computed(() => value('force', 45))
const inclineWeight = computed(() => value('weight', 120))
const inclineHeight = computed(() => value('height', 1.5))
const inclineDistance = computed(() => value('distance', 5))
const pulleyWeight = computed(() => value('weight', 240))
const pulleyForce = computed(() => value('force', 100))
const pulleyHeight = computed(() => value('height', 2))
const pulleyDistance = computed(() => value('distance', 6))
const incidentAngle = computed(() => value('incidentAngle', 60))
const reflection = computed(() => {
  const run = 90; const rise = Math.tan(incidentAngle.value * Math.PI / 180) * run
  return { sourceX: 350 - run, incidentY: 192 - rise, reflectedY: 192 + rise }
})
const clockwise = computed(() => value('currentDirection', 1) < 0)
const r1 = computed(() => value('r1', 4))
const r2 = computed(() => value('r2', 8))
const voltage = computed(() => value('voltage', 12))
const current = computed(() => voltage.value / (r1.value + r2.value))
const collisionStage = computed(() => ({ 'show-before-state': '碰前', 'show-collision': '碰撞中', 'show-after-state': '碰后' }[props.scene.physicsCollisionState] || collision.value.phase))
const mass1 = computed(() => value('mass1', 1))
const mass2 = computed(() => value('mass2', 1))
const speed1 = computed(() => value('speed1', 4))
const speed2 = computed(() => value('speed2', 0))
const restitution = computed(() => value('restitution', 1))
const collisionPositions = computed(() => collisionStage.value === '碰撞中'
  ? { first: 320, second: 380 }
  : collision.value)
function launchCollision() {
  cancelAnimationFrame(collisionFrame)
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } })
  const first = Matter.Bodies.circle(collision.value.first, 220, 30, { restitution: restitution.value, frictionAir: 0 })
  const second = Matter.Bodies.circle(collision.value.second, 220, 30, { restitution: restitution.value, frictionAir: 0 })
  Matter.Body.setMass(first, mass1.value)
  Matter.Body.setMass(second, mass2.value)
  Matter.Composite.add(engine.world, [first, second])
  Matter.Body.setVelocity(first, { x: speed1.value, y: 0 })
  Matter.Body.setVelocity(second, { x: speed2.value, y: 0 })
  const tick = () => {
    Matter.Engine.update(engine, 1000 / 60)
    collision.value = { first: first.position.x, second: second.position.x, phase: second.velocity.x > .2 ? '碰后' : '碰撞中' }
    if (second.position.x < 610) collisionFrame = requestAnimationFrame(tick)
  }
  collisionFrame = requestAnimationFrame(tick)
}
onBeforeUnmount(() => cancelAnimationFrame(collisionFrame))
</script>

<template>
  <section class="scene-shell" :aria-label="`${title}场景`">
    <header><div><span>PHYSICS SCENE</span><h2>{{ title }}</h2></div><small>{{ active.size ? '已展示物理量' : '固定装置图' }}</small></header>
    <svg class="scene-canvas" :viewBox="`0 0 ${width} ${height}`" role="img" @pointermove="drag" @pointerup="endDrag" @pointercancel="endDrag" @pointerleave="endDrag">
      <defs>
        <marker id="physics-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#df648e" /></marker>
        <marker id="physics-mint-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8z" fill="#52aab4" /></marker>
        <pattern id="physics-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#edf0f5" /></pattern>
      </defs>
      <rect width="700" height="380" fill="url(#physics-grid)" />

      <g v-if="sceneType === 'physicsInclinedPlane'">
        <path d="M105 305 L510 305 L510 90 Z" class="incline" />
        <g :transform="`translate(${incline.x} ${incline.y}) rotate(-28)`" class="draggable" @pointerdown.stop="beginDrag($event, 'inclinePosition')"><rect x="-38" y="-27" width="76" height="54" rx="5" class="block" /><text x="-7" y="7" class="block-text">m</text></g>
        <path d="M450 305 A58 58 0 0 0 459 277" class="angle" /><text x="465" y="292">θ</text><text x="86" y="338" class="caption">斜面</text>
        <g v-if="shown('show-gravity')"><line :x1="incline.x" :y1="incline.y" :x2="incline.x" :y2="incline.y + 97" class="force" marker-end="url(#physics-arrow)" /><text :x="incline.x + 10" :y="incline.y + 79">G={{ inclineWeight }} N</text></g>
        <g v-if="shown('show-normal')"><line :x1="incline.x" :y1="incline.y" :x2="incline.x - 52" :y2="incline.y - 98" class="force mint" marker-end="url(#physics-mint-arrow)" /><text :x="incline.x - 75" :y="incline.y - 78">N</text></g>
        <g v-if="shown('show-pulling-force')"><line :x1="incline.x" :y1="incline.y" :x2="incline.x + 69" :y2="incline.y - 37" class="force mint" marker-end="url(#physics-mint-arrow)" /><text :x="incline.x + 55" :y="incline.y - 51">F={{ inclineForce }} N</text></g>
        <g v-if="shown('show-friction')"><line :x1="incline.x" :y1="incline.y" :x2="incline.x - 60" :y2="incline.y + 32" class="force" marker-end="url(#physics-arrow)" /><text :x="incline.x - 75" :y="incline.y + 47">f</text><text x="122" y="115" class="formula-text">h={{ inclineHeight }} m，s={{ inclineDistance }} m</text></g>
      </g>

      <g v-else-if="sceneType === 'physicsCollision'">
        <line x1="48" y1="252" x2="652" y2="252" class="track" /><text x="48" y="322" class="caption">水平桌面上的一维碰撞</text>
        <circle :cx="collisionPositions.first" cy="220" r="30" class="ball first draggable" @pointerdown.stop="beginDrag($event, 'collision')" /><circle :cx="collisionPositions.second" cy="220" r="30" class="ball second" /><text :x="collisionPositions.first - 5" y="226" class="ball-text">A</text><text :x="collisionPositions.second - 5" y="226" class="ball-text">B</text><line v-if="collisionStage === '碰前'" :x1="collisionPositions.first - 65" y1="165" :x2="collisionPositions.first + 25" y2="165" class="velocity" marker-end="url(#physics-arrow)" /><text v-if="collisionStage === '碰前'" :x="collisionPositions.first - 54" y="150">vA=4 m/s</text><line v-if="collisionStage === '碰后'" :x1="collisionPositions.second - 35" y1="165" :x2="collisionPositions.second + 55" y2="165" class="velocity" marker-end="url(#physics-arrow)" /><text v-if="collisionStage === '碰后'" :x="collisionPositions.second - 24" y="150">vB 向右</text><g v-if="collisionStage === '碰撞中'"><line x1="340" y1="185" x2="285" y2="185" class="force" marker-end="url(#physics-arrow)" /><line x1="360" y1="185" x2="415" y2="185" class="force mint" marker-end="url(#physics-mint-arrow)" /><text x="265" y="173">B 对 A 的力</text><text x="396" y="173">A 对 B 的力</text><text x="350" y="130" class="formula-text">大小相等，方向相反</text></g><text x="82" y="106" class="state-label">{{ collisionStage }}</text><text x="350" y="356" class="formula-text">A、B 质量相等；力作用在不同物体上</text>
      </g>

      <g v-else-if="sceneType === 'physicsPulley'">
        <line x1="120" y1="58" x2="580" y2="58" class="beam" /><line x1="260" y1="58" x2="260" :y2="pulley.y + 48" class="rope" /><path :d="`M300 58 V${pulley.y} A51 51 0 0 0 402 ${pulley.y} V${pulley.freeEndY}`" class="rope" /><circle cx="351" :cy="pulley.y" r="48" class="pulley" /><circle cx="351" :cy="pulley.y" r="7" class="hub" /><line x1="351" :y1="pulley.y + 48" x2="351" :y2="pulley.blockY" class="load-link" /><rect x="317" :y="pulley.blockY" width="68" height="62" rx="5" class="block" /><text x="335" :y="pulley.blockY + 36" class="block-text">G={{ pulleyWeight }}N</text><text x="214" y="346" class="caption">三段绳子承重：拉力移动距离 s = 3h</text><text x="216" y="84" class="caption">固定端</text>
        <g v-if="shown('show-tension')"><line x1="260" :y1="pulley.y + 60" x2="260" :y2="pulley.y + 22" class="force mint" marker-end="url(#physics-mint-arrow)" /><line x1="300" :y1="pulley.y + 62" x2="300" :y2="pulley.y + 9" class="force mint" marker-end="url(#physics-mint-arrow)" /><line x1="402" :y1="pulley.y + 62" x2="402" :y2="pulley.y + 9" class="force mint" marker-end="url(#physics-mint-arrow)" /><text x="245" :y="pulley.y + 24">T</text><text x="278" :y="pulley.y + 24">T</text><text x="408" :y="pulley.y + 24">T</text></g>
        <g v-if="shown('show-weight')"><line x1="351" :y1="pulley.blockY + 31" x2="351" :y2="pulley.blockY + 100" class="force" marker-end="url(#physics-arrow)" /><text x="361" :y="pulley.blockY + 88">G={{ pulleyWeight }} N</text></g>
        <g class="draggable" @pointerdown.stop="beginDrag($event, 'ropeEnd')"><circle cx="402" :cy="pulley.freeEndY" r="12" class="handle" /><text x="418" :y="pulley.freeEndY + 5" class="caption">自由端</text></g><g v-if="shown('show-force-balance')"><line x1="402" :y1="pulley.freeEndY" x2="402" :y2="pulley.freeEndY + 62" class="force" marker-end="url(#physics-arrow)" /><text x="412" :y="pulley.freeEndY + 50">F={{ pulleyForce }} N</text><text x="442" :y="pulley.y + 70" class="formula-text">h={{ pulleyHeight }}m，s={{ pulleyDistance }}m</text><text x="442" :y="pulley.y + 92" class="formula-text">η = Gh / Fs</text></g>
      </g>

      <g v-else-if="sceneType === 'physicsReflection'">
        <line x1="350" y1="48" x2="350" y2="332" class="mirror" /><text x="364" y="82">平面镜</text><circle cx="350" cy="192" r="4" class="point" />
        <g v-if="shown('show-normal')"><line x1="80" y1="192" x2="620" y2="192" class="normal" /><text x="540" y="184">法线</text></g>
        <g class="draggable" @pointerdown.stop="beginDrag($event, 'incidentAngle')"><circle :cx="reflection.sourceX" :cy="reflection.incidentY" r="11" class="handle" /></g><line :x1="reflection.sourceX" :y1="reflection.incidentY" x2="350" y2="192" class="ray" marker-end="url(#physics-arrow)" /><text :x="reflection.sourceX - 72" :y="reflection.incidentY - 10">入射光线</text>
        <line x1="350" y1="192" :x2="reflection.sourceX" :y2="reflection.reflectedY" class="ray mint" marker-end="url(#physics-mint-arrow)" /><text :x="reflection.sourceX - 72" :y="reflection.reflectedY + 10">反射光线</text>
        <g v-if="shown('show-equal-angles')"><path d="M298 192 A52 52 0 0 1 310 165" class="angle" /><path d="M298 192 A52 52 0 0 0 310 219" class="angle" /><text x="270" y="158">i={{ incidentAngle }}°</text><text x="270" y="238">r={{ incidentAngle }}°</text><text x="216" y="280" class="formula-text">与镜面 {{ 90 - incidentAngle }}°，两光线夹角 {{ incidentAngle * 2 }}°</text></g>
      </g>

      <g v-else-if="sceneType === 'physicsMagneticField'">
        <rect x="128" y="138" width="444" height="112" rx="8" class="solenoid-core" /><path d="M160 250 V138 M205 250 V138 M250 250 V138 M295 250 V138 M340 250 V138 M385 250 V138 M430 250 V138 M475 250 V138 M520 250 V138" class="coil" /><ellipse cx="572" cy="194" rx="12" ry="56" class="coil" /><text x="248" y="292" class="caption">通电螺线管</text>
        <g class="draggable" @pointerdown.stop="beginDrag($event, 'currentDirection')"><circle cx="594" cy="194" r="16" class="handle" /><path :d="clockwise ? 'M580 222 A28 28 0 1 1 593 172' : 'M580 166 A28 28 0 1 0 593 216'" class="velocity" marker-end="url(#physics-arrow)" /><text x="455" y="112">从右端观察：电流{{ clockwise ? '顺时针' : '逆时针' }}</text></g>
        <g v-if="shown('show-right-hand-rule')"><text x="206" y="78" class="formula-text">右手四指弯向与电流方向一致</text></g>
        <g v-if="shown('show-n-pole')"><text x="112" y="203" class="pole">{{ clockwise ? 'N' : 'S' }}</text><text x="584" y="203" class="pole">{{ clockwise ? 'S' : 'N' }}</text></g>
        <g v-if="shown('show-field-lines')"><path :d="clockwise ? 'M126 158 C60 62 660 62 574 158' : 'M574 158 C660 62 60 62 126 158'" class="field-line" marker-end="url(#physics-arrow)" /><path :d="clockwise ? 'M126 230 C60 326 660 326 574 230' : 'M574 230 C660 326 60 326 126 230'" class="field-line" marker-end="url(#physics-arrow)" /></g>
      </g>

      <g v-else-if="sceneType === 'physicsCircuit'">
        <path d="M120 100 H255 M295 100 H338 M435 100 H458 M555 100 H580 V285 H208 M152 285 H120 V100" class="wire" /><line x1="255" y1="75" x2="255" y2="125" class="battery short" /><line x1="295" y1="55" x2="295" y2="145" class="battery" /><path d="M338 100 l16 -20 l16 40 l16 -40 l16 40 l16 -20" class="resistor" /><path d="M458 100 l16 -20 l16 40 l16 -40 l16 40 l16 -20" class="resistor" /><circle cx="180" cy="285" r="28" class="ammeter" /><text x="172" y="291" class="ammeter-text">A</text><text x="360" y="65" class="formula-text">R₁={{ r1 }}Ω</text><g class="draggable" @pointerdown.stop="beginDrag($event, 'r2')"><circle :cx="360 + r2 * 12" cy="136" r="11" class="handle" /><text x="482" y="65" class="formula-text">R₂={{ r2.toFixed(1) }}Ω</text></g>
        <g v-if="shown('show-current-direction')"><line x1="475" y1="75" x2="545" y2="75" class="velocity" marker-end="url(#physics-arrow)" /><text x="500" y="60">I</text></g>
        <g v-if="shown('show-voltage')"><text x="240" y="48" class="formula-text">电源电压 U={{ voltage }}V</text></g>
        <g v-if="shown('show-resistance')"><text x="388" y="166" class="formula-text">总电阻={{ (r1 + r2).toFixed(1) }}Ω</text></g>
        <g v-if="shown('show-ohm-law')"><rect x="411" y="314" width="170" height="34" rx="4" class="formula-box" /><text x="426" y="337" class="formula-text">I = {{ current.toFixed(2) }} A</text></g>
      </g>
    </svg>
  </section>
</template>

<style scoped>
.scene-shell{overflow:hidden;border:1px solid #3d3564;border-radius:8px;background:#fff;box-shadow:5px 6px 0 rgb(61 53 100 / 15%)}.scene-shell header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #e6e1f0;background:#fbfbff}.scene-shell header span{color:#746a9d;font-size:11px;font-weight:800}.scene-shell h2{margin:3px 0 0;color:#3d3564;font-size:19px}.scene-shell small{color:#756d91;font-size:12px}.scene-canvas{display:block;width:100%;height:auto;touch-action:none}.incline{fill:#dceaf5;stroke:#4b627d;stroke-width:3}.block{fill:#52aab4;stroke:#286e75;stroke-width:3}.block-text,.ball-text{fill:#fff;font-weight:800}.force,.ray,.velocity{fill:none;stroke:#df648e;stroke-width:3}.mint{stroke:#52aab4}.track,.beam{stroke:#718096;stroke-width:4}.pulley{fill:#fff;stroke:#4b627d;stroke-width:4}.hub{fill:#4b627d}.rope{fill:none;stroke:#7566bb;stroke-width:5}.load-link{stroke:#7566bb;stroke-width:4}.mirror{stroke:#526078;stroke-width:8}.normal{stroke:#8996a9;stroke-dasharray:7 5;stroke-width:2}.angle{fill:none;stroke:#7566bb;stroke-width:2}.solenoid-core{fill:#f3efff;stroke:#7566bb;stroke-width:3}.coil{stroke:#4b627d;stroke-width:8}.pole{fill:#df648e;font-size:28px;font-weight:800}.field-line{fill:none;stroke:#52aab4;stroke-width:2}.wire,.battery,.resistor{fill:none;stroke:#4b627d;stroke-width:4}.battery.short{stroke-width:2}.ammeter{fill:#fff9d7;stroke:#b48226;stroke-width:3}.ammeter-text{fill:#8b621c;font-weight:800}.caption{fill:#627189;font-size:13px;font-weight:700}.point{fill:#3d3564}.ball.first{fill:#e15b91;stroke:#9d315e;stroke-width:3}.ball.second{fill:#52aab4;stroke:#286e75;stroke-width:3}.state-label{fill:#7566bb;font-weight:800}.formula-box{fill:#f7f4ff;stroke:#c9c0ea}.formula-text{fill:#5a4e8c;font-size:13px;font-weight:700}.draggable{cursor:grab}.handle{fill:#fff9d7;stroke:#b48226;stroke-width:3}
</style>
