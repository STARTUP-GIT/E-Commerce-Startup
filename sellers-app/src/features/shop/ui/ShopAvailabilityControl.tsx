'use client';

import React, { useState } from 'react';
import { useShopAvailability } from '../hooks/useShopAvailability';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Dialog } from '@/shared/components/Dialog';
import { Input } from '@/shared/components/Input';
import {
  Clock,
  Power,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  History,
  Timer,
  Info
} from 'lucide-react';
import { useUIStore } from '@/lib/store/uiStore';

export function ShopAvailabilityControl() {
  const {
    availability,
    isOnline,
    isLoading,
    activeOrdersCount,
    scheduledCloseAt,
    scheduledCloseReason,
    closingReason,
    lastStatusChangedAt,
    lastStatusChangeSource,
    timeZone,
    countdownText,
    isCountdownActive,
    updateAvailability,
    isUpdating,
    scheduleClosing,
    isScheduling,
    cancelScheduledClosing,
    isCancellingSchedule,
  } = useShopAvailability();

  const showToast = useUIStore((state) => state.showToast);

  // Modal dialog states
  const [showConfirmOffline, setShowConfirmOffline] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form states for manual offline reason
  const [offlineReason, setOfflineReason] = useState('');

  // Form states for scheduling
  const [scheduleDate, setScheduleDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [scheduleTime, setScheduleTime] = useState('22:00');
  const [scheduleReason, setScheduleReason] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Toggle handler
  const handleToggle = async () => {
    if (isOnline) {
      // Trying to switch OFFLINE
      if (activeOrdersCount > 0) {
        setShowConfirmOffline(true);
      } else {
        try {
          await updateAvailability({ isOnline: false, reason: offlineReason || 'Manually set offline' });
          showToast('Shop is now Offline. Customers cannot place new orders.', 'info');
        } catch (err: any) {
          showToast(err?.message || 'Failed to update shop status', 'error');
        }
      }
    } else {
      // Trying to switch ONLINE
      try {
        await updateAvailability({ isOnline: true });
        showToast('Shop is now Online and accepting orders!', 'success');
      } catch (err: any) {
        showToast(err?.message || 'Failed to update shop status', 'error');
      }
    }
  };

  const confirmOfflineWithActiveOrders = async () => {
    try {
      await updateAvailability({
        isOnline: false,
        reason: offlineReason || 'Manually set offline with active orders',
        force: true
      });
      setShowConfirmOffline(false);
      showToast('Shop is now Offline. Existing orders remain active.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update status', 'error');
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError(null);

    if (!scheduleDate || !scheduleTime) {
      setScheduleError('Please provide both date and closing time');
      return;
    }

    // Construct local timestamp in the shop's timezone
    // Format: YYYY-MM-DDTHH:mm:00+05:30 for Asia/Kolkata
    const dateTimeStr = `${scheduleDate}T${scheduleTime}:00+05:30`;
    const targetDate = new Date(dateTimeStr);

    if (isNaN(targetDate.getTime())) {
      setScheduleError('Invalid date or time');
      return;
    }

    if (targetDate.getTime() <= Date.now()) {
      setScheduleError('Scheduled closing time must be in the future');
      return;
    }

    try {
      await scheduleClosing({
        scheduledCloseAt: targetDate.toISOString(),
        closingReason: scheduleReason.trim() || undefined,
        timeZone: timeZone || 'Asia/Kolkata'
      });
      setShowScheduleModal(false);
      showToast('Scheduled closing time configured successfully', 'success');
    } catch (err: any) {
      setScheduleError(err?.response?.data?.message || err?.message || 'Failed to schedule closing');
    }
  };

  const handleCancelSchedule = async () => {
    try {
      await cancelScheduledClosing();
      showToast('Scheduled closing cancelled', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Failed to cancel schedule', 'error');
    }
  };

  // Format upcoming close date/time in shop's timezone
  const formattedScheduledClose = scheduledCloseAt ? (() => {
    try {
      const d = new Date(scheduledCloseAt);
      return d.toLocaleString('en-IN', {
        timeZone: timeZone || 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return scheduledCloseAt;
    }
  })() : null;

  // Format last status changed timestamp
  const formattedLastChanged = lastStatusChangedAt ? (() => {
    try {
      const d = new Date(lastStatusChangedAt);
      return d.toLocaleString('en-IN', {
        timeZone: timeZone || 'Asia/Kolkata',
        dateStyle: 'short',
        timeStyle: 'short'
      });
    } catch {
      return lastStatusChangedAt;
    }
  })() : null;

  const sourceLabel = (() => {
    switch (lastStatusChangeSource) {
      case 'SELLER_MANUAL':
        return 'Manually by Seller';
      case 'SCHEDULED_AUTOMATIC':
        return 'Automatic Scheduled Close';
      case 'ADMIN_OVERRIDE':
        return 'Administrator Override';
      default:
        return 'System';
    }
  })();

  return (
    <div className="w-full space-y-3">
      {/* 30-minute Countdown Banner (if active) */}
      {isCountdownActive && isOnline && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Timer className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-amber-300">Shop Closing Soon</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-xs font-mono font-bold text-amber-300">
                  {countdownText} remaining
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                Automatically switching offline at {formattedScheduledClose} ({timeZone})
                {scheduledCloseReason ? ` • Reason: ${scheduledCloseReason}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScheduleModal(true)}
              className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/20"
            >
              Modify
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelSchedule}
              disabled={isCancellingSchedule}
              className="text-xs text-amber-300 hover:text-white hover:bg-amber-500/20"
            >
              Cancel Schedule
            </Button>
          </div>
        </div>
      )}

      {/* Main Availability Card */}
      <Card className="border border-white/10 bg-card/60 backdrop-blur-md overflow-hidden shadow-lg">
        <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status & Toggle Info */}
          <div className="flex items-start sm:items-center gap-4">
            {/* Online / Offline Indicator circle */}
            <div
              className={`h-12 w-12 rounded-2xl flex items-center justify-center border transition-all shrink-0 ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
              }`}
            >
              <Power className={`h-6 w-6 ${isOnline ? 'animate-pulse' : ''}`} />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-foreground">Shop Availability</h3>
                <Badge
                  className={`text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider ${
                    isOnline
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {isOnline ? '● Online & Accepting Orders' : '○ Offline'}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mt-1">
                {isOnline
                  ? 'Your shop is actively visible and accepting customer checkouts.'
                  : `Your shop is offline. Customers can browse existing listings, but cannot place new orders.${
                      closingReason ? ` Reason: ${closingReason}` : ''
                    }`}
              </p>

              {/* Status Metadata */}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground/80 mt-2">
                {formattedLastChanged && (
                  <span>
                    Last changed: <strong className="text-foreground/90">{formattedLastChanged}</strong> ({sourceLabel})
                  </span>
                )}
                {activeOrdersCount > 0 && (
                  <span className="text-amber-400/90 font-medium">
                    • {activeOrdersCount} order(s) in fulfilment
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons & Toggle */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
            {/* Quick Toggle Button */}
            <Button
              variant={isOnline ? 'destructive' : 'default'}
              size="sm"
              disabled={isLoading || isUpdating}
              onClick={handleToggle}
              className={`font-bold transition-all gap-2 text-xs h-9 px-4 ${
                isOnline
                  ? 'bg-zinc-800 hover:bg-red-950/40 text-red-400 border border-red-500/20'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>{isOnline ? 'Switch Shop Offline' : 'Go Online Now'}</span>
            </Button>

            {/* Schedule Closing Trigger */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScheduleModal(true)}
              className="text-xs h-9 gap-1.5 border-white/10 hover:bg-white/5 text-muted-foreground hover:text-foreground"
            >
              <Calendar className="h-3.5 w-3.5 text-purple-400" />
              <span>{scheduledCloseAt ? 'Edit Schedule' : 'Schedule Closing'}</span>
            </Button>

            {/* Availability Logs History */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistoryModal(true)}
              className="text-xs h-9 p-2 text-muted-foreground hover:text-foreground"
              title="View Availability History"
            >
              <History className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Scheduled closing info footer (if schedule exists and not in countdown banner) */}
        {scheduledCloseAt && !isCountdownActive && isOnline && (
          <div className="px-5 py-2.5 bg-purple-950/20 border-t border-purple-500/15 flex items-center justify-between text-xs text-purple-300">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>
                Scheduled closing configured for <strong className="text-white">{formattedScheduledClose}</strong> ({timeZone})
                {scheduledCloseReason ? ` • "${scheduledCloseReason}"` : ''}
              </span>
            </div>
            <button
              onClick={handleCancelSchedule}
              disabled={isCancellingSchedule}
              className="text-purple-400 hover:text-purple-200 underline text-[11px] font-medium cursor-pointer"
            >
              Cancel schedule
            </button>
          </div>
        )}
      </Card>

      {/* Confirmation Dialog: Going Offline with Active Orders */}
      <Dialog
        isOpen={showConfirmOffline}
        onClose={() => setShowConfirmOffline(false)}
        title="Confirm Switching Offline"
      >
        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 space-y-1">
              <p className="font-bold text-amber-300">
                You have {activeOrdersCount} active order(s) currently pending fulfilment!
              </p>
              <p>
                Switching offline prevents customers from placing <strong>new</strong> orders. Existing accepted orders will <strong>not</strong> be cancelled and must still be prepared and delivered as promised.
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Optional Closing Reason (shown to customers)
            </label>
            <Input
              placeholder="e.g. Daily closing, family function, inventory stocktaking..."
              value={offlineReason}
              onChange={(e) => setOfflineReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfirmOffline(false)}
              className="text-xs"
            >
              Keep Shop Online
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmOfflineWithActiveOrders}
              disabled={isUpdating}
              className="text-xs font-bold"
            >
              Confirm & Go Offline
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal Dialog: Schedule Closing Time */}
      <Dialog
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Shop Closing"
      >
        <form onSubmit={handleSaveSchedule} className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground">
            Configure an upcoming closing time. At 30 minutes before closing, a countdown banner and notification will appear. At the scheduled time, your shop will automatically switch offline on the backend until you manually reopen it.
          </p>

          {scheduleError && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-xs text-red-300">
              {scheduleError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Closing Date
              </label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Closing Time
              </label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Time Zone
            </label>
            <Input
              value={`${timeZone || 'Asia/Kolkata'} (Indian Standard Time, UTC+5:30)`}
              disabled
              className="text-xs bg-muted/40 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Optional Reason (visible to customers)
            </label>
            <Input
              placeholder="e.g. Closing at 10 PM for daily restock"
              value={scheduleReason}
              onChange={(e) => setScheduleReason(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="p-3 rounded-xl border border-white/10 bg-white/[0.02] text-[11px] text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 text-foreground font-semibold">
              <Info className="h-3.5 w-3.5 text-purple-400" />
              <span>Priority Rules</span>
            </div>
            <p>• You can manually switch offline earlier at any time.</p>
            <p>• If you manually go online, your pending schedule is retained and still fires at the set time.</p>
            <p>• Existing orders are preserved and will not be cancelled.</p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {scheduledCloseAt ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCancelSchedule}
                disabled={isCancellingSchedule}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                Cancel Pending Schedule
              </Button>
            ) : <div />}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowScheduleModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isScheduling}
                className="text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white"
              >
                Save Schedule
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Modal Dialog: Availability History Logs */}
      <Dialog
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        title="Availability Status History"
      >
        <div className="space-y-3 pt-2 max-h-[60vh] overflow-y-auto">
          {availability?.recentLogs && availability.recentLogs.length > 0 ? (
            availability.recentLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-white/5 bg-white/[0.02] flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] px-1.5 py-0 font-bold ${
                        log.status
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {log.status ? 'ONLINE' : 'OFFLINE'}
                    </Badge>
                    <span className="font-semibold text-foreground">
                      {log.actorName || log.actorType} ({log.source})
                    </span>
                  </div>
                  {log.reason && (
                    <p className="text-muted-foreground text-[11px]">Reason: {log.reason}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString('en-IN', {
                    timeZone: timeZone || 'Asia/Kolkata',
                    dateStyle: 'short',
                    timeStyle: 'short'
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground text-center py-6">
              No previous availability logs recorded yet.
            </p>
          )}
        </div>
      </Dialog>
    </div>
  );
}
