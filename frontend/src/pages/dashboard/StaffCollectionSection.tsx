import React from 'react'
import { Avatar, Spin, Table } from 'antd'
import { formatVND } from './constants'
import type { StaffCollection } from '@/types'

interface Props {
  data: StaffCollection[]
  loading: boolean
}

const staffColumns = [
  {
    title: 'Nhân viên',
    dataIndex: 'full_name',
    key: 'full_name',
    render: (name: string, row: StaffCollection) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar size={32} style={{
          background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-violet))',
          fontWeight: 700, fontSize: 13, flexShrink: 0,
          color: 'var(--fg-inverse)',
          fontFamily: 'var(--font-display)',
        }}>
          {(name || row.email)[0].toUpperCase()}
        </Avatar>
        <div>
          <div style={{ color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, lineHeight: 1.3, fontFamily: 'var(--font-ui)' }}>
            {name || '—'}
          </div>
          <div style={{ color: 'var(--fg-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
            {row.email}
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Số GD',
    dataIndex: 'payment_count',
    key: 'payment_count',
    align: 'center' as const,
    render: (v: number) => (
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
        fontVariantNumeric: 'tabular-nums', color: 'var(--neon-cyan)',
      }}>
        {v}
      </span>
    ),
  },
  {
    title: 'Tổng thu',
    dataIndex: 'total_collected',
    key: 'total_collected',
    align: 'right' as const,
    render: (v: number) => (
      <span style={{
        color: 'var(--neon-lime)',
        fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        textShadow: '0 0 12px var(--neon-lime-glow)',
      }}>
        {formatVND(v)}
      </span>
    ),
  },
]

const StaffCollectionSection: React.FC<Props> = ({ data, loading }) => (
  <div className="glass-card" style={{ padding: 24, overflow: 'hidden' }}>
    <div style={{ marginBottom: 20 }}>
      <span style={{
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em',
        textTransform: 'uppercase', color: 'var(--fg-3)', display: 'block',
      }}>
        THU TIỀN HÔM NAY
      </span>
      <h3 style={{
        margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 18,
        fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em',
      }}>
        Theo nhân viên · {new Date().toLocaleDateString('vi-VN')}
      </h3>
    </div>

    <Spin spinning={loading}>
      {data.length > 0 ? (
        <Table
          dataSource={data}
          columns={staffColumns}
          rowKey="user_id"
          pagination={false}
          size="small"
          style={{ background: 'transparent' }}
          summary={pageData => {
            const total = pageData.reduce((sum, row) => sum + (row.total_collected ?? 0), 0)
            const txns = pageData.reduce((sum, row) => sum + (row.payment_count ?? 0), 0)
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0}>
                  <span style={{ color: 'var(--fg-1)', fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                    Tổng cộng
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums', color: 'var(--neon-cyan)',
                  }}>
                    {txns}
                  </span>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 700,
                    fontVariantNumeric: 'tabular-nums', color: 'var(--neon-lime)',
                    textShadow: '0 0 12px var(--neon-lime-glow)',
                  }}>
                    {formatVND(total)}
                  </span>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )
          }}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--fg-3)', fontSize: 14, fontFamily: 'var(--font-ui)' }}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>—</div>
          Chưa có giao dịch hôm nay
        </div>
      )}
    </Spin>
  </div>
)

export default StaffCollectionSection
