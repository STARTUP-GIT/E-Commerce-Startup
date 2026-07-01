import axiosInstance from '@/lib/axios/axiosInstance';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationApi = {
  getNotifications: async (): Promise<{ notifications: Notification[] }> => {
    const response = await axiosInstance.get('/api/notifications');
    return response.data;
  },
  markAllRead: async (): Promise<any> => {
    const response = await axiosInstance.patch('/api/notifications/read-all');
    return response.data;
  },
  markRead: async (notificationId: string): Promise<any> => {
    const response = await axiosInstance.patch(`/api/notifications/${notificationId}/read`);
    return response.data;
  },
  deleteNotification: async (notificationId: string): Promise<any> => {
    const response = await axiosInstance.delete(`/api/notifications/${notificationId}`);
    return response.data;
  },
};
