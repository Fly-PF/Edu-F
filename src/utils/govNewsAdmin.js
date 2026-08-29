export const GOV_NEWS_STATUS = Object.freeze({
  0: { label: '草稿', type: 'info' },
  1: { label: '已发布', type: 'success' },
  2: { label: '已下架', type: 'warning' },
})

export function getGovNewsStatusMeta(status) {
  return GOV_NEWS_STATUS[Number(status)] || { label: '未知', type: 'info' }
}

export function toIsTop(value) {
  return value === true || Number(value) === 1 ? 1 : 0
}

export function buildGovNewsPayload(form) {
  return {
    categoryId: Number(form.categoryId),
    title: String(form.title || '').trim(),
    summary: String(form.summary || '').trim(),
    coverUrl: String(form.coverUrl || '').trim() || null,
    isTop: toIsTop(form.isTop),
    contentMd: String(form.contentMd || '').trim(),
  }
}

export function buildGovNewsCategoryPayload(form) {
  return { name: String(form.name || '').trim(), sortOrder: Number(form.sortOrder) || 0 }
}
