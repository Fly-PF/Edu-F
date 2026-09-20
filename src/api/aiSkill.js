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

function appendOptional(formData, key, value) {
  if (value === undefined || value === null || value === '') {
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => appendOptional(formData, key, item))
    return
  }

  formData.append(key, value)
}

export function getSkillCategories(params = {}) {
  return resolve(request.get('/api/ai-skills/categories', { params }))
}

export function getSkillMarket(params = {}) {
  return resolve(request.get('/api/ai-skills/market', { params }))
}

export function getMySkills(params = {}) {
  return resolve(request.get('/api/ai-skills/mine', { params }))
}

export function getSkillCollections(params = {}) {
  return resolve(request.get('/api/ai-skills/collections', { params }))
}

export function getSkillDetail(skillId) {
  return resolve(request.get(`/api/ai-skills/${skillId}`))
}

export function createSkill(data) {
  return resolve(request.post('/api/ai-skills', data))
}

export function updateSkill(skillId, data) {
  return resolve(request.put(`/api/ai-skills/${skillId}`, data))
}

export function publishSkill(skillId) {
  return resolve(request.post(`/api/ai-skills/${skillId}/publish`))
}

export function offlineSkill(skillId) {
  return resolve(request.post(`/api/ai-skills/${skillId}/offline`))
}

export function deleteSkill(skillId) {
  return resolve(request.delete(`/api/ai-skills/${skillId}`))
}

export function collectSkill(skillId) {
  return resolve(request.post(`/api/ai-skills/${skillId}/collect`))
}

export function cancelCollectSkill(skillId) {
  return resolve(request.delete(`/api/ai-skills/${skillId}/collect`))
}

export function importSkill({ file, ...fields }) {
  const formData = new FormData()
  formData.append('file', file)
  Object.entries(fields).forEach(([key, value]) => appendOptional(formData, key, value))
  return resolve(request.post('/api/ai-skills/import', formData))
}

export function exportSkill(skillId) {
  return request.get(`/api/ai-skills/${skillId}/export`, {
    responseType: 'blob',
    rawResponse: true,
  })
}

export function invokeSkill(skillId, data) {
  return resolve(request.post(`/api/ai-skills/${skillId}/invoke`, data))
}

export function getAdminSkillCategories(params = {}) {
  return resolve(request.get('/api/admin/ai-skill-categories', { params }))
}

export function createAdminSkillCategory(data) {
  return resolve(request.post('/api/admin/ai-skill-categories', data))
}

export function updateAdminSkillCategory(categoryId, data) {
  return resolve(request.put(`/api/admin/ai-skill-categories/${categoryId}`, data))
}

export function deleteAdminSkillCategory(categoryId) {
  return resolve(request.delete(`/api/admin/ai-skill-categories/${categoryId}`))
}
