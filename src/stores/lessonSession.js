import { defineStore } from 'pinia'
import { applySceneCommand, initialScene } from '@/problemSolving/sceneEngine'

function cloneScene(scene) {
  return { ...scene, highlight: [...(scene.highlight || [])], revealed: [...(scene.revealed || [])], entities: (scene.entities || []).map(item => ({ ...item })), series: (scene.series || []).map(item => ({ ...item, points: [...(item.points || [])] })) }
}

export const useLessonSessionStore = defineStore('lesson-session', {
  state: () => ({
    problemId: null, problemVersion: null, currentSceneState: null, generatedSceneState: null, sceneRevision: 'scene-r1',
    lessonStarted: false, lessonSteps: [], currentStepIndex: -1, qaHistory: [],
    clientSessionId: null, lastSequence: 0, seenEventIds: [], pendingEvents: {}, webSocketConnection: null, socketStatus: 'idle',
  }),
  actions: {
    initialize(problem) {
      this.problemId = problem.id
      this.problemVersion = problem.version
      this.currentSceneState = initialScene(problem.definition.sceneDefinition)
      this.generatedSceneState = cloneScene(this.currentSceneState)
      this.sceneRevision = 'scene-r1'
      this.lessonStarted = false
      this.lessonSteps = []
      this.currentStepIndex = -1
      this.qaHistory = []
      this.clientSessionId = null
      this.lastSequence = 0
      this.seenEventIds = []
      this.pendingEvents = {}
      this.webSocketConnection = null
      this.socketStatus = 'connecting'
    },
    updateVariable(variable, value) {
      this.currentSceneState = { ...this.currentSceneState, [variable]: value }
      const step = this.lessonSteps[this.currentStepIndex]
      if (step?.scene) step.scene = cloneScene(this.currentSceneState)
    },
    updateEntity(id, changes) {
      const entities = (this.currentSceneState.entities || []).map(item => item.id === id ? { ...item, ...changes } : item)
      this.currentSceneState = { ...this.currentSceneState, entities }
      const step = this.lessonSteps[this.currentStepIndex]
      if (step?.scene) step.scene = cloneScene(this.currentSceneState)
    },
    updateSeriesPoint(seriesId, pointIndex, point) {
      const series = (this.currentSceneState.series || []).map(item => item.id === seriesId ? { ...item, points: item.points.map((value, index) => index === pointIndex ? point : value) } : item)
      this.currentSceneState = { ...this.currentSceneState, series }
      const step = this.lessonSteps[this.currentStepIndex]
      if (step?.scene) step.scene = cloneScene(this.currentSceneState)
    },
    selectStep(index) {
      const step = this.lessonSteps[index]
      if (!step?.text) return false
      this.currentStepIndex = index
      if (step.scene) this.currentSceneState = cloneScene(step.scene)
      return true
    },
    attachSocket(sessionInfo, connection) { this.clientSessionId = sessionInfo.clientSessionId; this.webSocketConnection = connection },
    setSocketStatus(status) { this.socketStatus = status },
    applySocketEvent(event) {
      if (!event?.eventId || !Number.isInteger(event.sequence) || this.seenEventIds.includes(event.eventId) || event.sequence <= this.lastSequence) return false
      this.pendingEvents[event.sequence] = event
      let applied = false
      while (this.pendingEvents[this.lastSequence + 1]) {
        const nextEvent = this.pendingEvents[this.lastSequence + 1]
        if (!this.applySocketEventPayload(nextEvent)) break
        delete this.pendingEvents[nextEvent.sequence]
        this.lastSequence = nextEvent.sequence
        this.seenEventIds = [...this.seenEventIds.slice(-49), nextEvent.eventId]
        applied = true
      }
      return applied
    },
    applySocketEventPayload(event) {
      if (event.type === 'scene.snapshot') {
        this.generatedSceneState = { ...this.generatedSceneState, ...(event.payload?.scene || {}) }
        if (this.currentStepIndex < 0) this.currentSceneState = cloneScene(this.generatedSceneState)
        this.sceneRevision = event.nextRevision || this.sceneRevision
      } else if (event.type === 'scene.command' || event.type === 'scene.patch') {
        if (event.baseRevision !== this.sceneRevision) return false
        const next = applySceneCommand(this.generatedSceneState, event)
        if (!next) return false
        this.generatedSceneState = next
        if (this.currentStepIndex < 0) this.currentSceneState = cloneScene(next)
        else if (!event.payload?.lessonStep) {
          const selectedScene = applySceneCommand(this.currentSceneState, event)
          if (selectedScene) {
            this.currentSceneState = selectedScene
            const step = this.lessonSteps[this.currentStepIndex]
            if (step?.scene) step.scene = cloneScene(selectedScene)
          }
        }
        this.sceneRevision = event.nextRevision || this.sceneRevision
      } else if (event.type === 'lesson.plan') {
        this.lessonStarted = true
        this.lessonSteps = (event.payload?.steps || []).map((id, index) => ({ id, index, title: ['理解题意', '建立模型', '推导计算', '检验总结'][index], text: '' }))
      } else if (event.type === 'lesson.step') {
        this.lessonStarted = true
        const step = { ...this.lessonSteps[event.payload.stepIndex], ...event.payload, scene: cloneScene(this.generatedSceneState) }
        this.lessonSteps.splice(event.payload.stepIndex, 1, step)
        if (this.currentStepIndex < 0 || this.currentStepIndex === event.payload.stepIndex) {
          this.currentStepIndex = event.payload.stepIndex
          this.currentSceneState = cloneScene(step.scene)
        }
      } else if (event.type === 'narration') {
        this.receiveNarration(event.payload || {})
      } else return false
      return true
    },
    startQuestion(question, turnId) {
      this.qaHistory.push({ question, answer: '', turnId, loading: true, streamDone: false, typingQueue: '', typingTimer: null })
    },
    failQuestion(turnId, message) {
      const item = this.qaHistory.find((entry) => entry.turnId === turnId)
      if (!item) return
      item.loading = false
      item.streamDone = true
      item.answer = message
    },
    receiveNarration(payload) {
      const turnId = payload.turnId || crypto.randomUUID()
      let item = this.qaHistory.find((entry) => entry.turnId === turnId)
      if (!item) {
        item = { question: payload.question || '', answer: '', turnId, loading: true, streamDone: false, typingQueue: '', typingTimer: null }
        this.qaHistory.push(item)
      }
      if (payload.text) {
        item.typingQueue += payload.text
        if (!item.typingTimer) {
          const typeNext = () => {
            const current = this.qaHistory.find((entry) => entry.turnId === turnId)
            if (!current) return
            if (current.typingQueue) {
              current.answer += current.typingQueue[0]
              current.typingQueue = current.typingQueue.slice(1)
              current.typingTimer = setTimeout(typeNext, 18)
            } else {
              current.typingTimer = null
              if (current.streamDone) current.loading = false
            }
          }
          item.typingTimer = setTimeout(typeNext, 18)
        }
      }
      if (payload.status === 'done') {
        item.streamDone = true
        if (item.typingTimer) clearTimeout(item.typingTimer)
        item.answer += item.typingQueue
        item.typingQueue = ''
        item.typingTimer = null
        item.loading = false
      }
    },
    clear() {
      this.webSocketConnection?.disconnect?.()
      this.qaHistory.forEach((item) => item.typingTimer && clearTimeout(item.typingTimer))
      this.$reset()
    },
  },
})
