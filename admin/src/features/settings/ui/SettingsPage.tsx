"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/featureApis';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Badge } from '@/shared/components/Badge';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import {
  Settings,
  IndianRupee,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldAlert,
  Percent,
  Check,
} from 'lucide-react';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
    staleTime: 30 * 1000,
  });

  const settings = data?.settings ?? {};

  // Form states initialized and synced from authoritative settings
  const [gstInput, setGstInput] = useState<string>('');
  const [feeInput, setFeeInput] = useState<string>('');
  const [feeEnabled, setFeeEnabled] = useState<boolean>(true);
  const [isGstDirty, setIsGstDirty] = useState<boolean>(false);
  const [isFeeDirty, setIsFeeDirty] = useState<boolean>(false);

  // Sync state whenever authoritative settings load or update
  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) {
      if (!isGstDirty) {
        setGstInput(settings.gstPercentage !== undefined ? String(settings.gstPercentage) : '18');
      }
      if (!isFeeDirty) {
        setFeeInput(settings.platformFee !== undefined ? String(settings.platformFee) : '10');
        setFeeEnabled(settings.platformFeeEnabled !== undefined ? Boolean(settings.platformFeeEnabled) : true);
      }
    }
  }, [settings, isGstDirty, isFeeDirty]);

  // Update GST Mutation
  const updateGST = useMutation({
    mutationFn: async (gstPercentage: number) => {
      return await settingsApi.updateGST({ gstPercentage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setIsGstDirty(false);
      showToast('GST rate updated successfully.', 'success');
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.message || e.message || 'Failed to update GST.', 'error');
    },
  });

  // Update Platform Fee Mutation
  const updateFee = useMutation({
    mutationFn: async (payload: { platformFee: number; platformFeeEnabled: boolean }) => {
      return await settingsApi.updatePlatformFee(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setIsFeeDirty(false);
      showToast('Platform fee configuration saved.', 'success');
    },
    onError: (e: any) => {
      showToast(e?.response?.data?.message || e.message || 'Failed to update platform fee.', 'error');
    },
  });

  const handleGstSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(gstInput);
    if (isNaN(val) || val < 0 || val > 100) {
      showToast('Please enter a valid GST percentage between 0 and 100.', 'error');
      return;
    }
    updateGST.mutate(val);
  };

  const handleFeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(feeInput);
    if (isNaN(val) || val < 0) {
      showToast('Please enter a valid platform fee amount (₹0 or greater).', 'error');
      return;
    }
    updateFee.mutate({
      platformFee: val,
      platformFeeEnabled: feeEnabled,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-center space-y-3">
        <AlertCircle className="h-8 w-8 mx-auto text-rose-400" />
        <h3 className="font-bold text-base">Failed to load marketplace settings</h3>
        <p className="text-xs text-rose-300/70">{(error as any)?.message || 'Internal connection error'}</p>
        <Button size="sm" onClick={() => refetch()} className="mt-2 bg-rose-600 hover:bg-rose-500 text-white">
          Retry
        </Button>
      </div>
    );
  }

  const currentGst = settings.gstPercentage !== undefined ? Number(settings.gstPercentage) : 18;
  const currentFee = settings.platformFee !== undefined ? Number(settings.platformFee) : 10;
  const isCurrentlyEnabled = settings.platformFeeEnabled !== undefined ? Boolean(settings.platformFeeEnabled) : true;
  const effectiveFee = isCurrentlyEnabled ? currentFee : 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="h-6 w-6 text-indigo-400" />
            Marketplace Settings
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Authoritative platform fee control, transaction tax rates, and global parameters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data?.lastUpdatedBy && (
            <div className="text-[11px] text-white/40 flex items-center gap-1.5 bg-white/[0.02] border border-white/10 px-3 py-1.5 rounded-xl">
              <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Last modified by: <strong className="text-white/80">{data.lastUpdatedBy}</strong></span>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PLATFORM FEE CONFIGURATION CARD */}
        <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl shadow-xl flex flex-col">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">Platform Fee Control</CardTitle>
                  <CardDescription className="text-xs text-white/45">
                    Enable or disable the buyer platform fee charged at checkout
                  </CardDescription>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  feeEnabled
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-white/10 bg-white/5 text-white/40'
                }`}
              >
                {feeEnabled ? 'TOGGLE ON' : 'TOGGLE OFF'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-5 flex-1 flex flex-col justify-between">
            <form onSubmit={handleFeeSubmit} className="space-y-5">
              {/* Toggle Switch */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Charge Platform Fee on Customer Orders</span>
                  </div>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    {feeEnabled
                      ? 'Customers will be charged the configured fee during checkout.'
                      : 'Fee is completely turned off (₹0 applied). Hidden from checkout summary.'}
                  </p>
                </div>

                {/* Explicit Visual Toggle Switch Component */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={feeEnabled}
                  onClick={() => {
                    setFeeEnabled(!feeEnabled);
                    setIsFeeDirty(true);
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    feeEnabled ? 'bg-indigo-600' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      feeEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Fee Amount Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                    Configured Fee Amount (₹ INR)
                  </label>
                  {!feeEnabled && (
                    <span className="text-[10px] text-amber-400 font-medium">
                      Stored value preserved for future re-enable
                    </span>
                  )}
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-white/40 font-bold">₹</span>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    max="1000"
                    disabled={!feeEnabled}
                    value={feeInput}
                    onChange={(e) => {
                      setFeeInput(e.target.value);
                      setIsFeeDirty(true);
                    }}
                    placeholder="e.g. 10"
                    className={`pl-7 h-10 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white ${
                      !feeEnabled ? 'opacity-50 cursor-not-allowed bg-white/[0.01]' : 'focus:border-indigo-500'
                    }`}
                  />
                </div>
              </div>

              {/* Status Alert Banner */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                  feeEnabled
                    ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200'
                    : 'bg-white/[0.02] border-white/10 text-white/60'
                }`}
              >
                {feeEnabled ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Active in checkout:</span>
                      <p className="text-[11px] text-white/60 mt-0.5">
                        Eligible orders include a <strong className="text-indigo-300">₹{parseFloat(feeInput) || 0}</strong> platform fee.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-amber-300">Disabled:</span>
                      <p className="text-[11px] text-white/50 mt-0.5">
                        Effective platform fee is <strong className="text-white">₹0</strong>. The platform fee line is hidden from customer checkout and invoices.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Audit info */}
              {data?.lastFeeUpdatedAt && (
                <div className="text-[10px] text-white/40 flex items-center gap-1.5 pt-1">
                  <Clock className="h-3 w-3" />
                  <span>Last saved: {new Date(data.lastFeeUpdatedAt).toLocaleString()}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                size="sm"
                isLoading={updateFee.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-10 rounded-xl"
              >
                Save Platform Fee Configuration
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* GST CONFIGURATION CARD */}
        <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl shadow-xl flex flex-col">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Percent className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-white">GST Tax Rate</CardTitle>
                  <CardDescription className="text-xs text-white/45">
                    Configure applicable Goods &amp; Services Tax for checkout transactions
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                {currentGst}% PERSISTED
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-5 flex-1 flex flex-col justify-between">
            <form onSubmit={handleGstSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                  Applicable GST Rate (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={gstInput}
                    onChange={(e) => {
                      setGstInput(e.target.value);
                      setIsGstDirty(true);
                    }}
                    placeholder="e.g. 18"
                    className="h-10 text-xs rounded-xl bg-white/[0.03] border-white/10 text-white focus:border-emerald-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-white/40 font-bold">%</span>
                </div>
                <p className="text-[11px] text-white/40">
                  Calculated against taxable product subtotal, packing fees, and shipping. Kept separate from platform fee rules.
                </p>
              </div>

              <div className="p-3.5 bg-white/[0.02] border border-white/10 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-white/50">Current Saved Rate:</span>
                  <span className="font-semibold text-white">{currentGst}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Form Value:</span>
                  <span className="font-mono text-emerald-300">{gstInput || '0'}%</span>
                </div>
              </div>

              <div className="pt-8">
                <Button
                  type="submit"
                  size="sm"
                  isLoading={updateGST.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 rounded-xl"
                >
                  Update GST Rate
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* SINGLE AUTHORITATIVE CURRENT CONFIGURATION CARD */}
        <Card className="border border-white/10 bg-[#0d0d14] rounded-2xl shadow-xl md:col-span-2">
          <CardHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-indigo-400" />
                <CardTitle className="text-xs font-bold text-white/90">
                  Current Authoritative Configuration
                </CardTitle>
              </div>
              <span className="text-[10px] text-white/40">
                Single source of truth loaded from PostgreSQL database
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">
                  GST Rate
                </p>
                <p className="text-base font-bold text-emerald-400">{currentGst}%</p>
                <p className="text-[10px] text-white/40 mt-0.5">Applied to taxable value</p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">
                  Platform Fee Status
                </p>
                <div className="flex items-center gap-1.5">
                  <div className={`h-2 w-2 rounded-full ${isCurrentlyEnabled ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                  <p className="text-base font-bold text-white">
                    {isCurrentlyEnabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {isCurrentlyEnabled ? 'Active at checkout' : 'Turned off (₹0)'}
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">
                  Effective Fee on Checkout
                </p>
                <p className="text-base font-bold text-indigo-300">
                  ₹{effectiveFee}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {isCurrentlyEnabled ? `Configured ₹${currentFee}` : 'Zero fee charged'}
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider mb-1">
                  Payment Gateway
                </p>
                <p className="text-base font-bold text-white uppercase">
                  {settings.paymentGateway?.selected || 'razorpay'}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5">Active gateway driver</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
