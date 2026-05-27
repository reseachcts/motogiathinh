import React from 'react'
import { Column, Pie } from '@ant-design/charts'
import { Col, Row } from 'antd'

const formatVND = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + 'đ'

const LICENSE_COLORS: Record<string, string> = { A1: '#00E5FF', A2: '#B6FF3C', B1: '#FFB020', B2: '#FF3D8A', C: '#8B6CFF', D: '#00E5FF', E: '#FF3D8A', F: '#FFB020' }
const SOURCE_COLORS:  Record<string, string> = { facebook: '#1877f2', walk_in: '#B6FF3C', referral: '#8B6CFF', zalo: '#0068ff', chatbot: '#FFB020', other: '#6b7280' }
const SOURCE_LABELS:  Record<string, string> = { facebook: 'Facebook', walk_in: 'Trực tiếp', referral: 'Giới thiệu', zalo: 'Zalo', chatbot: 'Chatbot', other: 'Khác' }
const METHOD_COLORS:  Record<string, string> = { cash: '#B6FF3C', bank_transfer: '#00E5FF', momo: '#FF3D8A', zalopay: '#0068ff' }
const METHOD_LABELS:  Record<string, string> = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', momo: 'MoMo', zalopay: 'ZaloPay' }
const LEAD_STATUS_COLORS: Record<string, string> = { new: '#00E5FF', contacted: '#FFB020', enrolled: '#B6FF3C', lost: '#FF3D8A', unclaimed: '#6b7280' }
const LEAD_STATUS_LABELS: Record<string, string> = { new: 'Mới', contacted: 'Đã liên hệ', enrolled: 'Đã đăng ký', lost: 'Mất', unclaimed: 'Chưa nhận' }
const STATUS_LABELS: Record<string, string> = { active: 'Đang học', completed: 'Hoàn thành', pending: 'Chờ duyệt', suspended: 'Tạm dừng', dropped: 'Nghỉ học' }
const STATUS_COLORS: Record<string, string> = { active: '#B6FF3C', completed: '#00E5FF', pending: '#FFB020', suspended: '#FFB020', dropped: '#6b7280' }
const CYAN_BASE = '#00E5FF'

interface AnalyticsData {
  total_students: number
  students_by_status: { status: string; count: number }[]
  students_by_license: { license_type: string; count: number }[]
  revenue_by_license: { license_type: string; total: number }[]
  leads_by_source: { lead_source: string; count: number }[]
  leads_by_status: { trang_thai: string; count: number }[]
  payments_by_method: { phuong_thuc: string; total: number }[]
}

interface Props {
  analyticsData: AnalyticsData | undefined
  year: number
  axisX: object
  axisYvnd: object
  PIE_LEGEND: object
  PIE_STAT: object
}

export default function AnalyticsCharts({ analyticsData: a, year, axisX, axisYvnd, PIE_LEGEND, PIE_STAT }: Props) {
  const totalLeads = (a?.leads_by_status ?? []).reduce((s, r) => s + r.count, 0)

  const licenseData      = (a?.students_by_license ?? []).map(r => ({ type: r.license_type, value: r.count }))
  const statusData       = (a?.students_by_status ?? []).map(r => ({ type: STATUS_LABELS[r.status] ?? r.status, value: r.count, _key: r.status }))
  const revLicData       = (a?.revenue_by_license ?? []).sort((a, b) => b.total - a.total).map(r => ({ type: r.license_type, 'Doanh thu': r.total }))
  const leadSourceData   = (a?.leads_by_source ?? []).map(r => ({ type: SOURCE_LABELS[r.lead_source] ?? r.lead_source, value: r.count, _key: r.lead_source }))
  const leadStatusData   = (a?.leads_by_status ?? []).map(r => ({ type: LEAD_STATUS_LABELS[r.trang_thai] ?? r.trang_thai, value: r.count, _key: r.trang_thai }))
  const paymentMethodData = (a?.payments_by_method ?? []).map(r => ({ method: METHOD_LABELS[r.phuong_thuc] ?? r.phuong_thuc, 'Doanh thu': r.total, _key: r.phuong_thuc }))

  return (
    <>
      {/* ── Status breakdown + Revenue by license ─────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={10}>
          <div className="glass-card" style={{ padding: 20, height: '100%' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>TRẠNG THÁI HỌC VIÊN</span>
            <div style={{ height: 220, marginTop: 12 }}>
              <Pie data={statusData.length ? statusData : [{ type: '—', value: 1, _key: '' }]}
                angleField="value" colorField="type"
                color={statusData.length ? statusData.map(d => STATUS_COLORS[d._key] ?? '#6b7280') : ['#e8e8e8']}
                radius={0.85} innerRadius={0.62} label={false}
                statistic={{ ...(PIE_STAT as any), title: { ...(PIE_STAT as any).title, content: 'Tổng' }, content: { ...(PIE_STAT as any).content, content: String(a?.total_students ?? 0) } }}
                legend={PIE_LEGEND} tooltip={{ formatter: (d: any) => ({ name: d.type, value: `${d.value} HV` }) }} />
            </div>
          </div>
        </Col>
        <Col xs={24} lg={14}>
          <div className="glass-card" style={{ padding: 20, height: '100%' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>DOANH THU THEO LOẠI BẰNG — {year}</span>
            <div style={{ height: 220, marginTop: 12 }}>
              {revLicData.length > 0 ? (
                <Column data={revLicData} xField="type" yField="Doanh thu"
                  color={({ type }: any) => LICENSE_COLORS[type] ?? CYAN_BASE}
                  columnStyle={{ radius: [4,4,0,0] }} label={false}
                  tooltip={{ formatter: (d: any) => ({ name: `Bằng ${d.type}`, value: formatVND(d['Doanh thu']) }) }}
                  axis={{ x: axisX, y: axisYvnd }} />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--fg-3)', fontSize: 13 }}>
                  Chưa có dữ liệu thanh toán năm {year}
                </div>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* ── License type count + Lead source ──────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={10}>
          <div className="glass-card" style={{ padding: 20, height: '100%' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>PHÂN BỔ LOẠI BẰNG</span>
            <div style={{ height: 220, marginTop: 12 }}>
              <Pie data={licenseData.length ? licenseData : [{ type: '—', value: 1 }]}
                angleField="value" colorField="type"
                color={licenseData.length ? licenseData.map(d => LICENSE_COLORS[d.type] ?? '#6b7280') : ['#e8e8e8']}
                radius={0.85} innerRadius={0.62} label={false}
                statistic={{ ...(PIE_STAT as any), title: { ...(PIE_STAT as any).title, content: 'Tổng' }, content: { ...(PIE_STAT as any).content, content: String(a?.total_students ?? 0) } }}
                legend={PIE_LEGEND} tooltip={{ formatter: (d: any) => ({ name: d.type, value: `${d.value} HV` }) }} />
            </div>
          </div>
        </Col>
        <Col xs={24} lg={14}>
          <div className="glass-card" style={{ padding: 20, height: '100%' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>NGUỒN LEAD — {year}</span>
            <div style={{ height: 220, marginTop: 12 }}>
              <Pie data={leadSourceData.length ? leadSourceData : [{ type: '—', value: 1, _key: '' }]}
                angleField="value" colorField="type"
                color={leadSourceData.length ? leadSourceData.map(d => SOURCE_COLORS[d._key] ?? '#6b7280') : ['#e8e8e8']}
                radius={0.85} innerRadius={0.62} label={false}
                statistic={{ ...(PIE_STAT as any), title: { ...(PIE_STAT as any).title, content: 'Tổng lead' }, content: { ...(PIE_STAT as any).content, content: String(totalLeads) } }}
                legend={PIE_LEGEND} tooltip={{ formatter: (d: any) => ({ name: d.type, value: `${d.value} lead` }) }} />
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Lead status + Payment method ──────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <div className="glass-card" style={{ padding: 20, height: '100%' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>TRẠNG THÁI LEAD — {year}</span>
            <div style={{ height: 220, marginTop: 12 }}>
              <Pie data={leadStatusData.length ? leadStatusData : [{ type: '—', value: 1, _key: '' }]}
                angleField="value" colorField="type"
                color={leadStatusData.length ? leadStatusData.map(d => LEAD_STATUS_COLORS[d._key] ?? '#6b7280') : ['#e8e8e8']}
                radius={0.85} innerRadius={0.62} label={false}
                statistic={{ ...(PIE_STAT as any), title: { ...(PIE_STAT as any).title, content: 'Tổng' }, content: { ...(PIE_STAT as any).content, content: String(totalLeads) } }}
                legend={PIE_LEGEND} tooltip={{ formatter: (d: any) => ({ name: d.type, value: `${d.value} lead` }) }} />
            </div>
          </div>
        </Col>
        {paymentMethodData.length > 0 && (
          <Col xs={24} lg={12}>
            <div className="glass-card" style={{ padding: 20, height: '100%' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-3)' }}>PHƯƠNG THỨC THANH TOÁN — {year}</span>
              <div style={{ height: 220, marginTop: 12 }}>
                <Column data={paymentMethodData} xField="method" yField="Doanh thu"
                  color={({ method }: any) => { const k = Object.entries(METHOD_LABELS).find(([, v]) => v === method)?.[0]; return k ? (METHOD_COLORS[k] ?? CYAN_BASE) : CYAN_BASE }}
                  columnStyle={{ radius: [4,4,0,0] }} label={false}
                  tooltip={{ formatter: (d: any) => ({ name: d.method, value: formatVND(d['Doanh thu']) }) }}
                  axis={{ x: axisX, y: axisYvnd }} />
              </div>
            </div>
          </Col>
        )}
      </Row>
    </>
  )
}
