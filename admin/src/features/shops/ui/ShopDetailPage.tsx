"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { 
  Store, User, MapPin, ShieldAlert, CheckCircle2, XCircle, ShieldOff, 
  Trash2, ArrowLeft, RotateCcw, AlertTriangle, ToggleLeft, ToggleRight, Box
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export function ShopDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const shopId = String(id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop-detail', shopId],
    queryFn: () => shopApi.getShop(shopId),
    enabled: !!shopId,
  });

  const shop = data?.shop;

  const [configComm, setConfigComm] = useState('10.0');
  const [configCustShare, setConfigCustShare] = useState('75');
  const [configSellerShare, setConfigSellerShare] = useState('25');
  const [configPackingApproved, setConfigPackingApproved] = useState(false);

  // Set initial states once shop is loaded
  useEffect(() => {
    if (shop) {
      setConfigComm(String(shop.commissionPercentage ?? '10.0'));
      setConfigCustShare(String(shop.customerDeliveryShare ?? '75'));
      setConfigSellerShare(String(shop.sellerDeliveryShare ?? '25'));
      setConfigPackingApproved(Boolean(shop.packingFeeApproved));
    }
  }, [shop]);

  const updateConfigMutation = useMutation({
    mutationFn: (payload: { commissionPercentage: number; customerDeliveryShare: number; sellerDeliveryShare: number; packingFeeApproved: boolean }) =>
      shopApi.updateShopConfig(shopId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      showToast('Shop configurations updated.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const handleConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const comm = parseFloat(configComm);
    const cust = parseInt(configCustShare);
    const sell = parseInt(configSellerShare);

    if (isNaN(comm) || comm < 0 || comm > 100) {
      showToast('Commission must be a percentage between 0 and 100.', 'error');
      return;
    }
    if (isNaN(cust) || cust < 0 || cust > 100 || isNaN(sell) || sell < 0 || sell > 100) {
      showToast('Delivery shares must be between 0 and 100.', 'error');
      return;
    }
    if (cust + sell !== 100) {
      showToast('Customer split and Seller split must equal 100%.', 'error');
      return;
    }

    updateConfigMutation.mutate({
      commissionPercentage: comm,
      customerDeliveryShare: cust,
      sellerDeliveryShare: sell,
      packingFeeApproved: configPackingApproved,
    });
  };

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => shopApi.approveShop(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      showToast('Shop approved.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => shopApi.rejectShop(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      showToast('Shop rejected.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const suspendMutation = useMutation({
    mutationFn: () => shopApi.suspendShop(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      showToast('Shop suspended.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const disableMutation = useMutation({
    mutationFn: () => shopApi.disableShop(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      showToast('Shop disabled.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => shopApi.deleteShop(shopId),
    onSuccess: () => {
      showToast('Shop permanently deleted.', 'info');
      router.push('/shops');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  if (isLoading) {
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

  if (isError || !shop) {
    return (
      <div className="text-center py-16 space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Shop Profile Not Found</h3>
        <Button variant="outline" size="sm" onClick={() => router.push('/shops')}>
          Back to Shops List
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/shops')}
            className="p-2 rounded-xl glass hover:bg-white/[0.05] border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white/95">
                {shop.name}
              </h1>
              <Badge variant={shop.status === 'APPROVED' ? 'success' : shop.status === 'PENDING' ? 'warning' : shop.status === 'REJECTED' ? 'destructive' : shop.status === 'SUSPENDED' ? 'warning' : 'destructive'} className="text-[9px] px-2 py-0.5 font-bold">
                {shop.status}
              </Badge>
            </div>
            <p className="text-xs text-white/45 mt-1">Slug: /shops/{shop.slug} • ID: {shop.id}</p>
          </div>
        </div>

        {/* Administration Actions Panel */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Approve / Reject */}
          {shop.status === 'PENDING' && (
            <>
              <Button size="sm" variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 text-xs" isLoading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
              </Button>
              <Button size="sm" variant="destructive" className="h-9 text-xs" isLoading={rejectMutation.isPending} onClick={() => rejectMutation.mutate()}>
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
              </Button>
            </>
          )}

          {/* Suspend / Disable for Approved */}
          {shop.status === 'APPROVED' && (
            <>
              <Button size="sm" variant="secondary" className="h-9 text-xs border border-orange-500/20 text-orange-400 hover:bg-orange-500/10" isLoading={suspendMutation.isPending} onClick={() => suspendMutation.mutate()}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Suspend
              </Button>
              <Button size="sm" variant="destructive" className="h-9 text-xs" isLoading={disableMutation.isPending} onClick={() => disableMutation.mutate()}>
                <ShieldOff className="h-3.5 w-3.5 mr-1.5" /> Disable
              </Button>
            </>
          )}

          {/* Restore / Unban for Suspended / Disabled / Rejected */}
          {(shop.status === 'SUSPENDED' || shop.status === 'DISABLED' || shop.status === 'REJECTED') && (
            <Button size="sm" variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 text-xs" isLoading={approveMutation.isPending} onClick={() => approveMutation.mutate()}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore (Approve)
            </Button>
          )}

          {/* Delete Shop */}
          <Button
            size="sm"
            variant="destructive"
            className="h-9 text-xs bg-red-950/20 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 text-red-400"
            isLoading={deleteMutation.isPending}
            onClick={() => {
              showConfirm({
                title: 'Delete Shop permanently',
                message: 'CRITICAL: This will permanently delete the shop profile and default pickup settings. This cannot be undone.',
                confirmText: 'Delete Shop',
                onConfirm: () => deleteMutation.mutate(),
              });
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Shop
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Associated Seller, Description, Pickup Address */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Shop Description */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-xs font-bold text-white/95">Shop Description</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
              {shop.description || 'No description provided by the seller.'}
            </CardContent>
          </Card>

          {/* Default Pickup Address */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-xs font-bold text-white/95">Default Pickup Address</CardTitle>
              <CardDescription>Address used by delivery agents for order pickups</CardDescription>
            </CardHeader>
            <CardContent className="p-4 text-xs">
              {shop.defaultPickupAddress ? (
                <div className="flex gap-3">
                  <MapPin className="h-4.5 w-4.5 text-white/30 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-white/60 font-semibold">{shop.defaultPickupAddress.contactName || 'Pickup Address'}</p>
                    <p className="text-white/70">{shop.defaultPickupAddress.addressLine1}</p>
                    {shop.defaultPickupAddress.addressLine2 && <p className="text-white/70">{shop.defaultPickupAddress.addressLine2}</p>}
                    <p className="text-white/70">{shop.defaultPickupAddress.city}, {shop.defaultPickupAddress.state} - {shop.defaultPickupAddress.postalCode}</p>
                    <p className="text-[10px] text-white/40 mt-1">Latitude: {shop.defaultPickupAddress.latitude || '—'} • Longitude: {shop.defaultPickupAddress.longitude || '—'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-white/30 italic">No default pickup address configured.</div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Associated Seller, Metrics, Details */}
        <div className="space-y-6">
          
          {/* Associated Seller Card */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-white/95">Associated Seller</CardTitle>
                <CardDescription>Click to view seller profile</CardDescription>
              </div>
              <User className="h-4.5 w-4.5 text-white/45" />
            </CardHeader>
            <CardContent className="pt-4">
              {shop.seller ? (
                <div 
                  className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] glass-hover cursor-pointer" 
                  onClick={() => router.push(`/sellers/${shop.seller.id}`)}
                >
                  <p className="text-xs font-bold text-white">
                    {shop.seller.firstName} {shop.seller.lastName}
                  </p>
                  <p className="text-[10px] text-white/40 mt-0.5">@{shop.seller.username} • {shop.seller.email}</p>
                  <Badge variant={shop.seller.isBanned ? 'destructive' : 'outline'} className="text-[8px] mt-2">
                    {shop.seller.status}
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-white/30 italic">No seller associated.</div>
              )}
            </CardContent>
          </Card>

          {/* Shop Metadata */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-xs font-bold text-white/95">Metadata & Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Business Name:</span>
                <span className="text-white/90 font-bold">{shop.businessName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Support Phone:</span>
                <span className="text-white/80 font-medium select-all">{shop.supportPhone || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Support Email:</span>
                <span className="text-white/80 select-all">{shop.supportEmail || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Packing Fees:</span>
                <Badge variant={shop.enablePackingFee ? 'success' : 'secondary'} className="text-[8px]">
                  {shop.enablePackingFee ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              {shop.rejectionReason && (
                <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-red-400 block uppercase">Rejection Reason</span>
                  <span className="text-white/70 text-[11px] block">{shop.rejectionReason}</span>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
