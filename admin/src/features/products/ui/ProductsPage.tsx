"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Search, Eye, EyeOff, Trash2, MapPin } from 'lucide-react';
import { formatPrice } from '@/shared/utils/format';
import { LocationFilterBar } from '@/shared/components/LocationFilterBar';

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const isUnassigned = selectedState === 'UNASSIGNED';

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, status: statusFilter, state: selectedState, district: selectedDistrict, page }],
    queryFn: () =>
      productApi.getProducts({
        search: search || undefined,
        status: statusFilter && statusFilter !== 'ALL' ? statusFilter : undefined,
        state: isUnassigned ? 'UNASSIGNED' : selectedState || undefined,
        district: !isUnassigned && selectedDistrict ? selectedDistrict : undefined,
        unassigned: isUnassigned ? true : undefined,
        page,
        limit: 20,
      }),
    staleTime: 30 * 1000,
  });

  const products = data?.products ?? data?.data ?? [];
  const total = data?.total ?? 0;

  const hideMutation = useMutation({
    mutationFn: (id: string) => productApi.hideProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); showToast('Product hidden.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const unhideMutation = useMutation({
    mutationFn: (id: string) => productApi.unhideProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); showToast('Product visible.', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productApi.deleteProduct(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); showToast('Product deleted.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const statusOptions = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'Published / Active', value: 'ACTIVE' },
    { label: 'Hidden / Draft', value: 'DRAFT' },
    { label: 'Archived', value: 'ARCHIVED' },
  ];

  const handleClearAll = () => {
    setSearch('');
    setStatusFilter('');
    setSelectedState('');
    setSelectedDistrict('');
    setPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Products</h1>
          <p className="text-xs text-white/45 mt-1">Monitor and moderate product listings</p>
        </div>
        <div className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-semibold">{total} total products</div>
      </div>

      <Card className="border border-white/5 p-4">
        <LocationFilterBar
          search={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          searchPlaceholder="Search products by title, description..."
          state={selectedState}
          onStateChange={(val) => { setSelectedState(val); setPage(1); }}
          district={selectedDistrict}
          onDistrictChange={(val) => { setSelectedDistrict(val); setPage(1); }}
          status={statusFilter}
          onStatusChange={(val) => { setStatusFilter(val); setPage(1); }}
          statusOptions={statusOptions}
          onClearAll={handleClearAll}
        />
      </Card>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Product Catalog</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No products found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Fulfilment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: any) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt={product.name} loading="lazy" className="h-8 w-8 rounded-lg object-cover bg-white/5" />
                        )}
                        <p className="text-xs font-bold text-white/90 line-clamp-1">{product.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-white/60">{product.seller?.shop?.name ?? product.shop?.name ?? '—'}</TableCell>
                    <TableCell>
                      {(() => {
                        const addr = product.seller?.shop?.defaultPickupAddress || product.seller?.addresses?.[0];
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
                    <TableCell className="text-xs font-semibold text-white/80">{formatPrice(product.price)}</TableCell>
                    <TableCell className="text-xs text-white/60">{product.stock ?? 0}</TableCell>
                    <TableCell>
                      {product.fulfilmentType === 'MADE_TO_ORDER' ? (
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="text-[8px] border-purple-500 text-purple-400">
                            Made to Order ({product.minPrepDays || 1}–{product.maxPrepDays || 1}d)
                          </Badge>
                          {product.maxConcurrentOrders ? (
                            <span className="text-[10px] text-white/40 block">
                              Cap: {product.activeProductionOrders || 0}/{product.maxConcurrentOrders}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-[8px] text-emerald-400">
                          Ready to Ship
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.status === 'ACTIVE' ? 'success' : 'outline'} className="text-[8px]">
                        {product.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {product.status === 'ACTIVE' ? (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-white/40 hover:text-white" onClick={() => hideMutation.mutate(product.id)}>
                            <EyeOff className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-white/40 hover:text-white" onClick={() => unhideMutation.mutate(product.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => deleteMutation.mutate(product.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
