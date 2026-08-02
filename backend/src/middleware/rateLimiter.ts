import { rateLimit } from 'express-rate-limit';
import type { Request } from 'express';

/**
 * Production-grade rate limiting.
 *
 * Strategy
 * --------
 * - A global backstop limiter protects the entire API from runaway traffic.
 * - Route-specific limiters apply much stricter thresholds to sensitive
 *   endpoints (auth, OTP, password reset, search, uploads, payments, admin).
 * - Health checks and signature-verified webhooks are exempt from the global
 *   limiter (they get their own dedicated limits / HMAC verification).
 * - Limits are keyed per IPv4/IPv6-subnet; shared-NAT bursts are handled by
 *   sizing generous read limits while keeping write/auth limits strict.
 */

const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production';

const isSkippablePath = (req: Request): boolean => {
  const path = req.path || req.url || '';
  if (path === '/health' || path === '/') return true;
  if (path.startsWith('/webhook/') || path.startsWith('/api/payment/webhook')) return true;
  return false;
};

const defaultHandler = (_req: Request, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
  res.status(429).json({
    message: 'Too many requests, please try again later.',
    retryAfter: 'see RateLimit-Reset header',
  });
};

const baseOptions = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false as const,
  ipv6Subnet: 56,
  handler: defaultHandler,
  validate: { xForwardedForHeader: false, trustProxy: false },
};

/**
 * Global backstop for the whole API.
 * High enough to never affect legitimate browsing, low enough to stop abuse.
 * Skipped for health checks and signature-verified webhooks.
 */
export const limiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 1000 : 2000, // 15 minutes
  skip: isSkippablePath,
});

// ---------------------------------------------------------------------------
// Authentication tiers (strict — protects account takeover vectors)
// ---------------------------------------------------------------------------

/** Login attempts: 5 requests / 15 minutes */
export const loginLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

/** Registration attempts: 5 requests / 15 minutes */
export const registerLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

/** Forgot / reset password: 5 requests / 15 minutes */
export const passwordLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 5,
});

/** OTP request / verification: 10 requests / 15 minutes */
export const otpLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

/** Google OAuth: 10 requests / 15 minutes */
export const googleOAuthLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

/** Generic auth sink (any endpoint touching credentials): 10 / 15 min */
export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
});

// ---------------------------------------------------------------------------
// API tiers
// ---------------------------------------------------------------------------

/** Search endpoints: 100 requests / minute */
export const searchLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 100,
});

/** Public read endpoints (product lists, shop details, categories, states): 200 / minute */
export const publicReadLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 200,
});

/** Authenticated write endpoints: 60 requests / minute */
export const writeLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 60,
});

/** File uploads: 50 requests / 15 minutes */
export const uploadLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 50,
});

/** Payment create / verify / refund: 30 requests / 15 minutes */
export const paymentLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

/** Admin APIs: strict — 200 requests / 15 minutes */
export const adminLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 200,
});

/** Delivery/checkout sensitive ops: 30 / 15 min */
export const checkoutLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

/** Webhook endpoint — signature verification is the real gate; limit is a DoS guard */
export const webhookLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 60,
});
