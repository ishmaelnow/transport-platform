import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@transport-platform/config",
    "@transport-platform/logger",
    "@transport-platform/supabase",
  ],
};

export default nextConfig;
