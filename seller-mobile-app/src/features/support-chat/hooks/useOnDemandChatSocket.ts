import { useEffect, useRef, useState, useCallback } from 'react';
import { ENV } from '@/config/env';

export type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface OnDemandSocketOptions {
  role: 'customer' | 'seller' | 'admin';
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
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isManuallyClosedRef = useRef(false);

  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;
  const activeConversationIdRef = useRef<string | null>(conversationId);
  activeConversationIdRef.current = conversationId;

  const getWsUrl = useCallback(() => {
    let base = ENV.BACKEND_API_URL || 'https://seller-api.atlasbasket.com';
    let wsProto = base.startsWith('https:') ? 'wss:' : 'ws:';
    let host = base.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    return `${wsProto}//${host}/ws/chat?role=${role}`;
  }, [role]);

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

  const connect = useCallback(() => {
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    clearTimers();
    isManuallyClosedRef.current = false;

    try {
      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isManuallyClosedRef.current) {
          ws.close(1000, 'Unmounted');
          return;
        }

        setConnectionState('connected');
        const wasReconnection = reconnectAttemptsRef.current > 0;
        reconnectAttemptsRef.current = 0;

        // Heartbeat
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);

        if (activeConversationIdRef.current && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'join', conversationId: activeConversationIdRef.current }));
        }

        if (wasReconnection && onReconnectRef.current) {
          onReconnectRef.current();
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (e) {
          console.error('[SellerWS] Parse error:', e);
        }
      };

      ws.onclose = (event) => {
        if (isManuallyClosedRef.current) return;
        socketRef.current = null;
        clearTimers();

        if (event.code === 4001 || event.code === 1000) {
          setConnectionState('offline');
          return;
        }

        setConnectionState('reconnecting');
        const maxAttempts = 8;
        if (reconnectAttemptsRef.current < maxAttempts) {
          reconnectAttemptsRef.current += 1;
          const baseDelay = Math.min(20000, 1000 * Math.pow(1.5, reconnectAttemptsRef.current));
          const jitter = Math.random() * 800;
          const delay = baseDelay + jitter;

          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isManuallyClosedRef.current) {
              connect();
            }
          }, delay);
        } else {
          setConnectionState('offline');
        }
      };

      ws.onerror = () => {
        // Handled by onclose
      };
    } catch (err) {
      console.warn('[SellerWS] Init error:', err);
      setConnectionState('offline');
    }
  }, [clearTimers, getWsUrl]);

  // Connect persistently
  useEffect(() => {
    connect();
    return () => {
      // Keep persistent
    };
  }, [connect]);

  // Switch conversation rooms without reconnecting socket
  useEffect(() => {
    if (conversationId && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'join', conversationId }));
    }
  }, [conversationId]);

  const manualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    clearTimers();
    if (socketRef.current) {
      try {
        socketRef.current.close(1000, 'Manual reconnect');
      } catch {}
      socketRef.current = null;
    }
    connect();
  }, [clearTimers, connect]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    socket: socketRef.current,
    reconnect: manualReconnect,
  };
}
