import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { apiClient, getErrorMessage } from "../api";
import type { PublicSettings } from "../types";

export interface OperationalDistrict {
  id: string;
  name: string;
  state: string;
}

export interface MobileResolvedLocation {
  state?: string;
  district?: string;
  districtId?: string;
  town?: string;
  townId?: string;
  serviceArea?: string;
  serviceAreaId?: string;
  postalCode?: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
  isEligible?: boolean;
  status?: string;
  message?: string;
  comingSoonMessage?: string | null;
}

export interface CatalogueDistrict {
  id: string;
  name: string;
  displayName: string;
  state: string;
  isDeliveryEnabled: boolean;
  towns: Array<{ id: string; name: string; displayName: string }>;
  serviceAreas: Array<{ id: string; name: string; postalCodes: string[]; cityTownId?: string | null }>;
}

export interface LocationCatalogue {
  states: Array<{ id: string; name: string }>;
  districts: CatalogueDistrict[];
}

interface DeliverySettingsContextValue {
  settings: PublicSettings | null;
  districts: OperationalDistrict[] | null;
  districtsError: string;
  userLocation: MobileResolvedLocation | null;
  catalogue: LocationCatalogue | null;
  isDetectingLocation: boolean;
  detectLocation: () => Promise<void>;
  selectLocation: (loc: MobileResolvedLocation) => Promise<void>;
  submitLocationRequest: (payload: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    district?: string;
    area?: string;
    pincode?: string;
    notes?: string;
  }) => Promise<void>;
  refresh: () => Promise<void>;
}

const DeliverySettingsContext = createContext<DeliverySettingsContextValue | null>(null);

const LOCATION_KEY = "atlasbasket_mobile_delivery_location";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function assetUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const url = value.trim();
  if (/^(https?:|data:)/i.test(url)) return url;
  const baseUrl = apiClient.defaults.baseURL;
  return baseUrl ? new URL(url, `${baseUrl.replace(/\/+$/, "")}/`).toString() : url;
}

function normalizePublicSettings(value: unknown): PublicSettings {
  if (!isRecord(value)) {
    throw new Error("The delivery settings endpoint returned an invalid response.");
  }
  const hero = isRecord(value.hero) ? value.hero : {};
  const rawCards = isRecord(value.cards) ? value.cards : {};
  const cards = Object.fromEntries(
    Object.entries(rawCards).filter((entry): entry is [string, Record<string, unknown>] => isRecord(entry[1])),
  );
  const activeCities = Array.isArray(value.activeCities)
    ? value.activeCities.filter((city): city is string => typeof city === "string")
    : [];
  const supportedVehicles = Array.isArray(value.supportedVehicles)
    ? value.supportedVehicles.filter((vehicle): vehicle is string => typeof vehicle === "string")
    : [];

  return {
    brandName: typeof value.brandName === "string" ? value.brandName : undefined,
    brandLogoUrl: assetUrl(value.brandLogoUrl),
    brandTagline: typeof value.brandTagline === "string" ? value.brandTagline : undefined,
    riderPayoutPercentage: Number.isFinite(Number(value.riderPayoutPercentage)) ? Number(value.riderPayoutPercentage) : undefined,
    baseChargePaise: Number.isFinite(Number(value.baseChargePaise)) ? Number(value.baseChargePaise) : undefined,
    perKmChargePaise: Number.isFinite(Number(value.perKmChargePaise)) ? Number(value.perKmChargePaise) : undefined,
    minDeliveryChargePaise: Number.isFinite(Number(value.minDeliveryChargePaise)) ? Number(value.minDeliveryChargePaise) : undefined,
    activeCity: typeof value.activeCity === "string" ? value.activeCity : null,
    activeCities,
    activeDistrictCount: Number.isFinite(Number(value.activeDistrictCount)) ? Number(value.activeDistrictCount) : activeCities.length,
    supportedVehicles,
    isDeliveryServiceEnabled: typeof value.isDeliveryServiceEnabled === "boolean" ? value.isDeliveryServiceEnabled : undefined,
    hero: {
      badge: typeof hero.badge === "string" ? hero.badge : undefined,
      line1: typeof hero.line1 === "string" ? hero.line1 : undefined,
      line2: typeof hero.line2 === "string" ? hero.line2 : undefined,
      description: typeof hero.description === "string" ? hero.description : undefined,
    },
    cards: Object.fromEntries(Object.entries(cards).map(([key, card]) => [key, {
      show: typeof card.show === "boolean" ? card.show : undefined,
      value: typeof card.value === "string" ? card.value : undefined,
      label: typeof card.label === "string" ? card.label : undefined,
      desc: typeof card.desc === "string" ? card.desc : undefined,
    }])),
  };
}

export function DeliverySettingsProvider({ children }: React.PropsWithChildren) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [districts, setDistricts] = useState<OperationalDistrict[] | null>(null);
  const [districtsError, setDistrictsError] = useState("");
  const [userLocation, setUserLocation] = useState<MobileResolvedLocation | null>(null);
  const [catalogue, setCatalogue] = useState<LocationCatalogue | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await apiClient.get("/api/delivery/settings/public");
      if (!data?.settings) throw new Error("The delivery settings response did not include settings.");
      setSettings(normalizePublicSettings(data.settings));
    } catch (error) {
      console.error("Could not sync delivery settings from the admin-managed API.", error);
    }

    try {
      const { data } = await apiClient.get("/api/delivery/districts");
      if (!Array.isArray(data?.districts)) throw new Error("The active districts response is invalid.");
      const activeDistricts = data.districts.filter(
        (district: unknown): district is OperationalDistrict =>
          isRecord(district) &&
          typeof district.id === "string" &&
          typeof district.name === "string" &&
          typeof district.state === "string",
      );
      setDistricts(activeDistricts);
      setDistrictsError("");
    } catch (error) {
      console.error("Could not sync admin-enabled delivery districts.", error);
      setDistrictsError(getErrorMessage(error, "Could not load active delivery districts."));
    }

    try {
      const { data } = await apiClient.get("/api/delivery/locations/catalogue");
      if (data?.catalogue) {
        setCatalogue(data.catalogue);
      }
    } catch (error) {
      console.warn("Could not sync delivery location catalogue.", error);
    }
  }, []);

  const detectLocation = useCallback(async () => {
    try {
      setIsDetectingLocation(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setIsDetectingLocation(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const { data } = await apiClient.get(`/api/delivery/serviceability/resolve-gps?lat=${lat}&lng=${lng}`);
      if (data) {
        const resolved: MobileResolvedLocation = {
          state: data.resolvedLocation?.state,
          district: data.resolvedLocation?.district,
          districtId: data.resolvedLocation?.districtId,
          town: data.resolvedLocation?.town,
          townId: data.resolvedLocation?.townId,
          serviceArea: data.resolvedLocation?.serviceArea,
          serviceAreaId: data.resolvedLocation?.serviceAreaId,
          postalCode: data.resolvedLocation?.postalCode,
          formattedAddress: data.resolvedLocation?.formattedAddress,
          latitude: lat,
          longitude: lng,
          isEligible: data.isDeliveryEligible,
          status: data.status,
          message: data.message,
          comingSoonMessage: data.comingSoonMessage,
        };
        setUserLocation(resolved);
        await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(resolved));
      }
    } catch (cause) {
      console.warn("Mobile location detection error", cause);
    } finally {
      setIsDetectingLocation(false);
    }
  }, []);

  const selectLocation = useCallback(async (loc: MobileResolvedLocation) => {
    setUserLocation(loc);
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
  }, []);

  const submitLocationRequest = useCallback(async (payload: {
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    district?: string;
    area?: string;
    pincode?: string;
    notes?: string;
  }) => {
    await apiClient.post("/api/delivery/location-request", payload);
  }, []);

  useEffect(() => {
    void refresh();

    // Restore saved location or auto-detect
    AsyncStorage.getItem(LOCATION_KEY).then((saved) => {
      if (saved) {
        try {
          setUserLocation(JSON.parse(saved));
          return;
        } catch (e) {}
      }
      void detectLocation();
    });

    const timer = setInterval(() => void refresh(), 65000);
    const onAppStateChange = (state: AppStateStatus) => {
      if (state === "active") void refresh();
    };
    const subscription = AppState.addEventListener("change", onAppStateChange);
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [refresh, detectLocation]);

  const value = useMemo(
    () => ({
      settings,
      districts,
      districtsError,
      userLocation,
      catalogue,
      isDetectingLocation,
      detectLocation,
      selectLocation,
      submitLocationRequest,
      refresh,
    }),
    [
      settings,
      districts,
      districtsError,
      userLocation,
      catalogue,
      isDetectingLocation,
      detectLocation,
      selectLocation,
      submitLocationRequest,
      refresh,
    ]
  );

  return <DeliverySettingsContext.Provider value={value}>{children}</DeliverySettingsContext.Provider>;
}

export function useDeliverySettings(): DeliverySettingsContextValue {
  const value = useContext(DeliverySettingsContext);
  if (!value) throw new Error("useDeliverySettings must be used within DeliverySettingsProvider.");
  return value;
}
