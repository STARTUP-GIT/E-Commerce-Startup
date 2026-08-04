"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { setupSchema, type SetupInput } from '../services/authService';
import { authApi } from '../api/authApi';
import { useRouter } from 'next/navigation';
import { useUIStore } from '@/lib/store/uiStore';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { Hexagon, User, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export function SetupPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useUIStore();

  const setupForm = useForm<SetupInput>({
    resolver: zodResolver(setupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const handleSetup = async (data: SetupInput) => {
    try {
      await authApi.setupPlatform({ name: data.name, email: data.email, password: data.password });
      await queryClient.invalidateQueries({ queryKey: ['setup-status'] });
      await queryClient.invalidateQueries({ queryKey: ['platform-profile'] });
      showToast('Platform Owner created successfully. Redirecting...', 'success');
      router.push('/dashboard');
    } catch (error: unknown) {
      showToast(error instanceof Error ? error.message : 'Setup failed. Please try again.', 'error');
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
            <Hexagon className="h-6 w-6 text-black" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-black tracking-tight text-white block">Initialize Platform</h2>
            <span className="text-[10px] text-white/40 block font-bold uppercase tracking-wider">
              First-time setup — creates the Platform Owner
            </span>
          </div>
        </div>

        <Card className="border border-white/10 bg-white/[0.02] backdrop-blur-2xl shadow-2xl relative z-10">
          <CardHeader className="space-y-1">
            <CardTitle className="text-lg font-bold text-white/90">Owner Account</CardTitle>
            <CardDescription className="text-xs">
              The owner account also gains access to the Marketplace Admin with the same credentials.
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
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                    error={!!setupForm.formState.errors.name}
                    className="pl-11"
                    {...setupForm.register('name')}
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
                    placeholder="owner@platform.com"
                    autoComplete="email"
                    error={!!setupForm.formState.errors.email}
                    className="pl-11"
                    {...setupForm.register('email')}
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
                    placeholder="Min 6 characters"
                    autoComplete="new-password"
                    error={!!setupForm.formState.errors.password}
                    className="pl-11"
                    {...setupForm.register('password')}
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
                  <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-white/25 pointer-events-none" />
                  <Input
                    type="password"
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    error={!!setupForm.formState.errors.confirmPassword}
                    className="pl-11"
                    {...setupForm.register('confirmPassword')}
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
                isLoading={setupForm.formState.isSubmitting}
              >
                Create Platform Owner
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
