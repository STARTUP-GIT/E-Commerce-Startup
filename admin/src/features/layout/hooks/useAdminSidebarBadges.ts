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
  const { data, isLoading, refetch } = useQuery<SidebarBadgeCounts>({
    queryKey: ["admin-sidebar-badges"],
    queryFn: async () => {
      const res = await axiosInstance.get("/api/admin/sidebar-badges");
      return res.data;
    },
    staleTime: 20 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Conservative polling interval only while the application tab is actively visible
    refetchInterval: () => (typeof document !== "undefined" && document.visibilityState === "visible" ? 45 * 1000 : false),
  });

  // Re-sync authoritative badge state when browser tab returns to focus
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

  const badges = data || defaultBadgeCounts;

  const totalActionable = Object.values(badges).reduce((sum, count) => sum + (typeof count === "number" ? count : 0), 0);

  return {
    badges,
    totalActionable,
    isLoading,
    refetch,
  };
}
