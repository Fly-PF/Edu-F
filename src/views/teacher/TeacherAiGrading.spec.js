import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  routeQuery: {},
  routerPush: vi.fn().mockResolvedValue(undefined),
  message: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
  getTeacherPracticeSubmission: vi.fn().mockResolvedValue(null),
  userStore: {
    userId: 'teacher-a',
    username: 'teacher-a',
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mocks.routeQuery }),
  useRouter: () => ({ push: mocks.routerPush }),
}))

vi.mock('element-plus', () => ({ ElMessage: mocks.message }))
vi.mock('@element-plus/icons-vue', () => ({
  Back: {},
  CircleCheck: {},
  CopyDocument: {},
  Delete: {},
  MagicStick: {},
  Plus: {},
  RefreshLeft: {},
}))
vi.mock('@/api/teacherAi', () => ({ generateGrading: vi.fn() }))
vi.mock('@/api/learningPractice', () => ({
  getTeacherPracticeSubmission: mocks.getTeacherPracticeSubmission,
  saveTeacherPracticeAiDraft: vi.fn(),
}))
vi.mock('@/stores/user', () => ({ useUserStore: () => mocks.userStore }))

const passthrough = (template, setup = () => ({})) => ({ setup, template })

const gradingWorkspaceStub = passthrough(
  '<div><slot name="input" :actions="inputActions" /><slot name="result" /><slot /></div>',
  () => ({
    inputActions: { clear: vi.fn(), submit: vi.fn() },
  }),
)
const rubricEditorStub = passthrough(
  '<div><slot :actions="actions" /></div>',
  () => ({
    actions: { add: vi.fn(), remove: vi.fn(), validate: vi.fn() },
  }),
)
const manualReviewStub = passthrough(
  '<div><slot :actions="actions" /></div>',
  () => ({ actions: { copy: vi.fn() } }),
)
const gradingReportStub = passthrough('<div><slot /></div>')

const elementButtonStub = {
  props: ['disabled', 'loading'],
  template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
}
const elementFormStub = {
  setup(_props, { expose }) {
    expose({
      clearValidate: vi.fn(),
      validateField: vi.fn().mockResolvedValue(true),
    })
  },
  template: '<form><slot /></form>',
}

const { default: TeacherAiGrading } = await import('./TeacherAiGrading.vue')

function createWrapper() {
  return mount(TeacherAiGrading, {
    global: {
      stubs: {
        GradingWorkspace: gradingWorkspaceStub,
        GradingReport: gradingReportStub,
        RubricEditor: rubricEditorStub,
        ManualReviewWorkspace: manualReviewStub,
        'el-button': elementButtonStub,
        'el-form': elementFormStub,
        'el-form-item': passthrough('<label><slot /></label>'),
        'el-icon': passthrough('<span><slot /></span>'),
        'el-input': passthrough('<textarea />'),
        'el-input-number': passthrough('<input />'),
        'el-option': passthrough('<option><slot /></option>'),
        'el-progress': passthrough('<div />'),
        'el-select': passthrough('<select><slot /></select>'),
        'el-tooltip': passthrough('<span><slot /></span>'),
      },
    },
  })
}

function setValidGradingResult(wrapper) {
  wrapper.vm.gradingForm.question = '监督学习与无监督学习的区别'
  wrapper.vm.gradingResult = {
    totalScore: 8,
    dimensionScores: [{ criterion: '概念准确性', score: 4, maxScore: 4 }],
    strengths: ['能够区分两类学习方式'],
    deductions: [],
    suggestions: ['补充应用案例'],
  }
}

async function persistManualDraft(wrapper) {
  wrapper.vm.gradingResultInputSignature = wrapper.vm.createGradingInputSignature()
  wrapper.vm.teacherScore = 7.5
  wrapper.vm.reviewComment = '补充案例说明'
  await wrapper.vm.$nextTick()
}

describe('TeacherAiGrading learning insight navigation', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    mocks.routeQuery = {}
    mocks.routerPush.mockClear()
    mocks.message.error.mockClear()
    mocks.message.success.mockClear()
    mocks.message.warning.mockClear()
    mocks.getTeacherPracticeSubmission.mockClear()
    mocks.getTeacherPracticeSubmission.mockResolvedValue(null)
  })

  it('saves and navigates for a manual grading result', async () => {
    const wrapper = createWrapper()
    setValidGradingResult(wrapper)
    await wrapper.vm.$nextTick()

    await wrapper.get('.insight-next-lesson').trigger('click')

    expect(mocks.routerPush).toHaveBeenCalledWith({
      name: 'teacher-ai-preparation',
      query: { topic: '监督学习与无监督学习的区别' },
    })
    expect(window.localStorage.getItem('edu-f:teacher-ai:learning-insights')).toContain('监督学习与无监督学习')
    expect(mocks.message.warning).not.toHaveBeenCalled()
  })

  it('keeps the practice submission context when navigating', async () => {
    mocks.routeQuery = { submissionId: '42', questionId: '7', courseId: '9' }
    mocks.getTeacherPracticeSubmission.mockResolvedValue({
      submissionId: 42,
      courseId: 9,
      answers: [],
    })
    const wrapper = createWrapper()
    setValidGradingResult(wrapper)
    await wrapper.vm.$nextTick()

    await wrapper.get('.insight-next-lesson').trigger('click')

    expect(mocks.routerPush).toHaveBeenCalledWith({
      name: 'teacher-ai-preparation',
      query: { topic: '监督学习与无监督学习的区别', courseId: '9', submissionId: '42' },
    })
    expect(window.localStorage.getItem('edu-f:teacher-ai:learning-insights')).toContain('"submissionId":"42"')
  })

  it('blocks navigation and explains when there is no valid grading result', async () => {
    const wrapper = createWrapper()

    await wrapper.vm.useLearningInsightForPreparation()

    expect(mocks.routerPush).not.toHaveBeenCalled()
    expect(mocks.message.warning).toHaveBeenCalledWith('完成一次有效批改后，才能带入学习反馈。')
  })

  it('restores a manual draft after returning from preparation', async () => {
    const firstWrapper = createWrapper()
    setValidGradingResult(firstWrapper)
    await persistManualDraft(firstWrapper)
    await firstWrapper.vm.useLearningInsightForPreparation()
    firstWrapper.unmount()

    mocks.routeQuery = {}
    const restoredWrapper = createWrapper()
    await restoredWrapper.vm.$nextTick()

    expect(restoredWrapper.vm.gradingForm.question).toBe('监督学习与无监督学习的区别')
    expect(restoredWrapper.vm.gradingForm.studentAnswer).toBe('')
    expect(restoredWrapper.vm.gradingForm.rubric[0].criterion).toBe('知识准确性')
    expect(restoredWrapper.vm.gradingResult.totalScore).toBe(8)
    expect(restoredWrapper.vm.teacherScore).toBe(7.5)
    expect(restoredWrapper.vm.reviewComment).toBe('补充案例说明')
  })

  it('restores the same manual draft after a page refresh', async () => {
    const firstWrapper = createWrapper()
    setValidGradingResult(firstWrapper)
    firstWrapper.vm.gradingForm.studentAnswer = '模型通过样本学习输入和输出之间的关系。'
    await persistManualDraft(firstWrapper)
    firstWrapper.unmount()

    const refreshedWrapper = createWrapper()
    await refreshedWrapper.vm.$nextTick()

    expect(refreshedWrapper.vm.gradingForm.studentAnswer).toContain('模型通过样本')
    expect(refreshedWrapper.vm.gradingResult.totalScore).toBe(8)
  })

  it('clears the manual draft together with the grading result', async () => {
    const wrapper = createWrapper()
    setValidGradingResult(wrapper)
    await persistManualDraft(wrapper)
    expect(window.sessionStorage.getItem('edu-f:teacher-ai:manual-grading-draft')).not.toBeNull()

    wrapper.vm.clearGradingForm()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.gradingResult).toBeNull()
    expect(window.sessionStorage.getItem('edu-f:teacher-ai:manual-grading-draft')).toBeNull()
  })

  it('does not restore or overwrite a manual draft in practice mode', async () => {
    window.sessionStorage.setItem('edu-f:teacher-ai:manual-grading-draft', JSON.stringify({
      mode: 'manual',
      gradingForm: { question: '手工旧题目', rubric: [] },
      gradingResult: { totalScore: 10 },
    }))
    mocks.routeQuery = { submissionId: '42', questionId: '7', returnStatus: 'SUBMITTED' }

    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.gradingForm.question).not.toBe('手工旧题目')
    expect(window.sessionStorage.getItem('edu-f:teacher-ai:manual-grading-draft')).toContain('手工旧题目')
  })

  it('labels the evidence score as the AI suggestion', async () => {
    const wrapper = createWrapper()
    setValidGradingResult(wrapper)
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.ai-analysis-disclosure__summary-score b').text()).toContain('AI建议 8 / 10')
  })

  it('uses the confirmed teacher review in learning insight and replaces it with the latest review', async () => {
    const wrapper = createWrapper()
    setValidGradingResult(wrapper)

    wrapper.vm.handleReviewChange({
      score: 7.5,
      opinion: '补充边界条件说明',
      status: 'modified',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.learningInsight.errorPatterns).toContain('补充边界条件说明')
    expect(wrapper.vm.learningInsight.teachingSuggestions).toContain('根据教师审核意见，下一步教学可关注：补充边界条件说明')

    wrapper.vm.handleReviewChange({
      score: 7.5,
      opinion: '增加对比案例练习',
      status: 'modified',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.learningInsight.errorPatterns).not.toContain('补充边界条件说明')
    expect(wrapper.vm.learningInsight.errorPatterns).toContain('增加对比案例练习')
    expect(window.localStorage.getItem('edu-f:teacher-ai:learning-insights')).toContain('增加对比案例练习')
  })
})
