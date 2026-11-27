import React from 'react';
import Link from 'next/link';
import { ShieldAlert, LayoutDashboard, ArrowLeft } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shadow-xl backdrop-blur-md">
          <ShieldAlert className="w-8 h-8 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
            403 Access Denied
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Access Denied
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            You don't have permission to access this administrative resource or execute this operation. Your session has not been terminated.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white text-zinc-950 font-medium text-sm hover:bg-zinc-200 transition-colors w-full sm:w-auto shadow-sm"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Admin Dashboard</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-white/10 text-zinc-200 font-medium text-sm hover:bg-white/15 transition-colors w-full sm:w-auto border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Safety</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
