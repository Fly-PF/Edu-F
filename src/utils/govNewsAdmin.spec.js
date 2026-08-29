import { describe, expect, it } from 'vitest'
import { buildGovNewsCategoryPayload, buildGovNewsPayload, getGovNewsStatusMeta, toIsTop } from './govNewsAdmin'

describe('gov news admin helpers', () => {
  it('maps all news statuses', () => {
    expect([0, 1, 2].map(value => getGovNewsStatusMeta(value).label)).toEqual(['草稿', '已发布', '已下架'])
  })
  it('converts isTop to backend numbers', () => {
    expect([toIsTop(true), toIsTop(1), toIsTop(false), toIsTop(0)]).toEqual([1, 1, 0, 0])
  })
  it('builds exact create and update payload', () => {
    expect(buildGovNewsPayload({ categoryId: '3', title: ' 标题 ', summary: ' 摘要 ', coverUrl: '', isTop: true, contentMd: ' # 正文 ' })).toEqual({ categoryId: 3, title: '标题', summary: '摘要', coverUrl: null, isTop: 1, contentMd: '# 正文' })
  })
  it('builds category create and edit payload', () => {
    expect(buildGovNewsCategoryPayload({ name: ' 公告 ', sortOrder: '10' })).toEqual({ name: '公告', sortOrder: 10 })
  })
})
