import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets-bucket.deadlock-api.com",
        pathname: "/assets-api-res/images/heroes/backgrounds/**",
      },
    ],
  },
  partialPrefetching: true,
  async rewrites() {
    const apiTarget = (
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      "http://localhost:3001"
    ).replace(/\/+$/, "");

    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
