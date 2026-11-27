import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ShieldAlert, LayoutDashboard, ArrowLeft } from 'lucide-react-native';
import { Colors } from '../../theme/colors';

export function AccessDeniedPage() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <ShieldAlert size={36} color={Colors.yellow} strokeWidth={1.5} />
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>403 ACCESS DENIED</Text>
      </View>

      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.subtitle}>
        You don't have permission to access this seller feature. Your session remains logged in.
      </Text>

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
          <LayoutDashboard size={16} color={Colors.white} />
          <Text style={styles.primaryBtnText}>Seller Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={16} color={Colors.text} />
          <Text style={styles.secondaryBtnText}>Go Back</Text>
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
    backgroundColor: Colors.yellowBg,
    borderWidth: 1,
    borderColor: Colors.yellowBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: Colors.yellowBg,
    borderWidth: 1,
    borderColor: Colors.yellowBorder,
    marginBottom: 12,
  },
  badgeText: {
    color: Colors.yellow,
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
    marginBottom: 24,
    maxWidth: 300,
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
