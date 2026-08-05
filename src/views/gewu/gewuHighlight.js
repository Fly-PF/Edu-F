const KEYWORDS = new Set([
  'import', 'from', 'as', 'def', 'return', 'for', 'in', 'range',
  'if', 'else', 'elif', 'while', 'and', 'or', 'not', 'True', 'False', 'None',
  'print', 'lambda',
])
const BUILTINS = new Set(['np', 'torch', 'softmax', 'dot', 'exp', 'max', 'sum', 'array', 'norm'])

export function highlightLine(line) {
  const tokens = []
  const commentIndex = findComment(line)
  const codePart = commentIndex >= 0 ? line.slice(0, commentIndex) : line
  const commentPart = commentIndex >= 0 ? line.slice(commentIndex) : ''
  const expression = /(\s+|"[^"]*"|'[^']*'|\b\d+\.?\d*\b|\b\w+\b|[^\w\s])/g
  let match

  while ((match = expression.exec(codePart)) !== null) {
    const text = match[0]
    if (/^\s+$/.test(text)) tokens.push({ t: text, c: '' })
    else if (/^["']/.test(text)) tokens.push({ t: text, c: 'tok-str' })
    else if (/^\d/.test(text)) tokens.push({ t: text, c: 'tok-num' })
    else if (KEYWORDS.has(text)) tokens.push({ t: text, c: 'tok-kw' })
    else if (BUILTINS.has(text)) tokens.push({ t: text, c: 'tok-fn' })
    else if (/^[^\w\s]$/.test(text)) tokens.push({ t: text, c: 'tok-op' })
    else tokens.push({ t: text, c: '' })
  }

  if (commentPart) tokens.push({ t: commentPart, c: 'tok-com' })
  return tokens
}

function findComment(line) {
  let quote = null
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (quote) {
      if (character === quote) quote = null
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '#') {
      return index
    }
  }
  return -1
}
