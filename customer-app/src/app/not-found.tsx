import React from 'react';
import Link from 'next/link';
import { Compass, ArrowLeft, ShoppingBag } from 'lucide-react';
import { Button } from '@/shared/components/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Subtle Icon Treatment */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/70 shadow-xl backdrop-blur-md">
          <Compass className="w-8 h-8 stroke-[1.5]" />
        </div>

        {/* Status & Headings */}
        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-white/10 text-white/80 border border-white/15">
            404 Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Page not found
          </h1>
          <p className="text-sm text-white/55 leading-relaxed">
            The page you're looking for doesn't exist, has been removed, or the link may be broken.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="default" className="w-full sm:w-auto gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
          <Link href="/products" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Browse Products</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
