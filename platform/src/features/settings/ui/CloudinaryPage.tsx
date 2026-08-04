"use client";

import React from 'react';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Cloud } from 'lucide-react';

export function CloudinaryPage() {
  const { settings, isLoading, updateStorage } = useSettings();

  const [cloudName, setCloudName] = React.useState('');
  const [apiKey, setApiKey] = React.useState('');
  const [apiSecret, setApiSecret] = React.useState('');

  if (isLoading || !settings) {
    return <Skeleton className="h-72 w-full" />;
  }

  const isActive = settings.storage.provider === 'cloudinary';
  const meta = settings.storage;

  const handleSave = async () => {
    await updateStorage({
      provider: 'cloudinary',
      displayName: 'Cloudinary',
      enabled: true,
      ...(cloudName ? { cloudName } : {}),
      ...(apiKey ? { apiKey } : {}),
      ...(apiSecret ? { apiSecret } : {}),
    });
    setApiSecret('');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Cloudinary"
        description="Configure the Cloudinary media delivery account."
      />

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-white/60" />
              Cloudinary Credentials
            </CardTitle>
            <CardDescription>
              {isActive ? 'Cloudinary is currently the active storage provider.' : 'Cloudinary is not the active provider.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Cloud Name</label>
              <Input value={cloudName} onChange={(e) => setCloudName(e.target.value)} placeholder="your-cloud-name" className="font-mono text-xs" />
              {meta?.cloudName && <p className="text-[10px] text-white/35">Current: {meta.cloudName}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">API Key</label>
              <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="123456789012345" className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">API Secret</label>
              <Input type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} placeholder="••••••••••••" className="font-mono text-xs" />
              <p className="text-[10px] text-white/35">Leave blank to keep the existing secret.</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave}>Save Cloudinary Config</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
