<script lang="jsx">
// 卷七 · 第一式 · 序中藏位:位置编码 —— 给每个「座位」一个独有的 sin/cos 向量
const SEQ = 6, DM = 8;

// div = 10000^(i/d_model),i = 0,2,4,6 → [1,10,100,1000]
const DIV = [0, 2, 4, 6].map((i) => Math.pow(10000, i / DM));

function peRow(pos) {
  const row = new Array(DM);
  for (let k = 0; k < DM / 2; k++) {
    row[2 * k] = Math.sin(pos / DIV[k]);
    row[2 * k + 1] = Math.cos(pos / DIV[k]);
  }
  return row;
}
const PE = Array.from({ length: SEQ }, (_, p) => peRow(p));
function norm(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

const lines = [
  { text: "# 纯注意力看不出词序:「我吃苹果」≟「苹果吃我」", stage: 0 },
  { text: "pos = {{pos}}                       # 选第几个座位(拖朱字)", stage: 1 },
  { text: "i = [0,2,4,6]; div = 10000^(i/d)   # 每两维一个频率", stage: 2 },
  { text: "PE[pos,偶] = sin(pos/div)          # 偶数维放 sin", stage: 2 },
  { text: "PE[pos,奇] = cos(pos/div)          # 奇数维放 cos", stage: 2 },
  { text: "x = 词向量 + PE[pos]               # 把座位号「掺」进词向量", stage: 3 },
  { text: "# 位置离得越远,编码差别越大", stage: 4 },
];

const paramDefs = { pos: { min: 0, max: SEQ - 1, step: 1, fmt: (v) => v } };
const initial = { pos: 3 };

function compute(p) {
  const pos = p.pos;
  const dists = PE.map((row) => norm(row, PE[pos]));
  return { pos, row: PE[pos], dists };
}

const GX = 66, GY = 78, CW = 32, CH = 26;
function cellFill(v) {
  // v∈[-1,1]:正→朱红,负→苍绿
  const a = (0.12 + Math.abs(v) * 0.8).toFixed(2);
  return v >= 0 ? `rgba(159,43,30,${a})` : `rgba(63,107,79,${a})`;
}

function Viz({ derived: d, stage }) {
  const showDist = stage >= 4;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={22} y={24} fill="#8a7656" font-size="12.5">位置编码矩阵 PE:行=座位号,列=8 个维度</text>
      <text x={22} y={44} fill="#5a4a36" font-size="12">
        <tspan fill="#9e2b1e">朱=正</tspan> · <tspan fill="#3f6b4f">绿=负</tspan>,颜色越深值越大
      </text>

      {/* 列标题 */}
      {Array.from({ length: DM }, (_, j) => (
        <text key={"c" + j} x={GX + j * CW + CW / 2} y={GY - 6} fill="#8a7656" font-size="10" text-anchor="middle">
          {j % 2 === 0 ? "s" : "c"}
        </text>
      ))}
      {/* 行 */}
      {PE.map((row, i) => {
        const sel = i === d.pos;
        return (
          <g key={"r" + i}>
            <text x={GX - 10} y={GY + i * CH + CH / 2 + 4} fill={sel ? "#9e2b1e" : "#5a4a36"}
              font-size="12" text-anchor="end">{i}</text>
            {row.map((v, j) => (
              <rect key={j} x={GX + j * CW} y={GY + i * CH} width={CW - 3} height={CH - 3} rx="2"
                fill={cellFill(v)} stroke={sel ? "#9e2b1e" : "#cdb98e"} stroke-width={sel ? 2 : 0.6}
                style={{ transition: "fill .3s ease" }} />
            ))}
            {showDist && (
              <text x={GX + DM * CW + 8} y={GY + i * CH + CH / 2 + 4}
                fill={sel ? "#9e2b1e" : "#9c7b2e"} font-size="11">
                {i === d.pos ? "本位" : "Δ" + d.dists[i].toFixed(2)}
              </text>
            )}
          </g>
        );
      })}

      <text x={22} y={258} fill="#5a4a36" font-size="11.5">
        第 {d.pos} 位的座位号 = [{d.row.map((v) => v.toFixed(2)).join(", ")}]
      </text>
      <text x={22} y={284} fill="#8a7656" font-size="11.5">
        {showDist
          ? `距第 0 位:第1位 Δ${d.dists[1].toFixed(2)} → 第5位 Δ${d.dists[5].toFixed(2)},越远越大`
          : "每个位置一行,行行不同 → 模型据此分辨先后"}
      </text>
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: "注意力有个盲点:<b>它看不出词序</b>。打乱词,两两点积不变——「我吃苹果」和「苹果吃我」在它眼里几乎一样。" },
    { line: 2, stage: 1, say: `于是给每个<b>位置</b>一个独有的「座位号向量」。这里选第 <b>${d.pos}</b> 个座位。` },
    { line: 4, stage: 2, say: "座位号怎么造?用一组 <b>sin/cos 波形</b>:偶数维放 sin、奇数维放 cos,每两维换一个频率。无需训练,任意长度都能算。" },
    { line: 6, stage: 3, say: "用法极简:<b>词向量 + PE[pos]</b>(逐元素相加),形状不变。从此同一个词在不同位置,送进注意力的向量就不一样了。" },
    { line: 7, stage: 4, say: `关键性质:<b>位置越远,编码差别越大</b>。第 0 位到第 1 位 Δ${d.dists[1].toFixed(2)},到第 5 位 Δ${d.dists[5].toFixed(2)}——模型借此感知相对距离。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "纯注意力对<b>词序不敏感</b>:把句子里的词打乱,每对词的点积不变。可顺序明明很重要,得想办法补上。";
    case 1: return `做法:给每个<b>位置</b>一个独有向量。拖朱字选座位,当前第 <b>${d.pos}</b> 位。`;
    case 2: return "用 <b>sin/cos</b> 造:偶数维 sin、奇数维 cos,频率随维度递减(波长越来越长)。好处:免训练、任意长度可生成、位位不同。";
    case 3: return "注入方式就一个字:<b>加</b>。词向量 + 位置编码,形状不变,再送进 Transformer。";
    case 4: return `每行都不同,且<b>越远差别越大</b>:第0位 vs 第1位 Δ${d.dists[1].toFixed(2)},vs 第5位 Δ${d.dists[5].toFixed(2)}。GPT 系列常改用「可学习位置编码」,思想一致。`;
    default: return "拖朱字选位置,点「演法」看座位号如何生成。";
  }
}

const pyCode = `import numpy as np
def positional_encoding(seq_len, d_model):
    pe = np.zeros((seq_len, d_model))
    pos = np.arange(seq_len)[:, None]
    i = np.arange(0, d_model, 2)
    div = np.power(10000.0, i / d_model)
    pe[:, 0::2] = np.sin(pos / div)   # 偶数维 sin
    pe[:, 1::2] = np.cos(pos / div)   # 奇数维 cos
    return pe

pe = positional_encoding(6, 8)
print("第0位 vs 第1位:", round(np.linalg.norm(pe[0]-pe[1]), 3))  # 0.964
print("第0位 vs 第5位:", round(np.linalg.norm(pe[0]-pe[5]), 3))  # 1.296
# 用法:x = embedding(词) + pe[位置]`;

export const posEncDemo = {
  title: "演武场 · 序中藏位",
  intro: "注意力<b>看不出词序</b>:打乱词,两两点积不变。补救之法——给每个<b>位置</b>一个独有的座位号向量,加到词向量上。" +
    "原版用 <b>sin/cos</b> 波形:免训练、任意长度可生成、位位不同,且<b>越远差别越大</b>。拖朱字选座位看一行。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "为什么需要位置编码", d: "注意力的打分 <b>Q·Kᵀ</b> 与词的先后无关:打乱顺序,每对词的点积不变。所以「我吃苹果」和「苹果吃我」对它几乎等价——必须额外注入位置信息。" },
    { t: "sin/cos 编码", d: "偶数维放 <b>sin(pos/div)</b>、奇数维放 <b>cos(pos/div)</b>,div 随维度增大(频率递减)。无需学习、任意长度可外推、每个位置向量互不相同。" },
    { t: "怎么用", d: "就一个「<b>加</b>」字:<b>词向量 + 位置编码</b>,逐元素相加,形状不变。从此同一个词在不同位置,进注意力的向量也不同。" },
    { t: "可学习位置编码", d: "另一种做法:把位置向量当成<b>参数</b>直接训练。GPT 系列多用这种,下一卷搭 GPT 时会用到。思想都是「给位置一个独有向量」。" },
  ],
  localCmd: "cd llm-volume/ch07-transformer-block/code && python3 positional_encoding.py",
};


export default { name: 'GewuPosEncDemo' }
</script>
