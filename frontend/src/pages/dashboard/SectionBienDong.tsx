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

function BienDongChart({ kind, branchId }: { kind: 'revenue' | 'students'; branchId?: string }) {
  const [grain, setGrain] = useState<Grain>('day')
  const [count, setCount] = useState(30)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const opts = countOptions(grain)
  useEffect(() => { if (!opts.includes(count)) setCount(opts[1]) }, [grain])

  const toggle = (id: string) => {
    const n = new Set(hidden)
    n.has(id) ? n.delete(id) : n.add(id)
    setHidden(n)
  }

  const { data = [] } = useQuery({
    queryKey: ['timeseries', kind, grain, count, false, branchId],
    queryFn: () => reportsApi.getTimeseries({ type: kind, grain, count, cumulative: false, branch_id: branchId }).then(r => r.data),
    staleTime: 60_000,
  })

  const labels = data.map(d => d.label)

  const revSeries = [
    { id: 'tong',  label: 'Tổng',    color: '#00E5FF', bold: true, fill: true,  data: data.map(d => d.tong) },
    { id: 'daN',   label: 'Đã nhận', color: '#B6FF3C',                           data: data.map(d => d.da_nhan) },
    { id: 'conN',  label: 'Còn nợ',  color: '#FF3D8A', dashed: true,             data: data.map(d => d.con_no) },
  ]
  const stuSeries = [
    { id: 'tong',  label: 'Tổng', color: '#00E5FF', bold: true, fill: true, data: data.map(d => d.tong) },
    { id: 'A',     label: 'A',    color: '#8B6CFF',                         data: data.map(d => d.da_nhan) },
    { id: 'A1',    label: 'A1',   color: '#FFB020',                         data: data.map(d => d.a1) },
  ]
  const series = kind === 'revenue' ? revSeries : stuSeries

  const grainTxt = grain === 'hour' ? 'giờ' : grain === 'day' ? 'ngày' : 'tháng'

  return (
    <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>
            {kind === 'revenue' ? 'DOANH THU' : 'HỌC VIÊN MỚI'}
          </span>
          <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
            Biến động theo {grainTxt}
          </h3>
        </div>
        <BucketControls grain={grain} setGrain={setGrain} count={count} setCount={setCount} countOptions={opts} />
      </div>
      <ToggleLegend items={series} hidden={hidden} onToggle={toggle} />
      <LineChart
        xLabels={labels}
        series={series}
        hidden={hidden}
        yFmt={kind === 'revenue'
          ? v => v >= 1e6 ? Math.round(v / 1e6) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(v)
          : v => Math.round(v).toString()}
        tipFmt={kind === 'revenue' ? v => formatVND(v) : v => `${v} HV`}
      />
    </div>
  )
}

export default function SectionBienDong({ branchId }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 18 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>02</span>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>Biến động</h2>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-3)' }}>Theo từng mốc thời gian — phản ánh nhịp độ</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 16 }}>
        <BienDongChart kind="revenue" branchId={branchId} />
        <BienDongChart kind="students" branchId={branchId} />
      </div>
    </div>
  )
}
