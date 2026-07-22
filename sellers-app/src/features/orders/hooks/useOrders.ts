import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi } from '../api/ordersApi';

export function useOrders(orderId?: string) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const res = await ordersApi.getOrders();
        return res.orders;
      } catch {
        return [];
      }
    },
    retry: false,
  });

  const orderDetailsQuery = useQuery({
    queryKey: ['order-details', orderId],
    queryFn: async () => {
      const res = await ordersApi.getOrder(orderId!);
      return res.order;
    },
    enabled: !!orderId,
  });

  const timelineQuery = useQuery({
    queryKey: ['order-timeline', orderId],
    queryFn: async () => {
      const res = await ordersApi.getOrderTimeline(orderId!);
      return res.timeline;
    },
    enabled: !!orderId,
  });

  const allowedDeliveryMethodsQuery = useQuery({
    queryKey: ['allowed-delivery-methods'],
    queryFn: async () => {
      const res = await ordersApi.getAllowedDeliveryMethods();
      return res.deliveryMethods;
    },
    staleTime: 60 * 1000,
  });

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: ordersApi.acceptOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => ordersApi.rejectOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
  });

  const readyTimeMutation = useMutation({
    mutationFn: ({ id, readyByAt }: { id: string; readyByAt: string }) => ordersApi.setReadyTime(id, readyByAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
  });

  const assignDeliveryMethodMutation = useMutation({
    mutationFn: ({ id, deliveryMethod }: { id: string; deliveryMethod: string }) =>
      ordersApi.assignDeliveryMethod(id, deliveryMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
  });

  const packingProofMutation = useMutation({
    mutationFn: ({ id, imageUrls, notes }: { id: string; imageUrls: string[]; notes?: string }) =>
      ordersApi.uploadPackingProof(id, imageUrls, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
  });

  const markPackedMutation = useMutation({
    mutationFn: ordersApi.markPacked,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
  });

  const markShippedMutation = useMutation({
    mutationFn: ordersApi.markShipped,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: ordersApi.markDelivered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
  });

  const markCodCollectedMutation = useMutation({
    mutationFn: ordersApi.markCodCollected,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
    },
  });

  return {
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    refetch: ordersQuery.refetch,

    order: orderDetailsQuery.data ?? null,
    isLoadingDetails: orderDetailsQuery.isLoading,

    timeline: timelineQuery.data ?? [],
    isLoadingTimeline: timelineQuery.isLoading,

    allowedDeliveryMethods: allowedDeliveryMethodsQuery.data ?? [],

    acceptOrder: acceptMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,

    rejectOrder: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,

    setReadyTime: readyTimeMutation.mutateAsync,
    isSettingReadyTime: readyTimeMutation.isPending,

    assignDeliveryMethod: assignDeliveryMethodMutation.mutateAsync,
    isAssigningDeliveryMethod: assignDeliveryMethodMutation.isPending,

    uploadPackingProof: packingProofMutation.mutateAsync,
    isUploadingProof: packingProofMutation.isPending,

    markPacked: markPackedMutation.mutateAsync,
    isMarkingPacked: markPackedMutation.isPending,

    markShipped: markShippedMutation.mutateAsync,
    isMarkingShipped: markShippedMutation.isPending,

    markDelivered: markDeliveredMutation.mutateAsync,
    isMarkingDelivered: markDeliveredMutation.isPending,

    markCodCollected: markCodCollectedMutation.mutateAsync,
    isMarkingCodCollected: markCodCollectedMutation.isPending,
  };
}
