"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { PasswordInput } from '@/shared/components/PasswordInput';
import { Button } from '@/shared/components/Button';
import { ShieldCheck, Mail, Lock, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useBranding } from '@/lib/hooks/useBranding';

export function LoginPage() {
  const { branding } = useBranding();
  const { login, isLoggingIn } = useAuth();
  const searchParams = useSearchParams();
  const isExpired = searchParams?.get('expired') === 'true';
  const errorParam = searchParams?.get('error');
  const messageParam = searchParams?.get('message');

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = async (data: LoginInput) => {
    try {
      await login(data);
    } catch {
      // handled by mutation
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-6 noise-bg overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/[0.01] blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xl shadow-white/5 shrink-0 overflow-hidden">
            {branding?.logo && branding.logo !== '/images/logo.png' ? (
              <img src={branding.logo} alt={branding.name} className="h-full w-full object-cover" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-black" />
            )}
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black tracking-tight text-white block uppercase">{branding?.name || 'Marketplace'}</h2>
            <span className="text-[10px] text-white/40 block font-bold uppercase tracking-wider">
              Control Panel & Systems
            </span>
          </div>
        </div>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl relative z-10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-bold text-white/90">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter credentials or authenticate with Google to access administrative modules.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isExpired && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Your session has expired. Please sign in again.</span>
              </div>
            )}

            {errorParam === 'PendingApproval' && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                <div>
                  <p className="font-semibold text-amber-300">Approval Required</p>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    {messageParam || 'Administrator approval is required. An access request has been submitted to the Super Admin (expires in 24 hours).'}
                  </p>
                </div>
              </div>
            )}

            {errorParam && errorParam !== 'PendingApproval' && !isExpired && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                <div>
                  <p className="font-semibold text-red-300">Authentication Failed</p>
                  <p className="text-[11px] text-red-300/80 mt-0.5">
                    {messageParam || (errorParam === 'AccessDenied' ? 'Access denied. You do not have permission to access the admin portal.' : errorParam)}
                  </p>
                </div>
              </div>
            )}

            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoggingIn}
              className="w-full h-11 border-white/10 hover:bg-white/5 text-white flex items-center justify-center gap-3 font-semibold text-xs transition-all"
            >
              {isGoogleLoading ? (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              Continue with Google
            </Button>

            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0b0b0e] px-2.5 text-[10px] font-bold text-white/30 uppercase tracking-widest absolute">
                or email
              </span>
            </div>

            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    autoComplete="email"
                    error={!!loginForm.formState.errors.email}
                    className="pl-11"
                    {...loginForm.register('email')}
                    disabled={isLoggingIn || isGoogleLoading}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-[10px] font-semibold text-red-400 mt-1">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                  Password
                </label>
                <PasswordInput
                  placeholder="••••••••"
                  autoComplete="current-password"
                  leftIcon={<Lock className="h-4.5 w-4.5" />}
                  error={!!loginForm.formState.errors.password}
                  {...loginForm.register('password')}
                  disabled={isLoggingIn || isGoogleLoading}
                />
                {loginForm.formState.errors.password && (
                  <p className="text-[10px] font-semibold text-red-400 mt-1">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-[10px] text-white/40 hover:text-white/70 transition-colors font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-xs font-bold tracking-wide uppercase transition-all mt-4"
                isLoading={isLoggingIn}
                disabled={isGoogleLoading}
              >
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] text-white/25 mt-6 font-medium">
          {branding?.name || 'Marketplace'} • Enterprise Admin System
        </p>
      </motion.div>
    </div>
  );
}
