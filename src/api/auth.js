import request from '@/utils/request'

export function loginByUsername(data) {
  return request({
    url: '/user/login/username',
    method: 'post',
    data,
  })
}
