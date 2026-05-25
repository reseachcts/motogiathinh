import { useEffect } from 'react'
import { Button, DatePicker, Drawer, Form, Input, InputNumber, message, Select, Switch } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { instructorsApi, type InstructorCreate, type InstructorOut } from '@/api/instructors'
import { adminApi } from '@/api/admin'

const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

interface Props {
  open: boolean
  onClose: () => void
  editInstructor?: InstructorOut | null
}

export default function InstructorFormDrawer({ open, onClose, editInstructor }: Props) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const isEdit = !!editInstructor

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.listUsers().then(r => r.data),
    staleTime: 2 * 60_000,
  })

  useEffect(() => {
    if (open && editInstructor) {
      form.setFieldsValue({
        ...editInstructor,
        ngay_sinh: editInstructor.ngay_sinh ? dayjs(editInstructor.ngay_sinh) : null,
        ngay_vao_lam: editInstructor.ngay_vao_lam ? dayjs(editInstructor.ngay_vao_lam) : null,
        ngay_cap_bang: editInstructor.ngay_cap_bang ? dayjs(editInstructor.ngay_cap_bang) : null,
        ngay_het_han_bang: editInstructor.ngay_het_han_bang ? dayjs(editInstructor.ngay_het_han_bang) : null,
        ngay_nghi_viec: editInstructor.ngay_nghi_viec ? dayjs(editInstructor.ngay_nghi_viec) : null,
        muc_luong: editInstructor.muc_luong ? parseFloat(editInstructor.muc_luong) : null,
      })
    } else if (open) {
      form.resetFields()
    }
  }, [open, editInstructor, form])

  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const fmt = (d: unknown) => d ? (d as dayjs.Dayjs).format('YYYY-MM-DD') : null
      const payload = {
        ...values,
        ngay_sinh: fmt(values.ngay_sinh),
        ngay_vao_lam: fmt(values.ngay_vao_lam),
        ngay_cap_bang: fmt(values.ngay_cap_bang),
        ngay_het_han_bang: fmt(values.ngay_het_han_bang),
        ngay_nghi_viec: fmt(values.ngay_nghi_viec),
      }
      if (isEdit) return instructorsApi.update(editInstructor!.id, payload)
      return instructorsApi.create(payload as unknown as InstructorCreate)
    },
    onSuccess: () => {
      message.success(isEdit ? 'Cập nhật giáo viên thành công' : 'Thêm giáo viên thành công')
      queryClient.invalidateQueries({ queryKey: ['instructors'] })
      onClose()
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      message.error(detail || 'Có lỗi xảy ra')
    },
  })

  return (
    <Drawer
      title={isEdit ? 'Chỉnh sửa giáo viên' : 'Thêm giáo viên'}
      open={open}
      onClose={onClose}
      width={540}
      styles={{ body: { background: 'var(--mgt-bg-base)' } }}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={mutation.isPending} onClick={() => form.submit()}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm giáo viên'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={v => mutation.mutate(v)} requiredMark={false}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="ma_giao_vien" label="Mã giáo viên" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input placeholder="VD: GV001" disabled={isEdit} />
          </Form.Item>
          <Form.Item name="ho_ten" label="Họ tên" rules={[{ required: true }]} style={{ flex: 2 }}>
            <Input placeholder="Nguyễn Văn A" />
          </Form.Item>
        </div>
        <Form.Item name="user_id" label="Tài khoản hệ thống" rules={[{ required: !isEdit, message: 'Chọn tài khoản' }]}>
          <Select
            placeholder="Chọn tài khoản người dùng"
            disabled={isEdit}
            showSearch
            filterOption={(input, opt) =>
              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={users.map(u => ({
              value: u.id,
              label: `${u.full_name || u.email} (${u.email})`,
            }))}
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="so_dien_thoai" label="Số điện thoại" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input placeholder="0909..." />
          </Form.Item>
          <Form.Item name="gioi_tinh" label="Giới tính" style={{ flex: 1 }}>
            <Select allowClear placeholder="Chọn" options={GENDER_OPTIONS} />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="ngay_sinh" label="Ngày sinh" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ngay_vao_lam" label="Ngày vào làm" rules={[{ required: !isEdit }]} style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item name="dia_chi" label="Địa chỉ">
          <Input.TextArea rows={2} placeholder="Địa chỉ..." />
        </Form.Item>

        <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Bằng lái
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="bang_lai_so" label="Số bằng lái" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="noi_cap_bang" label="Nơi cấp" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="ngay_cap_bang" label="Ngày cấp" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ngay_het_han_bang" label="Ngày hết hạn" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <Form.Item name="muc_luong" label="Mức lương (VNĐ)">
          <InputNumber
            style={{ width: '100%' }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v!.replace(/,/g, '')) as unknown as 0}
            min={0}
          />
        </Form.Item>
        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>

        {isEdit && (
          <>
            <Form.Item name="ngay_nghi_viec" label="Ngày nghỉ việc">
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="is_active" label="Đang hoạt động" valuePropName="checked">
              <Switch />
            </Form.Item>
          </>
        )}
      </Form>
    </Drawer>
  )
}
