<script setup>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { computed, ref, watchEffect } from 'vue'
import { pageRoutes } from './router'

const route = useRoute()
const router = useRouter()
const currentRole = ref('teacher')

const roleOptions = [
  { label: '老师', value: 'teacher' },
  { label: '学生', value: 'student' },
  { label: '管理员', value: 'admin' },
]

const navRoutes = computed(() => {
  if (currentRole.value === 'admin') {
    return pageRoutes.filter((route) => route.meta.navGroup === 'admin')
  }

  return pageRoutes.filter(
    (route) => route.meta.navGroup === 'home' || route.meta.navGroup === currentRole.value,
  )
})

watchEffect(() => {
  if (route.meta.navGroup === 'teacher' || route.meta.navGroup === 'student' || route.meta.navGroup === 'admin') {
    currentRole.value = route.meta.navGroup
  }
})

function selectRole(role) {
  currentRole.value = role

  if (role === 'admin' && route.meta.navGroup !== 'admin') {
    router.push('/admin/home')
    return
  }

  if (route.meta.navGroup !== 'home' && route.meta.navGroup !== role) {
    router.push('/')
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="top-bar">
      <RouterLink class="brand" to="/" aria-label="返回首页">
        Edu-F
      </RouterLink>

      <nav class="main-nav" aria-label="主导航">
        <RouterLink
          v-for="route in navRoutes"
          :key="route.name"
          class="nav-link"
          :to="route.path"
        >
          {{ route.meta.navLabel }}
        </RouterLink>
      </nav>

      <div class="role-switch" aria-label="身份切换">
        <button
          v-for="role in roleOptions"
          :key="role.value"
          class="role-button"
          :class="{ active: currentRole === role.value }"
          type="button"
          @click="selectRole(role.value)"
        >
          {{ role.label }}
        </button>
      </div>
    </header>

    <RouterView />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  background: #f7f8fa;
  color: #1f2937;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px;
  min-height: 64px;
  padding: 0 28px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
}

.brand {
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.main-nav {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  flex: 0 0 auto;
  padding: 0 12px;
  border-radius: 6px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1;
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.nav-link:hover {
  background: #f1f5f9;
  color: #111827;
}

.nav-link.router-link-active {
  background: #2563eb;
  color: #ffffff;
}

.role-switch {
  display: inline-flex;
  flex: 0 0 auto;
  padding: 3px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: #f9fafb;
}

.role-button {
  min-width: 48px;
  height: 30px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #4b5563;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.role-button.active {
  background: #111827;
  color: #ffffff;
}

@media (max-width: 860px) {
  .top-bar {
    grid-template-columns: 1fr auto;
    gap: 12px;
    padding: 12px 16px;
  }

  .main-nav {
    grid-column: 1 / -1;
    order: 3;
    width: 100%;
  }
}
</style>
