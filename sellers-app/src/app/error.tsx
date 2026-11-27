'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, LayoutDashboard, LifeBuoy } from 'lucide-react';
import { Button } from '@/shared/components/Button';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled sellers-app error:', error?.message);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-xl backdrop-blur-md">
          <AlertTriangle className="w-8 h-8 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-red-500/10 text-red-300 border border-red-500/20">
            500 Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Something went wrong
          </h1>
          <p className="text-sm text-white/55 leading-relaxed">
            An unexpected error occurred while loading this seller portal section. Please try again or return to your dashboard.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="default"
            onClick={() => reset()}
            className="w-full sm:w-auto gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </Button>

          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>Seller Dashboard</span>
            </Button>
          </Link>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard/support"
            className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
          >
            <LifeBuoy className="w-3.5 h-3.5" />
            <span>Contact Seller Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
