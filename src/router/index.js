import { createRouter, createWebHistory } from 'vue-router'

const pageRoutes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
    meta: {
      title: '首页',
      navLabel: '首页',
      navGroup: 'home',
    },
  },
  {
    path: '/teacher/classes',
    name: 'teacher-classes',
    component: () => import('../views/PagePlaceholder.vue'),
    meta: {
      title: '老师班级列表/班级管理页',
      navLabel: '老师班级列表/班级管理页',
      navGroup: 'teacher',
    },
  },
  {
    path: '/teacher/class-detail',
    name: 'teacher-class-detail',
    component: () => import('../views/TeacherClassDetailView.vue'),
    meta: {
      title: '老师班级详情页',
      navLabel: '老师班级详情页',
      navGroup: 'teacher',
    },
  },
  {
    path: '/teacher/courses',
    name: 'teacher-courses',
    component: () => import('../views/PagePlaceholder.vue'),
    meta: {
      title: '老师课程列表/课程管理页',
      navLabel: '老师课程列表/课程管理页',
      navGroup: 'teacher',
    },
  },
  {
    path: '/teacher/course-detail',
    name: 'teacher-course-detail',
    component: () => import('../views/PagePlaceholder.vue'),
    meta: {
      title: '老师课程详情/章节资源管理页',
      navLabel: '老师课程详情/章节资源管理页',
      navGroup: 'teacher',
    },
  },
  {
    path: '/student/classes',
    name: 'student-classes',
    component: () => import('../views/PagePlaceholder.vue'),
    meta: {
      title: '学生班级列表/加入班级页',
      navLabel: '学生班级列表/加入班级页',
      navGroup: 'student',
    },
  },
  {
    path: '/student/class-detail',
    name: 'student-class-detail',
    component: () => import('../views/PagePlaceholder.vue'),
    meta: {
      title: '学生班级详情页',
      navLabel: '学生班级详情页',
      navGroup: 'student',
    },
  },
  {
    path: '/student/course-study',
    name: 'student-course-study',
    component: () => import('../views/PagePlaceholder.vue'),
    meta: {
      title: '学生课程详情/课程学习页',
      navLabel: '学生课程详情/课程学习页',
      navGroup: 'student',
    },
  },
  {
    path: '/student/public-courses',
    name: 'student-public-courses',
    component: () => import('../views/PagePlaceholder.vue'),
    meta: {
      title: '学生平台公开课程页',
      navLabel: '学生平台公开课程页',
      navGroup: 'student',
    },
  },
  {
    path: '/admin/home',
    name: 'admin-home',
    component: () => import('../views/PagePlaceholder.vue'),
    meta: {
      title: '管理首页',
      navLabel: '管理首页',
      navGroup: 'admin',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: pageRoutes,
})

export default router
export { pageRoutes }
