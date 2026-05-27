import React from 'react'

interface KpiCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  accent: string
  trend?: number
}

const KpiCard: React.FC<KpiCardProps> = ({ title, value, subtitle, icon, accent, trend }) => (
  <div
    className="glass-card"
    style={{
      padding: '24px 28px',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      cursor: 'default',
      backdropFilter: 'blur(24px) saturate(140%)',
      WebkitBackdropFilter: 'blur(24px) saturate(140%)',
      transition: 'background 220ms cubic-bezier(0.22,1,0.36,1), border-color 220ms, box-shadow 220ms',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLElement
      el.style.boxShadow = `0 0 0 1px ${accent}88, 0 0 32px ${accent}44, 0 1px 0 rgba(255,255,255,0.06) inset`
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLElement
      el.style.boxShadow = ''
    }}
  >
    {/* Neon haze blob */}
    <div style={{
      position: 'absolute', bottom: -40, right: -40,
      width: 120, height: 120, borderRadius: '50%',
      background: `radial-gradient(circle, ${accent}18 0%, transparent 70%)`,
      pointerEvents: 'none',
    }} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color: 'var(--fg-3)',
          fontSize: 11,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          fontWeight: 500,
          marginBottom: 8,
        }}>
          {title}
        </div>
        <div style={{
          color: 'var(--fg-1)',
          fontSize: 36,
          fontWeight: 500,
          fontFamily: 'var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          textShadow: `0 0 24px color-mix(in oklab, ${accent} 30%, transparent)`,
        }}>
          {value}
        </div>
        {subtitle && (
          <div style={{ color: 'var(--fg-3)', fontSize: 12, marginTop: 6 }}>
            {subtitle}
          </div>
        )}
        {trend !== undefined && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: trend >= 0 ? 'var(--neon-lime)' : 'var(--neon-pink)', fontSize: 11 }}>
              {trend >= 0 ? '↑' : '↓'}
            </span>
            <span style={{ color: trend >= 0 ? 'var(--neon-lime)' : 'var(--neon-pink)', fontSize: 12 }}>
              {Math.abs(trend)}% so với hôm qua
            </span>
          </div>
        )}
      </div>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${accent}18`,
        border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent, fontSize: 20, flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
  </div>
)

export default KpiCard
