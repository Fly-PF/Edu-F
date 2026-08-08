const COMPLETED_STATUS_VALUES = new Set(['COMPLETE', 'COMPLETED', 'DONE', 'FINISHED'])

export function isCourseCompleted(course) {
  if (!course || typeof course !== 'object') return false

  if (Number(course.studyStatus) === 2 || Number(course.finishStatus) === 1) return true
  if (Number(course.progress) >= 100) return true

  return [course.status, course.courseStatus, course.learningStatus]
    .some(value => COMPLETED_STATUS_VALUES.has(String(value || '').trim().toUpperCase()))
}
