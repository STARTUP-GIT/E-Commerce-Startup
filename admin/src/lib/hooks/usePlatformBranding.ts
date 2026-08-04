'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';

export interface BrandingConfig {
  marketplaceName: string;
  logo: string;
  favicon: string;
  logoUrl?: string;
  faviconUrl?: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  marketplaceName: 'Marketplace',
  logo: '',
  favicon: '',
};

export function usePlatformBranding() {
  const { data, isLoading } = useQuery<BrandingConfig>({
    queryKey: ['platform-branding'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/platform/branding');
        return res.data;
      } catch {
        const fallback = await axiosInstance.get('/api/platform/branding');
        return fallback.data;
      }
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const branding = data || DEFAULT_BRANDING;

  useEffect(() => {
    if (typeof window !== 'undefined' && branding) {
      const faviconUrl = branding.faviconUrl || branding.favicon;
      if (faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'shortcut icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = faviconUrl;
      }
    }
  }, [branding]);

  return {
    branding,
    isLoading,
  };
}
