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
import { BadgeCheck, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function SellerVerificationsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-seller-verifications', { status, page }],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/seller-verifications', {
        params: { status: status || undefined, page, limit: 20 },
      });
      return res.data;
    },
    staleTime: 30 * 1000,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      const res = await axiosInstance.patch(`/api/admin/seller-verifications/${id}`, { status, rejectionReason });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-verifications'] });
      showToast('Verification status updated successfully.', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message || e.message, 'error'),
  });

  const verifications = data?.verifications ?? [];
  const total = data?.pagination?.total ?? 0;
  const statuses = ['', 'PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'];

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <BadgeCheck className="h-6 w-6 text-white/70" />
            Seller Identity & Verification Review
          </h1>
          <p className="text-xs text-white/45 mt-1">
            Review GST credentials, government identity documents, and business licensing for onboarded sellers.
          </p>
        </div>
      </div>

      <Card className="border border-white/5 p-4">
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-white/40 font-bold mr-2">Filter Status:</span>
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
              {s || 'All Statuses'}
            </button>
          ))}
        </div>
      </Card>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Verification Records ({total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : verifications.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No seller verifications found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verifications.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div>
                        <p className="text-xs font-bold text-white/90">
                          {v.seller?.firstName} {v.seller?.lastName}
                        </p>
                        <p className="text-[10px] text-white/40">{v.seller?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-white/70">
                      {v.seller?.shop?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          v.status === 'APPROVED'
                            ? 'success'
                            : v.status === 'REJECTED'
                            ? 'destructive'
                            : 'outline'
                        }
                        className="text-[8px]"
                      >
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {new Date(v.updatedAt || v.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {v.status !== 'APPROVED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10"
                            isLoading={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ id: v.id, status: 'APPROVED' })}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                        )}
                        {v.status !== 'REJECTED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-rose-400 hover:bg-rose-500/10"
                            isLoading={reviewMutation.isPending}
                            onClick={() => {
                              const reason = prompt('Rejection reason (required):');
                              if (reason) {
                                reviewMutation.mutate({ id: v.id, status: 'REJECTED', rejectionReason: reason });
                              }
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
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
