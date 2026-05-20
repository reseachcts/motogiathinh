import { apiClient } from './client'

export interface UserItem {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'admin' | 'staff'
  branch_id: string | null
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  password: string
  full_name?: string
  phone?: string
  role: 'admin' | 'staff'
  branch_id?: string | null
}

export interface UpdateUserData {
  full_name?: string
  phone?: string
  role?: 'admin' | 'staff'
  branch_id?: string | null
  is_active?: boolean
}

export const adminApi = {
  listUsers: () => apiClient.get<UserItem[]>('/admin/users'),

  createUser: (data: CreateUserData) =>
    apiClient.post<UserItem>('/admin/users', data),

  updateUser: (id: string, data: UpdateUserData) =>
    apiClient.patch<UserItem>(`/admin/users/${id}`, data),

  deactivateUser: (id: string) =>
    apiClient.delete(`/admin/users/${id}`),
}
