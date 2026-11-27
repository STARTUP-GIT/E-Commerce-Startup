"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios/axiosInstance";
import { useAdminChatSocket } from "../context/AdminChatSocketContext";

export interface ConversationUnreadCounts {
  customerUnread: number;
  sellerUnread: number;
  deliveryUnread: number;
  totalUnread: number;
}

export function useConversationUnreadCounts() {
  const { isConnected } = useAdminChatSocket();
  const { data, isLoading, refetch } = useQuery<ConversationUnreadCounts>({
    queryKey: ["admin-unread-counts"],
    queryFn: async () => {
      const res = await axiosInstance.get("/api/admin/conversations/unread-counts");
      return res.data;
    },
    staleTime: 15 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Conservative polling only while the tab is actively visible
    refetchInterval: () => (typeof document !== "undefined" && document.visibilityState === "visible" ? 30 * 1000 : false),
  });

  // Re-sync unread counts immediately when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch]);

  return {
    customerUnread: data?.customerUnread ?? 0,
    sellerUnread: data?.sellerUnread ?? 0,
    deliveryUnread: data?.deliveryUnread ?? 0,
    totalUnread: data?.totalUnread ?? 0,
    isLoading,
    wsConnected: isConnected,
    refetch,
  };
}
