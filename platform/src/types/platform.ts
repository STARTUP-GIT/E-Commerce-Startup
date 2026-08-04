export interface BrandingConfig {
  marketplaceName: string;
  logo: string;
  favicon: string;
}

export interface FeatureFlag {
  id: string;
  featureKey: string;
  application: 'CUSTOMER' | 'SELLER';
  displayName: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UiLayoutItem {
  id: string;
  name: string;
  enabled?: boolean;
  path?: string;
}

export interface UiBuilderLayout {
  customerHomepageSections: UiLayoutItem[];
  customerNavbar: UiLayoutItem[];
  sellerDashboardWidgets: UiLayoutItem[];
  sellerSidebar: UiLayoutItem[];
}

export interface PlatformSettings {
  branding: BrandingConfig;
  uiLayout: UiBuilderLayout;
}
