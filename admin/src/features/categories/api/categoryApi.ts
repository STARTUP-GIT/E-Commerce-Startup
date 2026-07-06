import axiosInstance from '@/lib/axios/axiosInstance';

export const categoryApi = {
  getCategories: async () => {
    const response = await axiosInstance.get('/api/admin/categories');
    return response.data;
  },
  createCategory: async (payload: { name: string; description?: string; isActive?: boolean }) => {
    const response = await axiosInstance.post('/api/admin/categories', payload);
    return response.data;
  },
  updateCategory: async (id: string, payload: { name?: string; description?: string; isActive?: boolean }) => {
    const response = await axiosInstance.put(`/api/admin/categories/${id}`, payload);
    return response.data;
  },
  updateCategoryStatus: async (id: string, isActive: boolean) => {
    const response = await axiosInstance.patch(`/api/admin/categories/${id}/status`, { isActive });
    return response.data;
  },
  deleteCategory: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/categories/${id}`);
    return response.data;
  }
};
