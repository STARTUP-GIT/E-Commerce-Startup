import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { Card } from '@/shared/components/Card';
import { Badge } from '@/shared/components/Badge';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  MessageSquare,
  Send,
  Circle,
  Plus,
  X
} from 'lucide-react';

export function SupportChatPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newInitialMessage, setNewInitialMessage] = useState('');

  const socketRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const queryClient = useQueryClient();

  // Load conversations list
  const { data: convData, isLoading: isConvLoading } = useQuery({
    queryKey: ['seller-support-conversations'],
    queryFn: async () => {
      const res = await axiosInstance.get('/seller/api/conversations');
      return res.data;
    },
    staleTime: 10 * 1000,
  });

  // Load detail for selected conversation
  const { data: detailData, isLoading: isDetailLoading } = useQuery({
    queryKey: ['seller-conversation-detail', selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const res = await axiosInstance.get(`/seller/api/conversations/${selectedConversationId}`);
      return res.data;
    },
    enabled: !!selectedConversationId,
  });

  // Connect WebSocket
  useEffect(() => {
    let ws: WebSocket;
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/chat?role=seller`;
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
            queryClient.invalidateQueries({ queryKey: ['seller-conversation-detail', payload.conversationId] });
            queryClient.invalidateQueries({ queryKey: ['seller-support-conversations'] });
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
      const res = await axiosInstance.post(`/seller/api/conversations/${selectedConversationId}/messages`, {
        message: messageText.trim(),
        clientMessageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-conversation-detail', selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ['seller-support-conversations'] });
      setMessageText('');
    },
  });

  // Start new conversation mutation
  const startConversationMutation = useMutation({
    mutationFn: async () => {
      if (!newSubject.trim() || !newInitialMessage.trim()) return;
      const res = await axiosInstance.post('/seller/api/conversations', {
        subject: newSubject.trim(),
        initialMessage: newInitialMessage.trim(),
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['seller-support-conversations'] });
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
    <DashboardLayout>
      <div className="h-[calc(100vh-9rem)] flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-400" />
              Direct Marketplace Support & Helpdesk
            </h1>
            <p className="text-xs text-white/50">
              Live messaging with marketplace administrators for statement inquiries, disputes, and compliance assistance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={wsConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}>
              <Circle className={`h-2 w-2 mr-1.5 fill-current ${wsConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
              {wsConnected ? 'Connected' : 'Connecting...'}
            </Badge>
            <Button
              size="sm"
              onClick={() => setShowNewModal(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-1"
            >
              <Plus className="h-3.5 w-3.5" /> New Ticket
            </Button>
          </div>
        </div>

        {/* Chat Two-Pane Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
          {/* Left Pane: Conversations */}
          <Card className="md:col-span-4 border border-white/5 bg-white/[0.02] flex flex-col min-h-0 overflow-hidden">
            <div className="p-3 border-b border-white/5 font-semibold text-xs text-white/70">
              Your Conversations
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {isConvLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="p-3">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40">
                  No support conversations yet. Click "New Ticket" to begin.
                </div>
              ) : (
                conversations.map((c: any) => {
                  const isSelected = c.id === selectedConversationId;
                  const lastMsg = c.messages?.[0];
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConversationId(c.id)}
                      className={`p-3 cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-950/30 border-l-2 border-purple-400' : 'hover:bg-white/[0.03]'
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
                        <Badge className="text-[9px] bg-white/5 border-white/10 text-white/60">
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          {/* Right Pane: Active Messages */}
          <Card className="md:col-span-8 border border-white/5 bg-white/[0.02] flex flex-col min-h-0 overflow-hidden">
            {selectedConversationId && currentConv ? (
              <>
                {/* Header */}
                <div className="p-3.5 border-b border-white/5 flex items-center justify-between bg-black/20">
                  <div>
                    <h3 className="font-bold text-xs text-white">{currentConv.subject}</h3>
                    <span className="text-[10px] text-white/40">Marketplace Administration Desk</span>
                  </div>
                  <Badge className="text-[10px] bg-white/5 border-white/10 text-white/60">
                    Status: {currentConv.status}
                  </Badge>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isDetailLoading ? (
                    <Skeleton className="h-full w-full" />
                  ) : (
                    currentConv.messages?.map((msg: any) => {
                      const isSeller = msg.senderType === 'SELLER';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isSeller ? 'items-end' : 'items-start'} max-w-full`}
                        >
                          <div
                            className={`max-w-[75%] rounded-xl p-3 text-xs shadow-sm space-y-1 ${
                              isSeller
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-white/90 border border-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3 text-[10px] opacity-75 font-semibold">
                              <span>{isSeller ? 'You' : 'Marketplace Admin'}</span>
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

                {/* Input */}
                <div className="p-3 border-t border-white/5 bg-black/20 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Type your message to administration..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                        e.preventDefault();
                        sendMessageMutation.mutate();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-lg text-xs text-white bg-white/[0.04] border border-white/10 focus:outline-none focus:border-purple-500"
                  />
                  <Button
                    size="sm"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    onClick={() => sendMessageMutation.mutate()}
                    className="bg-purple-600 hover:bg-purple-500 text-white"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-white/40 space-y-2">
                <MessageSquare className="h-10 w-10 text-white/10" />
                <p className="text-xs">Select a conversation or start a new ticket to reach administrators.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Start New Ticket Modal */}
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <Card className="max-w-md w-full p-6 border-white/10 bg-[#0d0d14] space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-sm text-white">Start Support Conversation</h3>
                <button onClick={() => setShowNewModal(false)} className="text-white/40 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">Subject *</label>
                  <input
                    type="text"
                    placeholder="e.g. Commission Statement clarification / Packing fee inquiry"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-white/80 block mb-1">Initial Message *</label>
                  <textarea
                    rows={4}
                    placeholder="Describe your inquiry or dispute in detail..."
                    value={newInitialMessage}
                    onChange={(e) => setNewInitialMessage(e.target.value)}
                    className="w-full p-3 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <Button size="sm" variant="outline" onClick={() => setShowNewModal(false)} className="border-white/10 text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!newSubject.trim() || !newInitialMessage.trim() || startConversationMutation.isPending}
                  onClick={() => startConversationMutation.mutate()}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  {startConversationMutation.isPending ? 'Sending...' : 'Open Ticket'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
