'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1, 'Email or Username is required'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const searchParams = useSearchParams();
  const resetToken = searchParams?.get('token') || '';
  const identifier = searchParams?.get('identifier') || '';
  const isResetMode = Boolean(resetToken && identifier);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const submitJson = async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Password reset failed. Please try again.');
    }
    return data;
  };

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    setError(null);
    try {
      await submitJson('/customer/api/auth/forgot-password', {
        identifier: data.identifier,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    setError(null);
    try {
      await submitJson('/customer/api/auth/reset-password', {
        identifier,
        resetToken,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {isResetMode ? 'New Password' : 'Reset Password'}
        </h1>
        <p className="text-sm text-white/45">
          {success
            ? isResetMode 
              ? 'Your password has been updated.' 
              : 'Check your inbox for a recovery link.'
            : isResetMode 
              ? 'Enter a new password for your account.' 
              : "Enter your details and we'll send a recovery link."}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium animate-fade-in">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success State */}
      {success ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-fade-in">
            <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              {isResetMode
                ? 'Your password has been updated. You can now sign in.'
                : 'A password reset email has been sent. Please follow the instructions in the email to reset your password.'}
            </span>
          </div>
          <Link href="/login" className="block mt-2">
            <button
              type="button"
              className="w-full h-11 rounded-xl glass-input border border-white/10 hover:border-white/20 text-sm font-semibold text-white/80 hover:text-white cursor-pointer transition-all flex items-center justify-center gap-2"
            >
              Back to Sign In
            </button>
          </Link>
        </div>
      ) : isResetMode ? (
        /* Reset Password Form */
        <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="newPassword">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                disabled={loading}
                className={`glass-input w-full h-11 pl-10 pr-10 rounded-xl text-sm text-white placeholder:text-white/25 outline-none transition-all ${resetErrors.newPassword ? 'border-red-500/50' : ''}`}
                {...registerReset('newPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {resetErrors.newPassword && (
              <p className="text-[11px] text-red-400 font-medium">{resetErrors.newPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl gradient-btn text-sm font-semibold text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Updating…
              </>
            ) : (
              'Update Password'
            )}
          </button>

          <Link href="/login" className="block text-center text-sm text-purple-400 hover:text-purple-300 font-semibold transition-colors mt-4">
            Back to Sign In
          </Link>
        </form>
      ) : (
        /* Forgot Password (Request Reset Link) Form */
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/60 uppercase tracking-wider" htmlFor="identifier">
              Email or Username
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                id="identifier"
                type="text"
                placeholder="Email or Username"
                disabled={loading}
                className={`glass-input w-full h-11 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-white/25 outline-none transition-all ${errors.identifier ? 'border-red-500/50 focus:border-red-500/70' : ''}`}
                {...register('identifier')}
              />
            </div>
            {errors.identifier && (
              <p className="text-[11px] text-red-400 font-medium">{errors.identifier.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl gradient-btn text-sm font-semibold text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Sending link…
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>

          <Link href="/login" className="block text-center text-sm text-purple-400 hover:text-purple-300 font-semibold transition-colors mt-4">
            Back to Sign In
          </Link>
        </form>
      )}
    </div>
  );
}
