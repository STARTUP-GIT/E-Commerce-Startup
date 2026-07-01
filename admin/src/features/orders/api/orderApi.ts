import axiosInstance from '@/lib/axios/axiosInstance';

export const orderApi = {
  getOrders: async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const response = await axiosInstance.get('/api/admin/orders', { params });
    return response.data;
  },
  getOrder: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/orders/${id}`);
    return response.data;
  },
  getSellerOrders: async (params?: { page?: number; limit?: number }) => {
    const response = await axiosInstance.get('/api/admin/orders/seller-orders', { params });
    return response.data;
  },
  getOrderTimeline: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/orders/${id}/timeline`);
    return response.data;
  },
  updateOrderStatus: async (id: string, status: string) => {
    const response = await axiosInstance.patch(`/api/admin/orders/${id}/status`, { status });
    return response.data;
  },
  cancelOrder: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/orders/${id}/cancel`, { reason });
    return response.data;
  },
  refundOrder: async (id: string, amount?: number) => {
    const response = await axiosInstance.patch(`/api/admin/orders/${id}/refund`, { amount });
    return response.data;
  },
};
