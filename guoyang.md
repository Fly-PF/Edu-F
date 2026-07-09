老师班级详情页

交付说明书模块说明



（1）调用模块方式说明： 
老师班级详情页路由：/teacher/class-detail
跳转自班级列表页，以 URL 查询参数classId携带班级编号，路径格式：/teacher/class-detail?classId=班级ID
页面解析query.classId传给后端详情接口，满足接口以classId做数据查询的入参要求。



（2）初始源文件修改（尚未）：
现在 request.js 里是这样写死的：
config.headers['Authorization'] = 'Bearer 旧token...'
这个旧 Token 后端已经返回 401，所以真实联调时页面会失败。

现在先不改 request.js，因为它会影响所有人的接口请求。等登录页/用户模块那位同学完成后，再统一把 Token 逻辑改成：
const token = localStorage.getItem('token')
if (token) {
  config.headers['Authorization'] = token
}
这是正式做法。



（3）后端完善调用：等章节/学习记录模块完成合并后

学习进度接口当前未调用章节/学习记录模块 Service，是因为当前代码仓库中相关模块尚未实现 Controller/Service。
本模块只读取 edu_chapter、edu_study_record、edu_class_student、edu_course_class 做班级维度学习进度聚合，没有实现章节增删改、资源管理、学生上报学习记录等其他模块功能。
后续队友完成章节/学习记录 Service 后，可将 TeacherClassServiceImpl 中章节查询和学习记录查询替换为对应 Service 调用。
后续替换位置是：
TeacherClassServiceImpl.listCourseStudyRecords()
TeacherClassServiceImpl.getStudentCourseStudyRecords()
TeacherClassServiceImpl.selectActiveChapters()
也就是说：现在这版可以提交，不需要强行改。
真正“该调用别人”这件事，要等别人模块的 Service/Controller 合进仓库后再做。




（2）前后端联调测试说明：
1.修改application-dev.yaml中的主机号，适配自己电脑
2.查看运行容器，保证 MySQL、Redis 容器处于运行状态
3.前后端运行：窗口 A：执行前端npm run dev，常驻运行前端服务；执行后端 SpringBoot 启动指令，常驻运行后端接口服务