"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { useUIStore } from '@/lib/store/uiStore';
import { MonitorSmartphone, ShieldOff, RefreshCw } from 'lucide-react';

export default function SessionsPage() {
  const [userType, setUserType] = useState('');
  const [active, setActive] = useState('true');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-sessions', { userType, active, page }],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/sessions', {
        params: { userType: userType || undefined, active, page, limit: 20 },
      });
      return res.data;
    },
    staleTime: 15 * 1000,
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await axiosInstance.delete(`/api/admin/sessions/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sessions'] });
      showToast('Session revoked successfully.', 'success');
    },
    onError: (e: any) => showToast(e?.response?.data?.message || e.message, 'error'),
  });

  const sessions = data?.sessions ?? [];
  const total = data?.pagination?.total ?? 0;
  const userTypes = ['', 'ADMIN', 'CUSTOMER', 'SELLER', 'DELIVERY_PARTNER'];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <MonitorSmartphone className="h-6 w-6 text-white/70" />
            Sessions & Device Management
          </h1>
          <p className="text-xs text-white/45 mt-1">
            Monitor active user & admin sessions across all platforms and revoke suspicious tokens.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="border border-white/5 p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-white/40 font-bold mr-2">User Type:</span>
            {userTypes.map((t) => (
              <button
                key={t || 'all'}
                onClick={() => { setUserType(t); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all cursor-pointer ${
                  userType === t
                    ? 'bg-white/15 border-white/25 text-white'
                    : 'border-white/10 text-white/40 hover:text-white/70'
                }`}
              >
                {t || 'All Types'}
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-center">
            <span className="text-xs text-white/40 font-bold mr-2">Status:</span>
            <button
              onClick={() => { setActive('true'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                active === 'true' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'border-white/10 text-white/40'
              }`}
            >
              Active Only
            </button>
            <button
              onClick={() => { setActive('false'); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                active === 'false' ? 'bg-white/15 text-white border-white/20' : 'border-white/10 text-white/40'
              }`}
            >
              All (Incl. Revoked)
            </button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold text-white/90">Active & Logged Sessions ({total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-16 text-white/30 text-sm">No active sessions found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User / Account</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="text-xs font-bold text-white/90">{s.userLabel}</p>
                        <p className="text-[10px] text-white/35 font-mono">ID: {s.userId}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] uppercase font-mono">
                        {s.userType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-white/50">
                      {new Date(s.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-white/50">
                      {new Date(s.expiresAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {s.revoked ? (
                        <Badge variant="destructive" className="text-[8px]">Revoked</Badge>
                      ) : s.active ? (
                        <Badge variant="success" className="text-[8px]">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[8px]">Expired</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!s.revoked && s.active && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          isLoading={revokeMutation.isPending}
                          onClick={() => revokeMutation.mutate(s.id)}
                        >
                          <ShieldOff className="h-3.5 w-3.5 mr-1" />
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

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-xs text-white/40">Page {page}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={sessions.length < 20}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
