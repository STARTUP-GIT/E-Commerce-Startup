"use client";

import React, { useState } from 'react';
import { NoPermission } from './NoPermission';
import { ReviewsTab } from './ReviewsTab';
import { ReportsTab } from './ReportsTab';
import { Skeleton } from '@/shared/components/Skeleton';
import { Card, CardContent } from '@/shared/components/Card';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useBranding } from '@/lib/hooks/useBranding';
import { ShieldCheck, Star, Flag } from 'lucide-react';

type ModerationTab = 'reviews' | 'reports';

export function ModerationPage() {
  const { can, isLoading: permissionsLoading } = usePermissions();
  const { branding } = useBranding();
  const [tab, setTab] = useState<ModerationTab>('reviews');

  const canView = can('moderation.view');

  if (permissionsLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-10 w-64" />
        <Card className="border border-white/5">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canView) return <NoPermission permission="moderation.view" />;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Moderation</h1>
          <p className="text-xs text-white/45 mt-0.5">
            {branding.name || 'Marketplace'} · Review visibility and violation reports
          </p>
        </div>
      </div>

      <div className="flex gap-1 border border-white/5 rounded-xl p-1 bg-white/[0.02] w-fit">
        {([
          { key: 'reviews' as const, label: 'Reviews', icon: Star },
          { key: 'reports' as const, label: 'Reports', icon: Flag },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer flex items-center gap-2 ${
              tab === key ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'reviews' ? <ReviewsTab /> : <ReportsTab />}
    </div>
  );
}
