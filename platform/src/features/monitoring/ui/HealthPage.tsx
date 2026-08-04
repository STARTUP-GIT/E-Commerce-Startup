"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { HeartPulse, RefreshCw } from 'lucide-react';

export function HealthPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['health'],
    queryFn: monitoringApi.health,
    refetchInterval: 30_000,
  });

  const health = data?.health;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="System Health"
        description="Real-time status of the platform server and its dependencies."
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

      {isLoading || !health ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall status banner */}
          <div className="glass-card p-5 flex items-center gap-4">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${health.status === 'healthy' ? 'bg-emerald-500/15' : 'bg-yellow-500/15'}`}>
              <HeartPulse className={`h-6 w-6 ${health.status === 'healthy' ? 'text-emerald-400' : 'text-yellow-400'}`} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-white uppercase tracking-wide">
                {health.status}
              </p>
              <p className="text-[10px] text-white/45 mt-0.5">
                {health.timestamp ? new Date(health.timestamp).toLocaleString() : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Uptime</p>
              <p className="text-sm font-black text-white">{health.uptime}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              label="Database"
              value={health.database.status}
              sub={`${health.database.latencyMs ?? '—'} ms`}
              ok={health.database.status === 'healthy'}
            />
            <MetricCard
              label="Node Version"
              value={health.nodeVersion}
              sub={`${health.platform}`}
              ok
            />
            <MetricCard label="Hostname" value={health.hostname} sub="server identity" ok />
            <MetricCard label="CPU Cores" value={`${health.cpu.cores}`} sub={health.cpu.model} ok />
            <MetricCard label="Load Average" value={`${health.cpu.load1m} / ${health.cpu.load5m} / ${health.cpu.load15m}`} sub="1m / 5m / 15m" ok={health.cpu.load1m < health.cpu.cores} />
            <MetricCard
              label="Memory Usage"
              value={`${health.memory.usedPercent}%`}
              sub={formatBytes(health.memory.usedBytes)}
              ok={health.memory.usedPercent < 85}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registered Features</CardTitle>
              <CardDescription>Features defined in code and auto-registered on startup.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                  <span className="text-xs font-mono font-bold text-white/80">Total</span>
                  <span className="text-sm font-black text-white">{health.featureFlags.total}</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10">
                  <span className="text-xs font-mono font-bold text-emerald-300">Enabled</span>
                  <span className="text-sm font-black text-emerald-400">{health.featureFlags.enabled}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`h-2 w-2 rounded-full ${ok === undefined ? 'bg-white/30' : ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
        </div>
        <p className="text-sm font-black text-white truncate" title={value}>{value}</p>
        {sub && <p className="text-[10px] text-white/35 mt-0.5 truncate" title={sub}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}
