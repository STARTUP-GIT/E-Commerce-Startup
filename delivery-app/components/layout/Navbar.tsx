"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Truck,
  LogOut,
  User,
  Menu,
  X,
  Power,
  ChevronRight,
  Crosshair,
  LogIn,
  UserPlus,
} from "lucide-react";
import { apiClient } from "@/lib/apiClient";
import { LocationHeaderBar } from "@/components/location/LocationHeaderBar";
import { useLocation } from "@/components/location/LocationContext";

interface NavbarProps {
  rider?: any;
  onAvailabilityToggle?: (isOnline: boolean) => void;
}

export function Navbar({ rider, onAvailabilityToggle }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const { userLocation, detectGpsLocation, isDetecting } = useLocation();

  // Synced branding from Admin & Database-enabled operational districts
  const [branding, setBranding] = useState<{
    brandName: string;
    brandLogoUrl: string | null;
    brandTagline: string;
    activeCities: string[];
  }>({
    brandName: "AtlasBasket Delivery",
    brandLogoUrl: null,
    brandTagline: "Local Delivery Fleet",
    activeCities: [],
  });
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .get("/api/delivery/settings/public")
      .then((res) => {
        if (isMounted && res.data?.settings) {
          const s = res.data.settings;
          setBranding({
            brandName: s.brandName || "AtlasBasket Delivery",
            brandLogoUrl: s.brandLogoUrl || null,
            brandTagline: s.brandTagline || "Local Delivery Fleet",
            activeCities: s.activeCities || [],
          });
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiClient.post("/api/delivery/auth/logout");
    } catch {}
    localStorage.removeItem("delivery_partner_token");
    localStorage.removeItem("delivery_partner_rider");
    router.push("/login");
  };

  const handleToggle = async () => {
    if (!rider || isToggling) return;
    setIsToggling(true);
    try {
      const nextState = !rider.isAvailable;
      const res = await apiClient.post("/api/delivery/availability", {
        isAvailable: nextState,
      });
      if (res.data?.success && onAvailabilityToggle) {
        onAvailabilityToggle(nextState);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Failed to toggle status");
    } finally {
      setIsToggling(false);
    }
  };

  const navLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Offers", href: "/offers" },
    { label: "Earnings", href: "/earnings" },
    { label: "History", href: "/history" },
    { label: "Support", href: "/support" },
  ];

  const hasValidLogo = Boolean(!logoError && branding.brandLogoUrl && branding.brandLogoUrl.trim() !== "");

  return (
    <header className="sticky top-0 z-50 w-full bg-[#07070a]/95 backdrop-blur-md border-b border-white/[0.08]">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        {/* Left: Brand Logo & Title */}
        <Link
          href={rider ? "/dashboard" : "/"}
          className="flex items-center gap-1.5 sm:gap-2.5 group shrink min-w-0"
        >
          {hasValidLogo ? (
            <img
              src={branding.brandLogoUrl!}
              alt={branding.brandName}
              className="h-7 w-7 sm:h-8 sm:w-8 object-contain rounded-lg shrink-0"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0">
              <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs sm:text-sm tracking-tight text-white group-hover:text-white/90 transition-colors truncate max-w-[100px] min-[360px]:max-w-[130px] sm:max-w-none">
                {branding.brandName}
              </span>
              {!branding.brandName.toLowerCase().includes("delivery") && (
                <span className="hidden md:inline-flex text-[9px] sm:text-[10px] font-medium text-white/50 px-1.5 py-0.5 rounded border border-white/10 bg-white/[0.03] shrink-0">
                  Delivery
                </span>
              )}
            </div>
            <span className="hidden md:block text-[10px] text-white/40 font-mono -mt-0.5 truncate">
              {branding.activeCities.length > 0
                ? `${branding.activeCities.slice(0, 2).join(", ")}${
                    branding.activeCities.length > 2 ? ` +${branding.activeCities.length - 2}` : ""
                  } Delivery`
                : "Delivery Network"}
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Links (Authenticated) */}
        {rider && (
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Location Selector (Always visible, responsive chip width) */}
          <LocationHeaderBar />

          {rider ? (
            /* Authenticated Rider Controls */
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={handleToggle}
                disabled={isToggling}
                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  rider.isAvailable
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                }`}
              >
                <Power className={`h-3.5 w-3.5 ${isToggling ? "animate-spin" : ""}`} />
                <span>{rider.isAvailable ? "Online" : "Offline"}</span>
              </button>

              <Link
                href="/profile"
                className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors"
                title="Profile"
              >
                <User className="h-4 w-4" />
              </Link>

              <button
                onClick={handleLogout}
                className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          ) : (
            /* Visitor / Landing Controls */
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Login link (Directly visible on >= sm, moved to mobile menu on < sm) */}
              <Link
                href="/login"
                className="hidden sm:inline-flex px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 hover:text-white transition-colors whitespace-nowrap"
              >
                Log In
              </Link>

              {/* Become a Rider CTA button (Always accessible) */}
              <Link
                href="/register"
                className="px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-white text-zinc-950 font-semibold text-xs hover:bg-zinc-200 transition-colors shadow-sm whitespace-nowrap shrink-0 flex items-center justify-center"
              >
                <span className="hidden min-[380px]:inline">Become a Rider</span>
                <span className="min-[380px]:hidden">Join</span>
              </Link>

              {/* Compact Mobile Menu Toggle (< sm) */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 transition-colors shrink-0"
                aria-label="Open mobile menu"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Menu (For both authenticated riders and visitors) */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-[#07070a]/95 backdrop-blur-xl px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          {rider ? (
            <>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={handleToggle}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 text-white/80"
                >
                  <Power className="h-4 w-4" />
                  <span>{rider.isAvailable ? "Set Status: Offline" : "Set Status: Online"}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-1.5 pt-1">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-zinc-400" />
                  <span>Rider Sign In</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
              </Link>

              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium bg-white text-zinc-950 font-semibold transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-zinc-950" />
                  <span>Register as a Rider</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-zinc-900" />
              </Link>

              {!userLocation?.district && (
                <button
                  type="button"
                  onClick={() => {
                    detectGpsLocation();
                    setMobileMenuOpen(false);
                  }}
                  disabled={isDetecting}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 text-left"
                >
                  <Crosshair className={`h-3.5 w-3.5 ${isDetecting ? "animate-spin" : ""}`} />
                  <span>Detect GPS Location</span>
                </button>
              )}

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-500 px-1">
                <Link
                  href="/terms"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-zinc-300"
                >
                  Terms
                </Link>
                <span>•</span>
                <Link
                  href="/privacy"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-zinc-300"
                >
                  Privacy
                </Link>
                <span>•</span>
                <Link
                  href="/support"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:text-zinc-300"
                >
                  Support
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
