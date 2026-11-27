"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { Search, ShieldOff, ShieldCheck, ExternalLink, MapPin, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ReasonModal } from '@/shared/components/ReasonModal';
import { useRouter } from 'next/navigation';
import { LocationFilterBar } from '@/shared/components/LocationFilterBar';

export function CustomersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
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

  const isUnassigned = selectedState === 'UNASSIGNED';

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, status: statusFilter, state: selectedState, district: selectedDistrict, page }],
    queryFn: () =>
      customerApi.getCustomers({
        search: search || undefined,
        status: statusFilter && statusFilter !== 'ALL' ? statusFilter : undefined,
        state: isUnassigned ? 'UNASSIGNED' : selectedState || undefined,
        district: !isUnassigned && selectedDistrict ? selectedDistrict : undefined,
        unassigned: isUnassigned ? true : undefined,
        page,
        limit: 20,
      }),
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

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => customerApi.deleteCustomer(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      showToast('Customer deleted successfully.', 'info');
    },
    onError: (e: any) => showToast(e?.response?.data?.message || e.message || 'Failed to delete customer', 'error'),
  });

  const statusOptions = [
    { label: 'All Active Statuses', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Banned', value: 'BANNED' },
    { label: 'Deleted / Archived', value: 'DELETED' },
  ];

  const handleClearAll = () => {
    setSearch('');
    setStatusFilter('');
    setSelectedState('');
    setSelectedDistrict('');
    setPage(1);
  };

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
        <LocationFilterBar
          search={search}
          onSearchChange={(val) => { setSearch(val); setPage(1); }}
          searchPlaceholder="Search by name, email, username..."
          state={selectedState}
          onStateChange={(val) => { setSelectedState(val); setPage(1); }}
          district={selectedDistrict}
          onDistrictChange={(val) => { setSelectedDistrict(val); setPage(1); }}
          status={statusFilter}
          onStatusChange={(val) => { setStatusFilter(val); setPage(1); }}
          statusOptions={statusOptions}
          onClearAll={handleClearAll}
        />
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
                  <TableHead>Location</TableHead>
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
                        <div className="h-8 w-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/70">
                          {customer.firstName?.[0] ?? customer.username?.[0] ?? 'C'}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white/95">
                            {customer.firstName || customer.lastName
                              ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
                              : customer.username}
                          </p>
                          <p className="text-[10px] text-white/40 font-mono">@{customer.username}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-white/70">{customer.email}</TableCell>
                    <TableCell>
                      {(() => {
                        const addr = customer.addresses?.[0];
                        if (!addr?.state) {
                          return <span className="text-[10px] text-amber-400/80 italic">Location not set</span>;
                        }
                        return (
                          <div className="flex items-center gap-1.5 text-xs text-white/80">
                            <MapPin className="h-3 w-3 text-white/40 shrink-0" />
                            <span>{addr.state}{addr.district || addr.city ? ` • ${addr.district || addr.city}` : ''}</span>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={customer.isBanned ? 'destructive' : 'success'} className="text-[9px]">
                        {customer.isBanned ? 'BANNED' : 'ACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/40">
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {customer.isBanned ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 text-xs"
                            isLoading={unbanMutation.isPending}
                            onClick={() => unbanMutation.mutate(customer.id)}
                          >
                            <ShieldCheck className="h-3 w-3 mr-1" /> Unban
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 text-xs"
                            isLoading={banMutation.isPending}
                            onClick={() =>
                              setModalConfig({
                                isOpen: true,
                                title: 'Ban Customer',
                                description: `Are you sure you want to ban ${customer.username}? They will lose access to orders and services.`,
                                action: 'Ban Customer',
                                target: customer.id,
                                onConfirm: (reason) => banMutation.mutate({ id: customer.id, reason }),
                              })
                            }
                          >
                            <ShieldOff className="h-3 w-3 mr-1" /> Ban
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs"
                          isLoading={deleteMutation.isPending}
                          onClick={() =>
                            setModalConfig({
                              isOpen: true,
                              title: 'Delete Customer Account',
                              description: `Are you sure you want to delete the customer account for "${customer.username}"? Their account will be deactivated and active sessions revoked. Historical orders will be preserved.`,
                              action: 'Delete Customer',
                              target: customer.username,
                              onConfirm: (reason) => deleteMutation.mutate({ id: customer.id, reason }),
                            })
                          }
                          title="Delete Customer"
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Delete
                        </Button>
                        <Link
                          href={`/customers/${customer.id}`}
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

      <ReasonModal
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        description={modalConfig.description}
        action={modalConfig.action}
        target={modalConfig.target}
      />
    </div>
  );
}
