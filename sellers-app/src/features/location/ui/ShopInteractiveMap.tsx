'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/shared/components/Button';

declare global {
  interface Window {
    google?: any;
    __googleMapsPlatformCallback?: () => void;
    gm_authFailure?: () => void;
  }
}

export interface ShopInteractiveMapProps {
  latitude: number | null;
  longitude: number | null;
  deviceLatitude?: number | null;
  deviceLongitude?: number | null;
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
  deviceLatitude,
  deviceLongitude,
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
  const gpsMarkerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const isInternalMoveRef = useRef(false);

  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // India overview default center if no coordinates provided yet (never default to a specific city)
  const INDIA_CENTER = { lat: 20.5937, lng: 78.9629 };
  const hasCoords = latitude !== null && longitude !== null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));
  const hasDeviceCoords =
    deviceLatitude !== null &&
    deviceLongitude !== null &&
    deviceLatitude !== undefined &&
    deviceLongitude !== undefined &&
    !isNaN(Number(deviceLatitude)) &&
    !isNaN(Number(deviceLongitude));

  const effectiveLat = hasCoords ? Number(latitude) : INDIA_CENTER.lat;
  const effectiveLng = hasCoords ? Number(longitude) : INDIA_CENTER.lng;

  // 1. Robust Google Maps JavaScript API Loading with Callback & Readiness Detection
  const loadGoogleMapsScript = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Check if already ready
    if (window.google?.maps?.Map) {
      setMapsLoaded(true);
      setLoadError(false);
      return;
    }

    if (!googleMapsApiKey) {
      return;
    }

    // Capture auth failures reported by Google Maps Platform
    window.gm_authFailure = () => {
      console.warn('[GoogleMaps] Authentication failed. Check Maps JavaScript API activation and HTTP referrer restrictions.');
      setAuthError(true);
    };

    // Register global callback that Google Maps will execute upon full library readiness
    window.__googleMapsPlatformCallback = () => {
      if (window.google?.maps?.Map) {
        setMapsLoaded(true);
        setLoadError(false);
      }
    };

    const scriptId = 'google-maps-platform-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      // Note: We use &callback=__googleMapsPlatformCallback to ensure libraries (maps, places, geometry) are fully ready
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        googleMapsApiKey
      )}&libraries=places,geometry&callback=__googleMapsPlatformCallback`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setLoadError(true);
      };
      document.head.appendChild(script);
    }

    // Fallback polling in case the script was already loaded by a sibling view
    let attempts = 0;
    const pollInterval = setInterval(() => {
      attempts++;
      if (window.google?.maps?.Map) {
        clearInterval(pollInterval);
        setMapsLoaded(true);
        setLoadError(false);
      } else if (attempts > 30) {
        clearInterval(pollInterval);
        if (!window.google?.maps?.Map && !authError) {
          setLoadError(true);
        }
      }
    }, 150);

    return () => {
      clearInterval(pollInterval);
    };
  }, [googleMapsApiKey, authError]);

  useEffect(() => {
    const cleanup = loadGoogleMapsScript();
    return cleanup;
  }, [loadGoogleMapsScript]);

  // High-visibility delivery-style Entrance Marker SVG (Emerald Pin + Storefront Icon)
  const getEntranceMarkerIcon = () => {
    if (!window.google?.maps) return undefined;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="46" height="56" viewBox="0 0 46 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="0" y="0" width="46" height="56" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="5" stdDeviation="3.5" flood-color="#000000" flood-opacity="0.65"/>
            </filter>
          </defs>
          <g filter="url(#shadow)">
            <path d="M23 2C11.4 2 2 11.4 2 23C2 36.5 23 52 23 52C23 52 44 36.5 44 23C44 11.4 34.6 2 23 2Z" fill="#10B981" stroke="#FFFFFF" stroke-width="2.5"/>
            <circle cx="23" cy="22" r="9.5" fill="#FFFFFF"/>
            <path d="M19 22L21.5 24.5L27 19" stroke="#047857" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </g>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(46, 56),
      anchor: new window.google.maps.Point(23, 52),
    };
  };

  // Blue Pulsing Device GPS Position Dot SVG
  const getDeviceLocationIcon = () => {
    if (!window.google?.maps) return undefined;
    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" fill="#3B82F6" fill-opacity="0.25"/>
          <circle cx="12" cy="12" r="6" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2.5"/>
        </svg>
      `)}`,
      scaledSize: new window.google.maps.Size(24, 24),
      anchor: new window.google.maps.Point(12, 12),
    };
  };

  // 2. Initialize and maintain Google Map instance
  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || typeof window === 'undefined' || !window.google?.maps) return;

    const google = window.google;

    if (!mapInstanceRef.current) {
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

      // Trigger map resize after mounting so tiles render fully
      setTimeout(() => {
        if (mapInstanceRef.current) {
          google.maps.event.trigger(mapInstanceRef.current, 'resize');
        }
      }, 250);

      let marker: any = null;
      if (hasCoords) {
        marker = new google.maps.Marker({
          position: { lat: effectiveLat, lng: effectiveLng },
          map,
          draggable: !disabled,
          icon: getEntranceMarkerIcon(),
          title: 'Shop Entrance (Drag to exact door)',
          animation: google.maps.Animation.DROP,
        });

        marker.addListener('dragend', () => {
          const pos = marker.getPosition();
          if (!pos) return;
          const newLat = Number(pos.lat().toFixed(6));
          const newLng = Number(pos.lng().toFixed(6));
          isInternalMoveRef.current = true;
          onLocationSelect(newLat, newLng, 'MAP_PIN_SELECTED');
        });
      }

      // Tap on map: moves or drops shop entrance pin immediately
      map.addListener('click', (e: any) => {
        if (disabled || !e.latLng) return;
        const newLat = Number(e.latLng.lat().toFixed(6));
        const newLng = Number(e.latLng.lng().toFixed(6));
        if (!markerRef.current) {
          const newMarker = new google.maps.Marker({
            position: { lat: newLat, lng: newLng },
            map,
            draggable: !disabled,
            icon: getEntranceMarkerIcon(),
            title: 'Shop Entrance (Drag to exact door)',
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

  // 3. Keep Entrance Pin and GPS Dot Synchronized With External State
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google?.maps) return;

    if (isInternalMoveRef.current) {
      isInternalMoveRef.current = false;
      return;
    }

    const google = window.google;

    // 3A. Update Shop Entrance Pin
    if (hasCoords) {
      const pos = { lat: Number(latitude), lng: Number(longitude) };
      if (!markerRef.current) {
        const newMarker = new google.maps.Marker({
          position: pos,
          map: mapInstanceRef.current,
          draggable: !disabled,
          icon: getEntranceMarkerIcon(),
          title: 'Shop Entrance (Drag to exact door)',
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
    } else {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
    }

    // 3B. Update Device GPS Location Marker (Separate Blue Dot)
    if (hasDeviceCoords) {
      const devPos = { lat: Number(deviceLatitude), lng: Number(deviceLongitude) };
      if (!gpsMarkerRef.current) {
        gpsMarkerRef.current = new google.maps.Marker({
          position: devPos,
          map: mapInstanceRef.current,
          icon: getDeviceLocationIcon(),
          title: 'Your Device GPS Position',
          zIndex: 1,
        });
      } else {
        gpsMarkerRef.current.setMap(mapInstanceRef.current);
        gpsMarkerRef.current.setPosition(devPos);
      }

      // 3C. Render Accuracy Radius Circle on Device GPS location
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }

      if (accuracyMeters && accuracyMeters > 0) {
        // Strict 4 Display Tiers: 0-5m (High), 5-15m (Good), 15-30m (Approx), >30m (Poor)
        const isPoor = accuracyMeters > 30;
        const isApprox = accuracyMeters > 15 && accuracyMeters <= 30;
        const isGood = accuracyMeters > 5 && accuracyMeters <= 15;
        const circleColor = isPoor ? '#EF4444' : isApprox ? '#F59E0B' : isGood ? '#22C55E' : '#10B981';

        circleRef.current = new google.maps.Circle({
          map: mapInstanceRef.current,
          center: devPos,
          radius: accuracyMeters,
          strokeColor: circleColor,
          strokeOpacity: 0.75,
          strokeWeight: 1.5,
          fillColor: circleColor,
          fillOpacity: 0.12,
        });
      }
    } else {
      if (gpsMarkerRef.current) {
        gpsMarkerRef.current.setMap(null);
      }
      if (circleRef.current) {
        circleRef.current.setMap(null);
        circleRef.current = null;
      }
    }
  }, [latitude, longitude, deviceLatitude, deviceLongitude, hasCoords, hasDeviceCoords, accuracyMeters, disabled, onLocationSelect]);

  // Toggle Map Type (Roadmap vs Satellite)
  const toggleMapType = () => {
    const nextType = mapType === 'roadmap' ? 'satellite' : 'roadmap';
    setMapType(nextType);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(nextType);
    }
  };

  // Re-centre map on current entrance pin or GPS
  const handleRecenter = () => {
    if (mapInstanceRef.current && hasCoords) {
      mapInstanceRef.current.panTo({ lat: Number(latitude), lng: Number(longitude) });
      mapInstanceRef.current.setZoom(18);
    } else if (mapInstanceRef.current && hasDeviceCoords) {
      mapInstanceRef.current.panTo({ lat: Number(deviceLatitude), lng: Number(deviceLongitude) });
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
      {/* Missing Google Maps API Key Banner */}
      {!googleMapsApiKey && (
        <div className="bg-amber-950/90 border-b border-amber-500/30 p-3 text-xs text-amber-200 flex items-start gap-2.5">
          <Key className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-100">Google Maps Platform Key Required</p>
            <p className="text-[11px] text-amber-300/80">
              Configure <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> for live map tiles, satellite imagery and places search.
            </p>
          </div>
        </div>
      )}

      {/* Map Viewport Container */}
      <div className="relative w-full h-[360px] bg-zinc-900 overflow-hidden">
        {/* Actual Google Maps DOM Target — Explicit inline style prevents flex/parent height collapse */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '360px', minHeight: '360px' }} />

        {/* Informative Error State when Google Maps API fails to load */}
        {(authError || (loadError && !mapsLoaded)) && (
          <div className="absolute inset-0 bg-zinc-950/95 p-6 flex flex-col items-center justify-center text-center z-20 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1 max-w-md">
              <h4 className="text-sm font-bold text-white">Google Maps Platform Configuration Notice</h4>
              <p className="text-xs text-white/70 leading-relaxed">
                {authError
                  ? 'The Maps JavaScript API rejected the API key or the API is not yet activated on your Google Cloud Project. Please ensure Maps JavaScript API, Geocoding API, and Places API (New) are enabled.'
                  : 'Failed to connect to Google Maps servers. Check network connection or API referrer restrictions.'}
              </p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={loadGoogleMapsScript}
                className="h-8 text-xs bg-white/5 border-white/20 text-white gap-1.5 cursor-pointer hover:bg-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Loading Map</span>
              </Button>
              <a
                href="https://developers.google.com/maps/documentation/javascript/troubleshooting"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 underline underline-offset-2 ml-2"
              >
                <span>Troubleshooting Guide</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}

        {/* Floating Delivery Pin Label */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/90 border border-white/20 text-white text-[11px] font-semibold shadow-xl backdrop-blur-md">
            <MapPin className={`h-3 w-3 shrink-0 ${hasCoords ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
            <span>
              {hasCoords
                ? 'Drag green pin or tap map to set shop entrance'
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
            title="Re-centre Map on Pin or GPS"
          >
            <Crosshair className="h-3.5 w-3.5 text-emerald-400" />
            <span>{hasCoords ? 'Re-centre' : 'Detect GPS'}</span>
          </Button>
        </div>

        {/* Empty State Overlay when no location is set */}
        {!hasCoords && !authError && !loadError && (
          <div className="absolute inset-x-4 bottom-4 z-10 flex justify-center pointer-events-none">
            <div className="max-w-md w-full bg-zinc-950/90 border border-white/15 rounded-xl p-3 shadow-2xl backdrop-blur-md text-center pointer-events-auto">
              <p className="text-xs font-semibold text-white">No Entrance Pin Placed Yet</p>
              <p className="text-[11px] text-white/60 mt-0.5">
                Tap <span className="text-emerald-400 font-medium">Use Current Location</span>, search your shop's address, or tap on the map to set your entrance.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* Micro-adjust Nudge Toolbar (~11 meters per step) */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-zinc-950 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1.5 text-[11px] text-white/60">
          <Navigation className="h-3.5 w-3.5 text-blue-400" />
          <span>Micro-adjust shop entrance pin (~11m):</span>
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
