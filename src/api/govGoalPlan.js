import request from '@/utils/request'

function unwrap(response) {
  if (!response || typeof response !== 'object' || !Object.prototype.hasOwnProperty.call(response, 'code')) {
    return response
  }

  if ([200, 201].includes(Number(response.code))) {
    return response.data
  }

  throw new Error(response.message || '操作失败')
}

function resolve(promise) {
  return promise.then(unwrap)
}

export function getGovGoal() {
  return resolve(request.get('/api/gov/goal-plan/goal'))
}

export function saveGovGoal(data) {
  return resolve(request.put('/api/gov/goal-plan/goal', data))
}

export function listGovPlanTasks(taskDate) {
  return resolve(request.get('/api/gov/goal-plan/tasks', {
    params: taskDate ? { taskDate } : undefined,
  }))
}

export function createGovPlanTask(data) {
  return resolve(request.post('/api/gov/goal-plan/tasks', data))
}

export function updateGovPlanTask(taskId, data) {
  return resolve(request.put(`/api/gov/goal-plan/tasks/${taskId}`, data))
}

export function toggleGovPlanTask(taskId, completed) {
  return resolve(request.patch(`/api/gov/goal-plan/tasks/${taskId}/complete`, null, {
    params: { completed },
  }))
}

export function deleteGovPlanTask(taskId) {
  return resolve(request.delete(`/api/gov/goal-plan/tasks/${taskId}`))
}
