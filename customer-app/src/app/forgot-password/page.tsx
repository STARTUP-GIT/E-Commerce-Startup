import { ForgotPasswordForm } from '@/features/auth/forgot-password/ui/ForgotPasswordForm';
import { ShoppingBag } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Brand Column */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-950 text-white relative overflow-hidden border-r border-zinc-800">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] -ml-40 -mb-40"></div>

        {/* Logo block */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <ShoppingBag className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Aura Marketplace
          </span>
        </div>

        {/* Testimonial block */}
        <div className="space-y-6 relative z-10 max-w-lg">
          <blockquote className="space-y-2">
            <p className="text-lg text-zinc-300 font-medium leading-relaxed">
              &ldquo;Security and trust are everything. Aura ensures that recovering your account credentials is quick and fully secured.&rdquo;
            </p>
            <footer className="text-sm text-zinc-500">
              — Aura Security Team
            </footer>
          </blockquote>
        </div>

        {/* Footer brand */}
        <div className="text-xs text-zinc-600 relative z-10">
          &copy; 2026 Aura Inc. All rights reserved.
        </div>
      </div>

      {/* Form Column */}
      <div className="flex items-center justify-center p-6 bg-zinc-900/50">
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
