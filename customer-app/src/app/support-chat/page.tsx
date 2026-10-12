"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MessageSquare,
  Send,
  Circle,
  Plus,
  X,
  HelpCircle,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerSupportChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newInitialMessage, setNewInitialMessage] = useState('');

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  // Load customer's conversations
  const { data: convData, isLoading: isConvLoading } = useQuery({
    queryKey: ['customer-conversations'],
    queryFn: async () => {
      const res = await axiosInstance.get('/customer/api/conversations');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Load detail for selected conversation
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['customer-conversation-detail', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const res = await axiosInstance.get(`/customer/api/conversations/${selectedConversationId}`);
      return res.data;
    },
    enabled: !!selectedConversationId,
  });

  // Connect WebSocket
  useEffect(() => {
    let ws: WebSocket;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/chat?role=customer`;
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
            queryClient.invalidateQueries({ queryKey: ['customer-conversation-detail', payload.conversationId] });
            queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
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

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      if (!messageText.trim()) return;
      const res = await axiosInstance.post(`/customer/api/conversations/${selectedConversationId}/messages`, {
        message: messageText.trim(),
        clientMessageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-conversation-detail', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
      setMessageText('');
    },
  });

  // Start new conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async () => {
      if (!newSubject.trim() || !newInitialMessage.trim()) return;
      const res = await axiosInstance.post('/customer/api/conversations', {
        subject: newSubject.trim(),
        initialMessage: newInitialMessage.trim(),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
      setShowNewModal(false);
      setNewSubject('');
      setNewInitialMessage('');
      if (data?.conversation?.id) {
        setSelectedConversationId(data.conversation.id);
      }
    },
  });

  const conversations = convData?.conversations ?? [];
  const currentConv = detailData?.conversation;

  return (
    <div className="min-h-screen bg-[#07070a] text-white p-4 sm:p-6 flex flex-col">
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-400" />
                Customer Support & Dispute Desk
              </h1>
              <p className="text-xs text-white/50">
                Direct messaging with marketplace trust &amp; customer care team.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${wsConnected ? 'border-emerald-500/30 text-emerald-400' : 'text-white/40'}`}>
              <Circle className={`h-2 w-2 mr-1.5 fill-current ${wsConnected ? 'text-emerald-400' : 'text-white/40'}`} />
              {wsConnected ? 'Live Connection' : 'Connecting...'}
            </Badge>
            <Button
              size="sm"
              onClick={() => setShowNewModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> New Inquiry
            </Button>
          </div>
        </div>

        {/* Two-Pane Chat Container */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-[500px]">
          {/* Left Pane: Conversations */}
          <div className="md:col-span-4 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col min-h-0 overflow-hidden">
            <div className="p-3.5 border-b border-white/10 font-semibold text-xs text-white/70">
              Your Inquiries ({conversations.length})
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {isConvLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-12 w-full bg-white/5" />
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40">
                  No support conversations yet. Click "New Inquiry" to speak with our support desk.
                </div>
              ) : (
                conversations.map((c: any) => {
                  const isSelected = c.id === selectedConversationId;
                  const lastMsg = c.messages?.[0];
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConversationId(c.id)}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-950/30 border-l-2 border-indigo-400' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-xs text-white truncate max-w-[170px]">{c.subject}</span>
                        <span className="text-[10px] text-white/40">
                          {new Date(c.lastMessageAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-white/50">
                        <span className="truncate max-w-[180px]">
                          {lastMsg ? lastMsg.message : 'No messages'}
                        </span>
                        <Badge variant="outline" className="text-[9px]">
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Pane: Active Chat Room */}
          <div className="md:col-span-8 rounded-2xl border border-white/10 bg-white/[0.02] flex flex-col min-h-0 overflow-hidden">
            {selectedConversationId && currentConv ? (
              <>
                <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/30">
                  <div>
                    <h3 className="font-bold text-xs text-white">{currentConv.subject}</h3>
                    <span className="text-[10px] text-white/40">Marketplace Official Support Desk</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {currentConv.status}
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isDetailLoading ? (
                    <Skeleton className="h-full w-full bg-white/5" />
                  ) : (
                    currentConv.messages?.map((msg: any) => {
                      const isCustomer = msg.senderType === 'CUSTOMER';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'} max-w-full`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl p-3 text-xs shadow-sm space-y-1 ${
                              isCustomer
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white/10 text-white/95 border border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 font-semibold">
                              <span>{isCustomer ? 'You' : 'Customer Support Team'}</span>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="p-3 border-t border-white/10 bg-black/30 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your message to support..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                        e.preventDefault();
                        sendMessageMutation.mutate();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl text-xs text-white bg-white/[0.05] border border-white/10 focus:outline-none focus:border-indigo-500"
                  />
                  <Button
                    size="sm"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    onClick={() => sendMessageMutation.mutate()}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40 space-y-2">
                <MessageSquare className="h-10 w-10 text-white/10" />
                <p className="text-xs">Select an inquiry or start a new message to chat with support.</p>
              </div>
            )}
          </div>
        </div>

        {/* Start New Inquiry Modal */}
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="max-w-md w-full bg-[#0d0d14] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-sm text-white">Start New Support Inquiry</h3>
                <button onClick={() => setShowNewModal(false)} className="text-white/40 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">Subject / Order ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. Order #1045 delivery issue / Product question"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">Message *</label>
                  <textarea
                    rows={4}
                    placeholder="Describe how we can help you..."
                    value={newInitialMessage}
                    onChange={(e) => setNewInitialMessage(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button size="sm" variant="outline" onClick={() => setShowNewModal(false)} className="border-white/10 text-xs text-white/70">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!newSubject.trim() || !newInitialMessage.trim() || startConversationMutation.isPending}
                  onClick={() => startConversationMutation.mutate()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {startConversationMutation.isPending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
