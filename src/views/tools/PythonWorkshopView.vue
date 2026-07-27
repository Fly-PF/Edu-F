<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Box,
  Collection,
  Document,
  Files,
  Folder,
  Close,
  MoreFilled,
  Plus,
  Promotion,
  Refresh,
  Setting,
  Upload,
  VideoPlay,
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

self.MonacoEnvironment = {
  getWorker() {
    return new EditorWorker()
  },
}

const router = useRouter()
const editorHost = ref(null)
const activeFileId = ref('main')
const openFileIds = ref(['readme', 'main'])
const projectTitle = ref('未命名 Python 项目')
const runMessage = ref('暂无运行结果')
const runStatus = ref('empty')
let editor = null
let resizeObserver = null
let contentChangeDisposable = null

const files = ref([
  {
    id: 'readme',
    name: 'README',
    language: 'plaintext',
    content: 'Python 工坊项目说明\n\n在 main.py 中编写 Python 脚本，点击右上角运行按钮查看运行结果。',
  },
  {
    id: 'main',
    name: 'main.py',
    language: 'python',
    content: '# main.py\nprint("Hello, Python 工坊")\n',
  },
])

const activeFile = computed(() => {
  return files.value.find((file) => file.id === activeFileId.value) || files.value[0]
})

const openFiles = computed(() => {
  return openFileIds.value
    .map((fileId) => files.value.find((file) => file.id === fileId))
    .filter(Boolean)
})

function goBack() {
  router.push('/tools')
}

function getFileIconLabel(file) {
  return file.name.endsWith('.py') ? 'Py' : ''
}

function switchFile(fileId) {
  const file = files.value.find((item) => item.id === fileId)

  if (!file) {
    return
  }

  if (!openFileIds.value.includes(file.id)) {
    openFileIds.value.push(file.id)
  }

  if (editor && activeFile.value) {
    activeFile.value.content = editor.getValue()
  }

  activeFileId.value = file.id
  editor?.setValue(file.content)
  const model = editor?.getModel()

  if (model) {
    monaco.editor.setModelLanguage(model, file.language)
  }

  editor?.focus()
}

function closeFile(fileId) {
  if (openFileIds.value.length <= 1) {
    return
  }

  const closingIndex = openFileIds.value.indexOf(fileId)

  if (closingIndex === -1) {
    return
  }

  openFileIds.value.splice(closingIndex, 1)

  if (activeFileId.value !== fileId) {
    return
  }

  const nextFileId =
    openFileIds.value[Math.min(closingIndex, openFileIds.value.length - 1)] || openFileIds.value[0]

  switchFile(nextFileId)
}

function normalizeFileName(value) {
  const trimmedName = value.trim()

  if (!trimmedName) {
    return ''
  }

  return trimmedName.includes('.') ? trimmedName : `${trimmedName}.py`
}

async function createFile() {
  let fileName = ''

  try {
    const { value } = await ElMessageBox.prompt('请输入文件名', '新建文件', {
      confirmButtonText: '创建',
      cancelButtonText: '取消',
      inputPlaceholder: '例如 script.py',
      inputPattern: /\S+/,
      inputErrorMessage: '文件名不能为空',
    })

    fileName = normalizeFileName(value)
  } catch {
    return
  }

  if (!fileName) {
    return
  }

  const usedNames = new Set(files.value.map((file) => file.name))

  if (usedNames.has(fileName)) {
    ElMessage.warning('文件名已存在')
    return
  }

  const file = {
    id: `script-${Date.now()}`,
    name: fileName,
    language: 'python',
    content: `# ${fileName}\n`,
  }

  files.value.push(file)
  openFileIds.value.push(file.id)
  nextTick(() => switchFile(file.id))
}

function runScript() {
  runStatus.value = 'ready'
  runMessage.value = `已准备运行 ${activeFile.value.name}

当前为前端静态编辑界面，Python 执行环境将在后续步骤接入。

脚本内容：
${editor?.getValue() || ''}`
}

function saveProject() {
  if (editor && activeFile.value) {
    activeFile.value.content = editor.getValue()
  }

  const title = projectTitle.value.trim() || '未命名 Python 项目'
  const record = {
    id: 'python-default',
    type: 'python',
    title,
    description: `${files.value.length} 个文件`,
    updatedTime: new Date().toISOString(),
    files: JSON.parse(JSON.stringify(files.value)),
  }

  try {
    const saved = JSON.parse(localStorage.getItem('edu-python-projects') || '[]')
    const projects = Array.isArray(saved) ? saved : []
    localStorage.setItem('edu-python-projects', JSON.stringify([record, ...projects.filter((item) => item.id !== record.id)]))
    ElMessage.success('Python 项目已保存')
  } catch {
    ElMessage.error('项目保存失败，请检查浏览器存储设置')
  }
}

onMounted(async () => {
  await nextTick()

  editor = monaco.editor.create(editorHost.value, {
    value: activeFile.value.content,
    language: activeFile.value.language,
    theme: 'vs',
    automaticLayout: true,
    fontSize: 15,
    lineHeight: 23,
    minimap: {
      enabled: false,
    },
    scrollBeyondLastLine: false,
    tabSize: 4,
    wordWrap: 'on',
  })

  contentChangeDisposable = editor.onDidChangeModelContent(() => {
    activeFile.value.content = editor.getValue()
  })

  resizeObserver = new ResizeObserver(() => {
    editor?.layout()
  })
  resizeObserver.observe(editorHost.value)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  contentChangeDisposable?.dispose()
  editor?.dispose()
})
</script>

<template>
  <main class="python-workshop">
    <header class="ide-header">
      <div class="header-left">
        <button class="icon-button" type="button" aria-label="返回在线工具" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <span class="python-logo">Py</span>
        <strong>Python</strong>
        <span class="version-text">版本: 草稿</span>
      </div>

      <input v-model="projectTitle" class="project-title" aria-label="Python 项目名称" maxlength="100" />

      <div class="header-actions">
        <button class="round-button" type="button" aria-label="设置">
          <el-icon><Setting /></el-icon>
        </button>
        <button class="round-button" type="button" aria-label="新建文件" @click="createFile">
          <el-icon><Plus /></el-icon>
        </button>
        <button class="round-button" type="button" aria-label="保存项目" @click="saveProject">
          <el-icon><Document /></el-icon>
        </button>
        <button class="icon-button" type="button" aria-label="更多">
          <el-icon><MoreFilled /></el-icon>
        </button>
        <button class="run-button" type="button" aria-label="运行脚本" @click="runScript">
          <el-icon><VideoPlay /></el-icon>
        </button>
      </div>
    </header>

    <section class="ide-body">
      <aside class="activity-bar" aria-label="工具栏">
        <button class="activity-button active" type="button" aria-label="项目文件">
          <el-icon><Folder /></el-icon>
        </button>
        <button class="activity-button" type="button" aria-label="版本管理">
          <el-icon><Promotion /></el-icon>
        </button>
        <button class="activity-button" type="button" aria-label="依赖包">
          <el-icon><Box /></el-icon>
        </button>
        <button class="activity-button" type="button" aria-label="资源">
          <el-icon><Collection /></el-icon>
        </button>
      </aside>

      <aside class="file-panel">
        <div class="panel-title">
          <span>项目文件</span>
          <div>
            <button class="small-icon-button" type="button" aria-label="刷新">
              <el-icon><Refresh /></el-icon>
            </button>
            <button class="small-icon-button" type="button" aria-label="新建文件" @click="createFile">
              <el-icon><Plus /></el-icon>
            </button>
            <button class="small-icon-button" type="button" aria-label="上传">
              <el-icon><Upload /></el-icon>
            </button>
          </div>
        </div>

        <button
          v-for="file in files"
          :key="file.id"
          :class="['file-item', { active: file.id === activeFileId, muted: file.id !== activeFileId }]"
          type="button"
          @click="switchFile(file.id)"
        >
          <span v-if="getFileIconLabel(file)" class="python-file-icon">
            {{ getFileIconLabel(file) }}
          </span>
          <el-icon v-else><Document /></el-icon>
          <span>{{ file.name }}</span>
        </button>
      </aside>

      <section class="editor-area">
        <div class="editor-tabs">
          <button
            v-for="file in openFiles"
            :key="file.id"
            :class="['editor-tab', { active: file.id === activeFileId }]"
            type="button"
            @click="switchFile(file.id)"
          >
            <span v-if="getFileIconLabel(file)" class="tab-python-icon">
              {{ getFileIconLabel(file) }}
            </span>
            <el-icon v-else><Files /></el-icon>
            <span>{{ file.name }}</span>
            <span
              class="tab-close"
              role="button"
              tabindex="0"
              aria-label="关闭文件"
              @click.stop="closeFile(file.id)"
              @keydown.enter.stop.prevent="closeFile(file.id)"
            >
              <el-icon><Close /></el-icon>
            </span>
          </button>
        </div>
        <div ref="editorHost" class="monaco-host"></div>
      </section>

      <aside class="result-panel">
        <div class="result-title">运行结果</div>
        <div :class="['result-content', runStatus]">
          <pre v-if="runStatus === 'ready'">{{ runMessage }}</pre>
          <div v-else class="empty-result">
            <span class="empty-illustration">
              <el-icon><Document /></el-icon>
            </span>
            <strong>{{ runMessage }}</strong>
          </div>
        </div>
      </aside>
    </section>

    <footer class="ide-status">
      <span>项目已就绪</span>
      <span>科学创造师_IXGI 最后保存于 09:03</span>
      <span>未启动容器</span>
    </footer>
  </main>
</template>

<style scoped>
.python-workshop {
  display: grid;
  min-width: 1024px;
  height: 100vh;
  grid-template-rows: 50px minmax(0, 1fr) 32px;
  overflow: hidden;
  background: #f4f6fa;
  color: #303744;
}

.ide-header {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto minmax(280px, 1fr);
  align-items: center;
  background: #252c37;
  color: #eef2f7;
}

.header-left,
.header-actions,
.panel-title,
.file-item,
.editor-tab,
.ide-status {
  display: flex;
  align-items: center;
}

.header-left {
  gap: 12px;
  padding-left: 16px;
}

.python-logo,
.python-file-icon,
.tab-python-icon {
  display: inline-grid;
  place-items: center;
  border-radius: 5px;
  background: linear-gradient(135deg, #3178c6 0%, #ffd95a 100%);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.python-logo {
  width: 28px;
  height: 28px;
}

.python-file-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
}

.tab-python-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
}

.version-text {
  margin-left: 8px;
  color: #9aa3b2;
  font-size: 13px;
}

.project-title {
  border: 0;
  background: transparent;
  color: #ffffff;
  font: inherit;
  font-size: 17px;
  font-weight: 700;
  text-align: center;
}

.project-title:focus-visible { outline: 2px solid #9de4eb; outline-offset: 3px; }

.header-actions {
  justify-content: flex-end;
  gap: 12px;
  padding-right: 14px;
}

.icon-button,
.round-button,
.small-icon-button,
.activity-button {
  display: inline-grid;
  place-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.icon-button {
  width: 30px;
  height: 30px;
  font-size: 20px;
}

.round-button {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgb(255 255 255 / 12%);
}

.run-button {
  display: inline-grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 0;
  border-radius: 5px;
  background: #ff7a4f;
  color: #ffffff;
  cursor: pointer;
  font-size: 20px;
}

.ide-body {
  display: grid;
  min-height: 0;
  grid-template-columns: 56px 316px minmax(360px, 1fr) 360px;
  border-bottom: 1px solid #e1e5ec;
}

.activity-bar,
.file-panel,
.result-panel {
  border-right: 1px solid #e3e7ee;
  background: #f8fafc;
}

.activity-bar {
  display: grid;
  align-content: start;
  gap: 22px;
  padding-top: 22px;
}

.activity-button {
  width: 56px;
  height: 34px;
  color: #8a919c;
  font-size: 24px;
}

.activity-button.active {
  color: #5140c8;
}

.file-panel {
  padding: 18px 18px 0;
}

.panel-title {
  justify-content: space-between;
  margin-bottom: 28px;
  color: #5b6472;
  font-size: 15px;
  font-weight: 700;
}

.panel-title div {
  display: flex;
  gap: 12px;
}

.small-icon-button {
  width: 18px;
  height: 18px;
  color: #4b5563;
  font-size: 16px;
}

.file-item {
  width: 100%;
  gap: 10px;
  margin-bottom: 14px;
  border: 0;
  background: transparent;
  color: #555f70;
  cursor: pointer;
  font: inherit;
  font-size: 16px;
  text-align: left;
}

.file-item.muted {
  color: #687385;
}

.file-item.active {
  color: #303744;
  font-weight: 600;
}

.editor-area {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: 50px minmax(0, 1fr);
  background: #ffffff;
}

.editor-tabs {
  display: flex;
  align-items: stretch;
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 1px solid #e1e5ec;
  background: #edf0f5;
}

.editor-tab {
  gap: 8px;
  min-width: 150px;
  max-width: 220px;
  padding: 0 16px;
  border: 0;
  border-right: 1px solid #e1e5ec;
  background: #edf0f5;
  color: #555f70;
  cursor: pointer;
  font: inherit;
  font-size: 15px;
}

.editor-tab.active {
  background: #ffffff;
  color: #303744;
}

.editor-tab span:nth-child(2) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-close {
  display: inline-grid;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  place-items: center;
  border-radius: 4px;
  color: #7b8491;
  font-size: 13px;
}

.tab-close:hover,
.tab-close:focus-visible {
  background: #e5e9f0;
  color: #303744;
  outline: none;
}

.monaco-host {
  min-height: 0;
}

.result-panel {
  display: grid;
  min-width: 0;
  grid-template-rows: 50px minmax(0, 1fr);
  border-right: 0;
  background: #f8fafc;
}

.result-title {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e1e5ec;
  padding-left: 18px;
  color: #404957;
  font-size: 15px;
  font-weight: 700;
}

.result-content {
  min-height: 0;
  padding: 18px;
  overflow: auto;
}

.result-content pre {
  margin: 0;
  color: #263241;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.empty-result {
  display: grid;
  height: 100%;
  place-items: center;
  align-content: center;
  gap: 22px;
  color: #667085;
}

.empty-illustration {
  display: grid;
  width: 118px;
  height: 118px;
  place-items: center;
  border-radius: 34px;
  background: #e8edf5;
  color: #ffffff;
  font-size: 68px;
}

.ide-status {
  justify-content: space-between;
  padding: 0 18px;
  background: #f8fafc;
  color: #8a919c;
  font-size: 13px;
}

button:hover,
button:focus-visible {
  outline: none;
}

.icon-button:hover,
.round-button:hover,
.small-icon-button:hover,
.activity-button:hover,
.file-item:hover,
.editor-tab:hover {
  color: #5140c8;
}

.run-button:hover,
.run-button:focus-visible {
  background: #ff6433;
}
</style>
