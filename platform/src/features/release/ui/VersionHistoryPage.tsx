"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { securityApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { ScrollText, GitCommitHorizontal } from 'lucide-react';

const STATUS_VARIANT: Record<string, 'outline' | 'success' | 'destructive' | 'warning' | 'secondary'> = {
  pending: 'warning',
  released: 'success',
  rolled_back: 'destructive',
  deprecated: 'secondary',
};

export function VersionHistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['version-history'],
    queryFn: securityApi.getVersionHistory,
  });

  const versions = data?.versions ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Version History"
        description="Full chronological record of platform releases."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitCommitHorizontal className="h-4 w-4 text-white/60" />
            Timeline
          </CardTitle>
          <CardDescription>Newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : versions.length === 0 ? (
            <div className="p-10 text-center">
              <ScrollText className="h-8 w-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-white/70">No releases yet</p>
            </div>
          ) : (
            <div className="relative space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-white/10">
              {versions.map((version) => (
                <div key={version.id} className="relative pl-8">
                  <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white/40 bg-[#0c0c10]" />
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-black text-white">{version.version}</span>
                    <Badge variant={STATUS_VARIANT[version.status] ?? 'secondary'}>
                      {version.status.replace('_', ' ')}
                    </Badge>
                    {version.releasedAt && (
                      <span className="text-[10px] text-white/40">
                        {new Date(version.releasedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white/90">{version.name}</p>
                  {version.notes && <p className="text-[11px] text-white/50 mt-1 leading-relaxed">{version.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
