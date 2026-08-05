// 卷五公用:手填的「含义向量表」E,以及余弦相似度。
// 这张 4×3 的表与 ch05-embedding/code 里 embedding_table.py / similarity.py 完全一致:
// 故意让「猫·狗」两行相近、「桌子·椅子」两行相近,演示「相近词向量相近」。

export const VOCAB = ["猫", "狗", "桌子", "椅子"];

export const E = [
  [0.9, 0.8, 0.1], // 猫
  [0.8, 0.9, 0.2], // 狗
  [0.1, 0.2, 0.9], // 桌子
  [0.2, 0.1, 0.8], // 椅子
];

export function oneHot(idx, n) {
  const v = new Array(n).fill(0);
  v[idx] = 1;
  return v;
}

// one-hot 行向量 × E —— 取出的正是第 idx 行(查表的数学本质)
export function oneHotMatMul(idx, n) {
  const oh = oneHot(idx, n);
  return E[0].map((_, c) => oh.reduce((s, v, r) => s + v * E[r][c], 0));
}

export function dot(a, b) {
  return a.reduce((s, x, i) => s + x * b[i], 0);
}

export function norm(a) {
  return Math.sqrt(dot(a, a));
}

export function cosine(a, b) {
  return dot(a, b) / (norm(a) * norm(b));
}
