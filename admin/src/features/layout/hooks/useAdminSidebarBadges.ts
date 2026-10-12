"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/lib/axios/axiosInstance";

export interface SidebarBadgeCounts {
  customerConversations: number;
  sellerConversations: number;
  shops: number;
  sellerVerifications: number;
  sellerAgreements: number;
  appeals: number;
  customerReports: number;
  productReports: number;
  supportTickets: number;
  orders: number;
  returns: number;
  packingFeeRequests: number;
  sellerPayouts: number;
}

export const defaultBadgeCounts: SidebarBadgeCounts = {
  customerConversations: 0,
  sellerConversations: 0,
  shops: 0,
  sellerVerifications: 0,
  sellerAgreements: 0,
  appeals: 0,
  customerReports: 0,
  productReports: 0,
  supportTickets: 0,
  orders: 0,
  returns: 0,
  packingFeeRequests: 0,
  sellerPayouts: 0,
};

export function useAdminSidebarBadges() {
  const queryClient = useQueryClient();
  const [wsConnected, setWsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  const { data, isLoading, refetch } = useQuery<SidebarBadgeCounts>({
    queryKey: ["admin-sidebar-badges"],
    queryFn: async () => {
      const res = await axiosInstance.get("/api/admin/sidebar-badges");
      return res.data;
    },
    staleTime: 10 * 1000,
    refetchInterval: wsConnected ? 25 * 1000 : 10 * 1000,
  });

  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws/chat?role=admin`;
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => setWsConnected(true);

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            payload.type === "unread_counts_update" ||
            payload.type === "admin_conversation_update" ||
            payload.type === "new_message" ||
            payload.type === "read_receipt" ||
            payload.type === "notification" ||
            payload.type === "badge_update" ||
            payload.type === "shop_approval_update"
          ) {
            queryClient.invalidateQueries({ queryKey: ["admin-sidebar-badges"] });
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

  const badges = data || defaultBadgeCounts;

  const totalActionable = Object.values(badges).reduce((sum, count) => sum + (typeof count === "number" ? count : 0), 0);

  return {
    badges,
    totalActionable,
    isLoading,
    refetch,
  };
}
