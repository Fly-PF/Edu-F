import request from '@/utils/request'

export function getTeacherClassDetail(classId) {
  return request.get(`/api/teacher/classes/${classId}`)
}

export function getClassInviteCode(classId) {
  return request.get(`/api/teacher/classes/${classId}/invite-code`)
}

export function refreshClassInviteCode(classId) {
  return request.post(`/api/teacher/classes/${classId}/invite-code/refresh`)
}

export function getClassStudents(classId, params) {
  return request.get(`/api/teacher/classes/${classId}/students`, { params })
}

export function removeClassStudent(classId, studentId) {
  return request.delete(`/api/teacher/classes/${classId}/students/${studentId}`)
}

export function assignCourseToClass(data) {
  return request.post('/api/teacher/course-assignments', data)
}

export function getClassAssignedCourses(classId, params) {
  return request.get(`/api/teacher/classes/${classId}/courses`, { params })
}

export function getClassAssignableCourses(classId, params) {
  return request.get(`/api/teacher/classes/${classId}/assignable-courses`, { params })
}

export function updateAssignedCourseDeadline(classId, courseId, deadline) {
  return request.patch(`/api/teacher/classes/${classId}/courses/${courseId}/deadline`, { deadline })
}

export function removeAssignedCourse(classId, courseId) {
  return request.delete(`/api/teacher/classes/${classId}/courses/${courseId}`)
}

export function getClassCourseStudyRecords(classId, courseId, params) {
  return request.get(`/api/teacher/classes/${classId}/courses/${courseId}/study-records`, { params })
}

export function getStudentCourseStudyRecords(classId, courseId, studentId) {
  return request.get(`/api/teacher/classes/${classId}/courses/${courseId}/students/${studentId}/study-records`)
}
