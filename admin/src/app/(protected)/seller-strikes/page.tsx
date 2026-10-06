"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Gavel, AlertTriangle, Trash2, Plus } from 'lucide-react';

export default function SellerStrikesPage() {
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sellerId, setSellerId] = useState('');
  const [reason, setReason] = useState('');
  const [severity, setSeverity] = useState('WARNING');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-seller-strikes', { page }],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/seller-strikes', {
        params: { page, limit: 20 },
      });
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const createStrikeMutation = useMutation({
    mutationFn: async () => {
      const res = await axiosInstance.post('/api/admin/seller-strikes', {
        sellerId,
        reason,
        severity,
        description: description || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-strikes'] });
      showToast('Strike issued successfully.', 'success');
      setShowAddModal(false);
      setSellerId('');
      setReason('');
      setDescription('');
    },
    onError: (e: any) => showToast(e?.response?.data?.message || e.message, 'error'),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.delete(`/api/admin/seller-strikes/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-strikes'] });
      showToast('Strike deactivated.', 'info');
    },
    onError: (e: any) => showToast(e?.response?.data?.message || e.message, 'error'),
  });

  const strikes = data?.strikes ?? [];
  const total = data?.pagination?.total ?? 0;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <Gavel className="h-6 w-6 text-white/70" />
            Seller Penalties & Policy Strikes
          </h1>
          <p className="text-xs text-white/45 mt-1">
            Issue formal strikes to sellers for policy violations, shipping delays, counterfeit items, or bad reviews.
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-rose-600 hover:bg-rose-500 font-bold gap-2">
          <Plus className="h-4 w-4" />
          Issue Policy Strike
        </Button>
      </div>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Issued Strikes History ({total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : strikes.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No seller strikes issued</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller / Shop</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Issued By</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {strikes.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="text-xs font-bold text-white/90">
                          {s.seller?.firstName} {s.seller?.lastName}
                        </p>
                        <p className="text-[10px] text-white/40">{s.seller?.shop?.name || s.seller?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.severity === 'CRITICAL' || s.severity === 'MAJOR'
                            ? 'destructive'
                            : 'warning'
                        }
                        className="text-[8px]"
                      >
                        {s.severity || 'WARNING'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/70 max-w-xs truncate">
                      {s.reason}
                    </TableCell>
                    <TableCell className="text-xs text-white/50">
                      {s.admin ? `${s.admin.firstName} ${s.admin.lastName}` : 'System'}
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {new Date(s.issuedAt || s.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.isActive !== false && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-rose-400 hover:bg-rose-500/10"
                          isLoading={deactivateMutation.isPending}
                          onClick={() => deactivateMutation.mutate(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal for adding a strike */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md border border-white/10 bg-[#0d0d12]">
            <CardHeader className="border-b border-white/5">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                Issue Seller Policy Strike
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">Seller ID</label>
                <Input
                  placeholder="Enter exact Seller ID"
                  value={sellerId}
                  onChange={(e) => setSellerId(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-white/30"
                >
                  <option value="WARNING">WARNING</option>
                  <option value="MINOR">MINOR</option>
                  <option value="MAJOR">MAJOR</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">Reason</label>
                <Input
                  placeholder="Short reason (e.g., Shipping delay > 7 days)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">Detailed Description (Optional)</label>
                <textarea
                  placeholder="Additional context or notes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-20 rounded-xl bg-white/[0.05] border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="pt-4 border-t border-white/5 flex gap-3 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-500 font-bold"
                  isLoading={createStrikeMutation.isPending}
                  onClick={() => createStrikeMutation.mutate()}
                  disabled={!sellerId || !reason}
                >
                  Issue Strike
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
