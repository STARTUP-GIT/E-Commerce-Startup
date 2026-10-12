"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios/axiosInstance";

export interface ConversationUnreadCounts {
  customerUnread: number;
  sellerUnread: number;
  totalUnread: number;
}

export function useConversationUnreadCounts() {
  const queryClient = useQueryClient();
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const { data, isLoading, refetch } = useQuery<ConversationUnreadCounts>({
    queryKey: ["admin-unread-counts"],
    queryFn: async () => {
      const res = await axiosInstance.get("/api/admin/conversations/unread-counts");
      return res.data;
    },
    staleTime: 5 * 1000,
    refetchInterval: wsConnected ? 30 * 1000 : 10 * 1000, // Frequent polling fallback when WS offline
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/chat?role=admin`;
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            payload.type === "unread_counts_update" ||
            payload.type === "admin_conversation_update" ||
            payload.type === "new_message" ||
            payload.type === "read_receipt"
          ) {
            queryClient.invalidateQueries({ queryKey: ["admin-unread-counts"] });
          }
        } catch {
          // ignore parsing error
        }
      };

      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
    } catch {
      // ignore connection error
    }

    return () => {
      if (ws) (ws as WebSocket).close();
    };
  }, [queryClient]);

  return {
    customerUnread: data?.customerUnread ?? 0,
    sellerUnread: data?.sellerUnread ?? 0,
    totalUnread: data?.totalUnread ?? 0,
    isLoading,
    wsConnected,
    refetch,
  };
}
