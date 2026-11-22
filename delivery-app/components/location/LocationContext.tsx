"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/apiClient";

export interface ResolvedLocation {
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

export interface LocationCatalogueDistrict {
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
  districts: LocationCatalogueDistrict[];
}

interface LocationContextType {
  userLocation: ResolvedLocation | null;
  catalogue: LocationCatalogue | null;
  loading: boolean;
  isDetecting: boolean;
  isSelectorOpen: boolean;
  isRequestModalOpen: boolean;
  detectGpsLocation: () => Promise<void>;
  selectLocation: (loc: ResolvedLocation) => void;
  openSelectorModal: () => void;
  closeSelectorModal: () => void;
  openRequestModal: () => void;
  closeRequestModal: () => void;
  refreshCatalogue: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const STORAGE_KEY = "atlasbasket_delivery_user_location";

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [userLocation, setUserLocation] = useState<ResolvedLocation | null>(null);
  const [catalogue, setCatalogue] = useState<LocationCatalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  // Fetch Authoritative Catalogue from backend
  const refreshCatalogue = useCallback(async () => {
    try {
      const res = await apiClient.get("/api/delivery/locations/catalogue");
      if (res.data?.catalogue) {
        setCatalogue(res.data.catalogue);
      }
    } catch (err) {
      console.error("[LocationProvider] Failed to fetch catalogue", err);
    }
  }, []);

  // Detect GPS Location
  const detectGpsLocation = useCallback(async () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setIsSelectorOpen(true);
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const res = await apiClient.get(
            `/api/delivery/serviceability/resolve-gps?lat=${lat}&lng=${lng}`
          );

          if (res.data) {
            const loc: ResolvedLocation = {
              state: res.data.resolvedLocation?.state,
              district: res.data.resolvedLocation?.district,
              districtId: res.data.resolvedLocation?.districtId,
              town: res.data.resolvedLocation?.town,
              townId: res.data.resolvedLocation?.townId,
              serviceArea: res.data.resolvedLocation?.serviceArea,
              serviceAreaId: res.data.resolvedLocation?.serviceAreaId,
              postalCode: res.data.resolvedLocation?.postalCode,
              formattedAddress: res.data.resolvedLocation?.formattedAddress,
              latitude: lat,
              longitude: lng,
              isEligible: res.data.isDeliveryEligible,
              status: res.data.status,
              message: res.data.message,
              comingSoonMessage: res.data.comingSoonMessage,
            };

            setUserLocation(loc);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
          }
        } catch (err: any) {
          console.warn("[LocationProvider] GPS resolve error", err?.message);
        } finally {
          setIsDetecting(false);
        }
      },
      (err) => {
        console.warn("[LocationProvider] Geolocation permission denied or failed", err.message);
        setIsDetecting(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, []);

  // Manual Selection
  const selectLocation = useCallback((loc: ResolvedLocation) => {
    setUserLocation(loc);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    }
    setIsSelectorOpen(false);
  }, []);

  // Initial Load
  useEffect(() => {
    refreshCatalogue();

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setUserLocation(parsed);
          setLoading(false);
          return;
        } catch (e) {}
      }
      setLoading(false);
      // Auto-detect if no saved location
      detectGpsLocation();
    }
  }, [refreshCatalogue, detectGpsLocation]);

  return (
    <LocationContext.Provider
      value={{
        userLocation,
        catalogue,
        loading,
        isDetecting,
        isSelectorOpen,
        isRequestModalOpen,
        detectGpsLocation,
        selectLocation,
        openSelectorModal: () => setIsSelectorOpen(true),
        closeSelectorModal: () => setIsSelectorOpen(false),
        openRequestModal: () => setIsRequestModalOpen(true),
        closeRequestModal: () => setIsRequestModalOpen(false),
        refreshCatalogue,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
