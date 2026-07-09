"use client";

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from './Button';

interface ReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  action: string;
  target: string;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function ReasonModal({
  isOpen,
  onClose,
  title,
  description,
  action,
  target,
  onConfirm,
  isLoading = false,
}: ReasonModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
    }
  }, [isOpen]);

  if (!mounted) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Reason is required.');
      return;
    }
    if (trimmed.length < 5) {
      setError('Reason must be at least 5 characters long.');
      return;
    }
    if (trimmed.length > 500) {
      setError('Reason cannot exceed 500 characters.');
      return;
    }
    onConfirm(trimmed);
  };

  const modalRoot = document.body;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="relative overflow-hidden w-full max-w-[450px] rounded-2xl border border-white/10 bg-zinc-950 p-6 text-foreground shadow-2xl backdrop-blur-2xl focus:outline-none z-10"
          >
            {/* Subtle monochrome accent */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-red-500/50" />

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="absolute top-4 right-4 rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col mt-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-white">
                    {title}
                  </h2>
                  <p className="text-[10px] text-white/40 font-semibold mt-0.5 uppercase tracking-wider">
                    Target: {target}
                  </p>
                </div>
              </div>

              <p className="text-xs text-white/60 leading-relaxed mb-4">
                {description}
              </p>

              <form onSubmit={handleConfirm} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider block">
                    Reason for {action}
                  </label>
                  <textarea
                    rows={4}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      if (error) setError('');
                    }}
                    placeholder={`Provide a reason for performing this ${action.toLowerCase()} action...`}
                    disabled={isLoading}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 bg-white/[0.02] text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 transition-all font-medium resize-none"
                  />
                  <div className="flex justify-between items-center text-[10px] text-white/30 font-semibold">
                    <span>Min 5, Max 500 chars</span>
                    <span className={reason.trim().length > 500 ? 'text-red-400' : ''}>
                      {reason.trim().length}/500
                    </span>
                  </div>
                  {error && (
                    <p className="text-[10px] font-bold text-red-400 mt-1">
                      {error}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="flex-1 justify-center items-center flex text-[11px] h-9 border border-white/10 bg-transparent hover:bg-white/5 text-white/80 transition-all font-semibold rounded-lg cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold h-9 text-[11px]"
                  >
                    Confirm {action}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    modalRoot
  );
}
