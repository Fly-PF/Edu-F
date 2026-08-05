<script lang="jsx">
// 卷六 · 第三式 · 隐于未来:causal mask —— 只许看左边,不许偷看答案
import { MatrixHeatmap } from "../GewuTracePanels.vue";
import { WORDS, rawAttention, rawScoreMatrix, softmax } from "./ch06attn.js";

const lines = [
  { text: "S = Q @ K.T             # 先算完整分数", stage: 0 },
  { text: "M = tril(ones(T, T))    # 下三角可见", stage: 1 },
  { text: "future = ~M             # 上三角是未来", stage: 1 },
  { text: "S_mask = where(M, S, -inf)", stage: 2 },
  { text: "W = softmax(S_mask)     # 未来权重归零", stage: 3 },
  { text: "q = '{{q}}'             # 拖朱字看一行", stage: 4 },
  { text: "w = W[q]                # 第 q 行不偷看", stage: 4 },
  { text: "# 并行算全矩阵,mask 保因果", stage: 4 },
];

const paramDefs = { q: { min: 0, max: WORDS.length - 1, step: 1, fmt: (v) => WORDS[v] } };
const initial = { q: 2 };

function compute(p) {
  const scoreMatrix = rawScoreMatrix();
  const maskedScores = scoreMatrix.map((row, i) => row.map((v, j) => (j <= i ? v : -Infinity)));
  const weightRows = maskedScores.map((row) => softmax(row));
  const rows = WORDS.map((_, i) => rawAttention(i, true).weights);
  return { qi: p.q, word: WORDS[p.q], scoreMatrix, maskedScores, weightRows, rows };
}

function Viz({ derived: d, stage }) {
  const applied = stage >= 3;
  const matrix = stage >= 3 ? d.weightRows : stage >= 2 ? d.maskedScores : d.scoreMatrix;
  return (
    <svg viewBox="0 0 360 320" width="360" height="320">
      <text x={22} y={24} fill="#8a7656" font-size="12.5">注意力矩阵:行=主角,列=被看的词</text>
      <text x={22} y={44} fill="#5a4a36" font-size="12">
        {applied ? "softmax 后未来格权重为 0" : "先算全矩阵,再把上三角未来格改成 -∞"}
      </text>

      <MatrixHeatmap
        x={34}
        y={74}
        rows={WORDS}
        cols={WORDS}
        values={matrix}
        cell={39}
        title={applied ? "weights" : stage >= 2 ? "masked scores" : "raw scores"}
        highlightRow={stage >= 4 ? d.qi : null}
        formatter={(v) => {
          if (v === -Infinity) return "-∞";
          return applied ? Math.round(v * 100) + "%" : v.toFixed(2);
        }}
        fillFor={(v, i, j) => {
          if (j > i && stage >= 1 && !applied) return "#f0d2cc";
          if (v === -Infinity) return "#efe6d2";
          if (applied) return v > 0 ? `rgba(158,43,30,${0.12 + v * 0.82})` : "#eee3cf";
          return j <= i && stage >= 1 ? "#d7e6d8" : `rgba(156,123,46,${0.10 + Math.min(1, Math.abs(v)) * 0.44})`;
        }}
      />

      <text x={22} y={294} fill="#8a7656" font-size="11.5">
        {applied ? `第「${d.word}」行:只在自己和左侧词上有权重` : "绿色=可见,红色=未来屏蔽区"}
      </text>
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: "先算出<b>完整</b>的注意力打分矩阵:每个词对每个词都有分。" },
    { line: 2, stage: 1, say: "构造下三角可见矩阵:每一行只能看到自己和左边。上三角就是未来位置,必须屏蔽。" },
    { line: 4, stage: 2, say: "把未来位置的打分替换成 <b>-∞</b>。这一步还没归一,只是先把作弊通道关掉。" },
    { line: 5, stage: 3, say: "再 softmax:<b>exp(-∞)=0</b>,于是未来位置权重归零,每一行仍然自动归一。" },
    { line: 7, stage: 4, say: `看第「<b>${d.word}</b>」行:它只把注意力分给<b>自己和左侧</b>的词。训练可并行算全矩阵,但因果性没有被破坏。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "完整打分矩阵:行是主角,列是被关注的词,每格一个相关度分数。";
    case 1: return "GPT 是<b>自回归</b>的:写第 t 个字时只知道前面的字。所以「看未来」是作弊,必须禁止。";
    case 2: return "做法:未来位置(上三角)的打分设为 <b>-∞</b>。图中红格打 ✕。";
    case 3: return "softmax 后 <b>exp(-∞)=0</b>:未来位置权重正好为 0,且每行仍自动归一(和=1)。";
    case 4: return `第「<b>${d.word}</b>」行只在它及左边的词上有权重。这叫 <b>causal mask(因果屏蔽)</b>,是 GPT 类模型的标配。`;
    default: return "拖朱字选一行,点「演法」看屏蔽如何生效。";
  }
}

const pyCode = `import numpy as np
WORDS = ["我", "吃", "苹果", "了"]
n = len(WORDS)
scores = np.random.randn(n, n)          # 假装这是 Q·Kᵀ
mask = np.tril(np.ones((n, n), dtype=bool))   # 下三角=可见
scores = np.where(mask, scores, -np.inf)      # 未来设为 -∞
def softmax(z):
    e = np.exp(z - z.max(-1, keepdims=True)); return e / e.sum(-1, keepdims=True)
weights = softmax(scores)
print((weights * 100).round(0))   # 上三角全为 0`;

export const attnMaskDemo = {
  title: "演武场 · 隐于未来",
  intro: "GPT 逐字生成,写第 t 个字时<b>看不到</b>后面的字。注意力必须加一道 <b>causal mask</b>:把「未来」位置的打分设为 <b>-∞</b>," +
    "softmax 后它们权重归零。于是注意力矩阵只剩<b>下三角</b>。拖动朱字选某一行,看它只关注自己与左侧。",
  bridge: {
    prev: ["ch06 Q/K/V 打分矩阵", "ch03/ch09 猜下一个字"],
    current: ["上三角未来屏蔽", "scores[future] = -∞", "softmax 后权重为 0"],
    next: ["GPT 自回归训练", "Transformer Block", "KV cache"],
    sources: ["llm-volume/ch06-attention/code/causal_mask.py", "web/src/demos/ch06attn.js"],
  },
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "causal mask", d: "因果屏蔽。在注意力打分上把「当前位置之后」的格子设为 <b>-∞</b>,确保每个词只能看到自己和左侧——符合「从左往右生成」的因果性。" },
    { t: "为什么用 -∞", d: "softmax 里 <b>exp(-∞)=0</b>。把屏蔽位设为 -∞,经 softmax 后权重精确为 0,同时其余位置仍正常归一(和=1),无需额外处理。" },
    { t: "自回归 (autoregressive)", d: "一个字一个字生成,每步只依赖已生成的内容。训练时用 mask 模拟这种「看不到未来」,推理时才能逐字往外吐。" },
    { t: "下三角矩阵", d: "<b>np.tril</b> 取下三角(含对角线)=可见区。第 i 行恰好可见前 i+1 个位置,完美对应「第 i 个词能看到前 i 个词」。" },
  ],
  localCmd: "cd llm-volume/ch06-attention/code && python3 causal_mask.py",
};


export default { name: 'GewuAttnMaskDemo' }
</script>
