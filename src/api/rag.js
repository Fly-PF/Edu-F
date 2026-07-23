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
