import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
import { useSession } from 'next-auth/react';

export function useNotifications() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getNotifications(),
    enabled: !!session,
    refetchInterval: 15_000, // Poll every 15s for offline/online synchronization
    staleTime: 5_000,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = notificationsQuery.data?.notifications || [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? notifications.filter((n) => !n.isRead).length;

  return {
    notifications,
    unreadCount,
    totalCount: notificationsQuery.data?.count || notifications.length,
    isLoading: notificationsQuery.isLoading,
    isError: notificationsQuery.isError,
    refetch: notificationsQuery.refetch,

    markAllRead: markAllReadMutation.mutate,
    isMarkingAllRead: markAllReadMutation.isPending,

    markRead: markReadMutation.mutate,
    isMarkingRead: markReadMutation.isPending,

    deleteNotification: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
