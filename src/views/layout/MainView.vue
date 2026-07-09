<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const studentNavItems = [
  { label: '学生班级列表/加入班级页', path: '/main/student/classes', roles: ['STUDENT'] },
  { label: '学生班级详情页', path: '/main/student/class-detail', roles: ['STUDENT'] },
  { label: '学生课程详情/课程学习页', path: '/main/student/course-study', roles: ['STUDENT'] },
  { label: '学生平台公开课程页', path: '/main/student/platform-courses', roles: ['STUDENT'] },
]

const teacherNavItems = [
  { label: '老师班级列表/班级管理页', path: '/main/teacher/classes', roles: ['TEACHER'] },
  { label: '老师班级详情页', path: '/main/teacher/class-detail', roles: ['TEACHER'] },
  { label: '老师课程列表/课程管理页', path: '/main/teacher/courses', roles: ['TEACHER'] },
  { label: '老师课程详情/章节资源管理页', path: '/main/teacher/course-resources', roles: ['TEACHER'] },
]

const navItems = computed(() => {
  const items = [
    {
      label: '首页',
      path: '/main/home',
      roles: [],
    },
  ]

  if (userStore.roleCode === 'STUDENT') {
    items.push(...studentNavItems)
  }

  if (userStore.roleCode === 'TEACHER') {
    items.push(...teacherNavItems)
  }

  if (['ADMIN', 'SUPERADMIN'].includes(userStore.roleCode)) {
    items.push({ label: '管理', path: getAdminEntryPath(), roles: ['ADMIN', 'SUPERADMIN'] })
  }

  return items
})

const activePath = computed(() => {
  if (route.path.startsWith('/main/admin')) {
    return getAdminEntryPath()
  }

  return route.path
})

function getAdminEntryPath() {
  return userStore.roleCode === 'SUPERADMIN'
    ? '/main/admin/personnel/managers'
    : '/main/admin/personnel/teachers'
}

function handleSelect(path) {
  router.push(path)
}

function handleLogout() {
  userStore.clearUser()
  router.replace('/login')
}
</script>

<template>
  <el-container class="main-shell">
    <el-header class="main-header" height="64px">
      <div class="header-left">
        <div class="brand-mark">E</div>
        <div class="brand-text">Edu-F 教育平台</div>
      </div>

      <el-menu
        mode="horizontal"
        class="top-menu"
        :default-active="activePath"
        :ellipsis="false"
        @select="handleSelect"
      >
        <el-menu-item v-for="item in navItems" :key="item.path" :index="item.path">
          {{ item.label }}
        </el-menu-item>
      </el-menu>

      <div class="user-box">
        <div class="user-info">
          <span class="user-name">{{ userStore.realName || userStore.username }}</span>
          <span class="user-role">{{ userStore.roleName || userStore.roleCode }}</span>
        </div>
        <el-button size="small" @click="handleLogout">退出</el-button>
      </div>
    </el-header>

    <el-main class="main-content">
      <RouterView />
    </el-main>
  </el-container>
</template>

<style scoped>
.main-shell {
  height: 100vh;
  overflow: hidden;
  background: #f4f6f9;
}

.main-header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 24px;
  border-bottom: 1px solid #e5eaf2;
  background: #ffffff;
  box-shadow: 0 4px 16px rgb(15 23 42 / 5%);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 190px;
}

.brand-mark {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  background: #2f80ed;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
}

.brand-text {
  color: #111827;
  font-size: 17px;
  font-weight: 700;
  white-space: nowrap;
}

.top-menu {
  min-width: 0;
  border-bottom: 0;
}

.user-box {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
}

.user-name {
  color: #111827;
  font-size: 14px;
  font-weight: 600;
}

.user-role {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.main-content {
  height: calc(100vh - 64px);
  padding: 0;
  overflow: auto;
}
</style>
