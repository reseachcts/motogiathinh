import React from 'react'
import { Avatar, Space, Spin, Table, Tag, Typography } from 'antd'
import { CarOutlined, UserOutlined } from '@ant-design/icons'
import { formatVND } from './constants'
import type { StaffCollection } from '@/types'

const { Text } = Typography

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
      <Space>
        <Avatar size={32} style={{ background: '#1677ff', fontSize: 13, fontFamily: "'Barlow', sans-serif" }}>
          {(name || row.email)[0].toUpperCase()}
        </Avatar>
        <div>
          <div style={{ color: 'var(--mgt-text-primary)', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{name || '—'}</div>
          <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 11 }}>{row.email}</div>
        </div>
      </Space>
    ),
  },
  {
    title: 'Số GD',
    dataIndex: 'payment_count',
    key: 'payment_count',
    align: 'center' as const,
    render: (v: number) => (
      <Tag style={{
        background: 'var(--mgt-tag-blue-bg)', borderColor: 'var(--mgt-tag-blue-border)', color: 'var(--mgt-tag-blue-text)',
        fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700,
      }}>
        {v}
      </Tag>
    ),
  },
  {
    title: 'Tổng thu',
    dataIndex: 'total_collected',
    key: 'total_collected',
    align: 'right' as const,
    render: (v: number) => (
      <span style={{ color: '#52c41a', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px' }}>
        {formatVND(v)}
      </span>
    ),
  },
]

const StaffCollectionSection: React.FC<Props> = ({ data, loading }) => (
  <div style={{
    background: 'var(--mgt-gradient-card)',
    border: '1px solid var(--mgt-border)',
    borderRadius: 16, padding: '24px', overflow: 'hidden',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <div>
        <div style={{ color: 'var(--mgt-text-primary)', fontSize: 16, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.03em' }}>
          THU TIỀN THEO NHÂN VIÊN
        </div>
        <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, marginTop: 2 }}>
          Hôm nay — {new Date().toLocaleDateString('vi-VN')}
        </div>
      </div>
      <Tag icon={<UserOutlined />} style={{
        background: 'var(--mgt-tag-green-bg)', borderColor: 'var(--mgt-tag-green-border)', color: 'var(--mgt-tag-green-text)',
        fontFamily: "'Barlow', sans-serif",
      }}>
        {data.length} nhân viên
      </Tag>
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
                  <Text style={{ color: 'var(--mgt-text-primary)', fontWeight: 700, fontSize: 13 }}>Tổng cộng</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={1} align="center">
                  <Text style={{ color: '#4096ff', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700 }}>{txns}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={2} align="right">
                  <Text style={{ color: '#52c41a', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 700 }}>
                    {formatVND(total)}
                  </Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )
          }}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--mgt-text-secondary)', fontSize: 14 }}>
          <CarOutlined style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.4 }} />
          Chưa có giao dịch hôm nay
        </div>
      )}
    </Spin>
  </div>
)

export default StaffCollectionSection
