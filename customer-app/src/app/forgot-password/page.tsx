import { Suspense } from 'react';
import { ForgotPasswordForm } from '@/features/auth/forgot-password/ui/ForgotPasswordForm';
import { ShoppingBag, Shield, KeyRound, Clock } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Reset Password | Aura Marketplace',
  description: 'Recover or reset your Aura account password safely and securely.',
};

export default function ForgotPasswordPage() {
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
        <div className="absolute top-[12%] left-[8%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Shield className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-semibold text-white/60">Secure Recovery</span>
        </div>
        <div className="absolute top-[22%] right-[10%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <KeyRound className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-semibold text-white/60">Encrypted Tokens</span>
        </div>
        <div className="absolute bottom-[20%] left-[6%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Clock className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-semibold text-white/60">Quick Reset</span>
        </div>
        <div className="absolute bottom-[30%] right-[8%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <ShoppingBag className="h-3 w-3 text-white/60" />
          <span className="text-[11px] font-semibold text-white/60">Local Artisans</span>
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
      <div className="relative z-10 w-full max-w-[420px] px-1 animate-fade-up">
        <Suspense fallback={
          <div className="glass-card p-6 sm:p-8 space-y-6 text-center text-white/50 text-sm">
            <span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block mr-2 align-middle" />
            Loading recovery form...
          </div>
        }>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
