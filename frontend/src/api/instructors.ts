import { apiClient } from './client'

export interface InstructorListItem {
  id: string
  branch_id: string
  user_id: string
  ma_giao_vien: string
  ho_ten: string
  so_dien_thoai: string
  ngay_vao_lam: string
  is_active: boolean
  rating_avg: string
  total_reviews: number
}

export interface InstructorOut extends InstructorListItem {
  ngay_sinh: string | null
  gioi_tinh: string | null
  dia_chi: string | null
  bang_lai_so: string | null
  ngay_cap_bang: string | null
  noi_cap_bang: string | null
  ngay_het_han_bang: string | null
  ngay_nghi_viec: string | null
  muc_luong: string | null
  anh_the_url: string | null
  ghi_chu: string | null
  created_at: string
  updated_at: string
}

export interface InstructorCreate {
  user_id: string
  ma_giao_vien: string
  ho_ten: string
  so_dien_thoai: string
  ngay_vao_lam: string
  ngay_sinh?: string | null
  gioi_tinh?: string | null
  dia_chi?: string | null
  bang_lai_so?: string | null
  ngay_cap_bang?: string | null
  noi_cap_bang?: string | null
  ngay_het_han_bang?: string | null
  muc_luong?: string | null
  ghi_chu?: string | null
}

export interface InstructorUpdate {
  ho_ten?: string
  so_dien_thoai?: string
  ngay_sinh?: string | null
  gioi_tinh?: string | null
  dia_chi?: string | null
  bang_lai_so?: string | null
  ngay_cap_bang?: string | null
  noi_cap_bang?: string | null
  ngay_het_han_bang?: string | null
  ngay_nghi_viec?: string | null
  muc_luong?: string | null
  is_active?: boolean
  ghi_chu?: string | null
}

export const instructorsApi = {
  list: (params: { page?: number; page_size?: number; search?: string; is_active?: boolean } = {}) =>
    apiClient.get<{ items: InstructorListItem[]; total: number; page: number; page_size: number; pages: number }>(
      '/instructors',
      { params }
    ),

  get: (id: string) =>
    apiClient.get<InstructorOut>(`/instructors/${id}`),

  create: (data: InstructorCreate) =>
    apiClient.post<InstructorOut>('/instructors', data),

  update: (id: string, data: InstructorUpdate) =>
    apiClient.patch<InstructorOut>(`/instructors/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/instructors/${id}`),
}
