import axiosInstance from '@/lib/axios/axiosInstance';

export interface NotificationRecord {
  id: string;
  sellerId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationApi = {
  getNotifications: async (): Promise<{ count: number; notifications: NotificationRecord[] }> => {
    const response = await axiosInstance.get('/seller/api/notifications');
    return response.data;
  },

  markAllRead: async (): Promise<{ message: string }> => {
    const response = await axiosInstance.patch('/seller/api/notifications/read-all');
    return response.data;
  },

  markRead: async (id: string): Promise<{ message: string; notification: NotificationRecord }> => {
    const response = await axiosInstance.patch(`/seller/api/notifications/${id}/read`);
    return response.data;
  },

  deleteNotification: async (id: string): Promise<{ message: string }> => {
    const response = await axiosInstance.delete(`/seller/api/notifications/${id}`);
    return response.data;
  },
};
