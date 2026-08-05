'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';

export interface BrandingData {
  name: string;
  marketplaceName: string;
  logo: string;
  favicon: string;
  tagline?: string;
  shortName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  updatedAt?: string;
}

const DEFAULT_BRANDING: BrandingData = {
  name: 'Marketplace',
  marketplaceName: 'Marketplace',
  logo: '/images/logo.png',
  favicon: '/favicon.ico',
  tagline: 'Your local marketplace for everything',
  shortName: 'Marketplace',
  logoUrl: '/images/logo.png',
  faviconUrl: '/favicon.ico',
};

const BrandingContext = createContext<{
  branding: BrandingData;
  isLoading: boolean;
}>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery<BrandingData>({
    queryKey: ['public-branding'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/platform/public/branding');
        const d = res.data;
        const nameVal = d.name || d.marketplaceName || 'Marketplace';
        return {
          name: nameVal,
          marketplaceName: nameVal,
          logo: d.logo || d.logoUrl || '/images/logo.png',
          favicon: d.favicon || d.faviconUrl || '/favicon.ico',
          tagline: d.tagline || 'Your local marketplace for everything',
          shortName: d.shortName || nameVal,
          logoUrl: d.logo || d.logoUrl || '/images/logo.png',
          faviconUrl: d.favicon || d.faviconUrl || '/favicon.ico',
          updatedAt: d.updatedAt,
        };
      } catch {
        const fallback = await axiosInstance.get('/platform/branding');
        const d = fallback.data;
        const nameVal = d.name || d.marketplaceName || 'Marketplace';
        return {
          name: nameVal,
          marketplaceName: nameVal,
          logo: d.logo || d.logoUrl || '/images/logo.png',
          favicon: d.favicon || d.faviconUrl || '/favicon.ico',
          tagline: d.tagline || 'Your local marketplace for everything',
          shortName: d.shortName || nameVal,
          logoUrl: d.logo || d.logoUrl || '/images/logo.png',
          faviconUrl: d.favicon || d.faviconUrl || '/favicon.ico',
          updatedAt: d.updatedAt,
        };
      }
    },
    staleTime: 60_000,
    refetchInterval: 30_000,
  });

  const branding = data || DEFAULT_BRANDING;

  useEffect(() => {
    if (typeof window !== 'undefined' && branding.name) {
      document.title = `${branding.name} | Customer Portal`;

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

      let appNameMeta: HTMLMetaElement | null = document.querySelector("meta[name='application-name']");
      if (!appNameMeta) {
        appNameMeta = document.createElement('meta');
        appNameMeta.name = 'application-name';
        document.getElementsByTagName('head')[0].appendChild(appNameMeta);
      }
      appNameMeta.content = branding.name;

      let ogSiteMeta: HTMLMetaElement | null = document.querySelector("meta[property='og:site_name']");
      if (!ogSiteMeta) {
        ogSiteMeta = document.createElement('meta');
        ogSiteMeta.setAttribute('property', 'og:site_name');
        document.getElementsByTagName('head')[0].appendChild(ogSiteMeta);
      }
      ogSiteMeta.content = branding.name;
    }
  }, [branding.name, branding.faviconUrl, branding.favicon]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
