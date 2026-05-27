import { apiClient } from './client'
import type { DashboardStats } from '@/types'

export interface TimeseriesBucket {
  label: string
  tong: number
  da_nhan: number
  con_no: number
  a1: number
}

export interface TimeseriesParams {
  type: 'revenue' | 'students'
  grain: 'hour' | 'day' | 'month'
  count: number
  cumulative?: boolean
  branch_id?: string
}

export interface AnalyticsData {
  total_students: number
  students_by_license: Array<{ license_type: string; count: number }>
  students_by_status: Array<{ status: string; count: number }>
  new_students_by_month: Array<{ month: number; count: number }>
  prev_new_students_by_month: Array<{ month: number; count: number }>
  prev_year_revenue: Array<{ month: number; total: number }>
  revenue_by_license: Array<{ license_type: string; total: number }>
  leads_by_source: Array<{ lead_source: string; count: number }>
  leads_by_status: Array<{ trang_thai: string; count: number }>
  payments_by_method: Array<{ phuong_thuc: string; total: number; count: number }>
  overdue_count: number
  overdue_amount: number
}

export const reportsApi = {
  getDashboard: (branch_id?: string) =>
    apiClient.get<DashboardStats>('/reports/dashboard', { params: { branch_id } }),

  getRevenue: (year: number, branch_id?: string) =>
    apiClient.get<Array<{ month: number; total: number }>>('/reports/revenue', {
      params: { year, branch_id },
    }),

  getAnalytics: (year: number, branch_id?: string) =>
    apiClient.get<AnalyticsData>('/reports/analytics', { params: { year, branch_id } }),

  exportPdf: (params: { year: number; period_type: string; month?: number; quarter?: number; branch_id?: string }) =>
    apiClient.get('/reports/export-pdf', { params, responseType: 'blob' }),

  exportExcel: (year: number, branch_id?: string) =>
    apiClient.get('/reports/export-excel', { params: { year, branch_id }, responseType: 'blob' }),

  getTimeseries: (params: TimeseriesParams) =>
    apiClient.get<TimeseriesBucket[]>('/reports/timeseries', { params }),
}
