import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { MapPin, Crosshair, X, CheckCircle, Clock, AlertTriangle } from "lucide-react-native";
import { apiClient } from "../api";
import { colors } from "../theme";
import { useDeliverySettings, type MobileResolvedLocation } from "../settings/DeliverySettingsContext";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function LocationPickerModal({ visible, onClose }: Props) {
  const { catalogue, selectLocation, detectLocation, isDetectingLocation } = useDeliverySettings();

  const [selectedDistrictId, setSelectedDistrictId] = useState("");
  const [selectedTownId, setSelectedTownId] = useState("");
  const [selectedServiceAreaId, setSelectedServiceAreaId] = useState("");
  const [pincode, setPincode] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  const districts = catalogue?.districts || [];
  const currentDistrict = districts.find((d) => d.id === selectedDistrictId);
  const towns = currentDistrict?.towns || [];
  const areas = currentDistrict?.serviceAreas?.filter(
    (a) => !selectedTownId || !a.cityTownId || a.cityTownId === selectedTownId
  ) || [];

  useEffect(() => {
    if (!selectedDistrictId && !pincode) {
      setCheckResult(null);
      return;
    }

    let isMounted = true;
    setChecking(true);

    const timer = setTimeout(async () => {
      try {
        const payload: any = {};
        if (selectedDistrictId) payload.districtId = selectedDistrictId;
        if (selectedTownId) payload.townId = selectedTownId;
        if (selectedServiceAreaId) payload.serviceAreaId = selectedServiceAreaId;
        if (pincode.trim().length >= 6) payload.postalCode = pincode.trim();

        const res = await apiClient.post("/api/delivery/serviceability/check", payload);
        if (isMounted) setCheckResult(res.data);
      } catch (err: any) {
        if (isMounted) {
          setCheckResult({
            isDeliveryEligible: false,
            status: "ERROR",
            message: err.response?.data?.message || "Could not check location.",
          });
        }
      } finally {
        if (isMounted) setChecking(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedDistrictId, selectedTownId, selectedServiceAreaId, pincode]);

  const handleApply = async () => {
    if (!currentDistrict && !checkResult?.resolvedLocation?.district) return;

    const chosenTown = towns.find((t) => t.id === selectedTownId);
    const chosenArea = areas.find((a) => a.id === selectedServiceAreaId);

    const resolved: MobileResolvedLocation = {
      state: currentDistrict?.state || checkResult?.resolvedLocation?.state || "Karnataka",
      district: currentDistrict?.displayName || currentDistrict?.name || checkResult?.resolvedLocation?.district,
      districtId: currentDistrict?.id || checkResult?.resolvedLocation?.districtId,
      town: chosenTown?.displayName || chosenTown?.name || checkResult?.resolvedLocation?.town,
      townId: chosenTown?.id || checkResult?.resolvedLocation?.townId,
      serviceArea: chosenArea?.name || checkResult?.resolvedLocation?.serviceArea,
      serviceAreaId: chosenArea?.id || checkResult?.resolvedLocation?.serviceAreaId,
      postalCode: pincode || (chosenArea?.postalCodes ? chosenArea.postalCodes[0] : checkResult?.resolvedLocation?.postalCode),
      formattedAddress: checkResult?.resolvedLocation?.formattedAddress,
      isEligible: checkResult?.isDeliveryEligible,
      status: checkResult?.status,
      message: checkResult?.message,
      comingSoonMessage: checkResult?.comingSoonMessage,
    };

    await selectLocation(resolved);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MapPin size={18} color={colors.foreground} />
              <Text style={styles.headerTitle}>Select Location</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={18} color={colors.muted} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* GPS Auto-Detect Button */}
            <Pressable
              onPress={async () => {
                await detectLocation();
                onClose();
              }}
              disabled={isDetectingLocation}
              style={({ pressed }) => [styles.gpsButton, pressed && styles.pressed]}
            >
              <Crosshair size={16} color={colors.foreground} />
              <Text style={styles.gpsButtonText}>
                {isDetectingLocation ? "Detecting GPS Location..." : "Use Current GPS Location"}
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>OR SELECT DISTRICT</Text>
              <View style={styles.divider} />
            </View>

            {/* Districts List */}
            <Text style={styles.sectionLabel}>Operational District *</Text>
            <View style={styles.chipGrid}>
              {districts.map((d) => {
                const isSelected = selectedDistrictId === d.id;
                return (
                  <Pressable
                    key={d.id}
                    onPress={() => {
                      setSelectedDistrictId(d.id);
                      setSelectedTownId("");
                      setSelectedServiceAreaId("");
                    }}
                    style={[
                      styles.chip,
                      isSelected && styles.chipActive,
                      !d.isDeliveryEnabled && styles.chipDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        isSelected && styles.chipTextActive,
                        !d.isDeliveryEnabled && styles.chipTextDisabled,
                      ]}
                    >
                      {d.displayName || d.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Towns List (if available) */}
            {towns.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Town / City (Optional)</Text>
                <View style={styles.chipGrid}>
                  {towns.map((t) => {
                    const isSelected = selectedTownId === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => {
                          setSelectedTownId(isSelected ? "" : t.id);
                          setSelectedServiceAreaId("");
                        }}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {t.displayName || t.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Service Areas (if available) */}
            {areas.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Locality / Service Area</Text>
                <View style={styles.chipGrid}>
                  {areas.slice(0, 10).map((a) => {
                    const isSelected = selectedServiceAreaId === a.id;
                    return (
                      <Pressable
                        key={a.id}
                        onPress={() => setSelectedServiceAreaId(isSelected ? "" : a.id)}
                        style={[styles.chip, isSelected && styles.chipActive]}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {a.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* PIN Code Input */}
            <Text style={styles.sectionLabel}>PIN Code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 570001"
              placeholderTextColor={colors.muted}
              value={pincode}
              onChangeText={(text) => setPincode(text.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
            />

            {/* Status Feedback */}
            {checking && (
              <View style={styles.checkingBox}>
                <ActivityIndicator size="small" color={colors.foreground} />
                <Text style={styles.checkingText}>Checking delivery coverage...</Text>
              </View>
            )}

            {!checking && checkResult && (
              <View
                style={[
                  styles.statusBox,
                  checkResult.isDeliveryEligible ? styles.statusEligible : styles.statusIneligible,
                ]}
              >
                <View style={styles.statusRow}>
                  {checkResult.isDeliveryEligible ? (
                    <CheckCircle size={16} color="#10b981" />
                  ) : (
                    <Clock size={16} color="#38bdf8" />
                  )}
                  <Text style={styles.statusTitle}>
                    {checkResult.isDeliveryEligible ? "Delivery Operational" : "Coming Soon"}
                  </Text>
                </View>
                <Text style={styles.statusMessage}>{checkResult.message}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleApply}
              disabled={!selectedDistrictId && !pincode}
              style={[
                styles.applyButton,
                (!selectedDistrictId && !pincode) && styles.applyDisabled,
              ]}
            >
              <Text style={styles.applyText}>Confirm Location</Text>
            </Pressable>
          </View>
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
    gap: 12,
  },
  gpsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  pressed: {
    opacity: 0.8,
  },
  gpsButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.muted,
    marginTop: 4,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  chipActive: {
    backgroundColor: colors.foreground,
    borderColor: colors.foreground,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.foreground,
  },
  chipTextActive: {
    color: "#000",
    fontWeight: "700",
  },
  chipTextDisabled: {
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
  checkingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
  },
  checkingText: {
    fontSize: 12,
    color: colors.muted,
  },
  statusBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusEligible: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusIneligible: {
    backgroundColor: "rgba(56, 189, 248, 0.08)",
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foreground,
  },
  statusMessage: {
    fontSize: 11,
    color: colors.muted,
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.muted,
  },
  applyButton: {
    backgroundColor: colors.foreground,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  applyDisabled: {
    opacity: 0.4,
  },
  applyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#000",
  },
});
