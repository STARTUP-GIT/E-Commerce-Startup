"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  returnApi,
  RETURN_STATUSES,
  RETURN_STATUS_VARIANT,
  type ReturnItem,
} from '../api/returnApi';
import { NoPermission } from './NoPermission';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { formatPrice } from '@/shared/utils/format';
import { Search, RotateCcw, Check, X, ShieldCheck } from 'lucide-react';

type PendingAction = { type: 'approve' | 'reject'; item: ReturnItem } | null;

function displayName(person?: { firstName?: string | null; lastName?: string | null; username?: string | null; email?: string | null; id?: string } | null): string {
  if (!person) return '—';
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ');
  return name || person.username || person.email || person.id || '—';
}

export function ReturnsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const showConfirm = useConfirmStore((state) => state.showConfirm);
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  const canView = can('orders.view');
  const canManage = can('orders.manage');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['returns', { search, status: statusFilter, page }],
    queryFn: () =>
      returnApi.getReturns({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      }),
    enabled: canView,
    staleTime: 30 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['returns'] });

  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => returnApi.approveReturn(id, notes),
    onSuccess: (res) => {
      invalidate();
      setPendingAction(null);
      setAdminNotes('');
      showToast(`Return ${res.returnRequest.returnNumber} approved.`, 'success');
    },
    onError: (e: Error) => {
      // 409 (terminal status) and other backend errors surface their { message }
      showToast(e.message, 'error');
      invalidate();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => returnApi.rejectReturn(id, reason),
    onSuccess: (res) => {
      invalidate();
      setPendingAction(null);
      setRejectionReason('');
      setRejectionError('');
      showToast(`Return ${res.returnRequest.returnNumber} rejected.`, 'info');
    },
    onError: (e: Error) => {
      showToast(e.message, 'error');
      invalidate();
    },
  });

  if (permissionsLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-10 w-56" />
        <Card className="border border-white/5 p-4"><Skeleton className="h-10 w-full" /></Card>
        <Card className="border border-white/5">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canView) return <NoPermission permission="orders.view" />;

  const returns = data?.returns ?? [];
  const pagination = data?.pagination;
  const mutationPending = approveMutation.isPending || rejectMutation.isPending;

  const closeAction = () => {
    setPendingAction(null);
    setAdminNotes('');
    setRejectionReason('');
    setRejectionError('');
  };

  const confirmApprove = (item: ReturnItem) => {
    const notes = adminNotes.trim();
    showConfirm({
      title: 'Approve Return',
      message: `Approve return ${item.returnNumber}? Its status will move to APPROVED and you will be recorded as the reviewer.`,
      confirmText: 'Approve Return',
      onConfirm: () => approveMutation.mutate({ id: item.id, notes: notes || undefined }),
    });
  };

  const confirmReject = (item: ReturnItem) => {
    const reason = rejectionReason.trim();
    if (!reason) {
      setRejectionError('A rejection reason is required.');
      return;
    }
    showConfirm({
      title: 'Reject Return',
      message: `Reject return ${item.returnNumber}? The customer will see your reason: "${reason}".`,
      confirmText: 'Reject Return',
      onConfirm: () => rejectMutation.mutate({ id: item.id, reason }),
    });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Returns</h1>
          <p className="text-xs text-white/45 mt-1">Review, approve or reject customer return requests</p>
        </div>
        <div className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-semibold">
          {pagination?.total ?? returns.length} total returns
        </div>
      </div>

      <Card className="border border-white/5 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <Input
              placeholder="Search return or order number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-lg border border-white/10 bg-[#0c0c10] text-xs font-semibold text-white/80 focus:outline-none focus:border-white/30 cursor-pointer"
          >
            <option value="">All Statuses</option>
            {RETURN_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Return Requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isError ? (
            <div className="text-center py-16 text-red-400 text-sm">{error?.message || 'Failed to load returns'}</div>
          ) : returns.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <RotateCcw className="h-8 w-8 text-white/20 mx-auto" />
              <p className="text-xs text-white/30 font-medium">No return requests found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Refund</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((item) => {
                  const variant = RETURN_STATUS_VARIANT[item.status as keyof typeof RETURN_STATUS_VARIANT] ?? 'outline';
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono font-bold text-xs text-white/90">{item.returnNumber}</TableCell>
                      <TableCell className="text-xs text-white/70">{item.order?.orderNumber || '—'}</TableCell>
                      <TableCell className="text-xs text-white/60 max-w-[150px] truncate">{displayName(item.customer)}</TableCell>
                      <TableCell className="text-xs text-white/60 max-w-[170px] truncate">{item.product?.name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant={variant} className="text-[8px]">
                          {String(item.status).replace(/_/g, ' ')}
                        </Badge>
                        {item.reviewedAt && (
                          <div className="text-[9px] text-white/35 mt-1">
                            By {item.reviewedByAdmin ? displayName(item.reviewedByAdmin) : 'admin'} ·{' '}
                            {new Date(item.reviewedAt).toLocaleDateString()}
                          </div>
                        )}
                        {item.status === 'REJECTED' && item.rejectionReason && (
                          <div className="text-[9px] text-red-400/60 mt-0.5 max-w-[160px] truncate" title={item.rejectionReason}>
                            {item.rejectionReason}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-white/80">{formatPrice(item.refundAmount)}</TableCell>
                      <TableCell className="text-xs text-white/40">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-white/50 max-w-[180px] truncate" title={item.description || item.reason}>
                        {item.reason || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10 text-[9px]"
                            disabled={!canManage || mutationPending}
                            title={canManage ? 'Approve return' : 'Requires the orders.manage permission'}
                            onClick={() => { setAdminNotes(''); setPendingAction({ type: 'approve', item }); }}
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-red-400 hover:bg-red-500/10 text-[9px]"
                            disabled={!canManage || mutationPending}
                            title={canManage ? 'Reject return' : 'Requires the orders.manage permission'}
                            onClick={() => { setRejectionReason(''); setRejectionError(''); setPendingAction({ type: 'reject', item }); }}
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-xs text-white/40">Page {pagination.page} of {pagination.pages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.pages}>
            Next
          </Button>
        </div>
      )}

      {/* Approve dialog */}
      <Dialog
        isOpen={pendingAction?.type === 'approve'}
        onClose={closeAction}
        title="Approve Return"
        description={pendingAction ? `${pendingAction.item.returnNumber} · ${pendingAction.item.product?.name || 'Product'}` : undefined}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 mt-0.5" />
            <p className="text-xs text-white/60">
              Approving moves the return to <span className="font-bold text-white/80">APPROVED</span> and records you as the
              reviewer. A refund still follows the platform flow.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block" htmlFor="approve-notes">
              Admin notes (optional)
            </label>
            <textarea
              id="approve-notes"
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal note about this approval..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-white/[0.02] text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={closeAction}>Cancel</Button>
            <Button
              size="sm"
              isLoading={approveMutation.isPending}
              onClick={() => pendingAction && confirmApprove(pendingAction.item)}
            >
              Continue
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reject dialog */}
      <Dialog
        isOpen={pendingAction?.type === 'reject'}
        onClose={closeAction}
        title="Reject Return"
        description={pendingAction ? `${pendingAction.item.returnNumber} · ${pendingAction.item.product?.name || 'Product'}` : undefined}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block" htmlFor="rejection-reason">
              Rejection reason (required)
            </label>
            <textarea
              id="rejection-reason"
              rows={4}
              value={rejectionReason}
              onChange={(e) => { setRejectionReason(e.target.value); if (rejectionError) setRejectionError(''); }}
              placeholder="Explain why this return request is being rejected..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-white/[0.02] text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-all resize-none"
            />
            <div className="flex justify-between text-[10px] text-white/30 font-semibold">
              <span>{rejectionError ? <span className="text-red-400">{rejectionError}</span> : 'Shown to the customer'}</span>
              <span>{rejectionReason.trim().length}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={closeAction}>Cancel</Button>
            <Button
              size="sm"
              variant="destructive"
              isLoading={rejectMutation.isPending}
              onClick={() => pendingAction && confirmReject(pendingAction.item)}
            >
              Continue
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
