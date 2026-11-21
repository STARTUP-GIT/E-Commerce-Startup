import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import {
  MapPin,
  X,
  Sparkles,
  Store,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Share2,
  Compass,
} from 'lucide-react-native';
import { useLocation } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { locationService } from '../services/location.service';
import { colors } from '../theme/colors';

interface AvailableCity {
  id: string;
  name: string;
  canonicalName: string;
  state: string;
}

export const ComingSoonModal: React.FC = () => {
  const {
    comingSoonOpen,
    comingSoonState,
    comingSoonDistrict,
    selectedState,
    selectedDistrict,
    serviceabilityDetails,
    setComingSoon,
    setAddressSelectorOpen,
    setLocation,
  } = useLocation();

  const { user } = useAuth();

  const [availableCities, setAvailableCities] = useState<AvailableCity[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  // Form states
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const displayDistrict = comingSoonDistrict || selectedDistrict || 'Your Location';
  const displayState = comingSoonState || selectedState || 'Region';

  useEffect(() => {
    if (user) {
      const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
      if (fullName) setRequesterName(fullName);
      if (user.email) setRequesterEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (comingSoonOpen) {
      setLoadingCities(true);
      locationService
        .getAvailableCities()
        .then((cities) => {
          setAvailableCities(cities || []);
        })
        .finally(() => {
          setLoadingCities(false);
        });
    }
  }, [comingSoonOpen]);

  const handleClose = () => {
    setComingSoon(false);
    setShowRequestForm(false);
    setSubmitted(false);
    setErrorMessage(null);
  };

  const handleChooseAnother = () => {
    handleClose();
    setAddressSelectorOpen(true);
  };

  const handleSelectCity = async (city: AvailableCity) => {
    handleClose();
    await setLocation(null, city.state, city.canonicalName || city.name, true);
  };

  const handleSubmitRequest = async () => {
    if (!requesterEmail.trim()) {
      setErrorMessage('Please enter an email so we can notify you.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await locationService.submitLocationRequest({
        state: displayState,
        district: displayDistrict,
        requesterName: requesterName.trim() || undefined,
        requesterEmail: requesterEmail.trim(),
        requesterPhone: requesterPhone.trim() || undefined,
        notes: notes.trim() || undefined,
        requestType: 'CUSTOMER',
      });
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={comingSoonOpen}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Close button */}
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <X size={18} color="rgba(255, 255, 255, 0.4)" />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Top Location Bar */}
            <View style={styles.locationBadge}>
              <View style={styles.activeDot} />
              <MapPin size={12} color={colors.primary} />
              <Text style={styles.locationBadgeText}>
                {displayDistrict}, {displayState}
              </Text>
              <TouchableOpacity onPress={handleChooseAnother}>
                <Text style={styles.changeLinkText}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Illustration Icon or Cloudinary Banner */}
            {serviceabilityDetails?.bannerUrl ? (
              <Image
                source={{ uri: serviceabilityDetails.bannerUrl }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.iconCircleOuter}>
                <View style={styles.iconCircleInner}>
                  <MapPin size={32} color={colors.primary} />
                </View>
              </View>
            )}

            {/* Heading */}
            <Text style={styles.title}>Coming soon to your city</Text>

            {/* Supporting description */}
            <Text style={styles.description}>
              {serviceabilityDetails?.comingSoonMessage ||
                `AtlasBasket is not yet available in ${displayDistrict}, ${displayState}. We are actively expanding to bring neighborhood craft makers and fast doorstep delivery to your door.`}
            </Text>

            {serviceabilityDetails?.noticeMessage && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  📢 {serviceabilityDetails.noticeMessage}
                </Text>
              </View>
            )}

            {/* Request Form or Submission Confirmation */}
            {submitted ? (
              <View style={styles.successBox}>
                <CheckCircle2 size={32} color="#10b981" />
                <Text style={styles.successTitle}>Request Submitted!</Text>
                <Text style={styles.successText}>
                  We have added {displayDistrict} to our high-priority launch list. We will email you at {requesterEmail} when service goes live.
                </Text>
                <TouchableOpacity onPress={handleClose} style={styles.doneBtn}>
                  <Text style={styles.btnTextPrimary}>Close</Text>
                </TouchableOpacity>
              </View>
            ) : showRequestForm ? (
              <View style={styles.requestForm}>
                <Text style={styles.formTitle}>Request AtlasBasket in {displayDistrict}</Text>
                {errorMessage && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={14} color="#f87171" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}
                <TextInput
                  placeholder="Your Name (Optional)"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={requesterName}
                  onChangeText={setRequesterName}
                  style={styles.input}
                />
                <TextInput
                  placeholder="Email Address *"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={requesterEmail}
                  onChangeText={setRequesterEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
                <TextInput
                  placeholder="Phone Number (Optional)"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={requesterPhone}
                  onChangeText={setRequesterPhone}
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <TextInput
                  placeholder="Area / Neighborhood / PIN (Optional)"
                  placeholderTextColor="rgba(255, 255, 255, 0.3)"
                  value={notes}
                  onChangeText={setNotes}
                  style={styles.input}
                />
                <View style={styles.formActions}>
                  <TouchableOpacity
                    onPress={() => setShowRequestForm(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.btnTextSecondary}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleSubmitRequest}
                    disabled={submitting}
                    style={styles.submitBtn}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.btnTextPrimary}>Submit Request</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  onPress={() => setShowRequestForm(true)}
                  style={styles.primaryBtn}
                  activeOpacity={0.8}
                >
                  <Sparkles size={16} color="#fff" />
                  <Text style={styles.btnTextPrimary}>Request Only in your city</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleChooseAnother}
                  style={styles.secondaryBtn}
                  activeOpacity={0.8}
                >
                  <Compass size={16} color={colors.primary} />
                  <Text style={styles.btnTextSecondary}>Change Location</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Currently Available Cities */}
            <View style={styles.availableCitiesSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Currently Available Cities</Text>
                {availableCities.length > 0 && (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>{availableCities.length} Active</Text>
                  </View>
                )}
              </View>

              {loadingCities ? (
                <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.citiesGrid}>
                  {availableCities.map((city) => (
                    <TouchableOpacity
                      key={city.id}
                      onPress={() => handleSelectCity(city)}
                      style={styles.cityCard}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cityHeader}>
                        <Store size={12} color={colors.primary} />
                        <ChevronRight size={12} color="rgba(255, 255, 255, 0.3)" />
                      </View>
                      <Text style={styles.cityName} numberOfLines={1}>
                        {city.name}
                      </Text>
                      <Text style={styles.cityState}>{city.state}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Social Media Links */}
            <View style={styles.socialSection}>
              <Text style={styles.socialTitle}>Stay updated on our expansion:</Text>
              <View style={styles.socialRow}>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://twitter.com')}
                  style={styles.socialIconBtn}
                >
                  <Text style={styles.socialIconText}>X</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://instagram.com')}
                  style={styles.socialIconBtn}
                >
                  <Text style={styles.socialIconText}>IG</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Linking.openURL('https://github.com')}
                  style={styles.socialIconBtn}
                >
                  <Text style={styles.socialIconText}>GH</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#09090b',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f59e0b',
  },
  locationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  changeLinkText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textDecorationLine: 'underline',
    marginLeft: 4,
  },
  bannerImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconCircleOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(168, 85, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconCircleInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  noticeBox: {
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    width: '100%',
  },
  noticeText: {
    color: '#d8b4fe',
    fontSize: 11,
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
    marginBottom: 24,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    borderRadius: 16,
    width: '100%',
  },
  btnTextPrimary: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
  btnTextSecondary: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  requestForm: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    gap: 10,
  },
  formTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 8,
  },
  errorText: {
    color: '#f87171',
    fontSize: 11,
  },
  successBox: {
    alignItems: 'center',
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  successTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  successText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  availableCitiesSection: {
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: 'rgba(255, 255, 255, 0.7)',
    letterSpacing: 0.5,
  },
  activePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  activePillText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  citiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 10,
  },
  cityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cityName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cityState: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    marginTop: 2,
  },
  socialSection: {
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  socialTitle: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 11,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    fontWeight: '800',
  },
});
