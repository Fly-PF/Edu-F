<script lang="jsx">
// 卷八 · 万法归一:把前面所有积木串成一个完整 GPT —— 数参数、看未训练 loss
// 参数量公式(与 ch08/gpt.py 完全一致,block_size=16, n_head=4):
//   total = 2·vocab·d + block·d + 2d + L·(12d² + 9d)
const BLOCK = 16;

const lines = [
  { text: "vocab = {{vocab}}   d_model = {{d}}   n_layer = {{L}}   # 拖朱字", stage: 0 },
  { text: "x = tok_emb(idx) + pos_emb(pos)    # 词嵌入 + 位置嵌入", stage: 1 },
  { text: "for blk in blocks: x = blk(x)      # N 层 Transformer Block", stage: 2 },
  { text: "x = ln_f(x)                        # 末尾 LayerNorm", stage: 2 },
  { text: "logits = head(x)                   # → (B,T,vocab) 下一字打分", stage: 3 },
  { text: "loss = cross_entropy(logits, 真实下一字)   # 未训练≈ln(vocab)", stage: 4 },
];

const paramDefs = {
  vocab: { min: 10, max: 120, step: 5, fmt: (v) => v },
  d: { min: 16, max: 128, step: 16, fmt: (v) => v },
  L: { min: 1, max: 8, step: 1, fmt: (v) => v },
};
const initial = { vocab: 65, d: 64, L: 3 };

function compute(p) {
  const { vocab, d, L } = p;
  const tok = vocab * d;
  const pos = BLOCK * d;
  const perBlock = 12 * d * d + 9 * d;
  const blocks = L * perBlock;
  const lnf = 2 * d;
  const head = d * vocab;
  const total = tok + pos + blocks + lnf + head;
  return { vocab, d, L, tok, pos, perBlock, blocks, lnf, head, total, lnv: Math.log(vocab) };
}

const fmtN = (n) => n.toLocaleString("en-US");

function Viz({ derived: d, stage }) {
  const BX = 96, BW = 168;
  // 输入端 / 主干 / 输出端 各阶段高亮
  const hot = (s) => (stage === s ? "#9e2b1e" : "#cdb98e");
  const hotW = (s) => (stage === s ? 2 : 0.8);
  // Block 堆:固定区域 y=120..196,层数越多越薄
  const stackTop = 120, stackH = 70;
  const bh = Math.min(16, stackH / d.L);
  const showLoss = stage >= 4;

  // 参数构成占比(底部横条)
  const segs = [
    { k: "词嵌入", v: d.tok, c: "#9c7b2e" },
    { k: "位置", v: d.pos, c: "#b9a06a" },
    { k: `${d.L}×Block`, v: d.blocks, c: "#9e2b1e" },
    { k: "输出头", v: d.head, c: "#3f6b4f" },
  ];
  let acc = 0;
  const barX = 22, barW = 316, barY = 248;

  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={22} y={20} fill="#8a7656" font-size="12.5">一句话在 GPT 里的全程旅程(自上而下)</text>

      {/* 输入 idx */}
      <rect x={BX} y={32} width={BW} height={20} rx="3" fill="#efe6d2" stroke={hot(0)} stroke-width={hotW(0)} />
      <text x={BX + BW / 2} y={46} fill="#5a4a36" font-size="11.5" text-anchor="middle">输入 idx (B,T)</text>

      {/* 词嵌入 + 位置嵌入 */}
      <rect x={BX} y={66} width={BW} height={36} rx="3" fill="#f3ecda" stroke={hot(1)} stroke-width={hotW(1)} />
      <text x={BX + BW / 2} y={80} fill="#9c7b2e" font-size="11.5" text-anchor="middle">词嵌入 + 位置嵌入</text>
      <text x={BX + BW / 2} y={95} fill="#8a7656" font-size="10" text-anchor="middle">→ x (B,T,{d.d})</text>

      {/* Block 堆 */}
      {Array.from({ length: d.L }, (_, i) => (
        <rect key={i} x={BX + 8} y={stackTop + i * (bh + 1)} width={BW - 16} height={bh} rx="2"
          fill="#f0d9d2" stroke={stage === 2 ? "#9e2b1e" : "#cdb98e"} stroke-width={stage === 2 ? 1.4 : 0.7}
          style={{ transition: "all .25s ease" }} />
      ))}
      <text x={BX + BW + 6} y={stackTop + stackH / 2 + 4} fill={stage === 2 ? "#9e2b1e" : "#8a7656"} font-size="11">× {d.L} 层</text>
      <text x={BX - 6} y={stackTop + stackH / 2 + 4} fill="#8a7656" font-size="10" text-anchor="end">主干</text>

      {/* LayerNorm + 输出头 */}
      <rect x={BX} y={200} width={BW} height={18} rx="3" fill="#f3ecda" stroke={hot(2)} stroke-width={hotW(2)} />
      <text x={BX + BW / 2} y={213} fill="#5a4a36" font-size="11" text-anchor="middle">末尾 LayerNorm</text>

      {!showLoss ? (
        <>
          {/* 参数构成条 */}
          <text x={barX} y={barY - 8} fill="#5a4a36" font-size="12">
            总参数量 <tspan fill="#9e2b1e" font-size="15">{fmtN(d.total)}</tspan>(构成 ↓)
          </text>
          {segs.map((s, i) => {
            const w = (s.v / d.total) * barW;
            const x = barX + acc;
            acc += w;
            return (
              <g key={i}>
                <rect x={x} y={barY} width={Math.max(0, w - 0.5)} height={18} fill={s.c}
                  style={{ transition: "all .3s ease" }} />
              </g>
            );
          })}
          <text x={barX} y={barY + 32} fill="#8a7656" font-size="10">
            <tspan fill="#9e2b1e">■</tspan>Block 占大头(∝ d²·层数) · 拖 d_model / 层数看它暴涨
          </text>
        </>
      ) : (
        <>
          <text x={barX} y={barY - 6} fill="#5a4a36" font-size="12">输出头 → logits (B,T,{d.vocab})</text>
          <text x={barX} y={barY + 14} fill="#9e2b1e" font-size="13">
            未训练 loss ≈ ln(vocab) = ln({d.vocab}) = <tspan font-size="15">{d.lnv.toFixed(3)}</tspan>
          </text>
          <text x={barX} y={barY + 34} fill="#3f6b4f" font-size="10.5">
            实测(vocab=65)4.429 ≈ ln(65)=4.174 → 管道全对、纯属瞎猜
          </text>
        </>
      )}
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: `积木齐了:注意力、Block、嵌入、位置。这一式把它们<b>串成一个完整 GPT</b>。配置:vocab=${d.vocab}、d_model=${d.d}、${d.L} 层。` },
    { line: 2, stage: 1, say: "第一段 · <b>输入端</b>:token 编号查<b>词嵌入</b>表得含义向量,加上<b>位置嵌入</b>(可学习版位置编码),得到 x (B,T,C)。" },
    { line: 3, stage: 2, say: `第二段 · <b>主干</b>:叠 <b>${d.L} 层</b> Transformer Block 依次加工,末尾再做一次 LayerNorm。层数越多,参数(∝ d²·层)涨得越凶。` },
    { line: 5, stage: 3, say: `第三段 · <b>输出头</b>:线性层把每个位置投影到词表大小,得 logits (B,T,${d.vocab})——对「下一个字是谁」的打分。` },
    { line: 6, stage: 4, say: `和真实下一字算交叉熵即 loss。<b>未训练时 ≈ ln(vocab) = ${d.lnv.toFixed(3)}</b>:模型在均匀瞎猜。实测 4.429≈ln(65),证明<b>整条流水线搭对了</b>——只差训练。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return `完整 GPT = 词嵌入 + 位置嵌入 → N×Block → 末尾 LayerNorm → 输出头。当前总参数 <b>${fmtN(d.total)}</b>。拖朱字改配置。`;
    case 1: return "输入端:token 查<b>词嵌入</b>(ch05 那张表)得含义,加<b>位置嵌入</b>(ch07,这里用可学习版)。两者相加 → x (B,T,C)。";
    case 2: return `主干叠 <b>${d.L}</b> 层 Block。每层约 <b>${fmtN(d.perBlock)}</b> 个参数(12d²+9d),∝ <b>d²</b>——所以 d_model 翻倍,参数近乎四倍。`;
    case 3: return `输出头 Linear(d→vocab) 给出 logits <b>(B,T,${d.vocab})</b>:每个位置对下一个字的打分。和 ch03 bigram 目标一脉相承,只是模型强多了。`;
    case 4: return `loss=交叉熵。<b>未训练≈ln(vocab)=${d.lnv.toFixed(3)}</b>,正是「65 个字毫无偏好、均匀瞎猜」的水平。实测 4.429 与之接近 = 前向/loss/形状全对。`;
    default: return "拖朱字改 vocab / d_model / 层数,点「演法」看一句话走完 GPT。";
  }
}

const pyCode = `import torch, torch.nn as nn, torch.nn.functional as F
class GPT(nn.Module):
    def __init__(self, vocab, block, d=64, head=4, n_layer=3):
        super().__init__()
        self.tok_emb = nn.Embedding(vocab, d)   # 词嵌入
        self.pos_emb = nn.Embedding(block, d)   # 位置嵌入(可学习)
        self.blocks = nn.ModuleList([Block(d, head) for _ in range(n_layer)])
        self.ln_f = nn.LayerNorm(d)
        self.head = nn.Linear(d, vocab, bias=False)
    def forward(self, idx, targets=None):
        B, T = idx.shape
        pos = torch.arange(T)
        x = self.tok_emb(idx) + self.pos_emb(pos)
        for blk in self.blocks: x = blk(x)
        logits = self.head(self.ln_f(x))        # (B,T,vocab)
        loss = None if targets is None else \\
            F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1))
        return logits, loss
# vocab=65,d=64,3层 → 158,656 参数;未训练 loss≈ln(65)=4.174`;

export const gptDemo = {
  title: "演武场 · 万法归一",
  intro: "前面所有积木,这一式<b>串成一个完整 GPT</b>:词嵌入+位置嵌入 → N×Block → 末尾 LayerNorm → 输出头。" +
    "拖动 <b>vocab / d_model / 层数</b>,实时算出真实参数量;再看<b>未训练 loss≈ln(vocab)</b>——用「瞎猜水平」验证管道搭对没。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1150,
  terms: [
    { t: "完整 GPT 流水线", d: "<b>词嵌入 + 位置嵌入</b> → N 层 <b>Transformer Block</b> → 末尾 <b>LayerNorm</b> → <b>输出头</b>(Linear 到词表)。整个 GPT 本质就这一条流水线。" },
    { t: "参数量 ∝ d²·层数", d: "每层 Block 约 <b>12d²+9d</b> 个参数,主干 = 层数 × 它。所以 d_model 翻倍参数近四倍、层数翻倍参数翻倍——这就是「大」模型为何这么大。" },
    { t: "未训练 loss ≈ ln(vocab)", d: "没训练的模型对每个字毫无偏好 = 均匀瞎猜,交叉熵正好是 <b>ln(词表大小)</b>。实测 ln(65)≈4.174、跑出 4.429——接近即说明前向/loss/形状全对。" },
    { t: "block_size(上下文窗口)", d: "位置嵌入表只有 block_size 行,所以一次最多看这么多词。生成时永远把序列<b>截到最近 block_size 个</b>再喂进去。" },
  ],
  localCmd: "cd llm-volume/ch08-build-gpt/code && python3 gpt.py",
};


export default { name: 'GewuGptAssembleDemo' }
</script>
