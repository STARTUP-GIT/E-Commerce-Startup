import axiosInstance from '@/lib/axios/axiosInstance';

export const analyticsApi = {
  getDashboard: async () => {
    const response = await axiosInstance.get('/api/admin/analytics/dashboard');
    return response.data;
  },

  getRevenue: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await axiosInstance.get('/api/admin/analytics/revenue', { params });
    return response.data;
  },

  getMonthlyRevenue: async () => {
    const response = await axiosInstance.get('/api/admin/analytics/revenue/monthly');
    return response.data;
  },

  getStatistics: async () => {
    const response = await axiosInstance.get('/api/admin/analytics/statistics');
    return response.data;
  },

  getRecentActivities: async () => {
    const response = await axiosInstance.get('/api/admin/analytics/recent-activities');
    return response.data;
  },
};
