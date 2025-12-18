import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.ssensemedia.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
