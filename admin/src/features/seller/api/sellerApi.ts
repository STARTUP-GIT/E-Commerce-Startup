import axiosInstance from '@/lib/axios/axiosInstance';

export const sellerApi = {
  getSellers: async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const response = await axiosInstance.get('/api/admin/sellers/sellers', { params });
    return response.data;
  },
  getSeller: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/sellers/sellers/${id}`);
    return response.data;
  },
  banSeller: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/sellers/sellers/${id}/ban`, { reason });
    return response.data;
  },
  unbanSeller: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/sellers/sellers/${id}/unban`);
    return response.data;
  },
  deleteSeller: async (id: string, reason?: string) => {
    const response = await axiosInstance.delete(`/api/admin/sellers/sellers/${id}`, { data: { reason } });
    return response.data;
  },
  getSellerShop: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/sellers/sellers/${id}/shop`);
    return response.data;
  },
  getSellerOrders: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/sellers/sellers/${id}/orders`);
    return response.data;
  },
  getSellerProducts: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/sellers/sellers/${id}/products`);
    return response.data;
  },
  getSellerAnalytics: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/sellers/sellers/${id}/analytics`);
    return response.data;
  },
  suspendSeller: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/sellers/sellers/${id}/suspend`, { reason });
    return response.data;
  },
  restoreSeller: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/sellers/sellers/${id}/restore`);
    return response.data;
  },
  activateSeller: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/sellers/sellers/${id}/activate`);
    return response.data;
  },
  deactivateSeller: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/sellers/sellers/${id}/deactivate`, { reason });
    return response.data;
  },
};
