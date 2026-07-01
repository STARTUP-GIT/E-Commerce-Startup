'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider, keepPreviousData } from '@tanstack/react-query';

export default function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data stays fresh for 5 minutes before a background refetch
            staleTime: 5 * 60 * 1000,
            // Cache retained for 10 minutes after all components unmount
            gcTime: 10 * 60 * 1000,
            // Don't refetch just because user switched browser tabs
            refetchOnWindowFocus: false,
            // Retry failed requests with exponential backoff
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
            // Show previous data while re-fetching (prevents empty flashes)
            placeholderData: keepPreviousData,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
