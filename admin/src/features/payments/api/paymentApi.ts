import axiosInstance from '@/lib/axios/axiosInstance';

export const paymentApi = {
  getPayments: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const response = await axiosInstance.get('/api/admin/payments', { params });
    return response.data;
  },
  getPayment: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/payments/${id}`);
    return response.data;
  },
  getRefunds: async (params?: { page?: number; limit?: number }) => {
    const response = await axiosInstance.get('/api/admin/payments/refunds', { params });
    return response.data;
  },
  approveRefund: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/payments/${id}/approve-refund`);
    return response.data;
  },
  rejectRefund: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/payments/${id}/reject-refund`, { reason });
    return response.data;
  },
  getPlatformRevenue: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await axiosInstance.get('/api/admin/payments/revenue', { params });
    return response.data;
  },
  getSellerCommissionHistory: async (params?: { page?: number; limit?: number }) => {
    const response = await axiosInstance.get('/api/admin/payments/commissions', { params });
    return response.data;
  },
};
