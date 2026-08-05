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

  const rawSidebar = sidebarData || fullLayoutData?.sidebar || [];
  const activeSidebar = rawSidebar.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  const rawWidgets = widgetsData || fullLayoutData?.dashboardWidgets || [];
  const activeWidgets = rawWidgets.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  const rawQuickActions = fullLayoutData?.quickActions || [];
  const activeQuickActions = rawQuickActions.filter((item) => {
    if (item.enabled === false) return false;
    if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
    return true;
  });

  const rawDashboardCards = fullLayoutData?.dashboardCards || [];
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
