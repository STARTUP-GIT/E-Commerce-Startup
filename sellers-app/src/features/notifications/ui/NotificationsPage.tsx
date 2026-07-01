import { useNotifications } from '../hooks/useNotifications';
import { ordersService } from '@/features/orders/services/ordersService';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Skeleton } from '@/shared/components/Skeleton';
import { Bell, Check, Trash2, ShieldAlert } from 'lucide-react';

export function NotificationsPage() {
  const { notifications, isLoading, isError, markAllRead, markRead, deleteNotification } = useNotifications();

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead();
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl animate-fade-up">
        {/* Title */}
        <div className="flex justify-between items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-white/95">Notifications</h1>
            <p className="text-xs text-white/45">Stay updated with store activities, payouts, and customer print requests.</p>
          </div>
          {notifications.some((n) => !n.isRead) && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="text-[11px] h-8 font-bold">
              <Check className="mr-1.5 h-3.5 w-3.5" />
              Mark All Read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <div className="p-12 text-center text-red-400">
            <ShieldAlert className="mx-auto h-10 w-10 text-red-400/60 mb-2" />
            <p className="text-sm font-semibold">Failed to load notifications.</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <Card
                key={notif.id}
                className={`border transition-all ${
                  notif.isRead
                    ? 'border-white/5 bg-white/[0.005]'
                    : 'border-purple-500/10 bg-purple-500/[0.015] shadow-inner'
                }`}
              >
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      notif.isRead ? 'border-white/10 bg-white/5 text-white/40' : 'border-purple-500/20 bg-purple-500/10 text-purple-400'
                    }`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <span className="block text-xs font-bold text-white/90">
                        {notif.title}
                      </span>
                      <p className="text-xs text-white/50 leading-relaxed">
                        {notif.message}
                      </p>
                      <span className="block text-[9px] text-white/30 font-medium pt-1">
                        {ordersService.formatDate(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkRead(notif.id)}
                        className="text-white/45 hover:text-purple-400 p-1 rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="text-white/45 hover:text-red-400 p-1 rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="glass-card p-16 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl glass mx-auto text-white/30">
              <Bell className="h-6 w-6" />
            </div>
            <h4 className="text-xs font-bold text-white/70">All caught up</h4>
            <p className="text-[10px] text-white/35 max-w-xs mx-auto leading-relaxed">
              No recent notifications logged for your seller account. We'll alert you here when new actions arrive.
              We'll alert you here when new actions arrive.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
