// ch03 共享语料 —— 与 ch03-language-model/code/corpus.py 完全一致
// 一批中文名字;语言模型的任务就是看着前面的字、猜下一个字。
export const NAMES = [
  "天明", "天宇", "天佑", "天华",
  "小龙", "小川", "小雨", "小满", "晓彤",
  "春华", "春燕", "春明", "志强", "志明", "志华",
  "建国", "建华", "建明", "国华", "国强", "国栋",
  "云飞", "云龙", "云帆", "海燕", "海涛", "海明",
  "明华", "明远", "明轩", "文华", "文轩", "文静",
  "雨桐", "雨欣", "梓涵", "梓轩", "子轩", "宇轩",
  "嘉文", "嘉豪", "佳怡", "思远", "思齐",
];

export const TOKEN = "·"; // 开头/结尾的边界符

const chars = new Set([TOKEN]);
for (const nm of NAMES) for (const c of nm) chars.add(c);
export const VOCAB = [...chars].sort();
export const V = VOCAB.length; // = 40
export const STOI = {};
VOCAB.forEach((c, i) => (STOI[c] = i));

export function bigrams(nm) {
  const s = [TOKEN, ...nm, TOKEN];
  const out = [];
  for (let i = 0; i < s.length - 1; i++) out.push([s[i], s[i + 1]]);
  return out;
}

// 计数矩阵 N[i][j] = 字 i 后面跟字 j 的次数(全局算一次)
export const N = Array.from({ length: V }, () => new Array(V).fill(0));
for (const nm of NAMES) for (const [a, b] of bigrams(nm)) N[STOI[a]][STOI[b]]++;

// 某一行加 alpha 平滑后归一化成概率分布
export function rowProbs(ci, alpha) {
  const r = N[ci].map((c) => c + alpha);
  const s = r.reduce((a, b) => a + b, 0);
  return r.map((x) => x / s);
}

// 整张概率表(加 alpha 平滑)
export function buildP(alpha) {
  return N.map((_, i) => rowProbs(i, alpha));
}

// 语料平均交叉熵损失:对每个真实字对累加 -log P[a][b] 再平均
export function avgLoss(P) {
  let tot = 0, n = 0;
  for (const nm of NAMES) for (const [a, b] of bigrams(nm)) {
    tot += -Math.log(P[STOI[a]][STOI[b]]);
    n++;
  }
  return tot / n;
}

// 可复现随机数(mulberry32):同一 seed 生成同一串名字
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
