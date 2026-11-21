import { create } from 'zustand';

export interface ServiceabilityDetails {
  isServiceable?: boolean;
  reason?: string;
  expectedLaunchDate?: string | null;
  comingSoonMessage?: string | null;
  launchAnnouncement?: string | null;
  bannerUrl?: string | null;
  allowBrowsing?: boolean;
  allowOrdering?: boolean;
  noticeMessage?: string | null;
  state?: string;
  district?: string;
  cityTown?: string;
}

export interface DetectedCoordinates {
  latitude: number;
  longitude: number;
}

export interface ResolvedLocation {
  state: string;
  district: string;
  city: string;
  formattedAddress?: string;
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
  
  // 1. Actual detected coordinates
  detectedCoordinates: DetectedCoordinates | null;
  // 2. Reverse-geocoded actual location
  actualLocation: ResolvedLocation | null;
  // 3. User-confirmed location
  confirmedLocation: { state: string; district: string } | null;
  // 4. Selected shopping/delivery location
  selectedAddressId: string | null;
  selectedState: string;
  selectedDistrict: string;
  formattedAddress?: string;
  isManualSelection: boolean;
  
  // 5. Location availability & serviceability status
  isServiceable: boolean;
  isCheckingServiceability: boolean;
  isDetectingLocation: boolean;
  locationPermissionDenied: boolean;
  serviceabilityDetails: ServiceabilityDetails | null;
  
  // Request Modal
  requestModalOpen: boolean;
  setRequestModalOpen: (open: boolean) => void;
  
  addressSelectorOpen: boolean;
  setAddressSelectorOpen: (open: boolean) => void;
  
  // Actions
  setLocation: (addressId: string | null, state: string, district: string, isManual?: boolean) => Promise<boolean>;
  checkLocationServiceability: (state?: string, district?: string) => Promise<boolean>;
  detectLocation: (force?: boolean) => Promise<void>;
  initLocationFromStorage: () => Promise<void>;
}

const STORAGE_KEY = 'atlasbasket_customer_location';
const DENIED_KEY = 'atlasbasket_location_permission_denied';

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
      onClose: onClose 
    }),
  activeStates: [],
  districtRequired: true,
  setActiveStatesData: (states, districtRequired) => set({ activeStates: states, districtRequired }),
  
  // Initial location values - Unset by default; never silently fallback to Mysuru
  detectedCoordinates: null,
  actualLocation: null,
  confirmedLocation: null,
  selectedAddressId: null,
  selectedState: '',
  selectedDistrict: '',
  formattedAddress: undefined,
  isManualSelection: false,
  
  // Serviceability state
  isServiceable: false,
  isCheckingServiceability: false,
  isDetectingLocation: false,
  locationPermissionDenied: false,
  serviceabilityDetails: null,
  
  requestModalOpen: false,
  setRequestModalOpen: (open) => set({ requestModalOpen: open }),
  
  addressSelectorOpen: false,
  setAddressSelectorOpen: (open) => set({ addressSelectorOpen: open }),

  checkLocationServiceability: async (targetState?: string, targetDistrict?: string): Promise<boolean> => {
    const state = targetState || get().selectedState;
    const district = targetDistrict || get().selectedDistrict;

    if (!state || !district) {
      set({ isServiceable: false, serviceabilityDetails: null });
      return false;
    }

    set({ isCheckingServiceability: true });
    try {
      const res = await fetch(`/api/locations/check-serviceability?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&userRole=CUSTOMER`);
      if (res.ok) {
        const data = await res.json();
        const serviceable = Boolean(data.isServiceable);
        set({
          isServiceable: serviceable,
          serviceabilityDetails: data,
          isCheckingServiceability: false,
        });
        return serviceable;
      }
    } catch (err) {
      console.warn('Error checking location serviceability:', err);
    }
    set({ isCheckingServiceability: false });
    return get().isServiceable;
  },

  setLocation: async (addressId, state, district, isManual = true): Promise<boolean> => {
    const sanitizedDistrict = district || '';
    const sanitizedState = state || '';

    set({ 
      selectedAddressId: addressId, 
      selectedState: sanitizedState, 
      selectedDistrict: sanitizedDistrict,
      confirmedLocation: sanitizedState && sanitizedDistrict ? { state: sanitizedState, district: sanitizedDistrict } : null,
      isManualSelection: isManual,
      isCheckingServiceability: true,
    });

    let serviceable = false;
    let details: ServiceabilityDetails | null = null;

    try {
      if (sanitizedState && sanitizedDistrict) {
        const res = await fetch(`/api/locations/check-serviceability?state=${encodeURIComponent(sanitizedState)}&district=${encodeURIComponent(sanitizedDistrict)}&userRole=CUSTOMER`);
        if (res.ok) {
          details = await res.json();
          serviceable = Boolean(details?.isServiceable);
        }
      }
    } catch (err) {
      console.warn('Failed to verify serviceability during setLocation:', err);
    }

    set({
      isServiceable: serviceable,
      serviceabilityDetails: details,
      isCheckingServiceability: false,
    });

    if (typeof window !== 'undefined' && sanitizedState && sanitizedDistrict) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          addressId,
          state: sanitizedState,
          district: sanitizedDistrict,
          isManual,
          isServiceable: serviceable,
          serviceabilityDetails: details,
        }));
      } catch {
        // Storage quota or private browsing
      }
    }

    return serviceable;
  },

  detectLocation: async (force = false) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      if (get().selectedState && get().selectedDistrict) {
        await get().checkLocationServiceability();
      } else {
        set({ addressSelectorOpen: true });
      }
      return;
    }

    const currentIsManual = get().isManualSelection;
    if (currentIsManual && !force && get().selectedDistrict) {
      // Respect user's explicit selection
      await get().checkLocationServiceability();
      return;
    }

    set({ isDetectingLocation: true });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const coords: DetectedCoordinates = { latitude, longitude };
          
          const res = await fetch('/api/locations/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude,
              longitude,
              userRole: 'CUSTOMER',
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const resolved = data.resolvedLocation;
            const serviceability = data.serviceability;

            if (resolved && resolved.state && (resolved.district || resolved.city)) {
              const district = resolved.district || resolved.city;
              const state = resolved.state;
              const isServiceable = serviceability ? Boolean(serviceability.isServiceable) : false;

              set({
                detectedCoordinates: coords,
                actualLocation: {
                  state,
                  district,
                  city: resolved.city || district,
                  formattedAddress: resolved.formattedAddress,
                },
                selectedState: state,
                selectedDistrict: district,
                formattedAddress: resolved.formattedAddress,
                isServiceable,
                serviceabilityDetails: serviceability || null,
                isDetectingLocation: false,
                isManualSelection: false,
                locationPermissionDenied: false,
              });

              localStorage.setItem(STORAGE_KEY, JSON.stringify({
                state,
                district,
                formattedAddress: resolved.formattedAddress,
                isManual: false,
                isServiceable,
                serviceabilityDetails: serviceability,
              }));
              return;
            }
          }
        } catch (err) {
          console.warn('Coordinates resolution failed:', err);
        }
        
        // If resolution did not produce a valid location, do NOT substitute Mysuru
        set({
          isDetectingLocation: false,
          isServiceable: false,
        });
        if (!get().selectedDistrict) {
          set({ addressSelectorOpen: true });
        }
      },
      (error) => {
        console.warn('Geolocation denied or timed out:', error.message);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(DENIED_KEY, 'true');
          } catch {}
        }
        set({
          locationPermissionDenied: true,
          isDetectingLocation: false,
        });
        // If no location has ever been selected, prompt the user with address selector
        if (!get().selectedDistrict) {
          set({ addressSelectorOpen: true });
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  },

  initLocationFromStorage: async () => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const isDenied = localStorage.getItem(DENIED_KEY) === 'true';

      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.district) {
          set({
            selectedAddressId: parsed.addressId || null,
            selectedState: parsed.state,
            selectedDistrict: parsed.district,
            formattedAddress: parsed.formattedAddress,
            isManualSelection: Boolean(parsed.isManual),
            locationPermissionDenied: isDenied,
          });

          // Revalidate against backend single source of truth
          await get().checkLocationServiceability(parsed.state, parsed.district);
          return;
        }
      }

      // In incognito or fresh visit: no stored location
      // Attempt detection; if denied or fails, it will open the address selector
      if (!isDenied) {
        await get().detectLocation(false);
      } else {
        set({
          locationPermissionDenied: true,
          addressSelectorOpen: true,
        });
      }
    } catch {
      set({ addressSelectorOpen: true });
    }
  },
}));
