"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '../services/authService';
import { useAuth } from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/Card';
import { Input } from '@/shared/components/Input';
import { Button } from '@/shared/components/Button';
import { ShieldCheck, Mail, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

export function LoginPage() {
  const { login, isLoggingIn } = useAuth();

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = async (data: LoginInput) => {
    try {
      await login(data);
    } catch {
      // handled by mutation
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
                    autoComplete="email"
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
                    autoComplete="current-password"
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

        <p className="text-center text-[10px] text-white/25 mt-6 font-medium">
          Aura Marketplace • Enterprise Admin System v1.0.0
        </p>
      </motion.div>
    </div>
  );
}
