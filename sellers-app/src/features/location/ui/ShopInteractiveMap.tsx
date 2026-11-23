'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Info,
  Layers,
  Key,
  ExternalLink,
  Crosshair,
} from 'lucide-react';
import { Button } from '@/shared/components/Button';

declare global {
  interface Window {
    google?: any;
    __initGoogleMapsCallback?: () => void;
    gm_authFailure?: () => void;
  }
}

interface ShopInteractiveMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number, source: 'MAP_PIN_SELECTED') => void;
  accuracyMeters?: number | null;
  locationSource?: string;
  disabled?: boolean;
  className?: string;
  onUseCurrentLocation?: () => void;
  isLocating?: boolean;
}

export function ShopInteractiveMap({
  latitude,
  longitude,
  onLocationSelect,
  accuracyMeters,
  locationSource,
  disabled = false,
  className = '',
  onUseCurrentLocation,
  isLocating = false,
}: ShopInteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const isInternalMoveRef = useRef(false);

  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Retrieve public Google Maps API key from environment
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Default coordinate (Mysuru / Karnataka center) if none provided
  const effectiveLat = latitude !== null && !isNaN(Number(latitude)) ? Number(latitude) : 12.2958;
  const effectiveLng = longitude !== null && !isNaN(Number(longitude)) ? Number(longitude) : 76.6394;
  const hasCoords = latitude !== null && longitude !== null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));

  // 1. Dynamically load Google Maps JavaScript API with Places and Geometry libraries
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Listen for Google Maps Authentication Failures (e.g., bad key, billing not enabled)
    window.gm_authFailure = () => {
      console.warn('[GoogleMaps] Authentication failed. Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.');
      setAuthError(true);
    };

    if (!googleMapsApiKey) {
      // Key not configured: integration will show clear configuration instructions
      return;
    }

    if (window.google?.maps?.Map) {
      setMapsLoaded(true);
      return;
    }

    const scriptId = 'google-maps-platform-script';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement;

    if (existingScript) {
      if (window.google?.maps?.Map) {
        setMapsLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setMapsLoaded(true));
        existingScript.addEventListener('error', () => setLoadError(true));
      }
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      googleMapsApiKey
    )}&libraries=places,geometry&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps?.Map) {
        setMapsLoaded(true);
      } else {
        setLoadError(true);
      }
    };
    script.onerror = () => {
      setLoadError(true);
    };

    document.head.appendChild(script);
  }, [googleMapsApiKey]);

  // 2. Initialize and maintain Google Map instance
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || typeof window === 'undefined' || !window.google?.maps) return;

    const google = window.google;

    if (!mapInstanceRef.current) {
      // High-visibility Custom Emerald Shop Entrance Marker SVG
      const shopMarkerIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="42" height="52" viewBox="0 0 42 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow" x="0" y="0" width="42" height="52" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/>
              </filter>
            </defs>
            <g filter="url(#shadow)">
              <path d="M21 2C10.5066 2 2 10.5066 2 21C2 33 21 48 21 48C21 48 40 33 40 21C40 10.5066 31.4934 2 21 2Z" fill="#10B981" stroke="#FFFFFF" stroke-width="2.5"/>
              <circle cx="21" cy="20" r="8" fill="#FFFFFF"/>
              <path d="M17 20L19.5 22.5L25 17" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(42, 52),
        anchor: new google.maps.Point(21, 48),
      };

      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: effectiveLat, lng: effectiveLng },
        zoom: hasCoords ? 18 : 15,
        mapTypeId: 'roadmap',
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        gestureHandling: 'greedy',
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }],
          },
        ],
      });

      const marker = new google.maps.Marker({
        position: { lat: effectiveLat, lng: effectiveLng },
        map,
        draggable: !disabled,
        icon: shopMarkerIcon,
        title: 'Drag pin to exact shop entrance',
        animation: google.maps.Animation.DROP,
      });

      // Draggable marker event: updates coordinates immediately on release
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (!pos) return;
        const newLat = Number(pos.lat().toFixed(6));
        const newLng = Number(pos.lng().toFixed(6));
        isInternalMoveRef.current = true;
        onLocationSelect(newLat, newLng, 'MAP_PIN_SELECTED');
      });

      // Click on map: moves marker to clicked spot immediately
      map.addListener('click', (e: any) => {
        if (disabled || !e.latLng) return;
        const newLat = Number(e.latLng.lat().toFixed(6));
        const newLng = Number(e.latLng.lng().toFixed(6));
        marker.setPosition({ lat: newLat, lng: newLng });
        isInternalMoveRef.current = true;
        onLocationSelect(newLat, newLng, 'MAP_PIN_SELECTED');
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      // Map cleanup if container is unmounted
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    };
  }, [mapsLoaded, effectiveLat, effectiveLng, hasCoords, disabled, onLocationSelect]);

  // 3. Keep Google Map view & marker synchronized with external coordinate changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !window.google?.maps) return;

    if (isInternalMoveRef.current) {
      isInternalMoveRef.current = false;
      return;
    }

    if (hasCoords) {
      const pos = { lat: effectiveLat, lng: effectiveLng };
      markerRef.current.setPosition(pos);
      mapInstanceRef.current.panTo(pos);

      // Render or update GPS accuracy radius circle overlay
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }

      if (accuracyMeters && accuracyMeters > 0) {
        const isPoorAccuracy = accuracyMeters > 30;
        circleRef.current = new window.google.maps.Circle({
          map: mapInstanceRef.current,
          center: pos,
          radius: accuracyMeters,
          strokeColor: isPoorAccuracy ? '#F59E0B' : '#10B981',
          strokeOpacity: 0.7,
          strokeWeight: 1.5,
          fillColor: isPoorAccuracy ? '#F59E0B' : '#10B981',
          fillOpacity: 0.12,
        });
      }
    }
  }, [effectiveLat, effectiveLng, hasCoords, accuracyMeters]);

  // Micro-nudge coordinate helpers (~11 meters per step)
  const handleNudge = (dLat: number, dLng: number) => {
    if (disabled) return;
    const newLat = Number((effectiveLat + dLat).toFixed(6));
    const newLng = Number((effectiveLng + dLng).toFixed(6));

    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setPosition({ lat: newLat, lng: newLng });
      mapInstanceRef.current.panTo({ lat: newLat, lng: newLng });
    }
    isInternalMoveRef.current = true;
    onLocationSelect(newLat, newLng, 'MAP_PIN_SELECTED');
  };

  // Re-center map to the current pin
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: effectiveLat, lng: effectiveLng });
      mapInstanceRef.current.setZoom(18);
    }
  };

  const isPoorAccuracy = Boolean(accuracyMeters && accuracyMeters > 30);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950 ${className}`}>
      {/* Map Header Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/85 border border-white/15 backdrop-blur-md shadow-lg pointer-events-auto">
          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-[11px] font-bold text-white tracking-wide font-mono">
            {hasCoords ? `${effectiveLat.toFixed(6)}, ${effectiveLng.toFixed(6)}` : 'Click map to place shop entrance pin'}
          </span>
          {accuracyMeters ? (
            <span
              className={`text-[10px] ml-1 font-semibold px-1.5 py-0.2 rounded ${
                isPoorAccuracy ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              ±{accuracyMeters}m
            </span>
          ) : null}
        </div>

        {/* Source & Accuracy Badge */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {isPoorAccuracy && (
            <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center gap-1 shadow-sm">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span>Approx GPS — Adjust Pin</span>
            </div>
          )}

          {locationSource && (
            <div
              className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                locationSource === 'GPS_DETECTED'
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                  : locationSource === 'GPS_APPROXIMATE'
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                  : locationSource === 'ADDRESS_SEARCHED'
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                  : locationSource === 'MAP_PIN_SELECTED'
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                  : 'bg-white/10 border-white/15 text-white/70'
              }`}
            >
              {locationSource === 'GPS_DETECTED'
                ? 'GPS Fix'
                : locationSource === 'GPS_APPROXIMATE'
                ? 'Approx GPS'
                : locationSource === 'ADDRESS_SEARCHED'
                ? 'Address Match'
                : locationSource === 'MAP_PIN_SELECTED'
                ? 'Entrance Pin Set'
                : 'Manual Entry'}
            </div>
          )}
        </div>
      </div>

      {/* Main Google Maps Viewport or Configuration Error Fallback */}
      {!googleMapsApiKey ? (
        <div className="p-5 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <Key className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                Google Maps Platform Configuration Required
              </h4>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                To load the interactive Google Map, draggable shop entrance marker, and Places Autocomplete, configure the
                public browser API key in your environment:
              </p>
              <div className="p-2 rounded bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-400 select-all">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_browser_api_key
              </div>
              <p className="text-[11px] text-white/60">
                Required Google Cloud APIs: <span className="text-white font-medium">Maps JavaScript API</span>,{' '}
                <span className="text-white font-medium">Places API</span>, and{' '}
                <span className="text-white font-medium">Geocoding API</span>.
              </p>
            </div>
          </div>

          {/* Coordinate Canvas Fallback for Entrance Tuning */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-4 flex flex-col items-center justify-center text-center space-y-2">
            <Compass className="h-6 w-6 text-emerald-400" />
            <p className="text-xs font-semibold text-white">Authoritative Entrance Coordinates</p>
            <p className="font-mono text-sm text-emerald-400 font-bold">
              {effectiveLat.toFixed(6)}° N, {effectiveLng.toFixed(6)}° E
            </p>
            <p className="text-[11px] text-white/50 max-w-md">
              You can fine-tune your exact storefront entrance using the micro-adjust controls below or test address
              autofill.
            </p>
          </div>
        </div>
      ) : authError ? (
        <div className="h-64 flex flex-col items-center justify-center p-5 text-center bg-zinc-900/90 text-white space-y-3">
          <AlertTriangle className="h-7 w-7 text-rose-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Google Maps API Key Authentication Error
          </h4>
          <p className="text-xs text-white/60 max-w-md leading-relaxed">
            Google Maps reported an authentication failure for your configured API key. Please ensure billing is active and
            the key is authorized for <span className="font-mono text-emerald-400">Maps JavaScript API</span> in Google
            Cloud Console.
          </p>
        </div>
      ) : loadError ? (
        <div className="h-64 flex flex-col items-center justify-center p-5 text-center bg-zinc-900/90 text-white space-y-2">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
          <p className="text-xs text-white/70">
            Could not connect to Google Maps Platform. You can still fine-tune coordinates using the controls below.
          </p>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className="h-64 w-full bg-zinc-900 cursor-crosshair"
          style={{ minHeight: '280px' }}
        />
      )}

      {/* Poor Accuracy Notice Overlay */}
      {isPoorAccuracy && (
        <div className="px-3.5 py-2 bg-amber-500/10 border-t border-amber-500/30 text-[11px] text-amber-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              GPS fix is approximate (±{accuracyMeters}m). Please drag the green pin directly to your storefront entrance.
            </span>
          </div>
        </div>
      )}

      {/* Entrance Pin Tuning & Map Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-zinc-950/95 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1 text-[11px] text-white/60">
          <Navigation className="h-3.5 w-3.5 text-blue-400" />
          <span>Shop entrance fine-tuning (~11m per step):</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Re-center Map Button */}
          {mapsLoaded && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[10px] px-2 text-white/80 hover:text-white border-white/15"
              onClick={handleRecenter}
              title="Re-centre Google Map on entrance pin"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Re-centre
            </Button>
          )}

          {/* Micro-nudge buttons */}
          <button
            type="button"
            onClick={() => handleNudge(0.0001, 0)}
            disabled={disabled}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-colors cursor-pointer"
            title="Nudge pin North (~11m)"
          >
            North ↑
          </button>
          <button
            type="button"
            onClick={() => handleNudge(-0.0001, 0)}
            disabled={disabled}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-colors cursor-pointer"
            title="Nudge pin South (~11m)"
          >
            South ↓
          </button>
          <button
            type="button"
            onClick={() => handleNudge(0, -0.0001)}
            disabled={disabled}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-colors cursor-pointer"
            title="Nudge pin West (~11m)"
          >
            West ←
          </button>
          <button
            type="button"
            onClick={() => handleNudge(0, 0.0001)}
            disabled={disabled}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-colors cursor-pointer"
            title="Nudge pin East (~11m)"
          >
            East →
          </button>
        </div>
      </div>
    </div>
  );
}
