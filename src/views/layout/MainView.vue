<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchUserProfile } from '@/api/user'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const headerAvatarLoadFailed = ref(false)
const defaultAvatar =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"%3E%3Crect width="160" height="160" rx="80" fill="%23eef2f7"/%3E%3Ccircle cx="80" cy="62" r="30" fill="%239aa6b2"/%3E%3Cpath d="M31 138c8-28 26-43 49-43s41 15 49 43" fill="%239aa6b2"/%3E%3C/svg%3E'

const userTypeMap = {
  1: '学生',
  2: '教师',
  3: '教研人员',
  4: '平台管理员',
  5: '超级管理员',
}

const studentNavItems = [
  { label: '学生班级列表/加入班级页', path: '/main/student/classes', roles: ['STUDENT'] },
  { label: '学生班级详情页', path: '/main/student/class-detail', roles: ['STUDENT'] },
  { label: '学生课程详情/课程学习页', path: '/main/student/course-study', roles: ['STUDENT'] },
]

const teacherNavItems = [
  { label: '老师班级列表/班级管理页', path: '/main/teacher/classes', roles: ['TEACHER'] },
  { label: '老师班级详情页', path: '/main/teacher/class-detail', roles: ['TEACHER'] },
  { label: '课程管理', path: '/main/teacher/courses', roles: ['TEACHER'] },
]

const navItems = computed(() => {
  const items = [
    {
      label: '首页',
      path: '/main/home',
      roles: [],
    },
    {
      label: '课程列表',
      path: '/main/courses',
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

  if (route.name === 'teacher-course-resources') {
    return '/main/teacher/courses'
  }

  if (route.name === 'student-platform-courses' || route.name === 'course-learn') {
    return '/main/courses'
  }

  return route.path
})

const headerAvatar = computed(() => {
  if (headerAvatarLoadFailed.value || !userStore.avatar) {
    return defaultAvatar
  }

  return userStore.avatar
})

const headerUserType = computed(() => {
  return userTypeMap[userStore.userType] || userStore.roleName || userStore.roleCode
})

function getAdminEntryPath() {
  return userStore.roleCode === 'SUPERADMIN'
    ? '/main/admin/personnel/managers'
    : '/main/admin/personnel/teachers'
}

function handleSelect(path) {
  router.push(path)
}

function handleUserCommand(command) {
  if (command === 'profile') {
    router.push('/main/profile')
    return
  }

  if (command === 'logout') {
    handleLogout()
  }
}

function handleLogout() {
  userStore.clearUser()
  router.replace('/login')
}

async function loadCurrentUserProfile() {
  if (!userStore.token) {
    return
  }

  try {
    const res = await fetchUserProfile()

    if (Number(res?.code) === 200) {
      userStore.setProfile(res.data)
    }
  } catch {
    // The request interceptor handles expired auth; keep the layout quiet for other transient failures.
  }
}

watch(
  () => userStore.avatar,
  () => {
    headerAvatarLoadFailed.value = false
  },
)

onMounted(loadCurrentUserProfile)
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
          <span class="user-role">{{ headerUserType }}</span>
        </div>
        <el-dropdown trigger="click" @command="handleUserCommand">
          <button class="avatar-trigger" type="button" aria-label="用户菜单">
            <el-avatar :size="34" :src="headerAvatar" @error="headerAvatarLoadFailed = true" />
            <span class="avatar-arrow">&gt;</span>
          </button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">个人中心</el-dropdown-item>
              <el-dropdown-item command="logout" divided>退出</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
  gap: 12px;
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

.avatar-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px 3px 3px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.avatar-trigger:hover,
.avatar-trigger:focus-visible {
  border-color: #dbeafe;
  background: #eff6ff;
  color: #2563eb;
  outline: none;
}

.avatar-arrow {
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.main-content {
  height: calc(100vh - 64px);
  padding: 0;
  overflow: auto;
}
</style>
