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

export interface SellerPlatformLayout {
  sidebar: UiLayoutItem[];
  dashboardWidgets: UiLayoutItem[];
  quickActions: UiLayoutItem[];
  dashboardCards: UiLayoutItem[];
  features: Record<string, boolean>;
  branding: BrandingConfig;
  synced: boolean;
  updatedAt: string;
}

const DEFAULT_SIDEBAR: UiLayoutItem[] = [
  { id: 'side-dashboard', name: 'Dashboard', path: '/dashboard', enabled: true },
  { id: 'side-products', name: 'Products', path: '/products', featureKey: 'PRODUCT_UPLOAD', enabled: true },
  { id: 'side-orders', name: 'Orders', path: '/orders', enabled: true },
  { id: 'side-custom-orders', name: 'Custom Requests', path: '/custom-orders', featureKey: 'CUSTOM_PRINTING', enabled: true },
  { id: 'side-analytics', name: 'Analytics', path: '/analytics', featureKey: 'ANALYTICS', enabled: true },
  { id: 'side-payouts', name: 'Payouts', path: '/payouts', featureKey: 'PAYMENTS', enabled: true },
  { id: 'side-reviews', name: 'Reviews', path: '/reviews', featureKey: 'REVIEWS', enabled: true },
  { id: 'side-profile', name: 'Seller Profile', path: '/profile', enabled: true },
  { id: 'side-shop', name: 'Shop & Bank', path: '/shop', featureKey: 'BANK_ACCOUNT', enabled: true },
  { id: 'side-settings', name: 'Settings', path: '/settings', enabled: true },
];

const DEFAULT_WIDGETS: UiLayoutItem[] = [
  { id: 'widget-revenue', name: 'Revenue Summary', enabled: true },
  { id: 'widget-orders', name: 'Recent Incoming Orders', enabled: true },
];

const DEFAULT_QUICK_ACTIONS: UiLayoutItem[] = [
  { id: 'action-add-product', name: 'Add catalog item', path: '/products', featureKey: 'PRODUCT_UPLOAD', enabled: true },
  { id: 'action-quote-custom', name: 'Quote custom requests', path: '/custom-orders', featureKey: 'CUSTOM_PRINTING', enabled: true },
  { id: 'action-link-bank', name: 'Link settlement bank', path: '/shop', featureKey: 'BANK_ACCOUNT', enabled: true },
];

const DEFAULT_CARDS: UiLayoutItem[] = [
  { id: 'card-gross-sales', name: 'Gross Sales', enabled: true },
  { id: 'card-net-earnings', name: 'Net Earnings', enabled: true },
  { id: 'card-commission', name: 'Platform Commission', enabled: true },
  { id: 'card-packing-fee', name: 'Packing Fee Collected', enabled: true },
  { id: 'card-delivered-revenue', name: 'Delivered Revenue', enabled: true },
  { id: 'card-todays-orders', name: "Today's Orders", enabled: true },
  { id: 'card-pending-orders', name: 'Pending Orders', enabled: true },
  { id: 'card-completed-orders', name: 'Completed Orders', enabled: true },
  { id: 'card-cancelled-orders', name: 'Cancelled Orders', enabled: true },
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

  // Seller Sidebar query from GET /api/platform/public/layout/seller-sidebar
  const { data: sidebarData } = useQuery<UiLayoutItem[]>({
    queryKey: ['public-seller-sidebar'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/platform/public/layout/seller-sidebar');
        return Array.isArray(res.data) ? res.data : (res.data.sidebar || []);
      } catch {
        const fallback = await axiosInstance.get('/platform/layout/seller');
        return fallback.data.sidebar || [];
      }
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // Seller Widgets query from GET /api/platform/public/layout/seller-widgets
  const { data: widgetsData } = useQuery<UiLayoutItem[]>({
    queryKey: ['public-seller-widgets'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/platform/public/layout/seller-widgets');
        return Array.isArray(res.data) ? res.data : (res.data.dashboardWidgets || []);
      } catch {
        const fallback = await axiosInstance.get('/platform/layout/seller');
        return fallback.data.dashboardWidgets || [];
      }
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // Full seller layout query (for quick actions, dashboard cards, features)
  const { data: fullLayoutData, isLoading, error } = useQuery<SellerPlatformLayout>({
    queryKey: ['platform-seller-layout'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/api/platform/layout/seller');
        return res.data;
      } catch {
        const fallback = await axiosInstance.get('/platform/layout/seller');
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
      document.title = `${branding.marketplaceName} | Seller Portal`;
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

  const rawSidebar = (sidebarData && sidebarData.length > 0)
    ? sidebarData
    : (fullLayoutData?.sidebar && fullLayoutData.sidebar.length > 0)
      ? fullLayoutData.sidebar
      : DEFAULT_SIDEBAR;

  const rawWidgets = (widgetsData && widgetsData.length > 0)
    ? widgetsData
    : (fullLayoutData?.dashboardWidgets && fullLayoutData.dashboardWidgets.length > 0)
      ? fullLayoutData.dashboardWidgets
      : DEFAULT_WIDGETS;

  const rawQuickActions = (fullLayoutData?.quickActions && fullLayoutData.quickActions.length > 0)
    ? fullLayoutData.quickActions
    : DEFAULT_QUICK_ACTIONS;

  const rawDashboardCards = (fullLayoutData?.dashboardCards && fullLayoutData.dashboardCards.length > 0)
    ? fullLayoutData.dashboardCards
    : DEFAULT_CARDS;

  const activeSidebar = rawSidebar.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  const activeWidgets = rawWidgets.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  const activeQuickActions = rawQuickActions.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  const activeDashboardCards = rawDashboardCards.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  return {
    layout: fullLayoutData,
    branding,
    features: fullLayoutData?.features || {},
    sidebar: activeSidebar,
    dashboardWidgets: activeWidgets,
    quickActions: activeQuickActions,
    dashboardCards: activeDashboardCards,
    isFeatureEnabled,
    isLoading,
    isError: !!error,
  };
}
