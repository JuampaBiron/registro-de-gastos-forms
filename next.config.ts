import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    domains: ['fonts.googleapis.com'],
  }
}

export default nextConfig