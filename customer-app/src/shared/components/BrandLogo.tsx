'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useBranding } from '@/lib/providers/BrandingProvider';

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  logoSizeClassName?: string;
}

export function BrandLogo({
  className = '',
  showText = true,
  textClassName = 'text-lg sm:text-xl font-black tracking-tight text-white',
  logoSizeClassName = 'h-8 w-8 sm:h-9 sm:w-9',
}: BrandLogoProps) {
  const { branding } = useBranding();
  const [imageError, setImageError] = useState(false);

  const logoUrl = branding?.logo || branding?.logoUrl;

  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  const hasValidLogo = Boolean(!imageError && logoUrl && logoUrl.trim() !== '');

  return (
    <Link href="/" className={`flex items-center gap-2.5 sm:gap-3 group shrink-0 ${className}`}>
      <div className={`flex ${logoSizeClassName} items-center justify-center rounded-xl bg-white border border-white/10 shadow-md overflow-hidden shrink-0`}>
        {hasValidLogo ? (
          <img
            src={logoUrl}
            alt={branding?.name || 'Brand Logo'}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <ShoppingBag className="h-4.5 w-4.5 text-black" />
        )}
      </div>
      {showText && (
        <span className={textClassName}>
          {branding?.name || 'Marketplace'}
        </span>
      )}
    </Link>
  );
}

