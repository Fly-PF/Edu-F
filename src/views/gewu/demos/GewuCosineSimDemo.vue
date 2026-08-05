<script lang="jsx">
// 卷五 · 第二式 · 度义之尺:用余弦相似度量「两个词有多像」
import { VOCAB, E, cosine } from "./ch05emb.js";

const lines = [
  { text: "q = '{{q}}'                          # 选一个词当「查询」(拖朱字)", stage: 0 },
  { text: "cos(u,v) = (u·v) / (|u|·|v|)         # 余弦相似度:只看方向", stage: 1 },
  { text: "sims = {w: cos(E[q], E[w]) for w}    # 对其余每个词算相似度", stage: 2 },
  { text: "nearest = max(sims)                  # 最大的那个 = 最近的邻居", stage: 3 },
  { text: "cos(q*5, v) == cos(q, v)             # 放大向量,方向不变,相似度不变", stage: 4 },
];

const paramDefs = {
  q: { min: 0, max: VOCAB.length - 1, step: 1, fmt: (v) => VOCAB[v] },
};
const initial = { q: 0 };

function compute(p) {
  const qi = p.q;
  const sims = VOCAB.map((w, i) => ({ w, i, c: cosine(E[qi], E[i]) }))
    .filter((x) => x.i !== qi)
    .sort((a, b) => b.c - a.c);
  return { qi, word: VOCAB[qi], sims, near: sims[0] };
}

const pct = (c) => (c * 100).toFixed(1);

function Viz({ derived: d, stage }) {
  const X0 = 20, BARX = 96, BARW = 210, ROWH = 40, TOP = 92;
  const showBars = stage >= 2;
  const showNear = stage >= 3;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={24} fill="#8a7656" font-size="12.5">
        余弦相似度:看两个向量「方向」多一致
      </text>
      <text x={X0} y={46} fill="#5a4a36" font-size="12.5">
        范围 <tspan fill="#9e2b1e">-1 ~ 1</tspan> · 越接近 1 越「像」
      </text>
      <text x={X0} y={72} fill="#5a4a36" font-size="13">
        查询词:「<tspan fill="#9e2b1e" font-size="16">{d.word}</tspan>」与其余各词比一比 →
      </text>

      {showBars && d.sims.map((s, r) => {
        const y = TOP + r * ROWH;
        const w = Math.max(2, s.c * BARW);
        const isNear = showNear && r === 0;
        return (
          <g key={s.w}>
            <text x={X0} y={y + 15} fill={isNear ? "#9e2b1e" : "#5a4a36"} font-size="13">
              {d.word}·{s.w}
            </text>
            <rect x={BARX} y={y} width={BARW} height={20} rx="3"
              fill="#efe6d2" stroke="#cdb98e" stroke-width="0.8" />
            <rect x={BARX} y={y} width={w} height={20} rx="3"
              fill={isNear ? "#9e2b1e" : s.c > 0.7 ? "#c0632e" : "#b9a06a"}
              style={{ transition: "width .4s ease" }} />
            <text x={BARX + w + 6} y={y + 15} fill="#2b2117" font-size="12">
              {s.c >= 0 ? "+" : ""}{pct(s.c)}%
            </text>
            {isNear && (
              <text x={BARX + 4} y={y + 15} fill="#fff" font-size="11">最像 ←</text>
            )}
          </g>
        );
      })}

      {!showBars && (
        <text x={X0} y={150} fill="#8a7656" font-size="12">
          点「演法」:给一个词,看它和其它词的相似度,找出最像的邻居
        </text>
      )}

      {stage >= 4 && (
        <g>
          <line x1={X0} y1={232} x2={340} y2={232} stroke="#cdb98e" stroke-width="0.8" />
          <text x={X0} y={252} fill="#3f6b4f" font-size="12">
            余弦只看方向,不看长短:
          </text>
          <text x={X0} y={274} fill="#5a4a36" font-size="12.5">
            cos({d.word}, {d.near.w}) = {pct(d.near.c)}%
          </text>
          <text x={X0} y={294} fill="#9e2b1e" font-size="12.5">
            cos({d.word}×5, {d.near.w}) = {pct(d.near.c)}%(放大 5 倍,纹丝不动)
          </text>
        </g>
      )}
    </svg>
  );
}

function frames(p, d) {
  const list = d.sims.map((s) => `${s.w}(${(s.c >= 0 ? "+" : "") + s.c.toFixed(2)})`).join("、");
  return [
    { line: 1, stage: 0, say: `查询词:「<b>${d.word}</b>」。我们要量它和其它词「有多像」。` },
    { line: 2, stage: 1, say: "尺子是<b>余弦相似度</b>:两个向量的点积除以各自长度——本质是看它们<b>方向</b>的一致程度,范围 -1~1。" },
    { line: 3, stage: 2, say: `对其余每个词算相似度:<b>${list}</b>。` },
    { line: 4, stage: 3, say: `最大的是「<b>${d.near.w}</b>」(${(d.near.c).toFixed(2)})——它就是「${d.word}」的<b>最近邻</b>。这正是「近义词检索」的原理。` },
    { line: 5, stage: 4, say: `余弦<b>只看方向</b>:把「${d.word}」的向量整体放大 5 倍,意思没变、方向没变,相似度<b>照样是 ${pct(d.near.c)}%</b>。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return `查询词「<b>${d.word}</b>」。拖动朱字换词。我们要给它找「最像的邻居」。`;
    case 1: return "<b>余弦相似度 = (u·v)/(|u||v|)</b>。为什么用方向不用距离?因为含义更多体现在「朝向」上——向量放大不改变意思。";
    case 2: return `「${d.word}」对其余词的相似度都算出来了(条越长越像)。同类的明显更高。`;
    case 3: return `和「${d.word}」最像的是「<b>${d.near.w}</b>」(${d.near.c.toFixed(2)})。给词找最近邻,就是<b>近义词检索</b>。`;
    case 4: return "余弦<b>只看方向、不看长短</b>:向量整体放大,相似度不变。所以它特别适合度量「含义」。";
    default: return "拖动朱字换查询词,点「演法」看相似度排序与最近邻。";
  }
}

const pyCode = `import numpy as np
VOCAB = ["猫", "狗", "桌子", "椅子"]
stoi = {w: i for i, w in enumerate(VOCAB)}
E = np.array([[0.9,0.8,0.1],[0.8,0.9,0.2],[0.1,0.2,0.9],[0.2,0.1,0.8]])

def cosine(u, v):
    return float(u @ v / (np.linalg.norm(u) * np.linalg.norm(v)))

q = "猫"
for w in VOCAB:
    if w == q: continue
    print(f"cos({q}, {w}) = {cosine(E[stoi[q]], E[stoi[w]]):+.3f}")

# 只看方向:放大 5 倍,相似度不变
print("cos(猫×5, 狗) =", round(cosine(E[0]*5, E[1]), 3))   # 仍是 0.990`;

export const cosineDemo = {
  title: "演武场 · 度义之尺",
  intro: "上一式从表里取出了每个词的向量。可「猫离狗近、离桌子远」——这个「近」到底怎么<b>量</b>?需要一把尺子:<b>余弦相似度</b>。" +
    "它不看两个向量隔多远,只看<b>方向</b>有多一致:越接近 1 越像。" +
    "拖动<b>查询词</b>,看它和其它词的相似度排序、找出<b>最近邻</b>,并验证「放大向量、相似度不变」。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "余弦相似度", d: "<b>cos(u,v) = (u·v)/(|u|·|v|)</b>,范围 -1~1。越接近 1 方向越一致(越像);0 表示不相关;-1 表示方向相反。" },
    { t: "为什么用方向不用距离", d: "含义更多体现在「朝向」上。一个词向量整体<b>放大两倍,意思没变、方向也没变</b>,余弦照样是 1。距离则会被向量长短干扰。" },
    { t: "近义词检索", d: "给一个词,算它和所有词的余弦,取最大的几个,就是它的「最近邻」=最相似的词。搜索、推荐里的「找相似」都是这么做的。" },
    { t: "点积 (dot product)", d: "<b>u·v = Σ uᵢvᵢ</b>,把对应位相乘再相加。它同时含了「方向是否一致」和「向量多长」两层信息;除以两者长度,就只剩方向。" },
  ],
  localCmd: "cd llm-volume/ch05-embedding/code && python3 similarity.py",
};


export default { name: 'GewuCosineSimDemo' }
</script>
