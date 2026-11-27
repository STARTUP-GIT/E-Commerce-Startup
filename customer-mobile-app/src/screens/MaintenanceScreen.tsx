import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Wrench, RefreshCw, Home, Clock } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export function MaintenanceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Maintenance'>>();
  const until = route.params?.until;

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Wrench size={36} color={colors.warning} strokeWidth={1.5} />
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>SYSTEM MAINTENANCE</Text>
      </View>

      <Text style={styles.title}>We'll be right back</Text>
      <Text style={styles.subtitle}>
        AtlasBasket is undergoing scheduled system updates. We appreciate your patience while we work.
      </Text>

      {until && (
        <View style={styles.timeBox}>
          <Clock size={14} color={colors.warning} />
          <Text style={styles.timeText}>Expected completion: {until}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <RefreshCw size={16} color={colors.primaryForeground} />
          <Text style={styles.primaryBtnText}>Check Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.8}
        >
          <Home size={16} color={colors.foreground} />
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)',
    marginBottom: 12,
  },
  badgeText: {
    color: colors.warning,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.foregroundMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 300,
  },
  timeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 24,
  },
  timeText: {
    color: colors.foregroundMuted,
    fontSize: 12,
  },
  actions: {
    width: '100%',
    maxWidth: 280,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: colors.primaryForeground,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.secondary,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  secondaryBtnText: {
    color: colors.foreground,
    fontWeight: '600',
    fontSize: 14,
  },
});
