'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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
    <div className="w-full max-w-md space-y-6 p-8 bg-card rounded-2xl border border-border shadow-xl backdrop-blur-md">
      <div className="flex flex-col space-y-2 text-center md:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          Reset Password
        </h1>
        <p className="text-sm text-muted-foreground">
          {success
            ? isResetMode ? 'Your password has been updated.' : "Check your inbox for a recovery link."
            : isResetMode ? 'Enter a new password for your account.' : "Enter your email or username and we'll send you a password recovery link."}
        </p>
      </div>

      {error && (
        <div className="p-4 text-xs font-semibold text-red-500 bg-red-500/10 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      {success ? (
        <div className="space-y-4">
          <div className="p-4 text-xs font-semibold text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            {isResetMode
              ? 'Your password has been updated. You can now sign in.'
              : 'A password reset email has been sent. Please follow the instructions to reset your password.'}
          </div>
          <Link href="/login" className="block">
            <Button variant="secondary" className="w-full py-5 cursor-pointer">
              Back to Sign In
            </Button>
          </Link>
        </div>
      ) : isResetMode ? (
        <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="newPassword">
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              placeholder="New password"
              error={!!resetErrors.newPassword}
              disabled={loading}
              {...registerReset('newPassword')}
            />
            {resetErrors.newPassword && (
              <p className="text-xs text-destructive">{resetErrors.newPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full mt-2 cursor-pointer py-5" isLoading={loading}>
            Update Password
          </Button>

          <Link href="/login" className="block text-center text-sm text-primary hover:underline mt-4">
            Back to Sign In
          </Link>
        </form>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="identifier">
              Email or Username
            </label>
            <Input
              id="identifier"
              type="text"
              placeholder="Email or Username"
              error={!!errors.identifier}
              disabled={loading}
              {...register('identifier')}
            />
            {errors.identifier && (
              <p className="text-xs text-destructive">{errors.identifier.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full mt-2 cursor-pointer py-5" isLoading={loading}>
            Send Reset Link
          </Button>

          <Link href="/login" className="block text-center text-sm text-primary hover:underline mt-4">
            Back to Sign In
          </Link>
        </form>
      )}
    </div>
  );
}
