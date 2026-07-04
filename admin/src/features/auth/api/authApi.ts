import axiosInstance from '@/lib/axios/axiosInstance';

export interface AdminProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  lastLoginAt?: string;
  createdAt?: string;
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
    const response = await axiosInstance.get('/api/admin/auth/profile');
    return response.data;
  },

  updateProfile: async (payload: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
  }): Promise<{ message: string; admin: AdminProfile }> => {
    const response = await axiosInstance.put('/api/admin/auth/profile', payload);
    return response.data;
  },

  changePassword: async (payload: {
    oldPassword?: string;
    newPassword?: string;
  }): Promise<{ message: string }> => {
    const response = await axiosInstance.put('/api/admin/auth/change-password', payload);
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
};
