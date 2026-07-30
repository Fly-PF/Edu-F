import request from '@/utils/request'

const safetyPostConfig = {
  timeout: 30000,
}

const safetyEvaluationPostConfig = {
  timeout: 120000,
}

const safetyReviewPostConfig = {
  timeout: 30000,
}

export function checkSafety(data) {
  return request.post('/api/safety/check', data, safetyPostConfig)
}

export function runSafetyGateway(data) {
  return request.post('/api/safety/gateway', data, safetyPostConfig)
}

export function checkSafetyEvidence(data) {
  return request.post('/api/safety/evidence/check', data, safetyPostConfig)
}

export function getSafetyReviewRecords(params) {
  return request.get('/api/safety/reviews', { params })
}

export function getSafetyReviewDetail(id) {
  return request.get(`/api/safety/reviews/${id}`).catch(() => request.get(`/api/safety/records/${id}`))
}

export function getSafetyRecords(params) {
  return request.get('/api/safety/records', { params })
}

export function getSafetyRecordDetail(id) {
  return request.get(`/api/safety/records/${id}`)
}

export function approveSafetyRecord(id, data) {
  return request.post(`/api/safety/records/${id}/approve`, data, safetyReviewPostConfig)
}

export function rejectSafetyRecord(id, data) {
  return request.post(`/api/safety/records/${id}/reject`, data, safetyReviewPostConfig)
}

export function getSafetyDashboard(params) {
  return request.get('/api/safety/dashboard', { params })
}

export function runSafetyEval(data) {
  return request.post('/api/safety/evaluation/run', data, safetyEvaluationPostConfig)
}

export function approveSafetyReview(id, data) {
  return request.post(`/api/safety/reviews/${id}/approve`, data, safetyReviewPostConfig)
}

export function rejectSafetyReview(id, data) {
  return request.post(`/api/safety/reviews/${id}/reject`, data, safetyReviewPostConfig)
}

export function submitSafetyReviewDecision(id, data) {
  return request.post(`/api/safety/reviews/${id}/decision`, data, safetyReviewPostConfig)
}
