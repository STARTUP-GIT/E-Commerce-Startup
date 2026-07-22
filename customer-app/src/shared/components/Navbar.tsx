'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useUIStore } from '@/lib/store/uiStore';
import { ShoppingBag, ShoppingCart, Bell, User, LayoutDashboard, LogOut, Store, Menu, X, MapPin } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { shopListApi } from '@/features/shops/shop-list/api/shopListApi';
import { useLocationStore } from '@/lib/store/locationStore';

// ─── Shop Names Marquee ───────────────────────────────────────────────────────

function ShopMarquee() {
  const { data, isLoading } = useQuery({
    queryKey: ['shops', { searchQuery: undefined, coords: null, radius: 50 }],
    queryFn: () => shopListApi.getFeaturedShops(24),
    staleTime: 5 * 60 * 1000,
  });
  const shops = data?.shops || [];

  if (isLoading) {
    return (
      <div className="border-t border-white/[0.06] bg-white/[0.015] py-2 px-6 flex gap-6 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton-glass h-3 rounded-full flex-shrink-0" style={{ width: `${56 + i * 14}px` }} />
        ))}
      </div>
    );
  }
  if (!shops.length) return null;

  const doubled = [...shops, ...shops];
  return (
    <div className="border-t border-white/[0.06] bg-white/[0.015] py-1.5 overflow-hidden marquee-container">
      <div className="marquee-track flex items-center gap-0.5">
        {doubled.map((shop, i) => (
          <Link
            key={`${shop.id}-${i}`}
            href={`/shops/${shop.slug || shop.id}`}
            className="flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-medium text-white/40 hover:text-white hover:bg-white/[0.06] transition-all whitespace-nowrap group"
          >
            <Store className="h-2.5 w-2.5 text-white/25 group-hover:text-white/70 transition-colors" />
            {shop.name}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export function Navbar() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const setCartOpen = useUIStore((state) => state.setCartOpen);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const getDropdownStyle = (): React.CSSProperties => {
    if (!triggerRef.current) return { right: 8, top: 56 };
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      position: 'fixed' as const,
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    };
  };

  const {
    selectedState,
    selectedDistrict,
    selectedAddressId,
    setLocation,
    setAddressSelectorOpen,
  } = useLocationStore();

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await axiosInstance.get('/api/auth/profile')).data,
    enabled: !!session,
  });

  // Load default address from profile if not set yet
  useEffect(() => {
    if (session && profile?.user?.addresses?.length) {
      const defaultAddr = profile.user.addresses.find((a: any) => a.isDefault) || profile.user.addresses[0];
      if (defaultAddr && !selectedAddressId) {
        setLocation(defaultAddr.id, defaultAddr.state, defaultAddr.city);
      }
    }
  }, [session, profile, selectedAddressId, setLocation]);

  // Invalidate queries when location changes
  useEffect(() => {
    if (selectedDistrict && selectedState) {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['featured-shops'] });
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      queryClient.invalidateQueries({ queryKey: ['nearby-shops'] });
    }
  }, [selectedDistrict, selectedState, queryClient]);

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => (await axiosInstance.get('/api/cart')).data,
    enabled: !!session,
    staleTime: 60_000,
  });
  const cartCount = cartData?.cart?.items?.reduce((a: number, i: any) => a + i.quantity, 0) || 0;

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await axiosInstance.get('/api/notifications')).data,
    enabled: !!session,
    staleTime: 2 * 60_000,
  });
  const unreadCount = notifData?.notifications?.filter((n: any) => !n.isRead).length || 0;

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/categories', label: 'Categories' },
    { href: '/shops', label: 'Shops' },
    { href: '/products', label: 'Products' },
    { href: '/orders', label: 'Orders' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* Main bar */}
      <div className="glass border-b border-white/[0.08] backdrop-blur-xl bg-black/60">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">

          {/* Logo + Location */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-white">
                <ShoppingBag className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-black" />
              </div>
              <span className="text-lg sm:text-xl font-black tracking-tight text-white hidden xs:inline">Aura</span>
            </Link>

            {/* Location selector - hidden on very small screens, shown as icon-only */}
            {(() => {
              const activeAddress = profile?.user?.addresses?.find((a: any) => a.id === selectedAddressId) || 
                                    profile?.user?.addresses?.find((a: any) => a.isDefault) || 
                                    profile?.user?.addresses?.[0];
              return (
                <button
                  onClick={() => setAddressSelectorOpen(true)}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/15 text-[9px] sm:text-[10px] lg:text-xs font-bold text-white/80 transition-all cursor-pointer shadow-sm select-none text-left max-w-[160px] xs:max-w-[200px] sm:max-w-none"
                >
                  <div className="flex flex-col min-w-0 leading-tight">
                    <span className="hidden xs:flex text-[9px] sm:text-[10px] text-white/45 font-medium truncate max-w-[120px] sm:max-w-[150px] items-center gap-1">
                      <span>📍</span>
                      <span className="truncate">{activeAddress ? activeAddress.fullName : (session?.user?.name || 'Guest')}</span>
                    </span>
                    <span className="text-[10px] sm:text-[11px] text-white/90 truncate max-w-[130px] xs:max-w-[160px] sm:max-w-[185px] font-extrabold mt-0.5">
                      {activeAddress
                        ? `${activeAddress.city}, ${activeAddress.state}`
                        : `${selectedDistrict || 'Select'}, ${selectedState || 'Location'}`}
                    </span>
                  </div>
                  <span className="text-[7px] sm:text-[8px] text-white/30 ml-0.5 align-middle shrink-0">▼</span>
                </button>
              );
            })()}
          </div>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/55 hover:text-white hover:bg-white/[0.07] transition-all duration-150"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5">
            {session ? (
              <>
                {/* Bell */}
                <Link href="/notifications" className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/[0.07] transition-all">
                  <Bell className="h-4.5 w-4.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-black text-black">
                      {unreadCount}
                    </span>
                  )}
                </Link>

                {/* Cart */}
                <button
                  onClick={() => setCartOpen(true)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
                >
                  <ShoppingCart className="h-4.5 w-4.5" />
                  {cartCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-black text-black">
                      {cartCount}
                    </span>
                  )}
                </button>

                {/* User Dropdown */}
                <div className="relative ml-1 pl-2 border-l border-white/[0.08]">
                  <button
                    ref={(el) => { triggerRef.current = el; }}
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.07] transition-all cursor-pointer"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full overflow-hidden ring-1 ring-white/20 bg-white/10">
                      {session.user?.image
                        ? <img src={session.user.image} alt="" className="h-full w-full object-cover" />
                        : <User className="h-3.5 w-3.5 text-white/80" />
                      }
                    </div>
                    <span className="hidden sm:inline text-xs font-semibold text-white/75 max-w-[90px] truncate">
                      {session.user?.name || 'Account'}
                    </span>
                  </button>

                  {menuOpen && typeof window !== 'undefined' && createPortal(
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={() => setMenuOpen(false)} />
                      <div className="fixed z-[9999] w-52 glass-card p-1.5 animate-in fade-in slide-in-from-top-1 duration-100"
                        style={getDropdownStyle()}>
                        <div className="px-3 py-2.5 border-b border-white/[0.07] mb-1">
                          <p className="text-xs font-bold text-white truncate">{session.user?.name}</p>
                          <p className="text-[10px] text-white/40 truncate mt-0.5">{session.user?.email}</p>
                        </div>
                        {[
                          { href: '/profile', icon: User, label: 'My Profile' },
                          { href: '/orders', icon: LayoutDashboard, label: 'My Orders' },
                          { href: '/wishlist', icon: ShoppingCart, label: 'My Wishlist' },
                        ].map(({ href, icon: Icon, label }) => (
                          <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.06] rounded-lg transition-all">
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                          </Link>
                        ))}
                        <div className="border-t border-white/[0.07] mt-1 pt-1">
                          <button onClick={() => { setMenuOpen(false); signOut(); }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer text-left">
                            <LogOut className="h-3.5 w-3.5" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <button className="h-9 px-4 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer">
                    Sign In
                  </button>
                </Link>
                <Link href="/signup">
                  <button className="h-9 px-4 rounded-xl text-sm font-bold btn-primary cursor-pointer">
                    Sign Up
                  </button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden flex h-9 w-9 items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer ml-1"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden border-t border-white/[0.08] bg-black/80 backdrop-blur-xl px-4 py-3 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150">
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMobileNavOpen(false)}
                className="flex items-center px-4 py-3 rounded-xl text-sm font-medium text-white/65 hover:text-white hover:bg-white/[0.07] transition-all">
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Shop ticker */}
      <ShopMarquee />
    </header>
  );
}
