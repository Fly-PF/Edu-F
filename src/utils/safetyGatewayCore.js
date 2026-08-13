import { ElMessageBox } from 'element-plus'
import { runSafetyGateway } from '@/api/safety'

const DEFAULT_SCENE_BY_ROLE = {
  STUDENT: 'STUDENT_AI',
  TEACHER: 'TEACHER_COURSE',
  ADMIN: 'MANUAL_TEST',
}

const BLOCK_DECISIONS = new Set(['BLOCK'])
const ATTENTION_DECISIONS = new Set(['WARN', 'DESENSITIZE', 'REWRITE'])

function unwrapSafetyResponse(response, fallback = '安全评测失败') {
  if (response?.code === 200) {
    return response.data
  }
  throw new Error(response?.message || fallback)
}

function normalizeSafetyPayload(payload = {}) {
  const userRole = payload.userRole || 'TEACHER'
  return {
    sourceModule: payload.sourceModule,
    scene: payload.scene || DEFAULT_SCENE_BY_ROLE[userRole] || 'AI_OUTPUT',
    userRole,
    gradeLevel: payload.gradeLevel || 'JUNIOR',
    userId: payload.userId,
    classId: payload.classId,
    courseId: payload.courseId,
    chapterId: payload.chapterId,
    inputText: payload.inputText || '',
    outputText: payload.outputText || '',
    recordLog: payload.recordLog ?? true,
    metadata: payload.metadata || {},
  }
}

function isBlocked(result) {
  return !result?.allowed || BLOCK_DECISIONS.has(result?.decision)
}

function needsAttention(result) {
  return Boolean(
    result?.manualReviewRequired ||
      result?.teacherConfirmationRequired ||
      ATTENTION_DECISIONS.has(result?.decision),
  )
}

function isCheatingOnly(result) {
  return Array.isArray(result?.riskTypes) && result.riskTypes.length === 1 && result.riskTypes[0] === 'CHEATING'
}

function shouldBypassCheatingForTeacher(payload, result) {
  return payload?.userRole && payload.userRole !== 'STUDENT' && isCheatingOnly(result)
}

function buildSafetyMessage(result, title) {
  const lines = []
  if (result?.decision) {
    lines.push(`处置动作：${result.decision}`)
  }
  if (result?.riskLevel) {
    lines.push(`风险等级：${result.riskLevel}`)
  }
  if (Array.isArray(result?.riskTypes) && result.riskTypes.length) {
    lines.push(`风险类型：${result.riskTypes.join(' / ')}`)
  }
  if (result?.evidenceLevel) {
    const score = result.evidenceScore != null ? `，分值 ${result.evidenceScore}` : ''
    lines.push(`证据等级：${result.evidenceLevel}${score}`)
  }
  if (result?.reason) {
    lines.push(`原因：${result.reason}`)
  }
  if (result?.suggestion) {
    lines.push(`建议：${result.suggestion}`)
  }

  return {
    title,
    message: lines.join('\n') || '内容触发安全评测策略，请确认后再继续。',
  }
}

async function showBlockedDialog(result, title = '内容未通过安全评测') {
  const { message } = buildSafetyMessage(result, title)
  await ElMessageBox.alert(message, title, {
    confirmButtonText: '知道了',
    type: 'error',
    customStyle: { whiteSpace: 'pre-line' },
  })
}

async function showContinueDialog(result, title = '内容存在风险，是否继续') {
  const { message } = buildSafetyMessage(result, title)
  await ElMessageBox.confirm(message, title, {
    confirmButtonText: '继续',
    cancelButtonText: '取消',
    type: 'warning',
    customStyle: { whiteSpace: 'pre-line' },
  })
}

async function evaluateSafety(payload, fallback) {
  return unwrapSafetyResponse(await runSafetyGateway(normalizeSafetyPayload(payload)), fallback)
}

function getTextFromAiResult(result) {
  if (typeof result === 'string') {
    return result
  }
  return (
    result?.outputText ||
    result?.content ||
    result?.answer ||
    result?.reply ||
    result?.response ||
    result?.result ||
    result?.message ||
    result?.text ||
    result?.data?.outputText ||
    result?.data?.content ||
    result?.data?.answer ||
    result?.data?.reply ||
    result?.data?.response ||
    result?.data?.result ||
    result?.data?.message ||
    result?.data?.text ||
    ''
  )
}

function getTextForAi(inputText, safetyResult) {
  if (safetyResult?.decision === 'DESENSITIZE' && safetyResult?.processedText) {
    return safetyResult.processedText
  }
  return inputText
}

async function guardSafetyBeforeAi(payload, options = {}) {
  const result = await evaluateSafety(
    {
      ...payload,
      scene: payload.scene || DEFAULT_SCENE_BY_ROLE[payload.userRole || 'TEACHER'] || 'TEACHER_COURSE',
      outputText: '',
    },
    'AI 输入安全评测失败',
  )

  if (isBlocked(result) && !shouldBypassCheatingForTeacher(payload, result)) {
    if (options.showDialog !== false) {
      await showBlockedDialog(result, 'AI 输入未通过安全评测')
    }
    return {
      passed: false,
      stopped: true,
      stage: 'input',
      safetyResult: result,
    }
  }

  if (needsAttention(result) && options.confirmBeforeContinue !== false) {
    try {
      await showContinueDialog(result, 'AI 输入存在风险，是否继续')
    } catch (error) {
      return {
        passed: false,
        stopped: true,
        canceled: true,
        stage: 'input',
        safetyResult: result,
      }
    }
  }

  return {
    passed: true,
    stopped: false,
    stage: 'input',
    safetyResult: result,
    safeInputText: getTextForAi(payload.inputText || '', result),
  }
}

async function guardSafetyAfterAi(payload, outputText, options = {}) {
  const result = await evaluateSafety(
    {
      ...payload,
      scene: 'AI_OUTPUT',
      outputText,
    },
    'AI 输出安全评测失败',
  )

  if (isBlocked(result) && !shouldBypassCheatingForTeacher(payload, result)) {
    if (options.showDialog !== false) {
      await showBlockedDialog(result, 'AI 输出未通过安全评测')
    }
    return {
      passed: false,
      stopped: true,
      stage: 'output',
      safetyResult: result,
      outputText,
      safeOutputText: result?.processedText || '',
    }
  }

  if (needsAttention(result) && options.confirmBeforeContinue !== false) {
    try {
      await showContinueDialog(result, 'AI 输出存在风险，是否继续展示')
    } catch (error) {
      return {
        passed: false,
        stopped: true,
        canceled: true,
        stage: 'output',
        safetyResult: result,
        outputText,
        safeOutputText: result?.processedText || outputText,
      }
    }
  }

  return {
    passed: true,
    stopped: false,
    stage: 'output',
    safetyResult: result,
    outputText,
    safeOutputText: result?.processedText || outputText,
  }
}

async function runSafeAiFlow(options) {
  const {
    sourceModule,
    scene,
    userRole,
    gradeLevel,
    userId,
    classId,
    courseId,
    chapterId,
    inputText,
    metadata,
    callAi,
    extractOutputText = getTextFromAiResult,
    showDialog = true,
  } = options || {}
  const confirmBeforeContinue = options?.confirmBeforeContinue ?? userRole !== 'STUDENT'

  if (!sourceModule) {
    throw new Error('缺少 sourceModule，无法接入安全评测')
  }
  if (typeof callAi !== 'function') {
    throw new Error('缺少 callAi 函数，无法执行 AI 调用')
  }

  const basePayload = {
    sourceModule,
    scene,
    userRole,
    gradeLevel,
    userId,
    classId,
    courseId,
    chapterId,
    inputText,
    metadata,
  }

  const inputGuard = await guardSafetyBeforeAi(basePayload, { confirmBeforeContinue, showDialog })
  if (!inputGuard.passed) {
    return {
      passed: false,
      stopped: true,
      stage: 'input',
      inputSafety: inputGuard.safetyResult,
    }
  }

  const aiResult = await callAi({
    inputText: inputGuard.safeInputText,
    question: inputGuard.safeInputText,
    query: inputGuard.safeInputText,
    originalInputText: inputText,
    originalQuestion: inputText,
    originalQuery: inputText,
    inputSafety: inputGuard.safetyResult,
  })
  const outputText = extractOutputText(aiResult)

  const outputGuard = await guardSafetyAfterAi(
    {
      ...basePayload,
      inputText: inputGuard.safeInputText,
    },
    outputText,
    { confirmBeforeContinue, showDialog },
  )

  return {
    passed: outputGuard.passed,
    stopped: outputGuard.stopped,
    canceled: outputGuard.canceled,
    stage: outputGuard.stage,
    inputSafety: inputGuard.safetyResult,
    outputSafety: outputGuard.safetyResult,
    aiResult,
    outputText,
    safeOutputText: outputGuard.safeOutputText,
  }
}

async function runStudentSafeAiFlow(options) {
  return runSafeAiFlow({
    ...options,
    userRole: 'STUDENT',
    confirmBeforeContinue: false,
    showDialog: options?.showDialog ?? true,
  })
}

async function runTeacherPublishSafeAiFlow(options) {
  return runSafeAiFlow({
    ...options,
    userRole: 'TEACHER',
    confirmBeforeContinue: true,
    showDialog: options?.showDialog ?? true,
  })
}

export {
  evaluateSafety,
  guardSafetyBeforeAi,
  guardSafetyAfterAi,
  runStudentSafeAiFlow,
  runTeacherPublishSafeAiFlow,
  runSafeAiFlow,
  isBlocked,
  needsAttention,
}
