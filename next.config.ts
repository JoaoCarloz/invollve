import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundla esses pacotes no build do servidor para evitar divergência de hash entre ambientes
  bundlePagesRouterDependencies: true,
  serverExternalPackages: [],
};

export default nextConfig;
