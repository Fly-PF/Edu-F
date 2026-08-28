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

export function createGovMockExam(data) {
  return resolve(request.post('/api/gov/assessment/mock', data))
}

export function getGovMockExam(practiceId) {
  return resolve(request.get(`/api/gov/assessment/mock/${practiceId}`))
}

export function submitGovMockExam(practiceId, data) {
  return resolve(request.post(`/api/gov/assessment/mock/${practiceId}/submit`, data))
}

export function getGovMockExamReport(practiceId) {
  return resolve(request.get(`/api/gov/assessment/mock/${practiceId}/report`))
}

export function listGovMockExamRecords() {
  return resolve(request.get('/api/gov/assessment/mock/records'))
}

