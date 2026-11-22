import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Sparkles, X, CheckCircle2 } from "lucide-react-native";
import { colors } from "../theme";
import { useDeliverySettings } from "../settings/DeliverySettingsContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LocationRequestModal({ visible, onClose }: Props) {
  const { userLocation, submitLocationRequest } = useDeliverySettings();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [district, setDistrict] = useState(userLocation?.district || "");
  const [area, setArea] = useState(userLocation?.serviceArea || userLocation?.town || "");
  const [pincode, setPincode] = useState(userLocation?.postalCode || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!district.trim() && !area.trim() && !pincode.trim()) {
      setError("Please specify your district, area, or postal code.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await submitLocationRequest({
        customerName: name.trim(),
        customerPhone: phone.trim(),
        customerEmail: email.trim(),
        district: district.trim(),
        area: area.trim(),
        pincode: pincode.trim(),
        notes: notes.trim(),
      });
      setSubmitted(true);
    } catch (cause: any) {
      setError(cause?.response?.data?.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setSubmitted(false);
    setError("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Sparkles size={18} color="#38bdf8" />
              <Text style={styles.headerTitle}>Request Delivery in Your Area</Text>
            </View>
            <Pressable onPress={handleDismiss} style={styles.closeButton}>
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {submitted ? (
              <View style={styles.successBox}>
                <View style={styles.successIcon}>
                  <CheckCircle2 size={36} color="#10b981" />
                </View>
                <Text style={styles.successTitle}>Request Submitted!</Text>
                <Text style={styles.successDesc}>
                  Thank you for your interest! We have noted your request for{" "}
                  <Text style={styles.highlight}>{area || district || pincode || "your location"}</Text>.
                  Our expansion team uses this data when rolling out new delivery clusters.
                </Text>
                <Pressable onPress={handleDismiss} style={styles.closeDoneButton}>
                  <Text style={styles.closeDoneText}>Close</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.subtext}>
                  AtlasBasket Delivery is expanding across Karnataka and neighboring regions. Tell us where you need delivery coverage, and we will notify you when service launches in your locality.
                </Text>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your full name"
                  placeholderTextColor={colors.muted}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={styles.label}>Mobile Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="10-digit mobile"
                  placeholderTextColor={colors.muted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor={colors.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.label}>District / City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mysuru"
                  placeholderTextColor={colors.muted}
                  value={district}
                  onChangeText={setDistrict}
                />

                <Text style={styles.label}>Area / Locality</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Vijayanagar"
                  placeholderTextColor={colors.muted}
                  value={area}
                  onChangeText={setArea}
                />

                <Text style={styles.label}>Postal PIN Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="6-digit PIN"
                  placeholderTextColor={colors.muted}
                  value={pincode}
                  onChangeText={(text) => setPincode(text.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                />

                <Text style={styles.label}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="I am a local shop owner / rider..."
                  placeholderTextColor={colors.muted}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={2}
                />

                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={[styles.submitButton, submitting && styles.submitDisabled]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#000" />
                  ) : (
                    <Text style={styles.submitText}>Submit Location Request</Text>
                  )}
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#121217",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
  },
  closeButton: {
    padding: 6,
  },
  body: {
    flexGrow: 1,
  },
  bodyContent: {
    padding: 20,
    gap: 10,
  },
  subtext: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 18,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 12,
    color: "#f87171",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 10,
    borderRadius: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
  },
  input: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.foreground,
  },
  textArea: {
    height: 64,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: colors.foreground,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
  },
  submitDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 12,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.foreground,
  },
  successDesc: {
    fontSize: 13,
    color: colors.muted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  highlight: {
    color: colors.foreground,
    fontWeight: "700",
  },
  closeDoneButton: {
    backgroundColor: colors.foreground,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 10,
  },
  closeDoneText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
  },
});
