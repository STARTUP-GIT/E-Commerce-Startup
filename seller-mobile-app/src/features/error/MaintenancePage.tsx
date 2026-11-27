import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Wrench, RefreshCw, LayoutDashboard, Clock } from 'lucide-react-native';
import { Colors } from '../../theme/colors';

export function MaintenancePage() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const until = route.params?.until;

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Wrench size={36} color={Colors.purpleLight} strokeWidth={1.5} />
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>SELLER SYSTEM MAINTENANCE</Text>
      </View>

      <Text style={styles.title}>System Maintenance</Text>
      <Text style={styles.subtitle}>
        The Seller Portal is currently undergoing scheduled platform updates to improve catalog and order services.
      </Text>

      {until && (
        <View style={styles.timeBox}>
          <Clock size={14} color={Colors.purpleLight} />
          <Text style={styles.timeText}>Expected completion: {until}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            try {
              navigation.navigate('Dashboard');
            } catch {
              navigation.navigate('Login');
            }
          }}
          activeOpacity={0.8}
        >
          <RefreshCw size={16} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Check Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => {
            try {
              navigation.navigate('Dashboard');
            } catch {
              navigation.navigate('Login');
            }
          }}
          activeOpacity={0.8}
        >
          <LayoutDashboard size={16} color={Colors.text} />
          <Text style={styles.secondaryBtnText}>Seller Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.purpleBg,
    borderWidth: 1,
    borderColor: Colors.purpleBorder,
    marginBottom: 12,
  },
  badgeText: {
    color: Colors.purpleLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textMuted,
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
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  timeText: {
    color: Colors.textMuted,
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
    backgroundColor: Colors.purple,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  secondaryBtnText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
});
