"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentMethodApi, PaymentMethodSetting } from '../api/paymentMethodApi';
import { Card, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { CreditCard, Plus, Trash2, CheckCircle, XCircle, ArrowUp, ArrowDown } from 'lucide-react';
import { useForm } from 'react-hook-form';

export function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodSetting | null>(null);

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
      showToast(`Payment method ${variables.enabled ? 'allowed' : 'disabled'}.`, 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      paymentMethodApi.updatePaymentMethod(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      showToast('Payment method updated.', 'success');
      setEditingMethod(null);
    },
    onError: (e: any) => showToast(e.message, 'error'),
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

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Payment Methods</h1>
          <p className="text-xs text-white/45 mt-1">
            Globally enable, disable, and order payment options for customer checkout.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {methods.map((method) => {
            const isAllowed = method.enabled;
            return (
              <Card
                key={method.id}
                className={`border transition-all ${
                  isAllowed ? 'border-white/10 glass-hover' : 'border-white/5 bg-white/[0.01] opacity-75'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top Bar: Icon + Name + Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-11 w-11 rounded-xl flex items-center justify-center border ${
                          isAllowed
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-white/5 border-white/10 text-white/40'
                        }`}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-white/90">{method.name}</h3>
                          <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0">
                            {method.code}
                          </Badge>
                        </div>
                        <p className="text-xs text-white/45 mt-0.5 line-clamp-2">
                          {method.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant={isAllowed ? 'success' : 'secondary'}
                      className="text-[9px] shrink-0 font-bold"
                    >
                      {isAllowed ? 'Allowed' : 'Not Allowed'}
                    </Badge>
                  </div>

                  {/* Details Bar: Display order */}
                  <div className="flex items-center justify-between text-xs text-white/50 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-2">
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

                  {/* Actions: Allow / Disable toggle button */}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant={isAllowed ? 'destructive' : 'default'}
                      className="flex-1 text-xs font-bold gap-2 cursor-pointer"
                      isLoading={toggleMutation.isPending}
                      onClick={() => toggleMutation.mutate({ id: method.id, enabled: !isAllowed })}
                    >
                      {isAllowed ? (
                        <>
                          <XCircle className="h-3.5 w-3.5" /> Disable Method
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" /> Allow Payment Method
                        </>
                      )}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9 w-9 p-0 text-red-400 hover:bg-red-500/10 shrink-0 cursor-pointer"
                      isLoading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(method.id)}
                      title="Delete payment method"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
