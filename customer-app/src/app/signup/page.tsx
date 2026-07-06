import { SignupForm } from '@/features/auth/signup/ui/SignupForm';
import { ShoppingBag, Shield, Users, Award } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Create Account | Aura Marketplace',
  description: 'Join Aura Marketplace to discover local artisans, custom 3D prints, and handcrafted goods.',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen relative overflow-y-auto bg-background flex flex-col items-center justify-center p-4 sm:p-6 py-12 sm:py-16 pt-safe pb-safe px-safe">

      {/* ── Monochrome Grid Background ─────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Floating Monochrome Badge Pills ─────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
        <div className="absolute top-[10%] left-[7%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Users className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-semibold text-white/60">Join 50k+ Buyers</span>
        </div>
        <div className="absolute top-[18%] right-[9%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <Shield className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-semibold text-white/60">Secure & Private</span>
        </div>
        <div className="absolute bottom-[18%] left-[5%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Award className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-semibold text-white/60">Verified Creators</span>
        </div>
        <div className="absolute bottom-[28%] right-[7%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <ShoppingBag className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-semibold text-white/60">Local Delivery</span>
        </div>
      </div>

      {/* ── Brand header ────────────────────────────────────────── */}
      <div className="mb-6 z-10 animate-fade-in">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-white/10 shadow-md">
            <ShoppingBag className="h-4.5 w-4.5 text-black" />
          </div>
          <span className="text-lg font-black tracking-tight text-white">Aura</span>
        </Link>
      </div>

      {/* ── Form Card Wrapper ─────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[440px] px-1 animate-fade-up">
        <SignupForm />
      </div>
    </main>
  );
}
