"use client";

import React from 'react';
import { useSettings } from '@/hooks/useSettings';
import { PageHeader, Toggle } from '@/shared/components/PageHeader';
import { Card, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Database } from 'lucide-react';

const STORAGE_OPTIONS = [
  { provider: 'cloudinary', displayName: 'Cloudinary', description: 'Cloud image and video delivery.' },
  { provider: 'aws_s3', displayName: 'AWS S3', description: 'Amazon Simple Storage Service.' },
  { provider: 'azure_blob', displayName: 'Azure Blob', description: 'Microsoft Azure blob storage.' },
  { provider: 'local', displayName: 'Local', description: 'Server-local file storage (dev only).' },
] as const;

export function StoragePage() {
  const { settings, isLoading, updateStorage } = useSettings();

  if (isLoading || !settings) {
    return <Skeleton className="h-72 w-full" />;
  }

  const active = settings.storage.provider;

  const handleSelect = async (provider: (typeof STORAGE_OPTIONS)[number]['provider'], displayName: string) => {
    await updateStorage({ provider, displayName, enabled: true });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Storage Providers"
        description="Select the active storage backend for all media uploads."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STORAGE_OPTIONS.map((option) => {
          const isActive = active === option.provider;
          return (
            <Card
              key={option.provider}
              className={`cursor-pointer transition-all ${isActive ? 'border-white/40 ring-1 ring-white/20' : 'hover:border-white/15'}`}
            >
              <CardContent className="p-5" onClick={() => handleSelect(option.provider, option.displayName)}>
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 border border-white/10">
                    <Database className="h-5 w-5 text-white/60" />
                  </div>
                  <Toggle
                    checked={isActive}
                    onChange={() => handleSelect(option.provider, option.displayName)}
                    label={`Use ${option.displayName}`}
                  />
                </div>
                <p className="text-sm font-bold text-white/90 mt-3">{option.displayName}</p>
                <p className="text-[10px] text-white/40 mt-1">{option.description}</p>
                {isActive && (
                  <span className="inline-block mt-3 px-2 py-0.5 rounded-full bg-white/10 text-[9px] font-bold text-white uppercase tracking-wider">
                    Active Provider
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
