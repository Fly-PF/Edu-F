<script lang="jsx">
export default {
  name: 'GewuTracePanels',
}

export function MatrixHeatmap({
  x = 0,
  y = 0,
  rows,
  cols,
  values,
  cell = 34,
  gap = 3,
  title,
  formatter = (value) => Number.isFinite(value) ? value.toFixed(2) : '-∞',
  fillFor,
  textFor,
  highlightRow = null,
  highlightCol = null,
  showValues = true,
  showLegend = false,
  legendLabel = '颜色深浅表示数值大小',
}) {
  const labelW = 34
  const labelH = 18
  const width = cols.length * (cell + gap) - gap
  const height = rows.length * (cell + gap) - gap

  const defaultFill = (value) => {
    if (value === -Infinity) return '#eee3cf'
    const clamped = Math.max(0, Math.min(1, Math.abs(value)))
    return `rgba(158,43,30,${0.12 + clamped * 0.62})`
  }

  return (
    <g transform={`translate(${x}, ${y})`}>
      {title && <text x={labelW} y={0} fill="#5a4a36" font-size="11">{title}</text>}
      {cols.map((column, columnIndex) => (
        <text
          key={`column-${columnIndex}`}
          x={labelW + columnIndex * (cell + gap) + cell / 2}
          y={labelH}
          fill={highlightCol === columnIndex ? '#9e2b1e' : '#5a4a36'}
          font-size="10.5"
          text-anchor="middle"
        >
          {column}
        </text>
      ))}
      {rows.map((row, rowIndex) => (
        <g key={`row-${rowIndex}`}>
          <text
            x={labelW - 8}
            y={labelH + 5 + rowIndex * (cell + gap) + cell / 2}
            fill={highlightRow === rowIndex ? '#9e2b1e' : '#5a4a36'}
            font-size="10.5"
            text-anchor="end"
          >
            {row}
          </text>
          {cols.map((_, columnIndex) => {
            const value = values[rowIndex][columnIndex]
            const highlighted = highlightRow === rowIndex || highlightCol === columnIndex
            const cellX = labelW + columnIndex * (cell + gap)
            const cellY = labelH + 6 + rowIndex * (cell + gap)
            const text = textFor ? textFor(value, rowIndex, columnIndex) : formatter(value, rowIndex, columnIndex)

            return (
              <g key={columnIndex}>
                <rect
                  x={cellX}
                  y={cellY}
                  width={cell}
                  height={cell}
                  rx="3"
                  fill={fillFor ? fillFor(value, rowIndex, columnIndex) : defaultFill(value)}
                  stroke={highlighted ? '#9e2b1e' : '#cdb98e'}
                  stroke-width={highlighted ? 1.5 : 0.7}
                  style={{ transition: 'fill .25s ease, stroke .2s ease' }}
                />
                {showValues && (
                  <text
                    x={cellX + cell / 2}
                    y={cellY + cell / 2 + 4}
                    fill={value > 0.55 ? '#fff' : '#2b2117'}
                    font-size="9.5"
                    text-anchor="middle"
                  >
                    {text}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      ))}
      <rect
        x={labelW - 1}
        y={labelH + 5}
        width={width + 2}
        height={height + 2}
        fill="none"
        stroke="#cdb98e"
        stroke-width="0.5"
        opacity="0.35"
      />
      {showLegend && (
        <g transform={`translate(${labelW}, ${labelH + 9 + height + 12})`}>
          <text x="0" y="0" fill="#5a4a36" font-size="8.5">{legendLabel}</text>
          {[0, 0.25, 0.5, 0.75, 1].map((level, index) => (
            <rect
              key={`legend-${index}`}
              x={index * 18}
              y="6"
              width="14"
              height="7"
              rx="2"
              fill={fillFor ? fillFor(level, -1, -1) : defaultFill(level)}
              stroke="#cdb98e"
              stroke-width="0.4"
            />
          ))}
          <text x="92" y="12" fill="#8a7656" font-size="8">低 → 高</text>
        </g>
      )}
    </g>
  )
}
</script>
