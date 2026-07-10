<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { loginByUsername } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref(null)
const loading = ref(false)
const errorMessage = ref('')

const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || '登录失败，请稍后重试'
}

async function handleLogin() {
  errorMessage.value = ''
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    return
  }

  loading.value = true
  try {
    const res = await loginByUsername({
      username: form.username.trim(),
      password: form.password,
    })

    if (res?.code !== 200) {
      throw new Error(res?.message || '登录失败')
    }

    userStore.setUser(res.data || {})
    ElMessage.success(res.message || '登录成功')
    router.replace('/main')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
    ElMessage.error(errorMessage.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-visual">
      <div class="brand-row">
        <div class="brand-mark">E</div>
        <div>
          <div class="brand-name">Edu-F</div>
          <div class="brand-subtitle">AI 教育学习平台</div>
        </div>
      </div>

      <div class="visual-copy">
        <p class="eyebrow">AI Learning Platform</p>
        <h1>用项目练习连接课程、实践与 AI 助学</h1>
        <p class="summary">面向学生与教师的学习空间，围绕课程学习、项目任务、智能反馈与成长记录展开。</p>
      </div>

      <div class="learning-scene" aria-hidden="true">
        <div class="scene-board">
          <div class="scene-header">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="scene-grid">
            <div class="scene-card course-card">
              <strong>课程</strong>
              <span>AI 基础入门</span>
            </div>
            <div class="scene-card project-card">
              <strong>项目</strong>
              <span>智能校园助手</span>
            </div>
            <div class="scene-card practice-card">
              <strong>练习</strong>
              <span>实时反馈</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="login-panel">
      <div class="form-wrap">
        <h2>欢迎登录</h2>
        <p class="form-subtitle">进入 Edu-F 开始课程学习与项目实践</p>

        <el-alert v-if="errorMessage" class="login-error" :title="errorMessage" type="error" show-icon />

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @keyup.enter="handleLogin">
          <el-form-item label="账号" prop="username">
            <el-input v-model="form.username" size="large" clearable placeholder="请输入账号" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input
              v-model="form.password"
              size="large"
              type="password"
              show-password
              placeholder="请输入密码"
            />
          </el-form-item>
          <el-button class="login-button" type="primary" size="large" :loading="loading" @click="handleLogin">
            登录
          </el-button>
        </el-form>
      </div>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  display: grid;
  width: 100%;
  height: 100vh;
  grid-template-columns: minmax(380px, 0.95fr) minmax(420px, 1.05fr);
  background: #f6f8fb;
  overflow: hidden;
}

.login-visual {
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: space-between;
  padding: 42px;
  background: linear-gradient(145deg, #14314a 0%, #1e4f67 58%, #227469 100%);
  color: #ffffff;
}

.brand-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-mark {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 8px;
  background: #2f80ed;
  box-shadow: 0 10px 26px rgb(12 36 66 / 28%);
  font-size: 20px;
  font-weight: 700;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}

.brand-subtitle {
  margin-top: 4px;
  color: #cfe1ea;
  font-size: 13px;
}

.visual-copy {
  max-width: 520px;
}

.eyebrow {
  margin: 0 0 14px;
  color: #b7f0dc;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0;
}

.visual-copy h1 {
  margin: 0;
  font-size: 38px;
  font-weight: 700;
  line-height: 1.26;
}

.summary {
  margin: 20px 0 0;
  color: #e1edf2;
  font-size: 16px;
  line-height: 1.8;
}

.learning-scene {
  max-width: 520px;
}

.scene-board {
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 8px;
  background: rgb(255 255 255 / 10%);
  box-shadow: 0 24px 50px rgb(6 26 42 / 24%);
}

.scene-header {
  display: flex;
  gap: 7px;
  padding: 14px 16px;
  border-bottom: 1px solid rgb(255 255 255 / 14%);
}

.scene-header span {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #d5edf0;
}

.scene-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding: 16px;
}

.scene-card {
  min-height: 92px;
  padding: 14px;
  border-radius: 8px;
  background: #ffffff;
  color: #17324d;
}

.scene-card strong {
  display: block;
  color: #111827;
  font-size: 15px;
}

.scene-card span {
  display: block;
  margin-top: 10px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.course-card {
  border-top: 4px solid #2f80ed;
}

.project-card {
  border-top: 4px solid #20a779;
}

.practice-card {
  border-top: 4px solid #f2a93b;
}

.login-panel {
  display: grid;
  min-width: 0;
  min-height: 0;
  padding: 32px;
  place-items: center;
}

.form-wrap {
  width: min(420px, 100%);
  padding: 40px;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 16px 42px rgb(15 23 42 / 8%);
}

.form-wrap h2 {
  margin: 0;
  color: #111827;
  font-size: 26px;
  font-weight: 700;
}

.form-subtitle {
  margin: 10px 0 28px;
  color: #6b7280;
  font-size: 14px;
}

.login-error {
  margin-bottom: 18px;
}

.login-button {
  width: 100%;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .login-page {
    height: auto;
    min-height: 100vh;
    grid-template-columns: 1fr;
    overflow-y: auto;
  }

  .login-visual {
    min-height: 520px;
  }
}

@media (max-width: 560px) {
  .login-visual,
  .login-panel {
    padding: 24px;
  }

  .visual-copy h1 {
    font-size: 30px;
  }

  .scene-grid {
    grid-template-columns: 1fr;
  }

  .form-wrap {
    padding: 28px;
  }
}
</style>
