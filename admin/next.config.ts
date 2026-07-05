import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    ADMIN_BACKEND_API_URL: process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL || "",
  },
  async rewrites() {
    const adminBackendUrl = process.env.ADMIN_BACKEND_API_URL || process.env.BACKEND_API_URL;
    const storageBackendUrl = process.env.STORAGE_BACKEND_API_URL || process.env.SELLER_BACKEND_API_URL || process.env.BACKEND_API_URL;

    if (!adminBackendUrl) {
      throw new Error("ADMIN_BACKEND_API_URL or BACKEND_API_URL is required for Admin API rewrites.");
    }

    if (!storageBackendUrl) {
      throw new Error("STORAGE_BACKEND_API_URL, SELLER_BACKEND_API_URL, or BACKEND_API_URL is required for storage rewrites.");
    }

    return [
      {
        source: "/admin/api/auth/:path*",
        destination: `${adminBackendUrl.replace(/\/$/, "")}/admin/api/auth/:path*`,
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
