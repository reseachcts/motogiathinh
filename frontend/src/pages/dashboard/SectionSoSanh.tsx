import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { adminApi } from '@/api/admin'
import LineChart, { type Series } from '@/components/charts/LineChart'
import ToggleLegend from '@/components/charts/ToggleLegend'
import BucketControls, { type Grain } from '@/components/charts/BucketControls'
import { formatVND } from './constants'

// Branch color tones — sorted by ma_chi_nhanh (index 0, 1, 2)
const BRANCH_PALETTES = [
  { name: 'Cyan',   tones: ['#00E5FF', '#0096B0', '#03657A'] },
  { name: 'Pink',   tones: ['#FF3D8A', '#C2185B', '#7A1140'] },
  { name: 'Violet', tones: ['#B6A0FF', '#7B5BD9', '#4B2F8E'] },
]

function countOptions(grain: Grain) {
  if (grain === 'hour') return [12, 24, 48]
  if (grain === 'month') return [6, 12, 24]
  return [10, 30, 60]
}

interface BranchInfo { id: string; ma_chi_nhanh: string; ten_chi_nhanh: string; dia_chi: string | null }

function SoSanhChart({ kind, branches }: { kind: 'revenue' | 'students'; branches: BranchInfo[] }) {
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

  // Fetch timeseries for each branch
  const branchQueries = branches.map((b, bi) => {
    const palette = BRANCH_PALETTES[bi % BRANCH_PALETTES.length]
    return { branch: b, palette }
  })

  const query0 = useQuery({
    queryKey: ['timeseries', kind, grain, count, false, branches[0]?.id],
    queryFn: () => reportsApi.getTimeseries({ type: kind, grain, count, branch_id: branches[0]?.id }).then(r => r.data),
    enabled: !!branches[0],
    staleTime: 60_000,
  })
  const query1 = useQuery({
    queryKey: ['timeseries', kind, grain, count, false, branches[1]?.id],
    queryFn: () => reportsApi.getTimeseries({ type: kind, grain, count, branch_id: branches[1]?.id }).then(r => r.data),
    enabled: !!branches[1],
    staleTime: 60_000,
  })
  const query2 = useQuery({
    queryKey: ['timeseries', kind, grain, count, false, branches[2]?.id],
    queryFn: () => reportsApi.getTimeseries({ type: kind, grain, count, branch_id: branches[2]?.id }).then(r => r.data),
    enabled: !!branches[2],
    staleTime: 60_000,
  })

  const queryResults = [query0, query1, query2]
  const labels = queryResults.find(q => q.data)?.data?.map(d => d.label) ?? []

  const series: Series[] = []
  branchQueries.forEach(({ branch, palette }, bi) => {
    const data = queryResults[bi]?.data ?? []
    if (kind === 'revenue') {
      series.push({ id: `${branch.id}-tong`, label: `${branch.ten_chi_nhanh} · Tổng`,    color: palette.tones[0], bold: true,  data: data.map(d => d.tong) })
      series.push({ id: `${branch.id}-daN`,  label: `${branch.ten_chi_nhanh} · Đã nhận`, color: palette.tones[1],              data: data.map(d => d.da_nhan) })
      series.push({ id: `${branch.id}-conN`, label: `${branch.ten_chi_nhanh} · Còn nợ`,  color: palette.tones[2], dashed: true, data: data.map(d => d.con_no) })
    } else {
      series.push({ id: `${branch.id}-tong`, label: `${branch.ten_chi_nhanh} · Tổng`, color: palette.tones[0], bold: true,  data: data.map(d => d.tong) })
      series.push({ id: `${branch.id}-A`,    label: `${branch.ten_chi_nhanh} · A`,    color: palette.tones[1],              data: data.map(d => d.da_nhan) })
      series.push({ id: `${branch.id}-A1`,   label: `${branch.ten_chi_nhanh} · A1`,   color: palette.tones[2], dashed: true, data: data.map(d => d.a1) })
    }
  })

  const grainTxt = grain === 'hour' ? 'giờ' : grain === 'day' ? 'ngày' : 'tháng'

  return (
    <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>
            {kind === 'revenue' ? 'DOANH THU' : 'HỌC VIÊN MỚI'} · 3 CHI NHÁNH
          </span>
          <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>
            So sánh theo {grainTxt}
          </h3>
        </div>
        <BucketControls grain={grain} setGrain={setGrain} count={count} setCount={setCount} countOptions={opts} />
      </div>
      <ToggleLegend items={series} hidden={hidden} onToggle={toggle} />
      <LineChart
        xLabels={labels}
        series={series}
        hidden={hidden}
        allowFill={false}
        height={300}
        yFmt={kind === 'revenue'
          ? v => v >= 1e6 ? Math.round(v / 1e6) + 'M' : v >= 1e3 ? Math.round(v / 1e3) + 'k' : String(v)
          : v => Math.round(v).toString()}
        tipFmt={kind === 'revenue' ? v => formatVND(v) : v => `${v} HV`}
      />
    </div>
  )
}

export default function SectionSoSanh() {
  const { data: branches = [] } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => adminApi.listBranches().then(r => r.data),
    staleTime: 5 * 60_000,
  })

  if (branches.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 18 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>03</span>
        <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>So sánh</h2>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-3)' }}>3 chi nhánh chồng lên cùng biểu đồ — bấm legend để bật/tắt</span>
      </div>
      <SoSanhChart kind="revenue" branches={branches.slice(0, 3)} />
      <SoSanhChart kind="students" branches={branches.slice(0, 3)} />
    </div>
  )
}
