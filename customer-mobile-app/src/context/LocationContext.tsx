import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { STORAGE_KEYS } from '../services/api.service';
import { locationService, StateInfo } from '../services/location.service';

const PERMISSION_ASKED_KEY = 'atlasbasket_location_permission_asked';
const PERMISSION_DENIED_KEY = 'atlasbasket_location_permission_denied';
const IS_MANUAL_KEY = 'atlasbasket_location_is_manual';

export interface ServiceabilityInfo {
  isServiceable?: boolean;
  reason?: string;
  expectedLaunchDate?: string | null;
  comingSoonMessage?: string | null;
  launchAnnouncement?: string | null;
  bannerUrl?: string | null;
  allowBrowsing?: boolean;
  allowOrdering?: boolean;
  noticeMessage?: string | null;
}

interface LocationContextValue {
  selectedAddressId: string | null;
  selectedState: string;
  selectedDistrict: string;
  formattedAddress?: string;
  isServiceable: boolean;
  isCheckingLocation: boolean;
  serviceabilityDetails: ServiceabilityInfo | null;
  locationPermissionDenied: boolean;
  setLocation: (addressId: string | null, state: string, district: string, isManual?: boolean) => Promise<void>;
  detectLocation: (force?: boolean) => Promise<void>;
  checkServiceability: (state?: string, district?: string) => Promise<boolean>;
  addressSelectorOpen: boolean;
  setAddressSelectorOpen: (open: boolean) => void;
  comingSoonOpen: boolean;
  comingSoonState: string;
  comingSoonDistrict?: string;
  setComingSoon: (open: boolean, stateName?: string, districtName?: string) => void;
  activeStates: StateInfo[];
  allStates: StateInfo[];
  districtRequired: boolean;
}

const LocationContext = createContext<LocationContextValue>({
  selectedAddressId: null,
  selectedState: 'Karnataka',
  selectedDistrict: 'Mysuru',
  formattedAddress: undefined,
  isServiceable: true,
  isCheckingLocation: false,
  serviceabilityDetails: null,
  locationPermissionDenied: false,
  setLocation: async () => {},
  detectLocation: async () => {},
  checkServiceability: async () => true,
  addressSelectorOpen: false,
  setAddressSelectorOpen: () => {},
  comingSoonOpen: false,
  comingSoonState: '',
  setComingSoon: () => {},
  activeStates: [],
  allStates: [],
  districtRequired: true,
});

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<string>('Karnataka');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('Mysuru');
  const [formattedAddress, setFormattedAddress] = useState<string | undefined>(undefined);
  const [isServiceable, setIsServiceable] = useState<boolean>(true);
  const [isCheckingLocation, setIsCheckingLocation] = useState<boolean>(false);
  const [serviceabilityDetails, setServiceabilityDetails] = useState<ServiceabilityInfo | null>(null);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState<boolean>(false);

  const [addressSelectorOpen, setAddressSelectorOpen] = useState(false);
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [comingSoonState, setComingSoonState] = useState('');
  const [comingSoonDistrict, setComingSoonDistrict] = useState<string | undefined>(undefined);
  const [activeStates, setActiveStates] = useState<StateInfo[]>([]);
  const [allStates, setAllStates] = useState<StateInfo[]>([]);
  const [districtRequired, setDistrictRequired] = useState(true);

  const checkServiceability = useCallback(async (state?: string, district?: string): Promise<boolean> => {
    const targetState = state || selectedState;
    const targetDistrict = district || selectedDistrict;

    if (!targetState || !targetDistrict) return true;

    setIsCheckingLocation(true);
    try {
      const data = await locationService.checkServiceability(targetState, targetDistrict);
      const serviceable = Boolean(data.isServiceable);
      setIsServiceable(serviceable);
      setServiceabilityDetails(data);
      setIsCheckingLocation(false);
      return serviceable;
    } catch {
      setIsCheckingLocation(false);
      return true;
    }
  }, [selectedState, selectedDistrict]);

  const setLocation = async (
    addressId: string | null,
    state: string,
    district: string,
    isManual = true
  ) => {
    setSelectedAddressId(addressId);
    setSelectedState(state);
    setSelectedDistrict(district);

    try {
      if (addressId) {
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_ADDRESS_ID, addressId);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.LOCATION_ADDRESS_ID);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_STATE, state);
      await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_DISTRICT, district);
      if (isManual) {
        await AsyncStorage.setItem(IS_MANUAL_KEY, 'true');
      }
    } catch {
      // Ignore storage error
    }

    const serviceable = await checkServiceability(state, district);
    if (!serviceable) {
      setComingSoonOpen(true);
      setComingSoonState(state);
      setComingSoonDistrict(district);
    }
  };

  const detectLocation = useCallback(async (force = false) => {
    try {
      const isManual = await AsyncStorage.getItem(IS_MANUAL_KEY);
      if (isManual === 'true' && !force) {
        await checkServiceability();
        return;
      }

      setIsCheckingLocation(true);

      const existing = await Location.getForegroundPermissionsAsync();
      let status = existing.status;

      if (status !== 'granted') {
        const requested = await Location.requestForegroundPermissionsAsync();
        status = requested.status;
        await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
      }

      if (status !== 'granted') {
        setLocationPermissionDenied(true);
        await AsyncStorage.setItem(PERMISSION_DENIED_KEY, 'true');
        setIsCheckingLocation(false);
        await checkServiceability();
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const res = await locationService.resolveCoordinates(
        position.coords.latitude,
        position.coords.longitude
      );

      if (res && res.resolvedLocation) {
        const district = res.resolvedLocation.district || res.resolvedLocation.city || 'Mysuru';
        const state = res.resolvedLocation.state || 'Karnataka';
        const serviceable = res.serviceability ? Boolean(res.serviceability.isServiceable) : true;

        setSelectedState(state);
        setSelectedDistrict(district);
        setFormattedAddress(res.resolvedLocation.formattedAddress);
        setIsServiceable(serviceable);
        setServiceabilityDetails(res.serviceability || null);

        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_STATE, state);
        await AsyncStorage.setItem(STORAGE_KEYS.LOCATION_DISTRICT, district);
        await AsyncStorage.setItem(IS_MANUAL_KEY, 'false');

        if (!serviceable) {
          setComingSoonOpen(true);
          setComingSoonState(state);
          setComingSoonDistrict(district);
        }
      }
    } catch (err) {
      console.warn('Native location detection error:', err);
    } finally {
      setIsCheckingLocation(false);
    }
  }, [checkServiceability]);

  useEffect(() => {
    const initLocation = async () => {
      try {
        const storedState = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_STATE);
        const storedDistrict = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_DISTRICT);
        const storedAddrId = await AsyncStorage.getItem(STORAGE_KEYS.LOCATION_ADDRESS_ID);
        const permissionDenied = (await AsyncStorage.getItem(PERMISSION_DENIED_KEY)) === 'true';

        setLocationPermissionDenied(permissionDenied);

        // Fetch operational states from SSOT
        const config = await locationService.getStates();
        setActiveStates(config.states.filter((s) => s.isEnabled));
        setAllStates(config.allStates);
        setDistrictRequired(config.districtRequired);

        if (storedState && storedDistrict) {
          setSelectedState(storedState);
          setSelectedDistrict(storedDistrict);
          if (storedAddrId) setSelectedAddressId(storedAddrId);

          // Revalidate current configuration
          const serviceable = await checkServiceability(storedState, storedDistrict);
          if (!serviceable) {
            setComingSoonOpen(true);
            setComingSoonState(storedState);
            setComingSoonDistrict(storedDistrict);
          }
        } else {
          // First launch: request permission if not asked before
          const asked = await AsyncStorage.getItem(PERMISSION_ASKED_KEY);
          if (!asked) {
            await detectLocation(false);
          } else {
            await checkServiceability();
          }
        }
      } catch {
        // Fallback defaults
      }
    };

    initLocation();
  }, [checkServiceability, detectLocation]);

  const setComingSoon = (open: boolean, stateName: string = '', districtName?: string) => {
    setComingSoonOpen(open);
    setComingSoonState(stateName);
    setComingSoonDistrict(districtName);
  };

  return (
    <LocationContext.Provider
      value={{
        selectedAddressId,
        selectedState,
        selectedDistrict,
        formattedAddress,
        isServiceable,
        isCheckingLocation,
        serviceabilityDetails,
        locationPermissionDenied,
        setLocation,
        detectLocation,
        checkServiceability,
        addressSelectorOpen,
        setAddressSelectorOpen,
        comingSoonOpen,
        comingSoonState,
        comingSoonDistrict,
        setComingSoon,
        activeStates,
        allStates,
        districtRequired,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
