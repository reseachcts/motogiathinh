import { useState } from 'react'
import { Button, DatePicker, Select, Space, Table, Tag, Typography } from 'antd'
import { CalendarOutlined, EditOutlined, PlusOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import { sessionsApi, type SessionListItem, type SessionOut, type SessionType } from '@/api/sessions'
import { classesApi } from '@/api/classes'
import SessionFormDrawer from './SessionFormDrawer'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const SESSION_TYPE_COLORS: Record<SessionType, string> = {
  theory: 'blue',
  practice: 'green',
  exam_prep: 'orange',
}

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  theory: 'Lý thuyết',
  practice: 'Thực hành',
  exam_prep: 'Ôn thi',
}

const SESSION_EVENT_COLORS: Record<SessionType, string> = {
  theory: '#1677ff',
  practice: '#52c41a',
  exam_prep: '#fa8c16',
}

export default function SchedulePage() {
  const [page, setPage] = useState(1)
  const [classId, setClassId] = useState<string | undefined>()
  const [sessionType, setSessionType] = useState<SessionType | undefined>()
  const [dateRange, setDateRange] = useState<[string, string] | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editSession, setEditSession] = useState<SessionOut | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'table'>('calendar')
  const [calendarFrom, setCalendarFrom] = useState(
    dayjs().startOf('month').subtract(7, 'day').format('YYYY-MM-DD')
  )
  const [calendarTo, setCalendarTo] = useState(
    dayjs().endOf('month').add(7, 'day').format('YYYY-MM-DD')
  )

  const { data, isFetching } = useQuery({
    queryKey: ['sessions', page, classId, sessionType, dateRange],
    queryFn: () =>
      sessionsApi.list({
        page,
        page_size: 20,
        class_id: classId,
        session_type: sessionType,
        from_date: dateRange?.[0],
        to_date: dateRange?.[1],
      }).then(r => r.data),
    placeholderData: prev => prev,
  })

  const { data: classesData } = useQuery({
    queryKey: ['classes-dropdown'],
    queryFn: () => classesApi.list({ page_size: 200 }).then(r => r.data),
    staleTime: 5 * 60_000,
  })

  const { data: calendarData } = useQuery({
    queryKey: ['sessions-calendar', calendarFrom, calendarTo, classId, sessionType],
    queryFn: () =>
      sessionsApi.list({
        page: 1, page_size: 500,
        class_id: classId, session_type: sessionType,
        from_date: calendarFrom, to_date: calendarTo,
      }).then(r => r.data),
    enabled: viewMode === 'calendar',
    placeholderData: prev => prev,
  })

  const calendarEvents = (calendarData?.items ?? []).map(s => ({
    id: s.id,
    title: `[${s.class_info?.ma_lop ?? ''}] ${SESSION_TYPE_LABELS[s.session_type]}`,
    start: `${s.session_date}T${s.start_time}`,
    end: `${s.session_date}T${s.end_time}`,
    backgroundColor: s.is_cancelled ? '#d9d9d9' : SESSION_EVENT_COLORS[s.session_type],
    borderColor: 'transparent',
    textColor: s.is_cancelled ? '#888' : '#fff',
    extendedProps: { sessionId: s.id },
  }))

  const handleEventClick = (arg: EventClickArg) => {
    const sid = arg.event.extendedProps.sessionId as string
    sessionsApi.get(sid).then(r => { setEditSession(r.data); setDrawerOpen(true) })
  }

  const openCreate = () => {
    setEditSession(null)
    setDrawerOpen(true)
  }

  const openEdit = (row: SessionListItem) => {
    sessionsApi.get(row.id).then(r => {
      setEditSession(r.data)
      setDrawerOpen(true)
    })
  }

  const columns = [
    {
      title: 'Ngày học',
      dataIndex: 'session_date',
      width: 110,
      render: (v: string) => (
        <Text style={{ fontSize: 13, fontWeight: 600 }}>{dayjs(v).format('DD/MM/YYYY')}</Text>
      ),
    },
    {
      title: 'Ca học',
      width: 120,
      render: (_: unknown, row: SessionListItem) => (
        <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)', fontFamily: 'monospace' }}>
          {row.start_time.slice(0, 5)} – {row.end_time.slice(0, 5)}
        </Text>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'session_type',
      width: 110,
      render: (v: SessionType) => (
        <Tag color={SESSION_TYPE_COLORS[v]}>{SESSION_TYPE_LABELS[v]}</Tag>
      ),
    },
    {
      title: 'Lớp',
      width: 130,
      render: (_: unknown, row: SessionListItem) => (
        <Text style={{ fontSize: 13 }}>{row.class_info?.ma_lop || '—'}</Text>
      ),
    },
    {
      title: 'Giáo viên',
      render: (_: unknown, row: SessionListItem) => (
        <Text style={{ fontSize: 13 }}>{row.instructor?.ho_ten || '—'}</Text>
      ),
    },
    {
      title: 'Phòng học',
      dataIndex: 'phong_hoc',
      width: 110,
      render: (v: string | null) => (
        <Text style={{ fontSize: 12, color: 'var(--mgt-text-secondary)' }}>{v || '—'}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_cancelled',
      width: 110,
      render: (v: boolean) => (
        <Tag color={v ? 'red' : 'success'}>{v ? 'Đã hủy' : 'Đang diễn ra'}</Tag>
      ),
    },
    {
      title: '',
      width: 48,
      render: (_: unknown, row: SessionListItem) => (
        <EditOutlined
          onClick={e => { e.stopPropagation(); openEdit(row) }}
          style={{ color: 'var(--mgt-text-secondary)', cursor: 'pointer', fontSize: 15 }}
        />
      ),
    },
  ]

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)' }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.05em' }}>
            LỊCH HỌC
          </Title>
          <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 13 }}>
            {data?.total ?? 0} buổi học
          </Text>
        </div>
        <Space wrap>
          <Select
            allowClear
            showSearch
            placeholder="Lớp học"
            style={{ width: 200 }}
            filterOption={(input, opt) =>
              (opt?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={(classesData?.items ?? []).map(c => ({ value: c.id, label: `${c.ma_lop} — ${c.ten_lop}` }))}
            onChange={v => { setClassId(v); setPage(1) }}
          />
          <Select
            allowClear
            placeholder="Loại buổi học"
            style={{ width: 140 }}
            options={Object.entries(SESSION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            onChange={v => { setSessionType(v as SessionType); setPage(1) }}
          />
          <RangePicker
            format="DD/MM/YYYY"
            onChange={dates => {
              setDateRange(dates ? [dates[0]!.format('YYYY-MM-DD'), dates[1]!.format('YYYY-MM-DD')] : null)
              setPage(1)
            }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Thêm buổi học
          </Button>
          <Button
            icon={viewMode === 'calendar' ? <UnorderedListOutlined /> : <CalendarOutlined />}
            onClick={() => setViewMode(m => m === 'calendar' ? 'table' : 'calendar')}
          >
            {viewMode === 'calendar' ? 'Danh sách' : 'Lịch'}
          </Button>
        </Space>
      </div>

      {viewMode === 'calendar' ? (
        <div style={{ background: 'var(--mgt-gradient-card)', borderRadius: 16, border: '1px solid var(--mgt-border)', padding: 16 }}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            buttonText={{ today: 'Hôm nay', month: 'Tháng', week: 'Tuần' }}
            locale="vi"
            events={calendarEvents}
            eventClick={handleEventClick}
            datesSet={(arg: DatesSetArg) => {
              setCalendarFrom(dayjs(arg.start).format('YYYY-MM-DD'))
              setCalendarTo(dayjs(arg.end).format('YYYY-MM-DD'))
            }}
            height="auto"
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          />
        </div>
      ) : (
        <div style={{ background: 'var(--mgt-gradient-card)', borderRadius: 16, border: '1px solid var(--mgt-border)', overflow: 'hidden' }}>
          <Table
            dataSource={data?.items}
            columns={columns}
            rowKey="id"
            loading={isFetching}
            scroll={{ x: 900 }}
            onRow={row => ({ onClick: () => openEdit(row), style: { cursor: 'pointer' } })}
            pagination={{
              current: page,
              pageSize: 20,
              total: data?.total,
              onChange: setPage,
              showSizeChanger: false,
              showTotal: total => `${total} buổi học`,
            }}
            size="small"
          />
        </div>
      )}

      <SessionFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        editSession={editSession}
      />
    </div>
  )
}
