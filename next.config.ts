import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/image-compressor',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
