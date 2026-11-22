"use client";

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authApi } from '../api/authApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { PasswordInput } from '@/shared/components/PasswordInput';
import { Button } from '@/shared/components/Button';
import { ShieldCheck, Mail, Lock, User, Phone, AlertCircle, CheckCircle2, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBranding } from '@/lib/hooks/useBranding';
import { signIn } from 'next-auth/react';

export function AcceptInvitationPage() {
  const { branding } = useBranding();
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Missing invitation token. Please check your email link.');
      setLoading(false);
      return;
    }

    authApi
      .getInvitationByToken(token)
      .then((res) => {
        setInvitation(res.invitation);
        if (res.invitation.fullName) {
          const parts = res.invitation.fullName.split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.message || 'Invalid or expired invitation link.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await authApi.acceptInvitation({
        token,
        password,
        firstName,
        lastName,
        phone,
      });
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleAssociate = async () => {
    try {
      await signIn('google', { callbackUrl: '/dashboard' });
    } catch {}
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground flex items-center justify-center p-6 noise-bg overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-white/[0.01] blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
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
            <h2 className="text-xl font-black tracking-tight text-white block uppercase">
              {branding?.name || 'AtlasBasket'}
            </h2>
            <span className="text-[10px] text-white/40 block font-bold uppercase tracking-wider">
              Administrator Onboarding
            </span>
          </div>
        </div>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl relative z-10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-bold text-white/90">
              {success ? 'Account Activated!' : 'Accept Administrator Invitation'}
            </CardTitle>
            <CardDescription className="text-xs">
              {success
                ? 'Redirecting to your control panel dashboard...'
                : 'Configure your credentials to complete administrator account activation.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="h-8 w-8 rounded-full border-4 border-white/10 border-t-white animate-spin" />
                <p className="text-xs text-white/40">Verifying invitation token...</p>
              </div>
            ) : error && !invitation ? (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="font-semibold text-sm">Invitation Invalid or Expired</span>
                </div>
                <p className="text-[11px] text-red-300/80">{error}</p>
              </div>
            ) : success ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 animate-bounce" />
                <p className="text-sm font-bold text-white">Welcome to the Administration Team!</p>
                <p className="text-xs text-white/40">Your credentials have been securely saved.</p>
              </div>
            ) : (
              <>
                {/* Invitation Details Banner */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 font-medium">Invited Email:</span>
                    <span className="font-semibold text-white">{invitation?.email}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40 font-medium">Assigned Role:</span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 border border-white/20 text-white">
                      <Shield className="h-3 w-3 text-white/60" />
                      {invitation?.roleName}
                    </span>
                  </div>
                  {invitation?.roleDescription && (
                    <p className="text-[11px] text-white/40 pt-1 border-t border-white/5">
                      {invitation.roleDescription}
                    </p>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Google Sign-In Option for matching email */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleAssociate}
                  className="w-full h-10 border-white/10 hover:bg-white/5 text-white flex items-center justify-center gap-2 font-semibold text-xs transition-all"
                >
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
                  Sign in with Google ({invitation?.email})
                </Button>

                <div className="relative flex items-center justify-center my-2">
                  <div className="border-t border-white/10 w-full" />
                  <span className="bg-[#0b0b0e] px-2.5 text-[10px] font-bold text-white/30 uppercase tracking-widest absolute">
                    or set password
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                        First Name
                      </label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                        Last Name
                      </label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                      Phone Number (optional)
                    </label>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                      Create Password
                    </label>
                    <PasswordInput
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      leftIcon={<Lock className="h-4.5 w-4.5" />}
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                      Confirm Password
                    </label>
                    <PasswordInput
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      leftIcon={<Lock className="h-4.5 w-4.5" />}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-xs font-bold tracking-wide uppercase transition-all mt-3"
                    isLoading={submitting}
                  >
                    Activate Administrator Account
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
