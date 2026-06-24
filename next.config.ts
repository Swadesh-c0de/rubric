import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  cacheComponents: true,
  experimental: {
    viewTransition: true,
    instantNavigationDevToolsToggle: true,
  },
  allowedDevOrigins: ['192.168.29.4'],
};

export default nextConfig;

