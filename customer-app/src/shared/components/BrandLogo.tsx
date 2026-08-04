'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { usePlatformLayout } from '@/lib/hooks/usePlatformLayout';

export function BrandLogo() {
  const { branding } = usePlatformLayout();
  return (
    <Link href="/" className="flex items-center gap-2.5 group">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-white/10 shadow-md overflow-hidden">
        {branding?.logo && branding.logo !== '/images/logo.png' ? (
          <img src={branding.logo} alt={branding.marketplaceName} className="h-full w-full object-cover" />
        ) : (
          <ShoppingBag className="h-4.5 w-4.5 text-black" />
        )}
      </div>
      <span className="text-lg font-black tracking-tight text-white">
        {branding?.marketplaceName || 'Marketplace'}
      </span>
    </Link>
  );
}
