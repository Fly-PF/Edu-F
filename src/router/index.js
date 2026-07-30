import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

function getAdminEntryPath(roleCode) {
  return roleCode === 'SUPERADMIN'
    ? '/main/admin/personnel/managers'
    : '/main/admin/personnel/teachers'
}

function getTeacherEntryPath() {
  return '/main/teacher/safety'
}

function getStudentEntryPath() {
  return '/main/student/classes'
}

function getMainEntryPath(userStore) {
  if (['ADMIN', 'SUPERADMIN'].includes(userStore.roleCode)) {
    return '/main/admin/safety'
  }

  if (userStore.roleCode === 'TEACHER') {
    return getTeacherEntryPath()
  }

  if (userStore.roleCode === 'STUDENT') {
    return getStudentEntryPath()
  }

  return '/main/home'
}

const publicRouteNames = new Set(['main-home', 'login', 'register'])

const personnelRoutes = [
  {
    path: 'personnel/managers',
    name: 'personnel-managers',
    component: () => import('@/views/admin/PersonnelManage.vue'),
    meta: {
      title: '管理人员',
      resource: 'managers',
      allowedRoles: ['SUPERADMIN'],
    },
  },
  {
    path: 'personnel/teachers',
    name: 'personnel-teachers',
    component: () => import('@/views/admin/PersonnelManage.vue'),
    meta: {
      title: '教师人员',
      resource: 'teachers',
      allowedRoles: ['ADMIN', 'SUPERADMIN'],
    },
  },
  {
    path: 'personnel/students',
    name: 'personnel-students',
    component: () => import('@/views/admin/PersonnelManage.vue'),
    meta: {
      title: '学生人员',
      resource: 'students',
      allowedRoles: ['ADMIN', 'SUPERADMIN'],
    },
  },
]

const teacherRoutes = [
  {
    path: 'teacher/safety',
    name: 'teacher-safety-workbench',
    component: () => import('@/views/teacher/TeacherStudentSafetyReview.vue'),
    meta: {
      title: '教师学生内容审核',
      allowedRoles: ['TEACHER'],
    },
  },
  {
    path: 'teacher/classes',
    name: 'teacher-classes',
    component: () => import('@/views/teacher/TeacherClassManage.vue'),
    meta: {
      title: '老师班级列表/班级管理页',
      allowedRoles: ['TEACHER'],
    },
  },
  {
    path: 'teacher/class-detail',
    name: 'teacher-class-detail',
    component: () => import('@/views/teacher/TeacherClassDetailView.vue'),
    meta: {
      title: '老师班级详情页',
      allowedRoles: ['TEACHER'],
    },
  },
  {
    path: 'teacher/courses',
    name: 'teacher-courses',
    component: () => import('@/views/teacher/TeacherCourseManage.vue'),
    meta: {
      title: '老师课程列表/课程管理页',
      allowedRoles: ['TEACHER'],
    },
  },
  {
    path: 'teacher/course-resources',
    name: 'teacher-course-resources',
    component: () => import('@/views/teacher/TeacherCourseResources.vue'),
    meta: {
      title: '老师课程详情/章节资源管理页',
      allowedRoles: ['TEACHER'],
    },
  },
]

const studentRoutes = [
  {
    path: 'student/classes',
    name: 'student-classes',
    component: () => import('@/views/student/StudentClassJoin.vue'),
    meta: {
      title: '学生班级列表/加入班级页',
      allowedRoles: ['STUDENT'],
    },
  },
  {
    path: 'student/class-detail',
    name: 'student-class-detail',
    component: () => import('@/views/student/StudentClassDetail.vue'),
    meta: {
      title: '学生班级详情页',
      allowedRoles: ['STUDENT'],
    },
  },
  {
    path: 'student/course-study',
    name: 'student-course-study',
    component: () => import('@/views/student/StudentCourseStudy.vue'),
    meta: {
      title: '学生课程详情/课程学习页',
      allowedRoles: ['STUDENT'],
    },
  },
  {
    path: 'student/platform-courses',
    name: 'student-platform-courses',
    redirect: '/main/courses',
    meta: {
      title: '学生平台公开课程页',
      allowedRoles: ['STUDENT'],
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/main/admin/safety',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/common/LoginView.vue'),
      meta: {
        publicOnly: true,
      },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/common/RegisterView.vue'),
      meta: {
        publicOnly: true,
      },
    },
    {
      path: '/safety',
      name: 'safety-cockpit',
      redirect: '/main/admin/safety',
    },
    {
      path: '/main',
      name: 'main',
      component: () => import('@/views/layout/MainView.vue'),
      redirect: '/main/admin/safety',
      children: [
        {
          path: 'home',
          name: 'main-home',
          redirect: '/main/admin/safety',
        },
        {
          path: 'knowledge-qa',
          name: 'knowledge-qa',
          component: () => import('@/views/common/KnowledgeBaseChatView.vue'),
          meta: {
            title: '知识库问答',
          },
        },
        {
          path: 'profile',
          name: 'main-profile',
          component: () => import('@/views/common/ProfileView.vue'),
        },
        {
          path: 'courses',
          name: 'course-list',
          component: () => import('@/views/student/StudentPlatformCourses.vue'),
          meta: {
            title: '课程列表',
          },
        },
        {
          path: 'courses/:courseId/learn',
          name: 'course-learn',
          component: () => import('@/views/student/StudentCourseStudy.vue'),
          meta: {
            title: '课程学习',
          },
        },
        {
          path: 'student',
          name: 'main-student',
          redirect: getStudentEntryPath,
          meta: {
            allowedRoles: ['STUDENT'],
          },
        },
        ...studentRoutes,
        {
          path: 'teacher',
          name: 'main-teacher',
          redirect: getTeacherEntryPath,
          meta: {
            allowedRoles: ['TEACHER'],
          },
        },
        ...teacherRoutes,
        {
          path: 'admin',
          name: 'main-admin',
          component: () => import('@/views/layout/AdminLayout.vue'),
          redirect: '/main/admin/safety',
          meta: {
            allowedRoles: ['ADMIN', 'SUPERADMIN'],
          },
          children: [
            {
              path: 'safety',
              name: 'admin-safety-cockpit',
              component: () => import('@/views/safety/SafetyCockpitView.vue'),
              meta: {
                title: 'AI 鏁欒偛瀹夊叏璇勬祴涓績',
                allowedRoles: ['ADMIN', 'SUPERADMIN'],
              },
            },
            ...personnelRoutes,
          ],
        },
      ],
    },
    {
      path: '/personnel/managers',
      redirect: '/main/admin/personnel/managers',
    },
    {
      path: '/personnel/teachers',
      redirect: '/main/admin/personnel/teachers',
    },
    {
      path: '/personnel/students',
      redirect: '/main/admin/personnel/students',
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/main/admin/safety',
    },
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()

  if (to.meta.publicOnly && userStore.isLoggedIn) {
    return '/main/home'
  }

  if (!publicRouteNames.has(String(to.name || '')) && !userStore.isLoggedIn) {
    return '/login'
  }

  if (to.meta.allowedRoles && !userStore.hasAnyRole(to.meta.allowedRoles)) {
    return getMainEntryPath(userStore)
  }

  return true
})

export default router
export { personnelRoutes, studentRoutes, teacherRoutes }
