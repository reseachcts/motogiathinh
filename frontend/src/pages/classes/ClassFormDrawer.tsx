import { useEffect } from 'react'
import {
  Button, DatePicker, Divider, Form, Input, InputNumber, Modal,
  Select, TimePicker, message,
} from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { classesApi, type ClassCreate, type ClassOut, type ClassStatus } from '@/api/classes'

const STATUS_OPTIONS: { value: ClassStatus; label: string }[] = [
  { value: 'upcoming', label: 'Sắp khai giảng' },
  { value: 'enrolling', label: 'Đang tuyển sinh' },
  { value: 'in_progress', label: 'Đang học' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const DAY_OPTIONS = [
  { value: 2, label: 'Thứ 2' },
  { value: 3, label: 'Thứ 3' },
  { value: 4, label: 'Thứ 4' },
  { value: 5, label: 'Thứ 5' },
  { value: 6, label: 'Thứ 6' },
  { value: 7, label: 'Thứ 7' },
  { value: 8, label: 'Chủ nhật' },
]

interface Props {
  open: boolean
  onClose: () => void
  editClass?: ClassOut | null
  onSaved?: () => void
}

export default function ClassFormDrawer({ open, onClose, editClass, onSaved }: Props) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const isEdit = !!editClass

  const { data: courseTypes = [] } = useQuery({
    queryKey: ['course-types'],
    queryFn: () => classesApi.listCourseTypes().then(r => r.data),
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (open && editClass) {
      form.setFieldsValue({
        ...editClass,
        ngay_khai_giang: editClass.ngay_khai_giang ? dayjs(editClass.ngay_khai_giang) : null,
        ngay_ket_thuc: editClass.ngay_ket_thuc ? dayjs(editClass.ngay_ket_thuc) : null,
        course_type_id: editClass.course_type?.id,
        lich_hoc: (editClass.lich_hoc ?? []).map((slot: { thu: number; gio_bat_dau: string; gio_ket_thuc: string }) => ({
          thu: slot.thu,
          gio_bat_dau: dayjs(slot.gio_bat_dau, 'HH:mm'),
          gio_ket_thuc: dayjs(slot.gio_ket_thuc, 'HH:mm'),
        })),
      })
    } else if (open) {
      form.resetFields()
      form.setFieldsValue({ trang_thai: 'upcoming' })
    }
  }, [open, editClass, form])

  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        ngay_khai_giang: (values.ngay_khai_giang as dayjs.Dayjs)?.format('YYYY-MM-DD'),
        ngay_ket_thuc: (values.ngay_ket_thuc as dayjs.Dayjs)?.format('YYYY-MM-DD') ?? null,
        lich_hoc: ((values.lich_hoc as { thu: number; gio_bat_dau: dayjs.Dayjs; gio_ket_thuc: dayjs.Dayjs }[]) ?? []).map(slot => ({
          thu: slot.thu,
          gio_bat_dau: slot.gio_bat_dau instanceof Object && 'format' in slot.gio_bat_dau
            ? (slot.gio_bat_dau as dayjs.Dayjs).format('HH:mm')
            : slot.gio_bat_dau,
          gio_ket_thuc: slot.gio_ket_thuc instanceof Object && 'format' in slot.gio_ket_thuc
            ? (slot.gio_ket_thuc as dayjs.Dayjs).format('HH:mm')
            : slot.gio_ket_thuc,
        })),
      }
      if (isEdit) return classesApi.update(editClass!.id, payload as ClassCreate)
      return classesApi.create(payload as ClassCreate)
    },
    onSuccess: () => {
      message.success(isEdit ? 'Cập nhật lớp học thành công' : 'Tạo lớp học thành công')
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      onSaved?.()
      onClose()
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      message.error(detail || 'Có lỗi xảy ra')
    },
  })

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa lớp học' : 'Thêm lớp học'}
      open={open}
      onCancel={onClose}
      width={680}
      styles={{ body: { background: 'var(--mgt-bg-base)', maxHeight: '75vh', overflowY: 'auto', padding: '16px 24px' } }}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={mutation.isPending} onClick={() => form.submit()}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo lớp'}
          </Button>
        </div>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={values => mutation.mutate(values)}
        requiredMark={false}
      >
        {/* ── Thông tin cơ bản ── */}
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="ma_lop" label="Mã lớp" rules={[{ required: true, message: 'Nhập mã lớp' }]} style={{ flex: 1 }}>
            <Input placeholder="VD: A2-2024-001" disabled={isEdit} />
          </Form.Item>
          <Form.Item name="trang_thai" label="Trạng thái" style={{ flex: 1 }}>
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
        </div>
        <Form.Item name="ten_lop" label="Tên lớp" rules={[{ required: true, message: 'Nhập tên lớp' }]}>
          <Input placeholder="VD: Lớp A2 tháng 1/2025" />
        </Form.Item>
        <Form.Item name="course_type_id" label="Khóa học" rules={[{ required: true, message: 'Chọn khóa học' }]}>
          <Select
            placeholder="Chọn khóa học"
            options={courseTypes.map(ct => ({ value: ct.id, label: `${ct.ma_khoa_hoc} — ${ct.ten_khoa_hoc}` }))}
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="ngay_khai_giang" label="Ngày khai giảng" rules={[{ required: true, message: 'Chọn ngày' }]} style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="ngay_ket_thuc" label="Ngày kết thúc" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="phong_hoc" label="Phòng học" style={{ flex: 1 }}>
            <Input placeholder="VD: Phòng A1" />
          </Form.Item>
          <Form.Item name="hoc_phi" label="Học phí (đ)" style={{ flex: 1 }}>
            <InputNumber
              min={0}
              step={50000}
              style={{ width: '100%' }}
              formatter={v => v ? `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={v => (v ? Number(v.replace(/,/g, '')) : 0) as 0}
              placeholder="1,500,000"
            />
          </Form.Item>
        </div>
        <Form.Item name="zalo_group_link" label="Nhóm Zalo">
          <Input placeholder="Link nhóm Zalo của lớp..." />
        </Form.Item>

        {/* ── Lịch học ── */}
        <Divider orientation="left" style={{ margin: '12px 0', fontSize: 13, color: 'var(--mgt-text-secondary)' }}>
          Lịch học
        </Divider>
        <Form.List name="lich_hoc">
          {(fields, { add, remove }) => (
            <>
              {fields.map(field => (
                <div key={field.key} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <Form.Item
                    {...field}
                    name={[field.name, 'thu']}
                    rules={[{ required: true, message: 'Chọn thứ' }]}
                    style={{ marginBottom: 0, flex: '0 0 110px' }}
                  >
                    <Select options={DAY_OPTIONS} placeholder="Thứ" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'gio_bat_dau']}
                    rules={[{ required: true, message: 'Giờ bắt đầu' }]}
                    style={{ marginBottom: 0, flex: 1 }}
                  >
                    <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} placeholder="Giờ BĐ" />
                  </Form.Item>
                  <Form.Item
                    {...field}
                    name={[field.name, 'gio_ket_thuc']}
                    rules={[{ required: true, message: 'Giờ kết thúc' }]}
                    style={{ marginBottom: 0, flex: 1 }}
                  >
                    <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} placeholder="Giờ KT" />
                  </Form.Item>
                  <Button
                    type="text"
                    danger
                    icon={<MinusCircleOutlined />}
                    onClick={() => remove(field.name)}
                    style={{ marginTop: 4 }}
                  />
                </div>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block style={{ marginBottom: 4 }}>
                Thêm ca
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item name="ghi_chu" label="Ghi chú" style={{ marginTop: 8 }}>
          <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
        </Form.Item>
      </Form>
    </Modal>
  )
}
