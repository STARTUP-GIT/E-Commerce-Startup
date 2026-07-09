import axiosInstance from '@/lib/axios/axiosInstance';

export const deliveryApi = {
  getAllDeliveries: async (params?: { page?: number; limit?: number; status?: string }) => {
    const response = await axiosInstance.get('/api/admin/deliveries', { params });
    return response.data;
  },
  getDelivery: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/deliveries/${id}`);
    return response.data;
  },
  cancelDelivery: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/deliveries/${id}/cancel`, { reason });
    return response.data;
  },
  reassignDelivery: async (id: string, deliveryPartnerId?: string) => {
    const response = await axiosInstance.patch(`/api/admin/deliveries/${id}/reassign`, { deliveryPartnerId });
    return response.data;
  },
  getDeliveryAnalytics: async () => {
    const response = await axiosInstance.get('/api/admin/deliveries/analytics');
    return response.data;
  },
  getLiveDeliveries: async () => {
    const response = await axiosInstance.get('/api/admin/deliveries/live');
    return response.data;
  },
  changeDeliveryProvider: async (payload: { defaultProvider: string }) => {
    const response = await axiosInstance.patch('/api/admin/delivery-provider', payload);
    return response.data;
  },
};
