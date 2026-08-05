<script lang="jsx">
// 卷三 · 第三式 · 以损度功:用 loss(交叉熵)给模型打分,越小越懂
import { NAMES, V, STOI, buildP, avgLoss, bigrams } from "./ch03corpus.js";

const lines = [
  { text: "P = (N + {{a}}) / (N + {{a}}).sum(axis=1)  # +α 平滑后的概率表", stage: 1 },
  { text: "", stage: 1 },
  { text: "loss = 0", stage: 2 },
  { text: "for (a, b) in 所有真实字对:", stage: 2 },
  { text: "    loss += -log(P[a][b])     # 给真数据的概率越高,这项越小", stage: 2 },
  { text: "loss /= 字对总数              # 平均交叉熵", stage: 3 },
  { text: "ppl = exp(loss)              # 困惑度:还剩几个字在纠结", stage: 4 },
];

const paramDefs = {
  a: { min: 0.01, max: 3, step: 0.01, fmt: (v) => v.toFixed(2) },
};
const initial = { a: 1 };

const LOSS_UNIFORM = Math.log(V); // 瞎猜基线 = ln V

function compute(p) {
  const P = buildP(p.a);
  const loss = avgLoss(P);
  const samplePairs = [];
  for (const nm of NAMES.slice(0, 3)) {
    for (const [a, b] of bigrams(nm)) {
      const prob = P[STOI[a]][STOI[b]];
      samplePairs.push({ a, b, prob, penalty: -Math.log(prob) });
      if (samplePairs.length >= 4) break;
    }
    if (samplePairs.length >= 4) break;
  }
  return {
    loss,
    ppl: Math.exp(loss),
    lossUniform: LOSS_UNIFORM,
    pplUniform: V,
    samplePairs,
  };
}

// loss 量程:0(完美) ~ ln V(瞎猜)。柱高 ∝ loss,越矮越好。
const BASE = 250, TOP = 56, X_MODEL = 96, X_UNIF = 224, BW = 68;
const lossToY = (L) => BASE - (Math.min(L, LOSS_UNIFORM) / LOSS_UNIFORM) * (BASE - TOP);

function Viz({ derived: d, stage }) {
  const yModel = lossToY(d.loss);
  const yUnif = lossToY(d.lossUniform);
  const showPpl = stage >= 4;
  return (
    <svg viewBox="0 0 360 410" width="360" height="410">
      <text x={40} y={26} fill="#8a7656" font-size="13">loss 越矮越好(0=完美,越高越蒙)</text>

      <line x1={40} y1={BASE} x2={336} y2={BASE} stroke="#6b3a2e" stroke-width="1.2" />
      {/* 瞎猜基线:柱顶即天花板,虚线贯穿 */}
      <line x1={40} y1={yUnif} x2={336} y2={yUnif} stroke="#8a7656" stroke-dasharray="5 4" opacity="0.7" />
      <text x={336} y={yUnif - 6} fill="#8a7656" font-size="11" text-anchor="end">← 瞎猜天花板 ln{V}</text>

      {/* 模型柱(朱) */}
      <rect x={X_MODEL} y={yModel} width={BW} height={BASE - yModel} rx="3"
        fill="#9e2b1e" style={{ transition: "all .3s ease" }} />
      <text x={X_MODEL + BW / 2} y={yModel - 8} fill="#9e2b1e" font-size="15" text-anchor="middle">
        {d.loss.toFixed(3)}
      </text>
      <text x={X_MODEL + BW / 2} y={BASE + 20} fill="#5a4a36" font-size="13" text-anchor="middle">统计模型</text>

      {/* 瞎猜柱(灰) */}
      <rect x={X_UNIF} y={yUnif} width={BW} height={BASE - yUnif} rx="3"
        fill="#c9b79a" opacity="0.8" />
      <text x={X_UNIF + BW / 2} y={yUnif - 8} fill="#8a7656" font-size="15" text-anchor="middle">
        {d.lossUniform.toFixed(3)}
      </text>
      <text x={X_UNIF + BW / 2} y={BASE + 20} fill="#5a4a36" font-size="13" text-anchor="middle">瞎猜</text>

      {showPpl && (
        <text x={40} y={290} fill="#3f6b4f" font-size="13">
          困惑度 e^loss:模型 ≈ <tspan fill="#9e2b1e" font-size="15">{d.ppl.toFixed(1)}</tspan> 选 1
          (瞎猜要 {d.pplUniform} 选 1)
        </text>
      )}
      <line x1={32} y1={306} x2={334} y2={306} stroke="#cdb98e" stroke-width="0.8" />
      <text x={32} y={328} fill="#9e2b1e" font-size="12">loss 是逐个真实字对累加出来的</text>
      {d.samplePairs.map((it, i) => (
        <text key={i} x={32} y={350 + i * 16} fill="#5a4a36" font-size="10">
          {it.a}→{it.b}: -log({it.prob.toFixed(3)}) =
          <tspan fill="#3f6b4f"> {it.penalty.toFixed(3)}</tspan>
        </text>
      ))}
    </svg>
  );
}

function frames(p, d) {
  return [
    { line: 1, stage: 1, say: `用 <b>+α(=${p.a.toFixed(2)})</b> 平滑建出概率表 P。α 越小,越只信语料。` },
    { line: 4, stage: 2, say: "打分办法:对<b>每一对真实字对</b>,累加模型给它的 <b>-log 概率</b>。给得越准,这项越小。" },
    { line: 6, stage: 3, say: `求平均,得 <b>loss=${d.loss.toFixed(3)}</b>。瞎猜基线是 ln${V}=${d.lossUniform.toFixed(2)},我们明显更低。` },
    { line: 7, stage: 4, say: `还原成困惑度 e^loss:模型眼里只剩 <b>≈${d.ppl.toFixed(1)}</b> 个字在纠结,瞎猜要 ${V} 选 1。<b>训练 GPT 就是把这个数往下压。</b>` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 1: return `平滑 <b>α=${p.a.toFixed(2)}</b>。拖小它,模型对训练数据更「自信」,loss 更低——但对新数据可能更脆。`;
    case 2: return "对每个真实字对累加 <b>-log P</b>:模型给真数据的概率越高,损失越小。这就是<b>交叉熵</b>。";
    case 3: return `平均 <b>loss=${d.loss.toFixed(3)}</b> vs 瞎猜 ${d.lossUniform.toFixed(2)}。低得多,说明确实学到了规律。`;
    case 4: return `困惑度 e^loss ≈ <b>${d.ppl.toFixed(1)}</b>:模型还在 ${d.ppl.toFixed(1)} 个字里纠结(瞎猜 ${V} 个)。越小越好。`;
    default: return "拖动平滑 α,看 loss(朱柱)如何变化,与瞎猜基线(灰柱)比高下。";
  }
}

const pyCode = `import numpy as np

NAMES = ["天明","天宇","天佑","天华","小龙","小川","小雨","小满","晓彤",
         "春华","春燕","春明","志强","志明","志华","建国","建华","建明",
         "国华","国强","国栋","云飞","云龙","云帆","海燕","海涛","海明",
         "明华","明远","明轩","文华","文轩","文静","雨桐","雨欣","梓涵",
         "梓轩","子轩","宇轩","嘉文","嘉豪","佳怡","思远","思齐"]
TOKEN = "·"
vocab = sorted(set(TOKEN) | set("".join(NAMES)))
stoi = {c: i for i, c in enumerate(vocab)}
V = len(vocab)

def bigrams(nm):
    chs = [TOKEN] + list(nm) + [TOKEN]
    return list(zip(chs, chs[1:]))

N = np.zeros((V, V))
for nm in NAMES:
    for a, b in bigrams(nm):
        N[stoi[a], stoi[b]] += 1
P = (N + 1) / (N + 1).sum(axis=1, keepdims=True)

def avg_loss(prob):
    tot, n = 0.0, 0
    for nm in NAMES:
        for a, b in bigrams(nm):
            tot += -np.log(prob[stoi[a], stoi[b]]); n += 1
    return tot / n

loss = avg_loss(P)
uniform = np.full((V, V), 1.0 / V)
print(f"统计模型 loss = {loss:.4f}")
print(f"瞎猜基线 loss = {avg_loss(uniform):.4f}  (= ln {V})")
print(f"困惑度 e^loss: 模型 {np.exp(loss):.1f} 选 1,瞎猜 {V} 选 1")`;

export const bigramLossDemo = {
  title: "演武场 · 以损度功",
  intro: "怎么知道模型真学到了东西?<b>用 loss 打分</b>:对每个真实字对取 -log 概率求平均(交叉熵)," +
    "越小越懂。拖动<b>平滑 α</b>,看朱柱(模型 loss)与灰柱(瞎猜基线)的高下。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode,
  bridge: {
    prev: ["概率表 P", "卷一 log/平均直觉"],
    current: ["每个真实字对 -log(P)", "累加后平均", "困惑度"],
    next: ["GPT cross_entropy", "训练 loss 曲线"],
    sources: ["llm-volume/ch03-language-model/code/evaluate_loss.py", "web/src/demos/ch03corpus.js"],
  },
  terms: [
    { t: "loss / 损失", d: "给模型「打分」的数字,<b>越小越好</b>。它衡量模型对真实数据有多「意外」:猜得越准,损失越小;完美模型 loss=0。" },
    { t: "交叉熵 (cross-entropy)", d: "语言模型最常用的 loss。做法:对每个真实出现的字对,取模型给它的概率的 <b>-log</b>,再求平均。概率给得越高(越接近 1),-log 越接近 0。后面训练 GPT 用的就是它。" },
    { t: "-log 是干嘛的", d: "概率在 0~1 之间,<code>-log(1)=0</code>(给满分、不罚),<code>-log(0.01)≈4.6</code>(给得太低、重罚)。它把「概率」变成「越低越该罚」的惩罚分。" },
    { t: "瞎猜基线 (baseline)", d: "完全不学、对 V 个字平均下注时的 loss,正好 <b>= ln V</b>。这里 V=40,基线 = ln40 ≈ 3.69。模型只有比它低才算真学到东西。" },
    { t: "困惑度 (perplexity)", d: "<code>e^loss</code>,直观版的 loss。可理解为「模型眼里还剩几个字在纠结」:基线 40 选 1,我们的模型只在 ≈18 个字里犹豫。越小越好。" },
  ],
  localCmd: "cd llm-volume/ch03-language-model/code && python3 evaluate_loss.py",
};


export default { name: 'GewuBigramLossDemo' }
</script>
