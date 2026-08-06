const SAFETY_REVIEW_SYNC_EVENT = 'edu:safety-review-sync'
const SAFETY_REVIEW_SYNC_STORAGE_KEY = 'edu:safety-review-sync-ping'
const SAFETY_REVIEW_SYNC_INSTANCE_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`

function now() {
  return Date.now()
}

function emitSafetyReviewSync(payload = {}) {
  if (typeof window === 'undefined') {
    return
  }

  const detail = {
    ...payload,
    timestamp: now(),
    sourceInstanceId: SAFETY_REVIEW_SYNC_INSTANCE_ID,
  }

  window.dispatchEvent(new CustomEvent(SAFETY_REVIEW_SYNC_EVENT, { detail }))

  try {
    localStorage.setItem(SAFETY_REVIEW_SYNC_STORAGE_KEY, JSON.stringify(detail))
    localStorage.removeItem(SAFETY_REVIEW_SYNC_STORAGE_KEY)
  } catch {
    // 忽略本地存储不可用的情况，仅保留同页事件通知。
  }
}

function subscribeSafetyReviewSync(handler) {
  if (typeof window === 'undefined' || typeof handler !== 'function') {
    return () => {}
  }

  const eventHandler = (event) => {
    const detail = event?.detail || {}
    if (detail.sourceInstanceId && detail.sourceInstanceId === SAFETY_REVIEW_SYNC_INSTANCE_ID) {
      return
    }
    handler(detail)
  }

  const storageHandler = (event) => {
    if (event?.key !== SAFETY_REVIEW_SYNC_STORAGE_KEY || !event.newValue) {
      return
    }

    try {
      const detail = JSON.parse(event.newValue) || {}
      if (detail.sourceInstanceId && detail.sourceInstanceId === SAFETY_REVIEW_SYNC_INSTANCE_ID) {
        return
      }
      handler(detail)
    } catch {
      handler({})
    }
  }

  window.addEventListener(SAFETY_REVIEW_SYNC_EVENT, eventHandler)
  window.addEventListener('storage', storageHandler)

  return () => {
    window.removeEventListener(SAFETY_REVIEW_SYNC_EVENT, eventHandler)
    window.removeEventListener('storage', storageHandler)
  }
}

export {
  emitSafetyReviewSync,
  subscribeSafetyReviewSync,
}
