"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { featureFlagApi } from '../api/featureFlagApi';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { ArrowLeft, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export function FeatureFlagDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const showConfirm = useConfirmStore((state) => state.showConfirm);

  const { data, isLoading } = useQuery({
    queryKey: ['feature-flag', params.id],
    queryFn: () => featureFlagApi.get(params.id),
  });

  const { toggle, remove, updateRollout, isToggling, isDeleting, isUpdatingRollout } = useFeatureFlags();

  const flag = data?.flag;

  const handleDelete = () => {
    if (!flag) return;
    showConfirm({
      title: `Delete ${flag.key}?`,
      message: 'This action cannot be undone.',
      confirmText: 'Delete',
      onConfirm: async () => {
        await remove(flag.id);
        router.push('/feature-flags');
      },
    });
  };

  if (isLoading || !flag) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/feature-flags')}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white font-mono tracking-tight">{flag.key}</h2>
              <Badge variant={flag.enabled ? 'success' : 'outline'}>{flag.enabled ? 'ENABLED' : 'DISABLED'}</Badge>
            </div>
            <p className="text-xs text-white/45 mt-0.5">{flag.displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            isLoading={isToggling}
            onClick={() => toggle({ id: flag.id, enabled: !flag.enabled })}
          >
            {flag.enabled ? <ToggleRight className="h-4 w-4 text-emerald-400" /> : <ToggleLeft className="h-4 w-4" />}
            {flag.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button variant="destructive" className="gap-2" isLoading={isDeleting} onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Flag Details</CardTitle>
            <CardDescription>Metadata and configuration for this flag.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <DetailItem label="Key" value={flag.key} mono />
              <DetailItem label="Type" value={flag.type} />
              <DetailItem label="Status" value={flag.status} />
              <DetailItem label="Scope" value={flag.scope} />
              <DetailItem label="Description" value={flag.description || '—'} />
              <DetailItem label="Target Environment" value={flag.targetEnvironment || 'All'} />
              <DetailItem label="Scheduled At" value={flag.scheduledAt ? new Date(flag.scheduledAt).toLocaleString() : '—'} />
              <DetailItem label="Starts" value={flag.startsAt ? new Date(flag.startsAt).toLocaleString() : '—'} />
              <DetailItem label="Ends" value={flag.endsAt ? new Date(flag.endsAt).toLocaleString() : '—'} />
              <DetailItem label="Created By" value={flag.createdBy || 'system'} />
              <DetailItem label="Created" value={flag.createdAt ? new Date(flag.createdAt).toLocaleString() : '—'} />
              <DetailItem label="Updated" value={flag.updatedAt ? new Date(flag.updatedAt).toLocaleString() : '—'} />
            </dl>

            {flag.metadata && Object.keys(flag.metadata).length > 0 && (
              <div className="mt-6">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Metadata</p>
                <pre className="glass-input rounded-xl p-3 text-[10px] text-white/70 overflow-auto">
                  {JSON.stringify(flag.metadata, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rollout */}
        <Card>
          <CardHeader>
            <CardTitle>Rollout Control</CardTitle>
            <CardDescription>Deterministic percentage-based rollout.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Rollout</span>
                <span className="text-sm font-black text-white">{flag.rolloutPercentage}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white"
                  style={{ width: `${flag.rolloutPercentage}%` }}
                />
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const value = Number(fd.get('rollout'));
                if (!Number.isFinite(value)) return;
                updateRollout({ id: flag.id, rolloutPercentage: value });
              }}
              className="space-y-2"
            >
              <Input
                name="rollout"
                type="number"
                min={0}
                max={100}
                defaultValue={flag.rolloutPercentage}
                className="text-center font-mono text-sm"
              />
              <Button type="submit" variant="outline" className="w-full" size="sm" isLoading={isUpdatingRollout}>
                Apply Rollout %
              </Button>
            </form>

            <div className="glass-input rounded-xl p-3 text-[10px] text-white/50 leading-relaxed">
              <p className="font-bold text-white/70 mb-1">How it works</p>
              Users are bucketed deterministically via SHA-256. The same user sees a consistent result everywhere.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</dt>
      <dd className={`text-xs font-semibold text-white/85 mt-1 break-words ${mono ? 'font-mono' : ''}`}>{value}</dd>
    </div>
  );
}
