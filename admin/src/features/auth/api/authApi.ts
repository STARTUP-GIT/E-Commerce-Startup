import axiosInstance from '@/lib/axios/axiosInstance';

export interface AdminProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
  isSuperAdmin: boolean;
  isActive?: boolean;
  status?: string;
  role?: string;
  roleId?: string | null;
  roleName?: string;
  authProvider?: string;
  lastLoginAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  permissions?: string[];
}

export interface LoginResponse {
  message: string;
  admin: AdminProfile;
}

export interface AdminInvitationItem {
  id: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  roleId?: string | null;
  roleName: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  expiresAt: string;
  acceptedAt?: string | null;
  createdAt: string;
  adminRole?: { displayName: string; name: string };
  invitedBy?: { firstName: string; lastName: string; email: string };
}

export interface AdminAccessRequestItem {
  id: string;
  email: string;
  googleId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  reviewNotes?: string | null;
  reviewedBy?: { firstName: string; lastName: string; email: string };
}

export interface AdminAuditLogItem {
  id: string;
  adminId: string;
  actionType: string;
  targetType: string;
  targetId: string;
  description: string;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  performedAt: string;
  admin?: { firstName: string; lastName: string; email: string };
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
    avatarUrl?: string | null;
    avatarPublicId?: string | null;
  }): Promise<{ message: string; admin: AdminProfile }> => {
    const response = await axiosInstance.put('/api/admin/profile', payload);
    return response.data;
  },

  removeAvatar: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.delete('/api/admin/profile/avatar');
    return response.data;
  },

  changePassword: async (payload: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }): Promise<{ message: string }> => {
    const response = await axiosInstance.put('/api/admin/profile/password', payload);
    return response.data;
  },

  requestEmailChange: async (payload: {
    newEmail: string;
    currentPassword?: string;
  }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/admin/profile/email-change', payload);
    return response.data;
  },

  verifyEmailChange: async (payload: { token: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/admin/auth/email-change/verify', payload);
    return response.data;
  },

  refresh: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/admin/auth/refresh');
    return response.data;
  },

  getSetupStatus: async (): Promise<{ isSetup: boolean; initialized?: boolean }> => {
    const response = await axiosInstance.get('/api/admin/auth/setup/status');
    return response.data;
  },

  setupAdmin: async (payload: {
    name: string;
    email: string;
    password: string;
    bootstrapSecret: string;
  }): Promise<{ message: string }> => {
    const { bootstrapSecret, ...adminDetails } = payload;
    const response = await axiosInstance.post('/api/admin/auth/setup', adminDetails, {
      headers: { 'x-admin-bootstrap-secret': bootstrapSecret },
    });
    return response.data;
  },

  listAdmins: async (): Promise<{ admins: any[] }> => {
    const response = await axiosInstance.get('/api/admin/list');
    return response.data;
  },

  createAdmin: async (payload: {
    name: string;
    email: string;
    password?: string;
    role?: string;
    roleId?: string;
  }): Promise<{ message: string; admin: any }> => {
    const response = await axiosInstance.post('/api/admin', payload);
    return response.data;
  },

  inviteAdmin: async (payload: {
    email: string;
    fullName?: string;
    phone?: string;
    role?: string;
    roleId?: string;
  }): Promise<{ message: string; invitation: any }> => {
    const response = await axiosInstance.post('/api/admin/invitations', payload);
    return response.data;
  },

  listInvitations: async (): Promise<{ invitations: AdminInvitationItem[] }> => {
    const response = await axiosInstance.get('/api/admin/invitations');
    return response.data;
  },

  resendInvitation: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/api/admin/invitations/${id}/resend`);
    return response.data;
  },

  revokeInvitation: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/api/admin/invitations/${id}`);
    return response.data;
  },

  getInvitationByToken: async (token: string): Promise<{ invitation: any }> => {
    const response = await axiosInstance.get(`/api/admin/auth/invitations/verify?token=${encodeURIComponent(token)}`);
    return response.data;
  },

  acceptInvitation: async (payload: {
    token: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<{ message: string; admin: any }> => {
    const response = await axiosInstance.post('/api/admin/auth/invitations/accept', payload);
    return response.data;
  },

  listAccessRequests: async (): Promise<{ requests: AdminAccessRequestItem[] }> => {
    const response = await axiosInstance.get('/api/admin/access-requests');
    return response.data;
  },

  approveAccessRequest: async (id: string, payload: { roleId: string; notes?: string }): Promise<{ message: string; admin: any }> => {
    const response = await axiosInstance.post(`/api/admin/access-requests/${id}/approve`, payload);
    return response.data;
  },

  rejectAccessRequest: async (id: string, payload?: { notes?: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/api/admin/access-requests/${id}/reject`, payload || {});
    return response.data;
  },

  updateAdminStatus: async (id: string, payload: { isActive?: boolean; status?: string }): Promise<{ message: string; admin: any }> => {
    const response = await axiosInstance.patch(`/api/admin/${id}/status`, payload);
    return response.data;
  },

  revokeAdminSessions: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/api/admin/${id}/revoke-sessions`);
    return response.data;
  },

  updateAdminRole: async (id: string, payload: { role?: string; roleId?: string }): Promise<{ message: string; admin: any }> => {
    const response = await axiosInstance.patch(`/api/admin/${id}/role`, payload);
    return response.data;
  },

  resetAdminPassword: async (id: string, password: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post(`/api/admin/${id}/reset-password`, { password });
    return response.data;
  },

  getAuditLogs: async (adminId?: string): Promise<{ logs: AdminAuditLogItem[] }> => {
    const url = adminId ? `/api/admin/audit-logs?adminId=${adminId}` : '/api/admin/audit-logs';
    const response = await axiosInstance.get(url);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/admin/auth/forgot-password', { email });
    return response.data;
  },

  verifyOtp: async (payload: { email: string; otp: string }): Promise<{ message: string; resetToken: string }> => {
    const response = await axiosInstance.post('/api/admin/auth/verify-otp', payload);
    return response.data;
  },

  resetPassword: async (payload: { resetToken: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/api/admin/auth/reset-password', payload);
    return response.data;
  },
};
