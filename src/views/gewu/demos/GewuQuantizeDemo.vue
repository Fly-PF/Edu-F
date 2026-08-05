<script lang="jsx">
// 卷十三 · 第二式 · 化整为简:int8 量化 —— 每个数从 4 字节压到 1 字节,体积缩到 1/4
// 真实数据来自 ch13/quantization.py:256×256 权重,体积 25%、权重相对误差 0.0108、输出相对误差 0.0100
const MAXABS = 4.0;            // 这批权重的最大绝对值(标准正态 256×256 约 4)
const SCALE = MAXABS / 127.0;  // 最大绝对值映射到 127

const lines = [
  { text: "scale = abs(W).max() / 127     # 最大绝对值映射到 127", stage: 0 },
  { text: "w = {{w}}                       # 一个 float32 权重(拖朱字)", stage: 1 },
  { text: "q = round(w / scale)           # 缩放、四舍五入到整数台阶", stage: 2 },
  { text: "w_hat = q * scale              # 用时乘回 scale 还原", stage: 3 },
  { text: "# 4 字节 → 1 字节,体积 1/4,误差约 1%", stage: 4 },
];

const paramDefs = { w: { min: -2.0, max: 2.0, step: 0.05, fmt: (v) => v.toFixed(2) } };
const initial = { w: 0.13 };

function compute(p) {
  const q = Math.round(p.w / SCALE);
  const wHat = q * SCALE;
  const err = Math.abs(p.w - wHat);
  return { w: p.w, q, wHat, err, scale: SCALE };
}

const X0 = 30, AXY = 150, AXW = 300; // 数轴
function Viz({ derived: d, stage }) {
  const showQ = stage >= 2;
  // 数轴范围 [-2,2] 映射到 [X0, X0+AXW]
  const toX = (v) => X0 + ((v + 2) / 4) * AXW;
  // 画出当前值附近的整数台阶(q-3 .. q+3)
  const steps = [];
  for (let k = d.q - 3; k <= d.q + 3; k++) {
    const fv = k * SCALE;
    if (fv >= -2.05 && fv <= 2.05) steps.push(k);
  }
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={20} fill="#8a7656" font-size="12">float 是连续的;int8 只有 256 个台阶(每隔 scale 一格)</text>
      <text x={X0} y={38} fill="#5a4a36" font-size="11">scale = {MAXABS.toFixed(1)} / 127 = <tspan fill="#9c7b2e">{SCALE.toFixed(4)}</tspan>(相邻台阶间距)</text>

      {/* 数轴 */}
      <line x1={X0} y1={AXY} x2={X0 + AXW} y2={AXY} stroke="#cdb98e" stroke-width="1.5" />
      {/* 台阶刻度 */}
      {showQ && steps.map((k) => {
        const fx = toX(k * SCALE);
        const isTarget = k === d.q;
        return (
          <g key={k}>
            <line x1={fx} y1={AXY - 7} x2={fx} y2={AXY + 7} stroke={isTarget ? "#3f6b4f" : "#b9a06a"} stroke-width={isTarget ? 2 : 1} />
            <text x={fx} y={AXY + 22} fill={isTarget ? "#3f6b4f" : "#8a7656"} font-size="9" text-anchor="middle">{k}</text>
          </g>
        );
      })}
      {/* 原始 float 值(红) */}
      <line x1={toX(d.w)} y1={AXY - 30} x2={toX(d.w)} y2={AXY} stroke="#9e2b1e" stroke-width="1" stroke-dasharray="3 3" />
      <circle cx={toX(d.w)} cy={AXY} r="5" fill="#9e2b1e" />
      <text x={toX(d.w)} y={AXY - 36} fill="#9e2b1e" font-size="11" text-anchor="middle">w={d.w.toFixed(2)}</text>

      {/* 还原值(绿)+ 误差段 */}
      {showQ && (
        <>
          <circle cx={toX(d.wHat)} cy={AXY} r="5" fill="#3f6b4f" />
          <text x={toX(d.wHat)} y={AXY + 40} fill="#3f6b4f" font-size="11" text-anchor="middle">ŵ={d.wHat.toFixed(3)}</text>
          {d.err > 0.001 && (
            <line x1={toX(d.w)} y1={AXY - 14} x2={toX(d.wHat)} y2={AXY - 14} stroke="#c0632e" stroke-width="2" />
          )}
          <text x={X0} y={AXY + 70} fill="#5a4a36" font-size="12.5">
            w / scale = {(d.w / SCALE).toFixed(2)} → round → q = <tspan fill="#3f6b4f" font-size="14">{d.q}</tspan>(只占 1 字节)
          </text>
          <text x={X0} y={AXY + 90} fill="#5a4a36" font-size="12">
            四舍五入误差 = |w − ŵ| = <tspan fill="#c0632e">{d.err.toFixed(4)}</tspan>(≤ 半格 = {(SCALE / 2).toFixed(4)})
          </text>
        </>
      )}

      {stage >= 4 && (
        <>
          <text x={X0} y={AXY + 116} fill="#9e2b1e" font-size="12">整批 256×256:262,144 → 65,536 字节,压到 <tspan font-size="14">25%</tspan></text>
          <text x={X0} y={AXY + 134} fill="#3f6b4f" font-size="12">权重相对误差 0.0108 · 输出相对误差 0.0100 —— 行为基本不变</text>
        </>
      )}
      {stage < 2 && (
        <text x={X0} y={AXY + 70} fill="#8a7656" font-size="11.5">点「演法」:看一个 float 怎么被「吸附」到最近的整数台阶</text>
      )}
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: "另一个成本是<b>存储</b>:权重常用 float32,每个数 4 字节。70 亿参数光权重就 28GB。能不能少用点位数?<b>int8 量化</b>:每个数压到 1 字节。" },
    { line: 1, stage: 0, say: `关键技巧是 <b>scale</b>:找出这批权重里绝对值最大的数,把它映射到 127。这里 scale = ${MAXABS.toFixed(1)}/127 = <b>${SCALE.toFixed(4)}</b>,就是相邻台阶的间距。` },
    { line: 2, stage: 1, say: `int8 只能表示 −128~127 共 256 个整数台阶。拿一个权重 <b>w=${d.w.toFixed(2)}</b> 试试,看它怎么被压进这些台阶。` },
    { line: 3, stage: 2, say: `做法:<b>q = round(w / scale)</b> = round(${(d.w / SCALE).toFixed(2)}) = <b>${d.q}</b>。原本的连续值被<b>吸附</b>到最近的整数台阶,只占 1 字节。` },
    { line: 4, stage: 3, say: `用的时候再 <b>w_hat = q × scale = ${d.wHat.toFixed(3)}</b> 还原。和原值差 <b>${d.err.toFixed(4)}</b>——这就是四舍五入误差,最多半格。` },
    { line: 5, stage: 4, say: `整批 256×256:体积从 262,144 压到 65,536 字节(<b>25%,缩 4 倍</b>),而权重相对误差仅 <b>0.0108</b>、输出相对误差 <b>0.0100</b>。省一大半空间,几乎不影响行为。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return `权重常用 float32(4 字节/数),大模型权重占满显存。<b>int8 量化</b>把每个数压到 1 字节。关键 <b>scale = 最大绝对值/127</b> = ${SCALE.toFixed(4)}。`;
    case 1: return `int8 只有 <b>256 个台阶</b>(−128~127)。拖朱字改权重 w=${d.w.toFixed(2)},看它落到哪个台阶。`;
    case 2: return `<b>q = round(w/scale)</b> = round(${(d.w / SCALE).toFixed(2)}) = <b>${d.q}</b>。连续值吸附到最近整数台阶,只占 1 字节。`;
    case 3: return `还原 <b>w_hat = q × scale = ${d.wHat.toFixed(3)}</b>,误差 <b>${d.err.toFixed(4)}</b>(≤ 半格 ${(SCALE / 2).toFixed(4)})。台阶越密误差越小。`;
    case 4: return `整批:体积压到 <b>25%</b>(缩 4 倍),权重相对误差 0.0108、输出相对误差 0.0100。<b>省一大半空间,几乎不影响行为</b>——量化划算就在这。真实做法更精细(分组量化、4-bit、激活也量化),内核仍是「缩放+取整」。`;
    default: return "拖朱字调 w,点「演法」看量化吸附与误差。";
  }
}

const pyCode = `import numpy as np
def quantize_int8(w):
    scale = np.abs(w).max() / 127.0          # 最大绝对值 -> 127
    q = np.round(w / scale).astype(np.int8)  # 缩放、四舍五入到整数台阶
    return q, scale
def dequantize(q, scale):
    return q.astype(np.float32) * scale       # 乘回 scale 还原
# 256×256 权重:262,144 → 65,536 字节(25%)
# 权重相对误差 0.0108 · 输出相对误差 0.0100 → 行为基本不变`;

export const quantizeDemo = {
  title: "演武场 · 化整为简",
  intro: "权重用 float32 存(4 字节/数),占满显存。<b>int8 量化</b>:<b>scale=最大绝对值/127</b>,<b>q=round(w/scale)</b> 把连续值吸附到 256 个整数台阶,每个数压到 1 字节。" +
    "体积缩到 <b>25%</b>,而权重/输出误差都只 <b>~1%</b>。拖动 <b>w 朱字</b>,看它被吸附到最近台阶。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1150,
  terms: [
    { t: "为什么量化", d: "大模型权重常用 float32,<b>每个数 4 字节</b>。70 亿参数光权重就约 28GB,普通显卡装不下。int8 把每个数压到 <b>1 字节</b>,体积直接 <b>1/4</b>。" },
    { t: "scale 缩放", d: "int8 只能表示 −128~127。先找这批权重的<b>最大绝对值</b>映射到 127,得 <b>scale=最大绝对值/127</b>(台阶间距);其余按比例 <b>round(w/scale)</b> 取整。用时 <b>q×scale</b> 还原。" },
    { t: "代价是精度", d: "float 连续,int8 只有 <b>256 个台阶</b>,必有四舍五入误差(最多半格)。但实测:权重相对误差 <b>0.0108</b>、对输出的相对误差 <b>0.0100</b>——只有 1% 左右。" },
    { t: "划算在哪", d: "体积缩到 <b>25%</b>,误差仅 ~1%,模型行为基本不变,还更省显存、加载更快,边缘设备也跑得动。真实做法更精细(<b>分组量化、4-bit、激活量化</b>),但内核就是「缩放+取整」。" },
  ],
  localCmd: "cd llm-volume/ch13-inference/code && python3 quantization.py",
};


export default { name: 'GewuQuantizeDemo' }
</script>
