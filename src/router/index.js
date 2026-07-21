import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

function getAdminEntryPath(roleCode) {
  return roleCode === 'SUPERADMIN'
    ? '/main/admin/personnel/managers'
    : '/main/admin/personnel/teachers'
}

function getTeacherEntryPath() {
  return '/main/teacher/classes'
}

function getStudentEntryPath() {
  return '/main/student/classes'
}

function getMainEntryPath(userStore) {
  if (userStore.roleCode === 'STUDENT') {
    return getStudentEntryPath()
  }

  if (userStore.roleCode === 'TEACHER') {
    return getTeacherEntryPath()
  }

  if (['ADMIN', 'SUPERADMIN'].includes(userStore.roleCode)) {
    return getAdminEntryPath(userStore.roleCode)
  }

  return '/main/home'
}

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

const toolRoutes = [
  {
    path: '',
    name: 'online-tools',
    component: () => import('@/views/tools/OnlineToolsView.vue'),
    meta: {
      title: '在线工具',
      allowAnonymous: true,
    },
  },
  {
    path: 'python',
    name: 'python-workshop',
    component: () => import('@/views/tools/PythonWorkshopView.vue'),
    meta: {
      title: 'Python工坊',
      toolType: 'python',
      allowAnonymous: true,
    },
  },
  {
    path: 'ai',
    name: 'ai-workshop',
    component: () => import('@/views/tools/ToolPlaceholderView.vue'),
    meta: {
      title: '人工智能工坊',
      toolType: 'ai',
      allowAnonymous: true,
    },
  },
  {
    path: 'blocks',
    name: 'block-workshop',
    component: () => import('@/views/tools/BlockWorkshopView.vue'),
    meta: {
      title: '积木工坊',
      allowAnonymous: true,
    },
  },
  {
    path: 'blocks/projects',
    name: 'block-project-gallery',
    redirect: '/main/projects?type=blocks',
    meta: {
      title: '积木项目',
      allowAnonymous: true,
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: () => {
        const userStore = useUserStore()
        return userStore.isLoggedIn ? '/main' : '/login'
      },
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
      path: '/main',
      name: 'main',
      component: () => import('@/views/layout/MainView.vue'),
      redirect: () => getMainEntryPath(useUserStore()),
      children: [
        {
          path: 'home',
          name: 'main-home',
          component: () => import('@/views/common/PublicHomeView.vue'),
        },
        {
          path: 'profile',
          name: 'main-profile',
          component: () => import('@/views/common/ProfileView.vue'),
        },
        {
          path: 'courses',
          name: 'course-list',
          component: () => import('@/views/student/StudentCourseCategories.vue'),
          meta: {
            title: '课程分类',
          },
        },
        {
          path: 'courses/search',
          name: 'course-search',
          component: () => import('@/views/student/StudentPlatformCourses.vue'),
          meta: {
            title: '课程搜索',
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
          path: 'projects',
          name: 'project-center',
          component: () => import('@/views/common/ProjectCenterView.vue'),
          meta: {
            title: '项目中心',
          },
        },
        {
          path: 'ai-exhibit',
          name: 'ai-exhibit',
          component: () => import('@/views/aiExhibit/AiExhibitView.vue'),
          meta: {
            title: 'AI展馆',
          },
        },
        {
          path: 'ai-exhibit/:caseId/practice',
          name: 'ai-experience',
          component: () => import('@/views/aiExhibit/AiExperienceView.vue'),
          meta: {
            title: 'AI体验',
          },
        },
        {
          path: 'ai-exhibit/draw-guess',
          name: 'ai-draw-guess',
          component: () => import('@/views/aiExhibit/AiDrawGuessView.vue'),
          meta: {
            title: '你画我猜',
          },
        },
        {
          path: 'ai-exhibit/face-recognition',
          name: 'ai-face-recognition',
          component: () => import('@/views/aiExhibit/AiFaceRecognitionView.vue'),
          meta: {
            title: '人脸识别',
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
          redirect: () => getAdminEntryPath(useUserStore().roleCode),
          meta: {
            allowedRoles: ['ADMIN', 'SUPERADMIN'],
          },
          children: personnelRoutes,
        },
      ],
    },
    {
      path: '/tools',
      component: () => import('@/views/layout/MainView.vue'),
      children: toolRoutes,
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
      redirect: () => {
        const userStore = useUserStore()
        return userStore.isLoggedIn ? '/main' : '/login'
      },
    },
  ],
})

router.beforeEach((to) => {
  const userStore = useUserStore()

  if (to.meta.publicOnly && userStore.isLoggedIn) {
    return '/main'
  }

  if (!to.meta.publicOnly && !to.meta.allowAnonymous && !userStore.isLoggedIn) {
    return '/login'
  }

  if (to.meta.allowedRoles && !userStore.hasAnyRole(to.meta.allowedRoles)) {
    return getMainEntryPath(userStore)
  }

  return true
})

export default router
export { personnelRoutes, studentRoutes, teacherRoutes, toolRoutes }
