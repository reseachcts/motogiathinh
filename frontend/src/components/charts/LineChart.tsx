import { useState } from 'react'

export interface Series {
  id: string
  label: string
  color: string
  data: number[]
  bold?: boolean
  dashed?: boolean
  fill?: boolean
}

interface Props {
  xLabels: string[]
  series: Series[]
  hidden?: Set<string>
  yFmt?: (v: number) => string
  tipFmt?: (v: number, s: Series) => string
  allowFill?: boolean
  width?: number
  height?: number
  padL?: number
  padR?: number
  padT?: number
  padB?: number
}

export default function LineChart({
  width = 720,
  height = 240,
  padL = 56,
  padR = 16,
  padT = 24,
  padB = 32,
  xLabels,
  series,
  hidden = new Set(),
  yFmt = (v) => v.toLocaleString(),
  tipFmt = (v) => String(v),
  allowFill = true,
}: Props) {
  const visible = series.filter((s) => !hidden.has(s.id))
  const allValues = visible.flatMap((s) => s.data)
  const max = Math.max(1, ...allValues)
  const xStep = xLabels.length > 1 ? (width - padL - padR) / (xLabels.length - 1) : 0
  const yAt = (v: number) => height - padB - (v / max) * (height - padT - padB)
  const xAt = (i: number) => padL + i * xStep

  const [hover, setHover] = useState<{ i: number } | null>(null)

  return (
    <div style={{ position: 'relative' }}>
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y grid lines */}
        {([0.25, 0.5, 0.75] as const).map((p, i) => (
          <line
            key={i}
            x1={padL}
            x2={width - padR}
            y1={padT + (height - padT - padB) * p}
            y2={padT + (height - padT - padB) * p}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="2 4"
          />
        ))}

        {/* Y axis labels */}
        {([0, 0.5, 1] as const).map((p, i) => (
          <text
            key={i}
            x={padL - 8}
            y={yAt(max * (1 - p)) + 3}
            fontFamily="var(--font-mono)"
            fontSize="9"
            fill="var(--fg-3)"
            textAnchor="end"
          >
            {yFmt(max * (1 - p))}
          </text>
        ))}

        {/* X axis labels */}
        {xLabels.map((lbl, i) => {
          const skip =
            xLabels.length > 30
              ? 6
              : xLabels.length > 18
                ? 4
                : xLabels.length > 12
                  ? 3
                  : xLabels.length > 8
                    ? 2
                    : 1
          if (i % skip !== 0 && i !== xLabels.length - 1) return null
          return (
            <text
              key={i}
              x={xAt(i)}
              y={height - 12}
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--fg-3)"
              textAnchor="middle"
            >
              {lbl}
            </text>
          )
        })}

        {/* Lines + fills */}
        {visible.map((s, idx) => {
          const path = s.data
            .map((v, i) => `${i ? 'L' : 'M'}${xAt(i)},${yAt(v)}`)
            .join(' ')
          const isFilled = allowFill && s.fill
          const area = isFilled
            ? path +
              ` L${xAt(s.data.length - 1)},${height - padB} L${padL},${height - padB} Z`
            : null
          const gradId = `lc-${idx}-${s.color.replace(/[^a-z0-9]/gi, '')}`
          return (
            <g key={s.id}>
              {area && (
                <>
                  <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor={s.color} stopOpacity="0.25" />
                      <stop offset="1" stopColor={s.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={area} fill={`url(#${gradId})`} />
                </>
              )}
              <path
                d={path}
                fill="none"
                stroke={s.color}
                strokeWidth={s.bold ? 2.4 : 1.6}
                strokeDasharray={s.dashed ? '3 3' : '0'}
                style={{
                  filter: allowFill
                    ? `drop-shadow(0 0 5px color-mix(in oklab, ${s.color} 55%, transparent))`
                    : 'none',
                }}
              />
              {s.data.length > 0 && (
                <circle
                  cx={xAt(s.data.length - 1)}
                  cy={yAt(s.data[s.data.length - 1])}
                  r="3.5"
                  fill="var(--ink-1)"
                  stroke={s.color}
                  strokeWidth="1.5"
                  style={{
                    filter: allowFill ? `drop-shadow(0 0 6px ${s.color})` : 'none',
                  }}
                />
              )}
            </g>
          )
        })}

        {/* Hover guide */}
        {hover != null && (
          <line
            x1={xAt(hover.i)}
            x2={xAt(hover.i)}
            y1={padT}
            y2={height - padB}
            stroke="rgba(255,255,255,0.16)"
            strokeDasharray="3 3"
          />
        )}
        {hover != null &&
          visible.map((s, idx) => (
            <circle
              key={`hp-${idx}`}
              cx={xAt(hover.i)}
              cy={yAt(s.data[hover.i])}
              r="4"
              fill="var(--ink-1)"
              stroke={s.color}
              strokeWidth="2"
              style={{ filter: `drop-shadow(0 0 6px ${s.color})` }}
            />
          ))}

        {/* Invisible hit targets */}
        {xLabels.map((_, i) => (
          <rect
            key={`hit-${i}`}
            x={xAt(i) - xStep / 2}
            y={padT}
            width={xStep || 1}
            height={height - padT - padB}
            fill="transparent"
            onMouseEnter={() => setHover({ i })}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'crosshair' }}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hover != null && (
        <div
          style={{
            position: 'absolute',
            left: `${(xAt(hover.i) / width) * 100}%`,
            top: 0,
            transform: `translateX(${hover.i > xLabels.length / 2 ? '-110%' : '10%'})`,
            background: 'var(--ink-2)',
            border: '1px solid var(--glass-stroke-strong)',
            borderRadius: 10,
            padding: '10px 12px',
            minWidth: 180,
            boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--fg-3)',
              marginBottom: 8,
            }}
          >
            {xLabels[hover.i]}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {visible.map((s, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: 'var(--font-ui)',
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 2,
                    background: s.color,
                    boxShadow: `0 0 6px ${s.color}`,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, color: 'var(--fg-3)' }}>{s.label}</span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    color: 'var(--fg-1)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {tipFmt(s.data[hover.i], s)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
