import request from '@/utils/request'

function unwrap(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) return response
  if ([200, 201].includes(Number(response.code))) return response.data
  throw new Error(response.message || '操作失败')
}

function resolve(promise) {
  return promise.then(unwrap)
}

export function listProblemSubjects() {
  return resolve(request.get('/api/problem-solving/subjects'))
}

export function listProblemCategories(subjectId) {
  return resolve(request.get('/api/problem-solving/categories', { params: subjectId ? { subjectId } : undefined }))
}

export function listProblems(params) {
  return resolve(request.get('/api/problem-solving/problems', { params }))
}

export function getProblem(problemId) {
  return resolve(request.get(`/api/problem-solving/problems/${problemId}`))
}

export function getProblemImage(url) {
  return request.get(url, { responseType: 'blob', rawResponse: true })
}

export function explainProblem(problemId, data) {
  return resolve(request.post(`/api/problem-solving/problems/${problemId}/explain`, data))
}

export function createProblemSession(problemId) {
  return resolve(request.post('/api/problem-solving/sessions', { problemId }))
}

export function listAuthoringSubjects() { return resolve(request.get('/api/problem-authoring/subjects')) }
export function listAuthoringCategories(subjectId) { return resolve(request.get('/api/problem-authoring/categories', { params: subjectId ? { subjectId } : undefined })) }
export function createAuthoredProblem(data) { return resolve(request.post('/api/problem-authoring/problems', data)) }
export function updateManagedProblem(problemId, data) { return resolve(request.put(`/api/admin/problem-solving/problems/${problemId}`, data)) }
export function updateOwnProblem(problemId, data) { return resolve(request.put(`/api/teacher/problem-solving/problems/${problemId}`, data)) }
export function listManagedProblems(params) { return resolve(request.get('/api/admin/problem-solving/problems', { params })) }
export function getManagedProblem(problemId) { return resolve(request.get(`/api/admin/problem-solving/problems/${problemId}`)) }
export function setManagedProblemStatus(problemId, status) { return resolve(request.put(`/api/admin/problem-solving/problems/${problemId}/status`, { status })) }
export function deleteManagedProblem(problemId) { return resolve(request.delete(`/api/admin/problem-solving/problems/${problemId}`)) }
export function listOwnProblems(params) { return resolve(request.get('/api/teacher/problem-solving/problems', { params })) }
export function getOwnProblem(problemId) { return resolve(request.get(`/api/teacher/problem-solving/problems/${problemId}`)) }
export function setOwnProblemStatus(problemId, status) { return resolve(request.put(`/api/teacher/problem-solving/problems/${problemId}/status`, { status })) }
export function deleteOwnProblem(problemId) { return resolve(request.delete(`/api/teacher/problem-solving/problems/${problemId}`)) }
export function listManagedCategories(params) { return resolve(request.get('/api/admin/problem-solving/categories', { params })) }
export function createManagedCategory(data) { return resolve(request.post('/api/admin/problem-solving/categories', data)) }
export function setManagedCategoryStatus(categoryId, status) { return resolve(request.put(`/api/admin/problem-solving/categories/${categoryId}/status`, { status })) }
export function deleteManagedCategory(categoryId) { return resolve(request.delete(`/api/admin/problem-solving/categories/${categoryId}`)) }
