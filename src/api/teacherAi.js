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

  const error = new Error(response.message || 'AI 请求失败')
  error.status = Number(response.code) || null
  throw error
}

function sanitizeAiErrorMessage(value) {
  const message = value === null || value === undefined ? '' : String(value).trim()
  if (!message) return ''
  if (/api[-_ ]?key|authorization|bearer\s+|jwt|access[_-]?token|stack\s*trace/i.test(message)) return ''
  const firstLine = message.split(/\r?\n/)[0].trim().slice(0, 240)
  if (/^(服务器异常|系统异常|请求失败|ai 请求失败|network error|internal server error)$/i.test(firstLine)) return ''
  return firstLine
}

export function getAiRequestErrorMessage(error) {
  const status = Number(error?.status)
  const code = String(error?.code || '').toUpperCase()
  const rawMessage = String(error?.message || '')

  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || /timeout|超时/i.test(rawMessage)) {
    return 'AI 服务响应超时，请稍后重试。'
  }
  if (error?.isNetworkError || code === 'ERR_NETWORK' || /network error|failed to fetch/i.test(rawMessage)) {
    return '网络连接异常，请检查网络后重试。'
  }

  const safeMessage = sanitizeAiErrorMessage(rawMessage)
  if (safeMessage) return safeMessage
  if (status === 400 || status === 422) return '请求参数有误，请检查填写内容后重试。'
  if (status >= 500) return 'AI 生成失败，请稍后重试。'
  return 'AI 服务暂时不可用，请稍后重试。'
}

function handleAiRequest(promise) {
  return promise.then(unwrap).catch((error) => {
    throw new Error(getAiRequestErrorMessage(error))
  })
}

export function generateLessonPlan(data) {
  return handleAiRequest(request.post('/api/teacher/ai/lesson-plans/generate', data, aiRequestConfig))
}

export function generateGrading(data) {
  return handleAiRequest(request.post('/api/teacher/ai/gradings/generate', data, aiRequestConfig))
}
