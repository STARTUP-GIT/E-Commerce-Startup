'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Crosshair,
  Search,
  Map,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Building2,
  Home,
  Compass,
  Info,
  RotateCcw,
  Navigation,
  X,
  ExternalLink,
  ArrowRight,
  Check,
  Sparkles,
} from 'lucide-react';
import { ShopInteractiveMap } from './ShopInteractiveMap';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { useUIStore } from '@/lib/store/uiStore';

export interface StructuredShopAddress {
  doorNo: string;
  buildingName: string;
  street: string;
  cross: string;
  area: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  deviceLatitude?: number | null;
  deviceLongitude?: number | null;
  locationSource: 'GPS_DETECTED' | 'GPS_APPROXIMATE' | 'ADDRESS_SEARCHED' | 'MAP_PIN_SELECTED' | 'MANUALLY_ENTERED';
  accuracyMeters: number | null;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  directionsForRider?: string;
  confirmedAt?: string;
}

interface ShopPickupAddressFormProps {
  initialAddress?: Partial<StructuredShopAddress>;
  onAddressChange: (addr: StructuredShopAddress) => void;
  allStates: Array<{ name: string; isEnabled: boolean }>;
  districts: Array<{ name: string; isEnabled: boolean }>;
  selectedState: string;
  onStateChange: (state: string) => void;
  selectedDistrict: string;
  onDistrictChange: (district: string) => void;
  districtRequired?: boolean;
  isLoadingConfig?: boolean;
  isLoadingDistricts?: boolean;
  disabled?: boolean;
}

export function ShopPickupAddressForm({
  initialAddress,
  onAddressChange,
  allStates,
  districts,
  selectedState,
  onStateChange,
  selectedDistrict,
  onDistrictChange,
  districtRequired = true,
  isLoadingConfig = false,
  isLoadingDistricts = false,
  disabled = false,
}: ShopPickupAddressFormProps) {
  const showToast = useUIStore((s) => s.showToast);

  // Address field states
  const [doorNo, setDoorNo] = useState(initialAddress?.doorNo || '');
  const [buildingName, setBuildingName] = useState(initialAddress?.buildingName || '');
  const [street, setStreet] = useState(initialAddress?.street || '');
  const [cross, setCross] = useState(initialAddress?.cross || '');
  const [area, setArea] = useState(initialAddress?.area || '');
  const [landmark, setLandmark] = useState(initialAddress?.landmark || '');
  const [city, setCity] = useState(initialAddress?.city || '');
  const [postalCode, setPostalCode] = useState(initialAddress?.postalCode || '');
  const [country, setCountry] = useState(initialAddress?.country || 'India');
  const [directionsForRider, setDirectionsForRider] = useState(initialAddress?.directionsForRider || '');

  // Confirmed Entrance Pin coordinates
  const [latitude, setLatitude] = useState<number | null>(
    initialAddress?.latitude !== undefined && initialAddress?.latitude !== null ? Number(initialAddress.latitude) : null
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialAddress?.longitude !== undefined && initialAddress?.longitude !== null ? Number(initialAddress.longitude) : null
  );

  // Separate Device GPS coordinates
  const [deviceCoords, setDeviceCoords] = useState<{ latitude: number; longitude: number } | null>(
    initialAddress?.deviceLatitude && initialAddress?.deviceLongitude
      ? { latitude: Number(initialAddress.deviceLatitude), longitude: Number(initialAddress.deviceLongitude) }
      : null
  );

  const [locationSource, setLocationSource] = useState<
    'GPS_DETECTED' | 'GPS_APPROXIMATE' | 'ADDRESS_SEARCHED' | 'MAP_PIN_SELECTED' | 'MANUALLY_ENTERED'
  >(initialAddress?.locationSource || 'MANUALLY_ENTERED');

  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(
    initialAddress?.accuracyMeters !== undefined ? initialAddress.accuracyMeters : null
  );

  // UI interaction states
  const [isLocating, setIsLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [gpsWarning, setGpsWarning] = useState<string | null>(null);
  const [pinCodeError, setPinCodeError] = useState<string | null>(null);
  const [candidateAreas, setCandidateAreas] = useState<string[]>([]);
  const [isConfirmed, setIsConfirmed] = useState(Boolean(initialAddress?.latitude && initialAddress?.longitude));

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadedRef = useRef(false);
  const activeGeocodeReqId = useRef(0);
  const watchIdRef = useRef<number | null>(null);
  const watchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (watchTimeoutRef.current) {
        clearTimeout(watchTimeoutRef.current);
      }
    };
  }, []);

  // Sync initial address if updated from parent (only once on load to avoid overwriting user edits)
  useEffect(() => {
    if (!initialLoadedRef.current && initialAddress) {
      initialLoadedRef.current = true;
      if (initialAddress.doorNo !== undefined) setDoorNo(initialAddress.doorNo || '');
      if (initialAddress.buildingName !== undefined) setBuildingName(initialAddress.buildingName || '');
      if (initialAddress.street !== undefined) setStreet(initialAddress.street || '');
      if (initialAddress.cross !== undefined) setCross(initialAddress.cross || '');
      if (initialAddress.area !== undefined) setArea(initialAddress.area || '');
      if (initialAddress.landmark !== undefined) setLandmark(initialAddress.landmark || '');
      if (initialAddress.city !== undefined) setCity(initialAddress.city || '');
      if (initialAddress.postalCode !== undefined) setPostalCode(initialAddress.postalCode || '');
      if (initialAddress.latitude !== undefined && initialAddress.latitude !== null) {
        setLatitude(Number(initialAddress.latitude));
      }
      if (initialAddress.longitude !== undefined && initialAddress.longitude !== null) {
        setLongitude(Number(initialAddress.longitude));
      }
      if (initialAddress.locationSource) {
        setLocationSource(initialAddress.locationSource);
      }
      if (initialAddress.accuracyMeters !== undefined) {
        setAccuracyMeters(initialAddress.accuracyMeters);
      }
      if (initialAddress.directionsForRider) {
        setDirectionsForRider(initialAddress.directionsForRider);
      }
    }
  }, [initialAddress]);

  // Derive compiled formatted dispatch address
  const deriveLines = useCallback(() => {
    const line1Parts: string[] = [];
    if (doorNo.trim()) line1Parts.push(doorNo.trim());
    if (buildingName.trim() && !doorNo.trim().includes(buildingName.trim())) line1Parts.push(buildingName.trim());
    if (street.trim() && !line1Parts.includes(street.trim())) line1Parts.push(street.trim());
    const addressLine1 = line1Parts.length > 0 ? line1Parts.join(', ') : street.trim() || '';

    const line2Parts: string[] = [];
    if (cross.trim()) line2Parts.push(cross.trim());
    if (area.trim() && !addressLine1.includes(area.trim())) line2Parts.push(area.trim());
    if (landmark.trim() && !addressLine1.includes(landmark.trim())) line2Parts.push(`Near ${landmark.trim()}`);
    if (directionsForRider.trim()) line2Parts.push(`Note: ${directionsForRider.trim()}`);
    const addressLine2 = line2Parts.join(', ');

    const fullParts: string[] = [];
    if (addressLine1) fullParts.push(addressLine1);
    if (addressLine2) fullParts.push(addressLine2);
    if (city.trim()) fullParts.push(city.trim());
    if (selectedDistrict.trim() && selectedDistrict.trim().toLowerCase() !== city.trim().toLowerCase()) {
      fullParts.push(selectedDistrict.trim());
    }
    if (selectedState.trim() && postalCode.trim()) {
      fullParts.push(`${selectedState.trim()} - ${postalCode.trim()}`);
    } else if (selectedState.trim()) {
      fullParts.push(selectedState.trim());
    }
    fullParts.push(country.trim() || 'India');
    const formattedAddress = fullParts.join(', ');

    return { addressLine1, addressLine2, formattedAddress };
  }, [doorNo, buildingName, street, cross, area, landmark, directionsForRider, city, selectedDistrict, selectedState, postalCode, country]);

  // Emit changes to parent
  useEffect(() => {
    const { addressLine1, addressLine2, formattedAddress } = deriveLines();
    onAddressChange({
      doorNo,
      buildingName,
      street,
      cross,
      area,
      landmark,
      city: city || selectedDistrict,
      district: selectedDistrict || city,
      state: selectedState,
      postalCode,
      country,
      latitude,
      longitude,
      deviceLatitude: deviceCoords?.latitude,
      deviceLongitude: deviceCoords?.longitude,
      locationSource,
      accuracyMeters,
      formattedAddress,
      addressLine1,
      addressLine2,
      directionsForRider,
    });
  }, [
    doorNo,
    buildingName,
    street,
    cross,
    area,
    landmark,
    city,
    selectedDistrict,
    selectedState,
    postalCode,
    country,
    latitude,
    longitude,
    deviceCoords,
    locationSource,
    accuracyMeters,
    directionsForRider,
    deriveLines,
    onAddressChange,
  ]);

  // Validate 6-digit Indian PIN
  const handlePostalChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPostalCode(cleaned);
    if (cleaned.length > 0 && cleaned.length < 6) {
      setPinCodeError('Indian postal PIN code must be exactly 6 digits.');
    } else if (cleaned.length === 6 && cleaned.startsWith('0')) {
      setPinCodeError('Indian postal PIN codes cannot start with 0.');
    } else {
      setPinCodeError(null);
    }
  };

  // Reverse geocodes coordinates with race-condition protection
  const reverseGeocode = async (lat: number, lng: number, reqId: number) => {
    try {
      const res = await fetch('/api/locations/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, userRole: 'SELLER' }),
      });

      if (!res.ok) return;
      const data = await res.json();
      if (reqId !== activeGeocodeReqId.current) return;

      const loc = data?.resolvedLocation;
      if (loc) {
        // Preserve manual doorNo and buildingName if geocoder didn't return them
        setDoorNo((prev) => loc.doorNo || prev);
        setBuildingName((prev) => loc.buildingName || prev);

        // ONLY set street if an actual route exists - NEVER fallback to locality!
        if (loc.street) setStreet(loc.street);

        if (loc.cross) setCross(loc.cross);
        if (loc.area) setArea(loc.area);
        else if (loc.serviceArea) setArea(loc.serviceArea);

        if (loc.candidateAreas && Array.isArray(loc.candidateAreas) && loc.candidateAreas.length > 0) {
          setCandidateAreas(loc.candidateAreas);
        }

        if (loc.landmark) setLandmark((prev) => prev || loc.landmark);
        if (loc.city) setCity(loc.city);
        if (loc.state) onStateChange(loc.state);
        if (loc.district || loc.city) onDistrictChange(loc.district || loc.city);
        if (loc.postalCode) setPostalCode(loc.postalCode);
      }
    } catch {
      // Keep selected coordinates on network failure
    }
  };

  // 1. "Use Current Location" (Progressive Fresh High-Accuracy GPS)
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast('Geolocation is not supported by your browser. Please search or enter address manually.', 'error');
      return;
    }

    setIsLocating(true);
    setGpsWarning(null);

    // Cancel any running watch
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (watchTimeoutRef.current) {
      clearTimeout(watchTimeoutRef.current);
    }

    let bestAcc = Infinity;

    const processPosition = (pos: GeolocationPosition) => {
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));
      const acc = Math.round(pos.coords.accuracy || 0);

      setDeviceCoords({ latitude: lat, longitude: lng });

      if (acc < bestAcc || !latitude) {
        bestAcc = acc;
        setLatitude(lat);
        setLongitude(lng);
        setAccuracyMeters(acc);

        // 4 Display Categories (0-5m High, 5-15m Good, 15-30m Approx, >30m Poor)
        if (acc <= 5) {
          setLocationSource('GPS_DETECTED');
          setGpsWarning(null);
        } else if (acc <= 15) {
          setLocationSource('GPS_DETECTED');
          setGpsWarning(null);
        } else if (acc <= 30) {
          setLocationSource('GPS_APPROXIMATE');
          setGpsWarning(`GPS fix is approximate (±${acc}m). Satellites have placed your pin within ${acc}m.`);
        } else {
          setLocationSource('GPS_APPROXIMATE');
          setGpsWarning(
            `GPS accuracy is poor (±${acc}m). Satellites placed your device within ${acc}m. Please drag the green entrance pin directly over your storefront.`
          );
        }

        const reqId = ++activeGeocodeReqId.current;
        reverseGeocode(lat, lng, reqId);
      }

      // If we achieved good accuracy (<= 15m), stop watching
      if (acc <= 15 && watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setIsLocating(false);
        if (watchTimeoutRef.current) clearTimeout(watchTimeoutRef.current);
        showToast(`High-accuracy GPS fix acquired (±${acc}m).`, 'success');
      }
    };

    const handleGpsError = (err: GeolocationPositionError) => {
      setIsLocating(false);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      let msg = 'Failed to retrieve GPS location.';
      if (err.code === err.PERMISSION_DENIED) {
        msg = 'Location permission was denied. Please allow location access or search your address.';
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        msg = 'GPS signal unavailable on this device. Please search your address.';
      } else if (err.code === err.TIMEOUT) {
        msg = 'Location request timed out. Please retry or search your address.';
      }
      showToast(msg, 'error');
    };

    // Fresh fix request with enableHighAccuracy: true, maximumAge: 0
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        processPosition(pos);
        // If initial fix was poor (> 30m), watch for tighter satellite fix for up to 12s
        if (pos.coords.accuracy > 30) {
          watchIdRef.current = navigator.geolocation.watchPosition(processPosition, () => {}, {
            enableHighAccuracy: true,
            maximumAge: 0,
          });

          watchTimeoutRef.current = setTimeout(() => {
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
            setIsLocating(false);
          }, 12000);
        } else {
          setIsLocating(false);
          showToast(`GPS position captured (±${Math.round(pos.coords.accuracy)}m).`, 'success');
        }
      },
      handleGpsError,
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // 2. Google Places Autocomplete & Search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (query.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      // 2A. Client-side Google Places Autocomplete if Maps script is loaded
      if (typeof window !== 'undefined' && window.google?.maps?.places?.AutocompleteService) {
        try {
          const service = new window.google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            {
              input: query,
              componentRestrictions: { country: 'in' },
            },
            (predictions: any[], status: string) => {
              if (status === 'OK' && Array.isArray(predictions) && predictions.length > 0) {
                const formatted = predictions.slice(0, 6).map((p) => ({
                  placeId: p.place_id,
                  formattedAddress: p.description,
                  mainText: p.structured_formatting?.main_text || '',
                  secondaryText: p.structured_formatting?.secondary_text || '',
                  isGooglePlace: true,
                }));
                setSearchResults(formatted);
                setShowSearchResults(true);
                setIsSearching(false);
                return;
              }
              fallbackBackendSearch(query);
            }
          );
          return;
        } catch {
          fallbackBackendSearch(query);
          return;
        }
      }

      fallbackBackendSearch(query);
    }, 350);
  };

  const fallbackBackendSearch = async (query: string) => {
    try {
      const cityHint = selectedDistrict || city;
      const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(cityHint)}`);
      if (res.ok) {
        const data = await res.json();
        const results = (data.results || []).map((r: any) => ({
          ...r,
          mainText: r.street || r.buildingName || r.area || r.city,
          secondaryText: [r.area, r.city, r.state, r.postalCode].filter(Boolean).join(', '),
        }));
        setSearchResults(results);
        setShowSearchResults(true);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // When user clicks a suggestion
  const handleSelectSearchResult = (result: any) => {
    setShowSearchResults(false);
    setSearchQuery(result.formattedAddress || result.mainText || '');

    const reqId = ++activeGeocodeReqId.current;

    // Google Places Details
    if (result.isGooglePlace && typeof window !== 'undefined' && window.google?.maps?.places?.PlacesService) {
      try {
        const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
        placesService.getDetails(
          {
            placeId: result.placeId,
            fields: ['geometry', 'address_components', 'formatted_address', 'name'],
          },
          (place: any, status: string) => {
            if (status === 'OK' && place?.geometry?.location) {
              const lat = Number(place.geometry.location.lat().toFixed(6));
              const lng = Number(place.geometry.location.lng().toFixed(6));

              setLatitude(lat);
              setLongitude(lng);
              setLocationSource('ADDRESS_SEARCHED');
              setAccuracyMeters(null);
              setGpsWarning(null);

              let route = '';
              let sublocality = '';
              let neighborhood = '';
              let locCity = '';
              let locDistrict = '';
              let locState = '';
              let locPostal = '';
              let premise = '';
              let subpremise = '';

              for (const comp of place.address_components || []) {
                const types = comp.types || [];
                if (types.includes('street_number')) subpremise = comp.long_name;
                else if (types.includes('premise')) premise = comp.long_name;
                else if (types.includes('route')) route = comp.long_name;
                else if (types.includes('sublocality_level_1') || types.includes('sublocality')) sublocality = comp.long_name;
                else if (types.includes('neighborhood') || types.includes('sublocality_level_2')) neighborhood = comp.long_name;
                else if (types.includes('locality')) locCity = comp.long_name;
                else if (types.includes('administrative_area_level_2')) locDistrict = comp.long_name;
                else if (types.includes('administrative_area_level_1')) locState = comp.long_name;
                else if (types.includes('postal_code')) locPostal = comp.long_name.replace(/\D/g, '');
              }

              if (subpremise) setDoorNo(subpremise);
              if (premise) setBuildingName(premise);
              if (route) setStreet(route);
              const derivedArea = sublocality || neighborhood;
              if (derivedArea) setArea(derivedArea);
              if (locCity) setCity(locCity);
              if (locDistrict) onDistrictChange(locDistrict);
              if (locState) onStateChange(locState);
              if (locPostal && locPostal.length === 6) setPostalCode(locPostal);

              showToast('Location selected from Google Places. Verify details.', 'success');
            } else {
              fallbackSelect(result, reqId);
            }
          }
        );
        return;
      } catch {
        fallbackSelect(result, reqId);
        return;
      }
    }

    fallbackSelect(result, reqId);
  };

  const fallbackSelect = (result: any, reqId: number) => {
    if (result.latitude && result.longitude) {
      const lat = Number(Number(result.latitude).toFixed(6));
      const lng = Number(Number(result.longitude).toFixed(6));
      setLatitude(lat);
      setLongitude(lng);
      setLocationSource('ADDRESS_SEARCHED');
      setAccuracyMeters(result.accuracyMeters || null);
      setGpsWarning(null);

      if (result.doorNo) setDoorNo(result.doorNo);
      if (result.buildingName) setBuildingName(result.buildingName);
      if (result.street) setStreet(result.street);
      if (result.cross) setCross(result.cross);
      if (result.area) setArea(result.area);
      if (result.city) setCity(result.city);
      if (result.district) onDistrictChange(result.district);
      if (result.state) onStateChange(result.state);
      if (result.postalCode) setPostalCode(result.postalCode);

      showToast('Address selected. Please fine-tune pin entrance if necessary.', 'info');
      reverseGeocode(lat, lng, reqId);
    }
  };

  // 3. User moved pin on map
  const handleMapPinSelected = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationSource('MAP_PIN_SELECTED');
    setAccuracyMeters(null);
    setGpsWarning(null);

    const reqId = ++activeGeocodeReqId.current;
    reverseGeocode(lat, lng, reqId);
  };

  // 4. Confirm Location Handler
  const handleConfirmLocation = () => {
    if (!latitude || !longitude) {
      showToast('Please set your shop entrance on the map or use GPS before confirming.', 'error');
      return;
    }
    if (!doorNo.trim()) {
      showToast('Please enter your Shop / Door / Building Number.', 'error');
      return;
    }
    if (!street.trim()) {
      showToast('Please enter your Street / Road Name.', 'error');
      return;
    }
    if (!area.trim()) {
      showToast('Please enter your Area / Locality.', 'error');
      return;
    }
    if (!postalCode.trim() || postalCode.trim().length !== 6) {
      showToast('Please enter a valid 6-digit Indian PIN code.', 'error');
      return;
    }

    setIsConfirmed(true);
    const { addressLine1, addressLine2, formattedAddress } = deriveLines();
    onAddressChange({
      doorNo,
      buildingName,
      street,
      cross,
      area,
      landmark,
      city: city || selectedDistrict,
      district: selectedDistrict || city,
      state: selectedState,
      postalCode,
      country,
      latitude,
      longitude,
      deviceLatitude: deviceCoords?.latitude,
      deviceLongitude: deviceCoords?.longitude,
      locationSource,
      accuracyMeters,
      formattedAddress,
      addressLine1,
      addressLine2,
      directionsForRider,
      confirmedAt: new Date().toISOString(),
    });
    showToast('Shop location & entrance confirmed successfully!', 'success');
  };

  const { addressLine1, addressLine2, formattedAddress } = deriveLines();

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          SECTION A: RAPIDO-STYLE SEARCH & GPS CONTROLS
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-400" />
              <span>Shop Pickup Location &amp; Entrance</span>
            </h4>
            <p className="text-[11px] text-white/50">
              Pinpoint your exact shop storefront entrance for delivery rider dispatch.
            </p>
          </div>

          {/* Use Current Location Action Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleUseCurrentLocation}
            disabled={disabled || isLocating}
            className="h-9 px-3.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold text-xs gap-2 shrink-0 cursor-pointer transition-all shadow-lg"
          >
            {isLocating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                <span>Acquiring GPS Fix...</span>
              </>
            ) : (
              <>
                <Crosshair className="h-4 w-4 text-emerald-400" />
                <span>Use Current Location</span>
              </>
            )}
          </Button>
        </div>

        {/* Live Search Bar with Autocomplete */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by main road, street, building, landmark, or neighbourhood (e.g. Vivekananda Nagar)..."
              className="pl-10 pr-9 h-10 text-xs bg-zinc-950/90 border-white/15 focus:border-emerald-500/60 rounded-xl"
              disabled={disabled}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-white/40" />
            )}
            {searchQuery && !isSearching && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white p-0.5 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-30 rounded-xl border border-white/15 bg-zinc-950 shadow-2xl overflow-hidden backdrop-blur-xl max-h-60 overflow-y-auto divide-y divide-white/5">
              {searchResults.map((item, idx) => (
                <button
                  key={item.placeId || idx}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-emerald-500/10 flex items-start gap-2.5 transition-colors cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{item.mainText || item.formattedAddress}</p>
                    {item.secondaryText && (
                      <p className="text-[11px] text-white/50 truncate mt-0.5">{item.secondaryText}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* GPS Accuracy Warning Banner */}
      {gpsWarning && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-100">GPS Accuracy Notice</p>
            <p className="text-amber-200/80 leading-relaxed text-[11px]">{gpsWarning}</p>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION B: INTERACTIVE MAP WITH ENTRANCE PIN & GPS DOT
          ───────────────────────────────────────────────────────────── */}
      <ShopInteractiveMap
        latitude={latitude}
        longitude={longitude}
        deviceLatitude={deviceCoords?.latitude ?? null}
        deviceLongitude={deviceCoords?.longitude ?? null}
        onLocationSelect={handleMapPinSelected}
        accuracyMeters={accuracyMeters}
        locationSource={locationSource}
        disabled={disabled}
        onUseCurrentLocation={handleUseCurrentLocation}
        isLocating={isLocating}
      />

      {/* Suggested Areas / Neighbourhoods Quick-Select Chips (Vivekananda Nagar Disambiguation) */}
      {candidateAreas.length > 0 && (
        <div className="p-3 rounded-xl bg-zinc-950/70 border border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-white/60 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span>Select exact neighbourhood:</span>
          </span>
          {candidateAreas.map((cand) => (
            <button
              key={cand}
              type="button"
              onClick={() => {
                setArea(cand);
                showToast(`Area updated to "${cand}".`, 'success');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                area.toLowerCase() === cand.toLowerCase()
                  ? 'bg-emerald-500 text-black border-emerald-400 font-bold'
                  : 'bg-white/5 hover:bg-white/10 border-white/15 text-white/90'
              }`}
            >
              {cand}
            </button>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SECTION C: MANDATORY ALWAYS-VISIBLE EDIT ADDRESS FORM
          ───────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/10 bg-zinc-950/90 shadow-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Edit3 className="h-4 w-4 text-emerald-400" />
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">
              Shop Address &amp; Dispatch Details
            </h5>
          </div>
          {latitude && longitude && (
            <div className="text-[10px] text-white/40 font-mono">
              Pin: {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          )}
        </div>

        {/* Required Address Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              Shop / Door / Building Number <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Shop #4, Ground Floor"
              value={doorNo}
              onChange={(e) => setDoorNo(e.target.value)}
              className="h-9 text-xs"
              disabled={disabled}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              Building / Complex Name (Optional)
            </label>
            <Input
              placeholder="e.g. Sri Krishna Commercial Hub"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              className="h-9 text-xs"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              Street / Road Name <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Vishwashanti Road / 3rd Main Road"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className="h-9 text-xs"
              disabled={disabled}
              required
            />
            <span className="text-[10px] text-white/40">Strictly road or street name. Never locality or area.</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              Cross Road (Optional)
            </label>
            <Input
              placeholder="e.g. 2nd Cross / Near Circle"
              value={cross}
              onChange={(e) => setCross(e.target.value)}
              className="h-9 text-xs"
              disabled={disabled}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              Area / Locality <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Vivekananda Nagar"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="h-9 text-xs"
              disabled={disabled}
              required
            />
            <span className="text-[10px] text-white/40">Fully editable. Correct any inaccurate neighbourhood here.</span>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              Landmark (Optional)
            </label>
            <Input
              placeholder="e.g. Near Vivekananda Circle / Opp Bank"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="h-9 text-xs"
              disabled={disabled}
            />
          </div>
        </div>

        {/* City / District / State / PIN Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              City / Town <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. Mysuru"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-9 text-xs"
              disabled={disabled}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              District <span className="text-rose-400">*</span>
            </label>
            {districts.length > 0 ? (
              <select
                value={selectedDistrict}
                onChange={(e) => onDistrictChange(e.target.value)}
                disabled={disabled || isLoadingDistricts}
                className="w-full h-9 rounded-xl px-2.5 text-xs bg-zinc-900 border border-white/10 text-white outline-none focus:border-emerald-500/60"
              >
                <option value="">Select District</option>
                {districts.map((d: any) => (
                  <option key={d.name} value={d.name}>
                    {d.name} {!d.isEnabled ? '(Coming Soon)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="District"
                value={selectedDistrict}
                onChange={(e) => onDistrictChange(e.target.value)}
                className="h-9 text-xs"
                disabled={disabled}
                required={districtRequired}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              State <span className="text-rose-400">*</span>
            </label>
            {allStates.length > 0 ? (
              <select
                value={selectedState}
                onChange={(e) => onStateChange(e.target.value)}
                disabled={disabled || isLoadingConfig}
                className="w-full h-9 rounded-xl px-2.5 text-xs bg-zinc-900 border border-white/10 text-white outline-none focus:border-emerald-500/60"
              >
                <option value="">Select State</option>
                {allStates.map((st: any) => (
                  <option key={st.name} value={st.name}>
                    {st.name} {!st.isEnabled ? '(Coming Soon)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                placeholder="State"
                value={selectedState}
                onChange={(e) => onStateChange(e.target.value)}
                className="h-9 text-xs"
                disabled={disabled}
                required
              />
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold text-white/80">
              Postal PIN Code <span className="text-rose-400">*</span>
            </label>
            <Input
              placeholder="e.g. 570023"
              value={postalCode}
              onChange={(e) => handlePostalChange(e.target.value)}
              maxLength={6}
              className={`h-9 text-xs ${pinCodeError ? 'border-rose-500' : ''}`}
              disabled={disabled}
              required
            />
          </div>
        </div>

        {pinCodeError && (
          <p className="text-[11px] text-rose-400 font-medium">{pinCodeError}</p>
        )}

        {/* Optional Delivery Rider Instructions */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-white/80">
            Instructions for Rider Pickup (Optional)
          </label>
          <Input
            placeholder="e.g. Ground floor glass shop, entrance next to ATM"
            value={directionsForRider}
            onChange={(e) => setDirectionsForRider(e.target.value)}
            className="h-9 text-xs"
            disabled={disabled}
          />
        </div>

        {/* Live Formatted Address Preview */}
        <div className="rounded-xl border border-white/10 bg-zinc-900/80 p-3 space-y-1">
          <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
            Live Dispatch Address Preview
          </span>
          <p className="text-xs text-emerald-300 font-medium leading-relaxed">
            {formattedAddress || 'Complete required address fields to view formatted preview'}
          </p>
        </div>

        {/* Confirmation Button */}
        <Button
          type="button"
          onClick={handleConfirmLocation}
          disabled={disabled || !latitude || !longitude || !doorNo || !street || !area || !postalCode}
          className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs sm:text-sm gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{isConfirmed ? 'Location & Address Confirmed' : 'Confirm Shop Location & Address'}</span>
        </Button>
      </div>
    </div>
  );
}
