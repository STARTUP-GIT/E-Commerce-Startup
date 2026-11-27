import React from 'react';
import Link from 'next/link';
import { Compass, LayoutDashboard, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/components/Button';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-xl backdrop-blur-md">
          <Compass className="w-8 h-8 stroke-[1.5]" />
        </div>

        <div className="space-y-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
            404 Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Page not found
          </h1>
          <p className="text-sm text-white/55 leading-relaxed">
            The seller page you are looking for doesn't exist, has been relocated, or is unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="default" className="w-full sm:w-auto gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>Seller Dashboard</span>
            </Button>
          </Link>
          <Link href="/dashboard/products" className="w-full sm:w-auto">
            <Button variant="secondary" className="w-full sm:w-auto gap-2">
              <ArrowLeft className="w-4 h-4" />
              <span>Products</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
