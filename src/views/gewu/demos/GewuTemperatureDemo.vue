<script lang="jsx">
// 卷十 · 第一式 · 冷暖自调:temperature —— logits/T 调「胆量」,高温更野、低温更稳
const VOCAB = ["月", "光", "霜", "鸟", "风", "x"];
const LOGITS = [3.0, 2.5, 1.0, 0.5, 0.2, -2.0];

function softmax(z) {
  const m = Math.max(...z);
  const e = z.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map((v) => v / s);
}

const lines = [
  { text: "logits = [3.0, 2.5, 1.0, 0.5, 0.2, -2.0]   # 6 个候选字的打分", stage: 0 },
  { text: "T = {{T}}                                  # 温度(拖朱字)", stage: 1 },
  { text: "probs = softmax(logits / T)               # 除以温度再 softmax", stage: 2 },
  { text: "# T<1 更尖更稳 · T>1 更平更野 · T=1 原始", stage: 3 },
];

const paramDefs = { T: { min: 0.3, max: 2.0, step: 0.1, fmt: (v) => v.toFixed(1) } };
const initial = { T: 1.0 };

function compute(p) {
  const T = p.T;
  const probs = softmax(LOGITS.map((l) => l / T));
  const base = softmax(LOGITS);
  // 熵:衡量「平/尖」
  const ent = -probs.reduce((s, q) => s + (q > 0 ? q * Math.log(q) : 0), 0);
  return { T, probs, base, ent, top: probs[0] };
}

const X0 = 30, BARX = 64, BARW = 230, ROWH = 34, TOP = 70;
function Viz({ derived: d, stage }) {
  const show = stage >= 2;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={22} fill="#8a7656" font-size="12.5">
        同一组打分,温度 T = <tspan fill="#9e2b1e" font-size="15">{d.T.toFixed(1)}</tspan> 下的概率分布
      </text>
      <text x={X0} y={42} fill="#5a4a36" font-size="11.5">
        {d.T < 0.95 ? "低温:分布更尖 → 押注高分字(保守)"
          : d.T > 1.05 ? "高温:分布更平 → 给冷门字机会(冒险)"
          : "T=1:原始分布"}
      </text>

      {VOCAB.map((w, j) => {
        const y = TOP + j * ROWH;
        const wt = show ? d.probs[j] : d.base[j];
        const barw = Math.max(1.5, wt * BARW);
        const isTop = j === 0;
        // 虚线标出 T=1 原始概率位置,对比胖瘦变化
        const baseW = d.base[j] * BARW;
        return (
          <g key={j}>
            <text x={X0} y={y + 15} fill={isTop ? "#9e2b1e" : "#5a4a36"} font-size="14">{w}</text>
            <rect x={BARX} y={y} width={BARW} height={19} rx="3" fill="#efe6d2" stroke="#cdb98e" stroke-width="0.7" />
            <rect x={BARX} y={y} width={barw} height={19} rx="3"
              fill={isTop ? "#9e2b1e" : "#b9a06a"} style={{ transition: "width .35s ease" }} />
            {show && Math.abs(d.probs[j] - d.base[j]) > 0.002 && (
              <line x1={BARX + baseW} y1={y - 1} x2={BARX + baseW} y2={y + 20}
                stroke="#3f6b4f" stroke-width="1" stroke-dasharray="2 2" opacity="0.6" />
            )}
            <text x={BARX + barw + 6} y={y + 14} fill="#2b2117" font-size="11">{(wt * 100).toFixed(1)}%</text>
          </g>
        );
      })}
      <text x={X0} y={284} fill="#8a7656" font-size="11">
        {show
          ? `绿虚线=T=1 原始位置 · 最高字「月」${(d.top * 100).toFixed(1)}%(T 越低越高)`
          : "点「演法」:看温度旋钮如何揉捏分布"}
      </text>
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: "模型每步吐出 <b>logits</b>:对每个候选字的打分。这里 6 个字,「月」最高、「x」最低(代表生僻/不通顺)。" },
    { line: 2, stage: 1, say: `怎么把打分变成「挑一个字」?<b>temperature</b> 是最常用的旋钮。当前 T=<b>${d.T.toFixed(1)}</b>。` },
    { line: 3, stage: 2, say: `做法极简:<b>logits 除以 T 再 softmax</b>。T=${d.T.toFixed(1)} 时,最高字「月」占 <b>${(d.top * 100).toFixed(1)}%</b>。` },
    { line: 4, stage: 3, say: d.T < 0.95
        ? `<b>低温</b>(T<1)把差距拉大、分布变尖,几乎只押「月」「光」——保守、稳、易复读。`
        : d.T > 1.05
        ? `<b>高温</b>(T>1)把差距抹平,连「霜」「鸟」都分到不少——更野、更多样,但也更容易蹦出不通顺的字。`
        : `T=1 就是<b>原始分布</b>。往左拖更稳,往右拖更野——这就是各家 API 那个「creativity」旋钮。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "采样的起点:模型吐出 <b>logits</b>(每个字的打分)。下面所有策略都是在「怎么从这堆分里挑一个」上做文章。采样<b>不改模型</b>,只改风格。";
    case 1: return `<b>temperature(温度)</b>:调生成「胆量」的旋钮。拖朱字改 T,当前 <b>${d.T.toFixed(1)}</b>。`;
    case 2: return `<b>probs = softmax(logits / T)</b>。除以 T 再归一。T=${d.T.toFixed(1)} 下「月」占 ${(d.top * 100).toFixed(1)}%。`;
    case 3: return d.T < 0.95
        ? "<b>T<1</b>:拉大差距、分布更尖,押注高分字,保守稳定(极端 T→0 即 greedy)。"
        : d.T > 1.05
        ? "<b>T>1</b>:拉平差距、分布更平,给冷门字机会,更随机冒险(过高会不通顺)。"
        : "<b>T=1</b>:原始分布,不增不减。实践里常配 top-k/top-p 一起用。";
    default: return "拖朱字调温度,点「演法」看分布变尖或变平。";
  }
}

const pyCode = `import numpy as np
VOCAB = ["月","光","霜","鸟","风","x"]
logits = np.array([3.0, 2.5, 1.0, 0.5, 0.2, -2.0])
def softmax(z):
    e = np.exp(z - z.max()); return e / e.sum()

for T in [0.5, 1.0, 1.5]:
    probs = softmax(logits / T)   # 除以温度再 softmax
    print(T, (probs * 100).round(1))
# T=0.5: 月71.6 光26.3 ...(更尖) | T=1.5: 月42.4 光30.4 ...(更平)`;

export const tempDemo = {
  title: "演武场 · 冷暖自调",
  intro: "模型吐出 <b>logits</b>(每个字的打分),<b>temperature</b> 是调生成「胆量」的旋钮:<b>logits/T 再 softmax</b>。" +
    "T<1 分布更尖更稳、T>1 更平更野、T=1 原始。拖动<b>温度朱字</b>,看同一组打分被揉成不同形状。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "temperature 温度", d: "把 logits <b>除以 T</b> 再 softmax。T<1 拉大差距(分布尖、保守),T>1 抹平差距(分布平、冒险),T=1 不变。最常用的「创意旋钮」。" },
    { t: "为什么除法能调胆量", d: "softmax 看的是 logits 之间的<b>相对差</b>。除以小 T 把差距放大→赢家通吃;除以大 T 把差距缩小→人人有份。T→0 退化成永远选最高(greedy)。" },
    { t: "采样不改模型", d: "模型参数、logits 都没变,变的只是「<b>怎么挑</b>」。所以同一个模型,低温像复读机、高温像诗人——风格全在采样这一步。" },
    { t: "实践搭配", d: "单用高温容易蹦出离谱字,所以常<b>先 top-k / top-p 砍长尾,再配适中 T</b>(如 0.7~1.0)。这就是各家 API 同时暴露 temperature 和 top_p 的原因。" },
  ],
  localCmd: "cd llm-volume/ch10-sampling/code && python3 sampling_strategies.py",
};


export default { name: 'GewuTemperatureDemo' }
</script>
