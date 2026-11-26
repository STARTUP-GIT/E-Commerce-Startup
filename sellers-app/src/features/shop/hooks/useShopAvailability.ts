import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi, type ShopAvailability } from '../api/shopApi';
import { useState, useEffect, useRef } from 'react';

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
    refetchInterval: 10000, // Poll every 10s as a fallback
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
        // Trigger refetch since time elapsed
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

  // Real-time WebSocket listener for instant multi-device synchronization
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let socket: WebSocket | null = null;
    let isMounted = true;
    let reconnectTimer: any = null;

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Connect directly or via proxy
        const wsUrl = `${protocol}//${window.location.host}/ws/chat?role=seller`;
        socket = new WebSocket(wsUrl);

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === 'shop_availability_updated') {
              // Immediately invalidate to refetch freshest state
              queryClient.invalidateQueries({ queryKey: ['shop-availability'] });
              queryClient.invalidateQueries({ queryKey: ['shop'] });
            }
          } catch {
            // Ignore parse errors
          }
        };

        socket.onerror = () => {
          // Ignore socket error, fallback polling is active
        };

        socket.onclose = () => {
          if (isMounted) {
            reconnectTimer = setTimeout(connectWs, 8000);
          }
        };
      } catch {
        // WebSocket connection attempt failed, gracefully handled
      }
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

  // Format countdown text
  const countdownText = (() => {
    if (secondsRemaining === null || secondsRemaining < 0) return null;
    if (secondsRemaining > 30 * 60) return null; // Only format 30-min countdown
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  })();

  const isCountdownActive = secondsRemaining !== null && secondsRemaining > 0 && secondsRemaining <= 30 * 60;

  // Mutations
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
