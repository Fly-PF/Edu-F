import request from '@/utils/request'

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
