<script lang="jsx">
// 卷十三 · 第一式 · 缓存省算:KV cache —— 算过的 K、V 存起来,生成从平方降到线性
// 真实逻辑来自 ch13/kv_cache.py:无缓存累计算 1+2+…+T 个,有缓存每步只算 1 个
const lines = [
  { text: "for t in range(T):           # 逐字生成,序列越来越长", stage: 0 },
  { text: "T = {{T}}                     # 已生成的字数(拖朱字)", stage: 0 },
  { text: "无缓存: K = seq @ Wk         # 每步把整段 K、V 从头重算", stage: 1 },
  { text: "KV cache: 只算新字的 k/v,追加进缓存,旧的不重算", stage: 2 },
  { text: "# 重算: 1+2+…+T(平方) · 缓存: T(线性)", stage: 3 },
];

const paramDefs = { T: { min: 1, max: 12, step: 1, fmt: (v) => v } };
const initial = { T: 6 };

function compute(p) {
  const T = p.T;
  const recompute = (T * (T + 1)) / 2; // 1+2+...+T
  const cached = T;                     // 每步只算 1 个
  const saved = recompute - cached;
  const ratio = recompute / cached;     // 重算是缓存的几倍
  return { T, recompute, cached, saved, ratio };
}

const X0 = 30, GTOP = 64, CELL = 18, GAP = 4;
function Viz({ derived: d, stage }) {
  const showCache = stage >= 2;
  const T = d.T;
  // 上半部分:三角形(无缓存,每步重算全段) vs 单列(缓存,每步算 1 个)
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={20} fill="#8a7656" font-size="12">每个方块 = 算一个字的 K、V。生成 {T} 个字时:</text>

      {/* 无缓存:三角阵 */}
      <text x={X0} y={GTOP - 6} fill="#9e2b1e" font-size="11">无缓存(每步重算整段):</text>
      {Array.from({ length: T }, (_, row) =>
        Array.from({ length: row + 1 }, (_, col) => (
          <rect key={`a${row}-${col}`}
            x={X0 + col * (CELL + GAP)} y={GTOP + row * (CELL * 0.7)}
            width={CELL} height={CELL * 0.62} rx="1.5"
            fill={col === row ? "#9e2b1e" : "#d9b3ac"} opacity={col === row ? 1 : 0.7} />
        ))
      )}
      <text x={X0 + T * (CELL + GAP) + 8} y={GTOP + (T * CELL * 0.7) / 2}
        fill="#9e2b1e" font-size="13">共 {d.recompute} 个</text>

      {/* 缓存:单列 + 已缓存影子 */}
      {showCache && (
        <>
          <text x={X0} y={GTOP + T * CELL * 0.7 + 22} fill="#3f6b4f" font-size="11">KV cache(每步只算 1 个新字):</text>
          {Array.from({ length: T }, (_, row) => (
            <g key={`b${row}`}>
              {/* 缓存里复用的旧字(影子) */}
              {Array.from({ length: row }, (_, col) => (
                <rect key={`s${row}-${col}`}
                  x={X0 + col * (CELL + GAP)} y={GTOP + T * CELL * 0.7 + 30 + row * (CELL * 0.7)}
                  width={CELL} height={CELL * 0.62} rx="1.5" fill="#cdb98e" opacity="0.35" />
              ))}
              {/* 当步真正计算的 1 个新字 */}
              <rect x={X0 + row * (CELL + GAP)} y={GTOP + T * CELL * 0.7 + 30 + row * (CELL * 0.7)}
                width={CELL} height={CELL * 0.62} rx="1.5" fill="#3f6b4f" />
            </g>
          ))}
          <text x={X0 + T * (CELL + GAP) + 8} y={GTOP + T * CELL * 0.7 + 30 + (T * CELL * 0.7) / 2}
            fill="#3f6b4f" font-size="13">共 {d.cached} 个</text>
        </>
      )}

      {stage >= 3 && (
        <text x={X0} y={292} fill="#5a4a36" font-size="12">
          省下 <tspan fill="#3f6b4f" font-size="14">{d.saved}</tspan> 个重复计算 · 重算量是缓存的
          <tspan fill="#9e2b1e" font-size="14"> {d.ratio.toFixed(1)}×</tspan>(T 越大越悬殊)
        </text>
      )}
      {stage < 2 && (
        <text x={X0} y={GTOP + T * CELL * 0.7 + 40} fill="#8a7656" font-size="11.5">
          点「演法」:看 KV cache 如何把三角阵压成一条线
        </text>
      )}
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: `模型逐字生成:吐一个字,就要回看<b>前面所有字</b>。当前已生成 <b>T=${d.T}</b> 个字。` },
    { line: 3, stage: 1, say: `天生的浪费:第 t 步把整段的 K、V <b>从头重算一遍</b>。第 1 步算 1 个、第 2 步算 2 个……累计 <b>1+2+…+${d.T} = ${d.recompute}</b> 个字——随长度<b>平方</b>增长。` },
    { line: 4, stage: 2, say: `KV cache 的主意特别朴素:<b>K、V 算过一次就存起来</b>,下一步<b>只算新来的那一个字</b>,把它的 k/v 追加进缓存。旧的(浅色)直接复用,不重算。` },
    { line: 5, stage: 3, say: `数一数:缓存方式累计只算 <b>${d.cached}</b> 个,无缓存要 <b>${d.recompute}</b> 个,省下 <b>${d.saved}</b> 个。计算量从平方降到<b>线性</b>,T 越大省得越夸张。代价是要把历史 K、V 一直存着(吃显存)。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return `自回归生成:每吐一个字都要回看前面所有字算注意力。拖朱字改已生成字数 T=${d.T}。`;
    case 1: return `<b>无缓存</b>:第 t 步重算整段 K、V。累计 1+2+…+${d.T} = <b>${d.recompute}</b> 个,随长度<b>平方</b>增长——越往后越慢。`;
    case 2: return `<b>KV cache</b>:k=token@Wk、v=token@Wv 只算新字一个,vstack 追加进缓存。先验证过:缓存<b>不改变结果</b>,只省计算。`;
    case 3: return `缓存 <b>${d.cached}</b> 个 vs 重算 <b>${d.recompute}</b> 个,省 <b>${d.saved}</b> 个,平方→线性。代价是显存(历史 K、V 常驻)——这正是长上下文吃显存的根因,也是 vLLM 等框架的头号优化。`;
    default: return "拖朱字调 T,点「演法」看缓存怎么省。";
  }
}

const pyCode = `import numpy as np
class KVCache:
    def __init__(self): self.K = self.V = None
    def step(self, new_token):
        q = new_token @ Wq
        k = new_token @ Wk            # 只算新字这一个 k
        v = new_token @ Wv            # 只算新字这一个 v
        self.K = k[None] if self.K is None else np.vstack([self.K, k])
        self.V = v[None] if self.V is None else np.vstack([self.V, v])
        scores = q @ self.K.T / np.sqrt(d_model)
        return softmax(scores) @ self.V
# 生成 6 个字:重算 21 个 vs 缓存 6 个 → 省 15 个,结果完全一致`;

export const kvCacheDemo = {
  title: "演武场 · 缓存省算",
  intro: "自回归生成天生爱重算:每吐一个字,前面所有字的 K、V 又被<b>整段重算</b>(累计 1+2+…+T,<b>平方</b>)。" +
    "<b>KV cache</b> 把算过的存起来,每步<b>只算新字一个</b>(线性),且<b>结果完全一致</b>。拖动 <b>T 朱字</b>,看三角阵被压成一条线。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "为什么慢", d: "生成第 t 个字要回看前面所有字算注意力。无缓存时每步把整段 K、V <b>从头重算</b>,累计 1+2+…+T,随序列长度<b>平方增长</b>。序列越长浪费越夸张。" },
    { t: "KV cache", d: "K、V 算过一次就<b>缓存</b>,下一步只算新来那一个字的 k/v,<b>追加</b>进缓存,旧的直接复用。计算量降到随长度<b>线性增长</b>。" },
    { t: "缓存不改变结果", d: "缓存只是省去重复计算,数学上和「每步重算」<b>逐位一致</b>(代码里用 allclose 全程验证为 True)。它换的是速度,不是精度。" },
    { t: "代价是显存", d: "得把<b>所有历史 K、V</b> 一直存着。这正是长上下文很吃显存的根本原因之一,也是 vLLM、TensorRT-LLM 等推理框架把 KV cache 当<b>头号优化</b>的原因。" },
  ],
  localCmd: "cd llm-volume/ch13-inference/code && python3 kv_cache.py",
};


export default { name: 'GewuKvCacheDemo' }
</script>
