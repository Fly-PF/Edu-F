import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  areTopicsRelated,
  buildLearningInsight,
  createEmptyLearningInsight,
  hasLearningInsight,
  loadLearningInsight,
  saveLearningInsight,
} from './teacherAiLearningInsight'

const insight = {
  masteredPoints: ['概念定义'],
  weakPoints: ['区别完整性'],
  errorPatterns: ['关键条件遗漏'],
  teachingSuggestions: ['增加对比练习'],
}

describe('teacher AI learning insight context matching', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('reuses feedback for the same topic', () => {
    saveLearningInsight(insight, {
      sourceQuestion: '监督学习与无监督学习的区别',
      sourceTopic: '监督学习与无监督学习',
      courseId: 12,
      classId: 7,
      submissionId: 99,
    })

    const result = loadLearningInsight({
      sourceTopic: '监督学习与无监督学习',
      courseId: 12,
      classId: 7,
    })

    expect(result.weakPoints).toEqual(['区别完整性'])
    expect(result.courseId).toBe('12')
    expect(result.classId).toBe('7')
    expect(result.createdAt).toBeTruthy()
  })

  it('does not reuse feedback from a different topic', () => {
    saveLearningInsight(insight, {
      sourceQuestion: '监督学习与无监督学习的区别',
      sourceTopic: '监督学习与无监督学习',
    })

    const result = loadLearningInsight({
      sourceTopic: '冒泡排序与快速排序',
    })

    expect(hasLearningInsight(result)).toBe(false)
    expect(result).toEqual(createEmptyLearningInsight())
  })

  it('returns an empty insight when no stored record matches', () => {
    saveLearningInsight(insight, {
      sourceTopic: '函数图像平移',
      courseId: 3,
    })

    const result = loadLearningInsight({
      sourceTopic: '递归算法设计',
      courseId: 4,
    })

    expect(hasLearningInsight(result)).toBe(false)
    expect(result.sourceTopic).toBe('')
  })

  it('rematches immediately when the current preparation topic changes', () => {
    saveLearningInsight(insight, {
      sourceTopic: '监督学习与无监督学习',
    })

    const matched = loadLearningInsight({ sourceTopic: '监督学习与无监督学习' })
    const changedTopic = loadLearningInsight({ sourceTopic: '冒泡排序与快速排序' })

    expect(hasLearningInsight(matched)).toBe(true)
    expect(hasLearningInsight(changedTopic)).toBe(false)
  })

  it('does not keep the previous feedback after the current topic is cleared', () => {
    saveLearningInsight(insight, {
      sourceTopic: '监督学习与无监督学习',
    })

    expect(hasLearningInsight(loadLearningInsight({ sourceTopic: '' }))).toBe(false)
  })

  it('matches from local storage after the module is reloaded', async () => {
    saveLearningInsight(insight, {
      sourceQuestion: '监督学习与无监督学习的区别',
      sourceTopic: '监督学习与无监督学习',
    })

    vi.resetModules()
    const reloadedModule = await import('./teacherAiLearningInsight')
    const result = reloadedModule.loadLearningInsight({
      sourceTopic: '监督学习与无监督学习',
    })

    expect(reloadedModule.hasLearningInsight(result)).toBe(true)
    expect(result.weakPoints).toEqual(['区别完整性'])
  })

  it('matches a full question with its concise course topic', () => {
    expect(areTopicsRelated(
      '请说明 Python 中列表（list）和元组（tuple）的主要区别，并结合实际场景说明它们分别适合在什么情况下使用。',
      'Python 列表与元组的区别及应用场景',
    )).toBe(true)
  })

  it('matches a concise topic covered by a longer paraphrased question', () => {
    expect(areTopicsRelated(
      '请分析数据结构中列表和元组的差异与使用方式。',
      '列表与元组区别',
    )).toBe(true)
  })

  it('does not match unrelated algorithm and learning-model topics', () => {
    expect(areTopicsRelated('监督学习与无监督学习', '冒泡排序与快速排序')).toBe(false)
  })

  it('restores insight for a same-teacher synonymous topic', () => {
    saveLearningInsight(insight, {
      ownerId: 'teacher-same',
      sourceQuestion: '请说明 Python 中列表（list）和元组（tuple）的主要区别。',
      sourceTopic: 'Python 列表与元组',
    })

    const result = loadLearningInsight({
      ownerId: 'teacher-same',
      sourceTopic: 'Python 列表与元组的区别及应用场景',
    })

    expect(result.weakPoints).toEqual(['区别完整性'])
  })

  it('does not expose a synonymous topic to another teacher', () => {
    saveLearningInsight(insight, {
      ownerId: 'teacher-a',
      sourceQuestion: '请说明 Python 中列表（list）和元组（tuple）的主要区别。',
      sourceTopic: 'Python 列表与元组',
    })

    const result = loadLearningInsight({
      ownerId: 'teacher-b',
      sourceTopic: 'Python 列表与元组的区别及应用场景',
    })

    expect(hasLearningInsight(result)).toBe(false)
  })
})

describe('teacher AI learning insight score consistency', () => {
  it('classifies full-score dimensions as mastered only', () => {
    const result = buildLearningInsight({
      dimensionScores: [
        { criterion: '概念准确性', score: 3, maxScore: 3 },
        { criterion: '核心区别', score: 2, maxScore: 3 },
        { criterion: '场景匹配性', score: 1, maxScore: 3 },
        { criterion: '表达清晰度', score: 1, maxScore: 1 },
      ],
      deductions: ['概念准确性 3/3，但可补充更多细节'],
      suggestions: [],
    })

    expect(result.masteredPoints).toEqual(['概念准确性', '表达清晰度'])
    expect(result.weakPoints).toEqual(['场景匹配性', '核心区别'])
    expect(result.weakPoints).not.toContain('概念准确性')
  })

  it('uses a partial score as a needs-attention dimension', () => {
    const result = buildLearningInsight({
      dimensionScores: [{ criterion: '核心区别', score: 2, maxScore: 3 }],
    })

    expect(result.weakPoints).toEqual(['核心区别'])
    expect(result.masteredPoints).not.toContain('核心区别')
  })

  it('does not let reasoning text reclassify a full-score dimension', () => {
    const result = buildLearningInsight({
      dimensionScores: [{ criterion: '概念准确性', score: 3, maxScore: 3 }],
      reasoning: '概念准确性已得满分，但仍可补充定义细节。',
      deductions: ['概念准确性已得满分，但仍可补充定义细节。'],
    })

    expect(result.masteredPoints).toEqual(['概念准确性'])
    expect(result.weakPoints).toEqual([])
  })

  it('never returns the same dimension in both groups', () => {
    const result = buildLearningInsight({
      dimensionScores: [
        { criterion: '核心区别', score: 3, maxScore: 3 },
        { criterion: '核心区别', score: 2, maxScore: 3 },
      ],
    })

    expect(result.masteredPoints.filter((item) => result.weakPoints.includes(item))).toEqual([])
  })

  it('keeps full-score AI dimensions mastered when a teacher lowers the score with an explanation', () => {
    const result = buildLearningInsight({
      totalScore: 10,
      dimensionScores: [
        { criterion: '概念准确性', score: 3, maxScore: 3 },
        { criterion: '核心区别', score: 3, maxScore: 3 },
        { criterion: '场景匹配性', score: 3, maxScore: 3 },
        { criterion: '表达清晰度', score: 1, maxScore: 1 },
      ],
    }, {
      teacherScore: 9.5,
      reviewComment: '集合运算的应用没有进一步展开。',
      reviewStatus: 'modified',
    })

    expect(result.masteredPoints).toEqual(['概念准确性', '核心区别', '场景匹配性'])
    expect(result.weakPoints).toEqual([])
    expect(result.errorPatterns).toContain('集合运算的应用没有进一步展开。')
    expect(result.teachingSuggestions).toContain('根据教师审核意见，下一步教学可关注：集合运算的应用没有进一步展开。')
  })

  it('does not add teacher concerns when the confirmed score matches the AI score', () => {
    const result = buildLearningInsight({
      totalScore: 10,
      dimensionScores: [{ criterion: '概念准确性', score: 3, maxScore: 3 }],
    }, {
      teacherScore: 10,
      reviewComment: '',
      reviewStatus: 'accepted',
    })

    expect(result.masteredPoints).toEqual(['概念准确性'])
    expect(result.weakPoints).toEqual([])
    expect(result.errorPatterns).toEqual([])
    expect(result.teachingSuggestions).toEqual([])
  })

  it('does not add teacher concerns when the confirmed score matches the AI score', () => {
    const result = buildLearningInsight({
      totalScore: 10,
      dimensionScores: [{ criterion: '概念准确性', score: 3, maxScore: 3 }],
    }, {
      teacherScore: 10,
      reviewComment: '',
      reviewStatus: 'accepted',
    })

    expect(result.masteredPoints).toEqual(['概念准确性'])
    expect(result.weakPoints).toEqual([])
    expect(result.errorPatterns).toEqual([])
    expect(result.teachingSuggestions).toEqual([])
  })

  it('preserves AI learning insight and appends a confirmed teacher observation', () => {
    const result = buildLearningInsight({
      totalScore: 8,
      dimensionScores: [{ criterion: '核心区别', score: 2, maxScore: 3 }],
      deductions: ['遗漏一个关键区别'],
      suggestions: ['增加对比练习'],
    }, {
      teacherScore: 7.5,
      reviewComment: '需要补充边界条件说明。',
      reviewStatus: 'modified',
    })

    expect(result.weakPoints).toEqual(['核心区别'])
    expect(result.errorPatterns).toEqual(['遗漏一个关键区别', '需要补充边界条件说明。'])
    expect(result.teachingSuggestions).toEqual(['增加对比练习', '根据教师审核意见，下一步教学可关注：需要补充边界条件说明。'])
  })

  it('does not invent a teaching problem for a score-only teacher change', () => {
    const result = buildLearningInsight({
      totalScore: 10,
      dimensionScores: [{ criterion: '概念准确性', score: 3, maxScore: 3 }],
    }, {
      teacherScore: 9.5,
      reviewComment: '',
      reviewStatus: 'modified',
    })

    expect(result.masteredPoints).toEqual(['概念准确性'])
    expect(result.weakPoints).toEqual([])
    expect(result.errorPatterns).toEqual([])
    expect(result.teachingSuggestions).toEqual([])
  })

  it('updates the saved insight when the teacher confirms a new comment', () => {
    const context = {
      ownerId: 'teacher-latest',
      sourceTopic: '集合基础',
    }
    const first = buildLearningInsight({ totalScore: 10, dimensionScores: [] }, {
      teacherScore: 9.5,
      reviewComment: '先补充去重用途。',
      reviewStatus: 'modified',
    })
    const latest = buildLearningInsight({ totalScore: 10, dimensionScores: [] }, {
      teacherScore: 9.5,
      reviewComment: '再补充交集和并集运算。',
      reviewStatus: 'modified',
    })

    saveLearningInsight(first, context)
    saveLearningInsight(latest, context)

    const result = loadLearningInsight({ ...context })
    expect(result.errorPatterns).toEqual(['再补充交集和并集运算。'])
  })
})

describe('teacher AI learning insight owner isolation', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('restores the same teacher insight after authentication storage is removed', () => {
    saveLearningInsight(insight, {
      ownerId: 'teacher-a',
      sourceTopic: '监督学习与无监督学习',
    })
    window.localStorage.setItem('user', JSON.stringify({ token: 'expired' }))
    window.localStorage.removeItem('user')

    const result = loadLearningInsight({
      ownerId: 'teacher-a',
      sourceTopic: '监督学习与无监督学习',
    })

    expect(result.weakPoints).toEqual(['区别完整性'])
  })

  it('does not expose one teacher insight to another teacher', () => {
    saveLearningInsight(insight, {
      ownerId: 'teacher-a',
      sourceTopic: '监督学习与无监督学习',
    })

    const result = loadLearningInsight({
      ownerId: 'teacher-b',
      sourceTopic: '监督学习与无监督学习',
    })

    expect(hasLearningInsight(result)).toBe(false)
  })

  it('keeps non-sensitive insight storage separate from auth cleanup', () => {
    saveLearningInsight(insight, {
      ownerId: 'teacher-a',
      sourceTopic: '监督学习与无监督学习',
    })
    window.localStorage.removeItem('user')

    expect(window.localStorage.getItem('edu-f:teacher-ai:learning-insights')).not.toBeNull()
  })
})
