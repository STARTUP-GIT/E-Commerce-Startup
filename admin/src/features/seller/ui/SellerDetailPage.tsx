"use client";

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '../api/sellerApi';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { 
  User, Store, MapPin, CreditCard, ShieldAlert, FileCheck, CheckCircle2, XCircle, 
  ShieldOff, ShieldAlert as ShieldIcon, Trash2, ArrowLeft, RotateCcw, AlertTriangle, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' | 'default'> = {
  APPROVED: 'success',
  PENDING_APPROVAL: 'warning',
  PENDING_VERIFICATION: 'secondary',
  DRAFT: 'secondary',
  REJECTED: 'destructive',
  SUSPENDED: 'warning',
  BANNED: 'destructive',
};

export function SellerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const sellerId = String(id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['seller-detail', sellerId],
    queryFn: () => sellerApi.getSeller(sellerId),
    enabled: !!sellerId,
  });

  const seller = data?.seller;

  // Mutations
  const approveMutation = useMutation({
    mutationFn: () => sellerApi.approveSeller(sellerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-detail', sellerId] });
      showToast('Seller approved successfully.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => sellerApi.rejectSeller(sellerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-detail', sellerId] });
      showToast('Seller rejected.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const banMutation = useMutation({
    mutationFn: (reason: string) => sellerApi.banSeller(sellerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-detail', sellerId] });
      showToast('Seller banned.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const unbanMutation = useMutation({
    mutationFn: () => sellerApi.unbanSeller(sellerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-detail', sellerId] });
      showToast('Seller unbanned.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => sellerApi.suspendSeller(sellerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-detail', sellerId] });
      showToast('Seller suspended.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const restoreMutation = useMutation({
    mutationFn: () => sellerApi.restoreSeller(sellerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-detail', sellerId] });
      showToast('Seller status restored.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const activateMutation = useMutation({
    mutationFn: () => sellerApi.activateSeller(sellerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-detail', sellerId] });
      showToast('Seller activated.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => sellerApi.deactivateSeller(sellerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-detail', sellerId] });
      showToast('Seller deactivated.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => sellerApi.deleteSeller(sellerId),
    onSuccess: () => {
      showToast('Seller soft-deleted successfully.', 'info');
      router.push('/sellers');
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

  if (isError || !seller) {
    return (
      <div className="text-center py-16 space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Seller Profile Not Found</h3>
        <Button variant="outline" size="sm" onClick={() => router.push('/sellers')}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const isSuspendedOrBanned = seller.status === 'SUSPENDED' || seller.status === 'BANNED' || seller.isBanned;

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/sellers')}
            className="p-2 rounded-xl glass hover:bg-white/[0.05] border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white/95">
                {seller.firstName} {seller.lastName}
              </h1>
              <Badge variant={STATUS_COLORS[seller.status] ?? 'outline'} className="text-[9px] px-2 py-0.5 font-bold">
                {seller.status === 'PENDING_VERIFICATION' ? 'DRAFT' : seller.status}
              </Badge>
              {seller.isBanned && (
                <Badge variant="destructive" className="text-[9px] px-2 py-0.5 font-bold">
                  BANNED
                </Badge>
              )}
            </div>
            <p className="text-xs text-white/45 mt-1">Username: @{seller.username} • ID: {seller.id}</p>
          </div>
        </div>

        {/* Administration Actions Panel */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Action Approve / Reject */}
          {seller.status === 'PENDING_APPROVAL' && (
            <>
              <Button
                size="sm"
                variant="default"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 text-xs"
                isLoading={approveMutation.isPending}
                onClick={() => approveMutation.mutate()}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 text-xs"
                isLoading={rejectMutation.isPending}
                onClick={() => {
                  showConfirm({
                    title: 'Reject Seller Profile',
                    message: 'Please confirm that you want to reject this seller. This action will deactivate their store setup.',
                    confirmText: 'Reject',
                    onConfirm: () => rejectMutation.mutate('Does not meet onboarding criteria'),
                  });
                }}
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
              </Button>
            </>
          )}

          {/* Action Suspend / Ban / Restore */}
          {seller.status === 'APPROVED' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                className="h-9 text-xs border border-orange-500/20 text-orange-400 hover:bg-orange-500/10"
                isLoading={suspendMutation.isPending}
                onClick={() => {
                  showConfirm({
                    title: 'Suspend Seller',
                    message: 'Are you sure you want to suspend this seller? Their shop will be deactivated.',
                    confirmText: 'Suspend',
                    onConfirm: () => suspendMutation.mutate('Suspended due to policy check'),
                  });
                }}
              >
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Suspend
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="h-9 text-xs"
                isLoading={banMutation.isPending}
                onClick={() => {
                  showConfirm({
                    title: 'Ban Seller',
                    message: 'CRITICAL: Banning this seller will also automatically ban and hide all shops and products linked to them. The seller status becomes BANNED.',
                    confirmText: 'Ban Seller',
                    onConfirm: () => banMutation.mutate('Violations of platform standards'),
                  });
                }}
              >
                <ShieldOff className="h-3.5 w-3.5 mr-1.5" /> Ban Seller
              </Button>
            </>
          )}

          {/* Restore / Unban */}
          {isSuspendedOrBanned && (
            <Button
              size="sm"
              variant="default"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 text-xs"
              isLoading={restoreMutation.isPending || unbanMutation.isPending}
              onClick={() => {
                showConfirm({
                  title: 'Restore Seller Status',
                  message: 'Are you sure you want to restore this seller and unban/activate their shop?',
                  confirmText: 'Restore',
                  onConfirm: () => restoreMutation.mutate(),
                });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore & Unban
            </Button>
          )}

          {/* Toggle Activate / Deactivate */}
          {seller.status === 'APPROVED' && (
            <>
              {seller.isDeactivated ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"
                  isLoading={activateMutation.isPending}
                  onClick={() => activateMutation.mutate()}
                >
                  <ToggleLeft className="h-4 w-4 mr-1.5" /> Activate
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs text-white/50 border-white/5 hover:bg-white/[0.04]"
                  isLoading={deactivateMutation.isPending}
                  onClick={() => {
                    showConfirm({
                      title: 'Deactivate Seller',
                      message: 'Deactivating will hide their shop listing but will not ban the seller. Proceed?',
                      confirmText: 'Deactivate',
                      onConfirm: () => deactivateMutation.mutate(),
                    });
                  }}
                >
                  <ToggleRight className="h-4 w-4 mr-1.5" /> Deactivate
                </Button>
              )}
            </>
          )}

          {/* Delete Seller */}
          <Button
            size="sm"
            variant="destructive"
            className="h-9 text-xs bg-red-950/20 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 text-red-400"
            isLoading={deleteMutation.isPending}
            onClick={() => {
              showConfirm({
                title: 'Delete Seller Account',
                message: 'WARNING: This will soft-delete/deactivate this seller profile permanently. This action cannot be easily undone.',
                confirmText: 'Delete Seller',
                onConfirm: () => deleteMutation.mutate(),
              });
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Seller
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Core Info, Store Link, Addresses */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Linked Shop Status */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-white/95">Linked Shop Status</CardTitle>
                <CardDescription>Store settings and marketplace visibility</CardDescription>
              </div>
              <Store className="h-4.5 w-4.5 text-white/45" />
            </CardHeader>
            <CardContent className="pt-5">
              {seller.shop ? (
                <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] glass-hover cursor-pointer" onClick={() => router.push(`/shops/${seller.shop.id}`)}>
                  <div>
                    <h4 className="text-xs font-bold text-white">{seller.shop.name}</h4>
                    <p className="text-[10px] text-white/40 mt-0.5">Slug: {seller.shop.slug || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={seller.shop.isActive ? 'success' : 'secondary'} className="text-[8px]">
                      {seller.shop.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {seller.shop.isBanned && (
                      <Badge variant="destructive" className="text-[8px]">
                        Banned
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-white/30 italic">
                  No shop has been initialized for this seller.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Seller Verifications History */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-xs font-bold text-white/95">Verifications & KYC</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {seller.verifications?.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {seller.verifications.map((v: any) => (
                    <div key={v.id} className="p-4 flex items-center justify-between text-xs">
                      <div>
                        {v.gstRegistered === false ? (
                          <p className="font-bold text-yellow-400">Seller has declared GST registration is not applicable.</p>
                        ) : (
                          <p className="font-bold text-white/90">GSTIN: {v.gstNumber || '—'}</p>
                        )}
                        <p className="text-[10px] text-white/40 mt-0.5">Submitted: {new Date(v.createdAt).toLocaleString()}</p>
                        {v.rejectionReason && (
                          <p className="text-[10px] text-red-400 mt-1">Rejection Reason: {v.rejectionReason}</p>
                        )}
                      </div>
                      <Badge variant={STATUS_COLORS[v.status] ?? 'outline'} className="text-[8px]">
                        {v.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-white/30 italic">No KYC submissions found.</div>
              )}
            </CardContent>
          </Card>

          {/* Operational Addresses */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-xs font-bold text-white/95">Addresses</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {seller.addresses?.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {seller.addresses.map((addr: any) => (
                    <div key={addr.id} className="p-4 flex gap-3 text-xs">
                      <MapPin className="h-4.5 w-4.5 text-white/30 shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{addr.contactName}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 text-white/50 uppercase tracking-wider">{addr.label || 'Pickup'}</span>
                        </div>
                        <p className="text-white/60 mt-1">{addr.addressLine1}, {addr.addressLine2 ? `${addr.addressLine2}, ` : ''}{addr.city}, {addr.state} - {addr.postalCode}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">Phone: {addr.phone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-white/30 italic">No addresses saved.</div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column: Bank Accounts, Striking Records */}
        <div className="space-y-6">
          
          {/* Profile Overview */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-xs font-bold text-white/95">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5 text-xs">
              <div className="flex justify-between">
                <span className="text-white/40">Email:</span>
                <span className="text-white/90 font-medium select-all">{seller.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">Joined:</span>
                <span className="text-white/80">{new Date(seller.createdAt).toLocaleDateString()}</span>
              </div>
              {seller.banReason && (
                <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-red-400 block uppercase">Ban Reason</span>
                  <span className="text-white/70 text-[11px] block">{seller.banReason}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Accounts */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-white/95">Bank Accounts</CardTitle>
              <CreditCard className="h-4 w-4 text-white/45" />
            </CardHeader>
            <CardContent className="p-0">
              {seller.bankAccounts?.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {seller.bankAccounts.map((acct: any) => (
                    <div key={acct.id} className="p-4 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-white/40">Holder:</span>
                        <span className="text-white/90 font-bold">{acct.accountHolderName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Account No:</span>
                        <span className="text-white/80 font-medium">{acct.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">IFSC Code:</span>
                        <span className="text-white/80 font-medium uppercase">{acct.ifscCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/40">Bank:</span>
                        <span className="text-white/80">{acct.bankName || '—'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-white/30 italic">No bank accounts linked.</div>
              )}
            </CardContent>
          </Card>

          {/* Strikes Ledger */}
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-white/95">Policy Strikes</CardTitle>
              <ShieldAlert className="h-4.5 w-4.5 text-white/45" />
            </CardHeader>
            <CardContent className="p-0">
              {seller.strikes?.length > 0 ? (
                <div className="divide-y divide-white/5">
                  {seller.strikes.map((s: any) => (
                    <div key={s.id} className="p-4 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white/85">Strike #{s.id.slice(-4)}</span>
                        <span className="text-[10px] text-white/40">{new Date(s.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-white/60">{s.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-xs text-white/30 italic">Clean record (0 strikes).</div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
