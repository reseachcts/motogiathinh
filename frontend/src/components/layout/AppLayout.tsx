import React, { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Badge, Drawer, Layout, Menu, Tooltip, Typography } from 'antd'
import { useQuery } from '@tanstack/react-query'
import {
  BankOutlined, BarChartOutlined, CarOutlined,
  CloseOutlined, DashboardOutlined, GiftOutlined, HistoryOutlined,
  KeyOutlined, LeftOutlined, LogoutOutlined, MenuOutlined, MessageOutlined,
  MoonOutlined, RightOutlined, SettingOutlined, SunOutlined,
  TeamOutlined, UserOutlined,
} from '@ant-design/icons'
import { useAuth } from '@/hooks/useAuth'
import { useUiStore } from '@/store/uiStore'
import { leadsApi } from '@/api/leads'

const { Sider, Content } = Layout
const { Text } = Typography
const MOBILE_BP = 768
const COLLAPSE_BP = 1100

const useScreenSize = () => {
  const get = () => ({
    isMobile: window.innerWidth < MOBILE_BP,
    shouldCollapse: window.innerWidth < COLLAPSE_BP,
  })
  const [state, setState] = useState(get)
  useEffect(() => {
    const handler = () => setState(get())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return state
}

const AppLayout: React.FC = () => {
  const location = useLocation()
  const { user, isAdmin, logout } = useAuth()
  const { isMobile, shouldCollapse } = useScreenSize()
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < COLLAPSE_BP)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { themeMode, toggleTheme } = useUiStore()
  const isDark = themeMode === 'dark'

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  // Auto-collapse sidebar when viewport narrows (zoom in or small window)
  useEffect(() => { if (shouldCollapse) setCollapsed(true) }, [shouldCollapse])

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
    { key: '/payments',  icon: <BankOutlined />,      label: <Link to="/payments">Thu học phí</Link> },
    {
      key: '/leads', icon: <MessageOutlined />,
      label: (
        <Link to="/leads" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Leads
          {unclaimedCount > 0 && <Badge count={unclaimedCount} size="small" style={{ backgroundColor: '#f5a623' }} />}
        </Link>
      ),
    },
    { key: '/analytics', icon: <BarChartOutlined />, label: <Link to="/analytics">Thống kê</Link> },
    ...(isAdmin ? [
      { key: '/instructors', icon: <UserOutlined />,     label: <Link to="/instructors">Giáo viên</Link> },
      { key: '/vehicles',    icon: <CarOutlined />,      label: <Link to="/vehicles">Phương tiện</Link> },
      { key: '/promotions',  icon: <GiftOutlined />,     label: <Link to="/promotions">Khuyến mãi</Link> },
      { key: '/admin',       icon: <SettingOutlined />,  label: <Link to="/admin">Quản trị</Link> },
      { key: '/admin/logs',  icon: <HistoryOutlined />,  label: <Link to="/admin/logs">Nhật ký</Link> },
    ] : []),
  ]

  const sidebarContent = (
    <>
      <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--glass-stroke)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--neon-cyan-haze)', border: '1px solid rgba(0,229,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CarOutlined style={{ color: 'var(--neon-cyan)', fontSize: 18 }} />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', color: 'var(--fg-1)', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>MOTO GIA THỊNH</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-3)', marginTop: 2 }}>CRM trung tâm dạy lái</div>
            </div>
          </div>
          <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
            <div onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--glass-2)', border: '1px solid var(--glass-stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-3)', flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-3)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-2)' }}>
              {isDark ? <SunOutlined style={{ fontSize: 14 }} /> : <MoonOutlined style={{ fontSize: 14 }} />}
            </div>
          </Tooltip>
        </div>
      </div>
      <Menu theme={isDark ? 'dark' : 'light'} mode="inline" selectedKeys={[selectedKey]} items={menuItems} style={{ border: 'none', marginTop: 8, background: 'transparent' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--glass-stroke)' }}>
        <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <Text style={{ color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.full_name ?? user?.email}
            </Text>
            <Text style={{ color: 'var(--fg-3)', fontSize: 11 }}>{isAdmin ? 'Admin' : 'Nhân viên'}</Text>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <Tooltip title="Đổi mật khẩu">
              <Link to="/profile"><KeyOutlined style={{ color: 'var(--fg-3)', fontSize: 16, cursor: 'pointer' }} /></Link>
            </Tooltip>
            <Tooltip title="Đăng xuất">
              <LogoutOutlined onClick={logout} style={{ color: 'var(--fg-3)', fontSize: 16, cursor: 'pointer' }} />
            </Tooltip>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{
          position: 'sticky', top: 0, zIndex: 99, padding: '10px 16px',
          background: 'var(--glass-2)', backdropFilter: 'blur(24px) saturate(140%)',
          borderBottom: '1px solid var(--glass-stroke)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <MenuOutlined onClick={() => setMobileOpen(true)} style={{ fontSize: 20, color: 'var(--fg-1)', cursor: 'pointer' }} />
            <span style={{ fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif', color: 'var(--fg-1)', fontSize: 14, fontWeight: 700, letterSpacing: '0.04em' }}>
              MOTO GIA THỊNH
            </span>
          </div>
          <div onClick={toggleTheme} style={{ cursor: 'pointer', color: 'var(--fg-3)', fontSize: 18 }}>
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
          width={Math.min(260, Math.round(window.innerWidth * 0.85))}
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
        <div style={{ position: 'sticky', top: 0, height: '100vh', flexShrink: 0, overflow: 'visible', zIndex: 100, padding: '12px 0 12px 12px' }}>
          <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} trigger={null} width={240} collapsedWidth={64}
            className="mgt-sidebar"
            style={{ background: 'var(--sidebar-bg)', backdropFilter: 'blur(24px) saturate(140%)', WebkitBackdropFilter: 'blur(24px) saturate(140%)', border: '1px solid var(--glass-stroke)', borderRadius: 20, boxShadow: 'var(--glass-card-shadow)', height: '100%', overflow: 'hidden' }}>
            <div style={{ padding: collapsed ? '20px 0' : '16px 16px 14px', borderBottom: '1px solid var(--glass-stroke)' }}>
              {collapsed ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--neon-cyan-haze)', border: '1px solid rgba(0,229,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <CarOutlined style={{ color: 'var(--neon-cyan)', fontSize: 18 }} />
                  </div>
                  <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'} placement="right">
                    <div onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--glass-2)', border: '1px solid var(--glass-stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-3)' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-3)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-2)' }}>
                      {isDark ? <SunOutlined style={{ fontSize: 14 }} /> : <MoonOutlined style={{ fontSize: 14 }} />}
                    </div>
                  </Tooltip>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--neon-cyan-haze)', border: '1px solid rgba(0,229,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CarOutlined style={{ color: 'var(--neon-cyan)', fontSize: 18 }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', color: 'var(--fg-1)', fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', lineHeight: 1.2 }}>MOTO GIA THỊNH</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-3)', marginTop: 2 }}>CRM trung tâm dạy lái</div>
                    </div>
                  </div>
                  <Tooltip title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}>
                    <div onClick={toggleTheme} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--glass-2)', border: '1px solid var(--glass-stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-3)', flexShrink: 0 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-3)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--glass-2)' }}>
                      {isDark ? <SunOutlined style={{ fontSize: 14 }} /> : <MoonOutlined style={{ fontSize: 14 }} />}
                    </div>
                  </Tooltip>
                </div>
              )}
            </div>
            <Menu theme={isDark ? 'dark' : 'light'} mode="inline" selectedKeys={[selectedKey]} items={menuItems} style={{ border: 'none', marginTop: 8, background: 'transparent' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--glass-stroke)' }}>
              <div style={{ padding: collapsed ? '10px 0' : '10px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
                {collapsed ? (
                  <Tooltip title="Đăng xuất"><LogoutOutlined onClick={logout} style={{ color: 'var(--fg-3)', fontSize: 16, cursor: 'pointer' }} /></Tooltip>
                ) : (
                  <div style={{ padding: '10px', borderRadius: 14, background: 'var(--ink-2)', border: '1px solid var(--glass-stroke)', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <Text style={{ color: 'var(--fg-1)', fontSize: 13, fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-ui)' }}>{user?.full_name ?? user?.email}</Text>
                      <Text style={{ color: 'var(--fg-3)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>{isAdmin ? 'Admin' : 'Nhân viên'}</Text>
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                      <Tooltip title="Đổi mật khẩu"><Link to="/profile"><KeyOutlined style={{ color: 'var(--fg-3)', fontSize: 16, cursor: 'pointer' }} /></Link></Tooltip>
                      <Tooltip title="Đăng xuất"><LogoutOutlined onClick={logout} style={{ color: 'var(--fg-3)', fontSize: 16, cursor: 'pointer' }} /></Tooltip>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Sider>
          <div className="mgt-collapse-btn" onClick={() => setCollapsed(!collapsed)}
            style={{ position: 'absolute', top: 28, right: -12, zIndex: 101, width: 24, height: 24, borderRadius: '50%', background: 'var(--ink-2)', border: '1px solid var(--glass-stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--fg-3)', fontSize: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', transition: 'background 0.2s ease, color 0.2s ease, transform 0.2s ease' }}>
            {collapsed ? <RightOutlined /> : <LeftOutlined />}
          </div>
        </div>
      )}

      <Layout style={{ background: 'transparent', minWidth: 0, overflow: 'hidden' }}>
        <Content style={{ background: 'transparent', minWidth: 0 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout
