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

  // District Detailed Management
  getDistrictDetails: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/cities/${id}/details`);
    return response.data;
  },
  updateGeneralSettings: async (id: string, payload: any) => {
    const response = await axiosInstance.put(`/api/admin/cities/${id}/general-settings`, payload);
    return response.data;
  },
  updateCustomerSettings: async (id: string, payload: any) => {
    const response = await axiosInstance.put(`/api/admin/cities/${id}/customer-settings`, payload);
    return response.data;
  },
  updateSellerSettings: async (id: string, payload: any) => {
    const response = await axiosInstance.put(`/api/admin/cities/${id}/seller-settings`, payload);
    return response.data;
  },
  updateDeliverySettings: async (id: string, payload: any) => {
    const response = await axiosInstance.put(`/api/admin/cities/${id}/delivery-settings`, payload);
    return response.data;
  },
  updateLaunchConfig: async (id: string, payload: any) => {
    const response = await axiosInstance.put(`/api/admin/cities/${id}/launch-config`, payload);
    return response.data;
  },

  // Child Towns / Cities
  listCityTowns: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/cities/${id}/towns`);
    return response.data;
  },
  createCityTown: async (id: string, payload: any) => {
    const response = await axiosInstance.post(`/api/admin/cities/${id}/towns`, payload);
    return response.data;
  },
  updateCityTown: async (id: string, townId: string, payload: any) => {
    const response = await axiosInstance.put(`/api/admin/cities/${id}/towns/${townId}`, payload);
    return response.data;
  },
  deleteCityTown: async (id: string, townId: string) => {
    const response = await axiosInstance.delete(`/api/admin/cities/${id}/towns/${townId}`);
    return response.data;
  },

  // Service Areas
  listServiceAreas: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/cities/${id}/service-areas`);
    return response.data;
  },
  createServiceArea: async (id: string, payload: any) => {
    const response = await axiosInstance.post(`/api/admin/cities/${id}/service-areas`, payload);
    return response.data;
  },
  updateServiceArea: async (id: string, areaId: string, payload: any) => {
    const response = await axiosInstance.put(`/api/admin/cities/${id}/service-areas/${areaId}`, payload);
    return response.data;
  },
  deleteServiceArea: async (id: string, areaId: string) => {
    const response = await axiosInstance.delete(`/api/admin/cities/${id}/service-areas/${areaId}`);
    return response.data;
  },

  // District Requests and Audit
  getDistrictRequests: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/cities/${id}/requests`);
    return response.data;
  },
  getDistrictAuditLogs: async (id: string) => {
    const response = await axiosInstance.get(`/api/admin/cities/${id}/audit-logs`);
    return response.data;
  },

  // Global Location Requests Management
  listLocationRequests: async (params?: any) => {
    const response = await axiosInstance.get('/api/admin/location-requests', { params });
    return response.data;
  },
  updateLocationRequest: async (id: string, payload: any) => {
    const response = await axiosInstance.patch(`/api/admin/location-requests/${id}`, payload);
    return response.data;
  },
  getLocationRequestsSummary: async () => {
    const response = await axiosInstance.get('/api/admin/location-requests/summary');
    return response.data;
  },
};
