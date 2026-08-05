<script lang="jsx">
// 卷十一 · 第一式 · 以小驭大:全参微调 vs LoRA —— 只学低秩旁路,参数降到 1% 以下
const lines = [
  { text: "d = {{d}}                   # 权重矩阵 d×d(拖朱字)", stage: 0 },
  { text: "r = {{r}}                    # LoRA 的秩,r << d", stage: 1 },
  { text: "全参微调:更新整个 ΔW       # 要学 d² 个数", stage: 2 },
  { text: "LoRA:  W' = W + B·A         # A(r×d)、B(d×r),只学 2·d·r 个", stage: 3 },
  { text: "可训练占比 = 2·d·r / d² = 2r/d", stage: 4 },
];

const paramDefs = {
  d: { min: 256, max: 4096, step: 256, fmt: (v) => v },
  r: { min: 1, max: 64, step: 1, fmt: (v) => v },
};
const initial = { d: 4096, r: 4 };

function compute(p) {
  const full = p.d * p.d;
  const lora = 2 * p.d * p.r;
  const pct = (lora / full) * 100;
  return { d: p.d, r: p.r, full, lora, pct };
}

const fmtN = (n) => n.toLocaleString("en-US");

function Viz({ derived: d, stage }) {
  const show = stage >= 3;
  // 上方:d×d 大方阵示意;下方:两条瘦旁路 A、B
  const GX = 40, GY = 56, S = 110; // 大方阵边长
  // 旁路条:A 是 r×d(扁宽),B 是 d×r(高瘦)——用细条表达
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={22} y={22} fill="#8a7656" font-size="12.5">权重矩阵 W 是 {d.d}×{d.d};LoRA 只在旁边挂两条瘦矩阵</text>

      {/* 大方阵 W(冻结) */}
      <rect x={GX} y={GY} width={S} height={S} rx="3" fill="#e7dcc4" stroke="#cdb98e" stroke-width="1" />
      <text x={GX + S / 2} y={GY + S / 2 - 4} fill="#8a7656" font-size="12" text-anchor="middle">W (冻结)</text>
      <text x={GX + S / 2} y={GY + S / 2 + 14} fill="#5a4a36" font-size="11" text-anchor="middle">{d.d}×{d.d}</text>
      <text x={GX + S / 2} y={GY + S + 16} fill="#9e2b1e" font-size="11" text-anchor="middle">d² = {fmtN(d.full)}</text>

      {/* 加号 */}
      <text x={GX + S + 26} y={GY + S / 2 + 6} fill="#5a4a36" font-size="22" text-anchor="middle">+</text>

      {/* 旁路 B·A:用与 r 成比例的细条 */}
      {(() => {
        const bx = GX + S + 56;
        const rw = Math.max(4, Math.min(40, d.r * 1.6)); // r 越大越宽
        return (
          <g>
            {/* B: d×r 高瘦 */}
            <rect x={bx} y={GY} width={rw} height={S} rx="2" fill="#3f6b4f" opacity="0.85"
              style={{ transition: "width .3s ease" }} />
            <text x={bx + rw / 2} y={GY - 4} fill="#3f6b4f" font-size="10" text-anchor="middle">B</text>
            {/* A: r×d 扁宽 */}
            <rect x={bx + rw + 10} y={GY + S / 2 - rw / 2} width={S * 0.7} height={rw} rx="2" fill="#9c7b2e" opacity="0.85"
              style={{ transition: "height .3s ease" }} />
            <text x={bx + rw + 10 + S * 0.35} y={GY + S / 2 - rw / 2 - 4} fill="#9c7b2e" font-size="10" text-anchor="middle">A</text>
            <text x={bx + 6} y={GY + S + 16} fill="#3f6b4f" font-size="11">2·d·r = {fmtN(d.lora)}</text>
          </g>
        );
      })()}

      {/* 占比条 */}
      <text x={22} y={216} fill="#5a4a36" font-size="12.5">可训练参数占比(LoRA / 全参):</text>
      <rect x={22} y={226} width={316} height={22} rx="3" fill="#efe6d2" stroke="#cdb98e" stroke-width="0.8" />
      <rect x={22} y={226} width={Math.max(2, (d.pct / 100) * 316)} height={22} rx="3" fill="#9e2b1e"
        style={{ transition: "width .35s ease" }} />
      <text x={22} y={266} fill="#9e2b1e" font-size="15">
        {d.pct.toFixed(2)}%
        <tspan fill="#8a7656" font-size="11">  ← r={d.r}、d={d.d} 时,只训这么点</tspan>
      </text>
      <text x={22} y={288} fill="#8a7656" font-size="11">
        {show ? "r 取个位数,占比常 <1% — 这就是 LoRA「以小驭大」" : "点「演法」:看全参 vs LoRA 的参数账本"}
      </text>
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: `现实里几乎不从零训大模型——太贵。微调是拿<b>训好的</b>模型,小代价适配新任务。一个权重矩阵常是 ${d.d}×${d.d}。` },
    { line: 2, stage: 1, say: `<b>全参微调</b>要更新整个矩阵:${d.d}² = <b>${fmtN(d.full)}</b> 个数,还要存梯度和优化器状态——显存爆炸,每个任务存一整份模型。` },
    { line: 4, stage: 3, say: `LoRA 的主意:冻结 W,只学一个<b>低秩增量 B·A</b>。A 是 r×d、B 是 d×r,r 很小。当前 r=${d.r},只学 <b>${fmtN(d.lora)}</b> 个。` },
    { line: 5, stage: 4, say: `占比 = 2r/d = <b>${d.pct.toFixed(2)}%</b>。r 取个位数,可训练参数常降到原来的 <b>1% 以下</b>——这就是「以小驭大」。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return `微调 = 拿训好的大模型小代价适配新任务。权重矩阵动辄 ${d.d}×${d.d},几千万个数。拖朱字改 d。`;
    case 1: return "LoRA 的秩 <b>r</b> 是关键旋钮,r<<d。拖朱字改 r,看占比怎么变。";
    case 2: return `<b>全参微调</b>:更新全部 ${fmtN(d.full)} 个权重 + 同等量的梯度/优化器状态。十个任务十份几十 GB 模型,扛不住。`;
    case 3: return `<b>LoRA</b>:W' = W + B·A。冻结 W,只训 A(r×d)和 B(d×r),共 <b>2·d·r = ${fmtN(d.lora)}</b> 个。`;
    case 4: return `占比 = 2·d·r / d² = <b>2r/d = ${d.pct.toFixed(2)}%</b>。真实大模型里常 <1%。部署时可把 B·A 合并回 W,零额外开销。`;
    default: return "拖朱字调 d / r,点「演法」看参数账本。";
  }
}

const pyCode = `# 全参微调 vs LoRA 参数账本
for r in (4, 8):
    d = 4096
    full = d * d            # 全参:d² 个
    lora = 2 * d * r        # LoRA:2·d·r 个
    print(f"r={r}: 全参 {full:,} | LoRA {lora:,} | 占比 {lora/full:.2%}")
# r=4: 16,777,216 | 32,768 | 0.20%
# r=8: 16,777,216 | 65,536 | 0.39%`;

export const loraParamDemo = {
  title: "演武场 · 以小驭大",
  intro: "全参微调要更新整个 d×d 矩阵(<b>d²</b> 个数),显存爆炸。<b>LoRA</b> 冻结原权重,只学一个低秩旁路 <b>B·A</b>(共 <b>2·d·r</b> 个)。" +
    "r 取个位数,可训练占比常 <b><1%</b>。拖动 <b>d / r 朱字</b>,看参数账本怎么算。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "全参微调的痛", d: "更新<b>所有</b>权重:一个 4096×4096 矩阵就 1677 万个数,还要存等量的梯度和优化器状态。每个任务再存一整份几十 GB 模型——成本扛不住。" },
    { t: "LoRA 低秩增量", d: "<b>W' = W + B·A</b>。冻结 W,只学两个瘦矩阵 A(r×d)、B(d×r)。可训练参数从 <b>d²</b> 降到 <b>2·d·r</b>,r<<d 时省得惊人。" },
    { t: "占比 = 2r/d", d: "4096×4096、r=4 时只占 0.20%;r=8 占 0.39%。秩越小越省。这就是为什么一张消费级显卡也能微调百亿模型。" },
    { t: "可插拔适配器", d: "部署时既可把 B·A <b>合并回 W</b>(零额外推理开销),也可不合并、<b>按任务切换</b>不同的 LoRA 旁路——一个底座模型,多套小适配器。" },
  ],
  localCmd: "cd llm-volume/ch11-finetune/code && python3 lora_idea.py",
};


export default { name: 'GewuLoraParamDemo' }
</script>
