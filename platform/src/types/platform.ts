export interface BrandingConfig {
  name: string;
  marketplaceName: string;
  logo: string;
  favicon: string;
  tagline?: string;
  shortName?: string;
  logoUrl?: string;
  faviconUrl?: string;
  heroBadge?: string;
  heroHeadingLine1?: string;
  heroHeadingLine2?: string;
  heroHeadingLine3?: string;
  heroDescription?: string;
  searchPlaceholder?: string;
  exploreShopsButtonText?: string;
  browseProductsButtonText?: string;
  footerDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  browserTitle?: string;
  updatedAt?: string;
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
  visibility?: boolean;
  order?: number;
  section?: string;
  path?: string;
  featureKey?: string;
  icon?: string;
}

export interface UiBuilderLayout {
  customerHomepageSections: UiLayoutItem[];
  customerNavbar: UiLayoutItem[];
  sellerDashboardWidgets: UiLayoutItem[];
  sellerSidebar: UiLayoutItem[];
  customerFooter?: UiLayoutItem[];
  customerCategoriesLayout?: UiLayoutItem[];
  sellerQuickActions?: UiLayoutItem[];
  sellerDashboardCards?: UiLayoutItem[];
  synced?: boolean;
  syncedAt?: string;
}

export interface PlatformSettings {
  branding: BrandingConfig;
  uiLayout: UiBuilderLayout;
}
