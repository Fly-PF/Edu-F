import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const routerPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPush }),
}))

vi.mock('element-plus', async () => {
  const actual = await vi.importActual('element-plus')
  return {
    ...actual,
    ElMessage: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  }
})

const { default: GovPracticePlaceholder } = await import('./GovPracticePlaceholder.vue')

function createWrapper() {
  return mount(GovPracticePlaceholder, {
    global: {
      stubs: {
        'el-icon': { template: '<span><slot /></span>' },
        'el-button': { template: '<button @click="$emit(\'click\')"><slot /></button>' },
      },
    },
  })
}

describe('GovPracticePlaceholder', () => {
  beforeEach(() => routerPush.mockClear())

  it('shows the practice modes and filters', () => {
    const wrapper = createWrapper()

    expect(wrapper.text()).toContain('智能题库与每日练习')
    expect(wrapper.text()).toContain('专项练习')
    expect(wrapper.text()).toContain('每日一练')
    expect(wrapper.text()).toContain('随机模拟')
    expect(wrapper.text()).toContain('错题重做')
    expect(wrapper.text()).toContain('题库总量')
    expect(wrapper.vm.questionBank).toHaveLength(15)
    expect(wrapper.vm.availableQuestions).toHaveLength(5)
    expect(wrapper.findAll('select')).toHaveLength(2)
    expect(wrapper.vm.availableQuestions.every((question) => question.type === 'SINGLE')).toBe(true)
  })

  it('limits each regular practice session to at most five questions', async () => {
    const wrapper = createWrapper()

    expect(wrapper.vm.availableQuestions.length).toBeLessThanOrEqual(5)
    await wrapper.get('.mode-card:nth-child(3)').trigger('click')
    expect(wrapper.vm.availableQuestions).toHaveLength(5)
    await wrapper.get('.mode-card:nth-child(4)').trigger('click')
    expect(wrapper.vm.availableQuestions.length).toBeLessThanOrEqual(5)
  })

  it('starts a selected mode and produces a report after submitting answers', async () => {
    const wrapper = createWrapper()

    await wrapper.get('.mode-card:nth-child(2)').trigger('click')
    expect(wrapper.vm.selectedMode).toBe('DAILY')
    await wrapper.get('.start-row button').trigger('click')

    expect(wrapper.vm.started).toBe(true)
    const answers = Object.fromEntries(wrapper.vm.availableQuestions.map((question) => [question.id, question.answer]))
    wrapper.vm.selectedAnswers = answers
    await wrapper.vm.submitPractice()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.submitted).toBe(true)
    expect(wrapper.vm.report.score).toBe(100)
    expect(wrapper.text()).toContain('练习完成，来看看结果')
    expect(wrapper.text()).toContain('逐题解析')
  })

  it('returns to the government exam home page', async () => {
    const wrapper = createWrapper()

    await wrapper.get('.back-button').trigger('click')

    expect(routerPush).toHaveBeenCalledWith('/main/gov')
  })

  it('toggles the filter controls when the filter button is clicked', async () => {
    const wrapper = createWrapper()

    expect(wrapper.vm.showFilters).toBe(true)
    await wrapper.get('.filter-toggle').trigger('click')
    expect(wrapper.vm.showFilters).toBe(false)
    expect(wrapper.get('.filter-toggle').text()).toContain('展开筛选')
    await wrapper.get('.filter-toggle').trigger('click')
    expect(wrapper.vm.showFilters).toBe(true)
    expect(wrapper.get('.filter-toggle').text()).toContain('收起筛选')
  })

  it('starts wrong-question practice from the quick link', async () => {
    const wrapper = createWrapper()

    await wrapper.get('.quick-links button').trigger('click')

    expect(wrapper.vm.selectedMode).toBe('WRONG')
    expect(wrapper.vm.started).toBe(true)
    expect(wrapper.vm.availableQuestions).toHaveLength(2)
  })
})
