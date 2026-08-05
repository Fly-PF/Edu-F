<script lang="jsx">
const SURVEY_URL = "https://arxiv.org/abs/2505.02279";
const ORCH_URL = "https://arxiv.org/abs/2601.13671";
const A2A_URL = "https://developers.googleblog.com/en/a2a-a-new-era-of-agent-interoperability/";

// 两种心智模型:错(挑一个) vs 对(分层)
const MODES = [
  { id: "wrong", label: "误解：四选一（竞品）" },
  { id: "right", label: "正解：分层（纵横正交）" },
];

// 横向协议聚焦
const HORIZ = ["A2A", "ACP", "ANP"];

const lines = [
  { text: "agentA.tools = MCP(fs, db, api, browser)   # 纵向:统一接入工具/数据源", stage: 0 },
  { text: "card = AgentCard(skills, how_to_call)      # 横向:声明我能做什么", stage: 1 },
  { text: "peer = discover(card); delegate(peer, sub) # 横向:发现 + 委派子任务", stage: 2 },
  { text: "# A2A / ACP / ANP 同层不同侧重", stage: 3 },
  { text: "assert orthogonal(MCP, A2A)                # 纵横正交,不是竞品", stage: 4 },
  { text: "system = MCP(down) + A2A(across)           # 真实系统:两层组合", stage: 5 },
];

const paramDefs = {
  mode: { min: 0, max: 1, step: 1, fmt: (v) => MODES[v].label },
  horiz: { min: 0, max: 2, step: 1, fmt: (v) => HORIZ[v] },
};
const initial = { mode: 1, horiz: 0 };

function compute(p) {
  const right = p.mode === 1;
  return {
    mode: MODES[p.mode].id, modeIndex: p.mode, right,
    horiz: p.horiz, horizName: HORIZ[p.horiz],
  };
}

const OK = "#3f6b4f";
const ERR = "#9e2b1e";
const GOLD = "#9c7b2e";
const SUB = "#a8946a";

const HORIZ_DESC = [
  { focus: "能力发现(Agent Card)、任务委派", who: "Google 主推" },
  { focus: "REST / 消息式标准化交互", who: "另一条演进路线" },
  { focus: "去中心化身份与发现,开放网络", who: "agent 互联网" },
];

function Viz({ derived: d, stage }) {
  const right = d.right;
  const idx = Math.min(5, Math.max(0, stage));

  if (!right) {
    // 误解视图:把四个并排当竞品挑一个
    const items = ["MCP", "A2A", "ACP", "ANP"];
    return (
      <svg viewBox="0 0 360 300" width="360" height="300">
        <text x="16" y="14" fill="#5a4a36" font-size="10.5">协议台 · {MODES[d.modeIndex].label}</text>
        <text x="16" y="40" fill={ERR} font-size="9.4" font-weight="600">“该用 MCP 还是 A2A?” —— 这是个错问题</text>
        {items.map((it, i) => (
          <g key={it}>
            <rect x={24 + i * 80} y={70} width="64" height="40" rx="6"
              fill="#fbf6ea" stroke={ERR} stroke-width="1.3" stroke-dasharray="4 3" />
            <text x={56 + i * 80} y={94} text-anchor="middle" fill={ERR} font-size="11" font-weight="700">{it}</text>
          </g>
        ))}
        <text x="180" y="140" text-anchor="middle" fill={ERR} font-size="9.2">把四个当“竞品里挑一个”</text>
        <text x="180" y="160" text-anchor="middle" fill={SUB} font-size="8.4">等于问“该用 USB 还是用网线”——它们根本不在一层</text>

        <line x1="16" y1="180" x2="344" y2="180" stroke="#e3d6b8" stroke-width="1" />
        <text x="16" y="202" fill="#5a4a36" font-size="9" font-weight="600">真相</text>
        <text x="16" y="222" fill={SUB} font-size="8.4">· MCP 解决工具接入,A2A 解决 agent 互通,可<b>同时用</b></text>
        <text x="16" y="240" fill={SUB} font-size="8.4">· 只有 A2A / ACP / ANP 之间才有重叠与竞争</text>
        <text x="16" y="262" fill={GOLD} font-size="9">切到“分层”口径,看纵横两层如何正交。</text>
        <text x="16" y="284" fill={SUB} font-size="8">标准未定:抓“解决哪一层”,放具体字段与版本细节。</text>
      </svg>
    );
  }

  // 正解视图:纵向 MCP / 横向 A2A 的分层图
  const hd = HORIZ_DESC[d.horiz];
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x="16" y="14" fill="#5a4a36" font-size="10.5">协议台 · {MODES[d.modeIndex].label}</text>

      {/* agent A 节点 */}
      <rect x="40" y="40" width="90" height="34" rx="7" fill="#fff6e9" stroke={GOLD} stroke-width="1.6" />
      <text x="85" y="61" text-anchor="middle" fill={GOLD} font-size="10" font-weight="700">agent A</text>

      {/* agent B 节点(横向) */}
      <rect x="230" y="40" width="90" height="34" rx="7" fill="#fff6e9" stroke={GOLD} stroke-width="1.6" />
      <text x="275" y="61" text-anchor="middle" fill={GOLD} font-size="10" font-weight="700">agent B</text>

      {/* 横向连线 A2A/ACP/ANP */}
      <line x1="130" y1="57" x2="230" y2="57" stroke={idx >= 1 ? OK : "#cdb98e"} stroke-width="1.8"
        stroke-dasharray={idx >= 2 ? "none" : "4 3"} />
      <text x="180" y="50" text-anchor="middle" fill={idx >= 1 ? OK : SUB} font-size="8.4" font-weight="600">
        {d.horizName}（横向）
      </text>
      <text x="180" y="86" text-anchor="middle" fill={SUB} font-size="7.4">agent ↔ agent</text>

      {/* 纵向 MCP:A 向下接工具 */}
      {["文件", "数据库", "API", "沙箱"].map((t, i) => {
        const x = 20 + i * 50;
        return (
          <g key={t}>
            <line x1="85" y1="74" x2={x + 20} y2="150" stroke={OK} stroke-width="1.2" stroke-opacity="0.7" />
            <rect x={x} y={150} width="40" height="26" rx="4" fill="rgba(63,107,79,0.08)" stroke={OK} stroke-width="0.9" />
            <text x={x + 20} y={167} text-anchor="middle" fill={OK} font-size="7.6">{t}</text>
          </g>
        );
      })}
      <text x="100" y="120" fill={OK} font-size="8.4" font-weight="600">MCP（纵向）</text>
      <text x="100" y="133" fill={SUB} font-size="7.4">agent ↔ 工具 / 数据源</text>

      {/* B 也用 MCP 接自己的工具 */}
      <line x1="275" y1="74" x2="290" y2="150" stroke={OK} stroke-width="1.2" stroke-opacity="0.7" />
      <rect x="270" y="150" width="44" height="26" rx="4" fill="rgba(63,107,79,0.08)" stroke={OK} stroke-width="0.9" />
      <text x="292" y="167" text-anchor="middle" fill={OK} font-size="7.4">B 的工具</text>

      <line x1="16" y1="190" x2="344" y2="190" stroke="#e3d6b8" stroke-width="1" />

      {/* 横向协议侧重 */}
      <text x="16" y="208" fill="#5a4a36" font-size="9" font-weight="600">横向三选一：{d.horizName}</text>
      <text x="16" y="225" fill={SUB} font-size="8.2">侧重：{hd.focus}</text>
      <text x="16" y="241" fill={SUB} font-size="8.2">定位：{hd.who}</text>

      <text x="16" y="264" fill={OK} font-size="9">
        每个 agent：MCP 向下接工具,A2A/ACP/ANP 向外接 agent。
      </text>
      <text x="16" y="286" fill={GOLD} font-size="8.6">纵横两层正交,各管一摊——不是竞品,是分层。</text>
    </svg>
  );
}

function frames(params, d) {
  const right = d.right;
  return [
    { line: 1, stage: 0, say: `第 1 步：<b>MCP(Model Context Protocol)是纵向</b>——让一个 agent 用<b>统一方式</b>接入文件、数据库、API、浏览器/沙箱等外部能力。它解决“工具接入碎片化”:以前每个工具一套自定义集成,现在一套协议。类比给 agent 配了标准化的“USB 接口”。<b>它不解决 agent 之间怎么通信</b>——这是最常见的误解。` },
    { line: 2, stage: 1, say: `第 2 步：<b>A2A(Agent-to-Agent,Google 提出)是横向</b>——让不同厂商/框架做的 agent 互相发现、协商、委派。靠 <b>Agent Card</b> 描述每个 agent 的能力(“我能做什么、怎么调我”)。<a href="${A2A_URL}" target="_blank" rel="noreferrer">A2A 公告</a>。` },
    { line: 3, stage: 2, say: `第 3 步：发现对方能力后<b>委派子任务</b>。MCP 是 agent 连工具(向下),A2A 是 agent 连 agent(横向)——一个向下,一个横向,方向不同。` },
    { line: 4, stage: 3, say: `第 4 步：横向不止 A2A。<b>ACP</b>(Agent Communication Protocol)更偏 REST/消息式标准化交互;<b>ANP</b>(Agent Network Protocol)面向开放“agent 互联网”,强调<b>去中心化身份与发现</b>。三者都解决“agent 怎么互联”,但风格侧重不同,且<b>标准还在洗牌</b>。拖朱字切换看三者侧重。` },
    { line: 5, stage: 4, say: `第 5 步关键：<b>MCP 和 A2A 不是竞争关系</b>——一个接工具,一个接 agent,<b>可以同时用</b>。问“该用 MCP 还是 A2A”本身就是错问题,等于问“该用 USB 还是用网线”。只有 A2A/ACP/ANP 之间才有重叠和竞争。` },
    { line: 6, stage: 5, say: right
        ? `第 6 步：真实系统两层组合——<b>每个 agent 用 MCP 向下接自己的工具,用 A2A(或 ACP/ANP)向外接别的 agent</b>。纵横两层正交,各管一摊。<a href="${ORCH_URL}" target="_blank" rel="noreferrer">Orchestration of MAS</a> 讨论的正是从单 agent 到松耦合多 agent 再到企业级编排的演进,协议层是关键一环。`
        : `第 6 步:仍在“四选一”的误解口径。正确心智模型是<b>分层</b>:纵向接工具用 MCP,横向接 agent 用 A2A/ACP/ANP。切到“分层”口径,看纵横两层如何组合。` },
  ];
}

function note(stage, params, d) {
  switch (stage) {
    case 0:
      return "本式搞清<b>四个协议各解决哪一层</b>,别混为一谈。一句话:<b>MCP 接工具(纵向),A2A/ACP/ANP 接 agent(横向)</b>。资料:<a href=\"" + SURVEY_URL + "\" target=\"_blank\" rel=\"noreferrer\">Interoperability Protocols Survey</a>、<a href=\"" + ORCH_URL + "\" target=\"_blank\" rel=\"noreferrer\">Orchestration of MAS</a>、<a href=\"" + A2A_URL + "\" target=\"_blank\" rel=\"noreferrer\">Google A2A</a>。";
    case 1:
      return "<b>MCP = agent ↔ 工具(纵向)</b>:让一个 agent 用统一方式接入文件/DB/API/沙箱,解决工具接入碎片化。类比 agent 的“USB 接口”。<b>它不解决 agent 间通信</b>——这是最常见误解。";
    case 2:
      return "<b>A2A = agent ↔ agent(横向)</b>:让不同厂商/框架的 agent 互相发现、协商、委派。靠 Agent Card 声明能力(“我能做什么、怎么调我”)。MCP 向下,A2A 横向。";
    case 3:
      return "<b>横向三条路线</b>:A2A(能力发现 Agent Card + 任务委派,Google 主推)、ACP(REST/消息式标准化交互)、ANP(去中心化身份与发现,开放网络)。都解决“agent 怎么互联”,定位/生态/侧重不同,标准在洗牌。";
    case 4:
      return "<b>为什么不能混为一谈</b>:正确心智模型是分层——纵向(接工具)MCP,横向(接 agent)A2A/ACP/ANP。MCP 与 A2A 正交可同时用,不是竞品;只有 A2A/ACP/ANP 之间才重叠竞争。“该用 MCP 还是 A2A”是错问题。";
    case 5:
      return "<b>真实系统怎么组合</b>:每个 agent 用 MCP 向下接自己的工具集,用 A2A/ACP/ANP 向外接别的 agent,纵横两层正交。<b>这个领域怎么学</b>:抓“解决哪一层”的心智模型(稳定),放具体字段/消息格式/某版本实现(还在变)。";
    default:
      return "拖朱字切换「四选一误解 / 分层正解」与横向协议(A2A/ACP/ANP),看“纵向接工具、横向接 agent”这个分层如何让“该用哪个”的伪问题消解。";
  }
}

const pyCode = `# 协议分两层:纵向接工具(MCP) + 横向接 agent(A2A/ACP/ANP)
class AgentA:
    def __init__(self):
        # 纵向:MCP 用统一方式接入各种工具/数据源
        self.tools = MCP.connect(["filesystem", "database", "api", "browser"])
        # 横向:用 Agent Card 声明自己能做什么、怎么被调用
        self.card = AgentCard(skills=["research", "summarize"], endpoint="...")

    def solve(self, task):
        peer = A2A.discover(skill="code_review")   # 横向:发现别的 agent
        sub = A2A.delegate(peer, task.subtask)     # 横向:委派子任务
        # peer 内部又用自己的 MCP 接它自己的工具(纵向)
        return self.aggregate(self.run_local(task), sub)

# 关键:MCP(纵向) 与 A2A(横向) 正交,可同时用,不是竞品
# "该用 MCP 还是 A2A" == "该用 USB 还是网线" —— 错问题`;

export const protocolsDemo = {
  title: "演武场 · 协议台",
  intro: `<p>前面几章都在“一个团队/一个系统内部”讨论协作。一旦 agent 要<b>跨进程、跨厂商、跨平台</b>连接工具和别的 agent,就需要标准化协议。最常被混在一起的四个是 MCP、A2A、ACP、ANP,但它们解决的是<b>不同层次</b>的问题。</p>
<p><b>一句话先记住</b>:<b>MCP 接工具(纵向),A2A / ACP / ANP 接 agent(横向)。</b>MCP 让一个 agent 用统一方式接入文件/DB/API/沙箱(解决工具碎片化);A2A 靠 Agent Card 让不同厂商的 agent 互相发现、协商、委派。资料:<a href="${SURVEY_URL}" target="_blank" rel="noreferrer">Interoperability Survey</a>、<a href="${A2A_URL}" target="_blank" rel="noreferrer">Google A2A</a>。</p>
<p><b>最常见的错误</b>是把这四个当成“竞品里挑一个”。MCP 和 A2A <b>不是竞争关系</b>(一个接工具一个接 agent,可同时用),只有 A2A/ACP/ANP 之间才重叠竞争。问“该用 MCP 还是 A2A”等于问“该用 USB 还是用网线”。</p>
<p class="intro-arena-tip">右侧拖 <b>朱字</b>切换「四选一误解 / 分层正解」与横向协议(A2A/ACP/ANP)。<b>标准未定</b>:抓“解决哪一层”的心智模型(稳定),放具体字段与版本细节(还在变)。</p>`,
  bridge: {
    prev: "卷八:评估与 trace —— 预算对齐 / trace / 失败归因,让架构优劣可证伪。",
    current: "卷九:协议层 —— MCP 接工具(纵向),A2A/ACP/ANP 接 agent(横向),大多正交而非竞争。",
    next: "卷十:把全卷机制对照到真实框架 —— 抽象层次、状态模型、trace 透明度。",
    sources: ["Interoperability Survey", "Orchestration of MAS", "Google A2A"],
  },
  lines,
  paramDefs,
  initial,
  compute,
  frames,
  Viz,
  note,
  pyCode,
  playMs: 1500,
  terms: [
    { t: "MCP（纵向）", d: "Model Context Protocol。让一个 agent 用统一方式接入工具/数据源(文件/DB/API/沙箱),解决工具接入碎片化。不解决 agent 间通信。agent 的“USB 接口”。" },
    { t: "A2A（横向）", d: "Agent-to-Agent,Google 提出。让不同厂商/框架的 agent 互相发现、协商、委派,靠 Agent Card 描述能力。agent 连 agent。" },
    { t: "Agent Card", d: "A2A 里描述一个 agent 能力的清单——“我能做什么、怎么调我”。是跨平台发现与委派的基础。" },
    { t: "ACP / ANP", d: "另外两条横向路线。ACP 偏 REST/消息式标准化交互;ANP 面向开放 agent 互联网,强调去中心化身份与发现。与 A2A 重叠但侧重不同。" },
    { t: "纵横正交", d: "MCP(纵向接工具)与 A2A/ACP/ANP(横向接 agent)是正交两层,可同时用,不是竞品。“该用 MCP 还是 A2A”是错问题。" },
    { t: "抓心智模型放细节", d: "标准未定、生态洗牌。抓“每个协议解决哪一层”(纵向 vs 横向,稳定);放具体字段/消息格式/某版本实现(会过期)。" },
  ],
  localCmd: "# 心智模型:每个 agent 用 MCP 向下接工具,用 A2A/ACP/ANP 向外接 agent;纵横正交,各管一摊",
};


export default { name: 'GewuProtocolsDemo' }
</script>
