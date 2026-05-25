import { apiClient } from './client'

export type VehicleStatus = 'active' | 'maintenance' | 'retired'

export interface VehicleListItem {
  id: string
  branch_id: string
  bien_so: string
  loai_xe: string
  hang_xe: string | null
  ten_xe: string | null
  loai_bang_lai: string
  trang_thai: VehicleStatus
  odometer_km: number
  ngay_het_dang_kiem: string | null
  bao_hiem_den_ngay: string | null
}

export interface VehicleOut extends VehicleListItem {
  nam_san_xuat: number | null
  mau_xe: string | null
  so_khung: string | null
  so_may: string | null
  dung_tich_may: number | null
  ngay_dang_kiem: string | null
  last_service_km: number
  last_service_date: string | null
  next_service_km: number | null
  purchase_date: string | null
  purchase_price: string | null
  anh_xe_url: string | null
  ghi_chu: string | null
  created_at: string
  updated_at: string
}

export interface VehicleCreate {
  bien_so: string
  loai_xe: string
  loai_bang_lai: string
  hang_xe?: string | null
  ten_xe?: string | null
  nam_san_xuat?: number | null
  mau_xe?: string | null
  so_khung?: string | null
  so_may?: string | null
  dung_tich_may?: number | null
  ngay_dang_kiem?: string | null
  ngay_het_dang_kiem?: string | null
  bao_hiem_den_ngay?: string | null
  trang_thai?: VehicleStatus
  odometer_km?: number
  purchase_date?: string | null
  purchase_price?: string | null
  ghi_chu?: string | null
}

export interface VehicleUpdate {
  loai_xe?: string
  hang_xe?: string | null
  ten_xe?: string | null
  nam_san_xuat?: number | null
  mau_xe?: string | null
  so_khung?: string | null
  so_may?: string | null
  dung_tich_may?: number | null
  loai_bang_lai?: string
  ngay_dang_kiem?: string | null
  ngay_het_dang_kiem?: string | null
  bao_hiem_den_ngay?: string | null
  trang_thai?: VehicleStatus
  odometer_km?: number
  last_service_km?: number
  last_service_date?: string | null
  next_service_km?: number | null
  purchase_date?: string | null
  purchase_price?: string | null
  ghi_chu?: string | null
}

export const vehiclesApi = {
  list: (params: { page?: number; page_size?: number; search?: string; trang_thai?: VehicleStatus; loai_bang_lai?: string } = {}) =>
    apiClient.get<{ items: VehicleListItem[]; total: number; page: number; page_size: number; pages: number }>(
      '/vehicles',
      { params }
    ),

  get: (id: string) =>
    apiClient.get<VehicleOut>(`/vehicles/${id}`),

  create: (data: VehicleCreate) =>
    apiClient.post<VehicleOut>('/vehicles', data),

  update: (id: string, data: VehicleUpdate) =>
    apiClient.patch<VehicleOut>(`/vehicles/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/vehicles/${id}`),
}
