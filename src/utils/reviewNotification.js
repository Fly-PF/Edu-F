import { h } from 'vue'
import { ElNotification } from 'element-plus'
import { listChatMessages, pageChatSessions } from '@/api/rag'

const CHECKING_OWNERS = new Set()

function getOwnerKey(userStore) {
  return userStore?.userId || userStore?.username || ''
}

function getStorageKey(ownerKey) {
  return `edu:safety-review-seen:${ownerKey}`
}

function readSeenReviewRecordIds(ownerKey) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getStorageKey(ownerKey)) || '[]')
    return new Set(Array.isArray(parsed) ? parsed.map((item) => String(item)) : [])
  } catch {
    return new Set()
  }
}

function saveSeenReviewRecordIds(ownerKey, ids) {
  try {
    window.localStorage.setItem(getStorageKey(ownerKey), JSON.stringify(Array.from(ids)))
  } catch {
    // ignore
  }
}

function parseReviewRecordId(metadata) {
  try {
    const value = JSON.parse(metadata || '{}').reviewRecordId
    if (value === null || value === undefined || value === '') {
      return null
    }
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : null
  } catch {
    return null
  }
}

function getMessageReviewRecordId(message) {
  return message?.reviewRecordId ?? parseReviewRecordId(message?.metadata)
}

function getMessageTime(message) {
  const time = new Date(message?.createTime || message?.updateTime || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

function getQuestionPreview(messages, assistantMessage, assistantIndex) {
  const messageId = String(assistantMessage?.messageId || '')
  const baseMessageId = messageId.replace(/-assistant$/, '')
  const matchedUserMessage = baseMessageId
    ? messages.find((item) => String(item?.messageId || '') === `${baseMessageId}-user`)
    : null
  const previousMessage = assistantIndex > 0 ? messages[assistantIndex - 1] : null
  const content = String(
    matchedUserMessage?.content
      || (previousMessage?.role === 'user' ? previousMessage.content : '')
      || '',
  ).trim()

  return content.length > 32 ? `${content.slice(0, 32)}...` : content
}

async function collectApprovedReviewMessages({ sessions, seenIds }) {
  const pendingMessages = []

  for (const session of sessions) {
    const sessionId = session?.id ?? session?.sessionId
    if (!sessionId) {
      continue
    }

    let messages = []
    try {
      messages = await listChatMessages(sessionId)
    } catch {
      continue
    }

    ;(messages || []).forEach((message, index) => {
      const reviewRecordId = getMessageReviewRecordId(message)
      if (message?.role !== 'assistant' || !reviewRecordId || seenIds.has(String(reviewRecordId))) {
        return
      }

      pendingMessages.push({
        sessionId: String(sessionId),
        reviewRecordId,
        questionPreview: getQuestionPreview(messages || [], message, index),
        createTime: getMessageTime(message),
      })
    })
  }

  return pendingMessages
}

function openReviewMessage(router, target) {
  router?.push?.({
    path: '/main/knowledge-qa/chat',
    query: {
      session_id: target.sessionId,
      reviewRecordId: target.reviewRecordId,
    },
  })
}

function renderNotificationMessage({ preview, onOpen }) {
  const text = preview ? `点击查看：${preview}` : '点击查看这条问答内容'

  return h('div', {
    style: { display: 'grid', gap: '10px', cursor: 'pointer' },
    onClick: onOpen,
  }, [
    h('div', { style: { color: '#5f6b7a', lineHeight: '1.6' } }, text),
    h(
      'button',
      {
        type: 'button',
        style: {
          justifySelf: 'start',
          padding: '6px 12px',
          border: '1px solid #67c23a',
          borderRadius: '6px',
          background: '#f0f9eb',
          color: '#3d8b24',
          cursor: 'pointer',
          fontWeight: '700',
        },
        onClick: (event) => {
          event.stopPropagation()
          onOpen()
        },
      },
      '查看问答',
    ),
  ])
}

export async function checkApprovedReviewNotifications({ userStore, router, pageSize = 20 } = {}) {
  const ownerKey = getOwnerKey(userStore)

  if (!ownerKey || userStore?.roleCode !== 'STUDENT' || CHECKING_OWNERS.has(String(ownerKey))) {
    return
  }

  CHECKING_OWNERS.add(String(ownerKey))
  try {
    const result = await pageChatSessions({ pageNum: 1, pageSize })
    const sessions = Array.isArray(result) ? result : result?.records || []
    if (!sessions.length) {
      return
    }

    const seenIds = readSeenReviewRecordIds(ownerKey)
    const pendingMessages = await collectApprovedReviewMessages({ sessions, seenIds })
    if (!pendingMessages.length) {
      return
    }

    pendingMessages.forEach((item) => seenIds.add(String(item.reviewRecordId)))
    saveSeenReviewRecordIds(ownerKey, seenIds)

    const latestMessage = [...pendingMessages].sort((a, b) => b.createTime - a.createTime)[0]
    const countText = pendingMessages.length === 1 ? '1 条审核已通过' : `${pendingMessages.length} 条审核已通过`
    const openTarget = () => openReviewMessage(router, latestMessage)

    ElNotification({
      title: countText,
      message: () => renderNotificationMessage({
        preview: latestMessage.questionPreview,
        onOpen: openTarget,
      }),
      type: 'success',
      duration: 0,
      position: 'bottom-right',
      onClick: openTarget,
    })
  } catch {
    // ignore
  } finally {
    CHECKING_OWNERS.delete(String(ownerKey))
  }
}
