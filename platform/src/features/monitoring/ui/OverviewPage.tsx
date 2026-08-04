"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import {
  Users, SlidersHorizontal, ShieldCheck, ScrollText, Landmark, Cpu, HardDrive,
} from 'lucide-react';

export function OverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: monitoringApi.overview,
    refetchInterval: 30_000,
  });

  const overview = data?.overview;

  if (isLoading || !overview) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  const tiles = [
    { label: 'Platform Users', value: overview.platformUsers, icon: Users, href: '/users' },
    { label: 'Feature Flags', value: overview.featureFlags, icon: SlidersHorizontal, href: '/feature-flags' },
    { label: 'Enabled Flags', value: overview.enabledFeatureFlags, icon: SlidersHorizontal, href: '/feature-flags' },
    { label: 'Roles', value: overview.roles, icon: ShieldCheck, href: '/roles' },
    { label: 'Audit Entries', value: overview.auditEntries, icon: ScrollText, href: '/monitoring/audit-logs' },
    { label: 'Payment Providers', value: overview.activePaymentProviders, icon: Landmark, href: '/payment-providers' },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="System Overview"
        description="Platform-wide metrics at a glance."
        actions={
          <Badge variant={overview.maintenanceMode ? 'warning' : 'success'}>
            {overview.maintenanceMode ? 'MAINTENANCE' : 'OPERATIONAL'}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.label} href={tile.href} className="glass-card p-5 glass-hover">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{tile.label}</p>
                <Icon className="h-4 w-4 text-white/30" />
              </div>
              <p className="text-2xl font-black text-white mt-2">{tile.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <Cpu className="h-4 w-4 text-white/50" />
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">CPU Load (1m)</p>
          </div>
          <p className="text-3xl font-black text-white">{overview.cpuLoad1m}</p>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <HardDrive className="h-4 w-4 text-white/50" />
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Memory Used</p>
          </div>
          <p className="text-3xl font-black text-white">{overview.memoryUsedPercent}%</p>
          <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-white" style={{ width: `${overview.memoryUsedPercent}%` }} />
          </div>
        </Card>
      </div>
    </div>
  );
}
