import request from '@/utils/request'

function unwrap(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) {
    return response
  }

  if ([200, 201].includes(Number(response.code))) {
    return response.data
  }

  throw new Error(response.message || '考公资讯请求失败')
}

export function normalizeGovNewsCategory(category = {}) {
  return {
    id: category.id ?? null,
    name: category.name ?? '',
    sortOrder: Number(category.sortOrder) || 0,
    status: Number(category.status) || 0,
    createTime: category.createTime ?? null,
    updateTime: category.updateTime ?? null,
  }
}

export function normalizeGovNewsItem(news = {}) {
  return {
    id: news.id ?? null,
    categoryId: news.categoryId ?? null,
    categoryName: news.categoryName ?? '',
    title: news.title ?? '',
    summary: news.summary ?? '',
    coverUrl: news.coverUrl ?? null,
    isTop: Number(news.isTop) === 1 ? 1 : 0,
    status: Number(news.status) || 0,
    publishedAt: news.publishedAt ?? null,
    createTime: news.createTime ?? null,
    updateTime: news.updateTime ?? null,
  }
}

export function normalizeGovNewsDetail(news = {}) {
  return {
    ...normalizeGovNewsItem(news),
    contentMd: news.contentMd ?? '',
  }
}

export function normalizeGovNewsPage(page = {}, fallback = {}) {
  const records = Array.isArray(page.records) ? page.records.map(normalizeGovNewsItem) : []
  return {
    records,
    total: Number(page.total) || 0,
    pageNum: Number(page.pageNum) || Number(fallback.pageNum) || 1,
    pageSize: Number(page.pageSize) || Number(fallback.pageSize) || 10,
  }
}

export async function listGovNewsCategories() {
  const data = unwrap(await request.get('/api/gov/news/categories'))
  return (Array.isArray(data) ? data : []).map(normalizeGovNewsCategory)
}

export async function listGovNews(params = {}) {
  const query = {
    pageNum: Number(params.pageNum) || 1,
    pageSize: Number(params.pageSize) || 10,
  }
  if (params.categoryId !== '' && params.categoryId !== null && params.categoryId !== undefined) {
    query.categoryId = params.categoryId
  }
  const keyword = String(params.keyword || '').trim()
  if (keyword) query.keyword = keyword

  const data = unwrap(await request.get('/api/gov/news', { params: query }))
  return normalizeGovNewsPage(data, query)
}

export async function getGovNewsDetail(newsId) {
  const data = unwrap(await request.get(`/api/gov/news/${encodeURIComponent(newsId)}`))
  return normalizeGovNewsDetail(data)
}

export async function getAdminGovNewsCategories() {
  const data = unwrap(await request.get('/api/admin/gov/news/categories'))
  return (Array.isArray(data) ? data : []).map(normalizeGovNewsCategory)
}

export async function createGovNewsCategory(data) {
  return unwrap(await request.post('/api/admin/gov/news/categories', data))
}

export async function updateGovNewsCategory(id, data) {
  return unwrap(await request.patch(`/api/admin/gov/news/categories/${encodeURIComponent(id)}`, data))
}

export async function updateGovNewsCategoryStatus(id, status) {
  return unwrap(await request.patch(`/api/admin/gov/news/categories/${encodeURIComponent(id)}/status`, { status }))
}

export async function getAdminGovNewsList(params = {}) {
  const data = unwrap(await request.get('/api/admin/gov/news', { params }))
  return normalizeGovNewsPage(data, params)
}

export async function getAdminGovNewsDetail(id) {
  return normalizeGovNewsDetail(unwrap(await request.get(`/api/admin/gov/news/${encodeURIComponent(id)}`)))
}

export async function createGovNews(data) {
  return unwrap(await request.post('/api/admin/gov/news', data))
}

export async function updateGovNews(id, data) {
  return unwrap(await request.put(`/api/admin/gov/news/${encodeURIComponent(id)}`, data))
}

export async function publishGovNews(id) {
  return unwrap(await request.post(`/api/admin/gov/news/${encodeURIComponent(id)}/publish`))
}

export async function offlineGovNews(id) {
  return unwrap(await request.post(`/api/admin/gov/news/${encodeURIComponent(id)}/offline`))
}
