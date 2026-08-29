import request from '@/utils/request'

function unwrap(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) {
    return response
  }
  if ([200, 201].includes(Number(response.code))) {
    return response.data
  }
  throw new Error(response.message || '学情分析请求失败')
}

function resolve(promise) {
  return promise.then(unwrap)
}

export function getTeacherGrowthDashboard(classId) {
  return resolve(request.get(`/api/learning-analysis/teacher/classes/${classId}/dashboard`))
}

export function askTeacherLearningAssistant(classId, data) {
  return resolve(request.post(`/api/learning-analysis/teacher/classes/${classId}/assistant`, data, { timeout: 40000 }))
}

export function generateLearningCase(data) {
  return resolve(request.post('/api/learning-analysis/teacher/cases/generate', data, { timeout: 40000 }))
}

export function decideLearningPlan(caseId, data) {
  return resolve(request.patch(`/api/learning-analysis/teacher/cases/${caseId}/plan-decision`, data))
}

export function reviewLearningPlan(planId, data) {
  return resolve(request.patch(`/api/learning-analysis/teacher/plans/${planId}/review`, data))
}

export function getStudentGrowthOverview() {
  return resolve(request.get('/api/learning-analysis/student/growth-overview'))
}

export function getStudentWrongBooks() {
  return resolve(request.get('/api/learning-analysis/student/wrong-books'))
}

export function createStudentWrongBook(name) {
  return resolve(request.post('/api/learning-analysis/student/wrong-books', { name }))
}

export function renameStudentWrongBook(bookId, name) {
  return resolve(request.patch(`/api/learning-analysis/student/wrong-books/${bookId}`, { name }))
}

export function deleteStudentWrongBook(bookId) {
  return resolve(request.delete(`/api/learning-analysis/student/wrong-books/${bookId}`))
}

export function addQuestionToWrongBook(bookId, question) {
  return resolve(request.post(`/api/learning-analysis/student/wrong-books/${bookId}/questions`, {
    practiceId: question.practiceId,
    questionId: question.questionId,
  }))
}

export function removeQuestionFromWrongBook(bookId, question) {
  return resolve(request.delete(
    `/api/learning-analysis/student/wrong-books/${bookId}/questions/${question.practiceId}/${question.questionId}`,
  ))
}

export function askStudentLearningAssistant(data) {
  return resolve(request.post('/api/learning-analysis/student/assistant', data, { timeout: 400000 }))
}

export function refreshStudentCourseRecommendations() {
  return resolve(request.post('/api/learning-analysis/student/course-recommendations/refresh', {}, { timeout: 40000 }))
}

export function submitLearningEvidence(planId, data) {
  return resolve(request.post(`/api/learning-analysis/student/plans/${planId}/evidence`, data, { timeout: 40000 }))
}
