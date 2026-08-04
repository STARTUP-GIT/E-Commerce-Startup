"use client";

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queueApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { useUIStore } from '@/lib/store/uiStore';
import { Play, RotateCw } from 'lucide-react';

export function JobsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading } = useQuery({
    queryKey: ['background-jobs'],
    queryFn: queueApi.jobs,
    refetchInterval: 15_000,
  });

  const runJob = useMutation({
    mutationFn: (name: string) => queueApi.runJob(name),
    onSuccess: (res) => {
      showToast(`Job "${res.job.name}" is now ${res.job.status}.`, 'success');
      queryClient.invalidateQueries({ queryKey: ['background-jobs'] });
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : 'Failed to trigger job.', 'error');
    },
  });

  const jobs = data?.jobs ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Background Jobs"
        description="Scheduled tasks that keep the platform operating."
        actions={
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['background-jobs'] })}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-xs font-bold text-white/60 hover:text-white/90 hover:border-white/25 transition-colors cursor-pointer"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
          <CardDescription>Trigger a job manually or review its last run state.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-xs text-white/40 py-8 text-center">No background jobs registered.</p>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div
                  key={job.name}
                  className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-white/90 font-mono">{job.name}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      Schedule: {job.schedule}
                      {job.lastRun ? ` • Last run: ${new Date(job.lastRun).toLocaleString()}` : ' • Never run'}
                    </p>
                  </div>
                  <Badge
                    variant={job.status === 'completed' ? 'success' : job.status === 'failed' ? 'destructive' : 'warning'}
                  >
                    {job.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => runJob.mutate(job.name)}
                    disabled={runJob.isPending && runJob.variables === job.name}
                  >
                    <Play className="h-3.5 w-3.5" />
                    Run now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
