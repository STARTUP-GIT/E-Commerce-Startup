import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/admin/:path*",
        destination: "http://localhost:3003/api/admin/:path*",
      },
      {
        source: "/api/storage/:path*",
        destination: "http://localhost:3002/api/storage/:path*",
      },
    ];
  },
};

export default nextConfig;

