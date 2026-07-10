<template>
  <main class="placeholder-page">
    <section class="placeholder-panel">
      <h1>公共首页</h1>
      <p>这里将展示平台公共内容。</p>
    </section>
  </main>
</template>

<style scoped>
.placeholder-page {
  height: 100%;
  padding: 32px;
  overflow: auto;
}

.placeholder-panel {
  display: grid;
  min-height: 100%;
  place-content: center;
  border: 1px solid #e5eaf2;
  border-radius: 8px;
  background: #ffffff;
  text-align: center;
}

h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
  font-weight: 700;
}

p {
  margin: 12px 0 0;
  color: #64748b;
  font-size: 15px;
}
</style>
