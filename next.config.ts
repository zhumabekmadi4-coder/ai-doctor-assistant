import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
    turbopack: {
      root: __dirname,
    },
  },
};

export default nextConfig;
