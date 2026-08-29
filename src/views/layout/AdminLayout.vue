<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminShellStore } from '@/stores/adminShell'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const shellStore = useAdminShellStore()
const userStore = useUserStore()

const menuKey = ref(0)

const personnelMenus = [
  {
    label: '管理人员',
    path: '/main/admin/personnel/managers',
    roles: ['SUPERADMIN'],
  },
  {
    label: '教师人员',
    path: '/main/admin/personnel/teachers',
    roles: ['ADMIN', 'SUPERADMIN'],
  },
  {
    label: '学生人员',
    path: '/main/admin/personnel/students',
    roles: ['ADMIN', 'SUPERADMIN'],
  },
]

const govMaterialMenus = [
  {
    label: '资料分类管理',
    path: '/main/admin/gov-material/categories',
    roles: ['ADMIN', 'SUPERADMIN'],
  },
  {
    label: '资料内容管理',
    path: '/main/admin/gov-material/materials',
    roles: ['ADMIN', 'SUPERADMIN'],
  },
]

const govNewsMenus = [{
  label: '资讯与公告管理',
  path: '/main/admin/gov-news',
  roles: ['ADMIN', 'SUPERADMIN'],
}]

const utilityMenus = [
  {
    label: '安全治理',
    path: '/main/admin/safety',
    roles: ['ADMIN', 'SUPERADMIN'],
  },
  {
    label: '知识库问答',
    path: '/main/knowledge-qa/chat',
    roles: ['ADMIN', 'SUPERADMIN'],
  },
]

const visiblePersonnelMenus = computed(() => {
  return personnelMenus.filter((item) => userStore.hasAnyRole(item.roles))
})

const visibleUtilityMenus = computed(() => {
  return utilityMenus.filter((item) => userStore.hasAnyRole(item.roles))
})

const visibleGovMaterialMenus = computed(() => {
  return govMaterialMenus.filter((item) => userStore.hasAnyRole(item.roles))
})
const visibleGovNewsMenus = computed(() => govNewsMenus.filter((item) => userStore.hasAnyRole(item.roles)))

const activeMenu = computed(() => {
  if (route.path.startsWith('/main/admin/personnel/')) {
    return route.path
  }

  if (route.path.startsWith('/main/admin/gov-material/')) {
    return route.path
  }
  if (route.path.startsWith('/main/admin/gov-news')) return '/main/admin/gov-news'

  if (route.path.startsWith('/main/admin/safety')) {
    return '/main/admin/safety'
  }

  if (route.path.startsWith('/main/knowledge-qa')) {
    return '/main/knowledge-qa/chat'
  }

  return ''
})

const openedMenus = computed(() => shellStore.openedMenus)

watch(
  () => route.path,
  (path) => {
    if (path.startsWith('/main/admin/personnel/')) {
      shellStore.openMenu('personnel')
      shellStore.setActiveMenu(path)
      return
    }

    if (path.startsWith('/main/admin/gov-material/')) {
      shellStore.openMenu('gov-material')
      shellStore.setActiveMenu(path)
      return
    }
    if (path.startsWith('/main/admin/gov-news')) {
      shellStore.openMenu('gov-news')
      shellStore.setActiveMenu('/main/admin/gov-news')
      return
    }

    if (path.startsWith('/main/admin/safety')) {
      shellStore.openMenu('utility')
      shellStore.setActiveMenu('/main/admin/safety')
      return
    }

    if (path.startsWith('/main/knowledge-qa')) {
      shellStore.openMenu('utility')
      shellStore.setActiveMenu('/main/knowledge-qa/chat')
      return
    }

    shellStore.closeMenu('personnel')
    shellStore.closeMenu('utility')
    shellStore.closeMenu('gov-material')
    shellStore.closeMenu('gov-news')
    shellStore.setActiveMenu('')
  },
  { immediate: true },
)

watch(
  () => userStore.roleCode,
  async () => {
    await nextTick()
    menuKey.value += 1
  },
)

function handleOpen(index) {
  shellStore.openMenu(index)
}

function handleClose(index) {
  shellStore.closeMenu(index)
}

function handleSelect(index) {
  if (index.startsWith('/main/admin/personnel/')) {
      shellStore.openMenu('personnel')
    }

    if (index.startsWith('/main/admin/gov-material/')) {
      shellStore.openMenu('gov-material')
    }
    if (index.startsWith('/main/admin/gov-news')) shellStore.openMenu('gov-news')

    if (index.startsWith('/main/admin/safety')) {
    shellStore.openMenu('utility')
  }

  if (index.startsWith('/main/knowledge-qa')) {
    shellStore.openMenu('utility')
  }

  shellStore.setActiveMenu(index)
  router.push(index)
}
</script>

<template>
  <el-container class="admin-shell">
    <el-aside width="232px" class="sidebar">
      <div class="brand-block">
        <div class="brand-mark">M</div>
        <div>
          <div class="brand-name">管理端</div>
          <div class="brand-subtitle">后台管理系统</div>
        </div>
      </div>

      <el-scrollbar class="menu-scrollbar">
        <el-menu
          :key="menuKey"
          class="sidebar-menu"
          :default-active="activeMenu"
          :default-openeds="openedMenus"
          background-color="#172033"
          text-color="#cbd5e1"
          active-text-color="#ffffff"
          unique-opened
          :router="false"
          @open="handleOpen"
          @close="handleClose"
          @select="handleSelect"
        >
          <el-sub-menu v-if="visiblePersonnelMenus.length" index="personnel">
            <template #title>
              <span>人员管理</span>
            </template>
            <el-menu-item
              v-for="item in visiblePersonnelMenus"
              :key="item.path"
              :index="item.path"
            >
              {{ item.label }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu v-if="visibleUtilityMenus.length" index="utility">
            <template #title>
              <span>常用入口</span>
            </template>
            <el-menu-item v-for="item in visibleUtilityMenus" :key="item.path" :index="item.path">
              {{ item.label }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu v-if="visibleGovMaterialMenus.length" index="gov-material">
            <template #title>
              <span>考公资料管理</span>
            </template>
            <el-menu-item
              v-for="item in visibleGovMaterialMenus"
              :key="item.path"
              :index="item.path"
            >
              {{ item.label }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu v-if="visibleGovNewsMenus.length" index="gov-news">
            <template #title><span>考公资讯管理</span></template>
            <el-menu-item v-for="item in visibleGovNewsMenus" :key="item.path" :index="item.path">{{ item.label }}</el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-main class="content-area">
      <RouterView />
    </el-main>
  </el-container>
</template>

<style scoped>
.admin-shell {
  height: 100%;
  min-height: 0;
  background: #f4f6f9;
  color: #1f2937;
}

.sidebar {
  display: flex;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  background: #172033;
  box-shadow: 8px 0 24px rgb(15 23 42 / 8%);
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 72px;
  padding: 0 20px;
  border-bottom: 1px solid rgb(255 255 255 / 8%);
}

.brand-mark {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 8px;
  background: #2f80ed;
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
}

.brand-name {
  color: #ffffff;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}

.brand-subtitle {
  margin-top: 3px;
  color: #94a3b8;
  font-size: 12px;
}

.menu-scrollbar {
  flex: 1;
  min-height: 0;
}

.sidebar-menu {
  border-right: 0;
}

.content-area {
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

:deep(.el-menu-item.is-active) {
  background: #2f80ed;
}

:deep(.el-sub-menu__title:hover),
:deep(.el-menu-item:hover) {
  background: #22304a;
}
</style>
