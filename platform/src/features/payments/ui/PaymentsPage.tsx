"use client";

import { useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { CreditCard, Landmark, ShieldCheck } from 'lucide-react';

export function PaymentsPage() {
  const { settings, isLoading, updateRazorpay } = useSettings();
  const [keyId, setKeyId] = useState('');
  const [keySecret, setKeySecret] = useState('');
  const [saving, setSaving] = useState(false);

  if (isLoading || !settings) {
    return <Skeleton className="h-72 w-full" />;
  }

  const activeProviders = settings.paymentProviders.filter((p) => p.enabled);
  const razorpay = settings.razorpay;
  const effectiveKeyId = keyId || razorpay.keyId || '';

  const handleRazorpay = async () => {
    setSaving(true);
    try {
      await updateRazorpay({
        enabled: true,
        keyId: keyId.trim() || undefined,
        keySecret: keySecret.trim() || undefined,
      });
      setKeySecret('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Payments"
        description="Consolidated payment gateway configuration."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-white/60" />
              Enabled Providers
            </CardTitle>
            <CardDescription>Gateways currently active on the marketplace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeProviders.length === 0 ? (
              <p className="text-xs text-white/40 py-4 text-center">No payment providers enabled.</p>
            ) : (
              activeProviders.map((provider) => (
                <div
                  key={provider.provider}
                  className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <p className="text-xs font-bold text-white/80">{provider.displayName}</p>
                  <Badge variant="success" className="text-[9px]">ACTIVE</Badge>
                </div>
              ))
            )}
            <p className="text-[10px] text-white/35 pt-1">
              Manage availability under Configuration → Payment Providers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-white/60" />
              Razorpay Gateway
            </CardTitle>
            <CardDescription>
              Primary payment gateway for processing marketplace transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <div className="flex-1">
                <p className="text-xs font-bold text-white/80">
                  {razorpay.enabled ? 'Configured & active' : 'Not configured'}
                </p>
                <p className="text-[10px] text-white/40 mt-0.5">
                  {razorpay.keyId ? `Key ID: ${razorpay.keyId}` : 'No key ID set'}
                  {razorpay.keySecretMasked ? ' • Secret stored' : ''}
                </p>
              </div>
              <Badge variant={razorpay.enabled ? 'success' : 'warning'}>
                {razorpay.enabled ? 'ENABLED' : 'DISABLED'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Key ID</label>
                <Input value={effectiveKeyId} onChange={(e) => setKeyId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Key Secret</label>
                <Input
                  type="password"
                  placeholder={razorpay.keySecretMasked ? '•••••••• (leave empty to keep)' : 'Enter key secret'}
                  value={keySecret}
                  onChange={(e) => setKeySecret(e.target.value)}
                />
              </div>
            </div>

            <Button onClick={handleRazorpay} className="w-full gap-2" isLoading={saving}>
              <CreditCard className="h-4 w-4" />
              Save Gateway
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
