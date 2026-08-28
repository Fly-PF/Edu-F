import request from '@/utils/request'

export function listEnabledGovMaterialCategories() {
  return request({
    url: '/api/gov-material-categories',
    method: 'get',
  })
}

export function listPublishedGovMaterials(categoryId) {
  return request({
    url: '/api/gov-materials',
    method: 'get',
    params: categoryId != null ? { categoryId } : {},
  })
}

export function getPublishedGovMaterialFileUrl(fileUrl) {
  const baseURL = String(import.meta.env.VITE_APP_REQUEST_BASE_URL || '').replace(/\/+$/, '')
  return `${baseURL}/api/gov-materials/file?fileUrl=${encodeURIComponent(fileUrl || '')}`
}

export function listAdminGovMaterialCategories() {
  return request({
    url: '/api/admin/gov-material-categories',
    method: 'get',
  })
}

export function createGovMaterialCategory(data) {
  return request({
    url: '/api/admin/gov-material-categories',
    method: 'post',
    data,
  })
}

export function updateGovMaterialCategory(id, data) {
  return request({
    url: `/api/admin/gov-material-categories/${id}`,
    method: 'put',
    data,
  })
}

export function deleteGovMaterialCategory(id) {
  return request({
    url: `/api/admin/gov-material-categories/${id}`,
    method: 'delete',
  })
}

export function listAdminGovMaterials(params) {
  return request({
    url: '/api/admin/gov-materials',
    method: 'get',
    params,
  })
}

export function createGovMaterial(data) {
  return request({
    url: '/api/admin/gov-materials',
    method: 'post',
    data: buildMaterialFormData(data),
  })
}

export function updateGovMaterial(id, data) {
  return request({
    url: `/api/admin/gov-materials/${id}`,
    method: 'put',
    data: buildMaterialFormData(data),
  })
}

function buildMaterialFormData(data = {}) {
  const formData = new FormData()
  const payload = { ...data }
  const file = payload.file
  delete payload.file
  formData.append('data', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
  if (file) {
    formData.append('file', file)
  }
  return formData
}

export function publishGovMaterial(id) {
  return request({
    url: `/api/admin/gov-materials/${id}/publish`,
    method: 'put',
  })
}

export function withdrawGovMaterial(id) {
  return request({
    url: `/api/admin/gov-materials/${id}/withdraw`,
    method: 'put',
  })
}

export function deleteGovMaterial(id) {
  return request({
    url: `/api/admin/gov-materials/${id}`,
    method: 'delete',
  })
}
