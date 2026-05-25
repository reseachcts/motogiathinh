import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Select, Space, Table, Tag, Typography } from 'antd'
import { EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { classesApi, type ClassListItem, type ClassOut, type ClassStatus } from '@/api/classes'
import { useAuth } from '@/hooks/useAuth'
import ClassFormDrawer from './ClassFormDrawer'

const { Title, Text } = Typography

const STATUS_COLORS: Record<ClassStatus, string> = {
  upcoming: 'default',
  enrolling: 'cyan',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
}

const STATUS_LABELS: Record<ClassStatus, string> = {
  upcoming: 'Sắp khai giảng',
  enrolling: 'Đang tuyển sinh',
  in_progress: 'Đang học',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

export default function ClassListPage() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [trangThai, setTrangThai] = useState<ClassStatus | undefined>()
  const [courseTypeId, setCourseTypeId] = useState<string | undefined>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editClass, setEditClass] = useState<ClassOut | null>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['classes', page, search, trangThai, courseTypeId],
    queryFn: () =>
      classesApi.list({
        page,
        page_size: 20,
        search: search || undefined,
        trang_thai: trangThai,
        course_type_id: courseTypeId,
      }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const { data: courseTypes = [] } = useQuery({
    queryKey: ['course-types'],
    queryFn: () => classesApi.listCourseTypes().then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const openCreate = () => {
    setEditClass(null)
    setDrawerOpen(true)
  }

  const openEdit = (row: ClassListItem) => {
    classesApi.get(row.id).then(r => {
      setEditClass(r.data)
      setDrawerOpen(true)
    })
  }

  const columns = [
    {
      title: 'Mã lớp',
      dataIndex: 'ma_lop',
      width: 130,
      render: (v: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--mgt-text-primary)', fontWeight: 600 }}>{v}</Text>
      ),
    },
    {
      title: 'Tên lớp',
      dataIndex: 'ten_lop',
      render: (v: string) => <Text style={{ fontSize: 13 }}>{v}</Text>,
    },
    {
      title: 'Khóa học',
      width: 160,
      render: (_: unknown, row: ClassListItem) =>
        row.course_type ? (
          <Tag color="blue" style={{ fontSize: 11 }}>{row.course_type.ma_khoa_hoc}</Tag>
        ) : '—',
    },
    {
      title: 'Khai giảng',
      dataIndex: 'ngay_khai_giang',
      width: 110,
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>
          {dayjs(v).format('DD/MM/YYYY')}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'trang_thai',
      width: 140,
      render: (v: ClassStatus) => (
        <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v]}</Tag>
      ),
    },
    {
      title: 'Sĩ số',
      width: 90,
      render: (_: unknown, row: ClassListItem) => (
        <Text style={{ fontSize: 13 }}>
          {row.so_luong_hien_tai} HV
        </Text>
      ),
    },
    {
      title: 'Học phí',
      dataIndex: 'hoc_phi',
      width: 130,
      render: (v: number | null) =>
        v != null ? (
          <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--mgt-text-primary)' }}>
            {Math.round(Number(v)).toLocaleString('vi-VN')}đ
          </Text>
        ) : (
          <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>—</Text>
        ),
    },
    {
      title: 'Phòng học',
      dataIndex: 'phong_hoc',
      width: 100,
      render: (v: string | null) => (
        <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>{v || '—'}</Text>
      ),
    },
    {
      title: '',
      width: 48,
      render: (_: unknown, row: ClassListItem) => (
        <EditOutlined
          onClick={e => { e.stopPropagation(); openEdit(row) }}
          style={{ color: 'var(--mgt-text-secondary)', cursor: 'pointer', fontSize: 15 }}
        />
      ),
    },
  ]

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>
            LỚP HỌC
          </Title>
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>
            {data?.total ?? 0} lớp học
          </Text>
        </div>
        <Space wrap>
          <Input.Search
            placeholder="Tìm mã / tên lớp..."
            allowClear
            style={{ width: 220 }}
            onSearch={v => { setSearch(v); setPage(1) }}
            onChange={e => { if (!e.target.value) { setSearch(''); setPage(1) } }}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 160 }}
            options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            onChange={v => { setTrangThai(v as ClassStatus); setPage(1) }}
          />
          <Select
            allowClear
            placeholder="Khóa học"
            style={{ width: 180 }}
            options={courseTypes.map(ct => ({ value: ct.id, label: ct.ma_khoa_hoc }))}
            onChange={v => { setCourseTypeId(v); setPage(1) }}
          />
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Thêm lớp
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
          scroll={{ x: 900 }}
          onRow={row => ({ onClick: () => navigate(`/classes/${row.id}`), style: { cursor: 'pointer' } })}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: total => `${total} lớp học`,
          }}
          size="small"
        />
      </div>

      <ClassFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editClass={editClass}
      />
    </div>
  )
}
