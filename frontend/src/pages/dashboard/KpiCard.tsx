import React from 'react'
import { Typography } from 'antd'
import { ArrowUpOutlined } from '@ant-design/icons'

const { Text } = Typography

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
    style={{
      background: 'var(--mgt-gradient-card)',
      border: `1px solid ${accent}30`,
      borderRadius: 16,
      padding: '24px 28px',
      position: 'relative',
      overflow: 'hidden',
      height: '100%',
      boxShadow: `0 0 32px ${accent}15, inset 0 1px 0 ${accent}20`,
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'default',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLElement
      el.style.transform = 'translateY(-2px)'
      el.style.boxShadow = `0 8px 40px ${accent}25, inset 0 1px 0 ${accent}20`
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLElement
      el.style.transform = 'translateY(0)'
      el.style.boxShadow = `0 0 32px ${accent}15, inset 0 1px 0 ${accent}20`
    }}
  >
    {/* Decorative arcs */}
    <div style={{
      position: 'absolute', top: -40, right: -40,
      width: 120, height: 120, borderRadius: '50%',
      border: `2px solid ${accent}20`,
    }} />
    <div style={{
      position: 'absolute', top: -20, right: -20,
      width: 80, height: 80, borderRadius: '50%',
      border: `1px solid ${accent}15`,
    }} />

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Barlow', sans-serif", fontWeight: 500 }}>
          {title}
        </Text>
        <div style={{
          color: 'var(--mgt-text-primary)',
          fontSize: 28, fontWeight: 700,
          fontFamily: "'Barlow Condensed', sans-serif",
          letterSpacing: '-0.5px', marginTop: 6, lineHeight: 1.1,
        }}>
          {value}
        </div>
        {subtitle && (
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, marginTop: 4, display: 'block' }}>
            {subtitle}
          </Text>
        )}
        {trend !== undefined && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpOutlined style={{ color: trend >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 11 }} />
            <Text style={{ color: trend >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 12 }}>
              {Math.abs(trend)}% so với hôm qua
            </Text>
          </div>
        )}
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${accent}18`,
        border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent, fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>

    {/* Bottom accent line */}
    <div style={{
      position: 'absolute', bottom: 0, left: 0,
      height: 3, width: '40%',
      background: `linear-gradient(90deg, ${accent}, transparent)`,
      borderRadius: '0 0 0 16px',
    }} />
  </div>
)

export default KpiCard
