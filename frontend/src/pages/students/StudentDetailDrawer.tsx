import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Button, Descriptions, Drawer, Spin, Tag, Typography } from 'antd'
import { EditOutlined, PhoneOutlined } from '@ant-design/icons'
import { studentsApi } from '@/api/students'
import StudentImageSection from './StudentImageSection'
import type { Student } from '@/types'
import dayjs from 'dayjs'

const { Text } = Typography

const STATUS_COLOR: Record<string, string> = {
  pending: 'gold', active: 'green', suspended: 'red', completed: 'blue', dropped: 'default',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ duyệt', active: 'Đang học', suspended: 'Tạm dừng', completed: 'Hoàn thành', dropped: 'Nghỉ học',
}
const GENDER_LABEL: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' }
const SOURCE_LABEL: Record<string, string> = {
  facebook: 'Facebook', walk_in: 'Đến trực tiếp', referral: 'Giới thiệu',
  zalo: 'Zalo', chatbot: 'Chatbot', other: 'Khác',
}

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

  return (
    <Drawer
      open={!!studentId}
      onClose={onClose}
      width={window.innerWidth < 768 ? '100%' : 560}
      title={
        isLoading || !student ? (
          <Text style={{ color: 'var(--mgt-text-secondary)' }}>Đang tải...</Text>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800 }}>
              {student.ten_hoc_vien}
            </span>
            <Text style={{ color: 'var(--mgt-text-secondary)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15 }}>
              #{student.ma_hoc_vien}
            </Text>
          </div>
        )
      }
      extra={
        studentId && (
          <Link to={`/students/${studentId}`}>
            <Button icon={<EditOutlined />} type="primary" size="small"
              style={{ background: 'linear-gradient(135deg, #1677ff, #0958d9)', border: 'none' }}>
              Chi tiết
            </Button>
          </Link>
        )
      }
      styles={{
        header: { background: 'var(--mgt-bg-container)', borderBottom: '1px solid var(--mgt-border)' },
        body: { background: 'var(--mgt-bg-base)', padding: '20px 24px' },
      }}
    >
      {isLoading && <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>}

      {!isLoading && student && (
        <>
          {/* Status badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <Tag color={STATUS_COLOR[student.trang_thai]}>{STATUS_LABEL[student.trang_thai]}</Tag>
            <Tag style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700 }}>{student.loai_bang_lai}</Tag>
            {student.is_repeat_student && <Tag color="purple">Tái đăng ký ({student.repeat_count}x)</Tag>}
          </div>

          {/* Contact quick actions */}
          {student.so_dien_thoai && (
            <div style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
              <a href={`tel:${student.so_dien_thoai}`}>
                <Button size="small" icon={<PhoneOutlined />}
                  style={{ background: 'var(--mgt-tag-green-bg)', borderColor: 'var(--mgt-tag-green-border)', color: 'var(--mgt-tag-green-text)' }}>
                  {student.so_dien_thoai}
                </Button>
              </a>
              {student.zalo_number && (
                <a href={`https://zalo.me/${student.zalo_number}`} target="_blank" rel="noreferrer">
                  <Button size="small" style={{ background: 'var(--mgt-tag-blue-bg)', borderColor: 'var(--mgt-tag-blue-border)', color: 'var(--mgt-tag-blue-text)' }}>
                    Zalo
                  </Button>
                </a>
              )}
            </div>
          )}

          {/* Details */}
          <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 12, padding: 20 }}>
            <Descriptions
              column={2}
              size="small"
              labelStyle={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }}
              contentStyle={{ color: 'var(--mgt-text-primary)', fontWeight: 500, fontSize: 13 }}
            >
              <Descriptions.Item label="Ngày sinh">{dayjs(student.ngay_sinh).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{GENDER_LABEL[student.gioi_tinh] ?? student.gioi_tinh}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{student.cccd_number ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Email">{student.dia_chi_email ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>
                {[student.dia_chi, student.phuong_xa, student.quan_huyen, student.tinh_thanh].filter(Boolean).join(', ') || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Ngày đăng ký">{dayjs(student.created_at).format('DD/MM/YYYY')}</Descriptions.Item>
              <Descriptions.Item label="Nguồn">{SOURCE_LABEL[student.lead_source ?? ''] ?? student.lead_source ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Sức khoẻ đến">
                {student.health_cert_expiry ? dayjs(student.health_cert_expiry).format('DD/MM/YYYY') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Zalo">{student.zalo_number ?? '—'}</Descriptions.Item>
              {student.ghi_chu && (
                <Descriptions.Item label="Ghi chú" span={2}>{student.ghi_chu}</Descriptions.Item>
              )}
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
