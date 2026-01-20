import { setupDevPlatform } from '@cloudflare/next-on-pages/next-dev';

// Development platform setup for Cloudflare Pages
if (process.env.NODE_ENV === 'development') {
  setupDevPlatform().catch(() => {});
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
