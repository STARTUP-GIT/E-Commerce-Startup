'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import {
  Crosshair,
  Loader2,
  MapPin,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Search,
  X,
  Navigation,
  Compass,
  Layers,
  AlertTriangle,
} from 'lucide-react';

declare global {
  interface Window {
    google?: any;
  }
}

export interface LocationCoordinatesInputProps {
  latitude?: number | null | string;
  longitude?: number | null | string;
  onChange: (coords: { latitude: number | null; longitude: number | null }) => void;
  onAddressResolved?: (resolved: {
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    district?: string;
    state?: string;
    postalCode?: string;
    formattedAddress?: string;
    accuracyMeters?: number | null;
  }) => void;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export function LocationCoordinatesInput({
  latitude,
  longitude,
  onChange,
  onAddressResolved,
  disabled = false,
  className = '',
  helperText = 'Pinpoint your exact delivery entrance on the map or use GPS for accurate delivery dispatch.',
}: LocationCoordinatesInputProps) {
  const [latInput, setLatInput] = useState<string>(
    latitude !== null && latitude !== undefined ? String(latitude) : ''
  );
  const [lngInput, setLngInput] = useState<string>(
    longitude !== null && longitude !== undefined ? String(longitude) : ''
  );

  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoSuccess, setGeoSuccess] = useState<string | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);

  // Search & Map states
  const [showMap, setShowMap] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const isInternalMoveRef = useRef(false);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const activeGeocodeReqId = useRef(0);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Sync internal state when external props change
  useEffect(() => {
    const formattedLat = latitude !== null && latitude !== undefined ? String(latitude) : '';
    const formattedLng = longitude !== null && longitude !== undefined ? String(longitude) : '';
    setLatInput(formattedLat);
    setLngInput(formattedLng);
  }, [latitude, longitude]);

  const numLat = Number(latInput);
  const numLng = Number(lngInput);
  const hasValidCoords = !isNaN(numLat) && !isNaN(numLng) && latInput.trim() !== '' && lngInput.trim() !== '';

  // 1. Load Google Maps script when map is opened
  useEffect(() => {
    if (!showMap || typeof window === 'undefined') return;

    if (window.google?.maps?.Map) {
      initMap();
      return;
    }

    if (!googleMapsApiKey) return;

    const scriptId = 'google-maps-customer-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        googleMapsApiKey
      )}&libraries=places,geometry&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => initMap());
    }
  }, [showMap, googleMapsApiKey]);

  const initMap = () => {
    if (!mapContainerRef.current || !window.google?.maps) return;
    const centerLat = hasValidCoords ? numLat : 20.5937;
    const centerLng = hasValidCoords ? numLng : 78.9629;

    const map = new window.google.maps.Map(mapContainerRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: hasValidCoords ? 18 : 5,
      mapTypeId: 'roadmap',
      zoomControl: true,
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
    });

    let marker: any = null;
    if (hasValidCoords) {
      marker = new window.google.maps.Marker({
        position: { lat: centerLat, lng: centerLng },
        map,
        draggable: !disabled,
        title: 'Delivery Pin (Drag to entrance)',
        animation: window.google.maps.Animation.DROP,
      });

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (!pos) return;
        const newLat = Number(pos.lat().toFixed(6));
        const newLng = Number(pos.lng().toFixed(6));
        updateCoords(newLat, newLng, true);
      });
    }

    map.addListener('click', (e: any) => {
      if (!e.latLng || disabled) return;
      const newLat = Number(e.latLng.lat().toFixed(6));
      const newLng = Number(e.latLng.lng().toFixed(6));
      if (!markerRef.current) {
        const newMarker = new window.google.maps.Marker({
          position: { lat: newLat, lng: newLng },
          map,
          draggable: !disabled,
          title: 'Delivery Pin (Drag to entrance)',
          animation: window.google.maps.Animation.DROP,
        });
        newMarker.addListener('dragend', () => {
          const pos = newMarker.getPosition();
          if (!pos) return;
          const dragLat = Number(pos.lat().toFixed(6));
          const dragLng = Number(pos.lng().toFixed(6));
          updateCoords(dragLat, dragLng, true);
        });
        markerRef.current = newMarker;
      } else {
        markerRef.current.setMap(map);
        markerRef.current.setPosition({ lat: newLat, lng: newLng });
      }
      updateCoords(newLat, newLng, true);
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;
  };

  // Synchronize Google Map view & pin when external coordinates change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;
    if (isInternalMoveRef.current) {
      isInternalMoveRef.current = false;
      return;
    }

    if (hasValidCoords) {
      const pos = { lat: numLat, lng: numLng };
      if (!markerRef.current) {
        const newMarker = new window.google.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          draggable: !disabled,
          title: 'Delivery Pin (Drag to entrance)',
          animation: window.google.maps.Animation.DROP,
        });
        newMarker.addListener('dragend', () => {
          const mPos = newMarker.getPosition();
          if (!mPos) return;
          const dragLat = Number(mPos.lat().toFixed(6));
          const dragLng = Number(mPos.lng().toFixed(6));
          updateCoords(dragLat, dragLng, true);
        });
        markerRef.current = newMarker;
      } else {
        markerRef.current.setMap(mapInstanceRef.current);
        markerRef.current.setPosition(pos);
      }
      mapInstanceRef.current.panTo(pos);
      if (mapInstanceRef.current.getZoom() < 16) {
        mapInstanceRef.current.setZoom(18);
      }
    } else {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    }
  }, [numLat, numLng, hasValidCoords, disabled]);

  const updateCoords = (lat: number, lng: number, triggerReverseGeocode = false) => {
    isInternalMoveRef.current = true;
    setLatInput(String(lat));
    setLngInput(String(lng));
    onChange({ latitude: lat, longitude: lng });

    if (triggerReverseGeocode) {
      const reqId = ++activeGeocodeReqId.current;
      resolveAddress(lat, lng, reqId);
    }
  };

  // Reverse geocodes coordinates and passes address suggestions to parent
  const resolveAddress = async (lat: number, lng: number, reqId: number) => {
    try {
      const res = await fetch('/api/locations/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude: lat, longitude: lng, userRole: 'CUSTOMER' }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (reqId !== activeGeocodeReqId.current) return;

      const loc = data?.resolvedLocation;
      if (loc && onAddressResolved) {
        onAddressResolved({
          addressLine1: loc.addressLine1 || loc.street,
          addressLine2: loc.addressLine2 || loc.area,
          city: loc.city || loc.district,
          district: loc.district || loc.city,
          state: loc.state,
          postalCode: loc.postalCode,
          formattedAddress: loc.formattedAddress,
          accuracyMeters,
        });
        setGeoSuccess('Address populated from pin location. Please review details.');
      }
    } catch {
      // Keep coordinates
    }
  };

  // Use Current Location
  const handleUseCurrentLocation = () => {
    setGeoError(null);
    setGeoSuccess(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser. Please enter coordinates manually.');
      return;
    }

    setIsLocating(true);
    const reqId = ++activeGeocodeReqId.current;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const acc = pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null;

        setAccuracyMeters(acc);
        updateCoords(lat, lng, true);

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.panTo({ lat, lng });
          mapInstanceRef.current.setZoom(18);
          markerRef.current.setPosition({ lat, lng });
        }

        if (acc && acc > 30) {
          setGeoSuccess(`Approximate GPS fix (±${acc}m). Please adjust pin directly to your door entrance.`);
        } else {
          setGeoSuccess(`High-accuracy GPS fix detected (±${acc || 10}m).`);
        }
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Failed to retrieve current location.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or search your address.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'GPS signal is unavailable. Please search or enter address manually.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please retry.';
        }
        setGeoError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      }
    );
  };

  // Autocomplete Address Search
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (q.trim().length < 3) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/locations/search?q=${encodeURIComponent(q)}`);
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
    }, 350);
  };

  const handleSelectSearchResult = (r: any) => {
    setShowSearchResults(false);
    setSearchQuery(r.formattedAddress || r.street || '');
    if (r.latitude && r.longitude) {
      const lat = Number(Number(r.latitude).toFixed(6));
      const lng = Number(Number(r.longitude).toFixed(6));
      updateCoords(lat, lng, true);

      if (mapInstanceRef.current && markerRef.current) {
        mapInstanceRef.current.panTo({ lat, lng });
        mapInstanceRef.current.setZoom(18);
        markerRef.current.setPosition({ lat, lng });
      }

      if (onAddressResolved) {
        onAddressResolved({
          addressLine1: r.addressLine1 || r.street,
          addressLine2: r.addressLine2 || r.area,
          city: r.city || r.district,
          district: r.district || r.city,
          state: r.state,
          postalCode: r.postalCode,
          formattedAddress: r.formattedAddress,
        });
      }
    }
  };

  const handleClear = () => {
    setLatInput('');
    setLngInput('');
    setAccuracyMeters(null);
    setGeoError(null);
    setGeoSuccess(null);
    onChange({ latitude: null, longitude: null });
  };

  return (
    <div className={`rounded-2xl border border-white/10 bg-zinc-950/40 p-4 backdrop-blur-md space-y-3.5 ${className}`}>
      {/* Header with Title and "Use Current Location" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/5 pb-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-purple-400 shrink-0" />
            <h4 className="text-xs font-bold text-white tracking-wide uppercase">
              Delivery Map &amp; Entrance Location
            </h4>
          </div>
          <p className="text-[11px] text-white/50">{helperText}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowMap(!showMap)}
            className="h-8 text-[11px] border-white/10 hover:border-white/20 text-white/80 hover:text-white bg-white/5 gap-1.5 cursor-pointer"
          >
            <Compass className="h-3.5 w-3.5 text-purple-400" />
            <span>{showMap ? 'Hide Map' : 'Select on Map'}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseCurrentLocation}
            disabled={disabled || isLocating}
            className="h-8 text-[11px] border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-purple-200 bg-purple-500/10 hover:bg-purple-500/20 gap-1.5 cursor-pointer"
          >
            {isLocating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <Crosshair className="h-3.5 w-3.5 text-purple-400" />
                <span>Use Current Location</span>
              </>
            )}
          </Button>

          {hasValidCoords && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 text-[11px] px-2 text-white/50 hover:text-white hover:bg-white/5 cursor-pointer"
              title="Clear coordinates"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Address Search Bar for Customers */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/30 pointer-events-none" />
          <Input
            placeholder="Search address or landmark to set map pin..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs bg-zinc-900/80 border-white/10"
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
          <div className="absolute z-30 mt-1 w-full rounded-xl border border-white/15 bg-zinc-900/98 shadow-2xl backdrop-blur-xl overflow-hidden max-h-52 overflow-y-auto">
            {isSearching ? (
              <div className="p-3 text-center text-xs text-white/40 flex items-center justify-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" /> Searching...
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
                  <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-white">{res.street || res.area || res.city}</p>
                    <p className="text-[11px] text-white/50 line-clamp-1">{res.formattedAddress}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Interactive Google Map Panel */}
      {showMap && (
        <div className="rounded-xl border border-white/10 overflow-hidden bg-zinc-900 relative">
          <div ref={mapContainerRef} className="w-full h-[220px]" />
          <div className="absolute bottom-2 left-2 z-10 pointer-events-none">
            <span className="px-2 py-1 rounded bg-black/75 backdrop-blur-md text-[10px] text-white/80 border border-white/10">
              Drag pin to your exact building entrance
            </span>
          </div>
        </div>
      )}

      {/* Feedback Messages */}
      {geoError && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-xs text-red-300 animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{geoError}</span>
        </div>
      )}

      {geoSuccess && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-300 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{geoSuccess}</span>
        </div>
      )}

      {/* Lat/Lng Coordinate Inputs */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-white/60">Latitude</label>
          <Input
            value={latInput}
            onChange={(e) => {
              setLatInput(e.target.value);
              const n = Number(e.target.value);
              if (!isNaN(n) && e.target.value.trim() !== '') {
                onChange({ latitude: n, longitude: numLng || null });
              }
            }}
            placeholder="e.g. 12.9716"
            className="h-8 text-xs bg-zinc-900/60"
            disabled={disabled}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-white/60">Longitude</label>
          <Input
            value={lngInput}
            onChange={(e) => {
              setLngInput(e.target.value);
              const n = Number(e.target.value);
              if (!isNaN(n) && e.target.value.trim() !== '') {
                onChange({ latitude: numLat || null, longitude: n });
              }
            }}
            placeholder="e.g. 77.5946"
            className="h-8 text-xs bg-zinc-900/60"
            disabled={disabled}
          />
        </div>
      </div>
    </div>
  );
}
