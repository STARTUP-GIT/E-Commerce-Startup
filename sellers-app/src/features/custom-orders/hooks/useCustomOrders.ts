import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customOrderApi } from '../api/customOrderApi';

export function useCustomOrders(orderId?: string) {
  const queryClient = useQueryClient();

  const customOrdersQuery = useQuery({
    queryKey: ['custom-orders'],
    queryFn: async () => {
      const res = await customOrderApi.getOrders();
      return res.customOrders;
    },
  });

  const customOrderDetailsQuery = useQuery({
    queryKey: ['custom-order-details', orderId],
    queryFn: async () => {
      const res = await customOrderApi.getOrder(orderId!);
      return res.customOrder;
    },
    enabled: !!orderId,
  });

  const acceptMutation = useMutation({
    mutationFn: customOrderApi.acceptOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['custom-order-details', orderId] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => customOrderApi.rejectOrder(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['custom-order-details', orderId] });
    },
  });

  const sendQuoteMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof customOrderApi.sendQuotation>[1] }) =>
      customOrderApi.sendQuotation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['custom-order-details', orderId] });
    },
  });

  const updateQuoteMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof customOrderApi.updateQuotation>[1] }) =>
      customOrderApi.updateQuotation(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['custom-order-details', orderId] });
    },
  });

  const deleteQuoteMutation = useMutation({
    mutationFn: customOrderApi.deleteQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-orders'] });
      if (orderId) queryClient.invalidateQueries({ queryKey: ['custom-order-details', orderId] });
    },
  });

  return {
    customOrders: customOrdersQuery.data ?? [],
    isLoading: customOrdersQuery.isLoading,
    isError: customOrdersQuery.isError,
    refetch: customOrdersQuery.refetch,

    customOrder: customOrderDetailsQuery.data ?? null,
    isLoadingDetails: customOrderDetailsQuery.isLoading,

    acceptOrder: acceptMutation.mutateAsync,
    isAccepting: acceptMutation.isPending,

    rejectOrder: rejectMutation.mutateAsync,
    isRejecting: rejectMutation.isPending,

    sendQuotation: sendQuoteMutation.mutateAsync,
    isSendingQuote: sendQuoteMutation.isPending,

    updateQuotation: updateQuoteMutation.mutateAsync,
    isUpdatingQuote: updateQuoteMutation.isPending,

    deleteQuotation: deleteQuoteMutation.mutateAsync,
    isDeletingQuote: deleteQuoteMutation.isPending,
  };
}
