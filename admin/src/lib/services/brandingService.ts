// =============================================================================
// SHARED BRANDING SERVICE (Single Source of Truth)
// -----------------------------------------------------------------------------
// Branding is owned by the Admin panel. Every frontend reads the SAME public
// endpoint:
//   GET /api/branding/public   (primary)
//   GET /api/branding          (fallback)
// Admin CRUD lives at GET/PUT /api/admin/settings/branding (see rolesApi.ts /
// brandingApi). If every endpoint fails we fall back to the default below.
// Never crashes.
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

export type BrandingApp = 'customer' | 'seller';

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

export const DEFAULT_SELLER_BRANDING: BrandingConfig = {
  ...DEFAULT_BRANDING,
  name: 'Marketplace Seller',
  marketplaceName: 'Marketplace Seller',
  tagline: 'Grow your store locally',
  shortName: 'Seller',
  seoTitle: 'Marketplace Seller',
  seoDescription: 'Manage your shop, products, orders, and sales.',
  browserTitle: 'Marketplace Seller',
};

const str = (value: unknown, fallback: string | undefined): string =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : (fallback || '');

export const normalizeBranding = (
  d: any,
  defaults: BrandingConfig = DEFAULT_BRANDING
): BrandingConfig => {
  const nameVal = d?.name || d?.marketplaceName || defaults.name;
  const logoVal = d?.logo || d?.logoUrl || defaults.logo;
  const rawFavicon = d?.favicon || d?.faviconUrl || '';
  const faviconVal = rawFavicon && rawFavicon !== '/favicon.ico' ? rawFavicon : logoVal;
  const taglineVal = str(d?.tagline, defaults.tagline);
  return {
    name: nameVal,
    marketplaceName: nameVal,
    logo: logoVal,
    favicon: faviconVal,
    tagline: taglineVal,
    shortName: str(d?.shortName, nameVal),
    logoUrl: logoVal,
    faviconUrl: faviconVal,
    heroBadge: str(d?.heroBadge, defaults.heroBadge),
    heroHeadingLine1: str(d?.heroHeadingLine1, defaults.heroHeadingLine1),
    heroHeadingLine2: str(d?.heroHeadingLine2, defaults.heroHeadingLine2),
    heroHeadingLine3: str(d?.heroHeadingLine3, defaults.heroHeadingLine3),
    heroDescription: str(d?.heroDescription, defaults.heroDescription),
    searchPlaceholder: str(d?.searchPlaceholder, defaults.searchPlaceholder),
    exploreShopsButtonText: str(d?.exploreShopsButtonText, defaults.exploreShopsButtonText),
    browseProductsButtonText: str(d?.browseProductsButtonText, defaults.browseProductsButtonText),
    footerDescription: str(d?.footerDescription, defaults.footerDescription),
    seoTitle: str(d?.seoTitle, defaults.seoTitle),
    seoDescription: str(d?.seoDescription, defaults.seoDescription),
    browserTitle: str(d?.browserTitle, defaults.browserTitle),
    updatedAt: d?.updatedAt,
  };
};

const BRANDING_ENDPOINTS = [
  '/api/branding/public',
  '/api/branding',
];

export const fetchBranding = async (
  client: AxiosInstance,
  app: BrandingApp = 'customer'
): Promise<BrandingConfig> => {
  const defaults = app === 'seller' ? DEFAULT_SELLER_BRANDING : DEFAULT_BRANDING;
  for (const url of BRANDING_ENDPOINTS) {
    try {
      const res = await client.get(url, { params: { app } });
      if (res?.data) return normalizeBranding(res.data, defaults);
    } catch {
      // Try the next endpoint; ultimately fall back to DEFAULT_BRANDING.
    }
  }
  return defaults;
};
