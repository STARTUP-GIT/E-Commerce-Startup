// =============================================================================
// FEATURE REGISTRY
// -----------------------------------------------------------------------------
// The Platform owns every available feature. Developers register features here
// in code. On backend startup syncFeatureDefinitions() compares this registry
// with the `features` table and inserts anything that is missing.
//
//   Feature exists only in code        -> not deployed -> invisible in Platform
//   Feature added here + backend ships -> auto-registered -> visible in Platform
//
// Platform can only flip `enabled`. It never creates or deletes features.
//
// To register a NEW feature: add one entry to FEATURE_DEFINITIONS and deploy.
// =============================================================================

export const FEATURE_APPLICATIONS = {
  CUSTOMER: "CUSTOMER",
  SELLER: "SELLER",
} as const;

export type FeatureApplication = (typeof FEATURE_APPLICATIONS)[keyof typeof FEATURE_APPLICATIONS];

export interface FeatureDefinition {
  /** Machine key, e.g. "BUY_NOW". */
  featureKey: string;
  /** Owning application: CUSTOMER | SELLER (extensible). */
  application: FeatureApplication;
  /** Human friendly name shown in Platform, e.g. "Buy Now". */
  displayName: string;
  /** Initial state used ONLY when the feature is first inserted. */
  enabled?: boolean;
}

/**
 * Every feature the marketplace owns. Developer-owned, code-defined.
 * Add/remove entries here and deploy the backend — Platform picks them up.
 */
export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // ── Customer ─────────────────────────────────────────────────────────────
  { featureKey: "BUY_NOW", application: "CUSTOMER", displayName: "Buy Now" },
  { featureKey: "WISHLIST", application: "CUSTOMER", displayName: "Wishlist" },
  { featureKey: "CART", application: "CUSTOMER", displayName: "Cart" },
  { featureKey: "GOOGLE_LOGIN", application: "CUSTOMER", displayName: "Google Login" },
  { featureKey: "OTP_LOGIN", application: "CUSTOMER", displayName: "OTP Login" },
  { featureKey: "EMAIL_LOGIN", application: "CUSTOMER", displayName: "Email Login" },
  { featureKey: "SEARCH", application: "CUSTOMER", displayName: "Search" },
  { featureKey: "CHAT", application: "CUSTOMER", displayName: "Chat" },
  { featureKey: "COUPONS", application: "CUSTOMER", displayName: "Coupons" },
  { featureKey: "REVIEWS", application: "CUSTOMER", displayName: "Reviews" },
  { featureKey: "CUSTOM_PRINTING", application: "CUSTOMER", displayName: "Custom Printing" },

  // ── Seller ───────────────────────────────────────────────────────────────
  { featureKey: "PRODUCT_UPLOAD", application: "SELLER", displayName: "Product Upload" },
  { featureKey: "OFFERS", application: "SELLER", displayName: "Offers" },
  { featureKey: "COUPONS", application: "SELLER", displayName: "Coupons" },
  { featureKey: "INVENTORY", application: "SELLER", displayName: "Inventory" },
  { featureKey: "GST", application: "SELLER", displayName: "GST" },
  { featureKey: "ANALYTICS", application: "SELLER", displayName: "Analytics" },
  { featureKey: "BULK_UPLOAD", application: "SELLER", displayName: "Bulk Upload" },
  { featureKey: "STORE_BANNER", application: "SELLER", displayName: "Store Banner" },
  { featureKey: "STORE_LOGO", application: "SELLER", displayName: "Store Logo" },
  { featureKey: "PAYMENTS", application: "SELLER", displayName: "Payments" },
  { featureKey: "VARIANTS", application: "SELLER", displayName: "Variants" },
  { featureKey: "RAZORPAY", application: "SELLER", displayName: "Razorpay" },
  { featureKey: "BANK_ACCOUNT", application: "SELLER", displayName: "Bank Account" },
];

const definitionKey = (application: string, featureKey: string): string =>
  `${String(application).toUpperCase()}:${String(featureKey).toUpperCase()}`;

const registeredKeys = new Set<string>(
  FEATURE_DEFINITIONS.map((d) => definitionKey(d.application, d.featureKey))
);

/** True when a feature is defined in code (i.e. it is a deployed feature). */
export const isFeatureRegistered = (application: string, featureKey: string): boolean =>
  registeredKeys.has(definitionKey(application, featureKey));

/** Look up a registry definition by application + key. */
export const getFeatureDefinition = (
  application: string,
  featureKey: string
): FeatureDefinition | undefined =>
  FEATURE_DEFINITIONS.find(
    (d) => definitionKey(d.application, d.featureKey) === definitionKey(application, featureKey)
  );
