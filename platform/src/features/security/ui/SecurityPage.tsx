"use client";

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { securityApi } from '@/lib/api/platformApi';
import type { SessionRecord } from '@/types/platform';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { ShieldCheck, Ban, Plus, Trash2, MonitorSmartphone, PlusCircle } from 'lucide-react';

type Tab = 'rate-limits' | 'blocked-ips' | 'sessions';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'rate-limits', label: 'Rate Limits', icon: ShieldCheck },
  { id: 'blocked-ips', label: 'Blocked IPs', icon: Ban },
  { id: 'sessions', label: 'Sessions', icon: MonitorSmartphone },
];

export function SecurityPage() {
  const [tab, setTab] = useState<Tab>('rate-limits');
  const [newIp, setNewIp] = useState('');

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader title="Security" description="Rate limiting, IP blocking, and active sessions." />

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                tab === t.id
                  ? 'border-white/30 bg-white/10 text-white'
                  : 'border-white/10 bg-white/[0.02] text-white/50 hover:text-white/80'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'rate-limits' && <RateLimitsTab />}
      {tab === 'blocked-ips' && (
        <BlockedIpsTab newIp={newIp} setNewIp={setNewIp} />
      )}
      {tab === 'sessions' && <SessionsTab />}
    </div>
  );
}

function RateLimitsTab() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { data, isLoading } = useQuery({ queryKey: ['security-settings'], queryFn: securityApi.get });

  const update = useMutation({
    mutationFn: (payload: { rateLimitEnabled?: boolean; defaultRateLimitPerMinute?: number }) =>
      securityApi.updateRateLimits(payload),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      queryClient.invalidateQueries({ queryKey: ['security-settings'] });
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to update rate limits.', 'error'),
  });

  if (isLoading || !data) return <Skeleton className="h-48 w-full" />;

  const security = data.security;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Limiting</CardTitle>
        <CardDescription>Global limits applied per client across platform endpoints.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02]">
          <div>
            <p className="text-sm font-bold text-white/90">Rate limiting</p>
            <p className="text-[10px] text-white/45 mt-0.5">Reject requests that exceed the configured threshold.</p>
          </div>
          <button
            onClick={() => update.mutate({ rateLimitEnabled: !security.rateLimitEnabled })}
            className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
              security.rateLimitEnabled ? 'bg-emerald-500/70' : 'bg-white/10'
            }`}
            aria-label="Toggle rate limiting"
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                security.rateLimitEnabled ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Requests per minute</label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={1}
              className="max-w-[180px]"
              defaultValue={security.defaultRateLimitPerMinute}
              onBlur={(e) => {
                const value = Number(e.target.value);
                if (value > 0 && value !== security.defaultRateLimitPerMinute) {
                  update.mutate({ defaultRateLimitPerMinute: value });
                }
              }}
            />
            <p className="text-[10px] text-white/40">Applies to the admin rate limiter by default.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BlockedIpsTab({ newIp, setNewIp }: { newIp: string; setNewIp: (v: string) => void }) {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const { data, isLoading } = useQuery({ queryKey: ['blocked-ips'], queryFn: securityApi.getBlockedIps });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['blocked-ips'] });

  const addIp = useMutation({
    mutationFn: (ip: string) => securityApi.addBlockedIp(ip),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      setNewIp('');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to block IP.', 'error'),
  });

  const removeIp = useMutation({
    mutationFn: (ip: string) => securityApi.removeBlockedIp(ip),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to unblock IP.', 'error'),
  });

  const blockedIps = data?.blockedIps ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blocked IPs</CardTitle>
        <CardDescription>Addresses permanently denied access to the platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="e.g. 203.0.113.42"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            className="max-w-[260px] font-mono"
          />
          <Button
            onClick={() => newIp.trim() && addIp.mutate(newIp.trim())}
            className="gap-2"
            isLoading={addIp.isPending}
            disabled={!newIp.trim()}
          >
            <Plus className="h-4 w-4" />
            Block IP
          </Button>
        </div>

        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : blockedIps.length === 0 ? (
          <div className="p-8 text-center">
            <PlusCircle className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-xs font-bold text-white/60">No blocked IPs</p>
            <p className="text-[10px] text-white/35 mt-1">Blocked addresses will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {blockedIps.map((ip) => (
              <div key={ip} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                <code className="text-xs font-mono text-white/80">{ip}</code>
                <button
                  className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                  onClick={() =>
                    showConfirm({
                      title: 'Unblock IP?',
                      message: `${ip} will be allowed to access the platform again.`,
                      confirmText: 'Unblock',
                      onConfirm: () => removeIp.mutate(ip),
                    })
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SessionsTab() {
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { showConfirm } = useConfirmStore();
  const { data, isLoading } = useQuery({ queryKey: ['sessions'], queryFn: securityApi.getSessions });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sessions'] });

  const revoke = useMutation({
    mutationFn: (id: string) => securityApi.revokeSession(id),
    onSuccess: (res) => {
      showToast(res.message, 'success');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to revoke session.', 'error'),
  });

  const sessions = (data?.sessions ?? []) as SessionRecord[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Sessions</CardTitle>
        <CardDescription>Revoke any session to force a sign-out.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6">
            <Skeleton className="h-12 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-white/40 py-10 text-center">No platform sessions found.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Type</TableHead>
                <TableHead>Token</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Badge variant="secondary" className="text-[9px]">{session.userType}</Badge>
                  </TableCell>
                  <TableCell className="text-[10px] font-mono text-white/40 max-w-[140px] truncate">
                    {session.tokenHash.slice(0, 12)}…
                  </TableCell>
                  <TableCell className="text-[10px] text-white/50 whitespace-nowrap">
                    {new Date(session.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-[10px] text-white/50 whitespace-nowrap">
                    {new Date(session.expiresAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.revoked ? 'destructive' : 'success'}>
                      {session.revoked ? 'REVOKED' : 'ACTIVE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!session.revoked && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          showConfirm({
                            title: 'Revoke session?',
                            message: 'The user will be signed out immediately.',
                            confirmText: 'Revoke',
                            onConfirm: () => revoke.mutate(session.id),
                          })
                        }
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
