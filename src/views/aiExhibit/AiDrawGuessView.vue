<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Back, Delete } from '@element-plus/icons-vue'
import { guessAiDraw } from '@/api/aiExhibit'

const router = useRouter()
const canvasRef = ref(null)
const canvasWrapRef = ref(null)
const drawing = ref(false)
const lastPoint = ref(null)
const guesses = ref([])
const hasInk = ref(false)
const isAnalyzing = ref(false)
const resultSource = ref('')

let analysisTimer = null
let requestSeq = 0
// 停笔1.2秒后调用api
const ANALYZE_IDLE_DELAY = 1200

const resultText = computed(() => {
  if (!hasInk.value) {
    return '识别结果：请先在画布上画一画'
  }

  if (isAnalyzing.value) {
    return '识别结果：AI 正在观察你的画面...'
  }

  if (!guesses.value.length) {
    return '识别结果：暂时还没有猜出来'
  }

  const suffix = resultSource.value ? `（${resultSource.value}）` : ''
  return `识别结果：${guesses.value.map((item) => `${item.label} ${item.score}%`).join('，')}${suffix}`
})

function goBack() {
  router.push('/main/ai-exhibit')
}

function resizeCanvas() {
  const canvas = canvasRef.value
  const wrap = canvasWrapRef.value
  if (!canvas || !wrap) return

  const previousImage = hasInk.value && canvas.width > 0 && canvas.height > 0 ? canvas.toDataURL('image/png') : null
  const rect = wrap.getBoundingClientRect()
  const ratio = window.devicePixelRatio || 1
  canvas.width = Math.max(320, Math.floor(rect.width * ratio))
  canvas.height = Math.max(320, Math.floor(rect.height * ratio))
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  const ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 7
  ctx.strokeStyle = '#111111'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, rect.width, rect.height)

  if (previousImage) {
    const image = new Image()
    image.onload = () => {
      ctx.drawImage(image, 0, 0, rect.width, rect.height)
    }
    image.src = previousImage
  }
}

function getCanvasPoint(event) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function exportCanvasImage() {
  const canvas = canvasRef.value
  if (!canvas) return ''
  const bounds = getInkBounds(canvas, 3)
  if (!bounds) {
    return canvas.toDataURL('image/png')
  }

  const padding = 48
  const sourceX = Math.max(0, bounds.minX - padding)
  const sourceY = Math.max(0, bounds.minY - padding)
  const sourceWidth = Math.min(canvas.width - sourceX, bounds.maxX - bounds.minX + padding * 2)
  const sourceHeight = Math.min(canvas.height - sourceY, bounds.maxY - bounds.minY + padding * 2)
  const maxSide = 768
  const scale = Math.min(1, maxSide / Math.max(sourceWidth, sourceHeight))
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale))
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale))
  const output = document.createElement('canvas')
  output.width = targetWidth
  output.height = targetHeight

  const ctx = output.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, targetWidth, targetHeight)
  ctx.drawImage(canvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight)

  return output.toDataURL('image/png')
}

function getInkBounds(canvas, step = 4) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let inkPixels = 0

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4
      const r = imageData.data[index]
      const g = imageData.data[index + 1]
      const b = imageData.data[index + 2]
      if (r < 220 || g < 220 || b < 220) {
        inkPixels += 1
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
  }

  if (!inkPixels) {
    return null
  }

  return { minX, minY, maxX, maxY }
}

function analyzeCanvasLocally() {
  const canvas = canvasRef.value
  if (!canvas) return { coverage: 0, aspect: 1, widthRatio: 0, heightRatio: 0 }

  const width = canvas.width
  const height = canvas.height
  const bounds = getInkBounds(canvas)

  if (!bounds) {
    return { coverage: 0, aspect: 1, widthRatio: 0, heightRatio: 0 }
  }

  const boxWidth = bounds.maxX - bounds.minX + 1
  const boxHeight = bounds.maxY - bounds.minY + 1
  return {
    coverage: (boxWidth * boxHeight) / (width * height),
    aspect: boxWidth / Math.max(boxHeight, 1),
    widthRatio: boxWidth / width,
    heightRatio: boxHeight / height,
  }
}

function calculateConfidence(features) {
  let confidence = 45
  if (features.coverage > 0.006) confidence += 10
  if (features.coverage > 0.014) confidence += 10
  if (features.widthRatio > 0.18) confidence += 8
  if (features.heightRatio > 0.18) confidence += 6

  return Math.min(92, confidence)
}

function buildLocalGuesses() {
  const features = analyzeCanvasLocally()
  if (!features.coverage) {
    guesses.value = []
    resultSource.value = ''
    return
  }

  const confidence = calculateConfidence(features)
  const labels = ['物体', '图形', '动物', '工具', '人物']
  guesses.value = labels.map((label, index) => {
    const drop = [0, 14, 29, 38, 46][index] ?? index * 10
    return {
      label,
      score: Math.max(2, confidence - drop),
    }
  })
  resultSource.value = '本地兜底'
}

function scheduleRemoteAnalysis(delay = 650) {
  if (analysisTimer) {
    window.clearTimeout(analysisTimer)
  }

  analysisTimer = window.setTimeout(() => {
    void requestRemoteGuesses()
  }, delay)
}

async function requestRemoteGuesses() {
  if (!hasInk.value) {
    return
  }

  const imageDataUrl = exportCanvasImage()
  const seq = ++requestSeq
  isAnalyzing.value = true

  try {
    const response = await guessAiDraw({
      imageDataUrl,
    })

    if (seq !== requestSeq) return

    const predictions = Array.isArray(response?.predictions) ? response.predictions : []
    if (predictions.length > 0) {
      guesses.value = predictions.map((item) => ({
        label: item.label,
        score: Number.isFinite(Number(item.score)) ? Number(item.score) : 0,
      }))
      resultSource.value = response?.model ? `真实 API：${response.model}` : '真实 API'
      return
    }

    buildLocalGuesses()
  } catch (error) {
    if (seq !== requestSeq) return
    buildLocalGuesses()
    console.warn('AI draw guess failed:', error)
  } finally {
    if (seq === requestSeq) {
      isAnalyzing.value = false
    }
  }
}

function startDrawing(event) {
  event.preventDefault()
  drawing.value = true
  hasInk.value = true
  const point = getCanvasPoint(event)
  lastPoint.value = point

  const ctx = canvasRef.value.getContext('2d')
  ctx.beginPath()
  ctx.arc(point.x, point.y, 3.5, 0, Math.PI * 2)
  ctx.fillStyle = '#111111'
  ctx.fill()

  buildLocalGuesses()
  if (analysisTimer) {
    window.clearTimeout(analysisTimer)
    analysisTimer = null
  }
}

function draw(event) {
  if (!drawing.value || !lastPoint.value) return
  event.preventDefault()
  const point = getCanvasPoint(event)
  const ctx = canvasRef.value.getContext('2d')

  ctx.beginPath()
  ctx.moveTo(lastPoint.value.x, lastPoint.value.y)
  ctx.lineTo(point.x, point.y)
  ctx.stroke()

  lastPoint.value = point
  buildLocalGuesses()
}

function endDrawing() {
  if (!drawing.value) return
  drawing.value = false
  lastPoint.value = null
  buildLocalGuesses()
  scheduleRemoteAnalysis(ANALYZE_IDLE_DELAY)
}

function clearCanvas() {
  if (analysisTimer) {
    window.clearTimeout(analysisTimer)
    analysisTimer = null
  }

  requestSeq += 1
  const canvas = canvasRef.value
  if (!canvas) return

  const rect = canvas.getBoundingClientRect()
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, rect.width, rect.height)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, rect.width, rect.height)

  guesses.value = []
  hasInk.value = false
  isAnalyzing.value = false
  resultSource.value = ''
}

function bindCanvasEvents() {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.addEventListener('pointerdown', startDrawing)
  canvas.addEventListener('pointermove', draw)
  canvas.addEventListener('pointerup', endDrawing)
  canvas.addEventListener('pointerleave', endDrawing)
  canvas.addEventListener('pointercancel', endDrawing)
}

function unbindCanvasEvents() {
  const canvas = canvasRef.value
  if (!canvas) return

  canvas.removeEventListener('pointerdown', startDrawing)
  canvas.removeEventListener('pointermove', draw)
  canvas.removeEventListener('pointerup', endDrawing)
  canvas.removeEventListener('pointerleave', endDrawing)
  canvas.removeEventListener('pointercancel', endDrawing)
}

onMounted(async () => {
  await nextTick()
  resizeCanvas()
  bindCanvasEvents()
  window.addEventListener('resize', resizeCanvas)
})

onBeforeUnmount(() => {
  unbindCanvasEvents()
  window.removeEventListener('resize', resizeCanvas)
  if (analysisTimer) {
    window.clearTimeout(analysisTimer)
  }
})
</script>

<template>
  <div class="draw-guess-page">
    <button class="back-button" type="button" @click="goBack">
      <Back :size="26" />
    </button>

    <section class="draw-shell">
      <header class="prompt-bar">
        <div class="prompt-title">你画我猜</div>
        <div class="prompt-actions">
          <button type="button" @click="clearCanvas">
            <Delete :size="18" />
            清空画布
          </button>
        </div>
      </header>

      <main ref="canvasWrapRef" class="canvas-wrap">
        <canvas ref="canvasRef" class="draw-canvas" />
      </main>

      <footer class="result-bar">
        {{ resultText }}
      </footer>
    </section>
  </div>
</template>

<style scoped>
.draw-guess-page {
  position: relative;
  box-sizing: border-box;
  height: calc(100vh - 64px);
  overflow: hidden;
  padding: 20px 24px 20px 96px;
  background: #ffffff;
}

.back-button {
  position: absolute;
  top: 48px;
  left: 28px;
  display: grid;
  width: 50px;
  height: 50px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #ede9ff;
  color: #5a4bd6;
  cursor: pointer;
}

.draw-shell {
  display: grid;
  grid-template-rows: 60px minmax(0, 1fr) 86px;
  height: 100%;
  min-height: 0;
  border-radius: 4px;
  background: #ffffff;
}

.prompt-bar,
.result-bar {
  display: flex;
  align-items: center;
  background: #ebe6f8;
  color: #565065;
  box-shadow: 0 3px 5px rgb(17 24 39 / 18%);
}

.prompt-bar {
  justify-content: space-between;
  gap: 16px;
  padding: 0 22px;
}

.prompt-title {
  min-width: 0;
  flex: 1;
  font-size: 24px;
  font-weight: 700;
}

.prompt-actions {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 14px;
  white-space: nowrap;
}

.prompt-actions button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: #5b4ad1;
  font-size: 16px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}

.canvas-wrap {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: #ffffff;
  touch-action: none;
}

.draw-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  touch-action: none;
}

.result-bar {
  padding: 0 22px;
  box-shadow: none;
  color: #585266;
  font-size: 24px;
  line-height: 1.5;
}

@media (max-width: 900px) {
  .draw-guess-page {
    height: calc(100vh - 64px);
    padding: 16px 14px 16px;
  }

  .back-button {
    top: 16px;
    left: 16px;
  }

  .draw-shell {
    grid-template-rows: auto minmax(0, 1fr) auto;
  }

  .prompt-bar {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px;
  }

  .prompt-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .prompt-title,
  .result-bar {
    font-size: 18px;
  }

  .result-bar {
    min-height: 76px;
    padding: 12px 16px;
  }
}
</style>
