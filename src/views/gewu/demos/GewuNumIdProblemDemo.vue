<script lang="jsx">
// 卷五 · 第一式 · 数字之惑:编号的距离是假的,one-hot 又人人等距
// 这一式不引入任何新东西,只把「为什么需要词向量」的问题摆清楚。
const VOCAB = ["猫", "狗", "桌子", "椅子"];

// 可切换的「比一比」词对:看它们在编号 / one-hot 下各自的「距离」
const PAIRS = [
  { a: "猫", b: "狗", real: "近(都是动物)" },
  { a: "狗", b: "桌子", real: "远(动物 vs 家具)" },
  { a: "猫", b: "桌子", real: "远(动物 vs 家具)" },
];

const lines = [
  { text: "VOCAB = ['猫','狗','桌子','椅子']    # 编号 0,1,2,3(随便编的)", stage: 0 },
  { text: "pair = '{{p}}'                       # 选两个词比一比(拖朱字)", stage: 1 },
  { text: "d_id = |编号a - 编号b|               # 用编号大小当距离?", stage: 1 },
  { text: "oh = one_hot(a), one_hot(b)         # 补救:各占一格,谁也不比谁大", stage: 2 },
  { text: "d_oh = 距离(oh_a, oh_b)              # 任意两词都 = √2 ≈ 1.414", stage: 3 },
  { text: "# 维度 = 词表大小:5 万词 → 5 万维,全是 0,太浪费", stage: 4 },
];

const paramDefs = {
  p: { min: 0, max: PAIRS.length - 1, step: 1, fmt: (v) => `${PAIRS[v].a}·${PAIRS[v].b}` },
};
const initial = { p: 0 };

function compute(p) {
  const pr = PAIRS[p.p];
  const ia = VOCAB.indexOf(pr.a), ib = VOCAB.indexOf(pr.b);
  return { pr, ia, ib, dId: Math.abs(ia - ib), dOh: Math.SQRT2 };
}

// 数轴上的位置:把编号 0..3 摊在一条线上
const LINE = { x0: 40, x1: 320, y: 78 };
const idX = (i) => LINE.x0 + (i / (VOCAB.length - 1)) * (LINE.x1 - LINE.x0);

function Viz({ derived: d, stage }) {
  const showOh = stage >= 2;
  const showDoh = stage >= 3;
  const showDim = stage >= 4;
  const { ia, ib } = d;

  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      {/* ---- 上半:编号数轴 ---- */}
      <text x={20} y={24} fill="#8a7656" font-size="12.5">
        ① 直接拿<tspan fill="#9e2b1e">编号</tspan>当含义?数轴上的距离是<tspan fill="#9e2b1e">假的</tspan>
      </text>
      <line x1={LINE.x0} y1={LINE.y} x2={LINE.x1} y2={LINE.y} stroke="#cdb98e" stroke-width="1" />
      {VOCAB.map((w, i) => {
        const x = idX(i);
        const hit = i === ia || i === ib;
        return (
          <g key={i}>
            <line x1={x} y1={LINE.y - 4} x2={x} y2={LINE.y + 4} stroke="#b89a5e" stroke-width="1" />
            <circle cx={x} cy={LINE.y} r={hit ? 6 : 4} fill={hit ? "#9e2b1e" : "#b9a06a"}
              style={{ transition: "all .3s ease" }} />
            <text x={x} y={LINE.y - 12} text-anchor="middle" fill={hit ? "#9e2b1e" : "#5a4a36"} font-size="13">{w}</text>
            <text x={x} y={LINE.y + 20} text-anchor="middle" fill="#8a7656" font-size="11">{i}</text>
          </g>
        );
      })}
      {/* 选中对的编号距离 */}
      <text x={20} y={116} fill="#5a4a36" font-size="12.5">
        编号距离 |{ia} − {ib}| = <tspan fill="#9e2b1e" font-size="15">{d.dId}</tspan>
        ,可真实语义是「<tspan fill="#9e2b1e">{d.pr.real}</tspan>」
      </text>
      <text x={20} y={134} fill="#8a7656" font-size="11">
        「猫·狗」距 1、「狗·桌子」也距 1——编号大小纯属巧合,不能算含义
      </text>

      {/* ---- 下半:one-hot ---- */}
      {showOh && (
        <g>
          <line x1={20} y1={150} x2={340} y2={150} stroke="#cdb98e" stroke-width="0.6" />
          <text x={20} y={170} fill="#8a7656" font-size="12.5">
            ② 补救:<tspan fill="#3f6b4f">one-hot</tspan>——第 i 号词的第 i 位为 1,其余全 0
          </text>
          {VOCAB.map((w, r) => {
            const y = 182 + r * 22;
            const hit = r === ia || r === ib;
            return (
              <g key={r}>
                <text x={20} y={y + 11} fill={hit ? "#9e2b1e" : "#8a7656"} font-size="12">{w}</text>
                {VOCAB.map((_, c) => (
                  <rect key={c} x={56 + c * 20} y={y} width={16} height={16} rx="2"
                    fill={c === r ? (hit ? "#9e2b1e" : "#b9a06a") : "#f3ead6"}
                    stroke="#cdb98e" stroke-width="0.7" />
                ))}
                {hit && (
                  <text x={56 + 4 * 20 + 6} y={y + 12} fill="#9e2b1e" font-size="11">
                    [{VOCAB.map((_, c) => (c === r ? 1 : 0)).join(" ")}]
                  </text>
                )}
              </g>
            );
          })}
        </g>
      )}

      {showDoh && !showDim && (
        <text x={186} y={208} fill="#5a4a36" font-size="12">
          <tspan x={186} dy="0">距离(任意两词)</tspan>
          <tspan x={186} dy="18" fill="#9e2b1e" font-size="15">= √2 ≈ 1.414</tspan>
          <tspan x={186} dy="18" fill="#8a7656" font-size="10.5">所有词两两等距</tspan>
          <tspan x={186} dy="16" fill="#8a7656" font-size="10.5">→ 还是看不出猫更像狗</tspan>
        </text>
      )}

      {showDim && (
        <text x={186} y={200} fill="#5a4a36" font-size="12">
          <tspan x={186} dy="0">两个新麻烦:</tspan>
          <tspan x={186} dy="18" fill="#9e2b1e">· 两两都等距(√2)</tspan>
          <tspan x={186} dy="16" fill="#9e2b1e">· 维度=词表大小</tspan>
          <tspan x={186} dy="16" fill="#c0632e" font-size="11">5 万词→5 万维全是 0</tspan>
          <tspan x={186} dy="20" fill="#3f6b4f" font-size="11">→ 需要又短又稠密、</tspan>
          <tspan x={186} dy="15" fill="#3f6b4f" font-size="11">  还能表达含义的向量</tspan>
        </text>
      )}

      {!showOh && (
        <text x={20} y={210} fill="#8a7656" font-size="11.5">点「演法」:先看编号的毛病,再看 one-hot 为什么也不行 ↓</text>
      )}
    </svg>
  );
}

function frames(p, d) {
  return [
    { line: 1, stage: 0, say: "词表里 4 个词,编号 <b>猫=0、狗=1、桌子=2、椅子=3</b>。这编号是我们<b>随便编</b>的。" },
    { line: 3, stage: 1, say: `直接拿编号大小当距离:「${d.pr.a}·${d.pr.b}」的编号距离 = <b>${d.dId}</b>。但「猫·狗」距 1、「狗·桌子」也距 1——<b>编号距离是假的</b>。` },
    { line: 4, stage: 2, say: "一个直接的补救:<b>one-hot</b>——让每个词「各占一格」,第 i 号词第 i 位是 1、其余全 0。谁也不比谁大了。" },
    { line: 5, stage: 3, say: "可新麻烦来了:<b>任意两个不同词的 one-hot 距离都是 √2 ≈ 1.414</b>。所有词两两等距,模型还是看不出「猫更像狗」。" },
    { line: 6, stage: 4, say: "更糟的是<b>维度爆炸</b>:维度 = 词表大小,GPT 词表 5 万~10 万,one-hot 就是几万维、且几乎全是 0,极度浪费。" },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "编号只是「<b>身份证号</b>」,本身不带含义。猫=0、狗=1 的「1」和狗=1、桌子=2 的「1」一样大,但语义上猫狗明明更近。";
    case 1: return `「${d.pr.a}·${d.pr.b}」编号距离 = <b>${d.dId}</b>。问题:编号是随便编的,数值大小<b>纯属巧合</b>,不能拿来算含义。`;
    case 2: return "<b>one-hot</b>:每个词各占一格。它确实解决了「大小是假的」——四个向量谁也不比谁大。";
    case 3: return "但 one-hot 让<b>所有词两两等距(都是 √2)</b>。每个词彼此孤立、毫无远近,依然没有「含义」。";
    case 4: return "再加上<b>维度爆炸</b>(词表多大向量就多长、且几乎全 0)。我们真正想要的:一个<b>又短、又稠密、还能表达含义</b>的向量——下一式登场。";
    default: return "拖动朱字换词对,点「演法」看编号和 one-hot 各自的毛病。";
  }
}

const pyCode = `import numpy as np
VOCAB = ["猫", "狗", "桌子", "椅子"]
stoi = {w: i for i, w in enumerate(VOCAB)}

# 问题1:编号距离是假的
print("|猫-狗|  =", abs(stoi["猫"] - stoi["狗"]))     # 1
print("|狗-桌子|=", abs(stoi["狗"] - stoi["桌子"]))   # 1 —— 一样,但猫狗更近

# 补救:one-hot
def one_hot(i, n):
    v = np.zeros(n); v[i] = 1.0; return v

# 问题2:one-hot 两两等距 + 维度爆炸
cat  = one_hot(stoi["猫"], 4)
dog  = one_hot(stoi["狗"], 4)
tbl  = one_hot(stoi["桌子"], 4)
print("距离(猫,狗)  =", round(float(np.linalg.norm(cat-dog)), 3))  # 1.414
print("距离(猫,桌子)=", round(float(np.linalg.norm(cat-tbl)), 3))  # 1.414 —— 全一样`;

export const numIdDemo = {
  title: "演武场 · 数字之惑",
  intro: "上一卷把文字切成了<b>编号</b>。可这里藏着个大问题:<b>编号只是「身份证号」,本身不带含义</b>。" +
    "猫=0、狗=1、桌子=2——编号 0 和 1 的距离,跟 1 和 2 一模一样,难道猫离狗和狗离桌子一样远?" +
    "这一式先把这个困惑摆清:<b>编号不行,one-hot 也不行</b>。拖动<b>词对</b>,看它们的「距离」为什么都是假的。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1200,
  terms: [
    { t: "token id(编号)", d: "上一卷分词后,每个 token 拿到的整数编号。它只是「身份证号」——用来区分谁是谁,<b>数值大小没有含义</b>,是我们随便编的。" },
    { t: "为什么编号距离是假的", d: "猫=0、狗=1、桌子=2,则 |猫-狗|=1、|狗-桌子|=1,距离一样。但语义上猫狗明明更近。编号的大小、远近纯属巧合,<b>不能拿来算含义</b>。" },
    { t: "one-hot(独热编码)", d: "让每个词「各占一格」:第 i 号词 = 第 i 位为 1、其余全 0。好处:四个向量谁也不比谁大,解决了「编号大小是假的」。" },
    { t: "one-hot 的两个毛病", d: "① <b>两两等距</b>:任意两个不同词的距离都是 √2 ≈ 1.414,看不出谁更像谁;② <b>维度爆炸</b>:维度 = 词表大小,5 万词就是 5 万维,且几乎全是 0,极度浪费。" },
    { t: "我们到底想要什么", d: "一个<b>又短(几百维而非几万维)、又稠密(没有大片 0)、还能表达含义(意思近的词向量也近)</b>的向量。这就是下一式的 <b>Embedding(词嵌入)</b>。" },
  ],
  localCmd: "cd llm-volume/ch05-embedding/code && python3 why_not_id.py",
};


export default { name: 'GewuNumIdProblemDemo' }
</script>
