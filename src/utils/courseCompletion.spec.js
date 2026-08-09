import { describe, expect, it } from 'vitest'
import { isCourseCompleted } from './courseCompletion'

describe('isCourseCompleted', () => {
  it('recognizes the numeric completion fields used by course records', () => {
    expect(isCourseCompleted({ studyStatus: 2 })).toBe(true)
    expect(isCourseCompleted({ finishStatus: 1 })).toBe(true)
    expect(isCourseCompleted({ progress: 100 })).toBe(true)
  })

  it('recognizes completed status text from dashboard responses', () => {
    expect(isCourseCompleted({ status: 'COMPLETED' })).toBe(true)
    expect(isCourseCompleted({ learningStatus: 'done' })).toBe(true)
  })

  it('keeps incomplete courses eligible for reminders', () => {
    expect(isCourseCompleted({ studyStatus: 1, progress: 80, deadline: '2030-01-01' })).toBe(false)
  })
})
