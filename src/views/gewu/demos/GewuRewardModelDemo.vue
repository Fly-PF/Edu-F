<script lang="jsx">
// 卷十二 · 第一式 · 以好恶为尺:奖励模型 —— 从「A 比 B 好」的偏好里反推出一把打分尺
// 真实数据来自 ch12/reward_model.py:5 个回答各有隐藏真实质量,2000 条 Bradley-Terry 偏好学出奖励
const RESP = [
  { name: "完美的回答", learned: 1.95, truth: 3.0 },
  { name: "不错的回答", learned: 0.80, truth: 1.5 },
  { name: "还行的回答", learned: 0.02, truth: 0.5 },
  { name: "啰嗦的回答", learned: -0.84, truth: -0.5 },
  { name: "跑题的回答", learned: -1.93, truth: -2.0 },
];
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

const lines = [
  { text: "# 好不好没有标准答案,但人擅长「二选一」", stage: 0 },
  { text: "P(a 胜 b) = sigmoid(quality_a − quality_b)   # Bradley-Terry", stage: 1 },
  { text: "Δ = qa − qb = {{gap}}                          # 质量差(拖朱字)", stage: 1 },
  { text: "loss = −log sigmoid(reward[赢] − reward[输])   # 逼赢家分更高", stage: 2 },
  { text: "# 只用 2000 条偏好 → 反推每个回答的分数", stage: 3 },
];

const paramDefs = { gap: { min: -4, max: 4, step: 0.5, fmt: (v) => v.toFixed(1) } };
const initial = { gap: 1.5 };

function compute(p) {
  const pWin = sigmoid(p.gap);
  const loss = -Math.log(pWin + 1e-12);
  return { gap: p.gap, pWin, loss, resp: RESP };
}

// 排序一致性(学到 vs 真实)
const orderOK = JSON.stringify([...RESP].sort((a, b) => b.learned - a.learned).map((r) => r.name))
  === JSON.stringify([...RESP].sort((a, b) => b.truth - a.truth).map((r) => r.name));

const PX0 = 44, PW = 286, PTOP = 58, PH = 92; // sigmoid 曲线绘图区
function Viz({ derived: d, stage }) {
  const showRank = stage >= 3;
  if (showRank) {
    // 学到的奖励 vs 真实质量
    const X0 = 30, MIDX = 150, HALF = 92, ROWH = 36, TOP = 64;
    const sc = (v) => (v / 3) * HALF; // ±3 映射到 ±HALF
    return (
      <svg viewBox="0 0 360 300" width="360" height="300">
        <text x={X0} y={22} fill="#8a7656" font-size="12.5">只看 2000 条偏好,反推出的打分尺:</text>
        <text x={X0} y={40} fill="#5a4a36" font-size="11">
          <tspan fill="#9e2b1e">实心=奖励模型打分</tspan> · <tspan fill="#3f6b4f">绿点=真实质量(它没看过)</tspan>
        </text>
        <line x1={MIDX} y1={52} x2={MIDX} y2={TOP + RESP.length * ROWH - 6} stroke="#cdb98e" stroke-width="1" stroke-dasharray="2 2" />
        {d.resp.map((r, j) => {
          const y = TOP + j * ROWH;
          const lw = sc(r.learned), tw = sc(r.truth);
          return (
            <g key={j}>
              <text x={X0} y={y + 13} fill="#5a4a36" font-size="11.5">{r.name}</text>
              <rect x={r.learned >= 0 ? MIDX : MIDX + lw} y={y + 2} width={Math.abs(lw)} height={14} rx="2"
                fill={r.learned >= 0 ? "#9e2b1e" : "#c0632e"} opacity="0.85" />
              <circle cx={MIDX + tw} cy={y + 9} r="4" fill="#3f6b4f" />
              <text x={MIDX + lw + (r.learned >= 0 ? 5 : -5)} y={y + 13}
                fill="#2b2117" font-size="10" text-anchor={r.learned >= 0 ? "start" : "end"}>
                {r.learned >= 0 ? "+" : ""}{r.learned.toFixed(2)}
              </text>
            </g>
          );
        })}
        <text x={X0} y={262} fill={orderOK ? "#3f6b4f" : "#9e2b1e"} font-size="12.5">
          排序与真实质量完全一致:{orderOK ? "True ✓" : "False"}
        </text>
        <text x={X0} y={284} fill="#8a7656" font-size="11">绝对数值不必相等,排序对了就能当 RLHF 的「裁判」</text>
      </svg>
    );
  }
  // Bradley-Terry sigmoid 曲线
  const showLoss = stage >= 2;
  const N = 48;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const x = -4 + (8 * i) / N;
    return `${PX0 + ((x + 4) / 8) * PW},${PTOP + PH - sigmoid(x) * PH}`;
  }).join(" ");
  const cx = PX0 + ((d.gap + 4) / 8) * PW;
  const cy = PTOP + PH - d.pWin * PH;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={30} y={22} fill="#8a7656" font-size="12.5">质量差 Δ 越大,人越笃定地选「赢家」</text>
      {/* 坐标轴 */}
      <line x1={PX0} y1={PTOP} x2={PX0} y2={PTOP + PH} stroke="#cdb98e" stroke-width="1" />
      <line x1={PX0} y1={PTOP + PH} x2={PX0 + PW} y2={PTOP + PH} stroke="#cdb98e" stroke-width="1" />
      <line x1={PX0 + PW / 2} y1={PTOP} x2={PX0 + PW / 2} y2={PTOP + PH} stroke="#cdb98e" stroke-width="0.7" stroke-dasharray="2 2" />
      <text x={PX0 - 6} y={PTOP + 4} fill="#8a7656" font-size="9" text-anchor="end">1.0</text>
      <text x={PX0 - 6} y={PTOP + PH} fill="#8a7656" font-size="9" text-anchor="end">0.0</text>
      <text x={PX0 + PW / 2} y={PTOP + PH + 13} fill="#8a7656" font-size="9" text-anchor="middle">Δ=0</text>
      {/* sigmoid 曲线 */}
      <polyline points={pts} fill="none" stroke="#9c7b2e" stroke-width="2" />
      {/* 当前点 */}
      <line x1={cx} y1={PTOP} x2={cx} y2={PTOP + PH} stroke="#9e2b1e" stroke-width="1" stroke-dasharray="3 3" opacity="0.5" />
      <circle cx={cx} cy={cy} r="5" fill="#9e2b1e" />
      <text x={cx} y={PTOP - 6} fill="#9e2b1e" font-size="11" text-anchor="middle">Δ={d.gap.toFixed(1)}</text>

      <text x={30} y={188} fill="#5a4a36" font-size="12.5">
        回答 a 胜过 b 的概率 = <tspan fill="#9e2b1e" font-size="15">{(d.pWin * 100).toFixed(1)}%</tspan>
      </text>
      <text x={30} y={208} fill="#8a7656" font-size="11">
        {d.gap > 1 ? "差距大 → 几乎必选 a" : d.gap < -1 ? "差距大(反向)→ 几乎必选 b" : "差距小 → 接近抛硬币"}
      </text>

      {showLoss && (
        <>
          <text x={30} y={238} fill="#5a4a36" font-size="12.5">
            若 a 真赢了,这条样本的损失 = −log({(d.pWin * 100).toFixed(0)}%) =
            <tspan fill="#9e2b1e" font-size="14"> {d.loss.toFixed(3)}</tspan>
          </text>
          <rect x={30} y={248} width={300} height={16} rx="3" fill="#efe6d2" stroke="#cdb98e" stroke-width="0.7" />
          <rect x={30} y={248} width={Math.max(2, Math.min(1, d.loss / 4) * 300)} height={16} rx="3"
            fill="#9e2b1e" style={{ transition: "width .3s ease" }} />
          <text x={30} y={284} fill="#8a7656" font-size="11">
            赢家本就该高分→损失小;若赢家分反而低→损失大,逼模型调过来
          </text>
        </>
      )}
      {!showLoss && (
        <text x={30} y={250} fill="#8a7656" font-size="11.5">点「演法」:看这个概率怎么变成训练损失</text>
      )}
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: "「这个回答好不好」没有标准答案——太主观。但换个问法:<b>给你两个回答,哪个更好?</b> 大多数人都能轻松选出来。对齐就抓住这一点。" },
    { line: 2, stage: 1, say: "怎么从「只知道谁比谁好」学出<b>具体分数</b>?靠 <b>Bradley-Terry</b>:假设每个回答有隐藏质量,则 a 胜 b 的概率 = <b>sigmoid(qa − qb)</b>。" },
    { line: 3, stage: 1, say: `拖动质量差 <b>Δ</b>:Δ=${d.gap.toFixed(1)} 时 a 胜的概率 <b>${(d.pWin * 100).toFixed(1)}%</b>。差距越大人越笃定,差距小就接近抛硬币。` },
    { line: 4, stage: 2, say: `反过来:有大量偏好对,就能把分数<b>反推</b>出来。损失 = <b>−log sigmoid(赢家分 − 输家分)</b>,逼着赢家分更高。当前这条 = ${d.loss.toFixed(3)}。` },
    { line: 5, stage: 3, say: `造 5 个回答、收 2000 条偏好,<b>只用偏好</b>把分数学出来:绝对值和真实质量不等,但<b>排序完全一致</b>(${orderOK ? "True" : "False"})。这就是 RLHF 要的「裁判」。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "对齐要解决「说得好不好」。它没标准答案当监督信号,但人类<b>擅长二选一比较</b>——这是一切的起点。";
    case 1: return `<b>Bradley-Terry</b>:P(a 胜 b)=sigmoid(qa−qb)。拖朱字改质量差 Δ=${d.gap.toFixed(1)},看胜率 ${(d.pWin * 100).toFixed(1)}%。`;
    case 2: return `奖励模型损失 = <b>−log sigmoid(reward[赢]−reward[输])</b>,正是 Bradley-Terry 的负对数似然。让「赢家分−输家分」尽量大。`;
    case 3: return `只用 2000 条偏好就反推出打分尺:排序与真实质量<b>完全一致(${orderOK ? "True" : "False"})</b>。它的作用是当 RLHF 里那个会打分的裁判。下一式看更简洁的 DPO。`;
    default: return "拖朱字调 Δ,点「演法」看偏好如何变成一把打分尺。";
  }
}

const pyCode = `import numpy as np
def sigmoid(z): return 1/(1+np.exp(-z))
# 5 个回答各有隐藏「真实质量」,人按 Bradley-Terry 给 2000 条偏好
true_quality = np.array([-2.0, -0.5, 0.5, 1.5, 3.0])
reward = np.zeros(5)              # 待学的打分器,从 0 开始
for _ in range(400):             # 只用偏好对当监督
    diff = reward[win] - reward[lose]
    g = -(1 - sigmoid(diff))     # loss=-log sigmoid(diff) 的梯度
    grad = np.zeros(5)
    np.add.at(grad, win, g); np.add.at(grad, lose, -g)
    reward -= 0.1 * grad / len(win)
# 学到 +1.95/+0.80/+0.02/-0.84/-1.93 → 排序与真实质量一致`;

export const rewardModelDemo = {
  title: "演武场 · 以好恶为尺",
  intro: "「回答好不好」没有标准答案,但人<b>擅长二选一</b>。<b>Bradley-Terry</b>:P(a 胜 b)=<b>sigmoid(qa−qb)</b>。" +
    "用损失 <b>−log sigmoid(赢家分−输家分)</b>,只靠 2000 条偏好就反推出一把打分尺,<b>排序与真实质量一致</b>。拖动 <b>Δ 朱字</b>看胜率与损失。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1150,
  terms: [
    { t: "为什么用偏好", d: "「好回答」太主观,写不出标准答案当监督;但人<b>二选一比较</b>又快又准。对齐就只收集「A 比 B 好」,再想办法变成训练信号。" },
    { t: "Bradley-Terry 模型", d: "假设每个回答有隐藏质量,则 <b>P(a 胜 b)=sigmoid(qa−qb)</b>。质量差大→人笃定;差小→接近抛硬币。有大量偏好对,就能<b>反推</b>每个回答的分数。" },
    { t: "奖励模型损失", d: "<b>−log sigmoid(reward[赢]−reward[输])</b>,即 Bradley-Terry 的负对数似然。逼着「赢家分−输家分」尽量大。学出的分数只看相对高低就够用。" },
    { t: "它是 RLHF 的裁判", d: "学出的打分尺当回报信号:经典 RLHF 下一步用强化学习(PPO)推模型多说高分回答。但 PPO 要摆弄多个模型、超参敏感——所以有了更简洁的 DPO。" },
  ],
  localCmd: "cd llm-volume/ch12-alignment/code && python3 reward_model.py",
};


export default { name: 'GewuRewardModelDemo' }
</script>
