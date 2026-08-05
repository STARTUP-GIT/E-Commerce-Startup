'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { fetchBranding, normalizeBranding, DEFAULT_BRANDING } from '@/lib/services/brandingService';
import type { BrandingConfig } from '@/lib/services/brandingService';

export type { BrandingConfig };

export function usePlatformBranding() {
  const { data, isLoading } = useQuery<BrandingConfig>({
    queryKey: ['platform-public-branding'],
    queryFn: async () => {
      const branding = await fetchBranding(axiosInstance);
      return normalizeBranding(branding);
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const branding = data || DEFAULT_BRANDING;

  useEffect(() => {
    if (typeof window !== 'undefined' && branding.name) {
      document.title = branding.name;
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
  }, [branding.name, branding.faviconUrl, branding.favicon]);

  return {
    branding,
    isLoading,
  };
}
