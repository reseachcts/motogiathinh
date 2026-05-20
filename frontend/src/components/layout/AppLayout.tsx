import React, { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Badge, Drawer, Layout, Menu, Tooltip, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import {
  AuditOutlined, BankOutlined, CalendarOutlined, CarOutlined,
  CloseOutlined, DashboardOutlined, FileTextOutlined, LeftOutlined,
  LogoutOutlined, MenuOutlined, MessageOutlined, MoonOutlined,
  PieChartOutlined, RightOutlined, SettingOutlined, SunOutlined,
  TeamOutlined, TrophyOutlined, UserOutlined,
} from '@ant-design/icons'
import { useAuth } from '@/hooks/useAuth'
import { useUiStore } from '@/store/uiStore'
import { leadsApi } from '@/api/leads'

const { Sider, Content } = Layout
const { Text } = Typography
const MOBILE_BP = 768

const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth < MOBILE_BP)
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < MOBILE_BP)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return mobile
}

const AppLayout: React.FC = () => {
  const location = useLocation()
  const { user, isAdmin, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { themeMode, toggleTheme } = useUiStore()
  const isDark = themeMode === 'dark'
  const isMobile = useIsMobile()

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  const { data: unclaimedData } = useQuery({
    queryKey: ['unclaimed-leads'],
    queryFn: () => leadsApi.getUnclaimedCount().then(r => r.data),
    refetchInterval: 60_000,
  })
  const unclaimedCount = unclaimedData?.count ?? 0
  const selectedKey = '/' + location.pathname.split('/')[1]

  const menuItems = [
    { key: '/',          icon: <DashboardOutlined />, label: <Link to="/">Bảng điều khiển</Link> },
    { key: '/students',  icon: <TeamOutlined />,      label: <Link to="/students">Học viên</Link> },
    { key: '/classes',   icon: <AuditOutlined />,     label: <Link to="/classes">Lớp học</Link> },
    { key: '/schedule',  icon: <CalendarOutlined />,  label: <Link to="/schedule">Lịch học</Link> },
    { key: '/payments',  icon: <BankOutlined />,      label: <Link to="/payments">Thu học phí</Link> },
    { key: '/exams',     icon: <TrophyOutlined />,    label: <Link to="/exams">Thi bằng</Link> },
    { key: '/certificates', icon: <FileTextOutlined />, label: <Link to="/certificates">Chứng chỉ</Link> },
    {
      key: '/leads', icon: <MessageOutlined />,
      label: (
        <Link to="/leads" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Leads
          {unclaimedCount > 0 && <Badge count={unclaimedCount} size="small" style={{ backgroundColor: '#f5a623' }} />}
        </Link>
      ),
    },
    { key: '/reports',   icon: <PieChartOutlined />,  label: <Link to="/reports">Báo cáo</Link> },
    ...(isAdmin ? [
      { key: '/instructors', icon: <UserOutlined />, label: <Link to="/instructors">Giáo viên</Link> },
      { key: '/vehicles',    icon: <CarOutlined />,  label: <Link to="/vehicles">Phương tiện</Link> },
      { key: '/admin',       icon: <SettingOutlined />, label: <Link to="/admin">Quản trị</Link> },
    ] : []),
  ]

  const sidebarContent = (
    <>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--mgt-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #1677ff, #0958d9)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CarOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--mgt-text-primary)', fontSize: 15, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1.2 }}>
            MOTO GIA THỊNH
          </div>
        </div>
      </div>
      <Menu theme={isDark ? 'dark' : 'light'} mode="inline" selectedKeys={[selectedKey]} items={menuItems} style={{ border: 'none', marginTop: 8 }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--mgt-border)' }}>
        <div onClick={toggleTheme} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--mgt-text-secondary)', fontSize: 13 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--mgt-bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
          {isDark ? <SunOutlined /> : <MoonOutlined />}
          {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
        </div>
        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--mgt-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <Text style={{ color: 'var(--mgt-text-primary)', fontSize: 13, fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name ?? user?.email}
            </Text>
            <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 11 }}>{isAdmin ? 'Admin' : 'Nhân viên'}</Text>
          </div>
          <Tooltip title="Đăng xuất">
            <LogoutOutlined onClick={logout} style={{ color: 'var(--mgt-text-secondary)', fontSize: 16, cursor: 'pointer', flexShrink: 0 }} />
          </Tooltip>
        </div>
      </div>
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--mgt-bg-base)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');
        .mgt-sidebar .ant-menu { background: var(--mgt-bg-container) !important; font-family: 'Barlow', sans-serif !important; }
        .mgt-sidebar .ant-menu-item { border-radius: 8px !important; margin: 2px 8px !important; width: calc(100% - 16px) !important; }
        .mgt-sidebar .ant-menu-item-selected { background: var(--mgt-bg-hover) !important; }
        .mgt-sidebar .ant-menu-item:hover { background: var(--mgt-bg-hover) !important; }
        .mgt-sidebar .ant-menu-item a { color: var(--mgt-text-body) !important; }
        .mgt-sidebar .ant-menu-item-selected a { color: var(--mgt-accent-primary) !important; }
        .mgt-sidebar .ant-layout-sider-trigger { display: none !important; }
        .mgt-collapse-btn:hover { background: var(--mgt-accent-primary) !important; color: #fff !important; border-color: var(--mgt-accent-primary) !important; transform: scale(1.1); }
      `}</style>

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 99, padding: '10px 16px',
          background: 'var(--mgt-bg-container)', borderBottom: '1px solid var(--mgt-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MenuOutlined onClick={() => setMobileOpen(true)} style={{ fontSize: 20, color: 'var(--mgt-text-primary)', cursor: 'pointer' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--mgt-text-primary)', fontSize: 15, fontWeight: 800, letterSpacing: '0.05em' }}>
              MOTO GIA THỊNH
            </span>
          </div>
          <div onClick={toggleTheme} style={{ cursor: 'pointer', color: 'var(--mgt-text-secondary)', fontSize: 18 }}>
            {isDark ? <SunOutlined /> : <MoonOutlined />}
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          placement="left"
          width={260}
          closeIcon={<CloseOutlined style={{ color: 'var(--mgt-text-secondary)' }} />}
          className="mgt-sidebar"
          styles={{
            header: { display: 'none' },
            body: { padding: 0, background: 'var(--mgt-bg-container)', position: 'relative', height: '100%' },
          }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Desktop sidebar */}
      {!isMobile && (
        <div style={{ position: 'relative' }}>
          <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null} width={220} collapsedWidth={64}
            className="mgt-sidebar"
            style={{ background: 'var(--mgt-bg-container)', borderRight: '1px solid var(--mgt-border)', position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
            <div style={{ padding: collapsed ? '20px 0' : '20px 20px 16px', textAlign: collapsed ? 'center' : 'left', borderBottom: '1px solid var(--mgt-border)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #1677ff, #0958d9)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: collapsed ? 0 : 8 }}>
                <CarOutlined style={{ color: '#fff', fontSize: 18 }} />
              </div>
              {!collapsed && <div style={{ fontFamily: "'Barlow Condensed', sans-serif", color: 'var(--mgt-text-primary)', fontSize: 15, fontWeight: 800, letterSpacing: '0.05em', lineHeight: 1.2 }}>MOTO GIA THỊNH</div>}
            </div>
            <Menu theme={isDark ? 'dark' : 'light'} mode="inline" selectedKeys={[selectedKey]} items={menuItems} style={{ border: 'none', marginTop: 8 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--mgt-border)' }}>
              <div onClick={toggleTheme} style={{ padding: collapsed ? '12px 0' : '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 8, color: 'var(--mgt-text-secondary)', fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--mgt-bg-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                {isDark ? <SunOutlined /> : <MoonOutlined />}
                {!collapsed && (isDark ? 'Chế độ sáng' : 'Chế độ tối')}
              </div>
              <div style={{ padding: collapsed ? '10px 0' : '10px 16px', borderTop: '1px solid var(--mgt-border)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
                {collapsed ? (
                  <Tooltip title="Đăng xuất"><LogoutOutlined onClick={logout} style={{ color: 'var(--mgt-text-secondary)', fontSize: 16, cursor: 'pointer' }} /></Tooltip>
                ) : (
                  <>
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <Text style={{ color: 'var(--mgt-text-primary)', fontSize: 13, fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name ?? user?.email}</Text>
                      <Text style={{ color: 'var(--mgt-text-secondary)', fontSize: 11 }}>{isAdmin ? 'Admin' : 'Nhân viên'}</Text>
                    </div>
                    <Tooltip title="Đăng xuất"><LogoutOutlined onClick={logout} style={{ color: 'var(--mgt-text-secondary)', fontSize: 16, cursor: 'pointer', flexShrink: 0 }} /></Tooltip>
                  </>
                )}
              </div>
            </div>
          </Sider>
          <div className="mgt-collapse-btn" onClick={() => setCollapsed(!collapsed)}
            style={{ position: 'fixed', top: 28, left: collapsed ? 52 : 208, zIndex: 100, width: 24, height: 24, borderRadius: '50%', background: 'var(--mgt-bg-container)', border: '1px solid var(--mgt-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--mgt-text-secondary)', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'left 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.2s ease' }}>
            {collapsed ? <RightOutlined /> : <LeftOutlined />}
          </div>
        </div>
      )}

      <Layout style={{ background: 'var(--mgt-bg-base)' }}>
        <Content style={{ background: 'var(--mgt-bg-base)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
