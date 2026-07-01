'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocationStore } from '@/lib/store/locationStore';
import { Button } from '@/shared/components/Button';
import { Rocket, Bell, X, Check } from 'lucide-react';

export function ComingSoonDialog() {
  const { comingSoonOpen, comingSoonState, comingSoonDistrict, setComingSoon, onChooseAnotherState, onClose } = useLocationStore();
  const [notified, setNotified] = useState(false);

  const handleClose = (chooseAnother = false) => {
    setComingSoon(false);
    setNotified(false);
    if (chooseAnother && onChooseAnotherState) {
      onChooseAnotherState();
    } else if (!chooseAnother && onClose) {
      onClose();
    }
  };

  const handleNotifyMe = () => {
    setNotified(true);
    // Simulate notification registration
    setTimeout(() => {
      handleClose();
    }, 1500);
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
                className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
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
                  className="relative overflow-hidden w-full max-w-[480px] rounded-3xl border border-white/10 bg-zinc-950/70 p-8 text-foreground shadow-2xl backdrop-blur-2xl focus:outline-none"
                >
                  {/* Premium floating background orb */}
                  <div className="absolute -top-[30%] -right-[30%] h-64 w-64 rounded-full bg-purple-500/10 blur-[60px] pointer-events-none" />
                  <div className="absolute -bottom-[30%] -left-[30%] h-64 w-64 rounded-full bg-indigo-500/10 blur-[60px] pointer-events-none" />

                  {/* Close button */}
                  <Dialog.Close asChild>
                    <button
                      className="absolute top-4 right-4 rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>

                  {/* Header/Content */}
                  <div className="flex flex-col items-center text-center">
                    <motion.div
                      animate={{ y: [0, -8, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                      className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/30 mb-6 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                    >
                      <Rocket className="h-8 w-8 text-purple-400" />
                    </motion.div>

                    <Dialog.Title className="text-2xl font-extrabold tracking-tight text-white mb-2">
                      🚀 Service Not Available Yet
                    </Dialog.Title>

                    <Dialog.Description asChild>
                      <div className="text-sm text-white/60 leading-relaxed mb-6 px-2">
                        {comingSoonDistrict ? (
                          <p>
                            We&apos;re already available in <span className="font-bold text-purple-300">{comingSoonState}</span>, but service has not yet started in <span className="font-bold text-purple-300">{comingSoonDistrict}</span>.
                            <br />
                            We&apos;ll be launching there soon.
                            <br />
                            Thank you for your patience.
                          </p>
                        ) : (
                          <p>
                            We haven&apos;t launched in <span className="font-bold text-purple-300">{comingSoonState}</span> yet.
                            <br />
                            We&apos;re actively expanding and will be available there soon.
                            <br />
                            Thank you for your patience.
                          </p>
                        )}
                      </div>
                    </Dialog.Description>

                    {/* Actions */}
                    <div className="flex flex-col gap-3 w-full mt-2">
                      <Button
                        variant="default"
                        onClick={() => handleClose(true)}
                        className="w-full justify-center cursor-pointer"
                      >
                        Choose Another Location
                      </Button>
                      <div className="flex gap-3 w-full">
                        <Button
                          variant="secondary"
                          onClick={() => handleClose(false)}
                          className="w-full justify-center cursor-pointer"
                        >
                          Close
                        </Button>
                        <Button
                          variant={notified ? 'secondary' : 'outline'}
                          onClick={handleNotifyMe}
                          className="w-full justify-center gap-2 cursor-pointer"
                          disabled={notified}
                        >
                          {notified ? (
                            <>
                              <Check className="h-4 w-4 text-emerald-400" />
                              <span>Registered!</span>
                            </>
                          ) : (
                            <>
                              <Bell className="h-4 w-4" />
                              <span>Notify Me</span>
                            </>
                          )}
                        </Button>
                      </div>
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

