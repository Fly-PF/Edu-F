import request from '@/utils/request'

const DEFAULT_AI_REQUEST_TIMEOUT = 60000

function resolveAiRequestTimeout() {
  const configuredTimeout = Number(import.meta.env.VITE_AI_REQUEST_TIMEOUT)
  return Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? Math.floor(configuredTimeout)
    : DEFAULT_AI_REQUEST_TIMEOUT
}

const aiRequestConfig = {
  timeout: resolveAiRequestTimeout(),
}

function unwrap(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) {
    return response
  }

  if (Number(response.code) === 200) {
    return response.data
  }

  throw new Error(response.message || 'AI 请求失败')
}

export function generateLessonPlan(data) {
  return request.post('/api/teacher/ai/lesson-plans/generate', data, aiRequestConfig).then(unwrap)
}

export function generateGrading(data) {
  return request.post('/api/teacher/ai/gradings/generate', data, aiRequestConfig).then(unwrap)
}
