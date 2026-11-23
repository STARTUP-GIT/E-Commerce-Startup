"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import {
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Eye,
  RefreshCw,
  Clock,
  Ban,
  ShieldCheck,
  Tag,
  Store,
  Layers
} from 'lucide-react';
import { Dialog } from '@/shared/components/Dialog';
import { ReasonModal } from '@/shared/components/ReasonModal';

export function PackingFeeRequestsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  const [rejectModalConfig, setRejectModalConfig] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    shopName: string;
    isChangeRequest?: boolean;
  }>({
    isOpen: false,
    id: '',
    name: '',
    shopName: '',
    isChangeRequest: false
  });

  const [confirmApprove, setConfirmApprove] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    price: number;
    shopName: string;
  } | null>(null);

  const [confirmSuspend, setConfirmSuspend] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    shopName: string;
  } | null>(null);

  // Fetch packaging options
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-packaging-options', activeTab, searchTerm, page],
    queryFn: () =>
      shopApi.getPackagingOptions({
        status: activeTab === 'ALL' ? undefined : activeTab,
        search: searchTerm.trim() || undefined,
        page,
        limit: 20
      }),
    staleTime: 10 * 1000
  });

  const packagingList = data?.packagingOptions ?? [];
  const counts = data?.counts ?? { pending: 0, approved: 0, rejected: 0, total: 0 };
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 };

  // Mutations
  const approveMutation = useMutation({
    mutationFn: (id: string) => shopApi.approvePackagingOption(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-packaging-options'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      showToast(res.message || 'Packaging option approved successfully.', 'success');
      setConfirmApprove(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Failed to approve packaging option.', 'error');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      shopApi.rejectPackagingOption(id, reason),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-packaging-options'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      showToast(res.message || 'Packaging option rejected.', 'success');
      setRejectModalConfig(prev => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Failed to reject packaging option.', 'error');
    }
  });

  const requestChangesMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      shopApi.requestChangesPackagingOption(id, reason),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-packaging-options'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      showToast(res.message || 'Changes requested from seller.', 'success');
      setRejectModalConfig(prev => ({ ...prev, isOpen: false }));
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Failed to request changes.', 'error');
    }
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => shopApi.suspendPackagingOption(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-packaging-options'] });
      queryClient.invalidateQueries({ queryKey: ['admin-sidebar-badges'] });
      showToast(res.message || 'Packaging option suspended.', 'success');
      setConfirmSuspend(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || 'Failed to suspend packaging option.', 'error');
    }
  });

  const getStatusBadge = (status: string, isActive: boolean) => {
    switch (status) {
      case 'APPROVED':
        return (
          <div className="flex items-center gap-1.5">
            <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle className="w-3 h-3 mr-1" /> Approved
            </Badge>
            {!isActive && (
              <Badge variant="secondary" className="bg-white/10 text-white/50 border border-white/10">
                Inactive
              </Badge>
            )}
          </div>
        );
      case 'PENDING':
        return (
          <Badge variant="warning" className="bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
            <Clock className="w-3 h-3 mr-1" /> Pending Review
          </Badge>
        );
      case 'CHANGES_REQUESTED':
        return (
          <Badge variant="warning" className="bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <AlertTriangle className="w-3 h-3 mr-1" /> Changes Requested
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        );
      case 'SUSPENDED':
        return (
          <Badge variant="destructive" className="bg-red-950/40 text-red-400 border border-red-500/30">
            <Ban className="w-3 h-3 mr-1" /> Suspended
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="w-7 h-7 text-indigo-400" />
            Seller Packaging Catalogue
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Review and approve individual packaging options, photograph uploads, and pricing across all sellers.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-white/10 hover:bg-white/5"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-white/[0.02] border-white/10 p-4">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Pending Approvals</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-amber-400">{counts.pending}</span>
            <Clock className="w-5 h-5 text-amber-400/50" />
          </div>
        </Card>
        <Card className="bg-white/[0.02] border-white/10 p-4">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Approved Options</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-emerald-400">{counts.approved}</span>
            <CheckCircle className="w-5 h-5 text-emerald-400/50" />
          </div>
        </Card>
        <Card className="bg-white/[0.02] border-white/10 p-4">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Rejected</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-rose-400">{counts.rejected}</span>
            <XCircle className="w-5 h-5 text-rose-400/50" />
          </div>
        </Card>
        <Card className="bg-white/[0.02] border-white/10 p-4">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider">Total Catalogue</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-2xl font-bold text-indigo-400">{counts.total}</span>
            <Layers className="w-5 h-5 text-indigo-400/50" />
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/[0.02] p-4 rounded-xl border border-white/10">
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab === 'ALL' && 'All Options'}
              {tab === 'PENDING' && `Pending (${counts.pending})`}
              {tab === 'APPROVED' && `Approved (${counts.approved})`}
              {tab === 'REJECTED' && 'Rejected'}
              {tab === 'SUSPENDED' && 'Suspended'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search packaging or shop..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Packaging Catalogue Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="bg-white/[0.02] border-white/10 p-5 space-y-4">
              <Skeleton className="h-32 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : packagingList.length === 0 ? (
        <Card className="bg-white/[0.02] border-white/10 p-12 text-center">
          <Package className="w-12 h-12 text-white/20 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white">No packaging options found</h3>
          <p className="text-sm text-white/50 mt-1 max-w-md mx-auto">
            {activeTab === 'PENDING'
              ? 'No pending packaging requests awaiting approval. All seller catalogues are up to date.'
              : 'No packaging items match the selected filter or search term.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packagingList.map((item: any) => (
            <Card
              key={item.id}
              className="bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden flex flex-col justify-between hover:border-white/20 transition-all shadow-sm"
            >
              <div>
                {/* Photo Preview Header */}
                <div className="relative h-44 bg-zinc-900 flex items-center justify-center border-b border-white/10 overflow-hidden group">
                  {item.imageUrl ? (
                    <>
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <button
                        onClick={() => setPreviewImage({ url: item.imageUrl, title: item.name })}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1.5"
                      >
                        <Eye className="w-4 h-4" /> View Full Image
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white/30 gap-1.5">
                      <Package className="w-10 h-10 stroke-[1.5]" />
                      <span className="text-xs">No photograph uploaded</span>
                    </div>
                  )}

                  {/* Top badges */}
                  <div className="absolute top-2.5 left-2.5">
                    {getStatusBadge(item.status, item.isActive)}
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-950/80 text-white backdrop-blur border border-white/10">
                      ₹{Number(item.price).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-base font-bold text-white tracking-tight">{item.name}</h3>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/5 text-white/60 border border-white/10">
                        {item.type || 'BOX'}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-white/60 mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>

                  {/* Shop & Seller Details */}
                  <div className="bg-white/[0.03] p-2.5 rounded-lg border border-white/5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-white/80 font-medium">
                      <Store className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{item.shop?.name || 'Unknown Shop'}</span>
                    </div>
                    <div className="text-[11px] text-white/50 pl-5">
                      <span>Seller: {item.shop?.seller?.firstName} {item.shop?.seller?.lastName}</span>
                      {item.shop?.seller?.email && <span className="block truncate">({item.shop?.seller?.email})</span>}
                    </div>
                  </div>

                  {/* Metadata Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        item.isOptional
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                      }`}
                    >
                      {item.isOptional ? 'Optional for Customers' : 'Mandatory for Shop'}
                    </span>
                    {item.applicableProductIds?.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {item.applicableProductIds.length} Products
                      </span>
                    )}
                    {item.applicableCategoryIds?.length > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60 border border-white/10 flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        {item.applicableCategoryIds.length} Categories
                      </span>
                    )}
                  </div>

                  {/* Rejection / Request reason alert */}
                  {item.rejectionReason && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                      <span className="font-semibold block flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {item.status === 'CHANGES_REQUESTED' ? 'Changes Requested:' : 'Rejection Reason:'}
                      </span>
                      <p className="text-[11px] opacity-90">{item.rejectionReason}</p>
                    </div>
                  )}

                  {/* Audit information */}
                  {item.reviewedAt && (
                    <div className="text-[10px] text-white/40 pt-1">
                      Reviewed on {new Date(item.reviewedAt).toLocaleDateString()}
                      {item.reviewedByAdmin && ` by ${item.reviewedByAdmin.firstName} ${item.reviewedByAdmin.lastName}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 border-t border-white/5 mt-3 flex items-center gap-2">
                {item.status === 'PENDING' || item.status === 'CHANGES_REQUESTED' ? (
                  <>
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8"
                      onClick={() =>
                        setConfirmApprove({
                          isOpen: true,
                          id: item.id,
                          name: item.name,
                          price: Number(item.price),
                          shopName: item.shop?.name || 'Shop'
                        })
                      }
                      disabled={approveMutation.isPending}
                    >
                      <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 text-xs h-8"
                      onClick={() =>
                        setRejectModalConfig({
                          isOpen: true,
                          id: item.id,
                          name: item.name,
                          shopName: item.shop?.name || 'Shop',
                          isChangeRequest: true
                        })
                      }
                    >
                      Request Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs h-8"
                      onClick={() =>
                        setRejectModalConfig({
                          isOpen: true,
                          id: item.id,
                          name: item.name,
                          shopName: item.shop?.name || 'Shop',
                          isChangeRequest: false
                        })
                      }
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : item.status === 'APPROVED' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs h-8"
                    onClick={() =>
                      setConfirmSuspend({
                        isOpen: true,
                        id: item.id,
                        name: item.name,
                        shopName: item.shop?.name || 'Shop'
                      })
                    }
                  >
                    <Ban className="w-3.5 h-3.5 mr-1.5" /> Suspend Packaging Option
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs h-8"
                    onClick={() =>
                      setConfirmApprove({
                        isOpen: true,
                        id: item.id,
                        name: item.name,
                        price: Number(item.price),
                        shopName: item.shop?.name || 'Shop'
                      })
                    }
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Re-Approve Option
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <p className="text-xs text-white/50">
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} options)
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-white/10 text-xs"
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-white/10 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Approve Confirmation Dialog */}
      {confirmApprove && (
        <Dialog
          isOpen={confirmApprove.isOpen}
          onClose={() => setConfirmApprove(null)}
          title="Approve Packaging Option"
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-white/80">
              Are you sure you want to approve{' '}
              <strong className="text-white font-semibold">"{confirmApprove.name}"</strong> at{' '}
              <strong className="text-emerald-400">₹{confirmApprove.price.toFixed(2)}</strong> for{' '}
              <span className="text-indigo-400">{confirmApprove.shopName}</span>?
            </p>
            <p className="text-xs text-white/50">
              Once approved, customers will be able to select this packaging option or have it applied during checkout.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmApprove(null)}>
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={() => approveMutation.mutate(confirmApprove.id)}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'Approving...' : 'Confirm Approval'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Suspend Confirmation Dialog */}
      {confirmSuspend && (
        <Dialog
          isOpen={confirmSuspend.isOpen}
          onClose={() => setConfirmSuspend(null)}
          title="Suspend Packaging Option"
        >
          <div className="space-y-4 pt-2">
            <p className="text-sm text-white/80">
              Are you sure you want to suspend{' '}
              <strong className="text-white font-semibold">"{confirmSuspend.name}"</strong> from{' '}
              <span className="text-indigo-400">{confirmSuspend.shopName}</span>?
            </p>
            <p className="text-xs text-rose-300">
              Customers will no longer see or be charged for this packaging option on future orders.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmSuspend(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-rose-600 hover:bg-rose-500"
                onClick={() => suspendMutation.mutate(confirmSuspend.id)}
                disabled={suspendMutation.isPending}
              >
                {suspendMutation.isPending ? 'Suspending...' : 'Confirm Suspension'}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <Dialog
          isOpen={Boolean(previewImage)}
          onClose={() => setPreviewImage(null)}
          title={`Photograph: ${previewImage.title}`}
        >
          <div className="flex items-center justify-center p-2">
            <img
              src={previewImage.url}
              alt={previewImage.title}
              className="max-h-[75vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
          </div>
        </Dialog>
      )}

      {/* Rejection / Request Changes Reason Modal */}
      <ReasonModal
        isOpen={rejectModalConfig.isOpen}
        onClose={() => setRejectModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={rejectModalConfig.isChangeRequest ? 'Request Changes from Seller' : 'Reject Packaging Option'}
        description={`Provide a clear reason to ${rejectModalConfig.shopName} for ${
          rejectModalConfig.isChangeRequest ? 'modifying' : 'rejecting'
        } "${rejectModalConfig.name}".`}
        action={rejectModalConfig.isChangeRequest ? 'Request Changes' : 'Reject'}
        target={rejectModalConfig.name}
        onConfirm={(reason: string) => {
          if (rejectModalConfig.isChangeRequest) {
            requestChangesMutation.mutate({ id: rejectModalConfig.id, reason });
          } else {
            rejectMutation.mutate({ id: rejectModalConfig.id, reason });
          }
        }}
        isLoading={rejectMutation.isPending || requestChangesMutation.isPending}
      />
    </div>
  );
}
export default PackingFeeRequestsPage;
