import axiosInstance from '@/lib/axios/axiosInstance';

export interface AdminProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isSuperAdmin: boolean;
  isActive?: boolean;
  role?: string;
  authProvider?: string;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  message: string;
  admin: AdminProfile;
}

export const authApi = {
  login: async (credentials: { email: string; password?: string }): Promise<LoginResponse> => {
    const response = await axiosInstance.post('/api/admin/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/admin/auth/logout');
    return response.data;
  },

  getProfile: async (): Promise<{ admin: AdminProfile }> => {
    const response = await axiosInstance.get('/api/admin/profile');
    return response.data;
  },

  updateProfile: async (payload: {
    name?: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<{ message: string; admin: AdminProfile }> => {
    const response = await axiosInstance.put('/api/admin/profile', payload);
    return response.data;
  },

  changePassword: async (payload: {
    currentPassword?: string;
    newPassword?: string;
  }): Promise<{ message: string }> => {
    const response = await axiosInstance.put('/api/admin/profile/password', payload);
    return response.data;
  },

  refresh: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/admin/auth/refresh');
    return response.data;
  },

  getSetupStatus: async (): Promise<{ initialized: boolean }> => {
    const response = await axiosInstance.get('/api/admin/auth/setup/status');
    return response.data;
  },

  setupAdmin: async (payload: { name: string; email: string; password: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/admin/auth/setup', payload);
    return response.data;
  },

  listAdmins: async (): Promise<{ admins: any[] }> => {
    const response = await axiosInstance.get('/api/admin/list');
    return response.data;
  },

  createAdmin: async (payload: { name: string; email: string; password?: string; role: string }): Promise<{ message: string; admin: any }> => {
    const response = await axiosInstance.post('/api/admin', payload);
    return response.data;
  },

  updateAdminStatus: async (id: string, isActive: boolean): Promise<{ message: string; admin: any }> => {
    const response = await axiosInstance.patch(`/api/admin/${id}/status`, { isActive });
    return response.data;
  },

  updateAdminRole: async (id: string, role: string): Promise<{ message: string; admin: any }> => {
    const response = await axiosInstance.patch(`/api/admin/${id}/role`, { role });
    return response.data;
  },

  resetAdminPassword: async (id: string, password: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/api/admin/${id}/reset-password`, { password });
    return response.data;
  },
};
