import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axios/axiosInstance';

export interface UiLayoutItem {
  id: string;
  name: string;
  enabled?: boolean;
  path?: string;
  featureKey?: string;
  icon?: string;
}

export interface BrandingConfig {
  name: string;
  marketplaceName: string;
  logo: string;
  favicon: string;
  logoUrl?: string;
  faviconUrl?: string;
  updatedAt?: string;
}

export interface CustomerPlatformLayout {
  navbar: UiLayoutItem[];
  homepageSections: UiLayoutItem[];
  footer: UiLayoutItem[];
  categoriesLayout: UiLayoutItem[];
  features: Record<string, boolean>;
  branding: BrandingConfig;
  synced: boolean;
  updatedAt: string;
}

const DEFAULT_NAVBAR: UiLayoutItem[] = [
  { id: 'nav-home', name: 'Home', path: '/', enabled: true },
  { id: 'nav-categories', name: 'Categories', path: '/categories', enabled: true },
  { id: 'nav-shops', name: 'Shops', path: '/shops', enabled: true },
  { id: 'nav-products', name: 'Products', path: '/products', enabled: true },
  { id: 'nav-orders', name: 'Orders', path: '/orders', enabled: true },
  { id: 'nav-wishlist', name: 'Wishlist', path: '/wishlist', featureKey: 'WISHLIST', enabled: true },
  { id: 'nav-custom-orders', name: 'Custom Orders', path: '/custom-orders', featureKey: 'CUSTOM_PRINTING', enabled: true },
];

const DEFAULT_HOMEPAGE_SECTIONS: UiLayoutItem[] = [
  { id: 'hero-banner', name: 'Hero Banner', enabled: true },
  { id: 'trending-categories', name: 'Trending Categories', enabled: true },
  { id: 'featured-shops', name: 'Featured Creators', enabled: true },
  { id: 'custom-prints', name: 'Custom Prints CTA', enabled: true, featureKey: 'CUSTOM_PRINTING' },
  { id: 'value-props', name: 'Value Props', enabled: true },
  { id: 'guest-signup', name: 'Guest Sign-up Banner', enabled: true },
];

const DEFAULT_FOOTER: UiLayoutItem[] = [
  { id: 'foot-shops', name: 'Browse Shops', path: '/shops', enabled: true },
  { id: 'foot-categories', name: 'Categories', path: '/categories', enabled: true },
  { id: 'foot-custom-orders', name: 'Custom Orders', path: '/custom-orders', featureKey: 'CUSTOM_PRINTING', enabled: true },
  { id: 'foot-orders', name: 'Track Orders', path: '/orders', enabled: true },
];

export function usePlatformLayout() {
  // Public Branding query
  const { data: publicBranding } = useQuery<BrandingConfig>({
    queryKey: ['public-branding'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/platform/public/branding');
        const d = res.data;
        return {
          name: d.name || d.marketplaceName || 'Marketplace',
          marketplaceName: d.name || d.marketplaceName || 'Marketplace',
          logo: d.logo || d.logoUrl || '/images/logo.png',
          favicon: d.favicon || d.faviconUrl || '/favicon.ico',
          logoUrl: d.logo || d.logoUrl || '/images/logo.png',
          faviconUrl: d.favicon || d.faviconUrl || '/favicon.ico',
          updatedAt: d.updatedAt,
        };
      } catch {
        const fallback = await axiosInstance.get('/platform/branding');
        const d = fallback.data;
        return {
          name: d.marketplaceName || 'Marketplace',
          marketplaceName: d.marketplaceName || 'Marketplace',
          logo: d.logo || d.logoUrl || '/images/logo.png',
          favicon: d.favicon || d.faviconUrl || '/favicon.ico',
          logoUrl: d.logo || d.logoUrl || '/images/logo.png',
          faviconUrl: d.favicon || d.faviconUrl || '/favicon.ico',
          updatedAt: d.updatedAt,
        };
      }
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // Customer Navbar query from GET /api/platform/public/layout/customer-navbar
  const { data: navbarData } = useQuery<UiLayoutItem[]>({
    queryKey: ['public-customer-navbar'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/platform/public/layout/customer-navbar');
        return Array.isArray(res.data) ? res.data : (res.data.navbar || []);
      } catch {
        const fallback = await axiosInstance.get('/platform/layout/customer');
        return fallback.data.navbar || [];
      }
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // Customer Homepage query from GET /api/platform/public/layout/customer-homepage
  const { data: homepageData } = useQuery<UiLayoutItem[]>({
    queryKey: ['public-customer-homepage'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/platform/public/layout/customer-homepage');
        return Array.isArray(res.data) ? res.data : (res.data.homepageSections || []);
      } catch {
        const fallback = await axiosInstance.get('/platform/layout/customer');
        return fallback.data.homepageSections || [];
      }
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // Full layout query (for features/footer/etc.)
  const { data: fullLayoutData, isLoading, error } = useQuery<CustomerPlatformLayout>({
    queryKey: ['platform-customer-layout'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/platform/layout/customer');
        return res.data;
      } catch {
        const fallback = await axiosInstance.get('/platform/layout/customer');
        return fallback.data;
      }
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const branding: BrandingConfig = {
    name: publicBranding?.name || fullLayoutData?.branding?.marketplaceName || 'Marketplace',
    marketplaceName: publicBranding?.name || fullLayoutData?.branding?.marketplaceName || 'Marketplace',
    logo: publicBranding?.logo || fullLayoutData?.branding?.logo || '/images/logo.png',
    favicon: publicBranding?.favicon || fullLayoutData?.branding?.favicon || '/favicon.ico',
    logoUrl: publicBranding?.logoUrl || fullLayoutData?.branding?.logoUrl || '/images/logo.png',
    faviconUrl: publicBranding?.faviconUrl || fullLayoutData?.branding?.faviconUrl || '/favicon.ico',
    updatedAt: publicBranding?.updatedAt || fullLayoutData?.updatedAt,
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && branding.marketplaceName) {
      document.title = `${branding.marketplaceName} | Customer Portal`;
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

  const isFeatureEnabled = (key: string): boolean => {
    if (!fullLayoutData?.features) return true;
    return fullLayoutData.features[key] !== false;
  };

  const rawNavbar = (navbarData && navbarData.length > 0)
    ? navbarData
    : (fullLayoutData?.navbar && fullLayoutData.navbar.length > 0)
      ? fullLayoutData.navbar
      : DEFAULT_NAVBAR;

  const rawHomepage = (homepageData && homepageData.length > 0)
    ? homepageData
    : (fullLayoutData?.homepageSections && fullLayoutData.homepageSections.length > 0)
      ? fullLayoutData.homepageSections
      : DEFAULT_HOMEPAGE_SECTIONS;

  const rawFooter = (fullLayoutData?.footer && fullLayoutData.footer.length > 0)
    ? fullLayoutData.footer
    : DEFAULT_FOOTER;

  const activeNavbar = rawNavbar.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  const activeHomepage = rawHomepage.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  const activeFooter = rawFooter.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  return {
    layout: fullLayoutData,
    branding,
    features: fullLayoutData?.features || {},
    navbar: activeNavbar,
    homepageSections: activeHomepage,
    footer: activeFooter,
    isFeatureEnabled,
    isLoading,
    isError: !!error,
  };
}
