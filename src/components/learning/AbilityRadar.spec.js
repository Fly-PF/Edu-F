import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AbilityRadar from './AbilityRadar.vue'

const profile = {
  overallScore: 72,
  pattern: '课程推进突出',
  balanceScore: 78,
  dominantDimensionKey: 'progress',
  priorityDimensionKey: 'continuity',
  dimensions: [
    { key: 'progress', label: '课程推进', score: 82, evidence: '平均完成度 82%', interpretation: '推进顺畅' },
    { key: 'investment', label: '学习投入', score: 70, evidence: '累计 160 分钟', interpretation: '投入稳定' },
    { key: 'continuity', label: '学习连续性', score: 60, evidence: '近 7 天活跃 2 次', interpretation: '需要提频' },
  ],
}

describe('AbilityRadar', () => {
  it('renders the server-defined profile shape and one evidence list', () => {
    const wrapper = mount(AbilityRadar, { props: { profile } })

    expect(wrapper.get('svg').attributes('aria-label')).toContain('课程推进 82分')
    expect(wrapper.get('.radar-area').attributes('points').split(' ')).toHaveLength(3)
    expect(wrapper.get('.profile-type').text()).toContain('课程推进突出')
    expect(wrapper.get('.profile-signals').text()).toContain('课程推进')
    expect(wrapper.findAll('.dimension-evidence > div')).toHaveLength(3)
  })
})
