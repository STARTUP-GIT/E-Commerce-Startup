"use client";

import React from "react";
import Link from "next/link";
import { useLocation } from "./LocationContext";
import {
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Send,
  Building2,
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
    <section className="relative overflow-hidden min-h-[calc(100vh-3.5rem)] min-h-[calc(100dvh-3.5rem)] sm:min-h-[calc(100vh-4rem)] sm:min-h-[calc(100dvh-4rem)] flex flex-col justify-between py-6 sm:py-10 lg:py-14">
      {/* Background Subtle Gradient */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-sky-500/[0.03] blur-[140px] pointer-events-none rounded-full" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 flex flex-col justify-between flex-1 w-full my-auto space-y-6 sm:space-y-8">
        {/* Main Coming Soon Card */}
        <div className="space-y-5 my-auto pt-2 sm:pt-4">
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
          <div className="flex items-center justify-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 font-mono">
              <MapPin className="h-3.5 w-3.5 text-zinc-400" />
              <span>
                {userLocation?.formattedAddress ||
                  `${locationName}${userLocation?.postalCode ? ` - ${userLocation.postalCode}` : ""}`}
              </span>
            </div>
            <button
              onClick={openSelectorModal}
              className="text-xs text-sky-400 hover:text-sky-300 underline underline-offset-4 font-medium transition-colors"
            >
              Change Location
            </button>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            {statusTitle}
          </h1>

          {/* Description */}
          <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-zinc-400 leading-relaxed font-normal px-2">
            {statusDesc}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 pt-2 max-w-[280px] sm:max-w-none mx-auto w-full">
            <button
              onClick={openRequestModal}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs sm:text-sm hover:bg-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Request Delivery in My Area</span>
            </button>
            <button
              onClick={openSelectorModal}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Check Another Location</span>
            </button>
            <Link
              href="/register"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <span>Join Rider Waitlist</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Operational Zones Directory (Authoritative from DB) */}
        <div className="pt-8 pb-4 max-w-3xl mx-auto w-full text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Currently Operational Delivery Districts ({activeCities.length})
            </span>
            <button
              onClick={openSelectorModal}
              className="text-[11px] text-zinc-400 hover:text-white transition-colors"
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
