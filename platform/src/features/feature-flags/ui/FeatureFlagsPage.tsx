"use client";

import { useMemo, useState } from 'react';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { Badge } from '@/shared/components/Badge';
import { Input } from '@/shared/components/Input';
import { Card, CardContent } from '@/shared/components/Card';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Search, Cpu, Users } from 'lucide-react';
import type { Feature } from '../types';
import { APPLICATION_ORDER, applicationLabel, formatUpdatedAt } from '../types';

const APP_ICONS: Record<string, React.ElementType> = {
  CUSTOMER: Users,
  SELLER: Cpu,
};

export function FeatureFlagsPage() {
  const [search, setSearch] = useState('');
  const { features, isLoading, toggle, isToggling } = useFeatureFlags({
    search: search || undefined,
  });

  const groups = useMemo(() => {
    const map = new Map<string, Feature[]>();
    for (const feature of features) {
      const app = feature.application?.toUpperCase() || 'GENERAL';
      if (!map.has(app)) map.set(app, []);
      map.get(app)!.push(feature);
    }
    const apps = Array.from(map.keys()).sort((a, b) => {
      const ai = APPLICATION_ORDER.indexOf(a);
      const bi = APPLICATION_ORDER.indexOf(b);
      const ra = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const rb = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      if (ra !== rb) return ra - rb;
      return a.localeCompare(b);
    });
    return apps.map((app) => ({ app, features: map.get(app)! }));
  }, [features]);

  const enabledCount = features.filter((f) => f.enabled).length;

  const handleToggle = (feature: Feature) => {
    toggle({ id: feature.id, enabled: !feature.enabled });
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">Feature Flags</h2>
          <p className="text-xs text-white/45 mt-1">
            Features are defined in code and auto-registered on backend startup. Platform only
            enables or disables deployed features.
          </p>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-white/25 pointer-events-none" />
          <Input
            placeholder="Search features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Features" value={features.length} />
        <StatCard label="Enabled" value={enabledCount} accent="text-emerald-400" />
        <StatCard label="Disabled" value={features.length - enabledCount} accent="text-white/40" />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : features.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-sm font-bold text-white/70">No registered features</p>
            <p className="text-xs text-white/40 mt-1">
              Deploy the backend to auto-register the features defined in code.
            </p>
          </CardContent>
        </Card>
      ) : (
        groups.map(({ app, features: groupFeatures }) => {
          const Icon = APP_ICONS[app] ?? Cpu;
          return (
            <Card key={app}>
              <CardContent className="p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-white/50" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-white/90 tracking-tight">
                      {applicationLabel(app)}
                    </h3>
                    <p className="text-[10px] text-white/40">
                      {groupFeatures.length} feature{groupFeatures.length === 1 ? '' : 's'} ·{' '}
                      {groupFeatures.filter((f) => f.enabled).length} enabled
                    </p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Feature Name</TableHead>
                      <TableHead className="w-40">Enabled</TableHead>
                      <TableHead className="text-right">Last Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupFeatures.map((feature) => (
                      <TableRow key={feature.id}>
                        <TableCell>
                          <div>
                            <p className="text-xs font-bold text-white/90">{feature.displayName}</p>
                            <p className="text-[10px] text-white/40 font-mono">{feature.featureKey}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ToggleSwitch
                            checked={feature.enabled}
                            disabled={isToggling}
                            onChange={() => handleToggle(feature)}
                            label={feature.featureKey}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-[10px] font-semibold text-white/50">
                            {formatUpdatedAt(feature.updatedAt)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="glass-card p-4">
      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-black mt-1 ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <button
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle ${label}`}
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-5.5 w-10 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/20 ${
          checked ? 'bg-emerald-500/80' : 'bg-white/10'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
      <Badge variant={checked ? 'success' : 'outline'} className="text-[9px]">
        {checked ? 'ON' : 'OFF'}
      </Badge>
    </div>
  );
}
