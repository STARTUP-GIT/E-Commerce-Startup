"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shopApi } from '../api/shopApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { CheckCircle, XCircle, Package, ShieldCheck } from 'lucide-react';
import { ReasonModal } from '@/shared/components/ReasonModal';

export function PackingFeeRequestsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    shopId: string;
    shopName: string;
  }>({
    isOpen: false,
    shopId: '',
    shopName: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['packing-fee-requests'],
    queryFn: () => shopApi.getPackingFeeRequests(),
    staleTime: 10 * 1000,
  });

  const requests = data?.requests ?? [];

  const approveRequest = useMutation({
    mutationFn: (shopId: string) => shopApi.approvePackingPermission(shopId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-fee-requests'] });
      showToast('Packing fee request approved successfully.', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to approve request.', 'error');
    },
  });

  const rejectRequest = useMutation({
    mutationFn: ({ shopId, reason }: { shopId: string; reason: string }) =>
      shopApi.rejectPackingPermission(shopId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packing-fee-requests'] });
      showToast('Packing fee request rejected.', 'info');
      setModalConfig({ isOpen: false, shopId: '', shopName: '' });
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to reject request.', 'error');
    },
  });

  const STATUS_BADGE: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'secondary'> = {
    APPROVED: 'success',
    PENDING: 'warning',
    REJECTED: 'destructive',
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Packing Fee Requests</h1>
          <p className="text-xs text-white/45 mt-1">Review and process seller requests for packing fee authorization</p>
        </div>
        <div className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-semibold">
          {requests.length} total requests
        </div>
      </div>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-sm font-bold text-white/90">Request History & Queue</CardTitle>
          <CardDescription className="text-xs text-white/45">Review reasons and approve or reject options</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-xs">No packing fee requests found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shop</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Request Date</TableHead>
                  <TableHead>Reason for Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req: any) => (
                  <TableRow key={req.id} className="hover:bg-white/[0.01] transition-colors">
                    <TableCell className="font-semibold text-white/90">
                      {req.shop?.name || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-white/60">
                      {req.shop?.seller 
                        ? `${req.shop.seller.firstName} ${req.shop.seller.lastName} (${req.shop.seller.email})` 
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-white/45">
                      {formatDate(req.createdAt)}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white/85 block">{req.reason}</span>
                        {req.supportingNotes && (
                          <span className="text-[10px] text-white/40 block leading-normal italic">
                            "{req.supportingNotes}"
                          </span>
                        )}
                        {req.status === 'REJECTED' && req.rejectionReason && (
                          <div className="mt-1.5 p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-[10px] text-red-400">
                            <span className="font-bold uppercase tracking-wider block opacity-70">Rejection Reason:</span>
                            <span>{req.rejectionReason}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[req.status] ?? 'outline'} className="text-[8px] tracking-wide uppercase px-2 py-0.5">
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 rounded-lg"
                            isLoading={approveRequest.isPending}
                            onClick={() => approveRequest.mutate(req.shopId)}
                            title="Approve Request"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="sr-only">Approve</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg"
                            onClick={() => setModalConfig({
                              isOpen: true,
                              shopId: req.shopId,
                              shopName: req.shop?.name || 'Shop'
                            })}
                            title="Reject Request"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span className="sr-only">Reject</span>
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-white/30 font-medium">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ReasonModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, shopId: '', shopName: '' })}
        title="Reject Packing Fee Permission"
        description={`Provide a reason for rejecting the packing fee request for "${modalConfig.shopName}". This reason will be displayed to the seller.`}
        action="Reject"
        target={modalConfig.shopName}
        isLoading={rejectRequest.isPending}
        onConfirm={(reason) => rejectRequest.mutate({ shopId: modalConfig.shopId, reason })}
      />
    </div>
  );
}
