"use client";

import React from "react";
import { useLocation } from "./LocationContext";
import { MapPin, Crosshair, ChevronDown, CheckCircle2, Clock, ShieldAlert } from "lucide-react";

export function LocationHeaderBar() {
  const { userLocation, openSelectorModal, detectGpsLocation, isDetecting } = useLocation();

  const isEligible = userLocation?.isEligible;
  const isMaintenance = userLocation?.status === "MAINTENANCE";
  const locationLabel =
    userLocation?.serviceArea ||
    userLocation?.town ||
    userLocation?.district ||
    "Select Location";

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        onClick={openSelectorModal}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-zinc-300 hover:text-white transition-all group max-w-[200px] sm:max-w-none"
      >
        <MapPin className="h-3.5 w-3.5 text-zinc-400 group-hover:text-white shrink-0" />
        <span className="truncate max-w-[110px] sm:max-w-[180px] font-medium text-[11px] sm:text-xs">
          {locationLabel}
        </span>

        {userLocation && (
          <span
            className={`hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-medium ${
              isEligible
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : isMaintenance
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
            }`}
          >
            {isEligible ? "Active" : isMaintenance ? "Maintenance" : "Coming Soon"}
          </span>
        )}

        <ChevronDown className="h-3 w-3 text-zinc-500 group-hover:text-zinc-300 shrink-0 ml-0.5" />
      </button>

      {!userLocation?.district && (
        <button
          onClick={detectGpsLocation}
          disabled={isDetecting}
          title="Detect current location"
          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
        >
          <Crosshair className={`h-3.5 w-3.5 ${isDetecting ? "animate-spin" : ""}`} />
        </button>
      )}
    </div>
  );
}
