<script lang="jsx">
const SURVEY_URL = "https://arxiv.org/abs/2402.01680";
const MECH_URL = "https://arxiv.org/abs/2501.06322";
const COMM_URL = "https://arxiv.org/abs/2502.14321";
const ANATOMY_URL = "https://www.langchain.com/blog/the-anatomy-of-an-agent-harness";
const SDK_URL = "https://openai.github.io/openai-agents-python/agents/";

// 两种选型口径
const MODES = [
  { id: "easy", label: "只图上手快（高层优先）" },
  { id: "fit", label: "按抽象/状态/trace 选型" },
];

// 抽象层次光谱(低->高)
const FW = [
  "mini-SWE-agent",
  "OpenAI Agents SDK",
  "LangGraph",
  "MS Agent Framework",
  "CrewAI",
];

// 每个框架的画像
const FW_DESC = [
  { abs: "极低", state: "线性轨迹(透明实现)", cat: "透明", trace: "代码即 trace,全透明", risk: "无(但要自己写很多)", when: "研究最小 agent loop" },
  { abs: "中(轻量)", state: "session + handoff", cat: "SDK", trace: "内置 tracing", risk: "低", when: "现代 SDK 最小抽象" },
  { abs: "中低(显式图)", state: "状态机 / 图", cat: "图", trace: "内置 tracing", risk: "低(图要自己设计)", when: "复杂状态/循环/长任务" },
  { abs: "中", state: "对话(AutoGen 后继)", cat: "SDK", trace: "较完整", risk: "中", when: "AutoGen 已维护,新项目看它" },
  { abs: "高", state: "role / task / crew", cat: "角色", trace: "较浅,易藏执行细节", risk: "高:易退化成固定 workflow", when: "快速搭多角色原型" },
];

const paramDefs = {
  mode: { min: 0, max: 1, step: 1, fmt: (v) => MODES[v].label },
  fw: { min: 0, max: 4, step: 1, fmt: (v) => FW[v] },
};
const initial = { mode: 1, fw: 1 };

function compute(p) {
  const fit = p.mode === 1;
  const d = FW_DESC[p.fw];
  // 透明度随抽象上升而下降(0~1),便利度相反
  const transparency = 1 - p.fw / (FW.length - 1);
  const convenience = p.fw / (FW.length - 1);
  return {
    mode: MODES[p.mode].id, modeIndex: p.mode, fit,
    fw: p.fw, fwName: FW[p.fw], desc: d,
    transparency, convenience,
    highRisk: p.fw >= 4,
  };
}

const OK = "#3f6b4f";
const ERR = "#9e2b1e";
const GOLD = "#9c7b2e";
const SUB = "#a8946a";

function Viz({ derived: d, stage }) {
  const idx = Math.min(5, Math.max(0, stage));
  const fit = d.fit;
  // 光谱条上的框架点
  const x0 = 24, x1 = 336;
  const px = (i) => x0 + (i / (FW.length - 1)) * (x1 - x0);
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x="16" y="14" fill="#5a4a36" font-size="10.5">
        框架台 · {MODES[d.modeIndex].label}
      </text>

      {/* 抽象层次光谱 */}
      <text x="24" y="34" fill={OK} font-size="8.2">← 透明/低层(写得多,控制强)</text>
      <text x="336" y="34" text-anchor="end" fill={GOLD} font-size="8.2">便利/高层(上手快,看不清) →</text>
      <line x1={x0} y1="46" x2={x1} y2="46" stroke="#cdb98e" stroke-width="1.4" />
      {FW.map((f, i) => {
        const sel = i === d.fw;
        const edge = i === 0 ? "start" : i === FW.length - 1 ? "end" : "middle";
        const labelX = i === 0 ? 16 : i === FW.length - 1 ? 344 : px(i);
        return (
          <g key={f}>
            <circle cx={px(i)} cy="46" r={sel ? 6 : 4}
              fill={sel ? (i >= 4 ? ERR : OK) : "#fbf6ea"}
              stroke={sel ? (i >= 4 ? ERR : OK) : "#cdb98e"} stroke-width={sel ? 2 : 1} />
            <text x={labelX} y={i % 2 === 0 ? 64 : 76} text-anchor={edge}
              fill={sel ? "#5a4a36" : SUB} font-size="7" font-weight={sel ? "700" : "400"}>
              {f}
            </text>
          </g>
        );
      })}

      <line x1="16" y1="88" x2="344" y2="88" stroke="#e3d6b8" stroke-width="1" />

      {/* 选中框架画像 */}
      <text x="16" y="104" fill="#5a4a36" font-size="9.4" font-weight="600">{d.fwName}</text>
      <text x="16" y="120" fill={SUB} font-size="8">抽象层次：{d.desc.abs}　状态模型：{d.desc.state}</text>
      <text x="16" y="136" fill={d.fit ? OK : SUB} font-size="8">trace：{d.desc.trace}</text>
      <text x="16" y="152" fill={d.highRisk ? ERR : SUB} font-size="8">退化风险：{d.desc.risk}</text>
      <text x="16" y="168" fill={SUB} font-size="8">适用：{d.desc.when}</text>

      <line x1="16" y1="180" x2="344" y2="180" stroke="#e3d6b8" stroke-width="1" />

      {fit ? (
        <>
          {/* 三类状态模型 + trace 第一梯队 */}
          <text x="16" y="196" fill="#5a4a36" font-size="9" font-weight="600">三类状态模型(本框架属：{d.desc.cat})</text>
          <text x="16" y="212" fill={d.desc.cat === "SDK" ? OK : SUB} font-size="7.8">· SDK/session 式(OpenAI SDK)：一段对话流</text>
          <text x="16" y="226" fill={d.desc.cat === "图" ? OK : SUB} font-size="7.8">· 图/状态机式(LangGraph)：一张状态图</text>
          <text x="16" y="240" fill={d.desc.cat === "角色" ? OK : SUB} font-size="7.8">· 角色-任务式(CrewAI)：一个分工团队</text>
          <text x="16" y="262" fill={OK} font-size="9" font-weight="600">trace 透明度 = 选型第一梯队指标</text>
          <text x="16" y="278" fill={SUB} font-size="7.8">问框架能不能用来做严肃活:它的 trace 够不够做失败归因?</text>
          <text x="16" y="292" fill={GOLD} font-size="7.8">先问"要不要框架"——单 agent 够用时连框架都不用。</text>
        </>
      ) : (
        <>
          <text x="16" y="198" fill={ERR} font-size="9" font-weight="600">只图上手快的陷阱</text>
          <text x="16" y="214" fill={SUB} font-size="7.8">高层抽象把执行藏得太深 → trace 不透明 → 出问题只能干瞪眼。</text>
          {d.highRisk ? (
            <>
              <text x="16" y="234" fill={ERR} font-size="8.4" font-weight="600">把「自治 agent」写成了「固定 LLM workflow」</text>
              <text x="16" y="250" fill={SUB} font-size="7.8">表面多角色协作,实际只是一串预定义 LLM 调用——</text>
              <text x="16" y="264" fill={SUB} font-size="7.8">agent 没真正自主规划/调工具/应对意外。</text>
              <text x="16" y="282" fill={ERR} font-size="8.2">这是 ch07 那个警惕的框架版:很多"multi-agent"=workflow+多花 token。</text>
            </>
          ) : (
            <>
              <text x="16" y="236" fill={SUB} font-size="7.8">这个框架还算透明;但若一路只挑最高层,就会掉进上面的坑。</text>
              <text x="16" y="256" fill={GOLD} font-size="8.2">切到"按抽象/状态/trace 选型",看该怎么判断。</text>
              <text x="16" y="276" fill={SUB} font-size="7.8">拖朱字把框架推到 CrewAI,看高层抽象的退化风险。</text>
            </>
          )}
        </>
      )}
    </svg>
  );
}

function frames(params, d) {
  const fit = d.fit;
  return [
    { line: 1, stage: 0, say: `第 1 步：把框架按<b>透明度 vs 便利度</b>排成一条光谱。左端是 mini-SWE-agent / OpenHarness 这类<b>透明实现</b>(代码路径极短,看得清最小 loop);右端是 CrewAI 这类<b>高层抽象</b>(上手快,但底下发生什么看不清)。<a href="${SURVEY_URL}" target="_blank" rel="noreferrer">MAS Survey</a>。` },
    { line: 2, stage: 1, say: `第 2 步核心权衡:<b>抽象越高,上手越快,但越难 debug 和定制;抽象越低,写得越多,但对 loop / 上下文 / trace 的控制越强</b>。没有最好的层次,只有匹配任务和团队的层次。` },
    { line: 3, stage: 2, say: `第 3 步：<b>三类状态模型</b>——<b>SDK/session 式</b>(OpenAI Agents SDK,以会话+handoff 为单位)、<b>图/状态机式</b>(LangGraph,流程显式建成节点和边)、<b>角色-任务式</b>(CrewAI/MetaGPT,以 role/task/crew 组织)。选哪类取决于任务是"一段对话流""一张状态图"还是"一个分工团队"。<a href="${MECH_URL}" target="_blank" rel="noreferrer">Collaboration Mechanisms</a>。` },
    { line: 4, stage: 3, say: `第 4 步关键：<b>trace 设计是选框架最该看的一点</b>(呼应 ch08——没有 trace 就无法评估和归因)。OpenAI Agents SDK / LangGraph 都<b>内置 tracing</b>;高层框架若把执行藏太深、trace 不透明,出问题只能干瞪眼。判断一个框架能不能做严肃工作,先问:<b>它的 trace 够不够我做失败归因?</b><a href="${SDK_URL}" target="_blank" rel="noreferrer">Agents SDK</a>。` },
    { line: 5, stage: 4, say: fit
        ? `第 5 步：<b>高层抽象的风险</b>——CrewAI 这类 role/task 上手快,但反复出现的陷阱是<b>把「自治 agent」写成「固定 LLM workflow」</b>:表面多角色协作,实际只是一串预定义 LLM 调用,agent 并没真正自主规划/调工具/应对意外。未必是坏事(很多任务确实只要 workflow),但要<b>诚实知道自己在做哪个</b>。`
        : `第 5 步:当前"只图上手快"口径——一路挑最高层,迟早掉进"把自治 agent 写成固定 workflow"的坑,且 trace 不透明时无法归因。切到"按抽象/状态/trace 选型"口径再看。` },
    { line: 6, stage: 5, say: fit
        ? `第 6 步：选型判断——<b>先问这任务真需要框架吗?</b> 单 agent 够用→可能连框架都不用;要复杂状态/循环/长任务→LangGraph 这类显式图;快速搭多角色原型→CrewAI(但认清是不是 workflow);要研究 harness 本身→读 mini-SWE-agent / OpenHarness。<b>框架是脚手架,不替你想清楚"要不要 multi-agent、通信怎么设计、怎么评估"</b>——那是本卷前九章的事。<a href="${ANATOMY_URL}" target="_blank" rel="noreferrer">Anatomy of an Agent Harness</a>。`
        : `第 6 步:别把"会用某个高层框架"当成"懂 agent"。光用高层框架学不到 harness 真本事;读 mini-SWE-agent / OpenHarness 这类透明实现,才看得清上下文怎么喂、工具怎么执行、trace 怎么记、失败怎么恢复。` },
  ];
}

function note(stage, params, d) {
  switch (stage) {
    case 0:
      return "本式把全卷机制对照到真实框架:按<b>透明度 vs 便利度</b>排成光谱(mini-SWE-agent 极低 → CrewAI 高)。一句话:<b>框架是脚手架,不替你想清楚架构</b>。资料:<a href=\"" + SURVEY_URL + "\" target=\"_blank\" rel=\"noreferrer\">MAS Survey</a>、<a href=\"" + ANATOMY_URL + "\" target=\"_blank\" rel=\"noreferrer\">Anatomy of an Agent Harness</a>、<a href=\"" + SDK_URL + "\" target=\"_blank\" rel=\"noreferrer\">OpenAI Agents SDK</a>。";
    case 1:
      return "<b>抽象层次权衡</b>:抽象越高→上手越快但越看不清底下、越难 debug/定制;抽象越低→写得越多但对 loop/上下文/trace 控制越强。没有最好的层次,只有匹配任务和团队的层次。";
    case 2:
      return "<b>三类状态模型</b>:SDK/session 式(OpenAI SDK,会话+handoff,状态较隐式)、图/状态机式(LangGraph,节点+边,适合复杂循环/长任务)、角色-任务式(CrewAI/MetaGPT/ChatDev,role/task/crew 或 SOP,贴近团队分工但易退化成固定 workflow)。";
    case 3:
      return "<b>trace 是选框架第一梯队考量</b>(呼应 ch08):OpenAI SDK / LangGraph 内置 tracing,每个 agent 的输入/tool 调用/输出/token/耗时及 agent 间消息都能回放。高层框架若 trace 不透明,出问题只能干瞪眼。先问:它的 trace 够不够做失败归因?";
    case 4:
      return "<b>高层抽象的风险</b>:CrewAI 这类 role/task 易把「自治 agent」写成「固定 LLM workflow」——表面多角色协作,实际一串预定义 LLM 调用。这是 ch07 那个警惕的框架版:很多 multi-agent 其实是 workflow + 多花 token。关键是诚实知道自己在做哪个。";
    case 5:
      return "<b>怎么选/何时不用</b>:单 agent 够→可能不用框架;复杂状态/循环/长任务→LangGraph;快速多角色原型→CrewAI(认清是不是 workflow);研究 harness→读 mini-SWE-agent/OpenHarness。AutoGen 已维护模式,新项目看 MS Agent Framework。<b>理解机制(读透明实现)比会用某个框架更值钱。</b>";
    default:
      return "拖朱字切换「只图上手快 / 按抽象·状态·trace 选型」与框架,看同一框架在两种口径下被怎么评判;把框架推到 CrewAI,看高层抽象“把自治 agent 写成固定 workflow”的退化风险。";
  }
}

const pyCode = `# 选框架的判断顺序(与本卷一贯立场一致)
def pick_framework(task):
    if not really_needs_framework(task):
        return "单 agent(会用工具+会管上下文)就够,可能连框架都不用"
    if task.needs_complex_state or task.is_long_horizon:
        return "LangGraph 这类显式图/状态机"        # 图式
    if task.is_multi_role_prototype:
        return "CrewAI 这类高层 —— 但认清是不是只是 workflow"  # 角色式
    if task.is_research_on_harness:
        return "读 mini-SWE-agent / OpenHarness(透明实现)"
    return "OpenAI Agents SDK —— 现代 SDK 最小抽象 + 内置 trace"  # SDK 式

# 选型第一梯队指标:trace 够不够做失败归因(呼应 ch08)
# 不变原则:框架是脚手架,不替你想清楚"要不要 multi-agent / 通信 / 评估"`;

export const frameworksDemo = {
  title: "演武场 · 框架台",
  intro: `<p>全卷最后一式。前九章把 harness / tool / memory / feedback / sub-agent / team / 协作 / 评估 / 协议都讲过了,本式把这些机制<b>对照到真实框架</b>上——看别人怎么把抽象落地,以及各自的代价。</p>
<p><b>一句话先记住</b>:<b>框架是脚手架,不是替你想清楚架构。</b>把框架按<b>透明度 vs 便利度</b>排成光谱:左端 mini-SWE-agent / OpenHarness(极低抽象、透明),右端 CrewAI(高抽象、上手快但看不清)。核心权衡:<b>抽象越高上手越快但越难 debug/定制,抽象越低写得越多但控制越强。</b></p>
<p><b>三件要看的事</b>:① <b>抽象层次</b>(光谱上的位置);② <b>状态模型</b>(SDK/session 式、图/状态机式、角色-任务式);③ <b>trace 透明度</b>——呼应 ch08,没有 trace 就无法评估和归因,所以这是<b>选型第一梯队指标</b>。<a href="${ANATOMY_URL}" target="_blank" rel="noreferrer">Anatomy of an Agent Harness</a>、<a href="${SDK_URL}" target="_blank" rel="noreferrer">OpenAI Agents SDK</a>。</p>
<p class="intro-arena-tip">右侧拖 <b>朱字</b>切换「只图上手快 / 按抽象·状态·trace 选型」与框架。<b>最大的坑</b>是高层抽象把"自治 agent"写成"固定 LLM workflow"——这是 ch07 那个警惕的框架版。判断口诀:<b>先问要不要框架,再看 trace 够不够做归因。</b></p>`,
  bridge: {
    prev: "卷九:协议层 —— MCP 接工具(纵向),A2A/ACP/ANP 接 agent(横向),大多正交而非竞争。",
    current: "卷十:框架对比 —— 按抽象层次/状态模型/trace 透明度选型,框架是脚手架不替你想清楚架构。",
    next: "全卷收尾:先把 single-agent harness 做扎实,multi-agent 只在对齐预算/可观测 trace/可复现评估下证明有结构性收益时才用。",
    sources: ["MAS Survey", "Anatomy of an Agent Harness", "OpenAI Agents SDK", "Collaboration Mechanisms"],
  },
  lines: [
    { text: "spectrum = sort(frameworks, by=transparency)   # 透明度 vs 便利度排光谱", stage: 0 },
    { text: "tradeoff(high_abs=easy_but_opaque)             # 抽象越高越难看清/debug", stage: 1 },
    { text: "state_model in {session, graph, role_task}     # 三类状态模型", stage: 2 },
    { text: "assert framework.trace.enough_for_attribution  # trace 是第一梯队指标", stage: 3 },
    { text: "warn(role_task == fixed_llm_workflow)          # 高层易退化成固定 workflow", stage: 4 },
    { text: "if not needs_framework(task): drop()           # 先问要不要框架", stage: 5 },
  ],
  paramDefs,
  initial,
  compute,
  frames,
  Viz,
  note,
  pyCode,
  playMs: 1500,
  terms: [
    { t: "抽象层次光谱", d: "按透明度 vs 便利度排开:mini-SWE-agent/OpenHarness(极低,透明)→OpenAI SDK/LangGraph(中)→CrewAI(高)。抽象越高上手越快但越看不清、越难 debug/定制。" },
    { t: "三类状态模型", d: "SDK/session 式(OpenAI SDK,会话+handoff)、图/状态机式(LangGraph,节点+边)、角色-任务式(CrewAI,role/task/crew)。看任务是一段对话流/一张状态图/一个分工团队。" },
    { t: "trace 透明度", d: "选框架第一梯队指标(呼应 ch08):内置 tracing 能记每个 agent 的输入/工具/输出/token 及 agent 间消息。trace 不透明=无法做失败归因=不能做严肃工作。" },
    { t: "退化成 workflow", d: "高层 role/task 抽象的陷阱:把自治 agent 写成固定 LLM workflow——表面多角色协作,实际一串预定义调用。ch07 警惕的框架版,要诚实知道自己在做哪个。" },
    { t: "透明实现", d: "mini-SWE-agent(极短代码路径,最小 loop)、OpenHarness(harness 底层)、Aider/SWE-agent/OpenHands(repo map/diff 编辑/ACI)。读它们看清机制,比会用高层框架更值钱。" },
    { t: "何时不用框架", d: "先问任务真需要框架吗:会用工具+会管上下文的单 agent 够用就别上框架。框架是脚手架,不替你想清楚要不要 multi-agent、通信怎么设计、怎么评估。" },
  ],
  localCmd: "# 对照阅读清单:最小 loop→mini-SWE-agent;工具/沙箱→SWE-agent/Aider;trace→LangGraph;harness 全貌→OpenHarness。读透明实现 > 会用某框架",
};



export default { name: 'GewuFrameworksDemo' }
</script>
