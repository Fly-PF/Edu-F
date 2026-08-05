<script lang="jsx">
// 卷十四 · 第一式 · 开卷而答:RAG —— 回答前先检索私有知识库,让答案有出处、少幻觉
// 真实数据来自 ch14/minimal_rag.py:词袋向量 + 余弦相似度,数值由该脚本实测
const DOCS = [
  "年会定在 12 月 20 日晚六点,滨江大酒店三楼宴会厅",
  "报销:OA 提交发票,主管审批,财务每周五打款",
  "公司 WiFi 是 Office_5G,密码 welcome2024",
  "午休 12:00–13:30,健身房在 B 座负一层刷工牌进",
  "请年假需提前三天在 OA 提交,连休超 5 天需总监审批",
];
// 每个问题对 5 条资料的真实余弦相似度(python 实测)
const QS = [
  { q: "WiFi 密码是多少?", sims: [0.075, 0.0, 0.44, 0.0, 0.0] },
  { q: "怎么请年假?", sims: [0.105, 0.0, 0.0, 0.0, 0.354] },
  { q: "年会什么时候?在哪开?", sims: [0.327, 0.085, 0.08, 0.175, 0.183] },
  { q: "电脑怎么报修?", sims: [0.0, 0.0, 0.0, 0.0, 0.0] },
];

const ANSWERS = [
  "公司 WiFi 密码是 welcome2024。",
  "年假需要提前三天在 OA 提交。",
  "年会在 12 月 20 日晚六点，于滨江大酒店三楼宴会厅。",
  "资料库中没有足够相关的证据，不能据此回答电脑报修流程。",
];

const lines = [
  { text: "qi = {{qi}}                    # 选一个问题(拖朱字)", stage: 0 },
  { text: "qv = embed(question)          # 问题变成向量", stage: 1 },
  { text: "sims = [cosine(qv, dv) ...]   # 和每条资料算相似度", stage: 2 },
  { text: "ranked = argsort(sims)         # 先排序，只是候选", stage: 3 },
  { text: "top = [i for i in ranked if sims[i] >= {{minScore}}][:2]", stage: 4 },
  { text: "prompt = top + 问题 → LLM      # 无证据则拒答", stage: 5 },
];

const paramDefs = {
  qi: { min: 0, max: 3, step: 1, fmt: (v) => v + 1 },
  minScore: { min: 0, max: 0.5, step: 0.05, fmt: (v) => v.toFixed(2), label: "最低相关度" },
};
const initial = { qi: 0, minScore: 0.15 };

function compute(p) {
  const item = QS[p.qi];
  const ranked = item.sims.map((score, index) => ({ score, index })).sort((a, b) => b.score - a.score);
  const citations = ranked.filter((item) => item.score >= p.minScore).slice(0, 2).map((item) => item.index);
  return {
    qi: p.qi,
    q: item.q,
    sims: item.sims,
    minScore: p.minScore,
    citations,
    top1: citations[0] ?? null,
    hasEvidence: citations.length > 0,
    answer: ANSWERS[p.qi],
  };
}

const X0 = 26, BARX = 38, BARW = 150, ROWH = 40, TOP = 78, SIMX = 196;
function Viz({ derived: d, stage }) {
  const showSim = stage >= 2;
  const showTop = stage >= 4;
  const mx = 0.44;
  return (
    <svg viewBox="0 0 360 370" width="360" height="370" role="img" aria-label="RAG 检索与引用回答流程">
      <text x={X0} y={20} fill="#8a7656" font-size="12">私有知识库(模型绝没见过)· 问:「{d.q}」</text>
      <text x={X0} y={38} fill="#5a4a36" font-size="10.5">
        {showSim ? <tspan><tspan fill="#3f6b4f">绿=通过阈值</tspan> · 灰=不引用</tspan>
          : "把问题和每条资料都变成向量,比相似度"}
      </text>

      {DOCS.map((doc, j) => {
        const y = TOP + j * ROWH;
        const s = d.sims[j];
        const rank = d.citations.indexOf(j);
        const hit = showTop && rank !== -1;
        const rejected = showTop && !hit;
        const barw = showSim ? Math.max(2, (s / mx) * BARW) : 0;
        return (
          <g key={j} data-step={showTop ? 3 : showSim ? 2 : 1}>
            <rect x={BARX} y={y - 14} width={SIMX - BARX - 6} height={ROWH - 8} rx="3"
              fill={hit ? "rgba(63,107,79,0.12)" : rejected ? "rgba(138,118,86,0.07)" : "transparent"} stroke={hit ? "#3f6b4f" : "none"} stroke-width="0.8" />
            <text x={BARX + 4} y={y - 1} fill={hit ? "#2b2117" : "#8a7656"} font-size="9.5">
              {doc.length > 18 ? doc.slice(0, 18) + "…" : doc}
            </text>
            {/* 相似度条 */}
            <rect x={SIMX} y={y - 12} width={BARW} height={16} rx="3" fill="#efe6d2" stroke="#cdb98e" stroke-width="0.6" />
            {showSim && (
              <rect x={SIMX} y={y - 12} width={barw} height={16} rx="3"
                fill={hit ? "#3f6b4f" : "#d9cfb6"} style={{ transition: "width .35s ease" }} />
            )}
            {showSim && (
              <text x={SIMX + barw + 5} y={y} fill={hit ? "#3f6b4f" : "#8a7656"} font-size="9.5">
                {s.toFixed(3)}{hit ? ` ◀ top${rank + 1}` : rejected ? " · 阈下" : ""}
              </text>
            )}
          </g>
        );
      })}

      {stage >= 5 ? (
        <>
          <text x={X0} y={TOP + 5 * ROWH + 22} fill="#8a7656" font-size="11">{d.hasEvidence ? "只把通过阈值的资料交给模型 → 有出处、少幻觉" : "无资料通过阈值 → 停止生成，避免编造"}</text>
          <rect x={18} y={280} width={324} height={84} fill="#fbfbff" />
          <rect x={20} y={282} width={320} height={38} rx="5" fill={d.hasEvidence ? "#e8f8f8" : "#fff1ef"} stroke={d.hasEvidence ? "#52bbc4" : "#c96b5d"} stroke-width="0.8" />
          <text x={30} y={297} fill={d.hasEvidence ? "#347f86" : "#a34b3f"} font-size="10.5">{d.hasEvidence ? "上下文窗口 · 通过阈值的检索结果" : "证据检查 · 没有资料通过阈值"}</text>
          <text x={30} y={312} fill="#3d3564" font-size="9.5">{d.hasEvidence ? `文档 ${d.citations.map((index) => index + 1).join(" + ")} → 交给模型` : "要求改问法、补资料或转人工"}</text>
          <rect x={20} y={328} width={320} height={32} rx="5" fill="#f0eeff" stroke="#8178cf" stroke-width="0.8" />
          <text x={30} y={343} fill="#3d3564" font-size="10.5">{d.hasEvidence ? `答案：${d.answer}` : "结果：拒绝基于现有资料作答"}</text>
          <text x={330} y={356} fill="#8178cf" font-size="8.5" text-anchor="end">{d.hasEvidence ? `引用： [${d.citations.map((index) => index + 1).join(", ")}]` : "无引用"}</text>
        </>
      ) : (
        <text x={X0} y={TOP + 5 * ROWH + 8} fill="#8a7656" font-size="11">
          {showSim ? "排序后还要过相关度阈值，低分候选不能伪装成证据" : "点「演法」:看候选如何被阈值筛成可引用证据"}
        </text>
      )}
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: `模型知识停在训练那一刻,你公司的私有文档它<b>一概不知道</b>,硬答还容易幻觉。RAG:回答前<b>先查资料</b>。当前问:「<b>${d.q}</b>」。` },
    { line: 2, stage: 1, say: "第一步<b>检索</b>:把问题和每条资料都<b>变成向量</b>(这里用最朴素的词袋,真实用神经网络嵌入)。" },
    { line: 3, stage: 2, say: `用<b>余弦相似度</b>比问题和每条资料。最高候选分数是 <b>${Math.max(...d.sims).toFixed(3)}</b>，但排序只说明“相对靠前”。` },
    { line: 4, stage: 3, say: "先按分数排序，得到的只是候选名单。低分第二名不能因为进了 top-k 就被当成可靠证据。" },
    { line: 5, stage: 4, say: d.hasEvidence ? `最低相关度设为 <b>${d.minScore.toFixed(2)}</b> 后，只有第 <b>${d.citations.map((index) => index + 1).join("、")}</b> 条通过并可引用。` : `最低相关度设为 <b>${d.minScore.toFixed(2)}</b> 后，没有资料通过。正确动作是<b>停止生成</b>，不是补一个低分引用。` },
    { line: 6, stage: 5, say: d.hasEvidence ? "第二步<b>增强生成</b>:只把通过阈值的证据交给模型，让答案可追溯。" : "资料不足时应<b>拒答、补资料或转人工</b>。RAG 能减少幻觉，但不能把无证据变成事实。" },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "模型两个短板之一:<b>知识冻结</b>(不知新事/私有文档)。RAG 补这个——回答前先检索资料库。拖朱字换问题。";
    case 1: return "<b>检索</b>:问题和每条资料都向量化。本例用词袋(数各字出没),真实 RAG 用神经网络<b>嵌入 + 向量数据库</b>,思想一样。";
    case 2: return "<b>余弦相似度</b>给出候选排序，但分数低的候选不应自动成为证据。";
    case 3: return "先排序再筛选。<b>top-k 不是质量保证</b>，它只是一份按相似度排列的候选表。";
    case 4: return d.hasEvidence ? `阈值 <b>${d.minScore.toFixed(2)}</b> 保留第 <b>${d.citations.map((index) => index + 1).join("、")}</b> 条资料，其余不引用。` : `没有资料达到 <b>${d.minScore.toFixed(2)}</b>，必须承认<b>证据不足</b>。`;
    case 5: return d.hasEvidence ? "<b>增强生成</b>只使用通过阈值的资料，答案才有可靠出处。" : "正确的 RAG 也会拒答：资料不足时不生成看似合理的结论。";
    default: return "拖朱字换问题,点「演法」看检索命中。";
  }
}

const pyCode = `import numpy as np
DOCS = ["...年会...", "...报销...", "WiFi 密码 welcome2024", ...]
def embed(text):                 # 最朴素的词袋向量(真实用神经嵌入)
    v = np.zeros(len(vocab))
    for c in tokenize(text): v[vocab_index[c]] = 1.0
    return v
def cosine(a, b): return a @ b / (norm(a)*norm(b) + 1e-12)
def retrieve(question, k=2, min_score=0.15):
    qv = embed(question)
    sims = [cosine(qv, dv) for dv in doc_vecs]
    ranked = np.argsort(sims)[::-1]
    return [i for i in ranked if sims[i] >= min_score][:k]
# 问 WiFi 密码 → 只引用第 3 条；低分候选不进入上下文`;

export const ragDemo = {
  title: "演武场 · 开卷而答",
  intro: "模型知识<b>冻结</b>在训练那刻,私有文档它不知道,硬答易幻觉。<b>RAG</b>:回答前先把问题和资料<b>向量化</b>、用<b>余弦相似度</b>检索最相关几条," +
    "筛掉低于<b>相关度阈值</b>的候选后才拼进提示词再生成——<b>答案有出处</b>。拖动 <b>问题朱字</b>和阈值，观察何时该拒答。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1150,
  runtimeLabel: "脚本化离线数据",
  terms: [
    { t: "模型的知识短板", d: "训练完成那刻起,新发生的事、你的私有文档,模型<b>一概不知</b>;凭记忆硬答还容易<b>幻觉</b>。RAG 专补这个短板。" },
    { t: "RAG 两步", d: "① <b>检索</b>:问题和资料都变向量,排序后再用阈值或重排筛出可靠证据;② <b>增强生成</b>:只把通过筛选的资料拼进提示词。就像<b>开卷考试</b>——先翻到相关那页再下笔。" },
    { t: "检索的核心", d: "<b>向量化 + 找最近邻 + 质量门槛</b>。本例用词袋向量 + 余弦相似度演示;真实 RAG 还会用神经嵌入、向量数据库和重排模型。" },
    { t: "为什么有用", d: "① 能用上模型<b>没学过</b>的新知识/私有文档;② 答案<b>有出处</b>,大幅减少幻觉。这就是「让 AI 读你的 PDF/知识库再问答」类产品的底层。" },
  ],
  localCmd: "cd llm-volume/ch14-applications/code && python3 minimal_rag.py",
};


export default { name: 'GewuRagDemo' }
</script>
