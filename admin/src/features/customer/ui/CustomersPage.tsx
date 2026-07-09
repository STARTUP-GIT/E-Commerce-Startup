"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Search, ShieldOff, ShieldCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { ReasonModal } from '@/shared/components/ReasonModal';
import { useRouter } from 'next/navigation';

export function CustomersPage() {
  const [search, setSearch] = useState('');
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

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, page }],
    queryFn: () => customerApi.getCustomers({ search, page, limit: 20 }),
    staleTime: 30 * 1000,
  });

  const customers = data?.customers ?? data?.data ?? [];
  const total = data?.total ?? 0;

  const banMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => customerApi.banCustomer(id, reason),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); showToast('Customer banned.', 'info'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const unbanMutation = useMutation({
    mutationFn: (id: string) => customerApi.unbanCustomer(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customers'] }); showToast('Customer unbanned.', 'success'); },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Customers</h1>
          <p className="text-xs text-white/45 mt-1">Manage customer accounts and access</p>
        </div>
        <div className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-semibold">
          {total} total customers
        </div>
      </div>

      <Card className="border border-white/5 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
          <Input
            placeholder="Search by name, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
      </Card>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Customer Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No customers found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer: any) => (
                  <TableRow
                    key={customer.id}
                    className="cursor-pointer hover:bg-white/[0.02] focus:bg-white/[0.02] focus:outline-none transition-colors"
                    onClick={() => router.push(`/customers/${customer.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        router.push(`/customers/${customer.id}`);
                      }
                    }}
                    tabIndex={0}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/60 shrink-0">
                          {customer.firstName?.[0] ?? customer.email?.[0] ?? 'C'}
                        </div>
                        <p className="text-xs font-bold text-white/90">{customer.firstName} {customer.lastName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-white/60">{customer.email}</TableCell>
                    <TableCell>
                      <Badge variant={customer.isBanned ? 'destructive' : customer.isDeactivated ? 'warning' : 'success'} className="text-[8px]">
                        {customer.isBanned ? 'Banned' : customer.isDeactivated ? 'Deactivated' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                     <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {customer.isBanned ? (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-400 hover:bg-emerald-500/10" isLoading={unbanMutation.isPending} onClick={(e) => { e.stopPropagation(); unbanMutation.mutate(customer.id); }}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-orange-400 hover:bg-orange-500/10" isLoading={banMutation.isPending} onClick={(e) => {
                            e.stopPropagation();
                            setModalConfig({
                              isOpen: true,
                              title: 'Ban Customer Account',
                              description: `Are you sure you want to ban the customer account for "${customer.firstName} ${customer.lastName}"? Banning this customer will immediately disable their login access and cancel any of their active non-shipped orders.`,
                              action: 'Ban',
                              target: `${customer.firstName} ${customer.lastName}`,
                              onConfirm: (reason) => banMutation.mutate({ id: customer.id, reason }),
                            });
                          }}>
                            <ShieldOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Link href={`/customers/${customer.id}`} onClick={(e) => e.stopPropagation()} className="h-7 px-2 text-white/40 hover:text-white/80 transition-colors flex items-center">
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

      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="text-xs text-white/40">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={customers.length < 20}>Next</Button>
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
