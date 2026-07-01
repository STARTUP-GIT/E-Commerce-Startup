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
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-zinc-400 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Stay up to date with your orders, payment confirmations, and system alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={() => markAllRead()}
            variant="outline"
            className="text-xs flex items-center gap-1.5 cursor-pointer border-border"
          >
            <Check className="h-4 w-4" />
            Mark All Read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-destructive font-semibold">
          Error loading notifications. Please try again later.
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
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
              <CardContent className="p-6 flex items-start gap-4 pr-16">
                {/* Dot status */}
                {!notif.isRead && (
                  <span className="absolute left-6 top-7 h-2.5 w-2.5 rounded-full bg-primary animate-pulse" />
                )}
                
                {/* Content Icon offset */}
                <div className={`p-2 rounded-lg ${notif.isRead ? 'bg-zinc-800' : 'bg-primary/10'} ml-4`}>
                  <Bell className={`h-5 w-5 ${notif.isRead ? 'text-zinc-400' : 'text-primary'}`} />
                </div>

                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground leading-none">
                    {notif.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {notif.body}
                  </p>
                  <span className="text-[10px] text-muted-foreground block pt-1">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNotification(notif.id);
                  }}
                  className="absolute right-6 top-6 p-1 text-muted-foreground hover:text-red-500 transition-colors cursor-pointer"
                  title="Delete notification"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl max-w-md mx-auto">
          <MailOpen className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
          <h4 className="text-base font-bold text-foreground">You are all caught up!</h4>
          <p className="text-sm text-muted-foreground mt-1 px-4">
            No notifications at the moment. We will notify you when something important occurs.
          </p>
        </div>
      )}
    </div>
  );
}
