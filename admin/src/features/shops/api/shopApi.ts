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
  approveShop: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/approve`);
    return response.data;
  },
  rejectShop: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/reject`, { reason });
    return response.data;
  },
  suspendShop: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/suspend`);
    return response.data;
  },
  disableShop: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/shops/shops/${id}/disable`);
    return response.data;
  },
  updateShopConfig: async (id: string, payload: { commissionPercentage?: number; commissionNotes?: string; customerDeliveryShare?: number; sellerDeliveryShare?: number; enablePackingFee?: boolean; packingFeeApproved?: boolean }) => {
    const response = await axiosInstance.put(`/api/admin/shops/shops/${id}/config`, payload);
    return response.data;
  },
};
