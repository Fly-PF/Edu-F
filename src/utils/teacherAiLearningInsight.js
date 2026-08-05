const LEARNING_INSIGHT_STORAGE_KEY = 'edu-f:teacher-ai:latest-learning-insight'

function normalizeList(value) {
  return Array.isArray(value)
    ? value.filter((item) => item !== null && item !== undefined && String(item).trim() !== '')
    : []
}

export function createEmptyLearningInsight() {
  return {
    masteredPoints: [],
    weakPoints: [],
    errorPatterns: [],
    teachingSuggestions: [],
  }
}

function normalizeLearningInsight(insight) {
  return {
    masteredPoints: normalizeList(insight?.masteredPoints),
    weakPoints: normalizeList(insight?.weakPoints),
    errorPatterns: normalizeList(insight?.errorPatterns),
    teachingSuggestions: normalizeList(insight?.teachingSuggestions),
  }
}

export function buildLearningInsight(gradingResult) {
  if (!gradingResult || typeof gradingResult !== 'object') return createEmptyLearningInsight()

  const dimensions = normalizeList(gradingResult.dimensionScores)
    .map((item) => {
      const score = Number(item?.score)
      const maxScore = Number(item?.maxScore)
      return {
        label: item?.criterion?.trim(),
        ratio: maxScore > 0 && Number.isFinite(score) ? score / maxScore : null,
      }
    })
    .filter((item) => item.label)

  const strengths = normalizeList(gradingResult.strengths)
  const deductions = normalizeList(gradingResult.deductions)
  const suggestions = normalizeList(gradingResult.suggestions)
  const masteredPoints = dimensions
    .filter((item) => item.ratio !== null && item.ratio >= 0.8)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)
    .map((item) => item.label)
  const weakPoints = dimensions
    .filter((item) => item.ratio !== null && item.ratio < 0.8)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 3)
    .map((item) => item.label)

  return {
    masteredPoints: masteredPoints.length ? masteredPoints : strengths.slice(0, 3),
    weakPoints: weakPoints.length ? weakPoints : deductions.slice(0, 3),
    errorPatterns: deductions.slice(0, 3),
    teachingSuggestions: suggestions.length
      ? suggestions.slice(0, 3)
      : weakPoints.map((item) => `围绕“${item}”补充案例讲解、概念辨析和针对练习。`),
  }
}

export function hasLearningInsight(insight) {
  if (!insight || typeof insight !== 'object') return false
  return ['masteredPoints', 'weakPoints', 'errorPatterns', 'teachingSuggestions']
    .some((key) => normalizeList(insight[key]).length > 0)
}

export function saveLearningInsight(insight) {
  if (typeof window === 'undefined' || !hasLearningInsight(insight)) return
  try {
    window.localStorage.setItem(LEARNING_INSIGHT_STORAGE_KEY, JSON.stringify(normalizeLearningInsight(insight)))
  } catch {
    // Storage availability should not block grading.
  }
}

export function loadLearningInsight() {
  if (typeof window === 'undefined') return createEmptyLearningInsight()
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEARNING_INSIGHT_STORAGE_KEY) || 'null')
    return hasLearningInsight(parsed) ? normalizeLearningInsight(parsed) : createEmptyLearningInsight()
  } catch {
    return createEmptyLearningInsight()
  }
}
