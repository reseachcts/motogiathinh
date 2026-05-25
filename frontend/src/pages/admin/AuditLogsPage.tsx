import { useState } from 'react'
import { Badge, DatePicker, Drawer, Select, Space, Table, Tag, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { adminApi, type AuditLogItem } from '@/api/admin'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const ACTION_COLORS: Record<string, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  deactivate: 'orange',
  login: 'default',
  change_password: 'purple',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  deactivate: 'Vô hiệu hóa',
  login: 'Đăng nhập',
  change_password: 'Đổi mật khẩu',
}

const RESOURCE_LABELS: Record<string, string> = {
  student: 'Học viên',
  user: 'Tài khoản',
  payment: 'Thanh toán',
  lead: 'Lead',
}

const RESOURCES = Object.keys(RESOURCE_LABELS)
const ACTIONS = Object.keys(ACTION_LABELS)

export default function AuditLogsPage() {
  const [page, setPage] = useState(1)
  const [resource, setResource] = useState<string | undefined>()
  const [action, setAction] = useState<string | undefined>()
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)
  const [detail, setDetail] = useState<AuditLogItem | null>(null)

  const { data, isFetching } = useQuery({
    queryKey: ['audit-logs', page, resource, action, dateRange],
    queryFn: () =>
      adminApi.listAuditLogs({
        page,
        page_size: 20,
        resource: resource || undefined,
        action: action || undefined,
        from_date: dateRange?.[0],
        to_date: dateRange?.[1],
      }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'created_at',
      width: 160,
      render: (v: string) => (
        <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>
          {dayjs(v).format('DD/MM/YYYY HH:mm:ss')}
        </Text>
      ),
    },
    {
      title: 'Người dùng',
      width: 180,
      render: (_: unknown, row: AuditLogItem) => (
        <div>
          <Text style={{ fontSize: 13, color: 'var(--mgt-text-primary)', display: 'block' }}>
            {row.user_name || row.user_email || '—'}
          </Text>
          {row.user_name && (
            <Text style={{ fontSize: 11, color: 'var(--mgt-text-secondary)' }}>{row.user_email}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      width: 130,
      render: (v: string) => (
        <Tag color={ACTION_COLORS[v] || 'default'}>{ACTION_LABELS[v] || v}</Tag>
      ),
    },
    {
      title: 'Đối tượng',
      width: 120,
      render: (_: unknown, row: AuditLogItem) => (
        <Text style={{ fontSize: 13 }}>{RESOURCE_LABELS[row.resource] || row.resource}</Text>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      width: 120,
      render: (v: string | null) => (
        <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)', fontFamily: 'monospace' }}>
          {v || '—'}
        </Text>
      ),
    },
    {
      title: 'Chi tiết',
      width: 80,
      render: (_: unknown, row: AuditLogItem) =>
        row.old_values || row.new_values ? (
          <a onClick={() => setDetail(row)} style={{ fontSize: 12 }}>Xem</a>
        ) : '—',
    },
  ]

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>
            NHẬT KÝ HOẠT ĐỘNG
          </Title>
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>
            {data?.total ?? 0} bản ghi
          </Text>
        </div>
        <Space wrap>
          <Select
            allowClear
            placeholder="Đối tượng"
            style={{ width: 130 }}
            options={RESOURCES.map(r => ({ value: r, label: RESOURCE_LABELS[r] }))}
            onChange={v => { setResource(v); setPage(1) }}
          />
          <Select
            allowClear
            placeholder="Hành động"
            style={{ width: 150 }}
            options={ACTIONS.map(a => ({ value: a, label: ACTION_LABELS[a] }))}
            onChange={v => { setAction(v); setPage(1) }}
          />
          <RangePicker
            format="DD/MM/YYYY"
            onChange={dates => {
              setDateRange(dates ? [dates[0]!.startOf('day').toISOString(), dates[1]!.endOf('day').toISOString()] : null)
              setPage(1)
            }}
          />
        </Space>
      </div>

      <div style={{ background: 'var(--mgt-gradient-card)', borderRadius: 16, border: '1px solid var(--mgt-border)', overflow: 'hidden' }}>
        <Table
          dataSource={data?.items}
          columns={columns}
          rowKey="id"
          loading={isFetching}
          scroll={{ x: 800 }}
          pagination={{
            current: page,
            pageSize: 20,
            total: data?.total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: total => `${total} bản ghi`,
          }}
          size="small"
        />
      </div>

      <Drawer
        title="Chi tiết thay đổi"
        open={!!detail}
        onClose={() => setDetail(null)}
        width={440}
        styles={{ body: { background: 'var(--mgt-bg-base)' } }}
      >
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, display: 'block', marginBottom: 4 }}>Hành động</Text>
              <Tag color={ACTION_COLORS[detail.action]}>{ACTION_LABELS[detail.action] || detail.action}</Tag>
              <Tag>{RESOURCE_LABELS[detail.resource] || detail.resource}</Tag>
            </div>
            {detail.old_values && (
              <div>
                <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, display: 'block', marginBottom: 8 }}>Giá trị cũ</Text>
                <pre style={{ background: 'var(--mgt-bg-container)', border: '1px solid var(--mgt-border)', borderRadius: 8, padding: 12, fontSize: 12, overflow: 'auto', margin: 0 }}>
                  {JSON.stringify(detail.old_values, null, 2)}
                </pre>
              </div>
            )}
            {detail.new_values && (
              <div>
                <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, display: 'block', marginBottom: 8 }}>Giá trị mới</Text>
                <pre style={{ background: 'var(--mgt-bg-container)', border: '1px solid var(--mgt-border)', borderRadius: 8, padding: 12, fontSize: 12, overflow: 'auto', margin: 0 }}>
                  {JSON.stringify(detail.new_values, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}
