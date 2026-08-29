import { beforeEach, describe, expect, it, vi } from 'vitest'

const request = { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }
vi.mock('@/utils/request', () => ({ default: request }))

const api = await import('./govNews')

const categoryResponse = {
  code: 200,
  message: '查询成功',
  data: [{
    id: 3,
    name: '招考公告',
    sortOrder: 10,
    status: 1,
    createTime: '2026-08-27T09:10:11',
    updateTime: '2026-08-27T10:11:12',
  }],
}

const listRecord = {
  id: 18,
  categoryId: 3,
  categoryName: '招考公告',
  title: '2027年度国考公告',
  summary: '考试报名安排与注意事项。',
  coverUrl: null,
  isTop: 1,
  status: 1,
  publishedAt: '2026-08-27T08:30:45',
  createTime: '2026-08-27T08:00:00',
  updateTime: '2026-08-27T08:20:00',
}

describe('gov news API final contract', () => {
  beforeEach(() => vi.clearAllMocks())

  it('unwraps and preserves the confirmed category fields', async () => {
    request.get.mockResolvedValue(categoryResponse)
    await expect(api.listGovNewsCategories()).resolves.toEqual(categoryResponse.data)
    expect(request.get).toHaveBeenCalledWith('/api/gov/news/categories')
  })

  it('passes category, keyword and PageResult parameters', async () => {
    request.get.mockResolvedValue({
      code: 200,
      message: '查询成功',
      data: { records: [listRecord], total: 21, pageNum: 2, pageSize: 10 },
    })
    const result = await api.listGovNews({ categoryId: 3, keyword: ' 国考 ', pageNum: 2, pageSize: 10 })

    expect(request.get).toHaveBeenCalledWith('/api/gov/news', {
      params: { categoryId: 3, keyword: '国考', pageNum: 2, pageSize: 10 },
    })
    expect(result).toEqual({ records: [listRecord], total: 21, pageNum: 2, pageSize: 10 })
    expect(result.records[0]).not.toHaveProperty('contentMd')
  })

  it('keeps null covers, numeric top flags and ISO LocalDateTime values', () => {
    expect(api.normalizeGovNewsItem(listRecord)).toMatchObject({
      coverUrl: null,
      isTop: 1,
      publishedAt: '2026-08-27T08:30:45',
    })
    expect(api.normalizeGovNewsItem({ ...listRecord, isTop: 0 })).toMatchObject({ isTop: 0 })
  })

  it('returns a defensive empty records array for an empty PageResult', async () => {
    request.get.mockResolvedValue({
      code: 200,
      message: '查询成功',
      data: { records: [], total: 0, pageNum: 1, pageSize: 10 },
    })
    await expect(api.listGovNews()).resolves.toEqual({ records: [], total: 0, pageNum: 1, pageSize: 10 })
  })

  it('reads contentMd only from the confirmed detail response', async () => {
    const detail = {
      ...listRecord,
      contentMd: '# 报考说明\n\n公式：$E=mc^2$\n\n![流程图](https://example.com/flow.png)',
    }
    request.get.mockResolvedValue({ code: 200, message: '查询成功', data: detail })

    await expect(api.getGovNewsDetail('18')).resolves.toEqual(detail)
    expect(request.get).toHaveBeenCalledWith('/api/gov/news/18')
  })

  it('surfaces the backend error message', async () => {
    request.get.mockResolvedValue({ code: 500, message: '资讯服务不可用', data: null })
    await expect(api.listGovNews()).rejects.toThrow('资讯服务不可用')
  })
})

describe('gov news admin API contract', () => {
  beforeEach(() => vi.clearAllMocks())
  const ok = { code: 200, message: '操作成功', data: null }

  it('uses category paths and PATCH methods', async () => {
    request.get.mockResolvedValue(categoryResponse)
    request.post.mockResolvedValue(ok); request.patch.mockResolvedValue(ok)
    await api.getAdminGovNewsCategories()
    await api.createGovNewsCategory({ name: '公告', sortOrder: 10 })
    await api.updateGovNewsCategory(3, { name: '招考公告', sortOrder: 20 })
    await api.updateGovNewsCategoryStatus(3, 0)
    expect(request.get).toHaveBeenCalledWith('/api/admin/gov/news/categories')
    expect(request.post).toHaveBeenCalledWith('/api/admin/gov/news/categories', { name: '公告', sortOrder: 10 })
    expect(request.patch).toHaveBeenCalledWith('/api/admin/gov/news/categories/3', { name: '招考公告', sortOrder: 20 })
    expect(request.patch).toHaveBeenCalledWith('/api/admin/gov/news/categories/3/status', { status: 0 })
  })

  it('uses exact news list, detail, create and edit requests', async () => {
    request.get.mockResolvedValueOnce({ code: 200, data: { records: [], total: 0, pageNum: 1, pageSize: 10 } }).mockResolvedValueOnce({ code: 200, data: { ...listRecord, contentMd: '# 正文' } })
    request.post.mockResolvedValue(ok); request.put.mockResolvedValue(ok)
    const payload = { categoryId: 3, title: '标题', summary: '', coverUrl: null, isTop: 1, contentMd: '# 正文' }
    await api.getAdminGovNewsList({ status: 0, pageNum: 1, pageSize: 10 })
    await api.getAdminGovNewsDetail(18)
    await api.createGovNews(payload); await api.updateGovNews(18, payload)
    expect(request.get).toHaveBeenCalledWith('/api/admin/gov/news', { params: { status: 0, pageNum: 1, pageSize: 10 } })
    expect(request.get).toHaveBeenCalledWith('/api/admin/gov/news/18')
    expect(request.post).toHaveBeenCalledWith('/api/admin/gov/news', payload)
    expect(request.put).toHaveBeenCalledWith('/api/admin/gov/news/18', payload)
  })

  it('uses POST for publish and offline actions', async () => {
    request.post.mockResolvedValue(ok)
    await api.publishGovNews(18); await api.offlineGovNews(18)
    expect(request.post).toHaveBeenCalledWith('/api/admin/gov/news/18/publish')
    expect(request.post).toHaveBeenCalledWith('/api/admin/gov/news/18/offline')
  })
})
