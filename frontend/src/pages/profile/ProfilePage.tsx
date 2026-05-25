import { useState } from 'react'
import { App, Button, Card, Form, Input, Typography } from 'antd'
import { LockOutlined } from '@ant-design/icons'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'

const { Title } = Typography

interface FormValues {
  current_password: string
  new_password: string
  confirm_password: string
}

export default function ProfilePage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<FormValues>()

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      authApi.changePassword(values.current_password, values.new_password),
    onSuccess: () => {
      message.success('Đổi mật khẩu thành công')
      form.resetFields()
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail
      if (detail === 'Mật khẩu hiện tại không đúng') {
        form.setFields([{ name: 'current_password', errors: [detail] }])
      } else {
        message.error(detail ?? 'Đổi mật khẩu thất bại')
      }
    },
  })

  return (
    <div style={{ maxWidth: 480, margin: '40px auto', padding: '0 16px' }}>
      <Title level={4} style={{ color: 'var(--mgt-text-primary)', marginBottom: 24 }}>
        Đổi mật khẩu
      </Title>
      <Card style={{ background: 'var(--mgt-bg-container)', border: '1px solid var(--mgt-border)' }}>
        <Form form={form} layout="vertical" onFinish={mutation.mutate} requiredMark={false}>
          <Form.Item
            name="current_password"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu hiện tại" />
          </Form.Item>

          <Form.Item
            name="new_password"
            label="Mật khẩu mới"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" />
          </Form.Item>

          <Form.Item
            name="confirm_password"
            label="Xác nhận mật khẩu mới"
            dependencies={['new_password']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('new_password') === value) return Promise.resolve()
                  return Promise.reject('Mật khẩu xác nhận không khớp')
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu mới" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={mutation.isPending} block>
              Đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
