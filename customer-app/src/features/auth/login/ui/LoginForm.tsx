'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginInput } from '../services/loginService';
import { useLogin } from '../hooks/useLogin';
import { GoogleButton } from '@/features/auth/google-auth/ui/GoogleButton';
import Link from 'next/link';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export function LoginForm() {
  const { login, isLoading, error } = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const searchParams = useSearchParams();
  const oauthError = searchParams ? searchParams.get('error') : null;

  let displayError = error;
  if (!displayError && oauthError) {
    if (oauthError === 'SellerAccountExists') {
      displayError = 'This account is registered under the Seller Portal. Please log in through the Seller Portal.';
    } else if (oauthError === 'GoogleAuthFailed') {
      displayError = 'Google Sign-In failed. Please try again.';
    } else if (oauthError === 'AccessDenied') {
      displayError = 'Access denied. You might not have the correct permissions.';
    } else {
      displayError = `Authentication error: ${oauthError}`;
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginInput) => {
    login(data);
  };

  return (
    <div className="glass-card p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Welcome back
        </h1>
        <p className="text-sm text-white/45">
          Sign in to your Aura account
        </p>
      </div>

      {/* Error Banner */}
      {displayError && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-fade-in">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {displayError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Email or Username */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="email">
            Email or Username
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              id="email"
              type="text"
              placeholder="Email or Username"
              disabled={isLoading}
              className={`glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-white/25 outline-none transition-all ${errors.email ? 'border-red-500/50 focus:border-red-500/70' : ''}`}
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-[11px] text-red-400 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="text-[11px] text-purple-400 hover:text-purple-300 transition-colors font-medium">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isLoading}
              className={`glass-input w-full h-11 pl-10 pr-10 rounded-xl text-sm text-white placeholder:text-white/25 outline-none transition-all ${errors.password ? 'border-red-500/50' : ''}`}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-[11px] text-red-400 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-xl gradient-btn text-sm font-semibold text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Signing in…
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex items-center">
        <div className="flex-grow border-t border-white/[0.08]" />
        <span className="mx-4 text-[11px] font-medium text-white/30 uppercase tracking-wider">or</span>
        <div className="flex-grow border-t border-white/[0.08]" />
      </div>

      {/* Google */}
      <GoogleButton />

      {/* Footer link */}
      <p className="text-center text-xs text-white/40">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-purple-400 font-semibold hover:text-purple-300 transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
