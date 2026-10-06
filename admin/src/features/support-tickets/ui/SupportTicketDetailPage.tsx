"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import {
  supportTicketApi,
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_STATUS_VARIANT,
  TICKET_PRIORITY_VARIANT,
  type TicketPriority,
  type TicketStatus,
} from '../api/supportTicketApi';
import { NoPermission } from './NoPermission';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { usePermissions } from '@/lib/hooks/usePermissions';
import {
  ArrowLeft,
  Send,
  Calendar,
  User,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

function shortId(id?: string | null): string {
  if (!id) return 'unknown';
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function messageAuthor(senderType: string, senderId: string): string {
  if (senderType === 'ADMIN') return 'You';
  return `${senderType.charAt(0) + senderType.slice(1).toLowerCase()} · ${shortId(senderId)}`;
}

export function SupportTicketDetailPage() {
  const params = useParams();
  const ticketId = String(params?.id ?? '');
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();
  const { can, isLoading: permissionsLoading } = usePermissions();

  const [replyText, setReplyText] = useState('');

  const canView = can('support.view');
  const canManage = can('support.manage');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['support-ticket', ticketId],
    queryFn: () => supportTicketApi.getTicket(ticketId),
    enabled: canView && !!ticketId,
    staleTime: 15 * 1000,
  });

  const replyMutation = useMutation({
    mutationFn: (message: string) => supportTicketApi.replyToTicket(ticketId, message),
    onSuccess: () => {
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      showToast('Reply sent.', 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { status?: TicketStatus; priority?: TicketPriority }) =>
      supportTicketApi.updateTicket(ticketId, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['support-ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      showToast(`Ticket updated — status ${res.ticket.status}, priority ${res.ticket.priority}.`, 'success');
    },
    onError: (e: Error) => showToast(e.message, 'error'),
  });

  if (permissionsLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!canView) return <NoPermission permission="support.view" />;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  const ticket = data?.ticket;

  if (isError || !ticket) {
    return (
      <div className="text-center py-16 space-y-4 animate-fade-up">
        <p className="text-sm font-bold text-red-400">{error?.message || 'Support ticket not found'}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/support-tickets')}>
          Back to Tickets
        </Button>
      </div>
    );
  }

  const requesterName = ticket.customer
    ? [ticket.customer.firstName, ticket.customer.lastName].filter(Boolean).join(' ') ||
      ticket.customer.username ||
      ticket.customer.email ||
      ticket.customer.id
    : ticket.seller
      ? [ticket.seller.firstName, ticket.seller.lastName].filter(Boolean).join(' ') || ticket.seller.email || ticket.seller.id
      : '—';
  const requesterRole = ticket.customer ? 'Customer' : ticket.seller ? 'Seller' : '—';

  const messages = ticket.messages ?? [];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/support-tickets')}
            className="p-2 rounded-xl glass hover:bg-white/[0.05] border border-white/5 text-white/60 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-white/95">{ticket.subject}</h1>
              <Badge variant="outline" className="font-mono text-[9px]">
                {ticket.ticketNumber || ticket.id.slice(0, 8)}
              </Badge>
            </div>
            <p className="text-xs text-white/45 mt-1">
              Opened {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={TICKET_STATUS_VARIANT[ticket.status] ?? 'outline'} className="text-[9px]">
            {ticket.status.replace(/_/g, ' ')}
          </Badge>
          <Badge variant={TICKET_PRIORITY_VARIANT[ticket.priority] ?? 'outline'} className="text-[9px]">
            {ticket.priority}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation */}
        <Card className="border border-white/5 lg:col-span-2">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="text-xs font-bold text-white/90">Conversation</CardTitle>
            <CardDescription>{messages.length} message{messages.length === 1 ? '' : 's'} on this ticket</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {ticket.description && (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-white/35">Description</div>
                <p className="text-xs text-white/70 whitespace-pre-wrap">{ticket.description}</p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="text-center py-10 text-white/30 text-xs">No messages yet</div>
              )}
              {messages.map((message) => {
                const isAdmin = message.senderType === 'ADMIN';
                return (
                  <div key={message.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-xl border px-4 py-3 space-y-1.5 ${
                        isAdmin
                          ? 'bg-white/10 border-white/15'
                          : 'bg-white/[0.03] border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'text-white/70' : 'text-white/45'}`}>
                          {messageAuthor(message.senderType, message.senderId)}
                        </span>
                        <span className="text-[9px] text-white/25">
                          {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
                        </span>
                      </div>
                      <p className="text-xs text-white/80 whitespace-pre-wrap">{message.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply */}
            <div className="space-y-2 border-t border-white/5 pt-4">
              <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block" htmlFor="ticket-reply">
                Reply as admin
              </label>
              <textarea
                id="ticket-reply"
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={!canManage || replyMutation.isPending}
                placeholder={canManage ? 'Write a reply to the requester…' : 'Replies require the support.manage permission'}
                className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-white/[0.02] text-white placeholder-white/25 focus:outline-none focus:border-white/30 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] text-white/30">{replyText.length}/5000</span>
                <Button
                  size="sm"
                  disabled={!canManage || !replyText.trim()}
                  isLoading={replyMutation.isPending}
                  onClick={() => replyMutation.mutate(replyText.trim())}
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" /> Send Reply
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">Ticket Controls</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Status</label>
                <select
                  value={ticket.status}
                  disabled={!canManage || updateMutation.isPending}
                  onChange={(e) => updateMutation.mutate({ status: e.target.value as TicketStatus })}
                  className="glass-input w-full h-10 rounded-xl px-3 text-sm text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Priority</label>
                <select
                  value={ticket.priority}
                  disabled={!canManage || updateMutation.isPending}
                  onChange={(e) => updateMutation.mutate({ priority: e.target.value as TicketPriority })}
                  className="glass-input w-full h-10 rounded-xl px-3 text-sm text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {!canManage && (
                <p className="text-[10px] text-white/35 leading-relaxed">
                  You can view this ticket, but changing status or replying requires the support.manage permission.
                </p>
              )}

              {ticket.status === 'RESOLVED' && ticket.resolvedAt && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-400/80">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Resolved {new Date(ticket.resolvedAt).toLocaleString()}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-white/5">
            <CardHeader className="border-b border-white/5 pb-4">
              <CardTitle className="text-xs font-bold text-white/90">Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-start gap-2.5">
                <User className="h-3.5 w-3.5 text-white/30 mt-0.5" />
                <div>
                  <div className="text-xs text-white/80">{requesterName}</div>
                  <div className="text-[9px] uppercase tracking-wider font-bold text-white/35">{requesterRole}</div>
                </div>
              </div>

              {ticket.order && (
                <div className="flex items-start gap-2.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-white/30 mt-0.5" />
                  <div>
                    <div className="text-xs text-white/80">{ticket.order.orderNumber || ticket.order.id}</div>
                    <div className="text-[9px] uppercase tracking-wider font-bold text-white/35">
                      Order · {ticket.order.status || '—'}
                    </div>
                  </div>
                </div>
              )}

              {ticket.assignedToAdmin && (
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-white/30 mt-0.5" />
                  <div>
                    <div className="text-xs text-white/80">
                      {[ticket.assignedToAdmin.firstName, ticket.assignedToAdmin.lastName].filter(Boolean).join(' ') ||
                        ticket.assignedToAdmin.email ||
                        ticket.assignedToAdmin.id}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-bold text-white/35">Assigned admin</div>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5">
                <Calendar className="h-3.5 w-3.5 text-white/30 mt-0.5" />
                <div>
                  <div className="text-xs text-white/80">{ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : '—'}</div>
                  <div className="text-[9px] uppercase tracking-wider font-bold text-white/35">Created</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
