import React from 'react'
import { STATUS_COLORS, STATUS_LABELS } from './constants'

interface Props {
  studentCounts: Record<string, number>
}

const StudentStatusSection: React.FC<Props> = ({ studentCounts }) => {
  const total = Object.values(studentCounts).reduce((a, b) => a + b, 0)

  return (
    <div className="glass-card" style={{ padding: 24, height: '100%' }}>
      <div style={{ marginBottom: 20 }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em',
          textTransform: 'uppercase', color: 'var(--fg-3)', display: 'block',
        }}>
          HỌC VIÊN
        </span>
        <h3 style={{
          margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 18,
          fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em',
        }}>
          Phân bổ theo trạng thái
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {Object.entries(studentCounts).map(([status, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const color = STATUS_COLORS[status] ?? '#8c8c8c'
          return (
            <div key={status}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: color, flexShrink: 0,
                    boxShadow: `0 0 6px ${color}`,
                  }} />
                  <span style={{ color: 'var(--fg-2)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                    {STATUS_LABELS[status] ?? status}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}>
                    {pct}%
                  </span>
                  <span style={{
                    color, fontFamily: 'var(--font-mono)',
                    fontSize: 14, fontWeight: 700, minWidth: 28, textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {count}
                  </span>
                </div>
              </div>
              <div style={{ height: 4, background: 'var(--ink-3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: color,
                  boxShadow: `0 0 6px ${color}80`,
                  borderRadius: 2,
                  transition: 'width 0.8s cubic-bezier(0.22,1,0.36,1)',
                }} />
              </div>
            </div>
          )
        })}

        {Object.keys(studentCounts).length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>
            Chưa có dữ liệu
          </div>
        )}
      </div>

      {total > 0 && (
        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: '1px solid var(--glass-stroke)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
        }}>
          <span style={{ color: 'var(--fg-3)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>Tổng học viên</span>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 500,
            fontVariantNumeric: 'tabular-nums', color: 'var(--fg-1)',
            letterSpacing: '-0.025em', lineHeight: 1,
          }}>
            {total}
          </span>
        </div>
      )}
    </div>
  )
}

export default StudentStatusSection
