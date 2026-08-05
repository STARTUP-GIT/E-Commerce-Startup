// =============================================================================
// SHARED BRANDING SERVICE (Single Source of Truth)
// -----------------------------------------------------------------------------
// Platform owns branding. Every frontend reads the SAME public endpoint:
//   GET /api/platform/branding/public   (primary)
//   GET /api/platform/public/branding   (fallback)
//   GET /platform/branding              (legacy fallback)
// If every endpoint fails we fall back to the default below. Never crashes.
// =============================================================================

import type { AxiosInstance } from 'axios';

export interface BrandingConfig {
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

export const DEFAULT_BRANDING: BrandingConfig = {
  name: 'Marketplace',
  marketplaceName: 'Marketplace',
  logo: '/images/logo.png',
  favicon: '/favicon.ico',
  tagline: 'Your local marketplace for everything',
  shortName: 'Marketplace',
  logoUrl: '/images/logo.png',
  faviconUrl: '/favicon.ico',
};

export const normalizeBranding = (d: any): BrandingConfig => {
  const nameVal = d?.name || d?.marketplaceName || DEFAULT_BRANDING.name;
  const logoVal = d?.logo || d?.logoUrl || DEFAULT_BRANDING.logo;
  const rawFavicon = d?.favicon || d?.faviconUrl || '';
  const faviconVal = rawFavicon && rawFavicon !== '/favicon.ico' ? rawFavicon : logoVal;
  const taglineVal = d?.tagline || DEFAULT_BRANDING.tagline;
  return {
    name: nameVal,
    marketplaceName: nameVal,
    logo: logoVal,
    favicon: faviconVal,
    tagline: taglineVal,
    shortName: d?.shortName || nameVal,
    logoUrl: logoVal,
    faviconUrl: faviconVal,
    updatedAt: d?.updatedAt,
  };
};

const BRANDING_ENDPOINTS = [
  '/api/platform/branding/public',
  '/api/platform/public/branding',
  '/platform/branding',
];

export const fetchBranding = async (client: AxiosInstance): Promise<BrandingConfig> => {
  for (const url of BRANDING_ENDPOINTS) {
    try {
      const res = await client.get(url);
      if (res?.data) return normalizeBranding(res.data);
    } catch {
      // Try the next endpoint; ultimately fall back to DEFAULT_BRANDING.
    }
  }
  return DEFAULT_BRANDING;
};
