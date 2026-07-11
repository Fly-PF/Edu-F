import request from '@/utils/request'

export function fetchUserProfile() {
  return request({
    url: '/api/user/profile',
    method: 'get',
  })
}

export function updateUserProfile(data) {
  return request({
    url: '/api/user/profile',
    method: 'patch',
    data,
  })
}

export function uploadUserAvatar(file) {
  const formData = new FormData()
  formData.append('file', file)

  return request({
    url: '/api/user/avatar/upload',
    method: 'post',
    data: formData,
  })
}

export function updateUserPassword(data) {
  return request({
    url: '/api/user/password',
    method: 'patch',
    data,
  })
}
