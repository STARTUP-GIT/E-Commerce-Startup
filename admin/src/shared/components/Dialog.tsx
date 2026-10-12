"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-[560px]',
  closeOnBackdrop = true,
  closeOnEscape = true,
}: DialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock background scrolling while modal is open; restore on unmount or close
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    // Prevent layout shift from scrollbar disappearing
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, [isOpen]);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Fixed Backdrop */}
      <div
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
        aria-hidden="true"
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Centered, Viewport-Aware Dialog Container */}
      <div
        className={`relative w-full ${maxWidth} my-auto flex flex-col rounded-2xl border border-white/10 bg-[#0c0c10] text-foreground shadow-2xl z-10 max-h-[calc(100dvh-2rem)] overflow-hidden animate-in zoom-in-95 fade-in-0 duration-200`}
      >
        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Fixed Header */}
        <div className="px-5 py-4 sm:px-6 sm:py-4.5 border-b border-white/10 relative shrink-0 bg-white/[0.02] flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1 pr-2">
            {typeof title === 'string' ? (
              <h2 className="text-base font-bold tracking-tight text-white truncate">{title}</h2>
            ) : (
              title
            )}
            {description && (
              <div className="text-xs text-white/50 leading-relaxed">{description}</div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0 -mr-1 -mt-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 min-h-0 overscroll-contain">
          {children}
        </div>

        {/* Sticky/Fixed Footer (if provided) */}
        {footer && (
          <div className="px-5 py-3.5 sm:px-6 border-t border-white/10 shrink-0 bg-[#0c0c10]/95 backdrop-blur-sm flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  closeOnBackdrop?: boolean;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-xl',
  closeOnBackdrop = true,
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex justify-end"
    >
      {/* Backdrop */}
      <div
        onClick={() => {
          if (closeOnBackdrop) onClose();
        }}
        aria-hidden="true"
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200"
      />

      {/* Slide-over Container */}
      <div
        className={`relative w-full ${maxWidth} bg-[#0c0c10] border-l border-white/10 h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-right-full duration-200 overflow-hidden`}
      >
        {/* Fixed Header */}
        <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="space-y-0.5 min-w-0 pr-4">
            {typeof title === 'string' ? (
              <h3 className="text-base font-bold text-white tracking-tight truncate">{title}</h3>
            ) : (
              title
            )}
            {subtitle && (
              <div className="text-xs text-white/50">{subtitle}</div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Drawer Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 min-h-0 overscroll-contain">
          {children}
        </div>

        {/* Sticky/Fixed Footer (if provided) */}
        {footer && (
          <div className="p-4 border-t border-white/10 shrink-0 bg-[#0c0c10]/95 backdrop-blur-sm flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
