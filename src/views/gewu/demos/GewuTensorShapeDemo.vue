<script lang="jsx">
// 卷二 · 第一式 · 形合之诀:矩阵乘法的形状规则 (a,k)@(k,b)=(a,b)
const lines = [
  { text: "import torch", stage: 0 },
  { text: "", stage: 0 },
  { text: "A = torch.randn({{m}}, {{k1}})   # 形状 (m, k1)", stage: 1 },
  { text: "B = torch.randn({{k2}}, {{n}})   # 形状 (k2, n)", stage: 2 },
  { text: "", stage: 2 },
  { text: "out = A @ B          # 需 k1 == k2", stage: 3 },
  { text: "print(out.shape)", stage: 4 },
];

const paramDefs = {
  m:  { min: 1, max: 4, step: 1 }, k1: { min: 1, max: 4, step: 1 },
  k2: { min: 1, max: 4, step: 1 }, n:  { min: 1, max: 4, step: 1 },
};
const initial = { m: 2, k1: 3, k2: 3, n: 2 };

function compute(p) {
  const ok = p.k1 === p.k2;
  const terms = Array.from({ length: Math.min(p.k1, p.k2) }, (_, i) => `A[0,${i}]×B[${i},0]`);
  return { ok, terms };
}

const CELL = 22;
function gridCells(ox, oy, rows, cols, color, lit) {
  const out = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      out.push(<rect key={r + "-" + c} x={ox + c * CELL} y={oy + r * CELL}
        width={CELL - 3} height={CELL - 3} rx="2" fill={color}
        opacity={lit ? 0.9 : 0.18} style={{ transition: "all .25s" }} />);
  return out;
}

function Viz({ params: p, derived: d, stage }) {
  const ok = d.ok;
  const aLit = stage >= 1, bLit = stage >= 2, rLit = stage >= 3 && ok;
  const matchColor = ok ? "#3f6b4f" : "#9e2b1e";
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      {/* A */}
      <text x={30} y={42} fill="#9e2b1e" font-size="13">A ({p.m}×{p.k1})</text>
      {gridCells(30, 50, p.m, p.k1, "#9e2b1e", aLit)}

      <text x={172} y={120} fill="#5a4a36" font-size="22">@</text>

      {/* B */}
      <text x={210} y={42} fill="#3f6b4f" font-size="13">B ({p.k2}×{p.n})</text>
      {gridCells(210, 50, p.k2, p.n, "#3f6b4f", bLit)}

      {/* 中间维匹配指示 */}
      <text x={30} y={200} fill={matchColor} font-size="14">
        中维:k1={p.k1} {ok ? "=" : "≠"} k2={p.k2}
      </text>
      <text x={30} y={222} fill={matchColor} font-size="15" font-weight="700">
        {ok ? "✓ 形状相合,可乘" : "✗ 形状不合,会报错"}
      </text>

      {/* 结果 */}
      {ok && (
        <>
          <text x={210} y={200} fill="#9c7b2e" font-size="13">
            out ({p.m}×{p.n})
          </text>
          {gridCells(210, 208, p.m, p.n, "#9c7b2e", rLit)}
        </>
      )}

      {ok && (
        <>
          <line x1={30} y1={252} x2={332} y2={252} stroke="#cdb98e" stroke-width="0.8" />
          <text x={30} y={272} fill="#9e2b1e" font-size="11.5">一个输出格子的来源</text>
          <text x={30} y={292} fill="#5a4a36" font-size="10.5">
            out[0,0] = {d.terms.join(" + ")}
          </text>
        </>
      )}

      <text x={30} y={20} fill="#8a7656" font-size="13">
        (a,k) @ (k,b) → (a,b):中间那个 k 必须相等
      </text>
    </svg>
  );
}

function frames(p, d) {
  return [
    { line: 1, stage: 0, say: "PyTorch 一切皆 <b>Tensor</b>。最关键的属性是<b>形状 shape</b>。" },
    { line: 3, stage: 1, say: `造矩阵 <b>A</b>,形状 <b>(${p.m}, ${p.k1})</b> —— ${p.m} 行 ${p.k1} 列。` },
    { line: 4, stage: 2, say: `造矩阵 <b>B</b>,形状 <b>(${p.k2}, ${p.n})</b>。` },
    { line: 6, stage: 3, say: d.ok
      ? `做 <b>A @ B</b>:中维 k1=${p.k1} 与 k2=${p.k2} 相等,合!结果形状 <b>(${p.m}, ${p.n})</b>。`
      : `中维 k1=${p.k1} ≠ k2=${p.k2},<b>形状不合</b>,这一步会报错。拖动朱字让两者相等。` },
    { line: 7, stage: 4, say: d.ok
      ? `打印形状:<b>torch.Size([${p.m}, ${p.n}])</b>。记住口诀:(a,k)@(k,b)=(a,b)。`
      : `因形状不合,程序在上一行已抛出 RuntimeError。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "Tensor 就是会自动求导、能上 GPU 的 NumPy 数组。先看它的<b>形状</b>。";
    case 1: return `矩阵 <b>A</b> 形状 <b>(${p.m}, ${p.k1})</b>。拖动朱字改变行列数。`;
    case 2: return `矩阵 <b>B</b> 形状 <b>(${p.k2}, ${p.n})</b>。`;
    case 3: return d.ok
      ? `A@B 可行:中维相等,结果 <b>(${p.m}, ${p.n})</b>。`
      : `中维 ${p.k1} ≠ ${p.k2},<b>不可乘</b>。这是新手最常见的报错。`;
    case 4: return d.ok ? `输出 <b>(${p.m}, ${p.n})</b>。多数 bug 都是形状对不上,养成盯 shape 的习惯。`
      : "把 k1、k2 拖成相等,错误即消。";
    default: return "拖动朱字改变四个维度,看形状能否相乘。";
  }
}

const pyCode = `import torch
A = torch.randn(2, 3)
B = torch.randn(3, 2)
out = A @ B
print(out.shape)   # torch.Size([2, 2])`;

export const shapeDemo = {
  title: "演武场 · 形合则通",
  intro: "PyTorch 里最常见的报错,是矩阵<b>形状对不上</b>。规则只有一句:" +
    "<b>(a,k) @ (k,b) = (a,b)</b>,中间的 k 必须相等。拖动四个朱字,看何时相合、何时报错。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode,
  bridge: {
    prev: ["卷一矩阵乘"],
    current: ["shape 检查", "一个输出格子来自一行乘一列"],
    next: ["Linear 层", "Q/K/V 投影", "训练 batch"],
    sources: ["llm-volume/ch02-pytorch/code/tensors.py"],
  },
  localCmd: "cd llm-volume/ch02-pytorch/code && python3 tensors.py",
};


export default { name: 'GewuTensorShapeDemo' }
</script>
