"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Dialog } from '@/shared/components/Dialog';
import { useUIStore } from '@/lib/store/uiStore';
import { 
  Store, User, MapPin, ShieldAlert, CheckCircle2, XCircle, ShieldOff, 
  Trash2, ArrowLeft, RotateCcw, AlertTriangle, Box, FileCheck, Clock,
  FileText, Shield, ExternalLink, Calendar, Check, Send, AlertCircle, Eye
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { ReasonModal } from '@/shared/components/ReasonModal';

export function ShopDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const shopId = String(id);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'documents' | 'agreements' | 'audit'>('overview');

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

  // Issue Agreement Dialog State
  const [isAgreementModalOpen, setIsAgreementModalOpen] = useState(false);
  const [agreementForm, setAgreementForm] = useState({
    title: 'Standard Marketplace Merchant Participation Agreement',
    version: '1.0',
    commissionPercentage: 10.0,
    commercialTerms: 'Gross sale value fee: Net 7-day settlement post customer acceptance window.',
    deliveryFulfilmentTerms: 'Orders must be acknowledged and packaged within 24 hours of placement. Standard platform delivery protocol applies.',
    otherObligations: 'Merchant guarantees 100% authentic inventory. Strict zero tolerance for counterfeit or expired goods.',
    content: '',
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['shop-detail', shopId],
    queryFn: () => shopApi.getShop(shopId),
    enabled: !!shopId,
  });

  const shop = data?.shop;
  const auditEvents = data?.auditEvents || [];

  // Find latest approval request and latest agreement
  const latestApprovalRequest = shop?.approvalRequests?.[0];
  const latestAgreement = shop?.agreements?.[0];
  const isAgreementAccepted = latestAgreement?.status === 'ACCEPTED';
  const canApprove = isAgreementAccepted || shop?.status === 'APPROVED';

  const [configComm, setConfigComm] = useState('10.0');
  const [configCommNotes, setConfigCommNotes] = useState('');
  const [isSavingComm, setIsSavingComm] = useState(false);

  useEffect(() => {
    if (shop) {
      setConfigComm(String(shop.commissionPercentage ?? '10.0'));
      setConfigCommNotes(shop.commissionNotes ?? '');

      const currentVersion = shop.agreements?.[0]?.version;
      const nextVersion = currentVersion ? (parseFloat(currentVersion) + 0.1).toFixed(1) : '1.0';

      const defaultTemplate = `MARKETPLACE MERCHANT PARTICIPATION AGREEMENT

This Agreement is entered into by and between Marketplace Platform Operations ("Marketplace") and ${shop.name} ("Merchant"), represented by ${shop.seller?.firstName || 'Seller'} ${shop.seller?.lastName || ''}.

1. APPOINTMENT & STOREFRONT AUTHORIZATION
The Marketplace hereby authorizes the Merchant to operate a digital storefront under the business moniker "${shop.name}".

2. COMMERCIAL TERMS & COMMISSION STRUCTURE
- Applicable Platform Commission: ${shop.commissionPercentage || 10.0}% of gross merchandise transaction value.
- Payment Cycle: Net 7 days post order completion and delivery verification.
- Taxes: Applicable GST/VAT will be deducted or billed in accordance with prevailing statutory laws.

3. LOGISTICS, PACKING & FULFILMENT OBLIGATIONS
- Order SLA: Handover packages within 24 hours of notification.
- Packing Integrity: Maintain secure, branded or neutral packaging per marketplace standards.

4. SELLER WARRANTIES & LEGAL COMPLIANCE
- Merchant warrants that all listed items are authentic, genuine, compliant, and fit for commerce.
- Zero tolerance policy for counterfeit or misrepresented items.

5. TERM, GOVERNING LAW & MODIFICATION
This agreement becomes legally binding upon digital acceptance by the authorized Merchant representative.`;

      setAgreementForm((prev) => ({
        ...prev,
        version: nextVersion,
        commissionPercentage: Number(shop.commissionPercentage ?? 10.0),
        content: defaultTemplate,
      }));
    }
  }, [shop]);

  const handleCommissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const comm = parseFloat(configComm);
    if (isNaN(comm) || comm < 0 || comm > 100) {
      showToast('Commission must be a percentage between 0 and 100.', 'error');
      return;
    }

    try {
      setIsSavingComm(true);
      await shopApi.updateShopConfig(shopId, {
        commissionPercentage: comm,
        commissionNotes: configCommNotes,
      });
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      showToast('Shop commission updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update shop commission.', 'error');
    } finally {
      setIsSavingComm(false);
    }
  };

  // Mutations
  const issueAgreementMutation = useMutation({
    mutationFn: () => shopApi.issueAgreement(shopId, agreementForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      setIsAgreementModalOpen(false);
      showToast('Shop agreement issued successfully and sent to seller.', 'success');
    },
    onError: (e: any) => showToast(e.message || 'Failed to issue agreement', 'error'),
  });

  const approveMutation = useMutation({
    mutationFn: () => shopApi.approveShop(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      showToast('Shop approved and activated successfully.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => shopApi.rejectShop(shopId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      showToast('Shop registration rejected.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const suspendMutation = useMutation({
    mutationFn: (reason: string) => shopApi.suspendShop(shopId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      showToast('Shop suspended.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const disableMutation = useMutation({
    mutationFn: (reason: string) => shopApi.disableShop(shopId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-detail', shopId] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      showToast('Shop disabled.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (reason: string) => shopApi.deleteShop(shopId, reason),
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

  const preparedProducts = shop.seller?.products || [];
  const verifications = shop.seller?.verifications || [];

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
              <Badge 
                variant={
                  shop.status === 'APPROVED' ? 'success' : 
                  shop.status === 'PENDING' ? 'warning' : 
                  shop.status === 'REJECTED' ? 'destructive' : 
                  shop.status === 'SUSPENDED' ? 'warning' : 'destructive'
                } 
                className="text-[9px] px-2 py-0.5 font-bold"
              >
                {shop.status}
              </Badge>
              {latestApprovalRequest && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                  {latestApprovalRequest.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-white/45 mt-1">Slug: /shops/{shop.slug} • ID: {shop.id}</p>
          </div>
        </div>

        {/* Administration Actions Panel */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Issue Agreement Action */}
          {shop.status === 'PENDING' && (
            <Button
              size="sm"
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 text-xs shadow-sm"
              onClick={() => setIsAgreementModalOpen(true)}
            >
              <FileCheck className="h-3.5 w-3.5 mr-1.5" /> 
              {latestAgreement ? 'Re-Issue Agreement' : 'Issue Shop Agreement'}
            </Button>
          )}

          {/* Approve Action */}
          {shop.status === 'PENDING' && (
            <div className="relative group">
              <Button 
                size="sm" 
                variant="default" 
                className={`font-bold h-9 text-xs transition-all ${
                  canApprove 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white' 
                    : 'bg-white/10 text-white/40 cursor-not-allowed hover:bg-white/10'
                }`}
                disabled={!canApprove}
                isLoading={approveMutation.isPending} 
                onClick={() => approveMutation.mutate()}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Complete Review & Approve
              </Button>
              {!canApprove && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2 rounded-xl bg-black/90 border border-white/15 text-[10px] text-white/80 text-center shadow-xl z-30 pointer-events-none">
                  Seller agreement must be issued and accepted before final shop approval.
                </div>
              )}
            </div>
          )}

          {/* Reject */}
          {shop.status === 'PENDING' && (
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-9 text-xs" 
              isLoading={rejectMutation.isPending} 
              onClick={() => {
                setModalConfig({
                  isOpen: true,
                  title: 'Reject Shop Registration',
                  description: `Are you sure you want to reject the shop registration for "${shop.name}"?`,
                  action: 'Reject',
                  target: shop.name,
                  onConfirm: (reason) => rejectMutation.mutate(reason),
                });
              }}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
            </Button>
          )}

          {/* Suspend / Disable for Approved */}
          {shop.status === 'APPROVED' && (
            <>
              <Button size="sm" variant="secondary" className="h-9 text-xs border border-orange-500/20 text-orange-400 hover:bg-orange-500/10" isLoading={suspendMutation.isPending} onClick={() => {
                setModalConfig({
                  isOpen: true,
                  title: 'Suspend Shop Storefront',
                  description: `Are you sure you want to suspend "${shop.name}"? They will not be able to receive new orders.`,
                  action: 'Suspend',
                  target: shop.name,
                  onConfirm: (reason) => suspendMutation.mutate(reason),
                });
              }}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" /> Suspend
              </Button>
              <Button size="sm" variant="destructive" className="h-9 text-xs" isLoading={disableMutation.isPending} onClick={() => {
                setModalConfig({
                  isOpen: true,
                  title: 'Disable Shop Storefront',
                  description: `Are you sure you want to permanently disable "${shop.name}"? This action disables storefront access and catalog listings.`,
                  action: 'Disable',
                  target: shop.name,
                  onConfirm: (reason) => disableMutation.mutate(reason),
                });
              }}>
                <ShieldOff className="h-3.5 w-3.5 mr-1.5" /> Disable
              </Button>
            </>
          )}

          {/* Delete Shop */}
          <Button
            size="sm"
            variant="destructive"
            className="h-9 text-xs bg-red-950/20 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 text-red-400"
            isLoading={deleteMutation.isPending}
            onClick={() => {
              setModalConfig({
                isOpen: true,
                title: 'Delete Shop Permanently',
                description: 'CRITICAL: This will permanently delete the shop profile and default pickup settings. This cannot be undone.',
                action: 'Delete',
                target: shop.name,
                onConfirm: (reason) => deleteMutation.mutate(reason),
              });
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* Lifecycle Onboarding Progress Bar */}
      <Card className="border border-white/5 bg-gradient-to-r from-white/[0.02] via-white/[0.01] to-transparent p-5">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 text-xs">
          <div className="flex items-center gap-3 min-w-max">
            <div className="h-7 w-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-bold text-xs">
              1
            </div>
            <div>
              <p className="font-bold text-white text-xs">Shop Created</p>
              <p className="text-[10px] text-white/40">Request submitted</p>
            </div>
          </div>
          <div className="h-[1px] w-8 bg-white/10 shrink-0" />

          <div className="flex items-center gap-3 min-w-max">
            <div className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold text-xs ${
              latestAgreement ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
            }`}>
              2
            </div>
            <div>
              <p className="font-bold text-white text-xs">Admin Review & Terms</p>
              <p className="text-[10px] text-white/40">Review catalog & docs</p>
            </div>
          </div>
          <div className="h-[1px] w-8 bg-white/10 shrink-0" />

          <div className="flex items-center gap-3 min-w-max">
            <div className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold text-xs ${
              isAgreementAccepted ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : latestAgreement ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-white/5 border-white/10 text-white/30'
            }`}>
              3
            </div>
            <div>
              <p className="font-bold text-white text-xs">Agreement Issued</p>
              <p className="text-[10px] text-white/40">
                {latestAgreement ? `v${latestAgreement.version} (${latestAgreement.status})` : 'Pending issuance'}
              </p>
            </div>
          </div>
          <div className="h-[1px] w-8 bg-white/10 shrink-0" />

          <div className="flex items-center gap-3 min-w-max">
            <div className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold text-xs ${
              isAgreementAccepted ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-white/30'
            }`}>
              4
            </div>
            <div>
              <p className="font-bold text-white text-xs">Seller Accepted</p>
              <p className="text-[10px] text-white/40">
                {isAgreementAccepted ? 'Acceptance verified' : 'Awaiting seller signature'}
              </p>
            </div>
          </div>
          <div className="h-[1px] w-8 bg-white/10 shrink-0" />

          <div className="flex items-center gap-3 min-w-max">
            <div className={`h-7 w-7 rounded-full border flex items-center justify-center font-bold text-xs ${
              shop.status === 'APPROVED' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/5 border-white/10 text-white/30'
            }`}>
              5
            </div>
            <div>
              <p className="font-bold text-white text-xs">Final Approval</p>
              <p className="text-[10px] text-white/40">
                {shop.status === 'APPROVED' ? 'Publicly active' : 'Awaiting signoff'}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/50 hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          Shop Overview
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'products'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/50 hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          <span>Prepared Products</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/80">
            {preparedProducts.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'documents'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/50 hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          <span>Verification & Documents</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-white/80">
            {verifications.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('agreements')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'agreements'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/50 hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          <span>Shop Agreements</span>
          {shop.agreements?.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300">
              {shop.agreements.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/50 hover:text-white hover:bg-white/[0.03]'
          }`}
        >
          Timeline & Audit
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-white/5 bg-white/[0.01]">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xs font-bold text-white/95">Shop Description & Mission</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 text-xs text-white/70 leading-relaxed whitespace-pre-wrap">
                {shop.description || 'No description provided by the seller.'}
              </CardContent>
            </Card>

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
                      <p className="text-[10px] text-white/40 mt-1">Contact Phone: {shop.defaultPickupAddress.contactPhone || '—'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-white/30 italic">No default pickup address configured.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border border-white/5 bg-white/[0.01]">
              <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-white/95">Associated Seller</CardTitle>
                  <CardDescription>Click to inspect seller account</CardDescription>
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
                    <div className="flex gap-2 mt-2">
                      <Badge variant={shop.seller.isBanned ? 'destructive' : 'outline'} className="text-[8px]">
                        Account: {shop.seller.status}
                      </Badge>
                      <Badge variant="outline" className="text-[8px]">
                        ID: {shop.seller.id.slice(0, 8)}...
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs text-white/30 italic">No seller associated.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-white/5 bg-white/[0.01]">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xs font-bold text-white/95">Metadata & Operational Settings</CardTitle>
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
                  <span className="text-white/40">Delivery Mode:</span>
                  <span className="text-white/90 font-bold">
                    {shop.deliveryMode === 'SELF' ? 'Self Delivery' : 'Platform Delivery'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Commission Rate:</span>
                  <span className="text-purple-400 font-bold">{shop.commissionPercentage ?? 10}%</span>
                </div>
                {shop.rejectionReason && (
                  <div className="p-3 border border-red-500/20 bg-red-500/5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold text-red-400 block uppercase">Rejection Reason</span>
                    <span className="text-white/70 text-[11px] block">{shop.rejectionReason}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-white/5 bg-white/[0.01]">
              <CardHeader className="border-b border-white/5">
                <CardTitle className="text-xs font-bold text-white/95">Shop Commission Setting</CardTitle>
                <CardDescription>Adjust commission rate and notes</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-5">
                <form onSubmit={handleCommissionSubmit} className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-white/50 block font-bold">Commission Amount (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={configComm}
                      onChange={(e) => setConfigComm(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-purple-500 transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-white/50 block font-bold">Commission Notes (Optional)</label>
                    <textarea
                      placeholder="e.g. Special agreed rate"
                      rows={2}
                      value={configCommNotes}
                      onChange={(e) => setConfigCommNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-purple-500 transition-all font-semibold resize-none"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full h-9 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                    isLoading={isSavingComm}
                  >
                    Save Commission
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: PREPARED PRODUCTS */}
      {activeTab === 'products' && (
        <Card className="border border-white/5 bg-white/[0.01]">
          <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xs font-bold text-white/95">
                Pre-Approval Catalog ({preparedProducts.length} Products)
              </CardTitle>
              <CardDescription>
                Products prepared by the seller prior to approval. These remain hidden from customer search and checkout until shop approval.
              </CardDescription>
            </div>
            <Box className="h-4.5 w-4.5 text-white/40" />
          </CardHeader>
          <CardContent className="p-0">
            {preparedProducts.length === 0 ? (
              <div className="text-center py-12 text-white/30 text-xs">
                No products prepared yet by this seller.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Stock</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Moderation</th>
                      <th className="py-3 px-4">Public Visibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {preparedProducts.map((p: any) => (
                      <tr key={p.id} className="hover:bg-white/[0.01]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                              {p.images?.[0] ? (
                                <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                              ) : (
                                <Box className="h-4 w-4 text-white/20" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate max-w-xs">{p.name}</p>
                              <p className="text-[10px] text-white/40 mt-0.5">SKU: {p.sku || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-bold text-white/90">
                          ₹{p.price}
                        </td>
                        <td className="py-3 px-4 text-white/70">
                          {p.stock} units
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/80">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge 
                            variant={p.moderationStatus === 'APPROVED' ? 'success' : p.moderationStatus === 'REJECTED' ? 'destructive' : 'warning'}
                            className="text-[9px]"
                          >
                            {p.moderationStatus || 'PENDING'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] font-semibold text-amber-400/90 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {shop.status === 'APPROVED' ? 'Eligible for store' : 'Blocked (Shop Pending)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: VERIFICATION & DOCUMENTS */}
      {activeTab === 'documents' && (
        <Card className="border border-white/5 bg-white/[0.01]">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-xs font-bold text-white/95">Seller Supporting Verification Documents</CardTitle>
            <CardDescription>Submitted KYC, GST, business registration, or identity documents</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {verifications.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-xs">
                No verification documents submitted yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {verifications.map((v: any) => (
                  <div key={v.id} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-white/50" />
                        <span className="text-xs font-bold text-white">{v.documentType || 'Verification Doc'}</span>
                      </div>
                      <Badge variant={v.status === 'APPROVED' ? 'success' : v.status === 'PENDING' ? 'warning' : 'destructive'} className="text-[9px]">
                        {v.status}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-white/60 space-y-1">
                      <p>Doc Number: <span className="text-white font-mono">{v.documentNumber || '—'}</span></p>
                      <p>Submitted: <span className="text-white/80">{new Date(v.createdAt).toLocaleDateString()}</span></p>
                      {v.notes && <p className="italic text-white/40">"{v.notes}"</p>}
                    </div>
                    {v.documentUrl && (
                      <a 
                        href={v.documentUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View Submitted Document
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: SHOP AGREEMENTS */}
      {activeTab === 'agreements' && (
        <div className="space-y-6">
          <Card className="border border-white/5 bg-white/[0.01]">
            <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold text-white/95">Shop-Specific Agreements & Legal Proof</CardTitle>
                <CardDescription>Individually issued agreements for this storefront approval</CardDescription>
              </div>
              {shop.status === 'PENDING' && (
                <Button
                  size="sm"
                  variant="default"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-8 text-xs"
                  onClick={() => setIsAgreementModalOpen(true)}
                >
                  <FileCheck className="h-3.5 w-3.5 mr-1" /> Issue New Version
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4">
              {!shop.agreements || shop.agreements.length === 0 ? (
                <div className="text-center py-10 space-y-3">
                  <FileText className="h-8 w-8 text-white/20 mx-auto" />
                  <p className="text-xs font-semibold text-white/70">No agreement has been issued yet for this shop.</p>
                  <p className="text-[11px] text-white/40 max-w-sm mx-auto">
                    Before approving this shop, you must issue a shop-specific seller agreement configuring commercial terms and commission.
                  </p>
                  <Button
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold mt-2"
                    onClick={() => setIsAgreementModalOpen(true)}
                  >
                    Issue Shop Agreement Now
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {shop.agreements.map((agr: any) => (
                    <div 
                      key={agr.id} 
                      className={`p-4 rounded-xl border transition-all ${
                        agr.status === 'ACCEPTED'
                          ? 'border-emerald-500/30 bg-emerald-500/[0.02]'
                          : agr.status === 'ISSUED'
                          ? 'border-blue-500/30 bg-blue-500/[0.02]'
                          : 'border-white/5 bg-white/[0.01]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4.5 w-4.5 text-indigo-400" />
                          <div>
                            <span className="text-xs font-bold text-white block">{agr.title} (v{agr.version})</span>
                            <span className="text-[10px] text-white/40">ID: {agr.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              agr.status === 'ACCEPTED' ? 'success' :
                              agr.status === 'ISSUED' ? 'warning' :
                              agr.status === 'DECLINED' ? 'destructive' : 'outline'
                            }
                            className="text-[9px]"
                          >
                            {agr.status}
                          </Badge>
                          <span className="text-[10px] text-white/50">
                            Issued by: {agr.issuedByAdmin ? `${agr.issuedByAdmin.firstName} ${agr.issuedByAdmin.lastName}` : 'Admin'}
                          </span>
                        </div>
                      </div>

                      {/* Commercial Snapshot */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                          <span className="text-[10px] text-white/40 block font-semibold uppercase">Commission Rate</span>
                          <span className="text-white font-bold text-sm text-purple-400">{agr.commissionPercentage}%</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                          <span className="text-[10px] text-white/40 block font-semibold uppercase">Effective Date</span>
                          <span className="text-white font-medium">{agr.effectiveDate ? new Date(agr.effectiveDate).toLocaleDateString() : 'Upon Acceptance'}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
                          <span className="text-[10px] text-white/40 block font-semibold uppercase">Issued Timestamp</span>
                          <span className="text-white font-medium">{new Date(agr.publishedAt || agr.createdAt).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Acceptance Certificate (if accepted) */}
                      {agr.status === 'ACCEPTED' && (
                        <div className="mt-3 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-2">
                          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                            <Check className="h-4 w-4" />
                            <span>DIGITAL ACCEPTANCE CERTIFICATE</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
                            <div>
                              <span className="text-white/40 block">Signed Legal Name:</span>
                              <span className="text-white font-bold">{agr.acceptedByName || 'Seller'}</span>
                            </div>
                            <div>
                              <span className="text-white/40 block">Acceptance Timestamp:</span>
                              <span className="text-white font-medium">{agr.acceptedAt ? new Date(agr.acceptedAt).toLocaleString() : '—'}</span>
                            </div>
                            <div>
                              <span className="text-white/40 block">Signer IP Address:</span>
                              <span className="text-white font-mono">{agr.acceptedIp || 'Verified Web'}</span>
                            </div>
                            <div>
                              <span className="text-white/40 block">Document Hash (SHA-256):</span>
                              <span className="text-white font-mono truncate block" title={agr.documentHash}>
                                {agr.documentHash ? agr.documentHash.slice(0, 16) + '...' : '—'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Content Preview */}
                      <details className="mt-3 text-xs">
                        <summary className="text-[11px] font-bold text-white/60 hover:text-white cursor-pointer select-none">
                          View Agreement Document Text
                        </summary>
                        <div className="mt-2 p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] font-mono text-white/70 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                          {agr.content}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: AUDIT & TIMELINE */}
      {activeTab === 'audit' && (
        <Card className="border border-white/5 bg-white/[0.01]">
          <CardHeader className="border-b border-white/5">
            <CardTitle className="text-xs font-bold text-white/95">Approval Requests & Audit Trail</CardTitle>
            <CardDescription>Chronological events, approval transitions, and administrator actions</CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {shop.approvalRequests && shop.approvalRequests.length > 0 && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                  Approval Requests
                </span>
                {shop.approvalRequests.map((req: any) => (
                  <div key={req.id} className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-white block">Status: {req.status}</span>
                      <span className="text-[10px] text-white/40">
                        Submitted: {new Date(req.createdAt).toLocaleString()}
                        {req.reviewedByAdmin && ` • Reviewed by: ${req.reviewedByAdmin.firstName} ${req.reviewedByAdmin.lastName}`}
                      </span>
                    </div>
                    {req.decisionNotes && (
                      <span className="text-xs text-white/60 italic max-w-xs truncate">
                        "{req.decisionNotes}"
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {auditEvents.length > 0 && (
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 block">
                  Admin Audit Logs
                </span>
                {auditEvents.map((evt: any) => (
                  <div key={evt.id} className="p-2.5 rounded-lg border border-white/5 bg-white/[0.01] text-[11px] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white/90">{evt.actionType}</span>
                      <span className="text-white/40 ml-2">by {evt.admin ? `${evt.admin.firstName} ${evt.admin.lastName}` : 'Admin'}</span>
                    </div>
                    <span className="text-[10px] text-white/35 font-mono">
                      {new Date(evt.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ISSUE AGREEMENT DIALOG */}
      <Dialog
        isOpen={isAgreementModalOpen}
        onClose={() => setIsAgreementModalOpen(false)}
        title="Issue Shop-Specific Seller Agreement"
        description={`Customize and issue commercial terms for ${shop.name}`}
        maxWidth="max-w-[700px]"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-white/60 font-bold block">Agreement Title</label>
              <input
                type="text"
                value={agreementForm.title}
                onChange={(e) => setAgreementForm({ ...agreementForm, title: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="text-white/60 font-bold block">Version</label>
              <input
                type="text"
                value={agreementForm.version}
                onChange={(e) => setAgreementForm({ ...agreementForm, version: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-white/60 font-bold block">Commission Percentage (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={agreementForm.commissionPercentage}
                onChange={(e) => setAgreementForm({ ...agreementForm, commissionPercentage: parseFloat(e.target.value) || 0 })}
                className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-indigo-500 font-bold text-purple-400"
              />
            </div>
            <div className="space-y-1">
              <label className="text-white/60 font-bold block">Fulfilment & Delivery Terms</label>
              <input
                type="text"
                value={agreementForm.deliveryFulfilmentTerms}
                onChange={(e) => setAgreementForm({ ...agreementForm, deliveryFulfilmentTerms: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-indigo-500 font-medium"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-white/60 font-bold block">Commercial Terms & Settlement</label>
            <textarea
              rows={2}
              value={agreementForm.commercialTerms}
              onChange={(e) => setAgreementForm({ ...agreementForm, commercialTerms: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-indigo-500 font-medium resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-white/60 font-bold block">Merchant Obligations & Quality Assurances</label>
            <textarea
              rows={2}
              value={agreementForm.otherObligations}
              onChange={(e) => setAgreementForm({ ...agreementForm, otherObligations: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-indigo-500 font-medium resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-white/60 font-bold block">Full Published Agreement Text (Immutable Snapshot)</label>
            <textarea
              rows={6}
              value={agreementForm.content}
              onChange={(e) => setAgreementForm({ ...agreementForm, content: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/[0.02] text-white focus:outline-none focus:border-indigo-500 font-mono text-[11px] leading-relaxed resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAgreementModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              isLoading={issueAgreementMutation.isPending}
              onClick={() => issueAgreementMutation.mutate()}
            >
              <Send className="h-3.5 w-3.5 mr-1.5" /> Publish & Send to Seller
            </Button>
          </div>
        </div>
      </Dialog>

      <ReasonModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        description={modalConfig.description}
        action={modalConfig.action}
        target={modalConfig.target}
        onConfirm={(reason) => {
          modalConfig.onConfirm(reason);
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        isLoading={rejectMutation.isPending || suspendMutation.isPending || disableMutation.isPending || deleteMutation.isPending}
      />
    </div>
  );
}
