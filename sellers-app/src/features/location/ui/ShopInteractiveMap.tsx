'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Compass, RotateCcw, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { Button } from '@/shared/components/Button';

interface ShopInteractiveMapProps {
  latitude: number | null;
  longitude: number | null;
  onLocationSelect: (lat: number, lng: number, source: 'MAP_PIN_SELECTED') => void;
  accuracyMeters?: number | null;
  locationSource?: string;
  disabled?: boolean;
  className?: string;
}

export function ShopInteractiveMap({
  latitude,
  longitude,
  onLocationSelect,
  accuracyMeters,
  locationSource,
  disabled = false,
  className = '',
}: ShopInteractiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const isInternalMoveRef = useRef(false);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Default coordinate (Mysuru / Karnataka center) if none provided
  const effectiveLat = latitude !== null && !isNaN(Number(latitude)) ? Number(latitude) : 12.2958;
  const effectiveLng = longitude !== null && !isNaN(Number(longitude)) ? Number(longitude) : 76.6394;
  const hasCoords = latitude !== null && longitude !== null && !isNaN(Number(latitude)) && !isNaN(Number(longitude));

  // Dynamically load Leaflet CDN assets once in browser
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const loadLeafletScript = async () => {
      try {
        if (!(window as any).L) {
          // Inject CSS
          if (!document.getElementById('leaflet-core-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-core-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
          }

          // Inject JS
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.getElementById('leaflet-core-js') as HTMLScriptElement;
            if (existingScript) {
              if ((window as any).L) return resolve();
              existingScript.addEventListener('load', () => resolve());
              existingScript.addEventListener('error', reject);
              return;
            }
            const script = document.createElement('script');
            script.id = 'leaflet-core-js';
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.async = true;
            script.onload = () => resolve();
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        if (isMounted) {
          setMapLoaded(true);
        }
      } catch (err) {
        console.warn('[ShopInteractiveMap] Leaflet CDN load fallback triggered:', err);
        if (isMounted) setLoadError(true);
      }
    };

    loadLeafletScript();

    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize and maintain map instance
  useEffect(() => {
    if (!mapLoaded || !mapContainerRef.current || typeof window === 'undefined') return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      // Create map
      const map = L.map(mapContainerRef.current, {
        center: [effectiveLat, effectiveLng],
        zoom: hasCoords ? 17 : 14,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // Custom high-visibility Emerald Shop Pin
      const createPinIcon = () =>
        L.divIcon({
          className: 'shop-dispatch-pin',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;cursor:grab;">
              <div style="width:38px;height:38px;border-radius:50%;background:#10b981;border:3px solid #ffffff;box-shadow:0 6px 16px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;color:#ffffff;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div style="position:absolute;bottom:-6px;width:10px;height:10px;background:#10b981;transform:rotate(45deg);border-bottom:2px solid #ffffff;border-right:2px solid #ffffff;"></div>
            </div>
          `,
          iconSize: [38, 44],
          iconAnchor: [19, 44],
        });

      const marker = L.marker([effectiveLat, effectiveLng], {
        draggable: !disabled,
        icon: createPinIcon(),
      }).addTo(map);

      // Marker drag event
      marker.on('dragend', (e: any) => {
        const { lat, lng } = e.target.getLatLng();
        const preciseLat = Number(lat.toFixed(6));
        const preciseLng = Number(lng.toFixed(6));
        isInternalMoveRef.current = true;
        onLocationSelect(preciseLat, preciseLng, 'MAP_PIN_SELECTED');
      });

      // Map click event: moves marker to clicked spot
      map.on('click', (e: any) => {
        if (disabled) return;
        const { lat, lng } = e.latlng;
        const preciseLat = Number(lat.toFixed(6));
        const preciseLng = Number(lng.toFixed(6));
        marker.setLatLng([preciseLat, preciseLng]);
        isInternalMoveRef.current = true;
        onLocationSelect(preciseLat, preciseLng, 'MAP_PIN_SELECTED');
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [mapLoaded]);

  // Handle external coordinate updates (e.g., GPS detected or Address searched)
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;

    if (isInternalMoveRef.current) {
      isInternalMoveRef.current = false;
      return;
    }

    if (hasCoords) {
      markerRef.current.setLatLng([effectiveLat, effectiveLng]);
      mapInstanceRef.current.setView([effectiveLat, effectiveLng], 17, { animate: true });
    }
  }, [effectiveLat, effectiveLng, hasCoords]);

  // Micro-nudge coordinate helpers (~11 meters per step)
  const handleNudge = (dLat: number, dLng: number) => {
    if (disabled) return;
    const newLat = Number((effectiveLat + dLat).toFixed(6));
    const newLng = Number((effectiveLng + dLng).toFixed(6));
    if (markerRef.current && mapInstanceRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      mapInstanceRef.current.panTo([newLat, newLng]);
    }
    isInternalMoveRef.current = true;
    onLocationSelect(newLat, newLng, 'MAP_PIN_SELECTED');
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950 ${className}`}>
      {/* Map Header Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/80 border border-white/15 backdrop-blur-md shadow-lg pointer-events-auto">
          <MapPin className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold text-white tracking-wide">
            {hasCoords ? `${effectiveLat.toFixed(6)}, ${effectiveLng.toFixed(6)}` : 'Click map to place shop entrance pin'}
          </span>
          {accuracyMeters ? (
            <span className="text-[10px] text-white/50 ml-1">±{accuracyMeters}m</span>
          ) : null}
        </div>

        {/* Source Badge */}
        {locationSource && (
          <div className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 pointer-events-auto">
            {locationSource === 'GPS_DETECTED'
              ? 'GPS Fix'
              : locationSource === 'ADDRESS_SEARCHED'
              ? 'Address Match'
              : locationSource === 'MAP_PIN_SELECTED'
              ? 'Pin Adjusted'
              : 'Manual'}
          </div>
        )}
      </div>

      {/* Main Map Viewport */}
      {loadError ? (
        <div className="h-64 flex flex-col items-center justify-center p-4 text-center bg-zinc-900 text-white/50 space-y-2">
          <AlertCircle className="h-6 w-6 text-amber-400" />
          <p className="text-xs text-white/70">Interactive tiles offline. You can fine-tune coordinates using nudge controls below.</p>
        </div>
      ) : (
        <div
          ref={mapContainerRef}
          className="h-64 w-full bg-zinc-900 cursor-crosshair"
          style={{ minHeight: '260px' }}
        />
      )}

      {/* Micro-nudge / Entrance Pin Tuning Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-zinc-950/90 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1 text-[11px] text-white/60">
          <Navigation className="h-3.5 w-3.5 text-blue-400" />
          <span>Click map or drag pin to shop entrance. Micro-adjust (~11m):</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleNudge(0.0001, 0)}
            disabled={disabled}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-colors cursor-pointer"
            title="Nudge North"
          >
            N ↑
          </button>
          <button
            type="button"
            onClick={() => handleNudge(-0.0001, 0)}
            disabled={disabled}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-colors cursor-pointer"
            title="Nudge South"
          >
            S ↓
          </button>
          <button
            type="button"
            onClick={() => handleNudge(0, -0.0001)}
            disabled={disabled}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-colors cursor-pointer"
            title="Nudge West"
          >
            W ←
          </button>
          <button
            type="button"
            onClick={() => handleNudge(0, 0.0001)}
            disabled={disabled}
            className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-bold text-white transition-colors cursor-pointer"
            title="Nudge East"
          >
            E →
          </button>
        </div>
      </div>
    </div>
  );
}
