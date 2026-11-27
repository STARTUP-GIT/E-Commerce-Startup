'use client';

import React, { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Wrench, RefreshCw, LayoutDashboard, Clock } from 'lucide-react';

function MaintenanceContent() {
  const searchParams = useSearchParams();
  const until = searchParams?.get('until');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-xl backdrop-blur-md">
          <Wrench className="w-8 h-8 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
            Console Maintenance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Under Maintenance
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The Admin Management Console is currently undergoing maintenance. Essential background jobs remain operational.
          </p>
        </div>

        {until && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/70">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Expected completion: {decodeURIComponent(until)}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors w-full sm:w-auto shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Check Status</span>
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
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    }>
      <MaintenanceContent />
    </Suspense>
  );
}
