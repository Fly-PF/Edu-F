import { Client } from '@stomp/stompjs'

function resolveWsUrl(endpoint) {
  const baseUrl = String(import.meta.env.VITE_APP_REQUEST_BASE_URL || '').trim().replace(/\/$/, '')
  if (/^https?:\/\//.test(baseUrl)) return `${baseUrl.replace(/^http/, 'ws')}${endpoint}`
  return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}${endpoint}`
}

export function connectLessonSocket(sessionInfo, handlers) {
  const client = new Client({
    brokerURL: resolveWsUrl(sessionInfo.wsEndpoint),
    connectHeaders: { clientSessionId: sessionInfo.clientSessionId, wsToken: sessionInfo.wsToken },
    reconnectDelay: 0,
    onConnect() {
      handlers.onState?.('connected')
      client.subscribe('/user/queue/problem-solving', (message) => {
        try {
          const event = JSON.parse(message.body)
          if (handlers.onEvent?.(event)) client.publish({ destination: '/app/problem-solving/event', body: JSON.stringify({ type: 'ACK', sequence: event.sequence }) })
        } catch {
          handlers.onError?.('实时讲题消息格式错误')
        }
      })
      client.publish({ destination: '/app/problem-solving/event', body: JSON.stringify({ type: 'READY' }) })
    },
    onStompError(frame) { handlers.onError?.(frame.headers.message || '实时讲题连接失败') },
    onWebSocketClose() { handlers.onState?.('closed') },
  })
  client.activate()
  return {
    sendQuestion(data) {
      if (!client.connected) return false
      client.publish({ destination: '/app/problem-solving/event', body: JSON.stringify({ type: 'QUESTION', ...data }) })
      return true
    },
    startLesson() {
      if (!client.connected) return false
      client.publish({ destination: '/app/problem-solving/event', body: JSON.stringify({ type: 'START_LESSON' }) })
      return true
    },
    nextStep() {
      if (!client.connected) return false
      client.publish({ destination: '/app/problem-solving/event', body: JSON.stringify({ type: 'NEXT_STEP' }) })
      return true
    },
    selectStep(stepId) {
      if (!client.connected) return false
      client.publish({ destination: '/app/problem-solving/event', body: JSON.stringify({ type: 'SELECT_STEP', stepId }) })
      return true
    },
    disconnect() { return client.deactivate() },
  }
}
