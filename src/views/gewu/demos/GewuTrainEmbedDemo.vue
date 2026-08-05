<script lang="jsx">
// 卷五 · 第三式 · 习而得义:nn.Embedding 从随机初始化,训练出「同类相近」
// 下面的坐标快照来自本机 torch 实跑(seed=0,与 code/nn_embedding.py 完全一致)。
// torch 无法在浏览器跑,故把训练轨迹「烤」进来,用于动画演示。
import { VOCAB } from "./ch05emb.js";

// 每个快照:训练到第 step 步时,4 个词学到的 2 维坐标 + 同类/异类平均余弦。
const SNAPS = [
  { step: 0, coords: [[1.541, -0.293], [-2.179, 0.568], [-1.085, -1.399], [0.403, 0.838]], same: -0.988, diff: -0.323 },
  { step: 5, coords: [[1.575, -0.069], [-2.091, 0.847], [-1.835, -0.423], [-1.404, 0.19]], same: -0.003, diff: 0.003 },
  { step: 15, coords: [[0.933, 1.379], [-1.483, 1.736], [-1.882, -0.132], [-1.424, -0.057]], same: 0.633, diff: 0.001 },
  { step: 40, coords: [[0.231, 1.66], [-0.884, 2.112], [-1.874, -0.218], [-1.413, -0.185]], same: 0.93, diff: 0.006 },
  { step: 100, coords: [[0.003, 1.676], [-0.671, 2.189], [-1.869, -0.263], [-1.409, -0.219]], same: 0.978, diff: 0.001 },
  { step: 300, coords: [[-0.13, 1.671], [-0.547, 2.223], [-1.865, -0.289], [-1.406, -0.234]], same: 0.993, diff: 0.0 },
];

// 0,1 = 猫狗(一类) 2,3 = 桌椅(一类)。同色 = 同类。
const CLASS_COLOR = ["#9e2b1e", "#9e2b1e", "#2f5d8a", "#2f5d8a"];

const lines = [
  { text: "emb = nn.Embedding(4, 2)        # 一张可学习的查找表,初始随机", stage: 0 },
  { text: "# 目标:同类(猫狗 / 桌椅)余弦→1,异类→0", stage: 0 },
  { text: "for step in range({{step}}):    # 拖朱字看训练到第几步", stage: 1 },
  { text: "    loss = (1-同类cos)**2 + (异类cos)**2", stage: 1 },
  { text: "    loss.backward(); opt.step() # 梯度下降,挪动向量", stage: 2 },
  { text: "# 随机起步 → 自己学出『同类相近』", stage: 3 },
];

const paramDefs = {
  step: { min: 0, max: SNAPS.length - 1, step: 1, fmt: (v) => SNAPS[v].step },
};
const initial = { step: 0 };

function compute(p) {
  const s = SNAPS[p.step];
  return { s, idx: p.step, isFirst: p.step === 0, isLast: p.step === SNAPS.length - 1 };
}

// 把训练坐标(x∈[-2.3,1.7], y∈[-1.6,2.4])映射到 SVG 画布
const PLOT = { x0: 40, y0: 40, w: 280, h: 200 };
const RANGE = { xmin: -2.4, xmax: 1.8, ymin: -1.7, ymax: 2.5 };
function toXY([x, y]) {
  const px = PLOT.x0 + ((x - RANGE.xmin) / (RANGE.xmax - RANGE.xmin)) * PLOT.w;
  const py = PLOT.y0 + (1 - (y - RANGE.ymin) / (RANGE.ymax - RANGE.ymin)) * PLOT.h;
  return [px, py];
}

const pct = (c) => (c >= 0 ? "+" : "") + (c * 100).toFixed(0) + "%";

function Viz({ derived: d, play }) {
  // 演法时按帧推进快照;否则用拖动参数选中的那一步
  const snapIdx = play && play._snap != null ? play._snap : d.idx;
  const s = SNAPS[snapIdx];
  const isFirst = snapIdx === 0, isLast = snapIdx === SNAPS.length - 1;
  const pts = s.coords.map(toXY);
  const cx = PLOT.x0, cy = PLOT.y0 + PLOT.h, rx = PLOT.x0 + PLOT.w, ty = PLOT.y0;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={20} y={22} fill="#8a7656" font-size="12">
        每个词 = 平面上一个点(学到的 2 维向量)· 第 <tspan fill="#9e2b1e" font-size="14">{s.step}</tspan> 步
      </text>

      {/* 坐标轴 */}
      <line x1={cx} y1={ty} x2={cx} y2={cy} stroke="#cdb98e" stroke-width="0.8" />
      <line x1={cx} y1={cy} x2={rx} y2={cy} stroke="#cdb98e" stroke-width="0.8" />

      {/* 同类连线:猫-狗、桌-椅。越到后面越短,表示越靠拢 */}
      <line x1={pts[0][0]} y1={pts[0][1]} x2={pts[1][0]} y2={pts[1][1]}
        stroke="#9e2b1e" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"
        style={{ transition: "all .5s ease" }} />
      <line x1={pts[2][0]} y1={pts[2][1]} x2={pts[3][0]} y2={pts[3][1]}
        stroke="#2f5d8a" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"
        style={{ transition: "all .5s ease" }} />

      {s.coords.map((_, i) => {
        const [px, py] = pts[i];
        return (
          <g key={i} style={{ transition: "all .5s ease" }}
            transform={`translate(${px},${py})`}>
            <circle r="7" fill={CLASS_COLOR[i]} opacity="0.85" />
            <text x={11} y={5} fill={CLASS_COLOR[i]} font-size="13">{VOCAB[i]}</text>
          </g>
        );
      })}

      {/* 相似度读数 */}
      <line x1={20} y1={256} x2={340} y2={256} stroke="#cdb98e" stroke-width="0.8" />
      <text x={20} y={276} fill="#9e2b1e" font-size="12.5">
        同类平均 cos = <tspan font-size="14">{pct(s.same)}</tspan>
        {isFirst ? "(随机,一团乱)" : isLast ? "(挨在一起了)" : ""}
      </text>
      <text x={20} y={294} fill="#2f5d8a" font-size="12.5">
        异类平均 cos = <tspan font-size="14">{pct(s.diff)}</tspan>
        {isLast ? "(被推开了)" : ""}
      </text>
    </svg>
  );
}

function frames(p, d) {
  // 演法:从当前步一路播到训练结束,看点「分堆」
  return SNAPS.map((s, i) => {
    const isFirst = i === 0, isLast = i === SNAPS.length - 1;
    let say;
    if (isFirst) say = "<b>训练前</b>:向量是<b>随机</b>初始化的,四个点乱七八糟,同类平均 cos = <b>-99%</b>。";
    else if (isLast) say = `<b>训练完成</b>(第 ${s.step} 步):猫狗挨在一起、桌椅挨在一起,同类 cos = <b>${pct(s.same)}</b>,异类 ≈ <b>0</b>。随机向量真的<b>自己学出了含义</b>。`;
    else say = `第 <b>${s.step}</b> 步:梯度下降在挪动向量——同类 cos 升到 <b>${pct(s.same)}</b>,异类压到 <b>${pct(s.diff)}</b>,点正在分堆。`;
    return { line: isFirst ? 1 : isLast ? 6 : 5, stage: isFirst ? 0 : isLast ? 3 : 2, say, _snap: i };
  });
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "<b>nn.Embedding(4, 2)</b> = 一张 4×2 的<b>可学习</b>查找表,初始全是随机数,所以同类也不相近。";
    case 1: return `训练到第 <b>${d.s.step}</b> 步。任务:让同类(猫狗、桌椅)余弦趋近 1、异类趋近 0。拖朱字看不同阶段。`;
    case 2: return `<b>梯度下降</b>按 loss 调整每个向量,把同类往一起拉、异类往两边推。当前同类 cos=<b>${pct(d.s.same)}</b>。`;
    case 3: return "随机起步,也能学出「<b>同类相近</b>」。真实 GPT 没有这种监督,它只是反复猜下一个字,含义向量是<b>顺带</b>学出来的副产品——但效果惊人。";
    default: return "拖动朱字看训练阶段,点「演法」看四个点从乱到分堆的全过程。";
  }
}

const pyCode = `import torch, torch.nn as nn
torch.manual_seed(0)
VOCAB = ["猫", "狗", "桌子", "椅子"]; stoi = {w:i for i,w in enumerate(VOCAB)}
emb = nn.Embedding(4, 2)            # 可学习查找表,初始随机
print("初始(随机):", emb.weight.data)

SAME = [("猫","狗"), ("桌子","椅子")]   # 希望相似(目标 1)
DIFF = [("猫","桌子"), ("狗","椅子")]   # 希望不相似(目标 0)
def cos(a,b): a=a/a.norm(); b=b/b.norm(); return (a*b).sum()
def avg(ps): return torch.stack([cos(emb.weight[stoi[a]],emb.weight[stoi[b]]) for a,b in ps]).mean()

opt = torch.optim.SGD(emb.parameters(), lr=0.5)
for step in range(301):
    loss = (1 - avg(SAME))**2 + (avg(DIFF))**2
    opt.zero_grad(); loss.backward(); opt.step()

print("训练后:同类 cos =", round(float(avg(SAME)),3))   # 0.993
print("       异类 cos =", round(float(avg(DIFF)),3))   # 0.000`;

export const trainEmbedDemo = {
  title: "演武场 · 习而得义",
  intro: "前面几式那张漂亮的表、那些坐标,数字都是<b>手填</b>的。真实模型里,这些向量是<b>训练出来的参数</b>:" +
    "一开始随机,靠梯度下降慢慢调好。这一式用 PyTorch 的 <b>nn.Embedding</b>,从随机初始化出发," +
    "亲眼看四个点<b>从一团乱、到同类分堆</b>——「位置=含义」是模型自己学出来的。(训练轨迹来自本机实跑)",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1150,
  terms: [
    { t: "nn.Embedding(V, D)", d: "PyTorch 把「可学习的查找表」封装成的一层。内部就是一个 <b>(V, D)</b> 矩阵,<b>requires_grad=True</b>;前向就是「按编号查行」,和 E[i] 一样,只是能<b>自动求导</b>。" },
    { t: "可学习参数", d: "表里每个数字都是<b>模型参数</b>,会被梯度下降更新。它们不是人填的,而是模型在完成任务的过程中<b>学</b>出来的。" },
    { t: "梯度下降", d: "看损失(预测有多差)对每个参数的「坡度」,顺着坡往下挪一小步。反复做,参数就越来越好——这里它把同类向量往一起拉、异类往两边推。" },
    { t: "含义是「副产品」", d: "真实 GPT <b>没有</b>「告诉它谁和谁同类」这种监督,它只是反复<b>猜下一个字</b>。含义向量是顺带学出来的——但「同类相近」这种结构会自然涌现,效果惊人地好。" },
    { t: "这里的「监督」只为演示", d: "本式特意给了明确目标(同类→1、异类→0),是为了让「随机→学出含义」看得见。真实训练靠的是语言任务本身,无需人工标注谁是同类。" },
  ],
  localCmd: "cd llm-volume/ch05-embedding/code && python3 nn_embedding.py",
};


export default { name: 'GewuTrainEmbedDemo' }
</script>
