"use client";

import React from 'react';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader, Toggle } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { CreditCard } from 'lucide-react';

export function RazorpayPage() {
  const { settings, isLoading, updateRazorpay } = useSettings();

  const [enabled, setEnabled] = React.useState(false);
  const [keyId, setKeyId] = React.useState('');
  const [keySecret, setKeySecret] = React.useState('');
  const [prevSettings, setPrevSettings] = React.useState(settings?.razorpay);

  if (settings && prevSettings !== settings.razorpay) {
    setPrevSettings(settings.razorpay);
    setEnabled(settings.razorpay.enabled ?? false);
    setKeyId(settings.razorpay.keyId || '');
  }

  if (isLoading || !settings) {
    return <Skeleton className="h-72 w-full" />;
  }

  const handleSave = async () => {
    await updateRazorpay({
      enabled,
      keyId: keyId || undefined,
      ...(keySecret ? { keySecret } : {}),
    });
    setKeySecret('');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Razorpay"
        description="Primary payment gateway configuration."
      />

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-white/60" />
              Gateway Credentials
            </CardTitle>
            <CardDescription>Live keys are used for processing real payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/[0.02]">
              <div>
                <p className="text-xs font-bold text-white/90">Gateway Enabled</p>
                <p className="text-[10px] text-white/40 mt-0.5">Accept Razorpay payments platform-wide.</p>
              </div>
              <Toggle checked={enabled} onChange={setEnabled} label="Enable Razorpay" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Key ID</label>
              <Input value={keyId} onChange={(e) => setKeyId(e.target.value)} placeholder="rzp_live_xxxxxxxxxx" className="font-mono text-xs" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Key Secret</label>
              <Input
                type="password"
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder={settings.razorpay.keySecretMasked || '••••••••••••'}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-white/35">Leave blank to keep the existing secret.</p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/35">
                Current key: {settings.razorpay.keyId || 'not configured'}
              </span>
              <Button onClick={handleSave}>Save Razorpay Config</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
