<script lang="jsx">
// 卷四 · 第三式 · 真身现形:真实 GPT(tiktoken)怎么切你的每句话
// tiktoken 无法在浏览器运行,这里的切分结果均来自本机 cl100k_base 实跑(见 code/tiktoken_demo.py)

// 每个样本:文字、token 数、各 token 的「片段」。pieces 用 | 分隔,空格以 ␣ 标出。
const SAMPLES = [
  { text: "tokenization", n: 2, pieces: ["token", "ization"], tag: "英文:词根整块,词缀拆开" },
  { text: "ChatGPT is amazing!", n: 6, pieces: ["Chat", "G", "PT", "␣is", "␣amazing", "!"], tag: "英文:含前导空格" },
  { text: "Natural language processing", n: 3, pieces: ["Natural", "␣language", "␣processing"], tag: "英文:一句话才 3 个 token" },
  { text: "自然语言处理", n: 5, pieces: ["自", "然", "语", "言", "处理"], tag: "中文:多为一字一 token" },
];

const lines = [
  { text: "import tiktoken", stage: 0 },
  { text: "enc = tiktoken.get_encoding('cl100k_base')  # GPT-3.5/4 同款", stage: 0 },
  { text: "", stage: 0 },
  { text: "text = '{{s}}'", stage: 1 },
  { text: "ids = enc.encode(text)        # 切成 token 编号", stage: 2 },
  { text: "len(ids)  # 这段话占几个 token(= 计费/上下文单位)", stage: 3 },
];

const paramDefs = {
  s: { min: 0, max: SAMPLES.length - 1, step: 1, fmt: (v) => SAMPLES[v].text },
};
const initial = { s: 3 };  // 默认中文,最能说明问题

const EN = SAMPLES[2], ZH = SAMPLES[3];   // 同义中英对比

function compute(p) {
  const s = SAMPLES[p.s];
  const isZh = /[一-鿿]/.test(s.text);
  return { s, isZh };
}

const tokFill = (pc, isZh) =>
  pc.startsWith("␣") ? "#7c8a5a" : isZh ? "#9e2b1e" : "#c0632e";

function Viz({ derived: d, stage }) {
  const s = d.s;
  const X0 = 16, RIGHT = 344, TOP = 86, BH = 36;
  const widths = s.pieces.map((pc) => Math.max(26, pc.length * 13 + 12));
  let x = X0, y = TOP;
  const placed = s.pieces.map((pc, i) => {
    const w = widths[i];
    if (x + w > RIGHT) { x = X0; y += BH + 12; }
    const pos = { pc, x, y, w };
    x += w + 6;
    return pos;
  });
  const showCost = stage >= 3;

  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={24} fill="#8a7656" font-size="12.5">cl100k_base 词表 = <tspan fill="#9e2b1e" font-size="15">100277</tspan>(GPT-3.5/4)</text>
      <text x={X0} y={48} fill="#5a4a36" font-size="13">
        「<tspan fill="#9e2b1e" font-size="15">{s.text}</tspan>」→ <tspan fill="#9e2b1e" font-size="15">{s.n}</tspan> 个 token
      </text>
      <text x={X0} y={68} fill="#8a7656" font-size="11">{s.tag}</text>

      {placed.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={b.y} width={b.w} height={BH} rx="4"
            fill="#f3ead6" stroke="#b89a5e" stroke-width="1" />
          <text x={b.x + b.w / 2} y={b.y + BH / 2 + 5} fill={tokFill(b.pc, d.isZh)}
            font-size="14" text-anchor="middle">{b.pc}</text>
        </g>
      ))}

      {showCost && (
        <g>
          <line x1={X0} y1={206} x2={RIGHT} y2={206} stroke="#cdb98e" stroke-width="0.8" />
          <text x={X0} y={228} fill="#5a4a36" font-size="12.5">同一句话,中文比英文更「费」token:</text>
          <text x={X0} y={250} fill="#c0632e" font-size="13">
            英文「{EN.text}」→ <tspan font-size="15">{EN.n}</tspan> 个
          </text>
          <text x={X0} y={272} fill="#9e2b1e" font-size="13">
            中文「{ZH.text}」→ <tspan font-size="15">{ZH.n}</tspan> 个(更费)
          </text>
          <text x={X0} y={292} fill="#8a7656" font-size="10.5">→ 中文调 API 往往更贵、更占上下文窗口(都按 token 计)</text>
        </g>
      )}
      {!showCost && (
        <text x={X0} y={290} fill="#8a7656" font-size="11">绿块=带前导空格的 token · GPT 把空格也编进 token</text>
      )}
    </svg>
  );
}

function frames(p, d) {
  const s = d.s;
  return [
    { line: 2, stage: 0, say: "真实 GPT 用的分词器就是 <b>tiktoken</b>。cl100k_base 是 GPT-3.5/4 同款,词表 <b>100277</b>。" },
    { line: 4, stage: 1, say: `要切的文字:「<b>${s.text}</b>」。` },
    { line: 5, stage: 2, say: `encode 后切成 <b>${s.n}</b> 个 token:<b>${s.pieces.join(" | ")}</b>。${s.tag}。` },
    { line: 6, stage: 3, say: `这段话占 <b>${s.n}</b> 个 token。同义的中文「${ZH.text}」(${ZH.n})比英文「${EN.text}」(${EN.n})更费——<b>中文调 API 更贵、更占上下文</b>。` },
  ];
}

function note(stage, p, d) {
  const s = d.s;
  switch (stage) {
    case 0: return "tiktoken 是 OpenAI 开源的真身分词器。它就是<b>跑了几万次合并的 BPE</b> + 字节级兜底。";
    case 1: return `当前样本「<b>${s.text}</b>」。拖动朱字换样本,看 GPT 怎么切它。`;
    case 2: return `切成 <b>${s.n}</b> 个 token:<b>${s.pieces.join(" | ")}</b>。常见英文词整块、词缀单独成块,正是 BPE 的效果。`;
    case 3: return `token 数 = <b>计费和上下文的单位</b>。中文「${ZH.text}」${ZH.n} 个 vs 英文「${EN.text}」${EN.n} 个——中文更费 token。`;
    default: return "拖动朱字换样本,点「演法」看真实 GPT 的切分。";
  }
}

const pyCode = `import tiktoken                       # pip install tiktoken
enc = tiktoken.get_encoding("cl100k_base")   # GPT-3.5/4 同款

for text in ["tokenization", "自然语言处理", "Natural language processing"]:
    ids = enc.encode(text)
    pieces = [enc.decode([i]) for i in ids]
    print(f"{text!r:32} -> {len(ids)} 个 token: {pieces}")

# 中文 vs 英文:同义不同价
print("英文 3 个 token, 中文 5 个 token —— 中文更费、更占上下文")

# 字节级兜底:任何字符都能编码,绝不 OOV
print("🦙 ->", enc.encode("🦙"), "(由 3 个字节 token 拼出)")`;

export const tiktokenDemo = {
  title: "演武场 · 真身现形",
  intro: "前两式我们手搓了 BPE。这一式看<b>真正的 GPT</b> 在用什么——OpenAI 开源的 <b>tiktoken</b>。" +
    "它就是跑了几万次合并的 BPE,词表约 10 万。拖动<b>样本</b>看它怎么切英文、中文," +
    "并理解<b>为什么中文更「费」token</b>。(切分结果来自本机实跑)",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode, playMs: 1100,
  terms: [
    { t: "tiktoken", d: "OpenAI 开源的官方分词器。<code>cl100k_base</code> 是 GPT-3.5/4 同款(词表 100277),GPT-2 用的是 <code>gpt2</code>(词表 50257)。本质就是在海量文本上训练好的 BPE。" },
    { t: "为什么中文更费 token", d: "BPE 在英文海量语料上训练,英文常见词被合成整块(一个 token 装一截单词);中文语料占比小,多数汉字只能<b>一字一 token</b>。所以同义句子,中文 token 更多。" },
    { t: "token = 计费单位", d: "调用大模型 API <b>按 token 计费</b>,上下文窗口也按 token 算。中文更费 token,意味着同样的话<b>更贵、更快占满上下文</b>。" },
    { t: "字节级 BPE", d: "真实 GPT 在<b>字节</b>(而非字符)上做合并。好处:任何字符——生僻字、emoji——都能拆到字节兜底再拼回,<b>永不 OOV</b>。代价:一个 emoji 可能占好几个 token。" },
    { t: "前导空格", d: "GPT 把词前的空格也编进 token,<code>hello</code> 和 <code>␣hello</code> 是<b>两个不同 token</b>。这样模型才能准确还原词与词之间的空格。" },
  ],
  localCmd: "cd llm-volume/ch04-tokenization/code && pip install tiktoken && python3 tiktoken_demo.py",
};


export default { name: 'GewuTiktokenVizDemo' }
</script>
