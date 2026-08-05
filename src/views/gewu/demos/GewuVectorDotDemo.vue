<script lang="jsx">
// 第一式 · 向量点诀:拖动 a、b 的分量,点积与箭头实时重算
const lines = [
  { text: "import numpy as np", stage: 0 },
  { text: "", stage: 0 },
  { text: "a = np.array([{{ax}}, {{ay}}])   # 向量 a", stage: 1 },
  { text: "b = np.array([{{bx}}, {{by}}])   # 向量 b", stage: 2 },
  { text: "", stage: 2 },
  { text: "# 点积 = 对应位置相乘再相加", stage: 3 },
  { text: "dot = a[0]*b[0] + a[1]*b[1]", stage: 3 },
  { text: "print(dot)", stage: 4 },
];

const paramDefs = {
  ax: { min: -3, max: 3, step: 1 }, ay: { min: -3, max: 3, step: 1 },
  bx: { min: -3, max: 3, step: 1 }, by: { min: -3, max: 3, step: 1 },
};
const initial = { ax: 2, ay: 1, bx: 1, by: 2 };

function compute(p) {
  const t1 = p.ax * p.bx;
  const t2 = p.ay * p.by;
  const dot = t1 + t2;
  const na = Math.hypot(p.ax, p.ay), nb = Math.hypot(p.bx, p.by);
  const cos = na && nb ? dot / (na * nb) : 0;
  return { t1, t2, dot, cos };
}

const O = 180, S = 44;
const px = (x) => O + x * S;
const py = (y) => O - y * S;
const vectorLabel = (x, y) => ({
  x: x > 270 ? x - 7 : x + 7,
  y: y < 42 ? y + 18 : y - 6,
  anchor: x > 270 ? "end" : "start",
});

function Viz({ params: p, derived: d, stage }) {
  const aLabel = vectorLabel(px(p.ax), py(p.ay));
  const bLabel = vectorLabel(px(p.bx), py(p.by));
  return (
    <svg viewBox="0 0 360 430" width="360" height="430">
      {[-3, -2, -1, 1, 2, 3].map((g) => (
        <g key={g}>
          <line x1={px(g)} y1={20} x2={px(g)} y2={340} stroke="#cdb98e" stroke-width="0.6" />
          <line x1={20} y1={py(g)} x2={340} y2={py(g)} stroke="#cdb98e" stroke-width="0.6" />
        </g>
      ))}
      <line x1={20} y1={O} x2={340} y2={O} stroke="#6b3a2e" stroke-width="1.2" />
      <line x1={O} y1={20} x2={O} y2={340} stroke="#6b3a2e" stroke-width="1.2" />
      <defs>
        <marker id="ah1" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="#9e2b1e" /></marker>
        <marker id="ah2" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto">
          <path d="M0,0 L7,3 L0,6 Z" fill="#3f6b4f" /></marker>
      </defs>

      <line x1={px(0)} y1={py(0)} x2={px(p.ax)} y2={py(p.ay)}
        stroke="#9e2b1e" stroke-width={stage === 1 || stage === 3 ? 4 : 2.5}
        marker-end="url(#ah1)" style={{ transition: "all .15s" }} />
      <text x={aLabel.x} y={aLabel.y} text-anchor={aLabel.anchor} fill="#9e2b1e" font-size="14">
        a [{p.ax},{p.ay}]</text>

      <line x1={px(0)} y1={py(0)} x2={px(p.bx)} y2={py(p.by)}
        stroke="#3f6b4f" stroke-width={stage === 2 || stage === 3 ? 4 : 2.5}
        marker-end="url(#ah2)" style={{ transition: "all .15s" }} />
      <text x={bLabel.x} y={bLabel.y} text-anchor={bLabel.anchor} fill="#3f6b4f" font-size="14">
        b [{p.bx},{p.by}]</text>

      <line x1={26} y1={356} x2={334} y2={356} stroke="#cdb98e" stroke-width="0.8" />
      <text x={26} y={378} fill="#9e2b1e" font-size="12">对应位相乘</text>
      <text x={26} y={402} fill="#5a4a36" font-size="12">
        第1维: {p.ax} × {p.bx} = <tspan fill="#3f6b4f">{d.t1}</tspan>
      </text>
      <text x={176} y={402} fill="#5a4a36" font-size="12">
        第2维: {p.ay} × {p.by} = <tspan fill="#3f6b4f">{d.t2}</tspan>
      </text>
      <text x={26} y={424} fill="#2b2117" font-size="14">
        dot = {d.t1} + {d.t2} = <tspan fill="#9c7b2e" font-weight="bold">{d.dot}</tspan>
        <tspan fill="#8a7656" font-size="11">  cos≈{d.cos.toFixed(2)}</tspan>
      </text>
    </svg>
  );
}

// 演法序列:逐招推进,每招由当前参数实时算出。
function frames(p, d) {
  return [
    { line: 1, stage: 0, say: "引入 numpy。先看舞台:横纵两轴的演武场。" },
    { line: 3, stage: 1, say: `落子第一向量 <b>a = [${p.ax}, ${p.ay}]</b>,红箭出鞘。` },
    { line: 4, stage: 2, say: `落子第二向量 <b>b = [${p.bx}, ${p.by}]</b>,绿箭随至。` },
    { line: 7, stage: 3, say: `逐位相乘再相加:${p.ax}×${p.bx} + ${p.ay}×${p.by} = <b>${d.t1} + ${d.t2} = ${d.dot}</b>。` },
    { line: 8, stage: 4, say: `输出点积 <b>${d.dot}</b>(cos≈${d.cos.toFixed(2)})。两箭越同向,此数越大——注意力机制由此而来。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "引入 numpy。向量便是「一列数」,在演武场中化作一支箭。";
    case 1: return `定义向量 <b>a = [${p.ax}, ${p.ay}]</b>。试拖动这两个朱字,看红箭随之转向。`;
    case 2: return `定义向量 <b>b = [${p.bx}, ${p.by}]</b>。绿箭即此。`;
    case 3: return `逐位相乘再相加:${p.ax}×${p.bx} + ${p.ay}×${p.by} = <b>${d.t1} + ${d.t2} = ${d.dot}</b>。两箭越同向,此数越大。`;
    case 4: return `输出 <b>${d.dot}</b>。这正是「相似度」之雏形——注意力机制便由此而来。`;
    default: return "以指掠过左侧经文,或拖动朱字。";
  }
}

const pyCode = `import numpy as np
a = np.array([2, 1])
b = np.array([1, 2])
dot = a[0]*b[0] + a[1]*b[1]
print("dot =", dot)`;

export const vectorDemo = {
  title: "演武场 · 两箭交锋",
  intro: "向量即「一列数」,可画作箭。点积是<b>对应位置相乘再相加</b>。" +
    "拖动经文中的<b>朱红数字</b>,右侧箭头与点积<b>即时重算</b>——此为悬镜即形。",
  bridge: {
    prev: ["Python 数组", "二维坐标"],
    current: ["逐位相乘", "乘积求和", "相似度雏形"],
    next: ["矩阵乘", "attention 中的 Q·K"],
    sources: ["llm-volume/ch01-math/code/vectors.py"],
  },
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode,
};


export default { name: 'GewuVectorDotDemo' }
</script>
