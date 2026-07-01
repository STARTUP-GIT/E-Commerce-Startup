'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { ShoppingBag, ArrowLeft, Globe, User, ShieldAlert } from 'lucide-react';

function GoogleMockForm() {
  const searchParams = useSearchParams();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customEmail, setCustomEmail] = useState('');
  const [customAvatar, setCustomAvatar] = useState('');
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);

  const testProfiles = [
    {
      id: 'existing-customer-id',
      name: 'Sathwik MS',
      email: 'sathwik@gmail.com',
      picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
      description: 'Simulates an existing customer account',
      badge: 'Existing Customer',
      color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30'
    },
    {
      id: 'new-customer-id',
      name: 'Alice Smith',
      email: 'alice.smith@example.com',
      picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150',
      description: 'Simulates a brand new customer registration',
      badge: 'New Customer',
      color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30'
    },
    {
      id: 'seller-user-id',
      name: 'Jane Seller',
      email: 'seller@example.com',
      picture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150',
      description: 'Simulates a seller account attempting to log into customer portal',
      badge: 'Role Conflict (Seller)',
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30'
    },
  ];

  const handleSelectProfile = (profile: { name: string; email: string; picture: string }) => {
    completeMockLogin(profile);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail || !customName) return;

    completeMockLogin({
      name: customName,
      email: customEmail,
      picture: customAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150',
    });
  };

  const completeMockLogin = async (profile: { name: string; email: string; picture: string }) => {
    const nameParts = profile.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const googleId = `google_${profile.email.replace(/[@.]/g, '_')}`;

    setLoadingProfile(profile.email);
    setErrorMsg(null);
    try {
      const res = await signIn('credentials', {
        email: profile.email,
        isGoogleMock: 'true',
        firstName,
        lastName,
        avatarUrl: profile.picture,
        googleId,
        redirect: false,
      });

      if (res?.error) {
        // NextAuth sends error as string
        const errMsg = res.error.includes('Seller Portal') 
          ? 'This account is registered under the Seller Portal. Please log in through the Seller Portal.'
          : res.error;
        setErrorMsg(errMsg);
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed mock Google login');
    } finally {
      setLoadingProfile(null);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#0a0a14] text-foreground py-12 px-4 sm:px-6 lg:px-8">
      {/* Background Floating Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-[520px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-900/80 to-indigo-900/80 glass border border-purple-500/30 mb-2.5 shadow-lg">
            <ShoppingBag className="h-5.5 w-5.5 text-purple-400" />
          </div>
          <h1 className="text-xl font-extrabold text-white">Google OAuth Simulator</h1>
          <p className="text-[10px] text-white/40 mt-1 uppercase tracking-widest font-semibold font-sans">NextAuth Google Provider Mock</p>
        </div>

        <Card className="border border-white/10 shadow-2xl bg-zinc-950/80 backdrop-blur-xl">
          <CardHeader className="space-y-1.5 pb-4 border-b border-white/5">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Globe className="h-5 w-5 text-purple-400" />
              Sign in with Google
            </CardTitle>
            <CardDescription className="text-xs text-white/50">
              Select one of the pre-configured test profiles to complete OAuth, or enter a custom account.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            {errorMsg && (
              <div className="p-3 text-xs font-semibold text-red-400 bg-red-500/10 rounded-xl border border-red-500/20 flex items-start gap-2.5 animate-in fade-in duration-200">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Test Profiles */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider ml-1">Pre-configured Test Profiles</label>
              
              <div className="grid grid-cols-1 gap-2.5">
                {testProfiles.map((profile) => (
                  <button
                    key={profile.email}
                    type="button"
                    disabled={loadingProfile !== null}
                    onClick={() => handleSelectProfile(profile)}
                    className={`flex items-start text-left p-3.5 rounded-xl border bg-gradient-to-br ${profile.color} transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none group cursor-pointer`}
                  >
                    <img
                      src={profile.picture}
                      alt={profile.name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full border border-white/10 mr-3.5 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                          {profile.name}
                        </h3>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                          {profile.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 font-medium truncate mt-0.5">{profile.email}</p>
                      <p className="text-[10px] text-white/30 font-medium mt-1 leading-snug">{profile.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Input */}
            <div className="border-t border-white/5 pt-5 space-y-3.5">
              <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider ml-1">Custom Google Profile</label>
              
              <form onSubmit={handleCustomSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-white/60 ml-1">Display Name</label>
                    <Input
                      required
                      placeholder="Jane Doe"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-white/60 ml-1">Email Address</label>
                    <Input
                      required
                      type="email"
                      placeholder="jane.doe@example.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-white/60 ml-1">Avatar Image URL (Optional)</label>
                  <Input
                    placeholder="https://images.unsplash.com/... (blank for default)"
                    value={customAvatar}
                    onChange={(e) => setCustomAvatar(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loadingProfile !== null || !customEmail || !customName}
                  className="w-full mt-2"
                  isLoading={loadingProfile === customEmail}
                >
                  <User className="mr-2 h-4 w-4" />
                  Continue with Custom Profile
                </Button>
              </form>
            </div>

            {/* Back button */}
            <div className="flex justify-center border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => { window.location.href = '/login'; }}
                className="flex items-center text-xs text-white/45 hover:text-white/80 transition-colors cursor-pointer"
              >
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                Cancel and return to Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function GoogleMockPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white/40">Loading Google Simulator...</div>}>
      <GoogleMockForm />
    </Suspense>
  );
}
