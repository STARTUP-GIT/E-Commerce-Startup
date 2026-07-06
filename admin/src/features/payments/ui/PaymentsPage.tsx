"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentApi } from '../api/paymentApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Search, CheckCircle, XCircle } from 'lucide-react';
import { formatPrice } from '@/shared/utils/format';

export function PaymentsPage() {
  const [tab, setTab] = useState<'payments' | 'refunds'>('payments');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['payments', { search, page }],
    queryFn: () => paymentApi.getPayments({ search, page, limit: 20 }),
    enabled: tab === 'payments',
    staleTime: 30 * 1000,
  });

  const { data: refundsData, isLoading: refundsLoading } = useQuery({
    queryKey: ['refunds', { page }],
    queryFn: () => paymentApi.getRefunds({ page, limit: 20 }),
    enabled: tab === 'refunds',
    staleTime: 30 * 1000,
  });

  const approveRefund = useMutation({
    mutationFn: (id: string) => paymentApi.approveRefund(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['refunds'] }); showToast('Refund approved.', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const rejectRefund = useMutation({
    mutationFn: (id: string) => paymentApi.rejectRefund(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['refunds'] }); showToast('Refund rejected.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const payments = paymentsData?.payments ?? paymentsData?.data ?? [];
  const refunds = refundsData?.refunds ?? refundsData?.data ?? [];
  const isLoading = tab === 'payments' ? paymentsLoading : refundsLoading;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white/95">Payments</h1>
        <p className="text-xs text-white/45 mt-1">Monitor transactions and process refunds</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border border-white/5 rounded-xl p-1 bg-white/[0.02] w-fit">
        {(['payments', 'refunds'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'payments' && (
        <Card className="border border-white/5 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <Input placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
        </Card>
      )}

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90 capitalize">{tab}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : tab === 'payments' ? (
            payments.length === 0 ? <div className="text-center py-16 text-white/30 text-sm">No payments found</div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-white/60">{p.id?.slice(0, 12)}...</TableCell>
                      <TableCell className="text-xs font-bold text-white/90">{formatPrice(p.amount)}</TableCell>
                      <TableCell className="text-xs text-white/60">{p.method ?? p.paymentMethod ?? '—'}</TableCell>
                      <TableCell><Badge variant={p.status === 'SUCCESS' ? 'success' : p.status === 'FAILED' ? 'destructive' : 'outline'} className="text-[8px]">{p.status}</Badge></TableCell>
                      <TableCell className="text-xs text-white/40">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            refunds.length === 0 ? <div className="text-center py-16 text-white/30 text-sm">No refunds found</div> : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {refunds.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs text-white/60">{r.paymentId?.slice(0, 12) ?? r.id?.slice(0, 12)}...</TableCell>
                      <TableCell className="text-xs font-bold text-white/90">{formatPrice(r.refundAmount ?? r.amount)}</TableCell>
                      <TableCell><Badge variant={r.refundStatus === 'APPROVED' ? 'success' : r.refundStatus === 'REJECTED' ? 'destructive' : 'warning'} className="text-[8px]">{r.refundStatus ?? 'PENDING'}</Badge></TableCell>
                      <TableCell>
                        {(!r.refundStatus || r.refundStatus === 'PENDING') && (
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10" isLoading={approveRefund.isPending} onClick={() => approveRefund.mutate(r.id)}><CheckCircle className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" isLoading={rejectRefund.isPending} onClick={() => rejectRefund.mutate(r.id)}><XCircle className="h-3.5 w-3.5" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
