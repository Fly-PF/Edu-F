<script lang="jsx">
const AUTOGEN_URL = "https://arxiv.org/abs/2308.08155";
const METAGPT_URL = "https://arxiv.org/abs/2308.00352";
const ORCHESTRA_URL = "https://addyosmani.com/blog/code-agent-orchestra/";
const PRUNE_URL = "https://arxiv.org/abs/2410.02506";

// 两种通信拓扑
const MODES = [
  { id: "star", label: "星形（manager-worker）" },
  { id: "mesh", label: "网状（agent team）" },
];

const lines = [
  { text: "board = SharedTaskList()             # 所有 agent 共享的任务看板", stage: 0 },
  { text: "task = board.claim(agent_id)         # 原子认领 pending 任务", stage: 1 },
  { text: "peer_send(to=B, ref=task.id, msg=…)  # agent 间直接发消息", stage: 2 },
  { text: "ws = isolated_worktree(agent_id)     # 各占一份隔离工作区", stage: 3 },
  { text: "if task.blocked_by: wait(deps)       # 按 DAG 依赖调度", stage: 4 },
  { text: "result = merge(worktrees)            # 合并阶段集中裁决冲突", stage: 5 },
];

const paramDefs = {
  mode: { min: 0, max: 1, step: 1, fmt: (v) => MODES[v].label, label: '通信拓扑' },
  n: { min: 2, max: 5, step: 1, fmt: (v) => v + " 个 agent", label: 'Agent 数' },
};
const initial = { mode: 1, n: 4 };
function compute(p) {
  const mesh = p.mode === 1;
  // 星形:n 个 worker 各连 manager => n 条边;网状:全连接 => n(n-1)/2 条边
  const edges = mesh ? (p.n * (p.n - 1)) / 2 : p.n;
  return {
    mode: MODES[p.mode].id,
    modeIndex: p.mode,
    n: p.n,
    edges,
    mesh,
  };
}

const OK = "#3f6b4f";
const ERR = "#9e2b1e";
const GOLD = "#9c7b2e";
const SUB = "#a8946a";

// 在圆周上排布 n 个 agent 节点
function ring(n, cx, cy, r) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function Viz({ derived: d, stage }) {
  const idx = Math.min(5, Math.max(0, stage));
  const mesh = d.mesh;
  const cx = 180, cy = 132, r = 78;
  const pts = ring(d.n, cx, cy, r);
  const storm = mesh && d.edges >= 8; // 消息风暴阈值

  // 连线集合
  const segs = [];
  if (mesh) {
    for (let i = 0; i < d.n; i++)
      for (let j = i + 1; j < d.n; j++) segs.push([pts[i], pts[j]]);
  } else {
    // 星形:第 0 个当 manager,其余连它
    for (let i = 1; i < d.n; i++) segs.push([pts[0], pts[i]]);
  }

  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x="16" y="14" fill="#5a4a36" font-size="10.5">
        agent team · {MODES[d.modeIndex].label} · {d.n} agents
      </text>

      {/* 通信边 */}
      {segs.map((s, i) => (
        <line key={i} x1={s[0].x} y1={s[0].y} x2={s[1].x} y2={s[1].y}
          stroke={mesh ? (storm ? ERR : GOLD) : OK}
          stroke-width={mesh ? 1 : 1.4}
          stroke-opacity={mesh ? (storm ? 0.5 : 0.65) : 0.85}
          stroke-dasharray={idx >= 2 ? "none" : "3 3"} />
      ))}

      {/* agent 节点 */}
      {pts.map((p, i) => {
        const isManager = !mesh && i === 0;
        const claimed = idx >= 1 && (mesh ? i === 1 : i === 1);
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={isManager ? 17 : 14}
              fill={isManager ? "#fff6e9" : claimed && idx >= 3 ? "rgba(63,107,79,0.12)" : "#fbf6ea"}
              stroke={isManager ? GOLD : claimed ? OK : "#cdb98e"}
              stroke-width={isManager || claimed ? 1.8 : 1.2} />
            <text x={p.x} y={p.y + 3} text-anchor="middle"
              fill={isManager ? GOLD : claimed ? OK : SUB} font-size="8.6" font-weight="600">
              {isManager ? "mgr" : "A" + i}
            </text>
            {/* 隔离工作区标记 */}
            {idx >= 3 && !isManager && (
              <rect x={p.x - 16} y={p.y + 15} width="32" height="9" rx="2"
                fill="rgba(63,107,79,0.08)" stroke={OK} stroke-width="0.7" />
            )}
            {idx >= 3 && !isManager && (
              <text x={p.x} y={p.y + 22} text-anchor="middle" fill={OK} font-size="6">ws</text>
            )}
          </g>
        );
      })}

      {/* 边数 / 风暴提示 */}
      <text x="16" y="232" fill={storm ? ERR : "#5a4a36"} font-size="9.4" font-weight="600">
        通信边数：{d.edges} 条 {mesh ? `= n(n-1)/2 = ${d.n}·${d.n - 1}/2` : `= n = ${d.n}（星形）`}
      </text>
      {storm && (
        <text x="16" y="248" fill={ERR} font-size="8.6">
          O(N²) 边 → 消息风暴：token 与噪声随 agent 数平方膨胀
        </text>
      )}
      {!storm && (
        <text x="16" y="248" fill={SUB} font-size="8.4">
          {mesh ? "agent 间可直接喊话,绕开 manager 瓶颈" : "worker 只对 manager 汇报,无 peer 通信"}
        </text>
      )}

      <text x="16" y="270" fill={mesh ? GOLD : OK} font-size="9.2">
        {mesh
          ? "共享任务表 + peer messaging:拿掉中心瓶颈,换来并发与协调复杂度。"
          : "星形 manager-worker:中心化、好追踪,但 manager 是瓶颈。"}
      </text>
      <text x="16" y="288" fill={SUB} font-size="8.4">
        多 agent 同改文件 → 隔离工作区(ws)写,合并阶段集中裁决冲突。
      </text>
    </svg>
  );
}

function frames(params, d) {
  const mesh = d.mesh;
  return [
    { line: 1, stage: 0, say: mesh
        ? `第 1 步：team 的核心数据结构是一张<b>所有 agent 都能读写的共享任务表</b>(SharedTaskList)。每条 task 有 id / status / owner / blocked_by / result——谁在做什么,一张表看清。`
        : `第 1 步：星形结构里没有共享看板,任务由 <b>manager 持有并分派</b>。这是 ch05 的形态,worker 之间互不知情。` },
    { line: 2, stage: 1, say: mesh
        ? `第 2 步关键：<code>claim()</code> 必须是<b>原子操作</b>。两个 agent 同时把同一任务标成 in_progress 就会重复劳动——这是分布式系统的并发写问题在 agent 上重演,要靠加锁 / 版本号 / 串行化写入。`
        : `第 2 步：星形里不存在“认领竞争”,manager 直接指派,天然无并发写冲突——这正是中心化换来的简单。` },
    { line: 3, stage: 2, say: mesh
        ? `第 3 步：<b>peer messaging</b>。agent A 可直接对 B 说“接口我定成这样,你按这个写实现”。灵活、迭代快,但 N 个 agent 全连接是 <b>O(N²)</b> 条边——<a href="${PRUNE_URL}" target="_blank" rel="noreferrer">AgentPrune</a> 专门研究剪掉冗余通信边来降本。`
        : `第 3 步：星形里信息只在 worker→manager 一条边流动,没有 peer 通信。优点是好追踪,缺点是所有协商都得绕经 manager。` },
    { line: 4, stage: 3, say: mesh
        ? `第 4 步：多个 agent 同时改文件 → 传统并发冲突全回来。主流解法是<b>工作区隔离</b>:每个 agent 一份独立副本(git worktree / 沙箱),各改各的。`
        : `第 4 步：即便是星形,worker 并行写也需要隔离工作区,只是 manager-worker 的合并对象更少、更好汇总。` },
    { line: 5, stage: 4, say: mesh
        ? `第 5 步：任务不是都能并行。有依赖的任务构成 <b>DAG</b>,调度器只把<b>就绪</b>(前置已完成)的任务放进可认领池。强依赖的任务硬塞给不同 agent 并行,只会靠反复传摘要补齐,得不偿失。`
        : `第 5 步：星形里 manager 掌握全局,依赖调度集中在它手上,相对简单——代价是 manager 成为单点瓶颈。` },
    { line: 6, stage: 5, say: mesh
        ? `第 6 步：写阶段互不干扰,<b>冲突推迟到合并阶段集中处理</b>,而非运行中随机覆盖。合并时可引入 verifier / 人裁决。这就是“隔离 + 集中合并”范式——对照 <a href="${AUTOGEN_URL}" target="_blank" rel="noreferrer">AutoGen</a>/<a href="${METAGPT_URL}" target="_blank" rel="noreferrer">MetaGPT</a> 的团队形态。`
        : `兜底反思：<a href="${ORCHESTRA_URL}" target="_blank" rel="noreferrer">Code Agent Orchestra</a> 把 team 描述成“共享任务表 + peer messaging”。但每加一项(共享表/claim/消息/合并),复杂度和成本都上一个台阶——team 不是更高级,是另一种权衡。` },
  ];
}

function note(stage, params, d) {
  switch (stage) {
    case 0:
      return "本式主线：从 manager-worker <b>再往前一步</b>——多个 agent <b>共享任务表</b>、彼此<b>直接通信</b>的 agent team。资料:<a href=\"" + ORCHESTRA_URL + "\" target=\"_blank\" rel=\"noreferrer\">Code Agent Orchestra</a>(shared task list + peer messaging 的工程描述)、<a href=\"" + AUTOGEN_URL + "\" target=\"_blank\" rel=\"noreferrer\">AutoGen</a>、<a href=\"" + METAGPT_URL + "\" target=\"_blank\" rel=\"noreferrer\">MetaGPT</a>。";
    case 1:
      return "<b>共享任务表</b>解决“谁在做什么一张表看清、agent 自己认领不必等派发、依赖显式化”;但带来<b>并发写 / 认领竞争 / 状态漂移</b>。必须配串行化写入 / 加锁 / 版本号,否则就是分布式那套老问题重演。";
    case 2:
      return "<b>peer messaging</b> 比“都向 manager 汇报”更灵活,也更危险:N 个 agent 两两通信是 <b>O(N²)</b> 边,token 成本和噪声同步爆炸。收敛手段:限制拓扑(非全连接)、给消息加结构(收件人/类型/引用 task id)、保留完整 message log。";
    case 3:
      return "多 agent 同改文件 → 传统并发冲突全回来。<b>工作区隔离</b>(git worktree / 沙箱目录)让写阶段互不干扰,冲突推迟到合并阶段集中处理。对照本仓库 sub-agent-runner:worker 各写各的 trace 和结果,manager 聚合阶段统一读取。";
    case 4:
      return "<b>任务依赖 DAG</b>:只把就绪(前置完成)的任务放进可认领池;别把强依赖任务塞给不同 agent 并行。判断原则同上一章:<b>能真正并行、且每个子任务足够重</b>时并行才划算。";
    case 5:
      return "<b>agent team vs manager-worker</b>:前者是“共享看板 + 互相喊话”(网状、去中心、并发风险),后者是“派活 + 汇总”(星形、中心化、manager 瓶颈)。team 不是更高级,是拿掉中心瓶颈换并发与协调复杂度。";
    default:
      return "拖朱字对比「星形 / 网状」与 agent 数,看通信边如何从 O(N) 涨到 O(N²);点演法走完看板→认领→消息→隔离→依赖→合并六步。";
  }
}

const pyCode = `# agent team 骨架(对照 manager-worker)
board = SharedTaskList()                  # 所有 agent 共享的看板
while not board.all_done():
    task = board.claim(agent_id)          # 原子认领:加锁/版本号防并发写
    if task.blocked_by and not done(task.blocked_by):
        continue                          # 按 DAG 依赖等待前置
    ws = isolated_worktree(agent_id)      # 各占隔离工作区,写不互相覆盖
    result = run(task, ws)
    if need_peer(task):
        peer_send(to="B", ref=task.id, msg=...)   # agent 间直接通信
    board.complete(task.id, result)
final = merge(all_worktrees)              # 合并阶段集中裁决冲突
# 代价:并发写 + 消息风暴(O(N^2)) + 工作区冲突 + 合并裁决`;

export const agentTeamDemo = {
  title: "演武场 · agent team 协同",
  intro: `<p>上一式 sub-agent 是<b>单向</b>的:manager 派活 → worker 隔离执行 → 回报告,worker 之间不说话。本式再往前一步,进入 <a href="${ORCHESTRA_URL}" target="_blank" rel="noreferrer">Code Agent Orchestra</a> 描述的形态:<b>共享任务表 + peer-to-peer messaging</b>——更像“一个团队在协作”,而不是“一个老板派活”。</p>
<p><b>核心判断</b>:agent team <b>不是更高级的 manager-worker</b>,而是<b>另一种权衡</b>:拿掉 manager 这个中心瓶颈,换来并发和协调的复杂度。共享任务表带来并发写、认领竞争、状态漂移;peer messaging 带来 <b>O(N²) 消息风暴</b>;多 agent 同改文件需要<b>工作区隔离 + 集中合并</b>。</p>
<p><b>什么时候值得</b>:任务能拆成多个<b>较重且相对独立</b>的子任务、需少量明确协商、工作区能干净隔离最后能可靠合并。<b>什么时候不值</b>:任务很小(manager-worker 甚至单 agent 就够)、子任务强依赖彼此中间状态必须串行、没有可靠并发控制——那只是更贵的 manager-worker。</p>
<p class="intro-arena-tip">右侧拖 <b>朱字</b>切换「星形 / 网状」拓扑、调 agent 数,直观看通信边从 O(N) 涨到 O(N²);点演法走完看板→认领→消息→隔离→依赖→合并六步。</p>`,
  bridge: {
    prev: "卷五:sub-agent 分派 —— manager 用隔离上下文派工,reducer 聚合报告。",
    current: "卷六:agent team —— 共享任务表 + peer messaging,拿掉中心瓶颈换并发复杂度。",
    next: "卷七:跳出具体形态,系统看 multi-agent 协作的通信/成本/失败模式。",
    sources: ["Code Agent Orchestra", "AutoGen", "MetaGPT", "AgentPrune"],
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
  challenge: {
    prompt: '当 agent 数增加时，哪种拓扑的通信边数增长最快？',
    options: ['星形 manager-worker', '网状 agent team', '两者都保持固定'],
    correct: 1,
    feedback: '正确：全连接网状拓扑有 n(n-1)/2 条边，消息成本按 O(N²) 增长。',
    retry: '切到两种拓扑并调大 Agent 数，比较图下方的通信边数公式。',
    transfer: '为 8 个 agent 设计一个非全连接通信方案，说明它如何减少无关消息。',
  },
  terms: [
    { t: "agent team", d: "多个 agent 共享任务表、彼此可直接通信的协作形态。对照 manager-worker(星形/中心化),team 是网状/部分去中心化。" },
    { t: "共享任务表", d: "所有 agent 可读写的任务看板(id/status/owner/blocked_by/result)。好处:进度可观测、可自认领;难点:并发写、认领竞争、状态漂移。" },
    { t: "claim(认领)", d: "agent 把 pending 任务原子地标为自己的 in_progress。必须原子,否则两个 agent 重复劳动。靠加锁/版本号/串行化写入实现。" },
    { t: "peer messaging", d: "agent 间直接发消息,不绕经 manager。灵活但 N 个全连接是 O(N²) 边,token 与噪声平方膨胀。需限制拓扑 + 结构化消息 + message log。" },
    { t: "工作区隔离", d: "每个 agent 一份独立副本(git worktree / 沙箱)。写阶段互不干扰,冲突推迟到合并阶段集中裁决,而非运行中随机覆盖。" },
    { t: "任务依赖 DAG", d: "用 blocked_by 表达谁等谁。调度器只把就绪(前置完成)的任务放进可认领池;强依赖任务别硬拆成并行。" },
  ],
  localCmd: "cd agent-volume/experiments/sub-agent-runner && python3 manager.py --reset  # 对照星形 manager-worker,想象改成 team 要补哪些机制",
};


export default { name: 'GewuAgentTeamDemo' }
</script>
