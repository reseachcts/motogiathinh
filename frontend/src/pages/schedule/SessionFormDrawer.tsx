import { useEffect } from 'react'
import { Button, DatePicker, Drawer, Form, Input, message, Select, Switch, TimePicker } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { sessionsApi, type SessionCreate, type SessionOut, type SessionType, type SessionUpdate } from '@/api/sessions'
import { classesApi } from '@/api/classes'
import { instructorsApi } from '@/api/instructors'

const SESSION_TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: 'theory', label: 'Lý thuyết' },
  { value: 'practice', label: 'Thực hành' },
  { value: 'exam_prep', label: 'Ôn thi' },
]

interface Props {
  open: boolean
  onClose: () => void
  editSession?: SessionOut | null
  defaultClassId?: string
  onSaved?: () => void
}

export default function SessionFormDrawer({ open, onClose, editSession, defaultClassId, onSaved }: Props) {
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const isEdit = !!editSession

  const { data: classesData } = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => classesApi.list({ page_size: 200 }).then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: instructorsData } = useQuery({
    queryKey: ['instructors-dropdown'],
    queryFn: () => instructorsApi.list({ page_size: 200, is_active: true }).then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const classes = classesData?.items ?? []
  const instructors = instructorsData?.items ?? []

  useEffect(() => {
    if (open && editSession) {
      form.setFieldsValue({
        ...editSession,
        class_id: editSession.class_id,
        session_date: dayjs(editSession.session_date),
        start_time: dayjs(editSession.start_time, 'HH:mm:ss'),
        end_time: dayjs(editSession.end_time, 'HH:mm:ss'),
      })
    } else if (open) {
      form.resetFields()
      if (defaultClassId) form.setFieldValue('class_id', defaultClassId)
    }
  }, [open, editSession, defaultClassId, form])

  const mutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => {
      const payload = {
        ...values,
        session_date: (values.session_date as dayjs.Dayjs).format('YYYY-MM-DD'),
        start_time: (values.start_time as dayjs.Dayjs).format('HH:mm:ss'),
        end_time: (values.end_time as dayjs.Dayjs).format('HH:mm:ss'),
        instructor_id: (values.instructor_id as string | undefined) || null,
      }
      if (isEdit) return sessionsApi.update(editSession!.id, payload as unknown as SessionUpdate)
      return sessionsApi.create(payload as SessionCreate)
    },
    onSuccess: () => {
      message.success(isEdit ? 'Cập nhật buổi học thành công' : 'Tạo buổi học thành công')
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      onSaved?.()
      onClose()
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      message.error(detail || 'Có lỗi xảy ra')
    },
  })

  return (
    <Drawer
      title={isEdit ? 'Chỉnh sửa buổi học' : 'Thêm buổi học'}
      open={open}
      onClose={onClose}
      width={520}
      styles={{ body: { background: 'var(--mgt-bg-base)' } }}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={mutation.isPending} onClick={() => form.submit()}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo buổi học'}
          </Button>
        </div>
      }
    >
      <Form form={form} layout="vertical" onFinish={v => mutation.mutate(v)} requiredMark={false}>
        <Form.Item name="class_id" label="Lớp học" rules={[{ required: true, message: 'Chọn lớp học' }]}>
          <Select
            showSearch
            placeholder="Chọn lớp học"
            filterOption={(input, opt) =>
              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={classes.map(c => ({ value: c.id, label: `${c.ma_lop} — ${c.ten_lop}` }))}
          />
        </Form.Item>
        <Form.Item name="session_type" label="Loại buổi học" rules={[{ required: true }]}>
          <Select options={SESSION_TYPE_OPTIONS} />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="session_date" label="Ngày học" rules={[{ required: true, message: 'Chọn ngày' }]} style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="start_time" label="Giờ bắt đầu" rules={[{ required: true }]} style={{ flex: 1 }}>
            <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="end_time" label="Giờ kết thúc" rules={[{ required: true }]} style={{ flex: 1 }}>
            <TimePicker format="HH:mm" minuteStep={15} style={{ width: '100%' }} />
          </Form.Item>
        </div>
        <Form.Item name="instructor_id" label="Giáo viên">
          <Select
            allowClear
            showSearch
            placeholder="Chọn giáo viên (tùy chọn)"
            filterOption={(input, opt) =>
              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={instructors.map(i => ({ value: i.id, label: `${i.ma_giao_vien} — ${i.ho_ten}` }))}
          />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="phong_hoc" label="Phòng học" style={{ flex: 1 }}>
            <Input placeholder="VD: Phòng A1" />
          </Form.Item>
          <Form.Item name="dia_diem" label="Địa điểm" style={{ flex: 1 }}>
            <Input placeholder="Sân tập..." />
          </Form.Item>
        </div>
        <Form.Item name="noi_dung" label="Nội dung buổi học">
          <Input.TextArea rows={2} placeholder="Mô tả nội dung..." />
        </Form.Item>
        <Form.Item name="ghi_chu" label="Ghi chú">
          <Input.TextArea rows={2} />
        </Form.Item>

        {isEdit && (
          <>
            <Form.Item name="is_cancelled" label="Hủy buổi học" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item noStyle shouldUpdate={(prev, cur) => prev.is_cancelled !== cur.is_cancelled}>
              {({ getFieldValue }) =>
                getFieldValue('is_cancelled') ? (
                  <Form.Item name="cancel_reason" label="Lý do hủy">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </>
        )}
      </Form>
    </Drawer>
  )
}
