"use client";

import React from 'react';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader, Toggle } from '@/shared/components/PageHeader';
import { Card, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Mail } from 'lucide-react';

export function EmailProvidersPage() {
  const { settings, isLoading, updateEmailProviders } = useSettings();

  if (isLoading || !settings) {
    return <Skeleton className="h-72 w-full" />;
  }

  const providers = settings.emailProviders;

  const handleToggle = async (provider: string, enabled: boolean) => {
    const next = providers.map((p) => (p.provider === provider ? { ...p, enabled } : p));
    await updateEmailProviders(next);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Email Providers"
        description="Choose how transactional email is delivered."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <Card key={provider.provider}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                  <Mail className="h-5 w-5 text-white/60" />
                </div>
                <Toggle
                  checked={provider.enabled}
                  onChange={(next) => handleToggle(provider.provider, next)}
                  label={`Enable ${provider.displayName}`}
                />
              </div>
              <p className="text-sm font-bold text-white/90 mt-3">{provider.displayName}</p>
              <p className="text-[10px] text-white/40 mt-1">{provider.provider}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
