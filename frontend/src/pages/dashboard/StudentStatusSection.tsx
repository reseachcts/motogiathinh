import React from 'react'
import { Typography } from 'antd'
import { STATUS_COLORS, STATUS_LABELS } from './constants'

const { Text } = Typography

interface Props {
  studentCounts: Record<string, number>
}

const StudentStatusSection: React.FC<Props> = ({ studentCounts }) => {
  const total = Object.values(studentCounts).reduce((a, b) => a + b, 0)

  return (
    <div style={{
      background: 'var(--mgt-gradient-card)',
      border: '1px solid var(--mgt-border)',
      borderRadius: 16, padding: '24px', height: '100%',
    }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ color: 'var(--mgt-text-primary)', fontSize: 16, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.03em' }}>
          CHI TIẾT HỌC VIÊN
        </div>
        <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, marginTop: 2 }}>Số lượng theo trạng thái</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {Object.entries(studentCounts).map(([status, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          const color = STATUS_COLORS[status] ?? '#8c8c8c'
          return (
            <div key={status}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <Text style={{ color: 'var(--mgt-text-body)', fontSize: 13 }}>
                    {STATUS_LABELS[status] ?? status}
                  </Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }}>{pct}%</Text>
                  <Text style={{
                    color, fontFamily: "'Barlow Condensed', sans-serif",
                    fontSize: 16, fontWeight: 700, minWidth: 32, textAlign: 'right',
                  }}>
                    {count}
                  </Text>
                </div>
              </div>
              <div style={{ height: 4, background: 'var(--mgt-border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                  borderRadius: 2, transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          )
        })}

        {Object.keys(studentCounts).length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--mgt-text-secondary)' }}>
            Chưa có dữ liệu
          </div>
        )}
      </div>

      {total > 0 && (
        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: '1px solid var(--mgt-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>Tổng học viên</Text>
          <Text style={{ color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 700 }}>
            {total}
          </Text>
        </div>
      )}
    </div>
  )
}

export default StudentStatusSection
