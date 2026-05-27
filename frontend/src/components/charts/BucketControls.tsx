export type Grain = 'hour' | 'day' | 'month'

interface Props {
  grain: Grain
  setGrain: (g: Grain) => void
  count: number
  setCount: (c: number) => void
  grainOptions?: Grain[]
  countOptions: number[]
}

const GRAIN_LABEL: Record<Grain, string> = {
  hour: 'Giờ',
  day: 'Ngày',
  month: 'Tháng',
}

function PillTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        border: `1px solid ${active ? 'var(--neon-cyan)' : 'var(--glass-stroke)'}`,
        background: active ? 'var(--ink-3)' : 'transparent',
        color: active ? 'var(--neon-cyan)' : 'var(--fg-3)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'all 140ms var(--ease-out)',
        boxShadow: active ? '0 0 10px var(--neon-cyan-haze)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

export default function BucketControls({
  grain,
  setGrain,
  count,
  setCount,
  grainOptions = ['hour', 'day', 'month'],
  countOptions,
}: Props) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
            marginRight: 4,
          }}
        >
          Bước
        </span>
        {grainOptions.map((g) => (
          <PillTab key={g} active={grain === g} onClick={() => setGrain(g)}>
            {GRAIN_LABEL[g]}
          </PillTab>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--fg-3)',
            marginRight: 4,
          }}
        >
          Số mốc
        </span>
        {countOptions.map((n) => (
          <PillTab key={n} active={count === n} onClick={() => setCount(n)}>
            {n}
          </PillTab>
        ))}
      </div>
    </div>
  )
}
