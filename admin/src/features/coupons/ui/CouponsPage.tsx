"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponApi } from '@/lib/api/featureApis';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Tag, Plus, Trash2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';

export function CouponsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: () => couponApi.getCoupons(),
    staleTime: 30 * 1000,
  });

  const coupons = data?.coupons ?? data?.data ?? [];

  const createForm = useForm({
    defaultValues: { code: '', discountType: 'PERCENTAGE', discountValue: 10, minOrderValue: 0, maxUses: 100, expiresAt: '' }
  });

  const createMutation = useMutation({
    mutationFn: (v: any) => couponApi.createCoupon({ ...v, discountValue: Number(v.discountValue), minOrderValue: Number(v.minOrderValue), maxUses: Number(v.maxUses) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['coupons'] }); showToast('Coupon created.', 'success'); setShowForm(false); createForm.reset(); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => couponApi.updateCoupon(id, { isActive: false }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['coupons'] }); showToast('Coupon deactivated.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponApi.deleteCoupon(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['coupons'] }); showToast('Coupon deleted.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Coupons</h1>
          <p className="text-xs text-white/45 mt-1">Create and manage discount codes</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-3.5 w-3.5" /> New Coupon
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <Card className="border border-white/10 bg-white/[0.02]">
              <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-white/90">Create Coupon</CardTitle>
                  <CardDescription>Configure new discount rules</CardDescription>
                </div>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70 cursor-pointer"><X className="h-4 w-4" /></button>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Coupon Code</label>
                    <Input placeholder="SAVE20" {...createForm.register('code', { required: true })} className="uppercase" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Discount Type</label>
                    <select {...createForm.register('discountType')} className="glass-input w-full h-10 rounded-xl px-3 text-sm text-white cursor-pointer">
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                      <option value="FREE_SHIPPING">Free Shipping</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Discount Value</label>
                    <Input type="number" placeholder="10" {...createForm.register('discountValue')} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Min Order (₹)</label>
                    <Input type="number" placeholder="0" {...createForm.register('minOrderValue')} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Max Uses</label>
                    <Input type="number" placeholder="100" {...createForm.register('maxUses')} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Expires At</label>
                    <Input type="datetime-local" {...createForm.register('expiresAt')} />
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <Button type="submit" isLoading={createMutation.isPending} className="w-full">Create Coupon</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Active Coupons</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No coupons found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon: any) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold text-xs text-white/90">{coupon.code}</TableCell>
                    <TableCell className="text-xs text-white/60">{coupon.discountType}</TableCell>
                    <TableCell className="text-xs font-semibold text-white/80">{coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}</TableCell>
                    <TableCell className="text-xs text-white/60">{coupon.usedCount ?? 0} / {coupon.maxUses ?? '∞'}</TableCell>
                    <TableCell><Badge variant={coupon.isActive ? 'success' : 'secondary'} className="text-[8px]">{coupon.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                    <TableCell className="text-xs text-white/40">{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString() : 'Never'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {coupon.isActive && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-400 hover:bg-orange-500/10 text-[9px]" isLoading={deactivateMutation.isPending} onClick={() => deactivateMutation.mutate(coupon.id)}>Deactivate</Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" isLoading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(coupon.id)}>
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
