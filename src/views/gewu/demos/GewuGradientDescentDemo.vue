<script lang="jsx">
// 第四式 · 寻谷心法:拖动起点/学习率/步数,小球轨迹实时重算
const lines = [
  { text: "x = {{x0}}          # 起点", stage: 1 },
  { text: "lr = {{lr}}         # 学习率:每步迈多大", stage: 2 },
  { text: "", stage: 2 },
  { text: "for step in range({{steps}}):", stage: 3 },
  { text: "    grad = 2 * (x - 3)   # 梯度 = 斜率", stage: 3 },
  { text: "    x = x - lr * grad    # 朝下坡迈一步", stage: 3 },
  { text: "print(x)", stage: 4 },
];

const paramDefs = {
  x0: { min: -2, max: 8, step: 0.5, fmt: (v) => v.toFixed(1) },
  lr: { min: 0.05, max: 1.05, step: 0.05, fmt: (v) => v.toFixed(2) },
  steps: { min: 1, max: 30, step: 1 },
};
const initial = { x0: 0, lr: 0.1, steps: 15 };

function compute(p) {
  const path = [p.x0];
  const steps = [];
  let x = p.x0;
  for (let i = 0; i < p.steps; i++) {
    const old = x;
    const grad = 2 * (x - 3);
    const move = p.lr * grad;
    x = x - move;
    steps.push({ old, grad, move, next: x });
    if (!isFinite(x) || Math.abs(x) > 1e4) { path.push(x); break; }
    path.push(x);
  }
  return { path, steps, final: x, diverged: !isFinite(x) || Math.abs(x) > 50 };
}

// 画布:x∈[-2.5,8.5], y=(x-3)^2 取 [0,12] 显示
const X0 = 38, X1 = 342, Y0 = 28, Y1 = 250;
const clampX = (x) => Math.max(-2.5, Math.min(8.5, x));
const fx = (x) => X0 + ((clampX(x) + 2.5) / 11) * (X1 - X0);
const fy = (y) => Y1 - (Math.min(y, 12) / 12) * (Y1 - Y0);
const curveY = (x) => (x - 3) ** 2;

const PATH = (() => {
  let d = "";
  for (let i = 0; i <= 80; i++) {
    const x = -2.5 + (i / 80) * 11;
    d += (i === 0 ? "M" : "L") + fx(x).toFixed(1) + "," + fy(curveY(x)).toFixed(1) + " ";
  }
  return d;
})();

function Viz({ derived: d, stage, play }) {
  const path = d.path;
  const maxIdx = path.length - 1;
  // 演法时只显示到当前步;非演法(拖参/悬停)时显示全程。
  const idx = play && play.step != null ? Math.min(play.step, maxIdx) : maxIdx;
  const shown = path.slice(0, idx + 1);
  const curX = path[idx];
  const detail = d.steps[Math.max(0, idx - 1)] || d.steps[0];
  const lastX = clampX(curX);
  const showTrail = stage >= 3;
  return (
    <svg viewBox="0 0 360 390" width="360" height="390">
      <path d={PATH} fill="none" stroke="#6b3a2e" stroke-width="2" />
      <line x1={fx(3)} y1={fy(0)} x2={fx(3)} y2={Y1 + 8} stroke="#3f6b4f"
        stroke-dasharray="4 4" opacity="0.7" />
      <text x={fx(3) - 16} y={Y1 + 23} fill="#3f6b4f" font-size="13">谷底 x=3</text>

      {/* 轨迹点:只画到当前步 */}
      {showTrail && shown.map((x, i) => (
        <circle key={i} cx={fx(x)} cy={fy(curveY(x))} r="3"
          fill="#9c7b2e" opacity={0.25 + 0.5 * (i / path.length)} />
      ))}

      {/* 当前小球 */}
      <circle cx={fx(lastX)} cy={fy(curveY(lastX))} r="8" fill="#9e2b1e"
        style={{ transition: "all .3s ease" }} />
      <text x={fx(lastX) - 12} y={fy(curveY(lastX)) - 13} fill="#9e2b1e" font-size="13">
        x={isFinite(curX) ? curX.toFixed(2) : "∞"}</text>

      <text x={X0} y={18} fill="#8a7656" font-size="13">y = (x − 3)²  越低越好</text>

      <line x1={28} y1={286} x2={336} y2={286} stroke="#cdb98e" stroke-width="0.8" />
      <text x={28} y={310} fill="#9e2b1e" font-size="12">单步参数更新</text>
      {detail ? (
        <>
          <text x={28} y={334} fill="#5a4a36" font-size="11">
            x_old = {detail.old.toFixed(3)}
          </text>
          <text x={158} y={334} fill="#5a4a36" font-size="11">
            grad = 2×({detail.old.toFixed(3)}−3) = <tspan fill="#3f6b4f">{detail.grad.toFixed(3)}</tspan>
          </text>
          <text x={28} y={358} fill="#5a4a36" font-size="11">
            lr×grad = {detail.move.toFixed(3)}
          </text>
          <text x={158} y={358} fill="#5a4a36" font-size="11">
            x_new = x_old − lr×grad = <tspan fill="#9c7b2e">{detail.next.toFixed(3)}</tspan>
          </text>
          <text x={28} y={382} fill="#8a7656" font-size="10.5">
            梯度为负时,减去负数会向右走;梯度为正时,会向左走。
          </text>
        </>
      ) : (
        <text x={28} y={334} fill="#8a7656" font-size="11">点「演法」看每一步如何更新 x。</text>
      )}
    </svg>
  );
}

function frames(p, d) {
  const path = d.path;
  const fr = [
    { line: 1, stage: 1, step: 0, say: `起点 <b>x = ${p.x0.toFixed(1)}</b>。谷底在 x=3,看小球离谷底多远。` },
    { line: 2, stage: 2, step: 0, say: `学习率 <b>lr = ${p.lr.toFixed(2)}</b>:每步迈多大。太小则慢,太大则飞。` },
  ];
  // 逐次迭代各成一招:小球一步步向谷底滚。
  for (let i = 1; i < path.length; i++) {
    const x = path[i];
    const xs = isFinite(x) ? x.toFixed(3) : "∞";
    const tail = isFinite(x) ? `(离谷底 ${Math.abs(3 - x).toFixed(2)})` : "";
    fr.push({ line: 6, stage: 3, step: i,
      say: `第 <b>${i}</b> 步:grad=2(x−3),x ← x − lr·grad = <b>${xs}</b>${tail}。` });
  }
  const lastStep = path.length - 1;
  if (d.diverged) {
    fr.push({ line: 7, stage: 4, step: lastStep, say: `学习率 <b>${p.lr.toFixed(2)}</b> 过大,小球<b>越冲越远(发散)</b>!调小 lr 再演。` });
  } else {
    fr.push({ line: 7, stage: 4, step: lastStep, say: `${p.steps} 轮后 x ≈ <b>${d.final.toFixed(3)}</b>,逼近谷底 3。<b>这便是训练大模型的核心机制</b>。` });
  }
  return fr;
}

function note(stage, p, d) {
  if (d.diverged) return `学习率 <b>${p.lr.toFixed(2)}</b> 过大,小球<b>越冲越远(发散)</b>!这正是「步子太大」之祸。调小 lr 再看。`;
  switch (stage) {
    case 1: return `起点 <b>x = ${p.x0.toFixed(1)}</b>。谷底在 x=3,看小球离谷底多远。`;
    case 2: return `学习率 <b>lr = ${p.lr.toFixed(2)}</b>:每步迈多大。太小则慢,太大则飞。拖动它试试两端。`;
    case 3: return `迭代 ${p.steps} 轮,每轮:grad=2(x−3),再 x ← x − lr·grad。金色淡点是历经的轨迹。`;
    case 4: return `${p.steps} 轮后 x ≈ <b>${d.final.toFixed(3)}</b>,逼近谷底 3。<b>这便是训练大模型的核心机制</b>——只是 x 换成了亿万个数同时下坡。`;
    default: return "以指掠过左侧经文,或拖动起点/学习率/步数。";
  }
}

const pyCode = `x = 0.0
lr = 0.1
for step in range(15):
    grad = 2 * (x - 3)
    x = x - lr * grad
print(round(x, 4))`;

export const gradientDemo = {
  title: "演武场 · 滚珠寻谷",
  intro: "目标:寻得令 <b>y=(x−3)²</b> 最小之 x。小球只凭<b>脚下坡度(梯度)</b>下行。" +
    "拖动<b>起点、学习率、步数</b>三枚朱字,轨迹<b>即时</b>重演——尤其把学习率拖到最大,看它如何发散。",
  bridge: {
    prev: ["函数曲线", "斜率"],
    current: ["grad=2(x-3)", "lr*grad", "x=x-lr*grad"],
    next: ["PyTorch autograd", "神经网络训练", "GPT loss 下降"],
    sources: ["llm-volume/ch01-math/code/gradient_descent.py"],
  },
  lines, paramDefs, initial, compute, Viz, note, pyCode, frames,
};


export default { name: 'GewuGradientDescentDemo' }
</script>
