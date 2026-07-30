const reviewStatusOptions = [
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已驳回', value: 'REJECTED' },
  { label: '无需人工审核', value: 'NOT_REQUIRED' },
]

function normalizeReviewStatus(value, manualReviewRequired = false) {
  const status = String(value || '').toUpperCase()

  if (status === 'PENDING' || status === 'APPROVED' || status === 'REJECTED' || status === 'NOT_REQUIRED') {
    return status
  }

  return manualReviewRequired ? 'PENDING' : 'NOT_REQUIRED'
}

function reviewStatusLabel(value, manualReviewRequired = false) {
  const status = normalizeReviewStatus(value, manualReviewRequired)
  return reviewStatusOptions.find((item) => item.value === status)?.label || '待审核'
}

function reviewStatusTagType(value, manualReviewRequired = false) {
  const status = normalizeReviewStatus(value, manualReviewRequired)

  if (status === 'APPROVED') {
    return 'success'
  }

  if (status === 'REJECTED') {
    return 'danger'
  }

  if (status === 'NOT_REQUIRED') {
    return 'info'
  }

  return 'warning'
}

export {
  reviewStatusLabel,
  reviewStatusOptions,
  reviewStatusTagType,
  normalizeReviewStatus,
}
