import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Prevent Next.js from bundling these Node.js-only packages into client/edge bundles
  serverExternalPackages: ['socket.io'],
}

export default nextConfig
