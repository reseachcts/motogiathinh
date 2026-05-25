import { Tag, Typography, Skeleton } from 'antd'
import { PhoneOutlined, MailOutlined, WechatOutlined, UserOutlined } from '@ant-design/icons'
import type { Student, PaymentPlan, PaymentStatus } from '@/types'
import type { EnrollmentOut, StudentContactOut } from '@/api/students'

const { Text } = Typography

const fmt = (v: number | string) =>
  Math.round(parseFloat(String(v))).toLocaleString('vi-VN') + ' ₫'

const PLAN_STATUS: Record<PaymentStatus, { color: string; label: string }> = {
  pending:  { color: 'gold',    label: 'Chờ đóng' },
  partial:  { color: 'orange',  label: 'Còn thiếu' },
  paid:     { color: 'success', label: 'Đã đóng' },
  overdue:  { color: 'error',   label: 'Quá hạn' },
  waived:   { color: 'purple',  label: 'Miễn giảm' },
  refunded: { color: 'default', label: 'Hoàn tiền' },
}

const LEARN_STATUS: Record<string, { color: string; label: string }> = {
  not_started: { color: 'default', label: 'Chưa học' },
  passed:      { color: 'success', label: 'Đạt' },
  failed:      { color: 'error',   label: 'Không đạt' },
}

const CLASS_STATUS_COLOR: Record<string, string> = {
  upcoming: 'default', enrolling: 'blue', in_progress: 'processing',
  completed: 'success', cancelled: 'error',
}

interface SidebarCardProps { title: string; children: React.ReactNode }
const SidebarCard = ({ title, children }: SidebarCardProps) => (
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

interface Props {
  student: Student
  enrollments: EnrollmentOut[]
  plans: PaymentPlan[]
  contacts: StudentContactOut[]
  plansLoading: boolean
  contactsLoading: boolean
}

export default function StudentSidebar({ student, enrollments, plans, contacts, plansLoading, contactsLoading }: Props) {
  // Finance aggregates
  const totalNet       = plans.reduce((s, p) => s + parseFloat(String(p.net_amount)), 0)
  const totalPaid      = plans.reduce((s, p) => s + parseFloat(String(p.paid_amount)), 0)
  const totalRemaining = plans.reduce((s, p) => s + parseFloat(String(p.remaining_amount)), 0)
  const hasOverdue     = plans.some(p => p.payment_status === 'overdue')

  return (
    <div style={{ fontFamily: "'Barlow', sans-serif" }}>

      {/* ── FINANCE ──────────────────────────────────────── */}
      <SidebarCard title="Tài chính">
        {plansLoading ? <Skeleton active paragraph={{ rows: 3 }} /> : (
          plans.length === 0 ? (
            <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>Chưa có kế hoạch thanh toán</Text>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                <div>
                  <div style={{
                    fontSize: 24, fontWeight: 800, lineHeight: 1,
                    color: totalRemaining > 0 ? '#ff4d4f' : '#52c41a',
                    fontFamily: "'Barlow Condensed', sans-serif",
                  }}>
                    {fmt(totalRemaining)}
                  </div>
                  <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)' }}>còn lại</Text>
                </div>
                {hasOverdue && <Tag color="error" style={{ fontSize: 10 }}>Quá hạn</Tag>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>Thực thu</Text>
                  <Text style={{ fontSize: 12, fontWeight: 600 }}>{fmt(totalNet)}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>Đã đóng</Text>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#52c41a' }}>{fmt(totalPaid)}</Text>
                </div>
              </div>

              <div style={{ marginTop: 12, borderTop: '1px solid var(--mgt-border)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {plans.map(p => {
                  const s = PLAN_STATUS[p.payment_status] ?? { color: 'default', label: p.payment_status }
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Tag color={s.color} style={{ fontSize: 10, marginRight: 4 }}>{s.label}</Tag>
                        {p.due_date && (
                          <Text style={{ fontSize: 10, color: 'var(--mgt-text-secondary)' }}>
                            {new Date(p.due_date).toLocaleDateString('vi-VN')}
                          </Text>
                        )}
                      </div>
                      <Text style={{ fontSize: 12, fontWeight: 600 }}>{fmt(p.remaining_amount)}</Text>
                    </div>
                  )
                })}
              </div>
            </>
          )
        )}
      </SidebarCard>

      {/* ── ENROLLMENTS MINI ─────────────────────────────── */}
      <SidebarCard title={`Lớp đã học · ${enrollments.length}`}>
        {enrollments.length === 0 ? (
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>Chưa đăng ký lớp</Text>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {enrollments.slice(0, 5).map(e => {
              const lt = LEARN_STATUS[e.ly_thuyet_status] ?? { color: 'default', label: e.ly_thuyet_status }
              const th = LEARN_STATUS[e.thuc_hanh_status] ?? { color: 'default', label: e.thuc_hanh_status }
              return (
                <div key={e.id} style={{ borderBottom: '1px solid var(--mgt-border)', paddingBottom: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--mgt-text-primary)' }}>{e.lop_hoc.ten_lop}</Text>
                    {e.lop_hoc.course_type && <Tag color="blue" style={{ fontSize: 10, marginLeft: 4 }}>{e.lop_hoc.course_type.loai_bang_lai}</Tag>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--mgt-text-secondary)' }}>{e.lop_hoc.ma_lop}</Text>
                    <Tag color={CLASS_STATUS_COLOR[e.lop_hoc.trang_thai] ?? 'default'} style={{ fontSize: 10 }}>
                      {e.lop_hoc.trang_thai === 'in_progress' ? 'Đang học'
                        : e.lop_hoc.trang_thai === 'completed' ? 'Hoàn thành'
                        : e.lop_hoc.trang_thai === 'upcoming' ? 'Sắp khai giảng'
                        : e.lop_hoc.trang_thai === 'enrolling' ? 'Đang tuyển sinh'
                        : 'Đã hủy'}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                    <Tag color={lt.color} style={{ fontSize: 10 }}>LT: {lt.label}</Tag>
                    <Tag color={th.color} style={{ fontSize: 10 }}>TH: {th.label}</Tag>
                  </div>
                </div>
              )
            })}
            {enrollments.length > 5 && (
              <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)' }}>+{enrollments.length - 5} lớp khác</Text>
            )}
          </div>
        )}
      </SidebarCard>

      {/* ── CONTACTS ─────────────────────────────────────── */}
      <SidebarCard title="Liên hệ">
        {/* Student's own contacts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PhoneOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }} />
            <Text style={{ fontSize: 13, fontWeight: 600 }}>{student.so_dien_thoai}</Text>
          </div>
          {student.zalo_number && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WechatOutlined style={{ color: '#07c160', fontSize: 12 }} />
              <Text style={{ fontSize: 13 }}>{student.zalo_number}</Text>
            </div>
          )}
          {student.dia_chi_email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MailOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }} />
              <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>{student.dia_chi_email}</Text>
            </div>
          )}
        </div>

        {/* Emergency contact (inline on student) */}
        {student.ho_ten_nguoi_than && (
          <div style={{ borderTop: '1px solid var(--mgt-border)', paddingTop: 8, marginBottom: 8 }}>
            <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)', display: 'block', marginBottom: 4 }}>
              Người thân{student.quan_he ? ` · ${student.quan_he}` : ''}
            </Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }} />
              <Text style={{ fontSize: 13, fontWeight: 600 }}>{student.ho_ten_nguoi_than}</Text>
            </div>
            {student.sdt_nguoi_than && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <PhoneOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }} />
                <Text style={{ fontSize: 13 }}>{student.sdt_nguoi_than}</Text>
              </div>
            )}
          </div>
        )}

        {/* Additional contacts */}
        {contactsLoading ? <Skeleton active paragraph={{ rows: 1 }} /> : (
          contacts.length > 0 && (
            <div style={{ borderTop: '1px solid var(--mgt-border)', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {contacts.map(c => (
                <div key={c.id}>
                  <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)', display: 'block' }}>
                    {c.contact_name ?? 'Liên hệ'}{c.relation ? ` · ${c.relation}` : ''}{c.is_primary ? ' · Chính' : ''}
                  </Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <PhoneOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }} />
                    <Text style={{ fontSize: 13 }}>{c.phone}</Text>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </SidebarCard>

    </div>
  )
}
