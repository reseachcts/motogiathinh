import React from 'react'
import { Link } from 'react-router-dom'
import { Progress, Tag, Typography } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ClassEnrollmentItem, ClassStatus } from '@/api/classes'
import type { SessionListItem, SessionOut, SessionType } from '@/api/sessions'
import { sessionsApi } from '@/api/sessions'

const { Text } = Typography

// ── Status maps ──────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<ClassStatus, string> = {
  upcoming: 'default', enrolling: 'cyan', in_progress: 'blue',
  completed: 'green', cancelled: 'red',
}
export const STATUS_LABELS: Record<ClassStatus, string> = {
  upcoming: 'Sắp khai giảng', enrolling: 'Đang tuyển sinh',
  in_progress: 'Đang học', completed: 'Hoàn thành', cancelled: 'Đã hủy',
}

export const PAYMENT_STATUS_COLOR: Record<string, string> = {
  paid: 'success', partial: 'processing', overdue: 'error',
  pending: 'default', waived: 'default', refunded: 'default',
}
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  paid: 'Đã đóng', partial: 'Một phần', overdue: 'Quá hạn',
  pending: 'Chưa đóng', waived: 'Miễn', refunded: 'Hoàn tiền',
}

export const LEARN_TAG: Record<string, { color: string; label: string }> = {
  not_started: { color: 'default', label: 'Chưa học' },
  passed:      { color: 'success', label: 'Đạt' },
  failed:      { color: 'error',   label: 'Không đạt' },
}
export const LEARN_OPTIONS = [
  { value: 'not_started', label: 'Chưa học' },
  { value: 'passed',      label: 'Đạt' },
  { value: 'failed',      label: 'Không đạt' },
]
export const PAYMENT_OPTIONS = [
  { value: 'pending', label: 'Chưa đóng' },
  { value: 'partial', label: 'Một phần' },
  { value: 'paid',    label: 'Đã đóng' },
  { value: 'overdue', label: 'Quá hạn' },
  { value: 'waived',  label: 'Miễn' },
]

export const VEHICLE_STATUS_COLOR: Record<string, string> = {
  active: 'green', maintenance: 'orange', retired: 'default', inactive: 'default',
}
export const VEHICLE_STATUS_LABEL: Record<string, string> = {
  active: 'Hoạt động', maintenance: 'Bảo dưỡng',
  retired: 'Ngừng sử dụng', inactive: 'Không hoạt động',
}

export const SESSION_TYPE_COLORS: Record<SessionType, string> = {
  theory: 'blue', practice: 'green', exam_prep: 'orange',
}
export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  theory: 'Lý thuyết', practice: 'Thực hành', exam_prep: 'Ôn thi',
}

// ── Helper components ────────────────────────────────────────────────────────

export const SidebarCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{
    background: 'var(--mgt-gradient-card)',
    border: '1px solid var(--mgt-border)',
    borderRadius: 12,
    padding: '14px 16px',
    marginBottom: 10,
  }}>
    <Text style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      color: 'var(--mgt-text-secondary)', textTransform: 'uppercase',
      display: 'block', marginBottom: 12,
      fontFamily: "'Barlow Condensed', sans-serif",
    }}>
      {title}
    </Text>
    {children}
  </div>
)

export const StatRow = ({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
    <Text style={{ fontSize: 13, color: 'var(--mgt-text-secondary)' }}>{label}</Text>
    <Text style={{ fontSize: 13, fontWeight: 600, color: color ?? 'var(--mgt-text-primary)' }}>{value}</Text>
  </div>
)

// ── Column definitions ───────────────────────────────────────────────────────

export const enrollmentColumns = [
  {
    title: 'Mã HV',
    dataIndex: 'ma_hoc_vien',
    width: 110,
    render: (v: string) => (
      <Text style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--mgt-text-secondary)', fontWeight: 600 }}>{v}</Text>
    ),
  },
  {
    title: 'Họ tên',
    key: 'name',
    render: (_: unknown, row: ClassEnrollmentItem) => (
      <Link to={`/students/${row.student_id}`} style={{ fontWeight: 600, color: 'var(--mgt-accent-primary)' }}>
        {row.ten_hoc_vien}
      </Link>
    ),
  },
  {
    title: 'SĐT',
    dataIndex: 'so_dien_thoai',
    width: 120,
    render: (v: string) => <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>{v}</Text>,
  },
  {
    title: 'Ngày ĐK',
    dataIndex: 'enrollment_date',
    width: 100,
    render: (v: string) => <Text style={{ fontSize: 12 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
  },
  {
    title: 'Lý thuyết',
    dataIndex: 'ly_thuyet_status',
    width: 95,
    render: (v: string) => {
      const s = LEARN_TAG[v] ?? { color: 'default', label: v }
      return <Tag color={s.color} style={{ fontSize: 11 }}>{s.label}</Tag>
    },
  },
  {
    title: 'Thực hành',
    dataIndex: 'thuc_hanh_status',
    width: 95,
    render: (v: string) => {
      const s = LEARN_TAG[v] ?? { color: 'default', label: v }
      return <Tag color={s.color} style={{ fontSize: 11 }}>{s.label}</Tag>
    },
  },
  {
    title: 'Tiến độ',
    dataIndex: 'overall_progress',
    width: 110,
    render: (v: number) => <Progress percent={v} size="small" strokeColor="var(--mgt-accent-primary)" />,
  },
  {
    title: 'Học phí',
    dataIndex: 'payment_status',
    width: 100,
    render: (v: string | null) => v
      ? <Tag color={PAYMENT_STATUS_COLOR[v] ?? 'default'} style={{ fontSize: 11 }}>{PAYMENT_STATUS_LABEL[v] ?? v}</Tag>
      : <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }}>—</Text>,
  },
  {
    title: 'Còn lại',
    dataIndex: 'remaining_amount',
    width: 110,
    render: (v: number | string | null) => {
      const n = Number(v ?? 0)
      return n > 0
        ? <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--mgt-accent-danger)' }}>{Math.round(n).toLocaleString('vi-VN')}đ</Text>
        : <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>—</Text>
    },
  },
]

export function makeSessionColumns(
  setEditSession: (s: SessionOut | null) => void,
  setSessionDrawerOpen: (v: boolean) => void,
) {
  return [
    {
      title: 'Ngày',
      dataIndex: 'session_date',
      width: 100,
      render: (v: string) => <Text style={{ fontSize: 12, fontWeight: 600 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>,
    },
    {
      title: 'Ca học',
      width: 110,
      render: (_: unknown, row: SessionListItem) => (
        <Text style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--mgt-text-secondary)' }}>
          {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
        </Text>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'session_type',
      width: 100,
      render: (v: SessionType) => <Tag color={SESSION_TYPE_COLORS[v]}>{SESSION_TYPE_LABELS[v]}</Tag>,
    },
    {
      title: 'Giáo viên',
      render: (_: unknown, row: SessionListItem) => (
        <Text style={{ fontSize: 12 }}>{row.instructor?.ho_ten || '—'}</Text>
      ),
    },
    {
      title: 'Phòng',
      dataIndex: 'phong_hoc',
      width: 90,
      render: (v: string | null) => <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>{v || '—'}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_cancelled',
      width: 100,
      render: (v: boolean) => <Tag color={v ? 'red' : 'success'}>{v ? 'Đã hủy' : 'OK'}</Tag>,
    },
    {
      title: '',
      width: 40,
      render: (_: unknown, row: SessionListItem) => (
        <EditOutlined
          onClick={e => {
            e.stopPropagation()
            sessionsApi.get(row.id).then(r => { setEditSession(r.data); setSessionDrawerOpen(true) })
          }}
          style={{ color: 'var(--mgt-text-secondary)', cursor: 'pointer' }}
        />
      ),
    },
  ]
}
