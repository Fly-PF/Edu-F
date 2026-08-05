<script lang="jsx">
// 卷四 · 第一式 · 拆文为号:一个字符一个 token,文字↔编号互为逆操作
import { charTokenize } from "./ch04tok.js";

// 几句可切换的语料(中英混合 / 纯中 / 纯英),看词表大小随之变化
const SENTS = ["床前明月光 the moon", "明月几时有", "hello world"];

const lines = [
  { text: "text = '{{s}}'                # 待切的文字(拖朱字换句)", stage: 0 },
  { text: "chars = sorted(set(text))     # 收集所有不同字符", stage: 1 },
  { text: "stoi = {c: i for i, c in enumerate(chars)}  # 字符 -> 编号", stage: 2 },
  { text: "ids = [stoi[c] for c in text] # 编码:文字 -> 数字", stage: 3 },
  { text: "decode(ids) == text           # 解码必与原文一字不差", stage: 4 },
];

const paramDefs = {
  s: { min: 0, max: SENTS.length - 1, step: 1, fmt: (v) => SENTS[v] },
};
const initial = { s: 0 };

function compute(p) {
  const text = SENTS[p.s];
  const { chars, ids, vocabSize } = charTokenize(text);
  const blocks = [...text].map((c, i) => ({ ch: c, id: ids[i] }));
  return { text, chars, ids, vocabSize, blocks };
}

const SHOW = (c) => (c === " " ? "␣" : c);

function Viz({ derived: d, stage }) {
  const n = d.blocks.length;
  const X0 = 18, RIGHT = 342;
  const BW = Math.min(34, (RIGHT - X0) / n - 4);
  const gap = (RIGHT - X0 - BW * n) / Math.max(1, n);
  const TOP = 70, BH = 40;
  const showId = stage >= 3;
  return (
    <svg viewBox="0 0 360 300" width="360" height="300">
      <text x={X0} y={26} fill="#8a7656" font-size="13">
        词表大小 = <tspan fill="#9e2b1e" font-size="16">{d.vocabSize}</tspan> 个不同字符
        · 切成 <tspan fill="#9e2b1e" font-size="16">{n}</tspan> 个 token
      </text>
      <text x={X0} y={52} fill="#5a4a36" font-size="12">
        {showId ? "每个字 → 一个编号(下方),这串数字才是喂给模型的" : "先把文字摊成一个个字符 →"}
      </text>

      {d.blocks.map((b, i) => {
        const x = X0 + i * (BW + gap);
        return (
          <g key={i}>
            <rect x={x} y={TOP} width={BW} height={BH} rx="4"
              fill={b.ch === " " ? "#e7dcc4" : "#f3ead6"} stroke="#b89a5e" stroke-width="1" />
            <text x={x + BW / 2} y={TOP + BH / 2 + 6} fill="#2b2117"
              font-size={BW > 24 ? "18" : "13"} text-anchor="middle">{SHOW(b.ch)}</text>
            {showId && (
              <text x={x + BW / 2} y={TOP + BH + 18} fill="#9e2b1e" font-size="13"
                text-anchor="middle" style={{ transition: "all .3s ease" }}>{b.id}</text>
            )}
          </g>
        );
      })}

      {/* 互逆示意 */}
      {stage >= 4 && (
        <g>
          <text x={X0} y={200} fill="#3f6b4f" font-size="13">encode</text>
          <text x={X0 + 56} y={200} fill="#5a4a36" font-size="13">文字 ──→ 数字</text>
          <text x={X0} y={222} fill="#3f6b4f" font-size="13">decode</text>
          <text x={X0 + 56} y={222} fill="#5a4a36" font-size="13">数字 ──→ 文字(还原如初)</text>
          <text x={X0} y={250} fill="#9e2b1e" font-size="13">✓ decode(encode(text)) == text</text>
        </g>
      )}
      <text x={X0} y={288} fill="#8a7656" font-size="11">
        ␣ = 空格(也是一个字符,占一个 token)
      </text>
    </svg>
  );
}

function frames(p, d) {
  const idStr = "[" + d.ids.join(", ") + "]";
  return [
    { line: 1, stage: 0, say: `要切的文字:<b>${d.text}</b>。神经网络只认数字,得先把它变成编号。` },
    { line: 2, stage: 1, say: `收集所有<b>不同字符</b>并排序,得到词表——这句话用到 <b>${d.vocabSize}</b> 个不同字符。` },
    { line: 3, stage: 2, say: "给每个字符编个号,这就是「字符 → 编号」对照表 <b>stoi</b>。" },
    { line: 4, stage: 3, say: `按表把每个字换成号:<b>${idStr}</b>。这串数字就是喂给模型的东西。` },
    { line: 5, stage: 4, say: "反过来按表把号换回字,就能<b>一字不差</b>地还原。encode / decode 互为逆操作。" },
  ];
}

function note(stage, p, d) {
  switch (stage) {
    case 0: return `待切文字「<b>${d.text}</b>」。拖动上一个朱字换句,看不同句子的词表大小。`;
    case 1: return `去重 + 排序 = 词表。这句用到 <b>${d.vocabSize}</b> 个不同字符。中文字符多,词表通常更大。`;
    case 2: return "对照表 <b>stoi</b>:每个字符一个固定编号。这是分词器的全部「知识」。";
    case 3: return `编码结果:<b>[${d.ids.join(", ")}]</b>。<b>${d.blocks.length}</b> 个字符 → <b>${d.blocks.length}</b> 个 token(字符级一一对应)。`;
    case 4: return "decode 按对照表反查,把数字还原回文字,与原文一字不差——这是分词器的硬要求。";
    default: return "拖动朱字换句子,点「演法」看文字如何一步步变成数字。";
  }
}

const pyCode = `text = "床前明月光 the moon"

# 1. 建词表:收集所有出现过的字符,排序后编号
chars = sorted(set(text))
stoi = {c: i for i, c in enumerate(chars)}   # 字符 -> 编号
itos = {i: c for c, i in stoi.items()}       # 编号 -> 字符

def encode(s):  return [stoi[c] for c in s]
def decode(ids): return "".join(itos[i] for i in ids)

ids = encode(text)
print("词表大小 =", len(chars))
print("编码后:", ids)
print("解码回:", repr(decode(ids)))
assert decode(encode(text)) == text
print("✓ decode(encode(x)) == x")`;

export const charTokDemo = {
  title: "演武场 · 拆文为号",
  intro: "分词第一步:<b>文字怎么变成数字</b>。最朴素的切法——<b>一个字符一个 token</b>:" +
    "收集所有字符编上号,再按表把每个字换成编号。<b>encode/decode 互为逆操作</b>。" +
    "拖动<b>句子</b>看词表与编码即时变化。",
  lines, paramDefs, initial, compute, frames, Viz, note, pyCode,
  terms: [
    { t: "token(词元)", d: "文字被切成的「一个个小块」。切法不同,token 可以是一个字符、一个词、或一截子词。模型真正处理的是 token 的<b>编号</b>。" },
    { t: "tokenization(分词)", d: "把一段文字切成 token、再给每个 token 编号的过程。它是大模型的<b>第一关</b>:你说的每句话进门第一件事就是被切成 token。" },
    { t: "词表 (vocabulary)", d: "所有可能 token 的清单,每个配一个固定编号。字符级的词表 = 所有出现过的不同字符。" },
    { t: "encode / decode", d: "<b>encode</b>:文字→编号;<b>decode</b>:编号→文字。二者必须<b>互逆</b>——解码能一字不差还原原文,否则信息就丢了。" },
    { t: "字符级的代价", d: "词表小、绝不会遇到不认识的字;但<b>序列长</b>(一个字一个 token),模型要处理的步数多。下一式的 BPE 就是来解决这点的。" },
  ],
  localCmd: "cd llm-volume/ch04-tokenization/code && python3 char_tokenizer.py",
};


export default { name: 'GewuCharTokDemo' }
</script>
