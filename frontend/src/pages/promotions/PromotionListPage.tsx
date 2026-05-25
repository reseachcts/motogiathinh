import { useState } from 'react'
import { Button, Input, Select, Table, Tag, Typography } from 'antd'
import { EditOutlined, GiftOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { promotionsApi, type PromotionOut } from '@/api/promotions'
import { useAuth } from '@/hooks/useAuth'
import PromotionFormDrawer from './PromotionFormDrawer'

const { Title, Text } = Typography

const formatValue = (item: PromotionOut) => {
  const v = parseFloat(item.gia_tri)
  if (item.loai_khuyen_mai === 'percent') return `${v}%`
  return v.toLocaleString('vi-VN') + ' ₫'
}

export default function PromotionListPage() {
  const { isAdmin } = useAuth()
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editPromotion, setEditPromotion] = useState<PromotionOut | null>(null)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['promotions', page, search, isActive],
    queryFn: () => promotionsApi.list({ page, page_size: 20, search: search || undefined, is_active: isActive }).then((r: { data: { items: PromotionOut[]; total: number } }) => r.data),
  })

  const promotions = data?.items ?? []
  const total = data?.total ?? 0

  const columns = [
    {
      title: 'Mã KM',
      dataIndex: 'ma_khuyen_mai',
      key: 'ma_khuyen_mai',
      render: (v: string) => <Text style={{ fontFamily: 'monospace', color: 'var(--mgt-text-primary)', fontWeight: 600 }}>{v}</Text>,
      width: 140,
    },
    {
      title: 'Tên khuyến mãi',
      dataIndex: 'ten_khuyen_mai',
      key: 'ten_khuyen_mai',
      render: (v: string, row: PromotionOut) => (
        <div>
          <div style={{ color: 'var(--mgt-text-primary)', fontWeight: 600 }}>{v}</div>
          {row.is_partner && <Tag color="purple" style={{ marginTop: 2, fontSize: 11 }}>Liên kết</Tag>}
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'loai_khuyen_mai',
      key: 'loai_khuyen_mai',
      render: (v: string) => (
        <Tag color={v === 'fixed' ? 'blue' : 'cyan'}>
          {v === 'fixed' ? 'Cố định' : 'Phần trăm'}
        </Tag>
      ),
      width: 110,
    },
    {
      title: 'Giá trị',
      key: 'gia_tri',
      render: (_: unknown, row: PromotionOut) => (
        <Text style={{ color: 'var(--mgt-accent-primary)', fontWeight: 600 }}>{formatValue(row)}</Text>
      ),
      width: 140,
    },
    {
      title: 'Hiệu lực',
      key: 'dates',
      render: (_: unknown, row: PromotionOut) => {
        if (!row.start_date && !row.end_date) return <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }}>Không giới hạn</Text>
        const fmt = (d: string) => new Date(d).toLocaleDateString('vi-VN')
        return (
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }}>
            {row.start_date ? fmt(row.start_date) : '–'} → {row.end_date ? fmt(row.end_date) : '–'}
          </Text>
        )
      },
      width: 160,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Hoạt động' : 'Tạm ngưng'}</Tag>,
      width: 110,
    },
    ...(isAdmin ? [{
      title: '',
      key: 'actions',
      width: 48,
      render: (_: unknown, row: PromotionOut) => (
        <EditOutlined
          onClick={e => { e.stopPropagation(); setEditPromotion(row); setDrawerOpen(true) }}
          style={{ color: 'var(--mgt-text-secondary)', cursor: 'pointer', fontSize: 15 }}
        />
      ),
    }] : []),
  ]

  return (
    <div style={{ padding: '16px clamp(16px, 3vw, 32px)', fontFamily: "'Barlow', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>
            KHUYẾN MÃI
          </Title>
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>{total} khuyến mãi</Text>
        </div>
        {isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditPromotion(null); setDrawerOpen(true) }}
            style={{ background: 'linear-gradient(135deg, #1677ff, #0958d9)', border: 'none', fontWeight: 600 }}>
            Thêm khuyến mãi
          </Button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input.Search
          placeholder="Tìm mã, tên khuyến mãi..."
          allowClear
          style={{ width: 280 }}
          onSearch={v => { setSearch(v); setPage(1) }}
          onChange={e => { if (!e.target.value) { setSearch(''); setPage(1) } }}
        />
        <Select
          placeholder="Trạng thái"
          allowClear
          style={{ width: 140 }}
          onChange={v => { setIsActive(v); setPage(1) }}
          options={[
            { value: true, label: 'Hoạt động' },
            { value: false, label: 'Tạm ngưng' },
          ]}
        />
      </div>

      <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, overflow: 'hidden' }}>
        <Table
          dataSource={promotions}
          columns={columns}
          loading={isLoading}
          rowKey="id"
          size="middle"
          scroll={{ x: 700 }}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: t => `${t} khuyến mãi`,
          }}
          onRow={(row: PromotionOut) => ({
            onClick: () => { if (isAdmin) { setEditPromotion(row); setDrawerOpen(true) } },
            style: { cursor: isAdmin ? 'pointer' : 'default' },
          })}
        />
      </div>

      <PromotionFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editPromotion={editPromotion}
      />
    </div>
  )
}
