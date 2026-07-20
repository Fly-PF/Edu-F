import request from '@/utils/request'

export function loginByUsername(data) {
  return request({
    url: '/user/login/username',
    method: 'post',
    data,
  })
}

export function registerStudent(data) {
  return request({
    url: '/api/user/register/student',
    method: 'post',
    data,
  })
}
