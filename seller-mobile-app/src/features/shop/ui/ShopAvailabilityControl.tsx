import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { useShopAvailability } from '../hooks/useShopAvailability';
import { Card } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { Dialog } from '@/shared/components/Dialog';
import { Colors } from '@/theme/colors';
import {
  Power,
  Clock,
  Calendar,
  AlertTriangle,
  History,
  Timer,
  Info,
} from 'lucide-react-native';

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

  // Modals
  const [showConfirmOffline, setShowConfirmOffline] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form states
  const [offlineReason, setOfflineReason] = useState('');
  const [scheduleDate, setScheduleDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [scheduleTime, setScheduleTime] = useState('22:00');
  const [scheduleReason, setScheduleReason] = useState('');
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const handleToggle = async () => {
    if (isOnline) {
      if (activeOrdersCount > 0) {
        setShowConfirmOffline(true);
      } else {
        try {
          await updateAvailability({ isOnline: false, reason: offlineReason || 'Manually set offline' });
          Alert.alert('Shop Offline', 'Shop is now Offline. Customers cannot place new orders.');
        } catch (err: any) {
          Alert.alert('Error', err?.message || 'Failed to update shop status');
        }
      }
    } else {
      try {
        await updateAvailability({ isOnline: true });
        Alert.alert('Shop Online', 'Shop is now Online and accepting orders!');
      } catch (err: any) {
        Alert.alert('Error', err?.message || 'Failed to update shop status');
      }
    }
  };

  const confirmOfflineWithActiveOrders = async () => {
    try {
      await updateAvailability({
        isOnline: false,
        reason: offlineReason || 'Manually set offline with active orders',
        force: true,
      });
      setShowConfirmOffline(false);
      Alert.alert('Shop Offline', 'Shop is now Offline. Existing orders remain active.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to update status');
    }
  };

  const handleSaveSchedule = async () => {
    setScheduleError(null);
    if (!scheduleDate || !scheduleTime) {
      setScheduleError('Please provide both date (YYYY-MM-DD) and closing time (HH:MM)');
      return;
    }

    const dateTimeStr = `${scheduleDate}T${scheduleTime}:00+05:30`;
    const targetDate = new Date(dateTimeStr);

    if (isNaN(targetDate.getTime())) {
      setScheduleError('Invalid date or time format');
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
        timeZone: timeZone || 'Asia/Kolkata',
      });
      setShowScheduleModal(false);
      Alert.alert('Success', 'Scheduled closing time configured successfully');
    } catch (err: any) {
      setScheduleError(err?.response?.data?.message || err?.message || 'Failed to schedule closing');
    }
  };

  const handleCancelSchedule = async () => {
    try {
      await cancelScheduledClosing();
      Alert.alert('Cancelled', 'Scheduled closing cancelled');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to cancel schedule');
    }
  };

  const formattedScheduledClose = scheduledCloseAt ? (() => {
    try {
      const d = new Date(scheduledCloseAt);
      return d.toLocaleString('en-IN', {
        timeZone: timeZone || 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return scheduledCloseAt;
    }
  })() : null;

  const formattedLastChanged = lastStatusChangedAt ? (() => {
    try {
      const d = new Date(lastStatusChangedAt);
      return d.toLocaleString('en-IN', {
        timeZone: timeZone || 'Asia/Kolkata',
        dateStyle: 'short',
        timeStyle: 'short',
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
        return 'Admin Override';
      default:
        return 'System';
    }
  })();

  return (
    <View style={styles.container}>
      {/* 30-min Countdown Banner */}
      {isCountdownActive && isOnline && (
        <View style={styles.countdownBanner}>
          <View style={styles.bannerRow}>
            <View style={styles.bannerIconContainer}>
              <Timer size={20} color={Colors.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.countdownTitle}>Shop Closing Soon</Text>
                <View style={styles.countdownBadge}>
                  <Text style={styles.countdownBadgeText}>{countdownText} remaining</Text>
                </View>
              </View>
              <Text style={styles.countdownSubtitle}>
                Closes at {formattedScheduledClose} ({timeZone})
                {scheduledCloseReason ? ` • ${scheduledCloseReason}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.bannerActions}>
            <TouchableOpacity
              style={styles.bannerBtnOutline}
              onPress={() => setShowScheduleModal(true)}
            >
              <Text style={styles.bannerBtnOutlineText}>Modify</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bannerBtnGhost}
              onPress={handleCancelSchedule}
              disabled={isCancellingSchedule}
            >
              <Text style={styles.bannerBtnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Main Card */}
      <Card style={styles.card}>
        <View style={styles.mainRow}>
          <View
            style={[
              styles.powerIconContainer,
              isOnline ? styles.powerIconOnline : styles.powerIconOffline,
            ]}
          >
            <Power size={22} color={isOnline ? Colors.emerald : Colors.white40} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.cardTitle}>Shop Availability</Text>
              <Badge
                variant={isOnline ? 'success' : 'default'}
                style={isOnline ? styles.onlineBadge : styles.offlineBadge}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </View>
            <Text style={styles.cardDesc}>
              {isOnline
                ? 'Accepting customer orders.'
                : `Shop is offline. Customers cannot place new orders.${closingReason ? ` (${closingReason})` : ''}`}
            </Text>
            {formattedLastChanged && (
              <Text style={styles.metaText}>
                Last changed: {formattedLastChanged} ({sourceLabel})
              </Text>
            )}
            {activeOrdersCount > 0 && (
              <Text style={styles.activeOrdersText}>
                {activeOrdersCount} order(s) in fulfilment
              </Text>
            )}
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              isOnline ? styles.toggleBtnOffline : styles.toggleBtnOnline,
            ]}
            onPress={handleToggle}
            disabled={isLoading || isUpdating}
          >
            <Power size={14} color={isOnline ? Colors.red : Colors.white} />
            <Text
              style={[
                styles.toggleBtnText,
                { color: isOnline ? Colors.red : Colors.white },
              ]}
            >
              {isOnline ? 'Go Offline' : 'Go Online'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.scheduleBtn}
            onPress={() => setShowScheduleModal(true)}
          >
            <Calendar size={14} color={Colors.purpleLight} />
            <Text style={styles.scheduleBtnText}>
              {scheduledCloseAt ? 'Edit Schedule' : 'Schedule Close'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() => setShowHistoryModal(true)}
          >
            <History size={16} color={Colors.white60} />
          </TouchableOpacity>
        </View>

        {/* Footer if schedule active */}
        {scheduledCloseAt && !isCountdownActive && isOnline && (
          <View style={styles.scheduleFooter}>
            <Clock size={12} color={Colors.purpleLight} />
            <Text style={styles.scheduleFooterText}>
              Closes {formattedScheduledClose} ({timeZone})
            </Text>
            <TouchableOpacity onPress={handleCancelSchedule} disabled={isCancellingSchedule}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmOffline}
        onOpenChange={setShowConfirmOffline}
        title="Confirm Switching Offline"
      >
        <View style={{ gap: 12, paddingTop: 4 }}>
          <View style={styles.warningBox}>
            <AlertTriangle size={18} color={Colors.yellow} />
            <Text style={styles.warningText}>
              You have {activeOrdersCount} active order(s) pending fulfilment! Existing orders will NOT be cancelled.
            </Text>
          </View>
          <Text style={styles.inputLabel}>Optional Closing Reason</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Daily closing, restock..."
            placeholderTextColor={Colors.white40}
            value={offlineReason}
            onChangeText={setOfflineReason}
          />
          <View style={styles.dialogActions}>
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowConfirmOffline(false)}
            >
              Keep Online
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onPress={confirmOfflineWithActiveOrders}
              loading={isUpdating}
            >
              Confirm Offline
            </Button>
          </View>
        </View>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        title="Schedule Closing Time"
      >
        <View style={{ gap: 10, paddingTop: 4 }}>
          {scheduleError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{scheduleError}</Text>
            </View>
          )}
          <Text style={styles.inputLabel}>Closing Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.textInput}
            value={scheduleDate}
            onChangeText={setScheduleDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.white40}
          />
          <Text style={styles.inputLabel}>Closing Time (HH:MM)</Text>
          <TextInput
            style={styles.textInput}
            value={scheduleTime}
            onChangeText={setScheduleTime}
            placeholder="HH:MM"
            placeholderTextColor={Colors.white40}
          />
          <Text style={styles.inputLabel}>Timezone</Text>
          <TextInput
            style={[styles.textInput, { opacity: 0.6 }]}
            value={`${timeZone || 'Asia/Kolkata'} (IST, UTC+5:30)`}
            editable={false}
          />
          <Text style={styles.inputLabel}>Optional Reason</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Scheduled night closing"
            placeholderTextColor={Colors.white40}
            value={scheduleReason}
            onChangeText={setScheduleReason}
          />
          <View style={styles.dialogActions}>
            {scheduledCloseAt && (
              <TouchableOpacity onPress={handleCancelSchedule} style={{ marginRight: 'auto' }}>
                <Text style={{ color: Colors.red, fontSize: 12 }}>Cancel Schedule</Text>
              </TouchableOpacity>
            )}
            <Button variant="outline" size="sm" onPress={() => setShowScheduleModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onPress={handleSaveSchedule} loading={isScheduling}>
              Save Schedule
            </Button>
          </View>
        </View>
      </Dialog>

      {/* History Modal */}
      <Dialog
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        title="Status Change History"
      >
        <ScrollView style={{ maxHeight: 280 }}>
          {availability?.recentLogs && availability.recentLogs.length > 0 ? (
            availability.recentLogs.map((log) => (
              <View key={log.id} style={styles.historyItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyStatus}>
                    {log.status ? 'ONLINE' : 'OFFLINE'} • {log.actorName || log.actorType}
                  </Text>
                  {log.reason && <Text style={styles.historyReason}>{log.reason}</Text>}
                </View>
                <Text style={styles.historyTime}>
                  {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))
          ) : (
            <Text style={{ color: Colors.white40, fontSize: 12, textAlign: 'center', padding: 20 }}>
              No history logs available yet.
            </Text>
          )}
        </ScrollView>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  countdownBanner: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
    marginBottom: 10,
    gap: 8,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bannerIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.yellow,
  },
  countdownBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(234, 179, 8, 0.25)',
  },
  countdownBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.yellow,
    fontFamily: 'monospace',
  },
  countdownSubtitle: {
    fontSize: 11,
    color: Colors.white60,
    marginTop: 2,
  },
  bannerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  bannerBtnOutline: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.4)',
  },
  bannerBtnOutlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.yellow,
  },
  bannerBtnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bannerBtnGhostText: {
    fontSize: 11,
    color: Colors.white60,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  powerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  powerIconOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  powerIconOffline: {
    backgroundColor: Colors.cardBgSubtle,
    borderColor: Colors.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  onlineBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  offlineBadge: {
    backgroundColor: Colors.cardBgSubtle,
  },
  cardDesc: {
    fontSize: 12,
    color: Colors.white60,
    marginTop: 3,
  },
  metaText: {
    fontSize: 10,
    color: Colors.white40,
    marginTop: 4,
  },
  activeOrdersText: {
    fontSize: 10,
    color: Colors.yellow,
    fontWeight: '600',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  toggleBtnOnline: {
    backgroundColor: Colors.emerald,
    borderColor: Colors.emerald,
  },
  toggleBtnOffline: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.cardBgSubtle,
  },
  scheduleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  historyBtn: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scheduleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168, 85, 247, 0.15)',
  },
  scheduleFooterText: {
    fontSize: 11,
    color: Colors.purpleLight,
    flex: 1,
  },
  cancelLinkText: {
    fontSize: 11,
    color: Colors.purpleLight,
    textDecorationLine: 'underline',
  },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  warningText: {
    fontSize: 12,
    color: Colors.yellow,
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white60,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: Colors.cardBgSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    color: Colors.white,
    fontSize: 13,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  errorBox: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  errorText: {
    fontSize: 11,
    color: Colors.red,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.white,
  },
  historyReason: {
    fontSize: 10,
    color: Colors.white60,
    marginTop: 2,
  },
  historyTime: {
    fontSize: 10,
    color: Colors.white40,
  },
});
