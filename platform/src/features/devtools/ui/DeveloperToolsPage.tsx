"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { featureFlagApi } from '@/features/feature-flags/api/featureFlagApi';
import { monitoringApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { TerminalSquare, FlaskConical, Zap, User, Store } from 'lucide-react';

export function DeveloperToolsPage() {
  const [flagKey, setFlagKey] = useState('');
  const [application, setApplication] = useState('CUSTOMER');
  const [userId, setUserId] = useState('');
  const [shopId, setShopId] = useState('');
  const [result, setResult] = useState<{ key: string; enabled: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: flagsData } = useQuery({ queryKey: ['feature-flags'], queryFn: () => featureFlagApi.list() });
  const { data: healthData } = useQuery({ queryKey: ['dev-tools-health'], queryFn: monitoringApi.health });

  const flags = flagsData?.features ?? [];

  const runCheck = async () => {
    if (!flagKey.trim()) return;
    setChecking(true);
    setError(null);
    try {
      const ctx: { application?: string; userId?: string; shopId?: string } = { application };
      if (userId.trim()) ctx.userId = userId.trim();
      if (shopId.trim()) ctx.shopId = shopId.trim();
      const res = await featureFlagApi.checkFlag(flagKey.trim().toUpperCase(), ctx);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Engine check failed.');
      setResult(null);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Developer Tools"
        description="Utilities for testing the platform feature flag engine."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-white/60" />
              Feature Flag Lab
            </CardTitle>
            <CardDescription>Evaluate a flag the same way your apps will — through the shared engine.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Flag key</label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. BUY_NOW"
                  value={flagKey}
                  onChange={(e) => setFlagKey(e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>
              {flags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {flags.slice(0, 8).map((flag) => (
                    <button
                      key={flag.id}
                      onClick={() => {
                        setFlagKey(flag.featureKey);
                        setResult(null);
                      }}
                      className="px-2 py-0.5 rounded-md border border-white/10 text-[9px] font-mono text-white/40 hover:text-white hover:border-white/25 transition-colors cursor-pointer"
                    >
                      {flag.featureKey}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Application
                </label>
                <select
                  className="glass-input h-10 w-full rounded-xl px-3 text-xs text-white"
                  value={application}
                  onChange={(e) => setApplication(e.target.value)}
                >
                  <option value="CUSTOMER">CUSTOMER</option>
                  <option value="SELLER">SELLER</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1">
                  <User className="h-3 w-3" /> User ID
                </label>
                <Input value={userId} onChange={(e) => setUserId(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1">
                  <Store className="h-3 w-3" /> Shop ID
                </label>
                <Input value={shopId} onChange={(e) => setShopId(e.target.value)} />
              </div>
            </div>

            <Button onClick={runCheck} className="gap-2" isLoading={checking} disabled={!flagKey.trim()}>
              <Zap className="h-4 w-4" />
              Evaluate Flag
            </Button>

            {result && (
              <div
                className={`p-4 rounded-xl border ${
                  result.enabled
                    ? 'border-emerald-500/20 bg-emerald-500/10'
                    : 'border-white/10 bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono font-bold text-white/90">{result.key}</code>
                  <Badge variant={result.enabled ? 'success' : 'outline'}>
                    {result.enabled ? 'ENABLED' : 'DISABLED'}
                  </Badge>
                </div>
                <p className="text-[10px] text-white/45 mt-2">
                  {result.enabled
                    ? 'This user would experience the feature.'
                    : 'This user would NOT experience the feature.'}
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-[11px] text-red-400">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TerminalSquare className="h-4 w-4 text-white/60" />
              API Endpoints
            </CardTitle>
            <CardDescription>Quick reference for the platform API surface.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {[
              ['GET', '/api/platform/healthz'],
              ['GET', '/api/platform/monitoring/health'],
              ['GET', '/api/platform/feature-flags'],
              ['GET', '/api/platform/feature-flags/engine/check?key=BUY_NOW'],
              ['GET', '/api/platform/settings'],
              ['GET', '/api/platform/security/api-keys'],
              ['GET', '/api/platform/queues'],
            ].map(([method, path]) => (
              <div key={path} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
                <Badge
                  variant={method === 'GET' ? 'success' : method === 'POST' ? 'warning' : 'secondary'}
                  className="w-12 justify-center font-mono"
                >
                  {method}
                </Badge>
                <code className="text-[10px] font-mono text-white/60">{path}</code>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {healthData?.health ? (
        <Card>
          <CardHeader>
            <CardTitle>Backend Connectivity</CardTitle>
            <CardDescription>The control plane backend is reachable.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-bold text-white/80">
                {healthData.health.status.toUpperCase()}
              </p>
              <span className="text-[10px] text-white/40">— {healthData.health.hostname}</span>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Skeleton className="h-24 w-full" />
      )}
    </div>
  );
}
