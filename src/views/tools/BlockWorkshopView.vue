<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Back, Brush, Document, EditPen, FolderOpened, Headset, Hide, MagicStick, Picture, Plus, RefreshRight, Setting, Share, VideoPause, VideoPlay, View } from '@element-plus/icons-vue'
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
  saveBlockProject,
} from '@/api/blockProject'
import { completeStudentBlockProject } from '@/api/course'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const courseMode = computed(() => route.query.courseMode === '1')
const courseContext = computed(() => ({
  assignmentId: Number(route.query.assignmentId || 0),
  courseId: Number(route.query.courseId || 0),
  chapterId: Number(route.query.chapterId || 0),
  resourceId: Number(route.query.resourceId || 0),
}))
const blocklyRef = ref(null)
const sketchRef = ref(null)
const costumeCanvasRef = ref(null)
const assetUploadRef = ref(null)
const title = ref('我的积木作品')
const description = ref('')
const projectId = ref(null)
const saving = ref(false)
const running = ref(false)
const projectVisibility = ref('private')
const isPublished = computed(() => projectVisibility.value === 'public')
const workbenchTab = ref('code')
const activeToolboxCategory = ref('运动')
const showTemplatePicker = ref(false)
const showExtensionPicker = ref(false)
const showProjectInfo = ref(false)
const projectTags = ref([])
const projectTagInput = ref('')
const projectInfoDraft = ref({ title: '', description: '', tags: [], visibility: 'private' })
const enabledExtensions = ref([])
const drawBoardVisible = ref(false)
const drawGuessResults = ref([])
const projectTemplate = ref('free')
const projectBase = ref(null)
const stage = ref({ x: 0, y: 0, rotation: 90, message: '', messageMode: 'say', messageOrigin: null, color: '#ee91bb', effectColor: 0, backdrop: '#ffffff', size: 100, visible: true, draggable: true, spriteName: '探索星', costume: 'star', costumeData: null, costumes: [{ id: 'costume-1', name: '星星', preset: 'star', data: null }], selectedCostumeId: 'costume-1', sound: 'pop', pitch: 100, volume: 70 })
const stageId = 'stage'
const stageState = ref({ ...stage.value })
const stageWorkspaceJson = ref(null)
const isStageSelected = computed(() => selectedActorId.value === stageId)
const stageBackdrops = ref([])
const assetItems = computed(() => (isStageSelected.value ? stageBackdrops.value : (stage.value.costumes || [])))
const activeBackdrop = computed(() => stageBackdrops.value.find((item) => item.id === stageState.value.selectedBackdropId) || stageBackdrops.value[0])
const activeCostume = computed(() => (stage.value.costumes || []).find((item) => item.id === stage.value.selectedCostumeId) || stage.value.costumes?.[0])
const stageSceneStyle = computed(() => {
  const backdrop = activeBackdrop.value
  return { background: backdrop?.color || stageState.value.backdrop || '#ffffff' }
})
const activeBackdropStyle = computed(() => {
  const backdrop = activeBackdrop.value
  const size = Math.max(20, Math.min(300, Number(backdrop?.size || 100)))
  return {
    left: `calc(50% + ${Number(backdrop?.x || 0)}px)`,
    top: `calc(58% + ${Number(backdrop?.y || 0)}px)`,
    width: `${size}%`,
    transform: `translate(-50%, -50%) rotate(${Number(backdrop?.rotation ?? 90) - 90}deg)`,
    visibility: backdrop?.visible === false ? 'hidden' : 'visible',
  }
})
const gliding = ref(false)
const showDirectionPicker = ref(false)
const actors = ref([{ id: 'sprite-1', state: { ...stage.value }, workspaceJson: null }])
const selectedActorId = ref('sprite-1')
const aiStatus = ref('等待 AI 积木运行')
const sketching = ref(false)
const inputState = ref({ key: '', mouseX: 0, mouseY: 0, mouseDown: false, answer: '', loudness: 0 })
const timerStartedAt = ref(Date.now())
const variables = ref({})
const variableVisibility = ref({})
const variableMonitorPositions = ref({})
const variableNames = computed(() => getVariableNames())
const visibleVariables = computed(() => variableNames.value
  .filter((name) => variableVisibility.value[name] === true)
  .map((name) => [name, variables.value[name] ?? 0]))
const lists = ref({})
const listVisibility = ref({})
const listMonitorPositions = ref({})
const visibleLists = computed(() => getListNames()
  .filter((name) => listVisibility.value[name] === true)
  .map((name) => [name, Array.isArray(lists.value[name]) ? lists.value[name] : []]))
const createDefaultBroadcastMessages = () => [{ label: '消息1', value: 'message1' }]
const broadcastMessages = ref(createDefaultBroadcastMessages())
const costumeTool = ref('brush')
const costumeFill = ref('#ee91bb')
const costumeStroke = ref('#3d3564')
const costumeLineWidth = ref(6)
const costumeEraserSize = ref(40)
const costumeHistory = ref([])
const costumeHistoryIndex = ref(-1)
const costumeCursor = ref({ x: 0, y: 0, scale: 1, visible: false })
const eraserCursorStyle = computed(() => {
  const size = Math.max(8, costumeEraserSize.value * costumeCursor.value.scale)
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${costumeCursor.value.x}px`,
    top: `${costumeCursor.value.y}px`,
  }
})
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
stageBackdrops.value = backdropOptions.map((item) => ({ id: item.id, name: item.label, preset: item.id, color: item.color, data: null, scale: 100, x: 0, y: 0, size: 100, rotation: 90, visible: true }))
const costumeOptions = [
  { id: 'star', label: '星星' },
  { id: 'bot', label: '机器人' },
  { id: 'dot', label: '圆点' },
]
const colorOptions = [
  ['粉红', '#ee91bb'],
  ['薄荷绿', '#52bbc4'],
  ['紫色', '#8178cf'],
  ['橙黄', '#f2a54a'],
  ['白色', '#ffffff'],
]
function createTaskState() {
  return {
    label: '我的迷宫',
    hint: '点击地图设置墙体、起点和终点。',
    rows: 6,
    cols: 8,
    walls: [],
    start: { row: 5, col: 0, direction: 1 },
    target: { row: 0, col: 7 },
    row: 5,
    col: 0,
    direction: 1,
    limit: 12,
    blockLimit: 20,
    moves: 0,
    completed: false,
    failed: false,
    status: '点击地图设置墙体、起点和终点。',
  }
}

const task = ref(createTaskState())
const taskEditorMode = ref('wall')
const taskBlockCount = ref(0)
const mazeGridStyle = computed(() => ({ gridTemplateColumns: `repeat(${task.value.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${task.value.rows}, minmax(0, 1fr))` }))
const mazeCells = computed(() => Array.from({ length: task.value.rows * task.value.cols }, (_, index) => ({ row: Math.floor(index / task.value.cols), col: index % task.value.cols })))
const taskToolboxCategories = [{
  kind: 'category', name: '迷宫指令', colour: '#8176bc', contents: [
    { kind: 'block', type: 'event_when_run' },
    { kind: 'block', type: 'task_forward' },
    { kind: 'block', type: 'task_turn' },
    { kind: 'block', type: 'task_repeat_target' },
    { kind: 'block', type: 'task_if_path' },
    { kind: 'block', type: 'task_if_else_path' },
  ],
}]

const baseCatalog = [
  { id: 'free', tag: 'SCENE', title: '自由创作基座', description: '角色、舞台、造型和声音自由组合，适合故事、动画和互动作品。' },
  { id: 'interactive', tag: 'RULES', title: '互动任务基座', description: '在场景上配置目标、规则与完成条件，适合迷宫、收集、闯关和答题。' },
  { id: 'ai', tag: 'AI LAB', title: 'AI 交互基座', description: '把人脸识别、你画我猜等 AI 能力作为作品中的可调用积木。' },
]

function createProjectBase(kind = 'free') {
  const catalog = baseCatalog?.find((item) => item.id === kind)
  return {
    version: 1,
    kind,
    label: catalog?.title || '自由创作基座',
    scene: { actors: ['default-sprite'], props: [], background: '#ffffff' },
    capabilities: kind === 'ai' ? ['motion', 'looks', 'sound', 'ai'] : ['motion', 'looks', 'sound'],
    rules: kind === 'interactive' ? { completion: 'reach-target', moveLimit: 8 } : { completion: 'manual' },
  }
}

projectBase.value = createProjectBase()

let workspace = null
let resizeObserver = null
let sketchingPointerId = null
let costumeDrawingPointerId = null
let costumeStartPoint = null
let costumeStartSnapshot = null
let stopRequested = false
let switchingActor = false
let actorDragState = null
let dataMonitorDragState = null
let directionDialPointerId = null
let microphoneStream = null
let loudnessAnalyser = null
let loudnessFrame = null
const pendingCloneIds = []
const activeSoundContexts = new Set()
const variableVisibilityControls = new Map()
const listItemInputRefs = new Map()
let toolboxInteractionHandler = null
let toolboxSyncFrame = null
let workspaceChangeHandler = null
let broadcastSequence = 0

const FLYOUT_SCALE = 0.84
const FLYOUT_END_PADDING = 1200
const blockColourPalette = {
  motion: '#648bc8',
  looks: '#8d69b8',
  sound: '#ad6fb6',
  event: '#d49a54',
  control: '#d9b34c',
  sensing: '#5caeb6',
  operator: '#61ae79',
  variable: '#cb7593',
  task: '#8176bc',
  ai: '#5caeb6',
  extension: '#8d77c2',
}

const toolboxCategories = ref([
    {
      kind: 'category', name: '运动', colour: blockColourPalette.motion, contents: [
        { kind: 'block', type: 'motion_move', inputs: { STEPS: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'motion_turn', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } } },
        { kind: 'block', type: 'motion_turn_left', inputs: { DEGREES: { shadow: { type: 'math_number', fields: { NUM: 15 } } } } },
        { kind: 'block', type: 'motion_point_direction', inputs: { DIRECTION: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
        { kind: 'block', type: 'motion_point_towards_mouse' },
        { kind: 'block', type: 'motion_goto', inputs: { X: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'block', type: 'motion_goto_target' },
        { kind: 'block', type: 'motion_glide_target', inputs: { SECONDS: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'motion_glide', inputs: { SECONDS: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, X: { shadow: { type: 'math_number', fields: { NUM: 0 } } }, Y: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'block', type: 'motion_set_x', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'block', type: 'motion_set_y', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'block', type: 'motion_change_x', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'motion_change_y', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'motion_bounce' },
      ],
    },
    {
      kind: 'category', name: '外观', colour: blockColourPalette.looks, contents: [
        { kind: 'block', type: 'looks_say_for_seconds', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: '你好！' } } }, SECONDS: { shadow: { type: 'math_number', fields: { NUM: 2 } } } } },
        { kind: 'block', type: 'looks_say', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: '你好！' } } } } },
        { kind: 'block', type: 'looks_think_for_seconds', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: '嗯……' } } }, SECONDS: { shadow: { type: 'math_number', fields: { NUM: 2 } } } } },
        { kind: 'block', type: 'looks_think', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: '嗯……' } } } } },
        { kind: 'block', type: 'looks_switch_costume' },
        { kind: 'block', type: 'looks_next_costume' },
        { kind: 'block', type: 'looks_switch_backdrop' },
        { kind: 'block', type: 'looks_next_backdrop' },
        { kind: 'block', type: 'looks_change_size', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'looks_set_color' },
        { kind: 'block', type: 'looks_set_size', inputs: { SIZE: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
        { kind: 'block', type: 'looks_change_effect', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 25 } } } } },
        { kind: 'block', type: 'looks_set_effect', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'block', type: 'looks_clear_effects' },
        { kind: 'block', type: 'looks_show' },
        { kind: 'block', type: 'looks_hide' },
        { kind: 'block', type: 'looks_go_to_layer' },
        { kind: 'block', type: 'looks_change_layer', inputs: { LAYERS: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
      ],
    },
    {
      kind: 'category', name: '声音', colour: blockColourPalette.sound, contents: [
        { kind: 'block', type: 'sound_play_until_done' },
        { kind: 'block', type: 'sound_play' },
        { kind: 'block', type: 'sound_stop_all' },
        { kind: 'block', type: 'sound_change_pitch', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'sound_set_pitch', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
        { kind: 'block', type: 'sound_clear_effects' },
        { kind: 'block', type: 'sound_change_volume', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: -10 } } } } },
        { kind: 'block', type: 'sound_set_volume', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
        { kind: 'block', type: 'sound_volume' },
      ],
    },
    {
      kind: 'category', name: '事件', colour: blockColourPalette.event, contents: [
        { kind: 'block', type: 'event_when_run' },
        { kind: 'block', type: 'event_when_key' },
        { kind: 'block', type: 'event_when_sprite_clicked' },
        { kind: 'block', type: 'event_when_backdrop' },
        { kind: 'block', type: 'event_when_receive' },
        { kind: 'block', type: 'event_broadcast' },
        { kind: 'block', type: 'event_broadcast_wait' },
      ],
    },
    {
      kind: 'category', name: '控制', colour: blockColourPalette.control, contents: [
        { kind: 'block', type: 'control_wait', inputs: { SECONDS: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'control_repeat', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'control_forever' },
        { kind: 'block', type: 'control_if' },
        { kind: 'block', type: 'control_if_else' },
        { kind: 'block', type: 'control_wait_until' },
        { kind: 'block', type: 'control_repeat_until' },
        { kind: 'block', type: 'control_stop_all' },
        { kind: 'block', type: 'control_when_clone_start' },
        { kind: 'block', type: 'control_create_clone' },
        { kind: 'block', type: 'control_delete_clone' },
      ],
    },
    {
      kind: 'category', name: '侦测', colour: blockColourPalette.sensing, contents: [
        { kind: 'block', type: 'sensing_touching_mouse' },
        { kind: 'block', type: 'sensing_touching_color' },
        { kind: 'block', type: 'sensing_distance_mouse' },
        { kind: 'block', type: 'sensing_ask', inputs: { QUESTION: { shadow: { type: 'text', fields: { TEXT: '你叫什么名字？' } } } } },
        { kind: 'block', type: 'sensing_answer' },
        { kind: 'block', type: 'sensing_mouse_x' },
        { kind: 'block', type: 'sensing_mouse_y' },
        { kind: 'block', type: 'sensing_sprite_x' },
        { kind: 'block', type: 'sensing_key_pressed' },
        { kind: 'block', type: 'sensing_mouse_down' },
        { kind: 'block', type: 'sensing_set_drag_mode' },
        { kind: 'block', type: 'sensing_loudness' },
        { kind: 'block', type: 'sensing_timer' },
        { kind: 'block', type: 'sensing_reset_timer' },
        { kind: 'block', type: 'sensing_backdrop_number' },
        { kind: 'block', type: 'sensing_current' },
        { kind: 'block', type: 'sensing_days_since_2000' },
        { kind: 'block', type: 'sensing_username' },
      ],
    },
    {
      kind: 'category', name: '运算', colour: blockColourPalette.operator, contents: [
        { kind: 'block', type: 'operator_add', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'operator_subtract' },
        { kind: 'block', type: 'operator_multiply' },
        { kind: 'block', type: 'operator_divide' },
        { kind: 'block', type: 'operator_random', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
        { kind: 'block', type: 'operator_gt', inputs: { A: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, B: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'operator_lt' },
        { kind: 'block', type: 'operator_equals', inputs: { A: { shadow: { type: 'text', fields: { TEXT: '你好' } } }, B: { shadow: { type: 'text', fields: { TEXT: '世界' } } } } },
        { kind: 'block', type: 'operator_and' },
        { kind: 'block', type: 'operator_or' },
        { kind: 'block', type: 'operator_not' },
        { kind: 'block', type: 'operator_join' },
        { kind: 'block', type: 'operator_letter_of' },
        { kind: 'block', type: 'operator_length' },
        { kind: 'block', type: 'operator_contains' },
        { kind: 'block', type: 'operator_list_contains', inputs: { ITEM: { shadow: { type: 'text', fields: { TEXT: '项目' } } } } },
        { kind: 'block', type: 'operator_mod' },
        { kind: 'block', type: 'operator_round' },
        { kind: 'block', type: 'operator_math' },
      ],
    },
    {
      kind: 'category', name: '变量', colour: blockColourPalette.variable, contents: [
        { kind: 'button', text: '建立一个变量', callbackKey: 'CREATE_VARIABLE' },
        { kind: 'block', type: 'variable_set', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
        { kind: 'block', type: 'variable_change', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'variable_show' },
        { kind: 'block', type: 'variable_hide' },
        { kind: 'block', type: 'variable_get' },
      ],
    },
    {
      kind: 'category', name: 'AI 实验室', colour: blockColourPalette.ai, contents: [
        { kind: 'block', type: 'ai_face_check' },
      ],
    },
    {
      kind: 'category', name: '任务工具', colour: blockColourPalette.task, contents: [
        { kind: 'block', type: 'task_forward' },
        { kind: 'block', type: 'task_turn' },
        { kind: 'block', type: 'task_repeat_target' },
        { kind: 'block', type: 'task_if_path' },
        { kind: 'block', type: 'task_if_else_path' },
      ],
    },
])

const stageAppearanceContents = [
  { kind: 'block', type: 'looks_switch_backdrop' },
  { kind: 'block', type: 'looks_switch_backdrop_wait' },
  { kind: 'block', type: 'looks_next_backdrop' },
  { kind: 'block', type: 'looks_backdrop_number' },
]

const drawGuessExtension = {
  id: 'draw-guess',
  name: '你画我猜',
  description: '使用 AI 涂鸦画板创作，并让 AI 识别你的作品。',
  colour: blockColourPalette.extension,
}

const drawGuessCategory = {
  kind: 'category', name: '你画我猜', colour: drawGuessExtension.colour, contents: [
    { kind: 'block', type: 'extension_open_draw_board' },
    { kind: 'block', type: 'extension_clear_draw_board' },
    { kind: 'block', type: 'extension_close_draw_board' },
    { kind: 'block', type: 'ai_draw_guess' },
    { kind: 'block', type: 'ai_draw_results' },
  ],
}

const hasPluginControls = computed(() => enabledExtensions.value.length > 0)
const hasDrawGuessExtension = computed(() => enabledExtensions.value.includes(drawGuessExtension.id))

function buildToolbox() {
  const sourceCategories = projectTemplate.value === 'interactive' ? taskToolboxCategories : toolboxCategories.value
  const categories = projectTemplate.value === 'interactive'
    ? sourceCategories
    : isStageSelected.value
    ? sourceCategories.map((category, index) => index === 0
      ? { ...category, contents: [] }
      : index === 1
        ? { ...category, contents: stageAppearanceContents }
        : category)
    : sourceCategories
  const names = getVariableNames()
  const currentListNames = getListNames()
  const variableContents = [
    { kind: 'button', text: '建立一个变量', callbackKey: 'CREATE_VARIABLE' },
    { kind: 'sep', gap: Math.max(120, Object.keys(variables.value).length * 42 + 30) },
    { kind: 'block', type: 'variable_set', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } },
    { kind: 'block', type: 'variable_change', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
    { kind: 'block', type: 'variable_show' },
    { kind: 'block', type: 'variable_hide' },
    ...names.map((name) => ({ kind: 'block', type: 'variable_get', fields: { NAME: name } })),
    { kind: 'sep', gap: 18 },
    { kind: 'button', text: '新建列表', callbackKey: 'CREATE_LIST' },
    ...currentListNames.map((name) => ({ kind: 'block', type: 'list_get', fields: { NAME: name } })),
    ...(currentListNames.length ? [
      { kind: 'sep', gap: 12 },
      { kind: 'block', type: 'list_add', inputs: { ITEM: { shadow: { type: 'text', fields: { TEXT: '东西' } } } } },
      { kind: 'block', type: 'list_delete', inputs: { INDEX: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
      { kind: 'block', type: 'list_delete_all' },
      { kind: 'block', type: 'list_insert', inputs: { ITEM: { shadow: { type: 'text', fields: { TEXT: '东西' } } }, INDEX: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
      { kind: 'block', type: 'list_replace', inputs: { INDEX: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, ITEM: { shadow: { type: 'text', fields: { TEXT: '东西' } } } } },
      { kind: 'block', type: 'list_item', inputs: { INDEX: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
      { kind: 'block', type: 'list_index_of', inputs: { ITEM: { shadow: { type: 'text', fields: { TEXT: '东西' } } } } },
      { kind: 'block', type: 'list_length' },
      { kind: 'block', type: 'list_contains', inputs: { ITEM: { shadow: { type: 'text', fields: { TEXT: '东西' } } } } },
      { kind: 'block', type: 'list_show' },
      { kind: 'block', type: 'list_hide' },
    ] : []),
  ]
  return {
    kind: 'flyoutToolbox',
    contents: [
      ...categories.flatMap(({ name, contents }, index) => [
      { kind: 'label', text: name, webClass: 'block-workshop-toolbox-label' },
      ...(isStageSelected.value && projectTemplate.value !== 'interactive' && index === 0 ? [{ kind: 'label', text: '舞台不能使用运动积木', webClass: 'block-workshop-toolbox-notice' }] : []),
      ...(name === '变量' ? variableContents : contents),
      ...(index < categories.length - 1 ? [{ kind: 'sep', gap: 22 }] : []),
      ]),
      { kind: 'sep', gap: FLYOUT_END_PADDING },
      { kind: 'label', text: 'spacer', webClass: 'block-workshop-toolbox-spacer' },
    ],
  }
}

function refreshToolbox() {
  if (!workspace) return
  workspace.updateToolbox(buildToolbox())
  window.requestAnimationFrame(() => {
    installCostumeFields()
    installVariableFields()
    installListFields()
    refreshCostumeFields()
    refreshVariableFields()
    refreshListFields()
    pinFlyoutScale()
    syncVariableVisibilityControls()
    resizeWorkspace()
  })
}

function getActiveToolboxCategories() {
  return projectTemplate.value === 'interactive' ? taskToolboxCategories : toolboxCategories.value
}

function syncExtensions(extensionIds = []) {
  const normalizedIds = Array.from(new Set(extensionIds)).filter((id) => id === drawGuessExtension.id)
  enabledExtensions.value = normalizedIds
  const hasCategory = toolboxCategories.value.some((category) => category.name === drawGuessCategory.name)
  if (normalizedIds.includes(drawGuessExtension.id) && !hasCategory) toolboxCategories.value.push(drawGuessCategory)
  if (!normalizedIds.includes(drawGuessExtension.id) && hasCategory) {
    toolboxCategories.value = toolboxCategories.value.filter((category) => category.name !== drawGuessCategory.name)
    drawBoardVisible.value = false
    drawGuessResults.value = []
    if (workbenchTab.value === 'plugins') workbenchTab.value = 'code'
  }
  refreshToolbox()
}

function enableDrawGuessExtension() {
  if (!hasDrawGuessExtension.value) syncExtensions([...enabledExtensions.value, drawGuessExtension.id])
  showExtensionPicker.value = false
  workbenchTab.value = 'code'
  nextTick(() => {
    setupSketch()
    scrollToolboxTo(drawGuessCategory.name)
  })
  ElMessage.success('已添加“你画我猜”插件')
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

const taskStarterWorkspace = {
  blocks: {
    languageVersion: 0,
    blocks: [{
      type: 'event_when_run',
      x: 80,
      y: 80,
      next: { block: { type: 'task_forward' } },
    }],
  },
}

const inputDefaults = {
  motion_move: { STEPS: 10 },
  motion_turn: { DEGREES: 15 },
  motion_turn_left: { DEGREES: 15 },
  motion_point_direction: { DIRECTION: 90 },
  motion_goto: { X: 0, Y: 0 },
  motion_glide_target: { SECONDS: 1 },
  motion_glide: { SECONDS: 1, X: 0, Y: 0 },
  motion_set_x: { VALUE: 0 },
  motion_set_y: { VALUE: 0 },
  motion_change_x: { VALUE: 10 },
  motion_change_y: { VALUE: 10 },
  looks_say: { TEXT: '你好！', text: true },
  looks_say_for_seconds: { TEXT: '你好！', SECONDS: 2, types: { TEXT: 'text' } },
  looks_think: { TEXT: '嗯……', text: true },
  looks_think_for_seconds: { TEXT: '嗯……', SECONDS: 2, types: { TEXT: 'text' } },
  looks_change_size: { VALUE: 10 },
  looks_set_size: { SIZE: 100 },
  looks_change_effect: { VALUE: 25 },
  looks_set_effect: { VALUE: 0 },
  looks_change_layer: { LAYERS: 1 },
  sound_change_pitch: { VALUE: 10 },
  sound_set_pitch: { VALUE: 100 },
  sound_change_volume: { VALUE: -10 },
  sound_set_volume: { VALUE: 100 },
  control_wait: { SECONDS: 1 },
  control_repeat: { TIMES: 10 },
  operator_add: { A: 1, B: 1 },
  operator_subtract: { A: 1, B: 1 },
  operator_multiply: { A: 1, B: 1 },
  operator_divide: { A: 1, B: 1 },
  operator_random: { FROM: 1, TO: 10 },
  operator_gt: { A: 1, B: 1 },
  operator_lt: { A: 1, B: 1 },
  operator_equals: { A: '你好', B: '世界', text: true },
  operator_and: { A: false, B: false, types: { A: 'boolean', B: 'boolean' } },
  operator_or: { A: false, B: false, types: { A: 'boolean', B: 'boolean' } },
  operator_not: { VALUE: false, types: { VALUE: 'boolean' } },
  operator_join: { A: '你好', B: '世界', types: { A: 'text', B: 'text' } },
  operator_letter_of: { INDEX: 1, TEXT: '世界', types: { TEXT: 'text' } },
  operator_length: { TEXT: '你好', text: true },
  operator_contains: { TEXT: '你好', PART: '你', types: { TEXT: 'text', PART: 'text' } },
  operator_mod: { A: 10, B: 3 },
  operator_round: { VALUE: 3.14 },
  operator_math: { VALUE: 9 },
  sensing_ask: { QUESTION: '你叫什么名字？', text: true },
  variable_set: { VALUE: 0 },
  variable_change: { VALUE: 1 },
  list_add: { ITEM: '东西', text: true },
  list_delete: { INDEX: 1 },
  list_insert: { ITEM: '东西', INDEX: 1, types: { ITEM: 'text' } },
  list_replace: { INDEX: 1, ITEM: '东西', types: { ITEM: 'text' } },
  list_item: { INDEX: 1 },
  list_index_of: { ITEM: '东西', text: true },
  list_contains: { ITEM: '东西', text: true },
}

function ensureDefaultInputs() {
  if (!workspace) return
  workspace.getAllBlocks(false).forEach((block) => {
    const defaults = inputDefaults[block.type]
    if (!defaults) return
    Object.entries(defaults).forEach(([name, defaultValue]) => {
      if (name === 'text' || name === 'types' || block.getInputTargetBlock(name)) return
      const input = block.getInput(name)
      if (!input?.connection) return
      const inputType = defaults.types?.[name] || (defaults.text ? 'text' : 'number')
      const isText = inputType === 'text'
      const isBoolean = inputType === 'boolean'
      const shadow = workspace.newBlock(isText ? 'text' : isBoolean ? 'logic_boolean' : 'math_number')
      shadow.setShadow(true)
      shadow.setFieldValue(isBoolean ? (defaultValue ? 'TRUE' : 'FALSE') : String(defaultValue), isText ? 'TEXT' : isBoolean ? 'BOOL' : 'NUM')
      input.connection.connect(shadow.outputConnection)
    })
  })
}

function createActor(name = '新角色', index = actors.value.length + 1) {
  return {
    id: `sprite-${Date.now()}-${index}`,
    state: {
      x: 0,
      y: 0,
      rotation: 90,
      message: '',
      messageMode: 'say',
      messageOrigin: null,
      color: ['#ee91bb', '#52bbc4', '#8178cf', '#f2a54a'][index % 4],
      effectColor: 0,
      backdrop: stage.value.backdrop,
      size: 86,
      visible: true,
      draggable: true,
      spriteName: name,
      costume: index % 2 ? 'bot' : 'dot',
      costumeData: null,
      costumes: [{ id: 'costume-1', name: index % 2 ? '机器人' : '圆点', preset: index % 2 ? 'bot' : 'dot', data: null }],
      selectedCostumeId: 'costume-1',
      sound: 'pop',
      pitch: 100,
      volume: 70,
    },
    workspaceJson: JSON.stringify(starterWorkspace),
  }
}

function ensureCostumeCollection(state) {
  if (!Array.isArray(state.costumes) || !state.costumes.length) {
    const preset = state.costume || 'star'
    state.costumes = [{ id: 'costume-1', name: costumeOptions.find((item) => item.id === preset)?.label || '造型 1', preset, data: state.costumeData || null }]
  }
  if (!state.costumes.some((item) => item.id === state.selectedCostumeId)) state.selectedCostumeId = state.costumes[0].id
  return state.costumes.find((item) => item.id === state.selectedCostumeId)
}

function applySelectedCostume(state) {
  const costume = ensureCostumeCollection(state)
  state.costume = costume.preset || 'star'
  state.costumeData = costume.data || null
  return costume
}

function updateSelectedCostume(state, { preset, data, name } = {}) {
  const costume = ensureCostumeCollection(state)
  if (preset !== undefined) costume.preset = preset
  if (data !== undefined) costume.data = data
  if (name) costume.name = name
  applySelectedCostume(state)
  return costume
}

function getCostumeOptions() {
  ensureCostumeCollection(stage.value)
  return stage.value.costumes.map((costume, index) => [costume.name || `造型 ${index + 1}`, costume.id])
}

function findCostume(state, value) {
  ensureCostumeCollection(state)
  return state.costumes.find((costume) => (
    costume.id === value
    || costume.preset === value
    || costume.name === value
  ))
}

function selectActorCostume(state, value) {
  const costume = findCostume(state, value)
  if (!costume) return null
  state.selectedCostumeId = costume.id
  return applySelectedCostume(state)
}

function getSelectedActor() {
  return actors.value.find((actor) => actor.id === selectedActorId.value) || actors.value[0]
}

function getBroadcastOptions() {
  return [
    ...broadcastMessages.value.map((item) => [item.label, item.value]),
    ['新消息', '__new__'],
  ]
}

function getVariableOptions() {
  const names = getVariableNames()
  const options = names.map((name) => [name, name])
  options.push(['新建变量', '__new__'])
  return options
}

function getVariableNames() {
  return [...new Set(['分数', '计时', ...Object.keys(variables.value)])]
}

function getListOptions() {
  const names = getListNames()
  const options = names.map((name) => [name, name])
  options.push(['新建列表', '__new__'])
  return options
}

function getListNames() {
  return Object.keys(lists.value)
}

function ensureVariableVisible(name) {
  if (!name || Object.prototype.hasOwnProperty.call(variableVisibility.value, name)) return
  setVariableVisibility(name, true)
}

function setVariableVisibility(name, visible) {
  if (!name) return
  const nextVisible = Boolean(visible)
  variableVisibility.value = { ...variableVisibility.value, [name]: nextVisible }
  syncVariableVisibilityControls()
}

function setListVisibility(name, visible) {
  if (!name) return
  listVisibility.value = { ...listVisibility.value, [name]: Boolean(visible) }
  syncVariableVisibilityControls()
}

function setListItems(name, items) {
  if (!name) return
  lists.value = { ...lists.value, [name]: Array.isArray(items) ? items : [] }
}

function listItemInputKey(name, index) {
  return `${name}\u0000${index}`
}

function setListItemInputRef(element, name, index) {
  const key = listItemInputKey(name, index)
  if (element) listItemInputRefs.set(key, element)
  else listItemInputRefs.delete(key)
}

function appendListItem(name) {
  const items = [...getListItems(name), '']
  setListItems(name, items)
  nextTick(() => listItemInputRefs.get(listItemInputKey(name, items.length - 1))?.focus())
}

function updateListItem(name, index, value) {
  const items = [...getListItems(name)]
  if (index < 0 || index >= items.length) return
  items[index] = value
  setListItems(name, items)
}

function removeListItem(name, index) {
  const items = [...getListItems(name)]
  if (index < 0 || index >= items.length) return
  items.splice(index, 1)
  setListItems(name, items)
}

function commitVariable(enteredName, field = null) {
  const name = String(enteredName || '').trim().slice(0, 40)
  if (!name) return null
  if (getVariableNames().includes(name)) {
    ElMessage.warning('\u8be5\u53d8\u91cf\u5df2\u5b58\u5728')
    field?.setValue(name)
    return name
  }
  variables.value = { ...variables.value, [name]: 0 }
  variableVisibility.value = { ...variableVisibility.value, [name]: true }
  refreshVariableFields()
  refreshToolbox()
  nextTick(() => scrollToolboxTo('变量'))
  window.requestAnimationFrame(() => selectVariableInFlyout(name))
  ElMessage.success(`\u5df2\u521b\u5efa\u53d8\u91cf\u201c${name}\u201d`)
  field?.setValue(name)
  return name
}

function createVariable({ field = null } = {}) {
  const previousValue = field?.getValue()
  ElMessageBox.prompt('\u8bf7\u8f93\u5165\u65b0\u53d8\u91cf\u7684\u540d\u79f0', '\u65b0\u5efa\u53d8\u91cf', {
    confirmButtonText: '\u521b\u5efa',
    cancelButtonText: '\u53d6\u6d88',
    inputPlaceholder: '\u4f8b\u5982\uff1a\u6211\u7684\u53d8\u91cf',
    inputValue: '',
    customClass: 'variable-create-message-box',
    inputValidator: (value) => {
      const name = String(value || '').trim()
      return name && name.length <= 40 ? true : '\u53d8\u91cf\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a\u4e14\u4e0d\u8d85\u8fc740\u4e2a\u5b57\u7b26'
    },
  }).then(({ value }) => commitVariable(value, field)).catch(() => {
    if (field && previousValue) field.setValue(previousValue)
  })
  return null
}

function commitList(enteredName, field = null) {
  const name = String(enteredName || '').trim().slice(0, 40)
  if (!name) return null
  if (getListNames().includes(name)) {
    ElMessage.warning('该列表已存在')
    field?.setValue(name)
    return name
  }
  lists.value = { ...lists.value, [name]: [] }
  listVisibility.value = { ...listVisibility.value, [name]: true }
  refreshListFields()
  refreshToolbox()
  nextTick(() => scrollToolboxTo('变量'))
  window.requestAnimationFrame(() => selectListInFlyout(name))
  ElMessage.success(`已创建列表“${name}”`)
  field?.setValue(name)
  return name
}

function createList({ field = null } = {}) {
  const previousValue = field?.getValue()
  ElMessageBox.prompt('请输入新列表的名称', '新建列表', {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPlaceholder: '例如：词库',
    inputValue: '',
    customClass: 'variable-create-message-box',
    inputValidator: (value) => {
      const name = String(value || '').trim()
      return name && name.length <= 40 ? true : '列表名称不能为空且不超过40个字符'
    },
  }).then(({ value }) => commitList(value, field)).catch(() => {
    if (field && previousValue) field.setValue(previousValue)
  })
  return null
}

const variableBlockTypes = ['variable_set', 'variable_change', 'variable_show', 'variable_hide', 'variable_get']

function installDynamicDropdownOptions(field, optionGenerator) {
  const currentValue = field.getValue()
  field.setOptions(optionGenerator)
  const options = field.getOptions(false)
  if (options.some((option) => Array.isArray(option) && option[1] === currentValue)) field.setValue(currentValue)
}

function installVariableField(block) {
  if (!block || !variableBlockTypes.includes(block.type)) return
  if (block.type === 'variable_get') return
  const field = block.getField('NAME')
  if (!field || field.__variableReady || typeof field.setValidator !== 'function' || typeof field.setOptions !== 'function') return
  field.__variableReady = true
  installDynamicDropdownOptions(field, getVariableOptions)
  field.setValidator((nextValue) => {
    if (nextValue !== '__new__') return nextValue
    const previousValue = field.getValue() || getVariableOptions()[0][1]
    const createdName = createVariable({ field })
    return createdName || previousValue
  })
}

const listBlockTypes = [
  'list_add', 'list_delete', 'list_delete_all', 'list_insert', 'list_replace',
  'list_item', 'list_index_of', 'list_length', 'list_contains', 'list_show', 'list_hide', 'list_get',
]

function installListField(block) {
  if (!block || !listBlockTypes.includes(block.type) || block.type === 'list_get') return
  const field = block.getField('NAME')
  if (!field || field.__listReady || typeof field.setValidator !== 'function' || typeof field.setOptions !== 'function') return
  field.__listReady = true
  installDynamicDropdownOptions(field, getListOptions)
  field.setValidator((nextValue) => {
    if (nextValue !== '__new__') return nextValue
    const previousValue = field.getValue() || getListOptions()[0][1]
    const createdName = createList({ field })
    return createdName || previousValue
  })
}

function installVariableFields() {
  getVariableBlocks().forEach(installVariableField)
}

function installListFields() {
  getVariableBlocks().forEach(installListField)
}

function refreshVariableFields() {
  getVariableBlocks().forEach((block) => {
    if (!variableBlockTypes.includes(block.type) || block.type === 'variable_get') return
    const field = block.getField('NAME')
    if (!field) return
    if (!field.__variableReady) installVariableField(block)
    else field.getOptions(false)
  })
}

function refreshListFields() {
  getVariableBlocks().forEach((block) => {
    if (!listBlockTypes.includes(block.type) || block.type === 'list_get') return
    const field = block.getField('NAME')
    if (!field) return
    if (!field.__listReady) installListField(block)
    else field.getOptions(false)
  })
}

function getVariableBlocks() {
  const blocks = workspace?.getAllBlocks(false) || []
  const flyoutWorkspace = workspace?.getFlyout()?.getWorkspace?.()
  if (flyoutWorkspace) blocks.push(...flyoutWorkspace.getAllBlocks(false))
  return blocks
}

function expandNumberFieldHitTargets() {
  workspace?.getAllBlocks(false).forEach((block) => {
    if (block.type !== 'math_number' || block.isInFlyout) return
    const field = block.getField('NUM')
    const fieldRoot = field?.getSvgRoot?.()
    const fieldSize = field?.getSize?.()
    const blockSize = block.getHeightWidth?.()
    if (!fieldRoot || !fieldSize || !blockSize) return
    let hitTarget = fieldRoot.querySelector('.block-workshop-number-hit-target')
    if (!hitTarget) {
      hitTarget = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      hitTarget.setAttribute('class', 'block-workshop-number-hit-target')
      hitTarget.setAttribute('fill', 'transparent')
      hitTarget.setAttribute('pointer-events', 'all')
      hitTarget.setAttribute('rx', '8')
      fieldRoot.insertBefore(hitTarget, fieldRoot.firstChild)
    }
    hitTarget.setAttribute('x', '-8')
    hitTarget.setAttribute('y', '-4')
    hitTarget.setAttribute('width', String(Math.max(fieldSize.width + 16, blockSize.width - 8)))
    hitTarget.setAttribute('height', String(Math.max(fieldSize.height + 8, blockSize.height - 4)))
  })
}

function scheduleNumberFieldHitTargetSync() {
  window.requestAnimationFrame(expandNumberFieldHitTargets)
}

function createVariableVisibilityControl(block, canvas) {
  const svgNamespace = 'http://www.w3.org/2000/svg'
  const group = document.createElementNS(svgNamespace, 'g')
  const box = document.createElementNS(svgNamespace, 'rect')
  const check = document.createElementNS(svgNamespace, 'path')
  group.setAttribute('class', 'variable-visibility-control')
  group.setAttribute('role', 'checkbox')
  group.setAttribute('tabindex', '0')
  box.setAttribute('width', '16')
  box.setAttribute('height', '16')
  box.setAttribute('rx', '3')
  check.setAttribute('d', 'M3.5 8.5 6.5 11.5 12.5 4.5')
  check.setAttribute('fill', 'none')
  check.setAttribute('stroke', '#fff')
  check.setAttribute('stroke-linecap', 'round')
  check.setAttribute('stroke-linejoin', 'round')
  check.setAttribute('stroke-width', '2')
  group.append(box, check)
  const toggle = (event) => {
    event.preventDefault()
    event.stopPropagation()
    const name = block.getFieldValue('NAME')
    if (block.type === 'list_get') setListVisibility(name, listVisibility.value[name] !== true)
    else setVariableVisibility(name, variableVisibility.value[name] !== true)
  }
  group.addEventListener('pointerdown', (event) => event.stopPropagation())
  group.addEventListener('click', toggle)
  group.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') toggle(event)
  })
  canvas.appendChild(group)
  return group
}

function syncVariableVisibilityControls() {
  const flyoutWorkspace = workspace?.getFlyout()?.getWorkspace?.()
  const canvas = flyoutWorkspace?.getCanvas?.()
  if (!flyoutWorkspace || !canvas) return
  const reporterBlocks = flyoutWorkspace.getAllBlocks(false).filter((block) => ['variable_get', 'list_get'].includes(block.type))
  const activeBlockIds = new Set(reporterBlocks.map((block) => block.id))
  variableVisibilityControls.forEach((control, blockId) => {
    if (activeBlockIds.has(blockId) && control.isConnected) return
    control.remove()
    variableVisibilityControls.delete(blockId)
  })
  reporterBlocks.forEach((block) => {
    const name = block.getFieldValue('NAME')
    let position = block.getRelativeToSurfaceXY?.()
    const size = block.getHeightWidth?.()
    if (!name || !position || !size) return
    const minimumBlockX = 26
    if (position.x < minimumBlockX) {
      block.moveBy(minimumBlockX - position.x, 0)
      position = block.getRelativeToSurfaceXY?.()
    }
    let control = variableVisibilityControls.get(block.id)
    if (!control || !control.isConnected) {
      control = createVariableVisibilityControl(block, canvas)
      variableVisibilityControls.set(block.id, control)
    }
    const x = position.x - 24
    const y = position.y + Math.max(0, (size.height - 16) / 2)
    const isList = block.type === 'list_get'
    const visible = isList ? listVisibility.value[name] === true : variableVisibility.value[name] === true
    control.setAttribute('transform', `translate(${x}, ${y})`)
    control.setAttribute('aria-label', isList ? `在画布显示列表 ${name}` : `在画布显示 ${name}`)
    control.setAttribute('aria-checked', String(visible))
    control.classList.toggle('checked', visible)
  })
}

function clearVariableVisibilityControls() {
  variableVisibilityControls.forEach((control) => control.remove())
  variableVisibilityControls.clear()
}

function selectVariableInFlyout(name) {
  const options = getVariableOptions()
  getVariableBlocks().forEach((block) => {
    if (!block.isInFlyout && !block.workspace?.isFlyout) return
    if (!variableBlockTypes.includes(block.type) || block.type === 'variable_get') return
    const field = block.getField('NAME')
    if (field && options.some(([, value]) => value === name)) field.setValue(name)
  })
}

function selectListInFlyout(name) {
  const options = getListOptions()
  getVariableBlocks().forEach((block) => {
    if (!block.isInFlyout && !block.workspace?.isFlyout) return
    if (!listBlockTypes.includes(block.type) || block.type === 'list_get') return
    const field = block.getField('NAME')
    if (field && options.some(([, value]) => value === name)) field.setValue(name)
  })
}

function getBackdropFieldValue(backdrop) {
  const preset = backdropOptions.find((item) => item.id === backdrop?.id)
  return backdrop?.preset === 'custom' || !preset ? backdrop?.id : (backdrop?.color || preset.color)
}

function getBackdropOptions() {
  return stageBackdrops.value.map((backdrop) => [
    backdrop.name || backdropOptions.find((item) => item.id === backdrop.id)?.label || backdrop.id,
    getBackdropFieldValue(backdrop),
  ])
}

function findBackdrop(value) {
  return stageBackdrops.value.find((backdrop) => (
    backdrop.id === value
    || backdrop.color === value
    || backdrop.name === value
  )) || backdropOptions.find((backdrop) => backdrop.id === value || backdrop.color === value)
}

function backdropFieldMatches(block, backdrop) {
  const value = block.getFieldValue('BACKDROP')
  return value === backdrop?.id || value === backdrop?.color || value === backdrop?.name
}

function refreshBackdropFields() {
  const options = getBackdropOptions()
  workspace?.getAllBlocks(false).forEach((block) => {
    if (!['looks_switch_backdrop', 'looks_switch_backdrop_wait', 'event_when_backdrop'].includes(block.type)) return
    const field = block.getField('BACKDROP')
    if (!field) return
    field.menuGenerator_ = getBackdropOptions
    field.generatedOptions = options
  })
}

function installCostumeField(block) {
  if (!block || block.type !== 'looks_switch_costume') return
  const field = block.getField('COSTUME')
  if (!field || field.__costumeReady) return
  field.__costumeReady = true
  const currentValue = field.getValue()
  field.setOptions(getCostumeOptions)
  if (findCostume(stage.value, currentValue)) field.setValue(findCostume(stage.value, currentValue).id)
}

function installCostumeFields() {
  workspace?.getAllBlocks(false).forEach(installCostumeField)
}

function refreshCostumeFields() {
  const options = getCostumeOptions()
  workspace?.getAllBlocks(false).forEach((block) => {
    if (block.type !== 'looks_switch_costume') return
    const field = block.getField('COSTUME')
    if (!field) return
    const currentCostume = findCostume(stage.value, field.getValue())
    field.setOptions(getCostumeOptions)
    field.getOptions(false)
    if (currentCostume) field.setValue(currentCostume.id)
    else if (options.length) field.setValue(options[0][1])
  })
}

function normalizeBroadcastMessages(messages) {
  const normalized = []
  const seenValues = new Set()
  const seenLabels = new Set()
  if (Array.isArray(messages)) {
    messages.forEach((item) => {
      const label = typeof item === 'string' ? item.trim() : String(item?.label || '').trim()
      const value = typeof item === 'string' ? '' : String(item?.value || '').trim()
      if (!label || !value || value === '__new__' || seenValues.has(value) || seenLabels.has(label)) return
      normalized.push({ label: label.slice(0, 40), value })
      seenValues.add(value)
      seenLabels.add(label)
    })
  }
  if (!normalized.some((item) => item.value === 'message1')) normalized.unshift({ label: '消息1', value: 'message1' })
  return normalized
}

function createBroadcastValue() {
  broadcastSequence += 1
  return `message-${Date.now().toString(36)}-${broadcastSequence.toString(36)}`
}

function installBroadcastField(block) {
  if (!block || !['event_when_receive', 'event_broadcast', 'event_broadcast_wait'].includes(block.type)) return
  const field = block.getField('MESSAGE')
  if (!field || field.__broadcastReady) return
  field.__broadcastReady = true
  field.menuGenerator_ = getBroadcastOptions
  field.setValidator((nextValue) => {
    if (nextValue !== '__new__') return nextValue
    const previousValue = field.getValue() || 'message1'
    const enteredName = window.prompt('\u8bf7\u8f93\u5165\u65b0\u6d88\u606f\u7684\u540d\u79f0\uff1a', '')
    const label = String(enteredName || '').trim().slice(0, 40)
    if (!label) return previousValue
    const existing = broadcastMessages.value.find((item) => item.label === label)
    if (existing) return existing.value
    const item = { label, value: createBroadcastValue() }
    broadcastMessages.value = [...broadcastMessages.value, item]
    refreshBroadcastFields()
    return item.value
  })
}

function installBroadcastFields() {
  workspace?.getAllBlocks(false).forEach(installBroadcastField)
}

function refreshBroadcastFields() {
  const options = getBroadcastOptions()
  workspace?.getAllBlocks(false).forEach((block) => {
    if (!['event_when_receive', 'event_broadcast', 'event_broadcast_wait'].includes(block.type)) return
    const field = block.getField('MESSAGE')
    if (!field) return
    field.menuGenerator_ = getBroadcastOptions
    field.generatedOptions = options
  })
}

function collectSerializedFieldValues(serialized, fieldName) {
  const values = new Map()
  const visit = (block) => {
    if (!block || typeof block !== 'object') return
    const value = block.fields?.[fieldName]
    if (block.id && value !== undefined) values.set(block.id, value)
    if (block.next?.block) visit(block.next.block)
    Object.values(block.inputs || {}).forEach((input) => {
      if (input?.block) visit(input.block)
      if (input?.shadow) visit(input.shadow)
    })
  }
  ;(serialized?.blocks?.blocks || []).forEach(visit)
  return values
}

function restoreBroadcastFieldValues(serialized) {
  const values = collectSerializedFieldValues(serialized, 'MESSAGE')
  values.forEach((value) => {
    if (value === undefined || broadcastMessages.value.some((item) => item.value === value)) return
    broadcastMessages.value = [...broadcastMessages.value, { label: String(value), value: String(value) }]
  })
  refreshBroadcastFields()
  values.forEach((value, id) => {
    const block = workspace?.getBlockById(id)
    const field = block?.getField('MESSAGE')
    if (!field || value === undefined) return
    field.setValue(value)
  })
}

function restoreBackdropFieldValues(serialized) {
  const values = collectSerializedFieldValues(serialized, 'BACKDROP')
  values.forEach((value, id) => {
    const block = workspace?.getBlockById(id)
    const field = block?.getField('BACKDROP')
    if (field && value !== undefined) field.setValue(value)
  })
  refreshBackdropFields()
}

function restoreCostumeFieldValues(serialized) {
  const values = collectSerializedFieldValues(serialized, 'COSTUME')
  refreshCostumeFields()
  values.forEach((value, id) => {
    const costume = findCostume(stage.value, value)
    const field = workspace?.getBlockById(id)?.getField('COSTUME')
    if (field && costume) field.setValue(costume.id)
  })
}

function persistSelectedActor() {
  if (isStageSelected.value) {
    stageState.value = {
      ...stageState.value,
      ...stage.value,
      selectedBackdropId: stageState.value.selectedBackdropId || stage.value.selectedBackdropId || 'white',
    }
    if (workspace) stageWorkspaceJson.value = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
    return
  }
  const actor = getSelectedActor()
  if (!actor) return
  actor.state = { ...stage.value }
  if (workspace) actor.workspaceJson = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
}

function loadActorWorkspace(actor) {
  if (!workspace || !actor) return
  const serialized = JSON.parse(actor.workspaceJson || JSON.stringify(starterWorkspace))
  workspace.clear()
  Blockly.serialization.workspaces.load(serialized, workspace)
  ensureDefaultInputs()
  installBroadcastFields()
  installCostumeFields()
  installVariableFields()
  installListFields()
  refreshListFields()
  refreshBackdropFields()
  restoreBroadcastFieldValues(serialized)
  restoreBackdropFieldValues(serialized)
  restoreCostumeFieldValues(serialized)
  syncTaskBlockLimit()
  window.requestAnimationFrame(resizeWorkspace)
}

function selectActor(actorId) {
  if (actorId === selectedActorId.value) return
  persistSelectedActor()
  if (actorId === stageId) {
    switchingActor = true
    selectedActorId.value = stageId
    stage.value = { ...stage.value, ...stageState.value }
    switchingActor = false
    loadActorWorkspace({ workspaceJson: stageWorkspaceJson.value })
    refreshToolbox()
    if (workbenchTab.value === 'costume') nextTick(loadCostumeCanvas)
    return
  }
  const nextActor = actors.value.find((actor) => actor.id === actorId)
  if (!nextActor) return
  applySelectedCostume(nextActor.state)
  switchingActor = true
  selectedActorId.value = actorId
  stage.value = { ...stage.value, ...nextActor.state }
  switchingActor = false
  loadActorWorkspace(nextActor)
  refreshToolbox()
  if (workbenchTab.value === 'costume') nextTick(loadCostumeCanvas)
}

function addActor() {
  persistSelectedActor()
  const actor = createActor(`角色 ${actors.value.length + 1}`)
  actors.value.push(actor)
  selectActor(actor.id)
}

function removeActor(actorId) {
  if (actors.value.length <= 1) {
    ElMessage.warning('至少保留一个角色。')
    return
  }
  const index = actors.value.findIndex((actor) => actor.id === actorId)
  if (index === -1) return
  actors.value.splice(index, 1)
  if (selectedActorId.value === actorId) {
    const nextActor = actors.value[Math.max(0, index - 1)]
    switchingActor = true
    selectedActorId.value = nextActor.id
    stage.value = { ...stage.value, ...nextActor.state }
    switchingActor = false
    loadActorWorkspace(nextActor)
  }
}

function reorderSelectedActor(mode, amount = 1) {
  if (isStageSelected.value || actors.value.length < 2) return
  const currentIndex = actors.value.findIndex((actor) => actor.id === selectedActorId.value)
  if (currentIndex < 0) return
  const actor = actors.value[currentIndex]
  actors.value.splice(currentIndex, 1)
  if (mode === 'front') {
    actors.value.push(actor)
    return
  }
  if (mode === 'back') {
    actors.value.unshift(actor)
    return
  }
  const distance = Math.max(1, Math.floor(Number(amount) || 1))
  const targetIndex = mode === 'forward'
    ? Math.min(actors.value.length, currentIndex + distance)
    : Math.max(0, currentIndex - distance)
  actors.value.splice(targetIndex, 0, actor)
}

function resetActors() {
  actors.value = [{ id: 'sprite-1', state: { ...stage.value }, workspaceJson: JSON.stringify(starterWorkspace) }]
  selectedActorId.value = 'sprite-1'
}

watch(stage, (value) => {
  if (switchingActor) return
  if (isStageSelected.value) {
    stageState.value = { ...value }
    return
  }
  const actor = getSelectedActor()
  if (actor) actor.state = { ...value }
}, { deep: true })

function defineBlocks() {
  const definitions = [
    { type: 'event_when_run', message0: '当点击开始运行', nextStatement: null, colour: '#f2a54a', tooltip: '点击开始运行时，从这里开始执行。' },
    { type: 'motion_move', message0: '移动 %1 步', args0: [{ type: 'input_value', name: 'STEPS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_turn', message0: '右转 %1 度', args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_turn_left', message0: '左转 %1 度', args0: [{ type: 'input_value', name: 'DEGREES', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_point_direction', message0: '面向 %1 方向', args0: [{ type: 'input_value', name: 'DIRECTION', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_point_towards_mouse', message0: '面向鼠标方向', previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_goto', message0: '移到 x %1 y %2', args0: [{ type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_goto_target', message0: '移动到 %1', args0: [{ type: 'field_dropdown', name: 'TARGET', options: [['随机位置', 'random'], ['鼠标位置', 'mouse']] }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_glide_target', message0: '在 %1 秒内滑行到 %2', args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }, { type: 'field_dropdown', name: 'TARGET', options: [['随机位置', 'random'], ['鼠标位置', 'mouse']] }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_glide', message0: '在 %1 秒内滑行到 x: %2 y: %3', args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }, { type: 'input_value', name: 'X', check: 'Number' }, { type: 'input_value', name: 'Y', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_set_x', message0: '将 x 坐标设为 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_set_y', message0: '将 y 坐标设为 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_change_x', message0: '将 x 坐标增加 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_change_y', message0: '将 y 坐标增加 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'motion_bounce', message0: '碰到边缘就反弹', previousStatement: null, nextStatement: null, colour: '#5d9cf4' },
    { type: 'looks_say_for_seconds', message0: '说 %1 %2 秒', args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }, { type: 'input_value', name: 'SECONDS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_say', message0: '说 %1', args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_think_for_seconds', message0: '思考 %1 %2 秒', args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }, { type: 'input_value', name: 'SECONDS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_think', message0: '思考 %1', args0: [{ type: 'input_value', name: 'TEXT', check: 'String' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_switch_costume', message0: '换成 %1 造型', args0: [{ type: 'field_dropdown', name: 'COSTUME', options: getCostumeOptions }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_next_costume', message0: '下一个造型', previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_switch_backdrop', message0: '换成 %1 背景', args0: [{ type: 'field_dropdown', name: 'BACKDROP', options: backdropOptions.map((item) => [item.label, item.color]) }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_switch_backdrop_wait', message0: '换成 %1 背景并等待', args0: [{ type: 'field_dropdown', name: 'BACKDROP', options: backdropOptions.map((item) => [item.label, item.color]) }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_next_backdrop', message0: '下一个背景', previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_backdrop_number', message0: '背景 %1', args0: [{ type: 'field_dropdown', name: 'PROPERTY', options: [['编号', 'number'], ['名称', 'name']] }], output: null, colour: '#a46ad9' },
    { type: 'looks_change_size', message0: '将大小增加 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_set_color', message0: '角色颜色设为 %1', args0: [{ type: 'field_dropdown', name: 'COLOR', options: colorOptions }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_set_size', message0: '角色大小设为 %1 %', args0: [{ type: 'input_value', name: 'SIZE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_change_effect', message0: '将 %1 特效增加 %2', args0: [{ type: 'field_dropdown', name: 'EFFECT', options: [['颜色', 'color']] }, { type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_set_effect', message0: '将 %1 特效设为 %2', args0: [{ type: 'field_dropdown', name: 'EFFECT', options: [['颜色', 'color']] }, { type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_clear_effects', message0: '清除图形特效', previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_show', message0: '显示角色', previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_hide', message0: '隐藏角色', previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_go_to_layer', message0: '移到 %1', args0: [{ type: 'field_dropdown', name: 'POSITION', options: [['最前面', 'front'], ['最后面', 'back']] }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'looks_change_layer', message0: '%1 %2 层', args0: [{ type: 'field_dropdown', name: 'DIRECTION', options: [['前移', 'forward'], ['后移', 'backward']] }, { type: 'input_value', name: 'LAYERS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#a46ad9' },
    { type: 'sound_play_until_done', message0: '播放声音 %1 等待播完', args0: [{ type: 'field_dropdown', name: 'SOUND', options: soundOptions.map((item) => [item.label, item.id]) }], previousStatement: null, nextStatement: null, colour: '#c65ad1' },
    { type: 'sound_play', message0: '播放声音 %1', args0: [{ type: 'field_dropdown', name: 'SOUND', options: soundOptions.map((item) => [item.label, item.id]) }], previousStatement: null, nextStatement: null, colour: '#c65ad1' },
    { type: 'sound_stop_all', message0: '停止所有声音', previousStatement: null, nextStatement: null, colour: '#c65ad1' },
    { type: 'sound_change_pitch', message0: '将音调特效增加 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#c65ad1' },
    { type: 'sound_set_pitch', message0: '将音调特效设为 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#c65ad1' },
    { type: 'sound_clear_effects', message0: '清除音效', previousStatement: null, nextStatement: null, colour: '#c65ad1' },
    { type: 'sound_change_volume', message0: '将音量增加 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#c65ad1' },
    { type: 'sound_set_volume', message0: '将音量设为 %1 %', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#c65ad1' },
    { type: 'sound_volume', message0: '音量', output: 'Number', colour: '#c65ad1' },
    { type: 'event_when_key', message0: '当按下 %1 键', args0: [{ type: 'field_dropdown', name: 'KEY', options: [['空格', ' '], ['上箭头', 'ArrowUp'], ['下箭头', 'ArrowDown'], ['左箭头', 'ArrowLeft'], ['右箭头', 'ArrowRight']] }], nextStatement: null, colour: '#f2a54a' },
    { type: 'event_when_sprite_clicked', message0: '当角色被点击', nextStatement: null, colour: '#f2a54a' },
    { type: 'event_when_backdrop', message0: '当背景换成 %1', args0: [{ type: 'field_dropdown', name: 'BACKDROP', options: backdropOptions.map((item) => [item.label, item.color]) }], nextStatement: null, colour: '#f2a54a' },
    { type: 'event_when_receive', message0: '当接收到 %1', args0: [{ type: 'field_dropdown', name: 'MESSAGE', options: [['消息1', 'message1']] }], nextStatement: null, colour: '#f2a54a' },
    { type: 'event_broadcast', message0: '广播 %1', args0: [{ type: 'field_dropdown', name: 'MESSAGE', options: [['消息1', 'message1']] }], previousStatement: null, nextStatement: null, colour: '#f2a54a' },
    { type: 'event_broadcast_wait', message0: '广播 %1 并等待', args0: [{ type: 'field_dropdown', name: 'MESSAGE', options: [['消息1', 'message1']] }], previousStatement: null, nextStatement: null, colour: '#f2a54a' },
    { type: 'control_wait', message0: '等待 %1 秒', args0: [{ type: 'input_value', name: 'SECONDS', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_repeat', message0: '重复 %1 次 %2', args0: [{ type: 'input_value', name: 'TIMES', check: 'Number' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_forever', message0: '重复执行 %1', args0: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_if', message0: '如果 %1 那么 %2', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_if_else', message0: '如果 %1 那么 %2 否则 %3', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'DO' }, { type: 'input_statement', name: 'ELSE' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_wait_until', message0: '等待直到 %1', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_repeat_until', message0: '重复执行直到 %1 %2', args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_stop_all', message0: '停止 全部脚本', previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_when_clone_start', message0: '当作为克隆体启动时', nextStatement: null, colour: '#e9b640' },
    { type: 'control_create_clone', message0: '克隆 自己', previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'control_delete_clone', message0: '删除此克隆体', previousStatement: null, nextStatement: null, colour: '#e9b640' },
    { type: 'sensing_mouse_x', message0: '鼠标的 x 坐标', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_mouse_y', message0: '鼠标的 y 坐标', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_sprite_x', message0: '角色的 x 坐标', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_key_pressed', message0: '按下了 %1 键？', args0: [{ type: 'field_dropdown', name: 'KEY', options: [['空格', ' '], ['上箭头', 'ArrowUp'], ['下箭头', 'ArrowDown'], ['左箭头', 'ArrowLeft'], ['右箭头', 'ArrowRight']] }], output: 'Boolean', colour: '#52bbc4' },
    { type: 'sensing_touching_mouse', message0: '碰到鼠标指针？', output: 'Boolean', colour: '#52bbc4' },
    { type: 'sensing_touching_color', message0: '碰到颜色 %1？', args0: [{ type: 'field_dropdown', name: 'COLOR', options: colorOptions }], output: 'Boolean', colour: '#52bbc4' },
    { type: 'sensing_distance_mouse', message0: '到鼠标指针的距离', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_ask', message0: '询问 %1 并等待', args0: [{ type: 'input_value', name: 'QUESTION', check: 'String' }], previousStatement: null, nextStatement: null, colour: '#52bbc4' },
    { type: 'sensing_answer', message0: '回答', output: 'String', colour: '#52bbc4' },
    { type: 'sensing_mouse_down', message0: '鼠标按下？', output: 'Boolean', colour: '#52bbc4' },
    { type: 'sensing_set_drag_mode', message0: '将拖动模式设为 %1', args0: [{ type: 'field_dropdown', name: 'MODE', options: [['可拖动', 'draggable'], ['不可拖动', 'not-draggable']] }], previousStatement: null, nextStatement: null, colour: '#52bbc4' },
    { type: 'sensing_loudness', message0: '响度', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_timer', message0: '计时器', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_reset_timer', message0: '计时器归零', previousStatement: null, nextStatement: null, colour: '#52bbc4' },
    { type: 'sensing_backdrop_number', message0: '背景编号', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_current', message0: '当前 %1', args0: [{ type: 'field_dropdown', name: 'UNIT', options: [['年', 'year'], ['月', 'month'], ['日期', 'date'], ['星期', 'day'], ['小时', 'hour'], ['分钟', 'minute'], ['秒', 'second']] }], output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_days_since_2000', message0: '2000 年至今的天数', output: 'Number', colour: '#52bbc4' },
    { type: 'sensing_username', message0: '用户名', output: 'String', colour: '#52bbc4' },
    { type: 'operator_add', message0: '%1 + %2', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_subtract', message0: '%1 - %2', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_multiply', message0: '%1 × %2', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_divide', message0: '%1 ÷ %2', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_random', message0: '在 %1 到 %2 间取随机数', args0: [{ type: 'input_value', name: 'FROM', check: 'Number' }, { type: 'input_value', name: 'TO', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_gt', message0: '%1 > %2', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }], output: 'Boolean', colour: '#58bf70' },
    { type: 'operator_lt', message0: '%1 < %2', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }], output: 'Boolean', colour: '#58bf70' },
    { type: 'operator_equals', message0: '%1 = %2', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }], output: 'Boolean', colour: '#58bf70' },
    { type: 'operator_and', message0: '%1 且 %2', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }, { type: 'input_value', name: 'B', check: 'Boolean' }], output: 'Boolean', colour: '#58bf70' },
    { type: 'operator_or', message0: '%1 或 %2', args0: [{ type: 'input_value', name: 'A', check: 'Boolean' }, { type: 'input_value', name: 'B', check: 'Boolean' }], output: 'Boolean', colour: '#58bf70' },
    { type: 'operator_not', message0: '不成立 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Boolean' }], output: 'Boolean', colour: '#58bf70' },
    { type: 'operator_join', message0: '连接 %1 和 %2', args0: [{ type: 'input_value', name: 'A' }, { type: 'input_value', name: 'B' }], output: 'String', colour: '#58bf70' },
    { type: 'operator_letter_of', message0: '%1 的第 %2 个字符', args0: [{ type: 'input_value', name: 'TEXT' }, { type: 'input_value', name: 'INDEX', check: 'Number' }], output: 'String', colour: '#58bf70' },
    { type: 'operator_length', message0: '%1 的字符数', args0: [{ type: 'input_value', name: 'TEXT' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_contains', message0: '%1 包含 %2？', args0: [{ type: 'input_value', name: 'TEXT' }, { type: 'input_value', name: 'PART' }], output: 'Boolean', colour: '#58bf70' },
    { type: 'operator_list_contains', message0: '列表 %1 包含项目 %2？', args0: [{ type: 'input_value', name: 'LIST' }, { type: 'input_value', name: 'ITEM' }], output: 'Boolean', colour: '#58bf70', tooltip: '判断一个值是否存在于列表中。' },
    { type: 'operator_mod', message0: '%1 除以 %2 的余数', args0: [{ type: 'input_value', name: 'A', check: 'Number' }, { type: 'input_value', name: 'B', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_round', message0: '四舍五入 %1', args0: [{ type: 'input_value', name: 'VALUE', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'operator_math', message0: '%1 %2', args0: [{ type: 'field_dropdown', name: 'OP', options: [['绝对值', 'abs'], ['平方根', 'sqrt'], ['sin', 'sin'], ['cos', 'cos'], ['tan', 'tan']] }, { type: 'input_value', name: 'VALUE', check: 'Number' }], output: 'Number', colour: '#58bf70' },
    { type: 'variable_set', message0: '将 %1 设为 %2', args0: [{ type: 'field_dropdown', name: 'NAME', options: getVariableOptions }, { type: 'input_value', name: 'VALUE' }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'variable_change', message0: '将 %1 增加 %2', args0: [{ type: 'field_dropdown', name: 'NAME', options: getVariableOptions }, { type: 'input_value', name: 'VALUE', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'variable_show', message0: '显示变量 %1', args0: [{ type: 'field_dropdown', name: 'NAME', options: getVariableOptions }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'variable_hide', message0: '隐藏变量 %1', args0: [{ type: 'field_dropdown', name: 'NAME', options: getVariableOptions }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'variable_get', message0: '%1', args0: [{ type: 'field_label_serializable', name: 'NAME', text: '分数' }], output: null, colour: '#ef6687' },
    { type: 'list_add', message0: '将 %1 加入 %2', args0: [{ type: 'input_value', name: 'ITEM' }, { type: 'field_dropdown', name: 'NAME', options: getListOptions }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'list_delete', message0: '删除 %1 的第 %2 项', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }, { type: 'input_value', name: 'INDEX', check: 'Number' }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'list_delete_all', message0: '删除 %1 的全部项目', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'list_insert', message0: '在 %1 的第 %2 项前插入 %3', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }, { type: 'input_value', name: 'INDEX', check: 'Number' }, { type: 'input_value', name: 'ITEM' }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'list_replace', message0: '将 %1 的第 %2 项替换为 %3', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }, { type: 'input_value', name: 'INDEX', check: 'Number' }, { type: 'input_value', name: 'ITEM' }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'list_item', message0: '%1 的第 %2 项', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }, { type: 'input_value', name: 'INDEX', check: 'Number' }], output: null, colour: '#ef6687' },
    { type: 'list_index_of', message0: '%1 中第一个 %2 的编号', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }, { type: 'input_value', name: 'ITEM' }], output: 'Number', colour: '#ef6687' },
    { type: 'list_length', message0: '%1 的项目数', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }], output: 'Number', colour: '#ef6687' },
    { type: 'list_contains', message0: '%1 包含 %2？', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }, { type: 'input_value', name: 'ITEM' }], output: 'Boolean', colour: '#ef6687' },
    { type: 'list_show', message0: '显示列表 %1', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'list_hide', message0: '隐藏列表 %1', args0: [{ type: 'field_dropdown', name: 'NAME', options: getListOptions }], previousStatement: null, nextStatement: null, colour: '#ef6687' },
    { type: 'list_get', message0: '%1', args0: [{ type: 'field_label_serializable', name: 'NAME', text: '列表' }], output: null, colour: '#ef6687' },
    { type: 'task_forward', message0: '向前走 1 格', previousStatement: null, nextStatement: null, colour: '#8178cf' },
    { type: 'task_turn', message0: '向 %1 转', args0: [{ type: 'field_dropdown', name: 'SIDE', options: [['左', 'left'], ['右', 'right']] }], previousStatement: null, nextStatement: null, colour: '#8178cf' },
    { type: 'task_repeat_target', message0: '重复直到到达目标 %1', args0: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: '#8178cf' },
    { type: 'task_if_path', message0: '如果 %1 可以通行 执行 %2', args0: [{ type: 'field_dropdown', name: 'DIRECTION', options: [['正前方', 'forward'], ['左侧', 'left'], ['右侧', 'right']] }, { type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: '#8178cf' },
    { type: 'task_if_else_path', message0: '如果 %1 可以通行 执行 %2 否则 %3', args0: [{ type: 'field_dropdown', name: 'DIRECTION', options: [['正前方', 'forward'], ['左侧', 'left'], ['右侧', 'right']] }, { type: 'input_statement', name: 'DO' }, { type: 'input_statement', name: 'ELSE' }], previousStatement: null, nextStatement: null, colour: '#8178cf' },
    { type: 'ai_face_check', message0: 'AI 识别人脸', previousStatement: null, nextStatement: null, colour: '#52bbc4', tooltip: '打开摄像头拍照后，调用平台人脸识别能力。' },
    { type: 'extension_open_draw_board', message0: '打开涂鸦画板', previousStatement: null, nextStatement: null, colour: '#8d63dc', tooltip: '打开“你画我猜”插件中的 AI 涂鸦画板。' },
    { type: 'extension_clear_draw_board', message0: '清除涂鸦画板', previousStatement: null, nextStatement: null, colour: '#8d63dc', tooltip: '清除“你画我猜”插件画板中的全部内容。' },
    { type: 'extension_close_draw_board', message0: '关闭涂鸦画板', previousStatement: null, nextStatement: null, colour: '#8d63dc', tooltip: '关闭“你画我猜”插件中的 AI 涂鸦画板。' },
    { type: 'ai_draw_guess', message0: 'AI 猜一猜画板', previousStatement: null, nextStatement: null, colour: '#52bbc4', tooltip: '识别右侧画板中的涂鸦。' },
    { type: 'ai_draw_results', message0: '结果列表', output: null, colour: '#52bbc4', tooltip: '返回 AI 最近一次猜测得到的候选结果列表。' },
  ]
  definitions.forEach((definition) => {
    const category = definition.type.split('_')[0]
    if (blockColourPalette[category]) definition.colour = blockColourPalette[category]
    if (category === 'list') definition.colour = blockColourPalette.variable
  })
  definitions.forEach((definition) => {
    if (!['event_when_receive', 'event_broadcast', 'event_broadcast_wait'].includes(definition.type)) return
    const messageField = definition.args0?.find((arg) => arg.type === 'field_dropdown' && arg.name === 'MESSAGE')
    if (messageField) messageField.options = getBroadcastOptions
  })
  definitions.forEach((definition) => {
    if (!['looks_switch_backdrop', 'looks_switch_backdrop_wait', 'event_when_backdrop'].includes(definition.type)) return
    const backdropField = definition.args0?.find((arg) => arg.type === 'field_dropdown' && arg.name === 'BACKDROP')
    if (backdropField) backdropField.options = getBackdropOptions
  })
  Blockly.common.defineBlocksWithJsonArray(definitions.filter(({ type }) => !Blockly.Blocks[type]))
  const costumeDefinition = Blockly.Blocks.looks_switch_costume
  if (costumeDefinition && !costumeDefinition.__costumeDynamicInit) {
    const originalInit = costumeDefinition.init
    costumeDefinition.init = function initCostumeBlock() {
      originalInit.call(this)
      installCostumeField(this)
    }
    costumeDefinition.__costumeDynamicInit = true
  }
  ;['variable_set', 'variable_change', 'variable_show', 'variable_hide', 'variable_get'].forEach((type) => {
    const definition = Blockly.Blocks[type]
    if (!definition || definition.__variableDynamicInit) return
    const originalInit = definition.init
    definition.init = function initVariableBlock() {
      originalInit.call(this)
      installVariableField(this)
    }
    definition.__variableDynamicInit = true
  })
  listBlockTypes.forEach((type) => {
    const definition = Blockly.Blocks[type]
    if (!definition || definition.__listDynamicInit) return
    const originalInit = definition.init
    definition.init = function initListBlock() {
      originalInit.call(this)
      installListField(this)
    }
    definition.__listDynamicInit = true
  })
}

function initWorkspace() {
  Blockly.setLocale(ZhHans)
  defineBlocks()
  workspace = Blockly.inject(blocklyRef.value, {
    readOnly: false,
    toolbox: buildToolbox(),
    renderer: 'zelos',
    trashcan: true,
    move: { drag: true, scrollbars: true, wheel: false },
    grid: { spacing: 22, length: 3, colour: '#d8d3f1', snap: true },
    zoom: { controls: true, wheel: true, startScale: 0.9, maxScale: 1.4, minScale: 0.55 },
    theme: Blockly.Theme.defineTheme('eduWorkshop', {
      base: Blockly.Themes.Classic,
      componentStyles: { workspaceBackgroundColour: '#fbfbff', toolboxBackgroundColour: '#fff', toolboxForegroundColour: '#3d3564', flyoutBackgroundColour: '#f6f4ff', flyoutForegroundColour: '#3d3564' },
      fontStyle: { family: 'Microsoft YaHei, sans-serif', weight: '600', size: 12 },
    }),
  })
  workspace.registerButtonCallback('CREATE_VARIABLE', createVariable)
  workspace.registerButtonCallback('CREATE_LIST', createList)
  pinFlyoutScale()
  Blockly.serialization.workspaces.load(starterWorkspace, workspace)
  ensureDefaultInputs()
  installBroadcastFields()
  installCostumeFields()
  installVariableFields()
  installListFields()
  refreshBroadcastFields()
  refreshCostumeFields()
  refreshVariableFields()
  refreshListFields()
  refreshBackdropFields()
  syncVariableVisibilityControls()
  scheduleNumberFieldHitTargetSync()
  workspaceChangeHandler = (event) => {
    if (event.type === Blockly.Events.BLOCK_CREATE) {
      installBroadcastFields()
      installCostumeFields()
      installVariableFields()
      installListFields()
    }
    if ([Blockly.Events.BLOCK_CREATE, Blockly.Events.BLOCK_CHANGE].includes(event.type)) scheduleNumberFieldHitTargetSync()
    syncTaskBlockCount()
  }
  workspace.addChangeListener(workspaceChangeHandler)
  actors.value[0].workspaceJson = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
  syncTaskBlockLimit()
  resizeObserver = new ResizeObserver(resizeWorkspace)
  resizeObserver.observe(blocklyRef.value)
  window.requestAnimationFrame(resizeWorkspace)
}

function getFlyoutCategoryLabel(categoryName) {
  return workspace?.getFlyout()?.getContents().find((item) => {
    const element = item.getElement?.()
    return item.getType?.() === 'label' && element?.getButtonText?.() === categoryName
  })
}

function syncActiveToolboxCategory() {
  const flyout = blocklyRef.value?.querySelector('.blocklyFlyout')
  if (!flyout) return
  const visibleTop = flyout.getBoundingClientRect().top + 16
  const active = getActiveToolboxCategories()
    .map((category) => ({
      category,
      top: getFlyoutCategoryLabel(category.name)?.getElement?.()?.getSvgRoot?.()?.getBoundingClientRect?.().top,
    }))
    .filter(({ top }) => Number.isFinite(top) && top <= visibleTop)
    .at(-1)?.category
  activeToolboxCategory.value = active?.name || getActiveToolboxCategories()[0].name
}

function scheduleToolboxCategorySync() {
  if (toolboxSyncFrame) return
  toolboxSyncFrame = window.requestAnimationFrame(() => {
    toolboxSyncFrame = null
    syncActiveToolboxCategory()
    syncVariableVisibilityControls()
  })
}

function scrollToolboxTo(categoryName) {
  const flyout = workspace?.getFlyout()
  const flyoutWorkspace = flyout?.getWorkspace?.()
  const label = getFlyoutCategoryLabel(categoryName)
  if (!flyoutWorkspace || !label) return
  activeToolboxCategory.value = categoryName
  const flyoutElement = blocklyRef.value?.querySelector('.blocklyFlyout')
  let targetElement = label.getElement?.()?.getSvgRoot?.()
  if (categoryName === '变量') {
    const firstVariableReporter = flyoutWorkspace.getAllBlocks(false).find((block) => block.type === 'variable_get')
    targetElement = firstVariableReporter?.getSvgRoot?.() || targetElement
  }
  if (flyoutElement && targetElement) {
    const scale = Number(flyout.getFlyoutScale?.() || 1)
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const flyoutRect = flyoutElement.getBoundingClientRect()
      const targetRect = targetElement.getBoundingClientRect()
      const offset = (targetRect.top - flyoutRect.top - 12) / scale
      if (!Number.isFinite(offset) || Math.abs(offset) < 2) break
      flyoutWorkspace.scroll(flyoutWorkspace.scrollX, flyoutWorkspace.scrollY - offset)
    }
  }
  scheduleToolboxCategorySync()
}

function pinFlyoutScale() {
  const flyout = workspace?.getFlyout()
  if (!flyout) return
  flyout.getFlyoutScale = () => FLYOUT_SCALE
  flyout.reflow()
  toolboxInteractionHandler = scheduleToolboxCategorySync
  blocklyRef.value?.addEventListener('wheel', toolboxInteractionHandler, { capture: true, passive: true })
  blocklyRef.value?.addEventListener('pointermove', toolboxInteractionHandler, true)
  blocklyRef.value?.addEventListener('pointerup', toolboxInteractionHandler, true)
  scheduleToolboxCategorySync()
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

function normalizeSpriteSize(value, fallback = 100) {
  const size = Number(value)
  return Number.isFinite(size) ? Math.max(0, size) : fallback
}

function spriteSizePixels(size) {
  return 65 * normalizeSpriteSize(size) / 100
}

function actorRadius() {
  return spriteSizePixels(stage.value.size) / 2
}

function currentDateValue(unit) {
  const now = new Date()
  const values = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    date: now.getDate(),
    day: now.getDay() + 1,
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
  }
  return values[unit] ?? values.year
}

function updateLoudness() {
  if (!loudnessAnalyser) return
  const samples = new Uint8Array(loudnessAnalyser.fftSize)
  loudnessAnalyser.getByteTimeDomainData(samples)
  const level = Math.sqrt(samples.reduce((sum, sample) => sum + ((sample - 128) / 128) ** 2, 0) / samples.length)
  inputState.value.loudness = Math.min(100, Math.round(level * 280))
  loudnessFrame = window.requestAnimationFrame(updateLoudness)
}

async function startLoudnessMeter() {
  if (loudnessAnalyser || !navigator.mediaDevices?.getUserMedia) return
  try {
    microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    const context = new AudioContext()
    loudnessAnalyser = context.createAnalyser()
    loudnessAnalyser.fftSize = 1024
    context.createMediaStreamSource(microphoneStream).connect(loudnessAnalyser)
    updateLoudness()
  } catch {
    inputState.value.loudness = 0
  }
}

function stopLoudnessMeter() {
  if (loudnessFrame) window.cancelAnimationFrame(loudnessFrame)
  loudnessFrame = null
  loudnessAnalyser = null
  microphoneStream?.getTracks().forEach((track) => track.stop())
  microphoneStream = null
}

function getListItems(name) {
  const items = lists.value[name]
  return Array.isArray(items) ? items : []
}

function getListIndex(value, length, allowEnd = false) {
  const index = Math.floor(Number(value)) - 1
  const maximum = allowEnd ? length : length - 1
  return Number.isFinite(index) && index >= 0 && index <= maximum ? index : -1
}

function listValuesEqual(left, right) {
  return String(left).toLocaleLowerCase() === String(right).toLocaleLowerCase()
}

function readListValue(block) {
  if (!block) return []
  if (block.type === 'ai_draw_results') return drawGuessResults.value
  if (block.type === 'list_get') return getListItems(block.getFieldValue('NAME'))
  const value = readValue(block, [])
  return Array.isArray(value) ? value : []
}

function readValue(block, fallback = 0) {
  if (!block) return fallback
  if (block.type === 'math_number') return Number(block.getFieldValue('NUM')) || 0
  if (block.type === 'text') return block.getFieldValue('TEXT') || ''
  if (block.type === 'logic_boolean') return block.getFieldValue('BOOL') === 'TRUE'
  if (block.type === 'sensing_mouse_x') return Math.round(inputState.value.mouseX)
  if (block.type === 'sensing_mouse_y') return Math.round(inputState.value.mouseY)
  if (block.type === 'sensing_sprite_x') return Math.round(stage.value.x)
  if (block.type === 'sensing_touching_mouse') return Math.hypot(stage.value.x - inputState.value.mouseX, stage.value.y - inputState.value.mouseY) <= actorRadius()
  if (block.type === 'sensing_touching_color') return String(stage.value.backdrop).toLowerCase() === String(block.getFieldValue('COLOR')).toLowerCase()
  if (block.type === 'sensing_distance_mouse') return Math.round(Math.hypot(stage.value.x - inputState.value.mouseX, stage.value.y - inputState.value.mouseY))
  if (block.type === 'sensing_answer') return inputState.value.answer
  if (block.type === 'sensing_mouse_down') return inputState.value.mouseDown
  if (block.type === 'sensing_loudness') {
    void startLoudnessMeter()
    return inputState.value.loudness
  }
  if (block.type === 'sensing_timer') return Math.round((Date.now() - timerStartedAt.value) / 10) / 100
  if (block.type === 'sensing_backdrop_number') {
    const selectedId = stageState.value.selectedBackdropId || stage.value.selectedBackdropId
    const index = stageBackdrops.value.findIndex((item) => item.id === selectedId)
    return Math.max(0, index + 1)
  }
  if (block.type === 'looks_backdrop_number') {
    const index = stageBackdrops.value.findIndex((item) => item.id === stage.value.selectedBackdropId)
    return block.getFieldValue('PROPERTY') === 'name'
      ? (stageBackdrops.value[index]?.name || '')
      : Math.max(0, index + 1)
  }
  if (block.type === 'sensing_current') return currentDateValue(block.getFieldValue('UNIT'))
  if (block.type === 'sensing_days_since_2000') return Math.floor((Date.now() - Date.UTC(2000, 0, 1)) / 86400000)
  if (block.type === 'sensing_username') return userStore.username || '访客'
  if (block.type === 'sound_volume') return Math.round(stage.value.volume)
  if (block.type === 'sensing_key_pressed') return inputState.value.key === block.getFieldValue('KEY')
  if (block.type === 'operator_add') return Number(readValue(block.getInputTargetBlock('A'), 0)) + Number(readValue(block.getInputTargetBlock('B'), 0))
  if (block.type === 'operator_subtract') return Number(readValue(block.getInputTargetBlock('A'), 0)) - Number(readValue(block.getInputTargetBlock('B'), 0))
  if (block.type === 'operator_multiply') return Number(readValue(block.getInputTargetBlock('A'), 0)) * Number(readValue(block.getInputTargetBlock('B'), 0))
  if (block.type === 'operator_divide') {
    const divisor = Number(readValue(block.getInputTargetBlock('B'), 0))
    return divisor === 0 ? 0 : Number(readValue(block.getInputTargetBlock('A'), 0)) / divisor
  }
  if (block.type === 'operator_random') {
    const from = Number(readValue(block.getInputTargetBlock('FROM'), 1))
    const to = Number(readValue(block.getInputTargetBlock('TO'), 10))
    return Math.round(Math.min(from, to) + Math.random() * Math.abs(to - from))
  }
  if (block.type === 'operator_gt') return Number(readValue(block.getInputTargetBlock('A'), 0)) > Number(readValue(block.getInputTargetBlock('B'), 0))
  if (block.type === 'operator_lt') return Number(readValue(block.getInputTargetBlock('A'), 0)) < Number(readValue(block.getInputTargetBlock('B'), 0))
  if (block.type === 'operator_equals') return String(readValue(block.getInputTargetBlock('A'), '')) === String(readValue(block.getInputTargetBlock('B'), ''))
  if (block.type === 'operator_and') return Boolean(readValue(block.getInputTargetBlock('A'), false)) && Boolean(readValue(block.getInputTargetBlock('B'), false))
  if (block.type === 'operator_or') return Boolean(readValue(block.getInputTargetBlock('A'), false)) || Boolean(readValue(block.getInputTargetBlock('B'), false))
  if (block.type === 'operator_not') return !Boolean(readValue(block.getInputTargetBlock('VALUE'), false))
  if (block.type === 'operator_join') return `${readValue(block.getInputTargetBlock('A'), '')}${readValue(block.getInputTargetBlock('B'), '')}`
  if (block.type === 'operator_letter_of') return Array.from(String(readValue(block.getInputTargetBlock('TEXT'), '')))[Math.floor(Number(readValue(block.getInputTargetBlock('INDEX'), 1))) - 1] || ''
  if (block.type === 'operator_length') return Array.from(String(readValue(block.getInputTargetBlock('TEXT'), ''))).length
  if (block.type === 'operator_contains') return String(readValue(block.getInputTargetBlock('TEXT'), '')).includes(String(readValue(block.getInputTargetBlock('PART'), '')))
  if (block.type === 'operator_list_contains') {
    const items = readListValue(block.getInputTargetBlock('LIST'))
    const item = readValue(block.getInputTargetBlock('ITEM'), '')
    return items.some((value) => listValuesEqual(value, item))
  }
  if (block.type === 'operator_mod') {
    const divisor = Number(readValue(block.getInputTargetBlock('B'), 0))
    return divisor === 0 ? 0 : Number(readValue(block.getInputTargetBlock('A'), 0)) % divisor
  }
  if (block.type === 'operator_round') return Math.round(Number(readValue(block.getInputTargetBlock('VALUE'), 0)))
  if (block.type === 'operator_math') {
    const value = Number(readValue(block.getInputTargetBlock('VALUE'), 0))
    const operation = block.getFieldValue('OP')
    if (operation === 'abs') return Math.abs(value)
    if (operation === 'sqrt') return Math.sqrt(value)
    if (operation === 'sin') return Math.sin(value * Math.PI / 180)
    if (operation === 'cos') return Math.cos(value * Math.PI / 180)
    if (operation === 'tan') return Math.tan(value * Math.PI / 180)
  }
  if (block.type === 'variable_get') return variables.value[block.getFieldValue('NAME')] ?? 0
  if (block.type === 'ai_draw_results') return drawGuessResults.value.join(' ')
  if (block.type === 'list_get') return getListItems(block.getFieldValue('NAME')).join(' ')
  if (block.type === 'list_item') {
    const items = getListItems(block.getFieldValue('NAME'))
    const index = getListIndex(readValue(block.getInputTargetBlock('INDEX'), 1), items.length)
    return index >= 0 ? items[index] : ''
  }
  if (block.type === 'list_index_of') {
    const item = readValue(block.getInputTargetBlock('ITEM'), '')
    const index = getListItems(block.getFieldValue('NAME')).findIndex((value) => listValuesEqual(value, item))
    return index + 1
  }
  if (block.type === 'list_length') return getListItems(block.getFieldValue('NAME')).length
  if (block.type === 'list_contains') {
    const item = readValue(block.getInputTargetBlock('ITEM'), '')
    return getListItems(block.getFieldValue('NAME')).some((value) => listValuesEqual(value, item))
  }
  return fallback
}

function valueOf(block, name, fallback = 0) {
  const child = block.getInputTargetBlock(name)
  return readValue(child, fallback)
}

function pause(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, Math.max(0, ms)))
}

async function showMessage(text, mode, seconds = null) {
  const message = String(text ?? '')
  stage.value.message = message
  stage.value.messageMode = mode
  stage.value.messageOrigin = 'block'
  if (seconds === null) return
  await pause(Math.min(60, Math.max(0, Number(seconds) || 0)) * 1000)
  if (!stopRequested && stage.value.message === message && stage.value.messageMode === mode) {
    stage.value.message = ''
    stage.value.messageOrigin = null
  }
}

function nextOption(options, current, key) {
  const index = options.findIndex((item) => item[key] === current)
  return options[(index + 1 + options.length) % options.length]
}

function normalizeDirection(value) {
  const normalized = ((Number(value) + 180) % 360 + 360) % 360 - 180
  return normalized === -180 ? 180 : normalized
}

function setSpriteDirection(value, closePicker = false) {
  const direction = Number(value)
  if (!Number.isFinite(direction)) return
  stage.value.rotation = normalizeDirection(direction)
  if (closePicker) showDirectionPicker.value = false
}

function motionTarget(target) {
  if (target === 'mouse') {
    return { x: Math.round(inputState.value.mouseX), y: Math.round(inputState.value.mouseY) }
  }
  return { x: Math.round(Math.random() * 360 - 180), y: Math.round(Math.random() * 230 - 115) }
}

function pointTowards(x, y) {
  const offsetX = x - stage.value.x
  const offsetY = y - stage.value.y
  if (offsetX || offsetY) setSpriteDirection(Math.atan2(offsetX, -offsetY) * 180 / Math.PI)
}

async function glideTo(x, y, seconds) {
  const start = { x: stage.value.x, y: stage.value.y }
  const target = { x: Math.max(-180, Math.min(180, x)), y: Math.max(-115, Math.min(115, y)) }
  const duration = Math.min(60, Math.max(0, Number(seconds) || 0)) * 1000
  if (!duration) {
    stage.value.x = target.x
    stage.value.y = target.y
    checkTaskProgress()
    return
  }
  gliding.value = true
  try {
    const startTime = window.performance.now()
    while (!stopRequested) {
      const progress = Math.min(1, (window.performance.now() - startTime) / duration)
      stage.value.x = start.x + (target.x - start.x) * progress
      stage.value.y = start.y + (target.y - start.y) * progress
      checkTaskProgress()
      if (progress === 1) {
        await new Promise((resolve) => window.requestAnimationFrame(resolve))
        return
      }
      await new Promise((resolve) => window.requestAnimationFrame(resolve))
    }
  } finally {
    gliding.value = false
  }
}

function checkTaskProgress() {
  if (projectTemplate.value !== 'interactive' || task.value.completed || task.value.failed) return
  if (task.value.row === task.value.target.row && task.value.col === task.value.target.col) {
    task.value.completed = true
    task.value.status = `通关！使用 ${task.value.moves} 次前进。`
    return
  }
  if (task.value.moves >= task.value.limit) {
    task.value.failed = true
    task.value.status = '前进次数已用完，重新规划路线。'
  }
}

function isMazeWall(row, col) {
  if (row < 0 || col < 0 || row >= task.value.rows || col >= task.value.cols) return true
  return task.value.walls.includes(`${row}:${col}`)
}

function normalizeTaskBlockLimit(value) {
  const parsed = Number(value)
  return Math.max(1, Math.min(99, Math.round(Number.isFinite(parsed) ? parsed : createTaskState().blockLimit)))
}

function syncTaskBlockCount() {
  taskBlockCount.value = projectTemplate.value === 'interactive' && workspace
    ? workspace.getAllBlocks(false).length
    : 0
}

function syncTaskBlockLimit(value = task.value.blockLimit) {
  const limit = normalizeTaskBlockLimit(value)
  task.value.blockLimit = limit
  if (workspace) workspace.options.maxBlocks = projectTemplate.value === 'interactive' ? limit : Infinity
  syncTaskBlockCount()
}

function canMazeDirectionPass(direction) {
  const turnOffset = { forward: 0, left: 3, right: 1 }[direction] ?? 0
  const absoluteDirection = (task.value.direction + turnOffset) % 4
  const offsets = [[-1, 0], [0, 1], [1, 0], [0, -1]]
  const [rowOffset, colOffset] = offsets[absoluteDirection]
  return !isMazeWall(task.value.row + rowOffset, task.value.col + colOffset)
}

function setMazeDimension(key, value) {
  const dimension = Math.max(4, Math.min(12, Math.round(Number(value) || 6)))
  task.value[key] = dimension
  task.value.start.row = Math.min(task.value.start.row, task.value.rows - 1)
  task.value.start.col = Math.min(task.value.start.col, task.value.cols - 1)
  task.value.target.row = Math.min(task.value.target.row, task.value.rows - 1)
  task.value.target.col = Math.min(task.value.target.col, task.value.cols - 1)
  task.value.walls = task.value.walls.filter((cell) => {
    const [row, col] = cell.split(':').map(Number)
    return row < task.value.rows && col < task.value.cols
  })
  resetMazeRun()
}

function editMazeCell(row, col) {
  if (running.value) return
  const key = `${row}:${col}`
  if (taskEditorMode.value === 'start') {
    task.value.start = { ...task.value.start, row, col }
    task.value.walls = task.value.walls.filter((cell) => cell !== key)
  } else if (taskEditorMode.value === 'target') {
    task.value.target = { row, col }
    task.value.walls = task.value.walls.filter((cell) => cell !== key)
  } else if (row !== task.value.start.row || col !== task.value.start.col) {
    if (row === task.value.target.row && col === task.value.target.col) return
    task.value.walls = task.value.walls.includes(key)
      ? task.value.walls.filter((cell) => cell !== key)
      : [...task.value.walls, key]
  }
  resetMazeRun()
}

function resetMazeRun() {
  task.value.row = task.value.start.row
  task.value.col = task.value.start.col
  task.value.direction = task.value.start.direction
  task.value.moves = 0
  task.value.completed = false
  task.value.failed = false
  task.value.status = task.value.hint
}

function resetMazeBoard() {
  task.value = createTaskState()
}

async function runMazeForward() {
  if (task.value.completed || task.value.failed) return
  const offsets = [[-1, 0], [0, 1], [1, 0], [0, -1]]
  const [rowOffset, colOffset] = offsets[task.value.direction]
  const nextRow = task.value.row + rowOffset
  const nextCol = task.value.col + colOffset
  task.value.moves += 1
  if (isMazeWall(nextRow, nextCol)) {
    task.value.failed = true
    task.value.status = '碰到墙了，调整积木顺序后再试一次。'
    return
  }
  task.value.row = nextRow
  task.value.col = nextCol
  task.value.status = '继续前进。'
  checkTaskProgress()
  await pause(220)
}

async function executeSequence(block) {
  let current = block
  while (current && !stopRequested) {
    if (projectTemplate.value === 'interactive' && (task.value.completed || task.value.failed)) break
    const nextId = current.getNextBlock()?.id
    await executeBlock(current)
    current = workspace?.getBlockById(nextId) || current.getNextBlock()
  }
}

async function executeWorkspaceEvent(type, matches = () => true) {
  if (!workspace) return
  const triggers = workspace.getTopBlocks(true).filter((block) => block.type === type && matches(block))
  for (const trigger of triggers) {
    if (stopRequested) break
    await executeSequence(trigger.getNextBlock())
  }
}

async function runActorEvent(actorId, type, matches) {
  if (!workspace || running.value) return
  persistSelectedActor()
  const originalActorId = selectedActorId.value
  running.value = true
  stopRequested = false
  try {
    selectActor(actorId)
    await executeWorkspaceEvent(type, matches)
    persistSelectedActor()
  } finally {
    if (originalActorId !== selectedActorId.value) selectActor(originalActorId)
    running.value = false
  }
}

async function broadcastMessage(message) {
  const originalActorId = selectedActorId.value
  const targets = [stageId, ...actors.value.map((actor) => actor.id)]
  try {
    for (const actorId of targets) {
      if (stopRequested) break
      if (actorId !== selectedActorId.value) selectActor(actorId)
      await executeWorkspaceEvent('event_when_receive', (block) => block.getFieldValue('MESSAGE') === message)
      persistSelectedActor()
    }
  } finally {
    if (originalActorId !== selectedActorId.value) selectActor(originalActorId)
  }
}

async function runPendingCloneEvents() {
  while (pendingCloneIds.length && !stopRequested) {
    const cloneId = pendingCloneIds.shift()
    if (!actors.value.some((actor) => actor.id === cloneId)) continue
    selectActor(cloneId)
    await executeWorkspaceEvent('control_when_clone_start')
    persistSelectedActor()
  }
}

async function executeBlock(block) {
  switch (block.type) {
    case 'motion_move': {
      const steps = valueOf(block, 'STEPS', 10)
      const radians = (stage.value.rotation * Math.PI) / 180
      stage.value.x = Math.max(-180, Math.min(180, stage.value.x + Math.sin(radians) * steps))
      stage.value.y = Math.max(-115, Math.min(115, stage.value.y - Math.cos(radians) * steps))
      checkTaskProgress()
      break
    }
    case 'motion_turn':
      stage.value.rotation = normalizeDirection(stage.value.rotation + valueOf(block, 'DEGREES', 15))
      break
    case 'motion_turn_left':
      stage.value.rotation = normalizeDirection(stage.value.rotation - valueOf(block, 'DEGREES', 15))
      break
    case 'motion_point_direction':
      setSpriteDirection(valueOf(block, 'DIRECTION', 90))
      break
    case 'motion_point_towards_mouse':
      pointTowards(inputState.value.mouseX, inputState.value.mouseY)
      break
    case 'motion_goto':
      stage.value.x = Math.max(-180, Math.min(180, valueOf(block, 'X', 0)))
      stage.value.y = Math.max(-115, Math.min(115, valueOf(block, 'Y', 0)))
      checkTaskProgress()
      break
    case 'motion_goto_target': {
      const target = motionTarget(block.getFieldValue('TARGET'))
      stage.value.x = target.x
      stage.value.y = target.y
      checkTaskProgress()
      break
    }
    case 'motion_glide_target': {
      const target = motionTarget(block.getFieldValue('TARGET'))
      await glideTo(target.x, target.y, valueOf(block, 'SECONDS', 1))
      break
    }
    case 'motion_glide':
      await glideTo(valueOf(block, 'X', 0), valueOf(block, 'Y', 0), valueOf(block, 'SECONDS', 1))
      break
    case 'motion_set_x':
      stage.value.x = Math.max(-180, Math.min(180, Number(valueOf(block, 'VALUE', 0))))
      checkTaskProgress()
      break
    case 'motion_set_y':
      stage.value.y = Math.max(-115, Math.min(115, Number(valueOf(block, 'VALUE', 0))))
      checkTaskProgress()
      break
    case 'motion_change_x':
      stage.value.x = Math.max(-180, Math.min(180, stage.value.x + Number(valueOf(block, 'VALUE', 10))))
      checkTaskProgress()
      break
    case 'motion_change_y':
      stage.value.y = Math.max(-115, Math.min(115, stage.value.y + Number(valueOf(block, 'VALUE', 10))))
      checkTaskProgress()
      break
    case 'motion_bounce':
      if (Math.abs(stage.value.x) >= 175 || Math.abs(stage.value.y) >= 110) stage.value.rotation = normalizeDirection(stage.value.rotation + 180)
      break
    case 'looks_say_for_seconds':
      await showMessage(valueOf(block, 'TEXT', '你好！'), 'say', valueOf(block, 'SECONDS', 2))
      break
    case 'looks_say':
      await showMessage(valueOf(block, 'TEXT', '你好！'), 'say')
      break
    case 'looks_think_for_seconds':
      await showMessage(valueOf(block, 'TEXT', '嗯……'), 'think', valueOf(block, 'SECONDS', 2))
      break
    case 'looks_think':
      await showMessage(valueOf(block, 'TEXT', '嗯……'), 'think')
      break
    case 'looks_switch_costume':
      selectActorCostume(stage.value, block.getFieldValue('COSTUME'))
      break
    case 'looks_next_costume':
      {
        ensureCostumeCollection(stage.value)
        const costumes = stage.value.costumes
        const currentIndex = costumes.findIndex((costume) => costume.id === stage.value.selectedCostumeId)
        const nextCostume = costumes[(currentIndex + 1) % costumes.length]
        selectActorCostume(stage.value, nextCostume.id)
      }
      break
    case 'looks_switch_backdrop':
      {
        const backdrop = setBackdrop(block.getFieldValue('BACKDROP'))
        await executeWorkspaceEvent('event_when_backdrop', (trigger) => backdropFieldMatches(trigger, backdrop))
      }
      break
    case 'looks_switch_backdrop_wait':
      {
        const backdrop = setBackdrop(block.getFieldValue('BACKDROP'))
        await executeWorkspaceEvent('event_when_backdrop', (trigger) => backdropFieldMatches(trigger, backdrop))
      }
      break
    case 'looks_next_backdrop':
      {
        const currentId = stageState.value.selectedBackdropId || stage.value.selectedBackdropId
        const backdrop = nextOption(stageBackdrops.value, currentId, 'id')
        const selectedBackdrop = setBackdrop(backdrop?.id)
        await executeWorkspaceEvent('event_when_backdrop', (trigger) => backdropFieldMatches(trigger, selectedBackdrop))
      }
      break
    case 'looks_change_size':
      stage.value.size = normalizeSpriteSize(stage.value.size + Number(valueOf(block, 'VALUE', 10)))
      break
    case 'looks_set_color':
      stage.value.color = block.getFieldValue('COLOR') || '#ee91bb'
      break
    case 'looks_set_size':
      stage.value.size = normalizeSpriteSize(valueOf(block, 'SIZE', 100))
      break
    case 'looks_change_effect':
      stage.value.effectColor = (stage.value.effectColor + Number(valueOf(block, 'VALUE', 25))) % 200
      break
    case 'looks_set_effect':
      stage.value.effectColor = Number(valueOf(block, 'VALUE', 0)) % 200
      break
    case 'looks_clear_effects':
      stage.value.effectColor = 0
      break
    case 'looks_show':
      stage.value.visible = true
      break
    case 'looks_hide':
      stage.value.visible = false
      break
    case 'looks_go_to_layer':
      reorderSelectedActor(block.getFieldValue('POSITION') || 'front')
      break
    case 'looks_change_layer':
      reorderSelectedActor(block.getFieldValue('DIRECTION') || 'forward', valueOf(block, 'LAYERS', 1))
      break
    case 'sound_play_until_done':
      await playSound(block.getFieldValue('SOUND'))
      break
    case 'sound_play':
      void playSound(block.getFieldValue('SOUND'))
      break
    case 'sound_stop_all':
      stopAllSounds()
      break
    case 'sound_change_pitch':
      stage.value.pitch = Math.max(0, Math.min(200, stage.value.pitch + Number(valueOf(block, 'VALUE', 10))))
      break
    case 'sound_set_pitch':
      stage.value.pitch = Math.max(0, Math.min(200, Number(valueOf(block, 'VALUE', 100))))
      break
    case 'sound_clear_effects':
      stage.value.pitch = 100
      break
    case 'sound_change_volume':
      stage.value.volume = Math.max(0, Math.min(100, stage.value.volume + Number(valueOf(block, 'VALUE', -10))))
      break
    case 'sound_set_volume':
      stage.value.volume = Math.max(0, Math.min(100, Number(valueOf(block, 'VALUE', 100))))
      break
    case 'event_broadcast':
      await broadcastMessage(block.getFieldValue('MESSAGE'))
      break
    case 'event_broadcast_wait':
      await broadcastMessage(block.getFieldValue('MESSAGE'))
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
    case 'control_forever': {
      const loop = block.getInputTargetBlock('DO')
      while (!stopRequested) {
        await executeSequence(loop)
        await new Promise((resolve) => window.requestAnimationFrame(resolve))
      }
      break
    }
    case 'control_if': {
      if (Boolean(valueOf(block, 'CONDITION', false))) await executeSequence(block.getInputTargetBlock('DO'))
      break
    }
    case 'control_if_else':
      await executeSequence(block.getInputTargetBlock(Boolean(valueOf(block, 'CONDITION', false)) ? 'DO' : 'ELSE'))
      break
    case 'control_wait_until':
      while (!stopRequested && !Boolean(valueOf(block, 'CONDITION', false))) await new Promise((resolve) => window.requestAnimationFrame(resolve))
      break
    case 'control_repeat_until': {
      const loop = block.getInputTargetBlock('DO')
      while (!stopRequested && !Boolean(valueOf(block, 'CONDITION', false))) await executeSequence(loop)
      break
    }
    case 'control_stop_all':
      stopProject()
      break
    case 'control_create_clone': {
      persistSelectedActor()
      const source = getSelectedActor()
      if (source && actors.value.length < 50) {
        const cloneId = `clone-${Date.now()}`
        actors.value.push({ id: cloneId, state: { ...source.state }, workspaceJson: source.workspaceJson, isClone: true })
        pendingCloneIds.push(cloneId)
      }
      break
    }
    case 'control_delete_clone': {
      const actor = getSelectedActor()
      if (actor?.isClone) actors.value = actors.value.filter((item) => item.id !== actor.id)
      break
    }
    case 'sensing_ask':
      inputState.value.answer = window.prompt(String(valueOf(block, 'QUESTION', '')), inputState.value.answer) ?? ''
      break
    case 'sensing_set_drag_mode':
      stage.value.draggable = block.getFieldValue('MODE') === 'draggable'
      break
    case 'sensing_reset_timer':
      timerStartedAt.value = Date.now()
      break
    case 'variable_set':
      variables.value[block.getFieldValue('NAME')] = valueOf(block, 'VALUE', 0)
      ensureVariableVisible(block.getFieldValue('NAME'))
      break
    case 'variable_change': {
      const name = block.getFieldValue('NAME')
      variables.value[name] = Number(variables.value[name] || 0) + Number(valueOf(block, 'VALUE', 1))
      ensureVariableVisible(name)
      break
    }
    case 'variable_show':
      setVariableVisibility(block.getFieldValue('NAME'), true)
      break
    case 'variable_hide':
      setVariableVisibility(block.getFieldValue('NAME'), false)
      break
    case 'list_add': {
      const name = block.getFieldValue('NAME')
      setListItems(name, [...getListItems(name), valueOf(block, 'ITEM', '')])
      break
    }
    case 'list_delete': {
      const name = block.getFieldValue('NAME')
      const items = [...getListItems(name)]
      const index = getListIndex(valueOf(block, 'INDEX', 1), items.length)
      if (index >= 0) {
        items.splice(index, 1)
        setListItems(name, items)
      }
      break
    }
    case 'list_delete_all':
      setListItems(block.getFieldValue('NAME'), [])
      break
    case 'list_insert': {
      const name = block.getFieldValue('NAME')
      const items = [...getListItems(name)]
      const index = getListIndex(valueOf(block, 'INDEX', 1), items.length, true)
      if (index >= 0) {
        items.splice(index, 0, valueOf(block, 'ITEM', ''))
        setListItems(name, items)
      }
      break
    }
    case 'list_replace': {
      const name = block.getFieldValue('NAME')
      const items = [...getListItems(name)]
      const index = getListIndex(valueOf(block, 'INDEX', 1), items.length)
      if (index >= 0) {
        items[index] = valueOf(block, 'ITEM', '')
        setListItems(name, items)
      }
      break
    }
    case 'list_show':
      setListVisibility(block.getFieldValue('NAME'), true)
      break
    case 'list_hide':
      setListVisibility(block.getFieldValue('NAME'), false)
      break
    case 'task_forward': {
      if (projectTemplate.value !== 'interactive') {
        ElMessage.warning('请先用“互动任务基座”创建项目。')
        break
      }
      await runMazeForward()
      break
    }
    case 'task_turn':
      if (projectTemplate.value !== 'interactive') {
        ElMessage.warning('请先用“互动任务基座”创建项目。')
        break
      }
      task.value.direction = (task.value.direction + (block.getFieldValue('SIDE') === 'left' ? 3 : 1)) % 4
      task.value.status = block.getFieldValue('SIDE') === 'left' ? '向左转。' : '向右转。'
      await pause(180)
      break
    case 'task_repeat_target': {
      const loop = block.getInputTargetBlock('DO')
      for (let index = 0; index < 50 && !stopRequested && !task.value.completed && !task.value.failed && task.value.moves < task.value.limit; index += 1) await executeSequence(loop)
      break
    }
    case 'task_if_path': {
      if (canMazeDirectionPass(block.getFieldValue('DIRECTION'))) await executeSequence(block.getInputTargetBlock('DO'))
      break
    }
    case 'task_if_else_path': {
      const branch = canMazeDirectionPass(block.getFieldValue('DIRECTION')) ? 'DO' : 'ELSE'
      await executeSequence(block.getInputTargetBlock(branch))
      break
    }
    case 'ai_face_check':
      await runFaceCheck()
      break
    case 'extension_open_draw_board':
      if (!hasDrawGuessExtension.value) throw new Error('请先添加“你画我猜”插件。')
      drawBoardVisible.value = true
      workbenchTab.value = 'plugins'
      await nextTick()
      setupSketch()
      break
    case 'extension_clear_draw_board':
      if (!hasDrawGuessExtension.value) throw new Error('请先添加“你画我猜”插件。')
      clearSketch()
      break
    case 'extension_close_draw_board':
      drawBoardVisible.value = false
      break
    case 'ai_draw_guess':
      await runDrawGuess()
      break
  }
  await pause(80)
}

async function runProject() {
  if (!workspace || running.value) return
  if (projectTemplate.value === 'interactive') {
    await runMazeProject()
    return
  }
  persistSelectedActor()
  running.value = true
  stopRequested = false
  if (projectTemplate.value === 'interactive') {
    task.value.moves = 0
    task.value.completed = false
  }
  const originalActorId = selectedActorId.value
  let executed = false
  try {
    const runTargets = [{ id: stageId }, ...actors.value]
    for (const actor of runTargets) {
      if (stopRequested) break
      if (actor.id !== selectedActorId.value) selectActor(actor.id)
      stage.value.message = ''
      stage.value.messageOrigin = null
      const triggers = workspace.getTopBlocks(true).filter((block) => block.type === 'event_when_run')
      if (!triggers.length) continue
      executed = true
      for (const trigger of triggers) await executeSequence(trigger.getNextBlock())
      persistSelectedActor()
    }
    await runPendingCloneEvents()
    if (!executed) ElMessage.warning('至少给一个角色放入“当点击开始按钮”积木。')
  } catch (error) {
    ElMessage.error(error?.message || '运行时出现了问题')
  } finally {
    if (originalActorId !== selectedActorId.value) selectActor(originalActorId)
    running.value = false
  }
}

function stopProject() {
  stopRequested = true
  stopAllSounds()
  running.value = false
  stage.value.message = '已停止，继续搭建你的作品吧。'
}

async function runMazeProject() {
  if (!workspace || running.value) return
  running.value = true
  stopRequested = false
  resetMazeRun()
  try {
    const triggers = workspace.getTopBlocks(true).filter((block) => block.type === 'event_when_run')
    if (!triggers.length) {
      ElMessage.warning('请先放入“当点击开始运行”积木，再把迷宫指令接在它下面。')
      return
    }
    let hasCommands = false
    for (const trigger of triggers) {
      if (stopRequested || task.value.completed || task.value.failed) break
      const sequence = trigger.getNextBlock()
      if (!sequence) continue
      hasCommands = true
      await executeSequence(sequence)
    }
    if (!hasCommands) ElMessage.warning('请把至少一个迷宫指令接在“当点击开始运行”下面。')
    if (task.value.completed) ElMessage.success('迷宫通关！')
    else if (task.value.failed) ElMessage.warning(task.value.status)
  } catch (error) {
    ElMessage.error(error?.message || '运行时出现了问题')
  } finally {
    running.value = false
  }
}

function isEditingKeyboardTarget(target) {
  if (!(target instanceof Element)) return false
  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"], [role="textbox"], [role="combobox"], .blocklyWidgetDiv, .blocklyDropDownDiv'))
}

async function runKeyEvent(event) {
  if (isEditingKeyboardTarget(event.target)) return
  inputState.value.key = event.key
  if (!workspace || running.value) return
  persistSelectedActor()
  running.value = true
  stopRequested = false
  const originalActorId = selectedActorId.value
  try {
    for (const actor of actors.value) {
      if (actor.id !== selectedActorId.value) selectActor(actor.id)
      const trigger = workspace.getTopBlocks(true).find((block) => block.type === 'event_when_key' && block.getFieldValue('KEY') === event.key)
      if (trigger) await executeSequence(trigger.getNextBlock())
      persistSelectedActor()
    }
  } finally {
    if (originalActorId !== selectedActorId.value) selectActor(originalActorId)
    running.value = false
  }
}

function clearKeyEvent(event) {
  if (inputState.value.key === event.key) inputState.value.key = ''
}

function stageCoordinates(event, rect) {
  return {
    x: Math.max(-180, Math.min(180, event.clientX - rect.left - rect.width / 2)),
    y: Math.max(-115, Math.min(115, event.clientY - rect.top - rect.height * 0.58)),
  }
}

function updateStagePointer(event) {
  const point = stageCoordinates(event, event.currentTarget.getBoundingClientRect())
  inputState.value.mouseX = point.x
  inputState.value.mouseY = point.y
}

function startStagePointer(event) {
  updateStagePointer(event)
  inputState.value.mouseDown = true
}

function endStagePointer(event) {
  updateStagePointer(event)
  inputState.value.mouseDown = false
  endActorDrag(event)
  endDataMonitorDrag(event)
}

function getDefaultVariableMonitorPosition(index) {
  return {
    x: 10 + Math.floor(index / 5) * 120,
    y: 50 + (index % 5) * 38,
  }
}

function variableMonitorStyle(name, index) {
  const position = variableMonitorPositions.value[name] || getDefaultVariableMonitorPosition(index)
  return { left: `${position.x}px`, top: `${position.y}px` }
}

function listMonitorStyle(name, index) {
  const position = listMonitorPositions.value[name]
  if (position) return { left: `${position.x}px`, top: `${position.y}px` }
  return {
    right: `${10 + (index % 3) * 142}px`,
    top: `${50 + Math.floor(index / 3) * 160}px`,
  }
}

function startDataMonitorDrag(event, kind, name) {
  event.preventDefault()
  event.stopPropagation()
  const monitor = event.currentTarget
  const scene = monitor.closest('.stage-scene')
  if (!scene) return
  const sceneRect = scene.getBoundingClientRect()
  const monitorRect = monitor.getBoundingClientRect()
  const sceneStyle = window.getComputedStyle(scene)
  const borderLeft = Number.parseFloat(sceneStyle.borderLeftWidth) || 0
  const borderTop = Number.parseFloat(sceneStyle.borderTopWidth) || 0
  const borderRight = Number.parseFloat(sceneStyle.borderRightWidth) || 0
  const borderBottom = Number.parseFloat(sceneStyle.borderBottomWidth) || 0
  dataMonitorDragState = {
    kind,
    name,
    pointerId: event.pointerId,
    originX: sceneRect.left + borderLeft,
    originY: sceneRect.top + borderTop,
    maxX: Math.max(0, sceneRect.width - borderLeft - borderRight - monitorRect.width),
    maxY: Math.max(0, sceneRect.height - borderTop - borderBottom - monitorRect.height),
    offsetX: event.clientX - monitorRect.left,
    offsetY: event.clientY - monitorRect.top,
  }
  monitor.setPointerCapture?.(event.pointerId)
}

function moveDataMonitor(event) {
  if (!dataMonitorDragState || dataMonitorDragState.pointerId !== event.pointerId) return
  const { kind, name, originX, originY, maxX, maxY, offsetX, offsetY } = dataMonitorDragState
  const x = Math.max(0, Math.min(maxX, event.clientX - originX - offsetX))
  const y = Math.max(0, Math.min(maxY, event.clientY - originY - offsetY))
  const positions = kind === 'list' ? listMonitorPositions : variableMonitorPositions
  positions.value = { ...positions.value, [name]: { x: Math.round(x), y: Math.round(y) } }
}

function endDataMonitorDrag(event) {
  if (!dataMonitorDragState || dataMonitorDragState.pointerId !== event.pointerId) return
  dataMonitorDragState = null
}

function startActorDrag(event, actorId) {
  event.preventDefault()
  event.stopPropagation()
  selectActor(actorId)
  const scene = event.currentTarget.closest('.stage-scene')
  if (!scene) return
  const point = stageCoordinates(event, scene.getBoundingClientRect())
  inputState.value.mouseX = point.x
  inputState.value.mouseY = point.y
  inputState.value.mouseDown = true
  if (getSelectedActor()?.state.draggable === false) return
  const rect = scene.getBoundingClientRect()
  actorDragState = { actorId, pointerId: event.pointerId, rect }
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function handleStagePointerMove(event) {
  updateStagePointer(event)
  moveDataMonitor(event)
  if (!actorDragState || actorDragState.pointerId !== event.pointerId) return
  const point = stageCoordinates(event, actorDragState.rect)
  stage.value.x = Math.round(point.x)
  stage.value.y = Math.round(point.y)
}

function handleActorClick(actorId) {
  selectActor(actorId)
  void runActorEvent(actorId, 'event_when_sprite_clicked')
}

function endActorDrag(event) {
  inputState.value.mouseDown = false
  if (!actorDragState || actorDragState.pointerId !== event.pointerId) return
  actorDragState = null
  persistSelectedActor()
}

function updateDirectionFromDial(event) {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX - rect.left - rect.width / 2
  const y = event.clientY - rect.top - rect.height / 2
  setSpriteDirection(Math.atan2(x, -y) * 180 / Math.PI)
}

function startDirectionDial(event) {
  directionDialPointerId = event.pointerId
  event.currentTarget.setPointerCapture?.(event.pointerId)
  updateDirectionFromDial(event)
}

function moveDirectionDial(event) {
  if (directionDialPointerId !== event.pointerId) return
  updateDirectionFromDial(event)
}

function endDirectionDial(event) {
  if (directionDialPointerId !== event.pointerId) return
  directionDialPointerId = null
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
  if (!hasDrawGuessExtension.value) throw new Error('请先添加“你画我猜”插件。')
  if (!drawBoardVisible.value) throw new Error('请先执行“打开涂鸦画板”积木。')
  const canvas = sketchRef.value
  if (!canvas) throw new Error('画板未准备好。')
  aiStatus.value = 'AI 正在观察你的涂鸦...'
  const result = await guessAiDraw({ imageDataUrl: canvas.toDataURL('image/png') })
  const predictions = Array.isArray(result?.predictions)
    ? result.predictions.map((item) => String(item?.label ?? '').trim()).filter(Boolean)
    : []
  const fallbackLabel = String(result?.label ?? '').trim()
  drawGuessResults.value = predictions.length ? predictions : (fallbackLabel ? [fallbackLabel] : [])
  const guess = drawGuessResults.value[0] || '暂时猜不出来'
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
  if (!canvas) return
  const context = canvas.getContext('2d')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, canvas.width, canvas.height)
}

function setupSketch() {
  const canvas = sketchRef.value
  if (!canvas || canvas.dataset.ready === 'true') return
  const context = canvas.getContext('2d')
  context.lineWidth = 10
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = '#3d3564'
  clearSketch()
  canvas.dataset.ready = 'true'
}

function openProjectInfo() {
  projectInfoDraft.value = {
    title: title.value,
    description: description.value,
    tags: [...projectTags.value],
    visibility: projectVisibility.value,
  }
  projectTagInput.value = ''
  showProjectInfo.value = true
}

function addProjectTag() {
  const tag = projectTagInput.value.trim().replace(/\s+/g, ' ')
  if (!tag) return
  if (projectInfoDraft.value.tags.includes(tag)) {
    projectTagInput.value = ''
    return
  }
  if (projectInfoDraft.value.tags.length >= 10) {
    ElMessage.warning('最多添加 10 个标签')
    return
  }
  projectInfoDraft.value.tags.push(tag.slice(0, 20))
  projectTagInput.value = ''
}

function removeProjectTag(tag) {
  projectInfoDraft.value.tags = projectInfoDraft.value.tags.filter((item) => item !== tag)
}

function saveProjectInfo() {
  const nextTitle = projectInfoDraft.value.title.trim()
  const nextDescription = projectInfoDraft.value.description.trim()
  if (!nextTitle) {
    ElMessage.warning('请填写项目名称')
    return
  }
  if (!nextDescription) {
    ElMessage.warning('请填写项目描述')
    return
  }
  title.value = nextTitle
  description.value = nextDescription
  projectTags.value = projectInfoDraft.value.tags.slice(0, 10)
  projectVisibility.value = projectInfoDraft.value.visibility
  showProjectInfo.value = false
}

function projectPayload() {
  const stageCanvas = document.querySelector('.stage-scene')
  persistSelectedActor()
  projectBase.value.scene = {
    actors: actors.value.map((actor) => actor.id),
    props: [],
    background: stage.value.backdrop,
  }
  if (projectTemplate.value === 'interactive') {
    projectBase.value.rules = { completion: 'reach-target', moveLimit: task.value.limit }
  }
  return {
    title: title.value.trim() || '未命名积木作品',
    description: description.value.trim(),
    workspaceJson: isStageSelected.value ? (stageWorkspaceJson.value || JSON.stringify(starterWorkspace)) : (getSelectedActor()?.workspaceJson || JSON.stringify(starterWorkspace)),
    stageJson: JSON.stringify({ variables: variables.value, variableVisibility: variableVisibility.value, variableMonitorPositions: variableMonitorPositions.value, lists: lists.value, listVisibility: listVisibility.value, listMonitorPositions: listMonitorPositions.value, projectBase: projectBase.value, task: task.value, actors: actors.value, selectedActorId: selectedActorId.value, stageState: stageState.value, stageWorkspaceJson: stageWorkspaceJson.value, stageBackdrops: stageBackdrops.value, extensions: enabledExtensions.value, projectTags: projectTags.value, broadcastMessages: broadcastMessages.value }),
    thumbnailData: stageCanvas ? null : null,
    published: isPublished.value,
  }
}

async function saveProject() {
  if (courseMode.value) {
    ElMessage.warning('课程项目仅支持查看和运行')
    return false
  }
  if (!workspace) return false
  if (!userStore.isLoggedIn) {
    ElMessage.warning('登录后即可保存你的作品。')
    return false
  }
  saving.value = true
  try {
    const payload = projectPayload()
    const result = projectId.value ? await saveBlockProject(projectId.value, payload) : await createBlockProject(payload)
    projectId.value = result.id
    projectVisibility.value = result.published ? 'public' : 'private'
    ElMessage.success('作品已保存')
    return true
  } catch (error) {
    ElMessage.error(error?.message || '保存失败，请先登录后重试')
    return false
  } finally {
    saving.value = false
  }
}

async function publishProject() {
  const previousVisibility = projectVisibility.value
  projectVisibility.value = 'public'
  const saved = await saveProject()
  if (!saved) {
    projectVisibility.value = previousVisibility
    return
  }
  ElMessage.success('作品已发布到灵感广场')
}

function loadProjectData(project) {
  title.value = project.title || '未命名积木作品'
  description.value = project.description || ''
  projectId.value = project.id
  projectVisibility.value = project.published ? 'public' : 'private'
  const workspaceData = JSON.parse(project.workspaceJson || JSON.stringify(starterWorkspace))
  const stageData = JSON.parse(project.stageJson || '{}')
  const legacyState = { ...stageData }
  delete legacyState.variables
  delete legacyState.variableVisibility
  delete legacyState.variableMonitorPositions
  delete legacyState.lists
  delete legacyState.listVisibility
  delete legacyState.listMonitorPositions
  delete legacyState.projectBase
  delete legacyState.task
  delete legacyState.actors
  delete legacyState.selectedActorId
  delete legacyState.stageState
  delete legacyState.stageWorkspaceJson
  delete legacyState.stageBackdrops
  delete legacyState.extensions
  delete legacyState.projectTags
  delete legacyState.broadcastMessages
  lists.value = Object.fromEntries(
    Object.entries(stageData.lists || {}).map(([name, items]) => [name, Array.isArray(items) ? items : []]),
  )
  const savedListVisibility = stageData.listVisibility || {}
  listVisibility.value = Object.fromEntries(
    Object.keys(lists.value).map((name) => [name, savedListVisibility[name] !== false]),
  )
  listMonitorPositions.value = Object.fromEntries(
    Object.entries(stageData.listMonitorPositions || {})
      .filter(([, position]) => Number.isFinite(position?.x) && Number.isFinite(position?.y))
      .map(([name, position]) => [name, { x: Number(position.x), y: Number(position.y) }]),
  )
  variables.value = { ...(stageData.variables || {}) }
  const savedVariableVisibility = stageData.variableVisibility || {}
  variableVisibility.value = Object.fromEntries(
    Object.keys(variables.value).map((name) => [name, savedVariableVisibility[name] !== false]),
  )
  variableMonitorPositions.value = Object.fromEntries(
    Object.entries(stageData.variableMonitorPositions || {})
      .filter(([, position]) => Number.isFinite(position?.x) && Number.isFinite(position?.y))
      .map(([name, position]) => [name, { x: Number(position.x), y: Number(position.y) }]),
  )
  broadcastMessages.value = normalizeBroadcastMessages(stageData.broadcastMessages)
  actors.value = Array.isArray(stageData.actors) && stageData.actors.length
    ? stageData.actors
    : [{ id: 'sprite-1', state: { ...stage.value, ...legacyState }, workspaceJson: JSON.stringify(workspaceData) }]
  stageState.value = { ...stageState.value, ...(stageData.stageState || {}) }
  stageWorkspaceJson.value = stageData.stageWorkspaceJson || null
  stageBackdrops.value = Array.isArray(stageData.stageBackdrops) && stageData.stageBackdrops.length
    ? stageData.stageBackdrops
    : backdropOptions.map((item) => ({ id: item.id, name: item.label, preset: item.id, color: item.color, data: null, scale: 100, x: 0, y: 0, size: 100, rotation: 90, visible: true }))
  stageBackdrops.value = stageBackdrops.value.map((backdrop) => ({ scale: 100, x: 0, y: 0, size: 100, rotation: 90, visible: true, ...backdrop }))
  refreshBackdropFields()
  selectedActorId.value = stageData.selectedActorId === stageId || (stageData.selectedActorId && actors.value.some((actor) => actor.id === stageData.selectedActorId))
    ? stageData.selectedActorId
    : actors.value[0].id
  switchingActor = true
  stage.value = selectedActorId.value === stageId
    ? { ...stage.value, ...stageState.value }
    : { ...stage.value, ...actors.value.find((actor) => actor.id === selectedActorId.value).state }
  if (!isStageSelected.value) applySelectedCostume(stage.value)
  switchingActor = false
  loadActorWorkspace(isStageSelected.value ? { workspaceJson: stageWorkspaceJson.value || JSON.stringify(workspaceData) } : getSelectedActor())
  refreshVariableFields()
  refreshListFields()
  projectBase.value = stageData.projectBase || createProjectBase('free')
  projectTemplate.value = projectBase.value.kind || 'free'
  const savedTask = stageData.task || {}
  task.value = { ...createTaskState(), ...savedTask }
  task.value.rows = Math.max(4, Math.min(12, Number(task.value.rows) || 6))
  task.value.cols = Math.max(4, Math.min(12, Number(task.value.cols) || 8))
  task.value.walls = Array.isArray(task.value.walls) ? task.value.walls : []
  task.value.start = { ...createTaskState().start, ...(task.value.start || {}) }
  task.value.target = { ...createTaskState().target, ...(task.value.target || {}) }
  syncTaskBlockLimit()
  resetMazeRun()
  activeToolboxCategory.value = projectTemplate.value === 'interactive' ? '迷宫指令' : '运动'
  refreshToolbox()
  projectTags.value = Array.isArray(stageData.projectTags) ? stageData.projectTags.slice(0, 10) : []
  syncExtensions(stageData.extensions || [])
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
  if (courseMode.value) return
  showTemplatePicker.value = true
}

function startNewProject(baseKind) {
  if (courseMode.value) return
  projectId.value = null
  projectVisibility.value = 'private'
  projectTemplate.value = baseKind
  workbenchTab.value = 'code'
  projectBase.value = createProjectBase(baseKind)
  title.value = baseKind === 'interactive' ? '我的互动任务' : baseKind === 'ai' ? '我的 AI 创作' : '我的积木作品'
  description.value = ''
  projectTags.value = []
  broadcastMessages.value = createDefaultBroadcastMessages()
  syncExtensions([])
  drawBoardVisible.value = false
  drawGuessResults.value = []
  stage.value = { x: 0, y: 0, rotation: 90, message: '', messageMode: 'say', messageOrigin: null, color: '#ee91bb', effectColor: 0, backdrop: '#ffffff', size: 100, visible: true, draggable: true, spriteName: '探索星', costume: 'star', costumeData: null, costumes: [{ id: 'costume-1', name: '星星', preset: 'star', data: null }], selectedCostumeId: 'costume-1', sound: 'pop', pitch: 100, volume: 70 }
  stageState.value = { ...stage.value, selectedBackdropId: 'white' }
  stageWorkspaceJson.value = null
  stageBackdrops.value = backdropOptions.map((item) => ({ id: item.id, name: item.label, preset: item.id, color: item.color, data: null }))
  refreshBackdropFields()
  variables.value = {}
  variableVisibility.value = {}
  variableMonitorPositions.value = {}
  lists.value = {}
  listVisibility.value = {}
  listMonitorPositions.value = {}
  timerStartedAt.value = Date.now()
  task.value = createTaskState()
  syncTaskBlockLimit()
  workspace.clear()
  Blockly.serialization.workspaces.load(baseKind === 'interactive' ? taskStarterWorkspace : starterWorkspace, workspace)
  syncTaskBlockLimit()
  activeToolboxCategory.value = baseKind === 'interactive' ? '迷宫指令' : '运动'
  refreshToolbox()
  ensureDefaultInputs()
  installBroadcastFields()
  installCostumeFields()
  installVariableFields()
  installListFields()
  refreshBroadcastFields()
  refreshCostumeFields()
  refreshVariableFields()
  refreshListFields()
  resetActors()
  actors.value[0].workspaceJson = JSON.stringify(Blockly.serialization.workspaces.save(workspace))
  clearSketch()
  nextTick(loadCostumeCanvas)
  showTemplatePicker.value = false
  ElMessage.success('项目基座已创建，开始动手搭建吧。')
}

function selectWorkbenchTab(tab) {
  workbenchTab.value = tab
  if (tab === 'code') nextTick(resizeWorkspace)
  if (tab === 'costume') nextTick(loadCostumeCanvas)
  if (tab === 'plugins') nextTick(setupSketch)
}

function currentCostumeStrokeSize() {
  return costumeTool.value === 'eraser' ? costumeEraserSize.value : costumeLineWidth.value
}

function setCostumeToolSize(value) {
  const size = Number(value)
  if (costumeTool.value === 'eraser') costumeEraserSize.value = size
  else costumeLineWidth.value = size
}

function costumePoint(event) {
  const canvas = costumeCanvasRef.value
  const rect = canvas.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  }
}

function updateCostumeCursor(event) {
  const canvas = costumeCanvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  costumeCursor.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
    scale: rect.width / canvas.width,
    visible: true,
  }
}

function hideCostumeCursor() {
  costumeCursor.value.visible = false
}

function drawCostumeShape(context, point) {
  const start = costumeStartPoint
  if (!start) return
  context.save()
  context.lineWidth = costumeLineWidth.value
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.strokeStyle = costumeStroke.value
  context.fillStyle = costumeFill.value
  if (costumeTool.value === 'line') {
    context.beginPath()
    context.moveTo(start.x, start.y)
    context.lineTo(point.x, point.y)
    context.stroke()
  } else if (costumeTool.value === 'rectangle') {
    const width = point.x - start.x
    const height = point.y - start.y
    context.fillRect(start.x, start.y, width, height)
    context.strokeRect(start.x, start.y, width, height)
  } else if (costumeTool.value === 'circle') {
    const radius = Math.hypot(point.x - start.x, point.y - start.y)
    context.beginPath()
    context.arc(start.x, start.y, radius, 0, Math.PI * 2)
    context.fill()
    context.stroke()
  }
  context.restore()
}

function isCostumeCanvasBlank(canvas) {
  const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] !== 0) return false
  }
  return true
}

function saveCostumeSnapshot() {
  const canvas = costumeCanvasRef.value
  if (!canvas) return
  const snapshot = canvas.toDataURL('image/png')
  const previous = costumeHistory.value[costumeHistoryIndex.value]
  if (snapshot === previous) return
  costumeHistory.value = costumeHistory.value.slice(0, costumeHistoryIndex.value + 1)
  costumeHistory.value.push(snapshot)
  costumeHistoryIndex.value = costumeHistory.value.length - 1
  const blank = isCostumeCanvasBlank(canvas)
  if (isStageSelected.value) {
    const backdrop = activeBackdrop.value
    if (backdrop) {
      backdrop.data = blank ? null : snapshot
      backdrop.preset = blank ? backdrop.id : 'custom'
      refreshBackdropFields()
    }
  } else {
    updateSelectedCostume(stage.value, { preset: blank ? 'star' : 'custom', data: blank ? null : snapshot })
  }
}

function restoreCostumeSnapshot(snapshot) {
  const canvas = costumeCanvasRef.value
  if (!canvas) return Promise.resolve()
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (!snapshot) return Promise.resolve()
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve()
    }
    image.src = snapshot
  })
}

async function loadCostumeCanvas() {
  const canvas = costumeCanvasRef.value
  if (!canvas) return
  let snapshot = isStageSelected.value ? (activeBackdrop.value?.data || '') : applySelectedCostume(stage.value).data
  if (snapshot) {
    const normalized = await normalizeTransparentImage(snapshot)
    if (normalized !== snapshot) {
      if (isStageSelected.value && activeBackdrop.value) activeBackdrop.value.data = normalized
      else updateSelectedCostume(stage.value, { preset: 'custom', data: normalized })
      snapshot = normalized
    }
  }
  await restoreCostumeSnapshot(snapshot)
  if (isStageSelected.value && !snapshot) {
    const context = canvas.getContext('2d')
    context.fillStyle = activeBackdrop.value?.color || '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
  }
  costumeHistory.value = [snapshot || canvas.toDataURL('image/png')]
  costumeHistoryIndex.value = 0
}

function startCostumeDrawing(event) {
  const canvas = costumeCanvasRef.value
  if (!canvas) return
  updateCostumeCursor(event)
  costumeDrawingPointerId = event.pointerId
  canvas.setPointerCapture?.(event.pointerId)
  costumeStartPoint = costumePoint(event)
  const context = canvas.getContext('2d')
  costumeStartSnapshot = context.getImageData(0, 0, canvas.width, canvas.height)
  if (costumeTool.value === 'brush' || costumeTool.value === 'eraser') {
    context.save()
    context.globalCompositeOperation = costumeTool.value === 'eraser' ? 'destination-out' : 'source-over'
    context.strokeStyle = costumeFill.value
    context.lineWidth = currentCostumeStrokeSize()
    context.lineCap = 'round'
    context.beginPath()
    context.moveTo(costumeStartPoint.x, costumeStartPoint.y)
    context.lineTo(costumeStartPoint.x + 0.01, costumeStartPoint.y + 0.01)
    context.stroke()
    context.restore()
  }
}

function drawCostume(event) {
  updateCostumeCursor(event)
  if (event.pointerId !== costumeDrawingPointerId) return
  const canvas = costumeCanvasRef.value
  const context = canvas.getContext('2d')
  const point = costumePoint(event)
  if (costumeTool.value === 'brush' || costumeTool.value === 'eraser') {
    context.save()
    context.globalCompositeOperation = costumeTool.value === 'eraser' ? 'destination-out' : 'source-over'
    context.strokeStyle = costumeFill.value
    context.lineWidth = currentCostumeStrokeSize()
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(costumeStartPoint.x, costumeStartPoint.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    context.restore()
    costumeStartPoint = point
    return
  }
  context.putImageData(costumeStartSnapshot, 0, 0)
  drawCostumeShape(context, point)
}

function finishCostumeDrawing(event) {
  if (event.pointerId !== costumeDrawingPointerId) return
  drawCostume(event)
  costumeDrawingPointerId = null
  costumeStartPoint = null
  costumeStartSnapshot = null
  saveCostumeSnapshot()
}

async function undoCostume() {
  if (costumeHistoryIndex.value <= 0) return
  costumeHistoryIndex.value -= 1
  const snapshot = costumeHistory.value[costumeHistoryIndex.value]
  await restoreCostumeSnapshot(snapshot)
  const blank = isCostumeCanvasBlank(costumeCanvasRef.value)
  if (isStageSelected.value) {
    if (activeBackdrop.value) {
      activeBackdrop.value.data = blank ? null : snapshot
      activeBackdrop.value.preset = blank ? activeBackdrop.value.id : 'custom'
      refreshBackdropFields()
    }
  } else updateSelectedCostume(stage.value, { preset: blank ? 'star' : 'custom', data: blank ? null : snapshot })
}

async function redoCostume() {
  if (costumeHistoryIndex.value >= costumeHistory.value.length - 1) return
  costumeHistoryIndex.value += 1
  const snapshot = costumeHistory.value[costumeHistoryIndex.value]
  await restoreCostumeSnapshot(snapshot)
  const blank = isCostumeCanvasBlank(costumeCanvasRef.value)
  if (isStageSelected.value) {
    if (activeBackdrop.value) {
      activeBackdrop.value.data = blank ? null : snapshot
      activeBackdrop.value.preset = blank ? activeBackdrop.value.id : 'custom'
      refreshBackdropFields()
    }
  } else updateSelectedCostume(stage.value, { preset: blank ? 'star' : 'custom', data: blank ? null : snapshot })
}

function clearCostume() {
  const canvas = costumeCanvasRef.value
  if (!canvas) return
  canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  saveCostumeSnapshot()
}

function selectCostume(costumeId) {
  if (isStageSelected.value) {
    if (costumeId === stageState.value.selectedBackdropId) return
    stage.value.selectedBackdropId = costumeId
    const backdrop = stageBackdrops.value.find((item) => item.id === costumeId)
    if (backdrop) {
      stage.value.backdrop = backdrop.color
      stageState.value.backdrop = backdrop.color
      stageState.value.selectedBackdropId = costumeId
    }
    void loadCostumeCanvas()
    return
  }
  if (costumeId === stage.value.selectedCostumeId) return
  stage.value.selectedCostumeId = costumeId
  applySelectedCostume(stage.value)
  void loadCostumeCanvas()
}

function addCostume() {
  if (isStageSelected.value) {
    const id = `backdrop-${Date.now()}`
    stageBackdrops.value.push({ id, name: `背景 ${stageBackdrops.value.length + 1}`, preset: 'custom', color: '#ffffff', data: null, scale: 100, x: 0, y: 0, size: 100, rotation: 90, visible: true })
    refreshBackdropFields()
    stage.value.selectedBackdropId = id
    stage.value.backdrop = '#ffffff'
    stageState.value.selectedBackdropId = id
    stageState.value.backdrop = '#ffffff'
    void loadCostumeCanvas()
    return
  }
  ensureCostumeCollection(stage.value)
  const id = `costume-${Date.now()}`
  stage.value.costumes.push({ id, name: `造型 ${stage.value.costumes.length + 1}`, preset: 'star', data: null })
  stage.value.selectedCostumeId = id
  applySelectedCostume(stage.value)
  refreshCostumeFields()
  void loadCostumeCanvas()
}

function renameActiveAsset(value, finalize = false) {
  const asset = isStageSelected.value ? activeBackdrop.value : activeCostume.value
  if (!asset) return
  const fallbackPrefix = isStageSelected.value ? '背景' : '造型'
  const collection = isStageSelected.value ? stageBackdrops.value : stage.value.costumes
  const index = Math.max(0, collection.findIndex((item) => item.id === asset.id))
  const inputName = String(value || '').slice(0, 30)
  asset.name = finalize ? (inputName.trim() || `${fallbackPrefix} ${index + 1}`) : inputName
  if (isStageSelected.value) refreshBackdropFields()
  else refreshCostumeFields()
  if (finalize) refreshToolbox()
}

function setSpriteColor(color) {
  stage.value.color = color
  stage.value.message = '新造型准备好了！'
}

function setBackdrop(value) {
  const backdrop = findBackdrop(value) || stageBackdrops.value[0]
  if (!backdrop) return null
  const nextColor = backdrop.color || '#ffffff'
  stage.value.backdrop = nextColor
  stage.value.selectedBackdropId = backdrop.id
  stageState.value.selectedBackdropId = backdrop.id
  stageState.value.backdrop = nextColor
  stage.value.message = '舞台背景更新好了！'
  void runActorEvent(selectedActorId.value, 'event_when_backdrop', (block) => backdropFieldMatches(block, backdrop))
  return backdrop
}

function setBackdropScale(value) {
  const scale = Math.max(25, Math.min(200, Number(value) || 100))
  if (activeBackdrop.value) {
    activeBackdrop.value.scale = scale
    activeBackdrop.value.size = scale
  }
  stageState.value.backdropScale = scale
  stage.value.backdropScale = scale
}

function openAssetUpload() {
  assetUploadRef.value?.click()
}

function normalizeTransparentImage(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.naturalWidth || image.width
      canvas.height = image.naturalHeight || image.height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      context.drawImage(image, 0, 0)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
      const { data, width, height } = imageData
      const candidate = new Uint8Array(width * height)
      let lightCount = 0
      let blueCount = 0
      const isBackgroundPixel = (red, green, blue) => {
        if (red >= 245 && green >= 245 && blue >= 245) return 1
        if (Math.abs(red - 237) <= 18 && Math.abs(green - 241) <= 18 && Math.abs(blue - 247) <= 18) return 2
        return 0
      }
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const pixelIndex = (y * width + x) * 4
          if (data[pixelIndex + 3] === 0) continue
          const kind = isBackgroundPixel(data[pixelIndex], data[pixelIndex + 1], data[pixelIndex + 2])
          candidate[y * width + x] = kind
          if (y < 3 || y >= height - 3 || x < 3 || x >= width - 3) {
            if (kind === 1) lightCount += 1
            if (kind === 2) blueCount += 1
          }
        }
      }
      const borderPixelCount = Math.max(1, width * 6 + height * 6 - 36)
      const shouldStrip = lightCount > borderPixelCount * 0.08 && blueCount > borderPixelCount * 0.08
      if (!shouldStrip) {
        resolve(dataUrl)
        return
      }
      const queue = new Int32Array(width * height)
      let queueStart = 0
      let queueEnd = 0
      const enqueue = (x, y) => {
        const index = y * width + x
        if (!candidate[index]) return
        candidate[index] = 0
        queue[queueEnd++] = index
      }
      for (let x = 0; x < width; x += 1) {
        enqueue(x, 0)
        enqueue(x, height - 1)
      }
      for (let y = 1; y < height - 1; y += 1) {
        enqueue(0, y)
        enqueue(width - 1, y)
      }
      while (queueStart < queueEnd) {
        const index = queue[queueStart++]
        data[index * 4 + 3] = 0
        const x = index % width
        const y = Math.floor(index / width)
        if (x > 0) enqueue(x - 1, y)
        if (x < width - 1) enqueue(x + 1, y)
        if (y > 0) enqueue(x, y - 1)
        if (y < height - 1) enqueue(x, y + 1)
      }
      context.putImageData(imageData, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => resolve(dataUrl)
    image.src = dataUrl
  })
}

function handleAssetUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file || !file.type.startsWith('image/')) return
  const reader = new FileReader()
  reader.onload = async () => {
    const name = file.name.replace(/\.[^.]+$/, '') || '上传图片'
    const data = await normalizeTransparentImage(String(reader.result))
    if (isStageSelected.value) {
      const id = `backdrop-${Date.now()}`
      stageBackdrops.value.push({ id, name, preset: 'custom', color: '#ffffff', data, scale: 100, x: 0, y: 0, size: 100, rotation: 90, visible: true })
      refreshBackdropFields()
      stage.value.selectedBackdropId = id
      stage.value.backdrop = '#ffffff'
      stageState.value.selectedBackdropId = id
      stageState.value.backdrop = '#ffffff'
    } else {
      updateSelectedCostume(stage.value, { preset: 'custom', data, name })
      refreshCostumeFields()
    }
    void loadCostumeCanvas()
  }
  reader.readAsDataURL(file)
}

function resetSprite() {
  stage.value.x = 0
  stage.value.y = 0
  stage.value.rotation = 90
  stage.value.size = 100
  stage.value.visible = true
  stage.value.effectColor = 0
  stage.value.draggable = true
  stage.value.message = '角色已回到舞台中央。'
}

function playSound(soundId = stage.value.sound) {
  const option = soundOptions.find((item) => item.id === soundId) || soundOptions[0]
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) {
    stage.value.message = '当前浏览器不支持声音预览。'
    return Promise.resolve()
  }
  const context = new AudioContext()
  activeSoundContexts.add(context)
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(option.frequency * 2 ** ((stage.value.pitch - 100) / 120), context.currentTime)
  gain.gain.setValueAtTime(Math.max(0, Math.min(1, stage.value.volume / 100)) * 0.12, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.42)
  oscillator.connect(gain).connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.42)
  stage.value.message = `${option.label}已播放！`
  return new Promise((resolve) => {
    oscillator.onended = () => {
      activeSoundContexts.delete(context)
      context.close().finally(resolve)
    }
  })
}

function stopAllSounds() {
  activeSoundContexts.forEach((context) => context.close())
  activeSoundContexts.clear()
}

function previewSound() {
  playSound()
}

async function reportCourseTaskCompletion() {
  if (!courseMode.value || !courseContext.value.resourceId) return
  try {
    await completeStudentBlockProject({ ...courseContext.value, studyDuration: 1 })
  } catch (error) {
    ElMessage.error(error?.message || '任务完成状态保存失败')
  }
}

function goBack() {
  if (courseMode.value && courseContext.value.courseId) {
    router.push({ name: 'course-learn', params: { courseId: courseContext.value.courseId }, query: { assignmentId: courseContext.value.assignmentId || undefined } })
    return
  }
  router.push('/tools')
}
function goProjects() { router.push('/main/projects?type=blocks') }

watch(() => task.value.completed, (completed) => {
  if (completed) reportCourseTaskCompletion()
})

onMounted(async () => {
  await nextTick()
  initWorkspace()
  loadCostumeCanvas()
  window.addEventListener('keydown', runKeyEvent)
  window.addEventListener('keyup', clearKeyEvent)
  if (route.query.projectId) await openProject(route.query.projectId)
})

onBeforeUnmount(() => {
  stopRequested = true
  stopLoudnessMeter()
  stopAllSounds()
  resizeObserver?.disconnect()
  if (toolboxSyncFrame) window.cancelAnimationFrame(toolboxSyncFrame)
  blocklyRef.value?.removeEventListener('wheel', toolboxInteractionHandler, true)
  blocklyRef.value?.removeEventListener('pointermove', toolboxInteractionHandler, true)
  blocklyRef.value?.removeEventListener('pointerup', toolboxInteractionHandler, true)
  if (workspace && workspaceChangeHandler) workspace.removeChangeListener(workspaceChangeHandler)
  clearVariableVisibilityControls()
  workspace?.dispose()
  window.removeEventListener('keydown', runKeyEvent)
  window.removeEventListener('keyup', clearKeyEvent)
})
</script>

<template>
  <main class="block-workshop-page" :class="{ 'course-mode': courseMode }">
    <header class="workshop-header">
      <button class="icon-button" type="button" aria-label="返回在线工具" @click="goBack"><el-icon><Back /></el-icon></button>
      <div class="project-title">
        <span class="header-sticker">BLOCK LAB</span>
        <strong>{{ title || '未命名积木作品' }}</strong>
        <button class="edit-project-button" type="button" title="编辑项目信息" aria-label="编辑项目信息" @click="openProjectInfo"><el-icon><EditPen /></el-icon></button>
      </div>
      <div v-if="!courseMode" class="header-actions">
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
          <button v-if="projectTemplate !== 'interactive'" :class="{ active: workbenchTab === 'costume' }" type="button" role="tab" :aria-selected="workbenchTab === 'costume'" @click="selectWorkbenchTab('costume')">{{ isStageSelected ? '背景' : '造型' }}</button>
          <button v-if="projectTemplate !== 'interactive'" :class="{ active: workbenchTab === 'sound' }" type="button" role="tab" :aria-selected="workbenchTab === 'sound'" @click="selectWorkbenchTab('sound')">声音</button>
          <button v-if="projectTemplate !== 'interactive' && hasPluginControls" :class="{ active: workbenchTab === 'plugins' }" type="button" role="tab" :aria-selected="workbenchTab === 'plugins'" @click="selectWorkbenchTab('plugins')">插件</button>
        </div>
        <div v-show="workbenchTab === 'code'" class="block-editor">
          <nav class="block-category-rail" aria-label="积木分类">
            <button
              v-for="category in getActiveToolboxCategories()"
              :key="category.name"
              :class="{ active: activeToolboxCategory === category.name }"
              :style="{ '--category-colour': category.colour }"
              type="button"
              @click="scrollToolboxTo(category.name)"
            >
              <i aria-hidden="true"></i>
              <span>{{ category.name }}</span>
            </button>
            <button v-if="projectTemplate !== 'interactive'" class="extension-rail-button" type="button" title="添加扩展" aria-label="添加扩展" @click="showExtensionPicker = true"><el-icon><Plus /></el-icon><span>扩展</span></button>
          </nav>
          <div ref="blocklyRef" class="blockly-host"></div>
        </div>
        <div v-show="workbenchTab === 'costume'" class="asset-editor costume-editor">
          <div class="costume-editor-heading"><div><span class="editor-sticker">{{ isStageSelected ? 'BACKDROP LAB' : 'COSTUME LAB' }}</span><h2>{{ isStageSelected ? '背景绘制' : '角色绘制' }}</h2></div><label>{{ isStageSelected ? '背景名称' : '造型名称' }} <input :value="(isStageSelected ? activeBackdrop : activeCostume)?.name || ''" maxlength="30" @input="renameActiveAsset($event.target.value)" @change="renameActiveAsset($event.target.value, true)" /></label></div>
          <div class="costume-editor-body">
          <aside class="costume-list" aria-label="角色造型列表">
            <button v-for="costume in assetItems" :key="costume.id" :class="{ active: costume.id === (isStageSelected ? stageState.selectedBackdropId : stage.selectedCostumeId) }" type="button" @click="selectCostume(costume.id)"><span :class="['costume-list-preview', costume.preset, { custom: costume.data }]" :style="{ background: costume.data ? 'transparent' : (isStageSelected ? costume.color : stage.color) }"><img v-if="costume.data" :src="costume.data" alt="" /><template v-else>✦</template></span><strong>{{ costume.name }}</strong></button>
            <button class="add-costume" type="button" :title="isStageSelected ? '新建背景' : '新建造型'" :aria-label="isStageSelected ? '新建背景' : '新建造型'" @click="addCostume"><el-icon><Plus /></el-icon></button>
          </aside>
          <div class="costume-main">
          <div class="costume-commandbar">
             <label>填充 <input v-model="costumeFill" type="color" aria-label="填充颜色" /></label>
             <label>描边 <input v-model="costumeStroke" type="color" aria-label="描边颜色" /></label>
             <label>{{ costumeTool === 'eraser' ? '擦拭范围' : '笔宽' }} <input :value="currentCostumeStrokeSize()" type="range" min="1" :max="costumeTool === 'eraser' ? 80 : 30" @input="setCostumeToolSize($event.target.value)" /><output>{{ currentCostumeStrokeSize() }}</output></label>
             <label v-if="isStageSelected" class="backdrop-scale-control">背景大小 <input :value="activeBackdrop?.size || 100" type="range" min="25" max="200" step="5" aria-label="背景大小" @input="setBackdropScale($event.target.value)" /><output>{{ activeBackdrop?.size || 100 }}%</output></label>
             <span class="costume-command-spacer"></span>
            <button type="button" title="撤销" aria-label="撤销" :disabled="costumeHistoryIndex <= 0" @click="undoCostume"><el-icon><RefreshRight /></el-icon></button>
            <button type="button" title="重做" aria-label="重做" :disabled="costumeHistoryIndex >= costumeHistory.length - 1" @click="redoCostume"><el-icon class="redo-icon"><RefreshRight /></el-icon></button>
            <button type="button" title="清空画布" aria-label="清空画布" @click="clearCostume"><el-icon><VideoPause /></el-icon></button>
          </div>
          <div class="costume-workspace">
            <nav class="costume-tools" aria-label="绘制工具">
              <button v-for="tool in [{ id: 'brush', label: '画笔', mark: 'brush' }, { id: 'eraser', label: '橡皮擦', mark: 'eraser' }, { id: 'line', label: '直线', mark: 'line' }, { id: 'circle', label: '圆形', mark: 'circle' }, { id: 'rectangle', label: '矩形', mark: 'rectangle' }]" :key="tool.id" :class="{ active: costumeTool === tool.id }" type="button" :title="tool.label" :aria-label="tool.label" @click="costumeTool = tool.id"><el-icon v-if="tool.id === 'brush'"><Brush /></el-icon><span v-else :class="`costume-tool-mark ${tool.mark}`" aria-hidden="true"></span></button>
            </nav>
            <div class="costume-canvas-shell">
              <canvas ref="costumeCanvasRef" :class="['costume-canvas', { 'eraser-active': costumeTool === 'eraser' }]" width="560" height="420" @pointerdown="startCostumeDrawing" @pointerenter="updateCostumeCursor" @pointermove="drawCostume" @pointerleave="hideCostumeCursor" @pointerup="finishCostumeDrawing" @pointercancel="finishCostumeDrawing" />
              <span v-if="costumeTool === 'eraser' && costumeCursor.visible" class="eraser-range" :style="eraserCursorStyle" aria-hidden="true"></span>
            </div>
            <aside class="costume-palette" aria-label="颜色预设">
              <strong>颜色</strong>
               <button v-for="color in ['#ee91bb', '#8178cf', '#52bbc4', '#f2a54a', '#fff1a8', '#3d3564', '#ffffff']" :key="color" :class="{ selected: costumeFill === color }" :style="{ background: color }" type="button" :aria-label="`使用 ${color} 填充`" @click="costumeFill = color"></button>
               <button class="upload-costume-image" type="button" title="从图片创建" :aria-label="isStageSelected ? '选择图片作为背景' : '选择图片作为角色造型'" @click="openAssetUpload"><el-icon><Picture /></el-icon></button>
               <input ref="assetUploadRef" class="backdrop-upload-input" type="file" accept="image/*" @change="handleAssetUpload" />
             </aside>
          </div>
          <div class="costume-footer"><span>{{ isStageSelected ? '舞台背景' : '透明背景' }}</span><span>{{ isStageSelected ? '绘制完成后会自动应用到当前背景' : '绘制完成后会自动应用到当前角色' }}</span></div>
          </div>
          </div>
        </div>
        <div v-show="workbenchTab === 'sound'" class="asset-editor sound-editor">
          <div class="asset-editor-heading"><span class="editor-sticker">SOUND LAB</span><h2>声音编辑</h2><p>给作品选一段轻快的提示音，再调好合适的音量。</p></div>
          <div class="sound-studio"><button v-for="sound in soundOptions" :key="sound.id" :class="{ selected: stage.sound === sound.id }" type="button" @click="stage.sound = sound.id; previewSound()"><el-icon><Headset /></el-icon>{{ sound.label }}</button></div>
          <label class="volume-control">音量 <input v-model.number="stage.volume" type="range" min="0" max="100" /><output>{{ stage.volume }}%</output></label>
          <button class="asset-button" type="button" @click="previewSound"><el-icon><VideoPlay /></el-icon>试听提示音</button>
        </div>
        <div v-if="hasPluginControls" v-show="workbenchTab === 'plugins'" class="asset-editor plugin-editor">
          <div class="asset-editor-heading"><span class="editor-sticker">EXTENSIONS</span><h2>插件控件</h2><p>这里集中放置已启用插件提供的交互控件。</p></div>
          <section v-if="hasDrawGuessExtension" class="plugin-control-card" aria-label="你画我猜">
            <div class="plugin-control-heading"><div><span>AI 涂鸦画板</span><small>你画我猜</small></div><button type="button" @click="clearSketch">清空</button></div>
            <div v-show="drawBoardVisible" class="draw-board-shell">
              <canvas ref="sketchRef" width="920" height="420" @pointerdown="startSketch" @pointermove="drawSketch" @pointerup="endSketch" @pointercancel="endSketch" />
              <small><el-icon><MagicStick /></el-icon>{{ aiStatus }}</small>
            </div>
            <div v-show="!drawBoardVisible" class="plugin-closed-state">运行“打开涂鸦画板”积木后即可开始绘制。</div>
          </section>
        </div>
      </section>

      <aside class="stage-panel" aria-label="互动舞台">
        <div class="stage-toolbar"><strong>互动舞台</strong><span class="live-dot">LIVE</span></div>
        <div :class="['stage-scene', { 'maze-stage': projectTemplate === 'interactive' }]" :style="stageSceneStyle" @pointerdown="startStagePointer" @pointermove="handleStagePointerMove" @pointerup="endStagePointer" @pointercancel="endStagePointer">
          <img v-if="projectTemplate !== 'interactive' && activeBackdrop?.data" class="stage-backdrop-image" :src="activeBackdrop.data" alt="" :style="activeBackdropStyle" />
          <div v-if="projectTemplate !== 'interactive'" class="stage-stars" aria-hidden="true">+ * +</div>
          <div v-if="projectTemplate !== 'interactive' && stage.message && stage.messageOrigin === 'block'" :class="['speech-bubble', { thought: stage.messageMode === 'think' }]">{{ stage.message }}</div>
          <div v-if="projectTemplate === 'interactive'" :class="['maze-board', { editing: !running }]" :style="mazeGridStyle" aria-label="迷宫地图">
            <button v-for="cell in mazeCells" :key="`${cell.row}-${cell.col}`" type="button" :disabled="running" :class="['maze-cell', { wall: isMazeWall(cell.row, cell.col), goal: cell.row === task.target.row && cell.col === task.target.col, player: cell.row === task.row && cell.col === task.col }]" :aria-label="`第 ${cell.row + 1} 行第 ${cell.col + 1} 列`" @click.stop="editMazeCell(cell.row, cell.col)">
              <span v-if="cell.row === task.target.row && cell.col === task.target.col && !(cell.row === task.row && cell.col === task.col)" aria-hidden="true">★</span>
              <span v-if="cell.row === task.row && cell.col === task.col" class="maze-player" :style="{ transform: `rotate(${(task.direction - 1) * 90}deg)` }" aria-label="当前角色">➤</span>
            </button>
          </div>
          <div v-if="visibleVariables.length || visibleLists.length" class="data-monitors">
            <div v-if="visibleVariables.length" class="variable-monitors" aria-label="画布变量">
              <div v-for="([name, value], index) in visibleVariables" :key="name" class="variable-monitor" :style="variableMonitorStyle(name, index)" :aria-label="`拖动变量 ${name}`" :title="`拖动变量 ${name}`" @pointerdown="startDataMonitorDrag($event, 'variable', name)">{{ name }} <b>{{ value }}</b></div>
            </div>
            <div v-if="visibleLists.length" class="list-monitors" aria-label="画布列表">
              <section v-for="([name, items], index) in visibleLists" :key="name" class="list-monitor" :style="listMonitorStyle(name, index)" :aria-label="`拖动列表 ${name}`" :title="`拖动列表 ${name}`" @pointerdown="startDataMonitorDrag($event, 'list', name)">
                <header>{{ name }}</header>
                <ol v-if="items.length">
                  <li v-for="(item, index) in items" :key="`${name}-${index}`">
                    <span>{{ index + 1 }}</span>
                    <div class="list-monitor-entry">
                      <input :ref="(element) => setListItemInputRef(element, name, index)" :value="item" :aria-label="`${name} 的第 ${index + 1} 项`" @pointerdown.stop @input="updateListItem(name, index, $event.target.value)" @keydown.enter.prevent="appendListItem(name)" @keydown.esc="$event.currentTarget.blur()" />
                      <button type="button" :title="`删除第 ${index + 1} 项`" :aria-label="`删除 ${name} 的第 ${index + 1} 项`" @pointerdown.stop @click.stop="removeListItem(name, index)">×</button>
                    </div>
                  </li>
                </ol>
                <p v-else>空列表</p>
                <footer><button type="button" title="快速添加列表项" :aria-label="`向列表 ${name} 快速添加一项`" @pointerdown.stop @click.stop="appendListItem(name)">+</button><span>长度 {{ items.length }}</span></footer>
              </section>
            </div>
          </div>
          <div v-if="projectTemplate === 'interactive'" :class="['task-status', { completed: task.completed, failed: task.failed }]">{{ task.label }} · 前进 {{ task.moves }} / {{ task.limit }} 次<br /><small>积木 {{ taskBlockCount }} / {{ task.blockLimit }} · {{ task.status }}</small></div>
          <div v-if="projectTemplate !== 'interactive'" v-for="actor in actors" :key="actor.id" :class="['default-sprite', actor.state.costume, { custom: actor.state.costumeData, selected: actor.id === selectedActorId, gliding: gliding && actor.id === selectedActorId }]" :style="{ left: `calc(50% + ${actor.state.x}px)`, top: `calc(58% + ${actor.state.y}px)`, transform: `translate(-50%, -50%) rotate(${actor.state.rotation - 90}deg)`, background: actor.state.costumeData ? 'transparent' : actor.state.color, filter: `hue-rotate(${actor.state.effectColor || 0}deg)`, width: `${spriteSizePixels(actor.state.size)}px`, height: `${spriteSizePixels(actor.state.size)}px`, visibility: actor.state.visible ? 'visible' : 'hidden' }" @pointerdown="startActorDrag($event, actor.id)" @click.stop="handleActorClick(actor.id)"><img v-if="actor.state.costumeData" :src="actor.state.costumeData" alt="" /><template v-else>✦</template></div>
        </div>
        <div class="runner-actions">
          <el-button class="run-button" :loading="running" @click="runProject"><el-icon><VideoPlay /></el-icon>开始运行</el-button>
          <el-button class="stop-button" :disabled="!running" @click="stopProject"><el-icon><VideoPause /></el-icon>停止</el-button>
        </div>
        <section v-if="projectTemplate === 'interactive'" class="task-config" aria-label="任务规则">
          <div><strong>关卡设计</strong><span>点击地图配置你的规则</span></div>
          <label>名称 <input v-model.trim="task.label" maxlength="20" /></label>
          <div class="task-grid-size"><label>行 <input :value="task.rows" type="number" min="4" max="12" @change="setMazeDimension('rows', $event.target.value)" /></label><label>列 <input :value="task.cols" type="number" min="4" max="12" @change="setMazeDimension('cols', $event.target.value)" /></label><label>前进上限 <input v-model.number="task.limit" type="number" min="1" max="99" /></label></div>
          <label>积木上限 <input :value="task.blockLimit" type="number" min="1" max="99" @change="syncTaskBlockLimit($event.target.value)" /></label>
          <div class="task-editor-tools"><button v-for="mode in [{ id: 'wall', label: '墙体' }, { id: 'start', label: '起点' }, { id: 'target', label: '终点' }]" :key="mode.id" :class="{ active: taskEditorMode === mode.id }" type="button" @click="taskEditorMode = mode.id">设置{{ mode.label }}</button><button type="button" @click="resetMazeBoard">重置地图</button></div>
        </section>
        <section v-if="projectTemplate !== 'interactive' && isStageSelected" class="sprite-inspector" aria-label="舞台属性">
          <div class="inspector-heading"><span><el-icon><Picture /></el-icon>舞台</span></div>
          <label class="sprite-name">名称 <input v-model="stageState.spriteName" maxlength="30" /></label>
          <div class="sprite-fields backdrop-fields"><label>x <input v-model.number="activeBackdrop.x" type="number" min="-180" max="180" /></label><label>y <input v-model.number="activeBackdrop.y" type="number" min="-115" max="115" /></label><label>大小 <input v-model.number="activeBackdrop.size" type="number" min="20" max="300" /></label></div>
          <div class="direction-setting backdrop-direction"><label>方向 <input :value="Math.round(activeBackdrop.rotation || 90)" type="number" min="-180" max="180" @change="activeBackdrop.rotation = normalizeDirection($event.target.value)" /></label></div>
          <div class="sprite-visibility"><span>显示</span><button :class="{ active: activeBackdrop.visible !== false }" type="button" @click="activeBackdrop.visible = true"><el-icon><View /></el-icon></button><button :class="{ active: activeBackdrop.visible === false }" type="button" @click="activeBackdrop.visible = false"><el-icon><Hide /></el-icon></button></div>
          <div class="stage-inspector-summary"><span>当前背景</span><strong>{{ activeBackdrop?.name || '未命名背景' }}</strong><button type="button" @click="selectWorkbenchTab('costume')">编辑背景</button></div>
        </section>
        <section v-else-if="projectTemplate !== 'interactive'" class="sprite-inspector" aria-label="角色属性">
          <div class="inspector-heading"><span><el-icon><Setting /></el-icon>角色与舞台</span><button type="button" title="重置角色" @click="resetSprite"><el-icon><RefreshRight /></el-icon></button></div>
          <label class="sprite-name">角色 <input v-model="stage.spriteName" maxlength="30" /></label>
          <div class="sprite-fields"><label>x <input v-model.number="stage.x" type="number" min="-180" max="180" /></label><label>y <input v-model.number="stage.y" type="number" min="-115" max="115" /></label><label>大小 <input v-model.number="stage.size" type="number" min="0" @change="stage.size = normalizeSpriteSize($event.target.value)" /></label></div>
          <div class="direction-setting">
            <label>方向 <input :value="Math.round(stage.rotation)" type="number" min="-180" max="180" @change="setSpriteDirection($event.target.value)" @focus="showDirectionPicker = true" @keydown.esc="showDirectionPicker = false" /></label>
            <div v-if="showDirectionPicker" class="direction-picker" role="dialog" aria-label="设置角色方向">
              <div class="direction-dial" role="slider" aria-label="角色方向盘" aria-valuemin="-180" aria-valuemax="180" :aria-valuenow="Math.round(stage.rotation)" @pointerdown.prevent="startDirectionDial" @pointermove="moveDirectionDial" @pointerup="endDirectionDial" @pointercancel="endDirectionDial">
                <i v-for="tick in 12" :key="tick" :style="{ transform: `rotate(${tick * 30}deg)` }"></i>
                <span class="direction-dial-line" :style="{ transform: `rotate(${stage.rotation}deg)` }"></span>
              </div>
              <div class="direction-presets"><button v-for="item in [{ label: '上', value: 0 }, { label: '右', value: 90 }, { label: '下', value: 180 }, { label: '左', value: -90 }]" :key="item.value" type="button" @click="setSpriteDirection(item.value, true)">{{ item.label }}</button></div>
            </div>
          </div>
          <div class="sprite-visibility"><span>显示</span><button :class="{ active: stage.visible }" type="button" @click="stage.visible = true"><el-icon><View /></el-icon></button><button :class="{ active: !stage.visible }" type="button" @click="stage.visible = false"><el-icon><Hide /></el-icon></button></div>
        </section>
        <section class="asset-tray" aria-label="角色与舞台资源">
          <div class="asset-list"><strong>角色</strong><div class="sprite-cards"><button v-for="actor in actors" :key="actor.id" :class="['sprite-tile', { active: actor.id === selectedActorId }]" type="button" @click="selectActor(actor.id)"><span :class="['mini-sprite', actor.state.costume, { custom: actor.state.costumeData }]" :style="{ background: actor.state.costumeData ? 'transparent' : actor.state.color }"><img v-if="actor.state.costumeData" :src="actor.state.costumeData" alt="" /><template v-else>✦</template></span>{{ actor.state.spriteName || '未命名角色' }}<i v-if="actors.length > 1" role="button" tabindex="0" title="删除角色" @click.stop="removeActor(actor.id)" @keydown.enter.stop.prevent="removeActor(actor.id)">×</i></button><button class="add-sprite" type="button" title="添加角色" @click="addActor"><el-icon><Plus /></el-icon></button></div></div>
          <div class="backdrop-list"><strong>舞台</strong><button :class="['stage-tile', { selected: isStageSelected }]" :style="stageSceneStyle" type="button" title="编辑舞台与背景" @click="selectActor(stageId)"><el-icon><Picture /></el-icon></button></div>
        </section>
      </aside>
    </section>

    <div v-if="showTemplatePicker" class="base-dialog-backdrop" role="presentation" @click.self="showTemplatePicker = false">
      <section class="base-dialog" role="dialog" aria-modal="true" aria-label="选择项目基座">
        <div class="base-dialog-heading"><div><span class="editor-sticker">PROJECT BASE</span><h2>选择你的项目基座</h2></div><button type="button" aria-label="关闭" @click="showTemplatePicker = false">×</button></div>
        <div class="base-options"><article v-for="base in baseCatalog" :key="base.id" :class="['base-option', base.id]"><span>{{ base.tag }}</span><h3>{{ base.title }}</h3><p>{{ base.description }}</p><button type="button" @click="startNewProject(base.id)">用这个基座开始</button></article></div>
      </section>
    </div>
    <div v-if="showExtensionPicker" class="base-dialog-backdrop" role="presentation" @click.self="showExtensionPicker = false">
      <section class="extension-dialog" role="dialog" aria-modal="true" aria-label="添加扩展">
        <div class="base-dialog-heading"><div><span class="editor-sticker">EXTENSIONS</span><h2>添加扩展</h2></div><button type="button" aria-label="关闭" @click="showExtensionPicker = false">×</button></div>
        <article class="extension-option">
          <span class="extension-option-icon">✦</span>
          <div><h3>{{ drawGuessExtension.name }}</h3><p>{{ drawGuessExtension.description }}</p></div>
          <button type="button" :disabled="hasDrawGuessExtension" @click="enableDrawGuessExtension">{{ hasDrawGuessExtension ? '已添加' : '添加' }}</button>
        </article>
      </section>
    </div>
    <div v-if="showProjectInfo" class="base-dialog-backdrop" role="presentation" @click.self="showProjectInfo = false">
      <section class="project-info-dialog" role="dialog" aria-modal="true" aria-label="编辑项目">
        <div class="base-dialog-heading"><div><span class="editor-sticker">PROJECT INFO</span><h2>编辑项目</h2></div><button type="button" aria-label="关闭" @click="showProjectInfo = false">×</button></div>
        <label>项目名称 <em>必填</em><input v-model="projectInfoDraft.title" maxlength="100" placeholder="给作品起个名字" /></label>
        <label>项目描述 <em>必填</em><textarea v-model="projectInfoDraft.description" maxlength="500" placeholder="介绍一下你的创意吧"></textarea></label>
        <label>标签 <small>最多 10 个</small><div class="project-tags"><span v-for="tag in projectInfoDraft.tags" :key="tag">{{ tag }}<button type="button" :aria-label="`移除标签 ${tag}`" @click="removeProjectTag(tag)">×</button></span><input v-if="projectInfoDraft.tags.length < 10" v-model="projectTagInput" maxlength="20" placeholder="输入后按回车" @keydown.enter.prevent="addProjectTag" /></div></label>
        <fieldset class="visibility-choice"><legend>可见范围</legend><label><input v-model="projectInfoDraft.visibility" type="radio" value="public" />公开 <small>发布后，其他用户可以在作品广场看到。</small></label><label><input v-model="projectInfoDraft.visibility" type="radio" value="private" />私密 <small>仅自己可见，不会在作品广场展示。</small></label></fieldset>
        <div class="project-info-actions"><button type="button" @click="showProjectInfo = false">取消</button><button class="confirm" type="button" @click="saveProjectInfo">确认</button></div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.block-workshop-page { --ink:#403960; --purple:#776bb4; --pink:#c87598; --mint:#9bcfd0; --yellow:#f0dc8b; min-height:calc(100vh - 64px); background:#f4f3f8; color:var(--ink); font-family:'Microsoft YaHei',Arial,sans-serif; }
.workshop-header { display:flex; height:66px; align-items:center; gap:14px; padding:0 clamp(14px,2.5vw,38px); border-bottom:2px solid var(--ink); background:#f0eff4; box-shadow:0 3px 0 rgb(64 57 96 / 14%); }
.icon-button { display:grid; width:37px; height:37px; place-items:center; border:1px solid var(--ink); border-radius:5px; background:var(--yellow); color:var(--ink); cursor:pointer; box-shadow:2px 3px 0 rgb(61 53 100 / 24%); }.icon-button:hover { transform:translate(-1px,-1px); }
.project-title { display:flex; min-width:0; align-items:center; gap:11px; }.header-sticker { flex:0 0 auto; padding:5px 7px; border:1px solid var(--ink); border-radius:4px; background:var(--yellow); box-shadow:2px 2px 0 rgb(61 53 100 / 25%); font-family:'Trebuchet MS',sans-serif; font-size:10px; font-weight:900; transform:rotate(-2deg); }.project-title strong { overflow:hidden; max-width:min(30vw,360px); font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:20px; font-weight:900; text-overflow:ellipsis; white-space:nowrap; }.edit-project-button { display:grid; width:29px; height:29px; flex:0 0 auto; place-items:center; border:1px solid rgb(61 53 100 / 32%); border-radius:4px; background:#fff; color:var(--purple); cursor:pointer; }.edit-project-button:hover { border-color:var(--purple); background:#f0edff; }.header-actions { display:flex; align-items:center; gap:8px; margin-left:auto; }.header-actions :deep(.el-button),.runner-actions :deep(.el-button) { display:inline-flex; align-items:center; gap:6px; border-radius:5px; font-weight:800; white-space:nowrap; word-break:keep-all; }.secondary-action { border:1px solid var(--ink)!important; background:#fff!important; color:var(--ink)!important; box-shadow:2px 3px 0 rgb(61 53 100 / 18%); }.primary-action,.run-button { border:1px solid #4e4473!important; background:var(--purple)!important; box-shadow:3px 4px 0 rgb(61 53 100 / 28%); color:#fff!important; }.primary-action:hover:not(:disabled),.run-button:hover:not(:disabled) { transform:translate(-2px,-2px); box-shadow:5px 6px 0 rgb(61 53 100 / 28%); }
.workshop-layout { display:grid; grid-template-columns:minmax(420px,1fr) minmax(500px,560px); min-height:calc(100vh - 130px); }
.workspace-panel { display:grid; grid-template-rows:44px minmax(0,1fr); min-width:0; min-height:640px; padding:14px; background-image:radial-gradient(rgb(119 107 180 / 18%) 1px,transparent 1px); background-size:16px 16px; }.workbench-tabs { display:flex; align-items:end; gap:5px; padding-left:8px; }.workbench-tabs button { min-width:76px; padding:10px 16px; border:1px solid var(--ink); border-bottom:0; border-radius:7px 7px 0 0; background:#f9f8fc; color:#6f6685; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:14px; font-weight:900; cursor:pointer; white-space:nowrap; }.workbench-tabs button.active { position:relative; z-index:1; background:#e5e2f2; color:var(--ink); box-shadow:3px 0 0 rgb(64 57 96 / 16%); }.workbench-tabs button:focus-visible,.asset-button:focus-visible,.color-swatches button:focus-visible { outline:3px solid var(--pink); outline-offset:2px; }.blockly-host { width:100%; height:100%; min-height:610px; overflow:hidden; border:2px solid var(--ink); border-radius:7px; background:#f9f8fc; box-shadow:5px 6px 0 rgb(64 57 96 / 45%); }.blockly-host :deep(.blocklySvg) { width:100% !important; height:100% !important; }.asset-editor { display:grid; align-content:center; justify-items:start; min-height:610px; padding:clamp(28px,7vw,82px); border:2px solid var(--ink); border-radius:7px; background:linear-gradient(135deg,#fdfcff 0%,#e5e2f2 58%,#d9eeee 100%); box-shadow:5px 6px 0 rgb(64 57 96 / 45%); }.asset-editor h2 { margin:14px 0 0; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:clamp(23px,3vw,34px); font-weight:900; }.asset-editor p { max-width:420px; margin:12px 0 0; color:#625878; line-height:1.7; }.editor-sticker { padding:5px 8px; border:1px solid var(--ink); border-radius:4px; background:var(--yellow); box-shadow:2px 3px 0 rgb(64 57 96 / 20%); font-family:'Trebuchet MS',sans-serif; font-size:11px; font-weight:900; transform:rotate(-3deg); }.color-swatches { display:flex; flex-wrap:wrap; gap:13px; margin-top:27px; }.color-swatches button { width:46px; height:46px; border:2px solid var(--ink); border-radius:50%; box-shadow:3px 4px 0 rgb(64 57 96 / 22%); cursor:pointer; }.color-swatches button.selected { outline:3px solid #fdfcff; outline-offset:-7px; }.asset-button { margin-top:26px; padding:10px 14px; border:1px solid #4e4473; border-radius:5px; background:var(--purple); box-shadow:3px 4px 0 rgb(64 57 96 / 28%); color:#fff; font-weight:900; cursor:pointer; white-space:nowrap; }.asset-button:hover { transform:translate(-2px,-2px); box-shadow:5px 6px 0 rgb(64 57 96 / 28%); }
.stage-panel { display:grid; align-content:start; gap:11px; min-width:0; padding:15px; border-left:1px solid rgb(61 53 100 / 30%); background:#fffdf7; }.stage-toolbar { display:flex; align-items:center; justify-content:space-between; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-weight:900; }.live-dot { padding:3px 6px; border:1px solid var(--ink); border-radius:3px; background:var(--mint); font-size:10px; transform:rotate(2deg); }.stage-scene { position:relative; aspect-ratio:4 / 3; overflow:hidden; border:2px solid var(--ink); border-radius:7px; background:#fff; box-shadow:4px 5px 0 rgb(61 53 100 / 34%); }.stage-scene::after { position:absolute; right:-20px; bottom:-45px; width:150px; height:150px; border:2px dashed rgb(61 53 100 / 32%); border-radius:50%; content:''; }.stage-stars { position:absolute; top:15px; left:17px; color:#d77ba5; font-size:23px; font-weight:900; letter-spacing:15px; }.speech-bubble { position:absolute; z-index:2; top:23px; right:16px; max-width:145px; padding:8px 10px; border:1px solid var(--ink); border-radius:5px; background:#fff; box-shadow:2px 3px 0 rgb(61 53 100 / 20%); font-size:12px; font-weight:700; line-height:1.45; }.default-sprite { position:absolute; z-index:2; display:grid; width:65px; height:65px; place-items:center; border:2px solid var(--ink); border-radius:47% 53% 44% 56%; box-shadow:4px 5px 0 rgb(61 53 100 / 25%); color:#fff; font-size:31px; transition:left .22s ease,top .22s ease,transform .22s ease,background .2s ease; }.runner-actions { display:flex; gap:8px; }.run-button { flex:1; }.stop-button { border:1px solid var(--ink)!important; background:#fff!important; color:var(--ink)!important; }.sketch-panel { padding:10px; border:1px solid rgb(61 53 100 / 32%); border-radius:6px; background:#f7f5ff; }.sketch-panel > div { display:flex; align-items:center; justify-content:space-between; gap:10px; font-size:12px; }.sketch-panel button { border:0; background:transparent; color:var(--purple); font-size:12px; font-weight:800; cursor:pointer; }.sketch-panel canvas { width:100%; height:104px; margin-top:8px; border:1px dashed rgb(61 53 100 / 45%); border-radius:4px; background:#fff; touch-action:none; cursor:crosshair; }.sketch-panel small { display:flex; align-items:center; gap:4px; margin-top:5px; color:#71658f; font-size:11px; }.description-field { display:grid; gap:6px; color:#625878; font-size:12px; font-weight:800; }.description-field textarea { min-height:58px; resize:vertical; padding:8px; border:1px solid rgb(61 53 100 / 38%); border-radius:5px; color:var(--ink); font:inherit; line-height:1.45; }.description-field textarea:focus { outline:2px solid var(--pink); outline-offset:1px; }
.speech-bubble.thought { border-radius:18px; }.speech-bubble.thought::after,.speech-bubble.thought::before { position:absolute; right:22px; border:1px solid var(--ink); border-radius:50%; background:#fff; content:''; }.speech-bubble.thought::after { bottom:-10px; width:8px; height:8px; }.speech-bubble.thought::before { right:13px; bottom:-17px; width:5px; height:5px; }
.variable-monitors { position:absolute; z-index:4; top:62px; left:12px; display:grid; max-width:calc(100% - 24px); gap:6px; }.variable-monitor { position:relative; min-width:72px; padding:4px 7px; border:1px solid var(--ink); border-radius:4px; background:var(--pink); box-shadow:2px 2px 0 rgb(64 57 96 / 22%); color:#fff; font-size:11px; font-weight:800; }.variable-monitor b { float:right; margin-left:8px; color:#fff8df; }
.blockly-host :deep(.blocklyToolboxDiv) { border-right:1px solid rgb(61 53 100 / 22%); background:#fff; }.blockly-host :deep(.blocklyTreeRow) { height:43px; margin:3px 5px; border-radius:5px; }.blockly-host :deep(.blocklyTreeLabel) { color:var(--ink); font-family:'Microsoft YaHei',sans-serif; font-size:13px; font-weight:800; }.blockly-host :deep(.blocklyTreeSelected) { background:#ece9ff!important; box-shadow:2px 2px 0 rgb(61 53 100 / 15%); }.blockly-host :deep(.blocklyFlyoutBackground) { fill:#fff!important; fill-opacity:1!important; }.blockly-host :deep(.blocklyFlyout) { border-right:1px solid rgb(61 53 100 / 18%); }
.asset-editor { display:block; min-height:610px; padding:clamp(28px,5vw,64px); background:linear-gradient(135deg,#fff 0%,#e8e4ff 58%,#d3f2f2 100%); }.asset-editor-heading h2 { margin:14px 0 0; }.asset-editor-heading p { margin:10px 0 0; }.costume-studio { display:grid; grid-template-columns:minmax(210px,.85fr) minmax(240px,1fr); gap:24px; width:min(700px,100%); margin-top:28px; }.costume-preview { display:grid; min-height:260px; place-items:center; border:2px solid var(--ink); border-radius:7px; box-shadow:4px 5px 0 rgb(61 53 100 / 28%); }.costume-sprite { display:grid; width:110px; height:110px; place-items:center; border:3px solid var(--ink); border-radius:47% 53% 44% 56%; box-shadow:6px 7px 0 rgb(61 53 100 / 23%); color:#fff; font-size:54px; }.costume-sprite.bot,.default-sprite.bot,.mini-sprite.bot { border-radius:15px; }.costume-sprite.dot,.default-sprite.dot,.mini-sprite.dot { border-radius:50%; }.costume-controls { display:grid; align-content:start; gap:12px; }.costume-controls strong { margin-top:2px; font-size:14px; }.costume-controls .color-swatches { margin:0 0 10px; }.costume-options,.sound-studio { display:flex; flex-wrap:wrap; gap:8px; }.costume-options button,.sound-studio button { display:inline-flex; align-items:center; gap:6px; padding:9px 11px; border:1px solid var(--ink); border-radius:5px; background:#fff; color:var(--ink); box-shadow:2px 3px 0 rgb(61 53 100 / 17%); font-weight:800; white-space:nowrap; cursor:pointer; }.costume-options button.selected,.sound-studio button.selected { background:#e8e4ff; box-shadow:3px 4px 0 rgb(61 53 100 / 28%); }.sound-studio { margin-top:30px; }.volume-control { display:flex; width:min(460px,100%); align-items:center; gap:12px; margin-top:25px; color:#625878; font-size:14px; font-weight:900; }.volume-control input { flex:1; accent-color:var(--purple); }.volume-control output { min-width:40px; color:var(--ink); }.asset-button { display:inline-flex; align-items:center; gap:6px; }
.costume-editor { display:grid; grid-template-rows:auto auto minmax(0,1fr) auto; gap:12px; min-height:610px; padding:20px; background:#f7f9ff; }.costume-editor-heading,.costume-commandbar { display:flex; align-items:center; gap:12px; }.costume-editor-heading { justify-content:space-between; }.costume-editor-heading h2 { margin:9px 0 0; font-size:24px; }.costume-editor-heading label,.costume-commandbar label { display:flex; align-items:center; gap:7px; color:#625878; font-size:12px; font-weight:800; }.costume-editor-heading input { width:130px; padding:7px 9px; border:1px solid rgb(61 53 100 / 26%); border-radius:5px; color:var(--ink); font:inherit; }.costume-commandbar { min-height:46px; padding:7px 10px; border:1px solid rgb(61 53 100 / 22%); border-radius:6px; background:#fff; }.costume-commandbar input[type='color'] { width:30px; height:27px; padding:1px; border:1px solid rgb(61 53 100 / 25%); border-radius:4px; background:#fff; cursor:pointer; }.costume-commandbar input[type='range'] { width:104px; accent-color:var(--purple); }.costume-commandbar output { min-width:18px; color:var(--ink); text-align:right; }.costume-command-spacer { flex:1; }.costume-commandbar button,.costume-tools button,.use-sprite-colour { display:grid; width:31px; height:31px; place-items:center; border:1px solid rgb(61 53 100 / 26%); border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }.costume-commandbar button:hover:not(:disabled),.costume-tools button:hover,.use-sprite-colour:hover { border-color:var(--purple); background:#f0edff; }.costume-commandbar button:disabled { cursor:not-allowed; opacity:.38; }.redo-icon { transform:scaleX(-1); }.costume-workspace { display:grid; min-height:0; grid-template-columns:48px minmax(0,1fr) 44px; overflow:hidden; border:1px solid rgb(61 53 100 / 25%); border-radius:6px; background:#fff; }.costume-tools { display:flex; flex-direction:column; align-items:center; gap:8px; padding:9px 7px; border-right:1px solid rgb(61 53 100 / 18%); background:#fbfbff; }.costume-tools button { flex:0 0 32px; }.costume-tools button.active { border-color:#4d8df0; background:#e3efff; color:#357ce5; box-shadow:inset 0 0 0 1px #77aaf5; }.costume-tool-mark { position:relative; display:block; width:18px; height:18px; }.costume-tool-mark.eraser { width:14px; height:10px; border:2px solid currentColor; border-radius:2px; transform:rotate(-42deg); }.costume-tool-mark.line::before { position:absolute; top:8px; left:-1px; width:20px; border-top:2px solid currentColor; content:''; transform:rotate(-45deg); }.costume-tool-mark.circle { width:17px; height:17px; border:2px solid currentColor; border-radius:50%; }.costume-tool-mark.rectangle { width:17px; height:14px; border:2px solid currentColor; border-radius:1px; }.costume-canvas-shell { min-width:0; overflow:auto; padding:18px; background-color:#fff; background-image:linear-gradient(45deg,#edf1f7 25%,transparent 25%),linear-gradient(-45deg,#edf1f7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#edf1f7 75%),linear-gradient(-45deg,transparent 75%,#edf1f7 75%); background-position:0 0,0 10px,10px -10px,-10px 0; background-size:20px 20px; }.costume-canvas { display:block; width:min(100%,560px); height:auto; margin:auto; box-shadow:0 0 0 1px rgb(61 53 100 / 10%); touch-action:none; cursor:crosshair; }.costume-palette { display:flex; align-content:start; flex-direction:column; align-items:center; gap:8px; padding:9px 6px; border-left:1px solid rgb(61 53 100 / 18%); background:#fbfbff; }.costume-palette strong { margin:1px 0 3px; color:#756a94; font-size:10px; }.costume-palette > button:not(.use-sprite-colour) { width:22px; height:22px; border:2px solid #fff; border-radius:50%; box-shadow:0 0 0 1px rgb(61 53 100 / 24%); cursor:pointer; }.costume-palette > button.selected { outline:2px solid var(--ink); outline-offset:2px; }.use-sprite-colour { margin-top:5px; color:var(--purple); }.costume-footer { display:flex; justify-content:space-between; color:#756a94; font-size:11px; font-weight:700; }.default-sprite.custom { overflow:hidden; border:0; border-radius:0; box-shadow:none; }.default-sprite.custom img,.mini-sprite.custom img { display:block; width:100%; height:100%; object-fit:contain; }.mini-sprite.custom { overflow:hidden; border:0; border-radius:0; }
.sprite-inspector { padding:11px; border:1px solid rgb(61 53 100 / 30%); border-radius:6px; background:#fff; }.inspector-heading,.sprite-visibility { display:flex; align-items:center; }.inspector-heading { justify-content:space-between; gap:10px; font-weight:900; }.inspector-heading span { display:flex; align-items:center; gap:5px; }.inspector-heading button { display:grid; width:28px; height:28px; place-items:center; border:1px solid var(--ink); border-radius:4px; background:var(--yellow); color:var(--ink); cursor:pointer; }.sprite-name { display:flex; align-items:center; gap:8px; margin-top:10px; color:#625878; font-size:12px; font-weight:800; }.sprite-name input { min-width:0; flex:1; padding:6px 7px; border:1px solid rgb(61 53 100 / 28%); border-radius:4px; color:var(--ink); font:inherit; }.sprite-fields { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin-top:8px; }.sprite-fields label { display:grid; gap:4px; color:#756a94; font-size:11px; font-weight:800; }.sprite-fields input { width:100%; min-width:0; padding:5px; border:1px solid rgb(61 53 100 / 28%); border-radius:4px; color:var(--ink); font:inherit; }.sprite-visibility { gap:5px; margin-top:10px; color:#756a94; font-size:11px; font-weight:800; }.sprite-visibility button { display:grid; width:27px; height:27px; place-items:center; border:1px solid rgb(61 53 100 / 32%); border-radius:4px; background:#fff; color:#756a94; cursor:pointer; }.sprite-visibility button.active { background:var(--mint); color:var(--ink); }.score-label { margin-left:auto; color:var(--purple); white-space:nowrap; }.asset-tray { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:12px; padding:11px; border:1px solid rgb(61 53 100 / 30%); border-radius:6px; background:#f7f5ff; }.asset-list,.backdrop-list { display:flex; align-items:center; gap:7px; min-width:0; }.asset-list { flex-wrap:wrap; }.asset-list strong,.backdrop-list strong { width:100%; font-size:11px; }.sprite-tile { display:flex; max-width:132px; align-items:center; gap:7px; overflow:hidden; padding:6px; border:2px solid var(--purple); border-radius:5px; background:#e8e4ff; color:var(--ink); font-size:11px; font-weight:800; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }.mini-sprite { display:grid; width:26px; height:26px; flex:0 0 26px; place-items:center; border:1px solid var(--ink); border-radius:47% 53% 44% 56%; color:#fff; font-size:15px; }.backdrop-list { align-content:start; flex-wrap:wrap; max-width:150px; }.backdrop-list button { display:grid; width:27px; height:27px; place-items:center; border:1px solid rgb(61 53 100 / 33%); border-radius:4px; color:var(--ink); cursor:pointer; }.backdrop-list button.selected { outline:2px solid var(--purple); outline-offset:2px; }
.block-editor { position:relative; display:grid; grid-template-columns:54px minmax(0,1fr); grid-template-rows:minmax(0,1fr); min-height:610px; overflow:hidden; border:2px solid var(--ink); border-radius:7px; background:#fbfbff; box-shadow:5px 6px 0 rgb(61 53 100 / 45%); }.block-editor .blockly-host { grid-column:2; grid-row:1; min-width:0; min-height:0; border:0; border-radius:0; box-shadow:none; }.block-category-rail { display:flex; grid-column:1; grid-row:1; z-index:2; width:54px; min-width:0; box-sizing:border-box; flex-direction:column; gap:4px; overflow-y:auto; padding:7px 4px; border-right:1px solid rgb(61 53 100 / 22%); background:#fff; }.block-category-rail button { display:grid; min-height:52px; place-items:center; gap:3px; padding:4px 2px; border:0; border-radius:5px; background:transparent; color:#756a94; cursor:pointer; font:800 11px/1.1 'Microsoft YaHei',sans-serif; }.block-category-rail button:hover,.block-category-rail button.active { background:#f0edff; color:var(--ink); }.block-category-rail i { display:block; width:20px; height:20px; border:1px solid rgb(61 53 100 / 26%); border-radius:50%; background:var(--category-colour); box-shadow:1px 2px 0 rgb(61 53 100 / 20%); }.block-category-rail button.active i { outline:2px solid var(--ink); outline-offset:2px; }.block-category-rail span { display:block; text-align:center; word-break:break-all; }.block-category-rail .extension-rail-button { min-height:48px; margin-top:auto; border:1px dashed var(--purple); background:#f5f2ff; color:var(--purple); }.block-category-rail .extension-rail-button :deep(.el-icon) { font-size:18px; }.variable-manager { position:absolute; z-index:5; top:10px; left:64px; width:196px; box-sizing:border-box; padding:10px; border:1px solid var(--ink); border-radius:6px; background:#fff; box-shadow:3px 4px 0 rgb(61 53 100 / 24%); }.variable-manager-heading { display:grid; gap:8px; }.variable-manager-heading strong { color:var(--ink); font-size:16px; }.variable-manager-heading button { padding:7px 8px; border:1px solid rgb(61 53 100 / 30%); border-radius:4px; background:#fff; color:var(--ink); font:inherit; font-size:12px; cursor:pointer; }.variable-manager-heading button:hover { border-color:var(--purple); background:#f0edff; }.variable-manager-list { display:grid; gap:6px; margin-top:10px; }.variable-manager-row { display:grid; grid-template-columns:18px minmax(0,1fr) auto; align-items:center; gap:6px; min-height:28px; color:var(--ink); font-size:12px; cursor:pointer; }.variable-manager-row input { accent-color:#ef6687; }.variable-manager-row span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }.variable-manager-row b { min-width:26px; padding:2px 5px; border-radius:10px; background:#ef6687; color:#fff; font-size:11px; text-align:center; }.variable-manager-empty { margin:10px 0 0; color:#756a94; font-size:11px; }
.blockly-host :deep(.blocklyFlyoutBackground) { width:350px!important; }.blockly-host :deep(.blocklyFlyout .blocklyText) { font-size:14px!important; font-weight:700; }.blockly-host :deep(.block-workshop-toolbox-label) { fill:var(--ink); font-family:'Microsoft YaHei',sans-serif; font-size:17px!important; font-weight:900; }.blockly-host :deep(.blocklyToolboxDiv) { min-width:118px; }.blockly-host :deep(.blocklyTreeRow) { height:35px; margin:2px 4px; border-radius:5px; }.blockly-host :deep(.blocklyTreeLabel) { font-size:12px; }
.blockly-host :deep(.block-workshop-toolbox-spacer) { fill:transparent; pointer-events:none; }
.plugin-editor { background:linear-gradient(135deg,#fff 0%,#f0edff 62%,#e4faf9 100%); }.plugin-control-card { width:min(960px,100%); margin-top:28px; padding:15px; border:2px solid var(--ink); border-radius:7px; background:#fff; box-shadow:4px 5px 0 rgb(61 53 100 / 24%); }.plugin-control-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }.plugin-control-heading div { display:grid; gap:3px; }.plugin-control-heading span { font-size:17px; font-weight:900; }.plugin-control-heading small { color:#756a94; font-size:11px; font-weight:800; }.plugin-control-heading button { padding:6px 9px; border:1px solid var(--ink); border-radius:4px; background:#fff1a8; color:var(--ink); font:inherit; font-size:12px; font-weight:800; cursor:pointer; }.draw-board-shell { margin-top:13px; }.draw-board-shell canvas { display:block; width:100%; height:auto; border:1px dashed rgb(61 53 100 / 45%); border-radius:4px; background:#fff; touch-action:none; cursor:crosshair; }.draw-board-shell small { display:flex; align-items:center; gap:5px; margin-top:8px; color:#71658f; font-size:12px; }.plugin-closed-state { margin-top:13px; padding:22px 16px; border:1px dashed rgb(61 53 100 / 38%); border-radius:5px; background:#fbfbff; color:#756a94; font-size:13px; font-weight:800; text-align:center; }
.extension-dialog,.project-info-dialog { width:min(620px,100%); padding:25px; border:2px solid var(--ink); border-radius:9px; background:#fbfbff; box-shadow:8px 9px 0 rgb(61 53 100 / 50%); }.extension-option { display:grid; grid-template-columns:52px minmax(0,1fr) auto; align-items:center; gap:14px; margin-top:23px; padding:16px; border:1px solid var(--ink); border-radius:7px; background:#fff; }.extension-option-icon { display:grid; width:48px; height:48px; place-items:center; border:1px solid var(--ink); border-radius:7px; background:#e8e4ff; color:var(--purple); font-size:26px; }.extension-option h3 { margin:0; font-size:17px; }.extension-option p { margin:6px 0 0; color:#625878; font-size:13px; line-height:1.55; }.extension-option button,.project-info-actions button { padding:8px 12px; border:1px solid var(--ink); border-radius:4px; background:#fff; color:var(--ink); font:inherit; font-weight:800; cursor:pointer; }.extension-option button:not(:disabled),.project-info-actions .confirm { border-color:#4e4473; background:var(--purple); color:#fff; }.extension-option button:disabled { cursor:default; opacity:.58; }
.project-info-dialog { display:grid; gap:15px; }.project-info-dialog > label { display:grid; gap:7px; color:#625878; font-size:13px; font-weight:900; }.project-info-dialog label em { margin-left:5px; color:#d45d7d; font-size:11px; font-style:normal; }.project-info-dialog label > small { color:#756a94; font-size:11px; font-weight:700; }.project-info-dialog > label > input,.project-info-dialog > label > textarea { width:100%; box-sizing:border-box; padding:9px 10px; border:1px solid rgb(61 53 100 / 35%); border-radius:5px; background:#fff; color:var(--ink); font:inherit; font-weight:500; }.project-info-dialog > label > textarea { min-height:82px; resize:vertical; line-height:1.5; }.project-info-dialog input:focus,.project-info-dialog textarea:focus { outline:2px solid var(--pink); outline-offset:1px; }.project-tags { display:flex; min-height:42px; flex-wrap:wrap; align-items:center; gap:6px; padding:6px; border:1px solid rgb(61 53 100 / 35%); border-radius:5px; background:#fff; }.project-tags span { display:inline-flex; align-items:center; gap:4px; padding:4px 6px; border-radius:3px; background:#e8e4ff; color:var(--ink); font-size:12px; font-weight:800; }.project-tags button { width:16px; height:16px; padding:0; border:0; border-radius:50%; background:transparent; color:#625878; font-size:15px; line-height:1; cursor:pointer; }.project-tags input { min-width:110px; flex:1; padding:4px; border:0; outline:0; font:inherit; font-size:12px; }.visibility-choice { display:grid; gap:9px; margin:0; padding:12px; border:1px solid rgb(61 53 100 / 28%); border-radius:6px; background:#fff; }.visibility-choice legend { padding:0 4px; color:#625878; font-size:13px; font-weight:900; }.visibility-choice label { display:flex; align-items:center; flex-wrap:wrap; gap:6px; color:var(--ink); font-size:13px; font-weight:900; cursor:pointer; }.visibility-choice input { accent-color:var(--purple); }.visibility-choice small { flex-basis:100%; margin-left:24px; color:#756a94; font-size:11px; font-weight:700; }.project-info-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:3px; }
.stage-scene { touch-action:none; }.default-sprite { cursor:grab; touch-action:none; }.default-sprite:active { cursor:grabbing; }.default-sprite.selected { outline:3px solid var(--yellow); outline-offset:4px; }.sprite-cards { display:flex; width:100%; align-items:center; gap:6px; overflow-x:auto; padding:2px 0; }.sprite-tile { position:relative; flex:0 0 auto; }.sprite-tile:not(.active) { border-color:rgb(61 53 100 / 28%); background:#fff; }.sprite-tile i { position:absolute; top:-7px; right:-7px; display:grid; width:17px; height:17px; place-items:center; border:1px solid var(--ink); border-radius:50%; background:var(--pink); color:#fff; font-size:14px; font-style:normal; line-height:1; }.add-sprite { display:grid; width:34px; height:34px; flex:0 0 34px; place-items:center; border:1px dashed var(--ink); border-radius:5px; background:#fff; color:var(--purple); cursor:pointer; }
.default-sprite.gliding { transition:none; }
.direction-setting { position:relative; display:flex; align-items:center; margin-top:9px; color:#625878; font-size:12px; font-weight:800; }.direction-setting > label { display:flex; align-items:center; gap:8px; }.direction-setting input { width:62px; padding:5px 7px; border:1px solid rgb(61 53 100 / 28%); border-radius:4px; color:var(--ink); font:inherit; text-align:center; }.direction-setting input:focus { outline:2px solid var(--purple); outline-offset:1px; }.direction-picker { position:absolute; z-index:8; bottom:calc(100% + 9px); left:0; width:172px; padding:13px; border:1px solid var(--ink); border-radius:6px; background:#fff; box-shadow:4px 5px 0 rgb(61 53 100 / 25%); }.direction-dial { position:relative; width:138px; height:138px; margin:auto; overflow:hidden; border:1px solid #7eaaf2; border-radius:50%; background:#dceaff; cursor:crosshair; touch-action:none; }.direction-dial::before { position:absolute; top:50%; left:50%; width:7px; height:7px; border-radius:50%; background:#5d9cf4; content:''; transform:translate(-50%,-50%); }.direction-dial i { position:absolute; top:9px; left:50%; width:1px; height:9px; background:#91add4; transform-origin:50% 60px; }.direction-dial-line { position:absolute; bottom:50%; left:calc(50% - 2px); width:4px; height:48%; border-radius:4px 4px 0 0; background:#5d9cf4; transform-origin:50% 100%; }.direction-dial-line::after { position:absolute; top:-7px; left:50%; width:14px; height:14px; border:3px solid #fff; border-radius:50%; background:#5d9cf4; box-shadow:0 0 0 4px rgb(93 156 244 / 22%); content:''; transform:translateX(-50%); }.direction-presets { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-top:11px; }.direction-presets button { padding:5px 0; border:1px solid rgb(61 53 100 / 24%); border-radius:4px; background:#fff; color:#625878; font:inherit; font-size:11px; cursor:pointer; }.direction-presets button:hover { border-color:var(--purple); background:#f0edff; color:var(--ink); }
.task-goal { position:absolute; z-index:2; display:grid; width:39px; height:39px; place-items:center; border:2px solid var(--ink); border-radius:50%; background:var(--yellow); box-shadow:3px 4px 0 rgb(61 53 100 / 24%); color:#d77ba5; font-size:24px; transform:translate(-50%,-50%); }.task-status { position:absolute; z-index:3; bottom:11px; left:11px; padding:5px 8px; border:1px solid var(--ink); border-radius:4px; background:#fff; box-shadow:2px 3px 0 rgb(61 53 100 / 18%); font-size:11px; font-weight:900; }.task-config { display:grid; gap:7px; padding:10px; border:1px solid rgb(61 53 100 / 30%); border-radius:6px; background:#f7f5ff; }.task-config > div { display:flex; align-items:center; justify-content:space-between; gap:10px; }.task-config strong { font-size:13px; }.task-config > div span { color:#756a94; font-size:10px; font-weight:700; }.task-config button { display:flex; align-items:center; justify-content:space-between; padding:7px 8px; border:1px solid rgb(61 53 100 / 20%); border-radius:4px; background:#fff; color:#625878; font-size:11px; font-weight:800; cursor:pointer; }.task-config button.active { border-color:var(--purple); background:#e8e4ff; color:var(--ink); }.task-config button small { color:var(--purple); font-weight:900; }
.maze-board { position:absolute; z-index:2; display:grid; box-sizing:border-box; inset:14px; overflow:hidden; border:2px solid #4e4473; border-radius:5px; background:#fffdf3; box-shadow:inset 0 0 0 1px rgb(255 255 255 / 80%); pointer-events:none; }.maze-cell { position:relative; display:grid; min-width:0; min-height:0; place-items:center; border:1px solid rgb(78 68 115 / 12%); background:#fffdf7; }.maze-cell.wall { background:repeating-linear-gradient(135deg,#776bb4 0 8px,#665a9d 8px 16px); box-shadow:inset 0 0 0 2px rgb(255 255 255 / 20%); }.maze-cell.goal { background:#fff3a8; color:#e76c49; font-size:clamp(18px,3vw,31px); text-shadow:1px 2px 0 #fff; }.maze-player { position:relative; z-index:2; display:grid; width:58%; height:58%; place-items:center; border:2px solid #3d3564; border-radius:50%; background:#62bd86; box-shadow:2px 3px 0 rgb(61 53 100 / 28%); color:#fff; font-size:clamp(15px,2.4vw,27px); line-height:1; transition:transform .18s ease; }.task-status { max-width:calc(100% - 22px); color:#403960; line-height:1.35; }.task-status small { display:block; margin-top:2px; color:#756a94; font-size:10px; font-weight:700; }.task-status.completed { border-color:#3f9b63; background:#ebfff0; color:#237642; }.task-status.failed { border-color:#d85c58; background:#fff1ef; color:#b74a47; }
.maze-board.editing { pointer-events:auto; }.maze-cell { padding:0; appearance:none; cursor:default; }.maze-board.editing .maze-cell { cursor:crosshair; }.maze-cell:disabled { cursor:default; }.maze-cell:focus-visible { z-index:3; outline:3px solid var(--pink); outline-offset:-3px; }.task-config > label { display:flex; align-items:center; justify-content:space-between; gap:8px; color:#625878; font-size:11px; font-weight:800; }.task-config input { min-width:0; width:88px; box-sizing:border-box; padding:5px 6px; border:1px solid rgb(61 53 100 / 28%); border-radius:4px; background:#fff; color:var(--ink); font:inherit; text-align:center; }.task-grid-size { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:5px; }.task-grid-size label { display:grid; gap:3px; color:#756a94; font-size:10px; font-weight:800; }.task-grid-size input { width:100%; }.task-editor-tools { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:5px; }.task-editor-tools button { min-width:0; }.task-editor-tools button:last-child { grid-column:1 / -1; }
.stage-scene.maze-stage { aspect-ratio:4 / 3; background:#f4f1e8; }
.base-dialog-backdrop { position:fixed; z-index:50; display:grid; inset:0; place-items:center; padding:18px; background:rgb(61 53 100 / 25%); }.base-dialog { width:min(860px,100%); padding:25px; border:2px solid var(--ink); border-radius:9px; background:#fbfbff; box-shadow:8px 9px 0 rgb(61 53 100 / 50%); }.base-dialog-heading { display:flex; align-items:start; justify-content:space-between; gap:16px; }.base-dialog-heading h2 { margin:11px 0 0; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:28px; font-weight:900; }.base-dialog-heading > button { display:grid; width:34px; height:34px; place-items:center; border:1px solid var(--ink); border-radius:5px; background:#fff; color:var(--ink); font-size:24px; cursor:pointer; }.base-options { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-top:22px; }.base-option { display:flex; min-height:236px; flex-direction:column; padding:16px; border:2px solid var(--ink); border-radius:7px; background:#fff; box-shadow:4px 5px 0 rgb(61 53 100 / 20%); }.base-option.interactive { background:#e8e4ff; }.base-option.ai { background:#e4faf9; }.base-option > span { align-self:start; padding:4px 6px; border:1px solid var(--ink); border-radius:3px; background:var(--yellow); font-family:'Trebuchet MS',sans-serif; font-size:10px; font-weight:900; transform:rotate(-2deg); }.base-option h3 { margin:15px 0 0; font-family:'Trebuchet MS','Microsoft YaHei',sans-serif; font-size:19px; font-weight:900; }.base-option p { margin:10px 0 0; color:#625878; font-size:13px; line-height:1.65; }.base-option button { margin-top:auto; padding:9px 8px; border:1px solid #4e4473; border-radius:5px; background:var(--purple); box-shadow:2px 3px 0 rgb(61 53 100 / 25%); color:#fff; font-weight:900; white-space:nowrap; cursor:pointer; }
.costume-editor { width:100%; justify-items:stretch; grid-template-rows:auto minmax(0,1fr); }.costume-editor-body { display:grid; width:100%; min-height:0; grid-template-columns:128px minmax(0,1fr); gap:12px; }.costume-list { display:flex; min-height:0; flex-direction:column; gap:8px; overflow-y:auto; padding:8px; border:1px solid rgb(61 53 100 / 24%); border-radius:6px; background:#eef1fb; }.costume-list > button { display:grid; justify-items:center; gap:5px; padding:7px 4px; border:1px solid transparent; border-radius:5px; background:#fff; color:var(--ink); cursor:pointer; }.costume-list > button.active { border-color:#4d8df0; background:#e3efff; box-shadow:inset 0 0 0 1px #77aaf5; }.costume-list strong { max-width:100%; overflow:hidden; font-size:11px; text-overflow:ellipsis; white-space:nowrap; }.costume-list-preview { display:grid; width:82px; height:58px; place-items:center; overflow:hidden; border:1px solid rgb(61 53 100 / 24%); border-radius:5px; color:#fff; font-size:27px; }.costume-list-preview.bot { border-radius:10px; }.costume-list-preview.dot { width:58px; border-radius:50%; }.costume-list-preview.custom { border:0; border-radius:0; background:transparent!important; }.costume-list-preview img { width:100%; height:100%; object-fit:contain; }.costume-list .add-costume { display:grid; width:100%; min-height:43px; margin-top:auto; place-items:center; border:1px dashed var(--purple); background:transparent; color:var(--purple); }.costume-main { display:grid; min-width:0; min-height:0; grid-template-rows:auto minmax(0,1fr) auto; gap:12px; }
.costume-canvas-shell { position:relative; display:grid; min-height:0; padding:0; overflow:hidden; place-items:stretch; }.costume-canvas { width:100%; height:100%; margin:0; }.costume-canvas.eraser-active { cursor:none; }.eraser-range { position:absolute; z-index:2; box-sizing:border-box; border:2px solid #4d8df0; border-radius:50%; background:rgb(255 255 255 / 24%); box-shadow:0 0 0 1px rgb(255 255 255 / 90%),0 1px 4px rgb(61 53 100 / 25%); pointer-events:none; transform:translate(-50%,-50%); }
.block-workshop-page { display:flex; height:100dvh; min-height:0; flex-direction:column; overflow:hidden; }.workshop-header { flex:0 0 66px; box-sizing:border-box; }.workshop-layout { height:auto; min-height:0; flex:1; overflow:hidden; }.workspace-panel { min-height:0; overflow:hidden; }.block-editor,.blockly-host,.asset-editor { height:100%; min-height:0; box-sizing:border-box; }.stage-panel { grid-template-rows:auto auto auto auto auto; align-content:start; min-height:0; overflow:hidden; box-sizing:border-box; padding:10px; gap:8px; }.stage-scene { width:100%; min-height:0; aspect-ratio:16 / 9; height:auto; align-self:start; }.sprite-inspector { display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1fr); gap:6px 9px; padding:8px; }.inspector-heading,.sprite-name { grid-column:1 / -1; }.sprite-name,.sprite-fields,.direction-setting,.sprite-visibility { margin-top:0; }.sprite-fields { align-self:start; }.sprite-visibility { align-self:end; }.asset-tray { gap:8px; padding:8px; }.asset-list,.backdrop-list { gap:5px; }.sprite-tile { padding:4px; }.backdrop-list button { width:24px; height:24px; }.upload-backdrop { border-style:dashed!important; background:#fff!important; color:var(--purple); }.backdrop-upload-input { display:none; }
@media (max-width:1120px) { .workshop-layout { grid-template-columns:1fr; }.stage-panel { grid-template-columns:minmax(0,1fr) minmax(230px,.8fr); align-items:start; border-top:1px solid rgb(61 53 100 / 30%); border-left:0; }.stage-toolbar { grid-column:1 / -1; }.stage-scene { height:260px; }.runner-actions,.sketch-panel,.description-field { grid-column:2; }.runner-actions { grid-row:2; }.sketch-panel { grid-row:3; }.description-field { grid-row:4; } }
@media (max-width:720px) { .workshop-header { height:auto; min-height:65px; flex-wrap:wrap; padding:11px 14px; }.project-title { flex:1; }.project-title input { width:100%; font-size:17px; }.header-actions { width:100%; margin-left:0; }.header-actions :deep(.el-button) { flex:1; margin-left:0!important; padding:8px 7px; }.workshop-layout { display:flex; min-height:0; flex-direction:column; }.workspace-panel { min-height:544px; padding:10px; }.workbench-tabs { padding-left:0; }.workbench-tabs button { flex:1; min-width:0; padding:10px 7px; }.block-editor { min-height:480px; }.blockly-host,.asset-editor { min-height:480px; }.asset-editor { padding:30px; }.stage-panel { display:grid; grid-template-columns:1fr; }.stage-toolbar,.stage-scene,.runner-actions,.sketch-panel,.description-field { grid-column:auto; grid-row:auto; }.stage-scene { height:240px; } }
@media (max-width:720px) { .costume-editor { min-height:480px; padding:12px; }.costume-editor-heading input { width:96px; }.costume-editor-body { grid-template-columns:88px minmax(0,1fr); gap:8px; }.costume-list { padding:5px; }.costume-list-preview { width:65px; height:47px; }.costume-list-preview.dot { width:47px; }.costume-commandbar { flex-wrap:wrap; gap:7px; }.costume-commandbar input[type='range'] { width:76px; }.costume-command-spacer { display:none; }.costume-workspace { grid-template-columns:42px minmax(0,1fr); }.costume-palette { display:none; }.costume-tools { padding:8px 5px; }.costume-footer { gap:8px; flex-direction:column; } }
.stage-tile { width:58px!important; height:58px!important; background-size:cover!important; background-position:center!important; }.stage-inspector-summary { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:8px; margin-top:10px; color:#756a94; font-size:12px; font-weight:800; }.stage-inspector-summary strong { overflow:hidden; color:var(--ink); text-overflow:ellipsis; white-space:nowrap; }.stage-inspector-summary button { padding:6px 8px; border:1px solid var(--ink); border-radius:4px; background:var(--yellow); color:var(--ink); font:inherit; font-size:11px; font-weight:800; cursor:pointer; }.blockly-host :deep(.block-workshop-toolbox-notice) { fill:#756a94; font-family:'Microsoft YaHei',sans-serif; font-size:12px!important; font-weight:700; }
.upload-costume-image { margin-top:5px; color:var(--purple)!important; }
.costume-palette > .upload-costume-image { width:31px; height:31px; border:1px solid rgb(61 53 100 / 26%); border-radius:4px; box-shadow:none; }
.upload-costume-image:hover { border-color:var(--purple)!important; background:#f0edff!important; }
.default-sprite.custom,
.mini-sprite.custom { background:transparent!important; background-image:none!important; }
.default-sprite.custom.selected { outline:none; outline-offset:0; }
.stage-backdrop-image { position:absolute; z-index:0; max-width:none; height:auto; object-fit:contain; pointer-events:none; transform-origin:center; }
.stage-stars,.speech-bubble,.variable-monitor,.task-goal,.task-status,.default-sprite { z-index:2; }
.backdrop-fields,.backdrop-direction { grid-column:1 / -1; }
.backdrop-upload-input { display:none; }
:global(.variable-create-message-box) { width:min(420px,calc(100vw - 32px)); border:2px solid #403960; border-radius:9px; background:#f9f8fc; box-shadow:8px 9px 0 rgb(64 57 96 / 28%); }
:global(.variable-create-message-box .el-message-box__title) { color:#403960; font-size:18px; font-weight:900; }
:global(.variable-create-message-box .el-message-box__message) { color:#625878; font-size:13px; font-weight:700; }
:global(.variable-create-message-box .el-input__wrapper) { background:#fff; box-shadow:0 0 0 1px rgb(64 57 96 / 30%) inset; }
:global(.variable-create-message-box .el-input__wrapper.is-focus) { box-shadow:0 0 0 2px #776bb4 inset; }
:global(.variable-create-message-box .el-button--primary) { border-color:#776bb4; background:#776bb4; }
:global(.variable-create-message-box .el-button--default) { border-color:rgb(64 57 96 / 32%); color:#403960; }
.blockly-host :deep(.variable-visibility-control) { cursor:pointer; outline:none; }
.blockly-host :deep(.variable-visibility-control rect) { fill:#fff; stroke:#4d90f7; stroke-width:2; filter:drop-shadow(1px 1px 0 rgb(64 57 96 / 22%)); }
.blockly-host :deep(.variable-visibility-control path) { display:none; }
.blockly-host :deep(.variable-visibility-control.checked rect) { fill:#4d90f7; }
.blockly-host :deep(.variable-visibility-control.checked path) { display:block; }
.blockly-host :deep(.variable-visibility-control:hover rect),.blockly-host :deep(.variable-visibility-control:focus rect) { stroke:#403960; stroke-width:3; }
.variable-monitors { position:absolute; inset:0; pointer-events:none; }
.variable-monitor { position:absolute; display:inline-flex; align-items:center; justify-content:space-between; gap:12px; max-width:calc(100% - 20px); padding:6px 12px; border:1px solid #e56f0a; border-radius:18px; background:#ff8a18; cursor:grab; font-size:12px; pointer-events:auto; touch-action:none; user-select:none; }
.variable-monitor:active { cursor:grabbing; }
.variable-monitor b { float:none; margin:0; color:#fff; font-weight:900; }
.data-monitors { position:absolute; z-index:4; overflow:hidden; pointer-events:none; inset:0; }
.list-monitors { position:absolute; pointer-events:none; inset:0; }
.list-monitor { position:absolute; width:132px; overflow:hidden; border:1px solid #e56f0a; border-radius:5px; background:#fff; box-shadow:2px 3px 0 rgb(64 57 96 / 22%); color:var(--ink); cursor:grab; font-size:11px; pointer-events:auto; touch-action:none; user-select:none; }
.list-monitor:active { cursor:grabbing; }
.list-monitor header { padding:6px 8px; background:#ff8a18; color:#fff; font-weight:900; text-align:center; }
.list-monitor ol { max-height:116px; margin:0; overflow:auto; padding:4px 5px; list-style:none; }
.list-monitor li { display:grid; min-height:22px; grid-template-columns:19px minmax(0,1fr); align-items:center; gap:4px; }
.list-monitor li span { color:#756a94; text-align:center; }
.list-monitor-entry { display:flex; min-width:0; overflow:hidden; border-radius:3px; background:#ff8a18; }
.list-monitor-entry input { width:0; min-width:0; flex:1; padding:3px 5px; border:0; outline:0; background:transparent; color:#fff; font:inherit; font-weight:800; }
.list-monitor-entry input::selection { background:#fff; color:#e56f0a; }
.list-monitor-entry button { width:20px; flex:0 0 20px; padding:0; border:0; background:transparent; color:#fff; cursor:pointer; font-size:16px; font-weight:900; line-height:1; opacity:0; }
.list-monitor-entry:hover button,.list-monitor-entry:focus-within button { opacity:1; }
.list-monitor p { margin:0; padding:12px 8px; color:#756a94; text-align:center; }
.list-monitor footer { display:flex; min-height:27px; align-items:center; justify-content:space-between; gap:8px; padding:3px 6px; border-top:1px solid rgb(229 111 10 / 35%); background:#fff7ef; color:#756a94; font-weight:800; }
.list-monitor footer > button { display:grid; width:21px; height:21px; padding:0; place-items:center; border:1px solid rgb(229 111 10 / 45%); border-radius:3px; background:#fff; color:#e56f0a; cursor:pointer; font-size:18px; font-weight:900; line-height:1; }
.list-monitor footer > button:hover,.list-monitor footer > button:focus-visible { border-color:#e56f0a; background:#ff8a18; color:#fff; outline:none; }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; } }
</style>
