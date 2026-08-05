<script lang="jsx">
const MRKL_URL = "https://arxiv.org/abs/2205.00445";
const TOOLFORMER_URL = "https://arxiv.org/abs/2302.04761";

// 4 个 case 的输出均来自实跑 tools.py·run_tool 的真实结果
// failNode：在哪一关被拦下（对应管道节点索引）；null = 全程通过
const CASES = [
  {
    label: "合法调用",
    action: '{"action":"read_file","args":{"path":"roadmap.md","max_chars":5000}}',
    failNode: null,
    obsOk: true,
    obs: '{"ok":true,"path":"roadmap.md","truncated":false,"chars":1583,"content":"# Agent 卷…"}',
    obsNote: "参数全部合法 → 真实执行 → 结构化结果回注",
  },
  {
    label: "缺必填参数",
    action: '{"action":"read_file","args":{}}',
    failNode: 3,
    obsOk: false,
    obs: '{"ok":false,"error_type":"validation_error","error":"missing required argument for read_file: path","tool":"read_file","args":{}}',
    obsNote: "必填项 path 缺失 → 不执行，错误回注让模型补参重试",
  },
  {
    label: "参数越界",
    action: '{"action":"read_file","args":{"path":"README.md","max_chars":999999}}',
    failNode: 4,
    obsOk: false,
    obs: '{"ok":false,"error_type":"validation_error","error":"argument max_chars must be <= 30000","tool":"read_file","args":{"path":"README.md","max_chars":999999}}',
    obsNote: "max_chars 超出 schema 上限 30000 → 被范围校验拦下",
  },
  {
    label: "未知工具",
    action: '{"action":"open_url","args":{"url":"http://x"}}',
    failNode: 1,
    obsOk: false,
    obs: '{"ok":false,"error_type":"unknown_tool","error":"unknown tool: open_url"}',
    obsNote: "工具名不在 TOOL_SPECS 中 → 第一关就拦下",
  },
];

// 左侧心法经文：tools.py·run_tool / _validate_args 的校验管道核心
const lines = [
  { text: "action = parse(model_output)             # ① 模型产出 action", stage: 0 },
  { text: "if name not in TOOL_SPECS: -> unknown    # ② 工具存在?", stage: 1 },
  { text: "if set(args) - schema: -> validation_err # ③ 参数都认识?", stage: 2 },
  { text: "if missing_required: -> validation_err   # ④ 必填齐全?", stage: 3 },
  { text: "if out_of_range(type,min,max): -> err    # ⑤ 类型/范围?", stage: 4 },
  { text: "obs = TOOLS[name](**validated)           # ⑥ 真实执行", stage: 5 },
  { text: "messages += structured_obs(obs)          # ⑦ 结构化回注", stage: 6 },
];

const paramDefs = { case: { min: 0, max: 3, step: 1, fmt: (v) => CASES[v].label } };
const initial = { case: 0 };
function compute(p) {
  return { case: CASES[p.case], caseIndex: p.case };
}

// 7 个 stage 对应的管道节点（与 lines 一一对应）
const NODES = [
  { label: "model action", sub: "模型产出意图" },
  { label: "工具存在?", sub: "查 TOOL_SPECS" },
  { label: "参数认识?", sub: "无多余字段" },
  { label: "必填齐全?", sub: "required 检查" },
  { label: "类型/范围?", sub: "type·min·max" },
  { label: "真实执行", sub: "TOOLS[name]" },
  { label: "结构化回注", sub: "observation" },
];

const PASS = "#3f6b4f";
const FAIL = "#9e2b1e";
const IDLE = "#cdb98e";

function Pipeline({ stage, failNode }) {
  const X = 40;
  const ys = [30, 67, 104, 141, 178, 215, 256];
  // 某节点状态：done(通过,金勾) / fail(被拦,红叉) / hot(当前) / idle
  const stateOf = (i) => {
    const blocked = failNode != null && stage >= failNode && i > failNode;
    if (blocked) return "idle";
    if (i === stage) return failNode === i ? "fail" : "hot";
    if (i < stage) return "done";
    return "idle";
  };
  return (
    <g>
      {NODES.map((n, i) => {
        const st = stateOf(i);
        const ring = st === "fail" ? FAIL : st === "hot" ? FAIL : st === "done" ? "#c9a96b" : IDLE;
        const fill = st === "fail" ? FAIL : st === "hot" ? FAIL : st === "done" ? "#c9a96b" : "#efe6d2";
        const mark = st === "fail" ? "✕" : st === "done" ? "✓" : String(i + 1);
        const markFill = st === "idle" ? "#a8946a" : "#fff";
        const labelFill = st === "fail" || st === "hot" ? FAIL : st === "done" ? "#7a6a3a" : "#a8946a";
        const big = st === "hot" || st === "fail";
        return (
          <g key={i}>
            {i < NODES.length - 1 && (
              <line x1={X} y1={ys[i] + 11} x2={X} y2={ys[i + 1] - 11}
                stroke={i < stage ? "#c9a96b" : IDLE} stroke-width="1.4" />
            )}
            <circle cx={X} cy={ys[i]} r={big ? 10 : 7.5} fill={fill}
              stroke={ring} stroke-width="1.6" />
            <text x={X} y={ys[i] + 3.5} text-anchor="middle" fill={markFill} font-size="9.5">{mark}</text>
            <text x={X + 17} y={ys[i] - 1} fill={labelFill} font-size="10.5"
              font-weight={big ? 600 : 400}>{n.label}</text>
            <text x={X + 17} y={ys[i] + 10} fill="#a8946a" font-size="8.2">{n.sub}</text>
          </g>
        );
      })}
    </g>
  );
}

function Viz({ derived: d, stage }) {
  const c = d.case;
  const s = Math.min(6, Math.max(0, stage));
  const atObs = s === 6;
  const color = c.failNode != null ? FAIL : PASS;
  // 右侧卡片：到第⑦步显示最终 observation；否则显示当前 action 意图
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x="16" y="15" fill="#5a4a36" font-size="10.5">
        工具校验管道 · tools.py · {c.label}
      </text>

      <Pipeline stage={s} failNode={c.failNode} />

      <rect x="172" y="40" width="176" height="150" rx="8"
        fill="#fbf6ea" stroke={atObs ? (c.obsOk ? PASS : FAIL) : "#9c7b2e"} stroke-width="1.4" />
      <rect x="172" y="40" width="176" height="24" rx="8"
        fill={atObs ? (c.obsOk ? PASS : FAIL) : "#9c7b2e"} opacity="0.15" />
      <text x="184" y="57" fill={atObs ? (c.obsOk ? PASS : FAIL) : "#9c7b2e"}
        font-size="11" font-weight="600">
        {atObs ? (c.obsOk ? "Observation · ok" : "Observation · error") : "model action"}
      </text>
      <foreignObject x="182" y="70" width="158" height="112">
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          fontFamily: "ui-monospace, Menlo, monospace", fontSize: "10px",
          lineHeight: "1.5", color: "#2b2117", wordBreak: "break-all",
        }}>{atObs ? c.obs : c.action}</div>
      </foreignObject>

      <foreignObject x="172" y="196" width="176" height="40">
        <div xmlns="http://www.w3.org/1999/xhtml" style={{
          fontFamily: "var(--serif)", fontSize: "10px",
          lineHeight: "1.4", color: "#8a7656",
        }}>↳ {c.obsNote}</div>
      </foreignObject>

      <text x="172" y="256" fill={color} font-size="9.5">
        {c.failNode == null ? "全程通过 → 真实执行" : `第 ${c.failNode + 1} 关被拦 → 不执行`}
      </text>

      <text x="16" y="290" fill="#8a7656" font-size="9.5">
        失败不让模型编结果，而是回注结构化错误，让它纠正重试。
      </text>
    </svg>
  );
}

function frames(params, d) {
  const c = d.case;
  return [
    { line: 1, stage: 0, say: `模型只产出<b>意图</b>：<code>${c.action}</code>。它不直接执行——这是 agent 与“会调工具的 prompt”的分界。` },
    { line: 2, stage: 1, say: c.failNode === 1
        ? `<b>第①关·工具存在？</b>工具名不在 <code>TOOL_SPECS</code> 里，<b>第一关就被拦下</b>，返回 <code>unknown_tool</code>。`
        : `<b>第①关·工具存在？</b>查 <code>TOOL_SPECS</code>，工具名合法，放行。` },
    { line: 3, stage: 2, say: `<b>第②关·参数认识？</b>检查有没有 schema 之外的多余参数。本例参数都在 schema 内，通过。` },
    { line: 4, stage: 3, say: c.failNode === 3
        ? `<b>第③关·必填齐全？</b>缺必填项 <code>path</code>，<b>被拦下</b>：<code>validation_error</code>。模型下一轮据此补上 path 重试。`
        : `<b>第③关·必填齐全？</b>required 字段都在，通过。` },
    { line: 5, stage: 4, say: c.failNode === 4
        ? `<b>第④关·类型/范围？</b><code>max_chars=999999</code> 超出 schema 上限 30000，<b>被范围校验拦下</b>。schema 不只描述参数，还能<b>校验</b>。`
        : `<b>第④关·类型/范围？</b>类型正确、数值在 min/max 内，通过。` },
    { line: 6, stage: 5, say: c.failNode == null
        ? `<b>第⑤步·真实执行</b>：五关全过，<code>run_tool</code> 用校验后的参数真正调用 <code>read_file</code>。`
        : `本例在前面已被拦下，<b>不会执行</b>——这正是校验的意义：错误参数不进真实操作。` },
    { line: 7, stage: 6, say: c.obsOk
        ? `<b>第⑥步·结构化回注</b>：成功结果包成 <code>{ok:true, content, truncated, chars}</code> 回注，供下一轮决策。`
        : `<b>结构化回注</b>：失败也回注结构化 observation（<code>error_type</code>+<code>error</code>），<b>而不是静默吞错或让模型编结果</b>。` },
  ];
}

function note(stage, params, d) {
  const c = d.case;
  switch (stage) {
    case 0:
      return "模型的职责是<b>决策</b>：产出“调哪个工具、参数是什么”的 JSON 意图。真实执行交给 harness——把它当执行器（让它假装读到了内容）会直接导致幻觉。";
    case 1:
      return "校验第一关：<b>工具是否存在</b>。<code>run_tool</code> 先查 <code>name in TOOLS</code>，未知工具立即返回 <code>unknown_tool</code>，不进入后续步骤。";
    case 2:
      return "校验第二关：<b>参数是否都认识</b>。<code>set(args) - schema_fields</code> 算出多余参数，有多余就报 <code>validation_error</code>，防止模型乱塞字段。";
    case 3:
      return "校验第三关：<b>必填项是否齐全</b>。遍历 schema，<code>required</code> 且缺失就拦下；可选项缺失则用 <code>default</code> 补齐（如 max_chars=12000）。";
    case 4:
      return "校验第四关：<b>类型与范围</b>。string 不能为空、integer 不能是 bool、数值要落在 <code>min/max</code> 内。这是 schema 比自然语言说明更可靠的地方——它能被<b>程序校验</b>。";
    case 5:
      return c.failNode == null
        ? "五关全过后才 <code>TOOLS[name](**validated)</code> 真实执行。注意传进去的是<b>校验后</b>的参数（含补好的默认值），不是模型原始输出。"
        : "前面任意一关失败都<b>不会执行</b>。把校验放在执行之前，是为了让错误参数永远碰不到真实的文件/网络/数据库操作。";
    case 6:
      return `observation 一律结构化：成功带 <code>content/truncated/chars</code>，失败带 <code>error_type/error/tool/args</code>。这样<b>模型能据此重试、人能 debug、harness 能归因</b>。本式两篇论文：<a href="${MRKL_URL}" target="_blank" rel="noreferrer">MRKL</a> 给模块化工具观，<a href="${TOOLFORMER_URL}" target="_blank" rel="noreferrer">Toolformer</a> 说明模型可学习何时用工具。`;
    default:
      return "拖朱字切换四个 case，点演法逐关走过校验管道。";
  }
}

const pyCode = `# tools.py · run_tool —— 校验在执行之前
def run_tool(name, args):
    if name not in TOOLS:                       # ① 工具存在?
        return error("unknown_tool", name)
    ok, validated = _validate_args(name, args)  # ②③④⑤ schema 校验
    if not ok:                                  # 多余/缺必填/类型/范围
        return error("validation_error", validated, tool=name, args=args)
    return TOOLS[name](**validated)             # ⑥ 用校验后的参数真实执行
# 任意一关失败 -> 结构化 observation 回注,模型据此纠正重试`;

export const toolUseDemo = {
  title: "演武场 · 工具校验管道",
  intro: `<p>本式从两篇论文起手：<b><a href="${MRKL_URL}" target="_blank" rel="noreferrer">MRKL</a></b>（模块化神经-符号架构，主张把 LLM 与可验证的外部模块组合）与 <b><a href="${TOOLFORMER_URL}" target="_blank" rel="noreferrer">Toolformer</a></b>（模型可自学何时调用工具）。但论文不管真实执行——执行、校验、权限仍由 harness 承担。</p>
<p>上一式模型只要会产出 action 就行；本式拆开 <b>action → 真实执行</b> 之间最关键的一段：<b>工具 schema 与参数校验</b>。</p>
<p><b>核心问题</b>：模型产出的工具调用是<b>不可信文本</b>，可能用错工具名、漏填必填参数、塞超范围的值。harness 不能照单全收，更不能让模型“假装”执行。它在执行前架一条<b>校验管道</b>：工具存在？参数认识？必填齐全？类型/范围对？——任意一关失败都<b>拦下不执行</b>，并回注<b>结构化错误</b>让模型纠正。</p>
<p><b>Schema 为什么比自然语言说明可靠</b>：自然语言只能“建议”，schema 能被程序<b>校验</b>——参数名、类型、必填、默认值、取值范围都是硬约束。</p>
<p class="intro-arena-tip">右侧演武场用四个真实 case（输出取自实跑 <code>tools.py</code>）演示管道。拖 <b>朱字</b>切换 case，点演法逐关走过校验，看它在哪一关被拦、产出什么 observation。</p>`,
  bridge: {
    prev: "第一式：最小 loop —— 模型产出 action，harness 执行回注。",
    current: "第二式：拆开工具层 —— schema 约束 + 参数校验 + 结构化 observation。",
    next: "第三式：长任务的信息分流（context / state / memory / trace）。",
    sources: ["MRKL", "Toolformer"],
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
  terms: [
    { t: "Tool Schema", d: "工具的机器可读说明：名字、用途、参数名/类型/必填/默认值/取值范围/返回格式。模型据此知道怎么调，harness 据此校验。" },
    { t: "参数校验", d: "执行前的关卡：工具存在、无多余参数、必填齐全、类型与 min/max 正确。失败即拦下，不碰真实操作。" },
    { t: "结构化 observation", d: "成功带 content/truncated/chars，失败带 error_type/error/tool/args。让模型可重试、人可 debug、harness 可归因。" },
    { t: "决策器 vs 执行器", d: "LLM 是决策器：只产出工具调用意图。真实执行由 harness+tools 完成。把它当执行器会导致幻觉。" },
    { t: "工具越多≠越好", d: "工具多则选错、参数错、相似工具摇摆、prompt 成本和安全风险都上升。先给少量高质量工具，按需扩展。" },
  ],
  localCmd: "cd agent-volume/experiments/minimal-harness && python3 agent.py \"演示工具 schema 和 observation 回注\" --scripted-demo --reset-trace",
};


export default { name: 'GewuToolUseDemo' }
</script>
