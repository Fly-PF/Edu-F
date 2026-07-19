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

export function getAiExhibitOverview() {
  return resolve(request.get('/api/ai-exhibit/overview'))
}

export function listAiProjectCases(params = {}) {
  return resolve(request.get('/api/ai-exhibit/cases', { params }))
}

export function getAiProjectCase(caseId) {
  return resolve(request.get(`/api/ai-exhibit/cases/${caseId}`))
}

export function listAiPracticeRecords(params = {}) {
  return resolve(request.get('/api/ai-exhibit/records', { params }))
}

export function submitAiPractice(caseId, data = {}) {
  const formData = new FormData()

  for (const key of ['practiceType', 'inputText', 'answerText', 'note']) {
    if (data[key] != null && data[key] !== '') {
      formData.append(key, data[key])
    }
  }

  if (data.file) {
    formData.append('file', data.file)
  }

  return resolve(
    request.post(`/api/ai-exhibit/cases/${caseId}/records`, formData, {
      timeout: 0,
    }),
  )
}

export function guessAiDraw(data = {}) {
  return resolve(
    request.post('/api/ai-exhibit/draw-guess', {
      imageDataUrl: data.imageDataUrl,
    }, {
      timeout: 30000,
    }),
  )
}
