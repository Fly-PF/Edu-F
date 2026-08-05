<script lang="jsx">
const AGENTBENCH_URL = "https://arxiv.org/abs/2308.03688";
const TOOLLLM_URL = "https://arxiv.org/abs/2307.16789";
const SWEBENCH_URL = "https://arxiv.org/abs/2310.06770";
const GAIA_URL = "https://arxiv.org/abs/2311.12983";
const SWEAGENT_URL = "https://arxiv.org/abs/2405.15793";
const FAIL_URL = "https://arxiv.org/abs/2503.13657";
const BUDGET_URL = "https://arxiv.org/abs/2604.02460";

// 两种评估口径
const MODES = [
  { id: "naive", label: "只报准确率（不对齐预算）" },
  { id: "rigor", label: "对齐预算 + trace + 归因" },
];

// 四种配置
const CONFIGS = ["single", "parallel", "debate", "mgr-worker"];

const lines = [
  { text: "dataset = fix_seed(load(task_set))         # 固定数据集与随机种子", stage: 0 },
  { text: "B = total_token_budget                     # 对齐总预算,不是 agent 数", stage: 1 },
  { text: "for cfg in [single, parallel, debate, mw]: # 四配置同预算各跑一遍", stage: 2 },
  { text: "    log = trace(cfg)                        # 记全 trace:输入/工具/输出/token", stage: 3 },
  { text: "    attribute_failures(log.failures)        # 失败 trace 打标归因", stage: 4 },
  { text: "report(acc, token, dollars, wall_clock)    # 四项分开报,不混成性能", stage: 5 },
];

const paramDefs = {
  mode: { min: 0, max: 1, step: 1, fmt: (v) => MODES[v].label },
  cfg: { min: 0, max: 3, step: 1, fmt: (v) => CONFIGS[v] },
};
const initial = { mode: 1, cfg: 0 };

function compute(p) {
  const rigor = p.mode === 1;
  // 不对齐:multi 多花 token 换虚高准确率
  const naiveAcc = [82, 85, 86, 84];
  const naiveTok = [100, 300, 400, 250];
  // 对齐:同预算下单 agent(更长 thinking)反而 >= multi(呼应 2604.02460)
  const fairAcc = [84, 82, 81, 83];
  const fairTok = [100, 100, 100, 100];
  // wall-clock:并行能省;$ 通常随 token
  const wall = [10, 4, 9, 6];
  const dollars = rigor ? [1.0, 1.0, 1.0, 1.0] : [1.0, 3.0, 4.0, 2.5];
  // 失败归因分布(选中配置):规划/执行/通信/聚合/终止
  const attrib = [
    [30, 40, 5, 5, 20],   // single:无通信/聚合失败
    [15, 25, 30, 20, 10], // parallel:通信+聚合占比高
    [10, 20, 40, 20, 10], // debate:通信失败最多
    [20, 25, 20, 25, 10], // mgr-worker:聚合失败突出
  ];
  const acc = rigor ? fairAcc : naiveAcc;
  const tok = rigor ? fairTok : naiveTok;
  return {
    mode: MODES[p.mode].id, modeIndex: p.mode, rigor,
    cfg: p.cfg, cfgName: CONFIGS[p.cfg],
    acc, tok, wall, dollars, attrib: attrib[p.cfg],
    bestFair: 0, // single 在对齐口径下最优
  };
}

const OK = "#3f6b4f";
const ERR = "#9e2b1e";
const GOLD = "#9c7b2e";
const SUB = "#a8946a";
const ATTR_LABELS = ["规划", "执行", "通信", "聚合", "终止"];

function bar(x, y, w, h, frac, color, bg) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="2.5" fill={bg || "#ece2cc"} stroke="#cdb98e" stroke-width="0.6" />
      <rect x={x} y={y} width={Math.max(0, Math.min(w, w * frac))} height={h} rx="2.5" fill={color} />
    </g>
  );
}

function Viz({ derived: d, stage }) {
  const rigor = d.rigor;
  const maxTok = 400;
  const rowY = [44, 64, 84, 104];
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x="16" y="14" fill="#5a4a36" font-size="10.5">
        评估台 · {MODES[d.modeIndex].label}
      </text>

      {/* 四配置准确率 + token */}
      <text x="16" y="32" fill="#5a4a36" font-size="9" font-weight="600">
        {rigor ? "同预算下四配置准确率（公平）" : "“准确率”——但 multi 多花了 token"}
      </text>
      {CONFIGS.map((c, i) => {
        const sel = i === d.cfg;
        const accW = (d.acc[i] - 70) / 20; // 70~90 映射
        return (
          <g key={c}>
            <text x="16" y={rowY[i] + 8} fill={sel ? "#5a4a36" : SUB} font-size="8.2" font-weight={sel ? "700" : "400"}>
              {c}
            </text>
            {bar(86, rowY[i], 150, 11, accW, sel ? OK : "#b9cdbf")}
            <text x="240" y={rowY[i] + 9} fill={sel ? OK : SUB} font-size="8">{d.acc[i]}%</text>
            {/* token 量(不对齐时差异巨大) */}
            <text x="272" y={rowY[i] + 9} fill={!rigor && d.tok[i] > 100 ? ERR : SUB} font-size="7.6">
              {d.tok[i]}tok
            </text>
          </g>
        );
      })}

      <line x1="16" y1="120" x2="344" y2="120" stroke="#e3d6b8" stroke-width="1" />

      {rigor ? (
        <>
          {/* wall-clock 与 $ 分开报 */}
          <text x="16" y="136" fill="#5a4a36" font-size="9" font-weight="600">wall-clock 与 $ 必须分开报</text>
          <text x="16" y="152" fill={SUB} font-size="8">{d.cfgName} · 时延 {d.wall[d.cfg]}s（并行能省） · 花费 ${d.dollars[d.cfg].toFixed(1)}（同预算）</text>

          {/* 失败归因分布 */}
          <text x="16" y="174" fill="#5a4a36" font-size="9" font-weight="600">失败归因分布（{d.cfgName}）</text>
          {d.attrib.map((v, i) => (
            <g key={i}>
              <text x="16" y={190 + i * 17} fill={SUB} font-size="7.8">{ATTR_LABELS[i]}</text>
              {bar(48, 182 + i * 17, 150, 10, v / 50, GOLD)}
              <text x="204" y={190 + i * 17} fill={SUB} font-size="7.6">{v}%</text>
            </g>
          ))}
          <text x="16" y="290" fill={OK} font-size="8.6">
            对齐预算下单 agent 常 ≥ multi（呼应 2604.02460）;归因告诉你“改哪里”。
          </text>
        </>
      ) : (
        <>
          <text x="16" y="138" fill={ERR} font-size="9" font-weight="600">这是最常见的误导</text>
          <text x="16" y="156" fill={SUB} font-size="8.2">multi 配置准确率更高,只因为它多花了 {d.tok[d.cfg]} token（single 仅 100）。</text>
          <text x="16" y="176" fill={SUB} font-size="8.2">没给单 agent 同等预算,这个“更强”不可证伪。</text>
          {/* $ 被掩盖 */}
          <text x="16" y="200" fill="#5a4a36" font-size="9" font-weight="600">而且 wall-clock 和 $ 被混成一个“性能”</text>
          {CONFIGS.map((c, i) => (
            <text key={c} x="16" y={218 + i * 15} fill={d.dollars[i] > 1 ? ERR : SUB} font-size="7.8">
              {c}: ${d.dollars[i].toFixed(1)} · {d.wall[i]}s
            </text>
          ))}
          <text x="16" y="290" fill={ERR} font-size="8.6">
            没有 trace 与归因,你只知道“错了”,不知道“错在哪个环节”。
          </text>
        </>
      )}
    </svg>
  );
}

function frames(params, d) {
  const rigor = d.rigor;
  return [
    { line: 1, stage: 0, say: `第 1 步：评估的地基是<b>可复现</b>——固定数据集、固定随机种子、明确对错的任务(多跳问答 / 代码任务)。否则分数随机波动,任何结论都不可证伪。` },
    { line: 2, stage: 1, say: `第 2 步关键：<b>对齐总 token 预算,而非 agent 数量</b>。3 个 agent 当然比 1 个花更多 token——固定 agent 数是不公平比较。正确做法:给单 agent <b>同等预算</b>(更长 thinking / 更多采样)再比。<a href="${BUDGET_URL}" target="_blank" rel="noreferrer">2604.02460</a> 正是这么做,得出“同等思考 token 下单 agent 反而更优”。` },
    { line: 3, stage: 2, say: `第 3 步：同一预算下跑<b>四种配置</b>——single / parallel subagents / debate / manager-worker。同数据、同预算、同种子,这样的横向对比才有意义。` },
    { line: 4, stage: 3, say: `第 4 步：<b>trace 是归因的前提</b>。每个 agent 记输入上下文 / 工具调用(参数+结果) / 输出 / token / 耗时;agent 之间记每条消息(谁、何时、对谁、引用哪个任务)。<a href="${SWEAGENT_URL}" target="_blank" rel="noreferrer">SWE-agent</a> 这类工作强调的正是 agent-computer interface 的可观测性。没有 trace,只能看最终对错。` },
    { line: 5, stage: 4, say: `第 5 步：<b>失败归因(failure attribution)</b>比单一准确率信息量大得多。对每条失败 trace 打标:在哪个环节坏(规划/执行/通信/聚合/终止)、哪个 agent、什么类型。<a href="${FAIL_URL}" target="_blank" rel="noreferrer">Why MAS Fail</a> 给了现成的失败分类(MAST)。准确率只说“错了”,归因告诉你“<b>改哪里</b>”。` },
    { line: 6, stage: 5, say: rigor
        ? `第 6 步：<b>四项分开报</b>——准确率 / 总 token / $ / wall-clock。并行省的是时延,$ 通常更贵,混成一个“性能”数字是最常见的误导。<b>结论只在“同预算、同数据、可复现、有 trace”下才成立。</b>这就是 ch07 那个判断的落地方式。`
        : `第 6 步：当前“只报准确率”口径下,multi 看着更强——但这只是多花 token,且把时延和花费混成了一个数。切到“对齐预算 + trace + 归因”口径,再看结论是否反转。<b>没有这套流程,架构优劣之争都不可证伪。</b>` },
  ];
}

function note(stage, params, d) {
  switch (stage) {
    case 0:
      return "本式把 ch07 的判断变成<b>可执行测法</b>:预算对齐(比较才公平)、trace(失败才可归因)、benchmark(结论才可复现)、失败归因(知道坏在哪)。论文:<a href=\"" + AGENTBENCH_URL + "\" target=\"_blank\" rel=\"noreferrer\">AgentBench</a>、<a href=\"" + TOOLLLM_URL + "\" target=\"_blank\" rel=\"noreferrer\">ToolLLM</a>、<a href=\"" + SWEBENCH_URL + "\" target=\"_blank\" rel=\"noreferrer\">SWE-bench</a>、<a href=\"" + GAIA_URL + "\" target=\"_blank\" rel=\"noreferrer\">GAIA</a>、<a href=\"" + SWEAGENT_URL + "\" target=\"_blank\" rel=\"noreferrer\">SWE-agent</a>、<a href=\"" + FAIL_URL + "\" target=\"_blank\" rel=\"noreferrer\">Why MAS Fail</a>。";
    case 1:
      return "<b>预算对齐是评估第一原则</b>:固定总 token 预算(所有 agent 的 prompt+completion + 通信),而非固定 agent 数或轮数。multi 几乎总能靠多花 token 刷高分;给单 agent 同等预算再比,才公平。";
    case 2:
      return "<b>四配置同预算横扫</b>:single / parallel subagents / debate / manager-worker。固定数据集 + 随机种子,逐配置记录准确率 / token / $ / wall-clock / 完整 trace。这是把“是否有结构性收益”变得可证伪的唯一办法。";
    case 3:
      return "<b>trace 要记什么</b>:每个 agent 的输入上下文、工具调用(参数+结果)、输出、token、耗时;agent 间的每条消息。OpenAI Agents SDK / LangGraph 内置 tracing;自建 harness 时 trace 是第一优先级。本仓库 sub-agent-runner 的 manager.jsonl / worker-*.jsonl 就是最小 trace 实践。";
    case 4:
      return "<b>失败归因</b>:对失败 trace 打标——环节(规划/执行/通信/聚合/终止)、agent、类型(跑偏/信息丢失/循环/过早终止/聚合错),再统计分布。比单一准确率强在能告诉你改哪里。可人工打标,也可 LLM-as-judge(judge 本身要校验)。";
    case 5:
      return "<b>benchmark 地图</b>:AgentBench(多环境综合)、ToolLLM/ToolBench(16000+ API/工具选择)、SWE-bench(真实 GitHub issue,Docker+patch 验证)、GAIA(通用助手,人易模型难)、SWE-agent(agent-computer interface)。原则:先明确要测的能力,再选 benchmark,而非哪个有名跑哪个。";
    default:
      return "拖朱字切换「只报准确率 / 对齐+trace+归因」口径与配置,看同一组配置在两种口径下结论如何反转;并注意预算超支(2606.04056)也应作为独立指标——agent 不只跑不准,还会跑不停、跑超支。";
  }
}

const pyCode = `# 最小可复现评估流程(对齐预算 + trace + 归因)
dataset = fix_seed(load(task_set))            # 固定数据集与随机种子
B = total_token_budget                        # 对齐总预算,不是 agent 数

results = {}
for cfg in ["single", "parallel", "debate", "mgr_worker"]:
    run = execute(cfg, dataset, budget=B)     # 同预算各跑一遍
    log = run.trace                           # 全 trace:输入/工具/输出/token/耗时 + agent 间消息
    attrib = attribute_failures(log.failures) # 失败 trace 打标:环节/agent/类型
    results[cfg] = dict(
        acc=run.acc, token=run.token,
        dollars=run.dollars, wall=run.wall_clock,  # 四项分开报,不混成"性能"
        failure_dist=attrib,
    )
# 结论只在"同预算 / 同数据 / 可复现 / 有 trace"下成立
# 预算超支(跑不停/失控)也要作为独立指标,而非只看成功的 run`;

export const evalTraceDemo = {
  title: "演武场 · 评估台",
  intro: `<p>ch07 给了判断标准——“在相同预算、可复现流程、可观测 trace 下,multi-agent 是否真有收益”;本式把它变成<b>可执行的测法</b>。不会测,前面所有“值不值”的讨论都只是嘴上功夫。</p>
<p><b>四件套</b>:<b>预算对齐</b>(比较才公平)、<b>trace</b>(失败才可归因)、<b>benchmark</b>(结论才可复现)、<b>失败归因</b>(知道坏在哪,而不只是知道分数)。<a href="${BUDGET_URL}" target="_blank" rel="noreferrer">2604.02460</a> 在对齐思考 token 后得出单 agent 反而更优;<a href="${FAIL_URL}" target="_blank" rel="noreferrer">Why MAS Fail</a> 提供失败分类(MAST)做归因。</p>
<p><b>两个必须分开报的成本</b>:wall-clock(并行能省)与 $(并行通常更贵)。把它们混成一个“性能”数字,是评估里最常见的误导。预算超支(跑不停/失控)也应作为独立指标,而非只看成功的 run。</p>
<p class="intro-arena-tip">右侧拖 <b>朱字</b>切换「只报准确率 / 对齐+trace+归因」口径与四种配置,看同一组配置在两种口径下结论如何反转。判断口诀:<b>同预算、同数据、可复现、有 trace,结论才可证伪。</b></p>`,
  bridge: {
    prev: "卷七:multi-agent 协作 —— 通信是核心、成本要算账、收益看是否对齐预算。",
    current: "卷八:评估与 trace —— 把“是否有结构性收益”变成预算对齐 / trace / 失败归因的可执行流程。",
    next: "卷九:跨进程 / 跨厂商时的协议层 —— MCP 接工具(纵向),A2A/ACP/ANP 接 agent(横向)。",
    sources: ["AgentBench", "SWE-bench", "GAIA", "Why MAS Fail", "2604.02460"],
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
    { t: "预算对齐", d: "固定总 token 预算(含通信)而非固定 agent 数来比较。给单 agent 同等预算(更长 thinking)再比才公平。评估的第一原则。" },
    { t: "trace", d: "记录每个 agent 的输入/工具调用/输出/token/耗时,以及 agent 间每条消息。没有 trace 就只能看最终对错,无法归因。" },
    { t: "失败归因", d: "对失败 trace 打标:在哪个环节(规划/执行/通信/聚合/终止)、哪个 agent、什么类型。比单一准确率信息量大,能告诉你改哪里。MAST 提供现成分类。" },
    { t: "wall-clock vs $", d: "wall-clock(时延)并行能省;$(花费)并行通常更贵。两者必须分开报,混成一个“性能”是最常见的误导。" },
    { t: "benchmark 地图", d: "AgentBench(多环境)/ToolLLM(工具选择)/SWE-bench(真实 issue)/GAIA(通用助手)/SWE-agent(ACI)。先明确要测的能力,再选 benchmark。" },
    { t: "预算超支", d: "agent 会反复调失败工具、在状态间循环、无止境探索。硬性 step/token/wall-clock/$ 上限是兜底;评估时把“是否超预算/失控”作为独立指标。" },
  ],
  localCmd: "cd agent-volume/experiments/sub-agent-runner/run && ls manager.jsonl worker-*.jsonl  # 最小 trace 实践:manager 与各 worker 各一份 jsonl,可独立复盘归因",
};


export default { name: 'GewuEvalTraceDemo' }
</script>
