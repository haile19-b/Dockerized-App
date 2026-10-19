/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.INTERNAL_BACKEND_URL || 'http://backend:5000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
