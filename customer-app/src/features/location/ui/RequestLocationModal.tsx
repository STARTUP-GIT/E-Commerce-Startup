'use client';

import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useLocationStore } from '@/lib/store/locationStore';
import { Button } from '@/shared/components/Button';
import { MapPin, Mail, User, Phone, FileText, CheckCircle2, AlertCircle, Loader2, X, Sparkles } from 'lucide-react';

export function RequestLocationModal() {
  const { requestModalOpen, setRequestModalOpen, selectedDistrict, selectedState } = useLocationStore();
  const { data: session } = useSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      if (session.user.name) setName(session.user.name);
      if (session.user.email) setEmail(session.user.email);
    }
  }, [session]);

  const handleClose = () => {
    setRequestModalOpen(false);
    // Reset state after transition
    setTimeout(() => {
      setSubmitted(false);
      setErrorMessage(null);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address so we can notify you.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/locations/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: selectedState,
          district: selectedDistrict,
          requesterName: name.trim() || undefined,
          requesterEmail: email.trim(),
          requesterPhone: phone.trim() || undefined,
          notes: notes.trim() || undefined,
          requestType: 'CUSTOMER',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit location request.');
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {requestModalOpen && (
        <Dialog.Root open={requestModalOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
              />
            </Dialog.Overlay>

            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <Dialog.Content asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                  className="relative overflow-hidden w-full max-w-[500px] rounded-3xl border border-white/10 bg-zinc-950/90 p-6 text-foreground shadow-2xl backdrop-blur-2xl focus:outline-none"
                >
                  {/* Subtle Background Glow */}
                  <div className="absolute -top-[30%] -right-[30%] h-64 w-64 rounded-full bg-purple-500/15 blur-[70px] pointer-events-none" />

                  {/* Close button */}
                  <Dialog.Close asChild>
                    <button
                      onClick={handleClose}
                      className="absolute top-4 right-4 rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </Dialog.Close>

                  {submitted ? (
                    <div className="flex flex-col items-center text-center py-6">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mb-5 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <Dialog.Title className="text-2xl font-black text-white mb-2">
                        Request Received!
                      </Dialog.Title>
                      <p className="text-sm text-white/70 max-w-sm mb-6 leading-relaxed">
                        Thank you for your interest! We have added <span className="font-bold text-white">{selectedDistrict}, {selectedState}</span> to our priority expansion list. We will send an email update to <span className="font-semibold text-purple-300">{email}</span> as soon as we launch.
                      </p>
                      <Button
                        variant="default"
                        onClick={handleClose}
                        className="min-w-[160px] cursor-pointer"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <Dialog.Title className="text-xl font-black text-white">
                          Request AtlasBasket in Your City
                        </Dialog.Title>
                      </div>

                      <p className="text-xs text-white/60 mb-5">
                        Tell us where you are located. We use customer requests to determine which cities to expand to next!
                      </p>

                      {errorMessage && (
                        <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Target City & State Badge */}
                        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <MapPin className="h-4 w-4 text-purple-400" />
                            <span className="text-white/60">Target Location:</span>
                            <span className="font-bold text-white">
                              {selectedDistrict}, {selectedState}
                            </span>
                          </div>
                        </div>

                        {/* Name */}
                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Your Name (Optional)
                          </label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                            <input
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="e.g. John Doe"
                              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 pl-9 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Email */}
                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Email Address <span className="text-red-400">*</span>
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 pl-9 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Phone Number (Optional)
                          </label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="+91 98765 43210"
                              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 pl-9 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Specific Area / Notes */}
                        <div>
                          <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1">
                            Neighborhood or PIN Code (Optional)
                          </label>
                          <div className="relative">
                            <FileText className="absolute left-3 top-3 h-4 w-4 text-white/30" />
                            <textarea
                              rows={2}
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="e.g. Near City Center, PIN: 570001"
                              className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 pl-9 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
                            />
                          </div>
                        </div>

                        <div className="pt-2 flex gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleClose}
                            className="flex-1 cursor-pointer"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 justify-center gap-2 cursor-pointer bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Submitting...</span>
                              </>
                            ) : (
                              <span>Submit Request</span>
                            )}
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </AnimatePresence>
  );
}
