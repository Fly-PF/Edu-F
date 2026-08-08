import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }
vi.mock('@/utils/request', () => ({ default: request }))

const api = await import('./learningAnalysis')

describe('learning analysis API', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads the teacher growth dashboard from its dedicated endpoint', async () => {
    request.get.mockResolvedValue({ code: 200, data: { classId: 20001, risks: [], cases: [] } })
    await expect(api.getTeacherGrowthDashboard(20001)).resolves.toEqual({ classId: 20001, risks: [], cases: [] })
    expect(request.get).toHaveBeenCalledWith('/api/learning-analysis/teacher/classes/20001/dashboard')
  })

  it('submits real student evidence instead of front-end mock feedback', async () => {
    const evidence = { reflection: '完成了本节学习', difficulty: '无', answer: '我的理解是...' }
    request.post.mockResolvedValue({ code: 200, data: { planId: 9, status: 'EVIDENCE_SUBMITTED' } })
    await expect(api.submitLearningEvidence(9, evidence)).resolves.toEqual({ planId: 9, status: 'EVIDENCE_SUBMITTED' })
    expect(request.post).toHaveBeenCalledWith('/api/learning-analysis/student/plans/9/evidence', evidence, { timeout: 40000 })
  })

  it('persists a real wrong question in the selected student book', async () => {
    request.post.mockResolvedValue({ code: 201, data: { id: 3, name: '机器学习', questionCount: 1 } })
    const question = { practiceId: 8, questionId: 19, content: '不会发送到接口' }
    await expect(api.addQuestionToWrongBook(3, question)).resolves.toEqual({
      id: 3,
      name: '机器学习',
      questionCount: 1,
    })
    expect(request.post).toHaveBeenCalledWith('/api/learning-analysis/student/wrong-books/3/questions', {
      practiceId: 8,
      questionId: 19,
    })
  })
})
