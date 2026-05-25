import { useEffect } from 'react'
import { Button, DatePicker, Drawer, Form, Input, InputNumber, message, Select } from 'antd'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { vehiclesApi, type VehicleCreate, type VehicleOut, type VehicleStatus } from '@/api/vehicles'

const STATUS_OPTIONS: { value: VehicleStatus; label: string }[] = [
  { value: 'active', label: 'Đang sử dụng' },
  { value: 'maintenance', label: 'Đang bảo dưỡng' },
  { value: 'retired', label: 'Ngừng sử dụng' },
]

const LICENSE_OPTIONS = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
]

interface Props {
  open: boolean
  onClose: () => void
  editVehicle?: VehicleOut | null
}

export default function VehicleFormDrawer({ open, onClose, editVehicle }: Props) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const isEdit = !!editVehicle

  useEffect(() => {
    if (open && editVehicle) {
      const fmt = (d: string | null) => d ? dayjs(d) : null
      form.setFieldsValue({
        ...editVehicle,
        ngay_dang_kiem: fmt(editVehicle.ngay_dang_kiem),
        ngay_het_dang_kiem: fmt(editVehicle.ngay_het_dang_kiem),
        bao_hiem_den_ngay: fmt(editVehicle.bao_hiem_den_ngay),
        last_service_date: fmt(editVehicle.last_service_date),
        purchase_date: fmt(editVehicle.purchase_date),
        purchase_price: editVehicle.purchase_price ? parseFloat(editVehicle.purchase_price) : null,
      })
    } else if (open) {
      form.resetFields()
      form.setFieldsValue({ trang_thai: 'active', odometer_km: 0 })
    }
  }, [open, editVehicle, form])

  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const fmt = (d: unknown) => d ? (d as dayjs.Dayjs).format('YYYY-MM-DD') : null
      const payload = {
        ...values,
        ngay_dang_kiem: fmt(values.ngay_dang_kiem),
        ngay_het_dang_kiem: fmt(values.ngay_het_dang_kiem),
        bao_hiem_den_ngay: fmt(values.bao_hiem_den_ngay),
        last_service_date: fmt(values.last_service_date),
        purchase_date: fmt(values.purchase_date),
      }
      if (isEdit) return vehiclesApi.update(editVehicle!.id, payload)
      return vehiclesApi.create(payload as unknown as VehicleCreate)
    },
    onSuccess: () => {
      message.success(isEdit ? 'Cập nhật phương tiện thành công' : 'Thêm phương tiện thành công')
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      onClose()
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      message.error(detail || 'Có lỗi xảy ra')
    },
  })

  return (
    <Drawer
      title={isEdit ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện'}
      open={open}
      onClose={onClose}
      width={560}
      styles={{ body: { background: 'var(--mgt-bg-base)' } }}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={mutation.isPending} onClick={() => form.submit()}>
            {isEdit ? 'Lưu thay đổi' : 'Thêm phương tiện'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={v => mutation.mutate(v)} requiredMark={false}>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="bien_so" label="Biển số xe" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input placeholder="VD: 51A-12345" disabled={isEdit} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
          <Form.Item name="loai_bang_lai" label="Hạng bằng" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Select options={LICENSE_OPTIONS} />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="loai_xe" label="Loại xe" rules={[{ required: true }]} style={{ flex: 1 }}>
            <Input placeholder="VD: Xe số, Xe tay ga" />
          </Form.Item>
          <Form.Item name="hang_xe" label="Hãng xe" style={{ flex: 1 }}>
            <Input placeholder="Honda, Yamaha..." />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="ten_xe" label="Tên xe / Model" style={{ flex: 1 }}>
            <Input placeholder="Wave Alpha, Exciter..." />
          </Form.Item>
          <Form.Item name="nam_san_xuat" label="Năm sản xuất" style={{ flex: 1 }}>
            <InputNumber min={1990} max={2030} style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="mau_xe" label="Màu xe" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="dung_tich_may" label="Dung tích máy (cc)" style={{ flex: 1 }}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="so_khung" label="Số khung" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
          <Form.Item name="so_may" label="Số máy" style={{ flex: 1 }}>
            <Input />
          </Form.Item>
        </div>

        <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Đăng kiểm & Bảo hiểm
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="ngay_dang_kiem" label="Ngày đăng kiểm" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ngay_het_dang_kiem" label="Hết hạn đăng kiểm" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item name="bao_hiem_den_ngay" label="Bảo hiểm đến ngày">
          <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
        </Form.Item>

        <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tình trạng
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="trang_thai" label="Trạng thái" style={{ flex: 1 }}>
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item name="odometer_km" label="Số km hiện tại" style={{ flex: 1 }}>
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="km" />
          </Form.Item>
        </div>
        {isEdit && (
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="last_service_km" label="Bảo dưỡng lần cuối (km)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} addonAfter="km" />
            </Form.Item>
            <Form.Item name="last_service_date" label="Ngày bảo dưỡng cuối" style={{ flex: 1 }}>
              <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
          </div>
        )}

        <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Mua sắm
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="purchase_date" label="Ngày mua" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="purchase_price" label="Giá mua (VNĐ)" style={{ flex: 1 }}>
            <InputNumber
              style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => Number(v!.replace(/,/g, '')) as unknown as 0}
              min={0}
            />
          </Form.Item>
        </div>
        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Drawer>
  )
}
