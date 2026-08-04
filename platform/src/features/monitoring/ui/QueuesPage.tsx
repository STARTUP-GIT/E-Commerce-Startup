"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { queueApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { ListTodo, RefreshCw } from 'lucide-react';

export function QueuesPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['queues'],
    queryFn: queueApi.list,
    refetchInterval: 15_000,
  });

  const queues = data?.queues ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Message Queues"
        description="Live state of the platform worker queues."
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
        {isLoading ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 w-full" />)
        ) : queues.length === 0 ? (
          <div className="p-12 text-center col-span-full">
            <ListTodo className="h-8 w-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-white/70">No queues configured</p>
          </div>
        ) : (
          queues.map((queue) => (
            <Card key={queue.name}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-black text-white/90">{queue.name}</p>
                  <Badge variant={queue.status === 'idle' ? 'secondary' : 'success'}>{queue.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <QueueStat label="Pending" value={queue.pending} />
                  <QueueStat label="Processing" value={queue.processing} accent="text-yellow-400" />
                  <QueueStat label="Failed" value={queue.failed} accent="text-red-400" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function QueueStat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] text-center">
      <p className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-black mt-1 ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  );
}
