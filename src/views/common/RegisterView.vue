<template>
  <main class="register-page">
    <section class="register-panel">
      <div class="brand-mark">E</div>
      <h1>注册功能建设中</h1>
      <p>账号注册入口已预留，后续可在这里接入学生、教师或管理员注册流程。</p>
      <div class="actions">
        <RouterLink class="secondary-action" to="/main/home">返回首页</RouterLink>
        <RouterLink class="primary-action" to="/login">去登录</RouterLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.register-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: #f5f7fb;
  color: #111827;
}

.register-panel {
  width: min(460px, 100%);
  padding: 36px;
  border: 1px solid #e3e8f2;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 18px 44px rgb(15 23 42 / 8%);
  text-align: center;
}

.brand-mark {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  margin: 0 auto 18px;
  border-radius: 8px;
  background: #2f80ed;
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
}

h1 {
  margin: 0;
  font-size: 26px;
}

p {
  margin: 12px 0 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.8;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 28px;
}

.primary-action,
.secondary-action {
  display: inline-flex;
  min-width: 96px;
  height: 40px;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  font-weight: 700;
  text-decoration: none;
}

.primary-action {
  background: #5137cf;
  color: #ffffff;
}

.secondary-action {
  background: #e7e1ff;
  color: #5b3fd6;
}
</style>
