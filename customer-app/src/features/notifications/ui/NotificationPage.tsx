'use client';

import React from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Bell, Check, Trash2, MailOpen, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function NotificationPage() {
  const {
    notifications,
    isLoading,
    isError,
    markAllRead,
    markRead,
    deleteNotification,
  } = useNotifications();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-border pb-4 sm:pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-zinc-400 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Stay up to date with your orders, payment confirmations, and system alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => markAllRead()}
            variant="outline"
            className="text-[10px] sm:text-xs flex items-center gap-1.5 cursor-pointer border-border h-8 sm:h-9"
          >
            <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 sm:space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="h-10 sm:h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-8 sm:py-12 text-destructive font-semibold text-sm sm:text-base">
          Error loading notifications. Please try again later.
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2 sm:space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              onClick={() => {
                if (!notif.isRead) markRead(notif.id);
              }}
              className={`cursor-pointer transition-colors relative border ${
                notif.isRead ? 'bg-card border-border' : 'bg-primary/[0.02] border-primary/30'
              }`}
            >
              <CardContent className="p-3 sm:p-6 flex items-start gap-2 sm:gap-4 pr-12 sm:pr-16">
                {/* Dot status */}
                {!notif.isRead && (
                  <span className="absolute left-4 sm:left-6 top-4 sm:top-7 h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-primary animate-pulse" />
                )}
                
                {/* Content Icon */}
                <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${notif.isRead ? 'bg-zinc-800' : 'bg-primary/10'} ml-3 sm:ml-4`}>
                  <Bell className={`h-4 w-4 sm:h-5 sm:w-5 ${notif.isRead ? 'text-zinc-400' : 'text-primary'}`} />
                </div>

                <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
                  <h4 className="font-bold text-xs sm:text-sm text-foreground leading-none break-words">
                    {notif.title}
                  </h4>
                  <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                    {notif.body}
                  </p>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground block pt-0.5 sm:pt-1">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="absolute right-3 sm:right-6 top-3 sm:top-6 p-1 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete notification"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 sm:py-20 border border-dashed border-border rounded-xl sm:rounded-2xl max-w-md mx-auto px-4">
          <MailOpen className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground opacity-50 mb-3 sm:mb-4" />
          <h4 className="text-sm sm:text-base font-bold text-foreground">You are all caught up!</h4>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 px-4">
            No notifications at the moment. We will notify you when something important occurs.
          </p>
        </div>
      )}
    </div>
  );
}
