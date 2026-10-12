"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export type ConnectionState = "idle" | "connecting" | "connected" | "reconnecting" | "offline";

export interface OnDemandSocketOptions {
  role: "admin" | "seller" | "customer";
  conversationId: string | null;
  onMessage?: (payload: any) => void;
  onReconnect?: () => void;
}

export function useOnDemandChatSocket({
  role,
  conversationId,
  onMessage,
  onReconnect,
}: OnDemandSocketOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);

  // Keep callback refs stable
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  const cleanup = useCallback(() => {
    isManuallyClosedRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (socketRef.current) {
      try {
        if (
          socketRef.current.readyState === WebSocket.OPEN ||
          socketRef.current.readyState === WebSocket.CONNECTING
        ) {
          socketRef.current.close(1000, "Chat closed");
        }
      } catch {
        // Ignore close errors
      }
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    // WebSocket connections must exist ONLY while a user is actively viewing an open chat
    if (!conversationId) {
      cleanup();
      setConnectionState("idle");
      return;
    }

    let isMounted = true;
    isManuallyClosedRef.current = false;

    function connect() {
      if (!isMounted || !conversationId) return;

      if (socketRef.current) {
        try {
          socketRef.current.close(1000, "Switching conversation");
        } catch {}
        socketRef.current = null;
      }

      setConnectionState(reconnectAttemptsRef.current > 0 ? "reconnecting" : "connecting");

      try {
        const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
        const wsUrl = `${protocol}//${host}/ws/chat?role=${role}`;

        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          if (!isMounted || !conversationId) {
            ws.close(1000, "Unmounted");
            return;
          }
          setConnectionState("connected");
          const wasReconnection = reconnectAttemptsRef.current > 0;
          reconnectAttemptsRef.current = 0;

          // Join active authorized conversation room
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "join", conversationId }));
          }

          if (wasReconnection && onReconnectRef.current) {
            onReconnectRef.current();
          }
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (onMessageRef.current) {
              onMessageRef.current(data);
            }
          } catch (e) {
            console.error("[WS] Parse error:", e);
          }
        };

        ws.onclose = (event) => {
          if (!isMounted || isManuallyClosedRef.current) return;

          socketRef.current = null;
          // Stop reconnect if code is 4001 (auth failure/session expired) or clean close (1000)
          if (event.code === 4001 || event.code === 1000) {
            setConnectionState("offline");
            return;
          }

          // Bounded exponential backoff with jitter: max 5 attempts
          const maxAttempts = 5;
          if (reconnectAttemptsRef.current < maxAttempts) {
            reconnectAttemptsRef.current += 1;
            const baseDelay = Math.min(15000, 1000 * Math.pow(1.5, reconnectAttemptsRef.current));
            const jitter = Math.random() * 500;
            const delay = baseDelay + jitter;

            setConnectionState("reconnecting");
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted && !isManuallyClosedRef.current && conversationId) {
                connect();
              }
            }, delay);
          } else {
            setConnectionState("offline");
          }
        };

        ws.onerror = () => {
          // Handled by onclose
        };
      } catch (err) {
        console.warn("[WS] Init error:", err);
        setConnectionState("offline");
      }
    }

    connect();

    return () => {
      isMounted = false;
      cleanup();
    };
  }, [conversationId, role, cleanup]);

  const manualReconnect = useCallback(() => {
    if (!conversationId) return;
    reconnectAttemptsRef.current = 0;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    isManuallyClosedRef.current = false;
    setConnectionState("connecting");

    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = typeof window !== "undefined" ? window.location.host : "localhost:3000";
    const wsUrl = `${protocol}//${host}/ws/chat?role=${role}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;
      ws.onopen = () => {
        setConnectionState("connected");
        ws.send(JSON.stringify({ type: "join", conversationId }));
        if (onReconnectRef.current) onReconnectRef.current();
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageRef.current) onMessageRef.current(data);
        } catch {}
      };
      ws.onclose = () => setConnectionState("offline");
      ws.onerror = () => setConnectionState("offline");
    } catch {
      setConnectionState("offline");
    }
  }, [conversationId, role]);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    socket: socketRef.current,
    reconnect: manualReconnect,
  };
}
