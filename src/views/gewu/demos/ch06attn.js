// 卷六共享:四个词的玩具向量 + 注意力数学(三式共用)
// X 是 4 个词、每词 3 维的「含义向量」(玩具值)。
export const WORDS = ["我", "吃", "苹果", "了"];

export const X = [
  [1.0, 0.0, 0.0],   // 我
  [0.0, 1.0, 0.3],   // 吃
  [0.0, 0.8, 1.0],   // 苹果(和「吃」在第 2 维上相关)
  [0.2, 0.1, 0.1],   // 了
];

export function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function softmax(arr) {
  const m = Math.max(...arr);
  const e = arr.map((v) => Math.exp(v - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / sum);
}

export function rawScoreMatrix() {
  return X.map((xi) => X.map((xj) => dot(xi, xj)));
}

// 原始自注意力(无 Q/K/V):scores = X·Xᵀ,逐行 softmax,Y = 权重·X
export function rawAttention(qi, mask) {
  const scores = X.map((xj) => dot(X[qi], xj));
  let masked = scores.slice();
  if (mask) masked = masked.map((s, j) => (j <= qi ? s : -Infinity));
  const weights = softmax(masked);
  const y = [0, 0, 0];
  weights.forEach((w, j) => { if (w > 0) X[j].forEach((v, k) => (y[k] += w * v)); });
  return { scores, weights, y };
}

// 一个 3×3 的小投影矩阵(玩具值),用于 Q/K/V 演示
export const Wq = [[0.5, 0.1, 0.0], [0.0, 0.6, 0.2], [0.1, 0.0, 0.7]];
export const Wk = [[0.6, 0.0, 0.1], [0.1, 0.5, 0.0], [0.0, 0.2, 0.6]];
export const Wv = [[0.7, 0.0, 0.0], [0.0, 0.7, 0.1], [0.1, 0.0, 0.6]];

export function matVec(M, v) {
  return M.map((row) => dot(row, v));
}

export function projectQKV() {
  return {
    Q: X.map((x) => matVec(Wq, x)),
    K: X.map((x) => matVec(Wk, x)),
    V: X.map((x) => matVec(Wv, x)),
  };
}

export function qkvScoreMatrix() {
  const { Q, K, V } = projectQKV();
  const scale = Math.sqrt(Q[0].length);
  const scores = Q.map((qi) => K.map((kj) => dot(qi, kj) / scale));
  const weights = scores.map((row) => softmax(row));
  const Y = weights.map((row) => {
    const y = new Array(V[0].length).fill(0);
    row.forEach((w, j) => V[j].forEach((v, k) => (y[k] += w * v)));
    return y;
  });
  return { Q, K, V, scores, weights, Y };
}
