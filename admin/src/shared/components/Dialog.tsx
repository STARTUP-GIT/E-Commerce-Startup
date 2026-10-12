"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-[520px]',
}: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      {/* Viewport-Aware Dialog Container */}
      <div
        className={`relative w-full ${maxWidth} max-h-[calc(100dvh-2.5rem)] flex flex-col rounded-2xl border border-white/10 bg-[#0c0c10] text-foreground shadow-2xl z-10 animate-fade-up overflow-hidden`}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 pb-3 border-b border-white/5 relative shrink-0 bg-white/[0.01]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute top-4 right-4 rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="space-y-0.5 pr-8">
            <h2 className="text-base font-bold tracking-tight text-white">{title}</h2>
            {description && <p className="text-xs text-white/45">{description}</p>}
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
