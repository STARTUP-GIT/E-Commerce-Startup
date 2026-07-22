import axiosInstance from '@/lib/axios/axiosInstance';

export interface DeliveryMethodSetting {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  enabled: boolean;
  displayOrder: number;
  activeProductCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const deliveryMethodApi = {
  getDeliveryMethods: async (): Promise<{ deliveryMethods: DeliveryMethodSetting[] }> => {
    const response = await axiosInstance.get('/api/admin/delivery-methods');
    return response.data;
  },
  createDeliveryMethod: async (payload: {
    name: string;
    code: string;
    description?: string;
    enabled?: boolean;
    displayOrder?: number;
  }) => {
    const response = await axiosInstance.post('/api/admin/delivery-methods', payload);
    return response.data;
  },
  updateDeliveryMethod: async (
    id: string,
    payload: {
      name?: string;
      description?: string;
      enabled?: boolean;
      displayOrder?: number;
    }
  ) => {
    const response = await axiosInstance.put(`/api/admin/delivery-methods/${id}`, payload);
    return response.data;
  },
  toggleStatus: async (id: string, enabled: boolean) => {
    const response = await axiosInstance.patch(`/api/admin/delivery-methods/${id}/status`, { enabled });
    return response.data;
  },
  deleteDeliveryMethod: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/delivery-methods/${id}`);
    return response.data;
  },
};
