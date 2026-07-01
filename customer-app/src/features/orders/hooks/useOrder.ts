import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../api/orderApi';
import { useConfirmStore } from '@/lib/store/confirmStore';

export function useOrder(orderId?: string) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ['orders'],
    queryFn: () => orderApi.getOrders(),
  });

  const orderQuery = useQuery({
    queryKey: ['order-details', orderId],
    queryFn: () => orderApi.getOrder(orderId!),
    enabled: !!orderId,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => orderApi.cancelOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
      }
    },
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: (sellerOrderId: string) => orderApi.confirmDelivery(sellerOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
      }
    },
  });

  const showAlert = useConfirmStore((state) => state.showAlert);

  const downloadInvoiceMutation = useMutation({
    mutationFn: (id: string) => orderApi.downloadInvoice(id),
    onSuccess: (data) => {
      if (data?.invoiceUrl) {
        window.open(data.invoiceUrl, '_blank');
      } else {
        showAlert({ title: 'Invoice Downloaded', message: 'The invoice has been generated successfully.' });
      }
    },
  });

  return {
    orders: ordersQuery.data?.orders || [],
    isOrdersLoading: ordersQuery.isLoading,
    
    order: orderQuery.data?.order,
    isOrderLoading: orderQuery.isLoading,
    isOrderError: orderQuery.isError,

    cancelOrder: cancelMutation.mutate,
    isCancelling: cancelMutation.isPending,

    confirmDelivery: confirmDeliveryMutation.mutate,
    isConfirmingDelivery: confirmDeliveryMutation.isPending,

    downloadInvoice: downloadInvoiceMutation.mutate,
    isDownloadingInvoice: downloadInvoiceMutation.isPending,
  };
}
