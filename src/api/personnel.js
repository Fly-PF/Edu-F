import request from '@/utils/request'

const resourcePaths = {
  students: '/api/admin/students',
  teachers: '/api/admin/teachers',
  managers: '/api/admin/managers',
}

function getResourcePath(resource) {
  const path = resourcePaths[resource]

  if (!path) {
    throw new Error(`Unsupported personnel resource: ${resource}`)
  }

  return path
}

export function fetchPersonnelList(resource, params) {
  return request({
    url: getResourcePath(resource),
    method: 'get',
    params,
  })
}

export function createPersonnel(resource, data) {
  return request({
    url: getResourcePath(resource),
    method: 'post',
    data,
  })
}

export function fetchPersonnelDetail(resource, id) {
  return request({
    url: `${getResourcePath(resource)}/${id}`,
    method: 'get',
  })
}

export function updatePersonnel(resource, id, data) {
  return request({
    url: `${getResourcePath(resource)}/${id}`,
    method: 'patch',
    data,
  })
}

export function updatePersonnelStatus(resource, id, status) {
  return request({
    url: `${getResourcePath(resource)}/${id}/status`,
    method: 'patch',
    data: { status },
  })
}

export function deletePersonnel(resource, id) {
  return request({
    url: `${getResourcePath(resource)}/${id}`,
    method: 'delete',
  })
}
