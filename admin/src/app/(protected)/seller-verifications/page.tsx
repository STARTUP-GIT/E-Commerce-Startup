"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { LocationFilterBar } from '@/shared/components/LocationFilterBar';
import { ReasonModal } from '@/shared/components/ReasonModal';
import { Dialog } from '@/shared/components/Dialog';
import { useUIStore } from '@/lib/store/uiStore';
import {
  BadgeCheck,
  CheckCircle2,
  XCircle,
  History,
  FileText,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  User,
  Clock
} from 'lucide-react';

export default function SellerVerificationsPage() {
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Rejection modal state
  const [rejectionTarget, setRejectionTarget] = useState<{ id: string; sellerName: string } | null>(null);

  // History modal state
  const [historySeller, setHistorySeller] = useState<{ sellerId: string; sellerName: string } | null>(null);

  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const isUnassigned = selectedState === 'UNASSIGNED';

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'admin-seller-verifications',
      { status, search, state: selectedState, district: selectedDistrict, page }
    ],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/seller-verifications', {
        params: {
          status: status || undefined,
          search: search.trim() || undefined,
          state: !isUnassigned && selectedState ? selectedState : undefined,
          district: !isUnassigned && selectedDistrict ? selectedDistrict : undefined,
          page,
          limit,
        },
      });
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const { data: historyData, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['admin-seller-verification-history', historySeller?.sellerId],
    queryFn: async () => {
      if (!historySeller?.sellerId) return null;
      const res = await axiosInstance.get(
        `/api/admin/seller-verifications/seller/${historySeller.sellerId}/history`
      );
      return res.data;
    },
    enabled: Boolean(historySeller?.sellerId),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      const res = await axiosInstance.patch(`/api/admin/seller-verifications/${id}`, { status, rejectionReason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-verifications'] });
      showToast('Verification status updated successfully.', 'success');
      setRejectionTarget(null);
    },
    onError: (e: any) => showToast(e?.response?.data?.message || e.message, 'error'),
  });

  const verifications = data?.verifications ?? [];
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.pages ?? Math.ceil(total / limit);

  const handleClearAll = () => {
    setStatus('');
    setSearch('');
    setSelectedState('');
    setSelectedDistrict('');
    setPage(1);
  };

  const getStatusBadgeVariant = (s: string) => {
    switch (s) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'destructive';
      case 'UNDER_REVIEW':
        return 'warning';
      default:
        return 'outline';
    }
  };

  const statusOptions = [
    { label: 'All Statuses', value: '' },
    { label: 'Pending Review', value: 'PENDING' },
    { label: 'Under Review', value: 'UNDER_REVIEW' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Rejected', value: 'REJECTED' },
    { label: 'Expired', value: 'EXPIRED' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <BadgeCheck className="h-6 w-6 text-purple-400" />
            Seller Identity & Verification Review
          </h1>
          <p className="text-xs text-white/45 mt-1">
            Review GST credentials, government identity documents, and business licensing for onboarded sellers.
          </p>
        </div>
      </div>

      {/* Global Location & Text Filter Bar */}
      <LocationFilterBar
        search={search}
        onSearchChange={(val) => { setSearch(val); setPage(1); }}
        searchPlaceholder="Search seller name, email, shop name, or GSTIN..."
        state={selectedState}
        onStateChange={(st) => { setSelectedState(st); setPage(1); }}
        district={selectedDistrict}
        onDistrictChange={(dist) => { setSelectedDistrict(dist); setPage(1); }}
        status={status}
        onStatusChange={(st) => { setStatus(st); setPage(1); }}
        statusOptions={statusOptions}
        onClearAll={handleClearAll}
      />

      {/* Directory Table */}
      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-white/90 flex items-center gap-2">
            <span>Authoritative Applications</span>
            <Badge variant="outline" className="text-[10px] ml-1">
              {total} unique {total === 1 ? 'seller' : 'sellers'}
            </Badge>
          </CardTitle>
          {isFetching && (
            <span className="text-[10px] text-purple-400 animate-pulse font-medium">Updating...</span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <ShieldCheck className="h-10 w-10 text-white/20 mx-auto" />
              <p className="text-sm font-semibold text-white/60">No seller verifications found</p>
              <p className="text-xs text-white/40 max-w-sm mx-auto">
                No active verification applications match your current search and location filters.
              </p>
              {(search || selectedState || selectedDistrict || status) && (
                <Button size="sm" variant="outline" onClick={handleClearAll} className="mt-2 text-xs">
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Seller</TableHead>
                    <TableHead>Shop & Location</TableHead>
                    <TableHead>GST Credentials</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verifications.map((v: any) => {
                    const shopAddress = v.seller?.shop?.defaultPickupAddress || v.seller?.addresses?.[0];
                    const stateName = shopAddress?.state;
                    const districtName = shopAddress?.city;
                    const sellerFullName = `${v.seller?.firstName || ''} ${v.seller?.lastName || ''}`.trim() || 'Unknown Seller';

                    return (
                      <TableRow key={v.id}>
                        {/* Seller */}
                        <TableCell>
                          <div>
                            <p className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                              <User className="h-3 w-3 text-white/40" />
                              {sellerFullName}
                            </p>
                            <p className="text-[10px] text-white/40 mt-0.5">{v.seller?.email}</p>
                            {v.seller?.username && (
                              <p className="text-[9px] text-white/30 font-mono">@{v.seller.username}</p>
                            )}
                          </div>
                        </TableCell>

                        {/* Shop & Location */}
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-xs text-white/80 font-medium flex items-center gap-1.5">
                              <Building className="h-3 w-3 text-white/40" />
                              {v.seller?.shop?.name || <span className="text-white/30 italic">No shop yet</span>}
                            </p>
                            <p className="text-[10px] text-white/45 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 text-purple-400" />
                              {stateName ? (
                                <span>{districtName ? `${districtName}, ` : ''}{stateName}</span>
                              ) : (
                                <span className="text-white/30 italic">Location unassigned</span>
                              )}
                            </p>
                          </div>
                        </TableCell>

                        {/* GST Credentials */}
                        <TableCell>
                          {v.gstNumber ? (
                            <div>
                              <span className="font-mono text-xs text-white/90 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                {v.gstNumber}
                              </span>
                              <span className="block text-[9px] text-emerald-400 mt-1 font-semibold">
                                GST Registered
                              </span>
                            </div>
                          ) : v.gstRegistered === false ? (
                            <div>
                              <span className="text-[11px] text-white/50">Exempt / Not Applicable</span>
                              <span className="block text-[9px] text-white/30">Declared by seller</span>
                            </div>
                          ) : (
                            <span className="text-xs text-white/30 italic">Not provided</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(v.status)} className="text-[9px]">
                            {v.status}
                          </Badge>
                          {v.rejectionReason && (
                            <p className="text-[9px] text-rose-300/80 mt-1 max-w-[180px] truncate" title={v.rejectionReason}>
                              Reason: {v.rejectionReason}
                            </p>
                          )}
                        </TableCell>

                        {/* Submitted Date */}
                        <TableCell className="text-xs text-white/40 whitespace-nowrap">
                          {new Date(v.submittedAt || v.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* History button */}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-white/50 hover:text-white hover:bg-white/5"
                              title="View Application History"
                              onClick={() => setHistorySeller({ sellerId: v.sellerId, sellerName: sellerFullName })}
                            >
                              <History className="h-3.5 w-3.5" />
                            </Button>

                            {/* Approve */}
                            {v.status !== 'APPROVED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                                isLoading={reviewMutation.isPending && reviewMutation.variables?.id === v.id}
                                onClick={() => reviewMutation.mutate({ id: v.id, status: 'APPROVED' })}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Approve
                              </Button>
                            )}

                            {/* Reject */}
                            {v.status !== 'REJECTED' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                                isLoading={reviewMutation.isPending && reviewMutation.variables?.id === v.id}
                                onClick={() => setRejectionTarget({ id: v.id, sellerName: sellerFullName })}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <span className="text-xs text-white/40">
                Page {page} of {totalPages} ({total} applications)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Structured Rejection Modal */}
      {rejectionTarget && (
        <ReasonModal
          isOpen={Boolean(rejectionTarget)}
          onClose={() => setRejectionTarget(null)}
          title="Reject Seller Verification"
          description="Provide a clear, actionable reason for rejecting this verification application. The seller will be notified and can resubmit updated credentials."
          action="Reject Application"
          target={rejectionTarget.sellerName}
          isLoading={reviewMutation.isPending}
          onConfirm={(reason) => {
            reviewMutation.mutate({
              id: rejectionTarget.id,
              status: 'REJECTED',
              rejectionReason: reason,
            });
          }}
        />
      )}

      {/* Historical Revisions Dialog */}
      {historySeller && (
        <Dialog
          isOpen={Boolean(historySeller)}
          onClose={() => setHistorySeller(null)}
          title={
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-purple-400" />
              <span>Verification History — {historySeller.sellerName}</span>
            </div>
          }
          description="Historical verification submissions, revisions, and administrative review decisions for this seller."
          maxWidth="max-w-[650px]"
        >
          <div className="space-y-4 py-2">
            {isHistoryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : !historyData?.history || historyData.history.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-6">No historical submissions recorded.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {historyData.history.map((h: any, idx: number) => (
                  <div
                    key={h.id}
                    className={`p-3 rounded-lg border text-xs space-y-2 ${
                      h.isCurrent
                        ? 'bg-purple-500/5 border-purple-500/20'
                        : 'bg-white/[0.02] border-white/5 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(h.status)} className="text-[8px]">
                          {h.status}
                        </Badge>
                        {h.isCurrent && (
                          <span className="text-[9px] font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
                            CURRENT APPLICATION
                          </span>
                        )}
                        <span className="text-[10px] text-white/40">
                          Revision #{historyData.history.length - idx}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/40 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(h.submittedAt || h.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-white/60 pt-1">
                      <div>
                        <span className="text-white/40 block text-[9px] uppercase font-bold">GST Number</span>
                        <span className="font-mono text-white/80">{h.gstNumber || 'Not registered / exempt'}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[9px] uppercase font-bold">Document Type</span>
                        <span>{h.documentType || 'Tax Registration'}</span>
                      </div>
                    </div>

                    {h.rejectionReason && (
                      <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px]">
                        <strong>Rejection Reason:</strong> {h.rejectionReason}
                      </div>
                    )}

                    {h.reviewedAt && (
                      <p className="text-[9px] text-white/40">
                        Reviewed by admin {h.reviewedByAdmin?.firstName || h.reviewedByAdminId || 'Staff'} on{' '}
                        {new Date(h.reviewedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
}
