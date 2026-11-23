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
  Camera,
  Map as MapIcon,
  CheckCircle2,
  Eye,
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
  // View mode: 'map' (interactive Google Map) or 'street' (360° Google Street View)
  const [activeTab, setActiveTab] = useState<'map' | 'street'>('map');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const streetViewContainerRef = useRef<HTMLDivElement | null>(null);

  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const panoramaRef = useRef<any>(null);
  const isInternalMoveRef = useRef(false);

  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Street View coverage status
  const [hasStreetView, setHasStreetView] = useState<boolean | null>(null);
  const [isCheckingStreetView, setIsCheckingStreetView] = useState(false);
  const [streetViewNotice, setStreetViewNotice] = useState<string | null>(null);
  const [streetViewConfirmed, setStreetViewConfirmed] = useState(false);

  // Retrieve public Google Maps API key from environment
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  // Default coordinate (Mysuru / Karnataka center) if none provided
  const effectiveLat = latitude !== null && !isNaN(Number(latitude)) ? Number(latitude) : 12.2958;
  const effectiveLng = longitude !== null && !isNaN(Number(longitude)) ? Number(longitude) : 76.6394;
  const hasCoords = latitude !== null && longitude !== null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));

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

  // 2. Initialize and maintain Google Map instance (Map View)
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
        setStreetViewConfirmed(false);
      });

      // Click on map: moves marker to clicked spot immediately
      map.addListener('click', (e: any) => {
        if (disabled || !e.latLng) return;
        const newLat = Number(e.latLng.lat().toFixed(6));
        const newLng = Number(e.latLng.lng().toFixed(6));
        marker.setPosition({ lat: newLat, lng: newLng });
        isInternalMoveRef.current = true;
        onLocationSelect(newLat, newLng, 'MAP_PIN_SELECTED');
        setStreetViewConfirmed(false);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }
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

  // 4. Street View Service: Check coverage & Initialize/Synchronize Panorama
  useEffect(() => {
    if (!mapsLoaded || typeof window === 'undefined' || !window.google?.maps?.StreetViewService) return;

    let isMounted = true;
    setIsCheckingStreetView(true);
    setStreetViewNotice(null);

    const svService = new window.google.maps.StreetViewService();
    const latLng = new window.google.maps.LatLng(effectiveLat, effectiveLng);

    // Check Street View availability within 50m of selected coordinates
    svService.getPanorama(
      {
        location: latLng,
        radius: 50,
        preference: window.google.maps.StreetViewPreference.NEAREST,
        source: window.google.maps.StreetViewSource.DEFAULT,
      },
      (data: any, status: any) => {
        if (!isMounted) return;
        setIsCheckingStreetView(false);

        if (status === window.google.maps.StreetViewStatus.OK && data?.location?.latLng) {
          setHasStreetView(true);
          setStreetViewNotice(null);

          // If Street View container is mounted and active tab is 'street', update or mount panorama
          if (streetViewContainerRef.current) {
            if (!panoramaRef.current) {
              const pano = new window.google.maps.StreetViewPanorama(streetViewContainerRef.current, {
                position: data.location.latLng,
                pov: { heading: 0, pitch: 0 },
                zoom: 1,
                addressControl: true,
                showRoadLabels: true,
                linksControl: true,
                panControl: true,
                zoomControl: true,
                enableCloseButton: false,
                fullscreenControl: false,
                motionTracking: false,
                motionTrackingControl: false,
              });

              // When the seller navigates along the road in Street View, update position and coordinates
              pano.addListener('position_changed', () => {
                const pos = pano.getPosition();
                if (pos) {
                  const pLat = Number(pos.lat().toFixed(6));
                  const pLng = Number(pos.lng().toFixed(6));
                  if (Math.abs(pLat - effectiveLat) > 0.00002 || Math.abs(pLng - effectiveLng) > 0.00002) {
                    isInternalMoveRef.current = true;
                    onLocationSelect(pLat, pLng, 'MAP_PIN_SELECTED');
                  }
                }
              });

              panoramaRef.current = pano;
            } else {
              panoramaRef.current.setPosition(data.location.latLng);
            }
          }
        } else {
          setHasStreetView(false);
          setStreetViewNotice(
            'Google Street View imagery is currently unavailable within 50 metres of these exact coordinates. Street View coverage depends on Google street surveys. Please use Map View and entrance nudge controls to position your entrance pin.'
          );
          if (panoramaRef.current) {
            panoramaRef.current.setVisible(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [mapsLoaded, effectiveLat, effectiveLng, activeTab, onLocationSelect]);

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
    setStreetViewConfirmed(false);
  };

  // Re-center map to current pin
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat: effectiveLat, lng: effectiveLng });
      mapInstanceRef.current.setZoom(18);
    }
  };

  const isPoorAccuracy = Boolean(accuracyMeters && accuracyMeters > 30);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950 ${className}`}>
      {/* View Switcher Bar: Map View vs. Google Street View */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-950 border-b border-white/10 gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-black/60 border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'map'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span>Map View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('street')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'street'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Camera className="h-3.5 w-3.5 text-purple-300" />
            <span>Street View (360° Storefront)</span>
            {hasStreetView === true && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>
        </div>

        {/* Live Coordinate Readout & Accuracy */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 border border-white/15 backdrop-blur-md">
            <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span className="text-[11px] font-bold text-white tracking-wide font-mono">
              {hasCoords ? `${effectiveLat.toFixed(6)}, ${effectiveLng.toFixed(6)}` : 'Select Entrance'}
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

          {/* Location Source / Status Badge */}
          {isPoorAccuracy ? (
            <div className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-[10px] font-bold text-amber-300 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-400" />
              <span>Approx GPS</span>
            </div>
          ) : (
            locationSource && (
              <div
                className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${
                  locationSource === 'GPS_DETECTED'
                    ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    : locationSource === 'ADDRESS_SEARCHED'
                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-300'
                    : 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                }`}
              >
                {locationSource === 'GPS_DETECTED'
                  ? 'GPS Fix'
                  : locationSource === 'ADDRESS_SEARCHED'
                  ? 'Address Match'
                  : 'Entrance Pin Set'}
              </div>
            )
          )}
        </div>
      </div>

      {/* API Key Missing Error Banner */}
      {!googleMapsApiKey && (
        <div className="p-4 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5">
            <Key className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
                Google Maps Platform Configuration Required
              </h4>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                To render the interactive Google Map, draggable shop entrance marker, and Google Street View, configure:
              </p>
              <div className="p-2 rounded bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-400 select-all">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_browser_api_key
              </div>
              <p className="text-[11px] text-white/60">
                Required Google Cloud APIs: <span className="text-white font-medium">Maps JavaScript API</span>,{' '}
                <span className="text-white font-medium">Places API</span>,{' '}
                <span className="text-white font-medium">Geocoding API</span>, and{' '}
                <span className="text-white font-medium">Street View Static API / JavaScript API</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {authError && (
        <div className="p-4 text-center bg-zinc-900/90 text-white space-y-2">
          <AlertTriangle className="h-6 w-6 text-rose-400 mx-auto" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Google Maps API Key Authentication Error
          </h4>
          <p className="text-xs text-white/60 max-w-md mx-auto leading-relaxed">
            Google Maps reported an authentication failure for your configured API key. Please ensure Maps JavaScript API
            is enabled on Google Cloud Console.
          </p>
        </div>
      )}

      {/* VIEW 1: MAP VIEW */}
      <div className={activeTab === 'map' ? 'block' : 'hidden'}>
        <div
          ref={mapContainerRef}
          className="h-72 w-full bg-zinc-900 cursor-crosshair"
          style={{ minHeight: '300px' }}
        />
      </div>

      {/* VIEW 2: GOOGLE STREET VIEW (360° Storefront Confirmation) */}
      <div className={activeTab === 'street' ? 'block' : 'hidden'}>
        {isCheckingStreetView ? (
          <div className="h-72 flex flex-col items-center justify-center p-6 text-center bg-zinc-900 text-white space-y-3">
            <Camera className="h-8 w-8 text-purple-400 animate-pulse" />
            <p className="text-xs font-semibold text-white/80">Checking Google Street View coverage...</p>
            <p className="text-[11px] text-white/40">Querying 360° panoramic road imagery for these coordinates.</p>
          </div>
        ) : hasStreetView === false ? (
          <div className="h-72 flex flex-col items-center justify-center p-6 text-center bg-zinc-900/95 text-white space-y-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Camera className="h-5 w-5" />
            </div>
            <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wide">
              No Street View Imagery Available At This Spot
            </h4>
            <p className="text-xs text-white/60 max-w-md leading-relaxed">
              Google Street View vehicle surveys have not covered this exact road position. Never fear — you can use{' '}
              <span className="text-white font-semibold">Map View</span> with the high-resolution satellite tiles and
              entrance nudge controls below to pinpoint your exact shop entrance.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('map')}
              className="mt-2 text-xs border-white/20 text-white"
            >
              <MapIcon className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Return to Map View
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Street View Storefront Confirmation Top Banner */}
            <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between p-2 rounded-lg bg-black/85 border border-white/15 backdrop-blur-md text-xs text-white gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-semibold">
                <Eye className="h-4 w-4 text-purple-400 shrink-0" />
                <span>Pan 360° to identify your actual storefront, signboard, and customer entrance.</span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="default"
                className={`h-6 text-[10px] px-2.5 font-bold cursor-pointer transition-colors ${
                  streetViewConfirmed
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
                onClick={() => {
                  setStreetViewConfirmed(true);
                  setActiveTab('map');
                }}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {streetViewConfirmed ? 'Storefront Confirmed ✓' : 'Confirm Storefront at this Spot'}
              </Button>
            </div>

            <div
              ref={streetViewContainerRef}
              className="h-72 w-full bg-black"
              style={{ minHeight: '300px' }}
            />
          </div>
        )}
      </div>

      {/* Accuracy Warning Overlay */}
      {isPoorAccuracy && (
        <div className="px-3.5 py-2 bg-amber-500/10 border-t border-amber-500/30 text-[11px] text-amber-300 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              GPS fix is approximate (±{accuracyMeters}m). Please drag the green pin or inspect Street View to confirm your
              exact storefront entrance.
            </span>
          </div>
        </div>
      )}

      {/* Entrance Pin Tuning Toolbar & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-zinc-950 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1 text-[11px] text-white/60">
          <Navigation className="h-3.5 w-3.5 text-blue-400" />
          <span>Shop entrance fine-tuning (~11m):</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Re-center Map Button */}
          {mapsLoaded && activeTab === 'map' && (
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

          {/* Micro-nudge Directional Buttons */}
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

          {/* External Google Street View / Map Link */}
          {hasCoords && (
            <a
              href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${effectiveLat},${effectiveLng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-[10px] font-semibold text-purple-300 transition-colors"
              title="Open 360° Street View in Google Maps"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Full Street View</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
