<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Back, RefreshRight, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { DrawingUtils, FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { clearAiFaceSession, compareAiFace, registerAiFace } from '@/api/aiFace'

const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const FACE_MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

const router = useRouter()
const previewWrapRef = ref(null)
const videoRef = ref(null)
const overlayRef = ref(null)

const loading = ref(false)
const registering = ref(false)
const comparing = ref(false)
const cameraReady = ref(false)
const meshReady = ref(false)
const profile = ref(null)
const compareResult = ref(null)
const detectionState = ref('正在准备摄像头...')
const latestFaceBounds = ref(null)

let mediaStream = null
let animationFrameId = 0
let faceLandmarker = null
let drawingUtils = null
let lastVideoTime = -1

const supportText = computed(() => {
  if (meshReady.value) {
    return 'MediaPipe 人脸网格已启用'
  }
  return '正在加载人脸关键点模型'
})

function goBack() {
  router.push('/main/ai-exhibit')
}

async function initPage() {
  loading.value = true
  try {
    await clearFaceSession()
    profile.value = null
    compareResult.value = null
    latestFaceBounds.value = null
    await startCamera()
    await initFaceMesh()
    renderLoop()
  } catch (error) {
    ElMessage.error(error?.message || '人脸模块启动失败')
    drawIdleOverlay()
  } finally {
    loading.value = false
  }
}

async function clearFaceSession() {
  try {
    await clearAiFaceSession()
  } catch (error) {
    console.warn(error)
  }
}

async function startCamera() {
  const video = videoRef.value
  if (!video || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前浏览器不支持摄像头调用')
  }

  stopCamera()
  mediaStream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  })

  video.srcObject = mediaStream
  await new Promise((resolve) => {
    if (video.readyState >= 1) {
      resolve()
      return
    }
    video.addEventListener('loadedmetadata', resolve, { once: true })
  })
  await video.play()
  await nextTick()

  cameraReady.value = true
  detectionState.value = '摄像头已开启，正在加载人脸网格'
  resizeOverlay()
}

async function initFaceMesh() {
  if (faceLandmarker) {
    meshReady.value = true
    return
  }

  const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL)
  faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: FACE_MODEL_URL,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numFaces: 1,
    minFaceDetectionConfidence: 0.45,
    minFacePresenceConfidence: 0.45,
    minTrackingConfidence: 0.45,
  })

  const ctx = overlayRef.value?.getContext('2d')
  if (ctx) {
    drawingUtils = new DrawingUtils(ctx)
  }
  meshReady.value = true
  detectionState.value = '请把脸对准摄像头'
}

function renderLoop() {
  animationFrameId = window.requestAnimationFrame(renderLoop)
  const video = videoRef.value
  const overlay = overlayRef.value
  if (!cameraReady.value || !meshReady.value || !faceLandmarker || !video || !overlay || video.readyState < 2) {
    return
  }

  if (video.currentTime === lastVideoTime) {
    return
  }
  lastVideoTime = video.currentTime
  resizeOverlay()

  const result = faceLandmarker.detectForVideo(video, performance.now())
  drawLandmarks(result?.faceLandmarks || [])
}

function resizeOverlay() {
  const overlay = overlayRef.value
  const wrap = previewWrapRef.value
  if (!overlay || !wrap) return

  const rect = wrap.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const width = Math.max(1, Math.round(rect.width * dpr))
  const height = Math.max(1, Math.round(rect.height * dpr))
  if (overlay.width !== width || overlay.height !== height) {
    overlay.width = width
    overlay.height = height
    overlay.style.width = `${rect.width}px`
    overlay.style.height = `${rect.height}px`
    const ctx = overlay.getContext('2d')
    drawingUtils = ctx ? new DrawingUtils(ctx) : null
  }
}

function drawLandmarks(faceLandmarks) {
  const overlay = overlayRef.value
  const ctx = overlay?.getContext('2d')
  if (!overlay || !ctx) return

  ctx.clearRect(0, 0, overlay.width, overlay.height)
  drawBackdrop(ctx, overlay.width, overlay.height)

  if (!faceLandmarks.length) {
    latestFaceBounds.value = null
    detectionState.value = '请把脸对准摄像头'
    drawIdleOverlay()
    return
  }

  detectionState.value = '已检测到人脸图谱'
  latestFaceBounds.value = normalizedLandmarkBounds(faceLandmarks[0])
  const style = { color: 'rgba(42, 239, 220, 0.72)', lineWidth: Math.max(1, overlay.width / 760) }
  drawingUtils?.drawConnectors(faceLandmarks[0], FaceLandmarker.FACE_LANDMARKS_TESSELATION, style)
  drawingUtils?.drawConnectors(faceLandmarks[0], FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: 'rgba(42, 239, 220, 0.95)', lineWidth: Math.max(2, overlay.width / 520) })
  drawingUtils?.drawConnectors(faceLandmarks[0], FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: 'rgba(42, 239, 220, 0.95)', lineWidth: Math.max(2, overlay.width / 600) })
  drawingUtils?.drawConnectors(faceLandmarks[0], FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: 'rgba(42, 239, 220, 0.95)', lineWidth: Math.max(2, overlay.width / 600) })
  drawingUtils?.drawConnectors(faceLandmarks[0], FaceLandmarker.FACE_LANDMARKS_LIPS, { color: 'rgba(42, 239, 220, 0.9)', lineWidth: Math.max(2, overlay.width / 640) })
}

function drawBackdrop(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)')
  gradient.addColorStop(1, 'rgba(81, 70, 200, 0.05)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function drawIdleOverlay() {
  const overlay = overlayRef.value
  const ctx = overlay?.getContext('2d')
  if (!overlay || !ctx) return

  const cx = overlay.width * 0.5
  const cy = overlay.height * 0.5
  const rx = Math.min(overlay.width, overlay.height) * 0.18
  const ry = Math.min(overlay.width, overlay.height) * 0.24

  ctx.save()
  ctx.strokeStyle = 'rgba(55, 218, 210, 0.48)'
  ctx.lineWidth = Math.max(2, Math.round(overlay.width / 360))
  ctx.setLineDash([12, 10])
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function normalizedLandmarkBounds(landmarks) {
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  landmarks.forEach((point) => {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  })
  return { minX, minY, maxX, maxY }
}

function cropFromVideo(focusBounds = null) {
  const video = videoRef.value
  if (!video || video.readyState < 2) {
    throw new Error('摄像头画面尚未就绪')
  }

  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  let sx = 0
  let sy = 0
  let sw = sourceWidth
  let sh = sourceHeight
  if (focusBounds) {
    const paddingX = (focusBounds.maxX - focusBounds.minX) * 0.32
    const paddingY = (focusBounds.maxY - focusBounds.minY) * 0.36
    sx = Math.max(0, Math.floor((focusBounds.minX - paddingX) * sourceWidth))
    sy = Math.max(0, Math.floor((focusBounds.minY - paddingY) * sourceHeight))
    sw = Math.min(sourceWidth - sx, Math.ceil((focusBounds.maxX - focusBounds.minX + paddingX * 2) * sourceWidth))
    sh = Math.min(sourceHeight - sy, Math.ceil((focusBounds.maxY - focusBounds.minY + paddingY * 2) * sourceHeight))
  }

  const targetWidth = 960
  const targetHeight = Math.max(1, Math.round((sh / Math.max(sw, 1)) * targetWidth))
  canvas.width = targetWidth
  canvas.height = targetHeight
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, targetWidth, targetHeight)
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('截图失败'))
        return
      }
      resolve(new File([blob], `face-${Date.now()}.jpg`, { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.92)
  })
}

async function registerFace() {
  registering.value = true
  try {
    const file = await cropFromVideo(latestFaceBounds.value)
    const response = await registerAiFace(file)
    profile.value = response?.profile || null
    detectionState.value = response?.message || '人脸录入成功'
    ElMessage.success(response?.message || '人脸录入成功')
  } catch (error) {
    ElMessage.error(error?.message || '人脸录入失败')
  } finally {
    registering.value = false
  }
}

async function compareFaceAction() {
  if (!profile.value?.registered) {
    ElMessage.warning('请先录入人脸')
    return
  }
  comparing.value = true
  try {
    const file = await cropFromVideo(latestFaceBounds.value)
    const response = await compareAiFace(file)
    compareResult.value = response || null
    profile.value = response?.profile || profile.value
    detectionState.value = response?.message || '比对完成'
    ElMessage.success(response?.message || '比对完成')
  } catch (error) {
    ElMessage.error(error?.message || '人脸比对失败')
  } finally {
    comparing.value = false
  }
}

function clearHistoryView() {
  compareResult.value = null
}

function stopCamera() {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId)
    animationFrameId = 0
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop())
    mediaStream = null
  }
  const video = videoRef.value
  if (video) {
    video.srcObject = null
  }
  cameraReady.value = false
}

onMounted(async () => {
  await initPage()
  window.addEventListener('resize', resizeOverlay)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeOverlay)
  clearFaceSession()
  stopCamera()
  faceLandmarker?.close?.()
})
</script>

<template>
  <div class="face-page">
    <button class="back-button" type="button" @click="goBack">
      <Back :size="24" />
    </button>

    <div class="face-layout">
      <section class="preview-panel">
        <div ref="previewWrapRef" class="preview-shell">
          <video ref="videoRef" class="camera-video" autoplay playsinline muted />
          <canvas ref="overlayRef" class="overlay-canvas" />
          <div class="preview-state">
            <span class="state-dot" :class="{ active: cameraReady }"></span>
            <span>{{ detectionState }}</span>
          </div>
        </div>
        <div class="preview-caption">
          <span>实时画面</span>
          <span>{{ supportText }}</span>
        </div>
      </section>

      <aside class="control-panel">
        <div class="control-card">
          <div class="control-head">
            <div>
              <h2>人脸识别体验</h2>
              <p>录入一张脸，再用当前画面做实时比对。</p>
            </div>
            <button class="reset-button" type="button" @click="clearHistoryView">
              <RefreshRight :size="18" />
              清空结果
            </button>
          </div>

          <div class="action-row">
            <el-button type="primary" :loading="registering" @click="registerFace">录入人脸</el-button>
            <el-button type="success" :disabled="!profile?.registered" :loading="comparing" @click="compareFaceAction">比对人脸</el-button>
          </div>

          <div class="status-grid">
            <div class="status-item">
              <span class="label">录入状态</span>
              <strong>{{ profile?.registered ? '已录入' : '未录入' }}</strong>
            </div>
            <div class="status-item">
              <span class="label">当前阈值</span>
              <strong>80 分</strong>
            </div>
            <div class="status-item">
              <span class="label">匹配方式</span>
              <strong>腾讯云 CompareFace</strong>
            </div>
            <div class="status-item">
              <span class="label">实时图谱</span>
              <strong>{{ meshReady ? '已启用' : '加载中' }}</strong>
            </div>
          </div>
        </div>

        <div class="result-card" v-if="compareResult">
          <div class="result-banner" :class="{ success: compareResult.matched, danger: !compareResult.matched }">
            <WarningFilled v-if="!compareResult.matched" :size="18" />
            <span>{{ compareResult.message }}</span>
          </div>
          <div class="score-row">
            <div>
              <span class="label">相似度</span>
              <strong>{{ Number(compareResult.score || 0).toFixed(2) }}</strong>
            </div>
            <div>
              <span class="label">阈值</span>
              <strong>{{ Number(compareResult.threshold || 0).toFixed(2) }}</strong>
            </div>
          </div>
          <div class="profile-info">
            <span class="label">已录入对象</span>
            <strong>{{ compareResult.profile?.userName || profile?.userName || '未录入' }}</strong>
          </div>
        </div>

        <div class="session-card">
          <h3>体验说明</h3>
          <p>本模块只保留当前页面的人脸体验数据，不保存图片和比对记录。离开或重新进入页面后，需要重新录入人脸再进行比对。</p>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.face-page {
  position: relative;
  box-sizing: border-box;
  height: calc(100vh - 64px);
  overflow: hidden;
  padding: 20px 24px 20px 96px;
  background: linear-gradient(180deg, #f6f9ff 0%, #ffffff 100%);
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

.face-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 372px;
  gap: 22px;
  height: 100%;
}

.preview-panel,
.control-panel {
  min-width: 0;
}

.preview-panel {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 12px;
}

.preview-shell {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  background: #0b1020;
  box-shadow: 0 20px 50px rgba(75, 86, 138, 0.12);
}

.camera-video,
.overlay-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transform: scaleX(-1);
  transform-origin: center center;
}

.overlay-canvas {
  pointer-events: none;
}

.preview-state {
  position: absolute;
  left: 20px;
  bottom: 20px;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(15, 22, 46, 0.52);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  backdrop-filter: blur(12px);
}

.state-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #e9a116;
}

.state-dot.active {
  background: #3be08b;
}

.preview-caption {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #667085;
  font-size: 14px;
  line-height: 1.5;
}

.control-panel {
  display: grid;
  align-content: start;
  gap: 16px;
  padding-top: 4px;
}

.control-card,
.result-card,
.session-card {
  padding: 18px;
  border: 1px solid #e8ebf7;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 8px 26px rgba(88, 96, 145, 0.08);
}

.control-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.control-head h2,
.session-card h3 {
  margin: 0;
  font-size: 18px;
  color: #202335;
}

.control-head p,
.session-card p {
  margin: 6px 0 0;
  color: #6b7280;
  line-height: 1.5;
}

.reset-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  background: transparent;
  color: #5a4bd6;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.action-row {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.action-row :deep(.el-button) {
  flex: 1;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.status-item,
.profile-info {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  background: #f8f7ff;
}

.label {
  color: #7b7f90;
  font-size: 12px;
}

.status-item strong,
.profile-info strong {
  color: #222539;
  font-size: 14px;
}

.result-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  color: #fff;
  font-size: 14px;
  line-height: 1.5;
}

.result-banner.success {
  background: linear-gradient(135deg, #18b96b 0%, #0f8a54 100%);
}

.result-banner.danger {
  background: linear-gradient(135deg, #ff7a59 0%, #f34d4d 100%);
}

.score-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.score-row > div {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 14px;
  background: #f5f7ff;
}

.score-row strong {
  color: #202335;
  font-size: 18px;
}

.history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.history-head span {
  color: #7b7f90;
  font-size: 13px;
}

.history-list {
  display: grid;
  gap: 10px;
}

.history-item {
  padding: 12px;
  border-radius: 14px;
  background: #f8f9ff;
}

.history-main,
.history-sub {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.history-main strong {
  color: #1f2937;
}

.history-main span {
  color: #5845d5;
  font-weight: 700;
}

.history-sub {
  margin-top: 6px;
  color: #778099;
  font-size: 12px;
}

.history-empty {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 120px;
  color: #6b7280;
}

@media (max-width: 1180px) {
  .face-page {
    overflow: auto;
    height: auto;
    min-height: calc(100vh - 64px);
  }

  .face-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .face-page {
    padding: 16px;
  }

  .back-button {
    top: 16px;
    left: 16px;
  }

  .status-grid,
  .score-row {
    grid-template-columns: 1fr;
  }

  .action-row {
    flex-direction: column;
  }
}
/* Camera studio - unified AI exploration visual system */
.face-page {
  --ink: #3d3564;
  --purple: #8178cf;
  --pink: #ee91bb;
  --mint: #9de4eb;
  --yellow: #fff1a8;
  height: calc(100vh - 64px);
  padding: 24px clamp(18px, 4vw, 56px) 30px;
  overflow: hidden;
  background-color: #fbfbff;
  background-image: linear-gradient(90deg, rgb(129 120 207 / 5%) 1px, transparent 1px), linear-gradient(rgb(238 145 187 / 5%) 1px, transparent 1px);
  background-size: 32px 32px;
}
.face-page::before { position: absolute; top: -185px; right: 16%; width: 390px; height: 390px; content: ''; border: 2px solid rgb(82 187 196 / 24%); border-radius: 48% 52% 41% 59%; transform: rotate(26deg); animation: face-drift 11s ease-in-out infinite; }
.back-button { position: relative; top: auto; left: auto; z-index: 2; width: 44px; height: 44px; margin: 0 0 18px; border: 1px solid rgb(78 68 121 / 48%); border-radius: 6px; background: #fff; box-shadow: 2px 3px 0 rgb(61 53 100 / 20%); color: var(--purple); transition: transform .18s ease, box-shadow .18s ease; }.back-button:hover { transform: translate(-2px, -2px); box-shadow: 4px 5px 0 rgb(61 53 100 / 20%); }
.face-layout { position: relative; z-index: 1; grid-template-columns: minmax(0, 1fr) 372px; max-width: 1480px; margin: 0 auto; gap: 26px; height: calc(100% - 62px); }.preview-shell { border: 2px solid var(--ink); border-radius: 10px; background: #3e3a68; box-shadow: 7px 8px 0 rgb(61 53 100 / 70%); }.preview-shell::before { position: absolute; inset: 14px; z-index: 2; content: ''; border: 1px solid rgb(157 228 235 / 55%); border-radius: 5px; pointer-events: none; }.preview-shell::after { position: absolute; inset: 0; z-index: 2; content: ''; background: linear-gradient(90deg, transparent 48%, rgb(157 228 235 / 18%) 50%, transparent 52%); background-size: 210% 100%; mix-blend-mode: screen; pointer-events: none; animation: face-scan 4.5s ease-in-out infinite; }.preview-state { z-index: 3; left: 18px; bottom: 18px; border: 1px solid rgb(255 255 255 / 46%); border-radius: 5px; background: rgb(61 53 100 / 62%); box-shadow: 2px 2px 0 rgb(10 10 26 / 25%); }.preview-caption { padding: 0 4px; color: #665b8c; font-weight: 700; }.preview-caption span:first-child::before { display: inline-block; width: 8px; height: 8px; margin-right: 6px; border: 1px solid var(--ink); border-radius: 50%; background: var(--pink); content: ''; }
.control-panel { gap: 18px; padding-top: 0; }.control-card, .result-card, .session-card { padding: 19px; border: 1px solid rgb(88 77 137 / 25%); border-radius: 9px; background: rgb(255 255 255 / 93%); box-shadow: 4px 5px 0 rgb(61 53 100 / 14%); }.control-card { background: linear-gradient(150deg, rgb(255 255 255 / 94%), rgb(247 242 255 / 94%)); }.control-head h2, .session-card h3 { color: var(--ink); font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif; font-weight: 900; }.control-head p, .session-card p { color: #615783; font-size: 13px; }.reset-button { color: #675b99; font-size: 13px; }.action-row :deep(.el-button) { min-height: 40px; border: 1px solid #4e4473; border-radius: 5px; box-shadow: 2px 3px 0 rgb(61 53 100 / 18%); font-weight: 800; }.action-row :deep(.el-button--primary) { background: var(--purple); }.action-row :deep(.el-button--success) { border-color: #3f8f91; background: #52bbc4; }.status-item, .profile-info, .score-row > div { border: 1px solid rgb(78 68 121 / 15%); border-radius: 6px; background: #f8f7ff; }.status-item:nth-child(2n) { background: #f2fbfb; }.label { color: #7c7298; font-weight: 700; }.status-item strong, .profile-info strong, .score-row strong { color: var(--ink); }.result-banner { border-radius: 6px; font-weight: 750; }.result-banner.success { background: linear-gradient(135deg, #52bbc4, #5caeb7); }.result-banner.danger { background: linear-gradient(135deg, #ee91bb, #dc7c9b); }.session-card { background: linear-gradient(135deg, #fffdf3, #fff7dc); }.session-card h3::before { display: inline-block; width: 10px; height: 10px; margin-right: 7px; border: 1px solid var(--ink); border-radius: 50%; background: var(--yellow); content: ''; }
@keyframes face-drift { 0%, 100% { transform: rotate(26deg) translate(0); } 50% { transform: rotate(38deg) translate(-18px, 10px); } }
@keyframes face-scan { 0%, 100% { background-position: 100% 0; opacity: .2; } 50% { background-position: 0 0; opacity: .85; } }
@media (max-width: 1180px) { .face-page { height: auto; min-height: calc(100vh - 64px); overflow: auto; }.face-layout { grid-template-columns: 1fr; height: auto; }.preview-panel { min-height: 540px; } }
@media (max-width: 760px) { .face-page { padding: 16px; }.preview-panel { min-height: 380px; }.preview-caption { flex-direction: column; }.control-head { flex-direction: column; } }
</style>
