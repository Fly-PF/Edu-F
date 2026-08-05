import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GewuView from './GewuView.vue'

describe('GewuView', () => {
  it('renders the first LLM demo and switches to the Agent volume catalog', async () => {
    const wrapper = mount(GewuView)

    expect(wrapper.text()).toContain('卷一 · 数理筑基')
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('line[marker-end="url(#ah1)"]').exists()).toBe(true)
    expect(wrapper.find('line[marker-end="url(#ah1)"]').attributes('stroke-width')).toBe('2.5')
    expect(wrapper.findAll('.vol-tab')).toHaveLength(14)

    await wrapper.get('.scroll-tab:nth-of-type(2)').trigger('click')

    expect(wrapper.get('.scroll-tab.active').text()).toBe('第二式 · 矩阵变形')

    await wrapper.get('.vol-tab:nth-of-type(3)').trigger('click')

    expect(wrapper.find('.zone-arena svg').attributes('viewBox')).toBe('0 0 360 440')
    expect(wrapper.find('text[font-size="10"]').exists()).toBe(true)

    await wrapper.get('.book-tab:nth-of-type(2)').trigger('click')

    expect(wrapper.text()).toContain('卷一 · 想做相生 (Harness)')
    expect(wrapper.findAll('.vol-tab')).toHaveLength(10)
    expect(window.location.search).toContain('gewuBook=agent')
    expect(window.location.search).toContain('gewuDemo=harness')
  })
})
