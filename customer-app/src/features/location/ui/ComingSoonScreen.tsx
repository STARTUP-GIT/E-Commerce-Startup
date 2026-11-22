'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useLocationStore } from '@/lib/store/locationStore';
import { useSiteLayout } from '@/lib/hooks/useSiteLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RequestLocationModal } from './RequestLocationModal';
import { AddressSelectorDialog } from '@/components/ui/AddressSelectorDialog';
import {
  MapPin,
  Sparkles,
  Compass,
  Store,
  ChevronRight,
  Headphones,
  CheckCircle2,
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

  // Fetch operational cities dynamically from authoritative backend
  const { data: availableData, isLoading: isLoadingCities } = useQuery<{
    cities: AvailableCity[];
    totalAvailable: number;
  }>({
    queryKey: ['available-cities-customer'],
    queryFn: async () => {
      const res = await fetch('/api/locations/available-cities?role=CUSTOMER');
      if (!res.ok) throw new Error('Failed to load available cities');
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableCities = availableData?.cities || [];
  const currentCityDisplay = selectedDistrict || 'Your Location';
  const currentStateDisplay = selectedState || 'Karnataka';

  const handleCitySelect = async (city: AvailableCity) => {
    await setLocation(null, city.state, city.canonicalName || city.name, true, city.id);
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full flex flex-col justify-between overflow-hidden bg-background text-foreground">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-20 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 -left-20 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[110px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full flex-1 flex flex-col items-center justify-center text-center">
        {/* Top Location Bar */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-border/60 bg-muted/40 backdrop-blur-md mb-6 shadow-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs text-muted-foreground">Current Location:</span>
          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            {currentCityDisplay}, {currentStateDisplay}
          </span>
          <button
            type="button"
            onClick={() => setAddressSelectorOpen(true)}
            className="ml-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors underline cursor-pointer"
          >
            Change
          </button>
        </motion.div>

        {/* Hero Banner or Refined Icon Badge */}
        {serviceabilityDetails?.bannerUrl ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-6 max-w-md w-full rounded-2xl overflow-hidden border border-border/40 shadow-xl"
          >
            <img
              src={serviceabilityDetails.bannerUrl}
              alt={currentCityDisplay}
              className="w-full h-44 sm:h-52 object-cover"
            />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative mb-6"
          >
            <div className="relative flex items-center justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-primary/20 via-purple-500/10 to-indigo-500/20 border border-primary/30 flex items-center justify-center shadow-[0_0_35px_rgba(168,85,247,0.2)]">
                <MapPin className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-background border border-border shadow-md">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
            </div>
          </motion.div>
        )}

        {/* Status Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-3"
        >
          <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            Expanding Soon
          </Badge>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4"
        >
          Coming soon to your city
        </motion.h1>

        {/* Supporting description */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto mb-6 leading-relaxed"
        >
          {serviceabilityDetails?.comingSoonMessage ||
            `AtlasBasket is not yet available in ${currentCityDisplay}, ${currentStateDisplay}. We are actively expanding to bring neighborhood craft makers, 3D printing artisans, and lightning-fast local delivery to your door.`}
        </motion.p>

        {/* Notice Message if configured in admin */}
        {(serviceabilityDetails?.customerNotice || serviceabilityDetails?.noticeMessage) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mb-6 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-medium max-w-md"
          >
            📢 {serviceabilityDetails.customerNotice || serviceabilityDetails.noticeMessage}
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mb-12"
        >
          <Button
            size="lg"
            onClick={() => setRequestModalOpen(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Request Service in My City</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => setAddressSelectorOpen(true)}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-semibold text-sm border-border/80 bg-background/50 hover:bg-muted transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Compass className="h-4 w-4 text-primary" />
            <span>Change Location</span>
          </Button>
        </motion.div>

        {/* Dynamic Operational Cities Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="w-full max-w-3xl pt-8 border-t border-border/50 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Currently Available Cities
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Explore local products and creators in our active districts:
              </p>
            </div>
            {availableCities.length > 0 && (
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
                {availableCities.length} Operational
              </Badge>
            )}
          </div>

          {isLoadingCities ? (
            <div className="flex justify-center py-8">
              <span className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
            </div>
          ) : availableCities.length === 0 ? (
            <div className="py-6 px-4 rounded-xl border border-dashed border-border/60 text-center text-xs text-muted-foreground">
              No other districts are operational at this moment. We are preparing our launch soon!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {availableCities.map((city) => (
                <Card
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="group relative cursor-pointer border-border/60 bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all shadow-sm rounded-xl"
                >
                  <CardContent className="p-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                        <Store className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {city.name}
                        </h4>
                        <span className="text-xs text-muted-foreground">{city.state}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>

        {/* Support & Community Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="mt-12 flex flex-col items-center gap-3 text-xs text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Headphones className="h-3.5 w-3.5 text-primary" />
            <span>Have questions or need assistance?</span>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  const event = new CustomEvent('open-support-widget');
                  window.dispatchEvent(event);
                }
              }}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              Contact Support
            </button>
          </div>
        </motion.div>
      </div>

      {/* Embed Request Modal and Location Selector */}
      <RequestLocationModal />
      <AddressSelectorDialog />
    </div>
  );
}
