'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadGoogleMaps,
  parseGooglePlace,
  darkMapStyles,
} from '../services/googleMapsService';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import {
  MapPin,
  Search,
  Crosshair,
  Loader2,
  Check,
  AlertTriangle
} from 'lucide-react';

export interface LocationPickerValue {
  formattedAddress?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string;
}

export interface GoogleMapsLocationPickerProps {
  value?: LocationPickerValue;
  onChange: (value: LocationPickerValue) => void;
  availableStates?: Array<{ name: string }>;
  availableDistricts?: Array<{ name: string }>;
  title?: string;
  description?: string;
  disabled?: boolean;
}

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bengaluru default

export function GoogleMapsLocationPicker({
  value,
  onChange,
  availableStates = [],
  availableDistricts = [],
  title = 'Select Location on Map',
  description = 'Search an address, drop a marker, or use current location to auto-populate delivery fields.',
  disabled = false,
}: GoogleMapsLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(
    value?.latitude && value?.longitude
      ? { lat: Number(value.latitude), lng: Number(value.longitude) }
      : null
  );

  const searchTimeoutRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((googleMaps) => {
        if (!isMounted || !mapContainerRef.current) return;

        geocoderRef.current = new googleMaps.Geocoder();
        autocompleteServiceRef.current = new googleMaps.places.AutocompleteService();

        const initialLat = value?.latitude ? Number(value.latitude) : DEFAULT_CENTER.lat;
        const initialLng = value?.longitude ? Number(value.longitude) : DEFAULT_CENTER.lng;
        const initialCenter = { lat: initialLat, lng: initialLng };

        const map = new googleMaps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: value?.latitude && value?.longitude ? 16 : 12,
          styles: darkMapStyles,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        });

        mapInstanceRef.current = map;
        placesServiceRef.current = new googleMaps.places.PlacesService(map);

        const marker = new googleMaps.Marker({
          position: initialCenter,
          map,
          draggable: !disabled,
          animation: googleMaps.Animation.DROP,
          title: 'Drag or click to adjust location',
        });

        markerInstanceRef.current = marker;

        map.addListener('click', (event: any) => {
          if (disabled) return;
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();
          marker.setPosition({ lat, lng });
          handleCoordinatesUpdate(lat, lng);
        });

        marker.addListener('dragend', () => {
          if (disabled) return;
          const position = marker.getPosition();
          const lat = position.lat();
          const lng = position.lng();
          handleCoordinatesUpdate(lat, lng);
        });

        setMapLoaded(true);
        setMapError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('[LocationPicker] Google Maps initialization notice:', err.message);
        setMapError(err.message || 'Google Maps failed to load. Manual address entry is available below.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      mapLoaded &&
      mapInstanceRef.current &&
      markerInstanceRef.current &&
      value?.latitude &&
      value?.longitude
    ) {
      const lat = Number(value.latitude);
      const lng = Number(value.longitude);
      const pos = { lat, lng };
      setCurrentCoords(pos);
      markerInstanceRef.current.setPosition(pos);
      mapInstanceRef.current.panTo(pos);
    }
  }, [value?.latitude, value?.longitude, mapLoaded]);

  const handleCoordinatesUpdate = useCallback(
    (lat: number, lng: number) => {
      setCurrentCoords({ lat, lng });
      setLocationConfirmed(false);

      if (!geocoderRef.current) {
        onChange({
          ...value,
          latitude: lat,
          longitude: lng,
        });
        return;
      }

      setIsReverseGeocoding(true);
      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results: any[], status: string) => {
          setIsReverseGeocoding(false);
          if (status === 'OK' && results && results[0]) {
            const parsed = parseGooglePlace(results[0], availableStates, availableDistricts);
            onChange({
              ...value,
              ...parsed,
              latitude: lat,
              longitude: lng,
            });
          } else {
            onChange({
              ...value,
              latitude: lat,
              longitude: lng,
            });
          }
        }
      );
    },
    [onChange, value, availableStates, availableDistricts]
  );

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim() || !autocompleteServiceRef.current) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: 'in' },
        },
        (predictions: any[], status: string) => {
          setIsSearching(false);
          if (status === 'OK' && predictions) {
            setSuggestions(predictions);
          } else {
            setSuggestions([]);
          }
        }
      );
    }, 300);
  };

  const handleSelectSuggestion = (suggestion: any) => {
    setSearchQuery(suggestion.description);
    setSuggestions([]);

    if (placesServiceRef.current && window.google?.maps) {
      placesServiceRef.current.getDetails(
        {
          placeId: suggestion.place_id,
          fields: ['address_components', 'formatted_address', 'geometry', 'name', 'place_id'],
        },
        (place: any, status: string) => {
          if (status === 'OK' && place && place.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            const pos = { lat, lng };

            if (mapInstanceRef.current && markerInstanceRef.current) {
              mapInstanceRef.current.setCenter(pos);
              mapInstanceRef.current.setZoom(16);
              markerInstanceRef.current.setPosition(pos);
            }

            setCurrentCoords(pos);
            const parsed = parseGooglePlace(place, availableStates, availableDistricts);
            onChange({
              ...value,
              ...parsed,
              latitude: lat,
              longitude: lng,
            });
            setLocationConfirmed(true);
          }
        }
      );
    }
  };

  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Browser geolocation is not supported in this browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords = { lat, lng };

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setCenter(coords);
          mapInstanceRef.current.setZoom(16);
          markerInstanceRef.current.setPosition(coords);
        }

        handleCoordinatesUpdate(lat, lng);
        setLocationConfirmed(true);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Failed to obtain current location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or choose a location manually on the map.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again or search your address.';
        }
        alert(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/40 p-5 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
          </div>
          <p className="text-xs text-white/50 mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseCurrentLocation}
            disabled={disabled || isLocating}
            className="flex items-center gap-1.5 text-xs bg-zinc-900 border-white/10 hover:bg-zinc-800 text-white cursor-pointer"
          >
            {isLocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
            ) : (
              <Crosshair className="h-3.5 w-3.5 text-purple-400" />
            )}
            <span>Use Current Location</span>
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-white/40 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search address, landmark, building, or area in India..."
            disabled={disabled}
            className="pl-9 pr-9 bg-zinc-900 border-white/10 text-white placeholder:text-white/30 text-xs rounded-xl focus:border-purple-500/50"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-white/40" />
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-900/95 py-1.5 shadow-2xl backdrop-blur-xl max-h-60 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.place_id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-3.5 py-2.5 text-xs text-white/80 hover:bg-purple-500/15 hover:text-white transition-colors flex items-start gap-2.5 border-b border-white/5 last:border-b-0 cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                <div className="flex-1 truncate">
                  <p className="font-semibold text-white truncate">
                    {item.structured_formatting?.main_text || item.description}
                  </p>
                  <p className="text-[10px] text-white/40 truncate">
                    {item.structured_formatting?.secondary_text || ''}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative h-64 w-full rounded-xl overflow-hidden border border-white/10 bg-zinc-900">
        <div ref={mapContainerRef} className="h-full w-full" />

        {!mapLoaded && !mapError && (
          <div className="absolute inset-0 bg-zinc-950/80 flex flex-col items-center justify-center gap-2 text-white/60">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <span className="text-xs">Initializing Google Maps...</span>
          </div>
        )}

        {mapError && (
          <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 text-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-400" />
            <p className="text-xs font-semibold text-amber-300">{mapError}</p>
            <p className="text-[11px] text-white/50 max-w-sm">
              Manual address entry is active below. You can save your address without any issue.
            </p>
          </div>
        )}

        {isReverseGeocoding && (
          <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/80 border border-white/10 backdrop-blur-md text-xs text-white">
            <Loader2 className="h-3 w-3 animate-spin text-purple-400" />
            <span>Resolving address from coordinates...</span>
          </div>
        )}
      </div>

      {currentCoords && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-white/10 bg-zinc-900/60 text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">Selected Coordinates:</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[11px]">
                {currentCoords.lat.toFixed(6)}, {currentCoords.lng.toFixed(6)}
              </span>
            </div>
            {value?.formattedAddress && (
              <p className="text-white/60 text-[11px] line-clamp-2">
                <span className="text-white/40 font-medium">Resolved: </span>
                {value.formattedAddress}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant={locationConfirmed ? 'secondary' : 'default'}
              size="sm"
              onClick={() => setLocationConfirmed(true)}
              className="text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>{locationConfirmed ? 'Location Confirmed' : 'Confirm Location'}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
