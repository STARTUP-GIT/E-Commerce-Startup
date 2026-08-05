'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';
import { fetchBranding, normalizeBranding, DEFAULT_BRANDING } from '@/lib/services/brandingService';
import type { BrandingData } from '@/lib/services/brandingService';

export type { BrandingData };

const BrandingContext = createContext<{
  branding: BrandingData;
  isLoading: boolean;
  refetchBranding: () => void;
}>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
  refetchBranding: () => {},
});

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading, refetch } = useQuery<BrandingData>({
    queryKey: ['public-branding'],
    queryFn: async () => {
      const branding = await fetchBranding(axiosInstance);
      return normalizeBranding(branding);
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const branding = data || DEFAULT_BRANDING;

  useEffect(() => {
    if (typeof window !== 'undefined' && branding.name) {
      document.title = branding.name;

      const faviconUrl = branding.faviconUrl || branding.favicon || branding.logo;
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
  }, [branding.name, branding.faviconUrl, branding.favicon, branding.logo]);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refetchBranding: refetch }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
