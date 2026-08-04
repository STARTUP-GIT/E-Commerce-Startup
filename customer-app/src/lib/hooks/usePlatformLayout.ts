'use client';

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
  marketplaceName: string;
  logo: string;
  favicon: string;
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

const DEFAULT_LAYOUT: CustomerPlatformLayout = {
  navbar: [
    { id: 'nav-home', name: 'Home', path: '/', enabled: true },
    { id: 'nav-categories', name: 'Categories', path: '/categories', enabled: true },
    { id: 'nav-shops', name: 'Shops', path: '/shops', enabled: true },
    { id: 'nav-products', name: 'Products', path: '/products', enabled: true },
    { id: 'nav-orders', name: 'Orders', path: '/orders', enabled: true },
    { id: 'nav-wishlist', name: 'Wishlist', path: '/wishlist', featureKey: 'WISHLIST', enabled: true },
    { id: 'nav-custom-orders', name: 'Custom Orders', path: '/custom-orders', featureKey: 'CUSTOM_PRINTING', enabled: true },
  ],
  homepageSections: [
    { id: 'hero-banner', name: 'Hero Banner', enabled: true },
    { id: 'trending-categories', name: 'Trending Categories', enabled: true },
    { id: 'featured-shops', name: 'Featured Creators', enabled: true },
    { id: 'custom-prints', name: 'Custom Prints CTA', enabled: true, featureKey: 'CUSTOM_PRINTING' },
    { id: 'value-props', name: 'Value Props', enabled: true },
    { id: 'guest-signup', name: 'Guest Sign-up Banner', enabled: true },
  ],
  footer: [
    { id: 'foot-shops', name: 'Browse Shops', path: '/shops', enabled: true },
    { id: 'foot-categories', name: 'Categories', path: '/categories', enabled: true },
    { id: 'foot-custom-orders', name: 'Custom Orders', path: '/custom-orders', featureKey: 'CUSTOM_PRINTING', enabled: true },
    { id: 'foot-orders', name: 'Track Orders', path: '/orders', enabled: true },
  ],
  categoriesLayout: [{ id: 'cat-grid', name: 'Category Grid', enabled: true }],
  features: {
    BUY_NOW: true,
    WISHLIST: true,
    CART: true,
    GOOGLE_LOGIN: true,
    OTP_LOGIN: true,
    EMAIL_LOGIN: true,
    SEARCH: true,
    CHAT: true,
    COUPONS: true,
    REVIEWS: true,
    CUSTOM_PRINTING: true,
  },
  branding: {
    marketplaceName: 'Aura Marketplace',
    logo: '/images/logo.png',
    favicon: '/favicon.ico',
  },
  synced: true,
  updatedAt: new Date().toISOString(),
};

export function usePlatformLayout() {
  const { data, isLoading, error } = useQuery<CustomerPlatformLayout>({
    queryKey: ['platform-customer-layout'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/platform/layout/customer');
        return res.data;
      } catch {
        const fallback = await axiosInstance.get('/api/platform/layout/customer');
        return fallback.data;
      }
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const layout = data || DEFAULT_LAYOUT;

  const isFeatureEnabled = (key: string): boolean => {
    if (!layout.features) return true;
    return layout.features[key] !== false;
  };

  const getActiveNavbar = (): UiLayoutItem[] => {
    return (layout.navbar || DEFAULT_LAYOUT.navbar).filter((item) => {
      if (item.enabled === false) return false;
      if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
      return true;
    });
  };

  const getActiveHomepageSections = (): UiLayoutItem[] => {
    return (layout.homepageSections || DEFAULT_LAYOUT.homepageSections).filter((item) => {
      if (item.enabled === false) return false;
      if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
      return true;
    });
  };

  return {
    layout,
    branding: layout.branding || DEFAULT_LAYOUT.branding,
    features: layout.features || DEFAULT_LAYOUT.features,
    navbar: getActiveNavbar(),
    homepageSections: getActiveHomepageSections(),
    isFeatureEnabled,
    isLoading,
    isError: !!error,
  };
}
