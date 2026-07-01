"use client";

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/featureApis';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { Settings, DollarSign, Package, CreditCard, ShoppingCart } from 'lucide-react';
import { useForm } from 'react-hook-form';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const settings = data?.settings ?? data ?? {};

  const gstForm = useForm({ defaultValues: { gstPercentage: settings?.gstPercentage ?? 18 } });
  const feeForm = useForm({ defaultValues: { platformFeePercentage: settings?.platformFeePercentage ?? 10 } });

  const updateGST = useMutation({
    mutationFn: (v: any) => settingsApi.updateGST({ gstPercentage: Number(v.gstPercentage) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); showToast('GST updated.', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const updateFee = useMutation({
    mutationFn: (v: any) => settingsApi.updatePlatformFee({ platformFeePercentage: Number(v.platformFeePercentage) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['settings'] }); showToast('Platform fee updated.', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  if (isLoading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white/95">Platform Settings</h1>
        <p className="text-xs text-white/45 mt-1">Configure global marketplace rules and rates</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* GST */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-white/40" />
              <CardTitle className="text-xs font-bold text-white/90">GST Configuration</CardTitle>
            </div>
            <CardDescription>Set the applicable GST rate for transactions</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={gstForm.handleSubmit((v) => updateGST.mutate(v))} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">GST Percentage (%)</label>
                <Input type="number" step="0.01" min="0" max="100" {...gstForm.register('gstPercentage')} defaultValue={settings?.gstPercentage ?? 18} />
              </div>
              <Button type="submit" size="sm" isLoading={updateGST.isPending} className="w-full">Update GST</Button>
            </form>
          </CardContent>
        </Card>

        {/* Platform Fee */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-white/40" />
              <CardTitle className="text-xs font-bold text-white/90">Platform Commission</CardTitle>
            </div>
            <CardDescription>Set the platform fee charged on each transaction</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={feeForm.handleSubmit((v) => updateFee.mutate(v))} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Fee Percentage (%)</label>
                <Input type="number" step="0.01" min="0" max="100" {...feeForm.register('platformFeePercentage')} defaultValue={settings?.platformFeePercentage ?? 10} />
              </div>
              <Button type="submit" size="sm" isLoading={updateFee.isPending} className="w-full">Update Fee</Button>
            </form>
          </CardContent>
        </Card>

        {/* Current Settings Summary */}
        <Card className="border border-white/5 md:col-span-2">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-white/40" />
              <CardTitle className="text-xs font-bold text-white/90">Current Configuration</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(settings).map(([key, value]) => (
                typeof value !== 'object' && (
                  <div key={key} className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-sm font-bold text-white/80">{String(value)}</p>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
