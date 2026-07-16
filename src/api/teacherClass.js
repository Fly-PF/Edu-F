import request from '@/utils/request'

export function getTeacherClassList(params) {
  return request.get('/api/teacher/classes', { params })
}

export function createTeacherClass(data) {
  return request.post('/api/teacher/classes', data)
}

export function updateTeacherClass(classId, data) {
  return request.put(`/api/teacher/classes/${classId}`, data)
}

export function updateTeacherClassStatus(classId, data) {
  return request.patch(`/api/teacher/classes/${classId}/status`, data)
}

export function deleteTeacherClass(classId) {
  return request.delete(`/api/teacher/classes/${classId}`)
}
