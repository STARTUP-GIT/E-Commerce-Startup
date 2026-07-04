'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocationStore } from '@/lib/store/locationStore';
import { Button } from '@/shared/components/Button';
import { MapPin, X, ChevronRight, Check, Plus } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '@/features/auth/profile/api/profileApi';
import { SearchableDropdown } from '@/components/ui/SearchableDropdown';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

export function AddressSelectorDialog() {
  const queryClient = useQueryClient();
  const {
    addressSelectorOpen,
    setAddressSelectorOpen,
    selectedAddressId,
    selectedState,
    selectedDistrict,
    setLocation,
    setComingSoon,
  } = useLocationStore();

  const [customState, setCustomState] = useState('');
  const [customDistrict, setCustomDistrict] = useState('');

  // Fetch customer profile for saved addresses
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.getProfile,
    retry: false,
  });

  // Fetch operational states
  const { data: statesData } = useQuery({
    queryKey: ['location-states'],
    queryFn: profileApi.getLocationsStates,
  });

  // Fetch districts for selected custom state
  const { data: districtsData } = useQuery({
    queryKey: ['location-districts', customState],
    queryFn: () => profileApi.getLocationsDistricts(customState),
    enabled: !!customState,
  });

  const activeStates = statesData?.states || [];
  const allStates = statesData?.allStates || [];

  // Reset custom selectors when dialog opens
  useEffect(() => {
    if (addressSelectorOpen) {
      setCustomState('');
      setCustomDistrict('');
    }
  }, [addressSelectorOpen]);

  const handleClose = () => {
    setAddressSelectorOpen(false);
  };

  const handleSelectAddress = (addr: any) => {
    // Check if the address belongs to an operational location
    const isStateActive = activeStates.some(
      (s) => s.name.toLowerCase() === addr.state.toLowerCase()
    );

    if (!isStateActive) {
      setComingSoon(true, addr.state, addr.city);
      return;
    }

    setLocation(addr.id, addr.state, addr.city);
    
    // Invalidate queries immediately
    queryClient.invalidateQueries({ queryKey: ['shops'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['nearby-shops'] });
    queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    queryClient.invalidateQueries({ queryKey: ['delivery-availability'] });

    handleClose();
  };

  const handleStateChange = (stateName: string) => {
    if (!stateName) return;

    setCustomState(stateName);
    setCustomDistrict('');

    // Check if selected state is active
    const stateObj = allStates.find((s) => s.name === stateName);
    if (stateObj && !stateObj.isEnabled) {
      setComingSoon(true, stateName, undefined, () => {
        setCustomState('');
        setAddressSelectorOpen(true);
      });
      setAddressSelectorOpen(false);
    }
  };

  const handleDistrictChange = (districtName: string) => {
    if (!districtName) return;

    setCustomDistrict(districtName);

    // Check if selected district is active
    const allDistricts = districtsData?.allDistricts || [];
    const districtObj = allDistricts.find((d) => d.name === districtName);

    if (districtObj && !districtObj.isEnabled) {
      setComingSoon(true, customState, districtName, () => {
        setCustomDistrict('');
        setAddressSelectorOpen(true);
      });
      setAddressSelectorOpen(false);
      return;
    }

    // Set custom location
    setLocation(null, customState, districtName);

    // Invalidate queries immediately
    queryClient.invalidateQueries({ queryKey: ['shops'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['nearby-shops'] });
    queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    queryClient.invalidateQueries({ queryKey: ['delivery-availability'] });

    handleClose();
  };

  const { data: session } = useSession();
  const savedAddresses = profile?.user?.addresses || [];

  // Sort so the selected address is always at the top (first card)
  const activeAddr = selectedAddressId ? savedAddresses.find((a: any) => a.id === selectedAddressId) : null;
  const otherAddrs = selectedAddressId ? savedAddresses.filter((a: any) => a.id !== selectedAddressId) : savedAddresses;
  const orderedAddresses = activeAddr ? [activeAddr, ...otherAddrs] : savedAddresses;

  return (
    <AnimatePresence>
      {addressSelectorOpen && (
        <Dialog.Root open={addressSelectorOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 400 }}
                  className="relative overflow-hidden w-full max-w-[500px] rounded-3xl border border-white/10 bg-zinc-950/75 p-6 text-foreground shadow-2xl backdrop-blur-xl focus:outline-none flex flex-col max-h-[85vh]"
                >
                  {/* Subtle Glow */}
                  <div className="absolute -top-[30%] -right-[30%] h-48 w-48 rounded-full bg-white/5 blur-[50px] pointer-events-none" />

                  {/* Close icon */}
                  <Dialog.Close asChild>
                    <button
                      onClick={handleClose}
                      className="absolute top-4 right-4 rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>

                  <Dialog.Title className="text-xl font-bold tracking-tight text-white mb-1 pr-6 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-white/60" />
                    Select Delivery Location
                  </Dialog.Title>
                  <p className="text-xs text-white/40 mb-4">
                    Choose from saved addresses or select custom operational cities.
                  </p>

                  <div className="flex-1 overflow-y-auto space-y-5 pr-1 py-1">
                    {/* Saved Addresses Section */}
                    {orderedAddresses.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                          Saved Addresses
                        </h4>
                        <div className="grid gap-3">
                          {orderedAddresses.map((addr) => {
                            const isSelected = selectedAddressId === addr.id;
                            return (
                              <button
                                key={addr.id}
                                onClick={() => handleSelectAddress(addr)}
                                className={`relative w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col backdrop-blur-md ${
                                  isSelected
                                    ? 'bg-purple-500/12 border-purple-400/40 shadow-[0_0_24px_rgba(168,85,247,0.15)] text-white'
                                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15 text-white/70'
                                }`}
                              >
                                {/* Name and Type */}
                                <div className="flex items-center gap-2 mb-1.5 pr-20">
                                  <span className="text-xs font-black capitalize text-white">
                                    {addr.fullName}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 uppercase tracking-wider font-semibold">
                                    {addr.type}
                                  </span>
                                </div>

                                {/* Checkmark & Default badge */}
                                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                                  {isSelected && (
                                    <div className="h-5 w-5 rounded-full bg-purple-500 flex items-center justify-center shadow-md">
                                      <Check className="h-3 w-3 text-white stroke-[3px]" />
                                    </div>
                                  )}
                                  {addr.isDefault && (
                                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                                      Default Address
                                    </span>
                                  )}
                                </div>

                                {/* Address Details */}
                                <div className="text-[11px] leading-relaxed text-white/50 font-medium space-y-0.5">
                                  <p>{addr.addressLine1}</p>
                                  {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                                  <p>{addr.city}, {addr.state} - <span className="font-bold text-white/80">{addr.postalCode}</span></p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Custom Location Section */}
                    <div className="space-y-3 pt-2 border-t border-white/5">
                      <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                        Or Choose Custom Location
                      </h4>

                      <div className="space-y-3">
                        {/* State Dropdown */}
                        <SearchableDropdown
                          options={allStates}
                          value={customState}
                          onChange={handleStateChange}
                          placeholder="Select State"
                          label="State"
                        />

                        {/* District Dropdown */}
                        {customState && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-1.5"
                          >
                            <SearchableDropdown
                              options={districtsData?.allDistricts || []}
                              value={customDistrict}
                              onChange={handleDistrictChange}
                              placeholder="Select District"
                              label="District / City"
                              isLoading={!districtsData}
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Add New Address */}
                  {session && (
                    <div className="mt-3 pt-2 border-t border-white/5 flex justify-center">
                      <Link
                        href="/profile?tab=addresses&add=true"
                        onClick={handleClose}
                        className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 font-bold transition-colors cursor-pointer py-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add New Address
                      </Link>
                    </div>
                  )}

                  {/* Current Active Location Display */}
                  <div className="mt-2 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-white/40">Current Active:</span>
                    <span className="font-bold text-white flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-white/60" />
                      {selectedDistrict}, {selectedState}
                    </span>
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
