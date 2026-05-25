import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Column, Pie } from '@ant-design/charts'
import { Button, Col, Row, Select, Spin, Typography } from 'antd'
import {
  DownloadOutlined, FilePdfOutlined, TeamOutlined, UserAddOutlined,
  WarningOutlined, FunnelPlotOutlined, RiseOutlined, FallOutlined,
} from '@ant-design/icons'
import { reportsApi } from '@/api/reports'
import { useAuthStore } from '@/store/authStore'
import { useBranchStore } from '@/store/branchStore'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useUiStore } from '@/store/uiStore'

const { Title } = Typography

const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + 'đ'
const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

const LICENSE_COLORS: Record<string, string> = { A1: '#1677ff', A2: '#52c41a', B1: '#fa8c16', B2: '#eb2f96', C: '#722ed1', D: '#13c2c2', E: '#f5222d', F: '#faad14' }
const SOURCE_COLORS: Record<string, string> = { facebook: '#1877f2', walk_in: '#52c41a', referral: '#722ed1', zalo: '#0068ff', chatbot: '#fa8c16', other: '#8c8c8c' }
const SOURCE_LABELS: Record<string, string> = { facebook: 'Facebook', walk_in: 'Trực tiếp', referral: 'Giới thiệu', zalo: 'Zalo', chatbot: 'Chatbot', other: 'Khác' }
const METHOD_COLORS: Record<string, string> = { cash: '#52c41a', bank_transfer: '#1677ff', momo: '#d82d8b', zalopay: '#0068ff' }
const METHOD_LABELS: Record<string, string> = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', momo: 'MoMo', zalopay: 'ZaloPay' }
const LEAD_STATUS_COLORS: Record<string, string> = { new: '#1677ff', contacted: '#fa8c16', enrolled: '#52c41a', lost: '#f5222d', unclaimed: '#8c8c8c' }
const LEAD_STATUS_LABELS: Record<string, string> = { new: 'Mới', contacted: 'Đã liên hệ', enrolled: 'Đã đăng ký', lost: 'Mất', unclaimed: 'Chưa nhận' }
const STATUS_LABELS: Record<string, string> = { active: 'Đang học', completed: 'Hoàn thành', pending: 'Chờ duyệt', suspended: 'Tạm dừng', dropped: 'Nghỉ học' }
const STATUS_COLORS: Record<string, string> = { active: '#52c41a', completed: '#1677ff', pending: '#fa8c16', suspended: '#faad14', dropped: '#8c8c8c' }

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 16, padding: 20, height: '100%' }}>
    <div style={{ color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 15, fontWeight: 700, marginBottom: 16, letterSpacing: '0.03em' }}>{title}</div>
    {children}
  </div>
)

const KpiCard = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) => (
  <div style={{ background: 'var(--mgt-gradient-card)', border: '1px solid var(--mgt-border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color, flexShrink: 0 }}>{icon}</div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 10, color: 'var(--mgt-text-secondary)', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--mgt-text-secondary)', marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
)

const GrowthCard = ({ label, value, growth, prevValue, color }: { label: string; value: string; growth: number | null; prevValue: string; color: string }) => {
  const up = growth !== null && growth >= 0
  const growthColor = growth === null ? 'var(--mgt-text-secondary)' : growth >= 0 ? '#52c41a' : '#f5222d'
  return (
    <div style={{ background: 'var(--mgt-gradient-card)', border: `1px solid var(--mgt-border)`, borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 10, color: 'var(--mgt-text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1.2 }}>{value}</div>
      {growth !== null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: growthColor, fontWeight: 600 }}>
          {up ? <RiseOutlined /> : <FallOutlined />}
          {Math.abs(growth).toFixed(1)}% so với năm trước
        </div>
      ) : (
        <div style={{ fontSize: 11, color: 'var(--mgt-text-secondary)', marginTop: 4 }}>Chưa có dữ liệu năm trước</div>
      )}
      <div style={{ fontSize: 10, color: 'var(--mgt-text-secondary)', marginTop: 2 }}>Năm trước: {prevValue}</div>
    </div>
  )
}

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

type PeriodType = 'monthly' | 'quarterly' | 'yearly'

const AnalyticsPage: React.FC = () => {
  const isAdmin = useAuthStore(s => s.isAdmin())
  const branchId = useAuthStore(s => s.branchId())
  const { selectedBranchId } = useBranchStore()
  const [year, setYear] = useState(new Date().getFullYear())
  const [periodType, setPeriodType] = useState<PeriodType>('yearly')
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1)
  const [selQuarter, setSelQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [exporting, setExporting] = useState(false)

  const tc = useThemeColors()
  const isDark = useUiStore(s => s.themeMode) === 'dark'
  const textSecondary = tc['--mgt-text-secondary']
  const axisLine = isDark ? '#484f58' : '#d9d9d9'
  const gridLine = isDark ? 'rgba(255,255,255,0.09)' : '#f0f0f0'
  const textBody = tc['--mgt-text-body']
  const textPrimary = tc['--mgt-text-primary']

  // G2 v5 axis config (xAxis/yAxis are v1-only and ignored in @ant-design/charts v2)
  const axisX = { labelFill: textSecondary, labelFontSize: 11, lineStroke: axisLine, tickStroke: axisLine }
  const axisYvnd = { ...axisX, gridStroke: gridLine, gridLineDash: [4, 4], labelFormatter: (v: number) => `${(v / 1_000_000).toFixed(0)}tr` }
  const axisYcnt = { ...axisX, gridStroke: gridLine, gridLineDash: [4, 4] }

  // Pie legend/statistic — still v2-compatible via passthrough
  const PIE_LEGEND = { position: 'right' as const, itemName: { style: { fill: textBody, fontSize: 11 } } }
  const PIE_STAT = { title: { style: { color: textSecondary, fontSize: 11 } }, content: { style: { color: textPrimary, fontSize: 20, fontWeight: 700 } } }

  const effectiveBranch = isAdmin ? (selectedBranchId ?? undefined) : (branchId ?? undefined)

  const { data: a, isLoading } = useQuery({
    queryKey: ['analytics', year, effectiveBranch],
    queryFn: () => reportsApi.getAnalytics(year, effectiveBranch).then(r => r.data),
  })
  const { data: revenue } = useQuery({
    queryKey: ['revenue', year, effectiveBranch],
    queryFn: () => reportsApi.getRevenue(year, effectiveBranch).then(r => r.data),
  })

  // ── Data prep ─────────────────────────────────────────────────────────────
  const newThisYear = a?.new_students_by_month.reduce((s, r) => s + r.count, 0) ?? 0
  const prevYearStudTotal = a?.prev_new_students_by_month.reduce((s, r) => s + r.count, 0) ?? 0
  const currRevTotal = revenue?.reduce((s, r) => s + r.total, 0) ?? 0
  const prevRevTotal = a?.prev_year_revenue.reduce((s, r) => s + r.total, 0) ?? 0
  const revGrowth = prevRevTotal > 0 ? (currRevTotal - prevRevTotal) / prevRevTotal * 100 : null
  const stuGrowth = prevYearStudTotal > 0 ? (newThisYear - prevYearStudTotal) / prevYearStudTotal * 100 : null

  const totalLeads = (a?.leads_by_status ?? []).reduce((s, r) => s + r.count, 0)
  const enrolledLeads = a?.leads_by_status.find(r => r.trang_thai === 'enrolled')?.count ?? 0
  const convRate = totalLeads > 0 ? Math.round((enrolledLeads / totalLeads) * 100) : 0

  const revenueCompData = MONTHS.flatMap((m, i) => [
    { month: m, Năm: String(year), value: revenue?.find(r => r.month === i + 1)?.total ?? 0 },
    { month: m, Năm: String(year - 1), value: a?.prev_year_revenue.find(r => r.month === i + 1)?.total ?? 0 },
  ])
  const studentCompData = MONTHS.flatMap((m, i) => [
    { month: m, Năm: String(year), value: a?.new_students_by_month.find(r => r.month === i + 1)?.count ?? 0 },
    { month: m, Năm: String(year - 1), value: a?.prev_new_students_by_month.find(r => r.month === i + 1)?.count ?? 0 },
  ])

  const licenseData = (a?.students_by_license ?? []).map(r => ({ type: r.license_type, value: r.count }))
  const statusData = (a?.students_by_status ?? []).map(r => ({ type: STATUS_LABELS[r.status] ?? r.status, value: r.count, _key: r.status }))
  const revLicData = (a?.revenue_by_license ?? []).sort((a, b) => b.total - a.total).map(r => ({ type: r.license_type, 'Doanh thu': r.total }))
  const leadSourceData = (a?.leads_by_source ?? []).map(r => ({ type: SOURCE_LABELS[r.lead_source] ?? r.lead_source, value: r.count, _key: r.lead_source }))
  const leadStatusData = (a?.leads_by_status ?? []).map(r => ({ type: LEAD_STATUS_LABELS[r.trang_thai] ?? r.trang_thai, value: r.count, _key: r.trang_thai }))
  const paymentMethodData = (a?.payments_by_method ?? []).map(r => ({ method: METHOD_LABELS[r.phuong_thuc] ?? r.phuong_thuc, 'Doanh thu': r.total, _key: r.phuong_thuc }))

  const handleExportPdf = async () => {
    setExporting(true)
    try {
      const params: Record<string, unknown> = { year, period_type: periodType, branch_id: effectiveBranch }
      if (periodType === 'monthly') params.month = selMonth
      if (periodType === 'quarterly') params.quarter = selQuarter
      const res = await reportsApi.exportPdf(params as any)
      const name = periodType === 'monthly' ? `thongke-t${selMonth}-${year}.pdf`
        : periodType === 'quarterly' ? `thongke-q${selQuarter}-${year}.pdf`
        : `thongke-${year}.pdf`
      downloadBlob(new Blob([res.data], { type: 'application/pdf' }), name)
    } finally { setExporting(false) }
  }

  const handleExportExcel = async () => {
    const res = await reportsApi.exportExcel(year, effectiveBranch)
    downloadBlob(new Blob([res.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `thongke-${year}.xlsx`)
  }

  return (
    <div style={{ padding: '16px clamp(16px, 3vw, 32px)', fontFamily: "'Barlow', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@700;800&display=swap');`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={3} style={{ margin: 0, color: 'var(--mgt-text-primary)', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800 }}>THỐNG KÊ & BÁO CÁO</Title>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Select value={periodType} onChange={v => setPeriodType(v as PeriodType)} options={[{label:'Theo tháng',value:'monthly'},{label:'Theo quý',value:'quarterly'},{label:'Cả năm',value:'yearly'}]} style={{ width: 120 }} />
          {periodType === 'monthly' && <Select value={selMonth} onChange={setSelMonth} options={Array.from({length:12},(_,i)=>({label:`Tháng ${i+1}`,value:i+1}))} style={{ width: 100 }} />}
          {periodType === 'quarterly' && <Select value={selQuarter} onChange={setSelQuarter} options={[1,2,3,4].map(q=>({label:`Quý ${q}`,value:q}))} style={{ width: 80 }} />}
          <Select value={year} onChange={setYear} options={[2024,2025,2026].map(y=>({label:`Năm ${y}`,value:y}))} style={{ width: 110 }} />
          <Button icon={<FilePdfOutlined />} loading={exporting} onClick={handleExportPdf} style={{ background: '#fff2f0', borderColor: '#ffa39e', color: '#cf1322' }}>PDF</Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel} style={{ background: '#f6ffed', borderColor: '#b7eb8f', color: '#389e0d' }}>Excel</Button>
        </div>
      </div>

      <Spin spinning={isLoading}>

        {/* ── YoY Growth KPIs ─────────────────────────────────────────────── */}
        <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
          <Col xs={12} sm={6}>
            <GrowthCard label={`Doanh thu ${year}`} value={formatVND(currRevTotal)}
              growth={revGrowth} prevValue={formatVND(prevRevTotal)} color="#1677ff" />
          </Col>
          <Col xs={12} sm={6}>
            <GrowthCard label={`Học viên mới ${year}`} value={String(newThisYear)}
              growth={stuGrowth} prevValue={`${prevYearStudTotal} HV`} color="#52c41a" />
          </Col>
          <Col xs={12} sm={6}><KpiCard icon={<FunnelPlotOutlined />} label="Tỉ lệ chuyển đổi" value={`${convRate}%`} sub={`${enrolledLeads}/${totalLeads} lead`} color="#722ed1" /></Col>
          <Col xs={12} sm={6}><KpiCard icon={<WarningOutlined />} label={`Quá hạn (${a?.overdue_count ?? 0})`} value={formatVND(a?.overdue_amount ?? 0)} color="#f5222d" /></Col>
        </Row>

        {/* ── Summary KPIs ─────────────────────────────────────────────────── */}
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col xs={12} sm={6}><KpiCard icon={<TeamOutlined />} label="Tổng học viên (tất cả)" value={(a?.total_students ?? 0).toLocaleString()} color="#1677ff" /></Col>
          {(a?.students_by_status ?? []).map(s => (
            <Col xs={12} sm={6} key={s.status}>
              <KpiCard icon={<UserAddOutlined />} label={STATUS_LABELS[s.status] ?? s.status} value={String(s.count)}
                sub={`${a && a.total_students > 0 ? Math.round(s.count / a.total_students * 100) : 0}%`}
                color={STATUS_COLORS[s.status] ?? '#8c8c8c'} />
            </Col>
          ))}
        </Row>

        {/* ── Revenue comparison ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <Card title={`DOANH THU THEO THÁNG — SO SÁNH ${year} vs ${year - 1}`}>
            <div style={{ height: 260 }}>
              <Column data={revenueCompData} xField="month" yField="value" seriesField="Năm" group
                color={['#1677ff', isDark ? '#6ea8fe' : '#adc6ff']}
                columnStyle={{ radius: [4,4,0,0] }} label={false}
                tooltip={{ formatter: (d: any) => ({ name: d['Năm'], value: formatVND(d.value) }) }}
                axis={{ x: axisX, y: axisYvnd }} />
            </div>
          </Card>
        </div>

        {/* ── Student acquisition comparison ───────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <Card title={`HỌC VIÊN MỚI THEO THÁNG — SO SÁNH ${year} vs ${year - 1}`}>
            <div style={{ height: 220 }}>
              <Column data={studentCompData} xField="month" yField="value" seriesField="Năm" group
                color={['#52c41a', isDark ? '#95de64' : '#b7eb8f']}
                columnStyle={{ radius: [4,4,0,0] }} label={false}
                tooltip={{ formatter: (d: any) => ({ name: d['Năm'], value: `${d.value} HV` }) }}
                axis={{ x: axisX, y: axisYcnt }} />
            </div>
          </Card>
        </div>

        {/* ── Status breakdown + Revenue by license ───────────────────────── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={10}>
            <Card title="TRẠNG THÁI HỌC VIÊN (TẤT CẢ THỜI GIAN)">
              <div style={{ height: 220 }}>
                <Pie data={statusData.length ? statusData : [{ type: '—', value: 1, _key: '' }]}
                  angleField="value" colorField="type"
                  color={statusData.length ? statusData.map(d => STATUS_COLORS[d._key] ?? '#8c8c8c') : ['#e8e8e8']}
                  radius={0.85} innerRadius={0.62} label={false}
                  statistic={{ ...PIE_STAT, title: { ...PIE_STAT.title, content: 'Tổng' }, content: { ...PIE_STAT.content, content: String(a?.total_students ?? 0) } }}
                  legend={PIE_LEGEND} tooltip={{ formatter: (d: any) => ({ name: d.type, value: `${d.value} HV` }) }} />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card title={`DOANH THU THEO LOẠI BẰNG — ${year}`}>
              <div style={{ height: 220 }}>
                {revLicData.length > 0 ? (
                  <Column data={revLicData} xField="type" yField="Doanh thu"
                    color={({ type }: any) => LICENSE_COLORS[type] ?? '#1677ff'}
                    columnStyle={{ radius: [4,4,0,0] }} label={false}
                    tooltip={{ formatter: (d: any) => ({ name: `Bằng ${d.type}`, value: formatVND(d['Doanh thu']) }) }}
                    axis={{ x: axisX, y: axisYvnd }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--mgt-text-secondary)', fontSize: 13 }}>
                    Chưa có dữ liệu thanh toán năm {year}
                  </div>
                )}
              </div>
            </Card>
          </Col>
        </Row>

        {/* ── License type count + Lead source ────────────────────────────── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={10}>
            <Card title="PHÂN BỔ LOẠI BẰNG (SỐ HỌC VIÊN)">
              <div style={{ height: 220 }}>
                <Pie data={licenseData.length ? licenseData : [{ type: '—', value: 1 }]}
                  angleField="value" colorField="type"
                  color={licenseData.length ? licenseData.map(d => LICENSE_COLORS[d.type] ?? '#8c8c8c') : ['#e8e8e8']}
                  radius={0.85} innerRadius={0.62} label={false}
                  statistic={{ ...PIE_STAT, title: { ...PIE_STAT.title, content: 'Tổng' }, content: { ...PIE_STAT.content, content: String(a?.total_students ?? 0) } }}
                  legend={PIE_LEGEND} tooltip={{ formatter: (d: any) => ({ name: d.type, value: `${d.value} HV` }) }} />
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={14}>
            <Card title={`NGUỒN LEAD — ${year}`}>
              <div style={{ height: 220 }}>
                <Pie data={leadSourceData.length ? leadSourceData : [{ type: '—', value: 1, _key: '' }]}
                  angleField="value" colorField="type"
                  color={leadSourceData.length ? leadSourceData.map(d => SOURCE_COLORS[d._key] ?? '#8c8c8c') : ['#e8e8e8']}
                  radius={0.85} innerRadius={0.62} label={false}
                  statistic={{ ...PIE_STAT, title: { ...PIE_STAT.title, content: 'Tổng lead' }, content: { ...PIE_STAT.content, content: String(totalLeads) } }}
                  legend={PIE_LEGEND} tooltip={{ formatter: (d: any) => ({ name: d.type, value: `${d.value} lead` }) }} />
              </div>
            </Card>
          </Col>
        </Row>

        {/* ── Lead status + Payment method ────────────────────────────────── */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            <Card title={`TRẠNG THÁI LEAD — ${year}`}>
              <div style={{ height: 220 }}>
                <Pie data={leadStatusData.length ? leadStatusData : [{ type: '—', value: 1, _key: '' }]}
                  angleField="value" colorField="type"
                  color={leadStatusData.length ? leadStatusData.map(d => LEAD_STATUS_COLORS[d._key] ?? '#8c8c8c') : ['#e8e8e8']}
                  radius={0.85} innerRadius={0.62} label={false}
                  statistic={{ ...PIE_STAT, title: { ...PIE_STAT.title, content: 'Tổng' }, content: { ...PIE_STAT.content, content: String(totalLeads) } }}
                  legend={PIE_LEGEND} tooltip={{ formatter: (d: any) => ({ name: d.type, value: `${d.value} lead` }) }} />
              </div>
            </Card>
          </Col>
          {paymentMethodData.length > 0 && (
            <Col xs={24} lg={12}>
              <Card title={`PHƯƠNG THỨC THANH TOÁN — ${year}`}>
                <div style={{ height: 220 }}>
                  <Column data={paymentMethodData} xField="method" yField="Doanh thu"
                    color={({ method }: any) => { const k = Object.entries(METHOD_LABELS).find(([, v]) => v === method)?.[0]; return k ? (METHOD_COLORS[k] ?? '#1677ff') : '#1677ff' }}
                    columnStyle={{ radius: [4,4,0,0] }} label={false}
                    tooltip={{ formatter: (d: any) => ({ name: d.method, value: formatVND(d['Doanh thu']) }) }}
                    axis={{ x: axisX, y: axisYvnd }} />
                </div>
              </Card>
            </Col>
          )}
        </Row>

      </Spin>
    </div>
  )
}

export default AnalyticsPage
