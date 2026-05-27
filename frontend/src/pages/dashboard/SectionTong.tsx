import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import LineChart from '@/components/charts/LineChart'
import ToggleLegend from '@/components/charts/ToggleLegend'
import BucketControls, { type Grain } from '@/components/charts/BucketControls'
import { formatVND } from './constants'

interface Props {
  branchId?: string
}

function countOptions(grain: Grain) {
  if (grain === 'hour') return [12, 24, 48]
  if (grain === 'month') return [6, 12, 24]
  return [10, 30, 60]
}

function grainLabel(grain: Grain) {
  return grain === 'hour' ? 'giờ này' : grain === 'day' ? 'hôm nay' : 'tháng này'
}

function TongKpi({ label, value, color, big, dim }: { label: string; value: string | number; color: string; big?: boolean; dim?: boolean }) {
  const c = `var(--neon-${color})`
  return (
    <div className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{label}</span>
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: big ? 28 : 22, lineHeight: 1,
        color: dim ? 'var(--fg-2)' : c, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em',
        textShadow: big && !dim ? `0 0 24px color-mix(in oklab, ${c} 30%, transparent)` : 'none',
      }}>{value}</span>
    </div>
  )
}

function CumChart({ kind, branchId, grain, count }: { kind: 'revenue' | 'students'; branchId?: string; grain: Grain; count: number }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const n = new Set(hidden)
    n.has(id) ? n.delete(id) : n.add(id)
    setHidden(n)
  }

  const { data = [] } = useQuery({
    queryKey: ['timeseries', kind, grain, count, true, branchId],
    queryFn: () => reportsApi.getTimeseries({ type: kind, grain, count, cumulative: true, branch_id: branchId }).then(r => r.data),
    staleTime: 60_000,
  })

  const labels = data.map(d => d.label)

  if (kind === 'revenue') {
    const series = [
      { id: 'tong',   label: 'Tổng',    color: '#00E5FF', bold: true, fill: true,  data: data.map(d => d.tong) },
      { id: 'daN',    label: 'Đã nhận', color: '#B6FF3C',                           data: data.map(d => d.da_nhan) },
      { id: 'conN',   label: 'Còn nợ',  color: '#FF3D8A', dashed: true,             data: data.map(d => d.con_no) },
    ]
    return (
      <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>DOANH THU · CỘNG DỒN</span>
          <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>{count} mốc gần nhất</h3>
        </div>
        <ToggleLegend items={series} hidden={hidden} onToggle={toggle} />
        <LineChart xLabels={labels} series={series} hidden={hidden}
          yFmt={v => v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : v >= 1e6 ? Math.round(v / 1e6) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(v)}
          tipFmt={v => formatVND(v)} />
      </div>
    )
  }

  const series = [
    { id: 'tong', label: 'Tổng', color: '#00E5FF', bold: true, fill: true, data: data.map(d => d.tong) },
    { id: 'A',    label: 'A',    color: '#8B6CFF',                         data: data.map(d => d.da_nhan) },
    { id: 'A1',   label: 'A1',   color: '#FFB020',                         data: data.map(d => d.a1) },
  ]
  return (
    <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>HỌC VIÊN · CỘNG DỒN</span>
        <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>{count} mốc gần nhất</h3>
      </div>
      <ToggleLegend items={series} hidden={hidden} onToggle={toggle} />
      <LineChart xLabels={labels} series={series} hidden={hidden}
        yFmt={v => Math.round(v).toString()}
        tipFmt={v => `${v} HV`} />
    </div>
  )
}

export default function SectionTong({ branchId }: Props) {
  const [grain, setGrain] = useState<Grain>('day')
  const [count, setCount] = useState(30)
  const opts = countOptions(grain)
  useEffect(() => { if (!opts.includes(count)) setCount(opts[1]) }, [grain])

  const { data: revBkt = [] } = useQuery({
    queryKey: ['timeseries', 'revenue', grain, count, false, branchId],
    queryFn: () => reportsApi.getTimeseries({ type: 'revenue', grain, count, cumulative: false, branch_id: branchId }).then(r => r.data),
    staleTime: 60_000,
  })
  const { data: stuBkt = [] } = useQuery({
    queryKey: ['timeseries', 'students', grain, count, false, branchId],
    queryFn: () => reportsApi.getTimeseries({ type: 'students', grain, count, cumulative: false, branch_id: branchId }).then(r => r.data),
    staleTime: 60_000,
  })
  const { data: revCum = [] } = useQuery({
    queryKey: ['timeseries', 'revenue', grain, count, true, branchId],
    queryFn: () => reportsApi.getTimeseries({ type: 'revenue', grain, count, cumulative: true, branch_id: branchId }).then(r => r.data),
    staleTime: 60_000,
  })
  const { data: stuCum = [] } = useQuery({
    queryKey: ['timeseries', 'students', grain, count, true, branchId],
    queryFn: () => reportsApi.getTimeseries({ type: 'students', grain, count, cumulative: true, branch_id: branchId }).then(r => r.data),
    staleTime: 60_000,
  })

  const revTongCum       = revCum[revCum.length - 1]?.tong ?? 0
  const revCurrIncrement = revBkt[revBkt.length - 1]?.da_nhan ?? 0
  const stuTongCum       = stuCum[stuCum.length - 1]?.tong ?? 0
  const stuCurrIncrement = stuBkt[stuBkt.length - 1]?.tong ?? 0
  const nodeLabel        = grainLabel(grain)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 18 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>01</span>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>Tổng</h2>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-3)' }}>Cộng dồn theo thời gian — phản ánh quy mô tích lũy</span>
        </div>
        <BucketControls grain={grain} setGrain={setGrain} count={count} setCount={setCount} countOptions={opts} />
      </div>

      {/* 4 mini KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <TongKpi label="Doanh thu · cộng dồn"     value={formatVND(revTongCum)}         color="lime" big />
        <TongKpi label={`Doanh thu · ${nodeLabel}`} value={`+${formatVND(revCurrIncrement)}`} color="lime" dim />
        <TongKpi label="Học viên · cộng dồn"       value={Math.round(stuTongCum)}         color="cyan" big />
        <TongKpi label={`Học viên · ${nodeLabel}`}  value={`+${Math.round(stuCurrIncrement)}`} color="cyan" dim />
      </div>

      {/* 2 cumulative charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16 }}>
        <CumChart kind="revenue" branchId={branchId} grain={grain} count={count} />
        <CumChart kind="students" branchId={branchId} grain={grain} count={count} />
      </div>
    </div>
  )
}
