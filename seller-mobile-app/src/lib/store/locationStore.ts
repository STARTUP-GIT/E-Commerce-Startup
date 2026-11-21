import { create } from 'zustand';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axiosInstance from '@/lib/axios/axiosInstance';

export interface ServiceabilityDetails {
  isServiceable?: boolean;
  reason?: string;
  expectedLaunchDate?: string | null;
  comingSoonMessage?: string | null;
  launchAnnouncement?: string | null;
  bannerUrl?: string | null;
  allowSellerRegistration?: boolean;
  allowShopCreation?: boolean;
  sellerNoticeMessage?: string | null;
  state?: string;
  district?: string;
}

interface LocationState {
  comingSoonOpen: boolean;
  comingSoonState: string;
  comingSoonDistrict?: string;
  onChooseAnotherState?: () => void;
  onClose?: () => void;
  setComingSoon: (
    open: boolean,
    stateName?: string,
    districtName?: string,
    onChooseAnother?: () => void,
    onClose?: () => void
  ) => void;
  activeStates: string[];
  districtRequired: boolean;
  setActiveStatesData: (states: string[], districtRequired: boolean) => void;

  // Selected location tracking
  selectedState: string;
  selectedDistrict: string;
  formattedAddress?: string;
  isManualSelection: boolean;

  // Serviceability & availability
  isServiceable: boolean;
  isCheckingServiceability: boolean;
  isDetectingLocation: boolean;
  locationPermissionDenied: boolean;
  serviceabilityDetails: ServiceabilityDetails | null;

  // Actions
  setLocation: (state: string, district: string, isManual?: boolean) => Promise<boolean>;
  checkLocationServiceability: (state?: string, district?: string) => Promise<boolean>;
  detectLocation: (force?: boolean) => Promise<void>;
  initLocationFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'atlasbasket_seller_location';
const PERMISSION_ASKED_KEY = 'atlasbasket_seller_location_asked';
const PERMISSION_DENIED_KEY = 'atlasbasket_seller_location_denied';
const IS_MANUAL_KEY = 'atlasbasket_seller_location_is_manual';

export const useLocationStore = create<LocationState>((set, get) => ({
  comingSoonOpen: false,
  comingSoonState: '',
  comingSoonDistrict: '',
  setComingSoon: (open, stateName = '', districtName = '', onChooseAnother, onClose) =>
    set({
      comingSoonOpen: open,
      comingSoonState: stateName,
      comingSoonDistrict: districtName,
      onChooseAnotherState: onChooseAnother,
      onClose: onClose,
    }),
  activeStates: [],
  districtRequired: true,
  setActiveStatesData: (states, districtRequired) => set({ activeStates: states, districtRequired }),

  // Initial location values
  selectedState: 'Karnataka',
  selectedDistrict: 'Mysuru',
  formattedAddress: undefined,
  isManualSelection: false,

  // Serviceability state
  isServiceable: true,
  isCheckingServiceability: false,
  isDetectingLocation: false,
  locationPermissionDenied: false,
  serviceabilityDetails: null,

  checkLocationServiceability: async (targetState?: string, targetDistrict?: string): Promise<boolean> => {
    const state = targetState || get().selectedState;
    const district = targetDistrict || get().selectedDistrict;

    if (!state || !district) return true;

    set({ isCheckingServiceability: true });
    try {
      const res = await axiosInstance.get(
        `/api/locations/check-serviceability?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&userRole=SELLER`
      );
      const data = res.data;
      const serviceable = Boolean(data.isServiceable);
      set({
        isServiceable: serviceable,
        serviceabilityDetails: data,
        isCheckingServiceability: false,
      });
      return serviceable;
    } catch (err) {
      console.warn('Seller serviceability check error:', err);
    }
    set({ isCheckingServiceability: false });
    return get().isServiceable;
  },

  setLocation: async (state, district, isManual = true): Promise<boolean> => {
    const sanitizedDistrict = district || '';
    const sanitizedState = state || '';

    set({
      selectedState: sanitizedState,
      selectedDistrict: sanitizedDistrict,
      isManualSelection: isManual,
      isCheckingServiceability: true,
    });

    let serviceable = true;
    let details: ServiceabilityDetails | null = null;

    try {
      if (sanitizedState && sanitizedDistrict) {
        const res = await axiosInstance.get(
          `/api/locations/check-serviceability?state=${encodeURIComponent(sanitizedState)}&district=${encodeURIComponent(sanitizedDistrict)}&userRole=SELLER`
        );
        details = res.data;
        serviceable = Boolean(details?.isServiceable);
      }
    } catch (err) {
      console.warn('Failed to verify seller serviceability:', err);
    }

    set({
      isServiceable: serviceable,
      serviceabilityDetails: details,
      isCheckingServiceability: false,
    });

    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          state: sanitizedState,
          district: sanitizedDistrict,
          isManual,
          isServiceable: serviceable,
          serviceabilityDetails: details,
        })
      );
      if (isManual) {
        await AsyncStorage.setItem(IS_MANUAL_KEY, 'true');
      }
    } catch {}

    if (!serviceable) {
      set({
        comingSoonOpen: true,
        comingSoonState: sanitizedState,
        comingSoonDistrict: sanitizedDistrict,
      });
    }

    return serviceable;
  },

  detectLocation: async (force = false) => {
    try {
      const isManual = await AsyncStorage.getItem(IS_MANUAL_KEY);
      if (isManual === 'true' && !force) {
        await get().checkLocationServiceability();
        return;
      }

      set({ isDetectingLocation: true });

      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;

      if (status !== 'granted') {
        const requested = await Location.requestForegroundPermissionsAsync();
        status = requested.status;
        await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
      }

      if (status !== 'granted') {
        set({ locationPermissionDenied: true, isDetectingLocation: false });
        await AsyncStorage.setItem(PERMISSION_DENIED_KEY, 'true');
        await get().checkLocationServiceability();
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const res = await axiosInstance.post('/api/locations/resolve', {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        userRole: 'SELLER',
      });

      const data = res.data;
      if (data && data.resolvedLocation) {
        const district = data.resolvedLocation.district || data.resolvedLocation.city || 'Mysuru';
        const state = data.resolvedLocation.state || 'Karnataka';
        const serviceable = data.serviceability ? Boolean(data.serviceability.isServiceable) : true;

        set({
          selectedState: state,
          selectedDistrict: district,
          formattedAddress: data.resolvedLocation.formattedAddress,
          isServiceable: serviceable,
          serviceabilityDetails: data.serviceability || null,
          isDetectingLocation: false,
          isManualSelection: false,
        });

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            state,
            district,
            formattedAddress: data.resolvedLocation.formattedAddress,
            isManual: false,
            isServiceable: serviceable,
            serviceabilityDetails: data.serviceability,
          })
        );
        await AsyncStorage.setItem(IS_MANUAL_KEY, 'false');

        if (!serviceable) {
          set({
            comingSoonOpen: true,
            comingSoonState: state,
            comingSoonDistrict: district,
          });
        }
      }
    } catch (err) {
      console.warn('Native seller location detection error:', err);
    } finally {
      set({ isDetectingLocation: false });
    }
  },

  initLocationFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      const isDenied = (await AsyncStorage.getItem(PERMISSION_DENIED_KEY)) === 'true';

      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.district) {
          set({
            selectedState: parsed.state,
            selectedDistrict: parsed.district,
            formattedAddress: parsed.formattedAddress,
            isManualSelection: Boolean(parsed.isManual),
            locationPermissionDenied: isDenied,
          });

          const serviceable = await get().checkLocationServiceability(parsed.state, parsed.district);
          if (!serviceable) {
            set({
              comingSoonOpen: true,
              comingSoonState: parsed.state,
              comingSoonDistrict: parsed.district,
            });
          }
          return;
        }
      }

      const asked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
      if (!asked) {
        await get().detectLocation(false);
      } else {
        await get().checkLocationServiceability();
      }
    } catch {
      await get().checkLocationServiceability();
    }
  },
}));
