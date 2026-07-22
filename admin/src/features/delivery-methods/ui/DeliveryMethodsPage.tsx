'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryMethodApi, DeliveryMethodSetting } from '../api/deliveryMethodApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Dialog } from '@/shared/components/Dialog';
import { Truck, Plus, CheckCircle, XCircle, AlertTriangle, ArrowUpDown, Trash2, Edit2, ShieldAlert } from 'lucide-react';

export function DeliveryMethodsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editMethod, setEditMethod] = useState<DeliveryMethodSetting | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);

  // Warning Modal for disabling a method in active use
  const [warningMethod, setWarningMethod] = useState<DeliveryMethodSetting | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['delivery-methods-admin'],
    queryFn: deliveryMethodApi.getDeliveryMethods,
    staleTime: 10 * 1000,
  });

  const deliveryMethods = data?.deliveryMethods || [];

  // Toggle Mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      deliveryMethodApi.toggleStatus(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-methods-admin'] });
    },
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: deliveryMethodApi.createDeliveryMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-methods-admin'] });
      setCreateOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to create delivery method');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      deliveryMethodApi.updateDeliveryMethod(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-methods-admin'] });
      setEditMethod(null);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message || err?.message || 'Failed to update delivery method');
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: deliveryMethodApi.deleteDeliveryMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-methods-admin'] });
    },
  });

  const resetForm = () => {
    setName('');
    setCode('');
    setDescription('');
    setDisplayOrder(0);
    setFormError(null);
  };

  const handleToggleClick = (method: DeliveryMethodSetting) => {
    const nextState = !method.enabled;
    // If disabling and active products are using it -> show warning modal
    if (!nextState && (method.activeProductCount || 0) > 0) {
      setWarningMethod(method);
      return;
    }

    toggleMutation.mutate({ id: method.id, enabled: nextState });
  };

  const handleConfirmDisable = () => {
    if (warningMethod) {
      toggleMutation.mutate({ id: warningMethod.id, enabled: false });
      setWarningMethod(null);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!name.trim() || !code.trim()) {
      setFormError('Name and Code are required');
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      code: code.trim(),
      description: description.trim() || undefined,
      displayOrder,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!editMethod || !name.trim()) return;
    updateMutation.mutate({
      id: editMethod.id,
      payload: {
        name: name.trim(),
        description: description.trim() || undefined,
        displayOrder,
      },
    });
  };

  const openEditModal = (method: DeliveryMethodSetting) => {
    setEditMethod(method);
    setName(method.name);
    setCode(method.code);
    setDescription(method.description || '');
    setDisplayOrder(method.displayOrder);
    setFormError(null);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Title Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Delivery Methods Management</h1>
          <p className="text-xs text-white/45 mt-1">Control global delivery availability for sellers and customer checkout</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }} className="font-bold shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          Add Delivery Method
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : deliveryMethods.length === 0 ? (
        <div className="text-center py-16 bg-white/[0.01] border border-white/5 rounded-xl space-y-3">
          <Truck className="mx-auto h-10 w-10 text-white/20" />
          <p className="text-sm font-semibold text-white/40">No delivery methods registered yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliveryMethods.map((method) => {
            const isAllowed = method.enabled;
            const activeCount = method.activeProductCount || 0;

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
                        <Truck className="h-5 w-5 text-white/40" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-white/90">{method.name}</p>
                          <Badge variant="outline" className="text-[8px] font-mono uppercase px-1 py-0">
                            {method.code}
                          </Badge>
                          {activeCount > 0 && (
                            <Badge variant="secondary" className="text-[8px] font-semibold text-purple-300">
                              {activeCount} active product{activeCount > 1 ? 's' : ''}
                            </Badge>
                          )}
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
                      <ArrowUpDown className="h-3 w-3 text-white/40" />
                      <span>Display Order: <strong className="text-white/80">#{method.displayOrder}</strong></span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(method)}
                      className="text-[10px] h-8 border-white/10 px-2.5"
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant={isAllowed ? 'outline' : 'default'}
                      className="flex-1 text-[10px] font-bold h-8 cursor-pointer"
                      isLoading={toggleMutation.isPending}
                      onClick={() => handleToggleClick(method)}
                    >
                      {isAllowed ? 'Disable' : 'Allow'}
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 shrink-0 cursor-pointer"
                      isLoading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(method.id)}
                      title="Delete delivery method"
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

      {/* Active Product Usage Warning Modal */}
      <Dialog
        isOpen={!!warningMethod}
        onClose={() => setWarningMethod(null)}
        title="Warning: Active Products Affected"
        description="Review product usage before disabling this delivery method"
      >
        <div className="space-y-4 pt-1">
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300 space-y-1">
              <p className="font-bold text-amber-200">
                Delivery method &quot;{warningMethod?.name}&quot; is currently assigned to {warningMethod?.activeProductCount} active catalog product(s).
              </p>
              <p className="leading-relaxed opacity-90">
                Disabling it will prevent sellers from selecting it for new or updated products. Existing active products will retain their setting, and existing completed orders will remain unchanged.
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setWarningMethod(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDisable} className="flex-1 font-bold">
              Confirm & Disable
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Create Dialog */}
      <Dialog
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); resetForm(); }}
        title="Add New Delivery Method"
        description="Register a new delivery method code for global platform configuration"
      >
        {formError && (
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">Delivery Method Name</label>
            <Input placeholder="e.g. Express Courier Delivery" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">System Identifier Code (UPPERCASE)</label>
            <Input placeholder="e.g. EXPRESS_DELIVERY" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">Description (Optional)</label>
            <textarea
              placeholder="Provide a summary of how this delivery mode operates..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-xl border border-white/10 bg-[#0c0c10] px-3 py-2 text-xs text-white/80 placeholder:text-white/20 focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">Display Order Index</label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} />
          </div>

          <Button type="submit" className="w-full font-bold" isLoading={createMutation.isPending}>
            Create Delivery Method
          </Button>
        </form>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        isOpen={!!editMethod}
        onClose={() => { setEditMethod(null); resetForm(); }}
        title="Edit Delivery Method"
        description={`Update settings for ${editMethod?.name}`}
      >
        {formError && (
          <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/30">System Identifier Code (Read Only)</label>
            <Input value={code} disabled className="opacity-60 bg-white/[0.02]" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">Delivery Method Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="flex w-full rounded-xl border border-white/10 bg-[#0c0c10] px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-white/30 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60">Display Order Index</label>
            <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)} />
          </div>

          <Button type="submit" className="w-full font-bold" isLoading={updateMutation.isPending}>
            Update Delivery Method
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
