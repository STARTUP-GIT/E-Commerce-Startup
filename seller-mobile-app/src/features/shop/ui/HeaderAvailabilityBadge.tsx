import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useShopAvailability } from '../hooks/useShopAvailability';
import { Timer } from 'lucide-react-native';
import { Colors } from '@/theme/colors';

export function HeaderAvailabilityBadge({ navigation }: { navigation?: any }) {
  const { isOnline, isCountdownActive, countdownText, isLoading } = useShopAvailability();

  if (isLoading) return null;

  return (
    <TouchableOpacity
      onPress={() => navigation?.navigate('Dashboard')}
      style={[
        styles.pill,
        isCountdownActive ? styles.pillCountdown : isOnline ? styles.pillOnline : styles.pillOffline
      ]}
    >
      {isCountdownActive ? (
        <>
          <Timer size={10} color={Colors.yellow} />
          <Text style={styles.pillTextCountdown}>{countdownText}</Text>
        </>
      ) : (
        <>
          <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={[styles.pillText, isOnline ? styles.pillTextOnline : styles.pillTextOffline]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  pillOffline: {
    backgroundColor: 'rgba(113, 113, 122, 0.2)',
    borderColor: 'rgba(113, 113, 122, 0.4)',
  },
  pillCountdown: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  dotOnline: {
    backgroundColor: Colors.emerald,
  },
  dotOffline: {
    backgroundColor: Colors.white40,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  pillTextOnline: {
    color: Colors.emerald,
  },
  pillTextOffline: {
    color: Colors.white60,
  },
  pillTextCountdown: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.yellow,
    fontFamily: 'monospace',
  },
});
