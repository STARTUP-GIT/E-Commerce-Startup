import axiosInstance from '@/lib/axios/axiosInstance';

export interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  group: string;
  permissions: PermissionDef[];
}

export interface AdminRole {
  id: string;
  name: string;
  displayName: string;
  description?: string | null;
  isSystem: boolean;
  permissions: string[];
  adminCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MyPermissions {
  permissions: string[];
  roleName: string | null;
  roleId: string | null;
  isSuperAdmin: boolean;
}

export const rolesApi = {
  getMyPermissions: async (): Promise<MyPermissions> => {
    const response = await axiosInstance.get('/api/admin/roles/me');
    return response.data;
  },
  getCatalog: async (): Promise<{ groups: PermissionGroup[]; permissions: string[] }> => {
    const response = await axiosInstance.get('/api/admin/roles/permissions');
    return response.data;
  },
  getRoles: async (): Promise<{ roles: AdminRole[] }> => {
    const response = await axiosInstance.get('/api/admin/roles');
    return response.data;
  },
  createRole: async (payload: {
    name: string;
    displayName: string;
    description?: string;
    permissions: string[];
  }): Promise<{ role: AdminRole }> => {
    const response = await axiosInstance.post('/api/admin/roles', payload);
    return response.data;
  },
  updateRole: async (
    id: string,
    payload: Partial<{ displayName: string; description: string; permissions: string[] }>
  ): Promise<{ role: AdminRole }> => {
    const response = await axiosInstance.patch(`/api/admin/roles/${id}`, payload);
    return response.data;
  },
  deleteRole: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/api/admin/roles/${id}`);
    return response.data;
  },
};
