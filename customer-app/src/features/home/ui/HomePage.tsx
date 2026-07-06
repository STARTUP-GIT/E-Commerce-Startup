'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useShopList } from '@/features/shops/shop-list/hooks/useShopList';
import { shopListService } from '@/features/shops/shop-list/services/shopListService';
import { Skeleton } from '@/shared/components/Skeleton';
import {
  Search, ArrowRight, MapPin, Store, Printer,
  Paintbrush, Home as HomeIcon, Shirt, Cpu,
  Users, Clock, ShieldCheck, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

const categories = [
  { name: '3D Printing',     icon: Printer,    href: '/products?category=3d-prints' },
  { name: 'Handmade Crafts', icon: Paintbrush, href: '/products?category=crafts' },
  { name: 'Home Decor',      icon: HomeIcon,   href: '/products?category=decor' },
  { name: 'Apparel',         icon: Shirt,      href: '/products?category=clothing' },
  { name: 'Custom Prints',   icon: Cpu,        href: '/custom-orders' },
];

const valueProps = [
  { icon: Users,       title: 'Support Local Crafters', desc: 'Every purchase goes directly to independent local makers in your area.' },
  { icon: Printer,     title: 'Regional Custom Prints',  desc: 'Commission and print locally to reduce carbon footprint.' },
  { icon: Clock,       title: 'Fast Turnaround',         desc: 'Same-day pickup or lightning-fast regional delivery.' },
  { icon: ShieldCheck, title: 'Secure Payments',         desc: 'End-to-end encrypted transactions powered by Stripe.' },
];

function ShopCard({ shop, index }: { shop: any; index: number }) {
  const banner = shop.bannerUrl
    ? `url(${shop.bannerUrl})`
    : shopListService.getPlaceholderBanner(shop.name);

  return (
    <Link
      href={`/shops/${shop.slug || shop.id}`}
      className="group block"
      style={{ animation: `card-appear 0.45s ease both`, animationDelay: `${index * 70}ms` }}
    >
      <div className="glass-card overflow-hidden glass-hover h-full flex flex-col">
        {/* Banner */}
        <div
          className="relative overflow-hidden flex-shrink-0"
          style={{ height: '180px', background: banner, backgroundSize: 'cover', backgroundPosition: 'center' }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)' }} />
          {shop.defaultPickupAddress && (
            <span className="absolute bottom-4 left-4 flex items-center gap-1.5 text-xs font-semibold text-white/80">
              <MapPin style={{ width: 13, height: 13 }} />
              {shop.defaultPickupAddress.city}, {shop.defaultPickupAddress.state}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col flex-1 p-6" style={{ paddingTop: '3rem', position: 'relative' }}>
          {/* Logo avatar */}
          <div
            className="absolute glass flex items-center justify-center overflow-hidden"
            style={{
              top: '-28px', left: '24px',
              width: '56px', height: '56px',
              borderRadius: '14px',
              border: '3px solid #000',
              background: 'rgba(255,255,255,0.08)',
            }}
          >
            {shop.logoUrl
              ? <img src={shop.logoUrl} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <Store style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.5)' }} />
            }
          </div>

          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', lineHeight: 1.2 }} className="group-hover:opacity-70 transition-opacity line-clamp-1">
            {shop.name}
          </h4>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.42)', marginTop: '6px', lineHeight: 1.6 }} className="line-clamp-2 flex-1">
            {shop.description || 'Premium local craft maker.'}
          </p>
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.45)' }} className="flex items-center gap-1 group-hover:text-white transition-colors">
              Browse shop <ChevronRight style={{ width: 13, height: 13 }} />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function HomePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [search, setSearch] = useState('');
  const { shops, isLoading: shopsLoading } = useShopList();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) router.push(`/products?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div style={{ background: '#080808' }}>

      {/* ══════════════════════════════════════════
          HERO
          ══════════════════════════════════════════ */}
      <section
        style={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '80px 24px 80px',
          background: '#080808',
        }}
      >
        {/* Grid lines */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
        {/* White glow blob top */}
        <div
          className="orb-1"
          style={{
            position: 'absolute', top: '-200px', left: '50%', transform: 'translateX(-50%)',
            width: '900px', height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(255,255,255,0.06) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '900px', width: '100%', textAlign: 'center', position: 'relative', zIndex: 10 }} className="animate-fade-up">

          {/* Eyebrow badge */}
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '10px',
              padding: '10px 20px', borderRadius: '100px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
              color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
              marginBottom: '40px',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            The Local Marketplace for Everything
          </div>

          {/* Headline — BIG */}
          <h1
            style={{
              fontSize: 'clamp(3.5rem, 10vw, 8rem)',
              fontWeight: 900,
              lineHeight: 0.9,
              letterSpacing: '-0.04em',
              color: '#ffffff',
              marginBottom: '32px',
            }}
          >
            Buy Anything.<br />
            <span
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.4) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              From Anyone.
            </span><br />
            Near You.
          </h1>

          {/* Subheading */}
          <p
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.25rem)',
              color: 'rgba(255,255,255,0.42)',
              maxWidth: '560px',
              margin: '0 auto 48px',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Aura is your local marketplace for everything — fashion, tech, food, prints, crafts, and beyond. Discover creators. Support neighbours.
          </p>

          {/* Search bar */}
          <form
            onSubmit={handleSearch}
            style={{
              display: 'flex', gap: '8px',
              maxWidth: '560px', margin: '0 auto 40px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '8px',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  width: 18, height: 18, color: 'rgba(255,255,255,0.3)',
                }}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search products, shops…"
                style={{
                  width: '100%', height: '52px', paddingLeft: '44px', paddingRight: '16px',
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize: '15px', color: '#fff', fontFamily: 'inherit',
                }}
              />
            </div>
            <button
              type="submit"
              style={{
                height: '52px', padding: '0 28px',
                borderRadius: '12px', border: 'none',
                background: '#ffffff', color: '#000',
                fontSize: '15px', fontWeight: 800,
                cursor: 'pointer', flexShrink: 0,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              Search
            </button>
          </form>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            <Link href="/shops">
              <button
                style={{
                  height: '56px', padding: '0 32px', borderRadius: '14px',
                  background: '#fff', color: '#000', border: 'none',
                  fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(255,255,255,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                Explore Shops <ArrowRight style={{ width: 18, height: 18 }} />
              </button>
            </Link>
            <Link href="/products">
              <button
                style={{
                  height: '56px', padding: '0 32px', borderRadius: '14px',
                  background: 'transparent', color: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; }}
              >
                Browse Products
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          CATEGORIES
          ══════════════════════════════════════════ */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '100px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '48px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '12px' }}>Browse by</p>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Categories</h2>
          </div>
          <Link href="/products">
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              className="hover:text-white transition-colors">
              View all <ArrowRight style={{ width: 15, height: 15 }} />
            </span>
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <Link key={i} href={cat.href} className="group block">
                <div
                  className="glass-card glass-hover"
                  style={{ padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '20px' }}
                >
                  <div
                    className="group-hover:bg-white group-hover:scale-110 transition-all duration-200"
                    style={{
                      width: '64px', height: '64px', borderRadius: '18px',
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon className="group-hover:text-black transition-colors" style={{ width: 26, height: 26, color: 'rgba(255,255,255,0.75)' }} />
                  </div>
                  <span
                    style={{ fontSize: '15px', fontWeight: 800, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3 }}
                    className="group-hover:text-white transition-colors"
                  >
                    {cat.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FEATURED SHOPS
          ══════════════════════════════════════════ */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 100px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '48px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '12px' }}>Handpicked</p>
            <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>Featured Creators</h2>
          </div>
          <Link href="/shops">
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
              className="hover:text-white transition-colors">
              All Shops <ArrowRight style={{ width: 15, height: 15 }} />
            </span>
          </Link>
        </div>

        {shopsLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card overflow-hidden">
                <Skeleton style={{ height: '180px', borderRadius: '0' }} />
                <div style={{ padding: '24px', paddingTop: '40px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <Skeleton style={{ height: '20px', width: '55%' }} />
                  <Skeleton style={{ height: '14px', width: '90%' }} />
                  <Skeleton style={{ height: '14px', width: '75%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : shops.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {shops.slice(0, 6).map((shop, i) => (
              <ShopCard key={shop.id} shop={shop} index={i} />
            ))}
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '80px', textAlign: 'center' }}>
            <Store style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.18)', margin: '0 auto 16px' }} />
            <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.35)' }}>No shops available yet.</p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════
          CUSTOM PRINTS CTA
          ══════════════════════════════════════════ */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px 100px' }}>
        <div
          className="glass-card"
          style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(48px, 8vw, 80px)' }}
        >
          {/* Grid bg */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
            backgroundImage: `linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }} />

          <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '48px' }}>
            <div style={{ maxWidth: '540px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '16px' }}>
                Made Just for You
              </p>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '20px' }}>
                Need Something<br />One-of-a-Kind?
              </h2>
              <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.42)', lineHeight: 1.7, marginBottom: '28px' }}>
                Commission anything custom — from 3D-printed parts to tailored clothing, bespoke artwork, or personalised gifts. Local makers, real results.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                {['Verify designs', 'Local creators', 'Track production'].map(s => (
                  <span key={s} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.45)', display: 'inline-block' }} />
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <Link href="/custom-orders" style={{ flexShrink: 0 }}>
              <button
                style={{
                  height: '60px', padding: '0 40px', borderRadius: '16px',
                  background: '#fff', color: '#000', border: 'none',
                  fontSize: '16px', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '12px',
                  transition: 'transform 0.15s, opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.opacity = '0.88'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.opacity = '1'; }}
              >
                <Printer style={{ width: 20, height: 20 }} />
                Start a Custom Order
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          VALUE PROPS
          ══════════════════════════════════════════ */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '100px 24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '48px' }}>
          {valueProps.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', gap: '20px' }}>
              <div style={{
                flexShrink: 0, width: '52px', height: '52px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon style={{ width: 22, height: 22, color: 'rgba(255,255,255,0.65)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>{title}</h3>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.38)', lineHeight: 1.7 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          GUEST SIGN-UP BANNER
          ══════════════════════════════════════════ */}
      {!session && (
        <section style={{ background: '#ffffff' }}>
          <div style={{
            maxWidth: '1280px', margin: '0 auto',
            padding: 'clamp(60px, 10vw, 100px) 24px',
            display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'space-between', gap: '40px',
          }}>
            <div>
              <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#000', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
                Your neighbourhood.<br />Your marketplace.
              </h2>
              <p style={{ fontSize: '16px', color: 'rgba(0,0,0,0.5)', marginTop: '12px', maxWidth: '400px', lineHeight: 1.6 }}>
                Join Aura free — browse local sellers, follow your favourite shops, and get anything delivered or picked up nearby.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
              <Link href="/signup">
                <button
                  style={{
                    height: '56px', padding: '0 32px', borderRadius: '14px',
                    background: '#000', color: '#fff', border: 'none',
                    fontSize: '15px', fontWeight: 800, cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Create Account
                </button>
              </Link>
              <Link href="/login">
                <button
                  style={{
                    height: '56px', padding: '0 32px', borderRadius: '14px',
                    background: 'transparent', color: '#000',
                    border: '1.5px solid rgba(0,0,0,0.2)',
                    fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.35)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.2)'; }}
                >
                  Sign In
                </button>
              </Link>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
