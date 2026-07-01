"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditLogApi } from '@/lib/api/featureApis';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { Search, FileSpreadsheet } from 'lucide-react';

export function AuditLogsPage() {
  const [tab, setTab] = useState<'audit' | 'logins'>('audit');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-logs', { search, page }],
    queryFn: () => auditLogApi.getAuditLogs({ search, page, limit: 20 }),
    enabled: tab === 'audit',
    staleTime: 30 * 1000,
  });

  const { data: loginData, isLoading: loginLoading } = useQuery({
    queryKey: ['login-history', { page }],
    queryFn: () => auditLogApi.getLoginHistory({ page, limit: 20 }),
    enabled: tab === 'logins',
    staleTime: 30 * 1000,
  });

  const isLoading = tab === 'audit' ? auditLoading : loginLoading;
  const logs = tab === 'audit' ? (auditData?.logs ?? auditData?.data ?? []) : (loginData?.logs ?? loginData?.data ?? []);

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
          <FileSpreadsheet className="h-5 w-5 text-white/40" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Audit Logs</h1>
          <p className="text-xs text-white/45 mt-0.5">Complete record of administrative actions</p>
        </div>
      </div>

      <div className="flex gap-1 border border-white/5 rounded-xl p-1 bg-white/[0.02] w-fit">
        {(['audit', 'logins'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }} className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${tab === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
            {t === 'audit' ? 'Audit Trail' : 'Login History'}
          </button>
        ))}
      </div>

      {tab === 'audit' && (
        <Card className="border border-white/5 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <Input placeholder="Search audit logs..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
          </div>
        </Card>
      )}

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">{tab === 'audit' ? 'Administrative Actions' : 'Login History'}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No logs found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action / Event</TableHead>
                  <TableHead>Admin</TableHead>
                  {tab === 'logins' && <TableHead>IP Address</TableHead>}
                  <TableHead>Entity</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: any, i: number) => (
                  <TableRow key={log.id ?? i}>
                    <TableCell>
                      <Badge variant="secondary" className="text-[8px] font-mono">{log.action ?? log.actionType ?? log.event ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/60">{log.admin?.firstName ?? log.adminId ?? '—'}</TableCell>
                    {tab === 'logins' && <TableCell className="font-mono text-xs text-white/40">{log.ipAddress ?? '—'}</TableCell>}
                    <TableCell className="text-xs text-white/40">{log.entityType ?? '—'}</TableCell>
                    <TableCell className="text-xs text-white/40">{log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {logs.length >= 20 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
          <span className="text-xs text-white/40">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
