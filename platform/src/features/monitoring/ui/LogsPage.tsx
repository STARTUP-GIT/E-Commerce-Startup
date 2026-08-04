"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { ScrollText, RefreshCw } from 'lucide-react';

export function LogsPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['logs'],
    queryFn: () => monitoringApi.logs(100),
    refetchInterval: 15_000,
  });

  const logs = data?.logs ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="System Logs"
        description="Recent platform activity from the audit trail."
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-white/60" />
            Activity Feed
          </CardTitle>
          <CardDescription>Latest {logs.length} entries from the audit trail.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-xs text-white/40 py-8 text-center">No activity recorded yet.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/[0.03] transition-colors">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white/90">{log.action}</span>
                      <Badge variant="secondary" className="text-[9px]">{log.module}</Badge>
                    </div>
                    <p className="text-[10px] text-white/45 mt-0.5 truncate">{log.description}</p>
                    <p className="text-[9px] text-white/30 mt-0.5">
                      {log.email || 'system'} • {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                      {log.ipAddress ? ` • ${log.ipAddress}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
