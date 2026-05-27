import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button, Descriptions, Drawer, Spin, Tooltip } from 'antd'
import { EditOutlined, PhoneOutlined, WarningOutlined } from '@ant-design/icons'
import { studentsApi } from '@/api/students'
import StudentImageSection from './StudentImageSection'
import type { Student } from '@/types'
import dayjs from 'dayjs'

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--neon-amber)', active: 'var(--neon-lime)',
  suspended: 'var(--neon-pink)', completed: 'var(--neon-cyan)', dropped: 'var(--fg-4)',
}
const STATUS_BG: Record<string, string> = {
  pending: 'rgba(255,176,32,0.12)', active: 'rgba(182,255,60,0.10)',
  suspended: 'rgba(255,61,138,0.12)', completed: 'rgba(0,229,255,0.10)', dropped: 'rgba(255,255,255,0.06)',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt', active: 'Đang học', suspended: 'Tạm dừng', completed: 'Hoàn thành', dropped: 'Nghỉ học',
}
const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' }
const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook', walk_in: 'Đến trực tiếp', referral: 'Giới thiệu',
  zalo: 'Zalo', chatbot: 'Chatbot', other: 'Khác',
}

function computeMissing(s: Student): string[] {
  return [
    !s.cccd_number && 'Số CCCD',
    !s.anh_the_url && 'Ảnh thẻ',
    !s.cmnd_front_url && 'Ảnh CCCD',
    !s.health_cert_expiry && 'GKSK',
    s.health_cert_expiry && dayjs(s.health_cert_expiry).isBefore(dayjs()) && 'GKSK hết hạn',
    !s.ho_ten_nguoi_than && 'Người thân',
    !s.dia_chi && 'Địa chỉ',
  ].filter(Boolean) as string[]
}

const Chip = ({ label, color, bg, border }: { label: string; color: string; bg: string; border: string }) => (
  <div style={{
    display: 'inline-flex', alignItems: 'center',
    background: bg, border: `1px solid ${border}`, borderRadius: 8,
    padding: '3px 10px', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color,
  }}>
    {label}
  </div>
)

interface Props {
  studentId: string | null
  onClose: () => void
}

const StudentDetailDrawer: React.FC<Props> = ({ studentId, onClose }) => {
  const { data: student, isLoading } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentsApi.get(studentId!).then(r => r.data),
    enabled: !!studentId,
  })

  const missing = student ? computeMissing(student) : []

  return (
    <Drawer
      open={!!studentId}
      onClose={onClose}
      width={window.innerWidth < 768 ? '100%' : 560}
      title={
        isLoading || !student ? (
          <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-ui)' }}>Đang tải...</span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--fg-1)', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>
              {student.ten_hoc_vien}
            </span>
            <span style={{ color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              #{student.ma_hoc_vien}
            </span>
          </div>
        )
      }
      extra={
        studentId && (
          <Link to={`/students/${studentId}`}>
            <Button icon={<EditOutlined />} type="primary" size="small">Chi tiết</Button>
          </Link>
        )
      }
      styles={{
        header: { background: 'var(--ink-2)', borderBottom: '1px solid var(--glass-stroke)' },
        body: { background: 'var(--ink-1)', padding: '20px 24px' },
      }}
    >
      {isLoading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}

      {!isLoading && student && (
        <>
          {/* Status chips */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <Chip label={STATUS_LABEL[student.trang_thai]} color={STATUS_COLOR[student.trang_thai]} bg={STATUS_BG[student.trang_thai]} border={STATUS_COLOR[student.trang_thai] + '40'} />
            <Chip label={student.loai_bang_lai} color="var(--fg-2)" bg="var(--glass-2)" border="var(--glass-stroke)" />
            {student.is_repeat_student && <Chip label={`Tái đăng ký ×${student.repeat_count}`} color="var(--neon-violet)" bg="rgba(139,108,255,0.10)" border="rgba(139,108,255,0.30)" />}
          </div>

          {/* Missing info warning */}
          {missing.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16,
              background: 'rgba(255,176,32,0.08)', border: '1px solid rgba(255,176,32,0.22)',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <WarningOutlined style={{ color: 'var(--neon-amber)', fontSize: 14, marginTop: 1, flexShrink: 0 }} />
              <div>
                <div style={{ color: 'var(--neon-amber)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-ui)', marginBottom: 6 }}>
                  Thiếu {missing.length} thông tin quan trọng
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {missing.map(f => (
                    <span key={f} style={{
                      background: 'rgba(255,176,32,0.14)', border: '1px solid rgba(255,176,32,0.28)',
                      borderRadius: 5, padding: '1px 8px', fontSize: 11,
                      color: 'var(--neon-amber)', fontFamily: 'var(--font-mono)', fontWeight: 600,
                    }}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Contact quick actions */}
          {student.so_dien_thoai && (
            <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
              <a href={`tel:${student.so_dien_thoai}`}>
                <Button size="small" icon={<PhoneOutlined />}>{student.so_dien_thoai}</Button>
              </a>
              {student.zalo_number && (
                <a href={`https://zalo.me/${student.zalo_number}`} target="_blank" rel="noreferrer">
                  <Button size="small">Zalo</Button>
                </a>
              )}
            </div>
          )}

          {/* Details */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 16 }}>
            <Descriptions
              column={2}
              size="small"
              labelStyle={{ color: 'var(--fg-3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
              contentStyle={{ color: 'var(--fg-1)', fontWeight: 500, fontSize: 13, fontFamily: 'var(--font-ui)' }}
            >
              <Descriptions.Item label="Ngày sinh">{dayjs(student.ngay_sinh).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{GENDER_LABEL[student.gioi_tinh] ?? student.gioi_tinh}</Descriptions.Item>
              <Descriptions.Item label="CCCD">
                {student.cccd_number
                  ? <span style={{ fontFamily: 'var(--font-mono)' }}>{student.cccd_number}</span>
                  : <span style={{ color: 'var(--neon-amber)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>Chưa có</span>
                }
              </Descriptions.Item>
              <Descriptions.Item label="Email">{student.dia_chi_email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>
                {[student.dia_chi, student.phuong_xa, student.quan_huyen, student.tinh_thanh].filter(Boolean).join(', ')
                  || <span style={{ color: 'var(--neon-amber)', fontSize: 11 }}>Chưa có</span>}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày đăng ký">{dayjs(student.created_at).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Nguồn">{SOURCE_LABEL[student.lead_source ?? ''] ?? student.lead_source ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="GKSK đến">
                {student.health_cert_expiry
                  ? <span style={{ fontFamily: 'var(--font-mono)', color: dayjs(student.health_cert_expiry).isBefore(dayjs()) ? 'var(--neon-pink)' : 'var(--fg-1)' }}>
                      {dayjs(student.health_cert_expiry).format('DD/MM/YYYY')}
                    </span>
                  : <span style={{ color: 'var(--neon-amber)', fontSize: 11 }}>Chưa có</span>
                }
              </Descriptions.Item>
              <Descriptions.Item label="Người thân">
                {student.ho_ten_nguoi_than
                  ? `${student.ho_ten_nguoi_than}${student.sdt_nguoi_than ? ' · ' + student.sdt_nguoi_than : ''}`
                  : <span style={{ color: 'var(--neon-amber)', fontSize: 11 }}>Chưa có</span>
                }
              </Descriptions.Item>
              {student.zalo_number && <Descriptions.Item label="Zalo">{student.zalo_number}</Descriptions.Item>}
              {student.ghi_chu && <Descriptions.Item label="Ghi chú" span={2}>{student.ghi_chu}</Descriptions.Item>}
            </Descriptions>
          </div>

          <StudentImageSection
            studentId={studentId!}
            portraitUrl={student.anh_the_url}
            cccdFrontUrl={student.cmnd_front_url}
            cccdBackUrl={student.cmnd_back_url}
          />
        </>
      )}
    </Drawer>
  )
}

export default StudentDetailDrawer
