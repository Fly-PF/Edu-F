import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = { post: vi.fn() }
vi.mock('@/utils/request', () => ({ default: request }))

const api = await import('./teacherAi')

describe('teacher AI API error handling', () => {
  beforeEach(() => vi.clearAllMocks())

  it('prefers a readable backend AI error message', async () => {
    request.post.mockResolvedValue({ code: 500, message: 'AI模型返回结果无效：答案优点缺失' })

    await expect(api.generateGrading({})).rejects.toThrow('AI模型返回结果无效：答案优点缺失')
  })

  it('distinguishes network and timeout failures', async () => {
    request.post
      .mockRejectedValueOnce(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK', isNetworkError: true }))
      .mockRejectedValueOnce(Object.assign(new Error('timeout exceeded'), { code: 'ECONNABORTED', isNetworkError: true }))

    await expect(api.generateGrading({})).rejects.toThrow('网络连接异常，请检查网络后重试。')
    await expect(api.generateLessonPlan({})).rejects.toThrow('AI 服务响应超时，请稍后重试。')
  })

  it('distinguishes invalid parameters from an AI generation failure', async () => {
    request.post
      .mockResolvedValueOnce({ code: 400, message: '' })
      .mockResolvedValueOnce({ code: 500, message: '服务器异常' })

    await expect(api.generateGrading({})).rejects.toThrow('请求参数有误，请检查填写内容后重试。')
    await expect(api.generateLessonPlan({})).rejects.toThrow('AI 生成失败，请稍后重试。')
  })

  it('does not expose credentials returned in an unsafe error message', async () => {
    request.post.mockResolvedValue({ code: 500, message: 'Authorization: Bearer secret-token' })

    const error = await api.generateGrading({}).catch((caught) => caught)
    expect(error.message).toBe('AI 生成失败，请稍后重试。')
    expect(error.message).not.toContain('secret-token')
  })
})
