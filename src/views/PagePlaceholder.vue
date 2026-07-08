<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const pageTitle = computed(() => route.meta.title || '页面占位')
</script>

<template>
  <main class="page-view">
    <section class="page-panel">
      <p class="eyebrow">导航页面</p>
      <h1>{{ pageTitle }}</h1>
      <p class="description">当前仅搭建导航栏框架，页面内容后续按业务模块补充。</p>
    </section>
  </main>
</template>

<style scoped>
.page-view {
  padding: 32px;
}

.page-panel {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
}

.eyebrow {
  margin: 0 0 8px;
  color: #2563eb;
  font-size: 14px;
  font-weight: 600;
}

h1 {
  margin: 0;
  color: #111827;
  font-size: 28px;
  line-height: 1.25;
}

.description {
  margin: 12px 0 0;
  color: #6b7280;
  font-size: 15px;
}

@media (max-width: 640px) {
  .page-view {
    padding: 20px 16px;
  }

  .page-panel {
    padding: 24px;
  }
}
</style>
