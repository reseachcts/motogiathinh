import { useState } from 'react'
import { Badge, Button, Input, Select, Space, Table, Tooltip, Typography } from 'antd'
import { EditOutlined, PlusOutlined, StarFilled } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { instructorsApi, type InstructorListItem, type InstructorOut } from '@/api/instructors'
import { useAuth } from '@/hooks/useAuth'
import InstructorFormDrawer from './InstructorFormDrawer'

const { Title, Text } = Typography

export default function InstructorListPage() {
  const { isAdmin } = useAuth()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<boolean | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editInstructor, setEditInstructor] = useState<InstructorOut | null>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['instructors', page, search, isActive],
    queryFn: () =>
      instructorsApi.list({ page, page_size: 20, search: search || undefined, is_active: isActive }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const openCreate = () => {
    setEditInstructor(null)
    setDrawerOpen(true)
  }

  const openEdit = (row: InstructorListItem) => {
    instructorsApi.get(row.id).then(r => {
      setEditInstructor(r.data)
      setDrawerOpen(true)
    })
  }

  const columns = [
    {
      title: 'Mã GV',
      dataIndex: 'ma_giao_vien',
      width: 100,
      render: (v: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: 'var(--mgt-text-primary)' }}>{v}</Text>
      ),
    },
    {
      title: 'Họ tên',
      dataIndex: 'ho_ten',
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'so_dien_thoai',
      width: 130,
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Ngày vào làm',
      dataIndex: 'ngay_vao_lam',
      width: 120,
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>
          {dayjs(v).format('DD/MM/YYYY')}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      width: 110,
      render: (v: boolean) => (
        <Badge status={v ? 'success' : 'error'} text={v ? 'Đang làm' : 'Đã nghỉ'} />
      ),
    },
    {
      title: 'Đánh giá',
      width: 110,
      render: (_: unknown, row: InstructorListItem) => (
        <Tooltip title={`${row.total_reviews} đánh giá`}>
          <span style={{ fontSize: 13 }}>
            <StarFilled style={{ color: '#faad14', fontSize: 12, marginRight: 4 }} />
            {parseFloat(row.rating_avg).toFixed(1)}
          </span>
        </Tooltip>
      ),
    },
    {
      title: '',
      width: 48,
      render: (_: unknown, row: InstructorListItem) =>
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
            GIÁO VIÊN
          </Title>
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>
            {data?.total ?? 0} giáo viên
          </Text>
        </div>
        <Space wrap>
          <Input.Search
            placeholder="Tìm tên / mã GV..."
            allowClear
            style={{ width: 220 }}
            onSearch={v => { setSearch(v); setPage(1) }}
            onChange={e => { if (!e.target.value) { setSearch(''); setPage(1) } }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 140 }}
            options={[
              { value: true, label: 'Đang làm' },
              { value: false, label: 'Đã nghỉ' },
            ]}
            onChange={v => { setIsActive(v); setPage(1) }}
          />
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Thêm giáo viên
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
          scroll={{ x: 700 }}
          onRow={row => ({ onClick: () => isAdmin && openEdit(row), style: { cursor: isAdmin ? 'pointer' : 'default' } })}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: total => `${total} giáo viên`,
          }}
          size="small"
        />
      </div>

      <InstructorFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editInstructor={editInstructor}
      />
    </div>
  )
}
