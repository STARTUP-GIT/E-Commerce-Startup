"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentMethodApi, PaymentMethodSetting } from '../api/paymentMethodApi';
import { Card, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Dialog } from '@/shared/components/Dialog';
import { useUIStore } from '@/lib/store/uiStore';
import { CreditCard, Plus, Trash2, Edit2, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { useForm } from 'react-hook-form';

export function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodSetting | null>(null);

  // Edit form states
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDisplayOrder, setEditDisplayOrder] = useState(0);
  const [editError, setEditError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: paymentMethodApi.getPaymentMethods,
    staleTime: 2 * 60 * 1000,
  });

  const methods: PaymentMethodSetting[] = data?.paymentMethods ?? [];

  const createForm = useForm({
    defaultValues: { name: '', code: '', description: '', displayOrder: 0, enabled: true },
  });

  const createMutation = useMutation({
    mutationFn: (v: any) => paymentMethodApi.createPaymentMethod(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      showToast('Payment method created successfully.', 'success');
      createForm.reset();
      setShowForm(false);
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      paymentMethodApi.toggleStatus(id, enabled),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      showToast(`Payment method status updated.`, 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      paymentMethodApi.updatePaymentMethod(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      showToast('Payment method updated successfully.', 'success');
      setEditingMethod(null);
    },
    onError: (e: any) => setEditError(e.message || 'Failed to update payment method'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentMethodApi.deletePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      showToast('Payment method removed.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const handleReorder = (method: PaymentMethodSetting, delta: number) => {
    const newOrder = Math.max(0, method.displayOrder + delta);
    updateMutation.mutate({ id: method.id, payload: { displayOrder: newOrder } });
  };

  const openEditModal = (method: PaymentMethodSetting) => {
    setEditingMethod(method);
    setEditName(method.name);
    setEditDescription(method.description || '');
    setEditDisplayOrder(method.displayOrder);
    setEditError(null);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editingMethod || !editName.trim()) return;
    updateMutation.mutate({
      id: editingMethod.id,
      payload: {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        displayOrder: editDisplayOrder,
      },
    });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Payment Methods</h1>
          <p className="text-xs text-white/45 mt-1">
            Globally allow, disallow, and order payment options for customer checkout.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-3.5 w-3.5" /> Add Payment Method
        </Button>
      </div>

      {/* New Method Form */}
      {showForm && (
        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <CardContent className="pt-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Create Payment Method</h3>
            <form
              onSubmit={createForm.handleSubmit((v) => createMutation.mutate(v))}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Method Name
                </label>
                <Input
                  placeholder="e.g. Razorpay, Cash on Delivery"
                  {...createForm.register('name', { required: true })}
                />
              </div>
              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Method Code (Unique Identifier)
                </label>
                <Input
                  placeholder="e.g. RAZORPAY, COD, STRIPE"
                  {...createForm.register('code', { required: true })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2 font-sans">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Description
                </label>
                <Input
                  placeholder="Payment description visible during customer checkout..."
                  {...createForm.register('description')}
                />
              </div>
              <div className="space-y-1.5 font-sans">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Display Order
                </label>
                <Input
                  type="number"
                  placeholder="1"
                  {...createForm.register('displayOrder', { valueAsNumber: true })}
                />
              </div>
              <div className="flex items-end gap-2 justify-end sm:col-span-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" isLoading={createMutation.isPending}>
                  Save Payment Method
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Payment Method Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map((method) => {
            const isAllowed = method.enabled;
            return (
              <Card
                key={method.id}
                className={`border glass-hover ${
                  isAllowed ? 'border-white/8' : 'border-white/3 opacity-60'
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <CreditCard className="h-5 w-5 text-white/40" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-white/90">{method.name}</p>
                          <Badge variant="outline" className="text-[8px] font-mono uppercase px-1 py-0">
                            {method.code}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-white/40 mt-0.5 line-clamp-2">
                          {method.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={isAllowed ? 'success' : 'secondary'} className="text-[8px] shrink-0 font-bold">
                      {isAllowed ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/50 pt-3 border-t border-white/5 mt-3">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="font-semibold text-white/70">Display Order:</span>
                      <span className="font-mono bg-white/5 px-2 py-0.5 rounded text-white font-bold">
                        #{method.displayOrder}
                      </span>
                      <div className="flex gap-1 ml-1">
                        <button
                          onClick={() => handleReorder(method, -1)}
                          className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleReorder(method, 1)}
                          className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant={isAllowed ? 'outline' : 'default'}
                      className="flex-1 text-[10px] font-bold h-8 cursor-pointer"
                      isLoading={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate({ id: method.id, enabled: !isAllowed })}
                    >
                      {isAllowed ? 'Not Allowed' : 'Allowed'}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0 text-white/70 hover:bg-white/10 shrink-0 cursor-pointer"
                      onClick={() => openEditModal(method)}
                      title="Edit payment method"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 shrink-0 cursor-pointer"
                      isLoading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(method.id)}
                      title="Delete payment method"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        isOpen={!!editingMethod}
        onClose={() => setEditingMethod(null)}
        title="Edit Payment Method"
        description={`Update settings for ${editingMethod?.name}`}
      >
        {editError && (
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{editError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/30">System Code (Read Only)</label>
            <Input value={editingMethod?.code || ''} disabled className="opacity-60 bg-white/[0.02]" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">Payment Method Name</label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-xl border border-white/10 bg-[#0c0c10] px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">Display Order Index</label>
            <Input type="number" value={editDisplayOrder} onChange={(e) => setEditDisplayOrder(parseInt(e.target.value) || 0)} />
          </div>

          <Button type="submit" className="w-full font-bold" isLoading={updateMutation.isPending}>
            Update Payment Method
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
