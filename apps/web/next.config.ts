import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@ttndd/shared', '@ttndd/constants', '@ttndd/ui', '@ttndd/tokens'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};

export default nextConfig;
