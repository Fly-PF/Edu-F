<script lang="jsx">
// 卷十 · 第二式 · 去芜存菁:top-k / top-p —— 砍掉长尾烂字,只在精选集合里采样
const VOCAB = ["月", "光", "霜", "鸟", "风", "x"];
const LOGITS = [3.0, 2.5, 1.0, 0.5, 0.2, -2.0];

function softmax(z) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}
const BASE = softmax(LOGITS);

const lines = [
  { text: "probs = softmax(logits)        # 原始概率,带长尾", stage: 0 },
  { text: "mode = top-k(k={{k}}) / top-p   # 两种砍长尾法", stage: 1 },
  { text: "top-k: 只留分数最高的 k 个,其余清零", stage: 2 },
  { text: "top-p: 累计概率凑够 p={{p}} 就停,只留这最小集合", stage: 3 },
  { text: "probs[被砍] = 0 → 重新归一 → 在剩下的里采样", stage: 4 },
];

const paramDefs = {
  k: { min: 1, max: 6, step: 1, fmt: (v) => v },
  p: { min: 0.5, max: 1.0, step: 0.05, fmt: (v) => v.toFixed(2) },
};
const initial = { k: 3, p: 0.9 };

function topK(k) {
  const order = BASE.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  const keep = new Set(order.slice(0, k).map((x) => x[1]));
  const masked = BASE.map((v, i) => (keep.has(i) ? v : 0));
  const s = masked.reduce((a, b) => a + b, 0);
  return { probs: masked.map((v) => v / s), keep, cut: k };
}
function topP(p) {
  const order = BASE.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  let csum = 0, cut = 0;
  const keep = new Set();
  for (let i = 0; i < order.length; i++) {
    keep.add(order[i][1]);
    csum += order[i][0];
    cut = i + 1;
    if (csum >= p) break;
  }
  const masked = BASE.map((v, i) => (keep.has(i) ? v : 0));
  const s = masked.reduce((a, b) => a + b, 0);
  return { probs: masked.map((v) => v / s), keep, cut, csum };
}

function compute(p) {
  const tk = topK(p.k);
  const tp = topP(p.p);
  return { k: p.k, p: p.p, base: BASE, tk, tp };
}

const X0 = 30, BARX = 64, BARW = 224, ROWH = 33, TOP = 74;
function Viz({ derived: d, stage }) {
  // stage<2: 原始;stage 2: top-k;stage>=3: top-p
  const usingP = stage >= 3;
  const res = usingP ? d.tp : d.tk;
  const showResult = stage >= 2;
  const title = !showResult ? "原始概率(带长尾:霜/鸟/风/x)"
    : usingP ? `top-p = ${d.p.toFixed(2)}:累计够 ${d.p.toFixed(2)} 就停 → 留 ${d.tp.cut} 个`
    : `top-k = ${d.k}:只留前 ${d.k} 名 → 其余清零`;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={22} fill="#8a7656" font-size="12.5">{title}</text>
      <text x={X0} y={42} fill="#5a4a36" font-size="11">
        {showResult ? <tspan><tspan fill="#3f6b4f">绿=保留</tspan> · <tspan fill="#9e2b1e">灰红=被砍(概率归零)</tspan></tspan>
          : "下面每种策略,都是在「砍掉哪些、留哪些」上做文章"}
      </text>

      {VOCAB.map((w, j) => {
        const y = TOP + j * ROWH;
        const kept = showResult ? res.keep.has(j) : true;
        const wt = showResult ? res.probs[j] : d.base[j];
        const barw = Math.max(1.5, (showResult ? wt : d.base[j]) * BARW);
        const labelX = BARX + barw + 6;
        const labelAtRight = labelX > 310;
        return (
          <g key={j}>
            <text x={X0} y={y + 14} fill={kept ? "#5a4a36" : "#b58a82"} font-size="14">{w}</text>
            <rect x={BARX} y={y} width={BARW} height={18} rx="3" fill="#efe6d2" stroke="#cdb98e" stroke-width="0.7" />
            {/* 原始概率淡影 */}
            {showResult && (
              <rect x={BARX} y={y} width={Math.max(1.5, d.base[j] * BARW)} height={18} rx="3"
                fill={kept ? "rgba(63,107,79,0.18)" : "rgba(159,43,30,0.14)"} />
            )}
            <rect x={BARX} y={y} width={barw} height={18} rx="3"
              fill={!showResult ? "#b9a06a" : kept ? "#3f6b4f" : "#d9b3ac"}
              style={{ transition: "width .35s ease, fill .3s ease" }} />
            <text x={labelAtRight ? 344 : labelX} y={y + 13}
              text-anchor={labelAtRight ? "end" : "start"} fill="#2b2117" font-size="10.5">
              {((showResult ? wt : d.base[j]) * 100).toFixed(1)}%
              {showResult && !kept ? " ✕" : ""}
            </text>
          </g>
        );
      })}
      <text x={X0} y={288} fill="#8a7656" font-size="11">
        {!showResult ? "点「演法」:看 top-k 与 top-p 如何砍长尾"
          : usingP ? "妙处:模型越确定集合越小、越犹豫集合越大 —— 自适应"
          : "k 是固定数,不看分布形状(有时该多留、有时该少留)"}
      </text>
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: "原始概率有<b>长尾</b>:「月」「光」很高,但「鸟」「风」「x」也各占一点。偶尔采到「x」就吐出离谱字。" },
    { line: 2, stage: 1, say: "两种砍长尾的办法:<b>top-k</b>(只留前 k 名)和 <b>top-p</b>(累计够 p 就停)。" },
    { line: 3, stage: 2, say: `<b>top-k = ${d.k}</b>:只保留分数最高的 ${d.k} 个,其余<b>概率清零</b>,再在这 ${d.k} 个里采样。简单粗暴砍掉长尾烂字。` },
    { line: 4, stage: 3, say: `<b>top-p = ${d.p.toFixed(2)}</b>(核采样):按概率从高到低累加,凑够 ${d.p.toFixed(2)} 就停——这里留下 <b>${d.tp.cut}</b> 个字。` },
    { line: 5, stage: 4, say: "把被砍的位置概率设 0、<b>重新归一</b>,再采样。top-p 的妙处是<b>自适应</b>:模型很确定时集合小、犹豫时集合大。这是目前最主流的策略。" },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "原始分布带<b>长尾</b>:低分字也有非零概率,偶尔会被采到,蹦出不通顺的字。两种策略专治长尾。";
    case 1: return "<b>top-k</b> 按「数量」砍,<b>top-p</b> 按「累计概率」砍。拖朱字调 k 和 p。";
    case 2: return `<b>top-k=${d.k}</b>:留分数最高的 ${d.k} 个,其余设 -∞(softmax 后=0)。优点是稳;缺点是 <b>k 固定</b>,不看分布形状。`;
    case 3: return `<b>top-p=${d.p.toFixed(2)}</b>:从高到低累加概率,刚够 ${d.p.toFixed(2)} 即停,这里留 <b>${d.tp.cut}</b> 个。也叫 <b>nucleus sampling(核采样)</b>。`;
    case 4: return "被砍位清零后<b>重新归一</b>,在剩下的里采样。top-p <b>自适应</b>候选集大小,是当前最主流的做法,常再配适中 temperature。";
    default: return "拖朱字调 k / p,点「演法」看砍长尾。";
  }
}

const pyCode = `import numpy as np
VOCAB = ["月","光","霜","鸟","风","x"]
logits = np.array([3.0, 2.5, 1.0, 0.5, 0.2, -2.0])
def softmax(z):
    e = np.exp(z - z.max()); return e / e.sum()

def top_k(logits, k):
    z = logits.copy()
    keep = np.argsort(z)[-k:]      # 前 k 名
    z[[i for i in range(len(z)) if i not in keep]] = -np.inf
    return softmax(z)

def top_p(logits, p):
    probs = softmax(logits)
    order = np.argsort(probs)[::-1]
    csum = np.cumsum(probs[order])
    cut = np.searchsorted(csum, p) + 1   # 累计够 p 的最小集合
    out = np.zeros_like(probs); out[order[:cut]] = probs[order[:cut]]
    return out / out.sum()
# top-k=3 → 月57.4 光34.8 霜7.8,其余=0`;

export const topKpDemo = {
  title: "演武场 · 去芜存菁",
  intro: "原始分布有<b>长尾</b>,偶尔采到低分字就吐出离谱内容。<b>top-k</b> 只留前 k 名、<b>top-p</b>(核采样)留「累计够 p」的最小集合," +
    "其余概率<b>清零再归一</b>。top-p 能<b>自适应</b>候选集大小,是当前主流。拖动 <b>k / p 朱字</b>看砍长尾。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1150,
  terms: [
    { t: "top-k", d: "只保留分数最高的 <b>k</b> 个字,其余概率清零后归一,在这 k 个里采样。砍掉长尾烂字。缺点:k 是固定数,<b>不看分布形状</b>——该多留时留太少,该少留时留太多。" },
    { t: "top-p(核采样)", d: "按概率从高到低累加,凑够 <b>p</b>(如 0.9)就停,只留这个最小集合。<b>nucleus sampling</b>。自适应是它的精髓。" },
    { t: "为什么 top-p 自适应更好", d: "模型<b>很确定</b>时(分布尖)少数字就凑够 p,候选集小;<b>犹豫</b>时(分布平)要更多字才凑够,候选集大。比固定 k 更贴合每一步的实际情况。" },
    { t: "清零再归一", d: "被砍的位置设概率 0(或 logits=-∞),剩下的<b>重新归一</b>使和=1,再采样。保证还是合法概率分布。" },
  ],
  localCmd: "cd llm-volume/ch10-sampling/code && python3 sampling_strategies.py",
};


export default { name: 'GewuTopKpDemo' }
</script>
