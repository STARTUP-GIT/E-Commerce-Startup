'use client';

import React from 'react';
import { BrandLogo } from '@/shared/components/BrandLogo';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center p-6 bg-background">
      <div className="glass-card p-8 sm:p-10 flex flex-col items-center gap-6 max-w-sm w-full text-center animate-fade-in shadow-2xl">
        <BrandLogo showText={true} />
        <div className="flex items-center gap-3 text-sm font-semibold text-white/60 pt-2">
          <Loader2 className="h-5 w-5 animate-spin text-white" />
          <span>Loading...</span>
        </div>
      </div>
    </div>
  );
}
