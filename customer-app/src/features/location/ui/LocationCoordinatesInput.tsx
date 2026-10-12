'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Crosshair, Loader2, MapPin, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';

export interface LocationCoordinatesInputProps {
  latitude?: number | null | string;
  longitude?: number | null | string;
  onChange: (coords: { latitude: number | null; longitude: number | null }) => void;
  disabled?: boolean;
  className?: string;
  helperText?: string;
}

export function LocationCoordinatesInput({
  latitude,
  longitude,
  onChange,
  disabled = false,
  className = '',
  helperText = 'Optional latitude and longitude coordinates help delivery personnel navigate directly to your destination.',
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

  // Sync internal input state when props change externally
  useEffect(() => {
    const formattedLat = latitude !== null && latitude !== undefined ? String(latitude) : '';
    const formattedLng = longitude !== null && longitude !== undefined ? String(longitude) : '';
    setLatInput(formattedLat);
    setLngInput(formattedLng);
  }, [latitude, longitude]);

  // Validation checks
  const latTrimmed = latInput.trim();
  const lngTrimmed = lngInput.trim();

  let latError: string | null = null;
  let lngError: string | null = null;
  let pairError: string | null = null;

  if (latTrimmed !== '') {
    const num = Number(latTrimmed);
    if (isNaN(num)) {
      latError = 'Latitude must be a valid number.';
    } else if (num < -90 || num > 90) {
      latError = 'Latitude must be between -90 and 90.';
    }
  }

  if (lngTrimmed !== '') {
    const num = Number(lngTrimmed);
    if (isNaN(num)) {
      lngError = 'Longitude must be a valid number.';
    } else if (num < -180 || num > 180) {
      lngError = 'Longitude must be between -180 and 180.';
    }
  }

  if ((latTrimmed !== '' && lngTrimmed === '') || (latTrimmed === '' && lngTrimmed !== '')) {
    pairError = 'Both latitude and longitude must be supplied together, or both left empty.';
  }

  const handleLatChange = (newVal: string) => {
    setLatInput(newVal);
    setGeoError(null);
    setGeoSuccess(null);

    const trimmedLat = newVal.trim();
    const trimmedLng = lngInput.trim();

    if (trimmedLat === '' && trimmedLng === '') {
      onChange({ latitude: null, longitude: null });
      return;
    }

    const nLat = Number(trimmedLat);
    const nLng = Number(trimmedLng);

    if (
      trimmedLat !== '' &&
      trimmedLng !== '' &&
      !isNaN(nLat) &&
      !isNaN(nLng) &&
      nLat >= -90 &&
      nLat <= 90 &&
      nLng >= -180 &&
      nLng <= 180
    ) {
      onChange({ latitude: nLat, longitude: nLng });
    } else {
      onChange({
        latitude: !isNaN(nLat) && trimmedLat !== '' ? nLat : null,
        longitude: !isNaN(nLng) && trimmedLng !== '' ? nLng : null,
      });
    }
  };

  const handleLngChange = (newVal: string) => {
    setLngInput(newVal);
    setGeoError(null);
    setGeoSuccess(null);

    const trimmedLat = latInput.trim();
    const trimmedLng = newVal.trim();

    if (trimmedLat === '' && trimmedLng === '') {
      onChange({ latitude: null, longitude: null });
      return;
    }

    const nLat = Number(trimmedLat);
    const nLng = Number(trimmedLng);

    if (
      trimmedLat !== '' &&
      trimmedLng !== '' &&
      !isNaN(nLat) &&
      !isNaN(nLng) &&
      nLat >= -90 &&
      nLat <= 90 &&
      nLng >= -180 &&
      nLng <= 180
    ) {
      onChange({ latitude: nLat, longitude: nLng });
    } else {
      onChange({
        latitude: !isNaN(nLat) && trimmedLat !== '' ? nLat : null,
        longitude: !isNaN(nLng) && trimmedLng !== '' ? nLng : null,
      });
    }
  };

  const handleUseCurrentLocation = () => {
    setGeoError(null);
    setGeoSuccess(null);

    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoError('Browser geolocation is not supported in this browser. Please enter coordinates manually.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        setLatInput(String(lat));
        setLngInput(String(lng));
        onChange({ latitude: lat, longitude: lng });
        setGeoSuccess('Retrieved current device location. Please review coordinates before saving.');
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Failed to retrieve current location. Please enter coordinates manually.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access in your browser or enter coordinates manually.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable on this device. Please enter coordinates manually.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Location request timed out. Please try again or enter coordinates manually.';
        }
        setGeoError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleClear = () => {
    setLatInput('');
    setLngInput('');
    setGeoError(null);
    setGeoSuccess(null);
    onChange({ latitude: null, longitude: null });
  };

  const hasCoords = latTrimmed !== '' || lngTrimmed !== '';

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-zinc-950/40 p-4 backdrop-blur-md space-y-3.5 ${className}`}
    >
      {/* Header with Title and "Use Current Location" Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-white/5 pb-2.5">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-purple-400 shrink-0" />
            <h4 className="text-xs font-bold text-white tracking-wide uppercase">
              Location Coordinates
            </h4>
          </div>
          <p className="text-[11px] text-white/50">{helperText}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasCoords && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-8 text-[11px] px-2 text-white/50 hover:text-white hover:bg-white/5 cursor-pointer"
              title="Clear coordinates"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              <span>Clear</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseCurrentLocation}
            disabled={disabled || isLocating}
            className="h-8 text-xs bg-zinc-900 border-white/10 hover:bg-zinc-800 text-white cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            {isLocating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
            ) : (
              <Crosshair className="h-3.5 w-3.5 text-purple-400" />
            )}
            <span>{isLocating ? 'Acquiring GPS...' : 'Use Current Location'}</span>
          </Button>
        </div>
      </div>

      {/* Geolocation Status Messages */}
      {geoError && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[11px] text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{geoError}</p>
          </div>
        </div>
      )}

      {geoSuccess && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-[11px] text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <p className="font-medium">{geoSuccess}</p>
        </div>
      )}

      {/* Coordinate Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-white/70 ml-1">
              Latitude <span className="text-white/40 font-normal">(-90 to 90)</span>
            </label>
            {latTrimmed !== '' && !latError && (
              <span className="text-[10px] text-emerald-400 font-mono">Valid</span>
            )}
          </div>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 12.971598"
            value={latInput}
            onChange={(e) => handleLatChange(e.target.value)}
            disabled={disabled}
            error={!!latError || (!!pairError && latTrimmed === '')}
            className="h-9 text-xs font-mono bg-zinc-900 border-white/10 text-white placeholder:text-white/25 focus:border-purple-500/50"
          />
          {latError && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{latError}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-white/70 ml-1">
              Longitude <span className="text-white/40 font-normal">(-180 to 180)</span>
            </label>
            {lngTrimmed !== '' && !lngError && (
              <span className="text-[10px] text-emerald-400 font-mono">Valid</span>
            )}
          </div>
          <Input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 77.594566"
            value={lngInput}
            onChange={(e) => handleLngChange(e.target.value)}
            disabled={disabled}
            error={!!lngError || (!!pairError && lngTrimmed === '')}
            className="h-9 text-xs font-mono bg-zinc-900 border-white/10 text-white placeholder:text-white/25 focus:border-purple-500/50"
          />
          {lngError && <p className="text-[10px] text-red-400 ml-1 mt-0.5">{lngError}</p>}
        </div>
      </div>

      {/* Pair warning */}
      {pairError && (
        <p className="text-[10px] text-amber-400 ml-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{pairError}</span>
        </p>
      )}
    </div>
  );
}
