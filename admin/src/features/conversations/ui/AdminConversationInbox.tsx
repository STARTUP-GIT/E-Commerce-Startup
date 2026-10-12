"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios/axiosInstance";
import { useOnDemandChatSocket } from "../hooks/useOnDemandChatSocket";
import { Card } from "@/shared/components/Card";
import { Badge } from "@/shared/components/Badge";
import { Button } from "@/shared/components/Button";
import { Skeleton } from "@/shared/components/Skeleton";
import { useUIStore } from "@/lib/store/uiStore";
import {
  MessageSquare,
  Send,
  Lock,
  Search,
  CheckCheck,
  Paperclip,
  User,
  Store,
  Circle,
  FileText,
  Package,
  AlertCircle,
  RefreshCw,
  X,
  ExternalLink,
  ChevronRight,
  Shield,
  Loader2,
} from "lucide-react";

export interface AdminConversationInboxProps {
  conversationType: "CUSTOMER_ADMIN" | "SELLER_ADMIN";
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor?: "indigo" | "purple" | "emerald";
}

interface OutgoingAttachment {
  name: string;
  url: string;
  type: string;
}

export function AdminConversationInbox({
  conversationType,
  title,
  subtitle,
  icon: HeaderIcon,
  accentColor = "indigo",
}: AdminConversationInboxProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<OutgoingAttachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [failedMessage, setFailedMessage] = useState<{ text: string; isInternal: boolean } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const isCustomer = conversationType === "CUSTOMER_ADMIN";
  const primaryBg = isCustomer ? "bg-indigo-600 hover:bg-indigo-500" : "bg-purple-600 hover:bg-purple-500";
  const primaryText = isCustomer ? "text-indigo-400" : "text-purple-400";
  const primaryBorder = isCustomer ? "border-indigo-500/30" : "border-purple-500/30";
  const primaryLightBg = isCustomer ? "bg-indigo-950/30" : "bg-purple-950/30";
  const primaryAccent = isCustomer ? "border-indigo-400" : "border-purple-400";

  // On-demand WebSocket connection: exists ONLY while a conversation is open
  const { connectionState, reconnect: reconnectSocket } = useOnDemandChatSocket({
    role: "admin",
    conversationId: selectedConversationId,
    onMessage: useCallback(
      (payload: any) => {
        if (
          payload.type === "new_message" ||
          payload.type === "admin_conversation_update" ||
          payload.type === "read_receipt" ||
          payload.type === "conversation_status_updated"
        ) {
          queryClient.invalidateQueries({ queryKey: ["admin-conversations", conversationType] });
          queryClient.invalidateQueries({ queryKey: ["admin-unread-counts"] });

          if (selectedConversationId && (payload.conversationId === selectedConversationId || !payload.conversationId)) {
            queryClient.invalidateQueries({ queryKey: ["admin-conversation-detail", selectedConversationId] });
          }
        }
      },
      [conversationType, selectedConversationId, queryClient]
    ),
    onReconnect: useCallback(() => {
      // Safe offline message recovery: re-fetch persisted history from database upon reconnection
      if (selectedConversationId) {
        queryClient.invalidateQueries({ queryKey: ["admin-conversation-detail", selectedConversationId] });
        queryClient.invalidateQueries({ queryKey: ["admin-conversations", conversationType] });
      }
    }, [conversationType, selectedConversationId, queryClient]),
  });

  const wsConnected = connectionState === "connected";

  // 1. Fetch conversations list
  const { data: convData, isLoading: isConvLoading, refetch: refetchConversations } = useQuery({
    queryKey: ["admin-conversations", conversationType, { search, statusFilter }],
    queryFn: async () => {
      const res = await axiosInstance.get("/api/admin/conversations", {
        params: {
          type: conversationType,
          search: search.trim() || undefined,
          status: statusFilter || undefined,
        },
      });
      return res.data;
    },
    staleTime: 5 * 1000,
    refetchInterval: wsConnected ? false : 6000, // Polling fallback when disconnected
  });

  // 2. Fetch conversation detail when selected
  const { data: detailData, isLoading: isDetailLoading, refetch: refetchDetail } = useQuery({
    queryKey: ["admin-conversation-detail", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const res = await axiosInstance.get(`/api/admin/conversations/${selectedConversationId}`);
      return res.data;
    },
    enabled: !!selectedConversationId,
    staleTime: 2 * 1000,
    refetchInterval: wsConnected ? false : 4000, // Polling fallback for messages
  });

  // 3. Mark conversation read on selection
  useEffect(() => {
    if (selectedConversationId) {
      axiosInstance
        .post(`/api/admin/conversations/${selectedConversationId}/read`)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["admin-unread-counts"] });
        })
        .catch(() => {});
    }
  }, [selectedConversationId, queryClient]);

  // Scroll to bottom on new messages
  const messages = detailData?.conversation?.messages || [];
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Handle attachment file selection and upload
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 15 * 1024 * 1024) {
          showToast(`File "${file.name}" exceeds 15MB limit.`, "error");
          continue;
        }

        const formData = new FormData();
        formData.append("image", file);
        formData.append("folder", "support");

        try {
          const res = await axiosInstance.post<{ data?: { url: string } }>("/api/storage/image", formData);
          const uploadedUrl = res.data?.data?.url;
          if (uploadedUrl) {
            setPendingAttachments((prev) => [...prev, { name: file.name, url: uploadedUrl, type: file.type }]);
          } else {
            throw new Error("No URL returned");
          }
        } catch {
          // Fallback to data url if storage endpoint unavailable in local dev
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setPendingAttachments((prev) => [...prev, { name: file.name, url: reader.result as string, type: file.type }]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to upload attachment", "error");
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    }
  };

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (vars?: { textOverride?: string; isInternalOverride?: boolean } | void) => {
      const textToSend = (vars ? vars.textOverride ?? messageText : messageText).trim();
      const internalToSend = vars ? vars.isInternalOverride ?? isInternal : isInternal;
      const attachmentsToSend = pendingAttachments.map((a) => a.url);

      if (!textToSend && attachmentsToSend.length === 0) {
        throw new Error("Message text or attachment is required.");
      }

      const clientMessageId = `msg_admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const res = await axiosInstance.post(`/api/admin/conversations/${selectedConversationId}/messages`, {
        message: textToSend,
        attachments: attachmentsToSend,
        isInternal: internalToSend,
        clientMessageId,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-conversation-detail", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-conversations", conversationType] });
      queryClient.invalidateQueries({ queryKey: ["admin-unread-counts"] });
      setMessageText("");
      setPendingAttachments([]);
      setIsInternal(false);
      setFailedMessage(null);
    },
    onError: (err: any, vars) => {
      const textToSave = (vars?.textOverride ?? messageText).trim();
      setFailedMessage({
        text: textToSave,
        isInternal: vars?.isInternalOverride ?? isInternal,
      });
      showToast(err?.response?.data?.message || "Failed to send message. Please retry.", "error");
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await axiosInstance.patch(`/api/admin/conversations/${selectedConversationId}/status`, {
        status: newStatus,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-conversation-detail", selectedConversationId] });
      queryClient.invalidateQueries({ queryKey: ["admin-conversations", conversationType] });
      queryClient.invalidateQueries({ queryKey: ["admin-unread-counts"] });
      showToast("Conversation status updated successfully.", "success");
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || "Failed to update status.", "error");
    },
  });

  const conversations = convData?.conversations ?? [];
  const currentConv = detailData?.conversation;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col space-y-4 animate-fade-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white/95 flex items-center gap-2">
            <HeaderIcon className={`h-5 w-5 ${primaryText}`} />
            {title}
          </h1>
          <p className="text-xs text-white/50">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            className={
              wsConnected
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs"
                : connectionState === "reconnecting"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs"
                : "bg-slate-800 text-slate-400 border border-slate-700 text-xs"
            }
          >
            <Circle
              className={`h-2 w-2 mr-1.5 fill-current ${
                wsConnected
                  ? "text-emerald-400"
                  : connectionState === "reconnecting"
                  ? "text-amber-400 animate-pulse"
                  : "text-slate-500"
              }`}
            />
            {selectedConversationId
              ? wsConnected
                ? "Real-Time WebSocket Connected"
                : connectionState === "reconnecting"
                ? "Reconnecting..."
                : connectionState === "connecting"
                ? "Connecting..."
                : "Persistent REST Polling"
              : "On-Demand Standby (No WS)"}
          </Badge>
          {selectedConversationId && connectionState === "offline" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => reconnectSocket()}
              className="text-[10px] h-6 px-2 border-slate-700 text-slate-400 hover:text-white"
            >
              Reconnect
            </Button>
          )}
        </div>
      </div>

      {/* Two-Pane Workspace */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        {/* Left Pane: Conversation List */}
        <Card className="md:col-span-4 border border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col min-h-0 overflow-hidden shadow-xl">
          {/* Search & Filter Header */}
          <div className="p-3 border-b border-slate-800 space-y-2 bg-slate-950/30">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder={isCustomer ? "Search customers or subjects..." : "Search sellers or shops..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-950/80 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {[
                { label: "All", value: "" },
                { label: "Unread", value: "UNREAD" },
                { label: "Open", value: "OPEN" },
                { label: "Pending", value: "PENDING" },
                { label: "Resolved", value: "RESOLVED" },
              ].map((st) => (
                <button
                  key={st.value}
                  onClick={() => setStatusFilter(st.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors ${
                    statusFilter === st.value
                      ? `${primaryLightBg} ${primaryText} border ${primaryBorder}`
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* List Scroll View */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {isConvLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3">
                  <Skeleton className="h-14 w-full bg-slate-800/40 rounded-lg" />
                </div>
              ))
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                <HeaderIcon className="h-8 w-8 text-slate-700 mx-auto" />
                <p>No conversations found in this view.</p>
              </div>
            ) : (
              conversations.map((c: any) => {
                const isSelected = c.id === selectedConversationId;
                const lastMsg = c.messages?.[0];
                const participantName = isCustomer
                  ? c.customer
                    ? `${c.customer.firstName || "Customer"} ${c.customer.lastName || ""}`.trim()
                    : "Customer"
                  : c.seller
                  ? `${c.seller.firstName || "Seller"} ${c.seller.lastName || ""}`.trim()
                  : "Seller";

                const secondaryName = isCustomer
                  ? c.customer?.email
                  : c.seller?.shops?.[0]?.name || c.seller?.shop?.name || "Shop";

                const unreadCount = Number(c.unreadCount || 0);

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConversationId(c.id)}
                    className={`p-3 cursor-pointer transition-colors relative ${
                      isSelected ? `${primaryLightBg} border-l-2 ${primaryAccent}` : "hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                        <span className="font-semibold text-xs text-white truncate">{participantName}</span>
                        {secondaryName && (
                          <span className="text-[10px] text-slate-500 font-normal truncate">
                            ({secondaryName})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(c.lastMessageAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-300 font-medium truncate mb-1">{c.subject}</div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 gap-2">
                      <span className="truncate max-w-[170px]">
                        {lastMsg ? (lastMsg.isInternal ? "🔒 [Internal note]" : lastMsg.message) : "No messages yet"}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {unreadCount > 0 && (
                          <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-indigo-500 text-white font-black text-[9px] shadow-sm">
                            {unreadCount}
                          </span>
                        )}
                        <Badge
                          className={
                            c.status === "OPEN"
                              ? "bg-emerald-500/10 text-emerald-400 text-[9px] border border-emerald-500/20"
                              : c.status === "PENDING"
                              ? "bg-amber-500/10 text-amber-400 text-[9px] border border-amber-500/20"
                              : "bg-slate-800 text-slate-400 text-[9px]"
                          }
                        >
                          {c.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Right Pane: Active Chat Room */}
        <Card className="md:col-span-8 border border-slate-800 bg-slate-900/50 backdrop-blur-sm flex flex-col min-h-0 overflow-hidden shadow-xl">
          {selectedConversationId && currentConv ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/50">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`h-9 w-9 rounded-full ${primaryLightBg} ${primaryText} flex items-center justify-center font-bold text-xs border ${primaryBorder} shrink-0`}
                  >
                    {isCustomer ? <User className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white flex items-center gap-2 truncate">
                      <span>
                        {isCustomer
                          ? currentConv.customer
                            ? `${currentConv.customer.firstName} ${currentConv.customer.lastName}`
                            : "Customer"
                          : currentConv.seller
                          ? `${currentConv.seller.firstName} ${currentConv.seller.lastName}`
                          : "Seller"}
                      </span>
                      {!isCustomer && (
                        <span className="text-purple-400 font-normal text-[11px] truncate">
                          ({currentConv.seller?.shops?.[0]?.name || currentConv.seller?.shop?.name || "Merchant Shop"})
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 truncate">
                      <span>{isCustomer ? currentConv.customer?.email : currentConv.seller?.email}</span>
                      <span>•</span>
                      <span className="truncate text-slate-300 font-medium">{currentConv.subject}</span>
                      {currentConv.relatedEntityType === "ORDER" && currentConv.relatedEntityId && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 flex items-center gap-1 font-mono text-[9px]">
                            <Package className="h-2.5 w-2.5" /> Order #{currentConv.relatedEntityId}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={currentConv.status}
                    onChange={(e) => updateStatusMutation.mutate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg text-xs text-white px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
                  >
                    <option value="OPEN">Status: OPEN</option>
                    <option value="PENDING">Status: PENDING</option>
                    <option value="RESOLVED">Status: RESOLVED</option>
                  </select>
                </div>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isDetailLoading ? (
                  <Skeleton className="h-full w-full bg-slate-800/20 rounded-xl" />
                ) : messages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                    <MessageSquare className="h-6 w-6 text-slate-700 mx-auto" />
                    <p>No messages recorded for this conversation yet.</p>
                  </div>
                ) : (
                  messages.map((msg: any) => {
                    const isAdmin = msg.senderType === "ADMIN";
                    const isInternalMsg = Boolean(msg.isInternal);

                    return (
                      <div
                        key={msg.id || msg.clientMessageId}
                        className={`flex flex-col ${isAdmin ? "items-end" : "items-start"} max-w-full`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl p-3 text-xs shadow-sm space-y-2 ${
                            isInternalMsg
                              ? "bg-amber-950/60 border border-amber-800/70 text-amber-100 ring-1 ring-amber-500/20"
                              : isAdmin
                              ? `${isCustomer ? "bg-indigo-600" : "bg-purple-600"} text-white shadow-md`
                              : "bg-slate-800 border border-slate-700/60 text-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 font-semibold">
                            <span>
                              {isInternalMsg && "🔒 Confidential Admin Note • "}
                              {msg.senderName || msg.senderType}
                            </span>
                            <div className="flex items-center gap-1">
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {isAdmin && !isInternalMsg && <CheckCheck className="h-3 w-3 opacity-90" />}
                            </div>
                          </div>

                          {msg.message && <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>}

                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-1.5 pt-1.5 border-t border-white/10">
                              {msg.attachments.map((attUrl: string, idx: number) => {
                                const isImg = attUrl.match(/\.(jpeg|jpg|png|webp|avif)($|\?)/i) || attUrl.startsWith("data:image");
                                return isImg ? (
                                  <a
                                    key={idx}
                                    href={attUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block rounded-lg overflow-hidden border border-white/10 hover:opacity-95 transition-opacity"
                                  >
                                    <img src={attUrl} alt="evidence" className="max-h-48 rounded-lg object-cover" />
                                  </a>
                                ) : (
                                  <a
                                    key={idx}
                                    href={attUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-2 rounded-lg bg-black/20 hover:bg-black/30 text-[11px] text-white/90 border border-white/10"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-white/60" />
                                    <span className="truncate flex-1">Attached Document</span>
                                    <ExternalLink className="h-3 w-3 text-white/40" />
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

                {/* Failed Message Banner with Retry */}
                {failedMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                      <span>Failed to send: "{failedMessage.text}"</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        sendMessageMutation.mutate({
                          textOverride: failedMessage.text,
                          isInternalOverride: failedMessage.isInternal,
                        })
                      }
                      className="bg-rose-600 hover:bg-rose-500 text-white text-[11px] h-7 gap-1"
                    >
                      <RefreshCw className="h-3 w-3" /> Retry
                    </Button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Attachments Preview Tray */}
              {pendingAttachments.length > 0 && (
                <div className="px-3 pt-2 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2 overflow-x-auto">
                  {pendingAttachments.map((att, i) => (
                    <div
                      key={i}
                      className="h-8 px-2.5 rounded-lg bg-slate-800 border border-slate-700 flex items-center gap-1.5 text-xs text-white"
                    >
                      <FileText className={`h-3.5 w-3.5 ${primaryText}`} />
                      <span className="truncate max-w-[120px]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setPendingAttachments((p) => p.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Chat Composer Input Tray */}
              <div className="p-3 border-t border-slate-800 bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-300 font-semibold select-none">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                    <Lock className="h-3 w-3" />
                    Internal Admin Note (Confidential • Hidden from {isCustomer ? "Customer" : "Merchant"})
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={attachmentInputRef}
                    onChange={handleAttachmentUpload}
                    multiple
                    className="hidden"
                    accept="image/*,application/pdf"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingAttachment}
                    onClick={() => attachmentInputRef.current?.click()}
                    title="Attach image or PDF document"
                    className="border-slate-700 bg-slate-800/80 text-slate-300 hover:text-white h-9 w-9 p-0 rounded-xl shrink-0"
                  >
                    {isUploadingAttachment ? (
                      <Loader2 className={`h-4 w-4 animate-spin ${primaryText}`} />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                  </Button>

                  <input
                    type="text"
                    placeholder={
                      isInternal
                        ? "Type confidential internal note for fellow agents..."
                        : `Type reply to ${isCustomer ? "customer" : "merchant"}...`
                    }
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && (messageText.trim() || pendingAttachments.length > 0)) {
                        e.preventDefault();
                        sendMessageMutation.mutate();
                      }
                    }}
                    className={`flex-1 px-3 py-2 rounded-xl text-xs text-white border focus:outline-none transition-colors ${
                      isInternal
                        ? "bg-amber-950/20 border-amber-800/80 focus:border-amber-500 placeholder-amber-400/40"
                        : "bg-slate-800 border-slate-700 focus:border-indigo-500 placeholder-slate-500"
                    }`}
                  />

                  <Button
                    size="sm"
                    disabled={
                      (!messageText.trim() && pendingAttachments.length === 0) || sendMessageMutation.isPending
                    }
                    onClick={() => sendMessageMutation.mutate()}
                    className={`rounded-xl h-9 px-3 ${
                      isInternal
                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                        : primaryBg + " text-white"
                    }`}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 space-y-2">
              <HeaderIcon className="h-10 w-10 text-slate-700" />
              <p className="text-xs">
                Select a {isCustomer ? "customer" : "seller"} conversation from the list to view history and respond.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
