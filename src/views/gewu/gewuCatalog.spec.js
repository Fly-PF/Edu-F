import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import GewuCodex from './GewuCodex.vue'
import { GEWU_BOOKS } from './gewuCatalog.js'

function demoById(id) {
  const book = GEWU_BOOKS.find((item) => item.volumes.some((volume) => volume.scrolls.some((scroll) => scroll.id === id)))
  const volume = book.volumes.find((item) => item.scrolls.some((scroll) => scroll.id === id))
  const scroll = volume.scrolls.find((item) => item.id === id)
  return { ...scroll.demo, id: scroll.id, bookId: book.id, volume }
}

describe('Gewu catalog', () => {
  it('registers the 14 LLM volumes, 10 Agent volumes, and all 45 demos', () => {
    const [llmBook, agentBook] = GEWU_BOOKS
    const demos = GEWU_BOOKS.flatMap((book) => book.volumes.flatMap((volume) => volume.scrolls))

    expect(llmBook.volumes).toHaveLength(14)
    expect(agentBook.volumes).toHaveLength(10)
    expect(demos).toHaveLength(45)
  })

  it('keeps every demo interactive configuration intact', () => {
    const demos = GEWU_BOOKS.flatMap((book) => book.volumes.flatMap((volume) => volume.scrolls))

    demos.forEach(({ demo }) => {
      expect(demo).toMatchObject({
        title: expect.any(String),
        lines: expect.any(Array),
        initial: expect.any(Object),
        compute: expect.any(Function),
        note: expect.any(Function),
        Viz: expect.any(Function),
        learningGoal: expect.any(String),
        runtimeLabel: expect.any(String),
      })
      expect(demo.challenge).toBeTruthy()
    })
  })

  it('renders every demo visualization through the shared Vue arena', () => {
    GEWU_BOOKS.forEach((book) => {
      book.volumes.forEach((volume) => {
        volume.scrolls.forEach((scroll) => {
          const wrapper = mount(GewuCodex, {
            props: {
              demo: { ...scroll.demo, id: scroll.id, volume },
            },
          })

          expect(wrapper.find('.arena svg').exists()).toBe(true)
          wrapper.unmount()
        })
      })
    })
  })

  it('renders controls for parameters that are not embedded in code lines', () => {
    const harness = mount(GewuCodex, { props: { demo: demoById('harness') } })
    const bpe = mount(GewuCodex, { props: { demo: demoById('bpe') } })
    const team = mount(GewuCodex, { props: { demo: demoById('agentteam') } })

    expect(harness.find('.param-controls').text()).toContain('演示轨迹')
    expect(bpe.find('.param-controls').text()).toContain('合并次数')
    expect(team.findAll('.param-control')).toHaveLength(2)

    harness.unmount()
    bpe.unmount()
    team.unmount()
  })

  it('shows matrix output immediately after changing W', async () => {
    const wrapper = mount(GewuCodex, { props: { demo: demoById('mat') } })

    expect(wrapper.find('.zone-arena').text()).toContain('原始位置')
    await wrapper.find('.live-num').trigger('keydown', { key: 'ArrowRight' })

    expect(wrapper.find('.zone-arena').text()).toContain('变换后 (words @ W)')
    expect(wrapper.find('.zone-arena').text()).toContain('[3,3]')
    wrapper.unmount()
  })

  it('keeps low-score RAG candidates out of citations and refuses unsupported questions', () => {
    const rag = demoById('rag')
    const matched = rag.compute({ qi: 0, minScore: 0.15 })
    const unsupported = rag.compute({ qi: 3, minScore: 0.15 })

    expect(matched.citations).toEqual([2])
    expect(matched.hasEvidence).toBe(true)
    expect(unsupported.citations).toEqual([])
    expect(unsupported.hasEvidence).toBe(false)
  })
})
