import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button, Col, Descriptions, Input, Row, Select, Spin, Table, Tag, Typography,
} from 'antd'
import { ArrowLeftOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  classesApi,
  type ClassOut,
  type ClassVehicleItem,
  type LichHocSlot,
} from '@/api/classes'
import { sessionsApi, type SessionOut } from '@/api/sessions'
import { useAuth } from '@/hooks/useAuth'
import ClassFormDrawer from './ClassFormDrawer'
import SessionFormDrawer from '../schedule/SessionFormDrawer'
import {
  STATUS_COLORS, STATUS_LABELS,
  VEHICLE_STATUS_COLOR, VEHICLE_STATUS_LABEL,
  PAYMENT_OPTIONS, LEARN_OPTIONS,
  SidebarCard, StatRow,
  enrollmentColumns, makeSessionColumns,
} from './ClassDetailParts'

const { Title, Text } = Typography

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAdmin } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [sessionDrawerOpen, setSessionDrawerOpen] = useState(false)
  const [editSession, setEditSession] = useState<SessionOut | null>(null)
  const [search, setSearch] = useState('')
  const [filterLT, setFilterLT] = useState<string | undefined>()
  const [filterTH, setFilterTH] = useState<string | undefined>()
  const [filterPayment, setFilterPayment] = useState<string | undefined>()

  const { data: cls, isLoading } = useQuery({
    queryKey: ['class', id],
    queryFn: () => classesApi.get(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ['class-enrollments', id],
    queryFn: () => classesApi.getEnrollments(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['class-vehicles', id],
    queryFn: () => classesApi.getVehicles(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['class-sessions', id],
    queryFn: () => sessionsApi.list({ class_id: id, page_size: 200 }).then(r => r.data.items),
    enabled: !!id,
  })

  if (isLoading || !cls) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    )
  }

  // Finance totals from enrollments (Decimal fields arrive as strings from Pydantic)
  const financeTotal = enrollments.reduce((s, e) => s + Number(e.total_amount ?? 0), 0)
  const financePaid = enrollments.reduce((s, e) => s + Number(e.paid_amount ?? 0), 0)
  const financeRemaining = financeTotal - financePaid

  const filteredEnrollments = enrollments.filter(e => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !e.ten_hoc_vien.toLowerCase().includes(q) &&
        !e.ma_hoc_vien.toLowerCase().includes(q) &&
        !e.so_dien_thoai.includes(q)
      ) return false
    }
    if (filterLT && e.ly_thuyet_status !== filterLT) return false
    if (filterTH && e.thuc_hanh_status !== filterTH) return false
    if (filterPayment && e.payment_status !== filterPayment) return false
    return true
  })

  const sessionColumns = makeSessionColumns(setEditSession, setSessionDrawerOpen)

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/classes')}
          style={{ border: '1px solid var(--mgt-border)', background: 'transparent', color: 'var(--mgt-text-secondary)' }}
        >
          Danh sách lớp
        </Button>
        <div style={{ flex: 1 }} />
        <Button
          icon={<EditOutlined />}
          onClick={() => setDrawerOpen(true)}
          style={{ border: '1px solid var(--mgt-border)', background: 'transparent' }}
        >
          Chỉnh sửa
        </Button>
      </div>

      {/* Title */}
      <div style={{ marginBottom: 20 }}>
        <Text style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--mgt-text-secondary)', display: 'block', marginBottom: 4 }}>
          {cls.ma_lop}
        </Text>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Title level={3} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>
            {cls.ten_lop}
          </Title>
          <Tag color={STATUS_COLORS[cls.trang_thai]}>{STATUS_LABELS[cls.trang_thai]}</Tag>
        </div>
      </div>

      <Row gutter={[16, 16]} align="top">
        {/* Main column */}
        <Col xs={24} xl={17}>
          {/* Info card */}
          <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
            <Descriptions
              column={{ xs: 1, sm: 2, md: 3 }}
              labelStyle={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}
              contentStyle={{ color: 'var(--mgt-text-primary)', fontWeight: 500, fontSize: 13 }}
              size="small"
            >
              <Descriptions.Item label="Khóa học">
                {cls.course_type
                  ? <Tag color="blue">{cls.course_type.ma_khoa_hoc}</Tag>
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Khai giảng">
                {dayjs(cls.ngay_khai_giang).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Kết thúc">
                {cls.ngay_ket_thuc ? dayjs(cls.ngay_ket_thuc).format('DD/MM/YYYY') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Sĩ số">
                {cls.so_luong_hien_tai} học viên
              </Descriptions.Item>
              <Descriptions.Item label="Học phí">
                {cls.hoc_phi != null && cls.hoc_phi !== 0
                  ? <Text style={{ fontWeight: 700, color: 'var(--mgt-text-primary)' }}>{Math.round(Number(cls.hoc_phi)).toLocaleString('vi-VN')}đ</Text>
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Phòng học">
                {cls.phong_hoc || '—'}
              </Descriptions.Item>
              {cls.zalo_group_link && (
                <Descriptions.Item label="Nhóm Zalo" span={2}>
                  <a href={cls.zalo_group_link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--mgt-accent-primary)' }}>
                    {cls.zalo_group_link}
                  </a>
                </Descriptions.Item>
              )}
              {cls.lich_hoc && cls.lich_hoc.length > 0 && (
                <Descriptions.Item label="Lịch học" span={3}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(cls.lich_hoc as LichHocSlot[]).map((slot, i) => {
                      const dayLabel = [,'CN','T2','T3','T4','T5','T6','T7','CN'][slot.thu] ?? `Thứ ${slot.thu}`
                      return (
                        <Tag key={i} style={{ fontSize: 12 }}>
                          {dayLabel} · {slot.gio_bat_dau}–{slot.gio_ket_thuc}
                        </Tag>
                      )
                    })}
                  </div>
                </Descriptions.Item>
              )}
              {cls.ghi_chu && (
                <Descriptions.Item label="Ghi chú" span={3}>
                  {cls.ghi_chu}
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>

          {/* Enrollment table */}
          <div style={{ marginBottom: 10 }}>
            <Title level={5} style={{ margin: '0 0 10px', color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: 1 }}>
              HỌC VIÊN ({filteredEnrollments.length}{filteredEnrollments.length !== enrollments.length ? `/${enrollments.length}` : ''})
            </Title>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Input.Search
                placeholder="Tìm tên, mã HV, SĐT..."
                allowClear
                style={{ width: 220 }}
                onSearch={v => setSearch(v)}
                onChange={e => { if (!e.target.value) setSearch('') }}
              />
              <Select
                allowClear
                placeholder="Lý thuyết"
                style={{ width: 130 }}
                options={LEARN_OPTIONS}
                onChange={v => setFilterLT(v)}
              />
              <Select
                allowClear
                placeholder="Thực hành"
                style={{ width: 130 }}
                options={LEARN_OPTIONS}
                onChange={v => setFilterTH(v)}
              />
              <Select
                allowClear
                placeholder="Học phí"
                style={{ width: 130 }}
                options={PAYMENT_OPTIONS}
                onChange={v => setFilterPayment(v)}
              />
            </div>
          </div>
          <div style={{ background: 'var(--mgt-gradient-card)', borderRadius: 16, border: '1px solid var(--mgt-border)', overflow: 'hidden', marginTop: 10 }}>
            <Table
              dataSource={filteredEnrollments}
              columns={enrollmentColumns}
              rowKey="id"
              loading={loadingEnrollments}
              size="small"
              scroll={{ x: 900 }}
              pagination={{
                pageSize: 20,
                showSizeChanger: false,
                showTotal: total => `${total} học viên`,
              }}
              locale={{ emptyText: 'Chưa có học viên' }}
            />
          </div>

          {/* Lịch học */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Title level={5} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, letterSpacing: 1 }}>
                LỊCH HỌC ({sessions.length})
              </Title>
              {isAdmin && (
                <Button size="small" icon={<PlusOutlined />}
                  onClick={() => { setEditSession(null); setSessionDrawerOpen(true) }}>
                  Thêm buổi học
                </Button>
              )}
            </div>
            <div style={{ background: 'var(--mgt-gradient-card)', borderRadius: 16, border: '1px solid var(--mgt-border)', overflow: 'hidden' }}>
              <Table
                dataSource={sessions}
                columns={sessionColumns}
                rowKey="id"
                loading={loadingSessions}
                size="small"
                scroll={{ x: 700 }}
                pagination={{ pageSize: 20, showSizeChanger: false, showTotal: t => `${t} buổi học` }}
                locale={{ emptyText: 'Chưa có buổi học nào' }}
              />
            </div>
          </div>
        </Col>

        {/* Sidebar */}
        <Col xs={24} xl={7}>
          <div style={{ position: 'sticky', top: 16 }}>
            {/* Capacity */}
            <SidebarCard title="Sĩ số">
              <StatRow label="Đã đăng ký" value={`${cls.so_luong_hien_tai} học viên`} />
            </SidebarCard>

            {/* Finance */}
            <SidebarCard title="Tài chính">
              <StatRow label="Tổng học phí" value={`${Math.round(financeTotal).toLocaleString('vi-VN')}đ`} />
              <StatRow label="Đã thu" value={`${Math.round(financePaid).toLocaleString('vi-VN')}đ`} color="var(--mgt-accent-success)" />
              <StatRow
                label="Còn lại"
                value={`${Math.round(financeRemaining).toLocaleString('vi-VN')}đ`}
                color={financeRemaining > 0 ? 'var(--mgt-accent-danger)' : 'var(--mgt-text-secondary)'}
              />
            </SidebarCard>

            {/* Vehicles */}
            <SidebarCard title="Xe thực hành">
              {loadingVehicles ? (
                <Spin size="small" />
              ) : vehicles.length === 0 ? (
                <Text style={{ fontSize: 13, color: 'var(--mgt-text-secondary)' }}>—</Text>
              ) : (
                vehicles.map((v: ClassVehicleItem) => (
                  <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                      <Text style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'var(--mgt-text-primary)', display: 'block' }}>
                        {v.bien_so}
                      </Text>
                      <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)' }}>
                        {[v.hang_xe, v.ten_xe].filter(Boolean).join(' ') || v.loai_xe}
                      </Text>
                    </div>
                    <Tag color={VEHICLE_STATUS_COLOR[v.trang_thai] ?? 'default'} style={{ fontSize: 10 }}>
                      {VEHICLE_STATUS_LABEL[v.trang_thai] ?? v.trang_thai}
                    </Tag>
                  </div>
                ))
              )}
            </SidebarCard>
          </div>
        </Col>
      </Row>

      <ClassFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editClass={cls as ClassOut}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['class', id] })
          queryClient.invalidateQueries({ queryKey: ['classes'] })
        }}
      />

      <SessionFormDrawer
        open={sessionDrawerOpen}
        onClose={() => setSessionDrawerOpen(false)}
        editSession={editSession}
        defaultClassId={id}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['class-sessions', id] })}
      />
    </div>
  )
}
