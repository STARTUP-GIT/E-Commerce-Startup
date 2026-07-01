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
    const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3001';

    return [
      {
        // /api/auth/** is handled by NextAuth — don't proxy those
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
      {
        // Everything else under /api/** → backend
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
  transpilePackages: ["@repo/ui"],
};  

export default nextConfig;
