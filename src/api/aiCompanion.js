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

export function getAiCompanionContext(courseId, chapterId, resourceId) {
  return resolve(request.get('/api/student/ai-companion/context', {
    params: { courseId, chapterId, resourceId },
  }))
}

export function createAiCompanionSession(data) {
  return resolve(request.post('/api/student/ai-companion/sessions', data))
}

export function listAiCompanionSessions(courseId) {
  return resolve(request.get('/api/student/ai-companion/sessions', {
    params: courseId ? { courseId } : undefined,
  }))
}

export function saveAiCompanionExchange(sessionId, data) {
  return resolve(request.post(`/api/student/ai-companion/sessions/${sessionId}/messages`, data, {
    timeout: 90000,
  }))
}

export function listAiCompanionMessages(sessionId) {
  return resolve(request.get(`/api/student/ai-companion/sessions/${sessionId}/messages`))
}
