import axios from 'axios'

// 创建 axios 实例，将来对创建出来的实例，进行自定义配置
// 好处：不会污染原始的 axios 实例
// 根据当前协议设置 baseURL
const baseURL = `http://localhost:8080`  // 这里可以根据实际情况修改为你的后端接口地址
// 创建 Axios 实例
const instance = axios.create({
  baseURL: baseURL,
  timeout: 5000
})

// 自定义配置 - 请求/响应 拦截器
// 添加请求拦截器
instance.interceptors.request.use(
  function (config) {
    // 在发送请求之前做些什么
    config.headers['Content-Type'] = 'application/json' // 设置请求头
    config.headers['Authorization'] = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEsImVtYWlsIjoic3VwZXJhZG1pbkBlZHUtcGxhdGZvcm0uY29tIiwidXNlcm5hbWUiOiJhZG1pbl9zdXBlciIsImlhdCI6MTc4MzM5NTkxMSwiZXhwIjoxNzgzNDAzMTExfQ.4JOKDzhglmRPweBpIXKs9PcKmtehsI1A88-6-QmXhdQ'
    return config
  },
  function (error) {
    // 对请求错误做些什么
    return Promise.reject(error)
  }
)

// 添加响应拦截器
instance.interceptors.response.use(
  function (response) {
    // 2xx 范围内的状态码都会触发该函数。
    // 对响应数据做点什么 (默认axios会多包装一层data，需要响应拦截器中处理一下)
    const res = response.data

    return res
  },
  function (error) {
    // 超出 2xx 范围的状态码都会触发该函数。
    // 对响应错误做点什么
    return Promise.reject(error)
  }
)

// 导出配置好的实例
export default instance
