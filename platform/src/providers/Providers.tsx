"use client";

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from '@/shared/components/ToastContainer';
import { SetupGuard } from '@/components/auth/SetupGuard';
import { SessionProvider } from 'next-auth/react';
import { BrandingProvider } from '@/lib/providers/BrandingProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 10 * 60 * 1000, // 10 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrandingProvider>
        <SessionProvider>
          <SetupGuard>{children}</SetupGuard>
        </SessionProvider>
      </BrandingProvider>
      <ToastContainer />
    </QueryClientProvider>
  );
}
