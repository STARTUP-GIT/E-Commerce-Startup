import axiosInstance from '@/lib/axios/axiosInstance';

export const productApi = {
  getProducts: async (params?: { page?: number; limit?: number; search?: string; category?: string }) => {
    const response = await axiosInstance.get('/api/admin/products', { params });
    return response.data;
  },
  getProduct: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/products/${id}`);
    return response.data;
  },
  getReportedProducts: async () => {
    const response = await axiosInstance.get('/api/admin/products/reported');
    return response.data;
  },
  deleteProduct: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/products/${id}`);
    return response.data;
  },
  restoreProduct: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/products/${id}/restore`);
    return response.data;
  },
  hideProduct: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/products/${id}/hide`);
    return response.data;
  },
  unhideProduct: async (id: string) => {
    const response = await axiosInstance.patch(`/api/admin/products/${id}/unhide`);
    return response.data;
  },
};
