<script lang="jsx">
// 卷四 · 第二式 · 并对成词:BPE —— 反复把最高频的相邻一对合并成新 token
import { runBPE } from "./ch04tok.js";

const TEXT = "低头思故乡 低头思故乡 举头望明月 低头思故乡";
const FULL = runBPE(TEXT, 5);           // 预先跑满,逐帧回放

const lines = [
  { text: "ids = [字符编号…]              # 从单个字符出发", stage: 0 },
  { text: "for step in range(N):", stage: 1 },
  { text: "    pair = 最高频的相邻一对     # 数频次,挑冠军", stage: 1 },
  { text: "    new_id = 新编号             # 给这一对发个新 token", stage: 2 },
  { text: "    ids = merge(ids, pair, new_id)  # 全替换成新 token", stage: 3 },
  { text: "# 常见组合长成整块,序列越变越短", stage: 4 },
];

const paramDefs = {
  n: { min: 0, max: 5, step: 1, fmt: (v) => v + " 次", label: '合并次数' },
};
const initial = { n: 5 };

function compute(p) {
  const k = Math.min(p.n, FULL.snapshots.length - 1);
  const snap = FULL.snapshots[k];
  return {
    k,
    snap,
    initLen: FULL.initLen,
    rules: FULL.snapshots.slice(1, k + 1).map((s) => ({
      from: s.pair, to: s.merged, id: s.mergedId, freq: s.freq,
    })),
  };
}

// 一个 token 块的宽度随字符串长度增长(合并出的块更宽,直观看出「长」起来)
const tokColor = (len) => (len >= 5 ? "#9e2b1e" : len >= 2 ? "#c0632e" : "#9c7b2e");

function Viz({ derived: d, stage, play }) {
  // 演法时,play.step 指定看到第几个快照;否则看当前 n 对应的快照
  const k = play && play.step != null ? play.step : d.k;
  const snap = FULL.snapshots[k];
  const tokens = snap.tokens;
  const justMerged = snap.merged;            // 本步新合并出的字符串(高亮)

  const X0 = 16, RIGHT = 344, TOP = 92, BH = 34;
  const widths = tokens.map((t) => Math.max(22, t.length * 17 + 8));
  // 简单换行排布
  let x = X0, y = TOP;
  const placed = tokens.map((t, i) => {
    const w = widths[i];
    if (x + w > RIGHT) { x = X0; y += BH + 10; }
    const pos = { t, x, y, w, isNew: t === justMerged && justMerged != null };
    x += w + 6;
    return pos;
  });

  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={26} fill="#8a7656" font-size="13">
        已合并 <tspan fill="#9e2b1e" font-size="16">{k}</tspan> 次 ·
        序列 <tspan fill="#9e2b1e" font-size="16">{d.initLen}</tspan> →
        <tspan fill="#9e2b1e" font-size="16"> {tokens.length}</tspan> 个 token ·
        词表 <tspan fill="#9e2b1e" font-size="16">{snap.vocabSize}</tspan>
      </text>

      {snap.merged ? (
        <text x={X0} y={52} fill="#5a4a36" font-size="12.5">
          本步:把「<tspan fill="#9e2b1e">{snap.pair[0]}</tspan>+<tspan fill="#9e2b1e">{snap.pair[1]}</tspan>
          」(出现 {snap.freq} 次)合并为「<tspan fill="#9e2b1e">{snap.merged}</tspan>」
        </text>
      ) : (
        <text x={X0} y={52} fill="#5a4a36" font-size="12.5">
          初始:每个字符各自为一个 token,共 {tokens.length} 个
        </text>
      )}
      <text x={X0} y={72} fill="#8a7656" font-size="11">当前 token 序列(越宽=合并出的越大块):</text>

      {placed.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={BH} rx="4"
            fill={b.isNew ? "#fbeede" : "#f3ead6"}
            stroke={b.isNew ? "#9e2b1e" : "#b89a5e"} stroke-width={b.isNew ? "2" : "1"}
            style={{ transition: "all .3s ease" }} />
          <text x={b.x + b.w / 2} y={b.y + BH / 2 + 6}
            fill={tokColor(b.t.length)} font-size={b.t.length > 2 ? "14" : "16"}
            text-anchor="middle">{b.t === " " ? "␣" : b.t}</text>
        </g>
      ))}

      <text x={X0} y={290} fill="#8a7656" font-size="11">
        红框=本步刚合并出的新 token · ␣=空格
      </text>
    </svg>
  );
}

function frames(p, d) {
  const fr = [{
    line: 1, stage: 0, step: 0,
    say: `从最小单位出发:每个字符各占一个 token,共 <b>${FULL.initLen}</b> 个。BPE 还没做任何合并。`,
  }];
  for (let k = 1; k < FULL.snapshots.length; k++) {
    const s = FULL.snapshots[k];
    const stage = k === 1 ? 1 : k <= 2 ? 2 : 3;
    fr.push({
      line: k === 1 ? 3 : 5, stage, step: k,
      say: `第 ${k} 次:相邻对「<b>${s.pair[0]}+${s.pair[1]}</b>」出现 <b>${s.freq}</b> 次最高频,` +
        `合并成新 token「<b>${s.merged}</b>」。序列剩 <b>${s.ids.length}</b> 个。`,
    });
  }
  const last = FULL.snapshots[FULL.snapshots.length - 1];
  fr.push({
    line: 6, stage: 4, step: FULL.snapshots.length - 1,
    say: `合并完毕:整句「<b>低头思故乡</b>」长成了一个 token。序列从 ${FULL.initLen} 压到 ` +
      `<b>${last.ids.length}</b>,词表 ${last.vocabSize}。常见组合越合越大块。`,
  });
  return fr;
}

function note(stage, p, d) {
  const snap = d.snap;
  switch (stage) {
    case 0: return "BPE 从<b>单个字符</b>起步,反复合并最常一起出现的相邻一对。";
    case 1: return "每轮先<b>数频次</b>:统计所有相邻对,挑出现次数最多的那一对当冠军。";
    case 2: return "给这一对发一个<b>新编号</b>,加进词表——一个新 token 就此诞生。";
    case 3: return `把序列里这一对<b>全部替换</b>成新 token。当前已合并 <b>${d.k}</b> 次,序列剩 <b>${snap.tokens.length}</b> 个。`;
    case 4: return `常见组合被合成整块,序列从 ${d.initLen} 压到 <b>${snap.tokens.length}</b>。这正是 GPT 分词器的核心算法。`;
    default: return `拖动<b>合并次数</b>看序列怎么变短,或点「演法」逐步观摩。当前:合并 ${d.k} 次。`;
  }
}

const pyCode = `from collections import Counter
TEXT = "低头思故乡 低头思故乡 举头望明月 低头思故乡"

def get_stats(ids):
    c = Counter()
    for a, b in zip(ids, ids[1:]): c[(a, b)] += 1
    return c

def merge(ids, pair, nid):
    out, i = [], 0
    while i < len(ids):
        if i < len(ids)-1 and ids[i]==pair[0] and ids[i+1]==pair[1]:
            out.append(nid); i += 2
        else:
            out.append(ids[i]); i += 1
    return out

vocab = {i: ch for i, ch in enumerate(sorted(set(TEXT)))}
stoi = {ch: i for i, ch in vocab.items()}
ids = [stoi[ch] for ch in TEXT]

for step in range(5):
    stats = get_stats(ids)
    pair = max(stats, key=lambda p: (stats[p], -p[0], -p[1]))
    nid = len(vocab); vocab[nid] = vocab[pair[0]] + vocab[pair[1]]
    ids = merge(ids, pair, nid)
    print(f"合并 '{vocab[nid]}' (×{stats[pair]}) -> 剩 {len(ids)} 个")`;

export const bpeDemo = {
  title: "演武场 · 并对成词",
  intro: "字符级太碎、词级又爆炸,折中方案是 <b>BPE(字节对编码)</b>:" +
    "<b>反复把最常一起出现的相邻一对合并成新 token</b>。常见词越合越大块、序列越变越短," +
    "生僻字仍能拆成小片。拖动<b>合并次数</b>,或点「演法」逐步看它「长」出词来。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1150,
  challenge: {
    prompt: 'BPE 每一轮应优先合并哪一对相邻 token？',
    options: ['编号最大的相邻对', '出现频次最高的相邻对', '长度最长的相邻对'],
    correct: 1,
    feedback: '正确：高频相邻对被优先打包，才能最快缩短常见文本的 token 序列。',
    retry: '观察每一步的“出现 N 次最高频”提示；BPE 的选择依据是统计频次。',
    transfer: '试解释：为什么罕见词不必预先收入完整词表，仍然可以被 BPE 编码？',
  },
  terms: [
    { t: "BPE(字节对编码)", d: "Byte Pair Encoding。核心一句话:<b>反复合并最高频的相邻一对</b>。从字符出发,跑 N 次,常见组合就「长」成整块 token。GPT-2/3/4 用的都是它。" },
    { t: "合并 (merge)", d: "把序列里某个相邻对 (a,b) 的<b>每一处</b>都换成一个新 token。新 token 进词表、得一个新编号,下一轮还能继续被合并成更大的块。" },
    { t: "为什么挑最高频", d: "高频的组合(如英文 ing、中文常见词)最值得「打包」:合并它们能最快地缩短序列。低频/生僻的组合则留着拆成小片,避免词表爆炸。" },
    { t: "子词 (subword)", d: "介于字符和词之间的片段,如 token+ization。BPE 的产物就是一堆子词:常见词整块、生僻词由子词拼出——这样既不 OOV,序列又不会太长。" },
    { t: "可复现", d: "频次相同的对,按固定规则(这里按编号顺序)选,保证每次训练出同一套合并规则。编码新文本时也按这套规则的<b>先后顺序</b>复现合并。" },
  ],
  localCmd: "cd llm-volume/ch04-tokenization/code && python3 bpe.py",
};


export default { name: 'GewuBpeDemo' }
</script>
