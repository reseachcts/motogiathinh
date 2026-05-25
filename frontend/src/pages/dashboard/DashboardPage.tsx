import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Column, Pie } from '@ant-design/charts'
import { Alert, Avatar, Badge, Col, Row, Select, Spin, Tag, Typography } from 'antd'
import {
  AlertOutlined, BankOutlined, CalendarOutlined, ClockCircleOutlined,
  DashboardOutlined, ExclamationCircleOutlined, FireOutlined,
  RiseOutlined, TeamOutlined, WarningOutlined,
} from '@ant-design/icons'
import { reportsApi } from '@/api/reports'
import { leadsApi } from '@/api/leads'
import { useAuthStore } from '@/store/authStore'
import { useBranchStore } from '@/store/branchStore'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useUiStore } from '@/store/uiStore'
import { formatVND, MONTHS_VI, STATUS_COLORS, STATUS_LABELS } from './constants'
import KpiCard from './KpiCard'
import StaffCollectionSection from './StaffCollectionSection'
import StudentStatusSection from './StudentStatusSection'

const { Text, Title } = Typography

const DashboardPage: React.FC = () => {
  const user = useAuthStore(s => s.user)
  const isAdmin = useAuthStore(s => s.isAdmin())
  const branchId = useAuthStore(s => s.branchId())
  const { selectedBranchId, setSelectedBranch } = useBranchStore()
  const tc = useThemeColors()
  const isDark = useUiStore(s => s.themeMode) === 'dark'
  const axisLine = isDark ? '#484f58' : '#d9d9d9'
  const gridLine = isDark ? 'rgba(255,255,255,0.09)' : '#f0f0f0'

  const effectiveBranch = isAdmin ? (selectedBranchId ?? undefined) : (branchId ?? undefined)
  const currentYear = new Date().getFullYear()

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard', effectiveBranch],
    queryFn: () => reportsApi.getDashboard(effectiveBranch).then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60_000,
  })

  const { data: revenue, isLoading: revLoading } = useQuery({
    queryKey: ['revenue', currentYear, effectiveBranch],
    queryFn: () => reportsApi.getRevenue(currentYear, effectiveBranch).then(r => r.data),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 60_000,
  })

  const { data: unclaimedData } = useQuery({
    queryKey: ['unclaimed-leads'],
    queryFn: () => leadsApi.getUnclaimedCount().then(r => r.data),
    refetchInterval: 2 * 60 * 1000,
  })

  const unclaimedCount = unclaimedData?.count ?? 0
  const studentCounts: Record<string, number> = dashboard?.student_counts ?? {}

  const revenueChartData = MONTHS_VI.map((month, i) => ({
    month,
    'Doanh thu': revenue?.find(r => r.month === i + 1)?.total ?? 0,
  }))

  const statusPieData = Object.entries(studentCounts)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({
      type: STATUS_LABELS[status] ?? status,
      value: count,
      color: STATUS_COLORS[status] ?? '#8c8c8c',
    }))

  const axisX = { labelFill: tc['--mgt-text-secondary'], labelFontSize: 11, lineStroke: axisLine, tickStroke: axisLine }
  const axisY = { ...axisX, gridStroke: gridLine, gridLineDash: [4, 4], labelFormatter: (v: number) => `${(v / 1_000_000).toFixed(0)}tr` }

  const columnConfig = {
    data: revenueChartData,
    xField: 'month',
    yField: 'Doanh thu',
    color: '#1677ff',
    columnStyle: { radius: [4, 4, 0, 0], fill: 'l(90) 0:#4096ff 1:#1677ff' },
    label: false,
    tooltip: { formatter: (d: { 'Doanh thu': number }) => ({ name: 'Doanh thu', value: formatVND(d['Doanh thu']) }) },
    axis: { x: axisX, y: axisY },
  }

  const pieConfig = {
    data: statusPieData,
    angleField: 'value',
    colorField: 'type',
    color: statusPieData.map(d => d.color),
    radius: 0.85,
    innerRadius: 0.62,
    label: false,
    legend: { position: 'bottom' as const, itemName: { style: { fill: tc['--mgt-text-secondary'], fontSize: 12, fontFamily: "'Barlow', sans-serif" } } },
    statistic: {
      title: { style: { color: tc['--mgt-text-secondary'], fontSize: 12, fontFamily: "'Barlow', sans-serif" }, content: 'Tổng' },
      content: { style: { color: tc['--mgt-text-primary'], fontSize: 26, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif" }, content: String(Object.values(studentCounts).reduce((a, b) => a + b, 0)) },
    },
    tooltip: { formatter: (d: { type: string; value: number }) => ({ name: d.type, value: `${d.value} HV` }) },
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mgt-bg-base)', fontFamily: "'Barlow', sans-serif", padding: '0 0 48px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@400;600;700;800&display=swap');
        .ant-table { background: transparent !important; }
        .ant-table-thead > tr > th { background: var(--mgt-bg-container) !important; border-bottom: 1px solid var(--mgt-border) !important; color: var(--mgt-text-secondary) !important; font-family: 'Barlow', sans-serif !important; font-size: 11px !important; letter-spacing: 0.08em !important; text-transform: uppercase !important; font-weight: 600 !important; }
        .ant-table-tbody > tr > td { background: transparent !important; border-bottom: 1px solid var(--mgt-border) !important; padding: 12px 16px !important; }
        .ant-table-tbody > tr:hover > td { background: var(--mgt-bg-container) !important; }
        .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
        .ant-select-selector { background: var(--mgt-bg-container) !important; border-color: var(--mgt-border-strong) !important; color: var(--mgt-text-primary) !important; border-radius: 8px !important; }
        .ant-select-arrow { color: var(--mgt-text-secondary) !important; }
      `}</style>

      {/* Header */}
      <div style={{ background: 'var(--mgt-gradient-card)', borderBottom: '1px solid var(--mgt-border)', padding: '16px clamp(16px, 3vw, 32px)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #1677ff, #0958d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px #1677ff40' }}>
              <DashboardOutlined style={{ color: '#fff', fontSize: 22 }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em', fontWeight: 700, lineHeight: 1.2 }}>
                BẢNG ĐIỀU KHIỂN
              </Title>
              <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 12 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                Cập nhật mỗi 5 phút • {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {unclaimedCount > 0 && (
              <Link to="/leads" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--mgt-bg-warning)', border: '1px solid rgba(245,166,35,0.25)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
                  <Badge count={unclaimedCount} size="small" style={{ backgroundColor: '#f5a623' }}>
                    <AlertOutlined style={{ color: '#f5a623', fontSize: 15 }} />
                  </Badge>
                  <Text style={{ color: '#f5a623', fontSize: 13, fontWeight: 600 }}>{unclaimedCount} lead chưa nhận</Text>
                </div>
              </Link>
            )}
            {isAdmin && (
              <Select
                value={selectedBranchId ?? 'all'}
                onChange={v => setSelectedBranch(v === 'all' ? null : v)}
                style={{ width: 180, maxWidth: '100%' }}
                options={[{ label: 'Tất cả chi nhánh', value: 'all' }]}
                placeholder="Chọn chi nhánh"
                suffixIcon={<BankOutlined style={{ color: 'var(--mgt-text-secondary)' }} />}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size={36} style={{ background: 'linear-gradient(135deg, #1677ff, #722ed1)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                {user?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
              </Avatar>
              <div>
                <div style={{ color: 'var(--mgt-text-primary)', fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{user?.full_name ?? user?.email}</div>
                <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 11 }}>{isAdmin ? 'Quản trị viên' : 'Nhân viên'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px clamp(16px, 3vw, 32px) 0' }}>
        {unclaimedCount > 0 && (
          <Alert type="warning" showIcon icon={<ExclamationCircleOutlined />} closable
            message={<span style={{ fontFamily: "'Barlow', sans-serif", fontWeight: 600 }}>Có <strong style={{ color: '#f5a623' }}>{unclaimedCount} lead</strong> từ Facebook chưa được nhận xử lý</span>}
            action={<Link to="/leads"><span style={{ color: '#f5a623', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>Xem ngay →</span></Link>}
            style={{ background: 'var(--mgt-bg-warning)', border: '1px solid rgba(245,166,35,0.19)', borderRadius: 10, marginBottom: 24 }}
          />
        )}

        {/* KPI Cards */}
        <Spin spinning={dashLoading} tip="Đang tải...">
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}><KpiCard title="Thu hôm nay" value={formatVND(dashboard?.cash_today ?? 0)} subtitle="Đã thu trong ngày" icon={<FireOutlined />} accent="#f5a623" trend={12} /></Col>
            <Col xs={24} sm={12} lg={6}><KpiCard title="Doanh thu tháng" value={formatVND(dashboard?.revenue_mtd ?? 0)} subtitle={`Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`} icon={<RiseOutlined />} accent="#52c41a" /></Col>
            <Col xs={24} sm={12} lg={6}><KpiCard title="Còn nợ" value={formatVND(dashboard?.outstanding ?? 0)} subtitle="Chưa thanh toán đủ" icon={<WarningOutlined />} accent="#ff4d4f" /></Col>
            <Col xs={24} sm={12} lg={6}><KpiCard title="Học viên đang học" value={String(dashboard?.student_counts?.active ?? 0)} subtitle="Trạng thái active" icon={<TeamOutlined />} accent="#1677ff" /></Col>
          </Row>
        </Spin>

        {/* Charts */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={16}>
            <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, padding: '24px 24px 16px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <div style={{ color: 'var(--mgt-text-primary)', fontSize: 16, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.03em' }}>DOANH THU {currentYear}</div>
                  <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, marginTop: 2 }}>Theo tháng (đơn vị: triệu đồng)</div>
                </div>
                <Tag icon={<CalendarOutlined />} style={{ background: 'var(--mgt-tag-blue-bg)', borderColor: 'var(--mgt-tag-blue-border)', color: 'var(--mgt-tag-blue-text)', fontFamily: "'Barlow', sans-serif" }}>{currentYear}</Tag>
              </div>
              <Spin spinning={revLoading}><div style={{ height: 260 }}><Column {...columnConfig} /></div></Spin>
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, padding: '24px 24px 16px', height: '100%' }}>
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: 'var(--mgt-text-primary)', fontSize: 16, fontWeight: 700, fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.03em' }}>HỌC VIÊN</div>
                <div style={{ color: 'var(--mgt-text-secondary)', fontSize: 12, marginTop: 2 }}>Phân bổ theo trạng thái</div>
              </div>
              <Spin spinning={dashLoading}>
                <div style={{ height: 260 }}>
                  {statusPieData.length > 0 ? <Pie {...pieConfig} /> : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--mgt-text-secondary)', fontSize: 14 }}>Chưa có dữ liệu</div>
                  )}
                </div>
              </Spin>
            </div>
          </Col>
        </Row>

        {/* Staff + Student Status */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <StaffCollectionSection data={dashboard?.staff_collections_today ?? []} loading={dashLoading} />
          </Col>
          <Col xs={24} lg={10}>
            <StudentStatusSection studentCounts={studentCounts} />
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default DashboardPage
