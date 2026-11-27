"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAdminChatSocket, ConnectionState } from "../context/AdminChatSocketContext";

export type { ConnectionState };

export interface OnDemandSocketOptions {
  role: "admin" | "seller" | "customer";
  conversationId: string | null;
  onMessage?: (payload: any) => void;
  onReconnect?: () => void;
}

/**
 * Hook for chat components to access the shared, persistent WebSocket connection.
 * Does NOT disconnect when conversationId changes or components unmount.
 */
export function useOnDemandChatSocket({
  role: _role,
  conversationId,
  onMessage,
  onReconnect,
}: OnDemandSocketOptions) {
  const {
    isConnected,
    connectionState,
    joinConversation,
    leaveConversation,
    reconnect,
    subscribeEventListener,
    socket,
  } = useAdminChatSocket();

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;
  const prevConnectedRef = useRef(isConnected);

  // Subscribe to room when conversationId changes
  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId);
      return () => {
        leaveConversation(conversationId);
      };
    }
  }, [conversationId, joinConversation, leaveConversation]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsubscribe = subscribeEventListener((payload) => {
      if (onMessageRef.current) {
        onMessageRef.current(payload);
      }
    });
    return unsubscribe;
  }, [subscribeEventListener]);

  // Handle reconnect trigger
  useEffect(() => {
    if (!prevConnectedRef.current && isConnected) {
      if (onReconnectRef.current) {
        onReconnectRef.current();
      }
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  return {
    connectionState,
    isConnected,
    socket,
    reconnect,
  };
}
