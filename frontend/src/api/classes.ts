import { apiClient } from './client'

export type ClassStatus = 'upcoming' | 'enrolling' | 'in_progress' | 'completed' | 'cancelled'

export interface CourseTypeOut {
  id: string
  ma_khoa_hoc: string
  ten_khoa_hoc: string
  loai_bang_lai: string
}

export interface ClassListItem {
  id: string
  branch_id: string
  ma_lop: string
  ten_lop: string
  ngay_khai_giang: string
  ngay_ket_thuc: string | null
  so_luong_toi_da: number
  so_luong_hien_tai: number
  trang_thai: ClassStatus
  phong_hoc: string | null
  hoc_phi: number | null
  course_type: CourseTypeOut | null
}

export interface LichHocSlot {
  thu: number       // 2=T2, 3=T3, 4=T4, 5=T5, 6=T6, 7=T7, 8=CN
  gio_bat_dau: string  // "HH:mm"
  gio_ket_thuc: string // "HH:mm"
}

export interface ClassOut extends ClassListItem {
  ghi_chu: string | null
  zalo_group_link: string | null
  lich_hoc: LichHocSlot[] | null
  course_type_id: string
  created_at: string
  updated_at: string
}

export interface ClassCreate {
  ma_lop: string
  ten_lop: string
  course_type_id: string
  ngay_khai_giang: string
  ngay_ket_thuc?: string | null
  so_luong_toi_da?: number
  trang_thai?: ClassStatus
  phong_hoc?: string | null
  hoc_phi?: number | null
  zalo_group_link?: string | null
  lich_hoc?: LichHocSlot[] | null
  ghi_chu?: string | null
}

export interface ClassUpdate {
  ten_lop?: string
  course_type_id?: string
  ngay_khai_giang?: string
  ngay_ket_thuc?: string | null
  so_luong_toi_da?: number
  trang_thai?: ClassStatus
  phong_hoc?: string | null
  hoc_phi?: number | null
  zalo_group_link?: string | null
  lich_hoc?: LichHocSlot[] | null
  ghi_chu?: string | null
}

export interface ClassEnrollmentItem {
  id: string
  student_id: string
  ma_hoc_vien: string
  ten_hoc_vien: string
  so_dien_thoai: string
  enrollment_date: string
  is_active: boolean
  ly_thuyet_status: string
  thuc_hanh_status: string
  overall_progress: number
  payment_status: string | null
  total_amount: number | null
  paid_amount: number | null
  remaining_amount: number | null
}

export interface ClassVehicleItem {
  id: string
  bien_so: string
  loai_xe: string
  hang_xe: string | null
  ten_xe: string | null
  trang_thai: string
}

export interface ClassListParams {
  page?: number
  page_size?: number
  search?: string
  trang_thai?: ClassStatus
  course_type_id?: string
}

export const classesApi = {
  list: (params: ClassListParams = {}) =>
    apiClient.get<{ items: ClassListItem[]; total: number; page: number; page_size: number; pages: number }>(
      '/classes',
      { params }
    ),

  listCourseTypes: () =>
    apiClient.get<CourseTypeOut[]>('/classes/course-types'),

  get: (id: string) =>
    apiClient.get<ClassOut>(`/classes/${id}`),

  create: (data: ClassCreate) =>
    apiClient.post<ClassOut>('/classes', data),

  update: (id: string, data: ClassUpdate) =>
    apiClient.patch<ClassOut>(`/classes/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`/classes/${id}`),

  getEnrollments: (id: string) =>
    apiClient.get<ClassEnrollmentItem[]>(`/classes/${id}/enrollments`),

  getVehicles: (id: string) =>
    apiClient.get<ClassVehicleItem[]>(`/classes/${id}/vehicles`),
}
