"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportApi } from '@/lib/api/featureApis';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

export function ReportsPage() {
  const [tab, setTab] = useState<'products' | 'shops'>('products');
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data: productReports, isLoading: productLoading } = useQuery({
    queryKey: ['reports', 'products'],
    queryFn: () => reportApi.getReportedProducts(),
    enabled: tab === 'products',
    staleTime: 60 * 1000,
  });

  const { data: shopReports, isLoading: shopLoading } = useQuery({
    queryKey: ['reports', 'shops'],
    queryFn: () => reportApi.getReportedShops(),
    enabled: tab === 'shops',
    staleTime: 60 * 1000,
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => reportApi.resolveReport(id, 'Resolved by admin'),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reports'] }); showToast('Report resolved.', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportApi.deleteReport(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['reports'] }); showToast('Report deleted.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const isLoading = tab === 'products' ? productLoading : shopLoading;
  const reports = tab === 'products' ? (productReports?.reports ?? productReports?.data ?? []) : (shopReports?.reports ?? shopReports?.data ?? []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Reports</h1>
          <p className="text-xs text-white/45 mt-0.5">Review and resolve platform violation reports</p>
        </div>
      </div>

      <div className="flex gap-1 border border-white/5 rounded-xl p-1 bg-white/[0.02] w-fit">
        {(['products', 'shops'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
            {t} Reports
          </button>
        ))}
      </div>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90 capitalize">{tab} Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <CheckCircle className="h-8 w-8 text-emerald-400/40 mx-auto" />
              <p className="text-xs text-white/30 font-medium">No pending reports — all clear!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reported Item</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell className="text-xs font-semibold text-white/80">{report.product?.name ?? report.shop?.name ?? report.entityId ?? '—'}</TableCell>
                    <TableCell className="text-xs text-white/60 max-w-[200px] truncate">{report.reason ?? '—'}</TableCell>
                    <TableCell><Badge variant={report.status === 'PENDING' ? 'warning' : report.status === 'RESOLVED' ? 'success' : 'outline'} className="text-[8px]">{report.status}</Badge></TableCell>
                    <TableCell className="text-xs text-white/40">{report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        {report.status === 'PENDING' && (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10" isLoading={resolveMutation.isPending} onClick={() => resolveMutation.mutate(report.id)}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-400 hover:bg-red-500/10" isLoading={deleteMutation.isPending} onClick={() => deleteMutation.mutate(report.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
