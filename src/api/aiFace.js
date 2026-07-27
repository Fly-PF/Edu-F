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

function toFormData(file) {
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

export function getAiFaceProfile() {
  return resolve(request.get('/api/ai-face/profile'))
}

export function registerAiFace(file) {
  return resolve(
    request.post('/api/ai-face/register', toFormData(file), {
      timeout: 60000,
    }),
  )
}

export function compareAiFace(file) {
  return resolve(
    request.post('/api/ai-face/compare', toFormData(file), {
      timeout: 60000,
    }),
  )
}

export function clearAiFaceSession() {
  return resolve(request.delete('/api/ai-face/session'))
}
