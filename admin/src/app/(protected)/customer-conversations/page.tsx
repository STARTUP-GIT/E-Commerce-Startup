"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import {
  MessageSquare,
  Send,
  Lock,
  Search,
  Check,
  CheckCheck,
  Paperclip,
  User,
  Shield,
  Circle,
  FileText
} from 'lucide-react';

export default function CustomerConversationsPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  // Load conversations list
  const { data: convData, isLoading: isConvLoading } = useQuery({
    queryKey: ['admin-customer-conversations', { search, statusFilter }],
    queryFn: async () => {
      const res = await axiosInstance.get('/api/admin/conversations', {
        params: {
          type: 'CUSTOMER_ADMIN',
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Load detail for selected conversation
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['admin-conversation-detail', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const res = await axiosInstance.get(`/api/admin/conversations/${selectedConversationId}`);
      return res.data;
    },
    enabled: !!selectedConversationId,
  });

  // Connect WebSocket
  useEffect(() => {
    let ws: WebSocket;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In dev/proxy environments, connect through same host:
      const wsUrl = `${protocol}//${window.location.host}/ws/chat?role=admin`;
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        if (selectedConversationId) {
          ws.send(JSON.stringify({ type: 'join', conversationId: selectedConversationId }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'new_message') {
            queryClient.invalidateQueries({ queryKey: ['admin-conversation-detail', payload.conversationId] });
            queryClient.invalidateQueries({ queryKey: ['admin-customer-conversations'] });
          }
        } catch (e) {
          console.error('[WS parse error]', e);
        }
      };

      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
    } catch (e) {
      console.warn('[WS init error]', e);
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // When selected conversation changes, join room via WS
  useEffect(() => {
    if (selectedConversationId && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'join', conversationId: selectedConversationId }));
    }
  }, [selectedConversationId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detailData?.conversation?.messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!messageText.trim()) throw new Error('Message required.');
      const res = await axiosInstance.post(`/api/admin/conversations/${selectedConversationId}/messages`, {
        message: messageText.trim(),
        isInternal,
        clientMessageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversation-detail', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['admin-customer-conversations'] });
      setMessageText('');
      setIsInternal(false);
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to send message.', 'error'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await axiosInstance.patch(`/api/admin/conversations/${selectedConversationId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-conversation-detail', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['admin-customer-conversations'] });
      showToast('Conversation status updated.', 'success');
    },
    onError: (err: any) => showToast(err?.response?.data?.message || 'Failed to update status.', 'error'),
  });

  const conversations = convData?.conversations ?? [];
  const currentConv = detailData?.conversation;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-400" />
            Customer Real-Time Conversations
          </h1>
          <p className="text-xs text-white/50">
            Durable customer support messaging with read receipts and confidential agent internal notes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={wsConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}>
            <Circle className={`h-2 w-2 mr-1.5 fill-current ${wsConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
            {wsConnected ? 'Live WebSocket Connected' : 'Reconnecting...'}
          </Badge>
        </div>
      </div>

      {/* Two-Pane Chat Container */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        {/* Left Pane: Conversations List */}
        <Card className="md:col-span-4 border border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col min-h-0 overflow-hidden">
          <div className="p-3 border-b border-slate-800 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search customers or subjects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {['', 'OPEN', 'PENDING', 'RESOLVED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === st
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === '' ? 'All' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {isConvLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3">
                  <Skeleton className="h-12 w-full bg-slate-800/40" />
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">No customer conversations found.</div>
            ) : (
              conversations.map((c: any) => {
                const isSelected = c.id === selectedConversationId;
                const lastMsg = c.messages?.[0];
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConversationId(c.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-950/30 border-l-2 border-indigo-400' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white truncate">
                        {c.customer ? `${c.customer.firstName || 'Customer'} ${c.customer.lastName || ''}`.trim() : 'Customer'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium truncate mb-1">{c.subject}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="truncate max-w-[180px]">
                        {lastMsg ? (lastMsg.isInternal ? '🔒 [Internal note]' : lastMsg.message) : 'No messages'}
                      </span>
                      <Badge className={c.status === 'OPEN' ? 'bg-emerald-500/10 text-emerald-400 text-[9px]' : 'bg-slate-800 text-slate-400 text-[9px]'}>
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Pane: Active Chat Room */}
        <Card className="md:col-span-8 border border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col min-h-0 overflow-hidden">
          {selectedConversationId && currentConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/30">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-white">
                      {currentConv.customer ? `${currentConv.customer.firstName} ${currentConv.customer.lastName}` : 'Customer'}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {currentConv.customer?.email} • {currentConv.subject}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={currentConv.status}
                    onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded text-xs text-white px-2 py-1 focus:outline-none"
                  >
                    <option value="OPEN">Status: OPEN</option>
                    <option value="PENDING">Status: PENDING</option>
                    <option value="RESOLVED">Status: RESOLVED</option>
                  </select>
                </div>
              </div>

              {/* Messages Scroll View */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isDetailLoading ? (
                  <Skeleton className="h-full w-full bg-slate-800/20" />
                ) : (
                  (currentConv.messages || detailData?.messages || []).map((msg: any) => {
                    const isAdmin = msg.senderType === 'ADMIN';
                    const isInternalMsg = msg.isInternal;

                    return (
                      <div
                        key={msg.id || msg.clientMessageId}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} max-w-full`}
                      >
                        <div
                          className={`max-w-[75%] rounded-xl p-3 text-xs shadow-sm space-y-2 ${
                            isInternalMsg
                              ? 'bg-amber-950/50 border border-amber-800/60 text-amber-200'
                              : isAdmin
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 border border-slate-700/60 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 font-semibold">
                            <span>
                              {isInternalMsg && '🔒 Confidential Agent Note • '}
                              {msg.senderName || msg.senderType}
                            </span>
                            <div className="flex items-center gap-1">
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isAdmin && <CheckCheck className="h-3 w-3 text-indigo-200" />}
                            </div>
                          </div>
                          {msg.message && <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>}

                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-white/10">
                              {msg.attachments.map((attUrl: string, idx: number) => {
                                const isImg = attUrl.match(/\.(jpeg|jpg|png|webp|avif)($|\?)/i);
                                return isImg ? (
                                  <a key={idx} href={attUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-white/10">
                                    <img src={attUrl} alt="evidence" className="max-h-40 rounded-lg object-cover" />
                                  </a>
                                ) : (
                                  <a key={idx} href={attUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 p-1.5 rounded bg-black/20 text-[11px] text-indigo-300 hover:underline">
                                    <FileText className="h-3.5 w-3.5" />
                                    <span className="truncate">Attachment Document</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-300">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
                    />
                    <Lock className="h-3 w-3" />
                    Internal Admin Note (Hidden from Customer)
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder={isInternal ? 'Type confidential internal note...' : 'Type message to customer...'}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                        e.preventDefault();
                        sendMessageMutation.mutate();
                      }
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs text-white border focus:outline-none ${
                      isInternal
                        ? 'bg-amber-950/20 border-amber-800/80 focus:border-amber-500'
                        : 'bg-slate-800 border-slate-700 focus:border-indigo-500'
                    }`}
                  />
                  <Button
                    size="sm"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    onClick={() => sendMessageMutation.mutate()}
                    className={isInternal ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
              <MessageSquare className="h-10 w-10 text-slate-700" />
              <p className="text-xs">Select a customer conversation from the list to view messages and respond.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
