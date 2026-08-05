<script lang="jsx">
// 卷六 · 第一式 · 顾盼生义:每个词「看」别的词,加权汇总成新含义
import { MatrixHeatmap } from "../GewuTracePanels.vue";
import { WORDS, X, rawAttention, rawScoreMatrix, softmax } from "./ch06attn.js";

const lines = [
  { text: "X = token_vectors       # 四个词的含义向量", stage: 0 },
  { text: "S = X @ X.T             # 所有词两两点积", stage: 2 },
  { text: "q = '{{q}}'             # 选一行当主角", stage: 1 },
  { text: "s = S[q]                # 主角看各词的分数", stage: 2 },
  { text: "W = softmax(S)          # 每一行各自归一", stage: 3 },
  { text: "w = W[q]                # 主角的注意力分配", stage: 3 },
  { text: "C[j] = w[j] * X[j]      # 第 j 个词的贡献向量", stage: 4 },
  { text: "y = C[0]+C[1]+C[2]+C[3] # 逐维相加成新含义", stage: 5 },
];

const paramDefs = {
  q: { min: 0, max: WORDS.length - 1, step: 1, fmt: (v) => WORDS[v] },
};
const initial = { q: 2 };  // 默认主角「苹果」

function compute(p) {
  const r = rawAttention(p.q, false);
  const scoreMatrix = rawScoreMatrix();
  const weightRows = scoreMatrix.map((row) => softmax(row));
  const contribs = r.weights.map((w, j) => X[j].map((v) => w * v));
  return { qi: p.q, word: WORDS[p.q], scoreMatrix, weightRows, contribs, ...r };
}

const fmt = (v) => v.toFixed(2);

function Viz({ derived: d, stage }) {
  const X0 = 20, BARX = 222, BARW = 102, ROWH = 28, TOP = 98;
  const showW = stage >= 3;
  const showScore = stage >= 2;
  const top = d.weights
    .map((w, j) => ({ j, w }))
    .filter((x) => x.j !== d.qi)
    .sort((a, b) => b.w - a.w)[0];

  if (stage >= 4) {
    return (
      <svg viewBox="0 0 360 420" width="360" height="420">
        <text x={18} y={24} fill="#8a7656" font-size="12.5">
          最后一步拆开看:权重是一个数,会缩放整条词向量
        </text>
        <text x={18} y={46} fill="#5a4a36" font-size="11.5">
          主角「<tspan fill="#9e2b1e">{d.word}</tspan>」的权重 w = [{d.weights.map(fmt).join(", ")}]
        </text>

        <text x={18} y={76} fill="#9e2b1e" font-size="11.5">C[j] = w[j] * X[j]</text>
        {WORDS.map((word, j) => {
          const y = 96 + j * 46;
          const hot = j === d.qi;
          return (
            <g key={word}>
              <rect x={216} y={y - 15} width={104} height={22} rx="3"
                fill={hot ? "rgba(158,43,30,0.08)" : "rgba(63,107,79,0.07)"}
                stroke={hot ? "#9e2b1e" : "#cdb98e"} stroke-width="0.6" />
              <text x={18} y={y} fill={hot ? "#9e2b1e" : "#5a4a36"} font-size="11.5">{word}</text>
              <text x={54} y={y} fill="#9c7b2e" font-size="10.5">{fmt(d.weights[j])}</text>
              <text x={88} y={y} fill="#8a7656" font-size="10.5">×</text>
              <text x={106} y={y} fill="#5a4a36" font-size="10.5">[{X[j].map(fmt).join(", ")}]</text>
              <text x={202} y={y} fill="#8a7656" font-size="10.5">=</text>
              <text x={220} y={y} fill="#3f6b4f" font-size="10.5">[{d.contribs[j].map(fmt).join(", ")}]</text>
            </g>
          );
        })}

        <line x1={18} y1={286} x2={336} y2={286} stroke="#cdb98e" stroke-width="0.8" />
        <text x={18} y={310} fill="#9e2b1e" font-size="11.5">
          y = C[0] + C[1] + C[2] + C[3]
        </text>
        {stage >= 5 ? (
          <>
            {[0, 1, 2].map((k) => (
              <text key={k} x={28} y={334 + k * 22} fill="#5a4a36" font-size="10.8">
                第{k + 1}维: {d.contribs.map((c) => fmt(c[k])).join(" + ")}
                <tspan fill="#3f6b4f"> = {fmt(d.y[k])}</tspan>
              </text>
            ))}
            <text x={18} y={404} fill="#3f6b4f" font-size="12">
              所以新含义 y = [{d.y.map(fmt).join(", ")}]
            </text>
          </>
        ) : (
          <text x={28} y={334} fill="#8a7656" font-size="11">
            下一帧会把三个维度分别加出来。
          </text>
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 360 340" width="360" height="340">
      <text x={X0} y={26} fill="#8a7656" font-size="12.5">
        主角「<tspan fill="#9e2b1e" font-size="15">{d.word}</tspan>」不是只看一条:整张矩阵都在算
      </text>
      <text x={X0} y={50} fill="#5a4a36" font-size="12">
        X@Xᵀ 分数矩阵 → 选中一行 softmax → 权重@X
      </text>

      <MatrixHeatmap
        x={10}
        y={72}
        rows={WORDS}
        cols={WORDS}
        values={showW ? d.weightRows : d.scoreMatrix}
        cell={31}
        title={showW ? "weights = softmax(scores)" : "scores = X @ Xᵀ"}
        highlightRow={stage >= 1 ? d.qi : null}
        formatter={(v) => showW ? Math.round(v * 100) + "%" : v.toFixed(2)}
        fillFor={(v) => showW
          ? `rgba(158,43,30,${0.10 + v * 0.80})`
          : `rgba(156,123,46,${0.10 + Math.min(1, Math.abs(v)) * 0.52})`}
        showLegend
        legendLabel={showW ? "颜色深浅表示注意力权重" : "颜色深浅表示匹配分数"}
      />

      {WORDS.map((w, j) => {
        const y = TOP + j * ROWH;
        const wt = d.weights[j];
        const barw = Math.max(2, wt * BARW);
        const isSelf = j === d.qi;
        const isTop = showW && top && j === top.j;
        const labelX = BARX + (showW ? barw : 0) + 5;
        const labelAtRight = labelX > 308;
        return (
          <g key={j}>
            <text x={BARX - 10} y={y + 13} fill={isSelf ? "#9e2b1e" : "#5a4a36"} font-size="12" text-anchor="end">{w}</text>
            <rect x={BARX} y={y} width={BARW} height={17} rx="3"
              fill="#efe6d2" stroke="#cdb98e" stroke-width="0.8" />
            {showW && (
              <rect x={BARX} y={y} width={barw} height={17} rx="3"
                fill={isSelf ? "#9e2b1e" : isTop ? "#c0632e" : "#b9a06a"}
                style={{ transition: "width .4s ease" }} />
            )}
            {showScore && (
              <text x={labelAtRight ? 336 : labelX} y={y + 12}
                text-anchor={labelAtRight ? "end" : "start"} fill="#2b2117" font-size="10">
                {showW ? (wt * 100).toFixed(0) + "%" : "分=" + d.scores[j].toFixed(2)}
              </text>
            )}
            {isTop && <text x={BARX + 4} y={y + 12} fill="#fff" font-size="9.5">最关注</text>}
          </g>
        );
      })}

      {stage < 2 && (
        <text x={180} y={246} fill="#8a7656" font-size="10.5">点「演法」:先算整矩阵,再看当前行</text>
      )}
    </svg>
  );
}

function frames(d0, d) {
  const top = d.weights.map((w, j) => ({ j, w })).filter((x) => x.j !== d.qi).sort((a, b) => b.w - a.w)[0];
  return [
    { line: 1, stage: 0, say: "四个词:我、吃、苹果、了。每个词先有一个「含义向量」。注意力要让它们<b>互相参考</b>。" },
    { line: 3, stage: 1, say: `选「<b>${d.word}</b>」当主角。注意力矩阵的第 ${d.qi + 1} 行,就是它环顾整句话的视角。` },
    { line: 4, stage: 2, say: "先算整张 <b>X @ X.T</b> 分数矩阵,再取主角这一行。每格都是两个词向量的点积相关度。" },
    { line: 6, stage: 3, say: `对每一行做 softmax,分数变成权重(和=1)。「${d.word}」最关注「<b>${WORDS[top.j]}</b>」(${(top.w * 100).toFixed(0)}%)。` },
    { line: 7, stage: 4, say: "先看每一份贡献:<b>C[j] = w[j] * X[j]</b>。权重 w[j] 是一个数,会把第 j 个词的整条向量一起放大或缩小。" },
    { line: 8, stage: 5, say: `再把四份贡献<b>逐维相加</b>:第1维加第1维,第2维加第2维,第3维加第3维,得到「${d.word}」的新含义。` },
  ];
}

function note(stage, p, d) {
  const top = d.weights.map((w, j) => ({ j, w })).filter((x) => x.j !== d.qi).sort((a, b) => b.w - a.w)[0];
  switch (stage) {
    case 0: return "注意力的核心一问:理解一个词时,<b>该参考句中哪些词</b>?这一式用最朴素的形式说清。";
    case 1: return `主角是「<b>${d.word}</b>」。拖动朱字换主角。它将对每个词算「相关度」。`;
    case 2: return "<b>点积越大 = 两向量越像 = 越相关</b>。主角对每个词都算一个这样的分数。";
    case 3: return `softmax 把分数化成权重(和为 1)。「${d.word}」把最多注意力给了「<b>${WORDS[top.j]}</b>」。`;
    case 4: return `第 j 个词的贡献是 <b>w[j] × X[j]</b>。比如权重 0.50 乘向量 [0,0.8,1.0],会得到 [0,0.40,0.50]。`;
    case 5: return `所有贡献不是拼接,而是<b>逐维相加</b>。每个维度各加各的,最后得到「${d.word}」的新向量。`;
    default: return "拖动朱字换主角,点「演法」看注意力如何分配。";
  }
}

const pyCode = `import numpy as np
WORDS = ["我", "吃", "苹果", "了"]
X = np.array([[1.,0,0],[0,1.,.3],[0,.8,1.],[.2,.1,.1]])

def softmax(z):
    e = np.exp(z - z.max()); return e / e.sum()

q = 2  # 主角「苹果」
scores = X @ X[q]            # 和每个词的相关度
weights = softmax(scores)    # 归一成注意力权重
y = weights @ X              # 加权汇总 = 新含义
for w, s in zip(WORDS, weights):
    print(f"{w}: {s:.2f}")
print("新含义 y =", y.round(2))`;

export const attnRawDemo = {
  title: "演武场 · 顾盼生义",
  intro: "注意力的核心:理解一个词,要<b>参考句中其它词</b>。最朴素的做法——主角和每个词算<b>相关度</b>(点积)," +
    "softmax 成<b>权重</b>,再把各词向量<b>加权汇总</b>成新含义。拖动<b>主角朱字</b>,看它把注意力分给谁。",
  bridge: {
    prev: ["ch01 点积", "ch01 softmax", "ch05 词向量"],
    current: ["scores=X@Xᵀ", "weights=softmax(scores)", "上下文加权汇总"],
    next: ["Q/K/V 投影", "causal mask", "Transformer Block"],
    sources: ["llm-volume/ch06-attention/code/why_attention.py", "web/src/demos/ch06attn.js"],
  },
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1050,
  terms: [
    { t: "注意力权重", d: "主角分给每个词的「关注度」,softmax 后<b>和为 1</b>。权重大 = 该词对主角新含义贡献大。" },
    { t: "点积当相关度", d: "<b>X[q]·X[j]</b> 越大,两个词向量方向越一致 → 越「相关」。这是最朴素的打分方式。" },
    { t: "上下文融合", d: "新含义是各词的加权和,所以「苹果」的表示自动融入了「吃」——同一个词在不同句子里表示会<b>随上下文而变</b>。" },
    { t: "贡献向量", d: "<b>C[j] = w[j] × X[j]</b>。w[j] 是一个数,会把第 j 个词的整条向量一起放大或缩小。最后 <b>y=C[0]+C[1]+...</b>,是按每个维度分别相加。" },
    { t: "和后面的关系", d: "这一式没有 Q/K/V。下一式会引入三个投影矩阵,让「打分」和「取值」用<b>不同视角</b>,更灵活——那才是真正的 self-attention。" },
  ],
  localCmd: "cd llm-volume/ch06-attention/code && python3 why_attention.py",
};


export default { name: 'GewuAttnRawDemo' }
</script>
