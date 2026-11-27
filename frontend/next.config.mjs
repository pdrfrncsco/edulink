const BACKEND_INTERNAL_URL = (
  process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: `${BACKEND_INTERNAL_URL}/media/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
