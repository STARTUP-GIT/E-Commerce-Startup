import axiosInstance from '@/lib/axios/axiosInstance';

export interface PlatformRole {
  id: string;
  name: string;
  type: string;
  isSystem?: boolean;
}

export interface PlatformPermission {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  module: string;
  createdAt: string;
}

export interface PlatformRoleDetail extends PlatformRole {
  description?: string | null;
  createdAt: string;
  permissions: PlatformPermission[];
  _count?: { users: number };
}

export interface PlatformUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  status: string;
  isOwner: boolean;
  roleId?: string | null;
  role?: PlatformRole | null;
  permissions?: string[];
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface LoginResponse {
  message: string;
  user: PlatformUser;
}

export const authApi = {
  login: async (credentials: { email: string; password?: string }): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/api/platform/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/platform/auth/logout');
    return response.data;
  },

  getProfile: async (): Promise<{ user: PlatformUser }> => {
    const response = await axiosInstance.get('/api/platform/auth/profile');
    return response.data;
  },

  updateProfile: async (payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<{ message: string; user: PlatformUser }> => {
    const response = await axiosInstance.put('/api/platform/auth/profile', payload);
    return response.data;
  },

  changePassword: async (payload: {
    currentPassword?: string;
    newPassword?: string;
  }): Promise<{ message: string }> => {
    const response = await axiosInstance.put('/api/platform/auth/profile/password', payload);
    return response.data;
  },

  refresh: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/platform/auth/refresh');
    return response.data;
  },

  getSetupStatus: async (): Promise<{ initialized: boolean }> => {
    const response = await axiosInstance.get('/api/platform/auth/setup/status');
    return response.data;
  },

  setupPlatform: async (payload: { name: string; email: string; password: string }): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/api/platform/auth/setup', payload);
    return response.data;
  },

  listUsers: async (): Promise<{ users: PlatformUser[] }> => {
    const response = await axiosInstance.get('/api/platform/auth/users');
    return response.data;
  },

  createUser: async (payload: {
    firstName: string;
    lastName?: string;
    email: string;
    password?: string;
    roleId: string;
  }): Promise<{ message: string; user: PlatformUser }> => {
    const response = await axiosInstance.post('/api/platform/auth/users', payload);
    return response.data;
  },

  updateUserStatus: async (id: string, status: string): Promise<{ message: string; user: PlatformUser }> => {
    const response = await axiosInstance.patch(`/api/platform/auth/users/${id}/status`, { status });
    return response.data;
  },

  updateUserRole: async (id: string, roleId: string): Promise<{ message: string; user: PlatformUser }> => {
    const response = await axiosInstance.patch(`/api/platform/auth/users/${id}/role`, { roleId });
    return response.data;
  },

  resetUserPassword: async (id: string, password: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/api/platform/auth/users/${id}/reset-password`, { password });
    return response.data;
  },

  listRoles: async (): Promise<{ roles: PlatformRoleDetail[] }> => {
    const response = await axiosInstance.get('/api/platform/auth/roles');
    return response.data;
  },

  createRole: async (payload: {
    name: string;
    description?: string;
    type?: string;
    permissionIds?: string[];
  }): Promise<{ message: string; role: PlatformRoleDetail }> => {
    const response = await axiosInstance.post('/api/platform/auth/roles', payload);
    return response.data;
  },

  updateRole: async (id: string, payload: {
    name?: string;
    description?: string;
    permissionIds?: string[];
  }): Promise<{ message: string; role: PlatformRoleDetail }> => {
    const response = await axiosInstance.patch(`/api/platform/auth/roles/${id}`, payload);
    return response.data;
  },

  deleteRole: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/api/platform/auth/roles/${id}`);
    return response.data;
  },

  listPermissions: async (): Promise<{ permissions: PlatformPermission[] }> => {
    const response = await axiosInstance.get('/api/platform/auth/permissions');
    return response.data;
  },

  createPermission: async (payload: {
    key: string;
    name: string;
    description?: string;
    module: string;
  }): Promise<{ message: string; permission: PlatformPermission }> => {
    const response = await axiosInstance.post('/api/platform/auth/permissions', payload);
    return response.data;
  },

  deletePermission: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/api/platform/auth/permissions/${id}`);
    return response.data;
  },
};
