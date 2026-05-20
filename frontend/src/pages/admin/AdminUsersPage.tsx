import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Col, Form, Input, Modal, Row, Select, Switch, Table, Tag, Typography } from 'antd'
import { PlusOutlined, UserAddOutlined } from '@ant-design/icons'
import toast from 'react-hot-toast'
import { adminApi, UserItem } from '@/api/admin'

const { Title, Text } = Typography

const AdminUsersPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form] = Form.useForm()

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      toast.success('Tạo tài khoản thành công!')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setShowCreate(false)
      form.resetFields()
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? 'Lỗi tạo tài khoản'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      adminApi.updateUser(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const columns = [
    {
      title: 'Họ tên',
      dataIndex: 'full_name',
      key: 'full_name',
      render: (v: string | null, row: UserItem) => (
        <div>
          <div style={{ color: 'var(--mgt-text-primary)', fontWeight: 600 }}>{v || '—'}</div>
          <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }}>{row.email}</div>
        </div>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      render: (v: string | null) => <Text style={{ color: 'var(--mgt-text-secondary)' }}>{v || '—'}</Text>,
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => (
        <Tag color={v === 'admin' ? 'blue' : 'default'}>
          {v === 'admin' ? 'Admin' : 'Nhân viên'}
        </Tag>
      ),
      width: 110,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (v: boolean, row: UserItem) => (
        <Switch
          checked={v}
          size="small"
          onChange={checked => toggleMutation.mutate({ id: row.id, is_active: checked })}
        />
      ),
      width: 90,
    },
  ]

  const inputStyle = { background: 'var(--mgt-bg-base)', border: '1px solid var(--mgt-border-strong)', color: 'var(--mgt-text-primary)', borderRadius: 8 }

  return (
    <div style={{ padding: '16px clamp(16px, 3vw, 32px)', fontFamily: "'Barlow', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');`}</style>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>
            QUẢN LÝ TÀI KHOẢN
          </Title>
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>{users?.length ?? 0} tài khoản</Text>
        </div>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setShowCreate(true)}
          style={{ background: 'linear-gradient(135deg, #1677ff, #0958d9)', border: 'none', fontWeight: 600 }}>
          Tạo tài khoản
        </Button>
      </div>

      <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, overflow: 'hidden' }}>
        <Table dataSource={users ?? []} columns={columns} loading={isLoading} rowKey="id" size="middle" scroll={{ x: 500 }}
          pagination={false} />
      </div>

      {/* Create modal */}
      <Modal open={showCreate}
        title={<span style={{ color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 700 }}>TẠO TÀI KHOẢN MỚI</span>}
        onCancel={() => { setShowCreate(false); form.resetFields() }}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="Tạo"
        styles={{ body: { background: 'var(--mgt-bg-container)' }, content: { background: 'var(--mgt-bg-container)', border: '1px solid var(--mgt-border-strong)' } }}>
        <Form form={form} layout="vertical" onFinish={v => createMutation.mutate(v)} requiredMark={false}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="email" label={<Text style={{ color: 'var(--mgt-text-secondary)' }}>Email *</Text>} rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="user@motogiathinh.vn" style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="password" label={<Text style={{ color: 'var(--mgt-text-secondary)' }}>Mật khẩu *</Text>} rules={[{ required: true, min: 6 }]}>
                <Input.Password placeholder="Tối thiểu 6 ký tự" style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="full_name" label={<Text style={{ color: 'var(--mgt-text-secondary)' }}>Họ tên</Text>}>
                <Input placeholder="Nguyễn Văn A" style={inputStyle} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label={<Text style={{ color: 'var(--mgt-text-secondary)' }}>Số điện thoại</Text>}>
                <Input placeholder="0901234567" style={inputStyle} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="role" label={<Text style={{ color: 'var(--mgt-text-secondary)' }}>Vai trò *</Text>} rules={[{ required: true }]} initialValue="staff">
                <Select options={[{ label: 'Admin', value: 'admin' }, { label: 'Nhân viên', value: 'staff' }]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="branch_id" label={<Text style={{ color: 'var(--mgt-text-secondary)' }}>Chi nhánh</Text>}>
                <Select allowClear placeholder="Tất cả (Admin)" options={[]} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default AdminUsersPage
