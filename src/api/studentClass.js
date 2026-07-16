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

export function listStudentClasses() {
  return resolve(request.get('/api/student/classes'))
}

export function joinStudentClass(data) {
  return resolve(request.post('/api/student/classes/join', data))
}

export function leaveStudentClass(classId) {
  return resolve(request.delete(`/api/student/classes/${classId}/leave`))
}

export function getStudentClassDetail(classId) {
  return resolve(request.get(`/api/student/classes/${classId}`))
}

export function getStudentClassCourses(classId, params) {
  return resolve(request.get(`/api/student/classes/${classId}/courses`, { params }))
}
