"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Layers, RefreshCw } from 'lucide-react';

export function CachePage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['cache'],
    queryFn: monitoringApi.cache,
  });

  const cache = data?.cache;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Cache Status"
        description="In-memory caching layer powering the feature flag engine."
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-bold text-white/60 hover:text-white/90 hover:border-white/25 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-white/60" />
              Cache Configuration
            </CardTitle>
            <CardDescription>Current caching layer settings.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !cache ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <dl className="space-y-3">
                <div className="flex justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <dt className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Provider</dt>
                  <dd className="text-xs font-bold text-white/90">{cache.provider}</dd>
                </div>
                <div className="flex justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <dt className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Feature Flag Entries</dt>
                  <dd className="text-xs font-bold text-white/90">{cache.featureFlagEntries}</dd>
                </div>
                <div className="flex justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <dt className="text-[10px] font-bold text-white/40 uppercase tracking-wider">TTL</dt>
                  <dd className="text-xs font-bold text-white/90">{cache.ttlSeconds}s</dd>
                </div>
                <div className="flex justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <dt className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Enabled</dt>
                  <dd className="text-xs font-bold text-emerald-400">{cache.enabled ? 'YES' : 'NO'}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How the cache works</CardTitle>
            <CardDescription>Feature flag engine caching behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <InfoRow text="Flag evaluations are cached in memory for 30 seconds." />
            <InfoRow text="Any mutation (create, update, toggle, rollout) invalidates the cache immediately." />
            <InfoRow text="Rollout bucketing is deterministic — the same user always gets the same result." />
            <InfoRow text="Restarting the server clears all cached evaluations." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
      <span className="h-1.5 w-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
      <p className="text-xs text-white/70 leading-relaxed">{text}</p>
    </div>
  );
}
