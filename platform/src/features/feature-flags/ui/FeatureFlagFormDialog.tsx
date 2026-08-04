"use client";

import React, { useEffect } from 'react';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog } from '@/shared/components/Dialog';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { FEATURE_FLAG_TYPES, FEATURE_FLAG_STATUSES, FEATURE_FLAG_SCOPES } from '../types';
import type { FeatureFlag, FeatureFlagPayload } from '../types';

const flagSchema = z.object({
  key: z.string().min(2, 'Key must be at least 2 characters').regex(/^[A-Z0-9_]+$/, 'Use uppercase letters, numbers, and underscores (e.g. BUY_NOW)'),
  type: z.string().min(1, 'Type is required'),
  displayName: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  status: z.string().min(1, 'Status is required'),
  scope: z.string().min(1, 'Scope is required'),
  rolloutPercentage: z.coerce.number().min(0).max(100),
  targetEnvironment: z.string().optional(),
});

type FlagFormValues = z.infer<typeof flagSchema>;

interface FeatureFlagFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: FeatureFlagPayload) => Promise<void>;
  isSubmitting: boolean;
  editingFlag?: FeatureFlag | null;
}

export function FeatureFlagFormDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  editingFlag,
}: FeatureFlagFormDialogProps) {
  const form = useForm<FlagFormValues>({
    resolver: zodResolver(flagSchema) as unknown as Resolver<FlagFormValues>,
    defaultValues: {
      key: '',
      type: 'BUY_NOW',
      displayName: '',
      description: '',
      status: 'DISABLED',
      scope: 'GLOBAL',
      rolloutPercentage: 100,
      targetEnvironment: '',
    },
  });

  useEffect(() => {
    if (editingFlag) {
      form.reset({
        key: editingFlag.key,
        type: editingFlag.type,
        displayName: editingFlag.displayName,
        description: editingFlag.description || '',
        status: editingFlag.status,
        scope: editingFlag.scope,
        rolloutPercentage: editingFlag.rolloutPercentage,
        targetEnvironment: editingFlag.targetEnvironment || '',
      });
    } else {
      form.reset({
        key: '',
        type: 'BUY_NOW',
        displayName: '',
        description: '',
        status: 'DISABLED',
        scope: 'GLOBAL',
        rolloutPercentage: 100,
        targetEnvironment: '',
      });
    }
  }, [editingFlag, isOpen, form]);

  const watchedRollout = useWatch({ control: form.control, name: 'rolloutPercentage' });

  const handleSubmit = async (values: FlagFormValues) => {
    const payload: FeatureFlagPayload = {
      type: values.type as FeatureFlagPayload['type'],
      displayName: values.displayName,
      description: values.description || undefined,
      status: values.status as FeatureFlagPayload['status'],
      scope: values.scope as FeatureFlagPayload['scope'],
      rolloutPercentage: Number(values.rolloutPercentage),
      targetEnvironment: values.targetEnvironment || undefined,
    };
    if (!editingFlag) payload.key = values.key;
    await onSubmit(payload);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={editingFlag ? `Edit ${editingFlag.key}` : 'Create Feature Flag'}
      description="Feature flags gate functionality across the entire platform."
    >
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Key</label>
            <Input
              placeholder="BUY_NOW"
              error={!!form.formState.errors.key}
              disabled={!!editingFlag}
              className="font-mono text-xs uppercase"
              {...form.register('key')}
            />
            {form.formState.errors.key && (
              <p className="text-[10px] font-semibold text-red-400">{form.formState.errors.key.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Type</label>
            <select
              className="glass-input h-10 w-full rounded-xl px-3 text-xs text-white/80"
              {...form.register('type')}
            >
              {FEATURE_FLAG_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Display Name</label>
          <Input
            placeholder="Buy Now"
            error={!!form.formState.errors.displayName}
            {...form.register('displayName')}
          />
          {form.formState.errors.displayName && (
            <p className="text-[10px] font-semibold text-red-400">{form.formState.errors.displayName.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Description</label>
          <textarea
            rows={3}
            className="glass-input w-full rounded-xl px-3 py-2 text-xs text-white/80 resize-none"
            placeholder="What does this flag control?"
            {...form.register('description')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Status</label>
            <select className="glass-input h-10 w-full rounded-xl px-3 text-xs text-white/80" {...form.register('status')}>
              {FEATURE_FLAG_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Scope</label>
            <select className="glass-input h-10 w-full rounded-xl px-3 text-xs text-white/80" {...form.register('scope')}>
              {FEATURE_FLAG_SCOPES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
              Rollout ({Number(watchedRollout) || 0}%)
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              error={!!form.formState.errors.rolloutPercentage}
              {...form.register('rolloutPercentage')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Target Environment</label>
            <Input
              placeholder="production, staging, ..."
              {...form.register('targetEnvironment')}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting}>
            {editingFlag ? 'Save Changes' : 'Create Flag'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
