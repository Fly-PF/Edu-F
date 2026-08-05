<script lang="jsx">
// 卷九 · 千锤百炼:训练 GPT —— 四步循环反复跑,看 loss 从瞎猜一路降到背下整首诗
// 真实跑出的 loss 检查点(ch09/train.py,16万参数,CPU约5秒):
const CKPT = [
  { s: 1, loss: 4.503 }, { s: 100, loss: 0.037 }, { s: 200, loss: 0.020 },
  { s: 300, loss: 0.026 }, { s: 400, loss: 0.022 }, { s: 500, loss: 0.022 },
  { s: 600, loss: 0.026 },
];
const LNV = Math.log(74); // ≈4.304:词表 74 的瞎猜水平

// 在检查点间线性插值出任意步的 loss
function lossAt(step) {
  if (step <= CKPT[0].s) return CKPT[0].loss;
  for (let i = 1; i < CKPT.length; i++) {
    if (step <= CKPT[i].s) {
      const a = CKPT[i - 1], b = CKPT[i];
      const t = (step - a.s) / (b.s - a.s);
      return a.loss + (b.loss - a.loss) * t;
    }
  }
  return CKPT[CKPT.length - 1].loss;
}

const lines = [
  { text: "x = 床前明月   y = 前明月光      # 标签 = 输入右移一位", stage: 0 },
  { text: "for it in range(600):           # 训练 = 四步循环反复跑", stage: 1 },
  { text: "    x, y = get_batch()          # ① 取一批数据", stage: 1 },
  { text: "    _, loss = model(x, y)       # ② 前向:算预测与 loss", stage: 2 },
  { text: "    opt.zero_grad(); loss.backward()  # ③ 反向求梯度", stage: 2 },
  { text: "    opt.step()                  # ④ 顺梯度挪一小步", stage: 3 },
  { text: "step = {{step}}  → loss 一路下降 (拖朱字看)", stage: 4 },
];

const paramDefs = { step: { min: 1, max: 600, step: 1, fmt: (v) => v } };
const initial = { step: 100 };

function compute(p) {
  const step = p.step;
  const loss = lossAt(step);
  return { step, loss, lnv: LNV, learned: loss < 0.5 };
}

// 画布:loss 曲线 x∈[1,600], y∈[0,4.6]
const PX = 50, PW = 286, PY = 70, PH = 150;
const sx = (s) => PX + ((s - 1) / 599) * PW;
const sy = (l) => PY + (1 - l / 4.6) * PH;

function Viz({ derived: d, stage }) {
  // 采样曲线路径
  const pts = [];
  for (let s = 1; s <= 600; s += 6) pts.push(`${sx(s).toFixed(1)},${sy(lossAt(s)).toFixed(1)}`);
  const showCurve = stage >= 4;
  const showGen = stage >= 4 && d.learned;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={22} y={22} fill="#8a7656" font-size="12.5">loss 下降曲线(纵=loss,横=训练步)</text>

      {/* 坐标轴 */}
      <line x1={PX} y1={PY} x2={PX} y2={PY + PH} stroke="#6b3a2e" stroke-width="1" />
      <line x1={PX} y1={PY + PH} x2={PX + PW} y2={PY + PH} stroke="#6b3a2e" stroke-width="1" />
      {/* ln(vocab) 瞎猜基准线 */}
      <line x1={PX} y1={sy(LNV)} x2={PX + PW} y2={sy(LNV)} stroke="#9e2b1e" stroke-dasharray="4 4" opacity="0.55" />
      <text x={PX + PW} y={sy(LNV) - 4} fill="#9e2b1e" font-size="10" text-anchor="end">瞎猜 ln(74)≈4.30</text>
      <text x={PX - 6} y={PY + 6} fill="#8a7656" font-size="9" text-anchor="end">4.6</text>
      <text x={PX - 6} y={PY + PH} fill="#8a7656" font-size="9" text-anchor="end">0</text>

      {/* 曲线 */}
      {showCurve && <polyline points={pts.join(" ")} fill="none" stroke="#3f6b4f" stroke-width="2" />}

      {/* 检查点 */}
      {showCurve && CKPT.map((c) => (
        <circle key={c.s} cx={sx(c.s)} cy={sy(c.loss)} r="2.5" fill="#9c7b2e" />
      ))}

      {/* 当前步标记 */}
      {showCurve && (
        <g>
          <line x1={sx(d.step)} y1={PY} x2={sx(d.step)} y2={PY + PH} stroke="#9e2b1e" stroke-width="1" opacity="0.4" />
          <circle cx={sx(d.step)} cy={sy(d.loss)} r="5" fill="#9e2b1e" style={{ transition: "all .2s ease" }} />
          <text x={sx(d.step)} y={sy(d.loss) - 9} fill="#9e2b1e" font-size="12" text-anchor="middle">{d.loss.toFixed(3)}</text>
        </g>
      )}

      {!showCurve && (
        <text x={PX + PW / 2} y={PY + PH / 2} fill="#8a7656" font-size="12" text-anchor="middle">点「演法」走完四步训练循环</text>
      )}

      {/* 生成对比 */}
      <text x={22} y={248} fill="#5a4a36" font-size="11.5">
        {`第 ${d.step} 步:loss = ${d.loss.toFixed(3)}`}
        {d.step <= 1 ? "(≈瞎猜水平)" : d.learned ? "(已学会语料)" : ""}
      </text>
      {showGen ? (
        <>
          <text x={22} y={270} fill="#9e2b1e" font-size="11">训练前「床」起头:床锄霜中滴不入…(乱码)</text>
          <text x={22} y={288} fill="#3f6b4f" font-size="11.5">训练后:床前明月光,疑是地上霜。举头望明月…</text>
        </>
      ) : (
        <text x={22} y={272} fill="#8a7656" font-size="11">
          {stage >= 4 ? "继续拖到 100 步以上,看模型「背」出整首诗" : ""}
        </text>
      )}
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: "GPT 学的是「看前文,猜下一个字」。所以标签 <b>y = 输入 x 右移一位</b>:x=床前明月,y=前明月光。在「床」处要预测「前」……" },
    { line: 3, stage: 1, say: "训练就是<b>四步循环反复跑</b>。第①步:从语料里随机取一批 (x, y)。这是所有深度学习的通用骨架。" },
    { line: 4, stage: 2, say: "第②步 <b>前向</b>:算每个位置对下一字的打分,和真实 y 算交叉熵得 loss。第③步 <b>反向</b>:loss.backward() 求出每个参数的梯度。" },
    { line: 6, stage: 3, say: "第④步 <b>优化器挪一步</b>:opt.step() 顺着梯度把参数往「loss 更小」的方向挪一点点。一圈结束,回到第①步。" },
    { line: 7, stage: 4, say: `跑 600 步:loss 从第 1 步 <b>4.503</b>(≈瞎猜 ln74)→ 100 步 <b>0.037</b>。模型迅速学会了这几首诗。拖朱字沿曲线看,当前 ${d.step} 步 loss=${d.loss.toFixed(3)}。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "数据构造:标签 <b>y 是 x 右移一位</b>,每个位置的答案就是它后面那个字。因果掩码保证预测时看不到答案。";
    case 1: return "训练 = <b>四步循环</b>反复跑。第①步:<b>取一批数据</b> get_batch()。所有深度学习训练都是这个骨架。";
    case 2: return "第②步<b>前向</b>算 loss;第③步<b>反向</b> loss.backward() 求梯度(每个参数该往哪挪)。zero_grad 先清掉上一轮残留。";
    case 3: return "第④步 <b>opt.step()</b>:顺着梯度把参数挪一小步。挪一步、loss 小一点,如此千锤百炼。";
    case 4: return `loss 从 <b>4.503</b>(≈ln74 瞎猜)一路降。当前第 ${d.step} 步 = <b>${d.loss.toFixed(3)}</b>。${d.learned ? "已能背出整首诗——这就是「学会」。" : "继续拖动看它骤降。"}`;
    default: return "拖朱字沿 loss 曲线走,点「演法」看四步训练循环。";
  }
}

const pyCode = `import torch
model = GPT(vocab_size, block_size, d_model, n_head, n_layer)
opt = torch.optim.AdamW(model.parameters(), lr=3e-3)

for it in range(1, 601):
    x, y = get_batch()        # ① 取一批 (x, y=x右移一位)
    _, loss = model(x, y)     # ② 前向:算 loss
    opt.zero_grad()           # ③ 清梯度
    loss.backward()           #    反向:求梯度
    opt.step()                # ④ 顺梯度挪一步
# 第1步 loss=4.503(≈ln74 瞎猜) → 100步 0.037 → 能背出整首诗`;

export const trainGptDemo = {
  title: "演武场 · 千锤百炼",
  intro: "训练 = <b>四步循环反复跑</b>:取数据 → 前向算 loss → 反向求梯度 → 优化器挪一步。标签是输入<b>右移一位</b>。" +
    "真实跑出的 loss 从第 1 步 <b>4.503</b>(瞎猜 ln74)骤降到 100 步 <b>0.037</b>——拖动<b>训练步朱字</b>,沿曲线看它从乱码学到背诗。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1150,
  runtimeLabel: "固定检查点插值",
  terms: [
    { t: "训练四步循环", d: "<b>① 取 batch → ② 前向算 loss → ③ 反向求梯度 → ④ 优化器挪一步</b>。反复跑成千上万圈。所有深度学习训练——包括 GPT-4——都是这个骨架,只是规模差上亿倍。" },
    { t: "标签右移一位", d: "GPT 学「猜下一个字」,所以 <b>y = x 右移一位</b>:x=床前明月 → y=前明月光。每个位置的答案正是它的下一个字,因果掩码保证预测时看不到它。" },
    { t: "loss 从 ln(vocab) 下降", d: "第 1 步 loss=4.503,正是<b>均匀瞎猜</b>水平(ln74≈4.30);100 步后降到 0.037——模型学会了语料规律。loss 曲线下降是「正在学习」的直接证据。" },
    { t: "过拟合(背下来)", d: "这里数据小、模型相对大,loss 降到接近 0 是因为模型把诗<b>背</b>下来了。真实训练用海量数据,loss 不会也不该这么低——那是死记硬背,不会举一反三。这里故意如此,好让效果一眼可见。" },
  ],
  localCmd: "cd llm-volume/ch09-train-gpt/code && python3 train.py",
};


export default { name: 'GewuTrainGptDemo' }
</script>
