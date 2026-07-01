import axiosInstance from '@/lib/axios/axiosInstance';

export const reportApi = {
  getReportedProducts: async (params?: { page?: number; limit?: number }) => {
    const response = await axiosInstance.get('/api/admin/reports/products', { params });
    return response.data;
  },
  getReportedShops: async (params?: { page?: number; limit?: number }) => {
    const response = await axiosInstance.get('/api/admin/reports/shops', { params });
    return response.data;
  },
  resolveReport: async (id: string, resolution?: string) => {
    const response = await axiosInstance.patch(`/api/admin/reports/${id}/resolve`, { resolution });
    return response.data;
  },
  deleteReport: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/reports/${id}`);
    return response.data;
  },
};

export const notificationApi = {
  sendNotification: async (payload: { userId: string; userType: string; type: string; title: string; message: string }) => {
    const response = await axiosInstance.post('/api/admin/notifications/send', payload);
    return response.data;
  },
  broadcastNotification: async (payload: { userType?: string; type: string; title: string; message: string }) => {
    const response = await axiosInstance.post('/api/admin/notifications/broadcast', payload);
    return response.data;
  },
  deleteNotification: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/notifications/${id}`);
    return response.data;
  },
};

export const couponApi = {
  getCoupons: async (params?: { page?: number; limit?: number; isActive?: boolean }) => {
    const response = await axiosInstance.get('/api/admin/coupons', { params });
    return response.data;
  },
  createCoupon: async (payload: {
    code: string; discountType: string; discountValue: number;
    minOrderValue?: number; maxUses?: number; expiresAt?: string;
  }) => {
    const response = await axiosInstance.post('/api/admin/coupons', payload);
    return response.data;
  },
  updateCoupon: async (id: string, payload: Partial<{ isActive: boolean; maxUses: number; expiresAt: string }>) => {
    const response = await axiosInstance.patch(`/api/admin/coupons/${id}`, payload);
    return response.data;
  },
  deleteCoupon: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/coupons/${id}`);
    return response.data;
  },
};

export const settingsApi = {
  getSettings: async () => {
    const response = await axiosInstance.get('/api/admin/settings');
    return response.data;
  },
  updateSettings: async (payload: Record<string, unknown>) => {
    const response = await axiosInstance.patch('/api/admin/settings', payload);
    return response.data;
  },
  updateGST: async (payload: { gstPercentage: number }) => {
    const response = await axiosInstance.patch('/api/admin/settings/gst', payload);
    return response.data;
  },
  updatePlatformFee: async (payload: { platformFeePercentage: number }) => {
    const response = await axiosInstance.patch('/api/admin/settings/platform-fee', payload);
    return response.data;
  },
  updatePackingRules: async (payload: Record<string, unknown>) => {
    const response = await axiosInstance.patch('/api/admin/settings/packing-rules', payload);
    return response.data;
  },
  updatePaymentGateway: async (payload: { gateway: string }) => {
    const response = await axiosInstance.patch('/api/admin/settings/payment-gateway', payload);
    return response.data;
  },
  updateOrderSettings: async (payload: Record<string, unknown>) => {
    const response = await axiosInstance.patch('/api/admin/settings/order-settings', payload);
    return response.data;
  },
};

export const auditLogApi = {
  getAdminLogs: async (params?: { page?: number; limit?: number }) => {
    const response = await axiosInstance.get('/api/admin/logs', { params });
    return response.data;
  },
  getLoginHistory: async (params?: { page?: number; limit?: number }) => {
    const response = await axiosInstance.get('/api/admin/logs/login-history', { params });
    return response.data;
  },
  getAuditLogs: async (params?: { page?: number; limit?: number; search?: string; action?: string }) => {
    const response = await axiosInstance.get('/api/admin/logs/audit', { params });
    return response.data;
  },
};

export const reviewApi = {
  getReviews: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await axiosInstance.get('/api/admin/reviews', { params });
    return response.data;
  },
  deleteReview: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/reviews/${id}`);
    return response.data;
  },
  hideReview: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/reviews/${id}/hide`);
    return response.data;
  },
  restoreReview: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/reviews/${id}/restore`);
    return response.data;
  },
};
