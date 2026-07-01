'use client';

import React, { useState } from 'react';
import { useShopList } from '../hooks/useShopList';
import { shopListService } from '../services/shopListService';
import { Skeleton } from '@/shared/components/Skeleton';
import { Search, MapPin, Navigation, Store, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

import { useConfirmStore } from '@/lib/store/confirmStore';

// ─── Shop Card Skeleton ──────────────────────────────────────────────────────

function ShopCardSkeleton() {
  return (
    <div className="glass-card overflow-hidden animate-pulse">
      {/* Banner */}
      <Skeleton className="h-28 w-full rounded-none rounded-t-[0.875rem]" />
      <div className="p-5 pt-10 relative">
        {/* Avatar */}
        <div className="absolute -top-7 left-5 h-14 w-14 rounded-xl skeleton-glass ring-4 ring-[#080810]" />
        <div className="space-y-2.5 mt-1">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-3 w-1/3 mt-3" />
        </div>
      </div>
    </div>
  );
}

// ─── Shop Card ───────────────────────────────────────────────────────────────

interface ShopCardProps {
  shop: any;
  index: number;
}

function ShopCard({ shop, index }: ShopCardProps) {
  const bgBanner = shop.bannerUrl
    ? `url(${shop.bannerUrl})`
    : shopListService.getPlaceholderBanner(shop.name);

  return (
    <Link
      href={`/shops/${shop.slug || shop.id}`}
      className="block group card-stagger"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="glass-card overflow-hidden h-full glass-hover">
        {/* Banner */}
        <div
          className="h-28 bg-cover bg-center relative overflow-hidden"
          style={{ background: bgBanner }}
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {shop.distance !== undefined && shop.distance !== Infinity && (
            <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full glass text-[10px] font-bold text-white/90">
              <MapPin className="h-3 w-3 text-purple-400" />
              {shopListService.formatDistance(shop.distance)}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5 relative pt-10 flex flex-col h-[calc(100%-112px)] justify-between">
          {/* Logo avatar */}
          <div className="absolute -top-7 left-5 h-14 w-14 rounded-xl ring-4 ring-[#080810] bg-gradient-to-br from-purple-900/80 to-indigo-900/80 glass flex items-center justify-center overflow-hidden">
            {shop.logoUrl ? (
              <img src={shop.logoUrl} alt={shop.name} className="h-full w-full object-cover" />
            ) : (
              <Store className="h-6 w-6 text-white/60" />
            )}
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-white/90 group-hover:text-purple-300 transition-colors line-clamp-1">
              {shop.name}
            </h4>
            <p className="text-xs text-white/45 line-clamp-2 leading-relaxed">
              {shop.description || 'No description provided.'}
            </p>
          </div>

          {shop.defaultPickupAddress && (
            <div className="flex items-center gap-1 text-[11px] text-white/35 font-medium mt-4">
              <MapPin className="h-3 w-3" />
              <span>
                {shop.defaultPickupAddress.city}, {shop.defaultPickupAddress.state}
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function ShopListPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(50);
  const [geoLoading, setGeoLoading] = useState(false);

  const { shops, isLoading, isFetching, isError, error, refetch } = useShopList({
    searchQuery,
    coords,
    radius,
  });

  const showAlert = useConfirmStore((state) => state.showAlert);

  const handleNearbyToggle = () => {
    if (coords) { setCoords(null); return; }
    setGeoLoading(true);
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
          setGeoLoading(false);
        },
        (err) => {
          console.error(err);
          showAlert({
            title: 'Location Access Denied',
            message: 'Could not retrieve your location. Please check your browser permissions.',
          });
          setGeoLoading(false);
        }
      );
    } else {
      showAlert({
        title: 'Not Supported',
        message: 'Geolocation is not supported by your browser.',
      });
      setGeoLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-5 py-8 space-y-8 animate-fade-up">

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div className="glass-card p-8 relative overflow-hidden min-h-[200px] flex flex-col justify-between">
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/15 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

        <div className="relative z-10 space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-sm text-[11px] font-semibold text-purple-300 mb-2">
            <Store className="h-3 w-3" />
            Local Craft Marketplace
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Discover Local Craft Shops
          </h2>
          <p className="text-sm text-white/45 leading-relaxed">
            Support local vendors, explore unique products, and order customized 3D prints from nearby makers.
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mt-6 relative z-10">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              placeholder="Search shops by name or category…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full h-10 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-white/25 outline-none"
            />
            {isFetching && !isLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
            )}
          </div>

          {/* Nearby button */}
          <button
            onClick={handleNearbyToggle}
            disabled={geoLoading}
            className={`flex items-center justify-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-60
              ${coords
                ? 'gradient-btn text-white'
                : 'glass-input text-white/70 hover:text-white/95 hover:border-white/20'
              }`}
          >
            {geoLoading ? (
              <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <Navigation className={`h-4 w-4 ${coords ? 'animate-pulse' : ''}`} />
            )}
            {coords ? 'Viewing Nearby' : 'Find Nearby'}
          </button>

          {/* Radius selector */}
          {coords && (
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="glass-input h-10 px-3 rounded-xl text-sm text-white/70 outline-none cursor-pointer"
            >
              <option value={10}>Within 10 km</option>
              <option value={25}>Within 25 km</option>
              <option value={50}>Within 50 km</option>
              <option value={100}>Within 100 km</option>
            </select>
          )}
        </div>
      </div>

      {/* ── Grid ──────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white/90">
            {coords ? 'Nearby Vendors' : searchQuery ? `Results for "${searchQuery}"` : 'Featured Shops'}
          </h3>
          {shops.length > 0 && (
            <span className="text-xs text-white/35 font-medium">{shops.length} shops</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <ShopCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="glass-card p-12 text-center space-y-4">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400/60" />
            <p className="text-sm font-semibold text-red-400">
              {(error as any)?.response?.data?.message || error?.message || 'Error loading shops.'}
            </p>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg glass-input text-xs font-medium text-white/70 hover:text-white/95 cursor-pointer transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        ) : shops.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {shops.map((shop, index) => (
              <ShopCard key={shop.id} shop={shop} index={index} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-16 text-center space-y-4 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/[0.01] rounded-full blur-[55px] pointer-events-none" />
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/10 mx-auto shadow-sm">
              <Store className="h-7 w-7 text-white/20 animate-pulse" />
            </div>
            <div className="space-y-1 relative z-10">
              <h4 className="text-base font-bold text-white/80">No Vendors Operational Here</h4>
              <p className="text-xs text-white/35 max-w-sm mx-auto leading-relaxed">
                We couldn&apos;t find any active shops in this area matching your preferences. Try selecting another city or widening your query.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
