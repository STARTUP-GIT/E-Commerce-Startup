"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { apiClient } from "@/lib/apiClient";
import { useLocation } from "@/components/location/LocationContext";
import { ComingSoonHero } from "@/components/location/ComingSoonHero";
import {
  ShieldCheck,
  Clock,
  Wallet,
  ArrowRight,
  Sparkles,
  MapPin,
} from "lucide-react";

interface PublicSettings {
  brandName: string;
  brandLogoUrl: string | null;
  brandTagline: string;
  activeCity: string;
  activeCities: string[];
  hero: {
    badge: string;
    line1: string;
    line2: string;
    description: string;
  };
  cards: {
    payout: { show: boolean; value: string; label: string; desc: string };
    city: { show: boolean; value: string; label: string; desc: string };
    fee: { show: boolean; value: string; label: string; desc: string };
    vehicles: { show: boolean; value: string; label: string; desc: string };
  };
}

export default function LandingPage() {
  const { userLocation } = useLocation();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get("/api/delivery/settings/public")
      .then((res) => {
        if (isMounted && res.data?.settings) {
          setSettings(res.data.settings);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const heroBadge = settings?.hero?.badge || "Local Delivery Network";
  const heroHeading1 = settings?.hero?.line1 || "Deliver locally.";
  const heroHeading2 = settings?.hero?.line2 || "Earn directly with every trip.";
  const heroDesc =
    settings?.hero?.description ||
    "Join AtlasBasket Delivery. Deliver orders from top local shops and marketplace sellers in admin-enabled operational districts. Enjoy flexible hours, transparent distance pricing, and fast weekly payouts.";

  const activeCitiesList = settings?.activeCities || [];

  // Configured Stat Cards (controlled by Admin with Toggle On/Off)
  const cardsConfig = settings?.cards;
  const cardsToDisplay = [
    cardsConfig?.payout?.show !== false && {
      key: "payout",
      value: cardsConfig?.payout?.value || "~90%",
      label: cardsConfig?.payout?.label || "Rider Payout",
      desc: cardsConfig?.payout?.desc || "Direct earnings share",
    },
    cardsConfig?.city?.show !== false && {
      key: "city",
      value:
        cardsConfig?.city?.value ||
        (activeCitiesList.length === 1
          ? activeCitiesList[0]
          : activeCitiesList.length > 1
          ? `${activeCitiesList.length} Districts`
          : "0 Districts"),
      label: cardsConfig?.city?.label || "Active Coverage",
      desc:
        cardsConfig?.city?.desc ||
        (activeCitiesList.length > 0
          ? activeCitiesList.slice(0, 3).join(", ")
          : "Admin-enabled zones"),
    },
    cardsConfig?.fee?.show !== false && {
      key: "fee",
      value: cardsConfig?.fee?.value || "₹0 Free",
      label: cardsConfig?.fee?.label || "Registration Fee",
      desc: cardsConfig?.fee?.desc || "No upfront fees",
    },
    cardsConfig?.vehicles?.show !== false && {
      key: "vehicles",
      value: cardsConfig?.vehicles?.value || "Bikes & EVs",
      label: cardsConfig?.vehicles?.label || "Vehicles",
      desc: cardsConfig?.vehicles?.desc || "Bicycles welcome",
    },
  ].filter(Boolean) as Array<{ key: string; value: string; label: string; desc: string }>;

  return (
    <div className="flex flex-col min-h-screen bg-[#07070a] text-zinc-100 overflow-x-hidden">
      <Navbar />

      <main className="flex-1 flex flex-col">
        {userLocation && userLocation.isEligible === false ? (
          <ComingSoonHero activeCities={activeCitiesList} />
        ) : (
          /* Hero Section — Balanced, fluidly scaled, natural document flow */
          <section className="relative overflow-hidden py-10 sm:py-16 md:py-20 lg:py-24">
            {/* Single clean subtle monochrome gradient */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[520px] h-[320px] sm:h-[520px] bg-white/[0.025] blur-[120px] sm:blur-[140px] pointer-events-none rounded-full" />

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 flex flex-col items-center">
              {/* Top Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-[11px] sm:text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                <span className="truncate max-w-[240px] sm:max-w-none">{heroBadge}</span>
              </div>

              {/* Hero Heading with responsive clamp */}
              <h1
                className="mt-4 sm:mt-6 font-bold tracking-tight text-white max-w-3xl mx-auto leading-[1.14]"
                style={{
                  fontSize: "clamp(1.75rem, 4.5vw + 0.5rem, 3.75rem)",
                }}
              >
                <span className="block sm:inline">{heroHeading1}</span>{" "}
                <span className="text-zinc-400 font-medium block sm:inline">
                  {heroHeading2}
                </span>
              </h1>

              {/* Hero Subtitle with controlled line length */}
              <p className="mt-4 sm:mt-5 max-w-xl md:max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-zinc-400 leading-relaxed font-normal px-2">
                {heroDesc}
              </p>

              {/* Registration and Login CTA Buttons */}
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4 w-full max-w-xs sm:max-w-none mx-auto">
                <Link
                  href="/register"
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-xl bg-white text-zinc-950 font-semibold text-xs sm:text-sm hover:bg-zinc-200 transition-colors shadow-sm flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>Register as a Rider</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-6 py-2.5 sm:py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-xs sm:text-sm transition-colors flex items-center justify-center whitespace-nowrap"
                >
                  Rider Sign In
                </Link>
              </div>

              {/* Statistics Cards — Positioned at a natural distance below CTAs */}
              {cardsToDisplay.length > 0 && (
                <div
                  className={`w-full max-w-4xl mx-auto mt-8 sm:mt-12 lg:mt-14 grid gap-3 sm:gap-4 text-left ${
                    cardsToDisplay.length === 1
                      ? "grid-cols-1 max-w-xs"
                      : cardsToDisplay.length === 2
                      ? "grid-cols-1 min-[420px]:grid-cols-2 max-w-lg"
                      : cardsToDisplay.length === 3
                      ? "grid-cols-1 min-[420px]:grid-cols-2 md:grid-cols-3 max-w-3xl"
                      : "grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4"
                  }`}
                >
                  {cardsToDisplay.map((stat) => (
                    <div
                      key={stat.key}
                      className="flex flex-col justify-between p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.025] border border-white/[0.08] backdrop-blur-xl transition-all min-h-[84px] sm:min-h-[96px]"
                    >
                      <div className="text-base sm:text-xl font-bold text-white tracking-tight break-words">
                        {stat.value}
                      </div>
                      <div className="mt-1">
                        <div className="text-xs font-medium text-zinc-300 truncate">
                          {stat.label}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                          {stat.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Operational Overview & Requirements */}
        <section className="py-12 sm:py-16 lg:py-20 border-t border-white/[0.06] bg-white/[0.01]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                Why Deliver with AtlasBasket?
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto px-2">
                Built specifically for local riders and neighborhood merchants in {activeCitiesList.join(", ")}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-6">
              <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-3">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                  <Wallet className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Direct Weekly Payouts</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Earn the majority share on every delivery with zero hidden platform cut. Earnings are disbursed automatically to your registered bank account.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-3">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                  <Clock className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Flexible Shifts</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Toggle Online when you want to deliver, and Go Offline when you are done. No minimum mandatory hours or penalty for logging off.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] space-y-3">
                <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-white">Secure OTP Verification</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Every pickup and drop-off is cryptographically validated with merchant QR and customer OTPs, ensuring accurate delivery credit.
                </p>
              </div>
            </div>

            {/* Active Coverage Zones (Strictly from Admin-Enabled Districts in Database) */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.025] border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Active Operational Zones ({activeCitiesList.length} Enabled Districts)
                </span>
                {activeCitiesList.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {activeCitiesList.map((city) => (
                      <span
                        key={city}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-xs font-medium text-white"
                      >
                        <MapPin className="h-3 w-3 text-zinc-400" />
                        {city}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 pt-1">
                    No districts currently enabled by admin in the database.
                  </p>
                )}
              </div>

              <Link
                href="/register"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors shrink-0 text-center"
              >
                {activeCitiesList.length > 0
                  ? `Apply in ${activeCitiesList[0]}`
                  : "Apply to Deliver"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-6 sm:py-8 bg-[#07070a] text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-semibold text-zinc-300">
              {settings?.brandName || "AtlasBasket Delivery"}
            </span>
            <span>•</span>
            <span>
              {activeCitiesList.length > 0
                ? `${activeCitiesList.join(", ")} Network`
                : "Delivery Network"}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-4">
            <Link href="/terms" className="hover:text-zinc-300 transition-colors">
              Terms & Conditions
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/login" className="hover:text-zinc-300 transition-colors">
              Rider Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
