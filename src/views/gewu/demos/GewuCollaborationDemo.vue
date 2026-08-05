<script lang="jsx">
const FAIL_URL = "https://arxiv.org/abs/2503.13657";
const COMM_URL = "https://arxiv.org/abs/2502.14321";
const MECH_URL = "https://arxiv.org/abs/2501.06322";
const PRUNE_URL = "https://arxiv.org/abs/2410.02506";
const BUDGET_URL = "https://arxiv.org/abs/2604.02460";

// 两种比较口径
const MODES = [
  { id: "naive", label: "不对齐预算（固定 agent 数）" },
  { id: "fair", label: "对齐总 token 预算" },
];

const lines = [
  { text: "single = run_single(task, budget=B)        # 单 agent,全部预算给它", stage: 0 },
  { text: "workers = spawn(n)                          # N 个并行 worker", stage: 1 },
  { text: "edges = n*(n-1)/2                           # 全连接通信:O(N²) 条边", stage: 2 },
  { text: "cost = n*ctx + edges*msg + reduce           # token 总账(含通信)", stage: 3 },
  { text: "ans = judge_by_evidence(reports)            # 裁决靠证据,不靠投票", stage: 4 },
  { text: "gain = fair_compare(single, multi, B)       # 同预算下还赢吗?", stage: 5 },
];

const paramDefs = {
  mode: { min: 0, max: 1, step: 1, fmt: (v) => MODES[v].label },
  n: { min: 1, max: 5, step: 1, fmt: (v) => v + " 个 agent" },
};
const initial = { mode: 1, n: 3 };

function compute(p) {
  const fair = p.mode === 1;
  const n = p.n;
  const edges = n <= 1 ? 0 : (n * (n - 1)) / 2;
  // 单 agent 基准成本 = 1 份上下文
  const single = 10;
  // multi 成本:n 份上下文 + 通信边 + 聚合
  const multiCost = n * 10 + edges * 3 + (n > 1 ? 5 : 0);
  // 不对齐预算:multi 多花 token 换来虚高准确率(随 n 上升)
  // 对齐预算:把同样 multiCost 的预算给单 agent,单 agent 反而更优(呼应 2604.02460)
  const naiveAcc = Math.min(95, 70 + n * 5);
  const fairSingleAcc = Math.min(96, 72 + Math.round((multiCost - single) * 0.7));
  const fairMultiAcc = Math.min(90, 70 + n * 3);
  return {
    mode: MODES[p.mode].id, modeIndex: p.mode, fair,
    n, edges, single, multiCost,
    naiveAcc, fairSingleAcc, fairMultiAcc,
  };
}

const OK = "#3f6b4f";
const ERR = "#9e2b1e";
const GOLD = "#9c7b2e";
const SUB = "#a8946a";

function bar(x, y, w, h, frac, color, bg) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="3" fill={bg || "#ece2cc"} stroke="#cdb98e" stroke-width="0.7" />
      <rect x={x} y={y} width={Math.max(0, Math.min(w, w * frac))} height={h} rx="3" fill={color} />
    </g>
  );
}

function Viz({ derived: d, stage }) {
  const idx = Math.min(5, Math.max(0, stage));
  const fair = d.fair;
  const storm = d.edges >= 6;

  // 成本条:单 agent vs multi
  const maxCost = 75;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x="16" y="14" fill="#5a4a36" font-size="10.5">
        协作账本 · {MODES[d.modeIndex].label} · {d.n} agents
      </text>

      {/* token 成本对比 */}
      <text x="16" y="36" fill="#5a4a36" font-size="9.2" font-weight="600">token 总成本（含通信）</text>
      <text x="16" y="52" fill={SUB} font-size="8.2">single</text>
      {bar(70, 44, 200, 11, d.single / maxCost, OK)}
      <text x="276" y="53" fill={OK} font-size="8.2">{d.single}</text>

      <text x="16" y="70" fill={SUB} font-size="8.2">multi</text>
      {bar(70, 62, 200, 11, d.multiCost / maxCost, storm ? ERR : GOLD)}
      <text x="276" y="71" fill={storm ? ERR : GOLD} font-size="8.2">{d.multiCost}</text>

      <text x="70" y="88" fill={SUB} font-size="7.8">
        = {d.n}×ctx{d.edges > 0 ? ` + ${d.edges}×msg(O(N²)边)` : ""}{d.n > 1 ? " + reduce" : ""}
      </text>

      {/* 准确率对比 */}
      <line x1="16" y1="100" x2="344" y2="100" stroke="#e3d6b8" stroke-width="1" />
      <text x="16" y="118" fill="#5a4a36" font-size="9.2" font-weight="600">
        {fair ? "对齐预算后的准确率（公平比较）" : "不对齐预算时的“准确率”（误导）"}
      </text>

      {fair ? (
        <>
          <text x="16" y="136" fill={SUB} font-size="8.2">single(同预算)</text>
          {bar(96, 128, 180, 11, d.fairSingleAcc / 100, OK)}
          <text x="282" y="137" fill={OK} font-size="8.2">{d.fairSingleAcc}%</text>
          <text x="16" y="154" fill={SUB} font-size="8.2">multi</text>
          {bar(96, 146, 180, 11, d.fairMultiAcc / 100, GOLD)}
          <text x="282" y="155" fill={GOLD} font-size="8.2">{d.fairMultiAcc}%</text>
          <text x="16" y="176" fill={d.fairSingleAcc >= d.fairMultiAcc ? ERR : OK} font-size="8.6" font-weight="600">
            {d.fairSingleAcc >= d.fairMultiAcc
              ? "同等思考预算下,单 agent 反而 ≥ multi（呼应 2604.02460）"
              : "此设定下 multi 仍略优——但要看是否结构性收益"}
          </text>
        </>
      ) : (
        <>
          <text x="16" y="136" fill={SUB} font-size="8.2">multi(多花token)</text>
          {bar(96, 128, 180, 11, d.naiveAcc / 100, GOLD)}
          <text x="282" y="137" fill={GOLD} font-size="8.2">{d.naiveAcc}%</text>
          <text x="16" y="158" fill={ERR} font-size="8.6" font-weight="600">
            “agent 越多越准” —— 但没给单 agent 同等预算
          </text>
          <text x="16" y="174" fill={SUB} font-size="8.2">这是评估里最常见的误导:把多花的 token 包装成架构优势。</text>
        </>
      )}

      {/* 失败接缝提示 */}
      <line x1="16" y1="190" x2="344" y2="190" stroke="#e3d6b8" stroke-width="1" />
      <text x="16" y="208" fill="#5a4a36" font-size="9" font-weight="600">失败多发生在“协作接缝处”</text>
      <text x="16" y="224" fill={SUB} font-size="8">任务跑偏 · 信息丢失 · 无限循环 · 过早终止 · 聚合出错 · 角色混乱</text>

      <text x="16" y="250" fill={fair ? OK : ERR} font-size="9.2">
        {fair
          ? "在同预算 / 可复现 / 可观测 trace 下还赢 → 结构性收益。"
          : "更多通信 ≠ 更好协作,常常只是更贵(token 幻觉)。"}
      </text>
      <text x="16" y="272" fill={SUB} font-size="8.4">
        裁决看可验证证据,不靠投票(错误可能是系统性的、多 agent 共享同一错前提)。
      </text>
      <text x="16" y="290" fill={SUB} font-size="8.4">
        wall-clock(并行能省)与 $（通常更贵）必须分开报,别混成一个“性能”。
      </text>
    </svg>
  );
}

function frames(params, d) {
  const fair = d.fair;
  return [
    { line: 1, stage: 0, say: `第 1 步：基准永远是<b>单 agent 把全部预算用足</b>。任何“multi 更强”的结论,都必须先问:给单 agent 同等预算会怎样?<a href="${BUDGET_URL}" target="_blank" rel="noreferrer">2604.02460</a> 正是这么做,才得出“同等思考 token 下单 agent 反而更优”。` },
    { line: 2, stage: 1, say: `第 2 步：协作模式是一条光谱(Router / Manager / Handoff / Debate / Blackboard / Team),按<b>中心化程度</b>排开。没有最好的模式,只有匹配任务的模式。默认顺序:先单 agent,再在确有并行 / 隔离 / 多视角需求时升级。` },
    { line: 3, stage: 2, say: `第 3 步关键：<b>通信是核心问题,不是模型本身</b>(<a href="${COMM_URL}" target="_blank" rel="noreferrer">Communication-Centric Survey</a>)。全连接 N 个 agent 是 <b>O(N²)</b> 条边,每条边每轮都是一次完整 prompt+completion。<a href="${PRUNE_URL}" target="_blank" rel="noreferrer">AgentPrune</a> 证明:剪掉冗余边能几乎不掉分地大幅降本。` },
    { line: 4, stage: 3, say: `第 4 步：<b>成本必须显式算账</b>。并行优化的是 wall-clock 时延,但 token 总成本通常翻倍:N 份上下文重建 + manager 消化 N 份汇报 + 通信开销。<b>wall-clock 和 $ 要分开报</b>,混成一个“性能”是最常见的误导。` },
    { line: 5, stage: 4, say: `第 5 步：多 agent 给出矛盾结论时,<b>投票是最差的裁决之一</b>——错误可能是系统性的(多 agent 共享同一错误前提)。可靠做法:看谁有<b>可验证证据</b>、来源是否更新、范围是否匹配,必要时派 verifier 复核。<b>裁决基于证据,不是人数</b>。` },
    { line: 6, stage: 5, say: fair
        ? `第 6 步：判断口诀——<b>在相同预算、可复现流程、可观测 trace 下,multi-agent 是否仍带来收益?</b>是 → 结构性收益(并行搜索 / 角色隔离 / 真实专业协作 / 长任务分治 / 多视角验证);否 → token 幻觉。这怎么落地,正是下一卷 ch08。`
        : `第 6 步：当前是“不对齐预算”口径——agent 越多分越高,但这只是多花 token。<a href="${FAIL_URL}" target="_blank" rel="noreferrer">Why MAS Fail</a> 指出:失败多在<b>协作接缝处</b>,换更强的模型常救不了设计糟糕的 MAS。把口径切到“对齐预算”再看。` },
  ];
}

function note(stage, params, d) {
  switch (stage) {
    case 0:
      return "本式跳出具体形态(manager-worker / team),系统看 multi-agent 协作的<b>通信结构、冲突裁决、并行成本和失败模式</b>,并立一个核心警惕:<b>很多“多 agent 更强”的结果,本质只是多花了 token</b>。论文:<a href=\"" + FAIL_URL + "\" target=\"_blank\" rel=\"noreferrer\">Why MAS Fail</a>、<a href=\"" + COMM_URL + "\" target=\"_blank\" rel=\"noreferrer\">Communication-Centric Survey</a>、<a href=\"" + MECH_URL + "\" target=\"_blank\" rel=\"noreferrer\">Collaboration Mechanisms</a>、<a href=\"" + PRUNE_URL + "\" target=\"_blank\" rel=\"noreferrer\">AgentPrune</a>、<a href=\"" + BUDGET_URL + "\" target=\"_blank\" rel=\"noreferrer\">2604.02460</a>。";
    case 1:
      return "<b>协作模式光谱</b>(按中心化程度):Router(分类派发)、Manager/agents-as-tools(主调专家)、Handoff(控制权移交)、Debate/critic(多视角互评)、Blackboard(共享状态池)、Team/swarm(共享任务表+直接通信)。没有最好的模式,只有匹配任务的模式。";
    case 2:
      return "<b>通信是核心问题</b>:它决定信息能否到达、噪声会否淹没信号、token 与延迟多高。全连接 O(N²) 边,每条边每轮一次完整 prompt+completion。结论反直觉但重要:<b>更多通信 ≠ 更好协作,常常只是更贵</b>。";
    case 3:
      return "<b>成本显式算账</b>:并行省的是 <b>wall-clock 时延</b>,多花的是 <b>token($)</b>(N 份上下文 + 汇报消化 + 通信)。任何“更强”结论都要问三件事:是不是只多花了 token?省的是时间还是钱?通信本身花了多少?";
    case 4:
      return "<b>冲突裁决别简单投票</b>:错误可能是系统性的(多 agent 共享同一错误前提),投票把错的票数堆高。可靠做法:看可验证证据、来源是否更新、范围是否匹配,必要时派 verifier 专门复核,交给有明确标准的 reducer/judge。";
    case 5:
      return "<b>结构性收益 vs token 幻觉</b>:带来结构性收益的场景——并行探索多方向、角色/工具权限隔离、真实专业协作、长任务分治、基于证据的多视角验证。<b>不应</b>默认用于单纯提准、用更多 token 包装成架构优势、无边界的多角色聊天。";
    default:
      return "拖朱字切换「对齐预算 / 不对齐」和 agent 数,看同一组数在两种口径下结论如何反转;点演法走完基准→模式→通信→成本→裁决→判断六步。";
  }
}

const pyCode = `# 公平比较 single vs multi(对齐总 token 预算)
B = total_token_budget                     # 固定总预算,不是固定 agent 数
single = run_single(task, budget=B)        # 全部预算给单 agent(更长 thinking)

workers = spawn(n)
edges = n*(n-1)//2                         # 全连接通信:O(N^2) 条边
multi_cost = n*ctx + edges*msg + reduce    # token 总账必须含通信
multi = run_multi(task, workers)

# 三问:是不是只多花了 token? 省的是时间还是钱? 通信花了多少?
report(single.acc, multi.acc,
       wall_clock=[single.t, multi.t],     # 并行能省
       dollars=[single.$, multi.$])        # 通常 multi 更贵,分开报
# 同预算 / 可复现 / 可观测 trace 下还赢 -> 结构性收益; 否则 -> token 幻觉`;

export const collaborationDemo = {
  title: "演武场 · 协作账本",
  intro: `<p>前两式讲“怎么搭”(sub-agent / agent team),本式讲“<b>值不值、会怎么坏</b>”:跳出具体形态,系统看 multi-agent 协作的<b>通信结构、冲突裁决、并行成本和失败模式</b>。</p>
<p><b>核心警惕</b>:很多“多 agent 更强”的结果,本质<b>只是多花了 token</b>。<a href="${COMM_URL}" target="_blank" rel="noreferrer">Communication-Centric Survey</a> 主张通信(而非模型)是 multi-agent 的关键问题;<a href="${PRUNE_URL}" target="_blank" rel="noreferrer">AgentPrune</a> 证明剪掉冗余通信边能几乎不掉分地降本;<a href="${BUDGET_URL}" target="_blank" rel="noreferrer">2604.02460</a> 在对齐思考 token 预算后,得出<b>单 agent 在多跳推理上反而更优</b>。</p>
<p><b>为什么会失败</b>:<a href="${FAIL_URL}" target="_blank" rel="noreferrer">Why MAS Fail</a> 指出 MAS 失败往往不是“模型不行”,而是<b>协作机制坏掉</b>——任务跑偏、信息丢失、无限循环、过早终止、聚合出错、角色混乱,大多发生在<b>协作接缝处</b>。这也是为什么换更强的模型常救不了设计糟糕的 MAS。</p>
<p class="intro-arena-tip">右侧拖 <b>朱字</b>切换「对齐预算 / 不对齐预算」口径与 agent 数,看同一组数据在两种比较下结论如何反转。判断口诀:<b>同预算、可复现、可观测 trace 下还赢,才是结构性收益。</b></p>`,
  bridge: {
    prev: "卷六:agent team —— 共享任务表 + peer messaging,拿掉中心瓶颈换并发复杂度。",
    current: "卷七:multi-agent 协作 —— 通信是核心、成本要算账、失败在接缝、收益看是否对齐预算。",
    next: "卷八:把“是否有结构性收益”变成可执行测法(预算对齐 / trace / 失败归因)。",
    sources: ["Why MAS Fail", "Communication-Centric Survey", "AgentPrune", "2604.02460"],
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
  runtimeLabel: "脚本化成本模型",
  terms: [
    { t: "协作模式光谱", d: "Router / Manager / Handoff / Debate / Blackboard / Team,按中心化程度排开。没有最好的模式,只有匹配任务的模式。" },
    { t: "通信是核心问题", d: "multi-agent 的关键问题是通信不是模型。通信决定信息能否到达、噪声会否淹没信号、token 与延迟多高。" },
    { t: "O(N²) 通信", d: "全连接 N 个 agent 有 n(n-1)/2 条边,每条边每轮一次完整 prompt+completion。AgentPrune 剪冗余边可几乎不掉分降本。" },
    { t: "预算对齐", d: "固定总 token 预算(含通信)而非固定 agent 数来比较。给单 agent 同等预算再比,才公平。" },
    { t: "失败接缝", d: "MAS 失败多在协作接缝处:任务跑偏 / 信息丢失 / 无限循环 / 过早终止 / 聚合出错 / 角色混乱,而非单 agent 推理能力。" },
    { t: "结构性收益 vs token 幻觉", d: "同预算 / 可复现 / 可观测 trace 下仍有收益=结构性收益;靠多花 token 包装成架构优势=token 幻觉。" },
  ],
  localCmd: "# 公平比较模板:固定总 token 预算,跑 single / parallel / debate / manager-worker 四配置,各记 acc/token/$/wall-clock/trace",
};


export default { name: 'GewuCollaborationDemo' }
</script>
