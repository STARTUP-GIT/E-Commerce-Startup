"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryApi } from '../api/deliveryApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Truck, Activity, Clock, CheckCircle } from 'lucide-react';

export function DeliveryPage() {
  const [tab, setTab] = useState<'list' | 'analytics'>('list');
  const [page] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['deliveries', { page }],
    queryFn: () => deliveryApi.getAllDeliveries({ page, limit: 20 }),
    enabled: tab === 'list',
    staleTime: 30 * 1000,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['delivery-analytics'],
    queryFn: deliveryApi.getDeliveryAnalytics,
    enabled: tab === 'analytics',
    staleTime: 5 * 60 * 1000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => deliveryApi.cancelDelivery(id, 'Cancelled by admin'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveries'] }); showToast('Delivery cancelled.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deliveries = data?.deliveries ?? data?.data ?? [];

  const DELIVERY_STATUS_COLOR: Record<string, any> = {
    PENDING: 'warning', ASSIGNED: 'default', PICKED_UP: 'default',
    IN_TRANSIT: 'default', DELIVERED: 'success', CANCELLED: 'destructive',
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Truck className="h-5 w-5 text-white/60" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Delivery</h1>
          <p className="text-xs text-white/45 mt-0.5">Monitor all deliveries and courier operations</p>
        </div>
      </div>

      <div className="flex gap-1 border border-white/5 rounded-xl p-1 bg-white/[0.02] w-fit">
        {(['list', 'analytics'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
            {t === 'list' ? 'All Deliveries' : 'Analytics'}
          </button>
        ))}
      </div>

      {tab === 'analytics' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {analyticsLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          ) : analyticsData ? (
            [
              {label: 'Total Deliveries', value: analyticsData?.totalDeliveries ?? 0, icon: Truck, color: 'text-white/60' },
              {label: 'In Transit', value: analyticsData?.inTransit ?? 0, icon: Activity, color: 'text-white/60' },
              {label: 'Pending', value: analyticsData?.pending ?? 0, icon: Clock, color: 'text-white/60' },
              {label: 'Delivered', value: analyticsData?.delivered ?? 0, icon: CheckCircle, color: 'text-white/60' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border border-white/5">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
                  <Icon className={`h-4 w-4 ${color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-extrabold text-white/90">{value}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="col-span-4 text-center py-12 text-white/30 text-sm">No analytics data available</div>
          )}
        </div>
      )}

      {tab === 'list' && (
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Delivery Log</CardTitle>
            <CardDescription>All platform delivery records</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-16 text-white/30 text-sm">No deliveries found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Partner</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs text-white/70">{d.orderId?.slice(0, 10) ?? '—'}</TableCell>
                      <TableCell className="text-xs text-white/60">{d.deliveryPartner?.name ?? d.deliveryPartnerId ?? 'Unassigned'}</TableCell>
                      <TableCell><Badge variant={DELIVERY_STATUS_COLOR[d.status] ?? 'outline'} className="text-[8px]">{d.status}</Badge></TableCell>
                      <TableCell className="text-xs text-white/60">{d.distance ? `${d.distance} km` : '—'}</TableCell>
                      <TableCell className="text-xs text-white/40">{d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>
                        {(d.status !== 'DELIVERED' && d.status !== 'CANCELLED') && (
                          <div className="flex justify-end">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10 text-[9px]" isLoading={cancelMutation.isPending} onClick={() => cancelMutation.mutate(d.id)}>
                              Cancel
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
