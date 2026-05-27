import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button, Spin, Tag, Typography } from 'antd'
import { ArrowLeftOutlined, FilePdfOutlined } from '@ant-design/icons'
import { studentsApi } from '@/api/students'
import StudentDetailContent from './StudentDetailContent'

const { Title, Text } = Typography

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
          <StudentDetailContent
            activeTab={activeTab}
            studentId={id!}
            student={student}
            enrollments={enrollments}
            enrollmentsLoading={enrollmentsLoading}
            paymentPlans={plans}
            plansLoading={plansLoading}
            contacts={contacts}
            contactsLoading={contactsLoading}
            payments={payments}
            paymentsLoading={paymentsLoading}
          />
        </div>

      </div>
    </div>
  )
}

export default StudentDetailPage
