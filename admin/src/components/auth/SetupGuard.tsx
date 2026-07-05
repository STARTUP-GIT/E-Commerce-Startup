"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { authApi } from '@/features/auth/api/authApi';
import { SetupPage } from '@/features/auth/ui/SetupPage';

export function SetupGuard({ children }: { children: React.ReactNode }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['setup-status'],
    queryFn: authApi.getSetupStatus,
    staleTime: Infinity,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8 space-y-4">
        <span className="h-10 w-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        <p className="text-sm text-white/40 font-medium font-sans">Checking system status...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col justify-center items-center p-8 space-y-4">
        <h2 className="text-lg font-bold text-white/90">Connection Error</h2>
        <p className="text-xs text-white/40 text-center max-w-xs">
          Could not verify system status. Please check your connection and try again.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-white/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // If the admin is not initialized, ignore any existing cookie/session and force the setup view
  if (!data.initialized) {
    return <SetupPage />;
  }

  return <>{children}</>;
}
