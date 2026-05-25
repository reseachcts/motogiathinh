import { apiClient } from './client'

export interface ResourcePermission {
  resource: string
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
}

export interface UserPermissionsOut {
  user_id: string
  permissions: ResourcePermission[]
}

export interface SetResourcePermission {
  can_create: boolean
  can_read: boolean
  can_update: boolean
  can_delete: boolean
}

export const permissionsApi = {
  getUserPermissions: (userId: string) =>
    apiClient.get<UserPermissionsOut>(`/admin/permissions/${userId}`),

  setResourcePermission: (userId: string, resource: string, data: SetResourcePermission) =>
    apiClient.put<ResourcePermission>(`/admin/permissions/${userId}/${resource}`, data),

  resetResourcePermission: (userId: string, resource: string) =>
    apiClient.delete(`/admin/permissions/${userId}/${resource}`),
}
