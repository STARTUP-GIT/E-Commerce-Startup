import type { NextConfig } from 'next';

/**
 * BACKEND PROXY via Next.js Rewrites
 * ─────────────────────────────────────────────────────────────────────────────
 * All requests from the browser hit  /api/*  on THIS domain.
 * Next.js silently forwards them server-side to BACKEND_API_URL.
 *
 * ✅ The real backend URL never reaches the browser (no NEXT_PUBLIC_ needed).
 * ✅ To switch backends on deploy, change only BACKEND_API_URL in .env.
 * ✅ Avoids CORS issues — same-origin from the browser's perspective.
 * ─────────────────────────────────────────────────────────────────────────────
 */
const nextConfig: NextConfig = {
  async rewrites() {
    const backendUrl = process.env.BACKEND_API_URL;

    if (!backendUrl) {
      throw new Error('BACKEND_API_URL is required for Customer API rewrites.');
    }

    return [
      {
        source: '/customer/api/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/customer/api/:path*`,
      },
      {
        source: '/api/storage/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/api/storage/:path*`,
      },
      // Backend customer auth routes (must come before NextAuth catch-all)
      {
        source: '/api/auth/profile/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/users/api/auth/profile/:path*`,
      },
      {
        source: '/api/auth/profile',
        destination: `${backendUrl.replace(/\/$/, '')}/users/api/auth/profile`,
      },
      {
        source: '/api/auth/register',
        destination: `${backendUrl.replace(/\/$/, '')}/users/api/auth/register`,
      },
      {
        source: '/api/auth/forgot-password',
        destination: `${backendUrl.replace(/\/$/, '')}/users/api/auth/forgot-password`,
      },
      {
        source: '/api/auth/reset-password',
        destination: `${backendUrl.replace(/\/$/, '')}/users/api/auth/reset-password`,
      },
      {
        // /api/auth/** is handled by NextAuth — don't proxy those
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
      // ── Our own Route Handlers that set customer_session cookie ──────────
      // These MUST come before the /api/:path* catch-all or they'd be
      // proxied to the backend instead of handled by Next.js.
      {
        source: '/api/customer/login',
        destination: '/api/customer/login',
      },
      {
        source: '/api/customer/google',
        destination: '/api/customer/google',
      },
      {
        source: '/api/customer/logout',
        destination: '/api/customer/logout',
      },
      {
        // Everything else under /api/** → backend
        source: '/api/:path*',
        destination: `${backendUrl.replace(/\/$/, '')}/users/api/:path*`,
      },
    ];
  },
  transpilePackages: ["@repo/ui"],
};  

export default nextConfig;
