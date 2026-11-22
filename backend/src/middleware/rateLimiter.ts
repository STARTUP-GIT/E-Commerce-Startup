import { rateLimit } from 'express-rate-limit';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { extractCandidateTokens } from './tokenExtractor.js';
import { getJwtSecret } from '../config/token.js';

/**
 * Production-grade Multi-Tier Rate Limiting Architecture.
 *
 * Tier Separation:
 * ────────────────
 * 1. Public Unauthenticated Backstop (`limiter`): Protects public endpoints from scrapers/DoS.
 *    Explicitly skips health checks, webhooks, and authenticated admin routes.
 * 2. Authenticated Admin Tier (`authenticatedAdminLimiter` / `adminLimiter`):
 *    Keyed per authenticated admin identity (`admin:${adminId}`) with fallback to IP.
 *    Generous configurable threshold (default: 5,000 requests / 15 min in prod, 10,000 in dev)
 *    so normal admin work (dashboard loading, rapid navigation, search, audit logs, CRUD)
 *    is never blocked with 429 Too Many Requests.
 * 3. Sensitive Admin Security Tier (strict, targeted protections):
 *    - `adminLoginLimiter`: Brute-force protection on admin login (default: 10 / 15 min).
 *    - `adminGoogleOAuthLimiter`: Abuse protection for Google OAuth (default: 20 / 15 min).
 *    - `adminSetupLimiter`: Initial first admin setup protection (default: 5 / 15 min).
 *    - `adminPasswordResetLimiter`: Forgot-password, OTP, reset protection (default: 10 / 15 min).
 *    - `adminPasswordChangeLimiter`: Password change verification (default: 10 / 15 min).
 *    - `adminEmailChangeLimiter`: Email change request & verification (default: 15 / 15 min).
 *    - `adminInvitationLimiter`: Invitation creation and acceptance (default: 40 / 15 min).
 *    - `adminRefreshLimiter`: Token refresh (default: 300 / 15 min — generous for SPA keeping).
 *    - `adminFinancialLimiter`: Sensitive financial actions (refunds, payouts) (default: 60 / 15 min).
 *    - `adminExportLimiter`: Heavy data & report exports (default: 40 / 15 min).
 * 4. Customer / Seller / Delivery Tiers:
 *    Retained untouched for complete backward-compatibility.
 */

const isProduction = process.env.NODE_ENV?.toLowerCase() === 'production';

/**
 * Resolves an authenticated administrator identity key for rate limiting.
 * Prioritizes req.adminId, then candidate verified JWT tokens, and falls back to IP.
 * This completely prevents false-positive rate limit sharing across multiple admins on a shared IP/office network.
 */
export const resolveAdminIdentity = (req: Request): string => {
  if ((req as any).adminId) {
    return `admin:${(req as any).adminId}`;
  }

  try {
    const tokens = extractCandidateTokens(req, 'admin_session', 'x-admin-token');
    for (const token of tokens) {
      try {
        let secret: string;
        try {
          secret = getJwtSecret();
        } catch {
          secret = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'secret';
        }

        const decoded = jwt.verify(token, secret) as { id?: string } | null;
        if (decoded?.id) {
          return `admin:${decoded.id}`;
        }
      } catch (err: any) {
        // If token has recently expired during an active session, still attribute to the admin ID
        if (err?.name === 'TokenExpiredError') {
          const payload = jwt.decode(token) as { id?: string } | null;
          if (payload?.id) {
            return `admin:${payload.id}`;
          }
        }
      }
    }
  } catch {
    // continue to IP fallback
  }

  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  return `ip:${ip}`;
};

/**
 * Paths skipped by the generic public backstop limiter.
 * Admin endpoints have their own dedicated, identity-aware rate limiting tiers.
 */
const isSkippablePath = (req: Request): boolean => {
  const path = req.path || req.url || '';
  if (path === '/health' || path === '/') return true;
  if (path.startsWith('/webhook/') || path.startsWith('/api/payment/webhook')) return true;
  if (path.startsWith('/api/admin') || path.startsWith('/admin')) return true;
  return false;
};

/**
 * Standardized 429 response handler returning clear message and Retry-After header.
 */
const defaultHandler = (_req: Request, res: any, _next: NextFunction, options: any) => {
  const windowSec = Math.ceil((options?.windowMs || 900000) / 1000);
  const existingRetryAfter = res.getHeader ? res.getHeader('Retry-After') : null;
  const retryAfterSec = existingRetryAfter ? Number(existingRetryAfter) : windowSec;

  if (!res.headersSent && res.setHeader) {
    res.setHeader('Retry-After', String(retryAfterSec));
  }

  res.status(429).json({
    success: false,
    message: 'Too many requests. Please wait a moment before trying again.',
    retryAfter: retryAfterSec,
    retryAfterSeconds: retryAfterSec,
  });
};

const baseOptions = {
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false as const,
  ipv6Subnet: 56,
  handler: defaultHandler,
  validate: false as const,
};

// ---------------------------------------------------------------------------
// 1. Generic Public Backstop (skips admin, health, webhooks)
// ---------------------------------------------------------------------------
export const limiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: isProduction ? 1000 : 2000,
  skip: isSkippablePath,
});

// ---------------------------------------------------------------------------
// 2. Authenticated Admin Operations Tier (Generous & Identity-Aware)
// ---------------------------------------------------------------------------
const adminWindowMs = Number(process.env.ADMIN_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const adminLimitMax = Number(process.env.ADMIN_RATE_LIMIT_MAX) || (isProduction ? 5000 : 10000);

export const authenticatedAdminLimiter = rateLimit({
  ...baseOptions,
  windowMs: adminWindowMs,
  limit: adminLimitMax,
  keyGenerator: (req: Request) => resolveAdminIdentity(req),
});

// Backward-compatible alias so existing router mounts automatically inherit the generous limit
export const adminLimiter = authenticatedAdminLimiter;

// ---------------------------------------------------------------------------
// 3. Sensitive Admin Security Tier
// ---------------------------------------------------------------------------

/** Admin login brute-force protection */
export const adminLoginLimiter = rateLimit({
  ...baseOptions,
  windowMs: Number(process.env.ADMIN_LOGIN_WINDOW_MS) || 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_LOGIN_MAX) || 10,
  keyGenerator: (req: Request) => {
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
    const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return `admin_login:${ip}:${email}`;
  },
});

/** Admin Google OAuth abuse protection */
export const adminGoogleOAuthLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_GOOGLE_OAUTH_MAX) || 20,
  keyGenerator: (req: Request) => `admin_google:${req.ip || '127.0.0.1'}`,
});

/** First Admin Setup abuse protection */
export const adminSetupLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_SETUP_MAX) || 5,
});

/** Admin password reset / OTP verification */
export const adminPasswordResetLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_PASSWORD_RESET_MAX) || 10,
});

/** Admin password change (profile) */
export const adminPasswordChangeLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_PASSWORD_CHANGE_MAX) || 10,
  keyGenerator: (req: Request) => `admin_pw_change:${resolveAdminIdentity(req)}`,
});

/** Admin email change request & token verification */
export const adminEmailChangeLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_EMAIL_CHANGE_MAX) || 15,
  keyGenerator: (req: Request) => `admin_email_change:${resolveAdminIdentity(req)}`,
});

/** Admin invitations (creation and acceptance) */
export const adminInvitationLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_INVITATION_MAX) || 40,
  keyGenerator: (req: Request) => `admin_invitation:${resolveAdminIdentity(req)}`,
});

/** Admin token refresh */
export const adminRefreshLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_REFRESH_MAX) || 300,
  keyGenerator: (req: Request) => `admin_refresh:${resolveAdminIdentity(req)}`,
});

/** Admin sensitive financial operations (refunds, payouts) */
export const adminFinancialLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_FINANCIAL_MAX) || 60,
  keyGenerator: (req: Request) => `admin_financial:${resolveAdminIdentity(req)}`,
});

/** Admin expensive data & report exports */
export const adminExportLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.ADMIN_EXPORT_MAX) || 40,
  keyGenerator: (req: Request) => `admin_export:${resolveAdminIdentity(req)}`,
});

// ---------------------------------------------------------------------------
// 4. Customer & Seller Authentication Tiers (Preserved)
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
// 5. Customer, Seller, Delivery API Tiers (Preserved)
// ---------------------------------------------------------------------------

/** Search endpoints: 100 requests / minute */
export const searchLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000,
  limit: 100,
});

/** Public read endpoints: 200 / minute */
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
