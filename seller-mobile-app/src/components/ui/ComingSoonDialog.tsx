import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocationStore } from '@/lib/store/locationStore';
import { Button } from '@/shared/components/Button';
import { Rocket, Bell, X, Check, MapPin, Store, Sparkles, AlertCircle } from 'lucide-react-native';
import { Colors } from '@/theme/colors';
import axiosInstance from '@/lib/axios/axiosInstance';

interface AvailableCity {
  id: string;
  name: string;
  canonicalName: string;
  state: string;
  isSellerEnabled: boolean;
}

export function ComingSoonDialog() {
  const {
    comingSoonOpen,
    comingSoonState,
    comingSoonDistrict,
    selectedState,
    selectedDistrict,
    serviceabilityDetails,
    setComingSoon,
    onChooseAnotherState,
    onClose,
  } = useLocationStore();

  const [notified, setNotified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableCities, setAvailableCities] = useState<AvailableCity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const displayDistrict = comingSoonDistrict || selectedDistrict || 'District';
  const displayState = comingSoonState || selectedState || 'State';

  useEffect(() => {
    if (comingSoonOpen) {
      setIsLoadingCities(true);
      axiosInstance
        .get('/api/locations/available-cities')
        .then((res) => {
          const list = (res.data?.cities || []).filter((c: any) => c.isSellerEnabled !== false);
          setAvailableCities(list);
        })
        .catch(() => setAvailableCities([]))
        .finally(() => setIsLoadingCities(false));
    }
  }, [comingSoonOpen]);

  const handleClose = (chooseAnother = false) => {
    setComingSoon(false);
    setNotified(false);
    setErrorMessage(null);
    if (chooseAnother && onChooseAnotherState) {
      onChooseAnotherState();
    } else if (!chooseAnother && onClose) {
      onClose();
    }
  };

  const handleRequestSellerLaunch = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await axiosInstance.post('/api/locations/request', {
        state: displayState,
        district: displayDistrict,
        requestType: 'SELLER',
      });
      setNotified(true);
      setTimeout(() => {
        handleClose(false);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to submit seller request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!comingSoonOpen) return null;

  return (
    <Modal
      visible={comingSoonOpen}
      transparent
      animationType="fade"
      onRequestClose={() => handleClose(false)}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => handleClose(false)}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.card}>
          <TouchableOpacity
            onPress={() => handleClose(false)}
            style={styles.closeBtn}
          >
            <X size={16} color="rgba(255, 255, 255, 0.4)" />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Top Location Bar */}
            <View style={styles.locationBadge}>
              <View style={styles.activeDot} />
              <MapPin size={12} color={Colors.purpleLight} />
              <Text style={styles.locationBadgeText}>
                {displayDistrict}, {displayState}
              </Text>
            </View>

            {serviceabilityDetails?.bannerUrl ? (
              <Image
                source={{ uri: serviceabilityDetails.bannerUrl }}
                style={styles.bannerImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.iconCircle}>
                <Rocket size={32} color={Colors.purpleLight} />
              </View>
            )}

            <Text style={styles.title}>Seller Onboarding Not Available Yet</Text>

            <Text style={styles.description}>
              {serviceabilityDetails?.comingSoonMessage ||
                `AtlasBasket is live in ${displayState}, but seller onboarding has not yet opened in ${displayDistrict}. Submit a request below to expedite seller launch in this region.`}
            </Text>

            {serviceabilityDetails?.sellerNoticeMessage && (
              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  📢 {serviceabilityDetails.sellerNoticeMessage}
                </Text>
              </View>
            )}

            {errorMessage && (
              <View style={styles.errorBox}>
                <AlertCircle size={14} color="#f87171" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Button
                variant={notified ? 'secondary' : 'default'}
                onPress={handleRequestSellerLaunch}
                disabled={isSubmitting || notified}
                style={{ width: '100%', marginBottom: 10 }}
              >
                {isSubmitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Submitting...</Text>
                  </View>
                ) : notified ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Check size={16} color="#10b981" />
                    <Text style={{ color: '#10b981', fontWeight: '700' }}>Request Submitted!</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={16} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '700' }}>Request Seller Launch</Text>
                  </View>
                )}
              </Button>

              <Button
                variant="outline"
                onPress={() => handleClose(true)}
                style={{ width: '100%', marginBottom: 16 }}
              >
                Choose Another Location
              </Button>
            </View>

            {/* Supported Cities List */}
            <View style={styles.supportedSection}>
              <View style={styles.sectionHeader}>
                <Store size={14} color={Colors.purpleLight} />
                <Text style={styles.sectionTitle}>Currently Supported Districts</Text>
              </View>

              {isLoadingCities ? (
                <ActivityIndicator size="small" color={Colors.purpleLight} style={{ marginVertical: 10 }} />
              ) : (
                <View style={styles.citiesGrid}>
                  {availableCities.map((city) => (
                    <View key={city.id} style={styles.cityCard}>
                      <Text style={styles.cityName} numberOfLines={1}>{city.name}</Text>
                      <Text style={styles.cityState}>{city.state}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#09090b',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  scroll: {
    padding: 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 16,
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
  bannerImage: {
    width: '100%',
    height: 130,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
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
    paddingHorizontal: 6,
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
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    color: '#f87171',
    fontSize: 11,
  },
  actions: {
    width: '100%',
  },
  supportedSection: {
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderRadius: 12,
    padding: 8,
  },
  cityName: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cityState: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 9,
    marginTop: 2,
  },
});
