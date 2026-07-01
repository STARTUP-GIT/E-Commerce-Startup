/**
 * API Configuration — Single Source of Truth
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW THE PROXY WORKS:
 *   Browser  →  /api/*  (same origin — no CORS)
 *   Next.js  →  BACKEND_API_URL/api/*  (server-side — URL hidden from browser)
 *
 * TO SWITCH BACKENDS ON DEPLOY:
 *   Change BACKEND_API_URL in .env — nothing else needs updating.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** All browser-facing requests go through Next.js rewrites at /api */
export const API_BASE = '/api';

export const API_ROUTES = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  auth: {
    login:      `${API_BASE}/auth/login`,
    register:   `${API_BASE}/auth/register`,
    logout:     `${API_BASE}/auth/logout`,
    google:     `${API_BASE}/auth/google`,
    me:         `${API_BASE}/auth/me`,
    profile:    `${API_BASE}/auth/profile`,
    profileUpdate: `${API_BASE}/auth/profile/update`,
    forgotPassword: `${API_BASE}/auth/forgot-password`,
    resetPassword:  `${API_BASE}/auth/reset-password`,
  },

  // ── Shops ─────────────────────────────────────────────────────────────────
  shops: {
    featured:   `${API_BASE}/shops/featured`,
    nearby:     `${API_BASE}/shops/nearby`,
    search:     `${API_BASE}/shops/search`,
    bySlug:     (slug: string) => `${API_BASE}/shops/${slug}`,
  },

  // ── Products ──────────────────────────────────────────────────────────────
  products: {
    list:           `${API_BASE}/products`,
    featured:       `${API_BASE}/products/featured`,
    recommended:    `${API_BASE}/products/recommended`,
    recentlyViewed: `${API_BASE}/products/recently-viewed`,
    search:         `${API_BASE}/products/search`,
    filter:         `${API_BASE}/products/filter`,
    byId:           (id: string) => `${API_BASE}/products/${id}`,
    reviews:        (productId: string) => `${API_BASE}/products/${productId}/reviews`,
  },

  // ── Cart ──────────────────────────────────────────────────────────────────
  cart: {
    get:    `${API_BASE}/cart`,
    add:    `${API_BASE}/cart`,
    update: (itemId: string) => `${API_BASE}/cart/${itemId}`,
    remove: (itemId: string) => `${API_BASE}/cart/${itemId}`,
    clear:  `${API_BASE}/cart/clear`,
  },

  // ── Orders ────────────────────────────────────────────────────────────────
  orders: {
    list:   `${API_BASE}/orders`,
    byId:   (id: string) => `${API_BASE}/orders/${id}`,
    create: `${API_BASE}/orders`,
  },

  // ── Custom Orders ─────────────────────────────────────────────────────────
  customOrders: {
    list:   `${API_BASE}/custom-orders`,
    byId:   (id: string) => `${API_BASE}/custom-orders/${id}`,
    create: `${API_BASE}/custom-orders`,
  },

  // ── Checkout ──────────────────────────────────────────────────────────────
  checkout: {
    initiate:     `${API_BASE}/checkout`,
    validate:     `${API_BASE}/checkout/validate`,
    applyCoupon:  `${API_BASE}/checkout/apply-coupon`,
    removeCoupon: `${API_BASE}/checkout/remove-coupon`,
  },

  // ── Payments ──────────────────────────────────────────────────────────────
  payments: {
    create: `${API_BASE}/payment/create`,
    verify: `${API_BASE}/payment/verify`,
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  notifications: {
    list:       `${API_BASE}/notifications`,
    markRead:   (id: string) => `${API_BASE}/notifications/${id}/read`,
    markAllRead:`${API_BASE}/notifications/mark-all-read`,
  },

  // ── Reviews ───────────────────────────────────────────────────────────────
  reviews: {
    create: `${API_BASE}/reviews`,
  },

  // ── Wishlist ──────────────────────────────────────────────────────────────
  wishlist: {
    get:    `${API_BASE}/wishlist`,
    add:    `${API_BASE}/wishlist`,
    remove: (productId: string) => `${API_BASE}/wishlist/${productId}`,
  },
} as const;
