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

const DEFAULT_LAYOUT: SellerPlatformLayout = {
  sidebar: [
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
  ],
  dashboardWidgets: [
    { id: 'widget-revenue', name: 'Revenue Summary', enabled: true },
    { id: 'widget-orders', name: 'Recent Incoming Orders', enabled: true },
  ],
  quickActions: [
    { id: 'action-add-product', name: 'Add catalog item', path: '/products', featureKey: 'PRODUCT_UPLOAD', enabled: true },
    { id: 'action-quote-custom', name: 'Quote custom requests', path: '/custom-orders', featureKey: 'CUSTOM_PRINTING', enabled: true },
    { id: 'action-link-bank', name: 'Link settlement bank', path: '/shop', featureKey: 'BANK_ACCOUNT', enabled: true },
  ],
  dashboardCards: [
    { id: 'card-gross-sales', name: 'Gross Sales', enabled: true },
    { id: 'card-net-earnings', name: 'Net Earnings', enabled: true },
    { id: 'card-commission', name: 'Platform Commission', enabled: true },
    { id: 'card-packing-fee', name: 'Packing Fee Collected', enabled: true },
    { id: 'card-delivered-revenue', name: 'Delivered Revenue', enabled: true },
    { id: 'card-todays-orders', name: "Today's Orders", enabled: true },
    { id: 'card-pending-orders', name: 'Pending Orders', enabled: true },
    { id: 'card-completed-orders', name: 'Completed Orders', enabled: true },
    { id: 'card-cancelled-orders', name: 'Cancelled Orders', enabled: true },
  ],
  features: {
    PRODUCT_UPLOAD: true,
    OFFERS: true,
    COUPONS: true,
    INVENTORY: true,
    GST: true,
    ANALYTICS: true,
    BULK_UPLOAD: true,
    STORE_BANNER: true,
    STORE_LOGO: true,
    PAYMENTS: true,
    VARIANTS: true,
    RAZORPAY: true,
    BANK_ACCOUNT: true,
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
  const { data, isLoading, error } = useQuery<SellerPlatformLayout>({
    queryKey: ['platform-seller-layout'],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get('/platform/layout/seller');
        return res.data;
      } catch {
        const fallback = await axiosInstance.get('/api/platform/layout/seller');
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

  const getActiveSidebar = (): UiLayoutItem[] => {
    return (layout.sidebar || DEFAULT_LAYOUT.sidebar).filter((item) => {
      if (item.enabled === false) return false;
      if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
      return true;
    });
  };

  const getActiveWidgets = (): UiLayoutItem[] => {
    return (layout.dashboardWidgets || DEFAULT_LAYOUT.dashboardWidgets).filter((item) => {
      if (item.enabled === false) return false;
      if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
      return true;
    });
  };

  const getActiveQuickActions = (): UiLayoutItem[] => {
    return (layout.quickActions || DEFAULT_LAYOUT.quickActions).filter((item) => {
      if (item.enabled === false) return false;
      if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
      return true;
    });
  };

  const getActiveDashboardCards = (): UiLayoutItem[] => {
    return (layout.dashboardCards || DEFAULT_LAYOUT.dashboardCards).filter((item) => {
      if (item.enabled === false) return false;
      if (item.featureKey && !isFeatureEnabled(item.featureKey)) return false;
      return true;
    });
  };

  return {
    layout,
    branding: layout.branding || DEFAULT_LAYOUT.branding,
    features: layout.features || DEFAULT_LAYOUT.features,
    sidebar: getActiveSidebar(),
    dashboardWidgets: getActiveWidgets(),
    quickActions: getActiveQuickActions(),
    dashboardCards: getActiveDashboardCards(),
    isFeatureEnabled,
    isLoading,
    isError: !!error,
  };
}
