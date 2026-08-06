import axios from 'axios'
import { useUserStore } from '@/stores/user'

function normalizeBaseURL(value) {
  return String(value || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\/$/, '')
}

const baseURL = normalizeBaseURL(import.meta.env.VITE_APP_REQUEST_BASE_URL)
const authExpiredCodes = [401]

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

function isPublicCatalogRequest(config) {
  const method = (config?.method || 'get').toLowerCase()
  const url = String(config?.url || '').split('?')[0]

  return (
    method === 'get' &&
    (/^\/api\/course-categories(?:\/tags)?$/.test(url) ||
      /^\/api\/block-projects\/gallery$/.test(url))
  )
}

function isPublicKnowledgeBaseRequest(config) {
  const method = (config?.method || 'get').toLowerCase()
  const url = String(config?.url || '').split('?')[0]

  return (
    method === 'get' &&
    (/^\/api\/rag\/kb\/public$/.test(url) ||
      /^\/api\/rag\/kb\/public\/page$/.test(url) ||
      /^\/api\/rag\/kb\/public\/documents$/.test(url) ||
      /^\/api\/rag\/kb\/cover$/.test(url))
  )
}

function isPublicRequest(config) {
  return isLoginRequest(config) || isRegisterRequest(config) || isPublicCourseRequest(config) || isPublicCatalogRequest(config) || isPublicKnowledgeBaseRequest(config)
}

function redirectToLogin() {
  import('@/router').then(({ default: router }) => {
    if (router.currentRoute.value.path !== '/login') {
      router.replace('/login')
    }
  })
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

    if (!isPublicRequest(config) && !userStore.token) {
      return handleAuthExpired('请先登录')
    }

    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json'
    }

    if (!isLoginRequest(config) && userStore.token) {
      config.headers['Authorization'] = `${userStore.token}`
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

    const message = error?.response?.data?.message || error?.response?.data?.msg || error?.message || '请求失败'
    return Promise.reject(new Error(message))
  },
)

export default instance
