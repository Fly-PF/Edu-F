<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Back, Brush, Document, FolderOpened, Headset, Hide, MagicStick, Picture, Plus, RefreshRight, Setting, Share, VideoPause, VideoPlay, View } from '@element-plus/icons-vue'
import * as Blockly from 'blockly'
import 'blockly/blocks'
import * as ZhHans from 'blockly/msg/zh-hans'
import { useRoute, useRouter } from 'vue-router'
import { compareAiFace } from '@/api/aiFace'
import { guessAiDraw } from '@/api/aiExhibit'
import { useUserStore } from '@/stores/user'
import {
  createBlockProject,
  getBlockProject,
  publishBlockProject,
  saveBlockProject,
} from '@/api/blockProject'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const blocklyRef = ref(null)
const sketchRef = ref(null)
const title = ref('我的积木作品')
const description = ref('')
const projectId = ref(null)
const saving = ref(false)
const running = ref(false)
const isPublished = ref(false)
const workbenchTab = ref('code')
const stage = ref({ x: 0, y: 0, rotation: 0, message: '你好！拖一块积木来试试吧。', color: '#ee91bb', backdrop: '#ffffff', size: 100, visible: true, spriteName: '探索星', costume: 'star', sound: 'pop', volume: 70 })
const aiStatus = ref('等待 AI 积木运行')
const sketching = ref(false)
const inputState = ref({ key: '', mouseX: 0, mouseY: 0 })
const variables = ref({ 分数: 0, 计时: 0 })
const soundOptions = [
  { id: 'pop', label: '泡泡提示', frequency: 610 },
  { id: 'bell', label: '小铃铛', frequency: 880 },
  { id: 'spark', label: '星光音', frequency: 1046 },
]
const backdropOptions = [
  { id: 'white', label: '纯白舞台', color: '#ffffff' },
  { id: 'mint', label: '薄荷实验室', color: '#e4faf9' },
  { id: 'yellow', label: '阳光任务', color: '#fff8d8' },
  { id: 'pink', label: '粉色创意', color: '#ffedf4' },
]

let workspace = null
let resizeObserver = null
let sketchingPointerId = null
let stopRequested = false

const toolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category', name: '运动', colour: '#5d9cf4', contents: [
        { kind: 'block', type: 'motion_move', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'motion_turn', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } } },
        { kind: 'block', type: 'motion_goto', inputs: { X: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'block', type: 'motion_change_x', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'motion_change_y', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'motion_bounce' },
      ],
    },
    {
      kind: 'category', name: '外观', colour: '#a46ad9', contents: [
        { kind: 'block', type: 'looks_say', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: '你好！' } } } } },
        { kind: 'block', type: 'looks_set_color' },
        { kind: 'block', type: 'looks_set_size', inputs: { SIZE: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
        { kind: 'block', type: 'looks_show' },
        { kind: 'block', type: 'looks_hide' },
      ],
    },
    {
      kind: 'category', name: '事件', colour: '#f2a54a', contents: [
        { kind: 'block', type: 'event_when_run' },
        { kind: 'block', type: 'event_when_key' },
      ],
    },
    {
      kind: 'category', name: '控制', colour: '#e9b640', contents: [
        { kind: 'block', type: 'control_wait', inputs: { SECONDS: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'control_repeat', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'control_if' },
      ],
    },
    {
      kind: 'category', name: '侦测', colour: '#52bbc4', contents: [
        { kind: 'block', type: 'sensing_mouse_x' },
        { kind: 'block', type: 'sensing_mouse_y' },
        { kind: 'block', type: 'sensing_sprite_x' },
        { kind: 'block', type: 'sensing_key_pressed' },
      ],
    },
    {
      kind: 'category', name: '运算', colour: '#58bf70', contents: [
        { kind: 'block', type: 'operator_add', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'operator_random', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'operator_gt', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'operator_equals', inputs: { A: { shadow: { type: 'text', fields: { TEXT: '你好' } } }, B: { shadow: { type: 'text', fields: { TEXT: '世界' } } } } },
      ],
    },
    {
      kind: 'category', name: '变量', colour: '#ef6687', contents: [
        { kind: 'block', type: 'variable_set', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'block', type: 'variable_change', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'variable_get' },
      ],
    },
    {
      kind: 'category', name: 'AI 实验室', colour: '#52bbc4', contents: [
        { kind: 'block', type: 'ai_face_check' },
        { kind: 'block', type: 'ai_draw_guess' },
      ],
    },
  ],
}

const starterWorkspace = {
  blocks: {
    languageVersion: 0,
    blocks: [{
      type: 'event_when_run',
      x: 70,
      y: 70,
      next: { block: { type: 'motion_move', inputs: { STEPS: { block: { type: 'math_number', fields: { NUM: 80 } } } }, next: { block: { type: 'looks_say', inputs: { TEXT: { block: { type: 'text', fields: { TEXT: '我会动起来！' } } } } } } } },
    }],
  },
}

const inputDefaults = {
  motion_move: { STEPS: 10 },
  motion_turn: { DEGREES: 15 },
  motion_goto: { X: 0, Y: 0 },
  motion_change_x: { VALUE: 10 },
  motion_change_y: { VALUE: 10 },
  looks_say: { TEXT: '你好！', text: true },
  looks_set_size: { SIZE: 100 },
  control_wait: { SECONDS: 1 },
  control_repeat: { TIMES: 10 },
  operator_add: { A: 1, B: 1 },
  operator_random: { FROM: 1, TO: 10 },
  operator_gt: { A: 1, B: 1 },
  operator_equals: { A: '你好', B: '世界', text: true },
  variable_set: { VALUE: 0 },
  variable_change: { VALUE: 1 },
}

function ensureDefaultInputs() {
  if (!workspace) return
  workspace.getAllBlocks(false).forEach((block) => {
    const defaults = inputDefaults[block.type]
    if (!defaults) return
    Object.entries(defaults).forEach(([name, defaultValue]) => {
      if (name === 'text' || block.getInputTargetBlock(name)) return
      const input = block.getInput(name)
      if (!input?.connection) return
      const shadow = workspace.newBlock(defaults.text ? 'text' : 'math_number')
      shadow.setShadow(true)
      shadow.setFieldValue(String(defaultValue), defaults.text ? 'TEXT' : 'NUM')
      input.connection.connect(shadow.outputConnection)
    })
  })
}

function defineBlocks() {
  if (Blockly.Blocks.event_when_run) return
  Blockly.common.defineBlocksWithJsonArray([
    { type: 'event_when_run', message0: '当点击开始按钮', nextStatement: null, colour: '#f2a54a', tooltip: '点击运行时，从这里开始执行。' },
    { type: 'motion_move', message0: '移动 %1 步', args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_turn', message0: '右转 %1 度', args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_goto', message0: '移到 x %1 y %2', args0: [{ type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_change_x', message0: '将 x 坐标增加 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_change_y', message0: '将 y 坐标增加 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_bounce', message0: '碰到边缘就反弹', previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'looks_say', message0: '说 %1', args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_set_color', message0: '角色颜色设为 %1', args0: [{ type: 'field_colour', name: 'COLOR', colour: '#ee91bb' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_set_size', message0: '角色大小设为 %1 %', args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_show', message0: '显示角色', previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_hide', message0: '隐藏角色', previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'event_when_key', message0: '当按下 %1 键', args0: [{ type: 'field_dropdown', name: 'KEY', options: [['空格', ' '], ['上箭头', 'ArrowUp'], ['下箭头', 'ArrowDown'], ['左箭头', 'ArrowLeft'], ['右箭头', 'ArrowRight']] }], nextStatement: null, colour: '#f2a54a' },
    { type: 'control_wait', message0: '等待 %1 秒', args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_repeat', message0: '重复 %1 次 %2', args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_if', message0: '如果 %1 那么 %2', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'sensing_mouse_x', message0: '鼠标的 x 坐标', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_mouse_y', message0: '鼠标的 y 坐标', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_sprite_x', message0: '角色的 x 坐标', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_key_pressed', message0: '按下了 %1 键？', args0: [{ type: 'field_dropdown', name: 'KEY', options: [['空格', ' '], ['上箭头', 'ArrowUp'], ['下箭头', 'ArrowDown'], ['左箭头', 'ArrowLeft'], ['右箭头', 'ArrowRight']] }], output: 'Boolean', colour: '#52bbc4' },
    { type: 'operator_add', message0: '%1 + %2', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_random', message0: '在 %1 到 %2 间取随机数', args0: [{ type: 'input_value', name: 'FROM', check: 'Number' }, { type: 'input_value', name: 'TO', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_gt', message0: '%1 > %2', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }], output: 'Boolean', colour: '#58bf70' },
    { type: 'operator_equals', message0: '%1 = %2', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }], output: 'Boolean', colour: '#58bf70' },
    { type: 'variable_set', message0: '将 %1 设为 %2', args0: [{ type: 'field_dropdown', name: 'NAME', options: [['分数', '分数'], ['计时', '计时']] }, { type: 'input_value', name: 'VALUE' }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'variable_change', message0: '将 %1 增加 %2', args0: [{ type: 'field_dropdown', name: 'NAME', options: [['分数', '分数'], ['计时', '计时']] }, { type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'variable_get', message0: '%1', args0: [{ type: 'field_dropdown', name: 'NAME', options: [['分数', '分数'], ['计时', '计时']] }], output: null, colour: '#ef6687' },
    { type: 'ai_face_check', message0: 'AI 识别人脸', previousStatement: null, nextStatement: null, colour: '#52bbc4', tooltip: '打开摄像头拍照后，调用平台人脸识别能力。' },
    { type: 'ai_draw_guess', message0: 'AI 猜一猜画板', previousStatement: null, nextStatement: null, colour: '#52bbc4', tooltip: '识别右侧画板中的涂鸦。' },
  ])
}

function initWorkspace() {
  Blockly.setLocale(ZhHans)
  defineBlocks()
  workspace = Blockly.inject(blocklyRef.value, {
    toolbox,
    renderer: 'zelos',
    trashcan: true,
    grid: { spacing: 22, length: 3, colour: '#d8d3f1', snap: true },
    zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.4, minScale: 0.55 },
    theme: Blockly.Theme.defineTheme('eduWorkshop', {
      base: Blockly.Themes.Classic,
      componentStyles: { workspaceBackgroundColour: '#fbfbff', toolboxBackgroundColour: '#fff', toolboxForegroundColour: '#3d3564', flyoutBackgroundColour: '#f6f4ff', flyoutForegroundColour: '#3d3564' },
    }),
  })
  Blockly.serialization.workspaces.load(starterWorkspace, workspace)
  ensureDefaultInputs()
  resizeObserver = new ResizeObserver(resizeWorkspace)
  resizeObserver.observe(blocklyRef.value)
  window.requestAnimationFrame(resizeWorkspace)
}

function resizeWorkspace() {
  if (!workspace || !blocklyRef.value) return
  const width = blocklyRef.value.clientWidth
  const height = blocklyRef.value.clientHeight
  const injectionDiv = blocklyRef.value.querySelector('.injectionDiv')
  if (injectionDiv) {
    injectionDiv.style.width = `${width}px`
    injectionDiv.style.height = `${height}px`
  }
  const svg = workspace.getParentSvg()
  if (svg) {
    svg.style.width = `${width}px`
    svg.style.height = `${height}px`
  }
  Blockly.svgResize(workspace)
}

function readValue(block, fallback = 0) {
  if (!block) return fallback
  if (block.type === 'math_number') return Number(block.getFieldValue('NUM')) || 0
  if (block.type === 'text') return block.getFieldValue('TEXT') || ''
  if (block.type === 'sensing_mouse_x') return Math.round(inputState.value.mouseX)
  if (block.type === 'sensing_mouse_y') return Math.round(inputState.value.mouseY)
  if (block.type === 'sensing_sprite_x') return Math.round(stage.value.x)
  if (block.type === 'sensing_key_pressed') return inputState.value.key === block.getFieldValue('KEY')
  if (block.type === 'operator_add') return Number(readValue(block.getInputTargetBlock('A'), 0)) + Number(readValue(block.getInputTargetBlock('B'), 0))
  if (block.type === 'operator_random') {
    const from = Number(readValue(block.getInputTargetBlock('FROM'), 1))
    const to = Number(readValue(block.getInputTargetBlock('TO'), 10))
    return Math.round(Math.min(from, to) + Math.random() * Math.abs(to - from))
  }
  if (block.type === 'operator_gt') return Number(readValue(block.getInputTargetBlock('A'), 0)) > Number(readValue(block.getInputTargetBlock('B'), 0))
  if (block.type === 'operator_equals') return String(readValue(block.getInputTargetBlock('A'), '')) === String(readValue(block.getInputTargetBlock('B'), ''))
  if (block.type === 'variable_get') return variables.value[block.getFieldValue('NAME')] ?? 0
  return fallback
}

function valueOf(block, name, fallback = 0) {
  const child = block.getInputTargetBlock(name)
  return readValue(child, fallback)
}

function pause(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)))
}

async function executeSequence(block) {
  let current = block
  while (current && !stopRequested) {
    await executeBlock(current)
    current = current.getNextBlock()
  }
}

async function executeBlock(block) {
  switch (block.type) {
    case 'motion_move': {
      const steps = valueOf(block, 'STEPS', 10)
      const radians = (stage.value.rotation * Math.PI) / 180
      stage.value.x = Math.max(-180, Math.min(180, stage.value.x + Math.cos(radians) * steps))
      stage.value.y = Math.max(-115, Math.min(115, stage.value.y - Math.sin(radians) * steps))
      break
    }
    case 'motion_turn':
      stage.value.rotation = (stage.value.rotation + valueOf(block, 'DEGREES', 15)) % 360
      break
    case 'motion_goto':
      stage.value.x = Math.max(-180, Math.min(180, valueOf(block, 'X', 0)))
      stage.value.y = Math.max(-115, Math.min(115, valueOf(block, 'Y', 0)))
      break
    case 'motion_change_x':
      stage.value.x = Math.max(-180, Math.min(180, stage.value.x + Number(valueOf(block, 'VALUE', 10))))
      break
    case 'motion_change_y':
      stage.value.y = Math.max(-115, Math.min(115, stage.value.y + Number(valueOf(block, 'VALUE', 10))))
      break
    case 'motion_bounce':
      if (Math.abs(stage.value.x) >= 175 || Math.abs(stage.value.y) >= 110) stage.value.rotation = (stage.value.rotation + 180) % 360
      break
    case 'looks_say':
      stage.value.message = valueOf(block, 'TEXT', '你好！')
      break
    case 'looks_set_color':
      stage.value.color = block.getFieldValue('COLOR') || '#ee91bb'
      break
    case 'looks_set_size':
      stage.value.size = Math.min(200, Math.max(30, Number(valueOf(block, 'SIZE', 100))))
      break
    case 'looks_show':
      stage.value.visible = true
      break
    case 'looks_hide':
      stage.value.visible = false
      break
    case 'control_wait':
      await pause(valueOf(block, 'SECONDS', 1) * 1000)
      break
    case 'control_repeat': {
      const loop = block.getInputTargetBlock('DO')
      const times = Math.min(50, Math.max(0, Math.floor(valueOf(block, 'TIMES', 2))))
      for (let index = 0; index < times && !stopRequested; index += 1) await executeSequence(loop)
      break
    }
    case 'control_if': {
      if (Boolean(valueOf(block, 'CONDITION', false))) await executeSequence(block.getInputTargetBlock('DO'))
      break
    }
    case 'variable_set':
      variables.value[block.getFieldValue('NAME')] = valueOf(block, 'VALUE', 0)
      break
    case 'variable_change': {
      const name = block.getFieldValue('NAME')
      variables.value[name] = Number(variables.value[name] || 0) + Number(valueOf(block, 'VALUE', 1))
      break
    }
    case 'ai_face_check':
      await runFaceCheck()
      break
    case 'ai_draw_guess':
      await runDrawGuess()
      break
  }
  await pause(80)
}

async function runProject() {
  if (!workspace || running.value) return
  running.value = true
  stopRequested = false
  stage.value.message = '开始运行！'
  try {
    const triggers = workspace.getTopBlocks(true).filter((block) => block.type === 'event_when_run')
    if (!triggers.length) {
      ElMessage.warning('先放入“当点击开始按钮”积木。')
      return
    }
    for (const trigger of triggers) await executeSequence(trigger.getNextBlock())
  } catch (error) {
    ElMessage.error(error?.message || '运行时出现了问题')
  } finally {
    running.value = false
  }
}

function stopProject() {
  stopRequested = true
  running.value = false
  stage.value.message = '已停止，继续搭建你的作品吧。'
}

async function runKeyEvent(event) {
  inputState.value.key = event.key
  if (!workspace || running.value) return
  const trigger = workspace.getTopBlocks(true).find((block) => block.type === 'event_when_key' && block.getFieldValue('KEY') === event.key)
  if (!trigger) return
  running.value = true
  stopRequested = false
  try {
    await executeSequence(trigger.getNextBlock())
  } finally {
    running.value = false
  }
}

function updateStagePointer(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  inputState.value.mouseX = ((event.clientX - rect.left) / rect.width - 0.5) * 360
  inputState.value.mouseY = -((event.clientY - rect.top) / rect.height - 0.5) * 240
}

async function runFaceCheck() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('当前浏览器不支持摄像头。')
  aiStatus.value = '正在请求摄像头...'
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
  try {
    const video = document.createElement('video')
    video.srcObject = stream
    await video.play()
    await pause(450)
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
    if (!blob) throw new Error('人脸图像采集失败。')
    const result = await compareAiFace(new File([blob], 'block-face.jpg', { type: 'image/jpeg' }))
    aiStatus.value = result?.message || '人脸识别已完成'
    stage.value.message = result?.matched ? `识别成功，相似度 ${Number(result.score || 0).toFixed(1)}` : '没有匹配到已录入的人脸'
  } finally {
    stream.getTracks().forEach((track) => track.stop())
  }
}

async function runDrawGuess() {
  const canvas = sketchRef.value
  if (!canvas) throw new Error('画板未准备好。')
  aiStatus.value = 'AI 正在观察你的涂鸦...'
  const result = await guessAiDraw({ imageDataUrl: canvas.toDataURL('image/png') })
  const guess = result?.predictions?.[0]?.label || result?.label || '暂时猜不出来'
  stage.value.message = `AI 猜：${guess}`
  aiStatus.value = stage.value.message
}

function pointerPosition(event) {
  const canvas = sketchRef.value
  const rect = canvas.getBoundingClientRect()
  return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) }
}

function startSketch(event) {
  const canvas = sketchRef.value
  sketchingPointerId = event.pointerId
  canvas.setPointerCapture(event.pointerId)
  const point = pointerPosition(event)
  const context = canvas.getContext('2d')
  context.beginPath()
  context.moveTo(point.x, point.y)
  sketching.value = true
}

function drawSketch(event) {
  if (event.pointerId !== sketchingPointerId) return
  const context = sketchRef.value.getContext('2d')
  const point = pointerPosition(event)
  context.lineTo(point.x, point.y)
  context.stroke()
}

function endSketch(event) {
  if (event.pointerId !== sketchingPointerId) return
  sketchingPointerId = null
  sketching.value = false
}

function clearSketch() {
  const canvas = sketchRef.value
  const context = canvas.getContext('2d')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
}

function setupSketch() {
  const canvas = sketchRef.value
  const context = canvas.getContext('2d')
  context.lineWidth = 10
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = '#3d3564'
  clearSketch()
}

function projectPayload() {
  const stageCanvas = document.querySelector('.stage-scene')
  return {
    title: title.value.trim() || '未命名积木作品',
    description: description.value.trim(),
    workspaceJson: JSON.stringify(Blockly.serialization.workspaces.save(workspace)),
    stageJson: JSON.stringify({ ...stage.value, variables: variables.value }),
    thumbnailData: stageCanvas ? null : null,
  }
}

async function saveProject() {
  if (!workspace) return
  if (!userStore.isLoggedIn) {
    ElMessage.warning('登录后即可保存你的作品。')
    return
  }
  saving.value = true
  try {
    const payload = projectPayload()
    const result = projectId.value ? await saveBlockProject(projectId.value, payload) : await createBlockProject(payload)
    projectId.value = result.id
    isPublished.value = Boolean(result.published)
    ElMessage.success('作品已保存')
  } catch (error) {
    ElMessage.error(error?.message || '保存失败，请先登录后重试')
  } finally {
    saving.value = false
  }
}

async function publishProject() {
  if (!projectId.value) await saveProject()
  if (!projectId.value) return
  try {
    const result = await publishBlockProject(projectId.value)
    isPublished.value = Boolean(result.published)
    ElMessage.success('作品已发布到灵感广场')
  } catch (error) {
    ElMessage.error(error?.message || '发布失败')
  }
}

function loadProjectData(project) {
  title.value = project.title || '未命名积木作品'
  description.value = project.description || ''
  projectId.value = project.id
  isPublished.value = Boolean(project.published)
  const workspaceData = JSON.parse(project.workspaceJson || JSON.stringify(starterWorkspace))
  const stageData = JSON.parse(project.stageJson || '{}')
  workspace.clear()
  Blockly.serialization.workspaces.load(workspaceData, workspace)
  ensureDefaultInputs()
  stage.value = { ...stage.value, ...stageData }
  variables.value = { ...variables.value, ...(stageData.variables || {}) }
}

async function openProject(id) {
  try {
    const project = await getBlockProject(id)
    loadProjectData(project)
    ElMessage.success(`已打开“${project.title}”`)
  } catch (error) {
    ElMessage.error(error?.message || '打开项目失败')
  }
}

function newProject() {
  projectId.value = null
  isPublished.value = false
  title.value = '我的积木作品'
  description.value = ''
  stage.value = { x: 0, y: 0, rotation: 0, message: '你好！拖一块积木来试试吧。', color: '#ee91bb', backdrop: '#ffffff', size: 100, visible: true, spriteName: '探索星', costume: 'star', sound: 'pop', volume: 70 }
  variables.value = { 分数: 0, 计时: 0 }
  workspace.clear()
  Blockly.serialization.workspaces.load(starterWorkspace, workspace)
  ensureDefaultInputs()
  clearSketch()
}

function selectWorkbenchTab(tab) {
  workbenchTab.value = tab
  if (tab === 'code') nextTick(resizeWorkspace)
}

function setSpriteColor(color) {
  stage.value.color = color
  stage.value.message = '新造型准备好了！'
}

function setBackdrop(color) {
  stage.value.backdrop = color
  stage.value.message = '舞台背景更新好了！'
}

function resetSprite() {
  stage.value.x = 0
  stage.value.y = 0
  stage.value.rotation = 0
  stage.value.size = 100
  stage.value.visible = true
  stage.value.message = '角色已回到舞台中央。'
}

function playSound() {
  const option = soundOptions.find((item) => item.id === stage.value.sound) || soundOptions[0]
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) {
    stage.value.message = '当前浏览器不支持声音预览。'
    return
  }
  const context = new AudioContext()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(option.frequency, context.currentTime)
  gain.gain.setValueAtTime(Math.max(0, Math.min(1, stage.value.volume / 100)) * 0.12, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.42)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.42)
  stage.value.message = `${option.label}已播放！`
}

function previewSound() {
  playSound()
}

function goBack() { router.push('/tools') }
function goProjects() { router.push('/main/projects?type=blocks') }

onMounted(async () => {
  await nextTick()
  initWorkspace()
  setupSketch()
  window.addEventListener('keydown', runKeyEvent)
  if (route.query.projectId) await openProject(route.query.projectId)
})

onBeforeUnmount(() => {
  stopRequested = true
  resizeObserver?.disconnect()
  workspace?.dispose()
  window.removeEventListener('keydown', runKeyEvent)
})
</script>

<template>
  <main class="block-workshop-page">
    <header class="workshop-header">
      <button class="icon-button" type="button" aria-label="返回在线工具" @click="goBack"><el-icon><Back /></el-icon></button>
      <div class="project-title">
        <span class="header-sticker">BLOCK LAB</span>
        <input v-model="title" aria-label="项目名称" maxlength="100" />
      </div>
      <div class="header-actions">
        <el-button class="secondary-action" @click="goProjects"><el-icon><FolderOpened /></el-icon>项目</el-button>
        <el-button class="secondary-action" @click="newProject"><el-icon><Plus /></el-icon>新建</el-button>
        <el-button class="secondary-action" :loading="saving" @click="saveProject"><el-icon><Document /></el-icon>保存</el-button>
        <el-button class="primary-action" :disabled="isPublished" @click="publishProject"><el-icon><Share /></el-icon>{{ isPublished ? '已发布' : '发布作品' }}</el-button>
      </div>
    </header>

    <section class="workshop-layout">
      <section class="workspace-panel" aria-label="创作编辑区">
        <div class="workbench-tabs" role="tablist" aria-label="创作模式">
          <button :class="{ active: workbenchTab === 'code' }" type="button" role="tab" :aria-selected="workbenchTab === 'code'" @click="selectWorkbenchTab('code')">代码</button>
          <button :class="{ active: workbenchTab === 'costume' }" type="button" role="tab" :aria-selected="workbenchTab === 'costume'" @click="selectWorkbenchTab('costume')">造型</button>
          <button :class="{ active: workbenchTab === 'sound' }" type="button" role="tab" :aria-selected="workbenchTab === 'sound'" @click="selectWorkbenchTab('sound')">声音</button>
        </div>
        <div v-show="workbenchTab === 'code'" ref="blocklyRef" class="blockly-host"></div>
        <div v-show="workbenchTab === 'costume'" class="asset-editor">
          <div class="asset-editor-heading"><span class="editor-sticker">MAKE A LOOK</span><h2>角色造型编辑</h2><p>挑选颜色和轮廓，舞台上的角色会实时换上新造型。</p></div>
          <div class="costume-studio">
            <div class="costume-preview" :style="{ background: stage.backdrop }"><div :class="['costume-sprite', stage.costume]" :style="{ background: stage.color }">✦</div></div>
            <div class="costume-controls">
              <strong>颜色</strong>
              <div class="color-swatches" role="group" aria-label="角色颜色">
                <button v-for="color in ['#ee91bb', '#8178cf', '#52bbc4', '#f2a54a', '#fff1a8']" :key="color" :class="{ selected: stage.color === color }" :style="{ background: color }" type="button" :aria-label="`选择颜色 ${color}`" @click="setSpriteColor(color)"></button>
              </div>
              <strong>轮廓</strong>
              <div class="costume-options"><button v-for="item in [{ id: 'star', label: '星星' }, { id: 'bot', label: '机器人' }, { id: 'dot', label: '圆点' }]" :key="item.id" :class="{ selected: stage.costume === item.id }" type="button" @click="stage.costume = item.id">{{ item.label }}</button></div>
            </div>
          </div>
        </div>
        <div v-show="workbenchTab === 'sound'" class="asset-editor sound-editor">
          <div class="asset-editor-heading"><span class="editor-sticker">SOUND LAB</span><h2>声音编辑</h2><p>给作品选一段轻快的提示音，再调好合适的音量。</p></div>
          <div class="sound-studio"><button v-for="sound in soundOptions" :key="sound.id" :class="{ selected: stage.sound === sound.id }" type="button" @click="stage.sound = sound.id; previewSound()"><el-icon><Headset /></el-icon>{{ sound.label }}</button></div>
          <label class="volume-control">音量 <input v-model.number="stage.volume" type="range" min="0" max="100" /><output>{{ stage.volume }}%</output></label>
          <button class="asset-button" type="button" @click="previewSound"><el-icon><VideoPlay /></el-icon>试听提示音</button>
        </div>
      </section>

      <aside class="stage-panel" aria-label="互动舞台">
        <div class="stage-toolbar"><strong>互动舞台</strong><span class="live-dot">LIVE</span></div>
        <div class="stage-scene" :style="{ background: stage.backdrop }" @pointermove="updateStagePointer">
          <div class="stage-stars" aria-hidden="true">+ * +</div>
          <div class="speech-bubble">{{ stage.message }}</div>
          <div :class="['default-sprite', stage.costume]" :style="{ left: `calc(50% + ${stage.x}px)`, top: `calc(58% + ${stage.y}px)`, transform: `translate(-50%, -50%) rotate(${stage.rotation}deg)`, background: stage.color, width: `${Math.max(30, Math.min(130, 65 * stage.size / 100))}px`, height: `${Math.max(30, Math.min(130, 65 * stage.size / 100))}px`, visibility: stage.visible ? 'visible' : 'hidden' }">✦</div>
        </div>
        <div class="runner-actions">
          <el-button class="run-button" :loading="running" @click="runProject"><el-icon><VideoPlay /></el-icon>开始运行</el-button>
          <el-button class="stop-button" :disabled="!running" @click="stopProject"><el-icon><VideoPause /></el-icon>停止</el-button>
        </div>
        <section class="sprite-inspector" aria-label="角色属性">
          <div class="inspector-heading"><span><el-icon><Setting /></el-icon>角色与舞台</span><button type="button" title="重置角色" @click="resetSprite"><el-icon><RefreshRight /></el-icon></button></div>
          <label class="sprite-name">角色 <input v-model="stage.spriteName" maxlength="30" /></label>
          <div class="sprite-fields"><label>x <input v-model.number="stage.x" type="number" min="-180" max="180" /></label><label>y <input v-model.number="stage.y" type="number" min="-115" max="115" /></label><label>大小 <input v-model.number="stage.size" type="number" min="30" max="200" /></label></div>
          <div class="sprite-visibility"><span>显示</span><button :class="{ active: stage.visible }" type="button" @click="stage.visible = true"><el-icon><View /></el-icon></button><button :class="{ active: !stage.visible }" type="button" @click="stage.visible = false"><el-icon><Hide /></el-icon></button><span class="score-label">分数 {{ variables.分数 }}</span></div>
        </section>
        <section class="asset-tray" aria-label="角色与舞台资源">
          <div class="asset-list"><strong>角色</strong><button class="sprite-tile active" type="button"><span :class="['mini-sprite', stage.costume]" :style="{ background: stage.color }">✦</span>{{ stage.spriteName || '探索星' }}</button></div>
          <div class="backdrop-list"><strong>舞台背景</strong><button v-for="item in backdropOptions" :key="item.id" :class="{ selected: stage.backdrop === item.color }" :style="{ background: item.color }" type="button" :title="item.label" @click="setBackdrop(item.color)"><el-icon v-if="stage.backdrop === item.color"><Picture /></el-icon></button></div>
        </section>
        <div class="sketch-panel">
          <div><strong>AI 涂鸦画板</strong><button type="button" @click="clearSketch">清空</button></div>
          <canvas ref="sketchRef" width="560" height="220" @pointerdown="startSketch" @pointermove="drawSketch" @pointerup="endSketch" @pointercancel="endSketch" />
          <small><el-icon><MagicStick /></el-icon>{{ aiStatus }}</small>
        </div>
        <label class="description-field">作品简介<textarea v-model="description" maxlength="500" placeholder="介绍一下你的创意吧"></textarea></label>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.block-workshop-page { --ink:#3d3564; --purple:#8178cf; --pink:#ee91bb; --mint:#9de4eb; --yellow:#fff1a8; min-height:calc(100vh - 64px); background:#fbfbff; color:var(--ink); font-family:'Microsoft YaHei',Arial,sans-serif; }
.workshop-header { display:flex; height:66px; align-items:center; gap:14px; padding:0 clamp(14px,2.5vw,38px); border-bottom:2px solid var(--ink); background:#fff; box-shadow:0 3px 0 rgb(61 53 100 / 14%); }
.icon-button { display:grid; width:37px; height:37px; place-items:center; border:1px solid var(--ink); border-radius:5px; background:var(--yellow); color:var(--ink); cursor:pointer; box-shadow:2px 3px 0 rgb(61 53 100 / 24%); }.icon-button:hover { transform:translate(-1px,-1px); }
.project-title { display:flex; min-width:0; align-items:center; gap:11px; }.header-sticker { flex:0 0 auto; padding:5px 7px; border:1px solid var(--ink); border-radius:4px; background:var(--yellow); box-shadow:2px 2px 0 rgb(61 53 100 / 25%); font-family:'Trebuchet MS',sans-serif; font-size:10px; font-weight:900; transform:rotate(-2deg); }.project-title input { width:min(34vw,360px); min-width:130px; border:0; border-bottom:1px dashed rgb(61 53 100 / 42%); outline:0; color:var(--ink); font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:20px; font-weight:900; }.header-actions { display:flex; align-items:center; gap:8px; margin-left:auto; }.header-actions :deep(.el-button),.runner-actions :deep(.el-button) { display:inline-flex; align-items:center; gap:6px; border-radius:5px; font-weight:800; white-space:nowrap; word-break:keep-all; }.secondary-action { border:1px solid var(--ink)!important; background:#fff!important; color:var(--ink)!important; box-shadow:2px 3px 0 rgb(61 53 100 / 18%); }.primary-action,.run-button { border:1px solid #4e4473!important; background:var(--purple)!important; box-shadow:3px 4px 0 rgb(61 53 100 / 28%); color:#fff!important; }.primary-action:hover:not(:disabled),.run-button:hover:not(:disabled) { transform:translate(-2px,-2px); box-shadow:5px 6px 0 rgb(61 53 100 / 28%); }
.workshop-layout { display:grid; grid-template-columns:minmax(420px,1fr) minmax(500px,560px); min-height:calc(100vh - 130px); }
.workspace-panel { display:grid; grid-template-rows:44px minmax(0,1fr); min-width:0; min-height:640px; padding:14px; background-image:radial-gradient(rgb(129 120 207 / 16%) 1px,transparent 1px); background-size:16px 16px; }.workbench-tabs { display:flex; align-items:end; gap:5px; padding-left:8px; }.workbench-tabs button { min-width:76px; padding:10px 16px; border:1px solid var(--ink); border-bottom:0; border-radius:7px 7px 0 0; background:#fff; color:#6b6184; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:14px; font-weight:900; cursor:pointer; white-space:nowrap; }.workbench-tabs button.active { position:relative; z-index:1; background:#e8e4ff; color:var(--ink); box-shadow:3px 0 0 rgb(61 53 100 / 16%); }.workbench-tabs button:focus-visible,.asset-button:focus-visible,.color-swatches button:focus-visible { outline:3px solid var(--pink); outline-offset:2px; }.blockly-host { width:100%; height:100%; min-height:610px; overflow:hidden; border:2px solid var(--ink); border-radius:7px; background:#fbfbff; box-shadow:5px 6px 0 rgb(61 53 100 / 45%); }.blockly-host :deep(.blocklySvg) { width:100% !important; height:100% !important; }.asset-editor { display:grid; align-content:center; justify-items:start; min-height:610px; padding:clamp(28px,7vw,82px); border:2px solid var(--ink); border-radius:7px; background:linear-gradient(135deg,#fff 0%,#e8e4ff 58%,#d3f2f2 100%); box-shadow:5px 6px 0 rgb(61 53 100 / 45%); }.asset-editor h2 { margin:14px 0 0; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:clamp(23px,3vw,34px); font-weight:900; }.asset-editor p { max-width:420px; margin:12px 0 0; color:#625878; line-height:1.7; }.editor-sticker { padding:5px 8px; border:1px solid var(--ink); border-radius:4px; background:var(--yellow); box-shadow:2px 3px 0 rgb(61 53 100 / 20%); font-family:'Trebuchet MS',sans-serif; font-size:11px; font-weight:900; transform:rotate(-3deg); }.color-swatches { display:flex; flex-wrap:wrap; gap:13px; margin-top:27px; }.color-swatches button { width:46px; height:46px; border:2px solid var(--ink); border-radius:50%; box-shadow:3px 4px 0 rgb(61 53 100 / 22%); cursor:pointer; }.color-swatches button.selected { outline:3px solid #fff; outline-offset:-7px; }.asset-button { margin-top:26px; padding:10px 14px; border:1px solid #4e4473; border-radius:5px; background:var(--purple); box-shadow:3px 4px 0 rgb(61 53 100 / 28%); color:#fff; font-weight:900; cursor:pointer; white-space:nowrap; }.asset-button:hover { transform:translate(-2px,-2px); box-shadow:5px 6px 0 rgb(61 53 100 / 28%); }
.stage-panel { display:grid; align-content:start; gap:11px; min-width:0; padding:15px; border-left:1px solid rgb(61 53 100 / 30%); background:#fffdf7; }.stage-toolbar { display:flex; align-items:center; justify-content:space-between; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-weight:900; }.live-dot { padding:3px 6px; border:1px solid var(--ink); border-radius:3px; background:var(--mint); font-size:10px; transform:rotate(2deg); }.stage-scene { position:relative; aspect-ratio:4 / 3; overflow:hidden; border:2px solid var(--ink); border-radius:7px; background:#fff; box-shadow:4px 5px 0 rgb(61 53 100 / 34%); }.stage-scene::after { position:absolute; right:-20px; bottom:-45px; width:150px; height:150px; border:2px dashed rgb(61 53 100 / 32%); border-radius:50%; content:''; }.stage-stars { position:absolute; top:15px; left:17px; color:#d77ba5; font-size:23px; font-weight:900; letter-spacing:15px; }.speech-bubble { position:absolute; z-index:2; top:23px; right:16px; max-width:145px; padding:8px 10px; border:1px solid var(--ink); border-radius:5px; background:#fff; box-shadow:2px 3px 0 rgb(61 53 100 / 20%); font-size:12px; font-weight:700; line-height:1.45; }.default-sprite { position:absolute; z-index:2; display:grid; width:65px; height:65px; place-items:center; border:2px solid var(--ink); border-radius:47% 53% 44% 56%; box-shadow:4px 5px 0 rgb(61 53 100 / 25%); color:#fff; font-size:31px; transition:left .22s ease,top .22s ease,transform .22s ease,background .2s ease; }.runner-actions { display:flex; gap:8px; }.run-button { flex:1; }.stop-button { border:1px solid var(--ink)!important; background:#fff!important; color:var(--ink)!important; }.sketch-panel { padding:10px; border:1px solid rgb(61 53 100 / 32%); border-radius:6px; background:#f7f5ff; }.sketch-panel > div { display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; }.sketch-panel button { border:0; background:transparent; color:var(--purple); font-size:12px; font-weight:800; cursor:pointer; }.sketch-panel canvas { width:100%; height:104px; margin-top:8px; border:1px dashed rgb(61 53 100 / 45%); border-radius:4px; background:#fff; touch-action:none; cursor:crosshair; }.sketch-panel small { display:flex; align-items:center; gap:4px; margin-top:5px; color:#71658f; font-size:11px; }.description-field { display:grid; gap:6px; color:#625878; font-size:12px; font-weight:800; }.description-field textarea { min-height:58px; resize:vertical; padding:8px; border:1px solid rgb(61 53 100 / 38%); border-radius:5px; color:var(--ink); font:inherit; line-height:1.45; }.description-field textarea:focus { outline:2px solid var(--pink); outline-offset:1px; }
.blockly-host :deep(.blocklyToolboxDiv) { border-right:1px solid rgb(61 53 100 / 22%); background:#fff; }.blockly-host :deep(.blocklyTreeRow) { height:43px; margin:3px 5px; border-radius:5px; }.blockly-host :deep(.blocklyTreeLabel) { color:var(--ink); font-family:'Microsoft YaHei',sans-serif; font-size:13px; font-weight:800; }.blockly-host :deep(.blocklyTreeSelected) { background:#ece9ff!important; box-shadow:2px 2px 0 rgb(61 53 100 / 15%); }.blockly-host :deep(.blocklyFlyoutBackground) { fill:#fff!important; fill-opacity:1!important; }.blockly-host :deep(.blocklyFlyout) { border-right:1px solid rgb(61 53 100 / 18%); }
.asset-editor { display:block; min-height:610px; padding:clamp(28px,5vw,64px); background:linear-gradient(135deg,#fff 0%,#e8e4ff 58%,#d3f2f2 100%); }.asset-editor-heading h2 { margin:14px 0 0; }.asset-editor-heading p { margin:10px 0 0; }.costume-studio { display:grid; grid-template-columns:minmax(210px,.85fr) minmax(240px,1fr); gap:24px; width:min(700px,100%); margin-top:28px; }.costume-preview { display:grid; min-height:260px; place-items:center; border:2px solid var(--ink); border-radius:7px; box-shadow:4px 5px 0 rgb(61 53 100 / 28%); }.costume-sprite { display:grid; width:110px; height:110px; place-items:center; border:3px solid var(--ink); border-radius:47% 53% 44% 56%; box-shadow:6px 7px 0 rgb(61 53 100 / 23%); color:#fff; font-size:54px; }.costume-sprite.bot,.default-sprite.bot,.mini-sprite.bot { border-radius:15px; }.costume-sprite.dot,.default-sprite.dot,.mini-sprite.dot { border-radius:50%; }.costume-controls { display:grid; align-content:start; gap:12px; }.costume-controls strong { margin-top:2px; font-size:14px; }.costume-controls .color-swatches { margin:0 0 10px; }.costume-options,.sound-studio { display:flex; flex-wrap:wrap; gap:8px; }.costume-options button,.sound-studio button { display:inline-flex; align-items:center; gap:6px; padding:9px 11px; border:1px solid var(--ink); border-radius:5px; background:#fff; color:var(--ink); box-shadow:2px 3px 0 rgb(61 53 100 / 17%); font-weight:800; white-space:nowrap; cursor:pointer; }.costume-options button.selected,.sound-studio button.selected { background:#e8e4ff; box-shadow:3px 4px 0 rgb(61 53 100 / 28%); }.sound-studio { margin-top:30px; }.volume-control { display:flex; width:min(460px,100%); align-items:center; gap:12px; margin-top:25px; color:#625878; font-size:14px; font-weight:900; }.volume-control input { flex:1; accent-color:var(--purple); }.volume-control output { min-width:40px; color:var(--ink); }.asset-button { display:inline-flex; align-items:center; gap:6px; }
.sprite-inspector { padding:11px; border:1px solid rgb(61 53 100 / 30%); border-radius:6px; background:#fff; }.inspector-heading,.sprite-visibility { display:flex; align-items:center; }.inspector-heading { justify-content:space-between; gap:10px; font-weight:900; }.inspector-heading span { display:flex; align-items:center; gap:5px; }.inspector-heading button { display:grid; width:28px; height:28px; place-items:center; border:1px solid var(--ink); border-radius:4px; background:var(--yellow); color:var(--ink); cursor:pointer; }.sprite-name { display:flex; align-items:center; gap:8px; margin-top:10px; color:#625878; font-size:12px; font-weight:800; }.sprite-name input { min-width:0; flex:1; padding:6px 7px; border:1px solid rgb(61 53 100 / 28%); border-radius:4px; color:var(--ink); font:inherit; }.sprite-fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin-top:8px; }.sprite-fields label { display:grid; gap:4px; color:#756a94; font-size:11px; font-weight:800; }.sprite-fields input { width:100%; min-width:0; padding:5px; border:1px solid rgb(61 53 100 / 28%); border-radius:4px; color:var(--ink); font:inherit; }.sprite-visibility { gap:5px; margin-top:10px; color:#756a94; font-size:11px; font-weight:800; }.sprite-visibility button { display:grid; width:27px; height:27px; place-items:center; border:1px solid rgb(61 53 100 / 32%); border-radius:4px; background:#fff; color:#756a94; cursor:pointer; }.sprite-visibility button.active { background:var(--mint); color:var(--ink); }.score-label { margin-left:auto; color:var(--purple); white-space:nowrap; }.asset-tray { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; padding:11px; border:1px solid rgb(61 53 100 / 30%); border-radius:6px; background:#f7f5ff; }.asset-list,.backdrop-list { display:flex; align-items:center; gap:7px; min-width:0; }.asset-list { flex-wrap:wrap; }.asset-list strong,.backdrop-list strong { width:100%; font-size:11px; }.sprite-tile { display:flex; max-width:132px; align-items:center; gap:7px; overflow:hidden; padding:6px; border:2px solid var(--purple); border-radius:5px; background:#e8e4ff; color:var(--ink); font-size:11px; font-weight:800; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }.mini-sprite { display:grid; width:26px; height:26px; flex:0 0 26px; place-items:center; border:1px solid var(--ink); border-radius:47% 53% 44% 56%; color:#fff; font-size:15px; }.backdrop-list { align-content:start; flex-wrap:wrap; max-width:150px; }.backdrop-list button { display:grid; width:27px; height:27px; place-items:center; border:1px solid rgb(61 53 100 / 33%); border-radius:4px; color:var(--ink); cursor:pointer; }.backdrop-list button.selected { outline:2px solid var(--purple); outline-offset:2px; }
@media (max-width:1120px) { .workshop-layout { grid-template-columns:1fr; }.stage-panel { grid-template-columns:minmax(0,1fr) minmax(230px,.8fr); align-items:start; border-top:1px solid rgb(61 53 100 / 30%); border-left:0; }.stage-toolbar { grid-column:1 / -1; }.stage-scene { height:260px; }.runner-actions,.sketch-panel,.description-field { grid-column:2; }.runner-actions { grid-row:2; }.sketch-panel { grid-row:3; }.description-field { grid-row:4; } }
@media (max-width:720px) { .workshop-header { height:auto; min-height:65px; flex-wrap:wrap; padding:11px 14px; }.project-title { flex:1; }.project-title input { width:100%; font-size:17px; }.header-actions { width:100%; margin-left:0; }.header-actions :deep(.el-button) { flex:1; margin-left:0!important; padding:8px 7px; }.workshop-layout { display:flex; min-height:0; flex-direction:column; }.workspace-panel { min-height:544px; padding:10px; }.workbench-tabs { padding-left:0; }.workbench-tabs button { flex:1; min-width:0; padding:10px 7px; }.blockly-host,.asset-editor { min-height:480px; }.asset-editor { padding:30px; }.stage-panel { display:grid; grid-template-columns:1fr; }.stage-toolbar,.stage-scene,.runner-actions,.sketch-panel,.description-field { grid-column:auto; grid-row:auto; }.stage-scene { height:240px; } }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; } }
</style>
