import {
  guardSafetyAfterAi,
  guardSafetyBeforeAi,
  isBlocked,
  needsAttention,
  runSafeAiFlow,
  runStudentSafeAiFlow,
  runTeacherPublishSafeAiFlow,
} from './safetyGatewayCore.js'

function mergeMetadata(defaultOptions = {}, runtimeOptions = {}) {
  return {
    ...(defaultOptions.metadata || {}),
    ...(runtimeOptions.metadata || {}),
  }
}

function mergeSafetyOptions(defaultOptions = {}, runtimeOptions = {}) {
  return {
    ...defaultOptions,
    ...runtimeOptions,
    metadata: mergeMetadata(defaultOptions, runtimeOptions),
  }
}

function createSafetyRoute(defaultOptions = {}) {
  return async function runSafetyRoute(runtimeOptions = {}) {
    return runSafeAiFlow(mergeSafetyOptions(defaultOptions, runtimeOptions))
  }
}

async function runSafetyRoute(options = {}) {
  return runSafeAiFlow(options)
}

async function runStudentSafetyRoute(options = {}) {
  return runStudentSafeAiFlow(options)
}

async function runTeacherSafetyRoute(options = {}) {
  return runTeacherPublishSafeAiFlow(options)
}

async function runSafetyBeforeAi(options = {}) {
  return guardSafetyBeforeAi(options)
}

async function runSafetyAfterAi(payload = {}, outputText = '', options = {}) {
  return guardSafetyAfterAi(payload, outputText, options)
}

export {
  createSafetyRoute,
  guardSafetyAfterAi,
  guardSafetyBeforeAi,
  isBlocked,
  needsAttention,
  runSafetyAfterAi,
  runSafetyBeforeAi,
  runSafetyRoute,
  runStudentSafetyRoute,
  runTeacherSafetyRoute,
}
