import axios from 'axios'
import { useUserStore } from '@/stores/user'

const baseURL = 'http://localhost:8080'
const authExpiredCodes = [401, 403]

const instance = axios.create({
  baseURL,
  timeout: 5000,
})

function isLoginRequest(config) {
  return config?.url?.includes('/user/login/')
}

function isRegisterRequest(config) {
  return config?.url === '/api/user/register/student'
}

function isPublicCourseRequest(config) {
  const method = (config?.method || 'get').toLowerCase()
  const url = String(config?.url || '').split('?')[0]

  return (
    method === 'get' &&
    (/^\/api\/courses$/.test(url) ||
      /^\/api\/courses\/[^/]+$/.test(url) ||
      /^\/api\/courses\/[^/]+\/chapters$/.test(url))
  )
}

function isPublicRequest(config) {
  return isLoginRequest(config) || isRegisterRequest(config) || isPublicCourseRequest(config)
}

function formatBearerToken(token) {
  if (!token) {
    return ''
  }

  return token.startsWith('Bearer ') ? token : `Bearer ${token}`
}

function redirectToLogin() {
  import('@/router').then(({ default: router }) => {
    if (router.currentRoute.value.path !== '/login') {
      router.replace('/login')
    }
  })
}

function isTimeoutError(error) {
  return error?.code === 'ECONNABORTED' || String(error?.message || '').includes('timeout')
}

function handleAuthExpired(message = '登录状态已失效，请重新登录') {
  const userStore = useUserStore()
  userStore.clearUser()
  redirectToLogin()
  return Promise.reject(new Error(message))
}

instance.interceptors.request.use(
  function (config) {
    const userStore = useUserStore()

    if (!isPublicRequest(config) && !userStore.isLoggedIn) {
      return handleAuthExpired('请先登录')
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json'
    }

    if (!isLoginRequest(config) && userStore.token) {
      config.headers['Authorization'] = formatBearerToken(userStore.token)
    } else {
      delete config.headers['Authorization']
    }

    return config
  },
  function (error) {
    return Promise.reject(error)
  },
)

instance.interceptors.response.use(
  function (response) {
    const res = response.data

    if (authExpiredCodes.includes(Number(res?.code))) {
      return handleAuthExpired(res?.message)
    }

    return res
  },
  function (error) {
    if (authExpiredCodes.includes(Number(error?.response?.status))) {
      return handleAuthExpired(error?.response?.data?.message)
    }

    if (isTimeoutError(error)) {
      return Promise.reject(new Error('后端处理时间较长，请稍后重试或减少本次检测内容'))
    }

    return Promise.reject(error)
  },
)

export default instance
