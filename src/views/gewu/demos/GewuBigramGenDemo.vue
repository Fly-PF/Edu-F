<script lang="jsx">
// 卷三 · 第二式 · 无中生有:从边界符出发,按概率掷骰子抽字,造出新名字
import { VOCAB, V, STOI, TOKEN, buildP, mulberry32 } from "./ch03corpus.js";

const lines = [
  { text: "P = counts_to_probs(N)        # 每行归一化成概率", stage: 0 },
  { text: "rng = default_rng({{seed}})   # 掷骰子的种子(换种子=换名字)", stage: 1 },
  { text: "idx = stoi['·']               # 从边界符出发", stage: 2 },
  { text: "while True:", stage: 3 },
  { text: "    idx = rng.choice(V, p=P[idx])  # 按概率抽下一个字", stage: 3 },
  { text: "    if itos[idx] == '·': break     # 抽到边界符就收尾", stage: 4 },
  { text: "    name += itos[idx]", stage: 3 },
];

const paramDefs = {
  seed: { min: 1, max: 40, step: 1 },
};
const initial = { seed: 12 };

const ALPHA = 1;
const P = buildP(ALPHA);

// 给定 seed,完整跑一遍生成,记录每一步:从哪个字、抽到哪个字
function compute(p) {
  const rnd = mulberry32(p.seed);
  let idx = STOI[TOKEN];
  const steps = []; // {from, fromIdx, picked, pickedIdx, probs, isEnd}
  let name = "";
  for (let guard = 0; guard < 8; guard++) {
    const probs = P[idx];
    const r = rnd();
    let acc = 0, j = 0;
    for (; j < V; j++) { acc += probs[j]; if (r < acc) break; }
    const picked = VOCAB[j];
    const isEnd = picked === TOKEN;
    const start = acc - probs[j];
    steps.push({ from: VOCAB[idx], fromIdx: idx, picked, pickedIdx: j, probs, r, start, end: acc, isEnd });
    if (isEnd) break;
    name += picked;
    idx = j;
  }
  return { steps, name };
}

const BW = 26, GAP = 7, BASE = 256, MAXH = 150, X0 = 30;

function Viz({ derived: d, stage, play }) {
  const steps = d.steps;
  // 演法:取到当前 step;非演法时展示最终名字 + 最后一步分布
  const k = play && play.step != null ? Math.min(play.step, steps.length - 1) : steps.length - 1;
  const cur = steps[k] || steps[steps.length - 1];
  const built = steps.slice(0, k).filter((s) => !s.isEnd).map((s) => s.picked).join("");
  // 当前正在采样的分布:画出概率最高的若干字
  const probs = cur ? cur.probs : P[STOI[TOKEN]];
  const items = VOCAB.map((c, j) => ({ ch: c, p: probs[j], j }))
    .sort((a, b) => b.p - a.p).slice(0, 9);
  const mx = Math.max(...items.map((it) => it.p));
  return (
    <svg viewBox="0 0 360 390" width="360" height="390">
      {/* 已生成的名字 */}
      <text x={30} y={28} fill="#8a7656" font-size="13">已生成:</text>
      <text x={104} y={32} fill="#9e2b1e" font-size="24" font-family="serif">
        {built || "(空)"}
        {cur && !cur.isEnd && <tspan fill="#3f6b4f">{cur.picked}</tspan>}
        {cur && cur.isEnd && <tspan fill="#3f6b4f" font-size="18">·收尾</tspan>}
      </text>
      <line x1={22} y1={48} x2={338} y2={48} stroke="#cdb98e" stroke-width="0.6" />

      <text x={30} y={72} fill="#8a7656" font-size="12">
        从「<tspan fill="#6b3a2e" font-size="15">{cur ? cur.from : TOKEN}</tspan>」出发,按下面的概率掷骰子 →
      </text>

      <line x1={X0 - 6} y1={BASE} x2={344} y2={BASE} stroke="#6b3a2e" stroke-width="1.2" />
      {items.map((it, i) => {
        const h = Math.max(2, (it.p / mx) * MAXH);
        const x = X0 + i * (BW + GAP);
        const isPicked = cur && it.j === cur.pickedIdx;
        return (
          <g key={it.ch}>
            <rect x={x} y={BASE - h} width={BW} height={h} rx="2"
              fill={isPicked ? "#3f6b4f" : "#9c7b2e"}
              opacity={isPicked ? 1 : 0.55}
              style={{ transition: "all .3s ease" }} />
            <text x={x + BW / 2} y={BASE + 18} fill={isPicked ? "#3f6b4f" : "#5a4a36"}
              font-size="14" text-anchor="middle">{it.ch === TOKEN ? "·" : it.ch}</text>
            {isPicked && (
              <text x={x + BW / 2} y={BASE - h - 6} fill="#3f6b4f" font-size="11"
                text-anchor="middle">✓抽中</text>
            )}
          </g>
        );
      })}
      <text x={X0 - 6} y={290} fill="#8a7656" font-size="11">绿柱=本步抽中的字 · 概率越高越容易被抽中</text>
      {cur && (
        <>
          <line x1={24} y1={310} x2={336} y2={310} stroke="#cdb98e" stroke-width="0.8" />
          <text x={24} y={334} fill="#9e2b1e" font-size="12">随机数如何落到某个字</text>
          <text x={24} y={356} fill="#5a4a36" font-size="10.5">
            本步随机数 r = <tspan fill="#9c7b2e">{cur.r.toFixed(3)}</tspan>
          </text>
          <text x={24} y={376} fill="#5a4a36" font-size="10.5">
            累计概率区间 [{cur.start.toFixed(3)}, {cur.end.toFixed(3)}) 对应
            <tspan fill="#3f6b4f">「{cur.picked}」</tspan>
          </text>
        </>
      )}
    </svg>
  );
}

function frames(p, d) {
  const fr = [
    { line: 1, stage: 0, step: 0, say: "把计数表每行归一化成概率 <b>P</b>。有了概率,就能<b>采样</b>(掷骰子抽字)。" },
    { line: 2, stage: 1, step: 0, say: `定一颗随机种子 <b>seed=${p.seed}</b>:同种子永远生成同一串名字,换种子就换一批。` },
    { line: 3, stage: 2, step: 0, say: "从边界符「<b>·</b>」出发——它代表「开头」。" },
  ];
  d.steps.forEach((s, i) => {
    if (s.isEnd) {
      fr.push({ line: 6, stage: 4, step: i,
        say: `从「${s.from}」抽到了<b>边界符</b>,名字到此<b>收尾</b>。最终生成:<b>${d.name || "(空名)"}</b>。` });
    } else {
      fr.push({ line: 5, stage: 3, step: i + 1,
        say: `第 ${i + 1} 步:从「${s.from}」按概率掷骰子,抽中「<b>${s.picked}</b>」,接上去。` });
    }
  });
  if (!d.steps.some((s) => s.isEnd)) {
    fr.push({ line: 4, stage: 4, step: d.steps.length,
      say: `生成:<b>${d.name}</b>(到长度上限自动收住)。` });
  }
  return fr;
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "每行归一化成概率分布 <b>P</b>,这是采样的前提。";
    case 1: return `随机种子 <b>seed=${p.seed}</b>。拖动它换一颗骰子,生成不同的名字「<b>${d.name || "(空)"}</b>」。`;
    case 2: return "从边界符「<b>·</b>」起步:它既是开头也是结尾。";
    case 3: return `按概率抽字、接上、再抽……一个字接一个字。这就是 <b>ChatGPT 写字</b>的方式。`;
    case 4: return `抽到边界符即收尾。本次生成:<b>${d.name || "(空名)"}</b>——语料里<b>根本没有</b>这个名字,是「学」出来的。`;
    default: return "拖动 seed 换种子,点「演法」逐字看它如何采样生成。";
  }
}

const pyCode = `import numpy as np

# 用一小批名字现场建表(完整版见 corpus.py)
NAMES = ["天明","天宇","天华","春华","春燕","明华","明远",
         "海燕","海涛","云飞","云龙","志强","志明","国华","国强"]
TOKEN = "·"
chars = sorted(set(TOKEN) | set("".join(NAMES)))
stoi = {c: i for i, c in enumerate(chars)}
itos = {i: c for c, i in stoi.items()}
V = len(chars)

N = np.zeros((V, V))
for nm in NAMES:
    chs = [TOKEN] + list(nm) + [TOKEN]
    for a, b in zip(chs, chs[1:]):
        N[stoi[a], stoi[b]] += 1
P = (N + 1) / (N + 1).sum(axis=1, keepdims=True)

rng = np.random.default_rng(9)
for _ in range(8):
    idx, out = stoi[TOKEN], []
    while True:
        idx = rng.choice(V, p=P[idx])
        if itos[idx] == TOKEN or len(out) >= 4:
            break
        out.append(itos[idx])
    print("".join(out))`;

export const bigramGenDemo = {
  title: "演武场 · 无中生有",
  intro: "<b>生成 = 按概率反复采样</b>:从边界符出发,按当前字的概率分布掷骰子抽下一个字," +
    "接上去,再抽……直到抽到边界符收尾。拖动 <b>seed</b> 换骰子,点<b>演法</b>逐字观摩。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1050,
  bridge: {
    prev: ["卷三第一式概率表"],
    current: ["随机数 r", "累计概率区间", "逐字采样"],
    next: ["temperature/top-k/top-p", "GPT 自回归生成"],
    sources: ["llm-volume/ch03-language-model/code/bigram_counts.py", "web/src/demos/ch03corpus.js"],
  },
  terms: [
    { t: "采样 (sampling)", d: "按概率「掷骰子」抽一个结果。概率 50% 的字约一半时候被抽中——<b>不是</b>每次都选最高的那个,所以同一个模型能生成多种不同的名字。" },
    { t: "随机种子 (seed)", d: "决定这串「随机」骰子怎么掷的一个数。<b>同一个 seed 永远得到同一串结果</b>(可复现);换 seed 就换一批名字。计算机的随机其实是「伪随机」,由种子完全决定。" },
    { t: "自回归 (autoregressive)", d: "把刚生成的字接回输入,再拿它去猜下一个字,如此循环。ChatGPT 也是这样<b>一个字接一个字</b>吐出来的,并非一次想好整句。" },
    { t: "收尾 / 边界符", d: "抽到边界符 <code>·</code> 就停下。模型自己学会了「名字该多长」——这就是它知道何时结束的方式。" },
  ],
  localCmd: "cd llm-volume/ch03-language-model/code && python3 bigram_counts.py",
};


export default { name: 'GewuBigramGenDemo' }
</script>
