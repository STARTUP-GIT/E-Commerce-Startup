"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Store } from 'lucide-react';

interface MarketplaceForm {
  marketplaceName: string;
  currency: string;
  taxRate: number;
  timezone: string;
  language: string;
  country: string;
  defaultCommission: number;
  maximumUploadSizeMb: number;
  maximumProductImages: number;
  maintenanceMessage: string;
  supportEmail: string;
  supportPhone: string;
}

export function MarketplacePage() {
  const { settings, isLoading, updateMarketplace } = useSettings();
  const form = useForm<MarketplaceForm>();

  React.useEffect(() => {
    if (settings) form.reset(settings.marketplace);
  }, [settings, form]);

  if (isLoading || !settings) {
    return <Skeleton className="h-72 w-full" />;
  }

  const handleSubmit = async (values: MarketplaceForm) => {
    await updateMarketplace(values);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Marketplace Configuration"
        description="Core identity and defaults for the entire marketplace."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-4 w-4 text-white/60" />
            Marketplace Details
          </CardTitle>
          <CardDescription>These values apply platform-wide.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Marketplace Name" error={!!form.formState.errors.marketplaceName}>
                <Input placeholder="Aura Marketplace" {...form.register('marketplaceName')} />
              </Field>
              <Field label="Currency">
                <Input placeholder="INR" {...form.register('currency')} />
              </Field>
              <Field label="Tax Rate (%)" error={!!form.formState.errors.taxRate}>
                <Input type="number" step="0.1" {...form.register('taxRate', { valueAsNumber: true })} />
              </Field>
              <Field label="Timezone">
                <Input placeholder="Asia/Kolkata" {...form.register('timezone')} />
              </Field>
              <Field label="Language">
                <Input placeholder="en" {...form.register('language')} />
              </Field>
              <Field label="Country">
                <Input placeholder="IN" {...form.register('country')} />
              </Field>
              <Field label="Default Commission (%)">
                <Input type="number" step="0.1" {...form.register('defaultCommission', { valueAsNumber: true })} />
              </Field>
              <Field label="Max Upload Size (MB)">
                <Input type="number" {...form.register('maximumUploadSizeMb', { valueAsNumber: true })} />
              </Field>
              <Field label="Max Product Images">
                <Input type="number" {...form.register('maximumProductImages', { valueAsNumber: true })} />
              </Field>
              <Field label="Support Email">
                <Input type="email" {...form.register('supportEmail')} />
              </Field>
              <Field label="Support Phone">
                <Input {...form.register('supportPhone')} />
              </Field>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Default Maintenance Message
                </label>
                <Input {...form.register('maintenanceMessage')} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Save Marketplace Config</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">{label}</label>
      {children}
      {error && <p className="text-[10px] font-semibold text-red-400">This field is required.</p>}
    </div>
  );
}
