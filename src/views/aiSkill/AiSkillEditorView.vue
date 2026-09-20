<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createSkill, getSkillCategories, getSkillDetail, publishSkill, updateSkill } from '@/api/aiSkill'

const route = useRoute()
const router = useRouter()
const formRef = ref()
const loading = ref(false)
const saving = ref(false)
const publishing = ref(false)
const categories = ref([])
const selectedFileKey = ref('root:SKILL.md')
const newReferenceVisible = ref(false)
const newReferenceName = ref('')
const editingId = computed(() => route.params.id)
const isEdit = computed(() => Boolean(editingId.value))

const skillTypeOptions = [
  { label: '讲题方法', value: 'TEACHING_METHOD' },
  { label: '答题步骤', value: 'ANSWER_STEPS' },
  { label: '批改标准', value: 'GRADING_STANDARD' },
  { label: '学习计划', value: 'STUDY_PLAN' },
  { label: '其他', value: 'OTHER' },
]
const visibilityOptions = [
  { label: '仅自己使用', value: 'PRIVATE' },
  { label: '公开发布', value: 'PUBLIC' },
]
const form = reactive(defaultForm())
const rules = {
  skillName: [{ required: true, message: '请输入 Skill 名称', trigger: 'blur' }, { max: 80, message: '名称不能超过80字', trigger: 'blur' }],
  description: [{ required: true, message: '请输入简介', trigger: 'blur' }, { max: 500, message: '简介不能超过500字', trigger: 'blur' }],
  skillType: [{ required: true, message: '请选择技能类型', trigger: 'change' }],
  visibility: [{ required: true, message: '请选择可见范围', trigger: 'change' }],
}

const files = computed(() => form.skillFiles)
const selectedFile = computed(() => files.value.find((file) => fileKey(file) === selectedFileKey.value) || files.value[0])
const rootFiles = computed(() => files.value.filter((file) => !file.isInReferences))
const referenceFiles = computed(() => files.value.filter((file) => file.isInReferences))

function defaultForm() {
  return {
    skillName: '',
    description: '',
    skillType: 'TEACHING_METHOD',
    subjectType: '',
    targetAudience: '',
    usageGuide: '',
    exampleInput: '',
    exampleOutput: '',
    visibility: 'PRIVATE',
    categoryIds: [],
    status: 'DRAFT',
    skillFiles: [
      { fileName: 'SKILL.md', isInReferences: false, content: '# Skill 名称\n\n## 适用场景\n\n## 执行步骤\n\n## 输出要求\n' },
      { fileName: 'README.md', isInReferences: false, content: '' },
    ],
  }
}

function getCategoryName(item) {
  return item.categoryName || item.name || item.label || ''
}

function fileKey(file) {
  return `${file.isInReferences ? 'ref' : 'root'}:${file.fileName}`
}

function errorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback
}

function normalizeDetail(detail) {
  const next = defaultForm()
  Object.assign(next, {
    skillName: detail.skillName || '',
    description: detail.description || '',
    skillType: detail.skillType || 'TEACHING_METHOD',
    subjectType: detail.subjectType || '',
    targetAudience: detail.targetAudience || '',
    usageGuide: detail.usageGuide || '',
    exampleInput: detail.exampleInput || '',
    exampleOutput: detail.exampleOutput || '',
    visibility: detail.visibility || 'PRIVATE',
    status: detail.status || 'DRAFT',
    categoryIds: (detail.categories || []).map((item) => item.id || item.categoryId).filter(Boolean),
    skillFiles: detail.files?.length ? detail.files.map((file) => ({
      fileName: file.fileName,
      isInReferences: Boolean(file.isInReferences),
      content: file.content || '',
    })) : next.skillFiles,
  })
  if (!next.skillFiles.some((file) => !file.isInReferences && file.fileName === 'SKILL.md')) {
    next.skillFiles.unshift({ fileName: 'SKILL.md', isInReferences: false, content: '# Skill 名称\n\n## 适用场景\n\n## 执行步骤\n\n## 输出要求\n' })
  }
  if (!next.skillFiles.some((file) => !file.isInReferences && file.fileName === 'README.md')) {
    next.skillFiles.push({ fileName: 'README.md', isInReferences: false, content: '' })
  }
  return next
}

function applyForm(next) {
  Object.keys(form).forEach((key) => { delete form[key] })
  Object.assign(form, next)
}

async function loadCategories() {
  try {
    categories.value = await getSkillCategories()
  } catch {
    categories.value = []
  }
}

async function loadDetail() {
  if (!isEdit.value) return
  loading.value = true
  try {
    applyForm(normalizeDetail(await getSkillDetail(editingId.value)))
    selectedFileKey.value = 'root:SKILL.md'
  } catch (error) {
    ElMessage.error(errorMessage(error, 'Skill 详情加载失败'))
    router.push('/main/ai-skills/mine')
  } finally {
    loading.value = false
  }
}

function validateFiles() {
  const skillFile = files.value.find((file) => !file.isInReferences && file.fileName === 'SKILL.md')
  if (!skillFile) return '必须包含根目录 SKILL.md'
  if (!skillFile.content.trim()) return 'SKILL.md内容不能为空'
  const invalidRoot = files.value.find((file) => !file.isInReferences && !['SKILL.md', 'README.md'].includes(file.fileName))
  if (invalidRoot) return '根目录仅允许SKILL.md和README.md'
  const invalidFile = files.value.find((file) => !file.fileName.endsWith('.md'))
  if (invalidFile) return 'Skill文件仅支持.md'
  const emptyReference = files.value.find((file) => file.isInReferences && !file.content.trim())
  if (emptyReference) return 'references中的文件不能为空'
  return ''
}

function buildPayload() {
  return {
    skillName: form.skillName.trim(),
    description: form.description.trim(),
    skillType: form.skillType,
    subjectType: form.subjectType.trim(),
    targetAudience: form.targetAudience.trim(),
    usageGuide: form.usageGuide.trim(),
    exampleInput: form.exampleInput.trim(),
    exampleOutput: form.exampleOutput.trim(),
    visibility: form.visibility,
    categoryIds: form.categoryIds,
    skillFiles: files.value.map((file) => ({ fileName: file.fileName, isInReferences: file.isInReferences, content: file.content })),
  }
}

async function saveSkill({ silent = false } = {}) {
  if (!await formRef.value?.validate().catch(() => false)) return false
  const fileError = validateFiles()
  if (fileError) {
    ElMessage.warning(fileError)
    return false
  }
  saving.value = true
  try {
    if (isEdit.value) {
      await updateSkill(editingId.value, buildPayload())
      if (!silent) ElMessage.success('保存成功，格式和内容检查通过')
    } else {
      const created = await createSkill(buildPayload())
      if (!silent) ElMessage.success('草稿已创建，格式和内容检查通过')
      const id = created?.id || created?.skillId
      if (id) await router.replace(`/main/ai-skills/editor/${id}`)
    }
    return true
  } catch (error) {
    ElMessage.error(errorMessage(error, '保存失败'))
    return false
  } finally {
    saving.value = false
  }
}

async function saveAndPublish() {
  const ok = await saveSkill({ silent: true })
  if (!ok || !editingId.value) return
  try { await ElMessageBox.confirm(`确认发布“${form.skillName}”到市场吗？`, '发布确认', { type: 'warning' }) } catch { return }
  publishing.value = true
  try {
    await publishSkill(editingId.value)
    ElMessage.success(form.status === 'OFFLINE' ? '重新发布成功' : '发布成功')
    await loadDetail()
  } catch (error) {
    ElMessage.error(errorMessage(error, '发布失败'))
  } finally {
    publishing.value = false
  }
}

function openNewReference() {
  newReferenceName.value = ''
  newReferenceVisible.value = true
  nextTick(() => document.querySelector('.reference-name-input input')?.focus())
}

function normalizeReferenceName(value) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`
}

function addReferenceFile() {
  const name = normalizeReferenceName(newReferenceName.value)
  if (!name) {
    ElMessage.warning('请输入文件名')
    return
  }
  if (/[\\/:*?"<>|]/.test(name) || /\s{2,}/.test(name) || /\s/.test(name)) {
    ElMessage.warning('文件名不能包含斜杠、空格或特殊路径字符')
    return
  }
  if (files.value.some((file) => file.isInReferences && file.fileName === name)) {
    ElMessage.warning('文件名不能重复')
    return
  }
  form.skillFiles.push({ fileName: name, isInReferences: true, content: '' })
  selectedFileKey.value = `ref:${name}`
  newReferenceVisible.value = false
}

function removeReference(file) {
  const index = form.skillFiles.indexOf(file)
  if (index >= 0) form.skillFiles.splice(index, 1)
  selectedFileKey.value = 'root:SKILL.md'
}

function goBack() {
  router.push('/main/ai-skills/mine')
}

onMounted(async () => {
  await loadCategories()
  await loadDetail()
})
</script>

<template>
  <main class="editor-page" v-loading="loading">
    <header class="page-header">
      <div class="hero-copy">
        <p class="eyebrow">SKILL STUDIO</p>
        <h1>{{ isEdit ? '编辑 Skill' : '创建 Skill' }}</h1>
        <p>像整理一张教学卡片一样，把方法、步骤和参考资料收进 Skill 文件夹。</p>

      </div>
      <div class="studio-doodle" aria-hidden="true">
        <div class="folder-tab">FILES</div>
        <div class="floating-note note-a">SKILL.md</div>
        <div class="floating-note note-b">README</div>
        <div class="pencil-stick"></div>
        <span class="star star-a">+</span>
        <span class="star star-b">*</span>
      </div>
    </header>

    <section class="editor-layout">
      <aside class="file-pane">
        <div class="pane-title">文件</div>
        <el-menu :default-active="selectedFileKey" class="file-menu" @select="(key) => { selectedFileKey = key }">
          <el-menu-item v-for="file in rootFiles" :key="fileKey(file)" :index="fileKey(file)">{{ file.fileName }}</el-menu-item>
          <el-sub-menu index="references">
            <template #title>references</template>
            <el-menu-item v-for="file in referenceFiles" :key="fileKey(file)" :index="fileKey(file)">
              <span>{{ file.fileName }}</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
        <el-button class="add-file" @click="openNewReference">新增 references 文件</el-button>
      </aside>

      <section class="form-pane">
        <div class="form-actions">
          <el-button @click="goBack">返回我的 Skill</el-button>
          <el-button :loading="saving" @click="saveSkill()">保存草稿</el-button>
          <el-button type="primary" :loading="publishing" @click="saveAndPublish">{{ form.status === 'OFFLINE' ? '重新发布' : '发布到市场' }}</el-button>
        </div>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
          <el-row :gutter="16">
            <el-col :span="12"><el-form-item label="Skill 名称" prop="skillName"><el-input v-model="form.skillName" maxlength="80" show-word-limit /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="技能类型" prop="skillType"><el-select v-model="form.skillType"><el-option v-for="item in skillTypeOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="学科类型"><el-input v-model="form.subjectType" placeholder="如：数学" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="适用人群"><el-input v-model="form.targetAudience" placeholder="如：高中学生" /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="简介" prop="description"><el-input v-model="form.description" type="textarea" :rows="2" maxlength="500" show-word-limit /></el-form-item></el-col>
            <el-col :span="24"><el-form-item label="使用方法"><el-input v-model="form.usageGuide" type="textarea" :rows="2" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="示例输入"><el-input v-model="form.exampleInput" type="textarea" :rows="3" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="示例效果"><el-input v-model="form.exampleOutput" type="textarea" :rows="3" /></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="可见范围" prop="visibility"><el-radio-group v-model="form.visibility"><el-radio-button v-for="item in visibilityOptions" :key="item.value" :label="item.value">{{ item.label }}</el-radio-button></el-radio-group></el-form-item></el-col>
            <el-col :span="12"><el-form-item label="分类"><el-select v-model="form.categoryIds" multiple clearable><el-option v-for="item in categories" :key="item.id" :label="getCategoryName(item)" :value="item.id" /></el-select></el-form-item></el-col>
          </el-row>
        </el-form>

        <div class="file-editor" v-if="selectedFile">
          <div class="file-editor-head">
            <div>
              <span class="file-path">{{ selectedFile.isInReferences ? 'references/' : '' }}{{ selectedFile.fileName }}</span>
              <small v-if="selectedFile.fileName === 'SKILL.md'">必填</small>
            </div>
            <el-button v-if="selectedFile.isInReferences" link type="danger" @click="removeReference(selectedFile)">删除文件</el-button>
          </div>
          <el-input v-model="selectedFile.content" type="textarea" :rows="18" resize="vertical" placeholder="请输入 Markdown 内容" />
        </div>
      </section>
    </section>

    <el-dialog v-model="newReferenceVisible" title="新增 references 文件" width="420px">
      <el-input v-model="newReferenceName" class="reference-name-input" placeholder="例如 rules，系统会自动补 .md" @keyup.enter="addReferenceFile" />
      <template #footer>
        <el-button @click="newReferenceVisible = false">取消</el-button>
        <el-button type="primary" @click="addReferenceFile">确定</el-button>
      </template>
    </el-dialog>
  </main>
</template>

<style scoped>
.editor-page {
  min-height: 100%;
  padding: 34px clamp(18px, 4vw, 54px);
  box-sizing: border-box;
  background:
    linear-gradient(rgba(112, 96, 176, 0.055) 1px, transparent 1px),
    linear-gradient(90deg, rgba(112, 96, 176, 0.055) 1px, transparent 1px),
    #fbfaff;
  background-size: 28px 28px;
  color: #29244d;
}
.page-header {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  min-height: 238px;
  gap: 20px;
  align-items: center;
  overflow: hidden;
  padding: 40px clamp(26px, 5vw, 54px);
  border: 2px solid #565083;
  border-radius: 10px;
  background:
    linear-gradient(110deg, rgba(224, 218, 255, 0.94), rgba(255, 224, 238, 0.9) 52%, rgba(212, 248, 250, 0.9)),
    linear-gradient(rgba(86, 80, 131, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(86, 80, 131, 0.08) 1px, transparent 1px);
  background-size: auto, 24px 24px, 24px 24px;
  box-shadow: 10px 10px 0 #6f6a91;
}
.hero-copy { position: relative; z-index: 2; }
.eyebrow { display: inline-flex; margin: 0 0 16px; padding: 7px 13px; border: 2px solid #565083; background: #fff0a8; color: #30295d; font-size: 13px; font-weight: 900; box-shadow: 4px 4px 0 rgba(86, 80, 131, 0.28); transform: rotate(-2deg); }
h1 { margin: 0; color: #352c65; font-size: clamp(40px, 5.2vw, 66px); line-height: 1; font-weight: 900; }
.page-header p:last-of-type { max-width: 620px; margin: 16px 0 0; color: #58517f; font-size: 17px; font-weight: 700; line-height: 1.65; }
.form-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 14px; margin-bottom: 18px; }
.studio-doodle { position: relative; width: 300px; height: 180px; justify-self: end; }
.folder-tab { position: absolute; left: 56px; bottom: 20px; width: 178px; height: 116px; padding-top: 38px; border: 3px solid #565083; border-radius: 10px; background: #fff; color: #352c65; text-align: center; font-weight: 900; box-shadow: 8px 8px 0 rgba(86, 80, 131, 0.24); }
.folder-tab::before { content: ''; position: absolute; top: -24px; left: 16px; width: 86px; height: 28px; border: 3px solid #565083; border-bottom: 0; border-radius: 8px 8px 0 0; background: #fff0a8; }
.floating-note { position: absolute; padding: 8px 12px; border: 2px solid #565083; background: #fff; color: #352c65; font-size: 13px; font-weight: 900; box-shadow: 4px 4px 0 rgba(86, 80, 131, 0.22); animation: bob 3s ease-in-out infinite; }
.note-a { top: 16px; left: 12px; transform: rotate(-7deg); }
.note-b { right: 12px; top: 44px; background: #e6fbff; transform: rotate(7deg); animation-delay: 0.4s; }
.pencil-stick { position: absolute; right: 38px; bottom: 18px; width: 18px; height: 112px; border: 2px solid #565083; border-radius: 9px; background: linear-gradient(#ffeb8a 0 74%, #f28ab6 74% 86%, #565083 86%); transform: rotate(24deg); animation: pencil-wave 3.6s ease-in-out infinite; }
.star { position: absolute; color: #7bd0d5; font-size: 32px; font-weight: 900; animation: twinkle 2s ease-in-out infinite; }
.star-a { right: 4px; bottom: 78px; }
.star-b { left: 38px; top: 82px; color: #f08abb; animation-delay: 0.5s; }
.editor-layout { display: grid; grid-template-columns: 278px minmax(0, 1fr); gap: 22px; margin-top: 42px; }
.file-pane, .form-pane { border: 2px solid #6a638f; border-radius: 10px; background: rgba(255, 255, 255, 0.92); box-shadow: 7px 7px 0 rgba(86, 80, 131, 0.18); }
.file-pane { padding: 16px; align-self: start; }
.pane-title { display: inline-flex; margin-bottom: 12px; padding: 6px 12px; border: 2px solid #565083; background: #fff0a8; color: #352c65; font-weight: 900; box-shadow: 3px 3px 0 rgba(86, 80, 131, 0.18); transform: rotate(-2deg); }
.file-menu { border-right: 0; background: transparent; }
:deep(.file-menu .el-menu-item), :deep(.file-menu .el-sub-menu__title) { border-radius: 8px; color: #352c65; font-weight: 900; }
:deep(.file-menu .el-menu-item.is-active) { background: #ebe6ff; color: #352c65; }
.add-file { width: 100%; margin-top: 14px; }
.form-pane { padding: 22px; }
.form-pane .el-select { width: 100%; }
.file-editor { margin-top: 10px; overflow: hidden; border: 2px solid #6a638f; border-radius: 10px; background: #fff; box-shadow: inset 0 0 0 1px #eee9ff; }
.file-editor-head { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 12px 14px; border-bottom: 2px solid #e7e0ff; background: #fbf7ff; }
.file-path { font-weight: 900; color: #352c65; }
.file-editor-head small { margin-left: 8px; color: #8176d7; font-weight: 900; }
.file-editor :deep(.el-textarea__inner) { border: 0; border-radius: 0; background: linear-gradient(#fff 31px, #f1edff 32px); background-size: 100% 32px; font-family: Consolas, 'Courier New', monospace; line-height: 32px; }
:deep(.el-button) { min-height: 36px; border-color: #706998; border-radius: 8px; color: #352c65; font-weight: 900; box-shadow: 3px 3px 0 rgba(86, 80, 131, 0.16); }
:deep(.el-button.is-link) { box-shadow: none; }
:deep(.el-button--primary) { --el-button-bg-color: #8176d7; --el-button-border-color: #5f5799; --el-button-hover-bg-color: #6f64c7; --el-button-hover-border-color: #514983; color: #fff; }
:deep(.el-input__wrapper), :deep(.el-select__wrapper), :deep(.el-textarea__inner) { border: 1px solid #c9c1e8; border-radius: 8px; box-shadow: none; }
:deep(.el-radio-button__inner) { border-color: #c9c1e8; color: #352c65; font-weight: 900; }
@keyframes bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -8px; } }
@keyframes pencil-wave { 0%, 100% { transform: rotate(24deg); } 50% { transform: rotate(17deg) translateY(-5px); } }
@keyframes twinkle { 0%, 100% { opacity: 0.45; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.08); } }
@media (max-width: 980px) { .page-header { grid-template-columns: 1fr; } .studio-doodle { justify-self: center; } .editor-layout { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .page-header { padding: 28px 20px; box-shadow: 6px 6px 0 #6f6a91; } .form-actions { justify-content: flex-start; } .studio-doodle { width: 260px; transform: scale(0.86); transform-origin: center; } }
</style>





