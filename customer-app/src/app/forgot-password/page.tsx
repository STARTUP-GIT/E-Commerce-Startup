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
    <main className="min-h-screen relative overflow-y-auto bg-[#080810] flex flex-col items-center justify-center p-6 py-12 sm:py-16 pt-safe pb-safe px-safe">

      {/* ── Animated Orb Background ─────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="orb-1 absolute -top-40 -left-32 w-[500px] h-[500px] rounded-full bg-purple-600/20 blur-[100px]" />
        <div className="orb-2 absolute top-1/3 -right-40 w-[400px] h-[400px] rounded-full bg-indigo-500/15 blur-[90px]" />
        <div className="orb-3 absolute -bottom-32 left-1/4 w-[350px] h-[350px] rounded-full bg-violet-600/15 blur-[80px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* ── Floating Badge Pills ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
        <div className="absolute top-[12%] left-[8%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <Shield className="h-3 w-3 text-green-400" />
          <span className="text-[11px] font-medium text-white/60">Secure Recovery</span>
        </div>
        <div className="absolute top-[22%] right-[10%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <KeyRound className="h-3 w-3 text-purple-400" />
          <span className="text-[11px] font-medium text-white/60">Encrypted Tokens</span>
        </div>
        <div className="absolute bottom-[20%] left-[6%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Clock className="h-3 w-3 text-indigo-400" />
          <span className="text-[11px] font-medium text-white/60">Quick Reset</span>
        </div>
        <div className="absolute bottom-[30%] right-[8%] flex items-center gap-1.5 px-3 py-1.5 glass-sm rounded-full animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <ShoppingBag className="h-3 w-3 text-pink-400" />
          <span className="text-[11px] font-medium text-white/60">Local Artisans</span>
        </div>
      </div>

      {/* ── Brand header (centered layout flow) ──────────────────── */}
      <div className="mb-8 z-10 animate-fade-in">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden">
            <div className="absolute inset-0 gradient-btn rounded-xl" />
            <ShoppingBag className="relative h-4.5 w-4.5 text-white z-10" />
          </div>
          <span className="text-lg font-bold gradient-text">Aura</span>
        </Link>
      </div>

      {/* ── Glass Form Card ─────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-md animate-fade-up">
        <Suspense fallback={
          <div className="glass-card p-6 sm:p-8 space-y-6 text-center text-white/50 text-sm">
            <span className="h-6 w-6 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block mr-2 align-middle" />
            Loading recovery form...
          </div>
        }>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
