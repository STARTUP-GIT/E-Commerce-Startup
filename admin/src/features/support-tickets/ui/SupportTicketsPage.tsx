"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  supportTicketApi,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_STATUS_VARIANT,
  TICKET_PRIORITY_VARIANT,
  type SupportTicket,
} from '../api/supportTicketApi';
import { NoPermission } from './NoPermission';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { Skeleton } from '@/shared/components/Skeleton';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/shared/components/Table';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { useBranding } from '@/lib/hooks/useBranding';
import { Search, LifeBuoy, MessageSquare, ExternalLink } from 'lucide-react';

function requesterOf(ticket: SupportTicket): { name: string; role: string } {
  if (ticket.customer) {
    const name = [ticket.customer.firstName, ticket.customer.lastName].filter(Boolean).join(' ');
    return { name: name || ticket.customer.username || ticket.customer.email || ticket.customer.id, role: 'Customer' };
  }
  if (ticket.seller) {
    const name = [ticket.seller.firstName, ticket.seller.lastName].filter(Boolean).join(' ');
    return { name: name || ticket.seller.email || ticket.seller.id, role: 'Seller' };
  }
  return { name: '—', role: '—' };
}

export function SupportTicketsPage() {
  const router = useRouter();
  const { branding } = useBranding();
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);

  const canView = can('support.view');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['support-tickets', { search, status: statusFilter, priority: priorityFilter, page }],
    queryFn: () =>
      supportTicketApi.getTickets({
        search: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        page,
        limit: 20,
      }),
    enabled: canView,
    staleTime: 30 * 1000,
  });

  if (permissionsLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-10 w-56" />
        <Card className="border border-white/5 p-4"><Skeleton className="h-10 w-full" /></Card>
        <Card className="border border-white/5">
          <CardContent className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canView) return <NoPermission permission="support.view" />;

  const tickets = data?.tickets ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white/95">Support Tickets</h1>
          <p className="text-xs text-white/45 mt-1">
            {branding.name || 'Marketplace'} · Customer and seller conversations in one place
          </p>
        </div>
        <div className="text-xs text-white/40 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2 font-semibold">
          {pagination?.total ?? tickets.length} total tickets
        </div>
      </div>

      <Card className="border border-white/5 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-white/25 pointer-events-none" />
            <Input
              placeholder="Search by subject or ticket number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-lg border border-white/10 bg-[#0c0c10] text-xs font-semibold text-white/80 focus:outline-none focus:border-white/30 cursor-pointer"
          >
            <option value="">All Statuses</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="h-10 px-3 rounded-lg border border-white/10 bg-[#0c0c10] text-xs font-semibold text-white/80 focus:outline-none focus:border-white/30 cursor-pointer"
          >
            <option value="">All Priorities</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </Card>

      <Card className="border border-white/5">
        <CardHeader className="border-b border-white/5 pb-4">
          <CardTitle className="text-xs font-bold text-white/90">Ticket Inbox</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : isError ? (
            <div className="text-center py-16 text-red-400 text-sm">{error?.message || 'Failed to load tickets'}</div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <LifeBuoy className="h-8 w-8 text-white/20 mx-auto" />
              <p className="text-xs text-white/30 font-medium">No support tickets found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => {
                  const requester = requesterOf(ticket);
                  return (
                    <TableRow
                      key={ticket.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/support-tickets/${ticket.id}`)}
                    >
                      <TableCell className="font-mono font-bold text-xs text-white/90">
                        {ticket.ticketNumber || ticket.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs text-white/70 max-w-[240px] truncate">{ticket.subject}</TableCell>
                      <TableCell>
                        <div className="text-xs text-white/70 max-w-[160px] truncate">{requester.name}</div>
                        <div className="text-[9px] uppercase tracking-wider text-white/35 font-bold">{requester.role}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={TICKET_STATUS_VARIANT[ticket.status] ?? 'outline'} className="text-[8px]">
                          {ticket.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={TICKET_PRIORITY_VARIANT[ticket.priority] ?? 'outline'} className="text-[8px]">
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
                          <MessageSquare className="h-3.5 w-3.5" />
                          {ticket._count?.messages ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-white/40">
                        {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <span className="h-7 px-2 text-white/40 hover:text-white/80 transition-colors flex items-center">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-xs text-white/40">Page {pagination.page} of {pagination.pages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
