<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MarkdownRenderer } from 'x-markdown-vue'
import 'x-markdown-vue/style'
import 'katex/dist/katex.min.css'
import { useUserStore } from '@/stores/user'
import {
  ArrowDown,
  ArrowRight,
  ChatDotRound,
  CopyDocument,
  Document,
  EditPen,
  FolderOpened,
  Microphone,
  MoreFilled,
  Plus,
  Search,
  Upload,
} from '@element-plus/icons-vue'

const userStore = useUserStore()

const formulaAlignedBlock = String.raw`$$
\begin{aligned}
\mathcal{L} &= -\sum_{i=1}^{n} y_i \log \hat{y}_i \\
\hat{y}_i &= \mathrm{softmax}(W x_i + b)\\
\mathrm{Acc} &= \frac{TP + TN}{TP + TN + FP + FN}
\end{aligned}
$$`

const formulaCasesBlock = String.raw`$$
P(A|B) = \frac{P(B|A)P(A)}{P(B)}
$$

如果要做多行展示，也可以写成：

$$
\begin{cases}
 a = b + c \\
 d = e - f \\
 g = h \times i
\end{cases}
$$

还可以补一个求和公式：

$$
S_n = \sum_{k=1}^{n} k = \frac{n(n+1)}{2}
$$`

const richFormulaBlock = String.raw`$$
\begin{aligned}
\mathcal{L} &= -\sum_{i=1}^{n} y_i \log \hat{y}_i \\
\hat{y}_i &= \mathrm{softmax}(W x_i + b)\\
\mathrm{score}(q, d) &= \lambda \cdot \cos(q, d) + (1 - \lambda) \cdot BM25(q, d)
\end{aligned}
$$`

const formulaScoreBlock = String.raw`$$
score(q, d) = \lambda \cdot \frac{q \cdot d}{\|q\|\,\|d\|} + (1 - \lambda) \cdot BM25(q, d)
$$`

const chartMermaidDemo = [
  '下面是几个 Mermaid 图表样例，用来验证流程图、时序图、饼图和甘特图渲染。',
  '',
  '### 流程图',
  '',
  '```mermaid',
  'flowchart TD',
  '  A[上传文档] --> B[文档解析]',
  '  B --> C{解析成功}',
  '  C -- 是 --> D[切片入库]',
  '  C -- 否 --> E[返回错误]',
  '  D --> F[向量检索]',
  '  F --> G[生成回答]',
  '```',
  '',
  '### 时序图',
  '',
  '```mermaid',
  'sequenceDiagram',
  '  participant U as 用户',
  '  participant FE as 前端',
  '  participant API as 问答服务',
  '  participant KB as 知识库',
  '  U->>FE: 输入问题',
  '  FE->>API: 发送问题',
  '  API->>KB: 检索相关片段',
  '  KB-->>API: 返回引用内容',
  '  API-->>FE: 流式返回答案',
  '  FE-->>U: 渲染 Markdown 和引用',
  '```',
  '',
  '### 饼图',
  '',
  '```mermaid',
  'pie title 引用来源占比',
  '  "课程文档" : 42',
  '  "班级规则" : 28',
  '  "作业反馈" : 18',
  '  "平台说明" : 12',
  '```',
  '',
  '### 甘特图',
  '',
  '```mermaid',
  'gantt',
  '  title 知识库问答接入计划',
  '  dateFormat  YYYY-MM-DD',
  '  section 数据准备',
  '  文档导入      :done,    a1, 2026-07-01, 3d',
  '  文档切片      :active,  a2, after a1, 4d',
  '  section 检索生成',
  '  向量检索      :         b1, 2026-07-08, 4d',
  '  流式回答      :         b2, after b1, 3d',
  '```',
].join('\n')

const mockBackendResponse = {
  conversationList: [
    { id: 'import-error', title: '导入错误' },
    { id: 'plan', title: 'Edu-F教育平台开发总结与规划' },
    { id: 'component', title: 'Vue3 AI聊天组件库推荐' },
    { id: 'markdown-demo', title: 'Markdown 渲染测试' },
    { id: 'formula-demo', title: '公式与代码示例' },
    { id: 'chart-demo', title: '图表渲染测试' },
    { id: 'rag-chunk', title: 'rag_chunk集合定义' },
    { id: 'milvus', title: 'Milvus类型' },
    { id: 'spring-rag', title: 'SpringAI中RAG检索数据的位置' },
    { id: 'rag-table', title: 'RAG教育知识库模块表结构定义' },
    { id: 'rag-design', title: 'RAG教育知识库表设计分析' },
  ],
  chatRecords: {
    main: [
      {
        id: 'main-u1',
        role: 'user',
        content: '知识库问答页面主要解决什么问题？',
        time: '09:20',
      },
      {
        id: 'main-a1',
        role: 'assistant',
        content:
          '它主要帮助用户快速查询平台功能、课程流程、班级管理和学习反馈规则。后续接入后端后，可以把回答来源替换成真实知识库检索结果。',
        time: '09:20',
        sources: ['平台功能总览', '知识库问答说明', '课程管理指引', '班级关联说明', '学习反馈总览', '权限范围规范'],
      },
      {
        id: 'main-u2',
        role: 'user',
        content: '后续如果接后端接口，前端需要大改吗？',
        time: '09:23',
      },
      {
        id: 'main-a2',
        role: 'assistant',
        content:
          '不需要大改。当前页面已经按会话列表和消息记录拆分，后续把 mockBackendResponse 替换成接口返回即可。\n\n可以按下面三步落地：\n\n1. 会话列表接口\n2. 历史消息接口\n3. 发送消息接口\n\n发送消息时调用问答接口，再把 AI 回复追加到当前会话。',
        time: '09:23',
        sources: ['前端接口规划'],
      },
    ],
    'import-error': [
      {
        id: 'import-u1',
        role: 'user',
        content: '导入知识库文档时提示文件格式错误，可能是什么原因？',
        time: '10:08',
      },
      {
        id: 'import-a1',
        role: 'assistant',
        content:
          '可能是上传文件扩展名不在允许范围内，或者文件内容无法被解析。建议先限制支持 pdf、docx、txt、md，再在后端返回明确的错误码和错误说明。',
        time: '10:08',
        sources: ['文档导入规则', '文件解析说明', '上传格式约束', '解析失败处理', '导入错误码规范', '知识库接入流程'],
      },
      {
        id: 'import-u2',
        role: 'user',
        content: '前端应该怎么展示这种错误？',
        time: '10:11',
      },
      {
        id: 'import-a2',
        role: 'assistant',
        content:
          '建议在上传区域旁边展示错误原因，并提供重新选择文件的入口。\n\n如果是批量上传，可以逐条显示：\n- 成功\n- 失败\n- 待处理\n\n这样用户能更快判断问题出在哪个文件上。',
        time: '10:11',
        sources: ['上传交互规范'],
      },
    ],
    plan: [
      {
        id: 'plan-u1',
        role: 'user',
        content: 'Edu-F后续开发应该优先做哪些功能？',
        time: '11:02',
      },
      {
        id: 'plan-a1',
        role: 'assistant',
        content:
          '建议优先完成以下内容：\n\n1. 知识库导入\n2. 文档切片\n3. 向量检索\n4. 问答接口\n5. 引用来源展示\n\n这样前端页面可以从静态演示自然过渡到真实 RAG 问答。',
        time: '11:02',
        sources: ['开发规划草案', '知识库导入顺序', '文档切片建议', '向量检索方案', '问答接口说明', '引用展示规范'],
      },
      {
        id: 'plan-u2',
        role: 'user',
        content: '老师和学生的使用场景要分开吗？',
        time: '11:06',
      },
      {
        id: 'plan-a2',
        role: 'assistant',
        content:
          '可以共用同一个问答页面，但检索范围需要按角色做过滤。老师更关注课程发布、班级数据和资源管理；学生更关注课程学习、练习反馈和错题复盘。',
        time: '11:06',
        sources: ['角色权限说明'],
      },
    ],
    component: [
      {
        id: 'component-u1',
        role: 'user',
        content: 'Vue3 做 AI 聊天页推荐用什么组件？',
        time: '14:18',
      },
      {
        id: 'component-a1',
        role: 'assistant',
        content:
          '当前项目已经安装 Element Plus 和 vue-element-plus-x，可以优先使用 XSender 做输入框、BubbleList 做消息列表，再用 Element Plus 的按钮、标签和弹窗补齐交互。\n\n一个比较顺手的结构是：\n\n```vue\n<template>\n  <BubbleList :data="messages">\n    <template #item="{ item }">\n      <MessageBubble :role="item.role" :content="item.content" />\n    </template>\n  </BubbleList>\n</template>\n```',
        time: '14:18',
        sources: ['组件库选型记录', 'BubbleList 使用说明', 'XSender 输入框', 'Element Plus 基础组件', '聊天页交互建议', '消息渲染规范'],
      },
      {
        id: 'component-u2',
        role: 'user',
        content: '消息气泡需要自己写吗？',
        time: '14:21',
      },
      {
        id: 'component-a2',
        role: 'assistant',
        content:
          '可以用 BubbleList 承载列表，再通过 item 插槽自定义气泡样式。这样既保留 AI 组件的滚动能力，又能按产品风格区分用户和 AI。',
        time: '14:21',
        sources: ['Element Plus X 使用说明'],
      },
    ],
    'markdown-demo': [
      {
        id: 'markdown-u1',
        role: 'user',
        content: '请给我一个 Markdown 渲染测试样例。',
        time: '19:10',
      },
      {
        id: 'markdown-a1',
        role: 'assistant',
        content:
          '# Markdown 标题\n\n这是一个 **加粗文本**、`行内代码`、*斜体文本* 和 [示例链接](https://example.com) 的组合。\n\n- 第一项\n- 第二项\n- 第三项\n\n> 这是一个引用块，用来验证段落、缩进和引用样式。\n\n| 列 1 | 列 2 |\n| --- | --- |\n| A | B |\n| C | D |\n\n```ts\nfunction sum(a: number, b: number) {\n  return a + b\n}\n\nconsole.log(sum(3, 5))\n```',
        time: '19:10',
        sources: ['Markdown 基础语法', '表格渲染说明', '代码块渲染说明', '链接与引用测试'],
      },
      {
        id: 'markdown-u2',
        role: 'user',
        content: '再来一个包含多级标题和有序列表的样例。',
        time: '19:12',
      },
      {
        id: 'markdown-a2',
        role: 'assistant',
        content:
          '## 二级标题\n\n### 三级标题\n\n1. 第一层序号\n2. 第二层序号\n3. 第三层序号\n\n`inline code` 和 **strong text** 也一起检查。\n\n- 这里还可以再补一段\n- 用来测试多段 Markdown 的衔接',
        time: '19:12',
        sources: ['Markdown 标题层级', '列表渲染测试'],
      },
    ],
    'rich-markdown-demo': [
      {
        id: 'rich-u1',
        role: 'user',
        content: '请给我一个带 Mermaid 和数学公式的综合渲染样例。',
        time: '19:25',
      },
      {
        id: 'rich-a1',
        role: 'assistant',
        content:
          '下面这个样例会同时验证 Mermaid、LaTeX 和代码高亮：\n\n```mermaid\nflowchart TD\n  A[开始] --> B{是否导入知识库?}\n  B -- 是 --> C[切片文档]\n  B -- 否 --> D[继续编辑]\n  C --> E[向量检索]\n  E --> F[生成回答]\n```\n\n' +
          richFormulaBlock +
          '\n\n```python\ndef cosine(a, b):\n    dot = sum(x * y for x, y in zip(a, b))\n    na = sum(x * x for x in a) ** 0.5\n    nb = sum(x * x for x in b) ** 0.5\n    return dot / (na * nb)\n```',
        time: '19:25',
        sources: ['Mermaid 图表测试', 'LaTeX 数学公式测试', 'Python 代码高亮测试'],
      },
    ],
    'chart-demo': [
      {
        id: 'chart-u1',
        role: 'user',
        content: '请给我几个图表渲染测试样例。',
        time: '20:05',
      },
      {
        id: 'chart-a1',
        role: 'assistant',
        content: chartMermaidDemo,
        time: '20:05',
        sources: ['Mermaid 流程图测试', 'Mermaid 时序图测试', 'Mermaid 饼图测试', 'Mermaid 甘特图测试'],
      },
    ],
    'formula-demo': [
      {
        id: 'formula-u1',
        role: 'user',
        content: '请给我一个复杂公式和代码块的渲染样例。',
        time: '19:20',
      },
      {
        id: 'formula-a1',
        role: 'assistant',
        content:
          '下面这段可以同时验证公式、代码块和普通段落：\n\n' +
          formulaAlignedBlock +
          '\n\n```python\ndef softmax(logits):\n    exps = [math.exp(v) for v in logits]\n    total = sum(exps)\n    return [v / total for v in exps]\n```\n\n同时也支持行内公式 `E = mc^2` 和 `a^2 + b^2 = c^2`。',
        time: '19:20',
        sources: ['复杂公式测试', '代码块语法测试', '行内公式测试'],
      },
      {
        id: 'formula-u2',
        role: 'user',
        content: '再补一个带分段推导的公式。',
        time: '19:22',
      },
      {
        id: 'formula-a2',
        role: 'assistant',
        content:
          formulaCasesBlock,
        time: '19:22',
        sources: ['贝叶斯公式测试', '多行公式测试'],
      },
    ],
    'rag-chunk': [
      {
        id: 'chunk-u1',
        role: 'user',
        content: 'rag_chunk 集合通常存什么字段？',
        time: '15:30',
      },
      {
        id: 'chunk-a1',
        role: 'assistant',
        content:
          '通常会包含 chunkId、documentId、content、embedding、metadata、createTime 等字段。metadata 可以保存章节、页码、课程 id、角色范围等检索过滤信息。',
        time: '15:30',
        sources: ['RAG 数据结构说明', 'chunk 主键设计', 'documentId 关联', 'metadata 过滤字段', 'embedding 向量字段', '版本管理规范'],
      },
    ],
    milvus: [
      {
        id: 'milvus-u1',
        role: 'user',
        content: 'Milvus 里向量字段和文本字段应该怎么设计？',
        time: '16:05',
      },
      {
        id: 'milvus-a1',
        role: 'assistant',
        content:
          '向量字段保存 embedding，文本内容可以放在普通字段或外部数据库。实际项目里常用 Milvus 保存向量与关键 metadata，完整文档内容保存在业务库或对象存储。',
        time: '16:05',
        sources: ['Milvus 集合设计', '向量字段类型', '索引策略建议', '文本字段存储', '分区设计建议', '业务库关联方式'],
      },
    ],
    'spring-rag': [
      {
        id: 'spring-u1',
        role: 'user',
        content: 'Spring AI 做 RAG 时检索数据一般放在哪里？',
        time: '16:40',
      },
      {
        id: 'spring-a1',
        role: 'assistant',
        content:
          '一般会把向量数据放在 Milvus、PgVector、Elasticsearch 等向量库中，业务元数据仍然放在关系型数据库里。问答时先检索相关片段，再把片段拼进提示词。\n\n一个简化的打分公式可以写成：\n\n' +
          formulaScoreBlock +
          '\n\n其中 `\\lambda` 用来平衡语义相似度和关键词匹配。',
        time: '16:40',
        sources: ['Spring AI RAG 实践', '向量库选择', '检索片段拼接', '提示词模板', '关系库元数据', '召回排序策略'],
      },
    ],
    'rag-table': [
      {
        id: 'table-u1',
        role: 'user',
        content: 'RAG 教育知识库模块需要哪些表？',
        time: '17:12',
      },
      {
        id: 'table-a1',
        role: 'assistant',
        content:
          '可以先设计知识库表、文档表、切片表、问答会话表、消息表和引用记录表。这样既能管理文档，也能追踪每次回答引用了哪些片段。',
        time: '17:12',
        sources: ['知识库表结构草案', '文档表设计', '切片表设计', '会话表设计', '消息表设计', '引用记录表设计'],
      },
    ],
    'rag-design': [
      {
        id: 'design-u1',
        role: 'user',
        content: 'RAG 知识库表设计时最容易忽略什么？',
        time: '18:03',
      },
      {
        id: 'design-a1',
        role: 'assistant',
        content:
          '容易忽略权限范围、文档版本、切片状态和引用追踪。\n\n教育平台里还要考虑老师、学生、管理员不同角色能检索到的资料范围，最好在表结构里提前预留角色字段和可见范围字段。',
        time: '18:03',
        sources: ['知识库权限设计', '角色过滤规则', '文档版本管理', '切片状态控制', '引用追踪规范', '可见范围说明'],
      },
    ],
  },
}

const senderRef = ref(null)
const bubbleListRef = ref(null)
const composerValue = ref('')
const isLoading = ref(false)
const activeConversation = ref('import-error')
const isNewConversation = ref(false)
const expandedSources = ref({})
const conversations = ref(mockBackendResponse.conversationList)
const messages = ref(cloneMessages(mockBackendResponse.chatRecords[activeConversation.value]))
const bubbleItems = computed(() =>
  messages.value.map((item, index) => ({
    ...item,
    key: item.id || index,
    placement: item.role === 'assistant' ? 'start' : 'end',
    noStyle: true,
    loading: Boolean(item.loading),
    itemType: item.role,
  }))
)

const promptCards = [
  '老师如何发布课程并关联班级？',
  '学生进入课程学习页后能做什么？',
  '知识库问答后续怎么接后端接口？',
]

const currentConversationTitle = computed(() => {
  return conversations.value.find((item) => item.id === activeConversation.value)?.title || '知识库问答'
})

const currentUserName = computed(() => userStore.realName || userStore.username || '用户')
const currentUserInitial = computed(() => currentUserName.value.slice(0, 1).toUpperCase())

function getBubbleListInstance() {
  return bubbleListRef.value
}

function scrollBubbleListToBottom(smooth = true) {
  const instance = getBubbleListInstance()
  instance?.scrollToBottom?.(smooth)
}

watch(
  () => messages.value.length,
  async () => {
    await nextTick()
    scrollBubbleListToBottom(false)
  }
)
function cloneMessages(list = []) {
  return list.map(({ typing, loading, ...item }) => ({
    ...item,
    sources: item.sources ? [...item.sources] : undefined,
  }))
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function buildReply(question) {
  if (question.includes('后端') || question.includes('接口')) {
    return '后续接后端时，可以把当前模拟数据替换为会话列表接口、历史消息接口和发送消息接口。发送消息后，后端返回 AI 答案和引用来源，前端追加到当前会话即可。'
  }

  if (question.includes('学生') || question.includes('学习')) {
    return '学生侧可以围绕课程学习、章节资源、练习提交和反馈复盘来回答。接入真实数据后，还可以结合学生自己的学习记录生成个性化建议。'
  }

  if (question.includes('老师') || question.includes('课程') || question.includes('班级')) {
    return '老师侧的核心路径是创建课程、维护章节资源、关联班级、查看学习反馈。知识库问答可以把这些操作步骤整理成更容易执行的说明。'
  }

  return '我先按当前模拟知识库理解：这个问题可以从平台入口、角色权限、课程流程和学习反馈四个方向继续拆解。'
}

function pushMessage(role, content, extra = {}) {
  const message = {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    role,
    content,
    time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    ...extra,
  }

  messages.value.push(message)
  return message
}

async function streamAssistantReply(content, extra = {}) {
  const assistantMessage = pushMessage('assistant', '', {
    ...extra,
    loading: true,
  })

  await wait(220)
  assistantMessage.loading = false

  const text = String(content ?? '')
  const segmentSize = 4

  for (let index = 0; index < text.length; index += segmentSize) {
    assistantMessage.content += text.slice(index, index + segmentSize)
    await nextTick()
    scrollBubbleListToBottom(true)
    await wait(24)
  }

  saveCurrentMessages()
}

async function copyMessageContent(content) {
  const text = String(content ?? '').trim()

  if (!text) {
    return
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.setAttribute('readonly', 'true')
      textarea.style.position = 'absolute'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    ElMessage.success('已复制内容')
  } catch {
    ElMessage.error('复制失败')
  }
}

function toggleSources(id) {
  expandedSources.value = {
    ...expandedSources.value,
    [id]: !expandedSources.value[id],
  }
}

function saveCurrentMessages() {
  mockBackendResponse.chatRecords[activeConversation.value] = cloneMessages(messages.value)
}

function handleSelectConversation(id) {
  saveCurrentMessages()
  isNewConversation.value = false
  activeConversation.value = id
  messages.value = cloneMessages(mockBackendResponse.chatRecords[id])
  expandedSources.value = {}
  composerValue.value = ''
  senderRef.value?.clear?.()
}

async function setComposerText(text) {
  composerValue.value = text
  await nextTick()
  senderRef.value?.setText(text)
  senderRef.value?.focus?.('end')
}

async function handleSend() {
  const senderText = senderRef.value?.getModelValue?.()?.text || ''
  const question = (senderText || composerValue.value).trim()

  if (!question || isLoading.value) {
    return
  }

  pushMessage('user', question)
  isNewConversation.value = false
  composerValue.value = ''
  senderRef.value?.clear?.()
  isLoading.value = true

  try {
    await streamAssistantReply(buildReply(question), {
      sources: ['Edu-F平台说明', '知识库模拟样例'],
    })
  } finally {
    isLoading.value = false
  }
}

function handleConversationCommand(command, item) {
  if (command === 'rename') {
    renameConversation(item)
    return
  }

  if (command === 'delete') {
    deleteConversation(item)
  }
}

async function renameConversation(item) {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的对话名称', '重命名', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: item.title,
      inputPattern: /\S/,
      inputErrorMessage: '对话名称不能为空',
    })

    const target = conversations.value.find((conversation) => conversation.id === item.id)
    if (target) {
      target.title = value.trim()
    }
  } catch {
    // User cancelled the prompt.
  }
}

async function deleteConversation(item) {
  try {
    await ElMessageBox.confirm(`确定删除「${item.title}」吗？`, '删除对话', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
      type: 'warning',
    })

    const index = conversations.value.findIndex((conversation) => conversation.id === item.id)
    if (index < 0) {
      return
    }

    conversations.value.splice(index, 1)
    delete mockBackendResponse.chatRecords[item.id]

    if (activeConversation.value === item.id) {
      const nextConversation = conversations.value[index] || conversations.value[index - 1]

      if (nextConversation) {
        activeConversation.value = nextConversation.id
        isNewConversation.value = false
        messages.value = cloneMessages(mockBackendResponse.chatRecords[nextConversation.id])
        expandedSources.value = {}
      } else {
        handleNewChat()
      }
    }
  } catch {
    // User cancelled the confirmation.
  }
}

function handleNewChat() {
  saveCurrentMessages()
  const id = `new-${Date.now()}`
  const title = '新对话'

  conversations.value.unshift({ id, title })
  mockBackendResponse.chatRecords[id] = []
  isNewConversation.value = true
  activeConversation.value = id
  messages.value = cloneMessages(mockBackendResponse.chatRecords[id])
  expandedSources.value = {}
  composerValue.value = ''
  senderRef.value?.clear?.()
}
</script>

<template>
  <main class="doubao-page">
    <aside class="chat-sidebar">
      <div class="assistant-profile">
        <div class="assistant-avatar">AI</div>
        <span>知识库助手</span>
      </div>

      <nav class="sidebar-actions" aria-label="知识库问答导航">
        <button type="button" @click="handleNewChat">
          <el-icon><EditPen /></el-icon>
          <span>新建对话</span>
        </button>
        <button type="button">
          <el-icon><Document /></el-icon>
          <span>平台知识库</span>
        </button>
        <button type="button">
          <el-icon><FolderOpened /></el-icon>
          <span>我的知识库</span>
        </button>
        <button type="button">
          <el-icon><ChatDotRound /></el-icon>
          <span>会话知识库</span>
        </button>
      </nav>

      <div class="history-title">历史对话</div>
      <div class="conversation-list">
        <div
          v-for="item in conversations"
          :key="item.id"
          class="conversation-item"
          :class="{ active: activeConversation === item.id }"
          @click="handleSelectConversation(item.id)"
        >
          <button class="conversation-main" type="button">
            <el-icon><ChatDotRound /></el-icon>
            <span>{{ item.title }}</span>
          </button>

          <el-dropdown trigger="click" @command="(command) => handleConversationCommand(command, item)">
            <button class="conversation-more" type="button" aria-label="更多操作" @click.stop>
              <el-icon><MoreFilled /></el-icon>
            </button>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">重命名</el-dropdown-item>
                <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="sidebar-footer">
        <el-avatar v-if="userStore.avatar" class="user-avatar" :size="24" :src="userStore.avatar" />
        <div v-else class="user-avatar">{{ currentUserInitial }}</div>
        <span>{{ currentUserName }}</span>
      </div>
    </aside>

    <section class="chat-main">
      <header class="chat-topbar">
        <div class="topbar-title">
          <strong>{{ currentConversationTitle }}</strong>
          <span>AI 生成内容仅供参考，请注意甄别。</span>
        </div>
      </header>

      <div class="message-shell">
        <div class="message-stream">
          <div v-if="isNewConversation" class="welcome-block">
            <div class="welcome-logo">AI</div>
            <h1>知识库问答</h1>
            <p>查课程、查班级、查学习流程，先用模拟后端数据演示历史会话切换和 Markdown 渲染。</p>
            <div class="prompt-row">
              <button v-for="prompt in promptCards" :key="prompt" type="button" @click="setComposerText(prompt)">
                {{ prompt }}
              </button>
            </div>
          </div>

          <BubbleList
            ref="bubbleListRef"
            class="bubble-list"
            :list="bubbleItems"
            :auto-scroll="true"
            :smooth-scroll="true"
            :max-height="'100%'"
            :show-back-button="true"
            :always-show-scrollbar="true"
            :item-key="(item) => item.id"
            :btn-loading="isLoading"
            :should-follow-content="() => true"
          >
            <template #item="{ item }">
              <div class="message-row">
                <Bubble
                  class="message-item"
                  :class="`is-${item.role}`"
                  :placement="item.placement"
                  :loading="item.loading"
                  :no-style="true"
                  variant="filled"
                  shape="round"
                  :max-width="item.role === 'assistant' ? '640px' : '560px'"
                >
                  <template #avatar>
                    <div v-if="item.role === 'assistant'" class="message-avatar is-assistant">AI</div>
                    <div v-else class="message-avatar is-user">我</div>
                  </template>

                  <template #header>
                    <div class="message-meta">
                      <strong>{{ item.role === 'assistant' ? 'AI' : '用户' }}</strong>
                      <span>{{ item.time }}</span>
                    </div>
                  </template>

                  <template #content>
                    <div class="message-stack">
                      <div class="message-bubble">
                        <MarkdownRenderer
                          v-if="!item.loading"
                          :class="['markdown-body', { 'markdown-body--assistant': item.role === 'assistant' }]"
                          :markdown="item.content"
                          :enable-latex="true"
                          :enable-shiki="true"
                          :enable-mermaid="true"
                          :enable-animate="true"
                        />
                        <div
                          v-else
                          :class="['markdown-body', { 'markdown-body--assistant': item.role === 'assistant' }]"
                        >
                          <el-skeleton :rows="2" animated />
                        </div>

                        <div v-if="item.sources?.length" class="reference-box">
                          <button class="reference-toggle" type="button" @click.stop="toggleSources(item.id)">
                            <span>检索到参考文档共 {{ item.sources.length }} 篇</span>
                            <el-icon>
                              <ArrowDown v-if="expandedSources[item.id]" />
                              <ArrowRight v-else />
                            </el-icon>
                          </button>

                          <div v-if="expandedSources[item.id]" class="reference-list">
                            <a v-for="(source, index) in item.sources" :key="source" class="reference-item" href="#" @click.prevent>
                              <span class="reference-index">{{ index + 1 }}</span>
                              <span>{{ source }}</span>
                            </a>
                          </div>
                        </div>
                      </div>

                      <button class="copy-button" type="button" @click.stop="copyMessageContent(item.content)">
                        <el-icon><CopyDocument /></el-icon>
                      </button>
                    </div>
                  </template>

                  <template #footer>
                    <div class="message-footer-space" />
                  </template>

                  <template #loading>
                    <div class="message-loading">
                      <div class="message-meta">
                        <strong>AI</strong>
                        <span>正在生成</span>
                      </div>
                      <div class="message-bubble loading-bubble">
                        <el-skeleton :rows="1" animated />
                      </div>
                    </div>
                  </template>
                </Bubble>
              </div>
            </template>
          </BubbleList>
        </div>
        <div class="composer-wrap">
          <XSender
            ref="senderRef"
            class="composer"
            placeholder="发消息或按住空格说话..."
            submit-type="enter"
            :clearable="true"
            :loading="isLoading"
            variant="updown"
            :custom-style="{ minHeight: '86px' }"
            @submit="handleSend"
            @change="composerValue = senderRef?.getModelValue?.()?.text || ''"
          >
            <template #prefix>
              <el-button :icon="Plus" circle text />
            </template>
          </XSender>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.doubao-page {
  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-columns: 282px minmax(0, 1fr);
  overflow: hidden;
  background: #ffffff;
  color: #111827;
}

.chat-sidebar {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  background: #f7f7f8;
}

.assistant-profile,
.sidebar-footer {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 24px;
  font-size: 14px;
  font-weight: 700;
}

.assistant-profile {
  margin-top: 8px;
}

.assistant-avatar,
.user-avatar,
.message-avatar,
.welcome-logo {
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #2f80ed;
  color: #ffffff;
  font-weight: 800;
}

.assistant-avatar,
.user-avatar,
.message-avatar {
  width: 24px;
  height: 24px;
  font-size: 12px;
}

.user-avatar {
  flex: 0 0 24px;
}

.message-avatar {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  margin-top: 20px;
}

.message-avatar.is-assistant {
  background: #e0f2fe;
  color: #0369a1;
}

.message-avatar.is-user {
  background: #dbeafe;
  color: #1d4ed8;
}

.sidebar-actions {
  display: grid;
  gap: 4px;
  padding: 10px 16px 18px;
}

.sidebar-actions button,
.conversation-main,
.conversation-more,
.prompt-row button {
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.sidebar-actions button {
  display: flex;
  height: 38px;
  align-items: center;
  gap: 12px;
  padding: 0 10px;
  border-radius: 8px;
  color: #111827;
  font-size: 14px;
}

.sidebar-actions button:hover,
.conversation-item:hover,
.conversation-item.active {
  background: #ffffff;
}

.history-title {
  padding: 14px 24px 8px;
  color: #9aa0aa;
  font-size: 12px;
}

.conversation-list {
  display: grid;
  gap: 4px;
  min-height: 0;
  padding: 0 12px 12px;
  overflow: auto;
}

.conversation-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  padding: 0 12px;
  border-radius: 8px;
  color: #22252b;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.conversation-main {
  display: grid;
  grid-column: 1 / 3;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  min-width: 0;
  text-align: left;
}

.conversation-main span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-more {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 8px;
  color: #9aa0aa;
  opacity: 0;
  transition: opacity 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.conversation-item:hover .conversation-more,
.conversation-item.active .conversation-more {
  opacity: 1;
}

.conversation-more:hover,
.conversation-more:focus-visible {
  background: #eceef1;
  color: #5f6672;
  outline: none;
}

.sidebar-footer {
  margin-top: auto;
  border-top: 1px solid #e5e7eb;
  padding-block: 14px;
}

.chat-main {
  display: grid;
  min-width: 0;
  min-height: 0;
  grid-template-rows: 56px minmax(0, 1fr);
  background: #ffffff;
}

.chat-topbar {
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #edf0f3;
  padding: 0 18px;
}

.topbar-title {
  display: grid;
  justify-items: center;
  gap: 2px;
  min-width: 0;
}

.topbar-title strong {
  font-size: 15px;
}

.topbar-title span {
  color: #a0a5ad;
  font-size: 11px;
}

.message-shell {
  position: relative;
  display: grid;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
}

.message-stream {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 28px 24px 172px;
}

.welcome-block {
  width: min(820px, 100%);
  margin: 10px auto 24px;
  text-align: center;
}

.welcome-logo {
  width: 48px;
  height: 48px;
  margin: 0 auto 14px;
  border-radius: 14px;
  font-size: 20px;
}

.welcome-block h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.25;
}

.welcome-block p {
  margin: 8px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.prompt-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

.prompt-row button {
  max-width: 260px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fbfbfc;
  color: #4b5563;
  font-size: 13px;
}

.prompt-row button:hover {
  border-color: #bad6ff;
  color: #1d4ed8;
}

.bubble-list {
  flex: 1 1 auto;
  width: 100%;
  max-width: none;
  min-height: 0;
  margin: 0;
  pointer-events: auto;
}

.bubble-list :deep(.elx-bubble-list__list) {
  height: 100%;
  padding: 0 0 2px;
}

.bubble-list :deep(.elx-bubble-list__item--custom) {
  width: 100%;
  justify-content: center;
}

.message-row {
  width: min(860px, 100%);
  margin: 0 auto;
}

.message-item {
  width: 100%;
  --el-bubble-avatar-placeholder-width: 32px;
  --el-bubble-avatar-placeholder-height: 32px;
  --el-bubble-avatar-placeholder-gap: 12px;
}

.message-stack {
  display: flex;
  width: min(640px, 100%);
  max-width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
}

.message-item.is-assistant .message-stack {
  margin-left: auto;
  align-items: flex-end;
}

.message-item.is-user .message-stack,
.message-item.is-user .message-meta {
  align-items: flex-end;
}

.message-bubble {
  max-width: 100%;
  min-width: 0;
  padding: 13px 15px;
  border: 1px solid #e8edf3;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 8px 22px rgb(15 23 42 / 5%);
}

.message-item.is-assistant .message-bubble {
  border-color: #e5eaf2;
  background: #f3f6fa;
}

.message-item.is-user .message-bubble {
  border-color: #bfdbfe;
  background: #ffffff;
  color: #15315f;
}

.message-item.is-user .message-meta {
  justify-content: flex-end;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #9aa0aa;
  font-size: 12px;
}

.message-meta strong {
  color: #111827;
  font-size: 13px;
}

.message-footer-space {
  height: 0;
}

.message-loading {
  display: grid;
  gap: 8px;
  width: min(360px, 100%);
}

.message-item.is-assistant .message-loading {
  margin-left: auto;
}

.loading-bubble {
  width: 220px;
}

.message-item.is-assistant .message-meta strong {
  color: #2563eb;
}

.message-item.is-user .message-meta strong {
  color: #1e3a8a;
}

.markdown-body {
  margin-top: 8px;
  color: #1f2937;
  font-size: 15px;
  line-height: 1.8;
  word-break: break-word;
}

.markdown-body--assistant {
  background-color: #f3f6fa !important;
}

.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(blockquote),
.markdown-body :deep(pre),
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 0 0 10px;
}

.markdown-body :deep(p:last-child),
.markdown-body :deep(ul:last-child),
.markdown-body :deep(ol:last-child),
.markdown-body :deep(blockquote:last-child),
.markdown-body :deep(pre:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 20px;
}

.markdown-body :deep(li + li) {
  margin-top: 4px;
}

.markdown-body :deep(strong) {
  color: #0f172a;
  font-weight: 700;
}

.markdown-body :deep(code) {
  padding: 0.12em 0.38em;
  border-radius: 6px;
  background: rgb(37 99 235 / 10%);
  color: #1d4ed8;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 0.92em;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  padding: 12px 14px;
  border-radius: 8px;
  background: transparent;
  color: #1f2937;
}

.markdown-body :deep(pre code) {
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font-size: 13px;
  line-height: 1.7;
}

.markdown-body :deep(blockquote) {
  padding: 10px 14px;
  border-left: 3px solid #bfdbfe;
  background: transparent;
  color: #4b5563;
}

.markdown-body :deep(a) {
  color: #2563eb;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  color: #0f172a;
  font-weight: 700;
  line-height: 1.35;
}

.markdown-body :deep(h1) {
  font-size: 20px;
}

.markdown-body :deep(h2) {
  font-size: 18px;
}

.markdown-body :deep(h3) {
  font-size: 17px;
}

.math-block {
  margin-top: 10px;
  padding: 12px 14px;
  border: 1px solid #d8e5f5;
  border-radius: 8px;
  background: #f8fbff;
}

.math-label {
  margin-bottom: 6px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0;
}

.math-expression {
  overflow-x: auto;
  color: #0f172a;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.reference-box {
  margin-top: 12px;
}

.reference-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  line-height: 1.6;
}

.reference-toggle:hover,
.reference-toggle:focus-visible {
  color: #2563eb;
  outline: none;
}

.reference-list {
  display: grid;
  gap: 8px;
  max-height: 112px;
  margin-top: 8px;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-color: #c8d4e3 #eef2f7;
  scrollbar-width: thin;
}

.reference-list::-webkit-scrollbar {
  width: 6px;
}

.reference-list::-webkit-scrollbar-track {
  border-radius: 999px;
  background: #eef2f7;
}

.reference-list::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: #c8d4e3;
}

.reference-list::-webkit-scrollbar-thumb:hover {
  background: #aebdd0;
}

.reference-item {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 7px;
  align-items: start;
  color: #0b63e5;
  font-size: 13px;
  line-height: 1.55;
  text-decoration: none;
}

.reference-item:hover {
  color: #0046b8;
}

.reference-index {
  display: grid;
  width: 16px;
  height: 16px;
  place-items: center;
  border-radius: 50%;
  background: #2563eb;
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
}

.copy-button {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  margin-top: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #ffffff;
  color: #7b8492;
  cursor: pointer;
  transition: border-color 0.16s ease, background 0.16s ease, color 0.16s ease;
}

.copy-button:hover,
.copy-button:focus-visible {
  border-color: #bfdbfe;
  background: #f8fbff;
  color: #2563eb;
  outline: none;
}

.composer-wrap {
  position: absolute;
  right: 24px;
  bottom: 20px;
  left: 24px;
  width: min(1000px, calc(100% - 48px));
  margin: 0 auto;
  border: 1px solid #8ec5ff;
  border-radius: 18px;
  background: #ffffff;
  box-shadow: 0 18px 44px rgb(37 99 235 / 16%);
}

.composer {
  border-radius: 18px;
}

@media (max-width: 980px) {
  .doubao-page {
    grid-template-columns: 1fr;
  }

  .chat-sidebar {
    display: none;
  }

  .topbar-title span {
    display: none;
  }
}

@media (max-width: 640px) {
  .chat-topbar {
    padding: 0 10px;
  }

  .message-stream {
    padding: 20px 14px 168px;
  }

  .bubble-list :deep(.elx-bubble-list__list) {
    padding-right: 0;
  }

  .composer-wrap {
    right: 12px;
    left: 12px;
    width: calc(100% - 24px);
  }

  .message-bubble {
    max-width: 100%;
  }
}
</style>
