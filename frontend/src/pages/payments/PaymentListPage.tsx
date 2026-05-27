import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Form, Input, InputNumber, Modal, Select, Tooltip } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import { paymentsApi, type PaymentPlanRich } from '@/api/payments'
import { reportsApi } from '@/api/reports'
import { useAuthStore } from '@/store/authStore'
import type { PaymentStatus } from '@/types'
import dayjs from 'dayjs'

const COLS = '1.6fr 140px 130px 130px 1fr 78px'

const STATUS_COLOR: Record<string, string> = {
  pending: '#FFB020', partial: '#FFB020', paid: '#B6FF3C',
  overdue: '#FF3D8A', waived: '#00E5FF', refunded: '#8B6CFF',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Chưa thanh toán', partial: 'Đóng 50%', paid: 'Đã đóng đủ',
  overdue: 'Quá hạn', waived: 'Miễn giảm', refunded: 'Hoàn tiền',
}

function initials(name: string) {
  return name.split(' ').slice(-2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const colors = ['#00E5FF', '#B6FF3C', '#FF3D8A', '#8B6CFF', '#FFB020']
  const color = name ? colors[name.charCodeAt(0) % colors.length] : '#4E5566'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `color-mix(in oklab, ${color} 20%, var(--ink-3))`,
      border: `1px solid color-mix(in oklab, ${color} 40%, transparent)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: size * 0.36, color,
    }}>
      {name ? initials(name) : '?'}
    </div>
  )
}

function PaymentPill({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? 'var(--fg-3)'
  const label = STATUS_LABEL[status] ?? status
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

function KpiCard({ label, value, hint, color }: { label: string; value: string; hint?: string; color: string }) {
  const c = `var(--neon-${color})`
  return (
    <div className="glass-card" style={{ padding: 22, flex: 1 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{label}</span>
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 28, lineHeight: 1,
          letterSpacing: '-0.03em', color: c, fontVariantNumeric: 'tabular-nums',
          textShadow: `0 0 24px color-mix(in oklab, ${c} 30%, transparent)`,
        }}>{value}</span>
        {hint && <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--fg-3)' }}>{hint}</span>}
      </div>
    </div>
  )
}

const fmtVND = (v: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)

const PaymentListPage: React.FC = () => {
  const queryClient = useQueryClient()
  const branchId = useAuthStore(s => s.branchId())
  const [showForm, setShowForm] = useState(false)
  const [form] = Form.useForm()
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', branchId],
    queryFn: () => reportsApi.getDashboard(branchId ?? undefined).then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans-list', branchId, page],
    queryFn: () => paymentsApi.listPlansRich({
      branch_id: branchId ?? undefined,
      status: 'partial,pending,overdue',
      page,
      page_size: 30,
    }).then(r => r.data),
    staleTime: 30_000,
  })

  const recordMutation = useMutation({
    mutationFn: (data: unknown) => paymentsApi.recordPayment(data as any),
    onSuccess: () => {
      toast.success('Ghi nhận thanh toán thành công!')
      queryClient.invalidateQueries({ queryKey: ['plans-list'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setShowForm(false)
      form.resetFields()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Lỗi ghi nhận'),
  })

  const partialCount = plans.filter(p => p.payment_status === 'partial').length
  const overdueCount = plans.filter(p => p.payment_status === 'overdue').length

  return (
    <div style={{ padding: '0 0 48px' }}>
      {/* Header */}
      <div style={{ padding: '24px clamp(16px,3vw,32px) 20px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>THANH TOÁN</span>
            <h1 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32, letterSpacing: '-0.025em', color: 'var(--fg-1)', lineHeight: 1.1 }}>
              Ghi nhận học phí
            </h1>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)} style={{ fontWeight: 600 }}>
            Ghi nhận thanh toán
          </Button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 clamp(16px,3vw,32px)' }}>
        {/* 3 KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <KpiCard label="Đã thu hôm nay" value={fmtVND(dashboard?.cash_today ?? 0)} color="lime" />
          <KpiCard label="Chờ đóng đợt 2" value={`${partialCount} học viên`} hint="Đã đóng 50%" color="amber" />
          <KpiCard label="Quá hạn" value={`${overdueCount} học viên`} hint="Quá hạn thanh toán" color="pink" />
        </div>

        {/* Payment plans grid */}
        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 700 }}>
          {/* Table header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '14px 22px', borderBottom: '1px solid var(--glass-stroke)',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              {plans.length} bản ghi
            </span>
            <div style={{ flex: 1 }} />
            <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)} style={{ fontWeight: 600 }}>
              Ghi nhận
            </Button>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: COLS,
            padding: '12px 22px', gap: 12,
            borderBottom: '1px solid var(--glass-stroke)',
            fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--fg-3)',
          }}>
            <span>Học viên</span>
            <span>Mã kế hoạch</span>
            <span style={{ textAlign: 'right' }}>Đã đóng</span>
            <span style={{ textAlign: 'right' }}>Còn lại</span>
            <span>Hạn</span>
            <span>Trạng thái</span>
          </div>

          {isLoading && (
            <div style={{ padding: '40px 22px', textAlign: 'center', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
              Đang tải...
            </div>
          )}

          {!isLoading && plans.length === 0 && (
            <div style={{ padding: '40px 22px', textAlign: 'center', color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontSize: 14 }}>
              Không có học phí cần xử lý
            </div>
          )}

          {plans.map((p: PaymentPlanRich, i: number) => (
            <div
              key={p.id}
              onMouseEnter={() => setHoverId(p.id)}
              onMouseLeave={() => setHoverId(null)}
              style={{
                display: 'grid', gridTemplateColumns: COLS,
                padding: '14px 22px', gap: 12, alignItems: 'center',
                borderBottom: i < plans.length - 1 ? '1px solid var(--glass-stroke)' : 'none',
                background: hoverId === p.id ? 'var(--glass-2)' : 'transparent',
                transition: 'background 140ms var(--ease-out)',
              }}
            >
              {/* Avatar + name + date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <Avatar name={p.ten_hoc_vien} size={30} />
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.ten_hoc_vien || 'Không rõ'}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', fontWeight: 600, flexShrink: 0 }}>
                      {p.ma_hoc_vien}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
                    {p.last_payment_at ? dayjs(p.last_payment_at).format('DD/MM/YYYY') : 'Chưa thu'}
                  </span>
                </div>
              </div>

              {/* Plan ID abbreviated */}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)', fontVariantNumeric: 'tabular-nums' }}>
                {p.id.slice(0, 8)}…
              </span>

              {/* Paid */}
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: 'var(--neon-lime)', fontWeight: 600 }}>
                {Number(p.paid_amount) > 0 ? fmtVND(Number(p.paid_amount)) : '—'}
              </span>

              {/* Remaining */}
              <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', fontSize: 13, color: Number(p.remaining_amount) > 0 ? 'var(--neon-pink)' : 'var(--fg-3)', fontWeight: 600 }}>
                {Number(p.remaining_amount) > 0 ? fmtVND(Number(p.remaining_amount)) : '—'}
              </span>

              {/* Due date */}
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: p.payment_status === 'overdue' ? 'var(--neon-pink)' : 'var(--fg-3)', fontVariantNumeric: 'tabular-nums' }}>
                {p.due_date ? dayjs(p.due_date).format('DD/MM/YYYY') : '—'}
              </span>

              {/* Status pill */}
              <PaymentPill status={p.payment_status} />
            </div>
          ))}
          </div>
        </div>

        {/* Simple prev/next pagination */}
        {plans.length === 30 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--glass-stroke)', background: 'transparent', color: page <= 1 ? 'var(--fg-4)' : 'var(--fg-2)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: page <= 1 ? 'default' : 'pointer' }}
            >
              ← Trước
            </button>
            <span style={{ padding: '6px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-3)' }}>
              Trang {page}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--glass-stroke)', background: 'transparent', color: 'var(--fg-2)', fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer' }}
            >
              Tiếp →
            </button>
          </div>
        )}
      </div>

      {/* Record payment modal */}
      <Modal
        open={showForm}
        title={<span style={{ color: 'var(--fg-1)', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Ghi nhận thanh toán</span>}
        onCancel={() => { setShowForm(false); form.resetFields() }}
        onOk={() => form.submit()}
        confirmLoading={recordMutation.isPending}
        okText="Lưu"
        styles={{ body: { background: 'var(--ink-1)' }, content: { background: 'var(--ink-1)', border: '1px solid var(--glass-stroke)' } }}
      >
        <Form form={form} layout="vertical" onFinish={v => recordMutation.mutate(v)} requiredMark={false}>
          <Form.Item name="payment_plan_id" label={<span style={{ color: 'var(--fg-3)' }}>Mã kế hoạch thanh toán *</span>} rules={[{ required: true }]}>
            <Input placeholder="UUID kế hoạch" style={{ background: 'var(--ink-0)', border: '1px solid var(--glass-stroke)', color: 'var(--fg-1)', borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="so_tien" label={<span style={{ color: 'var(--fg-3)' }}>Số tiền (đ) *</span>} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%', background: 'var(--ink-0)', border: '1px solid var(--glass-stroke)', color: 'var(--fg-1)', borderRadius: 8 }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
              placeholder="1.500.000" min={1000} />
          </Form.Item>
          <Form.Item name="phuong_thuc" label={<span style={{ color: 'var(--fg-3)' }}>Phương thức *</span>} rules={[{ required: true }]}>
            <Select options={[
              { label: 'Tiền mặt', value: 'cash' }, { label: 'Chuyển khoản', value: 'bank_transfer' },
              { label: 'MoMo', value: 'momo' }, { label: 'ZaloPay', value: 'zalopay' },
            ]} placeholder="Chọn phương thức" />
          </Form.Item>
          <Form.Item name="ghi_chu" label={<span style={{ color: 'var(--fg-3)' }}>Ghi chú</span>}>
            <Input.TextArea rows={2} style={{ background: 'var(--ink-0)', border: '1px solid var(--glass-stroke)', color: 'var(--fg-1)', borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PaymentListPage
