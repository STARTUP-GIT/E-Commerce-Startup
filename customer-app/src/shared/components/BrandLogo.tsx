'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useBranding } from '@/lib/providers/BrandingProvider';

export function BrandLogo() {
  const { branding } = useBranding();
  const hasLogo = Boolean(branding?.logo && branding.logo.trim() !== '');

  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-white/10 shadow-md overflow-hidden shrink-0">
        {hasLogo ? (
          <img
            src={branding.logo}
            alt={branding.name}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <ShoppingBag className="h-4.5 w-4.5 text-black" />
        )}
      </div>
      <span className="text-lg font-black tracking-tight text-white">
        {branding.name}
      </span>
    </Link>
  );
}
