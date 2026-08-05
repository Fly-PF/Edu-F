<script lang="jsx">
// 卷十四 · 第二式 · 想做相生:Agent —— 给模型配工具,在「想-做-看」循环里分步解题
// 真实流程来自 ch14/minimal_agent.py:ReAct 循环,两个任务的步骤与工具返回均为实测
const TASKS = [
  {
    q: "(12 + 8) * 3 等于多少?",
    steps: [
      { kind: "act", thought: "该用工具 [calculator],参数「(12 + 8) * 3」", tool: "calculator", obs: "60" },
      { kind: "final", answer: "答案是 60" },
    ],
  },
  {
    q: "北京人口的 2 倍大概是多少万?",
    steps: [
      { kind: "act", thought: "该用工具 [lookup],参数「北京人口」", tool: "lookup", obs: "约 2184 万" },
      { kind: "act", thought: "该用工具 [calculator],参数「2184 * 2」", tool: "calculator", obs: "4368" },
      { kind: "final", answer: "北京人口约 2184 万,其 2 倍约为 4368 万" },
    ],
  },
];

const lines = [
  { text: "task = {{task}}               # 选个任务(拖朱字)", stage: 0 },
  { text: "for step in range(max):      # 想-做-看 循环(ReAct)", stage: 1 },
  { text: "  decision = brain(...)      # 想:下一步用哪个工具", stage: 2 },
  { text: "  result = TOOLS[tool](arg)  # 做:真的调工具", stage: 3 },
  { text: "  history.append(result)     # 看:结果回流,再想 → 最终答案", stage: 4 },
];

const paramDefs = { task: { min: 0, max: 1, step: 1, fmt: (v) => v + 1 } };
const initial = { task: 1 };

function compute(p) {
  const t = TASKS[p.task];
  const nTools = t.steps.filter((s) => s.kind === "act").length;
  return { task: p.task, q: t.q, steps: t.steps, nTools };
}

const X0 = 26, TOP = 70, STEPH = 50;
const TOOLC = { calculator: "#9c7b2e", lookup: "#3f6b4f" };
function Viz({ derived: d, stage }) {
  // stage 控制展开到第几步:stage>=2 才开始显示步骤,逐步展开
  const reveal = stage <= 1 ? 0 : stage >= 4 ? d.steps.length : stage - 1; // stage2→1步, stage3→2步...
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={20} fill="#8a7656" font-size="12">任务:{d.q}</text>
      <text x={X0} y={38} fill="#5a4a36" font-size="10.5">
        想(Thought)→ 做(Action 调工具)→ 看(Observation)→ 再想…
      </text>

      {d.steps.slice(0, reveal).map((s, i) => {
        const y = TOP + i * STEPH;
        if (s.kind === "final") {
          return (
            <g key={i}>
              <rect x={X0} y={y - 12} width={308} height={STEPH - 12} rx="5" fill="#9e2b1e" opacity="0.12" stroke="#9e2b1e" stroke-width="1" />
              <text x={X0 + 8} y={y + 4} fill="#9e2b1e" font-size="11.5">第{i + 1}步 · 最终答案:</text>
              <text x={X0 + 8} y={y + 21} fill="#2b2117" font-size="11">{s.answer}</text>
            </g>
          );
        }
        return (
          <g key={i}>
            <rect x={X0} y={y - 12} width={308} height={STEPH - 12} rx="5" fill="#efe6d2" stroke="#cdb98e" stroke-width="0.8" />
            <text x={X0 + 8} y={y + 3} fill="#5a4a36" font-size="10.5">
              第{i + 1}步 · 想:<tspan fill={TOOLC[s.tool]}>[{s.tool}]</tspan>
            </text>
            {/* 工具图标块 */}
            <rect x={X0 + 196} y={y - 9} width={104} height={32} rx="4" fill={TOOLC[s.tool]} opacity="0.15" stroke={TOOLC[s.tool]} stroke-width="0.8" />
            <text x={X0 + 248} y={y + 2} fill={TOOLC[s.tool]} font-size="9.5" text-anchor="middle">⚙ {s.tool}</text>
            <text x={X0 + 248} y={y + 16} fill="#2b2117" font-size="10.5" text-anchor="middle">→ {s.obs}</text>
            <text x={X0 + 8} y={y + 18} fill="#8a7656" font-size="9.5">看:返回「{s.obs}」</text>
          </g>
        );
      })}

      {stage >= 4 ? (
        <text x={X0} y={TOP + d.steps.length * STEPH + 4} fill="#9e2b1e" font-size="11.5">
          {d.nTools >= 2 ? "先「查」人口、再「算」乘法——多步多工具协作" : "调 1 个工具即得解"}
          ,这是单次问答做不到的
        </text>
      ) : stage < 2 ? (
        <text x={X0} y={TOP + 8} fill="#8a7656" font-size="11.5">点「演法」:看 Agent 一步步想、调工具、再决定</text>
      ) : null}
    </svg>
  );
}

function frames(d0, d) {
  return [
    { line: 1, stage: 0, say: `RAG 让模型会查资料,但有些任务要<b>动手</b>:算术、查库、调 API——模型自己干不了。<b>Agent</b>:给它配工具。当前任务:「<b>${d.q}</b>」。` },
    { line: 2, stage: 1, say: "这套循环叫 <b>ReAct</b>(Reason+Act,边想边做):<b>想 → 做(调工具)→ 看(工具返回)→ 再想…</b> 直到给出答案。" },
    { line: 3, stage: 2, say: `第一步<b>想</b>:大脑(真实里就是 GPT)看问题,决定该用哪个工具。这里它选了 <b>[${d.steps[0].tool}]</b>,参数自己填。` },
    { line: 4, stage: 3, say: `第二步<b>做</b>:真的调用工具,拿到返回 <b>「${d.steps[0].obs}」</b>。模型自己算不了/查不到的,工具替它办。` },
    { line: 5, stage: 4, say: d.nTools >= 2
        ? `第三步<b>看</b>:结果回流,大脑接着想——还需要再算一步,于是调 <b>calculator</b> 得 <b>${d.steps[1].obs}</b>,最后给出答案。<b>先查再算、多工具协作</b>,单次问答做不到。`
        : `结果回流,大脑判断够了,直接给出<b>最终答案</b>。这就是 ChatGPT 函数调用、各类 AI 助手的基本范式。` },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return "模型第二个短板:<b>只会生成文字</b>,不会算术/上网/调 API。Agent 给它配工具补这个短板。拖朱字换任务。";
    case 1: return "<b>ReAct</b> 循环:想(Thought)→ 做(Action 调工具)→ 看(Observation)→ 再想… 直到最终答案。骨架极简。";
    case 2: return "<b>想</b>:brain(question, history) 决定下一步——要么调某工具,要么给最终答案。真实里 brain 就是 <b>GPT</b>(本例用规则模拟以便复现)。";
    case 3: return `<b>做</b>:result = TOOLS[tool](arg),真的调用工具(计算器、知识库查询…)。本步返回「${d.steps[0].obs}」。`;
    case 4: return d.nTools >= 2
        ? "<b>看</b>:结果 append 进 history 回流,供下一轮决策。本任务 Agent <b>先 lookup 查人口、再 calculator 算乘法</b>——多步多工具,单次问答做不到。"
        : "<b>看</b>:结果回流,大脑判断信息够了就给最终答案。真实工具可是搜索、代码执行、数据库——这就是函数调用/AI 助手的底层。";
    default: return "拖朱字换任务,点「演法」看想-做-看循环。";
  }
}

const pyCode = `def run_agent(question, max_steps=5):
    history = []
    for step in range(max_steps):
        decision = brain(question, history)   # 想:真实里 brain 就是 GPT
        if decision[0] == "final":
            return decision[1]                 # 最终答案
        _, tool, arg = decision
        result = TOOLS[tool](arg)              # 做:真的调用工具
        history.append(("observation", result))  # 看:结果回流,再决策
# 「北京人口的 2 倍」→ 先 lookup(2184 万)→ 再 calculator(4368)`;

export const agentDemo = {
  title: "演武场 · 想做相生",
  intro: "模型只会生成文字,不会算术/上网/调 API。<b>Agent</b> 给它配工具,在 <b>ReAct</b>「想-做-看」循环里自己决定调哪个工具、看结果再决定下一步。" +
    "示例任务<b>先查人口、再算乘法</b>,多步多工具协作。拖动 <b>任务朱字</b>,点「演法」看循环一步步推进。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1250,
  terms: [
    { t: "模型的动手短板", d: "模型<b>只会生成文字</b>:不会精确算术、连不上网、调不了数据库。Agent 给它配<b>工具</b>,这些事交给工具办,补上动手短板。" },
    { t: "ReAct 循环", d: "<b>想(Thought)→ 做(Action 调工具)→ 看(Observation 工具返回)→ 再想…</b> 直到最终答案。大脑决定下一步,工具执行,结果回流再决策。" },
    { t: "大脑就是 GPT", d: "「下一步干啥」真实里由 <b>GPT</b> 生成(本例用规则模拟以便稳定复现)。工具可以是计算器、搜索、代码执行、数据库查询……" },
    { t: "多步多工具协作", d: "「北京人口的 2 倍」要 Agent <b>先 lookup 查到人口、再 calculator 算乘法</b>——多步、多工具,这是单次问答<b>做不到</b>的。这正是函数调用、AI 助手帮你订票查天气的基本范式。" },
  ],
  localCmd: "cd llm-volume/ch14-applications/code && python3 minimal_agent.py",
};


export default { name: 'GewuAgentDemo' }
</script>
