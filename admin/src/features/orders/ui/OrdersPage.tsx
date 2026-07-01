"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderApi } from '../api/orderApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Search, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const ORDER_STATUS_COLORS: Record<string, any> = {
  PLACED: 'default', CONFIRMED: 'success', SHIPPED: 'default',
  DELIVERED: 'success', CANCELLED: 'destructive', REFUNDED: 'warning',
};

export function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { search, status: statusFilter, page }],
    queryFn: () => orderApi.getOrders({ search, status: statusFilter || undefined, page, limit: 20 }),
    staleTime: 30 * 1000,
  });

  const orders = data?.orders ?? data?.data ?? [];
  const total = data?.total ?? 0;

  const statuses = ['', 'PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

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
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <Input placeholder="Search orders..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button key={s || 'all'} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer ${statusFilter === s ? 'bg-white/15 border-white/25 text-white' : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-bold text-white/90 text-xs">{order.orderNumber ?? order.id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs text-white/60">{order.customer?.firstName ?? order.customerId}</TableCell>
                    <TableCell className="text-xs font-semibold text-white/80">₹{Number(order.totalAmount ?? order.amount ?? 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_COLORS[order.status] ?? 'outline'} className="text-[8px]">{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Link href={`/orders/${order.id}`} className="h-7 px-2 text-white/40 hover:text-white/80 transition-colors flex items-center">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="text-xs text-white/40">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={orders.length < 20}>Next</Button>
        </div>
      )}
    </div>
  );
}
