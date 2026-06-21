import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "better-sqlite3"],
};

module.exports = {
  allowedDevOrigins: ['192.168.29.4'],
}

export default nextConfig;

