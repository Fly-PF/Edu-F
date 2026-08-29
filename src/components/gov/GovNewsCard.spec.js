import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GovNewsCard from './GovNewsCard.vue'

const baseNews = {
  id: 18,
  categoryName: '招考公告',
  title: '2027年度国考公告',
  summary: '考试报名安排与注意事项。',
  coverUrl: null,
  isTop: 0,
  publishedAt: '2026-08-27T08:30:45',
}

function mountCard(news = baseNews) {
  return mount(GovNewsCard, {
    props: { news },
    global: {
      stubs: {
        ElIcon: { template: '<i><slot /></i>' },
        ElImage: { props: ['src', 'alt'], template: '<img :src="src" :alt="alt" />' },
      },
    },
  })
}

describe('GovNewsCard final contract display', () => {
  it('renders ISO LocalDateTime as a readable date and handles a null cover', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('2026/08/27')
    expect(wrapper.find('.cover-fallback').exists()).toBe(true)
    expect(wrapper.find('.top-badge').exists()).toBe(false)
  })

  it('shows the top badge only when isTop is 1', () => {
    const wrapper = mountCard({ ...baseNews, isTop: 1, coverUrl: 'https://example.com/cover.jpg' })
    expect(wrapper.find('.top-badge').text()).toContain('置顶')
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/cover.jpg')
  })
})
