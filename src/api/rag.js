import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const baseURL = 'http://localhost:8080'

function unwrap(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) {
    return response
  }

  if (Number(response.code) === 200 || Number(response.code) === 201) {
    return response.data
  }

  throw new Error(response.message || '操作失败')
}

function resolve(promise) {
  return promise.then(unwrap)
}

export function createKnowledgeBase(data) {
  return resolve(request.post('/api/rag/kb', data))
}

export function getMyKnowledgeBase(kbId) {
  return resolve(request.get('/api/rag/kb/my/detail', { params: { kb_id: kbId } }))
}

export function updateKnowledgeBase(data) {
  return resolve(request.post('/api/rag/kb/update', data))
}

export function listMyKnowledgeBases(params = {}) {
  return resolve(request.get('/api/rag/kb/my', { params }))
}

export function listPublicKnowledgeBases(params = {}) {
  return resolve(request.get('/api/rag/kb/public', { params }))
}

export function pagePublicKnowledgeBases(params = {}) {
  return resolve(request.get('/api/rag/kb/public/page', { params }))
}

export function pageCollectedKnowledgeBases(params = {}) {
  return resolve(request.get('/api/rag/kb/collection/page', { params }))
}

export function pageKnowledgeBaseDocuments(params = {}) {
  return resolve(request.get('/api/rag/kb/documents', { params }))
}

export function listPublicKnowledgeBaseDocuments(params = {}) {
  return resolve(request.get('/api/rag/kb/public/documents', { params }))
}

export function getKnowledgeBaseCollectionStatus(kbId) {
  return resolve(request.get('/api/rag/kb/collection/status', { params: { kb_id: kbId } }))
}

export function collectKnowledgeBase(kbId) {
  return resolve(request.post('/api/rag/kb/collection', null, { params: { kb_id: kbId } }))
}

export function cancelKnowledgeBaseCollection(kbId) {
  return resolve(request.post('/api/rag/kb/collection/cancel', null, { params: { kb_id: kbId } }))
}

export function pageChatSessions(params = {}) {
  return resolve(request.get('/api/rag/chat/session/page', { params }))
}

export function listChatSessionKnowledgeBases(sessionId) {
  return resolve(request.get('/api/rag/chat/session/kb', { params: { session_id: sessionId } }))
}

export function createChatSession(data) {
  return resolve(request.post('/api/rag/chat/session', data))
}

export function renameChatSession(data) {
  return resolve(request.post('/api/rag/chat/session/rename', data))
}

export function deleteChatSession(sessionId) {
  return resolve(request.post('/api/rag/chat/session/delete', null, { params: { session_id: sessionId } }))
}

export function listChatMessages(sessionId) {
  return resolve(request.get('/api/rag/chat/message', { params: { session_id: sessionId } }))
}

export async function sendRagChatStream(data, onMessage) {
  const userStore = useUserStore()
  const response = await fetch(`${baseURL}/api/rag/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(userStore.token ? { Authorization: userStore.token } : {}),
    },
    body: JSON.stringify(data),
  })

  if (!response.ok || !response.body) {
    throw new Error('聊天接口请求失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) {
      break
    }
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split(/\r?\n\r?\n/)
    buffer = events.pop() || ''

    for (const eventText of events) {
      await handleSseEvent(eventText, onMessage)
    }
  }

  buffer += decoder.decode()

  if (buffer.trim()) {
    await handleSseEvent(buffer, onMessage)
  }
}

async function handleSseEvent(eventText, onMessage) {
  const lines = eventText.split(/\r?\n/).filter((line) => line.startsWith('data:'))
  if (!lines.length) {
    return
  }

  const text = lines.map((line) => line.slice(5).trimStart()).join('\n').trim()
  if (!text || text === '[DONE]') {
    return
  }

  await onMessage?.(JSON.parse(text))
}

export function uploadRagFile(data) {
  return resolve(request.post('/api/rag/files/upload', data, { timeout: 60000 }))
}

export function updateRagDocument(data) {
  return resolve(request.post('/api/rag/files/update', data))
}

export function deleteRagDocument(data) {
  return resolve(request.post('/api/rag/files/delete', data))
}

export function getRagFilePreviewContent(params = {}) {
  return resolve(request.get('/api/rag/files/preview-content', { params, timeout: 60000 }))
}

export function getRagFilePreviewImages(params = {}) {
  return resolve(request.get('/api/rag/files/preview-images', { params, timeout: 60000 }))
}
