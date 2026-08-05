'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';

export interface BrandingConfig {
  name: string;
  marketplaceName: string;
  logo: string;
  favicon: string;
  logoUrl?: string;
  faviconUrl?: string;
  updatedAt?: string;
}

const DEFAULT_BRANDING: BrandingConfig = {
  name: 'Marketplace',
  marketplaceName: 'Marketplace',
  logo: '',
  favicon: '',
};

export function usePlatformBranding() {
  const { data, isLoading } = useQuery<BrandingConfig>({
    queryKey: ['platform-public-branding'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/platform/public/branding');
        const d = res.data;
        return {
          name: d.name || d.marketplaceName || 'Marketplace',
          marketplaceName: d.name || d.marketplaceName || 'Marketplace',
          logo: d.logo || d.logoUrl || '',
          favicon: d.favicon || d.faviconUrl || '',
          logoUrl: d.logo || d.logoUrl || '',
          faviconUrl: d.favicon || d.faviconUrl || '',
          updatedAt: d.updatedAt,
        };
      } catch {
        const fallback = await axiosInstance.get('/platform/branding');
        const d = fallback.data;
        return {
          name: d.marketplaceName || 'Marketplace',
          marketplaceName: d.marketplaceName || 'Marketplace',
          logo: d.logo || d.logoUrl || '',
          favicon: d.favicon || d.faviconUrl || '',
          logoUrl: d.logo || d.logoUrl || '',
          faviconUrl: d.favicon || d.faviconUrl || '',
          updatedAt: d.updatedAt,
        };
      }
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const branding = data || DEFAULT_BRANDING;

  useEffect(() => {
    if (typeof window !== 'undefined' && branding.marketplaceName) {
      document.title = `${branding.marketplaceName} | Admin Portal`;
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
  }, [branding.marketplaceName, branding.faviconUrl, branding.favicon]);

  return {
    branding,
    isLoading,
  };
}
