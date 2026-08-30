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

export function getGovKnowledgeTree(subject, keyword = '') {
  return resolve(
    request.get(`/api/gov/knowledge/subjects/${encodeURIComponent(subject)}/tree`, {
      params: keyword ? { keyword } : {},
    }),
  )
}

export function getGovKnowledgeNode(nodeId) {
  return resolve(request.get(`/api/gov/knowledge/nodes/${nodeId}`))
}

export function getGovKnowledgeProgress(nodeId) {
  return resolve(request.get(`/api/gov/knowledge/nodes/${nodeId}/progress`))
}

export function updateGovKnowledgeProgress(nodeId, data) {
  return resolve(request.post(`/api/gov/knowledge/nodes/${nodeId}/progress`, data))
}

export function getGovKnowledgeCompare(nodeId) {
  return resolve(request.get(`/api/gov/knowledge/nodes/${nodeId}/compare`))
}

export function getAdminGovKnowledgeCompare(nodeId) {
  return resolve(request.get(`/api/admin/gov/knowledge/nodes/${nodeId}/compare`))
}

export function saveGovKnowledgeCompare(nodeId, data) {
  return resolve(request.post(`/api/gov/knowledge/nodes/${nodeId}/compare`, data))
}

export function saveAdminGovKnowledgeCompare(nodeId, data) {
  return resolve(request.post(`/api/admin/gov/knowledge/nodes/${nodeId}/compare`, data))
}

export function updateGovKnowledgeCompare(compareId, data) {
  return resolve(request.post(`/api/gov/knowledge/compare/${compareId}`, data))
}

export function updateAdminGovKnowledgeCompare(compareId, data) {
  return resolve(request.put(`/api/admin/gov/knowledge/compare/${compareId}`, data))
}

export function deleteGovKnowledgeCompare(compareId) {
  return resolve(request.delete(`/api/gov/knowledge/compare/${compareId}`))
}

export function deleteAdminGovKnowledgeCompare(compareId) {
  return resolve(request.delete(`/api/admin/gov/knowledge/compare/${compareId}`))
}

export function getGovKnowledgeFavorite(nodeId) {
  return resolve(request.get(`/api/gov/knowledge/nodes/${nodeId}/favorite`))
}

export function collectGovKnowledge(nodeId) {
  return resolve(request.post(`/api/gov/knowledge/nodes/${nodeId}/favorite`))
}

export function cancelGovKnowledgeFavorite(nodeId) {
  return resolve(request.post(`/api/gov/knowledge/nodes/${nodeId}/favorite/cancel`))
}

export function getGovKnowledgeNote(nodeId) {
  return resolve(request.get(`/api/gov/knowledge/nodes/${nodeId}/note`))
}

export function saveGovKnowledgeNote(nodeId, data) {
  return resolve(request.post(`/api/gov/knowledge/nodes/${nodeId}/note`, data))
}

export function getGovKnowledgeAnnotations(nodeId) {
  return resolve(request.get(`/api/gov/knowledge/nodes/${nodeId}/annotations`))
}

export function saveGovKnowledgeAnnotation(nodeId, data) {
  return resolve(request.post(`/api/gov/knowledge/nodes/${nodeId}/annotations`, data))
}

export function updateGovKnowledgeAnnotation(annotationId, data) {
  return resolve(request.post(`/api/gov/knowledge/annotations/${annotationId}`, data))
}

export function deleteGovKnowledgeAnnotation(annotationId) {
  return resolve(request.delete(`/api/gov/knowledge/annotations/${annotationId}`))
}

export function pageMyGovKnowledgeFavorites(params) {
  return resolve(request.get('/api/gov/knowledge/favorites/page', { params }))
}

export function pageMyGovKnowledgeNotes(params) {
  return resolve(request.get('/api/gov/knowledge/notes/page', { params }))
}

export function pageMyGovKnowledgeAnnotations(params) {
  return resolve(request.get('/api/gov/knowledge/annotations/page', { params }))
}

export function getAdminGovKnowledgeTree(subject, keyword = '') {
  return resolve(
    request.get(`/api/admin/gov/knowledge/subjects/${encodeURIComponent(subject)}/tree`, {
      params: keyword ? { keyword } : {},
    }),
  )
}
export function getAdminGovKnowledgeNode(nodeId) {
  return resolve(request.get(`/api/admin/gov/knowledge/nodes/${nodeId}`))
}

export function createGovKnowledgeNode(data) {
  return resolve(request.post('/api/admin/gov/knowledge/nodes', data))
}

export function updateGovKnowledgeNode(nodeId, data) {
  return resolve(request.put(`/api/admin/gov/knowledge/nodes/${nodeId}`, data))
}

export function deleteGovKnowledgeNode(nodeId) {
  return resolve(request.delete(`/api/admin/gov/knowledge/nodes/${nodeId}`))
}
