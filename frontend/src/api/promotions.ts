import { apiClient as client } from './client'

export interface PromotionListItem {
  id: string
  ma_khuyen_mai: string
  ten_khuyen_mai: string
  loai_khuyen_mai: 'fixed' | 'percent'
  gia_tri: string
  is_active: boolean
  is_partner: boolean
  start_date: string | null
  end_date: string | null
}

export interface PromotionOut extends PromotionListItem {
  branch_id: string | null
  mo_ta: string | null
  created_at: string
  updated_at: string
}

export interface PromotionCreate {
  ma_khuyen_mai: string
  ten_khuyen_mai: string
  loai_khuyen_mai: 'fixed' | 'percent'
  gia_tri: number
  mo_ta?: string | null
  start_date?: string | null
  end_date?: string | null
  is_partner?: boolean
}

export interface PromotionUpdate {
  ten_khuyen_mai?: string
  loai_khuyen_mai?: 'fixed' | 'percent'
  gia_tri?: number
  mo_ta?: string | null
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  is_partner?: boolean
}

export const promotionsApi = {
  list: (params?: { page?: number; page_size?: number; search?: string; is_active?: boolean }) =>
    client.get('/promotions', { params }),
  get: (id: string) => client.get<PromotionOut>(`/promotions/${id}`),
  create: (data: PromotionCreate) => client.post<PromotionOut>('/promotions', data),
  update: (id: string, data: PromotionUpdate) => client.patch<PromotionOut>(`/promotions/${id}`, data),
  delete: (id: string) => client.delete(`/promotions/${id}`),
}
