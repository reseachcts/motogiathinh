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

export interface AuditLogItem {
  id: string
  created_at: string
  updated_at: string
  user_id: string | null
  user_email: string | null
  user_name: string | null
  user_role: string | null
  branch_id: string | null
  action: string
  resource: string
  resource_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
}

export interface AuditLogsParams {
  page?: number
  page_size?: number
  resource?: string
  action?: string
  from_date?: string
  to_date?: string
}

export const adminApi = {
  listUsers: () => apiClient.get<UserItem[]>('/admin/users'),

  createUser: (data: CreateUserData) =>
    apiClient.post<UserItem>('/admin/users', data),

  updateUser: (id: string, data: UpdateUserData) =>
    apiClient.patch<UserItem>(`/admin/users/${id}`, data),

  deactivateUser: (id: string) =>
    apiClient.delete(`/admin/users/${id}`),

  listAuditLogs: (params: AuditLogsParams = {}) =>
    apiClient.get<{ items: AuditLogItem[]; total: number; page: number; page_size: number; pages: number }>(
      '/admin/logs',
      { params }
    ),
}
