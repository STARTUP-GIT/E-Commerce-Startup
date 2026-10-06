"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { moderationApi, REPORT_STATUS_VARIANT, type ReportItem } from '../api/moderationApi';
import { NoPermission } from './NoPermission';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Dialog } from '@/shared/components/Dialog';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { CheckCircle, Trash2, Flag, Store, Package } from 'lucide-react';

type ReportTarget = 'products' | 'shops';

function reporterOf(report: ReportItem): string {
  if (!report.customer) return '—';
  return report.customer.username || report.customer.email || report.customer.id;
}

export function ReportsTab() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const showConfirm = useConfirmStore((state) => state.showConfirm);
  const { can } = usePermissions();

  const canManage = can('moderation.manage');
  const canViewReports = can('reports.view');

  const [target, setTarget] = useState<ReportTarget>('products');
  const [page, setPage] = useState(1);
  const [resolveTarget, setResolveTarget] = useState<ReportItem | null>(null);
  const [resolution, setResolution] = useState('');

  const productQuery = useQuery({
    queryKey: ['moderation', 'reports', 'products', { page }],
    queryFn: () => moderationApi.getReportedProducts({ page, limit: 20 }),
    enabled: canViewReports && target === 'products',
    staleTime: 30 * 1000,
  });

  const shopQuery = useQuery({
    queryKey: ['moderation', 'reports', 'shops'],
    queryFn: () => moderationApi.getReportedShops(),
    enabled: canViewReports && target === 'shops',
    staleTime: 30 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['moderation', 'reports'] });

  const resolveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => moderationApi.resolveReport(id, note),
    onSuccess: () => {
      invalidate();
      setResolveTarget(null);
      setResolution('');
      showToast('Report resolved.', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => moderationApi.deleteReport(id),
    onSuccess: () => { invalidate(); showToast('Report deleted.', 'info'); },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  if (!canViewReports) return <NoPermission permission="reports.view" />;

  const isLoading = target === 'products' ? productQuery.isLoading : shopQuery.isLoading;
  const isError = target === 'products' ? productQuery.isError : shopQuery.isError;
  const error = target === 'products' ? productQuery.error : shopQuery.error;

  const reports: ReportItem[] =
    target === 'products' ? (productQuery.data?.reports ?? []) : (shopQuery.data?.shopReports ?? []);
  const pagination = target === 'products' ? productQuery.data?.pagination : undefined;

  const targetName = (report: ReportItem) =>
    target === 'products'
      ? report.product?.name || '—'
      : report.shop?.name || report.product?.seller?.shop?.name || '—';

  const openResolve = (report: ReportItem) => {
    setResolution('');
    setResolveTarget(report);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex gap-1 border border-white/5 rounded-xl p-1 bg-white/[0.02] w-fit">
          {([
            { key: 'products' as const, label: 'Product Reports', icon: Package },
            { key: 'shops' as const, label: 'Shop Reports', icon: Store },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTarget(key); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                target === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
        <div className="text-xs text-white/40 font-semibold">
          {pagination ? `${pagination.total} reports` : `${reports.length} reports`}
        </div>
      </div>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90 capitalize">{target} Reports</CardTitle>
          <CardDescription>Only open reports (PENDING / UNDER_REVIEW) are listed by the API</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isError ? (
            <div className="text-center py-16 text-red-400 text-sm">{error?.message || 'Failed to load reports'}</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <CheckCircle className="h-8 w-8 text-emerald-400/40 mx-auto" />
              <p className="text-xs text-white/30 font-medium">No open reports — all clear!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="text-xs text-white/60 max-w-[150px] truncate">{reporterOf(report)}</TableCell>
                    <TableCell className="text-xs font-semibold text-white/80 max-w-[180px] truncate">{targetName(report)}</TableCell>
                    <TableCell className="text-xs text-white/60 max-w-[220px] truncate" title={report.description || ''}>
                      {report.reason || '—'}
                      {report.description ? <span className="block text-[10px] text-white/35 truncate">{report.description}</span> : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={REPORT_STATUS_VARIANT[report.status] ?? 'outline'} className="text-[8px]">
                        {String(report.status).replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10 text-[9px]"
                          disabled={!canManage || resolveMutation.isPending}
                          onClick={() => openResolve(report)}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Resolve
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-400 hover:bg-red-500/10"
                          disabled={!canManage || deleteMutation.isPending}
                          onClick={() => {
                            showConfirm({
                              title: 'Delete Report',
                              message: `This permanently deletes the report on "${targetName(report)}". This cannot be undone.`,
                              confirmText: 'Delete Report',
                              onConfirm: () => deleteMutation.mutate(report.id),
                            });
                          }}
                        >
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

      <Dialog
        isOpen={!!resolveTarget}
        onClose={() => setResolveTarget(null)}
        title="Resolve Report"
        description={resolveTarget ? `Target: ${targetName(resolveTarget)}` : undefined}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <Flag className="h-3.5 w-3.5 text-white/30 mt-0.5" />
            <div className="text-xs text-white/60">
              <span className="font-bold text-white/80">{resolveTarget?.reason}</span>
              {resolveTarget?.description ? <span className="block text-white/40 mt-0.5">{resolveTarget.description}</span> : null}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block" htmlFor="resolution-note">
              Resolution note
            </label>
            <textarea
              id="resolution-note"
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Describe how this report was handled..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-white/[0.02] text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-all resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setResolveTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              isLoading={resolveMutation.isPending}
              onClick={() => {
                if (!resolveTarget) return;
                const id = resolveTarget.id;
                const note = resolution.trim();
                showConfirm({
                  title: 'Resolve Report',
                  message: `Mark this report as resolved${note ? ` with the note "${note}"` : ''}? The reporter's issue will be closed.`,
                  confirmText: 'Resolve Report',
                  onConfirm: () => resolveMutation.mutate({ id, note }),
                });
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
