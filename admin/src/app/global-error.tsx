'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, LayoutDashboard } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin global error:', error?.message);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-4 antialiased selection:bg-white/20 selection:text-white">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shadow-xl">
            <AlertTriangle className="w-8 h-8 stroke-[1.5]" />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-red-500/10 text-red-300 border border-red-500/20">
              System Error
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Something went wrong
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">
              A critical failure prevented the administrative interface from initializing. Please reload or return to dashboard.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors w-full sm:w-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 text-zinc-200 font-medium text-sm hover:bg-white/15 transition-colors w-full sm:w-auto border border-white/10"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
