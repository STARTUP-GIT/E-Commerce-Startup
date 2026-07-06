"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderApi } from '../api/orderApi';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { 
  ShoppingBag, User, MapPin, Truck, Calendar, CreditCard, ShieldAlert,
  ArrowLeft, CheckCircle2, XCircle, RotateCcw, Clock
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { formatPrice } from '@/shared/utils/format';

export function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const orderId = String(id);
  const [statusVal, setStatusVal] = useState('');

  // Queries
  const { data: orderData, isLoading: isLoadingOrder, isError } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: () => orderApi.getOrder(orderId),
    enabled: !!orderId,
  });

  const { data: timelineData, isLoading: isLoadingTimeline } = useQuery({
    queryKey: ['order-timeline', orderId],
    queryFn: () => orderApi.getOrderTimeline(orderId),
    enabled: !!orderId,
  });

  const order = orderData?.order;
  const timeline = timelineData?.timeline ?? [];

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: (status: string) => orderApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-timeline', orderId] });
      showToast('Order status updated.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => orderApi.cancelOrder(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-timeline', orderId] });
      showToast('Order cancelled successfully.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const refundMutation = useMutation({
    mutationFn: (amount: number) => orderApi.refundOrder(orderId, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order-timeline', orderId] });
      showToast('Refund processed successfully.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  if (isLoadingOrder) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="text-center py-16 space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Order Details Not Found</h3>
        <Button variant="outline" size="sm" onClick={() => router.push('/orders')}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const handleStatusUpdate = () => {
    if (!statusVal) return;
    updateStatusMutation.mutate(statusVal);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/orders')}
            className="p-2 rounded-xl glass hover:bg-white/[0.05] border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white/95">
                Order #{order.orderNumber}
              </h1>
              <Badge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'destructive' : 'warning'} className="text-[9px] px-2 py-0.5 font-bold">
                {order.status}
              </Badge>
            </div>
            <p className="text-xs text-white/45 mt-1">ID: {order.id}</p>
          </div>
        </div>

        {/* Administration Actions Panel */}
        <div className="flex items-center gap-2 flex-wrap bg-white/[0.01] border border-white/5 p-2 rounded-xl">
          {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && (
            <div className="flex items-center gap-2">
              <select
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
                className="h-8 bg-neutral-900 border border-white/10 rounded-lg text-xs text-white/80 px-2.5 focus:border-white/20 focus:outline-none"
              >
                <option value="">Update Status...</option>
                <option value="PROCESSING">Processing</option>
                <option value="PACKED">Packed</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
              </select>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border border-white/10 hover:bg-white/[0.02]"
                isLoading={updateStatusMutation.isPending}
                disabled={!statusVal}
                onClick={handleStatusUpdate}
              >
                Update
              </Button>
            </div>
          )}

          {order.status !== 'CANCELLED' && (
            <Button
              size="sm"
              variant="destructive"
              className="h-8 text-xs"
              isLoading={cancelMutation.isPending}
              onClick={() => {
                showConfirm({
                  title: 'Cancel Order',
                  message: 'Are you sure you want to cancel this order? An automatic refund request might be initiated depending on transaction state.',
                  confirmText: 'Cancel Order',
                  onConfirm: () => cancelMutation.mutate('Cancelled by administrator'),
                });
              }}
            >
              <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel Order
            </Button>
          )}

          {order.status === 'CANCELLED' && order.paymentStatus === 'PAID' && (
            <Button
              size="sm"
              variant="default"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-8 text-xs"
              isLoading={refundMutation.isPending}
              onClick={() => {
                showConfirm({
                  title: 'Refund Order Payment',
                  message: `Process full refund of ${formatPrice(order.grandTotal)} to the customer?`,
                  confirmText: 'Issue Full Refund',
                  onConfirm: () => refundMutation.mutate(Number(order.grandTotal)),
                });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" /> Process Refund
            </Button>
          )}
        </div>
      </div>

      {/* Grid of panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details & Items Card */}
        <Card className="border border-white/5 bg-white/[0.01] lg:col-span-2">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Items Purchased</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items && order.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-xs font-bold text-white/90">{item.productName}</TableCell>
                    <TableCell className="text-xs text-white/60">{item.quantity}</TableCell>
                    <TableCell className="text-xs text-white/60">{formatPrice(item.unitPrice)}</TableCell>
                    <TableCell className="text-xs font-semibold text-white/90 text-right">{formatPrice(item.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Price breakdown summary */}
            <div className="p-6 border-t border-white/5 bg-white/[0.005] flex justify-end">
              <div className="w-64 space-y-2.5 text-xs text-white/60">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-white/80">{formatPrice(order.subtotal ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping Total</span>
                  <span className="text-white/80">{formatPrice(order.shippingTotal ?? 0)}</span>
                </div>
                {Number(order.packingFeeTotal) > 0 && (
                  <div className="flex justify-between">
                    <span>Packing Fees</span>
                    <span className="text-white/80">{formatPrice(order.packingFeeTotal)}</span>
                  </div>
                )}
                {Number(order.taxTotal) > 0 && (
                  <div className="flex justify-between">
                    <span>Tax (GST)</span>
                    <span className="text-white/80">{formatPrice(order.taxTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-white/10 pt-2.5 font-bold text-white text-sm">
                  <span>Grand Total</span>
                  <span className="text-purple-400">{formatPrice(order.grandTotal ?? 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer & Location Box */}
        <div className="space-y-6">
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block font-bold uppercase tracking-wider">Customer</span>
                  <span className="text-xs font-bold text-white/90">
                    {order.customer?.firstName} {order.customer?.lastName}
                  </span>
                  <span className="text-[10px] text-white/35 block font-medium">{order.customer?.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block font-bold uppercase tracking-wider">Order Date</span>
                  <span className="text-xs font-semibold text-white/80">
                    {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  <CreditCard className="h-4.5 w-4.5" />
                </div>
                <div>
                  <span className="text-[9px] text-white/40 block font-bold uppercase tracking-wider">Payment Status</span>
                  <span className="text-xs font-semibold text-white/80">
                    {order.paymentStatus}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          {order.shippingAddress && (
            <Card className="border border-white/5 bg-white/[0.01]">
              <CardHeader className="border-b border-white/5 pb-4">
                <CardTitle className="text-xs font-bold text-white/90">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-1.5 text-xs text-white/60">
                <div className="flex items-center gap-2 text-white/80 font-bold mb-1">
                  <MapPin className="h-4 w-4 text-white/40" />
                  <span>{order.shippingAddress.contactName ?? order.shippingAddress.fullName}</span>
                </div>
                <p>{order.shippingAddress.addressLine1}</p>
                {order.shippingAddress.addressLine2 && <p>{order.shippingAddress.addressLine2}</p>}
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.postalCode}</p>
                <p className="text-[10px] text-white/45 mt-2 font-medium">Contact Phone: {order.shippingAddress.phone}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Order Timeline */}
      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Status Timeline Log</CardTitle>
          <CardDescription>Chronological timeline audit trail of status transitions</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoadingTimeline ? (
            <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
          ) : timeline.length === 0 ? (
            <div className="text-center py-6 text-white/20 text-xs">No status change events logged</div>
          ) : (
            <div className="space-y-4 pl-4 relative border-l border-white/5 ml-2">
              {timeline.map((event: any, i: number) => (
                <div key={i} className="relative space-y-1">
                  <div className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-purple-500 ring-4 ring-[#07070a]" />
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-white/90 capitalize">{event.status.toLowerCase().replace('_', ' ')}</span>
                    <span className="text-[10px] text-white/35 font-medium">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  {event.description && (
                    <p className="text-[10px] text-white/50 leading-relaxed">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
