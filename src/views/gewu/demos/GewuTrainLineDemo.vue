<script lang="jsx">
// 卷二 · 第三式 · 习得之诀:训练第一个网络 (训练五步循环)
// 拖动「目标斜率/截距/学习率/轮数」,看模型从 y=0 一步步学出那条线
const lines = [
  { text: "x, y = make_data()        # 真实规律 y={{tw}}x+{{tb}}", stage: 1 },
  { text: "model = nn.Linear(1, 1)   # 待学:w, b", stage: 1 },
  { text: "", stage: 1 },
  { text: "opt = SGD(model.parameters(), lr={{lr}})", stage: 2 },
  { text: "for epoch in range({{ep}}):", stage: 3 },
  { text: "    pred = model(x)        # 正向", stage: 3 },
  { text: "    loss = mse(pred, y)    # 算损失", stage: 3 },
  { text: "    opt.zero_grad()        # 清梯度", stage: 3 },
  { text: "    loss.backward()        # 反向", stage: 3 },
  { text: "    opt.step()             # 更新", stage: 3 },
  { text: "print(model.w, model.b)", stage: 4 },
];

const paramDefs = {
  tw: { min: -3, max: 3, step: 0.5, fmt: (v) => v.toFixed(1) },
  tb: { min: -3, max: 3, step: 0.5, fmt: (v) => v.toFixed(1) },
  lr: { min: 0.01, max: 0.7, step: 0.03, fmt: (v) => v.toFixed(2) },
  ep: { min: 0, max: 80, step: 1 },
};
const initial = { tw: 2, tb: 1, lr: 0.08, ep: 40 };

const XS = [-2, -1, 0, 1, 2];
function compute(p) {
  const ys = XS.map((x) => p.tw * x + p.tb);
  let w = 0, b = 0;
  const n = XS.length;
  const lossAt = (w, b) => {
    let s = 0;
    for (let i = 0; i < n; i++) { const e = w * XS[i] + b - ys[i]; s += e * e; }
    return s / n;
  };
  // hist[k] = 第 k 轮结束后的状态(hist[0] = 未训练)
  const hist = [{ w, b, loss: lossAt(w, b) }];
  const updates = [];
  for (let e = 0; e < p.ep; e++) {
    let gw = 0, gb = 0;
    for (let i = 0; i < n; i++) {
      const pred = w * XS[i] + b;
      const err = pred - ys[i];
      gw += 2 * err * XS[i]; gb += 2 * err;
    }
    gw /= n; gb /= n;
    const oldW = w, oldB = b;
    w -= p.lr * gw; b -= p.lr * gb;
    updates.push({ oldW, oldB, gw, gb, newW: w, newB: b, lossBefore: lossAt(oldW, oldB) });
    hist.push({ w, b, loss: lossAt(w, b) });
  }
  const loss = lossAt(w, b);
  return { w, b, loss, ys, hist, updates, diverged: !isFinite(w) || Math.abs(w) > 1e3 };
}

const O = 180, S = 40;
const px = (x) => O + x * S;
const py = (y) => O - y * S;

function Viz({ params: p, derived: d, stage, play }) {
  const hist = d.hist;
  const last = hist.length - 1;
  // 演法时按当前 epoch 取状态;否则取最终。
  const k = play && play.step != null ? Math.min(play.step, last) : last;
  const cur = hist[k];
  const upd = d.updates[Math.max(0, k - 1)];
  const showLearned = (play ? play.step > 0 : stage >= 3) && !d.diverged;
  const w = d.diverged ? 0 : cur.w, b = d.diverged ? 0 : cur.b;
  return (
    <svg viewBox="0 0 360 430" width="360" height="430">
      {[-3, -2, -1, 1, 2, 3].map((g) => (
        <g key={g}>
          <line x1={px(g)} y1={20} x2={px(g)} y2={330} stroke="#cdb98e" stroke-width="0.5" />
          <line x1={20} y1={py(g)} x2={340} y2={py(g)} stroke="#cdb98e" stroke-width="0.5" />
        </g>
      ))}
      <line x1={20} y1={O} x2={340} y2={O} stroke="#6b3a2e" stroke-width="1.2" />
      <line x1={O} y1={20} x2={O} y2={330} stroke="#6b3a2e" stroke-width="1.2" />

      {/* 目标直线(淡) */}
      <line x1={px(-3.2)} y1={py(p.tw * -3.2 + p.tb)} x2={px(3.2)} y2={py(p.tw * 3.2 + p.tb)}
        stroke="#3f6b4f" stroke-width="2" stroke-dasharray="5 4" opacity="0.55" />

      {/* 学得的直线:随 epoch 转动 */}
      {showLearned && (
        <line x1={px(-3.2)} y1={py(w * -3.2 + b)} x2={px(3.2)} y2={py(w * 3.2 + b)}
          stroke="#9e2b1e" stroke-width="2.8" style={{ transition: "all .2s" }} />
      )}

      {/* 数据点 */}
      {XS.map((x, i) => (
        <circle key={i} cx={px(x)} cy={py(d.ys[i])} r="5" fill="#9c7b2e" />
      ))}

      <text x={26} y={20} fill="#3f6b4f" font-size="12">┄ 目标 y={p.tw.toFixed(1)}x+{p.tb.toFixed(1)}</text>
      {showLearned && (
        <text x={26} y={310} fill="#9e2b1e" font-size="14">
          {d.diverged ? "发散!学习率过大"
            : `第${k}轮 y=${cur.w.toFixed(2)}x+${cur.b.toFixed(2)}  loss=${cur.loss.toFixed(3)}`}
        </text>
      )}

      <line x1={24} y1={326} x2={336} y2={326} stroke="#cdb98e" stroke-width="0.8" />
      <text x={24} y={350} fill="#9e2b1e" font-size="12">一次 SGD 更新</text>
      {upd ? (
        <>
          <text x={24} y={374} fill="#5a4a36" font-size="10.5">
            w: {upd.oldW.toFixed(3)} - {p.lr.toFixed(2)}×({upd.gw.toFixed(3)}) = <tspan fill="#3f6b4f">{upd.newW.toFixed(3)}</tspan>
          </text>
          <text x={24} y={396} fill="#5a4a36" font-size="10.5">
            b: {upd.oldB.toFixed(3)} - {p.lr.toFixed(2)}×({upd.gb.toFixed(3)}) = <tspan fill="#3f6b4f">{upd.newB.toFixed(3)}</tspan>
          </text>
          <text x={24} y={418} fill="#8a7656" font-size="10">
            梯度由所有样本误差平均得到;参数只按这两个公式移动。
          </text>
        </>
      ) : (
        <text x={24} y={374} fill="#8a7656" font-size="10.5">点演法后看每轮 w,b 如何被梯度推动。</text>
      )}
    </svg>
  );
}

function frames(p, d) {
  const last = d.hist.length - 1;   // = p.ep
  const fr = [
    { line: 1, stage: 1, step: 0, say: `备数据:真实规律 <b>y=${p.tw.toFixed(1)}x+${p.tb.toFixed(1)}</b>(金点)。模型 w,b 从 0 起步。` },
    { line: 4, stage: 2, step: 0, say: `选优化器 SGD,学习率 <b>lr=${p.lr.toFixed(2)}</b>。它替我们清梯度、迈步。` },
  ];
  if (d.diverged) {
    fr.push({ line: 11, stage: 4, step: last, say: `学习率过大,<b>发散</b>了!调小 lr 再演。` });
    return fr;
  }
  // 逐轮演法;轮数多时抽样,使总帧数 ≲ 20,播放不至太久。
  const stride = Math.max(1, Math.ceil(last / 18));
  for (let k = 1; k <= last; k += stride) {
    const h = d.hist[k];
    fr.push({ line: 7, stage: 3, step: k,
      say: `第 <b>${k}</b> 轮:正向→损失→反向→更新。红线 y=${h.w.toFixed(2)}x+${h.b.toFixed(2)},loss=${h.loss.toFixed(3)}。` });
  }
  fr.push({ line: 11, stage: 4, step: last,
    say: `${p.ep} 轮后学得 <b>y=${d.w.toFixed(2)}x+${d.b.toFixed(2)}</b>,逼近目标。从 2 个参数到亿万参数的 GPT,<b>训练流程一模一样</b>。` });
  return fr;
}

function note(stage, p, d) {
  switch (stage) {
    case 1: return `目标线 <b>y=${p.tw.toFixed(1)}x+${p.tb.toFixed(1)}</b>。模型并不知道这俩数,要自己学。`;
    case 2: return `学习率 <b>lr=${p.lr.toFixed(2)}</b>:每步迈多大。优化器封装了清零与更新两个坑。`;
    case 3: return d.diverged ? "学习率太大,红线<b>飞了</b>。把 lr 拖小些。"
      : `训练 <b>${p.ep}</b> 轮。拖动轮数,看红线从水平一点点转到与金线重合。`;
    case 4: return d.diverged ? "发散:调小 lr。" :
      `学得 <b>y=${d.w.toFixed(2)}x+${d.b.toFixed(2)}</b>。从 2 个参数到几十亿参数的 GPT,<b>训练流程一模一样</b>。`;
    default: return "拖动目标线/学习率/轮数,观察模型如何学出那条线。";
  }
}

const pyCode = `import torch, torch.nn as nn
x = torch.linspace(-2, 2, 5).unsqueeze(1)
y = 2 * x + 1
model = nn.Linear(1, 1)
opt = torch.optim.SGD(model.parameters(), lr=0.08)
for epoch in range(40):
    loss = nn.functional.mse_loss(model(x), y)
    opt.zero_grad(); loss.backward(); opt.step()
print(model.weight.item(), model.bias.item())`;

export const trainDemo = {
  title: "演武场 · 红线归位",
  intro: "训练五步:<b>正向 → 算损失 → 清梯度 → 反向 → 更新</b>,循环往复。" +
    "拖动<b>目标线、学习率、轮数</b>:轮数越多,红线越贴近金线。把 lr 拖大,看它如何发散。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  bridge: {
    prev: ["卷二 autograd", "卷一梯度下降"],
    current: ["pred=w*x+b", "loss=MSE", "w,b 按梯度更新"],
    next: ["训练 Embedding", "训练 GPT"],
    sources: ["llm-volume/ch02-pytorch/code/first_network.py"],
  },
  localCmd: "cd llm-volume/ch02-pytorch/code && python3 first_network.py",
};


export default { name: 'GewuTrainLineDemo' }
</script>
