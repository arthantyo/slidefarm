/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config) => {
    config.externals = config.externals || [];
    // Prevent Konva from requiring node 'canvas' module during SSR
    config.externals.push({ canvas: 'canvas' });
    return config;
  },
};

module.exports = nextConfig;
