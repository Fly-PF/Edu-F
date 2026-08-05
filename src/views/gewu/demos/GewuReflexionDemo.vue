<script lang="jsx">
const REFLEXION_URL = "https://arxiv.org/abs/2303.11366";
const SELF_REFINE_URL = "https://arxiv.org/abs/2303.17651";
const LATS_URL = "https://arxiv.org/abs/2310.04406";

const OK = "#3f6b4f";
const ERR = "#9e2b1e";
const GOLD = "#9c7b2e";
const SUB = "#a8946a";

// 三种处理失败的策略（与 ch03 三分流呼应：一个好、两个坏）
const MODES = [
  { id: "recover", label: "结构化回注修正" },
  { id: "fail", label: "打印即失败" },
  { id: "loop", label: "回注但无阈值" },
];

// recover 场景的真实三步（取自 agent.py scripted_recovery_response 实跑）
const RECOVER = [
  {
    label: "① action（缺参数）",
    action: '{"action":"read_file","args":{}}',
    obs: '{"ok":false,"error_type":"validation_error","error":"missing required argument for read_file: path"}',
    err: true,
  },
  {
    label: "② 修正后 action",
    action: '{"action":"search_text","args":{"pattern":"Phase 04","path":"agent-volume/roadmap.md","max_matches":5}}',
    obs: '{"ok":true,"matches":[...],"truncated":false}',
    err: false,
  },
  {
    label: "③ final",
    action: '{"action":"final","answer":"恢复演示完成：失败→改判→成功"}',
    obs: "status=done · error_count=1 · steps=3",
    err: false,
  },
];

// loop 场景：模型反复用错路径调 read_file，每次都失败，error_count 不断累积
const LOOP = [
  '{"action":"read_file","args":{"path":"roadmap.md"}}',
  '{"action":"read_file","args":{"path":"Roadmap.md"}}',
  '{"action":"read_file","args":{"path":"agent-volume/road map.md"}}',
  '{"action":"read_file","args":{"path":"./roadmap"}}',
  '{"action":"read_file","args":{"path":"roadmap.txt"}}',
  '{"action":"read_file","args":{"path":"docs/roadmap.md"}}',
];

const lines = [
  { text: 'obs = run_tool(action)              # ①执行工具, 拿回 observation', stage: 0 },
  { text: 'if observation_has_error(obs):      # ②判定: 这条 obs 是不是错误', stage: 1 },
  { text: '    state.error_count += 1          # ③错误计数 +1 (写进 state.json)', stage: 2 },
  { text: '    ctx.append(structured(obs))     # ④结构化错误回注 context (mode={{mode}})', stage: 3 },
  { text: 'action = model(ctx)                 # ⑤模型据错误改判, 给出新 action', stage: 4 },
  { text: 'if state.error_count > {{thresh}}: stop()   # ⑥超阈值即止损/求助', stage: 5 },
];

const paramDefs = {
  mode: { min: 0, max: 2, step: 1, fmt: (v) => MODES[v].label },
  thresh: { min: 1, max: 5, step: 1, fmt: (v) => `${v} 次` },
};
const initial = { mode: 0, thresh: 3 };

function compute(p) {
  return { mode: MODES[p.mode].id, modeIndex: p.mode, thresh: p.thresh };
}

// 把 (mode, stage, thresh) 映射成当前要显示的一帧：动作卡 / 观察卡 / 错误数 / 链路状态
function buildView(mode, stage, thresh) {
  const s = Math.min(5, Math.max(0, stage));

  if (mode === "recover") {
    // 真实三步：缺参数→改判→final。错误只在第①步出现一次。
    const stepIdx = s <= 2 ? 0 : s <= 4 ? 1 : 2;
    const step = RECOVER[stepIdx];
    const errCount = s >= 2 ? 1 : 0; // ③之后 error_count=1
    return {
      action: step.action,
      obs: step.obs,
      isErr: step.err,
      errCount,
      reinjected: s >= 3,          // ④之后错误已回注
      revised: stepIdx >= 1,       // 已改判到 search_text
      done: stepIdx >= 2,
      chain: "alive",
      stopped: false,
      note: stepIdx === 0 ? "缺 path → validation_error" : stepIdx === 1 ? "改用 search_text，参数齐全 → ok" : "final · status=done",
    };
  }

  if (mode === "fail") {
    // 错误不结构化、不回注：模型看不到错误，链路当场断开
    const step = RECOVER[0];
    return {
      action: step.action,
      obs: s >= 1 ? "Traceback: KeyError 'path'  (错误只打印, 未回注)" : step.action,
      isErr: s >= 1,
      errCount: 0,                 // 没人计数
      reinjected: false,
      revised: false,
      done: false,
      chain: s >= 1 ? "broken" : "alive",
      stopped: false,
      note: s >= 1 ? "错误没进 context → 模型无从改判 → 链路中断" : "首个 action 已发出",
    };
  }

  // loop：错误结构化回注了，但没有阈值止损 → error_count 无界累积
  const errCount = Math.min(LOOP.length, s + 1); // 每过一步又错一次
  const exceeded = errCount > thresh;
  const stopped = exceeded; // ⑥若有阈值, 此刻本该 stop；loop 模式形象化"早该停了"
  return {
    action: LOOP[Math.min(LOOP.length - 1, s)],
    obs: '{"ok":false,"error_type":"file_not_found","error":"no such file"}',
    isErr: true,
    errCount,
    reinjected: true,
    revised: true,          // 模型确实在改，只是越改越偏
    done: false,
    chain: "alive",
    stopped,
    note: exceeded
      ? `error_count=${errCount} 已超阈值 ${thresh}：本应 stop()/求助，却仍在重试`
      : `第 ${errCount} 次重试：换个路径再试，仍失败`,
  };
}

function ActionCard({ x, y, w, text, isErr, label, dim }) {
  return (
    <g opacity={dim ? 0.4 : 1}>
      <rect x={x} y={y} width={w} height="30" rx="5"
        fill={isErr ? "rgba(158,43,30,0.08)" : "#fbf6ea"}
        stroke={isErr ? ERR : "#cdb98e"} stroke-width={isErr ? 1.4 : 1} />
      <text x={x + 8} y={y + 12} fill={isErr ? ERR : "#8a7656"} font-size="7.6" font-weight="600">{label}</text>
      <text x={x + 8} y={y + 24} fill="#5a4a36" font-size="6.6">
        {text.length > 58 ? text.slice(0, 57) + "…" : text}
      </text>
    </g>
  );
}

// 反馈可靠性阶梯：环境 > verifier > 自评。高亮当前这条 obs 属于哪一档
function FeedbackLadder({ active }) {
  const rungs = [
    { key: "env", label: "环境反馈", sub: "工具/测试/FS", color: OK, rank: "最可靠" },
    { key: "verifier", label: "verifier", sub: "规则/评估器", color: GOLD, rank: "次之" },
    { key: "self", label: "自评", sub: "模型自我批评", color: SUB, rank: "最弱" },
  ];
  return (
    <g>
      <text x="16" y="180" fill="#5a4a36" font-size="8.4" font-weight="600">反馈可靠性阶梯</text>
      {rungs.map((r, i) => {
        const y = 188 + i * 26;
        const on = r.key === active;
        return (
          <g key={r.key}>
            <rect x="16" y={y} width="150" height="22" rx="4"
              fill={on ? r.color : "#f4ead7"} opacity={on ? 0.92 : 1}
              stroke={on ? r.color : "#cdb98e"} stroke-width={on ? 1.6 : 1} />
            <text x="24" y={y + 14} fill={on ? "#fff" : "#8a7656"} font-size="8.2" font-weight={on ? "700" : "400"}>
              {r.label}
            </text>
            <text x="104" y={y + 14} fill={on ? "rgba(255,255,255,0.85)" : "#b8a888"} font-size="6.6">{r.sub}</text>
            <text x="162" y={y + 14} fill={on ? "#fff" : "#b8a888"} font-size="6.4" text-anchor="end">{r.rank}</text>
          </g>
        );
      })}
    </g>
  );
}

function Viz({ derived: d, stage }) {
  const v = buildView(d.mode, stage, d.thresh);

  // 重试预算计：error_count / (thresh) 连续映射；超阈值变红
  const gaugeMax = Math.max(5, d.thresh + 2);
  const trackW = 150;
  const fillW = Math.max(2, Math.min(1, v.errCount / gaugeMax) * trackW);
  const threshX = (d.thresh / gaugeMax) * trackW;
  const exceeded = v.errCount > d.thresh;
  const gColor = exceeded ? ERR : v.errCount === 0 ? OK : v.errCount >= d.thresh ? GOLD : OK;
  const budgetText = v.errCount === 0
    ? "预算未动"
    : exceeded
      ? (d.mode === "loop" ? "超支仍在重试 · 失控" : "已触阈值 · 该止损")
      : `已用 ${v.errCount}/${d.thresh}`;

  // 当前 obs 属于哪一档反馈：错误/成功的 observation 都来自环境(工具)
  const ladderActive = "env";

  // 链路箭头颜色：recover 回注=绿虚线；fail 断裂=红X；loop 回注但失控=金虚线
  const arrowColor = v.chain === "broken" ? ERR : d.mode === "loop" ? GOLD : OK;

  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x="16" y="15" fill="#5a4a36" font-size="10.5">
        失败恢复闭环 · {MODES[d.modeIndex].label}
      </text>

      {/* 动作卡 → 观察卡 */}
      <ActionCard x={16} y={26} w={328} text={v.action} isErr={false} label="model action" />
      <ActionCard x={16} y={62} w={328} text={v.obs} isErr={v.isErr}
        label={v.isErr ? "observation · ERROR" : "observation · ok"} />

      {/* 回注/改判链路 */}
      <text x="24" y="112" fill={arrowColor} font-size="8" font-weight="600">
        {v.chain === "broken"
          ? "✗ 错误未回注 → 链路中断"
          : v.reinjected
            ? (d.mode === "loop" ? "↻ 结构化回注(但无止损) → 模型反复改判" : "↻ 结构化错误回注 context → 模型改判")
            : "→ 等待 observation 回注"}
      </text>
      <path d={`M168 118 C${v.chain === "broken" ? "168 118 168 118 168 118" : "210 134 126 134 168 118"}`}
        fill="none" stroke={arrowColor} stroke-width="1.4"
        stroke-dasharray={v.chain === "broken" ? "0" : "3 3"} />
      {v.chain === "broken" && (
        <text x="300" y="112" fill={ERR} font-size="9" font-weight="700" text-anchor="end">✗</text>
      )}
      {v.revised && v.chain !== "broken" && (
        <text x="328" y="112" fill={arrowColor} font-size="7" text-anchor="end">
          {v.done ? "→ final ✓" : d.mode === "loop" ? "→ 又一条错路径" : "→ 改用 search_text"}
        </text>
      )}

      <text x="24" y="132" fill="#8a7656" font-size="7.4">{v.note}</text>

      <line x1="16" y1="144" x2="344" y2="144" stroke="#e3d6b8" stroke-width="1" />

      {/* 左下：反馈可靠性阶梯 */}
      <FeedbackLadder active={ladderActive} />

      {/* 右下：重试预算计 */}
      <text x="190" y="180" fill="#5a4a36" font-size="8.4" font-weight="600">重试预算计 (error_count vs 阈值)</text>
      <rect x="190" y="190" width="154" height="76" rx="6"
        fill={exceeded ? "rgba(158,43,30,0.07)" : "#fbf6ea"}
        stroke={gColor} stroke-width={exceeded ? 1.6 : 1} />
      <text x="198" y="206" fill={gColor} font-size="8.6" font-weight="600">error_count</text>
      <text x="336" y="206" fill={gColor} font-size="9" text-anchor="end" font-weight="700">{v.errCount}</text>
      <rect x="198" y="214" width={trackW} height="9" rx="2" fill="#efe3cc" />
      <rect x="198" y="214" width={fillW} height="9" rx="2" fill={gColor} opacity="0.85" />
      <line x1={198 + threshX} y1="210" x2={198 + threshX} y2="227" stroke="#6b3a2e" stroke-width="1.2" stroke-dasharray="2 2" />
      <text x={198 + threshX} y="236" fill="#6b3a2e" font-size="6.6" text-anchor="middle">阈值 {d.thresh}</text>
      <text x="198" y="252" fill={gColor} font-size="7.6" font-weight="600">{budgetText}</text>
      <text x="198" y="262" fill="#a8946a" font-size="6.6">
        {d.mode === "fail" ? "无人计数 → 失败被吞" : d.mode === "loop" ? "无 ⑥ 止损 → 无界累积" : "计数+止损 → 有界恢复"}
      </text>

      <text x="16" y="294" fill="#a8946a" font-size="7">
        Reflexion: 失败→语言总结→回灌 · Self-Refine: 自评有幻觉风险 · LATS: 树搜索更强但更贵
      </text>
    </svg>
  );
}

function frames(params, d) {
  const m = d.mode;
  return [0, 1, 2, 3, 4, 5].map((stage) => {
    const v = buildView(m, stage, d.thresh);
    let say;
    if (stage === 0) {
      say = `第 1 步·<b>run_tool</b>：模型发出 action，harness 执行后拿回 observation。${m === "recover" ? "这一步故意漏写 <code>path</code>。" : m === "fail" ? "同样漏写 <code>path</code>，但稍后看 harness 怎么处理它。" : "这条路径不存在。"}`;
    } else if (stage === 1) {
      say = m === "fail"
        ? "第 2 步·<b>判定失败</b>：fail 模式把异常直接抛/打印，<b>没有</b>把它变成结构化 observation。模型下一轮根本看不到错误。"
        : `第 2 步·<b>observation_has_error</b>：harness 识别出这是错误（<code>${v.isErr ? "error_type" : "ok"}</code>），它是<b>环境反馈</b>——三类反馈里最可靠的一档。`;
    } else if (stage === 2) {
      say = m === "fail"
        ? "第 3 步：没人给错误计数。失败被吞掉，<b>error_count 始终为 0</b>，harness 以为一切正常。"
        : `第 3 步·<b>error_count += 1</b>：错误次数写进 <code>state.json</code>。这是后面止损的依据${m === "loop" ? "——但 loop 模式偏偏不看它。" : "。"}`;
    } else if (stage === 3) {
      say = m === "fail"
        ? "第 4 步：本该把结构化错误回注 context，fail 模式跳过了这步。<b>链路在此断开</b>。"
        : `第 4 步·<b>结构化回注</b>：把 <code>{"{ok:false,error_type:...}"}</code> 追加进 context。模型这才<b>看得见</b>自己错在哪。${m === "loop" ? "loop 也回注了，所以它能改——问题不在这。" : ""}`;
    } else if (stage === 4) {
      say = m === "fail"
        ? "第 5 步：模型拿不到错误，只能凭空再猜，<b>无从改判</b>。这就是“只打印不回注”的代价。"
        : m === "loop"
          ? "第 5 步·<b>模型改判</b>：loop 模式里模型确实在改——可它换的还是错路径，<b>越改越偏</b>（Self-Refine 的自洽幻觉风险）。"
          : "第 5 步·<b>模型改判</b>：基于回注的错误，模型改用参数齐全的 <code>search_text</code>，这次成功。";
    } else {
      say = m === "fail"
        ? "第 6 步：fail 模式连 error_count 都没有，阈值形同虚设。失败既不可见也不可控。"
        : m === "loop"
          ? `第 6 步·<b>关键缺失</b>：loop 没有 <code>if error_count > ${d.thresh}: stop()</code>。error_count 已 ${v.errCount}，<b>超阈值仍在重试</b>——拖动「阈值」朱字看红线何时被突破。`
          : `第 6 步·<b>止损</b>：recover 一次就修好了，error_count=1 远低于阈值 ${d.thresh}。若反复失败超阈值，<code>stop()</code> 会触发求助。`;
    }
    return { line: stage + 1, stage, say };
  });
}

function note(stage, params, d) {
  switch (stage) {
    case 0:
      return "本式的主角不是“模型会反思”，而是 <b>harness 怎么把一次失败变成下一步可用的信号</b>。先看一条 action 执行后拿回 observation。";
    case 1:
      return `<b>observation_has_error()</b> 是恢复闭环的第一道闸：它把工具返回判成成功还是错误。错误来自<b>环境</b>（工具/测试/文件系统），是三类反馈里最可靠的——见 <a href="${REFLEXION_URL}" target="_blank" rel="noreferrer">Reflexion</a>。`;
    case 2:
      return "<b>error_count</b> 写进 state.json，是“失败可计量”的前提。没有计数，就没有止损的依据，agent 要么被一次失败卡死，要么无限重试。";
    case 3:
      return "<b>结构化回注</b>是 recover 与 fail 的真正分水岭：错误必须以结构化 observation 进入下一轮 context，模型才看得见、才改得动。只打印到日志等于没发生。";
    case 4:
      return `模型改判靠的是<b>回注的证据</b>，不是凭空再想一遍。<a href="${SELF_REFINE_URL}" target="_blank" rel="noreferrer">Self-Refine</a> 的自评循环若没有外部反馈支撑，容易“越改越偏”形成自洽幻觉——loop 模式正演示这点。`;
    case 5:
      return `<b>止损阈值</b>是工程上的安全带：<code>if error_count > N: stop()/求助</code>。<a href="${LATS_URL}" target="_blank" rel="noreferrer">LATS</a> 这类树搜索更强但更贵，同样必须和预算/阈值一起用，否则会烧光 token。`;
    default:
      return "拖朱字切换三种失败处理：结构化回注修正 / 打印即失败 / 回注但无阈值；再拖「阈值」看重试预算计何时触红线。";
  }
}

const pyCode = `# 失败恢复闭环：harness 把环境反馈变成下一步决策信号
def step(action, state, ctx, thresh):
    obs = run_tool(action)                      # 执行工具
    if observation_has_error(obs):              # ②环境反馈最可靠
        state.error_count += 1                  # ③写进 state.json
        ctx.append(structured(obs))             # ④结构化回注(关键)
        if state.error_count > thresh:          # ⑥止损/求助
            return stop("repeated failures")
    return model(ctx)                           # ⑤据错误改判

# 反差三态:
#   recover: 计数+回注+止损 → 一次就修好(error_count=1)
#   fail:    只打印不回注    → 模型看不到错, 链路断, error_count=0
#   loop:    回注但无 ⑥     → 越改越偏, error_count 无界累积`;

export const reflexionDemo = {
  title: "演武场 · 失败恢复闭环",
  intro: `<p>本式从三篇论文起手：<b><a href="${REFLEXION_URL}" target="_blank" rel="noreferrer">Reflexion</a></b>（失败→语言总结→回灌成经验）、<b><a href="${SELF_REFINE_URL}" target="_blank" rel="noreferrer">Self-Refine</a></b>（生成→自评→修改，但无外部验证易自洽幻觉）、<b><a href="${LATS_URL}" target="_blank" rel="noreferrer">LATS</a></b>（把行动空间当搜索树，更强但更贵）。</p>
<p><b>心法</b>：feedback-driven agent 的关键<b>不是“模型会反思”</b>，而是 <b>harness 能把环境反馈、错误、验证结果变成下一步可用的决策信号</b>。一次工具错误要走完：判错 → 计数 → 结构化回注 → 模型改判 → 超阈止损。</p>
<p><b>三类反馈按可靠性排序</b>：环境反馈（工具/测试/文件系统，最可靠）> verifier/critic（规则或评估器）> 自评（模型批评自己，最弱、可能幻觉）。recover 用的正是最可靠的环境反馈。</p>
<p class="intro-arena-tip">右侧演武场用 agent.py 的真实 recover 三步打底。拖 <b>朱字</b>切换「结构化回注修正 / 打印即失败 / 回注但无阈值」，再拖<b>阈值</b>，看<b>重试预算计</b>里 error_count 如何逼近并突破红线——这就是“只打印不回注”和“回注却不止损”各自的失败形态。</p>`,
  bridge: {
    prev: "第三式：长任务信息分拣 —— context / state / memory / trace 各司其职。",
    current: "第四式：失败恢复闭环 —— 环境反馈结构化回注，计数并按阈值止损。",
    next: "第五式：分而委之 —— 主 agent 把子任务委派给 sub-agent。",
    sources: ["Reflexion", "Self-Refine", "LATS"],
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
    { t: "observation_has_error", d: "harness 判定工具返回是成功还是错误的闸门。错误必须被识别，才能进入回注与计数。" },
    { t: "结构化回注", d: "把错误以 {ok:false,error_type,error} 这种结构化 observation 追加进下一轮 context，让模型看得见、改得动。只打印到日志等于没发生。" },
    { t: "error_count", d: "state.json 中的失败计数。是止损阈值的依据；没有它就无法防无限重试。" },
    { t: "止损阈值", d: "if error_count > N: stop()/求助。工程安全带，防止 agent 在同一个坑里无限打转烧 token。" },
    { t: "三类反馈", d: "环境反馈(工具/测试/FS,最可靠) > verifier/critic(规则或评估器) > 自评(模型自我批评,最弱,无外部验证易自洽幻觉)。" },
    { t: "自洽幻觉", d: "Self-Refine 风险：模型自评自改但没有外部事实校验时，可能越改越偏却自我感觉良好。loop 模式形象化这点。" },
  ],
  localCmd: "cd agent-volume/experiments/minimal-harness && python3 agent.py \"演示失败后恢复\" --scripted-demo --scripted-scenario recover --reset-trace --reset-state",
};


export default { name: 'GewuReflexionDemo' }
</script>
