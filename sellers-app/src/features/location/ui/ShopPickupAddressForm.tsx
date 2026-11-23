'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Badge } from '@/shared/components/Badge';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { Skeleton } from '@/shared/components/Skeleton';
import { useUIStore } from '@/lib/store/uiStore';
import { ShopInteractiveMap } from './ShopInteractiveMap';
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
} from 'lucide-react';

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
  locationSource: 'GPS_DETECTED' | 'GPS_APPROXIMATE' | 'ADDRESS_SEARCHED' | 'MAP_PIN_SELECTED' | 'STREET_VIEW_CONFIRMED' | 'MANUALLY_ENTERED';
  accuracyMeters: number | null;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
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

  // Location coordinates and metadata
  const [latitude, setLatitude] = useState<number | null>(
    initialAddress?.latitude !== undefined && initialAddress?.latitude !== null ? Number(initialAddress.latitude) : null
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialAddress?.longitude !== undefined && initialAddress?.longitude !== null ? Number(initialAddress.longitude) : null
  );
  const [locationSource, setLocationSource] = useState<
    'GPS_DETECTED' | 'GPS_APPROXIMATE' | 'ADDRESS_SEARCHED' | 'MAP_PIN_SELECTED' | 'STREET_VIEW_CONFIRMED' | 'MANUALLY_ENTERED'
  >(initialAddress?.locationSource || 'MANUALLY_ENTERED');
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(
    initialAddress?.accuracyMeters !== undefined ? initialAddress.accuracyMeters : null
  );

  // UI interaction states
  const [isLocating, setIsLocating] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);
  const [accuracyWarning, setAccuracyWarning] = useState<string | null>(null);
  const [coordsMismatchWarning, setCoordsMismatchWarning] = useState<string | null>(null);
  const [pinCodeError, setPinCodeError] = useState<string | null>(null);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadedRef = useRef(false);
  const activeGeocodeReqId = useRef(0);

  // Sync initial address if updated from parent (only once on initial load to avoid wiping user keystrokes)
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
      if (initialAddress.locationSource) setLocationSource(initialAddress.locationSource);
      if (initialAddress.accuracyMeters !== undefined) setAccuracyMeters(initialAddress.accuracyMeters);
    }
  }, [initialAddress]);

  // Derived formatted and fallback lines
  const deriveLines = () => {
    const line1Parts: string[] = [];
    if (doorNo.trim()) line1Parts.push(doorNo.trim());
    if (buildingName.trim() && !doorNo.trim().includes(buildingName.trim())) line1Parts.push(buildingName.trim());
    if (street.trim() && !line1Parts.includes(street.trim())) line1Parts.push(street.trim());
    const addressLine1 = line1Parts.length > 0 ? line1Parts.join(', ') : street.trim() || area.trim() || '';

    const line2Parts: string[] = [];
    if (cross.trim()) line2Parts.push(cross.trim());
    if (area.trim() && !addressLine1.includes(area.trim())) line2Parts.push(area.trim());
    if (landmark.trim() && !addressLine1.includes(landmark.trim())) line2Parts.push(`Near ${landmark.trim()}`);
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
  };

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
  ]);

  // Validate 6-digit Indian PIN
  const handlePostalChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPostalCode(cleaned);
    if (cleaned.length > 0 && cleaned.length < 6) {
      setPinCodeError('Indian postal code must be exactly 6 digits.');
    } else if (cleaned.length === 6 && cleaned.startsWith('0')) {
      setPinCodeError('Indian postal PIN codes cannot start with 0.');
    } else {
      setPinCodeError(null);
    }
  };

  // 1. "Use Current Location" (High-accuracy GPS)
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      showToast('Geolocation is not supported by your browser. Please enter your address manually.', 'error');
      return;
    }

    setIsLocating(true);
    setGpsNotice(null);
    setAccuracyWarning(null);
    setCoordsMismatchWarning(null);

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
          // Approximate GPS fix (e.g. ±95m) - must NOT be labeled as verified
          setLocationSource('GPS_APPROXIMATE');
          setAccuracyWarning(
            `GPS fix is approximate (±${accuracy}m). Satellites have placed your pin within ${accuracy} metres of your actual position. Because this is an e-commerce pickup location, please drag the green map pin directly to your storefront entrance.`
          );
        } else {
          setLocationSource('GPS_DETECTED');
          setAccuracyWarning(null);
        }

        try {
          const res = await fetch('/api/locations/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lng, userRole: 'SELLER' }),
          });

          if (res.ok) {
            const data = await res.json();
            // Discard stale response if newer location action was triggered
            if (reqId !== activeGeocodeReqId.current) return;

            const loc = data.resolvedLocation;
            if (loc) {
              // Crucial: preserve manual doorNo and buildingName if geocoder didn't return them
              setDoorNo((prev) => loc.doorNo || prev);
              setBuildingName((prev) => loc.buildingName || prev);

              // ONLY set street if an actual route/street exists - NEVER fallback to locality or area!
              if (loc.street) setStreet(loc.street);

              if (loc.cross) setCross(loc.cross);
              if (loc.area) setArea(loc.area);
              else if (loc.serviceArea) setArea(loc.serviceArea);

              if (loc.landmark) setLandmark(loc.landmark);
              if (loc.city) setCity(loc.city);
              if (loc.state) onStateChange(loc.state);
              if (loc.district || loc.city) onDistrictChange(loc.district || loc.city);
              if (loc.postalCode) setPostalCode(loc.postalCode);

              // Check region consistency
              if (selectedState && loc.state && selectedState.toLowerCase() !== loc.state.toLowerCase()) {
                setCoordsMismatchWarning(
                  `Detected location is in ${loc.state}, but your store is set to ${selectedState}. Please check your registered region.`
                );
              }

              if (loc.hasMissingDoorNo || (!loc.doorNo && !doorNo)) {
                setGpsNotice(
                  `GPS detected your street (${loc.street || 'nearby road'}) and locality, but satellites cannot detect your specific shop or door number. Please enter your House / Door / Shop Number below.`
                );
              } else {
                setGpsNotice(null);
              }

              showToast(
                accuracy > 30
                  ? `Approximate GPS fix (±${accuracy}m). Please adjust pin to entrance.`
                  : 'High-accuracy GPS location detected. Please review details.',
                'success'
              );
            }
          }
        } catch {
          if (reqId === activeGeocodeReqId.current) {
            showToast('GPS coordinates captured. Please complete your address fields manually.', 'info');
          }
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Failed to retrieve GPS location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or select "Enter Address Manually".';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal is currently unavailable on this device. Please enter your address manually.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please retry or enter your address manually.';
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

  // 2. Address Search & Google Places Autocomplete
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
      // 2A. Attempt Google Places Autocomplete directly in browser if Google Maps script is available
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
                  street: p.structured_formatting?.main_text || '',
                  area: p.structured_formatting?.secondary_text || '',
                  isGooglePlace: true,
                }));
                setSearchResults(formatted);
                setShowSearchResults(true);
                setIsSearching(false);
                return;
              }
              // Fallback to backend search if Google Places returns zero predictions
              fallbackBackendSearch(query);
            }
          );
          return;
        } catch {
          // If AutocompleteService throws, fallback to backend search
          fallbackBackendSearch(query);
          return;
        }
      }

      // 2B. Fallback to Backend Location Search API
      fallbackBackendSearch(query);
    }, 350);
  };

  const fallbackBackendSearch = async (query: string) => {
    try {
      const cityHint = selectedDistrict || city;
      const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}&city=${encodeURIComponent(cityHint)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.results || []);
        setShowSearchResults(true);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    setShowSearchResults(false);
    setSearchQuery(result.formattedAddress || '');

    const reqId = ++activeGeocodeReqId.current;

    // If result was from Google Places, retrieve full Place details with geometry & components
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
              setCoordsMismatchWarning(null);

              let streetNumber = '';
              let route = '';
              let premise = '';
              let subpremise = '';
              let sublocality1 = '';
              let sublocality2 = '';
              let locality = '';
              let districtName = '';
              let stateName = '';
              let postalCodeVal = '';
              let pointOfInterest = '';

              for (const comp of place.address_components || []) {
                const types = comp.types || [];
                if (types.includes('street_number')) streetNumber = comp.long_name;
                else if (types.includes('route')) route = comp.long_name;
                else if (types.includes('premise')) premise = comp.long_name;
                else if (types.includes('subpremise')) subpremise = comp.long_name;
                else if (types.includes('sublocality_level_1') || types.includes('sublocality')) sublocality1 = comp.long_name;
                else if (types.includes('sublocality_level_2') || types.includes('neighborhood')) sublocality2 = comp.long_name;
                else if (types.includes('locality')) locality = comp.long_name;
                else if (types.includes('administrative_area_level_2')) districtName = comp.long_name;
                else if (types.includes('administrative_area_level_1')) stateName = comp.long_name;
                else if (types.includes('postal_code')) postalCodeVal = comp.long_name;
                else if (types.includes('point_of_interest') || types.includes('landmark')) pointOfInterest = comp.long_name;
              }

              const dNo = subpremise || streetNumber;
              const bldg = premise || place.name;
              const cleanPostal = postalCodeVal.replace(/\D/g, '').slice(0, 6);

              setDoorNo((prev) => dNo || prev);
              setBuildingName((prev) => (bldg !== dNo ? bldg : prev));
              if (route) setStreet(route);
              if (sublocality2) setCross(sublocality2);
              if (sublocality1) setArea(sublocality1);
              if (pointOfInterest) setLandmark(pointOfInterest);
              if (locality) setCity(locality);
              if (stateName) onStateChange(stateName);
              if (districtName || locality) onDistrictChange(districtName || locality);
              if (cleanPostal.length === 6) setPostalCode(cleanPostal);

              if (!dNo && !doorNo) {
                setGpsNotice('Address selected from Google Places. Please ensure your House / Door / Shop number is entered.');
              } else {
                setGpsNotice(null);
              }
              showToast('Location selected from Google Places. Review before saving.', 'success');
              return;
            }
          }
        );
        return;
      } catch {
        // Fallback to standard result handling
      }
    }

    // Standard backend search result handling
    if (result.latitude && result.longitude) {
      setLatitude(Number(result.latitude));
      setLongitude(Number(result.longitude));
    }
    setLocationSource('ADDRESS_SEARCHED');
    setAccuracyMeters(null);
    setCoordsMismatchWarning(null);

    // Preserve existing manual doorNo / buildingName if search result has none
    setDoorNo((prev) => result.doorNo || prev);
    setBuildingName((prev) => result.buildingName || prev);

    if (result.street) setStreet(result.street);
    if (result.cross) setCross(result.cross);
    if (result.area) setArea(result.area);
    if (result.landmark) setLandmark(result.landmark);
    if (result.city) setCity(result.city);
    if (result.state) onStateChange(result.state);
    if (result.district || result.city) onDistrictChange(result.district || result.city);
    if (result.postalCode) setPostalCode(result.postalCode);

    if (result.hasMissingDoorNo || (!result.doorNo && !doorNo)) {
      setGpsNotice('Address selected. Please ensure your House / Door / Shop number and building name are filled in.');
    } else {
      setGpsNotice(null);
    }

    showToast('Address selected. Details populated.', 'success');
  };

  // 3. Interactive Map Pin & Entrance Fine-Tuning
  const handleCoordinatesSelected = async (newLat: number, newLng: number, source: 'MAP_PIN_SELECTED') => {
    setLatitude(newLat);
    setLongitude(newLng);
    setLocationSource(source);
    setAccuracyMeters(null);

    const reqId = ++activeGeocodeReqId.current;

    try {
      const res = await fetch('/api/locations/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: newLat, longitude: newLng, userRole: 'SELLER' }),
      });

      if (res.ok) {
        const data = await res.json();
        // Ignore response if user clicked or dragged again since this request started
        if (reqId !== activeGeocodeReqId.current) return;

        const loc = data.resolvedLocation;
        if (loc) {
          // IMPORTANT: Preserve existing manually entered door number and building name
          setDoorNo((prev) => loc.doorNo || prev);
          setBuildingName((prev) => loc.buildingName || prev);

          // ONLY set street if an actual route/street exists - NEVER fallback to locality or area!
          if (loc.street) setStreet(loc.street);

          if (loc.cross) setCross(loc.cross);
          if (loc.area) setArea(loc.area);
          else if (loc.serviceArea) setArea(loc.serviceArea);

          if (loc.landmark) setLandmark(loc.landmark);
          if (loc.city) setCity(loc.city);
          if (loc.state) onStateChange(loc.state);
          if (loc.district || loc.city) onDistrictChange(loc.district || loc.city);
          if (loc.postalCode) setPostalCode(loc.postalCode);

          if (selectedState && loc.state && selectedState.toLowerCase() !== loc.state.toLowerCase()) {
            setCoordsMismatchWarning(
              `Pin coordinates are in ${loc.state}, but your store is set to ${selectedState}. Please check your registered region.`
            );
          } else {
            setCoordsMismatchWarning(null);
          }

          if (loc.hasMissingDoorNo || (!loc.doorNo && !doorNo)) {
            setGpsNotice(
              `Entrance pin moved to (${newLat.toFixed(5)}, ${newLng.toFixed(5)}). Please verify your Door / Shop number.`
            );
          } else {
            setGpsNotice(null);
          }

          showToast('Shop entrance pin updated. Address synchronized with coordinates.', 'success');
        }
      }
    } catch {
      if (reqId === activeGeocodeReqId.current) {
        showToast('Coordinates updated from map.', 'info');
      }
    }
  };

  const { addressLine1, addressLine2, formattedAddress } = deriveLines();

  return (
    <div className="space-y-5 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 backdrop-blur-md">
      {/* Header & Mode Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <MapPin className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold tracking-wide uppercase text-white">
              Shop Pickup & Dispatch Location
            </h3>
          </div>
          <p className="text-xs text-white/50 mt-1">
            Authoritative physical address used for delivery dispatch and rider pickup navigation.
          </p>
        </div>

        {/* 4 Mode Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            size="sm"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5 h-8 text-xs cursor-pointer shadow-sm"
            onClick={handleUseCurrentLocation}
            disabled={disabled || isLocating}
          >
            {isLocating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
            <span>Use Current Location</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-white/15 bg-white/5 text-white/80 hover:bg-white/10 gap-1.5 h-8 text-xs cursor-pointer"
            onClick={() => setShowMap(!showMap)}
            disabled={disabled}
          >
            <Map className="h-3.5 w-3.5 text-blue-400" />
            <span>{showMap ? 'Hide Map' : 'Select on Map'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/5 gap-1.5 h-8 text-xs cursor-pointer"
            onClick={() => {
              setLocationSource('MANUALLY_ENTERED');
              showToast('Manual entry mode active. You can fill or edit every field.', 'info');
            }}
            disabled={disabled}
          >
            <Edit3 className="h-3.5 w-3.5 text-amber-400" />
            <span>Enter Manually</span>
          </Button>
        </div>
      </div>

      {/* Address Search Bar */}
      <div className="relative">
        <label className="block text-[11px] font-semibold text-white/70 mb-1.5">
          Search Address / Landmark / Building
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30 pointer-events-none" />
          <Input
            placeholder="Type building, street, or locality name to auto-fill..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs"
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
              className="absolute right-2.5 top-2.5 text-white/40 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/15 bg-zinc-900/95 shadow-2xl backdrop-blur-xl overflow-hidden max-h-56 overflow-y-auto">
            {isSearching ? (
              <div className="p-3 text-center text-xs text-white/40 flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-3 text-center text-xs text-white/40">No matching addresses found.</div>
            ) : (
              searchResults.map((res, i) => (
                <button
                  key={res.placeId || i}
                  type="button"
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left p-2.5 text-xs text-white/80 hover:bg-white/10 hover:text-white border-b border-white/5 last:border-0 flex items-start gap-2.5 transition-colors cursor-pointer"
                >
                  <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">{res.street || res.area || res.city}</p>
                    <p className="text-[11px] text-white/50 line-clamp-1">{res.formattedAddress}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Prominent Missing Door Number Alert */}
      {gpsNotice && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-300 text-xs flex items-start gap-2.5 animate-fade-in">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-200">Door / House Number Needed</p>
            <p className="text-amber-300/80 leading-relaxed">{gpsNotice}</p>
          </div>
        </div>
      )}

      {/* Accuracy Warning */}
      {accuracyWarning && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-300 text-xs flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-blue-400" />
          <p>{accuracyWarning}</p>
        </div>
      )}

      {/* Region / District Mismatch Warning */}
      {coordsMismatchWarning && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <p className="font-semibold text-rose-200">Region Mismatch Warning</p>
            <p className="text-rose-300/80 leading-relaxed mt-0.5">{coordsMismatchWarning}</p>
          </div>
        </div>
      )}

      {/* Interactive Map Preview Panel */}
      {showMap && (
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Shop Dispatch Pin &amp; Entrance Location
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {latitude !== null && longitude !== null && (
                <span className="text-[11px] font-mono text-white/60">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </span>
              )}
              {latitude !== null && longitude !== null && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] px-2 text-white/80 hover:text-white"
                  onClick={() => handleCoordinatesSelected(latitude, longitude, 'MAP_PIN_SELECTED')}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Re-sync from Pin
                </Button>
              )}
            </div>
          </div>

          {/* Draggable Interactive Leaflet Map Component */}
          <ShopInteractiveMap
            latitude={latitude}
            longitude={longitude}
            onLocationSelect={handleCoordinatesSelected}
            accuracyMeters={accuracyMeters}
            locationSource={locationSource}
            disabled={disabled}
          />
        </div>
      )}

      {/* Structured Address Form Fields */}
      <div className="space-y-4">
        {/* Row 1: Door/Flat No & Building Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>Door / Flat / Shop Number <span className="text-red-400">*</span></span>
              <span className="text-[10px] font-normal text-white/40">Required</span>
            </label>
            <Input
              placeholder="e.g. Shop #4, Ground Floor / Door #142/B"
              value={doorNo}
              onChange={(e) => setDoorNo(e.target.value)}
              disabled={disabled}
              className={!doorNo.trim() && gpsNotice ? 'border-amber-500/60 ring-1 ring-amber-500/20' : ''}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>Building / Apartment / Complex Name</span>
              <span className="text-[10px] font-normal text-white/40">Optional</span>
            </label>
            <Input
              placeholder="e.g. SLV Plaza / Shanthi Complex"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Row 2: Street / Road Name & Cross Street */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>Street / Road Name <span className="text-red-400">*</span></span>
              <span className="text-[10px] font-normal text-white/40">Required</span>
            </label>
            <Input
              placeholder="e.g. Vishwashanti Road / 8th Cross Road"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>Cross / Main Road</span>
              <span className="text-[10px] font-normal text-white/40">Optional</span>
            </label>
            <Input
              placeholder="e.g. 3rd Main / Ring Road Junction"
              value={cross}
              onChange={(e) => setCross(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Row 3: Area / Locality & Landmark */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>Area / Locality <span className="text-red-400">*</span></span>
              <span className="text-[10px] font-normal text-white/40">Required</span>
            </label>
            <Input
              placeholder="e.g. Sriramapura 2nd Stage / Kuvempunagar"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>Landmark</span>
              <span className="text-[10px] font-normal text-white/40">Optional</span>
            </label>
            <Input
              placeholder="e.g. Opposite State Bank of India / Near Water Tank"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Row 4: State & District Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            {isLoadingConfig ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (
              <SearchableDropdown
                options={allStates}
                value={selectedState}
                onChange={(val) => {
                  onStateChange(val);
                  onDistrictChange('');
                }}
                placeholder="Select State"
                label="State *"
              />
            )}
          </div>

          <div className="space-y-1">
            {isLoadingDistricts ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : !selectedState ? (
              <div className="space-y-1.5 relative w-full">
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  District {districtRequired ? '*' : '(Optional)'}
                </label>
                <button
                  type="button"
                  disabled
                  className="w-full h-10 flex items-center justify-between px-3 rounded-xl border border-white/10 bg-neutral-900/60 text-xs text-white/30 cursor-not-allowed text-left font-medium select-none"
                >
                  Select a State first
                </button>
              </div>
            ) : districts.length === 0 ? (
              <div className="space-y-1.5 relative w-full">
                <label className="block text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  District {districtRequired ? '*' : '(Optional)'}
                </label>
                <button
                  type="button"
                  disabled
                  className="w-full h-10 flex items-center justify-between px-3 rounded-xl border border-white/10 bg-neutral-900/60 text-xs text-white/30 cursor-not-allowed text-left font-medium select-none"
                >
                  No operational districts
                </button>
              </div>
            ) : (
              <SearchableDropdown
                options={districts}
                value={selectedDistrict}
                onChange={onDistrictChange}
                placeholder={districtRequired ? 'Select District *' : 'Select District'}
                label={`District ${districtRequired ? '*' : '(Optional)'}`}
                isLoading={isLoadingDistricts}
              />
            )}
          </div>
        </div>

        {/* Row 5: City / Town & PIN Code */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>City / Town <span className="text-red-400">*</span></span>
              <span className="text-[10px] font-normal text-white/40">Required</span>
            </label>
            <Input
              placeholder="e.g. Mysuru"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80 flex items-center justify-between">
              <span>Postal PIN Code <span className="text-red-400">*</span></span>
              <span className="text-[10px] font-mono text-white/40">6 digits</span>
            </label>
            <Input
              placeholder="e.g. 570023"
              value={postalCode}
              onChange={(e) => handlePostalChange(e.target.value)}
              maxLength={6}
              disabled={disabled}
              className={pinCodeError ? 'border-red-500/60' : ''}
            />
            {pinCodeError && <p className="text-[11px] text-red-400 mt-1">{pinCodeError}</p>}
          </div>
        </div>
      </div>

      {/* Confirmation & Formatted Pickup Address Preview Card */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>Formatted Address for Rider Pickup</span>
          </div>

          {/* Location Source Tag */}
          <div className="flex items-center gap-2">
            {locationSource === 'GPS_DETECTED' && (
              <Badge variant="success" className="text-[10px]">
                📍 High-Accuracy GPS {accuracyMeters ? `(±${accuracyMeters}m)` : ''}
              </Badge>
            )}
            {locationSource === 'GPS_APPROXIMATE' && (
              <Badge variant="outline" className="text-[10px] text-amber-300 border-amber-500/40 bg-amber-500/10">
                ⚠️ Approximate GPS {accuracyMeters ? `(±${accuracyMeters}m)` : ''} — Adjust to Entrance
              </Badge>
            )}
            {locationSource === 'ADDRESS_SEARCHED' && (
              <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                🔍 Searched Address
              </Badge>
            )}
            {locationSource === 'MAP_PIN_SELECTED' && (
              <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">
                📌 Entrance Pin Set
              </Badge>
            )}
            {locationSource === 'STREET_VIEW_CONFIRMED' && (
              <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-500/40 bg-emerald-500/10">
                📷 Street View Confirmed
              </Badge>
            )}
            {locationSource === 'MANUALLY_ENTERED' && (
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                ✍️ Manually Entered
              </Badge>
            )}
          </div>
        </div>

        <p className="text-xs text-white/85 font-medium leading-relaxed bg-black/30 p-2.5 rounded-lg border border-white/5">
          {formattedAddress || 'Complete the address fields above to generate the dispatch preview.'}
        </p>

        {latitude !== null && longitude !== null && (
          <div className="flex items-center gap-2 text-[11px] text-white/40">
            <span>Verified Coordinates:</span>
            <span className="font-mono text-white/70">
              {latitude.toFixed(6)}° N, {longitude.toFixed(6)}° E
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
