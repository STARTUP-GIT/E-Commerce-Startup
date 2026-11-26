'use client';

import React from 'react';
import { useShopAvailability } from '../hooks/useShopAvailability';
import { Badge } from '@/shared/components/Badge';
import { Power, Timer } from 'lucide-react';
import Link from 'next/link';

export function HeaderAvailabilityBadge() {
  const { isOnline, isCountdownActive, countdownText, isLoading } = useShopAvailability();

  if (isLoading) return null;

  return (
    <Link
      href="/dashboard"
      className="hidden sm:flex items-center gap-2 group transition-all"
      title="Shop Availability Status (Click to manage)"
    >
      {isCountdownActive ? (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[11px] font-mono font-bold animate-pulse group-hover:bg-amber-500/20 transition-colors">
          <Timer className="h-3 w-3 text-amber-400" />
          <span>Closing in {countdownText}</span>
        </span>
      ) : isOnline ? (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[11px] font-bold group-hover:bg-emerald-500/20 transition-colors shadow-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Shop Online</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-400 text-[11px] font-bold group-hover:bg-zinc-750 transition-colors">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
          <span>Shop Offline</span>
        </span>
      )}
    </Link>
  );
}
