<script lang="jsx">
// 卷十二 · 第二式 · 直取人心:DPO —— 跳过奖励模型与 PPO,一个损失直接用偏好对齐
// 真实数据来自 ch12/dpo_train.py:把「模型」简化成对 5 个候选回答的概率分布
const RESP = [
  { name: "完美的回答", truth: 3.0, before: 0.165, after: 0.947 },
  { name: "不错的回答", truth: 1.5, before: 0.230, after: 0.049 },
  { name: "还行的回答", truth: 0.5, before: 0.133, after: 0.003 },
  { name: "啰嗦的回答", truth: -0.5, before: 0.193, after: 0.001 },
  { name: "跑题的回答", truth: -2.0, before: 0.279, after: 0.000 },
];
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

const lines = [
  { text: "policy = ref.copy()            # 从对齐前的自己出发", stage: 0 },
  { text: "m_win  = logp_policy[赢] − logp_ref[赢]   # 相对 ref 的提升", stage: 1 },
  { text: "m_lose = logp_policy[输] − logp_ref[输]", stage: 1 },
  { text: "β = {{beta}}                    # 缰绳:别为讨好跑太远(拖朱字)", stage: 2 },
  { text: "loss = −log sigmoid(β · (m_win − m_lose))   # 一个损失搞定", stage: 3 },
];

const paramDefs = { beta: { min: 0.1, max: 1.0, step: 0.1, fmt: (v) => v.toFixed(1) } };
const initial = { beta: 0.5 };

function compute(p) {
  // 演示:固定一对(赢=完美 m_win=+1.6,输=跑题 m_lose=-1.2),看 β 如何缩放梯度强度
  const mWin = 1.6, mLose = -1.2;
  const z = p.beta * (mWin - mLose);
  const loss = -Math.log(sigmoid(z) + 1e-12);
  return { beta: p.beta, mWin, mLose, z, loss, resp: RESP };
}

const argmaxAfter = RESP.reduce((bi, r, i, a) => (r.after > a[bi].after ? i : bi), 0);
const bestTruth = RESP.reduce((bi, r, i, a) => (r.truth > a[bi].truth ? i : bi), 0);
const alignOK = argmaxAfter === bestTruth;

const X0 = 30, BARX = 120, BARW = 150, ROWH = 36, TOP = 70;
function Viz({ derived: d, stage }) {
  const showAfter = stage >= 3;
  const title = !showAfter
    ? "对齐前:模型对 5 个回答几乎一视同仁(甚至偏爱「跑题」)"
    : "对齐后:概率被果断挪到「完美的回答」,差回答压到近 0";
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={20} fill="#8a7656" font-size="12">{title}</text>
      <text x={X0} y={38} fill="#5a4a36" font-size="10.5">
        {showAfter ? <tspan><tspan fill="#b9a06a">浅=对齐前</tspan> · <tspan fill="#9e2b1e">深=对齐后</tspan></tspan>
          : "灰条 = 当前选各回答的概率(注意:此时最高的是「跑题」)"}
      </text>
      {d.resp.map((r, j) => {
        const y = TOP + j * ROWH;
        const bw = r.before * BARW * 1.0;
        const aw = r.after * BARW * 1.0;
        const isBest = j === bestTruth;
        return (
          <g key={j}>
            <text x={X0} y={y + 13} fill={isBest ? "#9e2b1e" : "#5a4a36"} font-size="11.5">{r.name}</text>
            <rect x={BARX} y={y} width={BARW} height={18} rx="3" fill="#efe6d2" stroke="#cdb98e" stroke-width="0.7" />
            {/* 对齐前 */}
            <rect x={BARX} y={y} width={Math.max(1.5, bw)} height={18} rx="3"
              fill="#b9a06a" opacity={showAfter ? 0.5 : 1} />
            {/* 对齐后 */}
            {showAfter && (
              <rect x={BARX} y={y} width={Math.max(1.5, aw)} height={18} rx="3"
                fill={isBest ? "#9e2b1e" : "#c0632e"} style={{ transition: "width .4s ease" }} />
            )}
            <text x={BARX + Math.max(bw, showAfter ? aw : 0) + 6} y={y + 13} fill="#2b2117" font-size="10">
              {((showAfter ? r.after : r.before) * 100).toFixed(1)}%
            </text>
          </g>
        );
      })}

      {showAfter ? (
        <>
          <text x={X0} y={258} fill="#3f6b4f" font-size="12.5">
            概率最高 = 「完美的回答」(真实最优也是它):{alignOK ? "True ✓" : "False"}
          </text>
          <text x={X0} y={280} fill="#8a7656" font-size="11">
            β={d.beta.toFixed(1)} · 全程没训奖励模型、没跑 PPO,只用了一个损失
          </text>
        </>
      ) : (
        <>
          <text x={X0} y={258} fill="#5a4a36" font-size="11.5">
            β·(m_win − m_lose) = {d.z.toFixed(2)} → 这对样本损失 <tspan fill="#9e2b1e">{d.loss.toFixed(3)}</tspan>
          </text>
          <text x={X0} y={280} fill="#8a7656" font-size="11">点「演法」:看一个损失如何把概率挪向好回答</text>
        </>
      )}
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: "经典 RLHF 要摆弄好几个模型、还得跑难调的 PPO。<b>DPO</b> 发现:那两步<b>数学上能合并成一步</b>。策略从冻结的参考模型 <b>ref</b>(对齐前的自己)出发。" },
    { line: 2, stage: 1, say: "对每个回答,算它相对 ref 的<b>「提升」</b> = policy 的 log 概率 − ref 的 log 概率。赢家的提升 <b>m_win</b>、输家的提升 <b>m_lose</b>。" },
    { line: 4, stage: 2, say: `所有概率都和<b>冻结的 ref</b> 比较,系数 <b>β=${d.beta.toFixed(1)}</b> 当缰绳——防止模型为讨好而胡说、丢掉原有能力。β 越大,拉得越用力。` },
    { line: 5, stage: 3, say: `损失 = <b>−log sigmoid(β·(m_win − m_lose))</b>。它天然同时做两件事:<b>拉开好坏差距</b> + <b>别跑离 ref</b>。当前这对样本损失 ${d.loss.toFixed(3)}。` },
    { line: 5, stage: 3, say: `结果:对齐前模型甚至偏爱「跑题」(0.279);<b>对齐后概率果断挪到「完美的回答」(0.947)</b>,差回答压到近 0(${alignOK ? "True" : "False"})。没训奖励模型、没跑 PPO。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "经典 RLHF=训奖励模型 + 跑 PPO,要摆弄策略/奖励/参考/价值多个模型,超参敏感难调。<b>DPO</b> 把这两步压成<b>一个损失</b>,直接用偏好对更新模型。";
    case 1: return "每个回答相对冻结 <b>ref</b> 的提升 = <b>logp_policy − logp_ref</b>。赢家提升 m_win、输家提升 m_lose。policy 初始 = ref,所以一开始提升都为 0。";
    case 2: return `<b>β=${d.beta.toFixed(1)}</b> 是缰绳:所有变化都对照冻结的 ref 衡量,β 控制「能离 ref 多远」。太大易跑偏胡说,太小学不动。`;
    case 3: return `损失 <b>−log sigmoid(β·(m_win−m_lose))</b> 一肩挑两担:<b>学偏好</b>(拉开好坏)+ <b>别跑偏</b>(贴着 ref)。实跑:对齐后「完美的回答」0.947、差回答近 0,且仍是合法分布。`;
    default: return "拖朱字调 β,点「演法」看一个损失如何完成对齐。";
  }
}

const pyCode = `import torch, torch.nn.functional as F
# 把「模型」简化成对 5 个候选回答的一个概率分布;policy 从 ref 出发
logits = torch.zeros(5, requires_grad=True)   # policy
ref_logp = F.log_softmax(torch.zeros(5), -1)  # 冻结参考(初始一视同仁)
beta = 0.1
for step in range(500):
    logp = F.log_softmax(logits, -1)
    m_win  = logp[win]  - ref_logp[win]       # 相对 ref 的提升
    m_lose = logp[lose] - ref_logp[lose]
    loss = -F.logsigmoid(beta * (m_win - m_lose)).mean()
    loss.backward(); ...                       # 一个损失直接对齐
# 对齐后:完美 0.947,差回答压到近 0 —— 没训奖励模型、没跑 PPO`;

export const dpoDemo = {
  title: "演武场 · 直取人心",
  intro: "<b>DPO</b> 发现 RLHF 那两步(训奖励模型 + 跑 PPO)<b>数学上能合并成一个损失</b>。" +
    "损失 <b>−log sigmoid(β·(m_win − m_lose))</b> 同时<b>学偏好</b>又<b>不跑离冻结的 ref</b>。" +
    "实跑:对齐后好回答概率 0.947、差回答近 0。拖动 <b>β 朱字</b>看缰绳松紧,点「演法」看分布被挪动。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1200,
  terms: [
    { t: "DPO 的核心发现", d: "RLHF 的「训奖励模型 + PPO」两步,<b>数学上可合并成一步</b>。不训奖励模型、不跑 PPO,直接拿偏好对更新模型本身。简单、稳定、好复现,是当下主流对齐法。" },
    { t: "相对 ref 的提升", d: "每个回答的提升 = <b>logp_policy − logp_ref</b>(策略对它的 log 概率,减去冻结参考的)。policy 初始就是 ref,所以训练起点提升全为 0。" },
    { t: "β 当缰绳", d: "所有变化都对照<b>冻结的 ref</b>(对齐前的自己)衡量,系数 <b>β</b> 控制能离 ref 多远。防止模型为讨好奖励而胡说、丢掉预训练能力。太大跑偏、太小学不动。" },
    { t: "一个损失挑两担", d: "<b>−log sigmoid(β·(m_win − m_lose))</b> 天然同时:① 拉开好坏回答的差距(学偏好)② 贴着 ref 不乱跑(别跑偏)。实跑后好回答 0.947、差回答近 0,整体仍是合法分布。" },
  ],
  localCmd: "cd llm-volume/ch12-alignment/code && python3 dpo_train.py",
};


export default { name: 'GewuDpoDemo' }
</script>
