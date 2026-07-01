import axiosInstance from '@/lib/axios/axiosInstance';

export const cityApi = {
  getCities: async () => {
    const response = await axiosInstance.get('/api/admin/cities');
    return response.data;
  },
  createCity: async (payload: { name: string; state?: string; isActive?: boolean }) => {
    const response = await axiosInstance.post('/api/admin/cities', payload);
    return response.data;
  },
  updateCity: async (id: string, payload: { name?: string; state?: string; isActive?: boolean }) => {
    const response = await axiosInstance.put(`/api/admin/cities/${id}`, payload);
    return response.data;
  },
  deleteCity: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/cities/${id}`);
    return response.data;
  },
};
