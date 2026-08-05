<script lang="jsx">
// 卷五 · 第二式 · 坐标藏义:把一个词,变成平面上的一个「点」
// 核心直觉:挨得近 = 意思近。你亲手拖动「猫」的坐标,看它变得像狗、还是像家具。
const FIXED = [
  { w: "狗", x: 4, y: 3, kind: "animal" },
  { w: "桌子", x: -4, y: -3, kind: "furniture" },
  { w: "椅子", x: -3, y: -4, kind: "furniture" },
];

const lines = [
  { text: "# 想法:别用编号,给每个词一个『坐标』(这里用 2 维)", stage: 0 },
  { text: "狗   = ( 4,  3)   # 已经摆好的三个词", stage: 0 },
  { text: "桌子 = (-4, -3);  椅子 = (-3, -4)", stage: 0 },
  { text: "猫   = ({{x}}, {{y}})   # ← 拖这两个朱字,挪动『猫』", stage: 1 },
  { text: "最近的词 = 离『猫』最近的那个    # 挨得近 = 意思近", stage: 2 },
  { text: "# 把猫挪到狗旁边,它就『像狗』;挪到桌椅旁,就『像家具』", stage: 3 },
];

const paramDefs = {
  x: { min: -5, max: 5, step: 1, fmt: (v) => String(v) },
  y: { min: -5, max: 5, step: 1, fmt: (v) => String(v) },
};
const initial = { x: 1, y: -2 };

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function compute(p) {
  const cat = { x: p.x, y: p.y };
  const ds = FIXED.map((f) => ({ ...f, d: dist(cat.x, cat.y, f.x, f.y) }))
    .sort((a, b) => a.d - b.d);
  const near = ds[0];
  return { cat, ds, near, likeAnimal: near.kind === "animal" };
}

// 平面映射:坐标 -5..5 → SVG
const PL = { x0: 48, y0: 44, w: 264, h: 196 };
const RG = { min: -5, max: 5 };
function toXY(x, y) {
  const px = PL.x0 + ((x - RG.min) / (RG.max - RG.min)) * PL.w;
  const py = PL.y0 + (1 - (y - RG.min) / (RG.max - RG.min)) * PL.h;
  return [px, py];
}

function Viz({ derived: d, stage, play }) {
  // 演法时按帧脚本移动「猫」;否则用拖动的坐标
  const cx = play && play._pos ? play._pos[0] : d.cat.x;
  const cy = play && play._pos ? play._pos[1] : d.cat.y;
  const ds = FIXED.map((f) => ({ ...f, d: dist(cx, cy, f.x, f.y) })).sort((a, b) => a.d - b.d);
  const near = ds[0];
  const likeAnimal = near.kind === "animal";
  const [catPx, catPy] = toXY(cx, cy);
  const showLink = stage >= 2;

  const catColor = stage >= 2 ? (likeAnimal ? "#9e2b1e" : "#2f5d8a") : "#7a6a4a";

  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={18} y={22} fill="#8a7656" font-size="12">
        每个词 = 平面上一个<tspan fill="#9e2b1e">点</tspan> · 挨得近 = 意思近
      </text>

      {/* 两个「区」的淡色底:动物角 / 家具角 */}
      <rect x={PL.x0 + PL.w * 0.55} y={PL.y0} width={PL.w * 0.45} height={PL.h * 0.5}
        fill="#9e2b1e" opacity="0.05" rx="6" />
      <rect x={PL.x0} y={PL.y0 + PL.h * 0.5} width={PL.w * 0.5} height={PL.h * 0.5}
        fill="#2f5d8a" opacity="0.06" rx="6" />
      <text x={PL.x0 + PL.w - 8} y={PL.y0 + 16} text-anchor="end" fill="#9e2b1e" font-size="10" opacity="0.6">动物角</text>
      <text x={PL.x0 + 6} y={PL.y0 + PL.h - 8} fill="#2f5d8a" font-size="10" opacity="0.6">家具角</text>

      {/* 坐标轴 */}
      {(() => { const [ox, oy] = toXY(0, 0); return (
        <g>
          <line x1={PL.x0} y1={oy} x2={PL.x0 + PL.w} y2={oy} stroke="#cdb98e" stroke-width="0.7" />
          <line x1={ox} y1={PL.y0} x2={ox} y2={PL.y0 + PL.h} stroke="#cdb98e" stroke-width="0.7" />
        </g>
      ); })()}

      {/* 猫 → 最近词 的连线 */}
      {showLink && (() => { const [nx, ny] = toXY(near.x, near.y); return (
        <line x1={catPx} y1={catPy} x2={nx} y2={ny}
          stroke={catColor} stroke-width="1.5" stroke-dasharray="4 3" opacity="0.7"
          style={{ transition: "all .4s ease" }} />
      ); })()}

      {/* 三个固定词 */}
      {FIXED.map((f, i) => {
        const [px, py] = toXY(f.x, f.y);
        const col = f.kind === "animal" ? "#9e2b1e" : "#2f5d8a";
        return (
          <g key={i}>
            <circle cx={px} cy={py} r="6" fill={col} opacity="0.8" />
            <text x={px + 9} y={py + 5} fill={col} font-size="13">{f.w}</text>
          </g>
        );
      })}

      {/* 可拖动的「猫」 */}
      <g style={{ transition: "all .4s ease" }} transform={`translate(${catPx},${catPy})`}>
        <circle r="8" fill={catColor} stroke="#fff" stroke-width="1.5" />
        <text x={11} y={5} fill={catColor} font-size="14">猫</text>
      </g>

      {/* 读数 */}
      <line x1={18} y1={252} x2={342} y2={252} stroke="#cdb98e" stroke-width="0.7" />
      <text x={18} y={270} fill="#5a4a36" font-size="12">
        猫 = ({cx}, {cy}) · 离各词:
        <tspan fill="#9e2b1e"> 狗 {ds.find(z=>z.w==="狗").d.toFixed(1)}</tspan>
        <tspan fill="#2f5d8a"> 桌子 {ds.find(z=>z.w==="桌子").d.toFixed(1)}</tspan>
        <tspan fill="#2f5d8a"> 椅子 {ds.find(z=>z.w==="椅子").d.toFixed(1)}</tspan>
      </text>
      {stage >= 2 ? (
        <text x={18} y={290} fill={catColor} font-size="12.5">
          离「<tspan font-size="14">{near.w}</tspan>」最近 → 模型会觉得「猫」{likeAnimal ? "像动物 ✓(对了)" : "像家具 ✗(荒唐)"}
        </text>
      ) : (
        <text x={18} y={290} fill="#8a7656" font-size="11">拖动第 4 行的两个朱字,挪动「猫」的坐标;点「演法」看全程</text>
      )}
    </svg>
  );
}

function frames(p, d) {
  return [
    { line: 2, stage: 0, say: "换个思路:别用编号,给每个词一个<b>坐标</b>。先摆好三个词——<b>狗</b>在右上,<b>桌子·椅子</b>在左下。", _pos: [p.x, p.y] },
    { line: 4, stage: 1, say: "现在把「<b>猫</b>」放进来(坐标可拖)。它该摆哪儿?", _pos: [1, -2] },
    { line: 5, stage: 2, say: "先把猫拖到<b>左下</b>(桌椅那边)看看——这时离猫最近的是家具,模型会以为「<b>猫像家具</b>」,<b>荒唐</b>。", _pos: [-3, -3] },
    { line: 5, stage: 2, say: "再把猫挪到<b>右上、狗的旁边</b>——离猫最近的成了「狗」,「<b>猫狗意思相近</b>」,这才对!", _pos: [3, 3] },
    { line: 6, stage: 3, say: "看明白了吗?<b>一个词在哪儿,就决定了它「像谁」——位置 = 含义</b>。我们要的就是给每个词找到好坐标。", _pos: [3, 3] },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "上一式的结论:编号、one-hot 都没含义。这一式换思路——把每个词放到一个<b>空间</b>里,用<b>坐标</b>代表它。这里先用最易看的 2 维(平面)。";
    case 1: return `「狗」在动物角、「桌子·椅子」在家具角。「猫」该摆哪儿?<b>拖第 4 行的坐标朱字</b>挪挪看。`;
    case 2: return d.likeAnimal
      ? `当前离「猫」最近的是「<b>${d.near.w}</b>」——猫被判成<b>像动物</b>,对了。<b>挨得近 = 意思近</b>。`
      : `当前离「猫」最近的是「<b>${d.near.w}</b>」——猫被判成<b>像家具</b>,荒唐。把它往动物角(右上、狗旁边)拖。`;
    case 3: return "<b>位置 = 含义</b>。真实模型里维度不是 2,而是几百~几千,但道理一样:意思近的词,坐标也近。下一式就把这张「地图」存成一张表。";
    default: return "拖动坐标挪动「猫」,点「演法」看它从「像家具」到「像狗」的全程。";
  }
}

const pyCode = `import numpy as np
# 给每个词一个 2 维坐标(真实模型里是几百维,道理一样)
words = {
    "狗":   np.array([ 4.0,  3.0]),
    "桌子": np.array([-4.0, -3.0]),
    "椅子": np.array([-3.0, -4.0]),
}
cat = np.array([3.0, 3.0])   # 把「猫」放在狗旁边试试

# 离猫最近的词 = 意思最近的词
for w, v in words.items():
    print(f"猫 离 {w}: {np.linalg.norm(cat - v):.2f}")
# -> 离「狗」最近。猫被判成「像动物」,符合直觉。
# 把 cat 改成 [-3,-3] 再跑,它就离桌椅最近 = 被判成「像家具」。
print("位置决定含义:挨得近 = 意思近")`;

export const wordPointDemo = {
  title: "演武场 · 坐标藏义",
  intro: "编号、one-hot 都没含义,怎么办?<b>换个思路:把每个词放到一个空间里,用「坐标」代表它。</b>" +
    "在这张平面图上,<b>挨得近 = 意思近</b>。这一式你亲手<b>拖动「猫」的坐标</b>:" +
    "把它拖到桌椅旁,模型就以为猫是家具;拖到狗旁边,猫狗才「意思相近」。<b>位置,就是含义。</b>",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1300,
  terms: [
    { t: "词向量 / 词的坐标", d: "用一串数字(= 空间里的一个坐标)代表一个词。这里用 2 维(平面上的点)方便看;真实模型里是<b>几百~几千维</b>,但「一个词 = 空间里一个点」的道理完全一样。" },
    { t: "挨得近 = 意思近", d: "词向量的核心约定:<b>意思相近的词,坐标也相近</b>。所以「猫」挨着「狗」就合理,挨着「桌子」就荒唐。把词摆到合适的位置,空间里就有了「含义」。" },
    { t: "维度(2 维只是为了看)", d: "平面是 2 维,只能表达很有限的关系。真实模型用几百上千维,才装得下「动物 / 家具 / 情感 / 时态…」等许许多多种相似关系。维度越高,能区分的「含义方向」越多。" },
    { t: "谁来决定坐标?", d: "这一式是<b>你</b>手动拖。真实模型里没人手摆——这些坐标是<b>训练出来</b>的(第五式会亲眼看到)。这一式只是先建立「位置=含义」的直觉。" },
    { t: "和上一式的关系", d: "上一式说明「编号/one-hot 不行」;这一式给出出路——<b>把词放进空间</b>。one-hot 其实也是空间里的点,但它让所有词两两等距;而好的词向量会让同类挤成一团。" },
  ],
  localCmd: "cd llm-volume/ch05-embedding/code && python3 embedding_table.py",
};


export default { name: 'GewuWordAsPointDemo' }
</script>
