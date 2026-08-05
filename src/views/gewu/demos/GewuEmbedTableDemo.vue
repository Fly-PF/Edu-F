<script lang="jsx">
// 卷五 · 第一式 · 查表取义:编号 → one-hot → 查表取出「含义向量」
import { VOCAB, E, oneHot } from "./ch05emb.js";

// 选一个词,看它「查表」的全过程:编号 -> one-hot -> 取出第 i 行向量
const lines = [
  { text: "E = [[.9 .8 .1],[.8 .9 .2],[.1 .2 .9],[.2 .1 .8]]  # 含义向量表 (4×3)", stage: 0 },
  { text: "w = '{{w}}'                      # 选一个词(拖朱字切换)", stage: 1 },
  { text: "oh = one_hot(stoi[w], 4)         # 先变成 one-hot:第 i 位为 1", stage: 2 },
  { text: "vec = oh @ E                     # one-hot × E = 取出第 i 行", stage: 3 },
  { text: "vec == E[stoi[w]]                # 与「直接按行号取」完全等价", stage: 4 },
];

const paramDefs = {
  w: { min: 0, max: VOCAB.length - 1, step: 1, fmt: (v) => VOCAB[v] },
};
const initial = { w: 0 };

function compute(p) {
  const i = p.w;
  return { i, word: VOCAB[i], oh: oneHot(i, VOCAB.length), vec: E[i] };
}

const fmt = (x) => x.toFixed(1);

function Viz({ derived: d, stage }) {
  const X0 = 20, ROWH = 34, TOP = 78, COLW = 40;
  const showOne = stage >= 2;
  const showVec = stage >= 3;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={24} fill="#8a7656" font-size="12.5">
        含义向量表 E:<tspan fill="#9e2b1e" font-size="15">4</tspan> 行(词)× <tspan fill="#9e2b1e" font-size="15">3</tspan> 列(每词 3 维)
      </text>
      <text x={X0} y={46} fill="#5a4a36" font-size="12.5">
        查「<tspan fill="#9e2b1e" font-size="15">{d.word}</tspan>」= 取出第 <tspan fill="#9e2b1e" font-size="15">{d.i}</tspan> 行
      </text>

      {/* one-hot 列(stage>=2 高亮被选中的位) */}
      {showOne && (
        <text x={X0} y={TOP - 14} fill="#3f6b4f" font-size="11">one-hot</text>
      )}
      {/* 表格:每一行一个词,被选中的行高亮 */}
      {VOCAB.map((w, r) => {
        const y = TOP + r * ROWH;
        const hit = r === d.i;
        return (
          <g key={r}>
            {showOne && (
              <g>
                <rect x={X0} y={y} width={24} height={ROWH - 6} rx="3"
                  fill={hit ? "#9e2b1e" : "#f3ead6"} stroke="#b89a5e" stroke-width="1" />
                <text x={X0 + 12} y={y + (ROWH - 6) / 2 + 5} text-anchor="middle"
                  fill={hit ? "#fff" : "#8a7656"} font-size="13">{hit ? 1 : 0}</text>
              </g>
            )}
            <text x={X0 + 36} y={y + (ROWH - 6) / 2 + 5} fill={hit ? "#9e2b1e" : "#8a7656"}
              font-size="13">{w}</text>
            {E[r].map((val, c) => (
              <g key={c}>
                <rect x={138 + c * COLW} y={y} width={COLW - 5} height={ROWH - 6} rx="3"
                  fill={hit && showVec ? "#f6e0c9" : "#f3ead6"}
                  stroke={hit && showVec ? "#c0632e" : "#cdb98e"} stroke-width={hit && showVec ? 1.4 : 0.8} />
                <text x={138 + c * COLW + (COLW - 5) / 2} y={y + (ROWH - 6) / 2 + 5}
                  text-anchor="middle" fill="#2b2117" font-size="12.5">{fmt(val)}</text>
              </g>
            ))}
          </g>
        );
      })}

      {/* 取出的向量 */}
      {showVec && (
        <g>
          <text x={X0} y={246} fill="#5a4a36" font-size="12.5">
            取出「{d.word}」的含义向量:
          </text>
          <text x={X0} y={270} fill="#9e2b1e" font-size="15">
            [{d.vec.map(fmt).join("  ")}]
          </text>
          {stage >= 4 && (
            <text x={X0} y={290} fill="#3f6b4f" font-size="11">
              ✓ one-hot @ E 取到的 == E[{d.i}](按行号直接取),两者等价
            </text>
          )}
        </g>
      )}
      {!showVec && (
        <text x={X0} y={290} fill="#8a7656" font-size="11">
          编号本身没含义;这张表把每个编号映射成一串能表达含义的小数
        </text>
      )}
    </svg>
  );
}

function frames(p, d) {
  return [
    { line: 1, stage: 0, say: "把上一式那张「词的地图」<b>存成一张表 E</b>:4 行(每行一个词的坐标)× 3 列(每个词用 3 个数表示)。这就是 <b>Embedding 矩阵</b>。" },
    { line: 2, stage: 1, say: `选中词「<b>${d.word}</b>」,它的编号是 <b>${d.i}</b>。` },
    { line: 3, stage: 2, say: `先把编号变成 <b>one-hot</b>:第 ${d.i} 位为 1、其余为 0。` },
    { line: 4, stage: 3, say: `<b>one-hot × E</b> 取出第 ${d.i} 行:<b>[${d.vec.map(fmt).join(", ")}]</b>——这就是「${d.word}」的含义向量。` },
    { line: 5, stage: 4, say: "它和「直接按行号取 <b>E[i]</b>」<b>完全等价</b>。所以查表 = one-hot 乘矩阵 = 网络的一层。" },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "上一式「位置=含义」的那些坐标,要<b>存起来</b>。把它们摞成一张 <b>(词数 × 维度)</b> 的表,就是 Embedding 矩阵。这里用 3 维(上一式为了好看用 2 维)。";
    case 1: return `选中「<b>${d.word}</b>」(编号 ${d.i})。拖动朱字换词,看它在表里对应哪一行。`;
    case 2: return `<b>one-hot</b>:第 ${d.i} 位是 1、其余全 0。它是「查表」这个动作的<b>数学写法</b>。`;
    case 3: return `<b>one-hot @ E</b> = 把 E 的第 ${d.i} 行原样取出 = <b>[${d.vec.map(fmt).join(", ")}]</b>。`;
    case 4: return "查表两种写法等价:<b>E[i]</b>(按行号)和 <b>one-hot @ E</b>(矩阵乘)。理解成矩阵乘,就看清 Embedding 是<b>网络的一层</b>。";
    default: return "拖动朱字换词,点「演法」看「编号 → one-hot → 取出含义向量」。";
  }
}

const pyCode = `import numpy as np
VOCAB = ["猫", "狗", "桌子", "椅子"]
stoi = {w: i for i, w in enumerate(VOCAB)}
E = np.array([
    [0.9, 0.8, 0.1],   # 猫
    [0.8, 0.9, 0.2],   # 狗
    [0.1, 0.2, 0.9],   # 桌子
    [0.2, 0.1, 0.8],   # 椅子
])

def one_hot(idx, n):
    v = np.zeros(n); v[idx] = 1.0; return v

w = "猫"
oh = one_hot(stoi[w], len(VOCAB))
print("查表方式一 E[i]   :", E[stoi[w]])
print("查表方式二 oh @ E :", oh @ E)
print("两者一致吗?", np.allclose(oh @ E, E[stoi[w]]))

# 一整句:一串编号 -> 一叠向量
ids = [stoi[c] for c in ["猫", "狗", "椅子"]]
print("句子向量组 shape =", E[ids].shape)   # (3, 3)`;

export const embedTableDemo = {
  title: "演武场 · 查表取义",
  intro: "上一式我们把词摆成了平面上的<b>点</b>——位置就是含义。可几万个词的坐标,得有个地方<b>存</b>。" +
    "答案朴素得不能再朴素:<b>存成一张表</b>(Embedding 矩阵),每行就是一个词的坐标向量。" +
    "「查一个词」= 取出它那一行。这一式看清:查表既能写成 <b>E[i]</b>(按行号取),也等价于 <b>one-hot × E</b>——拖动朱字换词,看它如何被取出。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1050,
  terms: [
    { t: "Embedding(词嵌入)", d: "用一个<b>稠密的小数向量</b>代表每个词,并让<b>意思相近的词、向量也相近</b>。这是从「符号」迈向「语义」的关键一步。" },
    { t: "Embedding 矩阵", d: "一张 <b>V 行 × D 列</b>的表(V=词表大小,D=向量维度)。第 i 行就是第 i 号词的向量。真实 GPT 里 D 是几百~上万。" },
    { t: "one-hot(独热)", d: "第 i 号词 = 第 i 位为 1、其余全 0 的向量。它解决了「编号大小是假的」,但所有词两两等距(都是 √2)、且维度随词表爆炸,本身没有含义。" },
    { t: "查表 = 矩阵乘", d: "<b>E[i]</b>(按行号取)和 <b>one-hot @ E</b>(用第 i 个 one-hot 乘矩阵)<b>完全等价</b>。真实代码用索引(快得多),但理解成矩阵乘,就能看清 Embedding 是网络的一层。" },
    { t: "一句话 = 一叠向量", d: "一个句子是一串编号,查表后变成 <b>(句长 × D)</b> 的向量叠。这叠向量,才是真正喂进后续网络的输入。" },
  ],
  localCmd: "cd llm-volume/ch05-embedding/code && python3 embedding_table.py",
};


export default { name: 'GewuEmbedTableDemo' }
</script>
