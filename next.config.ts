import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['three', 'three-globe'],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
