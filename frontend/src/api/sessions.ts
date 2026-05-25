import { apiClient } from './client'

export type SessionType = 'theory' | 'practice' | 'exam_prep'

export interface InstructorMinimal {
  id: string
  ma_giao_vien: string
  ho_ten: string
}

export interface ClassMinimal {
  id: string
  ma_lop: string
  ten_lop: string
}

export interface SessionListItem {
  id: string
  branch_id: string
  class_id: string
  class_info: ClassMinimal | null
  session_type: SessionType
  session_date: string
  start_time: string
  end_time: string
  instructor_id: string | null
  instructor: InstructorMinimal | null
  phong_hoc: string | null
  is_cancelled: boolean
}

export interface SessionOut extends SessionListItem {
  dia_diem: string | null
  noi_dung: string | null
  cancel_reason: string | null
  ghi_chu: string | null
  created_at: string
  updated_at: string
}

export interface SessionCreate {
  class_id: string
  session_type: SessionType
  session_date: string
  start_time: string
  end_time: string
  instructor_id?: string | null
  phong_hoc?: string | null
  dia_diem?: string | null
  noi_dung?: string | null
  ghi_chu?: string | null
}

export interface SessionUpdate {
  session_type?: SessionType
  session_date?: string
  start_time?: string
  end_time?: string
  instructor_id?: string | null
  phong_hoc?: string | null
  dia_diem?: string | null
  noi_dung?: string | null
  is_cancelled?: boolean
  cancel_reason?: string | null
  ghi_chu?: string | null
}

export interface SessionListParams {
  page?: number
  page_size?: number
  class_id?: string
  session_type?: SessionType
  from_date?: string
  to_date?: string
}

export const sessionsApi = {
  list: (params: SessionListParams = {}) =>
    apiClient.get<{ items: SessionListItem[]; total: number; page: number; page_size: number; pages: number }>(
      '/sessions',
      { params }
    ),

  get: (id: string) =>
    apiClient.get<SessionOut>(`/sessions/${id}`),

  create: (data: SessionCreate) =>
    apiClient.post<SessionOut>('/sessions', data),

  update: (id: string, data: SessionUpdate) =>
    apiClient.patch<SessionOut>(`/sessions/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/sessions/${id}`),
}
