"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productApi } from '../api/productApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Search, Eye, EyeOff, Trash2 } from 'lucide-react';
import { formatPrice } from '@/shared/utils/format';

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, page }],
    queryFn: () => productApi.getProducts({ search, page, limit: 20 }),
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

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Products</h1>
          <p className="text-xs text-white/45 mt-1">Monitor and moderate marketplace listings</p>
        </div>
        <div className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-semibold">{total} total products</div>
      </div>

      <Card className="border border-white/5 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
          <Input placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
        </div>
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
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
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
                    <TableCell className="text-xs text-white/60">{product.shop?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs font-semibold text-white/80">{formatPrice(product.price)}</TableCell>
                    <TableCell className="text-xs text-white/60">{product.stock ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={product.isHidden ? 'secondary' : product.isDeleted ? 'destructive' : 'success'} className="text-[8px]">
                        {product.isDeleted ? 'Deleted' : product.isHidden ? 'Hidden' : 'Visible'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {product.isHidden ? (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10" isLoading={unhideMutation.isPending} onClick={() => unhideMutation.mutate(product.id)} title="Show"><Eye className="h-3.5 w-3.5" /></Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-400 hover:bg-orange-500/10" isLoading={hideMutation.isPending} onClick={() => hideMutation.mutate(product.id)} title="Hide"><EyeOff className="h-3.5 w-3.5" /></Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" isLoading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(product.id)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={products.length < 20}>Next</Button>
        </div>
      )}
    </div>
  );
}
