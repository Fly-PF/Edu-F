import request from '@/utils/request'

function unwrap(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) {
    return response
  }

  if ([200, 201].includes(Number(response.code))) {
    return response.data
  }

  throw new Error(response.message || '操作失败')
}

function resolve(promise) {
  return promise.then(unwrap)
}

export function listAdminGovQuestions(params) {
  return resolve(request.get('/api/admin/gov-questions', { params }))
}

export function getAdminGovQuestion(questionId) {
  return resolve(request.get(`/api/admin/gov-questions/${questionId}`))
}

export function createAdminGovQuestion(data) {
  return resolve(request.post('/api/admin/gov-questions', data))
}

export function updateAdminGovQuestion(questionId, data) {
  return resolve(request.put(`/api/admin/gov-questions/${questionId}`, data))
}

export function deleteAdminGovQuestion(questionId) {
  return resolve(request.delete(`/api/admin/gov-questions/${questionId}`))
}

export function importAdminGovQuestions(data) {
  return resolve(request.post('/api/admin/gov-questions/import', data))
}

