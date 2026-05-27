import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/reports'
import { adminApi } from '@/api/admin'
import type { DashboardStats } from '@/types'

const BRANCH_PALETTES = [
  ['#00E5FF', '#0096B0', '#03657A'],
  ['#FF3D8A', '#C2185B', '#7A1140'],
  ['#B6A0FF', '#7B5BD9', '#4B2F8E'],
]

interface BranchRow {
  id: string
  name: string
  palette: string[]
  cash_today: number
  revenue_mtd: number
  outstanding: number
  active_students: number
}

function TrieuValue({ n }: { n: number }) {
  const triệu = n / 1_000_000
  const fixed = triệu.toFixed(2)
  const [intPart, decPart] = fixed.split('.')
  const withSep = parseInt(intPart, 10).toLocaleString('en-US')
  return (
    <span>
      <span style={{ color: 'var(--fg-1)' }}>{withSep}</span>
      <span style={{ color: 'var(--fg-3)' }}>.{decPart}</span>
      <span style={{ color: 'var(--fg-3)', fontFamily: 'var(--font-ui)', fontWeight: 500, marginLeft: 4 }}>triệu</span>
    </span>
  )
}

function PillTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 12px', borderRadius: 999, cursor: 'pointer',
        border: `1px solid ${active ? 'var(--neon-cyan)' : 'var(--glass-stroke)'}`,
        background: active ? 'var(--ink-3)' : 'transparent',
        color: active ? 'var(--neon-cyan)' : 'var(--fg-3)',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em',
        boxShadow: active ? '0 0 10px var(--neon-cyan-haze)' : 'none',
        transition: 'all 140ms var(--ease-out)',
      }}
    >{children}</button>
  )
}

const METRICS = [
  { id: 'revenue_mtd',    label: 'Doanh thu tháng', kind: 'money', color: 'var(--neon-lime)',  acc: (r: BranchRow) => r.revenue_mtd },
  { id: 'cash_today',     label: 'Thu hôm nay',     kind: 'money', color: 'var(--neon-amber)', acc: (r: BranchRow) => r.cash_today },
  { id: 'outstanding',    label: 'Đang nợ',          kind: 'money', color: 'var(--neon-pink)',  acc: (r: BranchRow) => r.outstanding },
  { id: 'active_students',label: 'HV đang học',      kind: 'count', color: 'var(--neon-cyan)',  acc: (r: BranchRow) => r.active_students },
]

function BarRow({ metric, rows }: { metric: typeof METRICS[0]; rows: BranchRow[] }) {
  const max = Math.max(1, ...rows.map(metric.acc))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>{metric.label}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--ink-4)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(r => {
          const v = metric.acc(r)
          const pct = (v / max) * 100
          const tone = r.palette[0]
          return (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 160px) 1fr minmax(100px, 200px)', gap: 14, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--fg-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              <div style={{ position: 'relative', height: 22, background: 'var(--ink-3)', borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', background: tone,
                  boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tone} 80%, white)`,
                  transition: 'width 360ms var(--ease-out)',
                }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--fg-1)', fontWeight: 600, fontSize: 14 }}>
                {metric.kind === 'money' ? <TrieuValue n={v} /> : v.toLocaleString('en-US')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BranchMetricsRow({ row, allRows }: { row: BranchRow; allRows: BranchRow[] }) {
  const maxByMetric: Record<string, number> = {}
  METRICS.forEach(m => { maxByMetric[m.id] = Math.max(1, ...allRows.map(m.acc)) })
  const tone = row.palette[0]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: tone, boxShadow: `0 0 8px ${tone}`, flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.015em' }}>{row.name}</span>
        <span style={{ flex: 1, height: 1, background: 'var(--ink-4)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14 }}>
        {METRICS.map(m => {
          const v = m.acc(row)
          const pct = (v / maxByMetric[m.id]) * 100
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.label}</span>
              <div style={{ position: 'relative', height: 16, background: 'var(--ink-3)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: tone, transition: 'width 360ms var(--ease-out)' }} />
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--fg-1)', fontVariantNumeric: 'tabular-nums' }}>
                {m.kind === 'money' ? <TrieuValue n={v} /> : v.toLocaleString('en-US')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function SectionHieuSuat() {
  const [view, setView] = useState<'metric' | 'branch'>('metric')

  const { data: branches = [] } = useQuery({
    queryKey: ['admin-branches'],
    queryFn: () => adminApi.listBranches().then(r => r.data),
    staleTime: 5 * 60_000,
  })

  // Fetch dashboard stats per branch in parallel
  const b0 = useQuery<DashboardStats>({
    queryKey: ['dashboard', branches[0]?.id],
    queryFn: () => reportsApi.getDashboard(branches[0]?.id).then(r => r.data),
    enabled: !!branches[0],
    staleTime: 5 * 60_000,
  })
  const b1 = useQuery<DashboardStats>({
    queryKey: ['dashboard', branches[1]?.id],
    queryFn: () => reportsApi.getDashboard(branches[1]?.id).then(r => r.data),
    enabled: !!branches[1],
    staleTime: 5 * 60_000,
  })
  const b2 = useQuery<DashboardStats>({
    queryKey: ['dashboard', branches[2]?.id],
    queryFn: () => reportsApi.getDashboard(branches[2]?.id).then(r => r.data),
    enabled: !!branches[2],
    staleTime: 5 * 60_000,
  })

  const dashResults = [b0, b1, b2]

  const rows: BranchRow[] = branches.slice(0, 3).map((b, i) => {
    const d = dashResults[i]?.data
    return {
      id: b.id,
      name: b.ten_chi_nhanh,
      palette: BRANCH_PALETTES[i % BRANCH_PALETTES.length],
      cash_today: d?.cash_today ?? 0,
      revenue_mtd: d?.revenue_mtd ?? 0,
      outstanding: d?.outstanding ?? 0,
      active_students: d?.student_counts?.active ?? 0,
    }
  })

  if (branches.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginTop: 18 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>04</span>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, color: 'var(--fg-1)', letterSpacing: '-0.02em' }}>Hiệu suất</h2>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--fg-3)' }}>Đánh giá toàn diện theo chi nhánh</span>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <PillTab active={view === 'metric'} onClick={() => setView('metric')}>Theo chỉ số</PillTab>
          <PillTab active={view === 'branch'} onClick={() => setView('branch')}>Theo chi nhánh</PillTab>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 22 }}>
        {view === 'metric' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {METRICS.map(m => <BarRow key={m.id} metric={m} rows={rows} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {rows.map(r => <BranchMetricsRow key={r.id} row={r} allRows={rows} />)}
          </div>
        )}
      </div>
    </div>
  )
}
