'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  RotateCcw,
  AlertTriangle,
  Info,
  Layers,
  Key,
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
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // India overview default center if no coordinates provided yet (NEVER default to Mysuru or any specific city)
  const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
  const hasCoords = latitude !== null && longitude !== null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));
  const effectiveLat = hasCoords ? Number(latitude) : INDIA_CENTER.lat;
  const effectiveLng = hasCoords ? Number(longitude) : INDIA_CENTER.lng;

  // 1. Dynamically load Google Maps JavaScript API with Places and Geometry libraries
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.gm_authFailure = () => {
      console.warn('[GoogleMaps] Authentication failed. Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.');
      setAuthError(true);
    };

    if (!googleMapsApiKey) {
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

  // 2. Initialize and maintain Google Map instance (Zomato / Zepto delivery-app pattern)
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || typeof window === 'undefined' || !window.google?.maps) return;

    const google = window.google;

    if (!mapInstanceRef.current) {
      // High-visibility delivery-style Entrance Marker SVG (Emerald + White pulse)
      const shopMarkerIcon = {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="44" height="54" viewBox="0 0 44 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadow" x="0" y="0" width="44" height="54" filterUnits="userSpaceOnUse">
                <feDropShadow dx="0" dy="5" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.65"/>
              </filter>
            </defs>
            <g filter="url(#shadow)">
              <path d="M22 2C11 2 2 11 2 22C2 35 22 50 22 50C22 50 42 35 42 22C42 11 33 2 22 2Z" fill="#10B981" stroke="#FFFFFF" stroke-width="2.5"/>
              <circle cx="22" cy="21" r="8.5" fill="#FFFFFF"/>
              <path d="M18 21L20.5 23.5L26 18" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
          </svg>
        `)}`,
        scaledSize: new google.maps.Size(44, 54),
        anchor: new google.maps.Point(22, 50),
      };

      const map = new google.maps.Map(mapContainerRef.current, {
        center: { lat: effectiveLat, lng: effectiveLng },
        zoom: hasCoords ? 18 : 5,
        mapTypeId: mapType,
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

      let marker: any = null;
      if (hasCoords) {
        marker = new google.maps.Marker({
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
      }

      // Click on map: moves or places marker at clicked spot immediately
      map.addListener('click', (e: any) => {
        if (disabled || !e.latLng) return;
        const newLat = Number(e.latLng.lat().toFixed(6));
        const newLng = Number(e.latLng.lng().toFixed(6));
        if (!markerRef.current) {
          const newMarker = new google.maps.Marker({
            position: { lat: newLat, lng: newLng },
            map,
            draggable: !disabled,
            icon: shopMarkerIcon,
            title: 'Drag pin to exact shop entrance',
            animation: google.maps.Animation.DROP,
          });
          newMarker.addListener('dragend', () => {
            const pos = newMarker.getPosition();
            if (!pos) return;
            const dragLat = Number(pos.lat().toFixed(6));
            const dragLng = Number(pos.lng().toFixed(6));
            isInternalMoveRef.current = true;
            onLocationSelect(dragLat, dragLng, 'MAP_PIN_SELECTED');
          });
          markerRef.current = newMarker;
        } else {
          markerRef.current.setMap(map);
          markerRef.current.setPosition({ lat: newLat, lng: newLng });
        }
        isInternalMoveRef.current = true;
        onLocationSelect(newLat, newLng, 'MAP_PIN_SELECTED');
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }
  }, [mapsLoaded, effectiveLat, effectiveLng, hasCoords, disabled, onLocationSelect, mapType]);

  // 3. Keep Google Map view & marker synchronized with external coordinate changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (isInternalMoveRef.current) {
      isInternalMoveRef.current = false;
      return;
    }

    if (hasCoords) {
      const pos = { lat: Number(latitude), lng: Number(longitude) };
      if (!markerRef.current) {
        const google = window.google;
        const shopMarkerIcon = {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="44" height="54" viewBox="0 0 44 54" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="shadow" x="0" y="0" width="44" height="54" filterUnits="userSpaceOnUse">
                  <feDropShadow dx="0" dy="5" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.65"/>
                </filter>
              </defs>
              <g filter="url(#shadow)">
                <path d="M22 2C11 2 2 11 2 22C2 35 22 50 22 50C22 50 42 35 42 22C42 11 33 2 22 2Z" fill="#10B981" stroke="#FFFFFF" stroke-width="2.5"/>
                <circle cx="22" cy="21" r="8.5" fill="#FFFFFF"/>
                <path d="M18 21L20.5 23.5L26 18" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              </g>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(44, 54),
          anchor: new google.maps.Point(22, 50),
        };
        const newMarker = new google.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          draggable: !disabled,
          icon: shopMarkerIcon,
          title: 'Drag pin to exact shop entrance',
          animation: google.maps.Animation.DROP,
        });
        newMarker.addListener('dragend', () => {
          const mPos = newMarker.getPosition();
          if (!mPos) return;
          const dragLat = Number(mPos.lat().toFixed(6));
          const dragLng = Number(mPos.lng().toFixed(6));
          isInternalMoveRef.current = true;
          onLocationSelect(dragLat, dragLng, 'MAP_PIN_SELECTED');
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

      // Render or update GPS accuracy radius circle overlay
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }

      if (accuracyMeters && accuracyMeters > 0) {
        const isPoorAccuracy = accuracyMeters > 50;
        const isApprox = accuracyMeters > 15 && accuracyMeters <= 50;
        const circleColor = isPoorAccuracy ? '#EF4444' : isApprox ? '#F59E0B' : '#10B981';
        circleRef.current = new window.google.maps.Circle({
          map: mapInstanceRef.current,
          center: pos,
          radius: accuracyMeters,
          strokeColor: circleColor,
          strokeOpacity: 0.7,
          strokeWeight: 1.5,
          fillColor: circleColor,
          fillOpacity: 0.12,
        });
      }
    } else {
      // Coords cleared or not set: hide marker and accuracy circle
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    }
  }, [latitude, longitude, hasCoords, accuracyMeters, disabled, onLocationSelect]);

  // Handle map type toggle (Roadmap vs Satellite)
  const toggleMapType = () => {
    const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(nextType);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(nextType);
    }
  };

  // Re-center map directly on currently selected coordinates
  const handleRecenter = () => {
    if (mapInstanceRef.current && hasCoords) {
      mapInstanceRef.current.panTo({ lat: Number(latitude), lng: Number(longitude) });
      mapInstanceRef.current.setZoom(18);
    } else if (onUseCurrentLocation) {
      onUseCurrentLocation();
    }
  };

  // Directional micro-nudge adjustment (~11 meters per step)
  const handleNudge = (deltaLat: number, deltaLng: number) => {
    if (disabled || !hasCoords) return;
    const currentLat = Number(latitude);
    const currentLng = Number(longitude);
    const newLat = Number((currentLat + deltaLat).toFixed(6));
    const newLng = Number((currentLng + deltaLng).toFixed(6));

    if (markerRef.current) {
      markerRef.current.setPosition({ lat: newLat, lng: newLng });
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: newLat, lng: newLng });
    }

    isInternalMoveRef.current = true;
    onLocationSelect(newLat, newLng, 'MAP_PIN_SELECTED');
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-white/15 bg-zinc-950/80 shadow-2xl flex flex-col ${className}`}>
      {/* Missing Google Maps API Key Notification */}
      {!googleMapsApiKey && (
        <div className="bg-amber-950/90 border-b border-amber-500/30 p-3 text-xs text-amber-200 flex items-start gap-2">
          <Key className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-100">Google Maps Platform Key Required</p>
            <p className="text-[11px] text-amber-300/80">
              Set <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in environment variables for the live interactive map and autocomplete.
            </p>
          </div>
        </div>
      )}

      {/* Authentication / Authorization Error */}
      {authError && (
        <div className="bg-red-950/90 border-b border-red-500/30 p-3 text-xs text-red-200 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <p>Google Maps authentication failed. Ensure Maps JavaScript API is enabled for this API key.</p>
        </div>
      )}

      {/* Map Viewport */}
      <div className="relative w-full h-[360px] bg-zinc-900 overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Delivery Pin Label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/90 border border-white/20 text-white text-[11px] font-semibold shadow-xl backdrop-blur-md">
            <MapPin className={`h-3 w-3 shrink-0 ${hasCoords ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
            <span>
              {hasCoords
                ? 'Drag pin or tap map to adjust shop entrance'
                : "Tap 'Use Current Location' or search address to place pin"}
            </span>
          </div>
        </div>

        {/* Floating Map Controls (Top-Right) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={toggleMapType}
            className="h-8 px-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-white border-white/20 shadow-lg text-[11px] backdrop-blur-md gap-1 cursor-pointer"
            title="Toggle Satellite / Road Map"
          >
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span className="capitalize">{mapType === 'roadmap' ? 'Satellite' : 'Roadmap'}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleRecenter}
            className="h-8 px-2.5 bg-zinc-900/90 hover:bg-zinc-800 text-white border-white/20 shadow-lg text-[11px] backdrop-blur-md gap-1 cursor-pointer"
            title="Re-centre Map on Pin"
          >
            <Crosshair className="h-3.5 w-3.5 text-emerald-400" />
            <span>{hasCoords ? 'Re-centre' : 'Detect GPS'}</span>
          </Button>
        </div>

        {/* Empty State Overlay when no location is set */}
        {!hasCoords && (
          <div className="absolute inset-x-4 bottom-4 z-10 flex justify-center pointer-events-none">
            <div className="max-w-md w-full bg-zinc-950/90 border border-white/15 rounded-xl p-3 shadow-2xl backdrop-blur-md text-center pointer-events-auto">
              <p className="text-xs font-semibold text-white">No Entrance Pin Placed Yet</p>
              <p className="text-[11px] text-white/60 mt-0.5">
                Tap <span className="text-emerald-400 font-medium">Use Current Location</span>, search your shop's address, or tap on the map to set your entrance.
              </p>
            </div>
          </div>
        )}

        {/* GPS Accuracy Overlay Pill (Bottom-Left) */}
        {hasCoords && accuracyMeters ? (
          <div className="absolute bottom-3 left-3 z-10">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border shadow-lg backdrop-blur-md ${
                accuracyMeters > 50
                  ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                  : accuracyMeters > 15
                  ? 'bg-amber-950/90 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <Info className="h-3 w-3 shrink-0" />
              <span>
                {accuracyMeters > 50
                  ? `Poor GPS (±${accuracyMeters}m) — Drag pin to entrance`
                  : accuracyMeters > 15
                  ? `Approx GPS (±${accuracyMeters}m) — Verify entrance`
                  : `High GPS Accuracy (±${accuracyMeters}m)`}
              </span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Micro-adjust Nudge Toolbar (~11 meters per step) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-zinc-950 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1.5 text-[11px] text-white/60">
          <Navigation className="h-3.5 w-3.5 text-blue-400" />
          <span>Micro-adjust shop entrance (~11m):</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleNudge(0.0001, 0)}
            disabled={disabled || !hasCoords}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 text-[11px] font-medium text-white transition-colors cursor-pointer"
            title="Move Entrance North (~11m)"
          >
            ↑ North
          </button>
          <button
            type="button"
            onClick={() => handleNudge(-0.0001, 0)}
            disabled={disabled || !hasCoords}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 text-[11px] font-medium text-white transition-colors cursor-pointer"
            title="Move Entrance South (~11m)"
          >
            ↓ South
          </button>
          <button
            type="button"
            onClick={() => handleNudge(0, -0.0001)}
            disabled={disabled || !hasCoords}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 text-[11px] font-medium text-white transition-colors cursor-pointer"
            title="Move Entrance West (~11m)"
          >
            ← West
          </button>
          <button
            type="button"
            onClick={() => handleNudge(0, 0.0001)}
            disabled={disabled || !hasCoords}
            className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 text-[11px] font-medium text-white transition-colors cursor-pointer"
            title="Move Entrance East (~11m)"
          >
            East →
          </button>
        </div>
      </div>
    </div>
  );
}
