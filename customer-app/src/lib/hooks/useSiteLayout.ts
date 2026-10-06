import { useBranding, BrandingData } from '@/lib/providers/BrandingProvider';

export interface UiLayoutItem {
  id: string;
  name: string;
  enabled?: boolean;
  path?: string;
  icon?: string;
}

export type { BrandingData as BrandingConfig };

const DEFAULT_NAVBAR: UiLayoutItem[] = [
  { id: 'nav-home', name: 'Home', path: '/', enabled: true },
  { id: 'nav-categories', name: 'Categories', path: '/categories', enabled: true },
  { id: 'nav-shops', name: 'Shops', path: '/shops', enabled: true },
  { id: 'nav-products', name: 'Products', path: '/products', enabled: true },
  { id: 'nav-orders', name: 'Orders', path: '/orders', enabled: true },
  { id: 'nav-wishlist', name: 'Wishlist', path: '/wishlist', enabled: true },
  { id: 'nav-custom-orders', name: 'Custom Orders', path: '/custom-orders', enabled: true },
];

const DEFAULT_HOMEPAGE_SECTIONS: UiLayoutItem[] = [
  { id: 'hero-banner', name: 'Hero Banner', enabled: true },
  { id: 'trending-categories', name: 'Trending Categories', enabled: true },
  { id: 'featured-shops', name: 'Featured Creators', enabled: true },
  { id: 'custom-prints', name: 'Custom Prints CTA', enabled: true },
  { id: 'value-props', name: 'Value Props', enabled: true },
  { id: 'guest-signup', name: 'Guest Sign-up Banner', enabled: true },
];

const DEFAULT_FOOTER: UiLayoutItem[] = [
  { id: 'foot-shops', name: 'Browse Shops', path: '/shops', enabled: true },
  { id: 'foot-categories', name: 'Categories', path: '/categories', enabled: true },
  { id: 'foot-custom-orders', name: 'Custom Orders', path: '/custom-orders', enabled: true },
  { id: 'foot-orders', name: 'Track Orders', path: '/orders', enabled: true },
];

const applyEnabled = (items: UiLayoutItem[]): UiLayoutItem[] =>
  items.filter((item) => item.enabled !== false);

export function useSiteLayout() {
  const { branding, isLoading } = useBranding();

  return {
    branding,
    navbar: applyEnabled(DEFAULT_NAVBAR),
    homepageSections: applyEnabled(DEFAULT_HOMEPAGE_SECTIONS),
    footer: applyEnabled(DEFAULT_FOOTER),
    isLoading,
    isError: false,
  };
}
