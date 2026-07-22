"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryMethodApi, DeliveryMethodSetting } from '../api/deliveryMethodApi';
import { Card, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { Truck, Store, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

export function DeliveryMethodsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-methods-admin'],
    queryFn: deliveryMethodApi.getDeliveryMethods,
    staleTime: 2 * 60 * 1000,
  });

  const methods: DeliveryMethodSetting[] = data?.deliveryMethods || [];

  const createForm = useForm({
    defaultValues: { name: '', code: '', description: '' },
  });

  const createMutation = useMutation({
    mutationFn: (v: any) => deliveryMethodApi.createDeliveryMethod(v),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-methods-admin'] });
      showToast('Custom delivery method added successfully.', 'success');
      createForm.reset();
      setShowForm(false);
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      deliveryMethodApi.toggleStatus(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-methods-admin'] });
      showToast('Delivery method status updated.', 'success');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deliveryMethodApi.deleteDeliveryMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-methods-admin'] });
      showToast('Custom delivery method removed.', 'info');
    },
    onError: (e: any) => showToast(e.message, 'error'),
  });

  const getMethodIcon = (code: string) => {
    const upperCode = code.toUpperCase();
    if (upperCode === 'SELLER_DELIVERY' || upperCode === 'SELF_DELIVERY') {
      return <Store className="h-5 w-5 text-white/40" />;
    }
    return <Truck className="h-5 w-5 text-white/40" />;
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Delivery Methods</h1>
          <p className="text-xs text-white/45 mt-1">
            Globally allow or disallow delivery modes for sellers and customer checkout
          </p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-3.5 w-3.5" /> Add Delivery Method
        </Button>
      </div>

      {/* Optional Custom Delivery Method Form (Hidden by default) */}
      {showForm && (
        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-md">
          <CardContent className="pt-4">
            <form
              onSubmit={createForm.handleSubmit((v) =>
                createMutation.mutate({
                  ...v,
                  code: v.code.toUpperCase().trim(),
                })
              )}
              className="flex flex-col sm:flex-row gap-3 items-end"
            >
              <div className="space-y-1.5 flex-1 font-sans w-full">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Delivery Method Name
                </label>
                <Input
                  placeholder="e.g. Express Drone Delivery"
                  {...createForm.register('name', { required: true })}
                />
              </div>
              <div className="space-y-1.5 flex-1 font-sans w-full">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  System Identifier Code
                </label>
                <Input
                  placeholder="e.g. DRONE_DELIVERY"
                  {...createForm.register('code', { required: true })}
                />
              </div>
              <Button type="submit" isLoading={createMutation.isPending} className="w-full sm:w-auto">
                Add Method
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Delivery Method Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {methods.map((method) => {
            const isAllowed = method.enabled;
            const isCustom = ![
              'PORTAL_DELIVERY',
              'SELLER_DELIVERY',
              'SELF_DELIVERY',
            ].includes(method.code.toUpperCase());

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
                        {getMethodIcon(method.code)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white/90">{method.name}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {method.description || (method.code.toUpperCase().includes('SELLER') ? 'Delivered directly by seller' : 'Delivered using Aura logistics')}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={isAllowed ? 'success' : 'secondary'}
                      className="text-[8px] shrink-0 font-bold"
                    >
                      {isAllowed ? 'ACTIVE' : 'INACTIVE'}
                    </Badge>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant={isAllowed ? 'outline' : 'default'}
                      className="flex-1 text-[10px] font-bold h-8 cursor-pointer"
                      isLoading={toggleMutation.isPending}
                      onClick={() =>
                        toggleMutation.mutate({ id: method.id, enabled: !isAllowed })
                      }
                    >
                      {isAllowed ? 'Not Allowed' : 'Allow'}
                    </Button>

                    {isCustom && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 shrink-0 cursor-pointer"
                        isLoading={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(method.id)}
                        title="Delete custom delivery method"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
