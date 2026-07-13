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

export function listPublicCourses(params = {}) {
  return resolve(request.get('/api/courses', { params }))
}

export function getCourse(courseId) {
  return resolve(request.get(`/api/courses/${courseId}`))
}

export function getCourseChapters(courseId) {
  return resolve(request.get(`/api/courses/${courseId}/chapters`))
}

export function listCourseStudyRecords(courseId) {
  return resolve(request.get(`/api/courses/${courseId}/study-records`))
}

export function saveCourseStudyRecord(courseId, data) {
  return resolve(request.post(`/api/courses/${courseId}/study-records`, data))
}

export function listStudentPublicCourses(params = {}) {
  return resolve(request.get('/api/student/public-courses', { params }))
}

export function getStudentPublicCourse(courseId) {
  return resolve(request.get(`/api/student/public-courses/${courseId}`))
}

export function getStudentCourse(courseId, params = {}) {
  return resolve(request.get(`/api/student/courses/${courseId}`, { params }))
}

export function getStudentCourseChapters(courseId, params = {}) {
  return resolve(request.get(`/api/student/courses/${courseId}/chapters`, { params }))
}

export function listStudentCourseStudyRecords(courseId, params = {}) {
  return resolve(request.get(`/api/student/courses/${courseId}/study-records`, { params }))
}

export function saveStudentCourseStudyRecord(courseId, data) {
  return resolve(request.post('/api/student/study-records', { ...data, courseId }))
}

export function listTeacherCourses(params = {}) {
  return resolve(request.get('/api/teacher/courses', { params }))
}

export function createCourse(data) {
  return resolve(request.post('/api/teacher/courses', data))
}

export function getTeacherCourse(courseId) {
  return resolve(request.get(`/api/teacher/courses/${courseId}`))
}

export function updateCourse(courseId, data) {
  return resolve(request.put(`/api/teacher/courses/${courseId}`, data))
}

export function deleteCourse(courseId) {
  return resolve(request.delete(`/api/teacher/courses/${courseId}`))
}

export function publishCourse(courseId) {
  return resolve(request.post(`/api/teacher/courses/${courseId}/publish`))
}

export function uploadCourseCover(courseId, file, onUploadProgress) {
  const data = new FormData()
  data.append('file', file)
  return resolve(request.post(`/api/teacher/courses/${courseId}/cover`, data, { onUploadProgress }))
}

export function getTeacherCourseChapters(courseId) {
  return resolve(request.get(`/api/teacher/courses/${courseId}/chapters`))
}

export function createChapter(courseId, data) {
  return resolve(request.post(`/api/teacher/courses/${courseId}/chapters`, data))
}

export function updateChapter(courseId, chapterId, data) {
  return resolve(request.patch(`/api/teacher/courses/${courseId}/chapters/${chapterId}`, data))
}

export function deleteChapter(courseId, chapterId) {
  return resolve(request.delete(`/api/teacher/courses/${courseId}/chapters/${chapterId}`))
}

export function reorderChapters(courseId, data) {
  return resolve(request.patch(`/api/teacher/courses/${courseId}/chapters/reorder`, data))
}

export function createExternalResource(courseId, chapterId, data) {
  return resolve(request.post(`/api/teacher/courses/${courseId}/chapters/${chapterId}/resources`, data))
}

export function uploadCourseResource(courseId, chapterId, file, duration, onUploadProgress) {
  const data = new FormData()
  data.append('file', file)
  const params = duration == null ? undefined : { duration }
  return resolve(
    request.post(`/api/teacher/courses/${courseId}/chapters/${chapterId}/resources/upload`, data, {
      params,
      onUploadProgress,
      timeout: 0,
    }),
  )
}

export function updateResource(courseId, chapterId, resourceId, data) {
  return resolve(
    request.patch(
      `/api/teacher/courses/${courseId}/chapters/${chapterId}/resources/${resourceId}`,
      data,
    ),
  )
}

export function deleteResource(courseId, chapterId, resourceId) {
  return resolve(
    request.delete(
      `/api/teacher/courses/${courseId}/chapters/${chapterId}/resources/${resourceId}`,
    ),
  )
}
