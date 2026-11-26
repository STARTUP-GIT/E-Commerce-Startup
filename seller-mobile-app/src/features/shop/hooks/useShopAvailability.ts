import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi, type ShopAvailability } from '../api/shopApi';
import { useState, useEffect } from 'react';
import { ENV } from '@/config/env';

export function useShopAvailability() {
  const queryClient = useQueryClient();

  const availabilityQuery = useQuery({
    queryKey: ['shop-availability'],
    queryFn: async () => {
      try {
        const res = await shopApi.getAvailability();
        return res.availability;
      } catch (err) {
        return null;
      }
    },
    refetchInterval: 10000,
    staleTime: 4000,
  });

  const availability = availabilityQuery.data;

  // Local state for second-by-second countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!availability?.scheduledCloseAt || !availability.isOnline) {
      setSecondsRemaining(null);
      return;
    }

    const targetTime = new Date(availability.scheduledCloseAt).getTime();

    const updateCountdown = () => {
      const now = Date.now();
      const diffMs = targetTime - now;
      if (diffMs <= 0) {
        setSecondsRemaining(0);
        queryClient.invalidateQueries({ queryKey: ['shop-availability'] });
        queryClient.invalidateQueries({ queryKey: ['shop'] });
      } else {
        setSecondsRemaining(Math.floor(diffMs / 1000));
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [availability?.scheduledCloseAt, availability?.isOnline, queryClient]);

  // Real-time WebSocket listener
  useEffect(() => {
    let socket: WebSocket | null = null;
    let isMounted = true;
    let reconnectTimer: any = null;

    const connectWs = () => {
      try {
        const base = ENV.BACKEND_API_URL || 'http://localhost:3002';
        const wsProto = base.startsWith('https:') ? 'wss:' : 'ws:';
        const host = base.replace(/^https?:\/\//, '').replace(/\/+$/, '');
        const wsUrl = `${wsProto}//${host}/ws/chat?role=seller`;

        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'shop_availability_updated') {
              queryClient.invalidateQueries({ queryKey: ['shop-availability'] });
              queryClient.invalidateQueries({ queryKey: ['shop'] });
            }
          } catch {}
        };

        socket.onerror = () => {};

        socket.onclose = () => {
          if (isMounted) {
            reconnectTimer = setTimeout(connectWs, 8000);
          }
        };
      } catch {}
    };

    connectWs();

    return () => {
      isMounted = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (socket) {
        try {
          socket.close();
        } catch {}
      }
    };
  }, [queryClient]);

  const countdownText = (() => {
    if (secondsRemaining === null || secondsRemaining < 0) return null;
    if (secondsRemaining > 30 * 60) return null;
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  })();

  const isCountdownActive = secondsRemaining !== null && secondsRemaining > 0 && secondsRemaining <= 30 * 60;

  const updateAvailabilityMutation = useMutation({
    mutationFn: (payload: { isOnline: boolean; reason?: string; force?: boolean }) =>
      shopApi.updateAvailability(payload),
    onSuccess: (data) => {
      if (!data.requiresConfirmation) {
        queryClient.invalidateQueries({ queryKey: ['shop-availability'] });
        queryClient.invalidateQueries({ queryKey: ['shop'] });
      }
    },
  });

  const scheduleClosingMutation = useMutation({
    mutationFn: (payload: { scheduledCloseAt: string; closingReason?: string; timeZone?: string }) =>
      shopApi.scheduleClosing(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-availability'] });
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  const cancelScheduleMutation = useMutation({
    mutationFn: () => shopApi.cancelScheduledClosing(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-availability'] });
      queryClient.invalidateQueries({ queryKey: ['shop'] });
    },
  });

  return {
    availability,
    isOnline: availability?.isOnline ?? true,
    isLoading: availabilityQuery.isLoading,
    isError: availabilityQuery.isError,
    activeOrdersCount: availability?.activeOrdersCount ?? 0,
    scheduledCloseAt: availability?.scheduledCloseAt ?? null,
    scheduledCloseReason: availability?.scheduledCloseReason ?? null,
    closingReason: availability?.closingReason ?? null,
    lastStatusChangedAt: availability?.lastStatusChangedAt ?? null,
    lastStatusChangeSource: availability?.lastStatusChangeSource ?? null,
    timeZone: availability?.timeZone ?? 'Asia/Kolkata',
    countdownText,
    isCountdownActive,
    secondsRemaining,

    updateAvailability: updateAvailabilityMutation.mutateAsync,
    isUpdating: updateAvailabilityMutation.isPending,

    scheduleClosing: scheduleClosingMutation.mutateAsync,
    isScheduling: scheduleClosingMutation.isPending,

    cancelScheduledClosing: cancelScheduleMutation.mutateAsync,
    isCancellingSchedule: cancelScheduleMutation.isPending,

    refetch: availabilityQuery.refetch,
  };
}
