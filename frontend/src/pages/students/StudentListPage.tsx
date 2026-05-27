import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import StudentDetailDrawer from './StudentDetailDrawer'
import { Button, Input, Select, Space, Tooltip } from 'antd'
import {
  CheckCircleOutlined, FileExcelOutlined, PlusOutlined,
  ReloadOutlined, SearchOutlined, WarningOutlined,
} from '@ant-design/icons'
import { studentsApi } from '@/api/students'
import { useAuthStore } from '@/store/authStore'
import type { LicenseType, StudentListItem, StudentStatus } from '@/types'
import dayjs from 'dayjs'

const STATUS_COLOR: Record<StudentStatus, string> = {
  pending: '#FFB020', active: '#B6FF3C', suspended: '#FF3D8A',
  completed: '#00E5FF', dropped: '#4E5566',
}
const STATUS_LABEL: Record<StudentStatus, string> = {
  pending: 'Chờ duyệt', active: 'Đang học', suspended: 'Tạm dừng',
  completed: 'Hoàn thành', dropped: 'Nghỉ học',
}
const LICENSE_COLOR: Record<string, string> = {
  A1: '#FFB020', A2: '#B6FF3C', B1: '#00E5FF', B2: '#8B6CFF', C: '#FF3D8A', D: '#FF3D8A',
}

function initials(name: string) {
  return name.split(' ').slice(-2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = ['#00E5FF', '#B6FF3C', '#FF3D8A', '#8B6CFF', '#FFB020']
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `color-mix(in oklab, ${color} 20%, var(--ink-3))`,
      border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.36,
      color,
    }}>
      {initials(name)}
    </div>
  )
}

function PaymentPill({ status }: { status: StudentStatus }) {
  const color = STATUS_COLOR[status]
  const label = STATUS_LABEL[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 999,
      background: `color-mix(in oklab, ${color} 12%, transparent)`,
      border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
      fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em', fontWeight: 700,
      color, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

function ProfileBadge({ missing }: { missing: string[] }) {
  if (missing.length === 0) return (
    <Tooltip title="Đầy đủ thông tin">
      <CheckCircleOutlined style={{ color: 'var(--neon-lime)', fontSize: 15 }} />
    </Tooltip>
  )
  return (
    <Tooltip title={`Thiếu: ${missing.join(', ')}`} placement="left">
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'rgba(255,176,32,0.12)', border: '1px solid rgba(255,176,32,0.30)',
        borderRadius: 6, padding: '2px 7px',
      }}>
        <WarningOutlined style={{ color: 'var(--neon-amber)', fontSize: 11 }} />
        <span style={{ color: 'var(--neon-amber)', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {missing.length}
        </span>
      </div>
    </Tooltip>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 13px', borderRadius: 999, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--neon-cyan)' : 'var(--glass-stroke)'}`,
        background: active ? 'var(--ink-3)' : 'transparent',
        color: active ? 'var(--neon-cyan)' : 'var(--fg-3)',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
        boxShadow: active ? '0 0 10px var(--neon-cyan-haze)' : 'none',
        transition: 'all 140ms var(--ease-out)',
      }}
    >{children}</button>
  )
}

const COLS = '80px 1.6fr 60px 110px 80px 36px'
const today = dayjs().format('YYYY-MM-DD')

const StudentListPage: React.FC = () => {
  const navigate = useNavigate()
  const branchId = useAuthStore(s => s.branchId())

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StudentStatus | ''>('')
  const [licenseType, setLicenseType] = useState<LicenseType | ''>('')
  const [isRepeat, setIsRepeat] = useState<boolean | undefined>()
  const [filterMissing, setFilterMissing] = useState(false)
  const [filterToday, setFilterToday] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['students', page, search, status, licenseType, isRepeat, branchId],
    queryFn: () =>
      studentsApi.list({
        page, page_size: 20,
        search: search || undefined,
        trang_thai: status || undefined,
        loai_bang_lai: licenseType || undefined,
        is_repeat: isRepeat,
      }).then(r => r.data),
    staleTime: 30_000,
  })

  // Client-side chip filters applied on top
  let items = data?.items ?? []
  if (filterMissing) items = items.filter(s => s.missing_fields.length > 0)
  if (filterToday) items = items.filter(s => s.ngay_dang_ky === today)

  return (
    <div style={{ padding: '0 0 48px' }}>
      {/* Header */}
      <div style={{ padding: '24px clamp(16px,3vw,32px) 20px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>HỌC VIÊN</span>
            <h1 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32, letterSpacing: '-0.025em', color: 'var(--fg-1)', lineHeight: 1.1 }}>
              Danh sách học viên
            </h1>
            <div style={{ color: 'var(--fg-3)', fontSize: 13, marginTop: 4, fontFamily: 'var(--font-mono)' }}>
              {data?.total ?? 0} học viên • trang {page}/{data?.pages ?? 1}
            </div>
          </div>
          <Space>
            <Button icon={<FileExcelOutlined />}>Xuất Excel</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/students/new')} style={{ fontWeight: 600 }}>
              Thêm học viên
            </Button>
          </Space>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 clamp(16px,3vw,32px)' }}>
        {/* Search + select filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <Input
            prefix={<SearchOutlined style={{ color: 'var(--fg-3)' }} />}
            placeholder="Tìm tên, SĐT, mã HV, CCCD..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            allowClear
            style={{ minWidth: 180, flex: 1 }}
          />
          <Select
            value={status || undefined}
            onChange={v => { setStatus(v ?? ''); setPage(1) }}
            placeholder="Trạng thái"
            allowClear
            style={{ width: 140 }}
            options={[
              { label: 'Chờ duyệt', value: 'pending' },
              { label: 'Đang học', value: 'active' },
              { label: 'Tạm dừng', value: 'suspended' },
              { label: 'Hoàn thành', value: 'completed' },
              { label: 'Nghỉ học', value: 'dropped' },
            ]}
          />
          <Select
            value={licenseType || undefined}
            onChange={v => { setLicenseType(v ?? ''); setPage(1) }}
            placeholder="Bằng lái"
            allowClear
            style={{ width: 110 }}
            options={['A1','A2','B1','B2','C','D'].map(v => ({ label: v, value: v }))}
          />
          <Select
            value={isRepeat}
            onChange={v => { setIsRepeat(v); setPage(1) }}
            placeholder="Loại HV"
            allowClear
            style={{ width: 130 }}
            options={[{ label: 'HV mới', value: false }, { label: 'Tái đăng ký', value: true }]}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
        </div>

        {/* Quick-filter chips */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <FilterChip active={filterMissing} onClick={() => setFilterMissing(v => !v)}>Thiếu hồ sơ</FilterChip>
          <FilterChip active={filterToday} onClick={() => setFilterToday(v => !v)}>Hôm nay</FilterChip>
        </div>

        {/* List */}
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 560 }}>
          {/* Header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: COLS,
            padding: '12px 22px', gap: 12,
            borderBottom: '1px solid var(--glass-stroke)',
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--fg-3)',
          }}>
            <span>Mã HV</span>
            <span>Học viên</span>
            <span>Bằng</span>
            <span>Trạng thái</span>
            <span>Loại</span>
            <span></span>
          </div>

          {isLoading && (
            <div style={{ padding: '40px 22px', textAlign: 'center', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
              Đang tải...
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div style={{ padding: '40px 22px', textAlign: 'center', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
              Không có học viên nào
            </div>
          )}

          {items.map((s: StudentListItem, i: number) => (
            <div
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              onMouseEnter={() => setHoverId(s.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                display: 'grid', gridTemplateColumns: COLS,
                padding: '14px 22px', gap: 12, alignItems: 'center',
                borderBottom: i < items.length - 1 ? '1px solid var(--glass-stroke)' : 'none',
                background: hoverId === s.id ? 'var(--glass-2)' : 'transparent',
                cursor: 'pointer', transition: 'background 140ms var(--ease-out)',
              }}
            >
              {/* Mã HV */}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--neon-cyan)', fontWeight: 600 }}>
                {s.ma_hoc_vien}
              </span>

              {/* Avatar + Name + Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={s.ten_hoc_vien} size={32} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.ten_hoc_vien}
                    </span>
                    {s.is_repeat_student && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(139,108,255,0.14)', border: '1px solid rgba(139,108,255,0.30)', color: 'var(--neon-violet)', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0 }}>
                        REPEAT
                      </span>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
                    {dayjs(s.ngay_dang_ky).format('DD/MM/YYYY')}
                  </span>
                </div>
              </div>

              {/* License chip */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '3px 8px', borderRadius: 6,
                background: `color-mix(in oklab, ${LICENSE_COLOR[s.loai_bang_lai] ?? '#fff'} 12%, transparent)`,
                border: `1px solid color-mix(in oklab, ${LICENSE_COLOR[s.loai_bang_lai] ?? '#fff'} 30%, transparent)`,
                fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                color: LICENSE_COLOR[s.loai_bang_lai] ?? 'var(--fg-2)',
                letterSpacing: '0.05em',
              }}>
                {s.loai_bang_lai}
              </span>

              {/* Status pill */}
              <PaymentPill status={s.trang_thai} />

              {/* Repeat badge */}
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)' }}>
                {s.is_repeat_student ? 'Tái đăng ký' : 'HV mới'}
              </span>

              {/* Profile badge */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ProfileBadge missing={s.missing_fields} />
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Pagination */}
        {(data?.pages ?? 0) > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid var(--glass-stroke)', background: 'transparent',
                color: page <= 1 ? 'var(--fg-4)' : 'var(--fg-2)',
                fontFamily: 'var(--font-mono)', fontSize: 12, cursor: page <= 1 ? 'default' : 'pointer',
              }}
            >
              ← Trước
            </button>
            <span style={{ padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>
              {page} / {data?.pages ?? 1}
            </span>
            <button
              disabled={page >= (data?.pages ?? 1)}
              onClick={() => setPage(p => p + 1)}
              style={{
                padding: '6px 14px', borderRadius: 8,
                border: '1px solid var(--glass-stroke)', background: 'transparent',
                color: page >= (data?.pages ?? 1) ? 'var(--fg-4)' : 'var(--fg-2)',
                fontFamily: 'var(--font-mono)', fontSize: 12, cursor: page >= (data?.pages ?? 1) ? 'default' : 'pointer',
              }}
            >
              Tiếp →
            </button>
          </div>
        )}

        <StudentDetailDrawer studentId={selectedId} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  )
}

export default StudentListPage
