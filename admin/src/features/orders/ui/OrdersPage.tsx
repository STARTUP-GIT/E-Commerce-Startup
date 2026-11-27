"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../api/orderApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Search, ExternalLink, MapPin } from 'lucide-react';
import { formatPrice } from '@/shared/utils/format';
import Link from 'next/link';
import { LocationFilterBar } from '@/shared/components/LocationFilterBar';

const ORDER_STATUS_COLORS: Record<string, any> = {
  PLACED: 'default',
  PENDING_CONFIRMATION: 'warning',
  CONFIRMED: 'success',
  SHIPPED: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  REFUNDED: 'warning',
};

export function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [deliveryMethodFilter, setDeliveryMethodFilter] = useState('');
  const [page, setPage] = useState(1);

  const isUnassigned = selectedState === 'UNASSIGNED';

  const { data, isLoading } = useQuery({
    queryKey: [
      'orders',
      {
        search,
        status: statusFilter,
        state: selectedState,
        district: selectedDistrict,
        paymentMethod: paymentMethodFilter,
        deliveryMethod: deliveryMethodFilter,
        page,
      },
    ],
    queryFn: () =>
      orderApi.getOrders({
        search: search || undefined,
        status: statusFilter && statusFilter !== 'ALL' ? statusFilter : undefined,
        state: isUnassigned ? 'UNASSIGNED' : selectedState || undefined,
        district: !isUnassigned && selectedDistrict ? selectedDistrict : undefined,
        unassigned: isUnassigned ? true : undefined,
        paymentMethod: paymentMethodFilter || undefined,
        deliveryMethod: deliveryMethodFilter || undefined,
        page,
        limit: 20,
      }),
    staleTime: 30 * 1000,
  });

  const orders = data?.orders ?? data?.data ?? [];
  const total = data?.total ?? 0;

  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Pending Confirmation', value: 'PENDING_CONFIRMATION' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Shipped', value: 'SHIPPED' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Cancelled', value: 'CANCELLED' },
    { label: 'Refunded', value: 'REFUNDED' },
  ];

  const handleClearAll = () => {
    setSearch('');
    setStatusFilter('');
    setSelectedState('');
    setSelectedDistrict('');
    setPaymentMethodFilter('');
    setDeliveryMethodFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Orders</h1>
          <p className="text-xs text-white/45 mt-1">Monitor and manage all platform orders</p>
        </div>
        <div className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-semibold">
          {total} total orders
        </div>
      </div>

      <Card className="border border-white/5 p-4">
        <LocationFilterBar
          search={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          searchPlaceholder="Search order #, customer email, phone..."
          state={selectedState}
          onStateChange={(val) => { setSelectedState(val); setPage(1); }}
          district={selectedDistrict}
          onDistrictChange={(val) => { setSelectedDistrict(val); setPage(1); }}
          status={statusFilter}
          onStatusChange={(val) => { setStatusFilter(val); setPage(1); }}
          statusOptions={statusOptions}
          onClearAll={handleClearAll}
          extraFilters={
            <>
              {/* Payment Method Filter */}
              <select
                value={paymentMethodFilter}
                onChange={(e) => { setPaymentMethodFilter(e.target.value); setPage(1); }}
                className="h-10 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/80 focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="" className="bg-[#0e0e14] text-white">All Payments</option>
                <option value="COD" className="bg-[#0e0e14] text-white">Cash on Delivery (COD)</option>
                <option value="RAZORPAY" className="bg-[#0e0e14] text-white">Razorpay</option>
              </select>

              {/* Delivery Method Filter */}
              <select
                value={deliveryMethodFilter}
                onChange={(e) => { setDeliveryMethodFilter(e.target.value); setPage(1); }}
                className="h-10 px-3 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-semibold text-white/80 focus:outline-none focus:border-white/30 cursor-pointer"
              >
                <option value="" className="bg-[#0e0e14] text-white">All Deliveries</option>
                <option value="ATLASBASKET_DELIVERY" className="bg-[#0e0e14] text-white">AtlasBasket Delivery Network</option>
                <option value="THIRD_PARTY_DELIVERY" className="bg-[#0e0e14] text-white">Third-Party Delivery</option>
                <option value="SELF_DELIVERY" className="bg-[#0e0e14] text-white">Seller Delivery (Legacy)</option>
              </select>
            </>
          }
        />
      </Card>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Order Registry</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No orders found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Delivery Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-bold text-white/90 text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{order.orderNumber ?? order.id?.slice(0, 8)}</span>
                        {order.sellerOrders?.some((so: any) => so.items?.some((it: any) => it.fulfilmentType === 'MADE_TO_ORDER')) && (
                          <Badge variant="outline" className="text-[8px] border-purple-500 text-purple-400">
                            MTO
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-white/60">
                      {order.customer?.username || order.customer?.email || order.customerId}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const addr = order.shippingAddress;
                        if (!addr?.state) {
                          return <span className="text-[10px] text-amber-400/80 italic">Location not set</span>;
                        }
                        return (
                          <div className="flex items-center gap-1.5 text-xs text-white/80">
                            <MapPin className="h-3 w-3 text-white/40 shrink-0" />
                            <span>{addr.state}{addr.district || addr.city ? ` • ${addr.district || addr.city}` : ''}</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-bold">
                        {order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod || 'Razorpay'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[9px] font-semibold">
                        {order.selectedDeliveryMethod === 'THIRD_PARTY_DELIVERY'
                          ? 'Third-Party Delivery'
                          : order.selectedDeliveryMethod === 'ATLASBASKET_DELIVERY' || order.selectedDeliveryMethod === 'PORTAL_DELIVERY'
                          ? 'AtlasBasket Fleet'
                          : order.selectedDeliveryMethod || 'Default'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold text-white/90">
                      {formatPrice(Number(order.grandTotal) || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_COLORS[order.status] ?? 'outline'} className="text-[9px]">
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
                        aria-label="View order details"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
