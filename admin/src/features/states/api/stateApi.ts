import axiosInstance from '@/lib/axios/axiosInstance';

export const stateApi = {
  getStates: async () => {
    const response = await axiosInstance.get('/api/admin/states');
    return response.data;
  },
  createState: async (payload: { name: string; isActive?: boolean }) => {
    const response = await axiosInstance.post('/api/admin/states', payload);
    return response.data;
  },
  updateState: async (id: string, payload: { name?: string; isActive?: boolean }) => {
    const response = await axiosInstance.put(`/api/admin/states/${id}`, payload);
    return response.data;
  },
  deleteState: async (id: string) => {
    const response = await axiosInstance.delete(`/api/admin/states/${id}`);
    return response.data;
  },
};
