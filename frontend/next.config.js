/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ['res.cloudinary.com', 'images.unsplash.com', 'lh3.googleusercontent.com'],
  },
  allowedDevOrigins: ['192.168.250.55', '192.168.250.55:3003'],
};

module.exports = nextConfig;
