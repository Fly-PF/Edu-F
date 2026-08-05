<script lang="jsx">
// 卷十一 · 第二式 · 旁路得道:为什么「低秩」常常够用 —— SVD 看 ΔW 的有效维度
// 真实 SVD 奇异值(ch11/lora_idea.py 构造的秩-3 改动量 ΔW):
const SV = [7.901, 5.846, 5.431, 0, 0, 0, 0, 0];
const TOTAL_E = SV.reduce((s, v) => s + v * v, 0); // Frobenius 能量

// 用秩 r 重建的相对误差 = sqrt(被丢弃奇异值平方和 / 总能量)
function relErr(r) {
  let dropped = 0;
  for (let i = r; i < SV.length; i++) dropped += SV[i] * SV[i];
  return Math.sqrt(dropped / TOTAL_E);
}

const lines = [
  { text: "ΔW = 微调带来的「改动量」      # W' = W + ΔW", stage: 0 },
  { text: "U, S, V = svd(ΔW)             # 看它的「有效维度」", stage: 1 },
  { text: "# 奇异值: [7.90, 5.85, 5.43, 0, 0, 0, 0, 0]", stage: 2 },
  { text: "r = {{r}}                      # 用前 r 个重建(拖朱字)", stage: 3 },
  { text: "# r 达到真实秩(3)时,误差归零 → 天生低秩", stage: 4 },
];

const paramDefs = { r: { min: 1, max: 8, step: 1, fmt: (v) => v } };
const initial = { r: 1 };

function compute(p) {
  return { r: p.r, sv: SV, err: relErr(p.r), trueRank: 3 };
}

const X0 = 36, BARW = 30, GAP = 8, BASE = 150, MAXH = 96;
function Viz({ derived: d, stage }) {
  const showRebuild = stage >= 3;
  const mx = SV[0];
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={22} y={22} fill="#8a7656" font-size="12.5">ΔW 的奇异值(能量集中在前几个 = 低秩)</text>

      {/* 奇异值柱 */}
      {SV.map((v, i) => {
        const h = (v / mx) * MAXH;
        const x = X0 + i * (BARW + GAP);
        const kept = showRebuild && i < d.r;
        const used = showRebuild && i < d.r;
        return (
          <g key={i}>
            <rect x={x} y={BASE - h} width={BARW} height={Math.max(0, h)} rx="2"
              fill={!showRebuild ? "#9c7b2e" : used ? "#9e2b1e" : "#d9cfb6"}
              stroke={showRebuild && i === d.r - 1 ? "#9e2b1e" : "none"} stroke-width="1"
              style={{ transition: "fill .3s ease" }} />
            <text x={x + BARW / 2} y={BASE + 14} fill="#5a4a36" font-size="10" text-anchor="middle">{i + 1}</text>
            {v > 0.01 && (
              <text x={x + BARW / 2} y={BASE - h - 5} fill="#2b2117" font-size="9" text-anchor="middle">{v.toFixed(1)}</text>
            )}
          </g>
        );
      })}
      {/* 截断线 */}
      {showRebuild && d.r < 8 && (
        <line x1={X0 + d.r * (BARW + GAP) - GAP / 2} y1={40} x2={X0 + d.r * (BARW + GAP) - GAP / 2} y2={BASE}
          stroke="#9e2b1e" stroke-dasharray="3 3" opacity="0.6" />
      )}

      <text x={22} y={184} fill="#5a4a36" font-size="12">
        第 4 个起奇异值≈0 → ΔW 的<tspan fill="#9e2b1e">「有效维度」只有 3</tspan>
      </text>

      {/* 重建误差 */}
      {showRebuild && (
        <>
          <text x={22} y={216} fill="#5a4a36" font-size="12.5">
            用秩 r = <tspan fill="#9e2b1e" font-size="15">{d.r}</tspan> 重建 ΔW 的相对误差:
          </text>
          <rect x={22} y={226} width={316} height={20} rx="3" fill="#efe6d2" stroke="#cdb98e" stroke-width="0.8" />
          <rect x={22} y={226} width={Math.max(1.5, d.err * 316)} height={20} rx="3"
            fill={d.err < 0.001 ? "#3f6b4f" : "#9e2b1e"} style={{ transition: "width .35s ease" }} />
          <text x={22} y={264} fill={d.err < 0.001 ? "#3f6b4f" : "#9e2b1e"} font-size="14">
            {d.err < 0.001 ? "相对误差 = 0.0000 ✓ 几乎无损" : "相对误差 = " + d.err.toFixed(4)}
          </text>
          <text x={22} y={286} fill="#8a7656" font-size="11">
            {d.r < 3 ? `r=${d.r} 不够覆盖有效维度,误差还大;拖到 3 试试`
              : "r≥3 覆盖了全部有效维度 → 误差归零,这就是 LoRA 的底气"}
          </text>
        </>
      )}
      {!showRebuild && (
        <text x={22} y={236} fill="#8a7656" font-size="12">点「演法」:拖 r 看低秩重建的误差如何归零</text>
      )}
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: "凭什么相信只学个低秩旁路就够?来看微调真正带来的<b>改动量 ΔW</b> 到底有多「丰富」。" },
    { line: 2, stage: 1, say: "用 <b>SVD(奇异值分解)</b> 拆开 ΔW,奇异值的大小就是各个方向的「能量」——能量越集中,有效维度越低。" },
    { line: 3, stage: 2, say: "看这组奇异值:<b>[7.90, 5.85, 5.43, 0, 0, …]</b>。第 4 个起基本为 0——说明 ΔW 的<b>有效维度只有 3</b>,天生低秩。" },
    { line: 4, stage: 3, say: `那就用前 <b>r</b> 个奇异方向去重建 ΔW。当前 r=${d.r},相对误差 <b>${d.err.toFixed(4)}</b>。` },
    { line: 5, stage: 4, say: `关键:<b>r 一旦达到真实秩(3),误差就归零</b>(r=3 时 ${relErr(3).toFixed(4)})。所以选对 r,低秩近似几乎无损——这就是 LoRA 敢只学旁路的底气。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "LoRA 假设微调的<b>改动量 ΔW</b> 是低秩的。这一式用 SVD 验证这个假设站不站得住。";
    case 1: return "<b>SVD</b> 把矩阵拆成若干「方向 × 强度(奇异值)」。奇异值衰减越快,矩阵越接近低秩。";
    case 2: return "实测奇异值 <b>[7.90, 5.85, 5.43, 0, …]</b>:前 3 个有能量,之后全是 0 → <b>有效维度 = 3</b>。";
    case 3: return `用前 r 个方向重建,相对误差 = sqrt(丢弃能量 / 总能量)。r=${d.r} 时 = <b>${d.err.toFixed(4)}</b>。`;
    case 4: return `<b>r≥真实秩(3)误差归零</b>。经验上微调改动量确实接近低秩,所以 LoRA 选个小 r 就几乎无损。另一关键技巧:<b>B 初始化为 0</b>,训练起点旁路=0,整层等于原模型,不破坏已有能力。`;
    default: return "拖朱字调 r,点「演法」看低秩重建误差。";
  }
}

const pyCode = `import numpy as np
# 构造一个真实秩=3 的改动量 ΔW,看它的奇异值
U, S, Vt = np.linalg.svd(dW)
print("前8个奇异值:", S[:8].round(3))
# [7.901 5.846 5.431 0. 0. 0. 0. 0.] -> 有效维度 3

def rebuild_err(r):
    approx = U[:, :r] @ np.diag(S[:r]) @ Vt[:r, :]
    return np.linalg.norm(approx - dW) / np.linalg.norm(dW)
for r in (1, 2, 3): print(f"r={r}: 误差 {rebuild_err(r):.4f}")
# r=1: 0.7106 | r=2: 0.4836 | r=3: 0.0000 <- 达到真实秩即归零`;

export const loraRankDemo = {
  title: "演武场 · 旁路得道",
  intro: "凭什么只学低秩旁路就够?用 <b>SVD</b> 拆开微调改动量 ΔW:奇异值 <b>[7.90, 5.85, 5.43, 0, …]</b>,第 4 个起为 0——<b>有效维度只有 3</b>。" +
    "用前 r 个方向重建,<b>r 达到真实秩时误差归零</b>。拖动 <b>r 朱字</b>,看低秩近似如何几乎无损。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "SVD 与有效维度", d: "奇异值分解把矩阵拆成「方向 × 强度」。奇异值大的方向是主要的,接近 0 的可丢弃。能量集中在前几个 = <b>低秩</b>。这里 ΔW 前 3 个有能量,之后全 0。" },
    { t: "低秩重建误差", d: "用前 r 个奇异方向重建的相对误差 = sqrt(被丢弃奇异值平方和 / 总能量)。r=1 误差 0.71、r=2 误差 0.48、<b>r=3 误差 0</b>——一旦覆盖真实秩就无损。" },
    { t: "这就是 LoRA 的底气", d: "经验上微调的改动量 ΔW <b>确实接近低秩</b>(奇异值衰减快)。所以用一个小 r 的 B·A 去近似它,几乎不损失效果,却省下绝大部分参数。" },
    { t: "B 初始化为 0", d: "LoRA 把旁路的 B 初始化为 0,训练<b>起点</b>处 B·A=0,整层完全等于原模型——从「原样」平滑开始适配,不破坏预训练已有的能力。" },
  ],
  localCmd: "cd llm-volume/ch11-finetune/code && python3 lora_idea.py",
};


export default { name: 'GewuLoraRankDemo' }
</script>
