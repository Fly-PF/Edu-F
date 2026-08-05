<script lang="jsx">
const AUTOGEN_URL = "https://arxiv.org/abs/2308.08155";
const METAGPT_URL = "https://arxiv.org/abs/2308.00352";
const CHATDEV_URL = "https://arxiv.org/abs/2307.07924";
const CAMEL_URL = "https://arxiv.org/abs/2303.17760";

// 两种处理子任务的策略
const MODES = [
  { id: "isolated", label: "隔离派工（sub-agent）" },
  { id: "allinone", label: "全塞主上下文" },
];

// 取自 sub-agent-runner 实跑：manager 派 2 个隔离 worker，各读一个文件
const WORKERS = [
  {
    id: "worker-roadmap",
    file: "agent-volume/roadmap.md",
    evidence: 8,
    conclusion: "Phase 05 = manager-worker：分解 / 隔离 / trace / 聚合 / 裁决。",
  },
  {
    id: "worker-ch05",
    file: "agent-volume/ch05-sub-agent/README.md",
    evidence: 8,
    conclusion: "ch05 把 sub-agent 讲成隔离 worker 委派 + reducer 聚合。",
  },
];

const lines = [
  { text: "tasks = decompose(goal)               # manager 把目标拆成窄任务", stage: 0 },
  { text: "for task in tasks:                    # 逐个分派(可并行)", stage: 1 },
  { text: "    ctx = isolated_context(task)      # 每个 worker 独立上下文", stage: 2 },
  { text: "    report = run_worker(task, ctx)    # 独立执行,只回 report 摘要", stage: 3 },
  { text: "result = reduce(reports)              # reducer 聚合 / 裁决冲突", stage: 4 },
  { text: 'write_json("result.json", result)     # 落盘最终结果', stage: 5 },
];

const paramDefs = { mode: { min: 0, max: 1, step: 1, fmt: (v) => MODES[v].label } };
const initial = { mode: 0 };
function compute(p) {
  return { mode: MODES[p.mode].id, modeIndex: p.mode };
}

const OK = "#3f6b4f";
const ERR = "#9e2b1e";
const GOLD = "#9c7b2e";
const SUB = "#a8946a";

// 主上下文 token 占用：隔离模式只回 report 摘要；全塞模式把 worker 全程灌回
function ctxTokens(mode, stage) {
  if (mode === "allinone") {
    // 每越过一个 worker，主上下文塞进整份文件全文（大块）
    const base = 6;
    const perWorker = 30;
    const done = stage >= 3 ? 2 : stage >= 2 ? 1 : 0;
    return base + done * perWorker;
  }
  // 隔离模式：worker 在自己上下文里干活，主上下文只收摘要（小块）
  const base = 6;
  const perReport = 4;
  const done = stage >= 4 ? 2 : stage >= 3 ? 1 : 0;
  return base + done * perReport;
}

function Viz({ derived: d, stage }) {
  const iso = d.mode === "isolated";
  const idx = Math.min(5, Math.max(0, stage));
  // 哪个 worker 是“当前活动”的：stage 2/3 聚焦 worker-roadmap，4 之后两个都完成
  const wDone = idx >= 4 ? 2 : idx >= 3 ? 1 : 0;
  const wHot = idx === 2 || idx === 3 ? 0 : -1;
  const ctx = ctxTokens(d.mode, idx);
  const overflow = ctx > 56;

  // worker 卡片坐标
  const WX = [200, 200];
  const WY = [70, 150];

  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x="16" y="14" fill="#5a4a36" font-size="10.5">
        sub-agent · manager-worker · {MODES[d.modeIndex].label}
      </text>

      {/* manager 节点 */}
      <rect x="16" y="44" width="120" height="60" rx="8"
        fill="#fff6e9" stroke={GOLD} stroke-width="1.4" />
      <text x="76" y="64" text-anchor="middle" fill={GOLD} font-size="11.5" font-weight="600">manager</text>
      <text x="76" y="80" text-anchor="middle" fill={SUB} font-size="8.4">分解 · 分派</text>
      <text x="76" y="93" text-anchor="middle" fill={SUB} font-size="8.4">聚合 · 裁决</text>

      {/* manager 上下文计量条 */}
      <text x="16" y="124" fill="#5a4a36" font-size="8.8">主上下文占用</text>
      <rect x="16" y="128" width="120" height="10" rx="3" fill="#ece2cc" stroke="#cdb98e" stroke-width="0.8" />
      <rect x="16" y="128" width={Math.min(120, ctx * 2)} height="10" rx="3"
        fill={overflow ? ERR : OK} />
      {overflow && (
        <text x="16" y="152" fill={ERR} font-size="8.6" font-weight="700">主上下文被中间过程污染 →爆窗风险</text>
      )}
      {!overflow && (
        <text x="16" y="152" fill={SUB} font-size="8.2">
          {iso ? "只收 report 摘要,主上下文清爽" : "worker 全程灌回,持续膨胀"}
        </text>
      )}

      {/* 两个 worker */}
      {WORKERS.map((w, i) => {
        const done = i < wDone;
        const hot = i === wHot;
        const stroke = hot ? GOLD : done ? OK : "#cdb98e";
        const head = hot ? GOLD : done ? OK : SUB;
        // 隔离模式 worker 是独立卡；全塞模式画成“摊开在主上下文里”的虚线框
        return (
          <g key={w.id}>
            {/* manager -> worker 连线 */}
            <line x1="136" y1={74} x2={WX[i]} y2={WY[i] + 18}
              stroke={done || hot ? stroke : "#d8c9a4"} stroke-width="1.4"
              stroke-dasharray={iso ? "none" : "3 3"} />
            <rect x={WX[i]} y={WY[i]} width="144" height="56" rx="7"
              fill={iso ? "#fbf6ea" : "rgba(158,43,30,0.05)"}
              stroke={stroke} stroke-width={hot ? 1.8 : 1.3}
              stroke-dasharray={iso ? "none" : "4 3"} />
            <text x={WX[i] + 8} y={WY[i] + 16} fill={head} font-size="9.6" font-weight="600">
              {done ? "✓ " : ""}{w.id}
            </text>
            <foreignObject x={WX[i] + 8} y={WY[i] + 20} width="128" height="32">
              <div xmlns="http://www.w3.org/1999/xhtml" style={{
                fontFamily: "ui-monospace, Menlo, monospace", fontSize: "7.8px",
                lineHeight: "1.3", color: "#5a4a36", wordBreak: "break-all",
              }}>
                {iso
                  ? `ctx: 只读 ${w.file.split("/").pop()}`
                  : `全文灌回主上下文 (${w.file.split("/").pop()})`}
              </div>
            </foreignObject>
            {/* 隔离标记 */}
            {iso && (
              <text x={WX[i] + 136} y={WY[i] + 16} text-anchor="end" fill={OK} font-size="7.6">隔离</text>
            )}
          </g>
        );
      })}

      {/* report 回流（隔离模式才有“摘要回流”这条细线） */}
      {iso && wDone >= 1 && (
        <g>
          <path d={`M200 ${WY[0] + 28} C 160 ${WY[0] + 28} 160 90 136 90`}
            fill="none" stroke={OK} stroke-width="1.3" stroke-dasharray="3 2" />
          <text x="150" y="116" fill={OK} font-size="7.6">report 摘要</text>
        </g>
      )}

      {/* reduce / result 区 */}
      <rect x="16" y="208" width="328" height="34" rx="7"
        fill={idx >= 4 ? "rgba(63,107,79,0.07)" : "#f4ecd9"}
        stroke={idx >= 4 ? OK : "#cdb98e"} stroke-width="1.3" />
      <text x="26" y="223" fill={idx >= 4 ? OK : SUB} font-size="9.6" font-weight="600">
        reduce(reports) → result.json
      </text>
      <text x="26" y="236" fill={SUB} font-size="8.2">
        {idx >= 4
          ? "2 份 report 聚合：files_read 去重 · evidence_count=16 · 裁决冲突"
          : "等待 worker 报告汇齐后聚合"}
      </text>

      <text x="16" y="262" fill={iso ? OK : ERR} font-size="9.4">
        {iso
          ? "隔离派工：worker 各看各的,主上下文只收摘要 → 并行 + 降噪。"
          : "全塞主上下文：worker 中间过程全灌回 → 噪声累积 + 爆窗。"}
      </text>
      <text x="16" y="280" fill={SUB} font-size="8.6">
        代价：隔离换来并行/降噪,但有信息损失与协调成本(见批注)。
      </text>
    </svg>
  );
}

function frames(params, d) {
  const iso = d.mode === "isolated";
  return [
    { line: 1, stage: 0, say: iso
        ? `第 1 步：manager <code>decompose(goal)</code> 把目标拆成<b>窄而清晰</b>的子任务。好任务“具体、边界清楚、能独立完成、输出格式明确”——这是 <a href="${METAGPT_URL}" target="_blank" rel="noreferrer">MetaGPT</a> 式 SOP 的核心。`
        : `第 1 步：不拆任务、不隔离,直接让一个上下文吞下所有文件全文。看似省事,主上下文会迅速被原始细节塞满。` },
    { line: 2, stage: 1, say: iso
        ? `第 2 步：逐个分派(可<b>并行</b>)。本实验派两个 worker：<code>worker-roadmap</code> 只读 roadmap.md,<code>worker-ch05</code> 只读 ch05 README。`
        : `第 2 步：没有 worker 边界,所有读取都发生在同一上下文里。无法并行,也无法按角色隔离权限。` },
    { line: 3, stage: 2, say: iso
        ? `第 3 步关键：<code>isolated_context(task)</code>。每个 worker <b>只看和自己任务相关的信息</b>——这正是 sub-agent 与普通 tool call 的分界：它是<b>带独立上下文的小 agent loop</b>,不是一个函数。`
        : `第 3 步：worker 之间没有上下文隔离,A 的中间过程会干扰对 B 的判断,失败范围也不可控。` },
    { line: 4, stage: 3, say: iso
        ? `第 4 步：worker 独立执行,<b>只回 report 摘要</b>(conclusion / evidence / files_read / uncertainty),而不是把全程 trace 塞回 manager。<a href="${AUTOGEN_URL}" target="_blank" rel="noreferrer">AutoGen</a> 把这种可编程对话模式做成框架。`
        : `第 4 步：中间过程全部回灌主上下文。token 持续累积——这就是“看起来更智能”实则浪费预算的典型。` },
    { line: 5, stage: 4, say: iso
        ? `第 5 步：<code>reduce(reports)</code> 聚合。<b>冲突不靠简单投票</b>,而看谁有可验证证据、来源是否更新、范围是否匹配,必要时再派 verifier worker。`
        : `第 5 步：没有独立 report 就没有干净的聚合对象,reducer 只能在一锅噪声里硬挑,质量难保证。` },
    { line: 6, stage: 5, say: iso
        ? `第 6 步：落盘 <code>result.json</code>。<b>manager 看 report,debug 时再看 worker trace</b>——run/ 下 manager.jsonl + 两个 worker.jsonl + result.json 各司其职。`
        : `兜底反思：<a href="${CHATDEV_URL}" target="_blank" rel="noreferrer">ChatDev</a>/<a href="${CAMEL_URL}" target="_blank" rel="noreferrer">CAMEL</a> 的角色协作也必须落到 harness;否则只是“多几个模型聊天”。` },
  ];
}

function note(stage, params, d) {
  switch (stage) {
    case 0:
      return "本式主线：manager 用<b>隔离上下文</b>把可独立完成的子任务派出去,再用 <b>reducer</b> 把报告合成可用结果。四篇论文：<a href=\"" + AUTOGEN_URL + "\" target=\"_blank\" rel=\"noreferrer\">AutoGen</a>(可编程多 agent 对话)、<a href=\"" + METAGPT_URL + "\" target=\"_blank\" rel=\"noreferrer\">MetaGPT</a>(SOP/角色分工)、<a href=\"" + CHATDEV_URL + "\" target=\"_blank\" rel=\"noreferrer\">ChatDev</a>(软件公司式协作)、<a href=\"" + CAMEL_URL + "\" target=\"_blank\" rel=\"noreferrer\">CAMEL</a>(role-playing)。";
    case 1:
      return "<b>sub-agent ≠ tool call</b>：tool call 是一次函数/API 调用,用主上下文、出原始 observation、成本低;sub-agent 是<b>带隔离上下文的小 agent loop</b>,出汇总报告、成本高,适合需要探索/归纳/局部判断的子任务。";
    case 2:
      return "<b>隔离上下文</b>的收益：worker 只看相关信息、主上下文不被中间过程污染、可并行、可按角色分权、失败范围可控。代价:manager 只见报告不见全部细节、worker 可能漏全局背景、需要额外的任务描述与聚合、总 token 上升。";
    case 3:
      return "<b>worker report ≠ 完整 trace</b>。report 是给 manager 消化的摘要(conclusion/evidence/files_read/uncertainty/errors);worker trace 是给人 debug 的证据,落在各自的 jsonl。把全程中间过程回灌 manager 会让主上下文很快失控。";
    case 4:
      return "<b>reducer 不是投票器</b>。多 worker 报告可能互补/重复/矛盾/参差。裁决看:谁给出可验证证据、谁来源更新、谁范围更匹配、是否需要再派一个 verifier。<code>reduce</code>=normalize→dedup→compare evidence→final。";
    case 5:
      return "<b>什么时候值得用 sub-agent</b>:子任务能独立完成、需并行探索、需角色隔离、输出比过程更重要、主上下文已拥挤。<b>不值得</b>:子任务很小(tool call 就够)、强依赖彼此中间过程、聚合成本超过并行收益、只为“看起来更智能”。";
    default:
      return "拖朱字对比「隔离派工 / 全塞主上下文」,点演法走完 manager→worker→reduce 六步。";
  }
}

const pyCode = `# sub-agent-runner/manager.py · run() 结构(精简)
tasks = decompose(goal)                  # manager 把目标拆成窄任务
reports = []
for task in tasks:                       # 逐个分派(可并行)
    ctx = isolated_context(task)         # 每个 worker 独立上下文
    report = run_worker(task, ctx)       # 只读分配的文件 -> 只回摘要
    reports.append(report)               # conclusion/evidence/files_read
result = reduce(reports)                 # reducer 聚合 + 裁决冲突
write_json("run/result.json", result)    # 落盘; worker trace 各自留档
# 关键: manager 看 report, debug 时才看 worker trace`;

export const subAgentDemo = {
  title: "演武场 · manager-worker 分派",
  intro: `<p>本式从四篇论文起手:<b><a href="${AUTOGEN_URL}" target="_blank" rel="noreferrer">AutoGen</a></b>(把多 agent 对话做成可编程 pattern)、<b><a href="${METAGPT_URL}" target="_blank" rel="noreferrer">MetaGPT</a></b>(用 SOP/角色分工组织软件工程)、<b><a href="${CHATDEV_URL}" target="_blank" rel="noreferrer">ChatDev</a></b>(软件公司式角色协作)、<b><a href="${CAMEL_URL}" target="_blank" rel="noreferrer">CAMEL</a></b>(role-playing agents)。它们共同回答:如何把多个 LLM 调用<b>组织成可协作的流程</b>,而不是一次性回答器。</p>
<p>前四式做的是单 agent 闭环。本式进入 multi-agent 第一步,但不上来就做复杂“团队”,而是先吃透最基础、最可控的形态:<b>manager-worker / sub-agent</b>。</p>
<p><b>核心判断</b>:sub-agent 的本质不是“多几个模型聊天”,而是 <b>manager 用隔离上下文把可独立完成的子任务派出去,再用 reducer 把报告合成可用结果</b>。它和普通 tool call 的分界在于——sub-agent 是带<b>独立上下文的小 agent loop</b>,不是一个函数。</p>
<p><b>隔离的权衡</b>:隔离上下文换来<b>并行 + 降噪 + 角色分权 + 失败可控</b>,但带来<b>信息损失 + 协调成本 + 总 token 上升</b>。worker report 是给 manager 消化的摘要,worker trace 才是给人 debug 的证据。</p>
<p class="intro-arena-tip">右侧演武场用实验真实数据(<code>manager.py</code> 派两个隔离 worker 各读一个文件,聚合出 evidence_count=16 的 result.json)。拖 <b>朱字</b>对比「隔离派工 / 全塞主上下文」,点演法走完六步。</p>`,
  bridge: {
    prev: "第四式:失败恢复闭环 —— 反馈/错误/验证变成下一步决策信号。",
    current: "第五式:sub-agent 分派 —— manager 用隔离上下文派工,reducer 聚合报告。",
    next: "第六式:agent 团队与角色协作(agent team)。",
    sources: ["AutoGen", "MetaGPT", "ChatDev", "CAMEL"],
  },
  lines,
  paramDefs,
  initial,
  compute,
  frames,
  Viz,
  note,
  pyCode,
  playMs: 1450,
  terms: [
    { t: "sub-agent", d: "隔离上下文中的小 agent loop:有自己的上下文、工具与推理,产出汇总报告。区别于普通 tool call(一次函数调用、用主上下文、出原始 observation)。" },
    { t: "manager", d: "不亲自做全部事:负责分解任务、定义 worker 输入输出格式、控制权限范围、收集报告、判断冲突、聚合成最终结果。" },
    { t: "worker", d: "在隔离上下文里独立完成一个窄任务,只回结构化 report(conclusion/evidence/files_read/uncertainty/errors),而非全程 trace。" },
    { t: "reducer", d: "聚合多份 report:normalize→去重→比对证据→裁决冲突→final。冲突不靠简单投票,而看可验证证据、来源、范围匹配。" },
    { t: "隔离上下文", d: "worker 只看与自身任务相关的信息。收益:并行/降噪/分权/失败可控;代价:信息损失/协调成本/总 token 上升。" },
    { t: "report vs trace", d: "report 是给 manager 消化的摘要;trace 是给人 debug 的证据。manager 看 report,出问题再翻 worker trace。" },
  ],
  localCmd: "cd agent-volume/experiments/sub-agent-runner && python3 manager.py --reset && cat run/result.json",
};



export default { name: 'GewuSubAgentDemo' }
</script>
