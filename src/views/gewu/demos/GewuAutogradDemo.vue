<script lang="jsx">
// 卷二 · 第二式 · 反求之诀:autograd 自动求导
// 拖动 x,看正向 y=(x-3)^2 与反向梯度 dy/dx=2(x-3) 实时变化
const lines = [
  { text: "x = torch.tensor({{x}}, requires_grad=True)", stage: 1 },
  { text: "", stage: 1 },
  { text: "y = (x - 3) ** 2     # 正向计算", stage: 2 },
  { text: "y.backward()         # 反向:自动求梯度", stage: 3 },
  { text: "", stage: 3 },
  { text: "print(x.grad)        # dy/dx = 2*(x-3)", stage: 4 },
];

const paramDefs = {
  x: { min: -2, max: 8, step: 0.5, fmt: (v) => v.toFixed(1) },
};
const initial = { x: 0 };

function compute(p) {
  const u = p.x - 3;
  const y = (p.x - 3) ** 2;
  const grad = 2 * (p.x - 3);
  return { u, y, grad, localSquare: 2 * u, localMinus: 1 };
}

const X0 = 40, X1 = 340, Y0 = 30, Y1 = 240;
const clampX = (x) => Math.max(-2.5, Math.min(8.5, x));
const fx = (x) => X0 + ((clampX(x) + 2.5) / 11) * (X1 - X0);
const fy = (y) => Y1 - (Math.min(y, 28) / 28) * (Y1 - Y0);
const curveY = (x) => (x - 3) ** 2;

const PATH = (() => {
  let d = "";
  for (let i = 0; i <= 80; i++) {
    const x = -2.5 + (i / 80) * 11;
    d += (i === 0 ? "M" : "L") + fx(x).toFixed(1) + "," + fy(curveY(x)).toFixed(1) + " ";
  }
  return d;
})();

function Viz({ params: p, derived: d, stage }) {
  const px = fx(p.x), py = fy(curveY(p.x));
  const showTangent = stage >= 3;
  // 切线:斜率 = grad,在屏幕坐标里取一小段
  const dx = 1.1;
  const x2 = p.x + dx, y2 = curveY(p.x) + d.grad * dx;
  const x3 = p.x - dx, y3 = curveY(p.x) - d.grad * dx;
  const dir = d.grad > 0 ? "↗ 正(右侧上坡)" : d.grad < 0 ? "↘ 负(左侧上坡)" : "0(谷底)";
  return (
    <svg viewBox="0 0 360 410" width="360" height="410">
      <path d={PATH} fill="none" stroke="#6b3a2e" stroke-width="2" />
      <line x1={fx(3)} y1={fy(0)} x2={fx(3)} y2={Y1 + 8} stroke="#3f6b4f"
        stroke-dasharray="4 4" opacity="0.6" />
      <text x={fx(3) - 14} y={Y1 + 22} fill="#3f6b4f" font-size="12">x=3</text>

      {/* 切线 = 梯度的几何含义 */}
      {showTangent && (
        <line x1={fx(x3)} y1={fy(y3)} x2={fx(x2)} y2={fy(y2)}
          stroke="#9c7b2e" stroke-width="2.5" opacity="0.9"
          style={{ transition: "all .2s" }} />
      )}

      {/* 当前点 */}
      <circle cx={px} cy={py} r="7" fill="#9e2b1e" style={{ transition: "all .2s" }} />

      <text x={X0} y={20} fill="#8a7656" font-size="13">y = (x − 3)²</text>

      <text x={26} y={272} fill="#2b2117" font-size="15">
        正向 y = <tspan fill="#9e2b1e" font-weight="700">{d.y.toFixed(2)}</tspan>
        <tspan dx="14">反向 x.grad = </tspan>
        <tspan fill="#9c7b2e" font-weight="700">{d.grad.toFixed(1)}</tspan>
      </text>
      {showTangent && (
        <text x={26} y={252} fill="#8a7656" font-size="12">
          梯度即此切线斜率 · {dir}
        </text>
      )}

      <line x1={26} y1={292} x2={334} y2={292} stroke="#cdb98e" stroke-width="0.8" />
      <text x={26} y={316} fill="#9e2b1e" font-size="12">计算图反传</text>
      <text x={26} y={340} fill="#5a4a36" font-size="11">
        x={p.x.toFixed(1)} → u=x−3=<tspan fill="#3f6b4f">{d.u.toFixed(1)}</tspan> → y=u²=<tspan fill="#9e2b1e">{d.y.toFixed(2)}</tspan>
      </text>
      {stage >= 3 && (
        <>
          <text x={26} y={364} fill="#5a4a36" font-size="11">
            dy/du = 2u = <tspan fill="#3f6b4f">{d.localSquare.toFixed(1)}</tspan>
          </text>
          <text x={180} y={364} fill="#5a4a36" font-size="11">
            du/dx = 1
          </text>
          <text x={26} y={388} fill="#5a4a36" font-size="11">
            dy/dx = dy/du × du/dx = <tspan fill="#9c7b2e">{d.grad.toFixed(1)}</tspan>
          </text>
        </>
      )}
    </svg>
  );
}

function frames(p, d) {
  return [
    { line: 1, stage: 1, say: `标记 <b>x = ${p.x.toFixed(1)}</b>,<b>requires_grad=True</b> 告诉 PyTorch:记录用到 x 的运算。` },
    { line: 3, stage: 2, say: `正向计算 <b>y = (x−3)² = ${d.y.toFixed(2)}</b>。这一步和普通算式无异。` },
    { line: 4, stage: 3, say: `一句 <b>y.backward()</b> 沿计算图倒推,梯度即金色切线的斜率。` },
    { line: 6, stage: 4, say: `读出 <b>x.grad = ${d.grad.toFixed(1)}</b>,正是手算 2(x−3) = 2(${p.x.toFixed(1)}−3)。无需自己推导。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 1: return `<b>requires_grad=True</b>:这一步让 x 成为「可求导」的量。拖动它。`;
    case 2: return `正向 <b>y = (x−3)² = ${d.y.toFixed(2)}</b>。`;
    case 3: return `<b>y.backward()</b> 自动反向求导。金线斜率就是梯度。`;
    case 4: return `<b>x.grad = ${d.grad.toFixed(1)}</b> = 2(x−3)。梯度告诉我们「往哪边调」——这正是训练的基石。`;
    default: return "拖动 x,看正向 y 与反向梯度如何联动。";
  }
}

const pyCode = `import torch
x = torch.tensor(0.0, requires_grad=True)
y = (x - 3) ** 2
y.backward()
print(x.grad)   # tensor(-6.)`;

export const autogradDemo = {
  title: "演武场 · 正反相生",
  intro: "autograd 是 PyTorch 的核心魔法:你只写<b>正向</b>,它自动算<b>梯度</b>。" +
    "拖动 <b>x</b>,左看正向 y 之值,右看反向梯度(金色切线斜率)。谷底 x=3 处梯度为 0。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode,
  bridge: {
    prev: ["卷一梯度下降", "链式法则直觉"],
    current: ["正向记录计算图", "backward 反向乘局部梯度"],
    next: ["loss.backward()", "优化器更新参数"],
    sources: ["llm-volume/ch02-pytorch/code/autograd_intro.py"],
  },
  localCmd: "cd llm-volume/ch02-pytorch/code && python3 autograd_intro.py",
};


export default { name: 'GewuAutogradDemo' }
</script>
