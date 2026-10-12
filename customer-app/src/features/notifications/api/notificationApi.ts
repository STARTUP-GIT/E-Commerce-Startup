import axiosInstance from '@/lib/axios/axiosInstance';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  message?: string;
  isRead: boolean;
  data?: any;
  route?: string | null;
  createdAt: string;
}

export interface NotificationResponse {
  count: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
  notifications: Notification[];
}

export const notificationApi = {
  getNotifications: async (params?: { page?: number; limit?: number; unreadOnly?: boolean }): Promise<NotificationResponse> => {
    const response = await axiosInstance.get('/api/notifications', { params });
    return response.data;
  },
  getUnreadCount: async (): Promise<{ unreadCount: number }> => {
    const response = await axiosInstance.get('/api/notifications/unread-count');
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
