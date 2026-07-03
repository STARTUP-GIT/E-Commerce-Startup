import axiosInstance from '@/lib/axios/axiosInstance';

export const shopApi = {
  getShops: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await axiosInstance.get('/api/admin/shops/shops', { params });
    return response.data;
  },
  getShop: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/shops/shops/${id}`);
    return response.data;
  },
  deleteShop: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/shops/shops/${id}`);
    return response.data;
  },
  approvePackingPermission: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/approve-packing`);
    return response.data;
  },
  rejectPackingPermission: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/reject-packing`, { reason });
    return response.data;
  },
  revokePackingPermission: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/revoke-packing`);
    return response.data;
  },
  activateShop: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/activate`);
    return response.data;
  },
  deactivateShop: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/deactivate`);
    return response.data;
  },
  banShop: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/ban`, { reason });
    return response.data;
  },
  unbanShop: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/unban`);
    return response.data;
  },
  updateShopConfig: async (id: string, payload: { commissionPercentage?: number; customerDeliveryShare?: number; sellerDeliveryShare?: number; enablePackingFee?: boolean; packingFeeApproved?: boolean }) => {
    const response = await axiosInstance.put(`/api/admin/shops/shops/${id}/config`, payload);
    return response.data;
  },
};
