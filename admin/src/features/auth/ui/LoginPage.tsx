"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, setupSchema, type LoginInput, type SetupInput } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../api/authApi';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { ShieldCheck, Mail, Lock, User, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useUIStore } from '@/lib/store/uiStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const { showToast } = useUIStore();
  const queryClient = useQueryClient();

  const { data: setupData, isLoading: isLoadingSetup, error: setupError, refetch: refetchSetup } = useQuery({
    queryKey: ['setup-status'],
    queryFn: authApi.getSetupStatus,
    staleTime: Infinity,
  });

  const setupStatus = isLoadingSetup
    ? 'loading'
    : setupError
    ? 'error'
    : setupData?.initialized
    ? 'initialized'
    : 'not-initialized';

  const [isSettingUp, setIsSettingUp] = useState(false);

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const setupForm = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const handleLogin = async (data: LoginInput) => {
    try {
      await login(data);
    } catch {
      // handled by mutation
    }
  };

  const handleSetup = async (data: SetupInput) => {
    try {
      setIsSettingUp(true);
      await authApi.setupAdmin({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      showToast('Admin created successfully. Please log in.', 'success');
      await queryClient.invalidateQueries({ queryKey: ['setup-status'] });
      setupForm.reset();
    } catch (err: any) {
      showToast(err.message || 'Failed to create admin.', 'error');
    } finally {
      setIsSettingUp(false);
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
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-xl shadow-white/5 shrink-0">
            <ShieldCheck className="h-6 w-6 text-black" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black tracking-tight text-white block">AURA</h2>
            <span className="text-[10px] text-white/40 block font-bold uppercase tracking-wider">
              Control Panel & Systems
            </span>
          </div>
        </div>

        {setupStatus === 'loading' && (
          <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl relative z-10">
            <CardContent className="p-8 flex items-center justify-center">
              <span className="h-8 w-8 rounded-full border-4 border-white/10 border-t-white/40 animate-spin" />
            </CardContent>
          </Card>
        )}

        {setupStatus === 'error' && (
          <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl relative z-10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-bold text-white/90">Connection Error</CardTitle>
              <CardDescription className="text-xs">
                Could not verify system status. Please check your connection and try again.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => refetchSetup()}
                className="w-full h-11 text-xs font-bold tracking-wide uppercase"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {setupStatus === 'not-initialized' && (
          <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl relative z-10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-bold text-white/90">Create First Admin</CardTitle>
              <CardDescription className="text-xs">
                No administrator account found. Set up the first admin to get started.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={setupForm.handleSubmit(handleSetup)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="text"
                      placeholder="Admin Name"
                      error={!!setupForm.formState.errors.name}
                      className="pl-11"
                      {...setupForm.register('name')}
                      disabled={isSettingUp}
                    />
                  </div>
                  {setupForm.formState.errors.name && (
                    <p className="text-[10px] font-semibold text-red-400 mt-1">
                      {setupForm.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="admin@aura.com"
                      error={!!setupForm.formState.errors.email}
                      className="pl-11"
                      {...setupForm.register('email')}
                      disabled={isSettingUp}
                    />
                  </div>
                  {setupForm.formState.errors.email && (
                    <p className="text-[10px] font-semibold text-red-400 mt-1">
                      {setupForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="Min. 6 characters"
                      error={!!setupForm.formState.errors.password}
                      className="pl-11"
                      {...setupForm.register('password')}
                      disabled={isSettingUp}
                    />
                  </div>
                  {setupForm.formState.errors.password && (
                    <p className="text-[10px] font-semibold text-red-400 mt-1">
                      {setupForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="Repeat password"
                      error={!!setupForm.formState.errors.confirmPassword}
                      className="pl-11"
                      {...setupForm.register('confirmPassword')}
                      disabled={isSettingUp}
                    />
                  </div>
                  {setupForm.formState.errors.confirmPassword && (
                    <p className="text-[10px] font-semibold text-red-400 mt-1">
                      {setupForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-xs font-bold tracking-wide uppercase transition-all mt-6"
                  isLoading={isSettingUp}
                >
                  Create Admin
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {setupStatus === 'initialized' && (
          <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl relative z-10">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-bold text-white/90">Sign In</CardTitle>
              <CardDescription className="text-xs">
                Enter credentials to access administrative modules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="email"
                      placeholder="admin@aura.com"
                      error={!!loginForm.formState.errors.email}
                      className="pl-11"
                      {...loginForm.register('email')}
                      disabled={isLoggingIn}
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
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      error={!!loginForm.formState.errors.password}
                      className="pl-11"
                      {...loginForm.register('password')}
                      disabled={isLoggingIn}
                    />
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-[10px] font-semibold text-red-400 mt-1">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-xs font-bold tracking-wide uppercase transition-all mt-6"
                  isLoading={isLoggingIn}
                >
                  Access Dashboard
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-[10px] text-white/25 mt-6 font-medium">
          Aura Marketplace • Enterprise Admin System v1.0.0
        </p>
      </motion.div>
    </div>
  );
}
