<script lang="jsx">
// 第三式 · 柔息归元:拖动三个打分,softmax 的柱状图实时归一化
const lines = [
  { text: "import numpy as np", stage: 0 },
  { text: "", stage: 0 },
  { text: "scores = np.array([{{s0}}, {{s1}}, {{s2}}])  # 三个候选字的打分", stage: 1 },
  { text: "", stage: 1 },
  { text: "e = np.exp(scores)      # 先取指数,拉开差距", stage: 2 },
  { text: "probs = e / e.sum()     # 再除以总和,归一化", stage: 3 },
  { text: "print(probs)", stage: 4 },
];

const paramDefs = {
  s0: { min: 0, max: 6, step: 0.5, fmt: (v) => v.toFixed(1) },
  s1: { min: 0, max: 6, step: 0.5, fmt: (v) => v.toFixed(1) },
  s2: { min: 0, max: 6, step: 0.5, fmt: (v) => v.toFixed(1) },
};
const initial = { s0: 2.0, s1: 1.0, s2: 0.5 };
const LABELS = ["猫", "狗", "鱼"];

function compute(p) {
  const s = [p.s0, p.s1, p.s2];
  const e = s.map((v) => Math.exp(v));
  const sum = e.reduce((a, b) => a + b, 0);
  const probs = e.map((v) => v / sum);
  return { s, e, probs, sum };
}

const BW = 64, GAP = 38, BASE = 248, MAXH = 178;

function Viz({ derived: d, stage }) {
  const mode = stage <= 1 ? "score" : stage === 2 ? "exp" : "prob";
  const vals = mode === "score" ? d.s : mode === "exp" ? d.e : d.probs;
  const mx = mode === "score" ? 6 : mode === "exp" ? Math.max(...d.e) * 1.1 : 1;
  return (
    <svg viewBox="0 0 360 420" width="360" height="420">
      <line x1={28} y1={BASE} x2={344} y2={BASE} stroke="#6b3a2e" stroke-width="1.2" />
      {mode === "prob" && (
        <>
          <line x1={28} y1={BASE - MAXH} x2={344} y2={BASE - MAXH}
            stroke="#9e2b1e" stroke-dasharray="4 4" opacity="0.6" />
          <text x={306} y={BASE - MAXH - 5} fill="#9e2b1e" font-size="12">1.0</text>
        </>
      )}
      {vals.map((v, i) => {
        const h = Math.max(0, (v / mx) * MAXH);
        const x = 58 + i * (BW + GAP);
        const fill = mode === "prob" ? "#3f6b4f" : mode === "exp" ? "#9c7b2e" : "#9e2b1e";
        return (
          <g key={i}>
            <rect x={x} y={BASE - h} width={BW} height={h} rx="3" fill={fill}
              style={{ transition: "all .35s ease" }} />
            <text x={x + BW / 2} y={BASE - h - 7} fill="#2b2117" font-size="14"
              text-anchor="middle">
              {mode === "prob" ? (v * 100).toFixed(0) + "%" : v.toFixed(2)}
            </text>
            <text x={x + BW / 2} y={BASE + 20} fill="#5a4a36" font-size="16"
              text-anchor="middle">{LABELS[i]}</text>
          </g>
        );
      })}
      <text x={28} y={26} fill="#8a7656" font-size="13">
        {mode === "score" ? "原始打分 (logits)" : mode === "exp" ? "取 exp 之后" : "归一化为概率 (和=1)"}
      </text>

      <line x1={24} y1={292} x2={336} y2={292} stroke="#cdb98e" stroke-width="0.8" />
      <text x={24} y={316} fill="#9e2b1e" font-size="12">逐元素 softmax</text>
      <text x={24} y={338} fill="#5a4a36" font-size="10.5">候选</text>
      <text x={84} y={338} fill="#5a4a36" font-size="10.5">score</text>
      <text x={142} y={338} fill="#5a4a36" font-size="10.5">exp(score)</text>
      <text x={232} y={338} fill="#5a4a36" font-size="10.5">exp / sum</text>
      {LABELS.map((lab, i) => (
        <g key={lab}>
          <text x={24} y={362 + i * 18} fill="#5a4a36" font-size="10.5">{lab}</text>
          <text x={84} y={362 + i * 18} fill="#9e2b1e" font-size="10.5">{d.s[i].toFixed(1)}</text>
          <text x={142} y={362 + i * 18} fill="#9c7b2e" font-size="10.5">{d.e[i].toFixed(2)}</text>
          <text x={232} y={362 + i * 18} fill="#3f6b4f" font-size="10.5">
            {d.e[i].toFixed(2)} / {d.sum.toFixed(2)} = {(d.probs[i] * 100).toFixed(1)}%
          </text>
        </g>
      ))}
    </svg>
  );
}

function frames(p, d) {
  return [
    { line: 1, stage: 0, say: "softmax 乃将「打分」化作「概率」之法,大模型吐字前的最后一道工序。" },
    { line: 3, stage: 1, say: `模型给三字打分:猫=${d.s[0].toFixed(1)}、狗=${d.s[1].toFixed(1)}、鱼=${d.s[2].toFixed(1)}。` },
    { line: 5, stage: 2, say: "第一招 · 取 <b>exp</b>(指数):将差距放大,且令各值皆正。" },
    { line: 6, stage: 3, say: `第二招 · 除以总和(${d.sum.toFixed(2)}):三柱相加正好 <b>= 1</b>,化作真概率。` },
    { line: 7, stage: 4, say: `成:猫 <b>${(d.probs[0]*100).toFixed(0)}%</b>、狗 ${(d.probs[1]*100).toFixed(0)}%、鱼 ${(d.probs[2]*100).toFixed(0)}%。打分差距越大,分布越尖。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "softmax 乃将「打分」化作「概率」之法,大模型吐字前的最后一道工序。";
    case 1: return `模型给三字打分:猫=${d.s[0].toFixed(1)}、狗=${d.s[1].toFixed(1)}、鱼=${d.s[2].toFixed(1)}。拖动朱字试试。`;
    case 2: return "先对每个分数取 <b>exp</b>(指数),将差距<b>放大</b>,且保证皆为正数。";
    case 3: return `再除以总和(${d.sum.toFixed(2)})——三柱相加正好 <b>= 1</b>,成为真概率。`;
    case 4: return `结果:猫 <b>${(d.probs[0]*100).toFixed(0)}%</b>、狗 ${(d.probs[1]*100).toFixed(0)}%、鱼 ${(d.probs[2]*100).toFixed(0)}%。打分差距越大,分布越「尖」。`;
    default: return "以指掠过左侧经文,或拖动打分。";
  }
}

const pyCode = `import numpy as np
scores = np.array([2.0, 1.0, 0.5])
e = np.exp(scores)
probs = e / e.sum()
print(probs)`;

export const softmaxDemo = {
  title: "演武场 · 化分为率",
  intro: "softmax 两步:<b>① 取指数</b>(拉开差距)→ <b>② 除以总和</b>(令各值相加为 1)。" +
    "拖动三个<b>打分朱字</b>,柱高随之<b>即时</b>归元。",
  bridge: {
    prev: ["指数函数", "概率和为 1"],
    current: ["逐元素 exp", "总和归一", "概率分布"],
    next: ["语言模型输出概率", "attention 权重", "采样策略"],
    sources: ["llm-volume/ch01-math/code/softmax.py"],
  },
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode,
};


export default { name: 'GewuSoftmaxDemo' }
</script>
