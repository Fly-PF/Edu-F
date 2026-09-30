import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const API_BASE_URL = String(import.meta.env.VITE_APP_REQUEST_BASE_URL || '').replace(/\/+$/, '')

function unwrap(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) return response
  if (Number(response.code) === 200 || Number(response.code) === 201) return response.data
  throw new Error(response.message || '操作失败')
}

export function getGovPracticeAiSkills(params = {}) {
  return request.get('/api/gov/practice-ai/skills', { params }).then(unwrap)
}

export async function sendGovPracticeAiStream(data, onMessage, signal) {
  const userStore = useUserStore()
  const response = await fetch(`${API_BASE_URL}/api/gov/practice-ai/chat`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      ...(userStore.token ? { Authorization: userStore.token } : {}),
    },
    body: JSON.stringify(data),
    signal,
  })
  if (!response.ok || !response.body) throw new Error('AI讲题接口请求失败')

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''
    for (const eventText of events) await handleEvent(eventText, onMessage)
  }
  buffer += decoder.decode()
  if (buffer.trim()) await handleEvent(buffer, onMessage)
}

async function handleEvent(eventText, onMessage) {
  const lines = eventText.split(/\r?\n/).filter((line) => line.startsWith('data:'))
  if (!lines.length) return
  const data = lines.map((line) => line.slice(5).trimStart()).join('\n').trim()
  if (data && data !== '[DONE]') await onMessage?.(JSON.parse(data))
}
