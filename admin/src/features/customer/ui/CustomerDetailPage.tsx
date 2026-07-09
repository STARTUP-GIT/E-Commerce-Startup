"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from '../api/customerApi';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { 
  User, Mail, Calendar, ShieldAlert, ShieldCheck, ShieldOff, 
  Trash2, ArrowLeft, RotateCcw, AlertTriangle, CreditCard, ShoppingBag, MapPin
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { formatPrice } from '@/shared/utils/format';
import { ReasonModal } from '@/shared/components/ReasonModal';

export function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const customerId = String(id);
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

  // Queries
  const { data: customerData, isLoading: isLoadingCustomer, isError } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: () => customerApi.getCustomer(customerId),
    enabled: !!customerId,
  });

  const { data: ordersData, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: () => customerApi.getCustomerOrders(customerId),
    enabled: !!customerId,
  });

  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['customer-payments', customerId],
    queryFn: () => customerApi.getCustomerPayments(customerId),
    enabled: !!customerId,
  });

  const customer = customerData?.customer;
  const orders = ordersData?.orders ?? [];
  const payments = paymentsData?.payments ?? [];

  // Mutations
  const banMutation = useMutation({
    mutationFn: (reason: string) => customerApi.banCustomer(customerId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] });
      showToast('Customer account banned.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const unbanMutation = useMutation({
    mutationFn: () => customerApi.unbanCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-detail', customerId] });
      showToast('Customer account unbanned.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (reason: string) => customerApi.deleteCustomer(customerId, reason),
    onSuccess: () => {
      showToast('Customer account soft-deleted successfully.', 'info');
      router.push('/customers');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  if (isLoadingCustomer) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (isError || !customer) {
    return (
      <div className="text-center py-16 space-y-4">
        <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
        <h3 className="text-lg font-bold text-white">Customer Account Not Found</h3>
        <Button variant="outline" size="sm" onClick={() => router.push('/customers')}>
          Back to Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/customers')}
            className="p-2 rounded-xl glass hover:bg-white/[0.05] border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white/95">
                {customer.firstName} {customer.lastName}
              </h1>
              <Badge variant={customer.isBanned ? 'destructive' : customer.isDeactivated ? 'warning' : 'success'} className="text-[9px] px-2 py-0.5 font-bold">
                {customer.isBanned ? 'Banned' : customer.isDeactivated ? 'Deactivated' : 'Active'}
              </Badge>
            </div>
            <p className="text-xs text-white/45 mt-1">Customer ID: {customer.id}</p>
          </div>
        </div>

        {/* Administration Actions Panel */}
        <div className="flex items-center gap-2 flex-wrap">
          {customer.isBanned ? (
            <Button
              size="sm"
              variant="default"
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 text-xs"
              isLoading={unbanMutation.isPending}
              onClick={() => {
                showConfirm({
                  title: 'Unban Customer Account',
                  message: 'Are you sure you want to restore access for this customer?',
                  confirmText: 'Unban Account',
                  onConfirm: () => unbanMutation.mutate(),
                });
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore Access
            </Button>
          ) : (
            <Button
              size="sm"
              variant="destructive"
              className="h-9 text-xs"
              isLoading={banMutation.isPending}
              onClick={() => {
                setModalConfig({
                  isOpen: true,
                  title: 'Ban Customer Account',
                  description: 'CRITICAL: Banning this customer will immediately disable their login access and cancel any of their active non-shipped orders.',
                  action: 'Ban',
                  target: `${customer.firstName} ${customer.lastName}`,
                  onConfirm: (reason) => banMutation.mutate(reason),
                });
              }}
            >
              <ShieldOff className="h-3.5 w-3.5 mr-1.5" /> Ban Account
            </Button>
          )}

          <Button
            size="sm"
            variant="destructive"
            className="h-9 text-xs bg-red-950/20 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 text-red-400"
            isLoading={deleteMutation.isPending}
            onClick={() => {
              setModalConfig({
                isOpen: true,
                title: 'Delete Customer Profile',
                description: 'WARNING: This will soft-delete this customer profile permanently. This action cannot be easily undone.',
                action: 'Delete',
                target: `${customer.firstName} ${customer.lastName}`,
                onConfirm: (reason) => deleteMutation.mutate(reason),
              });
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Account
          </Button>
        </div>
      </div>

      {customer.isBanned && customer.banReason && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-bold text-red-400">Account Banned</h5>
              <p className="text-[11px] text-white/60 mt-1">Reason: "{customer.banReason}"</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="border border-white/5 bg-white/[0.01] lg:col-span-2">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block font-bold uppercase tracking-wider">Full Name</span>
                  <span className="text-xs font-bold text-white/90">{customer.firstName} {customer.lastName}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block font-bold uppercase tracking-wider">Email Address</span>
                  <span className="text-xs font-semibold text-white/90">{customer.email}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block font-bold uppercase tracking-wider">Date Joined</span>
                  <span className="text-xs font-semibold text-white/90">
                    {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : '—'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] text-white/40 block font-bold uppercase tracking-wider">Email Verification</span>
                  <span className="text-xs font-bold text-white/90">
                    {customer.emailVerified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Addresses Box */}
        <Card className="border border-white/5 bg-white/[0.01]">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Linked Addresses</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 overflow-y-auto max-h-[220px] space-y-3">
            {customer.addresses && customer.addresses.length > 0 ? (
              customer.addresses.map((address: any) => (
                <div key={address.id} className="p-3 rounded-lg border border-white/5 bg-white/[0.01] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/80">{address.contactName ?? address.fullName}</span>
                    <span className="text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/40">{address.type ?? 'Home'}</span>
                  </div>
                  <p className="text-[10px] text-white/50 leading-relaxed">
                    {address.addressLine1}, {address.addressLine2 ? `${address.addressLine2}, ` : ''}
                    {address.city}, {address.state} - {address.postalCode}
                  </p>
                  <p className="text-[9px] text-white/35 font-medium">Phone: {address.phone}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-white/20 text-xs">No addresses linked</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Orders & Payments History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders Table */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Order History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingOrders ? (
              <div className="p-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10 text-white/20 text-xs">No orders placed yet</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id} className="cursor-pointer" onClick={() => router.push(`/orders/${order.id}`)}>
                      <TableCell className="font-bold text-white/90 text-xs">{order.orderNumber}</TableCell>
                      <TableCell className="text-xs text-white/80 font-semibold">{formatPrice(order.grandTotal)}</TableCell>
                      <TableCell>
                        <Badge variant={order.status === 'DELIVERED' ? 'success' : order.status === 'CANCELLED' ? 'destructive' : 'warning'} className="text-[7px]">
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-white/40">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card className="border border-white/5">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Payment logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoadingPayments ? (
              <div className="p-4 space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : payments.length === 0 ? (
              <div className="text-center py-10 text-white/20 text-xs">No transaction logs found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-white/50">{p.id?.slice(0, 12)}...</TableCell>
                      <TableCell className="text-xs text-white/90 font-semibold">{formatPrice(p.amount)}</TableCell>
                      <TableCell className="text-xs text-white/60">{p.method ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'SUCCESS' ? 'success' : p.status === 'FAILED' ? 'destructive' : 'warning'} className="text-[7px]">
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
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
        isLoading={banMutation.isPending || deleteMutation.isPending}
      />
    </div>
  );
}
