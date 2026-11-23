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
import { 
  Search, 
  ShieldOff, 
  ShieldCheck, 
  ExternalLink, 
  AlertTriangle, 
  RotateCcw, 
  Store, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import Link from 'next/link';
import { ReasonModal } from '@/shared/components/ReasonModal';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['sellers', { search, status: statusFilter, page }],
    queryFn: () => sellerApi.getSellers({ search, status: statusFilter || undefined, page, limit: 20 }),
    staleTime: 30 * 1000,
    retry: 2,
  });

  const sellers = data?.sellers ?? data?.data ?? [];
  const total = data?.pagination?.total ?? data?.total ?? (Array.isArray(sellers) ? sellers.length : 0);
  const totalPages = data?.pagination?.pages ?? Math.max(1, Math.ceil(total / 20));

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => sellerApi.banSeller(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      showToast('Seller banned.', 'info');
    },
    onError: (e: any) => showToast(e.message || 'Failed to ban seller', 'error'),
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => sellerApi.unbanSeller(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      showToast('Seller unbanned.', 'success');
    },
    onError: (e: any) => showToast(e.message || 'Failed to unban seller', 'error'),
  });

  const statuses = ['', 'ACTIVE', 'DISABLED', 'BANNED'];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Sellers</h1>
          <p className="text-xs text-white/45 mt-1">Manage seller registrations, shops, approvals, and statuses</p>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-28 rounded-xl" />
        ) : isError ? (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 font-medium flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Connection error</span>
          </div>
        ) : (
          <div className="text-xs text-white/60 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-2 font-semibold">
            <span className="text-white font-bold">{total}</span> total seller{total === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="border border-white/5 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <Input
              placeholder="Search by name, email, phone, shop..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
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
                {s || 'All Statuses'}
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
          ) : isError ? (
            <div className="p-10 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Failed to load seller directory</p>
                <p className="text-xs text-white/50 max-w-md mx-auto">
                  {(error as any)?.response?.data?.message || (error as any)?.message || 'An error occurred while communicating with the seller management API.'}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 mx-auto">
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </Button>
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-16 text-white/40 text-sm">
              {search || statusFilter ? 'No sellers match your filter criteria' : 'No sellers registered in the platform yet'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Shop</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller: any) => (
                  <TableRow
                    key={seller.id}
                    className="cursor-pointer hover:bg-white/[0.02] focus:bg-white/[0.02] focus:outline-none transition-colors"
                    onClick={() => router.push(`/sellers/${seller.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/sellers/${seller.id}`);
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/70 shrink-0">
                          {seller.firstName?.[0] ?? seller.username?.[0] ?? 'S'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/95">
                            {seller.firstName} {seller.lastName}
                          </p>
                          <p className="text-[10px] text-white/40 font-mono">@{seller.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-white/70">
                          <Mail className="h-3 w-3 text-white/30 shrink-0" />
                          <span>{seller.email}</span>
                        </div>
                        {seller.phone && (
                          <div className="flex items-center gap-1.5 text-[11px] text-white/40 font-mono">
                            <Phone className="h-3 w-3 text-white/30 shrink-0" />
                            <span>{seller.phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {seller.shop ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-white/90 font-medium">
                            <Store className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span>{seller.shop.name}</span>
                          </div>
                          {seller.shop.status && (
                            <span className="inline-block text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-white/50">
                              {seller.shop.status}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center text-[10px] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium">
                          No Shop
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[seller.status] ?? 'outline'} className="text-[9px]">
                        {seller.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {seller.createdAt ? new Date(seller.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {seller.status === 'ACTIVE' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                            isLoading={banMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalConfig({
                                isOpen: true,
                                title: 'Ban Seller Account',
                                description: `Are you sure you want to ban the seller account for "${seller.firstName} ${seller.lastName}"? Banning this seller will also disable all shops and products linked to them.`,
                                action: 'Ban',
                                target: `${seller.firstName} ${seller.lastName}`,
                                onConfirm: (reason) => banMutation.mutate({ id: seller.id, reason }),
                              });
                            }}
                            title="Ban Seller"
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
                            onClick={(e) => { e.stopPropagation(); unbanMutation.mutate(seller.id); }}
                            title="Unban Seller"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Link
                          href={`/sellers/${seller.id}`}
                          onClick={(e) => e.stopPropagation()}
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
      {total > 20 && !isError && (
        <div className="flex items-center justify-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage((p) => Math.max(1, p - 1))} 
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <span className="text-xs text-white/40">
            Page {page} of {totalPages}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage((p) => p + 1)} 
            disabled={page >= totalPages || sellers.length < 20 || isLoading}
          >
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
