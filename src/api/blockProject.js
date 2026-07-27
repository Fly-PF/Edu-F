import request from '@/utils/request'

function unwrap(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) return response
  if ([200, 201].includes(Number(response.code))) return response.data
  throw new Error(response.message || 'Operation failed')
}

const resolve = (promise) => promise.then(unwrap)

export const listMyBlockProjects = () => resolve(request.get('/api/block-projects/mine'))
export const listBlockGallery = (params = {}) => resolve(request.get('/api/block-projects/gallery', { params }))
export const getBlockProject = (projectId) => resolve(request.get(`/api/block-projects/${projectId}`))
export const createBlockProject = (data) => resolve(request.post('/api/block-projects', data))
export const saveBlockProject = (projectId, data) => resolve(request.put(`/api/block-projects/${projectId}`, data))
export const publishBlockProject = (projectId) => resolve(request.post(`/api/block-projects/${projectId}/publish`))
export const remixBlockProject = (projectId) => resolve(request.post(`/api/block-projects/${projectId}/remix`))
