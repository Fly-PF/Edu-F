import request from '@/utils/request'
import { useUserStore } from '@/stores/user'

const RAG_API_BASE_URL = String(import.meta.env.VITE_APP_REQUEST_BASE_URL || '').replace(/\/+$/, '')
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

// Knowledge bases
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

// Knowledge base collections
export function pageCollectedKnowledgeBases(params = {}) {
  return resolve(request.get('/api/rag/kb/collection/page', { params }))
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

// Knowledge base documents
export function pageKnowledgeBaseDocuments(params = {}) {
  return resolve(request.get('/api/rag/kb/documents', { params }))
}

export function listPublicKnowledgeBaseDocuments(params = {}) {
  return resolve(request.get('/api/rag/kb/public/documents', { params }))
}

export function uploadKnowledgeBaseDocument(data) {
  return resolve(request.post('/api/rag/files/upload', data, { timeout: 60000 }))
}

export function updateKnowledgeBaseDocument(data) {
  return resolve(request.post('/api/rag/files/update', data))
}

export function deleteKnowledgeBaseDocument(data) {
  return resolve(request.post('/api/rag/files/delete', data))
}

export function getKnowledgeBaseDocumentPreviewContent(params = {}) {
  return resolve(request.get('/api/rag/files/preview-content', { params, timeout: 60000 }))
}

export function getKnowledgeBaseDocumentPreviewImages(params = {}) {
  return resolve(request.get('/api/rag/files/preview-images', { params, timeout: 60000 }))
}

// Chats
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

export function deleteChatMessagePair(data) {
  return resolve(request.post('/api/rag/chat/message/delete', null, {
    params: {
      session_id: data.sessionId,
      message_id: data.messageId,
    },
  }))
}

export function prepareSpeechText(content, signal) {
  return resolve(request.post('/api/rag/chat/speech-text', { content }, { timeout: 120000, signal }))
}

export async function sendRagChatStream(data, onMessage) {
  const userStore = useUserStore()
  const formData = new FormData()
  formData.append('sessionId', data.sessionId)
  formData.append('message', data.message)
  if (data.rewriteMessageId) {
    formData.append('rewriteMessageId', data.rewriteMessageId)
  }
  ;(data.imgFiles || []).forEach((file) => formData.append('imgFiles', file))
  const response = await fetch(`${RAG_API_BASE_URL}/api/rag/chat`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
      ...(userStore.token ? { Authorization: userStore.token } : {}),
    },
    body: formData,
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
