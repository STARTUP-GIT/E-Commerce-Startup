"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '../api/authApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { ShieldCheck, Mail, Lock, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePlatformBranding } from '@/lib/hooks/usePlatformBranding';
import { useUIStore } from '@/lib/store/uiStore';

const emailSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits'),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type EmailInput = z.infer<typeof emailSchema>;
type OtpInput = z.infer<typeof otpSchema>;
type PasswordInput = z.infer<typeof passwordSchema>;

type Step = 'email' | 'otp' | 'password' | 'success';

export function ForgotPasswordPage() {
  const { branding } = usePlatformBranding();
  const { showToast } = useUIStore();
  const [step, setStep] = useState<Step>('email');
  const [resetToken, setResetToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const emailForm = useForm<EmailInput>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const otpForm = useForm<OtpInput>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' },
  });

  const passwordForm = useForm<PasswordInput>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const handleEmailSubmit = async (data: EmailInput) => {
    setLoading(true);
    try {
      await authApi.forgotPassword(data.email);
      setUserEmail(data.email);
      setStep('otp');
      showToast('If an account exists, a reset code has been sent.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to send reset code.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (data: OtpInput) => {
    setLoading(true);
    try {
      const res = await authApi.verifyOtp({ email: userEmail, otp: data.otp });
      setResetToken(res.resetToken);
      setStep('password');
      showToast('OTP verified. Set your new password.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Invalid OTP.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (data: PasswordInput) => {
    setLoading(true);
    try {
      await authApi.resetPassword({ resetToken, newPassword: data.newPassword });
      setStep('success');
      showToast('Password updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset password.', 'error');
    } finally {
      setLoading(false);
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
              Password Recovery
            </span>
          </div>
        </div>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl relative z-10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-bold text-white/90">
              {step === 'email' && 'Reset Password'}
              {step === 'otp' && 'Verify Code'}
              {step === 'password' && 'New Password'}
              {step === 'success' && 'Done'}
            </CardTitle>
            <CardDescription className="text-xs">
              {step === 'email' && 'Enter your email to receive a reset code.'}
              {step === 'otp' && `Enter the 6-digit code sent to ${userEmail}`}
              {step === 'password' && 'Choose a strong new password.'}
              {step === 'success' && 'Your password has been updated.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Email */}
            {step === 'email' && (
              <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      autoComplete="email"
                      error={!!emailForm.formState.errors.email}
                      className="pl-11"
                      {...emailForm.register('email')}
                      disabled={loading}
                    />
                  </div>
                  {emailForm.formState.errors.email && (
                    <p className="text-[10px] font-semibold text-red-400 mt-1">{emailForm.formState.errors.email.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-11 text-xs font-bold tracking-wide uppercase transition-all mt-6" isLoading={loading}>
                  Send Reset Code
                </Button>
              </form>
            )}

            {/* Step 2: OTP */}
            {step === 'otp' && (
              <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Verification Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      autoComplete="one-time-code"
                      error={!!otpForm.formState.errors.otp}
                      className="pl-11"
                      {...otpForm.register('otp')}
                      disabled={loading}
                    />
                  </div>
                  {otpForm.formState.errors.otp && (
                    <p className="text-[10px] font-semibold text-red-400 mt-1">{otpForm.formState.errors.otp.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-11 text-xs font-bold tracking-wide uppercase transition-all mt-6" isLoading={loading}>
                  Verify Code
                </Button>
                <button type="button" onClick={() => setStep('email')} className="w-full text-[10px] text-white/40 hover:text-white/70 transition-colors text-center cursor-pointer">
                  Use a different email
                </button>
              </form>
            )}

            {/* Step 3: New Password */}
            {step === 'password' && (
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      error={!!passwordForm.formState.errors.newPassword}
                      className="pl-11"
                      {...passwordForm.register('newPassword')}
                      disabled={loading}
                    />
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="text-[10px] font-semibold text-red-400 mt-1">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      error={!!passwordForm.formState.errors.confirmPassword}
                      className="pl-11"
                      {...passwordForm.register('confirmPassword')}
                      disabled={loading}
                    />
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-[10px] font-semibold text-red-400 mt-1">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full h-11 text-xs font-bold tracking-wide uppercase transition-all mt-6" isLoading={loading}>
                  Update Password
                </Button>
              </form>
            )}

            {/* Step 4: Success */}
            {step === 'success' && (
              <div className="text-center space-y-4 py-4">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto" />
                <p className="text-sm text-white/70">Your password has been updated successfully.</p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to Sign In
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {step !== 'success' && (
          <p className="text-center text-[10px] text-white/25 mt-6 font-medium">
            <Link href="/login" className="hover:text-white/50 transition-colors">Back to Sign In</Link>
          </p>
        )}
      </motion.div>
    </div>
  );
}
