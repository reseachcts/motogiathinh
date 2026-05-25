import { Button, Checkbox, Drawer, Spin, Table, Tooltip, Typography, message } from 'antd'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { permissionsApi, type ResourcePermission, type SetResourcePermission } from '@/api/permissions'
import type { UserItem } from '@/api/admin'

const { Text } = Typography

const RESOURCE_LABELS: Record<string, string> = {
  student: 'Học viên',
  class: 'Lớp học',
  session: 'Lịch học',
  lead: 'Leads',
  payment: 'Thanh toán',
  instructor: 'Giáo viên',
  vehicle: 'Phương tiện',
}

const ACTIONS: { key: keyof SetResourcePermission; label: string }[] = [
  { key: 'can_create', label: 'Tạo' },
  { key: 'can_read', label: 'Xem' },
  { key: 'can_update', label: 'Sửa' },
  { key: 'can_delete', label: 'Xóa' },
]

interface Props {
  open: boolean
  onClose: () => void
  user: UserItem | null
}

export default function PermissionDrawer({ open, onClose, user }: Props) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['permissions', user?.id],
    queryFn: () => permissionsApi.getUserPermissions(user!.id).then(r => r.data),
    enabled: open && !!user,
  })

  const mutation = useMutation({
    mutationFn: ({ resource, data }: { resource: string; data: SetResourcePermission }) =>
      permissionsApi.setResourcePermission(user!.id, resource, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions', user?.id] })
    },
    onError: () => {
      message.error('Lưu quyền thất bại')
    },
  })

  const handleChange = (perm: ResourcePermission, action: keyof SetResourcePermission, checked: boolean) => {
    mutation.mutate({
      resource: perm.resource,
      data: {
        can_create: perm.can_create,
        can_read: perm.can_read,
        can_update: perm.can_update,
        can_delete: perm.can_delete,
        [action]: checked,
      },
    })
  }

  const permissions = data?.permissions ?? []

  const columns = [
    {
      title: 'Đối tượng',
      dataIndex: 'resource',
      render: (v: string) => (
        <Text style={{ fontSize: 13, fontWeight: 600, color: 'var(--mgt-text-primary)' }}>
          {RESOURCE_LABELS[v] ?? v}
        </Text>
      ),
    },
    ...ACTIONS.map(({ key, label }) => ({
      title: <span style={{ fontSize: 12 }}>{label}</span>,
      width: 70,
      align: 'center' as const,
      render: (_: unknown, perm: ResourcePermission) => (
        <Tooltip title={`${label} ${RESOURCE_LABELS[perm.resource] ?? perm.resource}`}>
          <Checkbox
            checked={perm[key]}
            disabled={mutation.isPending}
            onChange={e => handleChange(perm, key, e.target.checked)}
          />
        </Tooltip>
      ),
    })),
    {
      title: '',
      width: 90,
      render: (_: unknown, perm: ResourcePermission) => {
        const allTrue = ACTIONS.every(({ key }) => perm[key])
        return (
          <Button
            size="small"
            type="link"
            style={{ padding: 0, fontSize: 12 }}
            onClick={() =>
              mutation.mutate({
                resource: perm.resource,
                data: { can_create: !allTrue, can_read: !allTrue, can_update: !allTrue, can_delete: !allTrue },
              })
            }
          >
            {allTrue ? 'Thu hồi hết' : 'Cấp hết'}
          </Button>
        )
      },
    },
  ]

  return (
    <Drawer
      title={
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--mgt-text-primary)' }}>
            Phân quyền
          </div>
          {user && (
            <div style={{ fontSize: 12, color: 'var(--mgt-text-secondary)', fontWeight: 400, marginTop: 2 }}>
              {user.full_name || user.email}
            </div>
          )}
        </div>
      }
      open={open}
      onClose={onClose}
      width={500}
      styles={{ body: { background: 'var(--mgt-bg-base)', padding: 16 } }}
    >
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : (
        <>
          <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)', display: 'block', marginBottom: 12 }}>
            Chọn quyền truy cập cho từng đối tượng. Thay đổi được lưu ngay lập tức.
            Không có hàng nào được tạo = toàn quyền (mặc định).
          </Text>
          <div style={{ background: 'var(--mgt-bg-container)', borderRadius: 12, border: '1px solid var(--mgt-border)', overflow: 'hidden' }}>
            <Table
              dataSource={permissions}
              columns={columns}
              rowKey="resource"
              pagination={false}
              size="small"
            />
          </div>
        </>
      )}
    </Drawer>
  )
}
