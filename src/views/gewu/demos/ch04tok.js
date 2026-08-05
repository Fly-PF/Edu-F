// ch04 共享:分词器的两个核心算法 —— 与 ch04-tokenization/code 完全一致
// 1) 字符级:一个字符一个 token  2) BPE:反复合并最高频的相邻对

// ---------- 字符级 ----------
// 给一段文字建「字符 ↔ 编号」对照表,并 encode 成 id 序列
export function charTokenize(text) {
  const chars = [...new Set([...text])].sort();
  const stoi = {};
  chars.forEach((c, i) => (stoi[c] = i));
  const ids = [...text].map((c) => stoi[c]);
  return { chars, stoi, ids, vocabSize: chars.length };
}

// ---------- BPE ----------
// 统计每一对相邻 token 的次数
function getStats(ids) {
  const m = new Map();
  for (let i = 0; i < ids.length - 1; i++) {
    const k = ids[i] + "," + ids[i + 1];
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

// 把 ids 里所有的 pair=(a,b) 替换成单个 newId
function applyMerge(ids, a, b, newId) {
  const out = [];
  let i = 0;
  while (i < ids.length) {
    if (i < ids.length - 1 && ids[i] === a && ids[i + 1] === b) {
      out.push(newId);
      i += 2;
    } else {
      out.push(ids[i]);
      i += 1;
    }
  }
  return out;
}

// 完整跑一遍 BPE 训练,记录每一步(供逐帧演示)。
// 只在「最高频对出现 ≥2 次」时才合并;否则停手(没有可压缩的重复)。
// 返回 { initIds, initTokens, vocab, snapshots }
//   snapshots[k] = 做完 k 次合并后的完整状态(k=0 即初始)
export function runBPE(text, maxMerges = 5) {
  const chars = [...new Set([...text])].sort();
  const vocab = chars.slice();              // id -> 字符串
  const stoi = {};
  chars.forEach((c, i) => (stoi[c] = i));
  let ids = [...text].map((c) => stoi[c]);

  const snapshots = [{
    ids: ids.slice(),
    tokens: ids.map((i) => vocab[i]),
    vocabSize: vocab.length,
    merged: null,            // 本步合并出的字符串
    mergedId: null,
    freq: null,
    pair: null,              // 合并前在序列中的 [a,b] 字符串
  }];

  for (let step = 0; step < maxMerges; step++) {
    const stats = getStats(ids);
    if (stats.size === 0) break;
    // 选最高频的一对(频次相同就按 id 顺序,保证可复现)
    let best = null, bestFreq = 0, bestKey = null;
    for (const [k, f] of stats) {
      const [a, b] = k.split(",").map(Number);
      if (f > bestFreq || (f === bestFreq && best && (a < best[0] || (a === best[0] && b < best[1])))) {
        best = [a, b]; bestFreq = f; bestKey = k;
      }
    }
    if (bestFreq < 2) break;   // 没有重复出现的对,停手
    const [a, b] = best;
    const newId = vocab.length;
    const mergedStr = vocab[a] + vocab[b];
    vocab.push(mergedStr);
    const pairStr = [vocab[a], vocab[b]];
    ids = applyMerge(ids, a, b, newId);
    snapshots.push({
      ids: ids.slice(),
      tokens: ids.map((i) => vocab[i]),
      vocabSize: vocab.length,
      merged: mergedStr,
      mergedId: newId,
      freq: bestFreq,
      pair: pairStr,
    });
  }

  return {
    initLen: snapshots[0].ids.length,
    snapshots,
    vocab,
  };
}
