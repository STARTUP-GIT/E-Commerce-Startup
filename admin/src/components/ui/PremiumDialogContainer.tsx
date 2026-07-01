"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useConfirmStore } from '@/lib/store/confirmStore';
import { AlertCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';

export function PremiumDialogContainer() {
  const {
    isOpen,
    title,
    message,
    confirmText,
    cancelText,
    isAlertOnly,
    onConfirm,
    onCancel,
    close,
  } = useConfirmStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const handleConfirm = () => {
    close();
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    close();
    if (onCancel) onCancel();
  };

  const getIcon = () => {
    if (isAlertOnly) {
      if (title.toLowerCase().includes('success') || message.toLowerCase().includes('success') || message.toLowerCase().includes('added')) {
        return <CheckCircle2 className="h-6 w-6 text-white" />;
      }
      return <AlertCircle className="h-6 w-6 text-white/80" />;
    }
    return <HelpCircle className="h-6 w-6 text-white/80" />;
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
            onClick={handleCancel}
            className="fixed inset-0 bg-black/85 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="relative overflow-hidden w-full max-w-[400px] rounded-2xl border border-white/10 bg-zinc-950 p-6 text-foreground shadow-2xl backdrop-blur-2xl focus:outline-none z-10"
          >
            {/* Subtle monochrome accent */}
            <div className="absolute top-0 left-0 w-full h-[3px] bg-white/20" />

            {/* Close button */}
            <button
              onClick={handleCancel}
              className="absolute top-4 right-4 rounded-full p-2 text-white/40 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col items-center text-center mt-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/10 mb-4">
                {getIcon()}
              </div>

              <h2 className="text-lg font-bold tracking-tight text-white mb-2">
                {title}
              </h2>

              <p className="text-xs text-white/60 leading-relaxed mb-6 px-1 whitespace-pre-wrap">
                {message}
              </p>

              {/* Actions */}
              <div className="flex gap-2 w-full">
                {!isAlertOnly && (
                  <button
                    onClick={handleCancel}
                    className="flex-1 justify-center items-center flex text-[11px] h-9 border border-white/10 bg-transparent hover:bg-white/5 text-white/80 transition-all font-semibold rounded-lg cursor-pointer"
                  >
                    {cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className="flex-1 justify-center items-center flex text-[11px] h-9 bg-white hover:bg-zinc-200 text-black transition-all font-bold rounded-lg cursor-pointer"
                >
                  {confirmText || 'OK'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    modalRoot
  );
}
