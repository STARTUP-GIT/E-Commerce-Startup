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
  heroBadge: string;
  heroHeadingLine1: string;
  heroHeadingLine2: string;
  heroHeadingLine3: string;
  heroDescription: string;
  searchPlaceholder: string;
  exploreShopsButtonText: string;
  browseProductsButtonText: string;
  footerDescription: string;
  seoTitle: string;
  seoDescription: string;
  browserTitle: string;
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
  heroBadge: 'The Local Marketplace for Everything',
  heroHeadingLine1: 'Buy Anything.',
  heroHeadingLine2: 'From Anyone.',
  heroHeadingLine3: 'Near You.',
  heroDescription: 'Marketplace is your local marketplace for everything — fashion, tech, food, prints, crafts, and beyond. Discover creators. Support neighbours.',
  searchPlaceholder: 'Search products, shops on Marketplace…',
  exploreShopsButtonText: 'Explore Shops',
  browseProductsButtonText: 'Browse Products',
  footerDescription: 'Discover local craft creators, purchase unique handmade items, and order custom-made 3D prints directly from makers on Marketplace.',
  seoTitle: 'Marketplace',
  seoDescription: 'Discover local artisans, handcrafted items, and custom products.',
  browserTitle: 'Marketplace',
};

const str = (value: unknown, fallback: string | undefined): string =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : (fallback || '');

export const normalizeBranding = (d: any): BrandingConfig => {
  const nameVal = d?.name || d?.marketplaceName || DEFAULT_BRANDING.name;
  const logoVal = d?.logo || d?.logoUrl || DEFAULT_BRANDING.logo;
  const rawFavicon = d?.favicon || d?.faviconUrl || '';
  const faviconVal = rawFavicon && rawFavicon !== '/favicon.ico' ? rawFavicon : logoVal;
  const taglineVal = str(d?.tagline, DEFAULT_BRANDING.tagline);
  return {
    name: nameVal,
    marketplaceName: nameVal,
    logo: logoVal,
    favicon: faviconVal,
    tagline: taglineVal,
    shortName: str(d?.shortName, nameVal),
    logoUrl: logoVal,
    faviconUrl: faviconVal,
    heroBadge: str(d?.heroBadge, DEFAULT_BRANDING.heroBadge),
    heroHeadingLine1: str(d?.heroHeadingLine1, DEFAULT_BRANDING.heroHeadingLine1),
    heroHeadingLine2: str(d?.heroHeadingLine2, DEFAULT_BRANDING.heroHeadingLine2),
    heroHeadingLine3: str(d?.heroHeadingLine3, DEFAULT_BRANDING.heroHeadingLine3),
    heroDescription: str(d?.heroDescription, DEFAULT_BRANDING.heroDescription),
    searchPlaceholder: str(d?.searchPlaceholder, DEFAULT_BRANDING.searchPlaceholder),
    exploreShopsButtonText: str(d?.exploreShopsButtonText, DEFAULT_BRANDING.exploreShopsButtonText),
    browseProductsButtonText: str(d?.browseProductsButtonText, DEFAULT_BRANDING.browseProductsButtonText),
    footerDescription: str(d?.footerDescription, DEFAULT_BRANDING.footerDescription),
    seoTitle: str(d?.seoTitle, DEFAULT_BRANDING.seoTitle),
    seoDescription: str(d?.seoDescription, DEFAULT_BRANDING.seoDescription),
    browserTitle: str(d?.browserTitle, DEFAULT_BRANDING.browserTitle),
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
