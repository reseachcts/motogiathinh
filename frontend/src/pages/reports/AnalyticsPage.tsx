import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Area } from '@ant-design/charts'
import AnalyticsCharts from './AnalyticsCharts'
import { Button, Col, Row, Select, Spin } from 'antd'
import {
  DownloadOutlined, FilePdfOutlined, TeamOutlined, UserAddOutlined,
  WarningOutlined, FunnelPlotOutlined, RiseOutlined, FallOutlined,
} from '@ant-design/icons'
import { reportsApi } from '@/api/reports'
import { useAuthStore } from '@/store/authStore'
import { useBranchStore } from '@/store/branchStore'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useUiStore } from '@/store/uiStore'

const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + 'đ'
const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']
const CYAN   = { base: '#00E5FF', gradient: 'l(90) 0:#4DEBFF 1:#00E5FF' }
const VIOLET = { base: '#8B6CFF', gradient: 'l(90) 0:#A896FF 1:#8B6CFF' }

const STATUS_LABELS: Record<string, string> = { active: 'Đang học', completed: 'Hoàn thành', pending: 'Chờ duyệt', suspended: 'Tạm dừng', dropped: 'Nghỉ học' }
const STATUS_COLORS: Record<string, string> = { active: '#B6FF3C', completed: '#00E5FF', pending: '#FFB020', suspended: '#FFB020', dropped: '#6b7280' }

type PeriodType = 'monthly' | 'quarterly' | 'yearly'

function downloadBlob(data: Blob, filename: string) {
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

const AnalyticsPage: React.FC = () => {
  const isAdmin = useAuthStore(s => s.isAdmin())
  const branchId = useAuthStore(s => s.branchId())
  const { selectedBranchId } = useBranchStore()
  const tc = useThemeColors()
  const isDark = useUiStore(s => s.themeMode) === 'dark'
  const axisLine = isDark ? '#484f58' : '#d9d9d9'
  const gridLine = isDark ? 'rgba(255,255,255,0.09)' : '#f0f0f0'

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [compareYear, setCompareYear] = useState<number | null>(currentYear - 1)
  const [periodType, setPeriodType] = useState<PeriodType>('yearly')
  const [selMonth, setSelMonth] = useState(new Date().getMonth() + 1)
  const [selQuarter, setSelQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [exporting, setExporting] = useState(false)

  const effectiveBranch = isAdmin ? (selectedBranchId ?? undefined) : (branchId ?? undefined)

  const axisX = { labelFill: tc['--mgt-text-secondary'], labelFontSize: 11, lineStroke: axisLine, tickStroke: axisLine }
  const axisYvnd = { ...axisX, gridStroke: gridLine, gridLineDash: [4, 4], labelFormatter: (v: number) => `${(v / 1_000_000).toFixed(0)}tr` }
  const axisYcnt = { ...axisX, gridStroke: gridLine, gridLineDash: [4, 4] }
  const PIE_LEGEND = { position: 'right' as const, itemName: { style: { fill: tc['--mgt-text-secondary'], fontSize: 11 } } }
  const PIE_STAT = { title: { style: { color: tc['--mgt-text-secondary'], fontSize: 11 } }, content: { style: { color: tc['--mgt-text-primary'], fontSize: 20, fontWeight: 700 } } }

  const { data: a, isLoading } = useQuery({
    queryKey: ['analytics', year, effectiveBranch],
    queryFn: () => reportsApi.getAnalytics(year, effectiveBranch).then(r => r.data),
  })
  const { data: revenue } = useQuery({
    queryKey: ['revenue', year, effectiveBranch],
    queryFn: () => reportsApi.getRevenue(year, effectiveBranch).then(r => r.data),
  })
  const { data: compareRevenue } = useQuery({
    queryKey: ['revenue', compareYear, effectiveBranch],
    queryFn: () => reportsApi.getRevenue(compareYear!, effectiveBranch).then(r => r.data),
    enabled: compareYear !== null,
  })
  const { data: compareAnalytics } = useQuery({
    queryKey: ['analytics', compareYear, effectiveBranch],
    queryFn: () => reportsApi.getAnalytics(compareYear!, effectiveBranch).then(r => r.data),
    enabled: compareYear !== null,
  })

  // ── KPI sums ──────────────────────────────────────────────────────────────
  const currRevTotal = revenue?.reduce((s, r) => s + r.total, 0) ?? 0
  const prevRevTotal = compareRevenue?.reduce((s, r) => s + r.total, 0) ?? 0
  const newThisYear = a?.new_students_by_month.reduce((s, r) => s + r.count, 0) ?? 0
  const prevYearStudTotal = compareAnalytics?.new_students_by_month.reduce((s, r) => s + r.count, 0) ?? 0
  const revGrowth = compareYear !== null && prevRevTotal > 0 ? (currRevTotal - prevRevTotal) / prevRevTotal * 100 : null
  const stuGrowth = compareYear !== null && prevYearStudTotal > 0 ? (newThisYear - prevYearStudTotal) / prevYearStudTotal * 100 : null

  const totalLeads = (a?.leads_by_status ?? []).reduce((s, r) => s + r.count, 0)
  const enrolledLeads = a?.leads_by_status.find(r => r.trang_thai === 'enrolled')?.count ?? 0
  const convRate = totalLeads > 0 ? Math.round((enrolledLeads / totalLeads) * 100) : 0

  // ── Chart data ────────────────────────────────────────────────────────────
  const revenueCompData = MONTHS.flatMap((m, i) => {
    const main = { month: m, Năm: String(year), value: revenue?.find(r => r.month === i + 1)?.total ?? 0 }
    if (compareYear === null) return [main]
    return [main, { month: m, Năm: String(compareYear), value: compareRevenue?.find(r => r.month === i + 1)?.total ?? 0 }]
  })
  const studentCompData = MONTHS.flatMap((m, i) => {
    const main = { month: m, Năm: String(year), value: a?.new_students_by_month.find(r => r.month === i + 1)?.count ?? 0 }
    if (compareYear === null) return [main]
    return [main, { month: m, Năm: String(compareYear), value: compareAnalytics?.new_students_by_month.find(r => r.month === i + 1)?.count ?? 0 }]
  })

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i
    return { label: String(y), value: y }
  })

  const compAreaConfig = (data: object[], yField: string, formatter: (d: any) => { name: string; value: string }, axisY: object) => ({
    data,
    xField: 'month',
    yField,
    shape: 'smooth',
    ...(compareYear !== null ? {
      seriesField: 'Năm',
      color: (datum: { Năm: string }) => datum.Năm === String(year) ? CYAN.base : VIOLET.base,
      style: (datum: { Năm: string }) => ({
        fill: datum.Năm === String(year)
          ? 'l(270) 0:rgba(0,229,255,0.22) 1:rgba(0,229,255,0)'
          : 'l(270) 0:rgba(139,108,255,0.16) 1:rgba(139,108,255,0)',
        stroke: datum.Năm === String(year) ? CYAN.base : VIOLET.base,
        lineWidth: 2.5,
      }),
      legend: { position: 'top-right' as const, itemName: { style: { fill: tc['--mgt-text-secondary'], fontSize: 12, fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif' } } },
    } : {
      style: {
        fill: 'l(270) 0:rgba(0,229,255,0.22) 1:rgba(0,229,255,0)',
        stroke: CYAN.base,
        lineWidth: 2.5,
      },
      legend: false,
    }),
    label: false,
    tooltip: { formatter },
    axis: { x: axisX, y: axisY },
  })

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

  const growthColor = (g: number | null) => g === null ? 'var(--fg-3)' : g >= 0 ? 'var(--neon-lime)' : 'var(--neon-pink)'

  return (
    <div style={{ padding: '0 0 48px' }}>

      {/* TopBar */}
      <div style={{ padding: '24px clamp(16px,3vw,32px) 20px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>THỐNG KÊ</span>
            <h1 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32, letterSpacing: '-0.025em', color: 'var(--fg-1)', lineHeight: 1.1 }}>
              Phân tích & Báo cáo
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Select value={periodType} onChange={v => setPeriodType(v as PeriodType)} size="small"
              options={[{label:'Theo tháng',value:'monthly'},{label:'Theo quý',value:'quarterly'},{label:'Cả năm',value:'yearly'}]}
              style={{ width: 120 }} />
            {periodType === 'monthly' && <Select value={selMonth} onChange={setSelMonth} size="small"
              options={Array.from({length:12},(_,i)=>({label:`Tháng ${i+1}`,value:i+1}))} style={{ width: 100 }} />}
            {periodType === 'quarterly' && <Select value={selQuarter} onChange={setSelQuarter} size="small"
              options={[1,2,3,4].map(q=>({label:`Quý ${q}`,value:q}))} style={{ width: 80 }} />}
            <Select value={year} onChange={v => { setYear(v); if (compareYear === v) setCompareYear(null) }}
              size="small" options={yearOptions} style={{ width: 90 }} />
            <span style={{ color: 'var(--fg-4)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>vs</span>
            <Select value={compareYear ?? 'none'}
              onChange={v => setCompareYear(v === 'none' ? null : v as number)}
              size="small" style={{ width: 100 }}
              options={[{ label: '—', value: 'none' }, ...yearOptions.map(o => ({ ...o, disabled: o.value === year }))]} />
            <Button icon={<FilePdfOutlined />} loading={exporting} onClick={handleExportPdf} size="small">PDF</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportExcel} size="small">Excel</Button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 clamp(16px,3vw,32px)' }}>
        <Spin spinning={isLoading}>

          {/* ── YoY Growth KPIs ─────────────────────────────────────────────── */}
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={12} sm={6}>
              <div className="glass-card" style={{ padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>Doanh thu {year}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--neon-cyan)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{formatVND(currRevTotal)}</div>
                {compareYear !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: growthColor(revGrowth), fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {revGrowth !== null ? (revGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />) : null}
                    {revGrowth !== null ? `${Math.abs(revGrowth).toFixed(1)}%` : '—'} vs {compareYear}
                  </div>
                )}
                {compareYear !== null && <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{compareYear}: {formatVND(prevRevTotal)}</div>}
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="glass-card" style={{ padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 4 }}>Học viên mới {year}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--neon-lime)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>{newThisYear}</div>
                {compareYear !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: 12, color: growthColor(stuGrowth), fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {stuGrowth !== null ? (stuGrowth >= 0 ? <RiseOutlined /> : <FallOutlined />) : null}
                    {stuGrowth !== null ? `${Math.abs(stuGrowth).toFixed(1)}%` : '—'} vs {compareYear}
                  </div>
                )}
                {compareYear !== null && <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>{compareYear}: {prevYearStudTotal} HV</div>}
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(139,108,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--neon-violet)', flexShrink: 0 }}><FunnelPlotOutlined /></div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Tỉ lệ chuyển đổi</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{convRate}%</div>
                  <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{enrolledLeads}/{totalLeads} lead</div>
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,61,138,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--neon-pink)', flexShrink: 0 }}><WarningOutlined /></div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Quá hạn ({a?.overdue_count ?? 0})</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--neon-pink)', fontVariantNumeric: 'tabular-nums' }}>{formatVND(a?.overdue_amount ?? 0)}</div>
                </div>
              </div>
            </Col>
          </Row>

          {/* ── Summary KPIs ─────────────────────────────────────────────────── */}
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} sm={6}>
              <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(0,229,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: 'var(--neon-cyan)', flexShrink: 0 }}><TeamOutlined /></div>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>Tổng học viên</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{(a?.total_students ?? 0).toLocaleString()}</div>
                </div>
              </div>
            </Col>
            {(a?.students_by_status ?? []).map(s => (
              <Col xs={12} sm={6} key={s.status}>
                <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: `${STATUS_COLORS[s.status] ?? '#6b7280'}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: STATUS_COLORS[s.status] ?? '#6b7280', flexShrink: 0 }}><UserAddOutlined /></div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{STATUS_LABELS[s.status] ?? s.status}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>{s.count}</div>
                    <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)' }}>{a && a.total_students > 0 ? Math.round(s.count / a.total_students * 100) : 0}%</div>
                  </div>
                </div>
              </Col>
            ))}
          </Row>

          {/* ── Revenue comparison ───────────────────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>DOANH THU THEO THÁNG</span>
              <h3 style={{ margin: '4px 0 16px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
                {compareYear !== null ? `So sánh ${year} vs ${compareYear}` : `Năm ${year}`}
              </h3>
              <div style={{ height: 260 }}>
                <Area {...compAreaConfig(revenueCompData, 'value', (d: any) => ({ name: d.Năm, value: formatVND(d.value) }), axisYvnd) as any} />
              </div>
            </div>
          </div>

          {/* ── Student acquisition comparison ───────────────────────────────── */}
          <div style={{ marginBottom: 16 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>HỌC VIÊN MỚI THEO THÁNG</span>
              <h3 style={{ margin: '4px 0 16px', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
                {compareYear !== null ? `So sánh ${year} vs ${compareYear}` : `Năm ${year}`}
              </h3>
              <div style={{ height: 220 }}>
                <Area {...compAreaConfig(studentCompData, 'value', (d: any) => ({ name: d.Năm, value: `${d.value} HV` }), axisYcnt) as any} />
              </div>
            </div>
          </div>

          <AnalyticsCharts analyticsData={a} year={year} axisX={axisX} axisYvnd={axisYvnd} PIE_LEGEND={PIE_LEGEND} PIE_STAT={PIE_STAT} />

        </Spin>
      </div>
    </div>
  )
}

export default AnalyticsPage
