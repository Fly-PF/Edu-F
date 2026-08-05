<script lang="jsx">
// 卷六 · 第二式 · 问答相济:Q/K/V —— 用三个视角让注意力更灵活
import { MatrixHeatmap } from "../GewuTracePanels.vue";
import { WORDS, X, Wq, Wk, Wv, qkvScoreMatrix } from "./ch06attn.js";

const lines = [
  { text: "Q = X @ Wq.T        # 问:我要找什么", stage: 0 },
  { text: "K = X @ Wk.T        # 键:我像什么", stage: 1 },
  { text: "V = X @ Wv.T        # 值:我交出什么", stage: 2 },
  { text: "q = '{{q}}'         # 选一行当主角", stage: 3 },
  { text: "S = Q @ K.T / √d    # 问-键匹配矩阵", stage: 4 },
  { text: "s = S[q]            # 主角决定看谁", stage: 4 },
  { text: "W = softmax(S)      # 每一行归一", stage: 5 },
  { text: "w = W[q]            # 主角注意力", stage: 5 },
  { text: "y = w @ V           # 汇总的是 V", stage: 6 },
  { text: "# Q/K 看谁,V 取什么", stage: 6 },
];

const paramDefs = { q: { min: 0, max: WORDS.length - 1, step: 1, fmt: (v) => WORDS[v] } };
const initial = { q: 2 };

function compute(p) {
  const full = qkvScoreMatrix();
  const { Q, K, V } = full;
  const qi = p.q;
  const scores = full.scores[qi];
  const weights = full.weights[qi];
  const y = [0, 0, 0];
  weights.forEach((w, j) => V[j].forEach((v, k) => (y[k] += w * v)));
  return {
    qi,
    word: WORDS[qi],
    Q,
    K,
    V,
    scoreMatrix: full.scores,
    weightRows: full.weights,
    Y: full.Y,
    scores,
    weights,
    y,
  };
}

const fmt = (v) => v.toFixed(2);
const dotExpr = (x, row) => x.map((v, i) => `${fmt(v)}×${fmt(row[i])}`).join(" + ");

function ProjectionDetail({ d, kind }) {
  const cfg = {
    Q: { matrix: Wq, value: d.Q[d.qi], label: "Q = X @ Wq.T", desc: "问:这个词想找什么" },
    K: { matrix: Wk, value: d.K[d.qi], label: "K = X @ Wk.T", desc: "键:这个词像什么" },
    V: { matrix: Wv, value: d.V[d.qi], label: "V = X @ Wv.T", desc: "值:被关注时交出什么" },
  }[kind];
  const x = X[d.qi];
  return (
    <g>
      <text x={18} y={24} fill="#8a7656" font-size="12.5">
        {cfg.label}: 以「<tspan fill="#9e2b1e">{d.word}</tspan>」这一行演示矩阵乘法
      </text>
      <text x={18} y={46} fill="#5a4a36" font-size="11.5">
        X[{d.word}] = [{x.map(fmt).join(", ")}] · {cfg.desc}
      </text>
      <text x={18} y={76} fill="#9e2b1e" font-size="11.5">每个输出维度 = X 向量 · 投影矩阵的一行</text>
      {cfg.matrix.map((row, i) => (
        <g key={i}>
          <rect x={20} y={90 + i * 42} width={316} height={24} rx="3"
            fill="rgba(63,107,79,0.06)" stroke="#cdb98e" stroke-width="0.5" />
          <text x={24} y={106 + i * 42} fill="#5a4a36" font-size="10.5">
            {kind}[{i}] = {dotExpr(x, row)}
          </text>
          <text x={286} y={106 + i * 42} fill="#3f6b4f" font-size="11.5">
            = {fmt(cfg.value[i])}
          </text>
        </g>
      ))}
      <line x1={18} y1={226} x2={336} y2={226} stroke="#cdb98e" stroke-width="0.8" />
      <text x={18} y={250} fill="#3f6b4f" font-size="12">
        所以 {kind}[{d.word}] = [{cfg.value.map(fmt).join(", ")}]
      </text>
      <text x={18} y={276} fill="#8a7656" font-size="11">
        同样的计算会对四个词各做一遍,于是得到整张 {kind} 矩阵。
      </text>
    </g>
  );
}

function Viz({ derived: d, stage }) {
  const X0 = 20, BARX = 222, BARW = 104, ROWH = 28, TOP = 104;
  const showW = stage >= 5;
  const top = d.weights.map((w, j) => ({ j, w })).filter((x) => x.j !== d.qi).sort((a, b) => b.w - a.w)[0];

  if (stage <= 2) {
    return (
      <svg viewBox="0 0 360 325" width="360" height="325">
        <ProjectionDetail d={d} kind={stage === 0 ? "Q" : stage === 1 ? "K" : "V"} />
      </svg>
    );
  }

  if (stage === 3) {
    return (
      <svg viewBox="0 0 360 325" width="360" height="325">
        <text x={18} y={24} fill="#8a7656" font-size="12.5">同一个词,已经变成三种身份</text>
        <text x={18} y={54} fill="#9e2b1e" font-size="13">主角「{d.word}」</text>
        {[
          ["Q 问", d.Q[d.qi], "去匹配别人:我想找谁"],
          ["K 键", d.K[d.qi], "被别人匹配:我像什么"],
          ["V 值", d.V[d.qi], "被看见后交出的内容"],
        ].map(([name, vec, desc], i) => (
          <g key={name}>
            <rect x={28} y={82 + i * 62} width={304} height={42} rx="4"
              fill="rgba(228,214,186,0.72)" stroke="#cdb98e" stroke-width="0.8" />
            <text x={44} y={105 + i * 62} fill={i === 0 ? "#9c7b2e" : i === 1 ? "#3f6b4f" : "#9e2b1e"} font-size="12.5">{name}</text>
            <text x={96} y={105 + i * 62} fill="#2b2117" font-size="11">[{vec.map(fmt).join(", ")}]</text>
            <text x={44} y={120 + i * 62} fill="#8a7656" font-size="10">{desc}</text>
          </g>
        ))}
        <text x={18} y={294} fill="#8a7656" font-size="11">
          下一步:用 Q 和所有 K 算匹配分数,再用权重汇总 V。
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 360 366" width="360" height="366">
      <text x={X0} y={24} fill="#8a7656" font-size="12.5">
        Q/K/V 把一份 X 拆成「看谁」和「取什么」两套状态
      </text>
      <text x={X0} y={46} fill="#5a4a36" font-size="12">
        主角「<tspan fill="#9e2b1e">{d.word}</tspan>」: Q=[{d.Q[d.qi].map((v) => v.toFixed(2)).join(", ")}]
      </text>
      <text x={X0} y={66} fill="#5a4a36" font-size="11">左:整张 QKᵀ/√d 矩阵；右:当前行权重与 V 汇总</text>

      <MatrixHeatmap
        x={10}
        y={86}
        rows={WORDS}
        cols={WORDS}
        values={showW ? d.weightRows : d.scoreMatrix}
        cell={31}
        title={showW ? "weights" : "scores=QKᵀ/√d"}
        highlightRow={stage >= 3 ? d.qi : null}
        formatter={(v) => showW ? Math.round(v * 100) + "%" : v.toFixed(2)}
        fillFor={(v) => showW
          ? `rgba(158,43,30,${0.10 + v * 0.80})`
          : `rgba(63,107,79,${0.10 + Math.min(1, Math.abs(v)) * 0.58})`}
        showLegend
        legendLabel={showW ? "颜色深浅表示注意力权重" : "颜色深浅表示 Q/K 匹配分数"}
      />

      {WORDS.map((w, j) => {
        const y = TOP + j * ROWH;
        const wt = d.weights[j];
        const barw = Math.max(2, wt * BARW);
        const isSelf = j === d.qi;
        const isTop = showW && top && j === top.j;
        const labelX = BARX + (showW ? barw : 0) + 5;
        const labelAtRight = labelX > 308;
        return (
          <g key={j}>
            <text x={BARX - 10} y={y + 13} fill={isSelf ? "#9e2b1e" : "#5a4a36"} font-size="12" text-anchor="end">{w}</text>
            <rect x={BARX} y={y} width={BARW} height={17} rx="3" fill="#efe6d2" stroke="#cdb98e" stroke-width="0.8" />
            {showW && (
              <rect x={BARX} y={y} width={barw} height={17} rx="3"
                fill={isSelf ? "#9e2b1e" : isTop ? "#c0632e" : "#b9a06a"}
                style={{ transition: "width .4s ease" }} />
            )}
            {stage >= 4 && (
              <text x={labelAtRight ? 336 : labelX} y={y + 12}
                text-anchor={labelAtRight ? "end" : "start"} fill="#2b2117" font-size="10">
                {showW ? (wt * 100).toFixed(0) + "%" : "分=" + d.scores[j].toFixed(2)}
              </text>
            )}
            {isTop && <text x={BARX + 4} y={y + 12} fill="#fff" font-size="9.5">最关注</text>}
          </g>
        );
      })}

      {stage >= 6 && (
        <g>
          <line x1={X0} y1={286} x2={338} y2={286} stroke="#cdb98e" stroke-width="0.8" />
          <text x={X0} y={306} fill="#5a4a36" font-size="11.5">
            <tspan fill="#9c7b2e">Q[{d.word}]</tspan> · <tspan fill="#3f6b4f">K[每个词]</tspan> → softmax → w（看谁）
          </text>
          <text x={X0} y={328} fill="#5a4a36" font-size="11.5">
            每个 w × <tspan fill="#9e2b1e">对应 V</tspan> → 加权和 <tspan fill="#3f6b4f">y = [{d.y.map((v) => v.toFixed(2)).join(", ")}]</tspan>
          </text>
          <text x={X0} y={350} fill="#8a7656" font-size="11">
            Q/K 决定看谁；V 决定取什么。最关注：{WORDS[top.j]}（{(top.w * 100).toFixed(0)}%）
          </text>
        </g>
      )}
      {stage < 4 && <text x={214} y={252} fill="#8a7656" font-size="11">点「演法」:看 Q 问、K 答、V 取值</text>}
    </svg>
  );
}

function frames(d0, d) {
  const top = d.weights.map((w, j) => ({ j, w })).filter((x) => x.j !== d.qi).sort((a, b) => b.w - a.w)[0];
  return [
    { line: 1, stage: 0, say: "<b>Q = X @ Wq.T</b>:先把词向量变成「问」。右侧把一个词的一行矩阵乘法拆成三个点积。" },
    { line: 2, stage: 1, say: "<b>K = X @ Wk.T</b>:再把词向量变成「键」。K 用来被 Q 匹配,表示「我像什么」。" },
    { line: 3, stage: 2, say: "<b>V = X @ Wv.T</b>:最后得到「值」。注意后面真正被汇总的是 V,不是原始 X。" },
    { line: 4, stage: 3, say: `主角「<b>${d.word}</b>」现在有三种身份:Q 用来提问,K 用来被匹配,V 用来交内容。` },
    { line: 5, stage: 4, say: "算整张 <b>Q @ K.T / √d_k</b> 矩阵。每一格都是「某个词的 Q」和「某个词的 K」的匹配分数。" },
    { line: 8, stage: 5, say: `对每行做 softmax 得到注意力权重。「${d.word}」最关注「<b>${WORDS[top.j]}</b>」(${(top.w * 100).toFixed(0)}%)。` },
    { line: 9, stage: 6, say: `最后汇总的是<b>值 V</b>,不是原向量 X。「看谁」和「取什么」被拆成两件事,表达力更强。` },
  ];
}

function note(stage, p, d) {
  const top = d.weights.map((w, j) => ({ j, w })).filter((x) => x.j !== d.qi).sort((a, b) => b.w - a.w)[0];
  switch (stage) {
    case 0: return "<b>Q 投影</b>:矩阵乘法不是黑箱。每个 Q 维度都是「词向量」和 Wq 的一行做点积。";
    case 1: return "<b>K 投影</b>:同样的 X,换一组矩阵 Wk,就得到另一种身份 K。";
    case 2: return "<b>V 投影</b>:V 是后面真正会被加权汇总的内容。";
    case 3: return `主角「<b>${d.word}</b>」现在同时有 Q/K/V 三条向量。Q/K 负责打分,V 负责被汇总。`;
    case 4: return "打分 = <b>Q·K / √d_k</b>。<b>√d_k</b> 是缩放,防止点积过大导致 softmax 过尖、梯度消失。";
    case 5: return `权重出炉。「${d.word}」把最多注意力给了「<b>${WORDS[top.j]}</b>」。`;
    case 6: return "汇总的是 <b>V</b>。打分(Q·K)与取值(V)<b>分开</b>:模型能学到「看谁」和「取什么」两件独立的事。";
    default: return "拖朱字换主角,点「演法」看 Q/K/V 协作。";
  }
}

const pyCode = `import numpy as np
WORDS = ["我", "吃", "苹果", "了"]
X = np.array([[1.,0,0],[0,1.,.3],[0,.8,1.],[.2,.1,.1]])
Wq=np.array([[.5,.1,0],[0,.6,.2],[.1,0,.7]])
Wk=np.array([[.6,0,.1],[.1,.5,0],[0,.2,.6]])
Wv=np.array([[.7,0,0],[0,.7,.1],[.1,0,.6]])
def softmax(z):
    e=np.exp(z-z.max(-1,keepdims=True)); return e/e.sum(-1,keepdims=True)

Q, K, V = X@Wq.T, X@Wk.T, X@Wv.T
q = 2  # 苹果
scores = K @ Q[q] / np.sqrt(3)
weights = softmax(scores)
y = weights @ V
for w, s in zip(WORDS, weights):
    print(f"{w}: {s:.2f}")
print("y =", y.round(2))`;

export const attnQkvDemo = {
  title: "演武场 · 问答相济",
  intro: "真正的 self-attention 给每个词三种身份:<b>Q(问)</b>、<b>K(键)</b>、<b>V(值)</b>。" +
    "主角用 <b>Q</b> 去对每个词的 <b>K</b> 打分(除以 √d_k 缩放),softmax 成权重,再汇总各词的 <b>V</b>。" +
    "「打分」与「取值」就此解耦。拖动<b>主角朱字</b>,看三者协作。",
  bridge: {
    prev: ["ch06 第一式 X@Xᵀ", "ch01 点积/softmax"],
    current: ["Q=XWqᵀ", "K=XWkᵀ", "V=XWvᵀ", "weights@V"],
    next: ["causal mask", "multi-head attention", "Transformer Block"],
    sources: ["llm-volume/ch06-attention/code/self_attention.py", "web/src/demos/ch06attn.js"],
  },
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "Q / K / V", d: "<b>查询 Query / 键 Key / 值 Value</b>。同一个词向量过三个不同投影得到。Q·K 决定「关注谁」,V 是「真正被汇总的内容」。" },
    { t: "为何除以 √d_k", d: "维度 d_k 越大,点积的数值越容易很大,softmax 会变得极端(几乎 one-hot),梯度消失。除以 <b>√d_k</b> 把方差拉回,训练更稳。" },
    { t: "打分与取值解耦", d: "上一式用 X 同时打分和取值。Q/K/V 让两件事用<b>不同参数</b>:模型可以学「该看谁」和「看到后取什么」两套独立逻辑,表达力更强。" },
    { t: "和上一式的承接", d: "去掉 Wq=Wk=Wv=单位阵,Q/K/V 就退化回上一式。所以 Q/K/V 是「顾盼生义」的<b>可学习升级版</b>。" },
  ],
  localCmd: "cd llm-volume/ch06-attention/code && python3 self_attention.py",
};


export default { name: 'GewuAttnQkvDemo' }
</script>
