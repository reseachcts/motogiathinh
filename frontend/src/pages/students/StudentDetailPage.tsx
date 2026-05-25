import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Button, Descriptions, Progress, Skeleton, Spin, Table, Tag, Typography,
} from 'antd'
import {
  ArrowLeftOutlined, FilePdfOutlined,
  MailOutlined, PhoneOutlined, UserOutlined, WechatOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { studentsApi, type EnrollmentOut } from '@/api/students'
import type { PaymentOut, PaymentPlan, PaymentStatus } from '@/types'
import StudentImageSection from './StudentImageSection'

const { Title, Text } = Typography

// ── Constants ───────────────────────────────────────────────────────────────

type TabKey = 'thong_tin' | 'lien_he' | 'lop_hoc' | 'diem_mon' | 'diem_danh' | 'hoc_phi' | 'thanh_toan' | 'lich_su'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'thong_tin', label: 'Thông tin' },
  { key: 'lien_he',   label: 'Liên hệ' },
  { key: 'lop_hoc',   label: 'Lớp học' },
  { key: 'diem_mon',  label: 'Điểm môn học' },
  { key: 'diem_danh', label: 'Điểm danh' },
  { key: 'hoc_phi',   label: 'Học Phí' },
  { key: 'thanh_toan',label: 'Thanh Toán' },
  { key: 'lich_su',   label: 'Lịch sử số dư' },
]

const STATUS_COLOR: Record<string, string> = {
  pending: 'gold', active: 'green', suspended: 'red', completed: 'blue', dropped: 'default',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt', active: 'Đang học', suspended: 'Tạm dừng', completed: 'Hoàn thành', dropped: 'Nghỉ học',
}
const LEARN_STATUS: Record<string, { color: string; label: string }> = {
  not_started: { color: 'default', label: 'Chưa học' },
  passed:      { color: 'success', label: 'Đạt' },
  failed:      { color: 'error',   label: 'Không đạt' },
}
const CLASS_STATUS_LABEL: Record<string, string> = {
  upcoming: 'Sắp khai giảng', enrolling: 'Đang tuyển sinh',
  in_progress: 'Đang học', completed: 'Hoàn thành', cancelled: 'Đã hủy',
}
const METHOD_LABEL: Record<string, string> = {
  cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', momo: 'MoMo', zalopay: 'ZaloPay',
}

const PLAN_STATUS: Record<PaymentStatus, { color: string; label: string }> = {
  pending:  { color: 'gold',    label: 'Chờ đóng' },
  partial:  { color: 'orange',  label: 'Còn thiếu' },
  paid:     { color: 'success', label: 'Đã đóng' },
  overdue:  { color: 'error',   label: 'Quá hạn' },
  waived:   { color: 'purple',  label: 'Miễn giảm' },
  refunded: { color: 'default', label: 'Hoàn tiền' },
}

const fmt = (v: number | string) =>
  Math.round(parseFloat(String(v))).toLocaleString('vi-VN') + 'đ'

// ── Sub-components ───────────────────────────────────────────────────────────

const enrollmentColumns = [
  {
    title: 'Lớp học',
    key: 'lop',
    render: (_: unknown, row: EnrollmentOut) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--mgt-text-primary)' }}>{row.lop_hoc.ten_lop}</div>
        <Text style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--mgt-text-secondary)' }}>{row.lop_hoc.ma_lop}</Text>
      </div>
    ),
  },
  {
    title: 'Khóa học',
    key: 'khoa',
    width: 90,
    render: (_: unknown, row: EnrollmentOut) => row.lop_hoc.course_type
      ? <Tag color="blue">{row.lop_hoc.course_type.loai_bang_lai}</Tag>
      : <Text style={{ color: 'var(--mgt-text-secondary)' }}>—</Text>,
  },
  {
    title: 'Trạng thái',
    key: 'trang_thai_lop',
    width: 130,
    render: (_: unknown, row: EnrollmentOut) => (
      <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>
        {CLASS_STATUS_LABEL[row.lop_hoc.trang_thai] ?? row.lop_hoc.trang_thai}
      </Text>
    ),
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
    width: 100,
    render: (v: string) => { const s = LEARN_STATUS[v] ?? { color: 'default', label: v }; return <Tag color={s.color}>{s.label}</Tag> },
  },
  {
    title: 'Thực hành',
    dataIndex: 'thuc_hanh_status',
    width: 100,
    render: (v: string) => { const s = LEARN_STATUS[v] ?? { color: 'default', label: v }; return <Tag color={s.color}>{s.label}</Tag> },
  },
  {
    title: 'Tiến độ',
    dataIndex: 'overall_progress',
    width: 110,
    render: (v: number) => <Progress percent={v} size="small" strokeColor="var(--mgt-accent-primary)" />,
  },
  {
    title: 'Hoàn thành',
    dataIndex: 'completion_date',
    width: 110,
    render: (v: string | null) => v
      ? <Text style={{ fontSize: 12, color: 'var(--mgt-accent-primary)', fontWeight: 600 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      : <Text style={{ color: 'var(--mgt-text-secondary)' }}>—</Text>,
  },
]

const ComingSoon = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: 200, color: 'var(--mgt-text-secondary)',
  }}>
    <div style={{ fontSize: 32, marginBottom: 8 }}>🚧</div>
    <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 14 }}>Tính năng đang phát triển</Text>
  </div>
)

// ── Main page ────────────────────────────────────────────────────────────────

const StudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabKey>('thong_tin')
  const [exporting, setExporting] = useState(false)

  const { data: student, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(id!).then(r => r.data),
    enabled: !!id,
  })
  const { data: enrollments = [], isLoading: enrollmentsLoading } = useQuery({
    queryKey: ['student-enrollments', id],
    queryFn: () => studentsApi.getEnrollments(id!).then(r => r.data),
    enabled: !!id,
  })
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['student-payment-plans', id],
    queryFn: () => studentsApi.getPaymentPlans(id!).then(r => r.data),
    enabled: !!id,
  })
  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['student-contacts', id],
    queryFn: () => studentsApi.getContacts(id!).then(r => r.data),
    enabled: !!id,
  })
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['student-payments', id],
    queryFn: () => studentsApi.getPayments(id!).then(r => r.data),
    enabled: !!id,
  })

  const handleExportPdf = async () => {
    if (!id || !student) return
    setExporting(true)
    try {
      const res = await studentsApi.getResumePdf(id)
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `hoso-${student.ma_hoc_vien}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}><Spin size="large" /></div>
  if (!student) return <div style={{ padding: 40, color: 'var(--mgt-text-secondary)' }}>Không tìm thấy học viên.</div>

  // Finance aggregates
  const totalNet       = plans.reduce((s, p) => s + parseFloat(String(p.net_amount)), 0)
  const totalPaid      = plans.reduce((s, p) => s + parseFloat(String(p.paid_amount)), 0)
  const totalRemaining = plans.reduce((s, p) => s + parseFloat(String(p.remaining_amount)), 0)
  const hasOverdue     = plans.some(p => p.payment_status === 'overdue')

  // ── Tab content ────────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeTab) {

      case 'thong_tin':
        return (
          <div>
            <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <Descriptions
                column={{ xs: 1, sm: 2, md: 3 }}
                labelStyle={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}
                contentStyle={{ color: 'var(--mgt-text-primary)', fontWeight: 500 }}
                size="small"
              >
                <Descriptions.Item label="Ngày sinh">{dayjs(student.ngay_sinh).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Giới tính">
                  {student.gioi_tinh === 'male' ? 'Nam' : student.gioi_tinh === 'female' ? 'Nữ' : 'Khác'}
                </Descriptions.Item>
                <Descriptions.Item label="Ngày đăng ký">{dayjs(student.ngay_dang_ky).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="CCCD">{student.cccd_number ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Ngày cấp">{student.cccd_issued_date ? dayjs(student.cccd_issued_date).format('DD/MM/YYYY') : '—'}</Descriptions.Item>
                <Descriptions.Item label="Nơi cấp">{student.cccd_issued_place ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">{student.so_dien_thoai}</Descriptions.Item>
                <Descriptions.Item label="Email">{student.dia_chi_email ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Zalo">{student.zalo_number ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Địa chỉ" span={3}>
                  {[student.dia_chi, student.phuong_xa, student.quan_huyen, student.tinh_thanh].filter(Boolean).join(', ') || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Nguồn">{student.lead_source ?? '—'}</Descriptions.Item>
                <Descriptions.Item label="Sức khoẻ đến">{student.health_cert_expiry ? dayjs(student.health_cert_expiry).format('DD/MM/YYYY') : '—'}</Descriptions.Item>
                {student.ghi_chu && <Descriptions.Item label="Ghi chú" span={3}>{student.ghi_chu}</Descriptions.Item>}
              </Descriptions>
            </div>
            <StudentImageSection
              studentId={id!}
              portraitUrl={student.anh_the_url}
              cccdFrontUrl={student.cmnd_front_url}
              cccdBackUrl={student.cmnd_back_url}
            />
          </div>
        )

      case 'lien_he':
        return (
          <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--mgt-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>
              Học viên
            </Text>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <PhoneOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 14 }} />
                <Text style={{ fontSize: 14, fontWeight: 600 }}>{student.so_dien_thoai}</Text>
              </div>
              {student.zalo_number && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <WechatOutlined style={{ color: '#07c160', fontSize: 14 }} />
                  <Text style={{ fontSize: 14 }}>{student.zalo_number}</Text>
                  <Tag style={{ fontSize: 10 }}>Zalo</Tag>
                </div>
              )}
              {student.dia_chi_email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MailOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 14 }} />
                  <Text style={{ fontSize: 13, color: 'var(--mgt-text-secondary)' }}>{student.dia_chi_email}</Text>
                </div>
              )}
            </div>

            {(student.ho_ten_nguoi_than || contacts.length > 0) && (
              <>
                <div style={{ borderTop: '1px solid var(--mgt-border)', paddingTop: 16, marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--mgt-text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: 12, fontFamily: "'Barlow Condensed', sans-serif" }}>
                    Người thân / Liên hệ khẩn cấp
                  </Text>
                </div>
                {student.ho_ten_nguoi_than && (
                  <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--mgt-border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <UserOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }} />
                      <Text style={{ fontSize: 14, fontWeight: 600 }}>{student.ho_ten_nguoi_than}</Text>
                      {student.quan_he && <Tag style={{ fontSize: 10 }}>{student.quan_he}</Tag>}
                    </div>
                    {student.sdt_nguoi_than && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PhoneOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }} />
                        <Text style={{ fontSize: 14 }}>{student.sdt_nguoi_than}</Text>
                      </div>
                    )}
                  </div>
                )}
                {contactsLoading ? <Skeleton active paragraph={{ rows: 2 }} /> : (
                  contacts.map(c => (
                    <div key={c.id} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <UserOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }} />
                        <Text style={{ fontSize: 14, fontWeight: 600 }}>{c.contact_name ?? 'Liên hệ'}</Text>
                        {c.relation && <Tag style={{ fontSize: 10 }}>{c.relation}</Tag>}
                        {c.is_primary && <Tag color="blue" style={{ fontSize: 10 }}>Chính</Tag>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 21 }}>
                        <PhoneOutlined style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }} />
                        <Text style={{ fontSize: 14 }}>{c.phone}</Text>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )

      case 'lop_hoc':
        return (
          <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, overflow: 'hidden' }}>
            <Table
              dataSource={enrollments}
              columns={enrollmentColumns}
              rowKey="id"
              loading={enrollmentsLoading}
              size="small"
              scroll={{ x: 800 }}
              pagination={false}
              locale={{ emptyText: 'Chưa đăng ký lớp nào' }}
            />
          </div>
        )

      case 'hoc_phi':
        return (
          <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, padding: 20 }}>
            {plansLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : plans.length === 0 ? (
              <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>Chưa có kế hoạch thanh toán</Text>
            ) : (
              <>
                {/* Summary */}
                <div style={{ display: 'flex', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div>
                    <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)', display: 'block', marginBottom: 2 }}>Còn lại</Text>
                    <Text style={{ fontSize: 28, fontWeight: 800, color: totalRemaining > 0 ? '#ff4d4f' : '#52c41a', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {fmt(totalRemaining)}
                    </Text>
                  </div>
                  <div>
                    <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)', display: 'block', marginBottom: 2 }}>Thực thu</Text>
                    <Text style={{ fontSize: 22, fontWeight: 700, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {fmt(totalNet)}
                    </Text>
                  </div>
                  <div>
                    <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)', display: 'block', marginBottom: 2 }}>Đã đóng</Text>
                    <Text style={{ fontSize: 22, fontWeight: 700, color: '#52c41a', fontFamily: "'Barlow Condensed', sans-serif" }}>
                      {fmt(totalPaid)}
                    </Text>
                  </div>
                  {hasOverdue && <Tag color="error" style={{ alignSelf: 'center' }}>Quá hạn</Tag>}
                </div>

                {/* Plan list */}
                <div style={{ borderTop: '1px solid var(--mgt-border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {plans.map((p: PaymentPlan) => {
                    const s = PLAN_STATUS[p.payment_status] ?? { color: 'default', label: p.payment_status }
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--mgt-bg-hover)', borderRadius: 8 }}>
                        <div>
                          <Tag color={s.color} style={{ marginBottom: 4 }}>{s.label}</Tag>
                          {p.due_date && (
                            <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)', display: 'block' }}>
                              Hạn: {new Date(p.due_date).toLocaleDateString('vi-VN')}
                            </Text>
                          )}
                          {parseFloat(String(p.discount_amount)) > 0 && (
                            <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)', display: 'block' }}>
                              Giảm: {fmt(p.discount_amount)}
                            </Text>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <Text style={{ fontSize: 15, fontWeight: 700, display: 'block' }}>{fmt(p.net_amount)}</Text>
                          <Text style={{ fontSize: 12, color: '#52c41a', display: 'block' }}>Đã đóng: {fmt(p.paid_amount)}</Text>
                          {parseFloat(String(p.remaining_amount)) > 0 && (
                            <Text style={{ fontSize: 12, color: '#ff4d4f', display: 'block' }}>Còn: {fmt(p.remaining_amount)}</Text>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )

      case 'thanh_toan':
        return (
          <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, padding: 20 }}>
            {paymentsLoading ? <Skeleton active paragraph={{ rows: 5 }} /> : payments.length === 0 ? (
              <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>Chưa có giao dịch nào</Text>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--mgt-text-secondary)', textTransform: 'uppercase', fontFamily: "'Barlow Condensed', sans-serif" }}>
                    {payments.length} giao dịch
                  </Text>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(payments as PaymentOut[]).map(p => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 14px', background: 'var(--mgt-bg-hover)', borderRadius: 8 }}>
                      <div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <Tag color="blue" style={{ fontSize: 11 }}>{METHOD_LABEL[p.phuong_thuc] ?? p.phuong_thuc}</Tag>
                          {p.so_bien_lai && <Tag style={{ fontSize: 11 }}>Biên lai: {p.so_bien_lai}</Tag>}
                        </div>
                        <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)', display: 'block' }}>
                          {dayjs(p.collected_at).format('DD/MM/YYYY HH:mm')}
                        </Text>
                        <Text style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--mgt-text-secondary)' }}>
                          {p.ma_giao_dich}
                        </Text>
                        {p.ghi_chu && <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)', display: 'block', marginTop: 2 }}>{p.ghi_chu}</Text>}
                      </div>
                      <Text style={{ fontSize: 16, fontWeight: 700, color: '#52c41a', fontFamily: "'Barlow Condensed', sans-serif", whiteSpace: 'nowrap' }}>
                        +{fmt(p.so_tien)}
                      </Text>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )

      default:
        return <ComingSoon />
    }
  }

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)', fontFamily: "'Barlow', sans-serif", minHeight: '100vh' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');`}</style>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ background: 'var(--mgt-bg-container)', border: '1px solid var(--mgt-border-strong)', color: 'var(--mgt-text-primary)' }}>
          Quay lại
        </Button>
        <Button icon={<FilePdfOutlined />} loading={exporting} onClick={handleExportPdf} style={{ background: 'var(--mgt-tag-red-bg, #fff2f0)', borderColor: '#ffa39e', color: '#cf1322' }}>
          Xuất hồ sơ PDF
        </Button>
      </div>

      {/* ── Student header ──────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <Title level={3} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>
          {student.ten_hoc_vien}
        </Title>
        <Text style={{ color: 'var(--mgt-text-secondary)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18 }}>
          #{student.ma_hoc_vien}
        </Text>
        <Tag color={STATUS_COLOR[student.trang_thai]}>{STATUS_LABEL[student.trang_thai]}</Tag>
        <Tag style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700 }}>{student.loai_bang_lai}</Tag>
        {student.is_repeat_student && <Tag color="purple">Tái đăng ký ({student.repeat_count}x)</Tag>}
      </div>

      {/* ── Body: left nav + content ─────────────────────────────── */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>

        {/* Left tab nav */}
        <div style={{
          width: 160, flexShrink: 0,
          background: 'var(--mgt-gradient-card)',
          border: '1px solid var(--mgt-border)',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'sticky',
          top: 16,
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: '1px solid var(--mgt-border)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'var(--mgt-accent-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--mgt-text-primary)',
                  transition: 'background 0.15s, color 0.15s',
                  fontFamily: "'Barlow', sans-serif",
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content area */}
        <div style={{ flex: 1, minWidth: 0, paddingLeft: 16 }}>
          {renderContent()}
        </div>

      </div>
    </div>
  )
}

export default StudentDetailPage
