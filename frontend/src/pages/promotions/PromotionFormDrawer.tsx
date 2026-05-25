import { useEffect } from 'react'
import { Button, DatePicker, Drawer, Form, Input, InputNumber, message, Select, Switch } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { promotionsApi, type PromotionCreate, type PromotionOut, type PromotionUpdate } from '@/api/promotions'

interface Props {
  open: boolean
  onClose: () => void
  editPromotion?: (PromotionOut & { mo_ta?: string | null }) | null
}

export default function PromotionFormDrawer({ open, onClose, editPromotion }: Props) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const isEdit = !!editPromotion

  useEffect(() => {
    if (open && editPromotion) {
      form.setFieldsValue({
        ...editPromotion,
        gia_tri: parseFloat(editPromotion.gia_tri),
        start_date: editPromotion.start_date ? dayjs(editPromotion.start_date) : null,
        end_date: editPromotion.end_date ? dayjs(editPromotion.end_date) : null,
      })
    } else if (open) {
      form.resetFields()
      form.setFieldsValue({ loai_khuyen_mai: 'fixed', is_active: true, is_partner: false })
    }
  }, [open, editPromotion, form])

  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const fmt = (d: unknown) => d ? (d as dayjs.Dayjs).format('YYYY-MM-DD') : null
      const payload = {
        ...values,
        start_date: fmt(values.start_date),
        end_date: fmt(values.end_date),
      }
      if (isEdit) return promotionsApi.update(editPromotion!.id, payload as unknown as PromotionUpdate)
      return promotionsApi.create(payload as unknown as PromotionCreate)
    },
    onSuccess: () => {
      message.success(isEdit ? 'Cập nhật khuyến mãi thành công' : 'Thêm khuyến mãi thành công')
      queryClient.invalidateQueries({ queryKey: ['promotions'] })
      onClose()
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      message.error(detail || 'Có lỗi xảy ra')
    },
  })

  return (
    <Drawer
      title={isEdit ? 'Chỉnh sửa khuyến mãi' : 'Thêm khuyến mãi'}
      open={open}
      onClose={onClose}
      width={480}
      styles={{ body: { background: 'var(--mgt-bg-base)' } }}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={mutation.isPending} onClick={() => form.submit()}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm khuyến mãi'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={v => mutation.mutate(v)} requiredMark={false}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="ma_khuyen_mai" label="Mã khuyến mãi" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input placeholder="VD: KM001" disabled={isEdit} />
          </Form.Item>
          <Form.Item name="loai_khuyen_mai" label="Loại" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Select
              options={[
                { value: 'fixed', label: 'Cố định (₫)' },
                { value: 'percent', label: 'Phần trăm (%)' },
              ]}
            />
          </Form.Item>
        </div>
        <Form.Item name="ten_khuyen_mai" label="Tên khuyến mãi" rules={[{ required: true }]}>
          <Input placeholder="VD: Học viên có bằng ô tô" />
        </Form.Item>
        <Form.Item name="gia_tri" label="Giá trị" rules={[{ required: true }]}>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.loai_khuyen_mai !== cur.loai_khuyen_mai}>
            {({ getFieldValue }) => {
              const loai = getFieldValue('loai_khuyen_mai')
              return (
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={loai === 'percent' ? 100 : undefined}
                  addonAfter={loai === 'percent' ? '%' : '₫'}
                  formatter={loai !== 'percent' ? v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : undefined}
                  parser={loai !== 'percent' ? (v => Number(v!.replace(/,/g, '')) as unknown as 0) : undefined}
                />
              )
            }}
          </Form.Item>
        </Form.Item>
        <Form.Item name="mo_ta" label="Mô tả">
          <Input.TextArea rows={2} placeholder="Ghi chú về điều kiện áp dụng..." />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="start_date" label="Ngày bắt đầu" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="end_date" label="Ngày kết thúc" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item name="is_partner" label="Khuyến mãi liên kết" valuePropName="checked">
          <Switch />
        </Form.Item>
        {isEdit && (
          <Form.Item name="is_active" label="Đang hoạt động" valuePropName="checked">
            <Switch />
          </Form.Item>
        )}
      </Form>
    </Drawer>
  )
}
