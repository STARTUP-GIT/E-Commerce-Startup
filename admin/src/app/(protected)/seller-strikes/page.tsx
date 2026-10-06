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
import { Gavel, AlertTriangle, Trash2, Plus, X } from 'lucide-react';
import { SellerSearchSelect, type SellerOption } from '@/shared/components/SellerSearchSelect';

export default function SellerStrikesPage() {
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state
  const [selectedSeller, setSelectedSeller] = useState<SellerOption | null>(null);
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
      if (!selectedSeller) throw new Error('Please select a seller.');
      const res = await axiosInstance.post('/api/admin/seller-strikes', {
        sellerId: selectedSeller.id,
        reason,
        severity,
        description: description || undefined,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-seller-strikes'] });
      showToast('Strike issued successfully.', 'success');
      closeModal();
    },
    onError: () => showToast('Unable to issue strike. Please try again.', 'error'),
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
    onError: () => showToast('Unable to deactivate strike. Please try again.', 'error'),
  });

  const closeModal = () => {
    setShowAddModal(false);
    setSelectedSeller(null);
    setReason('');
    setDescription('');
    setSeverity('WARNING');
  };

  const strikes = data?.strikes ?? [];
  const total = data?.pagination?.total ?? 0;
  const canSubmit = !!selectedSeller && !!reason.trim();

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <Gavel className="h-6 w-6 text-white/70" />
            Seller Penalties &amp; Policy Strikes
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

      {/* Issue Strike Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="w-full bg-[#0d0d12] border border-white/10 rounded-2xl flex flex-col overflow-hidden"
            style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100dvh - 32px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <h2 className="text-sm font-bold text-white">Issue Seller Policy Strike</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.07] transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto min-h-0 px-4 sm:px-6 py-5 space-y-4 flex-1">

              {/* Seller Selector */}
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">Seller</label>
                <SellerSearchSelect
                  selected={selectedSeller}
                  onSelect={(_, seller) => setSelectedSeller(seller)}
                  onClear={() => setSelectedSeller(null)}
                />
              </div>

              {/* Severity */}
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#0d0d12] border border-white/10 px-3 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                >
                  <option className="bg-[#0d0d12] text-white" value="WARNING">WARNING — Minor first notice</option>
                  <option className="bg-[#0d0d12] text-white" value="MINOR">MINOR — Recorded violation</option>
                  <option className="bg-[#0d0d12] text-white" value="MAJOR">MAJOR — Significant breach</option>
                  <option className="bg-[#0d0d12] text-white" value="CRITICAL">CRITICAL — Immediate action required</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">Reason</label>
                <input
                  type="text"
                  placeholder="Short reason (e.g., Shipping delay &gt; 7 days)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1.5">
                  Detailed Description <span className="text-white/30 font-normal">(Optional)</span>
                </label>
                <textarea
                  placeholder="Additional context or notes…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl bg-white/[0.05] border border-white/10 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-white/5 flex gap-3 justify-end shrink-0">
              <Button variant="ghost" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-rose-600 hover:bg-rose-500 font-bold"
                isLoading={createStrikeMutation.isPending}
                onClick={() => createStrikeMutation.mutate()}
                disabled={!canSubmit}
              >
                Issue Strike
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
