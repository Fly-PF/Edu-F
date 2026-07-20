<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Lock, User, UserFilled } from '@element-plus/icons-vue'
import { registerStudent } from '@/api/auth'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({
  username: '',
  realName: '',
  password: '',
  confirmPassword: '',
})

const rules = {
  username: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]{2,50}$/, message: '账号格式错误', trigger: 'blur' },
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' },
    { max: 30, message: '真实姓名最多30个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 8, max: 32, message: '密码长度必须为8-32个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { min: 8, max: 32, message: '确认密码长度必须为8-32个字符', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error('两次密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || '注册失败，请稍后重试'
}

async function handleRegister() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true
  try {
    const res = await registerStudent({
      username: form.username.trim(),
      realName: form.realName.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
    })

    if (res?.code !== 200) {
      throw new Error(res?.message || '注册失败')
    }

    ElMessage.success(res.message || '注册成功')
    router.replace({ path: '/login', query: { username: form.username.trim() } })
  } catch (error) {
    ElMessage.error(getErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="register-page">
    <div class="background-code background-code-left" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div class="background-code background-code-right" aria-hidden="true">
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
      <span></span>
    </div>
    <div class="background-wave" aria-hidden="true"></div>

    <div class="brand-row">
      <div class="brand-mark">E</div>
      <div>
        <div class="brand-name">Edu-F</div>
        <div class="brand-subtitle">AI 教育学习平台</div>
      </div>
    </div>

    <section class="register-card">
      <div class="tabs" aria-hidden="true">
        <span class="tab-active">账号注册</span>
      </div>

      <el-form ref="formRef" class="register-form" :model="form" :rules="rules" label-position="top" @keyup.enter="handleRegister">
        <el-form-item prop="username">
          <el-input v-model="form.username" size="large" clearable placeholder="用户名支持英文、数字和连字符，设置后不可修改">
            <template #prefix>
              <el-icon><User /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="realName">
          <el-input v-model="form.realName" size="large" clearable placeholder="真实姓名">
            <template #prefix>
              <el-icon><UserFilled /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            size="large"
            type="password"
            show-password
            placeholder="设置密码"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            size="large"
            type="password"
            show-password
            placeholder="确认密码"
          >
            <template #prefix>
              <el-icon><Lock /></el-icon>
            </template>
          </el-input>
        </el-form-item>

        <el-button class="register-button" type="primary" size="large" :loading="loading" :disabled="loading" @click="handleRegister">
          立即注册
        </el-button>

        <div class="form-actions">
          <RouterLink class="text-link" to="/login">返回登录</RouterLink>
          <RouterLink class="text-link muted-link" to="/main/home">返回首页</RouterLink>
        </div>
      </el-form>
    </section>
  </main>
</template>

<style scoped>
.register-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 88px 24px 40px;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 22% 16%, rgb(10 104 137 / 46%) 0, transparent 32%),
    radial-gradient(ellipse at 87% 62%, rgb(0 138 193 / 38%) 0, transparent 26%),
    linear-gradient(90deg, #031d49 0%, #062a5b 42%, #071d52 100%);
  color: #111827;
}

.register-page::before,
.register-page::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
}

.register-page::before {
  background:
    linear-gradient(132deg, transparent 0 7%, rgb(28 154 189 / 20%) 7.2% 8.6%, transparent 8.8% 100%),
    linear-gradient(146deg, transparent 0 52%, rgb(27 145 185 / 22%) 52.2% 58%, transparent 58.4% 100%),
    linear-gradient(180deg, rgb(12 71 120 / 20%) 0, transparent 22%, rgb(2 12 45 / 16%) 100%);
  opacity: 0.92;
}

.register-page::after {
  background:
    radial-gradient(ellipse at 52% 38%, rgb(56 154 209 / 16%) 0, transparent 38%),
    linear-gradient(90deg, rgb(2 14 45 / 55%) 0, transparent 30%, rgb(4 15 52 / 42%) 100%);
  opacity: 0.82;
}

.background-code {
  position: absolute;
  z-index: 0;
  display: flex;
  flex-direction: column;
  gap: 22px;
  pointer-events: none;
  opacity: 0.5;
  filter: blur(6px);
}

.background-code span {
  display: block;
  height: 18px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgb(94 184 231 / 8%), rgb(117 202 242 / 30%), rgb(70 158 219 / 8%));
  box-shadow: 0 0 20px rgb(75 174 231 / 16%);
}

.background-code-left {
  left: -3%;
  bottom: 1%;
  width: 44%;
}

.background-code-left span:nth-child(1) {
  width: 68%;
}

.background-code-left span:nth-child(2) {
  width: 58%;
}

.background-code-left span:nth-child(3) {
  width: 76%;
}

.background-code-left span:nth-child(4) {
  width: 55%;
}

.background-code-left span:nth-child(5) {
  width: 82%;
}

.background-code-left span:nth-child(6) {
  width: 62%;
}

.background-code-left span:nth-child(7) {
  width: 70%;
}

.background-code-left span:nth-child(8) {
  width: 48%;
}

.background-code-right {
  right: -1%;
  top: 17%;
  width: 57%;
  gap: 28px;
  opacity: 0.58;
}

.background-code-right span {
  height: 20px;
}

.background-code-right span:nth-child(1) {
  width: 46%;
  margin-left: 28%;
}

.background-code-right span:nth-child(2) {
  width: 84%;
}

.background-code-right span:nth-child(3) {
  width: 91%;
  margin-left: 5%;
}

.background-code-right span:nth-child(4) {
  width: 78%;
  margin-left: 2%;
}

.background-code-right span:nth-child(5) {
  width: 86%;
  margin-left: 8%;
}

.background-code-right span:nth-child(6) {
  width: 72%;
  margin-left: 16%;
}

.background-code-right span:nth-child(7) {
  width: 82%;
  margin-left: 21%;
}

.background-wave {
  position: absolute;
  right: -8%;
  bottom: -24%;
  z-index: 0;
  width: 56%;
  aspect-ratio: 1.8;
  border-radius: 50% 0 0 0;
  background:
    repeating-linear-gradient(83deg, rgb(60 201 230 / 24%) 0 2px, transparent 2px 20px),
    linear-gradient(180deg, rgb(13 145 185 / 26%), transparent 58%);
  filter: blur(1px);
  opacity: 0.72;
  transform: perspective(520px) rotateX(58deg) rotateZ(-5deg);
}

.brand-row {
  position: absolute;
  z-index: 1;
  top: 38px;
  left: 72px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #ffffff;
}

.brand-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 8px;
  background: #2f80ed;
  box-shadow: 0 10px 26px rgb(12 36 66 / 28%);
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
}

.brand-name {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.2;
}

.brand-subtitle {
  margin-top: 4px;
  color: #dbeafe;
  font-size: 12px;
}

.register-card {
  position: relative;
  z-index: 1;
  width: min(552px, 100%);
  padding: 58px 70px 48px;
  border-radius: 18px;
  background: rgb(246 248 252 / 92%);
  box-shadow: 0 34px 90px rgb(0 12 42 / 38%);
}

.tabs {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
  font-size: 24px;
  font-weight: 700;
}

.tab-active {
  position: relative;
  color: #121826;
}

.tab-active::after {
  position: absolute;
  left: 50%;
  bottom: -16px;
  width: 56px;
  height: 2px;
  background: #1d63ff;
  content: '';
  transform: translateX(-50%);
}

.register-form :deep(.el-form-item) {
  margin-bottom: 26px;
}

.register-form :deep(.el-input__wrapper) {
  min-height: 48px;
  padding: 0;
  border-radius: 0;
  border-bottom: 1px solid #cfd5df;
  background: transparent;
  box-shadow: none;
}

.register-form :deep(.el-input__wrapper.is-focus) {
  border-bottom-color: #1d63ff;
  box-shadow: none;
}

.register-form :deep(.el-form-item.is-error .el-input__wrapper) {
  border-bottom-color: #ff6b6b;
  box-shadow: none;
}

.register-form :deep(.el-input__inner) {
  color: #1f2937;
  font-size: 14px;
}

.register-form :deep(.el-input__inner::placeholder) {
  color: #a4abb7;
}

.register-form :deep(.el-input__prefix) {
  margin-right: 8px;
  color: #5f6673;
}

.register-form :deep(.el-form-item__error) {
  padding-top: 5px;
}

.register-button {
  width: 100%;
  height: 42px;
  margin-top: 8px;
  border: 0;
  border-radius: 4px;
  background: #074d87;
  font-weight: 700;
}

.register-button:hover,
.register-button:focus {
  background: #0a5fa4;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 26px;
  margin-top: 22px;
}

.text-link {
  color: #0b63e5;
  font-size: 14px;
  text-decoration: none;
}

.muted-link {
  color: #5f6b7a;
}

@media (max-width: 700px) {
  .register-page {
    padding: 108px 18px 28px;
  }

  .brand-row {
    top: 28px;
    left: 24px;
  }

  .register-card {
    padding: 42px 28px 34px;
    border-radius: 14px;
  }

  .tabs {
    margin-bottom: 34px;
    font-size: 21px;
  }
}
</style>
