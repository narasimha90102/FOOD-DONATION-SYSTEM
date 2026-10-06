const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../'),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['res.cloudinary.com', 'images.unsplash.com', 'lh3.googleusercontent.com'],
  },
  allowedDevOrigins: ['192.168.250.55', '192.168.250.55:3005', '172.26.137.55', '172.26.137.55:3003'],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:5003/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
