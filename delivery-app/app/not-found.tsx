import React from 'react';
import Link from 'next/link';
import { Compass, Bike, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/70 shadow-xl backdrop-blur-md">
          <Compass className="w-8 h-8 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white/10 text-white/80 border border-white/15">
            404 Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Page not found
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            The delivery route or resource you are looking for doesn't exist, has been completed, or is unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500 text-zinc-950 font-semibold text-sm hover:bg-emerald-400 transition-colors w-full sm:w-auto shadow-sm"
          >
            <Bike className="w-4 h-4" />
            <span>Delivery Dashboard</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 text-zinc-200 font-medium text-sm hover:bg-white/15 transition-colors w-full sm:w-auto border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
