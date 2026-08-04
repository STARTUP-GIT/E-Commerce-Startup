"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { Cpu, MemoryStick, HardDrive, Globe, Server } from 'lucide-react';

export function SystemPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: monitoringApi.health,
    refetchInterval: 30_000,
  });

  const health = data?.health;

  if (isLoading || !health) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="System"
        description="Runtime environment powering the platform control plane."
        actions={
          <Badge variant={health.status === 'healthy' ? 'success' : 'warning'}>
            {health.status}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-4 w-4 text-white/60" />
              Runtime
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KVRow label="Hostname" value={health.hostname} />
            <KVRow label="Platform" value={health.platform} />
            <KVRow label="Node.js" value={health.nodeVersion} />
            <KVRow label="Uptime" value={health.uptime} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-white/60" />
              Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KVRow label="PID" value="1 (containerized)" />
            <KVRow label="Environment" value={process.env.NODE_ENV ?? 'development'} />
            <KVRow label="Platform API" value={process.env.NEXT_PUBLIC_PLATFORM_API_URL ?? 'http://localhost:3006'} />
            <KVRow label="Checked at" value={health.timestamp ? new Date(health.timestamp).toLocaleString() : '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-white/60" />
              CPU
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KVRow label="Cores" value={`${health.cpu.cores}`} />
            <KVRow label="Model" value={health.cpu.model} />
            <KVRow label="Load (1m)" value={`${health.cpu.load1m}`} />
            <KVRow label="Load (5m)" value={`${health.cpu.load5m}`} />
            <KVRow label="Load (15m)" value={`${health.cpu.load15m}`} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MemoryStick className="h-4 w-4 text-white/60" />
              Memory
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <KVRow label="Used" value={`${formatBytes(health.memory.usedBytes)} (${health.memory.usedPercent}%)`} />
            <KVRow label="Free" value={formatBytes(health.memory.freeBytes)} />
            <KVRow label="Total" value={formatBytes(health.memory.totalBytes)} />
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${health.memory.usedPercent > 85 ? 'bg-red-400' : 'bg-white'}`}
                style={{ width: `${Math.min(health.memory.usedPercent, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-white/60" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <KVRow label="Free" value={formatBytes(health.storage.freeBytes)} />
              <KVRow label="Total" value={formatBytes(health.storage.totalBytes)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-white/80 text-right">{value}</span>
    </div>
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
