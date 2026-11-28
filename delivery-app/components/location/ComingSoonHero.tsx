"use client";

import React from "react";
import Link from "next/link";
import { useLocation } from "./LocationContext";
import {
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  Send,
  CheckCircle2,
} from "lucide-react";

interface ComingSoonHeroProps {
  activeCities: string[];
}

export function ComingSoonHero({ activeCities }: ComingSoonHeroProps) {
  const { userLocation, openSelectorModal, openRequestModal, catalogue } = useLocation();

  const isMaintenance = userLocation?.status === "MAINTENANCE";
  const locationName =
    userLocation?.serviceArea ||
    userLocation?.town ||
    userLocation?.district ||
    "Your Location";

  const statusTitle = isMaintenance
    ? `Delivery Service Maintenance in ${locationName}`
    : `AtlasBasket Delivery is Coming Soon to ${locationName}`;

  const statusDesc =
    userLocation?.comingSoonMessage ||
    userLocation?.message ||
    `We are actively working to expand our fast, reliable hyper-local delivery network to ${locationName}. You can request coverage or register early as a delivery partner.`;

  // Get active operational districts from catalogue
  const operationalDistricts = catalogue?.districts?.filter((d) => d.isDeliveryEnabled) || [];

  return (
    <section className="relative overflow-hidden py-10 sm:py-16 md:py-20 lg:py-24">
      {/* Background Subtle Gradient */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[520px] h-[320px] sm:h-[520px] bg-sky-500/[0.03] blur-[120px] sm:blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 flex flex-col items-center">
        {/* Status Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium">
          {isMaintenance ? (
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
          ) : (
            <Clock className="h-4 w-4 text-sky-400 shrink-0" />
          )}
          <span>
            {isMaintenance ? "Scheduled Maintenance" : "Expanding Soon to Your Area"}
          </span>
        </div>

        {/* Location Chip */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 font-mono max-w-full">
            <MapPin className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
            <span className="truncate max-w-[220px] sm:max-w-sm">
              {userLocation?.formattedAddress ||
                `${locationName}${userLocation?.postalCode ? ` - ${userLocation.postalCode}` : ""}`}
            </span>
          </div>
          <button
            type="button"
            onClick={openSelectorModal}
            className="text-xs text-sky-400 hover:text-sky-300 underline underline-offset-4 font-medium transition-colors cursor-pointer"
          >
            Change Location
          </button>
        </div>

        {/* Heading with responsive clamp */}
        <h1
          className="mt-4 sm:mt-6 font-bold tracking-tight text-white max-w-3xl mx-auto leading-[1.14]"
          style={{
            fontSize: "clamp(1.75rem, 4vw + 0.5rem, 3.25rem)",
          }}
        >
          {statusTitle}
        </h1>

        {/* Description with readable line length */}
        <p className="mt-4 sm:mt-5 max-w-xl md:max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-zinc-400 leading-relaxed font-normal px-2">
          {statusDesc}
        </p>

        {/* Action Buttons */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
          <button
            type="button"
            onClick={openRequestModal}
            className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-xl bg-white text-zinc-950 font-semibold text-xs sm:text-sm hover:bg-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Send className="h-3.5 w-3.5 shrink-0" />
            <span>Request Delivery in My Area</span>
          </button>
          <button
            type="button"
            onClick={openSelectorModal}
            className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>Check Another Location</span>
          </button>
          <Link
            href="/register"
            className="w-full sm:w-auto px-5 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>Join Rider Waitlist</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Link>
        </div>

        {/* Operational Zones Directory */}
        <div className="mt-10 sm:mt-14 w-full max-w-3xl mx-auto text-left space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Currently Operational Delivery Districts ({activeCities.length})
            </span>
            <button
              type="button"
              onClick={openSelectorModal}
              className="text-[11px] text-zinc-400 hover:text-white transition-colors text-left cursor-pointer"
            >
              Select an active district →
            </button>
          </div>

          {activeCities.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {operationalDistricts.map((d) => (
                <div
                  key={d.id}
                  onClick={() => openSelectorModal()}
                  className="p-3 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.08] transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">
                      {d.displayName || d.name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1 line-clamp-1">
                    {d.towns.length > 0
                      ? `${d.towns.length} towns (${d.towns.slice(0, 2).map((t) => t.displayName || t.name).join(", ")})`
                      : d.state}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-zinc-500 text-center">
              No delivery districts currently operational. Operations are expanding soon.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
