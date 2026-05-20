import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Col, DatePicker, Form, Input, Modal, Row, Select, Typography } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, WarningOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import { studentsApi } from '@/api/students'
import { useAuthStore } from '@/store/authStore'
import CccdUploadSection from './CccdUploadSection'

const { Title, Text } = Typography
const inputStyle = { background: 'var(--mgt-bg-base)', border: '1px solid var(--mgt-border-strong)', color: 'var(--mgt-text-primary)', borderRadius: 8 }
const labelStyle = { color: 'var(--mgt-text-secondary)' }

const StudentCreatePage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const branchId = useAuthStore(s => s.branchId())
  const [form] = Form.useForm()
  const [conflicts, setConflicts] = useState<any[]>([])
  const [showConflict, setShowConflict] = useState(false)
  const [pendingData, setPendingData] = useState<any>(null)
  const cccdFiles = useRef<{ front: File | null; back: File | null }>({ front: null, back: null })

  const createMutation = useMutation({
    mutationFn: ({ data, force }: { data: any; force: boolean }) =>
      studentsApi.create(data, force).then(r => r.data),
    onSuccess: async (result) => {
      if (result.conflict_detected) {
        setConflicts(result.conflicts ?? [])
        setShowConflict(true)
        return
      }
      if (result.student) {
        // Upload CCCD images to the new student profile
        const sid = result.student.id
        if (cccdFiles.current.front) {
          try { await studentsApi.uploadImage(sid, 'cccd_front', cccdFiles.current.front) } catch {}
        }
        if (cccdFiles.current.back) {
          try { await studentsApi.uploadImage(sid, 'cccd_back', cccdFiles.current.back) } catch {}
        }
        toast.success('Tạo học viên thành công!')
        queryClient.invalidateQueries({ queryKey: ['students'] })
        navigate(`/students/${sid}`)
      }
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Có lỗi xảy ra'),
  })

  const onFinish = (values: any) => {
    const data = {
      ...values,
      ngay_sinh: values.ngay_sinh?.format('YYYY-MM-DD'),
      cccd_issued_date: values.cccd_issued_date?.format('YYYY-MM-DD'),
      health_cert_expiry: values.health_cert_expiry?.format('YYYY-MM-DD'),
    }
    setPendingData(data)
    createMutation.mutate({ data, force: false })
  }

  const handleForceCreate = () => {
    if (pendingData) {
      createMutation.mutate({ data: pendingData, force: true })
      setShowConflict(false)
    }
  }

  return (
    <div style={{ padding: '16px clamp(16px, 3vw, 32px)', fontFamily: "'Barlow', sans-serif", maxWidth: 900 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');`}</style>

      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginBottom: 20, background: 'var(--mgt-bg-container)', border: '1px solid var(--mgt-border-strong)', color: 'var(--mgt-text-primary)' }}>
        Quay lại
      </Button>

      <Title level={3} style={{ color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, marginBottom: 24 }}>
        THÊM HỌC VIÊN MỚI
      </Title>

      {/* CCCD scan section */}
      <CccdUploadSection
        form={form}
        onFilesReady={(front, back) => { cccdFiles.current = { front, back } }}
      />

      <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, padding: '32px 28px' }}>
        <Form form={form} layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Title level={5} style={{ color: 'var(--mgt-text-secondary)', marginBottom: 16, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: 12 }}>
            Thông tin cá nhân
          </Title>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="ten_hoc_vien" label={<Text style={labelStyle}>Họ và tên *</Text>} rules={[{ required: true }]}>
                <Input placeholder="Nguyễn Văn A" style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="ngay_sinh" label={<Text style={labelStyle}>Ngày sinh *</Text>} rules={[{ required: true }]}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%', ...inputStyle }} placeholder="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="gioi_tinh" label={<Text style={labelStyle}>Giới tính *</Text>} rules={[{ required: true }]}>
                <Select options={[{ label: 'Nam', value: 'male' }, { label: 'Nữ', value: 'female' }, { label: 'Khác', value: 'other' }]} placeholder="Chọn" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="cccd_number" label={<Text style={labelStyle}>Số CCCD</Text>}>
                <Input placeholder="012345678901" style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="cccd_issued_date" label={<Text style={labelStyle}>Ngày cấp CCCD</Text>}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%', ...inputStyle }} placeholder="DD/MM/YYYY" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="cccd_issued_place" label={<Text style={labelStyle}>Nơi cấp</Text>}>
                <Input placeholder="Cục CS QLHC" style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="so_dien_thoai" label={<Text style={labelStyle}>Số điện thoại *</Text>} rules={[{ required: true }]}>
                <Input placeholder="0901234567" style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="dia_chi_email" label={<Text style={labelStyle}>Email</Text>}>
                <Input type="email" placeholder="email@example.com" style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="zalo_number" label={<Text style={labelStyle}>Zalo</Text>}>
                <Input placeholder="0901234567" style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item name="loai_bang_lai" label={<Text style={labelStyle}>Loại bằng *</Text>} rules={[{ required: true }]}>
                <Select options={['A1','A2','B1','B2','C'].map(v => ({ label: v, value: v }))} placeholder="Chọn bằng" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="lead_source" label={<Text style={labelStyle}>Nguồn</Text>}>
                <Select allowClear options={[
                  { label: 'Facebook', value: 'facebook' }, { label: 'Đến trực tiếp', value: 'walk_in' },
                  { label: 'Giới thiệu', value: 'referral' }, { label: 'Zalo', value: 'zalo' },
                  { label: 'Chatbot', value: 'chatbot' }, { label: 'Khác', value: 'other' },
                ]} placeholder="Chọn nguồn" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="health_cert_expiry" label={<Text style={labelStyle}>Sức khoẻ hết hạn</Text>}>
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%', ...inputStyle }} placeholder="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="dia_chi" label={<Text style={labelStyle}>Địa chỉ</Text>}>
                <Input placeholder="Số nhà, tên đường" style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="quan_huyen" label={<Text style={labelStyle}>Quận/Huyện</Text>}>
                <Input style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="tinh_thanh" label={<Text style={labelStyle}>Tỉnh/Thành</Text>}>
                <Input style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item name="ghi_chu" label={<Text style={labelStyle}>Ghi chú</Text>}>
                <Input.TextArea rows={2} style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <Button onClick={() => navigate(-1)} style={{ background: 'var(--mgt-bg-container)', border: '1px solid var(--mgt-border-strong)', color: 'var(--mgt-text-secondary)' }}>
              Huỷ
            </Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={createMutation.isPending}
              style={{ background: 'linear-gradient(135deg, #1677ff, #0958d9)', border: 'none', fontWeight: 600 }}>
              Lưu học viên
            </Button>
          </div>
        </Form>
      </div>

      {/* Duplicate conflict modal */}
      <Modal open={showConflict}
        title={<span style={{ color: '#f5a623', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700 }}><WarningOutlined style={{ marginRight: 8 }} />Phát hiện hồ sơ trùng</span>}
        onCancel={() => setShowConflict(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowConflict(false)}>Huỷ</Button>,
          <Button key="force" danger onClick={handleForceCreate}>Tạo mới (bỏ qua)</Button>,
        ]}
        styles={{ body: { background: 'var(--mgt-bg-container)' }, content: { background: 'var(--mgt-bg-container)', border: '1px solid var(--mgt-border-strong)' } }}>
        <Alert type="warning" message="Hệ thống tìm thấy hồ sơ có thể trùng SĐT hoặc CCCD:" style={{ marginBottom: 16, background: 'var(--mgt-bg-warning)', border: '1px solid #f5a62330' }} showIcon />
        {conflicts.map(c => (
          <div key={c.id} style={{ background: 'var(--mgt-bg-base)', border: '1px solid var(--mgt-border)', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
            <Text style={{ color: 'var(--mgt-text-primary)', fontWeight: 600 }}>{c.ten_hoc_vien}</Text>
            <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, marginLeft: 8 }}>#{c.ma_hoc_vien}</Text>
            <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, marginTop: 4 }}>SĐT: {c.so_dien_thoai} | CCCD: {c.cccd_number ?? '—'}</div>
          </div>
        ))}
      </Modal>
    </div>
  )
}

export default StudentCreatePage
