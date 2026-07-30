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

export function listStudentPractices() {
  return resolve(request.get('/api/student/learning-practices'))
}

export function getStudentPractice(practiceId) {
  return resolve(request.get(`/api/student/learning-practices/${practiceId}`))
}

export function submitStudentPractice(practiceId, data) {
  return resolve(request.post(`/api/student/learning-practices/${practiceId}/submissions`, data))
}

export function listTeacherPracticeSubmissions(status) {
  return resolve(request.get('/api/teacher/learning-practices/submissions', {
    params: status ? { status } : undefined,
  }))
}

export function reviewPracticeSubmission(submissionId, data) {
  return resolve(request.patch(`/api/teacher/learning-practices/submissions/${submissionId}/review`, data))
}

export function listTeacherPracticeCourses() {
  return resolve(request.get('/api/teacher/learning-practices/courses'))
}

export function publishTeacherPractice(data) {
  return resolve(request.post('/api/teacher/learning-practices', data))
}

export function deleteTeacherPractice(practiceId) {
  return resolve(request.delete(`/api/teacher/learning-practices/${practiceId}`))
}
