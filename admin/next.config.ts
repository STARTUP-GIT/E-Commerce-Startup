import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    ADMIN_BACKEND_API_URL: process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL || "",
  },
  async rewrites() {
    const adminBackendUrl = process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL || "https://admin-api.atlasbasket.com";
    const storageBackendUrl = process.env.STORAGE_BACKEND_API_URL || process.env.SELLER_BACKEND_API_URL || process.env.BACKEND_API_URL || "https://admin-api.atlasbasket.com";

    return [
      {
        source: "/admin/api/auth/:path*",
        destination: `${adminBackendUrl.replace(/\/$/, "")}/admin/api/auth/:path*`,
      },
      // ── Local Route Handler: sets admin_session cookie with correct attributes ──
      // Must come BEFORE the /api/admin/:path* catch-all.
      {
        source: "/api/admin/auth/login",
        destination: "/api/admin/auth/login",
      },
      {
        source: "/api/admin/auth/refresh",
        destination: "/api/admin/auth/refresh",
      },
      {
        source: "/api/admin/auth/logout",
        destination: "/api/admin/auth/logout",
      },
      {
        source: "/api/admin/auth/forgot-password",
        destination: `${adminBackendUrl.replace(/\/$/, "")}/api/admin/auth/forgot-password`,
      },
      {
        source: "/api/admin/auth/verify-otp",
        destination: `${adminBackendUrl.replace(/\/$/, "")}/api/admin/auth/verify-otp`,
      },
      {
        source: "/api/admin/auth/reset-password",
        destination: `${adminBackendUrl.replace(/\/$/, "")}/api/admin/auth/reset-password`,
      },
      {
        source: "/api/admin/:path*",
        destination: `${adminBackendUrl.replace(/\/$/, "")}/api/admin/:path*`,
      },
      {
        source: "/api/storage/:path*",
        destination: `${storageBackendUrl.replace(/\/$/, "")}/api/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;
