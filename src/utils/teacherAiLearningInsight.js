const LEARNING_INSIGHT_STORAGE_KEY = 'edu-f:teacher-ai:learning-insights'
const MAX_STORED_INSIGHTS = 20

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
    sourceQuestion: '',
    sourceTopic: '',
    courseId: null,
    classId: null,
    submissionId: null,
    ownerId: null,
    ownerUsername: null,
    createdAt: '',
  }
}

function normalizeText(value) {
  return value === null || value === undefined ? '' : String(value).trim()
}

function appendUnique(items, additions) {
  return [...items, ...additions]
    .map((item) => normalizeText(item))
    .filter((item, index, values) => item && values.indexOf(item) === index)
}

function normalizeId(value) {
  const text = normalizeText(value)
  return text || null
}

function resolveOwnerId(insight) {
  return normalizeId(insight?.ownerId || insight?.teacherId || insight?.userId)
}

function normalizeLearningInsight(insight) {
  return {
    masteredPoints: normalizeList(insight?.masteredPoints),
    weakPoints: normalizeList(insight?.weakPoints),
    errorPatterns: normalizeList(insight?.errorPatterns),
    teachingSuggestions: normalizeList(insight?.teachingSuggestions),
    sourceQuestion: normalizeText(insight?.sourceQuestion),
    sourceTopic: normalizeText(insight?.sourceTopic),
    courseId: normalizeId(insight?.courseId),
    classId: normalizeId(insight?.classId),
    submissionId: normalizeId(insight?.submissionId),
    ownerId: resolveOwnerId(insight),
    ownerUsername: normalizeId(insight?.ownerUsername || insight?.username),
    createdAt: normalizeText(insight?.createdAt),
  }
}

export function buildLearningInsight(gradingResult, reviewContext = {}) {
  if (!gradingResult || typeof gradingResult !== 'object') return createEmptyLearningInsight()

  const dimensionsByLabel = new Map()
  normalizeList(gradingResult.dimensionScores).forEach((item) => {
    const label = normalizeText(item?.criterion)
    const score = Number(item?.score)
    const maxScore = Number(item?.maxScore)
    if (!label || !Number.isFinite(score) || !Number.isFinite(maxScore) || maxScore <= 0 || score < 0) return

    const normalizedDimension = { label, score, maxScore }
    const existing = dimensionsByLabel.get(label)
    // Conflicting duplicate rubric rows stay in needsAttention if any row is not full score.
    if (!existing || (existing.score === existing.maxScore && score < maxScore)) {
      dimensionsByLabel.set(label, normalizedDimension)
    }
  })
  const dimensions = [...dimensionsByLabel.values()]

  const strengths = normalizeList(gradingResult.strengths)
  const deductions = normalizeList(gradingResult.deductions)
  const suggestions = normalizeList(gradingResult.suggestions)
  const masteredPoints = dimensions
    .filter((item) => item.score === item.maxScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.label)
  const needsAttention = dimensions
    .filter((item) => item.score < item.maxScore)
    .sort((a, b) => (a.score / a.maxScore) - (b.score / b.maxScore))
    .slice(0, 3)
    .map((item) => item.label)
  const hasDimensionScores = dimensions.length > 0
  const weakPoints = hasDimensionScores ? needsAttention : deductions.slice(0, 3)

  const insight = {
    masteredPoints: hasDimensionScores ? masteredPoints : strengths.slice(0, 3),
    weakPoints,
    errorPatterns: deductions.slice(0, 3),
    teachingSuggestions: suggestions.length
      ? suggestions.slice(0, 3)
      : weakPoints.map((item) => `围绕“${item}”补充案例讲解、概念辨析和针对练习。`),
  }

  const aiScore = Number(gradingResult.totalScore)
  const teacherScore = Number(reviewContext.teacherScore)
  const reviewComment = normalizeText(reviewContext.reviewComment || reviewContext.opinion)
  const hasConfirmedTeacherAdjustment = reviewContext.reviewStatus === 'modified'
    && Number.isFinite(aiScore)
    && Number.isFinite(teacherScore)
    && teacherScore < aiScore
    && reviewComment

  if (!hasConfirmedTeacherAdjustment) return insight

  return {
    ...insight,
    // Keep AI dimension classification unchanged; teacher feedback is an additional observation.
    errorPatterns: appendUnique(insight.errorPatterns, [reviewComment]),
    teachingSuggestions: appendUnique(insight.teachingSuggestions, [
      `根据教师审核意见，下一步教学可关注：${reviewComment}`,
    ]),
  }
}

export function hasLearningInsight(insight) {
  if (!insight || typeof insight !== 'object') return false
  return ['masteredPoints', 'weakPoints', 'errorPatterns', 'teachingSuggestions']
    .some((key) => normalizeList(insight[key]).length > 0)
}

export function saveLearningInsight(insight, context = {}) {
  if (typeof window === 'undefined' || !hasLearningInsight(insight)) return
  try {
    const record = normalizeLearningInsight({
      ...insight,
      ...context,
      createdAt: context.createdAt || new Date().toISOString(),
    })
    const history = readStoredInsights()
    const identity = insightIdentity(record)
    const nextHistory = [
      record,
      ...history.filter((item) => insightIdentity(item) !== identity),
    ].slice(0, MAX_STORED_INSIGHTS)
    window.localStorage.setItem(LEARNING_INSIGHT_STORAGE_KEY, JSON.stringify(nextHistory))
  } catch {
    // Storage availability should not block grading.
  }
}

export function loadLearningInsight(context = {}) {
  if (typeof window === 'undefined') return createEmptyLearningInsight()
  try {
    const matched = readStoredInsights().find((item) => isLearningInsightRelevant(item, context))
    return matched && hasLearningInsight(matched) ? matched : createEmptyLearningInsight()
  } catch {
    return createEmptyLearningInsight()
  }
}

export function isLearningInsightRelevant(insight, context = {}) {
  const stored = normalizeLearningInsight(insight)
  const current = normalizeLearningInsight(context)
  if (!hasLearningInsight(stored)) return false

  const ownerScopeRequested = ['ownerId', 'teacherId', 'userId', 'ownerUsername', 'username'].some((key) =>
    Object.prototype.hasOwnProperty.call(context, key),
  )
  if (ownerScopeRequested) {
    const ownerMatches = Boolean(
      (current.ownerId && stored.ownerId === current.ownerId)
      || (current.ownerUsername && stored.ownerUsername === current.ownerUsername),
    )
    if (!ownerMatches) return false
  }

  const scopedIds = ['courseId', 'classId'].filter((key) => current[key] !== null)
  if (scopedIds.length) {
    const idsMatch = scopedIds.every((key) => stored[key] !== null && stored[key] === current[key])
    if (!idsMatch) return false
  }

  const currentTopic = current.sourceTopic || current.sourceQuestion
  const storedTopic = stored.sourceTopic || stored.sourceQuestion
  if (!currentTopic || !storedTopic) return false
  return areTopicsRelated(currentTopic, storedTopic)
}

export function areTopicsRelated(left, right) {
  const normalizedLeft = normalizeTopic(left)
  const normalizedRight = normalizeTopic(right)
  if (!normalizedLeft || !normalizedRight) return false
  if (normalizedLeft === normalizedRight) return true

  const shorter = normalizedLeft.length <= normalizedRight.length ? normalizedLeft : normalizedRight
  const longer = shorter === normalizedLeft ? normalizedRight : normalizedLeft
  if (shorter.length >= 4 && longer.includes(shorter)) return true

  const leftBigrams = createBigrams(normalizedLeft)
  const rightBigrams = createBigrams(normalizedRight)
  if (!leftBigrams.size || !rightBigrams.size) return false
  const sharedCount = [...leftBigrams].filter((item) => rightBigrams.has(item)).length
  const coverage = sharedCount / Math.min(leftBigrams.size, rightBigrams.size)
  const unionSize = new Set([...leftBigrams, ...rightBigrams]).size
  const similarity = unionSize ? sharedCount / unionSize : 0
  if (coverage >= 0.6 && similarity >= 0.25) return true

  const leftTokens = extractTopicTokens(left)
  const rightTokens = extractTopicTokens(right)
  if (!leftTokens.size || !rightTokens.size) return false

  const shorterTokens = leftTokens.size <= rightTokens.size ? leftTokens : rightTokens
  const longerTokens = shorterTokens === leftTokens ? rightTokens : leftTokens
  const sharedTokens = [...shorterTokens].filter((token) => longerTokens.has(token))
  const shortCoverage = sharedTokens.length / shorterTokens.size
  const longCoverage = sharedTokens.length / longerTokens.size

  // A compact course topic may be covered by a longer question, but still needs
  // multiple meaningful shared fragments to avoid cross-topic matches.
  return sharedTokens.length >= 2 && shortCoverage >= 0.5 && longCoverage >= 0.15
}

function normalizeTopic(value) {
  return normalizeText(value).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '')
}

function createBigrams(value) {
  const result = new Set()
  for (let index = 0; index < value.length - 1; index += 1) {
    result.add(value.slice(index, index + 2))
  }
  return result
}

const TOPIC_CONNECTORS = new Set('的与和及中在从对为是并以于将被或'.split(''))
const TOPIC_INSTRUCTION_TOKENS = new Set([
  '请',
  '说明',
  '结合',
  '实际',
  '分别',
  '适合',
  '情况',
  '使用',
  '什么',
  '如何',
  '哪些',
  '进行',
])

function extractTopicTokens(value) {
  const normalized = normalizeText(value).toLowerCase()
  const tokens = new Set(normalized.match(/[a-z0-9]+/g)?.filter((token) => token.length >= 2) || [])
  const chineseRuns = normalized.match(/[\u4e00-\u9fff]+/g) || []

  chineseRuns.forEach((run) => {
    for (let index = 0; index < run.length - 1; index += 1) {
      const token = run.slice(index, index + 2)
      if ([...token].some((char) => TOPIC_CONNECTORS.has(char)) || TOPIC_INSTRUCTION_TOKENS.has(token)) continue
      tokens.add(token)
    }
  })

  return tokens
}

function insightIdentity(insight) {
  return [
    insight.ownerId || insight.ownerUsername || '',
    insight.courseId || '',
    insight.classId || '',
    insight.submissionId || '',
    insight.sourceQuestion || '',
    insight.sourceTopic || '',
  ].join('|')
}

function readStoredInsights() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEARNING_INSIGHT_STORAGE_KEY) || '[]')
    const values = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? [parsed] : []
    return values.map(normalizeLearningInsight).filter(hasLearningInsight)
  } catch {
    return []
  }
}
