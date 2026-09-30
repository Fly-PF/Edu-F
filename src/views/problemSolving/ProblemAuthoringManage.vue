<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import { createAuthoredProblem, listAuthoringCategories, listAuthoringSubjects } from '@/api/problemSolving'

const subjects = ref([]); const categories = ref([]); const loading = ref(false); const imageFiles = ref([])
const form = reactive({ subjectId: null, categoryId: null, title: '', intro: '', difficulty: '中等', tags: '', sceneType: '', stem: '', standardAnswer: '', answerAnalysis: '' })
const availableCategories = computed(() => categories.value.filter(item => !form.subjectId || item.subjectId === form.subjectId))
const selectedSubject = computed(() => subjects.value.find(item => item.id === form.subjectId))
const sceneTemplates = computed(() => selectedSubject.value?.code === 'MATH' ? [
  { label: '纯文字', value: 'textOnly' }, { label: '平面 XY 坐标系', value: 'coordinatePlane2d' }, { label: '空间 XYZ 坐标系', value: 'coordinate3d' },
  { label: '平面几何', value: 'geometry2d' }, { label: '立体几何', value: 'geometry3d' }, { label: '统计图表', value: 'statistics2d' }, { label: '概率树状图', value: 'probabilityTree' },
] : selectedSubject.value?.code === 'PHYSICS' ? [
  { label: '弹簧测力计拉木块', value: 'mechanics2d' }, { label: '斜面机械效率', value: 'physicsInclinedPlane' }, { label: '水平碰撞', value: 'physicsCollision' },
  { label: '滑轮', value: 'physicsPulley' }, { label: '平面镜反射', value: 'physicsReflection' }, { label: '通电螺线管', value: 'physicsMagneticField' }, { label: '串联电路', value: 'physicsCircuit' }, { label: '纯文字', value: 'textOnly' },
] : [])

async function loadBase() { subjects.value = await listAuthoringSubjects(); categories.value = await listAuthoringCategories() }
watch(() => form.subjectId, () => { if (!availableCategories.value.some(item => item.id === form.categoryId)) form.categoryId = null; form.sceneType = selectedSubject.value ? 'textOnly' : '' })
function definition() {
  const common = { stem: form.stem.trim(), facts: { answer: form.standardAnswer.trim() }, evaluation: { acceptedAnswers: form.standardAnswer.split(/[，,]/).map(item => item.trim()).filter(Boolean), misconceptions: [] }, visualCatalog: [] }
  if (form.sceneType === 'coordinate2d') return { ...common, sceneDefinition: { sceneType: 'coordinate2d', variables: { t: { value: 1, min: 0, max: 3 } } }, visualCatalog: ['show-perpendicular-height', 'highlight-AB'] }
  if (form.sceneType === 'mechanics2d') return { ...common, sceneDefinition: { sceneType: 'mechanics2d', variables: {} }, visualCatalog: ['show-spring-force'] }
  if (form.sceneType.startsWith('physics')) return { ...common, sceneDefinition: { sceneType: form.sceneType, variables: {} } }
  if (form.sceneType !== 'textOnly') return { ...common, sceneDefinition: { sceneType: form.sceneType, variables: {}, entities: [] }, visualCatalog: ['draw-math-scene'] }
  return { ...common, sceneDefinition: { sceneType: 'textOnly', variables: {} } }
}
async function submitProblem() {
  if (!form.subjectId || !form.categoryId || !form.sceneType || !form.title.trim() || !form.intro.trim() || !form.stem.trim() || !form.standardAnswer.trim() || !form.answerAnalysis.trim()) return ElMessage.warning('请完成科目、分类、模板、题干、标准答案和答案解析')
  loading.value = true
    try { const data = new FormData(); data.append('request', new Blob([JSON.stringify({ categoryId: form.categoryId, title: form.title, intro: form.intro, difficulty: form.difficulty, tags: form.tags.split(/[，,]/).map(item => item.trim()).filter(Boolean), standardAnswer: form.standardAnswer.trim(), answerAnalysis: form.answerAnalysis.trim(), definition: definition() })], { type: 'application/json' })); imageFiles.value.forEach(item => data.append('images', item.raw)); await createAuthoredProblem(data); ElMessage.success('题目已创建并上架'); Object.assign(form, { subjectId: null, categoryId: null, title: '', intro: '', difficulty: '中等', tags: '', sceneType: '', stem: '', standardAnswer: '', answerAnalysis: '' }); clearImageFiles(); await loadBase() } catch (error) { ElMessage.error(error.message || '创建失败') } finally { loading.value = false }
}
function handleImageChange(file) { if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.raw?.type) || file.raw.size > 10 * 1024 * 1024) { imageFiles.value = imageFiles.value.filter(item => item.uid !== file.uid); return ElMessage.warning('仅支持 jpg、jpeg、png、webp 图片，且不能超过 10MB') }; file.url = URL.createObjectURL(file.raw) }
function clearImageFiles() { imageFiles.value.forEach(item => { if (item.url?.startsWith('blob:')) URL.revokeObjectURL(item.url) }); imageFiles.value = [] }
function handleImageRemove(file) { if (file.url?.startsWith('blob:')) URL.revokeObjectURL(file.url) }
onMounted(() => loadBase().catch(error => ElMessage.error(error.message || '加载失败')))
</script>

<template>
  <main class="manage-page">
    <header><p>PROBLEM SOLVING</p><h1>新增题目</h1><span>新增题目并上传题图。</span></header>
    <section class="editor"><h2>新增题目</h2><el-form label-width="92px"><el-row :gutter="16"><el-col :span="12"><el-form-item label="科目"><el-select v-model="form.subjectId" class="full"><el-option v-for="item in subjects.filter(item => item.status === 1)" :key="item.id" :label="item.name" :value="item.id"/></el-select></el-form-item></el-col><el-col :span="12"><el-form-item label="题型分类"><el-select v-model="form.categoryId" class="full" :disabled="!form.subjectId"><el-option v-for="item in availableCategories" :key="item.id" :label="item.name" :value="item.id"/></el-select></el-form-item></el-col></el-row><el-row :gutter="16"><el-col :span="12"><el-form-item label="题目名称"><el-input v-model="form.title"/></el-form-item></el-col><el-col :span="12"><el-form-item label="难度"><el-select v-model="form.difficulty" class="full"><el-option label="基础" value="基础"/><el-option label="中等" value="中等"/><el-option label="困难" value="困难"/></el-select></el-form-item></el-col></el-row><el-form-item label="题目简介"><el-input v-model="form.intro"/></el-form-item><el-form-item label="场景模板"><el-select v-model="form.sceneType" class="full" :disabled="!form.subjectId" placeholder="请先选择科目"><el-option v-for="item in sceneTemplates" :key="item.value" :label="item.label" :value="item.value"/></el-select></el-form-item><el-form-item label="题干"><div class="markdown-editor"><el-input v-model="form.stem" class="markdown-input" type="textarea" :rows="8" placeholder="使用 Markdown 编写题干"/><div class="markdown-preview"><MarkdownRenderer :markdown="form.stem || '预览将在这里显示'" :enable-latex="true"/></div></div></el-form-item><el-form-item label="题图（可选）"><el-upload v-model:file-list="imageFiles" action="#" list-type="picture-card" accept="image/jpeg,image/png,image/webp" :auto-upload="false" :on-change="handleImageChange" :on-remove="handleImageRemove"><span>+</span></el-upload></el-form-item><el-form-item label="标准答案"><div class="markdown-editor"><el-input v-model="form.standardAnswer" class="markdown-input" type="textarea" :rows="8" placeholder="使用 Markdown 编写标准答案；多个可接受答案用逗号分隔"/><div class="markdown-preview"><MarkdownRenderer :markdown="form.standardAnswer || '预览将在这里显示'" :enable-latex="true"/></div></div></el-form-item><el-form-item label="答案解析"><div class="markdown-editor"><el-input v-model="form.answerAnalysis" class="markdown-input" type="textarea" :rows="8" placeholder="使用 Markdown 编写答案解析"/><div class="markdown-preview"><MarkdownRenderer :markdown="form.answerAnalysis || '预览将在这里显示'" :enable-latex="true"/></div></div></el-form-item><el-form-item label="标签"><el-input v-model="form.tags" placeholder="多个标签用逗号分隔"/></el-form-item><el-button type="primary" :loading="loading" @click="submitProblem">创建并上架</el-button></el-form></section>
  </main>
</template>

<style scoped>
.manage-page { padding: 28px; color: #25334d; }.manage-page header { margin-bottom: 20px; }.manage-page header p { margin: 0; color: #66758d; font-size: 12px; font-weight: 700; }.manage-page h1 { margin: 5px 0; font-size: 28px; }.manage-page header span { color: #64748b; }.editor { margin-top: 18px; padding: 20px; border: 1px solid #dce4ef; border-radius: 8px; background: #fff; }.editor h2 { margin: 0 0 18px; font-size: 18px; }.full,.markdown-editor { width: 100%; }.markdown-editor { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }.markdown-preview { min-height: 198px; overflow: auto; padding: 11px; border: 1px solid #dcdfe6; border-radius: 4px; background: #fafcff; color: #25334d; }.markdown-preview :deep(p:first-child),.markdown-preview :deep(h1:first-child),.markdown-preview :deep(h2:first-child),.markdown-preview :deep(h3:first-child) { margin-top: 0; }.markdown-preview :deep(p:last-child) { margin-bottom: 0; }@media(max-width:760px){.manage-page{padding:18px}.editor :deep(.el-col){max-width:100%;flex:0 0 100%}.markdown-editor{grid-template-columns:1fr}}
</style>
