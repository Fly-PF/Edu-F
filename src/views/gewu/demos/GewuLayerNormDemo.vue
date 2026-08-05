<script lang="jsx">
// 卷七 · 第二式 · 归元固本:残差连接 + LayerNorm —— 让深网络 train 得动
const lines = [
  { text: "x = [{{a}}, {{b}}, {{c}}, {{d}}, {{e}}, {{f}}]   # 一个词向量(拖朱字)", stage: 0 },
  { text: "mu = x.mean()          # 这一行的均值", stage: 1 },
  { text: "var = x.var()          # 这一行的方差", stage: 1 },
  { text: "x = (x - mu)/√var      # 拉回 均值0、方差1", stage: 2 },
  { text: "x = γ*x + β            # 再缩放平移(可学习)", stage: 2 },
  { text: "out = x_in + sublayer(LN(x_in))   # Pre-LN + 残差", stage: 3 },
];

const paramDefs = {
  a: { min: -10, max: 10, step: 0.5, fmt: (v) => v.toFixed(1) },
  b: { min: -10, max: 10, step: 0.5, fmt: (v) => v.toFixed(1) },
  c: { min: -10, max: 10, step: 0.5, fmt: (v) => v.toFixed(1) },
  d: { min: -10, max: 10, step: 0.5, fmt: (v) => v.toFixed(1) },
  e: { min: -10, max: 10, step: 0.5, fmt: (v) => v.toFixed(1) },
  f: { min: -10, max: 10, step: 0.5, fmt: (v) => v.toFixed(1) },
};
const initial = { a: 10, b: -3, c: 0.5, d: 8, e: -1, f: 2 };

function stats(arr) {
  const mu = arr.reduce((s, v) => s + v, 0) / arr.length;
  const varv = arr.reduce((s, v) => s + (v - mu) ** 2, 0) / arr.length;
  return { mu, varv, sd: Math.sqrt(varv) };
}

function compute(p) {
  const x = [p.a, p.b, p.c, p.d, p.e, p.f];
  const { mu, varv, sd } = stats(x);
  const ln = x.map((v) => (v - mu) / Math.sqrt(varv + 1e-5));
  const o = stats(ln);
  return { x, mu, sd, ln, lnMu: o.mu, lnSd: o.sd };
}

const X0 = 40, BW = 38, GAP = 8, MID = 150, SCALE = 11;
function bars(vals, baseY, color) {
  return vals.map((v, i) => {
    const h = v * SCALE;
    const x = X0 + i * (BW + GAP);
    return (
      <g key={i}>
        <rect x={x} y={h >= 0 ? baseY - h : baseY} width={BW} height={Math.abs(h)} rx="2"
          fill={color} style={{ transition: "all .35s ease" }} />
        <text x={x + BW / 2} y={h >= 0 ? baseY - h - 4 : baseY + Math.abs(h) + 12}
          fill="#2b2117" font-size="10.5" text-anchor="middle">{v.toFixed(1)}</text>
      </g>
    );
  });
}

function Viz({ derived: d, stage }) {
  const showLN = stage >= 2;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={22} y={22} fill="#8a7656" font-size="12.5">
        {showLN ? "LayerNorm 后:被拉回 均值≈0、方差≈1" : "原始词向量:数值忽大忽小,分布乱飘"}
      </text>
      {/* 零线 */}
      <line x1={28} y1={showLN ? 180 : MID} x2={344} y2={showLN ? 180 : MID}
        stroke="#6b3a2e" stroke-width="1" stroke-dasharray="3 3" opacity="0.5" />

      {!showLN && bars(d.x, MID, "#b9a06a")}
      {showLN && bars(d.ln, 180, "#3f6b4f")}

      <text x={22} y={250} fill="#5a4a36" font-size="12">
        原始:均值=<tspan fill="#9e2b1e">{d.mu.toFixed(2)}</tspan> 标准差=<tspan fill="#9e2b1e">{d.sd.toFixed(2)}</tspan>
      </text>
      <text x={22} y={272} fill="#3f6b4f" font-size="12">
        {showLN
          ? `归一后:均值=${d.lnMu.toFixed(2)} 标准差=${d.lnSd.toFixed(2)} ← 稳了`
          : "无论输入多乱,LayerNorm 都能把它拉回稳定分布"}
      </text>
      <text x={22} y={294} fill="#8a7656" font-size="11">
        {stage >= 3 ? "残差 out = x + 子层(x):子层只学「增量」,梯度多一条高速公路" : "拖朱字改向量,看分布如何被归元"}
      </text>
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: `一个词向量:[${d.x.map((v) => v.toFixed(1)).join(", ")}]。<b>均值 ${d.mu.toFixed(2)}、标准差 ${d.sd.toFixed(2)}</b>——很多层叠起来,这种乱飘会让训练不稳。` },
    { line: 3, stage: 1, say: `LayerNorm 先量出<b>这一行</b>自己的均值 ${d.mu.toFixed(2)} 和方差。注意:是每个词向量<b>各自</b>归一,不跨词。` },
    { line: 4, stage: 2, say: `减均值、除标准差:不管原来多乱,都被拉回<b>均值≈0、方差≈1</b>(现在 ${d.lnMu.toFixed(2)} / ${d.lnSd.toFixed(2)})。再乘 γ 加 β 微调。` },
    { line: 6, stage: 3, say: "外面再包一层<b>残差</b>:out = x + 子层(LN(x))。梯度能沿 x 直接回传,子层只需学「<b>在 x 上改多少</b>」——深网络这才训得动。" },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return `词向量数值<b>忽大忽小</b>(均值 ${d.mu.toFixed(2)}、标准差 ${d.sd.toFixed(2)})。几十层叠起来,分布乱飘会让训练极不稳定。`;
    case 1: return "LayerNorm 对<b>每个词向量自己那一行</b>动手:先算这一行的均值和方差(不跨词、不跨样本)。";
    case 2: return `减均值除标准差 → <b>均值0、方差1</b>(${d.lnMu.toFixed(2)} / ${d.lnSd.toFixed(2)})。再乘可学习 <b>γ</b>、加 <b>β</b>,让模型保留微调余地。`;
    case 3: return "残差 <b>out = x + f(x)</b>:子层只学「增量」,且梯度有一条绕过子层的「高速公路」。现代写法 <b>Pre-LN</b>:x = x + 子层(LN(x))。";
    default: return "拖朱字改词向量,点「演法」看归元 + 残差。";
  }
}

const pyCode = `import numpy as np
def layer_norm(x, gamma, beta, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = x.var(axis=-1, keepdims=True)
    return gamma * (x - mu) / np.sqrt(var + eps) + beta

x = np.array([[10., -3., 0.5, 8., -1., 2.]])
y = layer_norm(x, 1.0, 0.0)
print("原始 均值", x.mean(), "标准差", x.std())   # 2.75 / 4.706
print("归一 均值", y.mean().round(3), "标准差", y.std().round(3))  # 0 / 1
# Pre-LN + 残差:out = x + sublayer(layer_norm(x))`;

export const layerNormDemo = {
  title: "演武场 · 归元固本",
  intro: "深网络两大难:<b>越深越难训</b>(梯度消失/爆炸)、<b>数值乱飘</b>。两件法宝:<b>LayerNorm</b> 把每个词向量拉回均值0方差1," +
    "<b>残差</b> out=x+子层(x) 给梯度一条高速公路。拖动<b>词向量朱字</b>,看再乱的输入也被归元。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "LayerNorm", d: "对<b>每个词向量自己那一行</b>减均值、除标准差,拉回均值0、方差1,再乘可学习 γ、加 β。注意它<b>不跨词、不跨样本</b>,所以推理时单条也能用。" },
    { t: "残差连接", d: "<b>out = x + f(x)</b>。给梯度一条绕过子层的「高速公路」,深层也能稳稳回传;子层只需学「在 x 基础上改多少」的<b>增量</b>,比从零学整个映射容易。" },
    { t: "Pre-LN", d: "现代 GPT 的写法:<b>先</b> LayerNorm <b>再</b>进子层,最后加残差——<b>x = x + 子层(LN(x))</b>。比原版 Post-LN 训练更稳。" },
    { t: "为何子层置零≈恒等", d: "若子层输出为 0,残差通路让 out = x + 0 = x,整块退化成<b>恒等映射</b>。这保证「子层还没学会发力」时信息能原样穿过——深 Transformer 好训的关键。" },
  ],
  localCmd: "cd llm-volume/ch07-transformer-block/code && python3 layernorm_residual.py",
};


export default { name: 'GewuLayerNormDemo' }
</script>
