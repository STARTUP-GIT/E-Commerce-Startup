import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react-native';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

export function ServerErrorScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'ServerError'>>();
  const onRetry = route.params?.onRetry;

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <AlertTriangle size={36} color={colors.destructive} strokeWidth={1.5} />
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>500 ERROR</Text>
      </View>

      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>
        An unexpected error occurred while processing your request. Please try again.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            if (onRetry) {
              onRetry();
            } else {
              navigation.navigate('Home');
            }
          }}
          activeOpacity={0.8}
        >
          <RotateCcw size={16} color={colors.primaryForeground} />
          <Text style={styles.primaryBtnText}>Try Again</Text>
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
    backgroundColor: colors.destructiveLight,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.destructiveLight,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 12,
  },
  badgeText: {
    color: colors.destructive,
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
