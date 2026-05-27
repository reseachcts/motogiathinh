import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Alert, Avatar, Badge, Col, Row, Select, Spin } from 'antd'
import {
  AlertOutlined, BankOutlined, ExclamationCircleOutlined,
  FireOutlined, RiseOutlined, TeamOutlined, WarningOutlined,
} from '@ant-design/icons'
import { reportsApi } from '@/api/reports'
import { leadsApi } from '@/api/leads'
import { useAuthStore } from '@/store/authStore'
import { useBranchStore } from '@/store/branchStore'
import { formatVND } from './constants'
import KpiCard from './KpiCard'
import StaffCollectionSection from './StaffCollectionSection'
import SectionTong from './SectionTong'
import SectionBienDong from './SectionBienDong'
import SectionSoSanh from './SectionSoSanh'
import SectionHieuSuat from './SectionHieuSuat'

const DashboardPage: React.FC = () => {
  const user = useAuthStore(s => s.user)
  const isAdmin = useAuthStore(s => s.isAdmin())
  const branchId = useAuthStore(s => s.branchId())
  const { selectedBranchId, setSelectedBranch } = useBranchStore()

  const effectiveBranch = isAdmin ? (selectedBranchId ?? undefined) : (branchId ?? undefined)

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard', effectiveBranch],
    queryFn: () => reportsApi.getDashboard(effectiveBranch).then(r => r.data),
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  })

  const { data: unclaimedData } = useQuery({
    queryKey: ['unclaimed-leads'],
    queryFn: () => leadsApi.getUnclaimedCount().then(r => r.data),
    refetchInterval: 2 * 60_000,
  })

  const unclaimedCount = unclaimedData?.count ?? 0

  return (
    <div style={{ minHeight: '100vh', background: 'transparent', padding: '0 0 64px' }}>

      {/* Header */}
      <div style={{ padding: '24px clamp(16px,3vw,32px) 20px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>TỔNG QUAN</span>
            <h1 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32, letterSpacing: '-0.025em', color: 'var(--fg-1)', lineHeight: 1.1 }}>Bảng điều khiển</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {unclaimedCount > 0 && (
              <Link to="/leads" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--neon-amber-haze)', border: '1px solid rgba(255,176,32,0.25)', borderRadius: 10, padding: '6px 14px', cursor: 'pointer' }}>
                  <Badge count={unclaimedCount} size="small" style={{ backgroundColor: 'var(--neon-amber)' }}>
                    <AlertOutlined style={{ color: 'var(--neon-amber)', fontSize: 15 }} />
                  </Badge>
                  <span style={{ color: 'var(--neon-amber)', fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)' }}>{unclaimedCount} lead chưa nhận</span>
                </div>
              </Link>
            )}
            {isAdmin && (
              <Select
                value={selectedBranchId ?? 'all'}
                onChange={v => setSelectedBranch(v === 'all' ? null : v)}
                style={{ width: 180 }}
                options={[{ label: 'Tất cả chi nhánh', value: 'all' }]}
                placeholder="Chọn chi nhánh"
                suffixIcon={<BankOutlined style={{ color: 'var(--fg-3)' }} />}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar size={36} style={{ background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-violet))', fontWeight: 700, color: 'var(--fg-inverse)', fontFamily: 'var(--font-display)' }}>
                {user?.full_name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U'}
              </Avatar>
              <div>
                <div style={{ color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, lineHeight: 1.2, fontFamily: 'var(--font-ui)' }}>{user?.full_name ?? user?.email}</div>
                <div style={{ color: 'var(--fg-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{isAdmin ? 'Admin' : 'Nhân viên'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 clamp(16px,3vw,32px)' }}>
        {/* Leads alert */}
        {unclaimedCount > 0 && (
          <Alert type="warning" showIcon icon={<ExclamationCircleOutlined />} closable
            message={<span style={{ fontWeight: 600, fontFamily: 'var(--font-ui)' }}>Có <strong style={{ color: 'var(--neon-amber)' }}>{unclaimedCount} lead</strong> từ Facebook chưa được nhận xử lý</span>}
            action={<Link to="/leads"><span style={{ color: 'var(--neon-amber)', fontSize: 13, fontWeight: 600, textDecoration: 'underline' }}>Xem ngay →</span></Link>}
            style={{ background: 'var(--neon-amber-haze)', border: '1px solid rgba(255,176,32,0.20)', borderRadius: 10, marginBottom: 24 }}
          />
        )}

        {/* Top KPI cards */}
        <Spin spinning={dashLoading} tip="Đang tải...">
          <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
            <Col xs={24} sm={12} lg={6}><KpiCard title="Thu hôm nay" value={formatVND(dashboard?.cash_today ?? 0)} subtitle="Đã thu trong ngày" icon={<FireOutlined />} accent="#FFB020" trend={12} /></Col>
            <Col xs={24} sm={12} lg={6}><KpiCard title="Doanh thu tháng" value={formatVND(dashboard?.revenue_mtd ?? 0)} subtitle={`Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`} icon={<RiseOutlined />} accent="#B6FF3C" /></Col>
            <Col xs={24} sm={12} lg={6}><KpiCard title="Còn nợ" value={formatVND(dashboard?.outstanding ?? 0)} subtitle="Chưa thanh toán đủ" icon={<WarningOutlined />} accent="#FF3D8A" /></Col>
            <Col xs={24} sm={12} lg={6}><KpiCard title="Học viên đang học" value={String(dashboard?.student_counts?.active ?? 0)} subtitle="Trạng thái active" icon={<TeamOutlined />} accent="#00E5FF" /></Col>
          </Row>
        </Spin>

        {/* 4 Dashboard sections */}
        <SectionTong branchId={effectiveBranch} />
        <SectionBienDong branchId={effectiveBranch} />
        {isAdmin && <SectionSoSanh />}
        {isAdmin && <SectionHieuSuat />}

        {/* Staff collection (admin only) */}
        {isAdmin && dashboard?.staff_collections_today && dashboard.staff_collections_today.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 18 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>05</span>
              <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>Hôm nay</h2>
            </div>
            <StaffCollectionSection data={dashboard.staff_collections_today} loading={dashLoading} />
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
