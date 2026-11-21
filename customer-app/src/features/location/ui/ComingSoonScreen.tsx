'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useLocationStore } from '@/lib/store/locationStore';
import { useSiteLayout } from '@/lib/hooks/useSiteLayout';
import { Button } from '@/shared/components/Button';
import { RequestLocationModal } from './RequestLocationModal';
import { AddressSelectorDialog } from '@/components/ui/AddressSelectorDialog';
import {
  MapPin,
  Sparkles,
  ArrowRight,
  Send,
  Compass,
  Store,
  ChevronRight,
  Share2,
  Clock,
  ExternalLink,
} from 'lucide-react';

interface AvailableCity {
  id: string;
  name: string;
  canonicalName: string;
  state: string;
  isCustomerEnabled: boolean;
  isSellerEnabled: boolean;
  isDeliveryEnabled: boolean;
}

export function ComingSoonScreen() {
  const {
    selectedState,
    selectedDistrict,
    serviceabilityDetails,
    setAddressSelectorOpen,
    setRequestModalOpen,
    setLocation,
  } = useLocationStore();

  const { branding } = useSiteLayout();

  // Fetch available cities dynamically from backend
  const { data: availableData, isLoading: isLoadingCities } = useQuery<{
    cities: AvailableCity[];
    totalAvailable: number;
  }>({
    queryKey: ['available-cities'],
    queryFn: async () => {
      const res = await fetch('/api/locations/available-cities');
      if (!res.ok) throw new Error('Failed to load available cities');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableCities = availableData?.cities || [];
  const currentCityDisplay = selectedDistrict || 'Your Location';

  const handleCitySelect = async (city: AvailableCity) => {
    await setLocation(null, city.state, city.canonicalName || city.name, true);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex flex-col justify-between overflow-hidden bg-zinc-950 text-white">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-[450px] h-[450px] bg-purple-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1 flex flex-col items-center justify-center text-center">
        {/* Top Location Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] backdrop-blur-md mb-8 shadow-lg"
        >
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-white/60">Current Location:</span>
          <span className="text-xs font-bold text-white flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-purple-400" />
            {currentCityDisplay}, {selectedState}
          </span>
          <button
            onClick={() => setAddressSelectorOpen(true)}
            className="ml-2 text-[11px] font-bold text-purple-400 hover:text-purple-300 transition-colors underline cursor-pointer"
          >
            Change
          </button>
        </motion.div>

        {/* Hero Illustration or Admin Cloudinary Banner */}
        {serviceabilityDetails?.bannerUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-6 max-w-md w-full rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_40px_rgba(168,85,247,0.25)]"
          >
            <img
              src={serviceabilityDetails.bannerUrl}
              alt={currentCityDisplay}
              className="w-full h-48 sm:h-52 object-cover"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="relative mb-6"
          >
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto flex items-center justify-center">
              {/* Concentric radar rings */}
              <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-ping opacity-25" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-4 rounded-full border border-purple-500/30 animate-pulse" />
              <div className="absolute inset-10 rounded-full bg-gradient-to-tr from-purple-600/20 to-indigo-600/20 backdrop-blur-xl border border-white/10" />

              {/* Custom SVG Illustration */}
              <svg
                className="w-28 h-28 sm:w-32 sm:h-32 text-purple-400 drop-shadow-[0_0_35px_rgba(168,85,247,0.4)]"
                viewBox="0 0 120 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* City skyline silhouettes */}
                <path
                  d="M15 95V75H28V95H34V60H48V95H56V48H72V95H80V68H94V95H105"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <line x1="10" y1="95" x2="110" y2="95" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                
                {/* Animated Map Pin */}
                <g className="animate-bounce" style={{ animationDuration: '2s' }}>
                  <path
                    d="M60 22C48.9543 22 40 30.9543 40 42C40 56.5 60 78 60 78C60 78 80 56.5 80 42C80 30.9543 71.0457 22 60 22Z"
                    fill="url(#pinGradient)"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                  <circle cx="60" cy="42" r="7" fill="#ffffff" />
                </g>

                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="pinGradient" x1="40" y1="22" x2="80" y2="78" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#9333ea" />
                    <stop offset="1" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </motion.div>
        )}

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4"
        >
          Coming soon to your city
        </motion.h1>

        {/* Supporting description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-white/60 max-w-xl mx-auto mb-8 leading-relaxed"
        >
          {serviceabilityDetails?.comingSoonMessage ||
            `AtlasBasket is not yet available in ${currentCityDisplay}, ${selectedState}. We are actively expanding to bring neighborhood craft makers, 3D printing artisans, and lightning-fast local delivery to your door.`}
        </motion.p>

        {/* Notice Message if configured in admin */}
        {serviceabilityDetails?.noticeMessage && (
          <div className="mb-6 px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-medium max-w-md">
            📢 {serviceabilityDetails.noticeMessage}
          </div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mb-14"
        >
          <Button
            variant="default"
            onClick={() => setRequestModalOpen(true)}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(168,85,247,0.3)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            <span>Request Only in your city</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setAddressSelectorOpen(true)}
            className="w-full sm:w-auto px-7 py-3 rounded-2xl border-white/20 bg-white/[0.05] hover:bg-white/[0.1] text-white font-bold text-sm backdrop-blur-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Compass className="h-4 w-4 text-purple-400" />
            <span>Change Location</span>
          </Button>
        </motion.div>

        {/* Dynamic Available Cities Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-3xl pt-8 border-t border-white/10"
        >
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="text-left">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">
                Currently Available Cities
              </h3>
              <p className="text-xs text-white/40">
                Explore local products and creators in our active districts:
              </p>
            </div>
            {availableCities.length > 0 && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                {availableCities.length} Operational
              </span>
            )}
          </div>

          {isLoadingCities ? (
            <div className="flex justify-center py-8">
              <span className="h-6 w-6 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableCities.map((city) => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="group p-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-purple-500/40 text-left transition-all cursor-pointer backdrop-blur-sm flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 transition-colors">
                      <Store className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[10px] text-white/40 group-hover:text-purple-300 flex items-center transition-colors">
                      Shop <ChevronRight className="h-3 w-3 inline" />
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-purple-200 transition-colors">
                      {city.name}
                    </h4>
                    <span className="text-[10px] text-white/40">{city.state}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Social Links & Community */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex flex-col items-center gap-3 text-xs text-white/40"
        >
          <span>Follow our expansion announcements:</span>
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] hover:text-white transition-all text-white/60"
              aria-label="Twitter"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] hover:text-white transition-all text-white/60"
              aria-label="Instagram"
            >
              <svg className="h-4 w-4 fill-none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] hover:text-white transition-all text-white/60"
              aria-label="GitHub"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </a>
          </div>
        </motion.div>
      </div>

      {/* Embed Request Modal and Location Selector */}
      <RequestLocationModal />
      <AddressSelectorDialog />
    </div>
  );
}
