export type FeatureFlagStatus =
  | 'ENABLED'
  | 'DISABLED'
  | 'INTERNAL'
  | 'BETA'
  | 'SCHEDULED'
  | 'DEPRECATED';

export type FeatureFlagScope =
  | 'GLOBAL'
  | 'CUSTOMER'
  | 'SELLER'
  | 'ADMIN'
  | 'PLATFORM'
  | 'SHOP'
  | 'USER';

export type FeatureFlagType =
  | 'BUY_NOW'
  | 'WISHLIST'
  | 'REVIEWS'
  | 'CHAT'
  | 'COUPONS'
  | 'AI_SEARCH'
  | 'RECOMMENDATIONS'
  | 'OTP_LOGIN'
  | 'GOOGLE_LOGIN'
  | 'APPLE_LOGIN'
  | 'RAZORPAY'
  | 'UPI'
  | 'WALLET'
  | 'CUSTOM_PRINT'
  | '3D_PREVIEW'
  | 'SUBSCRIPTIONS'
  | 'FLASH_SALE'
  | 'BLOG'
  | 'NEWSLETTER'
  | 'LIVE_TRACKING'
  | 'NOTIFICATIONS';

export interface FeatureFlag {
  id: string;
  key: string;
  type: FeatureFlagType;
  displayName: string;
  description?: string | null;
  enabled: boolean;
  status: FeatureFlagStatus;
  scope: FeatureFlagScope;
  rolloutPercentage: number;
  targetEnvironment?: string | null;
  scheduledAt?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagPayload {
  key?: string;
  type: FeatureFlagType;
  displayName: string;
  description?: string;
  status: FeatureFlagStatus;
  scope: FeatureFlagScope;
  rolloutPercentage?: number;
  targetEnvironment?: string;
  scheduledAt?: string;
  startsAt?: string;
  endsAt?: string;
  metadata?: Record<string, unknown>;
}

export const FEATURE_FLAG_TYPES: FeatureFlagType[] = [
  'BUY_NOW', 'WISHLIST', 'REVIEWS', 'CHAT', 'COUPONS', 'AI_SEARCH',
  'RECOMMENDATIONS', 'OTP_LOGIN', 'GOOGLE_LOGIN', 'APPLE_LOGIN', 'RAZORPAY',
  'UPI', 'WALLET', 'CUSTOM_PRINT', '3D_PREVIEW', 'SUBSCRIPTIONS',
  'FLASH_SALE', 'BLOG', 'NEWSLETTER', 'LIVE_TRACKING', 'NOTIFICATIONS',
];

export const FEATURE_FLAG_STATUSES: FeatureFlagStatus[] = [
  'ENABLED', 'DISABLED', 'INTERNAL', 'BETA', 'SCHEDULED', 'DEPRECATED',
];

export const FEATURE_FLAG_SCOPES: FeatureFlagScope[] = [
  'GLOBAL', 'CUSTOMER', 'SELLER', 'ADMIN', 'PLATFORM', 'SHOP', 'USER',
];