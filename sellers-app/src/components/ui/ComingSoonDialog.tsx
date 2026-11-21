'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocationStore } from '@/lib/store/locationStore';
import { Button } from '@/shared/components/Button';
import { Rocket, Bell, X, Check, Store, MapPin, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface AvailableCity {
  id: string;
  name: string;
  canonicalName: string;
  state: string;
  isSellerEnabled: boolean;
}

export function ComingSoonDialog() {
  const { comingSoonOpen, comingSoonState, comingSoonDistrict, setComingSoon, onChooseAnotherState, onClose } = useLocationStore();
  const [notified, setNotified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available cities dynamically from backend
  const { data: availableData, isLoading: isLoadingCities } = useQuery<{
    cities: AvailableCity[];
    totalAvailable: number;
  }>({
    queryKey: ['seller-available-cities'],
    queryFn: async () => {
      const res = await fetch('/api/locations/available-cities');
      if (!res.ok) throw new Error('Failed to load available cities');
      return res.json();
    },
    enabled: comingSoonOpen,
    staleTime: 5 * 60 * 1000,
  });

  const availableCities = (availableData?.cities || []).filter((c) => c.isSellerEnabled !== false);

  const handleClose = (chooseAnother = false) => {
    setComingSoon(false);
    setNotified(false);
    setErrorMessage(null);
    if (chooseAnother && onChooseAnotherState) {
      onChooseAnotherState();
    } else if (!chooseAnother && onClose) {
      onClose();
    }
  };

  const handleRequestSellerLaunch = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/locations/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: comingSoonState,
          district: comingSoonDistrict || undefined,
          requestType: 'SELLER',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit seller launch request.');
      }

      setNotified(true);
      setTimeout(() => {
        handleClose(false);
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {comingSoonOpen && (
        <Dialog.Root open={comingSoonOpen} onOpenChange={() => handleClose(false)}>
          <Dialog.Portal forceMount>
            {/* Backdrop with animation */}
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md"
              />
            </Dialog.Overlay>

            {/* Modal wrapper */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 15 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="relative overflow-hidden w-full max-w-[520px] rounded-3xl border border-white/10 bg-zinc-950/90 p-8 text-foreground shadow-2xl backdrop-blur-2xl focus:outline-none max-h-[90vh] overflow-y-auto"
                >
                  {/* Floating background orb */}
                  <div className="absolute -top-[30%] -right-[30%] h-64 w-64 rounded-full bg-purple-500/10 blur-[60px] pointer-events-none" />
                  <div className="absolute -bottom-[30%] -left-[30%] h-64 w-64 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none" />

                  {/* Close button */}
                  <Dialog.Close asChild>
                    <button
                      onClick={() => handleClose(false)}
                      className="absolute top-4 right-4 rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>

                  {/* Header/Content */}
                  <div className="flex flex-col items-center text-center font-sans">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                      className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 mb-5 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                    >
                      <Rocket className="h-8 w-8 text-purple-400" />
                    </motion.div>

                    <Dialog.Title className="text-2xl font-extrabold tracking-tight text-white mb-2">
                      Seller Onboarding Not Available Yet
                    </Dialog.Title>

                    <Dialog.Description asChild>
                      <div className="text-sm text-white/60 leading-relaxed mb-4 px-2">
                        {comingSoonDistrict ? (
                          <p>
                            AtlasBasket is live in <span className="font-bold text-purple-300">{comingSoonState}</span>, but seller onboarding has not yet opened in <span className="font-bold text-purple-300">{comingSoonDistrict}</span>.
                            <br />
                            Submit a request below to expedite seller launch in this region.
                          </p>
                        ) : (
                          <p>
                            We haven&apos;t launched seller operations in <span className="font-bold text-purple-300">{comingSoonState}</span> yet.
                            <br />
                            We&apos;re actively expanding and onboarding makers across new territories.
                          </p>
                        )}
                      </div>
                    </Dialog.Description>

                    {errorMessage && (
                      <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs w-full text-left">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-3 w-full mt-1 mb-6">
                      <Button
                        variant={notified ? 'secondary' : 'default'}
                        onClick={handleRequestSellerLaunch}
                        disabled={isSubmitting || notified}
                        className="w-full justify-center gap-2 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Submitting Request...</span>
                          </>
                        ) : notified ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span>Launch Request Submitted!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            <span>Request Seller Launch in this District</span>
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={() => handleClose(true)}
                        className="w-full justify-center border-white/10 hover:bg-white/[0.05] cursor-pointer"
                      >
                        Choose Another Location
                      </Button>
                    </div>

                    {/* Supported Cities List */}
                    <div className="w-full pt-4 border-t border-white/10 text-left">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-white/50 mb-3 flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-purple-400" />
                        Currently Supported Seller Districts
                      </h4>

                      {isLoadingCities ? (
                        <div className="flex justify-center py-4">
                          <span className="h-5 w-5 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin" />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                          {availableCities.map((city) => (
                            <div
                              key={city.id}
                              className="p-2.5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-semibold text-white block">{city.name}</span>
                                <span className="text-[10px] text-white/40">{city.state}</span>
                              </div>
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                Active
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}
