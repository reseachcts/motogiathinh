import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Column } from '@ant-design/charts'
import { Button, Col, Row, Select, Spin } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import { reportsApi } from '@/api/reports'
import { useAuthStore } from '@/store/authStore'
import { useBranchStore } from '@/store/branchStore'
import { useThemeColors } from '@/hooks/useThemeColors'
import { useUiStore } from '@/store/uiStore'

const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ'
const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']
const CYAN   = { base: '#00E5FF', gradient: 'l(90) 0:#4DEBFF 1:#00E5FF' }
const VIOLET = { base: '#8B6CFF', gradient: 'l(90) 0:#A896FF 1:#8B6CFF' }

const ReportsPage: React.FC = () => {
  const isAdmin = useAuthStore(s => s.isAdmin())
  const branchId = useAuthStore(s => s.branchId())
  const { selectedBranchId } = useBranchStore()
  const tc = useThemeColors()
  const isDark = useUiStore(s => s.themeMode) === 'dark'
  const axisLine = isDark ? '#484f58' : '#d9d9d9'
  const gridLine = isDark ? 'rgba(255,255,255,0.09)' : '#f0f0f0'

  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [compareYear, setCompareYear] = useState<number | null>(null)

  const effectiveBranch = isAdmin ? (selectedBranchId ?? undefined) : (branchId ?? undefined)

  const { data: revenue, isLoading } = useQuery({
    queryKey: ['revenue', year, effectiveBranch],
    queryFn: () => reportsApi.getRevenue(year, effectiveBranch).then(r => r.data),
  })

  const { data: prevRevenue } = useQuery({
    queryKey: ['revenue', compareYear, effectiveBranch],
    queryFn: () => reportsApi.getRevenue(compareYear!, effectiveBranch).then(r => r.data),
    enabled: compareYear !== null,
  })

  const totalRevenue = revenue?.reduce((sum, r) => sum + r.total, 0) ?? 0
  const totalPrev = prevRevenue?.reduce((sum, r) => sum + r.total, 0) ?? 0

  const chartData = MONTHS.flatMap((month, i) => {
    const main = { month, năm: String(year), 'Doanh thu': revenue?.find(r => r.month === i + 1)?.total ?? 0 }
    if (compareYear === null) return [main]
    return [main, { month, năm: String(compareYear), 'Doanh thu': prevRevenue?.find(r => r.month === i + 1)?.total ?? 0 }]
  })

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - i
    return { label: String(y), value: y }
  })

  const axisX = { labelFill: tc['--mgt-text-secondary'], labelFontSize: 11, lineStroke: axisLine, tickStroke: axisLine }
  const axisY = { ...axisX, gridStroke: gridLine, gridLineDash: [4, 4], labelFormatter: (v: number) => `${(v / 1_000_000).toFixed(0)}tr` }

  const columnConfig = {
    data: chartData,
    xField: 'month',
    yField: 'Doanh thu',
    ...(compareYear !== null ? {
      seriesField: 'năm',
      isGroup: true,
      color: (datum: { năm: string }) => datum.năm === String(year) ? CYAN.base : VIOLET.base,
      columnStyle: (datum: { năm: string }) => ({
        radius: [4, 4, 0, 0],
        fill: datum.năm === String(year) ? CYAN.gradient : VIOLET.gradient,
      }),
      legend: {
        position: 'top-right' as const,
        itemName: { style: { fill: tc['--mgt-text-secondary'], fontSize: 12, fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif' } },
      },
    } : {
      color: CYAN.base,
      columnStyle: { radius: [4, 4, 0, 0], fill: CYAN.gradient },
      legend: false,
    }),
    label: false,
    tooltip: { formatter: (d: { năm: string; 'Doanh thu': number }) => ({ name: d.năm, value: formatVND(d['Doanh thu']) }) },
    axis: { x: axisX, y: axisY },
  }

  return (
    <div style={{ padding: '0 0 48px' }}>

      {/* TopBar */}
      <div style={{ padding: '24px clamp(16px,3vw,32px) 20px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>THỐNG KÊ</span>
            <h1 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 32, letterSpacing: '-0.025em', color: 'var(--fg-1)', lineHeight: 1.1 }}>
              Báo cáo doanh thu
            </h1>
          </div>
          <Button icon={<DownloadOutlined />} style={{ fontWeight: 600 }}>Xuất Excel</Button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 clamp(16px,3vw,32px)' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)', display: 'block' }}>DOANH THU THEO THÁNG</span>
                  <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
                    {compareYear !== null ? 'So sánh theo tháng' : `Năm ${year}`}
                  </h3>
                  <div style={{ marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--neon-cyan)', fontVariantNumeric: 'tabular-nums' }}>
                      {year}: {formatVND(totalRevenue)}
                    </span>
                    {compareYear !== null && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--neon-violet)', fontVariantNumeric: 'tabular-nums' }}>
                        {compareYear}: {formatVND(totalPrev)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Select
                    value={year}
                    onChange={v => {
                      setYear(v)
                      if (compareYear === v) setCompareYear(null)
                    }}
                    size="small"
                    style={{ width: 86 }}
                    options={yearOptions}
                  />
                  <span style={{ color: 'var(--fg-4)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>vs</span>
                  <Select
                    value={compareYear ?? 'none'}
                    onChange={v => setCompareYear(v === 'none' ? null : v as number)}
                    size="small"
                    style={{ width: 100 }}
                    options={[
                      { label: '—', value: 'none' },
                      ...yearOptions.map(o => ({ ...o, disabled: o.value === year })),
                    ]}
                  />
                </div>
              </div>
              <Spin spinning={isLoading}>
                <div style={{ height: 380 }}>
                  <Column {...columnConfig} />
                </div>
              </Spin>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default ReportsPage
