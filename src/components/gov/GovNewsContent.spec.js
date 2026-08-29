import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import GovNewsContent from './GovNewsContent.vue'

function mountContent(content) {
  return mount(GovNewsContent, { props: { content } })
}

describe('GovNewsContent', () => {
  it('renders ordinary Markdown', () => {
    const wrapper = mountContent('## 数量关系\n\n这是 **重点**。')
    expect(wrapper.find('h2').text()).toBe('数量关系')
    expect(wrapper.find('strong').text()).toBe('重点')
  })

  it('renders inline LaTeX with KaTeX', () => {
    const wrapper = mountContent('等差数列求和公式：$S\\_n=\\frac{n(a\\_1+a\\_n)}{2}$。')
    expect(wrapper.find('.katex').exists()).toBe(true)
    expect(wrapper.find('.katex-display').exists()).toBe(false)
  })

  it('renders block LaTeX with KaTeX', () => {
    const wrapper = mountContent('$$S\\_n=\\frac{n(a\\_1+a\\_n)}{2}$$')
    expect(wrapper.find('.katex').exists()).toBe(true)
    expect(wrapper.find('.katex-display').exists()).toBe(true)
  })

  it('does not execute or render raw HTML', () => {
    const wrapper = mountContent('<img src=x onerror="window.__govNewsXss = true"><script>window.__govNewsXss = true</script>')
    expect(wrapper.find('script').exists()).toBe(false)
    expect(wrapper.find('[onerror]').exists()).toBe(false)
    expect(globalThis.window.__govNewsXss).not.toBe(true)
  })

  it('keeps ordinary Markdown images in the article flow', () => {
    const wrapper = mountContent('正文前。\n\n![测试图片](https://example.com/test-gov-news/jobs.png)\n\n正文后。')
    const image = wrapper.find('img')
    expect(image.exists()).toBe(true)
    expect(image.attributes('src')).toBe('https://example.com/test-gov-news/jobs.png')
    expect(wrapper.text()).toContain('正文前。')
    expect(wrapper.text()).toContain('正文后。')
  })
})
