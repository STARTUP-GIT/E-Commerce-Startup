"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Store, 
  FileCheck, 
  MessageSquare, 
  BadgeCheck, 
  AlertTriangle, 
  ExternalLink,
  Clock,
  Sparkles,
  X
} from "lucide-react";
import axiosInstance from "@/lib/axios/axiosInstance";

export interface AdminNotification {
  id: string;
  type: string;
  channel: string;
  status: string;
  title: string;
  body: string;
  sentAt?: string;
  readAt?: string | null;
  data?: Record<string, any> | null;
  createdAt: string;
  customerId?: string | null;
  sellerId?: string | null;
  adminId?: string | null;
}

export function AdminNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, refetch } = useQuery<{ notifications: AdminNotification[] }>({
    queryKey: ["admin-notifications-dropdown"],
    queryFn: async () => {
      const res = await axiosInstance.get("/api/admin/notifications?limit=15");
      return res.data;
    },
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await axiosInstance.patch(`/api/admin/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-badges"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await axiosInstance.patch("/api/admin/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications-dropdown"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-badges"] });
    },
  });

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = data?.notifications || [];
  const unreadCount = notifications.filter((n) => !n.readAt && n.status !== "READ").length;

  const getDestinationUrl = (notif: AdminNotification): string => {
    const d = notif.data || {};
    if (d.shopId) return `/shops/${d.shopId}`;
    if (d.conversationId && notif.type.includes("SELLER")) return `/seller-conversations`;
    if (d.conversationId || notif.type.includes("CUSTOMER")) return `/customer-conversations`;
    if (notif.type.includes("SHOP") || notif.type.includes("AGREEMENT")) {
      return d.shopId ? `/shops/${d.shopId}` : `/shops`;
    }
    if (notif.type.includes("VERIFICATION")) return `/seller-verifications`;
    if (notif.type.includes("APPEAL")) return `/appeals`;
    if (notif.type.includes("REPORT")) return `/reports`;
    return `/notifications`;
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("SHOP") || type.includes("STORE")) {
      return <Store className="h-4 w-4 text-emerald-400" />;
    }
    if (type.includes("AGREEMENT")) {
      return <FileCheck className="h-4 w-4 text-blue-400" />;
    }
    if (type.includes("MESSAGE") || type.includes("CONVERSATION")) {
      return <MessageSquare className="h-4 w-4 text-purple-400" />;
    }
    if (type.includes("VERIFICATION")) {
      return <BadgeCheck className="h-4 w-4 text-amber-400" />;
    }
    return <AlertTriangle className="h-4 w-4 text-indigo-400" />;
  };

  const handleNotificationClick = async (notif: AdminNotification) => {
    if (!notif.readAt && notif.status !== "READ") {
      markReadMutation.mutate(notif.id);
    }
    setIsOpen(false);
    const url = getDestinationUrl(notif);
    router.push(url);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl glass hover:border-white/20 text-white/70 hover:text-white transition-all cursor-pointer flex items-center justify-center"
        aria-label="Open notifications"
        id="admin-notification-bell"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span 
            id="admin-notification-badge" 
            className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white ring-2 ring-[#07070a] shadow-sm animate-pulse"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : (
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white/30" />
        )}
      </button>

      {isOpen && (
        <div 
          id="admin-notification-panel"
          className="absolute right-0 mt-2 w-96 max-w-[90vw] rounded-2xl bg-[#0c0c11]/95 border border-white/10 shadow-2xl backdrop-blur-xl z-50 overflow-hidden animate-fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  className="text-[11px] font-semibold text-white/50 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>Mark read</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-white/[0.04]">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Sparkles className="h-8 w-8 text-white/20 mx-auto mb-2" />
                <p className="text-xs font-semibold text-white/60">No notifications yet</p>
                <p className="text-[10px] text-white/30 mt-0.5">You're completely up to date.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.readAt && notif.status !== "READ";
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      isUnread
                        ? "bg-white/[0.04] hover:bg-white/[0.08]"
                        : "hover:bg-white/[0.02] opacity-75 hover:opacity-100"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-bold text-white truncate block">
                          {notif.title}
                        </span>
                        {isUnread && (
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-white/65 line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-white/35">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span className="uppercase text-[9px] font-semibold tracking-wider text-white/40">
                          {notif.type.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-xs">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-bold text-white/60 hover:text-white flex items-center gap-1.5 transition-colors px-2 py-1"
            >
              <span>View all notifications</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
