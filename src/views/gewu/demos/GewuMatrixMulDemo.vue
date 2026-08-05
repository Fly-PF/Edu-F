<script lang="jsx">
// 第二式 · 矩阵变形:拖动 W 的四个元素,三个点的变换实时改变
const lines = [
  { text: "import numpy as np", stage: 0 },
  { text: "", stage: 0 },
  { text: "words = np.array([[1, 0],", stage: 1 },
  { text: "                  [0, 1],", stage: 1 },
  { text: "                  [1, 1]])   # 三个词向量", stage: 1 },
  { text: "", stage: 1 },
  { text: "W = np.array([[{{w00}}, {{w01}}],", stage: 2 },
  { text: "              [{{w10}}, {{w11}}]])   # 变换矩阵", stage: 2 },
  { text: "", stage: 2 },
  { text: "out = words @ W   # 每个词都被 W 变换", stage: 3 },
  { text: "print(out)", stage: 4 },
];

const paramDefs = {
  w00: { min: -3, max: 3, step: 1, label: 'W[0,0]' }, w01: { min: -3, max: 3, step: 1, label: 'W[0,1]' },
  w10: { min: -3, max: 3, step: 1, label: 'W[1,0]' }, w11: { min: -3, max: 3, step: 1, label: 'W[1,1]' },
};
const initial = { w00: 2, w01: 0, w10: 0, w11: 3 };

const WORDS = [[1, 0], [0, 1], [1, 1]];
const COLORS = ["#9e2b1e", "#3f6b4f", "#9c7b2e"];

function compute(p) {
  const W = [[p.w00, p.w01], [p.w10, p.w11]];
  const out = WORDS.map(([x, y]) => [
    x * W[0][0] + y * W[1][0],
    x * W[0][1] + y * W[1][1],
  ]);
  const terms = WORDS.map(([x, y]) => ({
    x,
    y,
    oxTerms: [x * W[0][0], y * W[1][0]],
    oyTerms: [x * W[0][1], y * W[1][1]],
  }));
  return { W, out, terms };
}

const O = 40, S = 36, H = 320;
const px = (x) => O + (x + 1) * S;
const py = (y) => H - O - (y + 1) * S;

function Viz({ params: p, derived: d, stage, changed }) {
  const showTransformed = stage >= 3 || changed;
  return (
    <svg viewBox="0 0 360 430" width="360" height="430">
      {[-1, 0, 1, 2, 3, 4, 5].map((g) => (
        <g key={g}>
          <line x1={px(g)} y1={10} x2={px(g)} y2={H} stroke="#cdb98e" stroke-width="0.6" />
          <line x1={10} y1={py(g)} x2={310} y2={py(g)} stroke="#cdb98e" stroke-width="0.6" />
        </g>
      ))}
      <line x1={px(0)} y1={10} x2={px(0)} y2={H} stroke="#6b3a2e" stroke-width="1.2" />
      <line x1={10} y1={py(0)} x2={310} y2={py(0)} stroke="#6b3a2e" stroke-width="1.2" />

      <text x={px(0) + 50} y={24} fill="#8a7656" font-size="13">
        {showTransformed ? "变换后 (words @ W)" : "原始位置"}
      </text>

      {WORDS.map((w, i) => {
        const [x, y] = showTransformed ? d.out[i] : w;
        return (
          <g key={i} style={{ transition: "all .4s ease" }}>
            <line x1={px(0)} y1={py(0)} x2={px(x)} y2={py(y)}
              stroke={COLORS[i]} stroke-width="2" opacity="0.45" />
            <circle cx={px(x)} cy={py(y)} r="6" fill={COLORS[i]} />
            <text x={px(x) + 8} y={py(y) - 5} fill={COLORS[i]} font-size="12">
              [{x},{y}]</text>
          </g>
        );
      })}

      <line x1={18} y1={326} x2={342} y2={326} stroke="#cdb98e" stroke-width="0.8" />
      <text x={18} y={348} fill="#9e2b1e" font-size="12">每个输出坐标都是一次点积</text>
      {WORDS.map((word, i) => {
        const t = d.terms[i];
        const out = d.out[i];
        const y = 370 + i * 20;
        return (
          <text key={i} x={18} y={y} fill={COLORS[i]} font-size="10.5">
            [{t.x},{t.y}] → x'={t.x}×{p.w00}+{t.y}×{p.w10}={out[0]},
            <tspan fill="#5a4a36"> y'={t.x}×{p.w01}+{t.y}×{p.w11}={out[1]}</tspan>
          </text>
        );
      })}
    </svg>
  );
}

function frames(p, d) {
  return [
    { line: 1, stage: 0, say: "矩阵即「一叠向量」,亦是一张数表。" },
    { line: 3, stage: 1, say: "三个词向量落于平面:朱、绿、金三点立于原位。" },
    { line: 7, stage: 2, say: `请出变换矩阵 <b>W=[[${p.w00},${p.w01}],[${p.w10},${p.w11}]]</b>,蓄势待发。` },
    { line: 10, stage: 3, say: `施展 <b>words @ W</b>:三点同时被搬移。金点 [1,1] → <b>[${d.out[2][0]},${d.out[2][1]}]</b>。` },
    { line: 11, stage: 4, say: "神经网络每一层皆如此:<b>用一个矩阵重新摆放所有向量</b>。训练即调 W 中之数。" },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "矩阵即「一叠向量」,亦是一张数表。";
    case 1: return "三个词向量画于平面:朱、绿、金三点。";
    case 2: return `变换矩阵 <b>W=[[${p.w00},${p.w01}],[${p.w10},${p.w11}]]</b>。试拖动其中朱字,体会不同变换之力。`;
    case 3: return `执行 <b>words @ W</b>:三点同时被搬移。金点 [1,1] → <b>[${d.out[2][0]},${d.out[2][1]}]</b>。`;
    case 4: return "神经网络每一层皆如此:<b>用一个矩阵重新摆放所有向量</b>。所谓「训练」,正是在调 W 中之数。";
    default: return "以指掠过左侧经文,或拖动 W 中朱字。";
  }
}

const pyCode = `import numpy as np
words = np.array([[1,0],[0,1],[1,1]])
W = np.array([[2,0],[0,3]])
print(words @ W)`;

export const matrixDemo = {
  title: "演武场 · 点随阵移",
  intro: "矩阵乘法 <b>words @ W</b> 的几何含义是<b>变换</b>。" +
    "拖动 W 中的<b>朱红数字</b>,看三点如何被同一矩阵<b>即时</b>搬移。",
  bridge: {
    prev: ["卷一第一式点积"],
    current: ["行向量 @ 矩阵", "新坐标由两次点积得到"],
    next: ["Embedding 查表", "Q/K/V 投影", "神经网络线性层"],
    sources: ["llm-volume/ch01-math/code/matrices.py"],
  },
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode,
  challenge: {
    prompt: '同一个 W 会如何作用于 words 中的三个词向量？',
    options: ['只改变最后一个向量', '每个向量都会乘上同一个 W', '只有播放到最后一步才会参与计算'],
    correct: 1,
    feedback: '正确：线性层共享同一组参数 W，所以同一种变换会施加到每个输入向量。',
    retry: '再看公式 words @ W：左侧的每一行都会与同一个 W 相乘。',
    transfer: '把 W 想成神经网络的一层：它为什么能对一句话中每个 token 使用同一套权重？',
  },
};


export default { name: 'GewuMatrixMulDemo' }
</script>
