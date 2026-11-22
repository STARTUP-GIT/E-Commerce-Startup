"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '../api/authApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Button } from '@/shared/components/Button';
import { ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export function VerifyEmailChangePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing.');
      setLoading(false);
      return;
    }

    authApi
      .verifyEmailChange({ token })
      .then(() => {
        setSuccess(true);
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Email verification link is invalid or expired.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-6 noise-bg overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-6 space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xl shadow-white/5 shrink-0 overflow-hidden">
            <ShieldCheck className="h-6 w-6 text-black" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white block uppercase">
            Email Verification
          </h2>
        </div>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl relative z-10 text-center">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white/90">
              {loading ? 'Verifying Email Change...' : success ? 'Email Updated Successfully' : 'Verification Failed'}
            </CardTitle>
            <CardDescription className="text-xs">
              {loading
                ? 'Please wait while we verify your new email address.'
                : success
                ? 'Your administrator email address has been updated. Please sign in with your new email.'
                : error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {loading ? (
              <div className="flex justify-center py-6">
                <span className="h-8 w-8 rounded-full border-4 border-white/10 border-t-white animate-spin" />
              </div>
            ) : success ? (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400" />
                </div>
                <Button
                  className="w-full h-10 text-xs font-bold uppercase"
                  onClick={() => router.push('/login')}
                >
                  Sign In with New Email
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <AlertCircle className="h-12 w-12 text-red-400" />
                </div>
                <Button
                  variant="outline"
                  className="w-full h-10 text-xs font-bold uppercase border-white/10 text-white"
                  onClick={() => router.push('/login')}
                >
                  Return to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
