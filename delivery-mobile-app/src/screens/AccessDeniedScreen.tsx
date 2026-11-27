import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ShieldAlert, Bike, ArrowLeft } from "lucide-react-native";
import { colors } from "../theme";

export function AccessDeniedScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <ShieldAlert size={36} color={colors.amber} strokeWidth={1.5} />
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>403 ACCESS DENIED</Text>
      </View>

      <Text style={styles.title}>Access Denied</Text>
      <Text style={styles.subtitle}>
        You don't have authorization to access this delivery section. Your session remains authenticated.
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => {
            try {
              navigation.navigate("Main");
            } catch {
              navigation.navigate("Landing");
            }
          }}
          activeOpacity={0.8}
        >
          <Bike size={16} color={colors.black} />
          <Text style={styles.primaryBtnText}>Rider Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <ArrowLeft size={16} color={colors.foreground} />
          <Text style={styles.secondaryBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconBox: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: colors.amberBg,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.amberBg,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    marginBottom: 12,
  },
  badgeText: {
    color: colors.amber,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  actions: {
    width: "100%",
    maxWidth: 280,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.green,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: colors.black,
    fontWeight: "700",
    fontSize: 14,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.card,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.foreground,
    fontWeight: "600",
    fontSize: 14,
  },
});
