"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Wallet, CheckCircle2, XCircle } from 'lucide-react';

export default function SellerPayoutsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-seller-payouts', { status, page }],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/seller-payouts', {
        params: { status: status || undefined, page, limit: 20 },
      });
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const updatePayoutMutation = useMutation({
    mutationFn: async ({ id, status, failureReason }: { id: string; status: string; failureReason?: string }) => {
      const res = await axiosInstance.patch(`/api/admin/seller-payouts/${id}`, { status, failureReason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-payouts'] });
      showToast('Payout status updated.', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message || e.message, 'error'),
  });

  const payouts = data?.payouts ?? [];
  const total = data?.pagination?.total ?? 0;
  const statuses = ['', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-white/70" />
            Seller Earnings & Payout Disbursements
          </h1>
          <p className="text-xs text-white/45 mt-1">
            Manage seller order payouts, commission deductions, bank transfers, and payout status records.
          </p>
        </div>
      </div>

      <Card className="border border-white/5 p-4">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-white/40 font-bold mr-2">Status Filter:</span>
          {statuses.map((s) => (
            <button
              key={s || 'all'}
              onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer ${
                status === s
                  ? 'bg-white/15 border-white/25 text-white'
                  : 'border-white/10 text-white/40 hover:text-white/70'
              }`}
            >
              {s || 'All Payouts'}
            </button>
          ))}
        </div>
      </Card>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Seller Payout Log ({total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No seller payouts found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payout ID</TableHead>
                  <TableHead>Seller / Shop</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs font-mono text-white/70">
                      {p.id.slice(0, 12)}...
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-xs font-bold text-white/90">
                          {p.seller?.firstName} {p.seller?.lastName}
                        </p>
                        <p className="text-[10px] text-white/40">{p.seller?.shop?.name || p.seller?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-white/60">
                      {p.sellerOrder?.order?.orderNumber || p.sellerOrder?.id || '—'}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-emerald-400">
                      ₹{Number(p.amount ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === 'COMPLETED'
                            ? 'success'
                            : p.status === 'FAILED' || p.status === 'CANCELLED'
                            ? 'destructive'
                            : 'warning'
                        }
                        className="text-[8px]"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status !== 'COMPLETED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10"
                            isLoading={updatePayoutMutation.isPending}
                            onClick={() => updatePayoutMutation.mutate({ id: p.id, status: 'COMPLETED' })}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Complete
                          </Button>
                        )}
                        {p.status !== 'FAILED' && p.status !== 'CANCELLED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-rose-400 hover:bg-rose-500/10"
                            isLoading={updatePayoutMutation.isPending}
                            onClick={() => {
                              const reason = prompt('Failure reason (optional):');
                              updatePayoutMutation.mutate({ id: p.id, status: 'FAILED', failureReason: reason || undefined });
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Mark Failed
                          </Button>
                        )}
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
