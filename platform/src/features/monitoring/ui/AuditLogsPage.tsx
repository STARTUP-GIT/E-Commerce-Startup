"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitoringApi } from '@/lib/api/platformApi';
import { PageHeader } from '@/shared/components/PageHeader';
import { Card, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Badge } from '@/shared/components/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { FileClock, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, debouncedSearch, moduleFilter],
    queryFn: () =>
      monitoringApi.auditLogs({
        page,
        limit: 25,
        search: debouncedSearch || undefined,
        module: moduleFilter || undefined,
      }),
  });

  const logs = data?.logs ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Audit Logs"
        description="Complete audit trail of platform actions with before/after values."
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <Input
              placeholder="Search actions or descriptions..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10"
            />
          </div>
          <select
            className="glass-input h-10 rounded-xl px-3 text-xs text-white/80 min-w-[160px]"
            value={moduleFilter}
            onChange={(e) => {
              setModuleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Modules</option>
            {['auth', 'users', 'rbac', 'feature-flags', 'marketplace', 'commission', 'payments', 'storage', 'email', 'oauth', 'security', 'queues', 'release', 'webhooks', 'api-keys', 'backups'].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <FileClock className="h-8 w-8 text-white/20 mx-auto mb-3" />
              <p className="text-sm font-bold text-white/70">No audit entries found</p>
              <p className="text-xs text-white/40 mt-1">Platform actions will appear here.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-[10px] text-white/50">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[9px] font-mono">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[9px]">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-white/60">{log.email || 'system'}</TableCell>
                      <TableCell className="text-[10px] text-white/50 max-w-[280px] truncate">{log.description}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-white/5">
                  <p className="text-[10px] text-white/40">
                    Page {pagination.page} of {pagination.pages} • {pagination.total} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= pagination.pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
