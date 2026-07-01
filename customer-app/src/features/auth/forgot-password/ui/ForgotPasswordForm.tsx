'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import Link from 'next/link';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    // Simulate API request (No backend endpoint exists)
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setLoading(false);
    setSuccess(true);
  };

  return (
    <div className="w-full max-w-md space-y-6 p-8 bg-card rounded-2xl border border-border shadow-xl backdrop-blur-md">
      <div className="flex flex-col space-y-2 text-center md:text-left">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          Reset Password
        </h1>
        <p className="text-sm text-muted-foreground">
          {success
            ? "Check your inbox for a recovery link."
            : "Enter your email address and we'll send you a password recovery link."}
        </p>
      </div>

      {success ? (
        <div className="space-y-4">
          <div className="p-4 text-xs font-semibold text-emerald-500 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
            A password reset email has been sent to your address. Please follow the instructions to reset your password.
          </div>
          <Link href="/login" className="block">
            <Button variant="secondary" className="w-full py-5 cursor-pointer">
              Back to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="email">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              error={!!errors.email}
              disabled={loading}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
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
