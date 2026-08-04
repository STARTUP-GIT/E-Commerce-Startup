import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    PLATFORM_BACKEND_API_URL: process.env.PLATFORM_BACKEND_API_URL || process.env.BACKEND_API_URL || "",
  },
  async rewrites() {
    const platformBackendUrl = process.env.PLATFORM_BACKEND_API_URL || process.env.BACKEND_API_URL;

    if (!platformBackendUrl) {
      throw new Error("PLATFORM_BACKEND_API_URL or BACKEND_API_URL is required for Platform API rewrites.");
    }

    return [
      // ── Local Route Handler: sets platform_session cookie with correct attributes ──
      // Must come BEFORE the /api/platform/:path* catch-all.
      {
        source: "/api/platform/auth/login",
        destination: "/api/platform/auth/login",
      },
      {
        source: "/api/platform/:path*",
        destination: `${platformBackendUrl.replace(/\/$/, "")}/api/platform/:path*`,
      },
    ];
  },
};

export default nextConfig;
