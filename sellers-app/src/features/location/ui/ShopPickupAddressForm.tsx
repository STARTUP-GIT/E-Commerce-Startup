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
  ArrowLeft,
  Check,
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
  locationSource: 'GPS_DETECTED' | 'GPS_APPROXIMATE' | 'ADDRESS_SEARCHED' | 'MAP_PIN_SELECTED' | 'MANUALLY_ENTERED';
  accuracyMeters: number | null;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  directionsForRider?: string;
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

  // Flow Step: 'MAP_SELECT' (Step 1: Zomato/Zepto Map & Pin) vs 'ADDRESS_CONFIRM' (Step 2: Structured Address Confirmation)
  // If the shop already has existing saved coordinates and address, default to confirmation view with "Change on Map" option
  const hasExistingAddress = Boolean(
    initialAddress?.latitude &&
    initialAddress?.longitude &&
    (initialAddress?.doorNo || initialAddress?.street)
  );

  const [currentStep, setCurrentStep] = useState<'MAP_SELECT' | 'ADDRESS_CONFIRM'>(
    hasExistingAddress ? 'ADDRESS_CONFIRM' : 'MAP_SELECT'
  );

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

  // Location coordinates and metadata
  const [latitude, setLatitude] = useState<number | null>(
    initialAddress?.latitude !== undefined && initialAddress?.latitude !== null ? Number(initialAddress.latitude) : null
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialAddress?.longitude !== undefined && initialAddress?.longitude !== null ? Number(initialAddress.longitude) : null
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

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const reverseGeocodeDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadedRef = useRef(false);
  const activeGeocodeReqId = useRef(0);

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

  // Derive compiled formatted addresses
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

  // Emit change to parent
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
      // Discard stale response if newer pin movement was triggered
      if (reqId !== activeGeocodeReqId.current) return;

      const loc = data?.resolvedLocation;
      if (loc) {
        // Crucial: preserve manual doorNo and buildingName if geocoder didn't return them
        setDoorNo((prev) => loc.doorNo || prev);
        setBuildingName((prev) => loc.buildingName || prev);

        // ONLY set street if an actual route/street exists - NEVER fallback to locality or area!
        if (loc.street) setStreet(loc.street);

        if (loc.cross) setCross(loc.cross);
        if (loc.area) setArea(loc.area);
        else if (loc.serviceArea) setArea(loc.serviceArea);

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

  // 1. "Use Current Location" (High-accuracy GPS)
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast('Geolocation is not supported by your browser. Please search or enter address manually.', 'error');
      return;
    }

    setIsLocating(true);
    setGpsWarning(null);

    const reqId = ++activeGeocodeReqId.current;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy || 0);

        setLatitude(lat);
        setLongitude(lng);
        setAccuracyMeters(accuracy);

        if (accuracy > 30) {
          setLocationSource('GPS_APPROXIMATE');
          setGpsWarning(
            `GPS fix is approximate (±${accuracy}m). Satellites have placed your pin within ${accuracy} metres. Please drag the pin directly over your shop entrance.`
          );
        } else {
          setLocationSource('GPS_DETECTED');
          setGpsWarning(null);
        }

        reverseGeocode(lat, lng, reqId);
        showToast(
          accuracy > 30
            ? `Approximate GPS fix (±${accuracy}m). Please adjust pin to entrance.`
            : 'High-accuracy GPS position captured.',
          accuracy > 30 ? 'info' : 'success'
        );
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Failed to retrieve GPS location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or search your address.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal is currently unavailable on this device. Please search your address.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please retry or search your address.';
        }
        showToast(msg, 'error');
      },
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

  // When user selects a suggestion: never auto-select first; user explicitly clicks
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

      reverseGeocode(lat, lng, reqId);
      showToast('Address selected. Review and adjust pin if needed.', 'success');
    }
  };

  // 3. Pin Drag & Map Click Repositioning
  const handleMapPinSelected = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocationSource('MAP_PIN_SELECTED');
    setAccuracyMeters(null);
    setGpsWarning(null);

    const reqId = ++activeGeocodeReqId.current;

    // Debounce reverse geocode after pin movement stops (400ms)
    if (reverseGeocodeDebounceRef.current) clearTimeout(reverseGeocodeDebounceRef.current);
    reverseGeocodeDebounceRef.current = setTimeout(() => {
      reverseGeocode(lat, lng, reqId);
    }, 400);
  };

  // 4. Confirm Location Button (Transitions to Step 2)
  const handleConfirmLocation = () => {
    if (!latitude || !longitude) {
      showToast('Please select a location on the map or use GPS first.', 'info');
      return;
    }
    setCurrentStep('ADDRESS_CONFIRM');
    showToast('Location pin confirmed! Please complete your shop address details.', 'success');
  };

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          STEP 1: ZOMATO / ZEPTO / RAPIDO LOCATION PICKER SCREEN
          ───────────────────────────────────────────────────────────── */}
      {currentStep === 'MAP_SELECT' && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/90 shadow-2xl overflow-hidden p-4 sm:p-5 space-y-4">
          {/* Top Bar: Search + Use Current Location */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white tracking-wide">Select Shop Location</h3>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-white/60 hover:text-white hover:bg-white/5 gap-1.5 h-8 text-xs cursor-pointer"
                onClick={() => {
                  setLocationSource('MANUALLY_ENTERED');
                  setCurrentStep('ADDRESS_CONFIRM');
                  showToast('Manual entry mode active. You can fill or edit every field.', 'info');
                }}
              >
                <Edit3 className="h-3.5 w-3.5 text-amber-400" />
                <span>Enter Manually</span>
              </Button>
            </div>

            {/* Places Autocomplete Search Bar */}
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-white/40 pointer-events-none" />
                <Input
                  placeholder="Search for area, street name, or building..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-9 h-10 text-xs sm:text-sm bg-zinc-900/90 border-white/15 focus:border-emerald-500/50"
                  disabled={disabled}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setShowSearchResults(false);
                    }}
                    className="absolute right-3 top-3 text-white/40 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {showSearchResults && (
                <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-white/15 bg-zinc-900/98 shadow-2xl backdrop-blur-xl overflow-hidden max-h-60 overflow-y-auto">
                  {isSearching ? (
                    <div className="p-3.5 text-center text-xs text-white/50 flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                      <span>Searching Google Places...</span>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3.5 text-center text-xs text-white/40">No matching places found. Try another search.</div>
                  ) : (
                    searchResults.map((res, i) => (
                      <button
                        key={res.placeId || i}
                        type="button"
                        onClick={() => handleSelectSearchResult(res)}
                        className="w-full text-left p-3 text-xs text-white/90 hover:bg-white/10 hover:text-white border-b border-white/5 last:border-0 flex items-start gap-3 transition-colors cursor-pointer"
                      >
                        <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-white">{res.mainText}</p>
                          <p className="text-[11px] text-white/50 line-clamp-1 mt-0.5">{res.secondaryText || res.formattedAddress}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Quick Action: Use Current Location Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full h-9 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-2 text-xs font-semibold cursor-pointer shadow-sm"
                onClick={handleUseCurrentLocation}
                disabled={isLocating || disabled}
              >
                {isLocating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Detecting GPS Location...</span>
                  </>
                ) : (
                  <>
                    <Crosshair className="h-4 w-4 text-emerald-400" />
                    <span>Use Current Location</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* GPS Accuracy Warning Banner */}
          {gpsWarning && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-100">GPS Accuracy Warning</p>
                <p className="text-amber-200/80 leading-relaxed text-[11px]">{gpsWarning}</p>
              </div>
            </div>
          )}

          {/* Interactive Map with Draggable Pin */}
          <ShopInteractiveMap
            latitude={latitude}
            longitude={longitude}
            onLocationSelect={handleMapPinSelected}
            accuracyMeters={accuracyMeters}
            locationSource={locationSource}
            disabled={disabled}
            onUseCurrentLocation={handleUseCurrentLocation}
            isLocating={isLocating}
          />

          {/* Bottom Card: Detected Location & Confirm Button */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/90 p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-white uppercase tracking-wider">
                    {area || street || city || 'Selected Spot'}
                  </p>
                  {locationSource === 'GPS_DETECTED' && (
                    <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
                      GPS Fix (±{accuracyMeters || 10}m)
                    </Badge>
                  )}
                  {locationSource === 'GPS_APPROXIMATE' && (
                    <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/40 bg-amber-500/10">
                      Approx GPS (±{accuracyMeters || 95}m)
                    </Badge>
                  )}
                  {locationSource === 'MAP_PIN_SELECTED' && (
                    <Badge variant="outline" className="text-[10px] text-blue-300 border-blue-500/40 bg-blue-500/10">
                      Pin Positioned
                    </Badge>
                  )}
                  {locationSource === 'ADDRESS_SEARCHED' && (
                    <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-500/40 bg-purple-500/10">
                      Places Search
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-white/60 line-clamp-1">
                  {[street, area, city, selectedState].filter(Boolean).join(', ') || 'Drag the pin to place your shop entrance'}
                </p>
                {latitude && longitude && (
                  <p className="text-[10px] text-white/40 font-mono">
                    Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            {/* Confirm Location Primary Button */}
            <Button
              type="button"
              className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs sm:text-sm gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
              onClick={handleConfirmLocation}
              disabled={disabled || !latitude || !longitude}
            >
              <span>Confirm this Location &amp; Enter Address</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          STEP 2: SEPARATE STRUCTURED ADDRESS CONFIRMATION SCREEN
          ───────────────────────────────────────────────────────────── */}
      {currentStep === 'ADDRESS_CONFIRM' && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/90 shadow-2xl p-4 sm:p-6 space-y-5 animate-fade-in">
          {/* Confirmed Pin Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Confirmed Storefront Pin</h3>
                  <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/40 bg-emerald-500/10">
                    {locationSource === 'MAP_PIN_SELECTED' ? 'Entrance Pin Set' : locationSource === 'GPS_DETECTED' ? 'GPS Confirmed' : 'Location Set'}
                  </Badge>
                </div>
                {latitude && longitude ? (
                  <p className="text-[11px] text-white/50 font-mono">
                    GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)} {accuracyMeters ? `(±${accuracyMeters}m)` : ''}
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-300">Manual address entry (no map pin selected)</p>
                )}
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 px-3 border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white text-xs gap-1.5 cursor-pointer"
              onClick={() => setCurrentStep('MAP_SELECT')}
              disabled={disabled}
            >
              <ArrowLeft className="h-3.5 w-3.5 text-blue-400" />
              <span>Change Pin on Map</span>
            </Button>
          </div>

          {/* Missing Door Number Alert */}
          {!doorNo.trim() && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-amber-100">Shop / Door / House Number Required</p>
                <p className="text-amber-200/80 leading-relaxed text-[11px]">
                  GPS and reverse-geocoding have identified your street and locality, but satellites cannot detect your internal shop or door number. Please enter your Shop / Door / Floor number below so delivery riders can reach your exact counter.
                </p>
              </div>
            </div>
          )}

          {/* Required Fields Group */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider">
              Required Address Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  placeholder="e.g. Phoenix Commercial Hub"
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="h-9 text-xs"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-white/80">
                  Street / Road Name <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. 5th Main Road, Double Road"
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
                  placeholder="e.g. Near 2nd Cross Junction"
                  value={cross}
                  onChange={(e) => setCross(e.target.value)}
                  className="h-9 text-xs"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-white/80">
                  Area / Locality <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. Saraswathipuram / Indiranagar"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="h-9 text-xs"
                  disabled={disabled}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-white/80">
                  Landmark (Optional)
                </label>
                <Input
                  placeholder="e.g. Opposite Post Office / Near HDFC Bank"
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
                {isLoadingDistricts ? (
                  <div className="h-9 rounded-xl bg-white/5 animate-pulse" />
                ) : districts && districts.length > 0 ? (
                  <select
                    value={selectedDistrict}
                    onChange={(e) => onDistrictChange(e.target.value)}
                    disabled={disabled}
                    className="flex h-9 w-full rounded-xl px-2.5 py-1.5 text-xs outline-none bg-zinc-900 border border-white/10 text-white focus:border-emerald-500/50"
                  >
                    <option value="" className="bg-zinc-950 text-white/50">Select District</option>
                    {districts.map((d) => (
                      <option key={d.name} value={d.name} className="bg-zinc-950 text-white">
                        {d.name} {!d.isEnabled ? '(Coming Soon)' : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder="e.g. Mysuru District"
                    value={selectedDistrict}
                    onChange={(e) => onDistrictChange(e.target.value)}
                    className="h-9 text-xs"
                    disabled={disabled}
                    required
                  />
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-white/80">
                  State <span className="text-rose-400">*</span>
                </label>
                {isLoadingConfig ? (
                  <div className="h-9 rounded-xl bg-white/5 animate-pulse" />
                ) : (
                  <select
                    value={selectedState}
                    onChange={(e) => onStateChange(e.target.value)}
                    disabled={disabled}
                    className="flex h-9 w-full rounded-xl px-2.5 py-1.5 text-xs outline-none bg-zinc-900 border border-white/10 text-white focus:border-emerald-500/50"
                  >
                    <option value="" className="bg-zinc-950 text-white/50">Select State</option>
                    {allStates.map((st) => (
                      <option key={st.name} value={st.name} className="bg-zinc-950 text-white">
                        {st.name} {!st.isEnabled ? '(Coming Soon)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-white/80">
                  PIN Code (6 Digits) <span className="text-rose-400">*</span>
                </label>
                <Input
                  placeholder="e.g. 570001"
                  value={postalCode}
                  onChange={(e) => handlePostalChange(e.target.value)}
                  maxLength={6}
                  className="h-9 text-xs"
                  disabled={disabled}
                  required
                />
                {pinCodeError && <p className="text-[10px] text-rose-400 mt-0.5">{pinCodeError}</p>}
              </div>
            </div>

            {/* Additional Directions for the Rider */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-white/80">
                Additional Directions for Delivery Rider (Optional)
              </label>
              <textarea
                placeholder="e.g. Entrance on side lane, 1st floor above medical store, ring doorbell #4"
                rows={2}
                value={directionsForRider}
                onChange={(e) => setDirectionsForRider(e.target.value)}
                className="flex w-full rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none resize-none bg-zinc-900/90 border border-white/10 focus:border-emerald-500/50"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Formatted Address Preview Card */}
          <div className="rounded-xl border border-white/10 bg-zinc-900/60 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                Rider Dispatch Address Preview
              </h5>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-sans whitespace-pre-line">
              {[
                [doorNo, buildingName].filter(Boolean).join(', '),
                [street, cross].filter(Boolean).join(', '),
                [area, landmark].filter(Boolean).join(', '),
                [city, selectedDistrict].filter(Boolean).join(', '),
                [selectedState, postalCode].filter(Boolean).join(' - '),
                country || 'India',
              ]
                .filter((part) => part.trim().length > 0)
                .join('\n')}
            </p>
            {directionsForRider && (
              <p className="text-[11px] text-emerald-300/80 italic mt-1">
                Directions: {directionsForRider}
              </p>
            )}
            {latitude && longitude && (
              <p className="text-[10px] text-white/40 font-mono mt-1 pt-1 border-t border-white/5">
                Exact Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
