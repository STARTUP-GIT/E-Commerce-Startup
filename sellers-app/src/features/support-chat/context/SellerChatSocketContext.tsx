"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";

export type ConnectionState = "connecting" | "connected" | "reconnecting" | "offline";

export interface SellerChatSocketContextType {
  isConnected: boolean;
  connectionState: ConnectionState;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  joinConversation: (id: string) => void;
  leaveConversation: (id: string) => void;
  reconnect: () => void;
  subscribeEventListener: (listener: (payload: any) => void) => () => void;
  socket: WebSocket | null;
}

const SellerChatSocketContext = createContext<SellerChatSocketContextType | null>(null);

function resolveSellerWsUrl(): string {
  if (typeof window === "undefined") return "";
  const envWs = process.env.NEXT_PUBLIC_WS_URL;
  if (envWs) {
    return `${envWs.replace(/\/$/, "")}/ws/chat?role=seller`;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host;
  return `${protocol}//${host}/ws/chat?role=seller`;
}

export function SellerChatSocketProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();

  const [connectionState, setConnectionState] = useState<ConnectionState>("offline");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersRef = useRef<Set<(payload: any) => void>>(new Set());
  const activeConversationIdRef = useRef<string | null>(null);
  activeConversationIdRef.current = activeConversationId;

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const closeSocket = useCallback(() => {
    isManuallyClosedRef.current = true;
    clearTimers();
    if (socketRef.current) {
      const ws = socketRef.current;
      socketRef.current = null;
      try {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, "Seller logout");
        }
      } catch {}
    }
    setConnectionState("offline");
  }, [clearTimers]);

  const handleIncomingMessage = useCallback(
    (payload: any) => {
      if (!payload || typeof payload !== "object") return;

      listenersRef.current.forEach((listener) => {
        try {
          listener(payload);
        } catch (err) {
          console.error("[SellerWS] Listener error:", err);
        }
      });

      switch (payload.type) {
        case "pong":
          break;

        case "auth_success":
          if (activeConversationIdRef.current && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({ type: "join", conversationId: activeConversationIdRef.current })
            );
          }
          break;

        case "new_message":
        case "conversation_status_updated":
        case "read_receipt": {
          queryClient.invalidateQueries({ queryKey: ["seller-support-conversations"] });
          queryClient.invalidateQueries({ queryKey: ["seller-conversations"] });

          const convId = payload.conversationId || payload.message?.conversationId;
          if (convId) {
            queryClient.invalidateQueries({ queryKey: ["seller-conversation-detail", convId] });
          }
          break;
        }

        case "session_expired":
          closeSocket();
          break;

        default:
          break;
      }
    },
    [closeSocket, queryClient]
  );

  const connect = useCallback(() => {
    if (status !== "authenticated" || !session?.user) {
      return;
    }

    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    isManuallyClosedRef.current = false;
    clearTimers();

    const wsUrl = resolveSellerWsUrl();
    if (!wsUrl) return;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isManuallyClosedRef.current) {
          ws.close(1000, "Closed");
          return;
        }

        reconnectAttemptsRef.current = 0;
        setConnectionState("connected");

        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
          }
        }, 30000);

        if (activeConversationIdRef.current) {
          ws.send(
            JSON.stringify({ type: "join", conversationId: activeConversationIdRef.current })
          );
        }
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          handleIncomingMessage(payload);
        } catch (err) {
          console.error("[SellerWS] Parse error:", err);
        }
      };

      ws.onclose = (event) => {
        if (isManuallyClosedRef.current) return;
        socketRef.current = null;
        clearTimers();

        if (event.code === 4001 || event.code === 1000) {
          setConnectionState("offline");
          return;
        }

        setConnectionState("reconnecting");
        const attempt = Math.min(reconnectAttemptsRef.current + 1, 8);
        reconnectAttemptsRef.current = attempt;
        const baseDelay = Math.min(20000, 1000 * Math.pow(1.5, attempt));
        const jitter = Math.random() * 800;
        const delay = baseDelay + jitter;

        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isManuallyClosedRef.current && status === "authenticated") {
            connect();
          }
        }, delay);
      };

      ws.onerror = () => {
        // onclose handles reconnect
      };
    } catch (err) {
      console.warn("[SellerWS] Init error:", err);
      setConnectionState("offline");
    }
  }, [clearTimers, handleIncomingMessage, session, status]);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      connect();
    } else if (status === "unauthenticated") {
      closeSocket();
    }
  }, [closeSocket, connect, session, status]);

  const joinConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "join", conversationId }));
    }
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    if (activeConversationIdRef.current === conversationId) {
      setActiveConversationId(null);
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "leave", conversationId }));
    }
  }, []);

  const manualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    clearTimers();
    if (socketRef.current) {
      try {
        socketRef.current.close(1000, "Manual reconnect");
      } catch {}
      socketRef.current = null;
    }
    connect();
  }, [clearTimers, connect]);

  const subscribeEventListener = useCallback((listener: (payload: any) => void) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const value: SellerChatSocketContextType = {
    isConnected: connectionState === "connected",
    connectionState,
    activeConversationId,
    setActiveConversationId,
    joinConversation,
    leaveConversation,
    reconnect: manualReconnect,
    subscribeEventListener,
    socket: socketRef.current,
  };

  return (
    <SellerChatSocketContext.Provider value={value}>
      {children}
    </SellerChatSocketContext.Provider>
  );
}

export function useSellerChatSocket() {
  const context = useContext(SellerChatSocketContext);
  if (!context) {
    return {
      isConnected: false,
      connectionState: "offline" as ConnectionState,
      activeConversationId: null,
      setActiveConversationId: () => {},
      joinConversation: () => {},
      leaveConversation: () => {},
      reconnect: () => {},
      subscribeEventListener: () => () => {},
      socket: null,
    };
  }
  return context;
}
