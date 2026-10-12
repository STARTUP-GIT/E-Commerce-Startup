'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Check, ShoppingBag, CreditCard, MessageSquare, AlertCircle, ArrowRight, ExternalLink } from 'lucide-react';
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../api/notificationApi';

function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recent';
  }
}

function getNotificationIcon(type: string) {
  if (type.startsWith('ORDER')) {
    return <ShoppingBag className="h-4 w-4 text-purple-400" />;
  }
  if (type.startsWith('PAYMENT')) {
    return <CreditCard className="h-4 w-4 text-emerald-400" />;
  }
  if (type === 'NEW_MESSAGE') {
    return <MessageSquare className="h-4 w-4 text-indigo-400" />;
  }
  return <Bell className="h-4 w-4 text-amber-400" />;
}

function getDestinationRoute(notif: Notification): string {
  if (notif.route) return notif.route;
  if (notif.data?.route) return notif.data.route;
  if (notif.data?.link) return notif.data.link;
  if (notif.type.startsWith('ORDER')) return '/orders';
  return '/notifications';
}

export function CustomerNotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
    isMarkingAllRead,
  } = useNotifications();

  const { refs, floatingStyles } = useFloating({
    open: isOpen,
    placement: 'bottom-end',
    middleware: [offset(10), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  // Close dropdown on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) {
      markRead(notif.id);
    }
    setIsOpen(false);
    const destination = getDestinationRoute(notif);
    router.push(destination);
  };

  const recentNotifications = notifications.slice(0, 8);

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        ref={refs.setReference}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer"
        aria-label="Customer notifications"
        aria-expanded={isOpen}
      >
        <Bell className="h-4.5 w-4.5" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex min-w-[15px] h-3.5 px-1 items-center justify-center rounded-full bg-white text-[9px] font-black text-black shadow-sm ring-1 ring-black">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown Panel */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop to close on click outside */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
          />

          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[9999] w-[min(380px,calc(100vw-24px))] rounded-2xl border border-white/10 bg-[#0d0d12]/95 backdrop-blur-2xl shadow-2xl p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tracking-wide">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  disabled={isMarkingAllRead}
                  className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 hover:text-purple-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-white/[0.05]">
              {isLoading ? (
                <div className="p-6 space-y-3">
                  <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
                  <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
                  <div className="h-10 rounded-xl bg-white/5 animate-pulse" />
                </div>
              ) : recentNotifications.length > 0 ? (
                recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3.5 transition-all cursor-pointer group hover:bg-white/[0.04] ${
                      notif.isRead ? 'opacity-70' : 'bg-purple-950/15'
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] border border-white/10 shrink-0 group-hover:border-purple-500/30 transition-colors">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-white truncate leading-tight">
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-white/40 font-medium shrink-0">
                          {formatTimestamp(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 line-clamp-2 leading-relaxed">
                        {notif.body || notif.message}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-purple-400 shrink-0 shadow-sm shadow-purple-500/50" />
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center space-y-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 mx-auto text-white/30">
                    <Bell className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-white/70">No notifications yet</p>
                  <p className="text-[10px] text-white/40 max-w-[200px] mx-auto">
                    We'll let you know when your order status updates or messages arrive.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-white/[0.08] bg-white/[0.01]">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl text-xs font-bold text-white/75 hover:text-white hover:bg-white/[0.05] transition-all"
              >
                <span>View all notifications</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
