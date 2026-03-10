import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Strict mode for better React debugging
  reactStrictMode: true,
  // Log requests to backend in dev
  async rewrites() {
    return process.env.NODE_ENV === 'development' ? [
      {
        source: '/api/copilotkit/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/copilotkit/:path*`,
      },
    ] : []
  },
}

export default nextConfig
