export interface LegendItem {
  id: string
  label: string
  color: string
  dashed?: boolean
}

interface Props {
  items: LegendItem[]
  hidden: Set<string>
  onToggle: (id: string) => void
}

export default function ToggleLegend({ items, hidden, onToggle }: Props) {
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {items.map((it) => {
        const isHidden = hidden.has(it.id)
        return (
          <button
            key={it.id}
            onClick={() => onToggle(it.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '5px 11px',
              borderRadius: 999,
              cursor: 'pointer',
              background: isHidden ? 'transparent' : 'var(--glass-2)',
              border: `1px solid ${isHidden ? 'var(--glass-stroke)' : 'var(--glass-stroke-strong)'}`,
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: isHidden ? 'var(--fg-4)' : 'var(--fg-1)',
              opacity: isHidden ? 0.55 : 1,
              transition: 'all 140ms var(--ease-out)',
            }}
          >
            <span
              style={{
                width: 10,
                height: it.dashed ? 0 : 2,
                borderTop: it.dashed ? `2px dashed ${it.color}` : 'none',
                background: it.dashed ? 'transparent' : it.color,
                boxShadow: isHidden || it.dashed ? 'none' : `0 0 6px ${it.color}`,
                flexShrink: 0,
              }}
            />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
