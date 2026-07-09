import axiosInstance from '@/lib/axios/axiosInstance';

export const customerApi = {
  getCustomers: async (params?: { page?: number; limit?: number; search?: string }) => {
    const response = await axiosInstance.get('/api/admin/customers/customers', { params });
    return response.data;
  },
  getCustomer: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/customers/customers/${id}`);
    return response.data;
  },
  banCustomer: async (id: string, reason?: string) => {
    const response = await axiosInstance.patch(`/api/admin/customers/customers/${id}/ban`, { reason });
    return response.data;
  },
  unbanCustomer: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/customers/customers/${id}/unban`);
    return response.data;
  },
  deleteCustomer: async (id: string, reason?: string) => {
    const response = await axiosInstance.delete(`/api/admin/customers/customers/${id}`, { data: { reason } });
    return response.data;
  },
  getCustomerOrders: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/customers/customers/${id}/orders`);
    return response.data;
  },
  getCustomerPayments: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/customers/customers/${id}/payments`);
    return response.data;
  },
};
