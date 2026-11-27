"use client";

import { useEffect, useRef } from "react";
import { useSellerChatSocket, ConnectionState } from "../context/SellerChatSocketContext";

export type { ConnectionState };

export interface OnDemandSocketOptions {
  role: "customer" | "seller" | "admin";
  conversationId: string | null;
  onMessage?: (payload: any) => void;
  onReconnect?: () => void;
}

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
  } = useSellerChatSocket();

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;
  const prevConnectedRef = useRef(isConnected);

  useEffect(() => {
    if (conversationId) {
      joinConversation(conversationId);
      return () => {
        leaveConversation(conversationId);
      };
    }
  }, [conversationId, joinConversation, leaveConversation]);

  useEffect(() => {
    const unsubscribe = subscribeEventListener((payload) => {
      if (onMessageRef.current) {
        onMessageRef.current(payload);
      }
    });
    return unsubscribe;
  }, [subscribeEventListener]);

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
