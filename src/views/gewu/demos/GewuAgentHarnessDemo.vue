<script lang="jsx">
const REACT_URL = "https://arxiv.org/abs/2210.03629";
const MRKL_URL = "https://arxiv.org/abs/2205.00445";
const TOOLFORMER_URL = "https://arxiv.org/abs/2302.04761";

// 两条 trace 的 7 个事件，与 loop 的 7 个 stage / 7 个骨架节点一一对应
const TRACES = [
  {
    label: "取证成功",
    events: [
      { role: "model", text: '{"action":"read_file","args":{"path":"roadmap.md"}}', note: "模型决定先取证" },
      { role: "parse", text: "解析 JSON → read_file，路径合法", note: "harness 校验通过" },
      { role: "check", text: "action ≠ final，继续循环", note: "还不能停" },
      { role: "tool", text: "run_tool(read_file) 读到文件内容", note: "harness 真实执行" },
      { role: "observation", text: 'Obs: "Phase 01 = Single-Agent Harness…"', note: "证据回流" },
      { role: "revise", text: "obs 入 messages，模型据此判断", note: "够了 → 准备 final" },
      { role: "final", text: 'final("Phase 01 目标/论文/标准")', note: "证据足够而停" },
    ],
  },
  {
    label: "失败恢复",
    events: [
      { role: "model", text: '{"action":"read_file","args":{"path":"ch99.md"}}', note: "先按用户路径试" },
      { role: "parse", text: "解析 JSON → read_file，格式合法", note: "harness 校验通过" },
      { role: "check", text: "action ≠ final，继续循环", note: "还不能停" },
      { role: "tool", text: "run_tool(read_file) 执行", note: "harness 真实执行" },
      { role: "observation", text: 'Obs: {"ok":false,"error":"file not found"}', note: "假设失败" },
      { role: "revise", text: "模型改判 → 改用 list_files 换路线", note: "失败 → 改判" },
      { role: "final", text: 'final("ch99 不存在，可用章节：…")', note: "可恢复停止" },
    ],
  },
];

// 左侧代码：minimal-harness/agent.py 中 run() 循环体的核心 7 句
const lines = [
  { text: "raw = call_model(messages)            # 模型产出下一步(JSON)", stage: 0 },
  { text: "action = parse_action(raw)            # harness 解析并校验", stage: 1 },
  { text: 'if action == "final": return answer   # 停止:证据足够', stage: 2 },
  { text: "obs = run_tool(name, args)            # harness 真实执行工具", stage: 3 },
  { text: 'messages += [action, "Obs:"+obs]      # observation 回流', stage: 4 },
  { text: "# loop 顶部:模型据新 obs 改判下一步", stage: 5 },
  { text: 'if step == max_steps: stop("budget")  # 停止:预算耗尽', stage: 6 },
];

const paramDefs = { trace: { min: 0, max: 1, step: 1, fmt: (v) => TRACES[v].label, label: '演示轨迹' } };
const initial = { trace: 0 };
function compute(p) {
  return { trace: TRACES[p.trace], traceIndex: p.trace };
}

const roleColor = {
  model: "#9c7b2e",
  parse: "#7a6a3a",
  check: "#8a7656",
  tool: "#3f6b4f",
  observation: "#6b3a2e",
  revise: "#5a4a36",
  final: "#9e2b1e",
};

const roleTag = {
  model: "① Model · 决策",
  parse: "② Harness · 解析校验",
  check: "③ 停止判断 (final?)",
  tool: "④ Harness · 执行工具",
  observation: "⑤ Observation · 回流",
  revise: "⑥ state · 改判",
  final: "⑦ stop / final",
};

// 7 个事件归到 5 个 loop 阶段节点
const STEP_NODE = {
  model: 0, parse: 1, check: 1, tool: 1, observation: 2, revise: 3, final: 4,
};

const NODES = [
  { label: "Model 决策", sub: "产出 JSON 动作" },
  { label: "Harness", sub: "解析 · 校验 · 执行" },
  { label: "Observation", sub: "环境事实回流" },
  { label: "state 改判", sub: "据 obs 定下一步" },
  { label: "stop / final", sub: "证据足够或预算耗尽" },
];

// 左侧竖向 loop 骨架：当前节点高亮放大，走过的变实心
function LoopSkeleton({ activeIdx }) {
  const X = 38;
  const ys = [40, 92, 144, 196, 252];
  return (
    <g>
      {/* 回流虚线：final/state -> model */}
      <path d={`M${X} ${ys[3]} C 16 ${ys[3]} 16 ${ys[0]} ${X} ${ys[0]}`} fill="none"
        stroke="#cdb98e" stroke-width="1" stroke-dasharray="3 3" />
      <text x="9" y="146" fill="#a8946a" font-size="9"
        transform="rotate(-90 9 146)">loop 回流</text>

      {NODES.map((n, i) => {
        const done = i < activeIdx;
        const hot = i === activeIdx;
        const fill = hot ? "#9e2b1e" : done ? "#c9a96b" : "#efe6d2";
        const stroke = hot || done ? "#9e2b1e" : "#cdb98e";
        const txt = hot ? "#9e2b1e" : done ? "#7a6a3a" : "#a8946a";
        return (
          <g key={i} data-step={i}>
            {i < NODES.length - 1 && (
              <line x1={X} y1={ys[i] + 13} x2={X} y2={ys[i + 1] - 13}
                stroke={i < activeIdx ? "#c9a96b" : "#cdb98e"} stroke-width="1.4" />
            )}
            <circle cx={X} cy={ys[i]} r={hot ? 11 : 8} fill={fill}
              stroke={stroke} stroke-width="1.6" />
            <text x={X} y={ys[i] + 3.5} text-anchor="middle"
              fill={hot ? "#fff" : done ? "#fff" : "#a8946a"} font-size="9.5">
              {done ? "✓" : i + 1}
            </text>
            <text x={X + 18} y={ys[i] - 1} fill={txt} font-size="11"
              font-weight={hot ? 600 : 400}>{n.label}</text>
            <text x={X + 18} y={ys[i] + 11} fill="#a8946a" font-size="8.5">{n.sub}</text>
          </g>
        );
      })}
    </g>
  );
}

function Viz({ derived: d, stage }) {
  const idx = Math.min(d.trace.events.length - 1, Math.max(0, stage));
  const e = d.trace.events[idx];
  const activeIdx = STEP_NODE[e.role];
  const color = roleColor[e.role];
  return (
    <svg viewBox="0 0 360 300" width="360" height="300" role="img" aria-label="Agent Thought Action Observation 状态循环">
      <text x="16" y="16" fill="#5a4a36" font-size="10.5">
        最小 loop · agent.py · {d.trace.label}
      </text>

      <LoopSkeleton activeIdx={activeIdx} />

      {/* 右侧当前步大卡片 */}
      <rect data-step={idx} x="160" y="44" width="186" height="150" rx="8"
        fill="#fbf6ea" stroke={color} stroke-width="1.4" />
      <rect x="160" y="44" width="186" height="26" rx="8" fill={color} opacity="0.14" />
      <text x="172" y="61" fill={color} font-size="11.5" font-weight="600">
        {roleTag[e.role]}
      </text>
      <foreignObject x="170" y="78" width="168" height="68">
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          fontFamily: "ui-monospace, Menlo, monospace", fontSize: "11px",
          lineHeight: "1.5", color: "#2b2117", wordBreak: "break-all",
        }}>{e.text}</div>
      </foreignObject>
      <line x1="172" y1="158" x2="334" y2="158" stroke="#e3d6b8" stroke-width="1" />
      <foreignObject x="170" y="162" width="168" height="28">
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          fontFamily: "var(--serif)", fontSize: "10.5px",
          lineHeight: "1.4", color: "#8a7656",
        }}>↳ {e.note}</div>
      </foreignObject>

      <text x="160" y="214" fill="#a8946a" font-size="9.5">
        第 {idx + 1} / {d.trace.events.length} 步
      </text>

      <text x="16" y="288" fill="#8a7656" font-size="9.5">
        模型只产出 JSON，真实执行与停止判断都在 harness。
      </text>
    </svg>
  );
}

function frames(params, d) {
  const e = d.trace.events;
  return [
    { line: 1, stage: 0, say: `<b>第 1 句</b>：<code>call_model(messages)</code>。模型不直接执行任何东西，只产出下一步动作的 JSON：<b>${e[0].text}</b>。这对应 <a href="${REACT_URL}" target="_blank" rel="noreferrer">ReAct</a> 的 Thought→Action。` },
    { line: 2, stage: 1, say: "<b>第 2 句</b>：<code>parse_action(raw)</code>。harness 把模型输出解析成结构化动作并校验。非法 JSON、未知工具、越权路径都会被挡下，变成错误 observation，而不是让程序崩溃。" },
    { line: 3, stage: 2, say: "<b>第 3 句</b>：判断 <code>action == \"final\"</code>。这是<b>停止条件之一</b>——证据足够时模型给出 final，循环结束。这一步还不是 final，继续。" },
    { line: 4, stage: 3, say: `<b>第 4 句</b>：<code>run_tool(name, args)</code>。模型不能假装读了文件，<b>真实执行必须由 harness 完成</b>。这正是 agent 与“会调工具的 prompt”的分界。` },
    { line: 5, stage: 4, say: `<b>第 5 句</b>：把 action 和 <code>Obs:</code> 一起追加进 messages。<b>${e[4].text}</b> 回流给模型——这就是 Observation。` },
    { line: 6, stage: 5, say: d.traceIndex === 1
        ? `<b>回到顶部</b>：模型读到失败 observation，<b>改判换路线</b>（${e[5].note}）。ReAct 的精髓在“看见以后改判”，失败也是证据。`
        : `<b>回到顶部</b>：模型读到新 observation，判断证据已够（${e[5].note}）。observation 改变了下一步决策。` },
    { line: 7, stage: 6, say: `<b>停止</b>：要么模型输出 <b>${e[6].text}</b>，要么撞上 <code>max_steps</code> 预算硬停。停止条件必须工程化，不能只靠模型“觉得想完了”。` },
  ];
}

function note(stage, params, d) {
  const e = d.trace.events;
  switch (stage) {
    case 0:
      return `这段代码就是 <code>agent.py</code> 中 <code>run()</code> 循环体的精简版。模型的职责<b>只有</b>：根据 messages 产出一个 JSON 动作。它不读文件、不跑命令，只是“提出请求”。`;
    case 1:
      return "harness 的第一项硬职责：<b>解析与校验</b>。模型输出是不可信文本，必须解析成动作对象、检查工具名和参数。失败要降级成 observation 反馈给模型，让它自己纠正。";
    case 2:
      return "停止条件 ①：<b>final</b>。模型判断证据足够，主动结束。注意 final 是一个明确的<b>结束动作</b>，不是自然语言里的一句“好了”。";
    case 3:
      return "harness 的第二项硬职责：<b>真实执行工具</b>。<code>run_tool</code> 才会真的去读文件、搜文本。模型与真实世界之间隔着 harness，这层隔离也是权限与安全的边界。";
    case 4:
      return `observation 回流：<code>messages += [action, "Obs:"+obs]</code>。结构化的 observation（ok/error、路径、摘要）进入下一轮上下文。把一大坨 stdout 直接塞回去会让上下文很快失控。`;
    case 5:
      return d.traceIndex === 1
        ? "这一帧是<b>失败恢复</b>：observation 报错，模型不是卡死重试，而是换 list_files 探查可用文件。harness 还会检测“重复相同调用”并干预（连续两次后第三次返回错误）。"
        : "这一帧是<b>取证成功</b>：observation 带回事实，模型判断已能回答。ReAct 的核心就在这里——如果 observation 不改变下一步，那只是把日志贴回模型，不算 agent。";
    case 6:
      return `停止条件 ②：<b>预算</b>。<code>max_steps</code> 是兜底硬停。生产 harness 还需要 max_tokens、max_runtime、重复动作检测、错误上报。三篇论文分工：<a href="${REACT_URL}" target="_blank" rel="noreferrer">ReAct</a> 给闭环，<a href="${MRKL_URL}" target="_blank" rel="noreferrer">MRKL</a> 给模块化工具观，<a href="${TOOLFORMER_URL}" target="_blank" rel="noreferrer">Toolformer</a> 说明模型可学习何时用工具。`;
    default:
      return "拖动朱字切换「取证成功 / 失败恢复」两条 trace，点演法逐步走完 loop。";
  }
}

const pyCode = `# minimal-harness/agent.py · run() 循环体（精简）
def run(task, max_steps=8):
    messages = [system_prompt, user(task)]
    for step in range(1, max_steps + 1):
        raw = call_model(messages)            # 想:模型产出下一步 JSON
        action = parse_action(raw)            # harness 解析 + 校验
        if action["action"] == "final":       # 停止:证据足够
            return action["answer"]
        name, args = action["action"], action["args"]
        obs = run_tool(name, args)            # 做:harness 真实执行
        messages += [assistant(action),       # 看:observation 回流
                     user("Observation: " + obs)]
    return stopped("max_steps")               # 停止:预算耗尽`;

export const agentHarnessDemo = {
  title: "演武场 · 最小 harness loop",
  intro: `<p>普通 LLM 是 <b>User → Model → Answer</b>：一次性凭上下文生成。<b><a href="${REACT_URL}" target="_blank" rel="noreferrer">ReAct</a></b> 把它改成 <b>想(Thought) → 做(Action) → 看(Observation) → 再想</b> 的闭环。先把四个问题问清楚：</p>
<ol class="intro-qa">
  <li><b>为什么不能只输出最终答案？</b>因为很多任务需要<b>外部证据</b>：查文件、查环境、跑工具。没取证就答，缺证据时只能猜，且不可调试、易幻觉。<i>→ 先取证，再回答。</i></li>
  <li><b>Thought→Action→Observation 解决了什么？</b>把推理和外部世界接成<b>闭环</b>：Thought 判缺口、Action 请求工具、Observation 带回事实，让 agent 从“一次性押答案”变成“边查边改”。<i>→ 想、做、看，再想。</i></li>
  <li><b>Observation 如何改变下一步？</b>它是<b>证据</b>不是日志：成功补充事实、失败推翻假设、空结果迫使换路线，注入 state 后模型据此改判。<i>→ 环境反馈会改写计划。</i></li>
  <li><b>什么时候停止？</b>停止是工程问题：证据足够输出 <code>final</code>；预算耗尽 <code>max_steps</code> 硬停；重复动作由 harness 干预。不能只靠模型“觉得想完了”。<i>→ final + 预算 + 防循环。</i></li>
</ol>
<p><b>Agent 与 harness 的关系：</b><b>Model</b> 只负责决策——产出一个 JSON 动作；它不能真的读文件、跑命令。<b>Harness</b> 是模型外的运行系统，负责解析校验动作、<b>真实执行</b>工具、回注 observation、记录 trace、控制停止。所以 <b>Agent = Model + Harness + Tools + 有状态循环</b>，不是“更会说的模型”，而是被 harness 组织起来、能取证和改判的执行循环。</p>
<p class="intro-arena-tip">右侧演武场演示真实的最小 loop（<code>agent.py · run()</code>）。拖 <b>朱字</b>切换「取证成功 / 失败恢复」，点演法逐句走完闭环。</p>`,
  bridge: {
    prev: "LLM 卷说明模型如何生成文字。",
    current: "ReAct 四问已在正文讲清；这里演示四问落成的真实 loop。",
    next: "第二式细讲 tool schema、工具选择和 observation 治理。",
    sources: ["ReAct", "MRKL", "Toolformer"],
  },
  lines,
  paramDefs,
  initial,
  compute,
  frames,
  Viz,
  note,
  pyCode,
  playMs: 1350,
  runtimeLabel: "脚本化 Trace 演示",
  challenge: {
    prompt: '工具返回“file not found”后，最应该促使模型改变下一步的是什么？',
    options: ['模型原来的自然语言回答', '返回的 error observation', '把相同工具再调用一次'],
    correct: 1,
    feedback: '正确：observation 是来自环境的证据；失败信息进入 messages 后，模型才能据此换路线。',
    retry: '回看失败恢复 trace：哪个事件明确告诉模型原路径不存在？',
    transfer: '为一个“查资料再回答”的任务写出一条 action 和一条能改变计划的 observation。',
  },
  terms: [
    { t: "Model", d: "决策器。只根据 messages 产出一个结构化动作（调工具或 final），不直接接触真实世界。" },
    { t: "Harness", d: "模型外的运行系统：解析校验动作、真实执行工具、回注 observation、记录 trace、控制停止与预算。" },
    { t: "Observation", d: "工具返回的环境事实。成功补证、失败改判、空结果换路线，都会回流进 messages 影响下一步。" },
    { t: "停止条件", d: "final(证据足够) 与 max_steps(预算耗尽) 是两类基本停止；生产还需重复动作检测、错误上报。" },
    { t: "Trace", d: "task / model / tool / final 逐条落盘成 trace.jsonl，让 agent 从黑箱变成可复盘系统。" },
  ],
  localCmd: "cd agent-volume/experiments/minimal-harness && python3 agent.py \"演示 Agent 卷第一章的最小 harness\" --scripted-demo --reset-trace",
};


export default { name: 'GewuAgentHarnessDemo' }
</script>
