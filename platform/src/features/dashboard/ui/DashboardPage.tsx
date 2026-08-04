"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api/platformApi';
import { useSettings } from '@/hooks/useSettings';
import { useFeatureFlags } from '@/features/feature-flags/hooks/useFeatureFlags';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import {
  Activity,
  Users,
  SlidersHorizontal,
  ShieldCheck,
  HardDrive,
  HeartPulse,
  Database,
  Settings,
} from 'lucide-react';

export function DashboardPage() {
  const { data: healthData } = useQuery({ queryKey: ['health'], queryFn: monitoringApi.health, refetchInterval: 30_000 });
  const { data: overviewData } = useQuery({ queryKey: ['overview'], queryFn: monitoringApi.overview, refetchInterval: 30_000 });
  const { settings, isLoading: settingsLoading } = useSettings();
  const { flags, isLoading: flagsLoading } = useFeatureFlags();

  const health = healthData?.health;
  const overview = overviewData?.overview;

  const stats = [
    { label: 'Platform Users', value: overview?.platformUsers ?? 0, icon: Users, href: '/users' },
    { label: 'Feature Flags', value: overview?.featureFlags ?? 0, icon: SlidersHorizontal, href: '/feature-flags' },
    { label: 'Enabled Flags', value: overview?.enabledFeatureFlags ?? 0, icon: Activity, href: '/feature-flags' },
    { label: 'Roles', value: overview?.roles ?? 0, icon: ShieldCheck, href: '/roles' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Platform Dashboard</h2>
          <p className="text-xs text-white/45 mt-1">
            Live status of the marketplace ecosystem.
          </p>
        </div>
        <Badge
          variant={health?.status === 'healthy' ? 'success' : health?.status === 'degraded' ? 'warning' : 'destructive'}
        >
          {health?.status?.toUpperCase() || 'CHECKING'}
        </Badge>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="glass-card p-4 card-stagger glass-hover">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{stat.label}</p>
                <Icon className="h-4 w-4 text-white/30" />
              </div>
              <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-emerald-400" />
              System Health
            </CardTitle>
            <CardDescription>Platform server, database and engine status.</CardDescription>
          </CardHeader>
          <CardContent>
            {!health ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <HealthTile
                  label="Database"
                  value={health.database.status}
                  sub={`${health.database.latencyMs ?? '—'} ms latency`}
                  ok={health.database.status === 'healthy'}
                />
                <HealthTile
                  label="CPU Load"
                  value={`${health.cpu.load1m} / ${health.cpu.cores} cores`}
                  sub={`${health.cpu.model}`}
                  ok
                />
                <HealthTile
                  label="Memory"
                  value={`${health.memory.usedPercent}% used`}
                  sub={formatBytes(health.memory.usedBytes)}
                  ok={health.memory.usedPercent < 85}
                />
                <HealthTile label="Uptime" value={health.uptime} sub={`v${health.nodeVersion}`} ok />
                <HealthTile label="Hostname" value={health.hostname} sub={health.platform} ok />
                <HealthTile
                  label="Feature Flags"
                  value={`${Object.values(health.featureFlags).filter(Boolean).length} enabled`}
                  sub="BUY_NOW / AI_SEARCH / LIVE_TRACKING"
                  ok
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Settings summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-white/60" />
              Configuration
            </CardTitle>
            <CardDescription>Quick view of platform settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settingsLoading || !settings ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <SummaryRow
                  label="Marketplace"
                  value={settings.marketplace.marketplaceName}
                  sub={`${settings.marketplace.currency} • ${settings.marketplace.taxRate}% tax`}
                  href="/marketplace"
                  icon={Settings}
                />
                <SummaryRow
                  label="Commission"
                  value={`${settings.commission.defaultRate}% default`}
                  sub={`max ${settings.commission.maxRate}%`}
                  href="/commission"
                  icon={Database}
                />
                <SummaryRow
                  label="Storage"
                  value={settings.storage.displayName}
                  sub={settings.storage.enabled ? 'enabled' : 'disabled'}
                  href="/storage"
                  icon={HardDrive}
                />
                <SummaryRow
                  label="Maintenance"
                  value={settings.maintenance.maintenanceMode ? 'ACTIVE' : 'Off'}
                  sub={settings.maintenance.maintenanceMode ? settings.maintenance.message : 'Platform operational'}
                  href="/maintenance"
                  icon={Activity}
                  danger={settings.maintenance.maintenanceMode}
                />
                <SummaryRow
                  label="Payment Providers"
                  value={`${settings.paymentProviders.filter((p) => p.enabled).length} active`}
                  sub={`of ${settings.paymentProviders.length} configured`}
                  href="/payment-providers"
                  icon={HeartPulse}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent flags */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Feature Flags</CardTitle>
            <CardDescription>The latest flags configured on the platform.</CardDescription>
          </div>
          <Link href="/feature-flags" className="text-[10px] font-bold text-white/50 hover:text-white uppercase tracking-wider">
            View All →
          </Link>
        </CardHeader>
        <CardContent>
          {flagsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : flags.length === 0 ? (
            <p className="text-xs text-white/40">No feature flags configured yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {flags.slice(0, 6).map((flag) => (
                <Link
                  key={flag.id}
                  href={`/feature-flags/${flag.id}`}
                  className="glass-card p-4 hover:border-white/15 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-white/90">{flag.key}</span>
                    <Badge variant={flag.enabled ? 'success' : 'outline'} className="text-[9px]">
                      {flag.enabled ? 'ON' : 'OFF'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-white/45 line-clamp-2">{flag.displayName}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="secondary" className="text-[9px]">{flag.scope}</Badge>
                    <span className="text-[10px] font-bold text-white/50">{flag.rolloutPercentage}% rollout</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthTile({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok?: boolean }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-bold text-white/90 mt-1.5 truncate" title={value}>{value}</p>
      {sub && <p className="text-[10px] text-white/35 mt-0.5 truncate" title={sub}>{sub}</p>}
    </div>
  );
}

function SummaryRow({ label, value, sub, href, icon: Icon, danger }: { label: string; value: string; sub: string; href: string; icon: React.ElementType; danger?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors border border-white/5">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/50'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white/90 truncate">{value}</p>
        <p className="text-[10px] text-white/40 truncate">{sub}</p>
      </div>
      <span className="text-[10px] text-white/30">{label}</span>
    </Link>
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
