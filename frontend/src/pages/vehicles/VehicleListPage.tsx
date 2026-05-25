import { useState } from 'react'
import { Badge, Button, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { EditOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { vehiclesApi, type VehicleListItem, type VehicleOut, type VehicleStatus } from '@/api/vehicles'
import { useAuth } from '@/hooks/useAuth'
import VehicleFormDrawer from './VehicleFormDrawer'

const { Title, Text } = Typography

const STATUS_COLORS: Record<VehicleStatus, string> = {
  active: 'success',
  maintenance: 'warning',
  retired: 'error',
}

const STATUS_LABELS: Record<VehicleStatus, string> = {
  active: 'Đang dùng',
  maintenance: 'Bảo dưỡng',
  retired: 'Ngừng dùng',
}

const LICENSE_OPTIONS = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
]

export default function VehicleListPage() {
  const { isAdmin } = useAuth()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [trangThai, setTrangThai] = useState<VehicleStatus | undefined>()
  const [loaiBangLai, setLoaiBangLai] = useState<string | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<VehicleOut | null>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['vehicles', page, search, trangThai, loaiBangLai],
    queryFn: () =>
      vehiclesApi.list({ page, page_size: 20, search: search || undefined, trang_thai: trangThai, loai_bang_lai: loaiBangLai }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const openCreate = () => {
    setEditVehicle(null)
    setDrawerOpen(true)
  }

  const openEdit = (row: VehicleListItem) => {
    vehiclesApi.get(row.id).then(r => {
      setEditVehicle(r.data)
      setDrawerOpen(true)
    })
  }

  const isExpiringSoon = (d: string | null) => {
    if (!d) return false
    return dayjs(d).diff(dayjs(), 'day') <= 30
  }

  const columns = [
    {
      title: 'Biển số',
      dataIndex: 'bien_so',
      width: 120,
      render: (v: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--mgt-text-primary)' }}>{v}</Text>
      ),
    },
    {
      title: 'Xe',
      render: (_: unknown, row: VehicleListItem) => (
        <div>
          <Text style={{ fontSize: 13, display: 'block' }}>{[row.hang_xe, row.ten_xe].filter(Boolean).join(' ') || row.loai_xe}</Text>
          <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)' }}>{row.loai_xe}</Text>
        </div>
      ),
    },
    {
      title: 'Hạng',
      dataIndex: 'loai_bang_lai',
      width: 70,
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      width: 120,
      render: (v: VehicleStatus) => <Badge status={STATUS_COLORS[v] as 'success' | 'warning' | 'error'} text={STATUS_LABELS[v]} />,
    },
    {
      title: 'Số km',
      dataIndex: 'odometer_km',
      width: 100,
      render: (v: number) => (
        <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>{v.toLocaleString()} km</Text>
      ),
    },
    {
      title: 'Hết đăng kiểm',
      dataIndex: 'ngay_het_dang_kiem',
      width: 130,
      render: (v: string | null) => {
        if (!v) return <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }}>—</Text>
        const expiring = isExpiringSoon(v)
        return (
          <Tooltip title={expiring ? 'Sắp hết hạn!' : ''}>
            <span style={{ fontSize: 12, color: expiring ? '#f5a623' : 'var(--mgt-text-secondary)' }}>
              {expiring && <WarningOutlined style={{ marginRight: 4 }} />}
              {dayjs(v).format('DD/MM/YYYY')}
            </span>
          </Tooltip>
        )
      },
    },
    {
      title: '',
      width: 48,
      render: (_: unknown, row: VehicleListItem) =>
        isAdmin ? (
          <EditOutlined
            onClick={e => { e.stopPropagation(); openEdit(row) }}
            style={{ color: 'var(--mgt-text-secondary)', cursor: 'pointer', fontSize: 15 }}
          />
        ) : null,
    },
  ]

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>
            PHƯƠNG TIỆN
          </Title>
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>
            {data?.total ?? 0} phương tiện
          </Text>
        </div>
        <Space wrap>
          <Input.Search
            placeholder="Tìm biển số / tên xe..."
            allowClear
            style={{ width: 220 }}
            onSearch={v => { setSearch(v); setPage(1) }}
            onChange={e => { if (!e.target.value) { setSearch(''); setPage(1) } }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 150 }}
            options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            onChange={v => { setTrangThai(v as VehicleStatus); setPage(1) }}
          />
          <Select
            allowClear
            placeholder="Hạng bằng"
            style={{ width: 110 }}
            options={LICENSE_OPTIONS}
            onChange={v => { setLoaiBangLai(v); setPage(1) }}
          />
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Thêm xe
            </Button>
          )}
        </Space>
      </div>

      <div style={{ background: 'var(--mgt-gradient-card)', borderRadius: 16, border: '1px solid var(--mgt-border)', overflow: 'hidden' }}>
        <Table
          dataSource={data?.items}
          columns={columns}
          rowKey="id"
          loading={isFetching}
          scroll={{ x: 800 }}
          onRow={row => ({ onClick: () => isAdmin && openEdit(row), style: { cursor: isAdmin ? 'pointer' : 'default' } })}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: total => `${total} phương tiện`,
          }}
          size="small"
        />
      </div>

      <VehicleFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editVehicle={editVehicle}
      />
    </div>
  )
}
