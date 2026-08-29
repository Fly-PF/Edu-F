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

const publicRouteNames = new Set([
  'main-home',
  'course-list',
  'course-search',
  'project-center',
  'block-workshop',
  'block-project-gallery',
  'ai-exhibit',
  'knowledge-base-show',
  'knowledge-base-more',
  'login',
  'register',
])

const govMaterialAdminRoutes = [
  {
    path: 'gov-material/categories',
    name: 'gov-material-categories',
    component: () => import('@/views/admin/GovMaterialCategoryManage.vue'),
    meta: {
      title: '资料分类管理',
      allowedRoles: ['ADMIN', 'SUPERADMIN'],
    },
  },
  {
    path: 'gov-material/materials',
    name: 'gov-material-materials',
    component: () => import('@/views/admin/GovMaterialManage.vue'),
    meta: {
      title: '资料内容管理',
      allowedRoles: ['ADMIN', 'SUPERADMIN'],
    },
  },
  {
    path: 'gov-material/questions',
    name: 'gov-question-manage',
    component: () => import('@/views/admin/GovQuestionManage.vue'),
    meta: {
      title: '题库管理',
      allowedRoles: ['ADMIN', 'SUPERADMIN'],
    },
  },
]

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
    path: 'teacher/learning-analysis',
    name: 'teacher-learning-analysis',
    component: () => import('@/views/teacher/TeacherLearningAnalysis.vue'),
    meta: {
      title: '班级学情分析',
      allowedRoles: ['TEACHER'],
    },
  },
  {
    path: 'teacher/practice-review',
    name: 'teacher-practice-review',
    component: () => import('@/views/teacher/TeacherPracticeReview.vue'),
    meta: {
      title: '教师练习批改',
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
    path: 'teacher/ai-assistant',
    name: 'teacher-ai-assistant',
    redirect: (to) => ({ name: 'teacher-ai-grading', query: to.query }),
  },
  {
    path: 'teacher/ai-preparation',
    name: 'teacher-ai-preparation',
    component: () => import('@/views/teacher/TeacherAiPreparation.vue'),
    meta: {
      title: 'AI智能备课',
      allowedRoles: ['TEACHER'],
    },
  },
  {
    path: 'teacher/ai-grading',
    name: 'teacher-ai-grading',
    component: () => import('@/views/teacher/TeacherAiGrading.vue'),
    meta: {
      title: 'AI智能批改',
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
    path: 'student/learning-analysis',
    name: 'student-learning-analysis',
    component: () => import('@/views/student/StudentLearningAnalysis.vue'),
    meta: {
      title: '我的学情与成长档案',
      allowedRoles: ['STUDENT'],
    },
  },
  {
    path: 'student/practices',
    name: 'student-practices',
    component: () => import('@/views/student/StudentPracticeCenter.vue'),
    meta: {
      title: '学生学习练习',
      allowedRoles: ['STUDENT'],
    },
  },
  {
    path: 'student/practices/:practiceId',
    name: 'student-practice-take',
    component: () => import('@/views/student/StudentPracticeTake.vue'),
    meta: {
      title: '学生练习作答',
      allowedRoles: ['STUDENT'],
    },
  },
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

const govRoutes = [
  {
    path: 'gov/news',
    name: 'gov-news',
    component: () => import('@/views/gov/GovNewsPlaceholder.vue'),
    meta: { title: '考公资讯与公告' },
  },
  {
    path: 'gov/knowledge',
    name: 'gov-knowledge',
    component: () => import('@/views/gov/GovKnowledgePlaceholder.vue'),
    meta: { title: '知识点学习' },
  },
  {
    path: 'gov/practice',
    name: 'gov-practice',
    component: () => import('@/views/gov/GovPracticePlaceholder.vue'),
    meta: { title: '智能题库与每日练习' },
  },
  {
    path: 'gov/assessment',
    name: 'gov-assessment',
    component: () => import('@/views/gov/GovAssessmentPlaceholder.vue'),
    meta: { title: '模拟考试与测评' },
  },
  {
    path: 'gov/materials',
    name: 'gov-materials',
    component: () => import('@/views/gov/GovMaterialPlaceholder.vue'),
    meta: { title: '考公资料下载' },
  },
  {
    path: 'gov/materials/preview',
    name: 'gov-material-preview',
    component: () => import('@/views/gov/GovMaterialPreview.vue'),
    meta: { title: '资料预览' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/main/home',
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
      path: '/main',
      name: 'main',
      component: () => import('@/views/layout/MainView.vue'),
      redirect: '/main/home',
      children: [
        {
          path: 'home',
          name: 'main-home',
          component: () => import('@/views/common/PublicHomeView.vue'),
        },
        {
          path: 'knowledge-qa/show',
          name: 'knowledge-base-show',
          component: () => import('@/views/common/KnowledgeBaseShowView.vue'),
          meta: {
            title: '知识库',
          },
        },
        {
          path: 'knowledge-qa/more',
          name: 'knowledge-base-more',
          component: () => import('@/views/common/KnowledgeBaseMoreView.vue'),
          meta: {
            title: '公开知识库',
          },
        },
        {
          path: 'knowledge-qa/preview',
          name: 'knowledge-base-preview',
          component: () => import('@/views/common/KnowledgeBasePreviewView.vue'),
          meta: {
            title: '文件预览',
          },
        },
        {
          path: 'knowledge-qa',
          name: 'knowledge-qa',
          component: () => import('@/views/common/KnowledgeBaseView.vue'),
          redirect: '/main/knowledge-qa/chat',
          meta: {
            title: '知识库问答',
          },
          children: [
            {
              path: 'chat',
              name: 'knowledge-base-chat',
              component: () => import('@/views/common/KnowledgeBaseChatView.vue'),
              meta: {
                title: '知识库问答',
              },
            },
            {
              path: 'create',
              name: 'knowledge-base-create',
              component: () => import('@/views/common/KnowledgeBaseCreateView.vue'),
              meta: {
                title: '新建知识库',
              },
            },
            {
              path: 'my',
              name: 'knowledge-base-my',
              component: () => import('@/views/common/KnowledgeBaseMyView.vue'),
              meta: {
                title: '我的知识库',
              },
            },
            {
              path: 'collection',
              name: 'knowledge-base-collection',
              component: () => import('@/views/common/KnowledgeBaseCollectionView.vue'),
              meta: {
                title: '知识库收藏',
              },
            },
            {
              path: 'modify',
              name: 'knowledge-base-modify',
              component: () => import('@/views/common/KnowledgeBaseModifyView.vue'),
              meta: {
                title: '编辑知识库',
              },
            },
            {
              path: 'file-show',
              name: 'knowledge-base-file-show',
              component: () => import('@/views/common/KnowledgeBaseFileShowView.vue'),
              meta: {
                title: '文件预览',
              },
            },
          ],
        },
        {
          path: 'practice',
          name: 'learning-practice',
          redirect: () => (useUserStore().roleCode === 'TEACHER'
            ? '/main/teacher/practice-review'
            : '/main/student/practices'),
          meta: {
            allowedRoles: ['STUDENT', 'TEACHER'],
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
          path: 'gov',
          name: 'gov-topic',
          component: () => import('@/views/gov/GovHomePlaceholder.vue'),
          meta: { title: '考公专题' },
        },
        ...govRoutes,
        {
          path: 'gewu',
          name: 'gewu',
          component: () => import('@/views/gewu/GewuView.vue'),
          meta: {
            title: '格物',
            allowedRoles: ['STUDENT', 'TEACHER', 'ADMIN', 'SUPERADMIN'],
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
          children: [
            {
              path: 'safety',
              name: 'admin-safety-cockpit',
              component: () => import('@/views/safety/SafetyCockpitView.vue'),
              meta: {
                title: 'AI安全治理',
                allowedRoles: ['ADMIN', 'SUPERADMIN'],
              },
            },
            ...personnelRoutes,
            ...govMaterialAdminRoutes,
          ],
        },
      ],
    },
    {
      path: '/tools',
      component: () => import('@/views/layout/MainView.vue'),
      children: toolRoutes,
    },
    {
      path: '/knowledge-qa/chat',
      redirect: '/main/knowledge-qa/chat',
    },
    {
      path: '/knowledge-qa/show',
      redirect: '/main/knowledge-qa/show',
    },
    {
      path: '/knowledge-qa/more',
      redirect: (to) => ({ path: '/main/knowledge-qa/more', query: to.query }),
    },
    {
      path: '/knowledge-qa/collection',
      redirect: '/main/knowledge-qa/collection',
    },
    {
      path: '/knowledge-qa/modify',
      redirect: (to) => ({ path: '/main/knowledge-qa/modify', query: to.query }),
    },
    {
      path: '/knowledge-qa/file-show',
      redirect: (to) => ({ path: '/main/knowledge-qa/file-show', query: to.query }),
    },
    {
      path: '/knowledge-qa/preview',
      redirect: (to) => ({ path: '/main/knowledge-qa/preview', query: to.query }),
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
      redirect: '/main/home',
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
export { personnelRoutes, studentRoutes, teacherRoutes, toolRoutes, govRoutes, govMaterialAdminRoutes }
