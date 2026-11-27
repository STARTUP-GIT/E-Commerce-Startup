import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react-native';
import { Colors } from '../theme/colors';

export function OfflineNotice() {
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [justReconnected, setJustReconnected] = useState(false);

  const checkConnectivity = async () => {
    setIsChecking(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const res = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.status === 204 || res.ok) {
        if (isOffline) {
          setIsOffline(false);
          setJustReconnected(true);
          setTimeout(() => setJustReconnected(false), 2500);
        }
      } else {
        setIsOffline(true);
      }
    } catch {
      setIsOffline(true);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 15000);
    return () => clearInterval(interval);
  }, [isOffline]);

  if (!isOffline && !justReconnected) return null;

  return (
    <View
      style={[
        styles.banner,
        { paddingTop: Math.max(insets.top, 8) + 4 },
        isOffline ? styles.offlineBg : styles.onlineBg,
      ]}
    >
      <View style={styles.row}>
        {isOffline ? (
          <WifiOff size={16} color={Colors.yellow} />
        ) : (
          <CheckCircle2 size={16} color={Colors.emerald} />
        )}
        <Text style={styles.text}>
          {isOffline
            ? 'Seller Portal offline. Check network.'
            : 'Connection restored. You are back online.'}
        </Text>
      </View>
      {isOffline && (
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={checkConnectivity}
          disabled={isChecking}
          activeOpacity={0.7}
        >
          <RefreshCw size={12} color={Colors.text} />
          <Text style={styles.retryText}>{isChecking ? 'Checking...' : 'Retry'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  offlineBg: {
    backgroundColor: 'rgba(15, 15, 19, 0.96)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  onlineBg: {
    backgroundColor: 'rgba(6, 78, 59, 0.96)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  text: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  retryText: {
    color: Colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
});
