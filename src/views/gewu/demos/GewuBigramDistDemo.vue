<script lang="jsx">
// 卷三 · 第一式 · 数往知来:数一数「当前字」后面跟过哪些字,化作概率分布
import { NAMES, VOCAB, STOI, N, rowProbs } from "./ch03corpus.js";

// 可选的「当前字」(各有有趣的后继分布)
const CANDS = ["天", "小", "明", "国", "云", "海", "·"];
const lines = [
  { text: "# 数语料:每个字后面,各字出现多少次", stage: 0 },
  { text: "N = count_pairs(NAMES)        # N[a][b] = a 后面跟 b 的次数", stage: 1 },
  { text: "", stage: 1 },
  { text: "cur = '{{cur}}'               # 当前字(拖朱字换字)", stage: 2 },
  { text: "row = N[cur] + {{a}}          # 取这一行,+α 平滑", stage: 3 },
  { text: "P = row / row.sum()           # 归一化成概率分布", stage: 4 },
  { text: "print(P)  # 下一个字是谁的概率", stage: 4 },
];

const paramDefs = {
  cur: { min: 0, max: CANDS.length - 1, step: 1, fmt: (v) => CANDS[v] },
  a: { min: 0, max: 3, step: 0.25, fmt: (v) => v.toFixed(2) },
};
const initial = { cur: 0, a: 1 }; // 默认「天」, α=1

function compute(p) {
  const ch = CANDS[p.cur];
  const ci = STOI[ch];
  const probs = rowProbs(ci, p.a);
  // 只取该行真实出现过(count>0)的后继 + 概率最高的几个,排序展示
  const items = VOCAB.map((c, j) => ({ ch: c, cnt: N[ci][j], prob: probs[j] }))
    .sort((a, b) => b.prob - a.prob);
  const seen = items.filter((it) => it.cnt > 0);
  const top = items.slice(0, Math.min(8, Math.max(6, seen.length))); // 至多 8 柱,免得溢出
  const totalSeen = seen.reduce((s, it) => s + it.cnt, 0);
  const smoothTop = top.map((it) => ({ ...it, smooth: it.cnt + p.a }));
  const smoothSum = VOCAB.reduce((s, _, j) => s + N[ci][j] + p.a, 0);
  return { ch, items, seen, top, smoothTop, smoothSum, totalSeen, probs, alpha: p.a };
}

const BW = 30, GAP = 10, BASE = 240, MAXH = 168, X0 = 36;

function Viz({ derived: d, stage }) {
  const showProb = stage >= 3; // 0-2 看计数,3+ 看概率
  const bars = d.top;
  const mxCnt = Math.max(1, ...bars.map((b) => b.cnt));
  const mxPrb = Math.max(...bars.map((b) => b.prob));
  return (
    <svg viewBox="0 0 360 440" width="360" height="440">
      <text x={X0 - 8} y={22} fill="#8a7656" font-size="13">
        当前字「<tspan fill="#9e2b1e" font-size="16">{d.ch}</tspan>」的下一字
        {showProb ? " · 概率分布" : " · 出现次数"}
      </text>
      <line x1={X0 - 8} y1={BASE} x2={352} y2={BASE} stroke="#6b3a2e" stroke-width="1.2" />
      {bars.map((b, i) => {
        const v = showProb ? b.prob : b.cnt;
        const mx = showProb ? mxPrb : mxCnt;
        const h = Math.max(2, (v / mx) * MAXH);
        const x = X0 + i * (BW + GAP);
        const isSeen = b.cnt > 0;
        const fill = showProb ? (isSeen ? "#9e2b1e" : "#c9b79a") : "#9c7b2e";
        return (
          <g key={b.ch}>
            <rect x={x} y={BASE - h} width={BW} height={h} rx="2" fill={fill}
              opacity={isSeen ? 1 : 0.6} style={{ transition: "all .35s ease" }} />
            <text x={x + BW / 2} y={BASE - h - 6} fill="#2b2117" font-size="11"
              text-anchor="middle">
              {showProb ? (b.prob * 100).toFixed(0) + "%" : b.cnt}
            </text>
            <text x={x + BW / 2} y={BASE + 20} fill="#5a4a36" font-size="15"
              text-anchor="middle">{b.ch}</text>
          </g>
        );
      })}
      <text x={X0 - 8} y={296} fill="#8a7656" font-size="11">
        {showProb ? "朱柱=语料里出现过 · 灰柱=平滑给的兜底概率" : `语料里共出现 ${d.totalSeen} 次`}
      </text>
      <line x1={24} y1={312} x2={336} y2={312} stroke="#cdb98e" stroke-width="0.8" />
      <text x={24} y={334} fill="#9e2b1e" font-size="12">这一行如何从次数变概率</text>
      <text x={24} y={354} fill="#5a4a36" font-size="10.5">
        分母 row.sum = 所有候选的 (count + α) = {d.smoothSum.toFixed(2)}
      </text>
      {d.smoothTop.slice(0, 4).map((it, i) => (
        <text key={it.ch} x={24} y={376 + i * 16} fill="#5a4a36" font-size="10">
          P({it.ch}|{d.ch}) = ({it.cnt}+{d.alpha.toFixed(2)}) / {d.smoothSum.toFixed(2)}
          <tspan fill="#3f6b4f"> = {(it.prob * 100).toFixed(1)}%</tspan>
        </text>
      ))}
    </svg>
  );
}

function topList(d, k = 4) {
  return d.seen.slice(0, k).map((it) => `${it.ch} ${(it.prob * 100).toFixed(0)}%`).join("、");
}

function frames(p, d) {
  return [
    { line: 1, stage: 0, say: "语言模型最朴素的做法:<b>数数</b>。看语料里每个字后面都跟过哪些字。" },
    { line: 2, stage: 1, say: `数出一张计数表 <b>N</b>:N[a][b] = 字 a 后面跟字 b 的次数。共 ${NAMES.length} 个名字喂进去。` },
    { line: 4, stage: 2, say: `挑当前字「<b>${d.ch}</b>」。语料里它后面共出现过 <b>${d.totalSeen}</b> 次(金柱)。` },
    { line: 5, stage: 3, say: `每个计数 <b>+α(=${p.a.toFixed(2)})</b> 平滑:给没出现过的字也留一丝概率,免得它<b>永远</b>是 0。` },
    { line: 6, stage: 4, say: `除以总和,化作概率分布。「${d.ch}」最可能接:<b>${topList(d)}</b>。这就是一个迷你语言模型。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "语言模型 = 看前文猜下一字。最笨的办法就是<b>数数</b>。";
    case 1: return "把每一对相邻字 (a→b) 都统计进矩阵 <b>N</b>。";
    case 2: return `当前字「<b>${d.ch}</b>」。拖动上一个朱字换字,看不同字的后继有多不同。`;
    case 3: return `<b>+α 平滑</b>:α=${p.a.toFixed(2)}。拖大它,灰柱(没出现过的字)抬头,分布变平;拖到 0,只信语料。`;
    case 4: return `「${d.ch}」的下一字:<b>${topList(d)}</b>……输入一字、输出一组概率,<b>这就是语言模型</b>。`;
    default: return "拖动朱字换「当前字」,或拖动 α 调平滑。";
  }
}

const pyCode = `import numpy as np
from collections import Counter

NAMES = ["天明","天宇","天佑","天华","春华","春燕","春明",
         "明华","明远","明轩","海燕","海涛","海明"]
after = {}                       # after[前字] = Counter({后字: 次数})
for nm in NAMES:
    chs = ["·"] + list(nm) + ["·"]
    for a, b in zip(chs, chs[1:]):
        after.setdefault(a, Counter())[b] += 1

cur = "天"
cnt = after[cur]
total = sum(cnt.values())
print(f"'{cur}' 后面出现过:", dict(cnt))
for ch, c in cnt.most_common():
    print(f"  P(下一字={ch} | {cur}) = {c}/{total} = {c/total:.2f}")`;

export const bigramDistDemo = {
  title: "演武场 · 数往知来",
  intro: "语言模型最朴素的真身:<b>数数</b>。数出「当前字」后面跟过哪些字、各多少次," +
    "<b>+α 平滑</b>后归一化,就得到「下一个字的概率分布」。" +
    "拖动<b>当前字</b>与<b>平滑 α</b>,看分布即时变化。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode,
  bridge: {
    prev: ["卷一 softmax/归一化"],
    current: ["字对计数", "+α 平滑", "row/sum 变概率"],
    next: ["按概率采样", "交叉熵 loss", "GPT 下一个 token"],
    sources: ["llm-volume/ch03-language-model/code/predict_next.py", "web/src/demos/ch03corpus.js"],
  },
  terms: [
    { t: "归一化 (normalize)", d: "把一组数同时除以它们的总和,使加起来正好 <b>= 1</b>。次数 [4,3,1] 归一化后成概率 [0.5,0.375,0.125]——这样才能当「概率」用。" },
    { t: "α 平滑 (加 α / Laplace smoothing)", d: "给每个计数都先 <b>+α</b> 再归一化。否则语料里没出现过的字概率会是 <b>0</b>,模型就把它判成「绝不可能」,太武断。α 越大,分布越平(越不武断);α→0,越只信语料。" },
    { t: "概率分布 (distribution)", d: "一组非负、且加起来为 1 的数,表示「各个选项各占多大可能」。语言模型每一步输出的就是「下一个字」的概率分布。" },
    { t: "bigram(二元模型)", d: "只看<b>前一个字</b>来猜下一个字的模型。<code>(天→明)</code> 这样相邻的两字对就叫一个 bigram。" },
    { t: "边界符 ·", d: "同时代表「开头」和「结尾」的特殊符号。<code>·天明·</code> 让模型既能学「名字以什么字起头」,也能学「何时收尾」。" },
  ],
  localCmd: "cd llm-volume/ch03-language-model/code && python3 predict_next.py",
};


export default { name: 'GewuBigramDistDemo' }
</script>
