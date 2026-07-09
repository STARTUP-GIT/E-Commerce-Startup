"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerApi } from '../api/sellerApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Search, ShieldOff, ShieldCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ReasonModal } from '@/shared/components/ReasonModal';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'destructive' | 'outline' | 'secondary' | 'default'> = {
  ACTIVE: 'success',
  DISABLED: 'destructive',
  BANNED: 'destructive',
};

export function SellersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    action: string;
    target: string;
    onConfirm: (reason: string) => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: '',
    target: '',
    onConfirm: () => {},
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sellers', { search, status: statusFilter, page }],
    queryFn: () => sellerApi.getSellers({ search, status: statusFilter || undefined, page, limit: 20 }),
    staleTime: 30 * 1000,
  });

  const sellers = data?.sellers ?? data?.data ?? [];
  const total = data?.total ?? 0;

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => sellerApi.banSeller(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      showToast('Seller banned.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => sellerApi.unbanSeller(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      showToast('Seller unbanned.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const statuses = ['', 'ACTIVE', 'DISABLED', 'BANNED'];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Sellers</h1>
          <p className="text-xs text-white/45 mt-1">Manage seller registrations, approvals, and statuses</p>
        </div>
        <div className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-semibold">
          {total} total sellers
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-white/5 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <Input
              placeholder="Search by name, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s || 'all'}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer ${
                  statusFilter === s
                    ? 'bg-white/15 border-white/25 text-white'
                    : 'border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Seller Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No sellers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller: any) => (
                  <TableRow key={seller.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60 shrink-0">
                          {seller.firstName?.[0] ?? seller.username?.[0] ?? 'S'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/90">
                            {seller.firstName} {seller.lastName}
                          </p>
                          <p className="text-[10px] text-white/35">{seller.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-white/60">{seller.email}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_COLORS[seller.status] ?? 'outline'} className="text-[8px]">
                          {seller.status}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        {seller.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                          isLoading={banMutation.isPending}
                          onClick={() => {
                            setModalConfig({
                              isOpen: true,
                              title: 'Ban Seller Account',
                              description: `Are you sure you want to ban the seller account for "${seller.firstName} ${seller.lastName}"? Banning this seller will also disable all shops and products linked to them.`,
                              action: 'Ban',
                              target: `${seller.firstName} ${seller.lastName}`,
                              onConfirm: (reason) => banMutation.mutate({ id: seller.id, reason }),
                            });
                          }}
                          title="Ban"
                        >
                          <ShieldOff className="h-3.5 w-3.5" />
                        </Button>
                        )}
                        {seller.status === 'BANNED' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                            isLoading={unbanMutation.isPending}
                            onClick={() => unbanMutation.mutate(seller.id)}
                            title="Unban"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Link
                          href={`/sellers/${seller.id}`}
                          className="h-7 px-2 text-white/40 hover:text-white/80 transition-colors flex items-center"
                          title="View details"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-xs text-white/40">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={sellers.length < 20}>
            Next
          </Button>
        </div>
      )}

      <ReasonModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        title={modalConfig.title}
        description={modalConfig.description}
        action={modalConfig.action}
        target={modalConfig.target}
        onConfirm={(reason) => {
          modalConfig.onConfirm(reason);
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        isLoading={banMutation.isPending}
      />
    </div>
  );
}
