"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Search, CheckCircle, XCircle, ExternalLink, Package, ShieldOff, Pause } from 'lucide-react';
import Link from 'next/link';
import { ReasonModal } from '@/shared/components/ReasonModal';

export function ShopsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: string;
    target: string;
    onConfirm: (reason: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: '',
    target: '',
    onConfirm: () => {},
  });

  const { data, isLoading } = useQuery({
    queryKey: ['shops', { search, page }],
    queryFn: () => shopApi.getShops({ search, page, limit: 20 }),
    staleTime: 30 * 1000,
  });

  const shops = data?.shops ?? data?.data ?? [];
  const total = data?.total ?? 0;

  const approvePacking = useMutation({
    mutationFn: (id: string) => shopApi.approvePackingPermission(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shops'] }); showToast('Packing permission approved.', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const rejectPacking = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => shopApi.rejectPackingPermission(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shops'] }); showToast('Packing permission rejected.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const approveShop = useMutation({
    mutationFn: (id: string) => shopApi.approveShop(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shops'] }); showToast('Shop approved.', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const rejectShop = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => shopApi.rejectShop(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shops'] }); showToast('Shop rejected.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const suspendShop = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => shopApi.suspendShop(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shops'] }); showToast('Shop suspended.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const disableShop = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => shopApi.disableShop(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shops'] }); showToast('Shop disabled.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const STATUS_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'secondary'> = {
    APPROVED: 'success',
    PENDING: 'warning',
    REJECTED: 'destructive',
    SUSPENDED: 'warning',
    DISABLED: 'destructive',
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Shops</h1>
          <p className="text-xs text-white/45 mt-1">Manage shops and packing permission requests</p>
        </div>
        <div className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-semibold">
          {total} total shops
        </div>
      </div>

      <Card className="border border-white/5 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
          <Input placeholder="Search shops..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
      </Card>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Shop Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : shops.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No shops found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Packing Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.map((shop: any) => (
                  <TableRow key={shop.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          {shop.logoUrl ? <img src={shop.logoUrl} alt={shop.name} loading="lazy" className="h-full w-full object-cover rounded-lg" /> : <Package className="h-4 w-4 text-white/30" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/90">{shop.name}</p>
                          <p className="text-[10px] text-white/35">{shop.description?.slice(0, 30)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-white/60">{shop.city ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={shop.packingPermission === 'APPROVED' ? 'success' : shop.packingPermission === 'PENDING' ? 'warning' : 'outline'} className="text-[8px]">
                        {shop.packingPermission ?? 'None'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[shop.status] ?? 'outline'} className="text-[8px]">{shop.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {shop.status === 'PENDING' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10" isLoading={approveShop.isPending} onClick={() => approveShop.mutate(shop.id)}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" isLoading={rejectShop.isPending} onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'Reject Shop',
                                description: `Are you sure you want to reject the shop registration for "${shop.name}"?`,
                                action: 'Reject',
                                target: shop.name,
                                onConfirm: (reason) => rejectShop.mutate({ id: shop.id, reason }),
                              });
                            }}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {shop.status === 'APPROVED' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-400 hover:bg-orange-500/10" isLoading={suspendShop.isPending} onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'Suspend Shop',
                                description: `Are you sure you want to suspend "${shop.name}"? They will not be able to receive new orders.`,
                                action: 'Suspend',
                                target: shop.name,
                                onConfirm: (reason) => suspendShop.mutate({ id: shop.id, reason }),
                              });
                            }}>
                              <Pause className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" isLoading={disableShop.isPending} onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'Disable Shop',
                                description: `Are you sure you want to disable "${shop.name}"? This action disables storefront access.`,
                                action: 'Disable',
                                target: shop.name,
                                onConfirm: (reason) => disableShop.mutate({ id: shop.id, reason }),
                              });
                            }}>
                              <ShieldOff className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {shop.packingPermission === 'PENDING' && (
                          <>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10" isLoading={approvePacking.isPending} onClick={() => approvePacking.mutate(shop.id)}>
                              <Package className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" isLoading={rejectPacking.isPending} onClick={() => {
                              setModalConfig({
                                isOpen: true,
                                title: 'Reject Packing Permission',
                                description: `Are you sure you want to reject packing fee permissions for "${shop.name}"?`,
                                action: 'Reject',
                                target: shop.name,
                                onConfirm: (reason) => rejectPacking.mutate({ id: shop.id, reason }),
                              });
                            }}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        <Link href={`/shops/${shop.id}`} className="h-7 px-2 text-white/40 hover:text-white/80 transition-colors flex items-center">
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
    </div>
  );
}
