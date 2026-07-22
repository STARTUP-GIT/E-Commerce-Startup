import axiosInstance from '@/lib/axios/axiosInstance';

export interface PaymentMethodSetting {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  enabled: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const paymentMethodApi = {
  getPaymentMethods: async () => {
    const response = await axiosInstance.get('/api/admin/payment-methods');
    return response.data;
  },
  createPaymentMethod: async (payload: {
    name: string;
    code: string;
    description?: string;
    enabled?: boolean;
    displayOrder?: number;
  }) => {
    const response = await axiosInstance.post('/api/admin/payment-methods', payload);
    return response.data;
  },
  updatePaymentMethod: async (
    id: string,
    payload: {
      name?: string;
      description?: string;
      enabled?: boolean;
      displayOrder?: number;
    }
  ) => {
    const response = await axiosInstance.put(`/api/admin/payment-methods/${id}`, payload);
    return response.data;
  },
  toggleStatus: async (id: string, allowed: boolean) => {
    const response = await axiosInstance.patch(`/api/admin/payment-methods/${id}`, { allowed });
    return response.data;
  },
  deletePaymentMethod: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/payment-methods/${id}`);
    return response.data;
  },
};
